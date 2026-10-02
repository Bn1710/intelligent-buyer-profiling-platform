create table public.prospect_sources (
 id uuid primary key default gen_random_uuid(), prospect_id uuid not null references public.prospects(id) on delete cascade,
 user_id uuid, tenant_id uuid references public.teams(id),
 url text not null check(length(url)<=2048 and url ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(:[0-9]+)?(/|$)'),
 title text not null check(length(btrim(title)) between 1 and 240), publisher text not null default '' check(length(publisher)<=200),
 identity_note text not null default '' check(length(identity_note)<=1000),
 check(verification<>'verified' or length(btrim(identity_note))>0),
 published_date date, excerpt text not null default '' check(length(excerpt)<=5000), relevance text not null default '' check(length(relevance)<=2000),
 verification text not null default 'unverified' check(verification in ('unverified','verified','uncertain','wrong_person')),
 include_in_profile boolean not null default false,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not include_in_profile or (verification='verified' and length(btrim(excerpt))>0 and length(btrim(relevance))>0))
);
alter table public.prospect_sources enable row level security;
grant select,insert,update,delete on public.prospect_sources to anon,authenticated;
create policy source_lead_access on public.prospect_sources for all using(public.lead_access(prospect_id))
 with check(public.lead_access(prospect_id) and public.tenant_access(tenant_id,user_id));
create index source_tenant_created on public.prospect_sources(tenant_id,created_at desc);
create index source_prospect on public.prospect_sources(prospect_id);
create trigger a_tenant_record_guard before insert or update on public.prospect_sources for each row execute function public.guard_tenant_record();
create or replace function public.version_research_source() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' and NEW.prospect_id is distinct from OLD.prospect_id then raise exception 'A source cannot move to another prospect.'; end if;
 if TG_OP='INSERT' then NEW.revision:=1; NEW.updated_at:=now();
 elsif (to_jsonb(NEW)-array['revision','updated_at']) is distinct from (to_jsonb(OLD)-array['revision','updated_at']) then
  NEW.revision:=OLD.revision+1; NEW.updated_at:=now();
 else NEW.revision:=OLD.revision; NEW.updated_at:=OLD.updated_at; end if;
 return NEW;
end $$;
create trigger b_source_revision before insert or update or delete on public.prospect_sources for each row execute function public.version_research_source();
create trigger source_activity after insert or update or delete on public.prospect_sources for each row execute function public.record_workspace_activity();

alter table public.prospect_profiles add column research_sources jsonb not null default '[]' check(jsonb_typeof(research_sources)='array' and jsonb_array_length(research_sources)<=20);
alter table public.prospect_profiles add column research_claims jsonb not null default '[]' check(jsonb_typeof(research_claims)='array' and jsonb_array_length(research_claims)<=40);
create or replace function public.research_snapshot(s public.prospect_sources) returns jsonb language sql immutable set search_path=public as $$
 select jsonb_build_object('id',s.id,'revision',s.revision,'url',s.url,'title',s.title,'publisher',s.publisher,'identity_note',s.identity_note,'published_date',s.published_date,'excerpt',s.excerpt,'relevance',s.relevance);
$$;
create or replace function public.guard_profile_research() returns trigger language plpgsql set search_path=public as $$
declare evidence jsonb; claim jsonb; current_source public.prospect_sources; validate boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(NEW.prospect_id::text,0));
 validate:=TG_OP='INSERT';
 if TG_OP='UPDATE' then validate:=NEW.research_sources is distinct from OLD.research_sources or NEW.research_claims is distinct from OLD.research_claims or NEW.review_status='approved'; end if;
 if validate then
  if jsonb_array_length(NEW.research_sources)<>(select count(*) from public.prospect_sources where prospect_id=NEW.prospect_id and verification='verified' and include_in_profile) then raise exception 'Research selection changed. Regenerate or edit the profile before approval.'; end if;
  for evidence in select value from jsonb_array_elements(NEW.research_sources) loop
   select * into current_source from public.prospect_sources where id=(evidence->>'id')::uuid and prospect_id=NEW.prospect_id and verification='verified' and include_in_profile;
   if not found or evidence is distinct from public.research_snapshot(current_source) then raise exception 'Research evidence changed. Regenerate or edit the profile before approval.'; end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(NEW.research_sources))<>jsonb_array_length(NEW.research_sources) then raise exception 'Duplicate research citation.'; end if;
  for claim in select value from jsonb_array_elements(NEW.research_claims) loop
   if not exists(select 1 from jsonb_array_elements(NEW.research_sources) s where s->>'id'=claim->>'source_id')
      or coalesce(claim->>'dimension','') not in ('professional_context','conversation_question')
      or coalesce(length(btrim(claim->>'statement')),0) not between 1 and 6000 then raise exception 'Research claim must cite selected evidence.'; end if;
  end loop;
 end if;
 return NEW;
end $$;
create trigger c_profile_research_guard before insert or update on public.prospect_profiles for each row execute function public.guard_profile_research();

-- Only evidence selected for profiling affects existing approvals; historical citations stay intact.
create or replace function public.invalidate_research_reviews() returns trigger language plpgsql security definer set search_path=public as $$
declare lead uuid; changed boolean;
begin
 lead:=case when TG_OP='DELETE' then OLD.prospect_id else NEW.prospect_id end;
 if TG_OP='INSERT' then changed:=NEW.include_in_profile;
 elsif TG_OP='DELETE' then changed:=OLD.include_in_profile;
 else changed:=(OLD.include_in_profile or NEW.include_in_profile) and NEW.revision<>OLD.revision; end if;
 if changed then
  update public.prospect_profiles set review_status='unreviewed' where prospect_id=lead and review_status='approved';
  update public.strategies set review_status='unreviewed' where prospect_id=lead and review_status='approved';
 end if;
 return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
create trigger source_review_invalidation after insert or update or delete on public.prospect_sources for each row execute function public.invalidate_research_reviews();
revoke all on function public.version_research_source(),public.guard_profile_research(),public.invalidate_research_reviews() from public;
