-- Audit changes in the same database transaction as each saved record.
alter table public.audit_logs add column if not exists user_id uuid;
create or replace function public.record_workspace_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb; event_name text; owner_id uuid; extra jsonb;
begin
  r := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  owner_id := (r->>'user_id')::uuid;
  event_name := lower(TG_OP) || '_' || TG_TABLE_NAME;
  extra := jsonb_build_object('operation', TG_OP, 'prospect_id', r->>'prospect_id');
  if TG_OP = 'INSERT' and TG_TABLE_NAME = 'prospect_profiles' then
    event_name := 'generate_profile';
    extra := extra || jsonb_build_object('source',r->>'source','confidence',r->'confidence','interaction_count',(select count(*) from public.interactions where prospect_id = (r->>'prospect_id')::uuid));
  elsif TG_OP = 'INSERT' and TG_TABLE_NAME = 'strategies' then
    event_name := 'generate_strategy';
    extra := extra || jsonb_build_object('profile_id',r->>'profile_id','source',r->>'source','confidence',r->'confidence');
  elsif TG_OP = 'UPDATE' and TG_TABLE_NAME in ('prospect_profiles','strategies') and (to_jsonb(OLD)->>'review_status') is distinct from (r->>'review_status') then
    event_name := case when TG_TABLE_NAME = 'prospect_profiles' then 'profile_reviewed' else 'strategy_reviewed' end;
    extra := extra || jsonb_build_object('review_status',r->>'review_status');
  elsif TG_OP = 'UPDATE' and TG_TABLE_NAME = 'prospects' and (to_jsonb(OLD)->>'status') is distinct from (r->>'status') then
    event_name := 'prospect_status_changed';
    extra := extra || jsonb_build_object('status',r->>'status');
  end if;
  insert into public.audit_logs(actor,action,target_id,target_type,metadata,user_id)
  values (coalesce(auth.uid()::text, 'demo-consultant'),event_name,(r->>'id')::uuid,TG_TABLE_NAME,extra,owner_id);
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end $$;
create trigger prospects_activity after insert or update or delete on public.prospects for each row execute function public.record_workspace_activity();
create trigger interactions_activity after insert or update or delete on public.interactions for each row execute function public.record_workspace_activity();
create trigger profiles_activity after insert or update or delete on public.prospect_profiles for each row execute function public.record_workspace_activity();
create trigger strategies_activity after insert or update or delete on public.strategies for each row execute function public.record_workspace_activity();
revoke insert on public.audit_logs from anon, authenticated;
