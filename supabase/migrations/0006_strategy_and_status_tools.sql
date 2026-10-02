create or replace function public.guard_strategy_source()
returns trigger language plpgsql set search_path = public as $$
declare p public.prospect_profiles;
begin
 if TG_OP = 'INSERT' or (NEW.review_status = 'approved' and OLD.review_status is distinct from NEW.review_status) then
  select * into p from public.prospect_profiles where id = NEW.profile_id for share;
  if not found or p.prospect_id <> NEW.prospect_id or p.review_status <> 'approved' then
   raise exception 'Approve a matching profile first.';
  end if;
 end if;
 return NEW;
end $$;
create trigger strategy_source_guard before insert or update on public.strategies for each row execute function public.guard_strategy_source();

create or replace function public.suggest_status(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.prospects; mood text; suggested text; result jsonb;
begin
 select * into p from public.prospects where id = p_id;
 if not found or not coalesce(((auth.uid() is null and p.user_id is null) or p.user_id = auth.uid() or coalesce(auth.jwt()->'app_metadata'->>'role','') = 'management'),false) then
  raise exception 'Prospect not found or inaccessible.';
 end if;
 select mood_after into mood from public.interactions where prospect_id = p_id order by created_at desc limit 1;
 if not found then raise exception 'Log an interaction first.'; end if;
 suggested := case when p.status = 'new' and mood = 'positive' then 'engaged' else p.status end;
 result := jsonb_build_object('status',suggested,'explanation','Latest recorded mood: ' || coalesce(mood,'unknown') || '. This is a suggestion; review before applying.');
 insert into public.audit_logs(actor,action,target_id,target_type,metadata,user_id)
 values(coalesce(auth.uid()::text,'demo-consultant'),'suggest_status',p_id,'prospects',result,p.user_id);
 return result;
end $$;
revoke all on function public.suggest_status(uuid) from public;
grant execute on function public.suggest_status(uuid) to anon, authenticated;

