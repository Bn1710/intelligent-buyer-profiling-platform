begin;
insert into public.teams(id,name) values('e1100000-0000-4000-8000-000000000001','Research QC');
insert into public.team_members(team_id,user_id,role) values
 ('e1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','owner'),
 ('e1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000002','member'),
 ('e1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000003','member');
insert into public.prospects(id,tenant_id,user_id,assigned_to,name) values
 ('c1100000-0000-4000-8000-000000000001','e1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000002','Assigned A'),
 ('c1100000-0000-4000-8000-000000000002','e1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000003','Assigned B');
insert into public.prospect_sources(id,prospect_id,user_id,url,title) values
 ('a1100000-0000-4000-8000-000000000001','c1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','https://example.com/a','Research A'),
 ('a1100000-0000-4000-8000-000000000002','c1100000-0000-4000-8000-000000000002','d1100000-0000-4000-8000-000000000001','https://example.com/b','Research B');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1100000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare count_changed integer; evidence jsonb;
begin
 if (select count(*) from public.prospect_sources where tenant_id='e1100000-0000-4000-8000-000000000001')<>1 then raise exception 'Source assignment isolation failed'; end if;
 update public.prospect_sources set title='Attack' where id='a1100000-0000-4000-8000-000000000002';get diagnostics count_changed=row_count;
 if count_changed<>0 then raise exception 'Other assigned source was changed'; end if;
 begin
  update public.prospect_sources set include_in_profile=true where id='a1100000-0000-4000-8000-000000000001';raise exception 'Unverified source selected';
 exception when check_violation then null;end;
 begin
  update public.prospect_sources set prospect_id='c1100000-0000-4000-8000-000000000002' where id='a1100000-0000-4000-8000-000000000001';raise exception 'Source moved to other lead';
 exception when raise_exception then if SQLERRM not in ('Prospect not found or inaccessible.','A source cannot move to another prospect.') then raise;end if;end;
 update public.prospect_sources set verification='verified',identity_note='Confirmed name and employer',excerpt='Professional biography excerpt',relevance='Meeting context',include_in_profile=true where id='a1100000-0000-4000-8000-000000000001';
 select jsonb_build_array(public.research_snapshot(s)) into evidence from public.prospect_sources s where id='a1100000-0000-4000-8000-000000000001';
 begin
  insert into public.prospect_profiles(prospect_id,user_id,summary) values('c1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','Snapshot omitted');raise exception 'Missing selected citation accepted';
 exception when raise_exception then if SQLERRM<>'Research selection changed. Regenerate or edit the profile before approval.' then raise;end if;end;
 insert into public.prospect_profiles(id,prospect_id,user_id,summary,research_sources,review_status) values('f1100000-0000-4000-8000-000000000001','c1100000-0000-4000-8000-000000000001','d1100000-0000-4000-8000-000000000001','Cited context',evidence,'approved');
 begin
  update public.prospect_profiles set research_claims='[{"source_id":"a1100000-0000-4000-8000-000000000002","statement":"Other person claim","dimension":"professional_context"}]' where id='f1100000-0000-4000-8000-000000000001';raise exception 'Unselected claim citation accepted';
 exception when raise_exception then if SQLERRM<>'Research claim must cite selected evidence.' then raise;end if;end;
 update public.prospect_sources set excerpt='Changed professional biography',revision=1 where id='a1100000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.prospect_profiles where id='f1100000-0000-4000-8000-000000000001' and review_status='unreviewed') then raise exception 'Research edit kept approval';end if;
 if not exists(select 1 from public.prospect_sources where id='a1100000-0000-4000-8000-000000000001' and revision=3) then raise exception 'Client spoofed source revision';end if;
 begin
  update public.prospect_profiles set review_status='approved' where id='f1100000-0000-4000-8000-000000000001';raise exception 'Stale source approval accepted';
 exception when raise_exception then if SQLERRM<>'Research evidence changed. Regenerate or edit the profile before approval.' then raise;end if;end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin if exists(select 1 from public.prospect_sources where tenant_id is not null) then raise exception 'Anonymous private source leak';end if;end $$;
select 'PASS: research assigned-lead isolation, verified selection, exact citations, stale approval denial, revision integrity and anonymous separation' as result;
rollback;
