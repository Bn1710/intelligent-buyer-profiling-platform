-- Review is attached to exact content and provenance, including direct REST writes.
create or replace function public.invalidate_changed_review()
returns trigger language plpgsql set search_path=public as $$
begin
 if OLD.review_status='approved'
    and (to_jsonb(NEW)-array['id','created_at','review_status'])
        is distinct from (to_jsonb(OLD)-array['id','created_at','review_status']) then
  NEW.review_status:='unreviewed';
 end if;
 return NEW;
end $$;
-- Strategy trigger order: tenant validation, review invalidation, source validation.
create trigger b_review_content_guard before update on public.prospect_profiles
 for each row execute function public.invalidate_changed_review();
create trigger b_review_content_guard before update on public.strategies
 for each row execute function public.invalidate_changed_review();

create or replace function public.guard_strategy_source()
returns trigger language plpgsql set search_path=public as $$
declare p public.prospect_profiles;
begin
 if NEW.profile_id is not null then
  select * into p from public.prospect_profiles where id=NEW.profile_id for share;
  if not found or p.prospect_id<>NEW.prospect_id or p.tenant_id is distinct from NEW.tenant_id then
   raise exception 'Profile must belong to the prospect workspace.';
  end if;
  if (TG_OP='INSERT' or NEW.profile_id is distinct from OLD.profile_id
      or NEW.prospect_id is distinct from OLD.prospect_id
      or (NEW.review_status='approved' and OLD.review_status is distinct from NEW.review_status))
     and p.review_status<>'approved' then
   raise exception 'Approve a matching profile first.';
  end if;
 elsif TG_OP='INSERT'
       or (NEW.review_status='approved' and OLD.review_status is distinct from NEW.review_status) then
  raise exception 'Approve a matching profile first.';
 end if;
 -- A deleted source may leave a historical draft; FK SET NULL must remain possible.
 return NEW;
end $$;
revoke all on function public.invalidate_changed_review() from public;
