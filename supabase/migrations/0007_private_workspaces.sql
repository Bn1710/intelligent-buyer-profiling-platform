-- Public demo rows have no owner. Signed-in consultants only see their own rows.
create or replace function public.workspace_can_read(owner_id uuid)
returns boolean language sql stable set search_path = public as $$
 select case when auth.uid() is null then owner_id is null
 else coalesce(owner_id = auth.uid(),false) or coalesce(auth.jwt()->'app_metadata'->>'role','') = 'management' end;
$$;
create or replace function public.workspace_can_write(owner_id uuid)
returns boolean language sql stable set search_path = public as $$
 select case when auth.uid() is null then owner_id is null else coalesce(owner_id = auth.uid(),false) end;
$$;
do $$ declare t text; begin
 foreach t in array array['prospects','interactions','prospect_profiles','strategies'] loop
  execute format('drop policy if exists %I on public.%I', t || '_v1_read',t);
  execute format('drop policy if exists %I on public.%I', t || '_v1_write',t);
  execute format('create policy %I on public.%I for select using (public.workspace_can_read(user_id))',t || '_owner_read',t);
  if t = 'prospects' then
   execute format('create policy %I on public.%I for all using (public.workspace_can_write(user_id)) with check (public.workspace_can_write(user_id))',t || '_owner_write',t);
  else
   execute format('create policy %I on public.%I for all using (public.workspace_can_write(user_id)) with check (public.workspace_can_write(user_id) and exists (select 1 from public.prospects p where p.id = prospect_id and p.user_id is not distinct from %I.user_id))',t || '_owner_write',t,t);
  end if;
  execute format('create index if not exists %I on public.%I(user_id,created_at desc)',t || '_owner_created',t);
 end loop;
end $$;
drop policy if exists audit_demo_read on public.audit_logs;
drop policy if exists audit_demo_append on public.audit_logs;
create policy audit_owner_read on public.audit_logs for select using(public.workspace_can_read(user_id));
create index if not exists audit_owner_created on public.audit_logs(user_id,created_at desc);

-- Close direct-RPC access too; NULL ownership comparisons must deny access.
create or replace function public.suggest_status(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.prospects; mood text; suggested text; result jsonb;
begin
 select * into p from public.prospects where id = p_id;
 if not found or not public.workspace_can_read(p.user_id) then raise exception 'Prospect not found or inaccessible.'; end if;
 select mood_after into mood from public.interactions where prospect_id = p_id order by created_at desc limit 1;
 if not found then raise exception 'Log an interaction first.'; end if;
 suggested := case when p.status = 'new' and mood = 'positive' then 'engaged' else p.status end;
 result := jsonb_build_object('status',suggested,'explanation','Latest recorded mood: ' || coalesce(mood,'unknown') || '. This is a suggestion; review before applying.');
 insert into public.audit_logs(actor,action,target_id,target_type,metadata,user_id)
 values(coalesce(auth.uid()::text,'demo-consultant'),'suggest_status',p_id,'prospects',result,p.user_id);
 return result;
end $$;
