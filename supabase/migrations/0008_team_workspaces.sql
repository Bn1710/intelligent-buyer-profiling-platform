-- Team workspaces: preserve personal records, share a pipeline only with team members.
create table public.teams (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 2 and 80),
 personal_owner_id uuid unique, created_at timestamptz not null default now()
);
create table public.team_members (
 team_id uuid not null references public.teams(id) on delete cascade,
 user_id uuid not null, role text not null check(role in ('owner','admin','member')),
 display_name text not null default 'Consultant', created_at timestamptz not null default now(), primary key(team_id,user_id)
);
create table public.team_invites (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
 code_hash text not null unique, role text not null check(role in ('admin','member')), created_by uuid not null,
 expires_at timestamptz not null default(now()+interval '7 days'), used_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
create or replace function public.team_role(p_team uuid) returns text
 language sql stable security definer set search_path = public as $$
 select role from public.team_members where team_id=p_team and user_id=auth.uid();
$$;
create or replace function public.tenant_access(p_team uuid,p_owner uuid) returns boolean
 language sql stable set search_path=public as $$
 select case when auth.uid() is null then p_team is null and p_owner is null else p_team is not null and public.team_role(p_team) is not null end;
$$;
create policy team_read on public.teams for select using(public.team_role(id) is not null);
create policy member_read on public.team_members for select using(public.team_role(team_id) is not null);
create policy invite_read on public.team_invites for select using(public.team_role(team_id) in ('owner','admin'));
grant select on public.teams,public.team_members to authenticated;
revoke all on public.team_invites from anon,authenticated;
grant select(id,team_id,role,created_by,expires_at,used_at,revoked_at,created_at) on public.team_invites to authenticated;
-- All membership writes are exclusively validated RPCs.
revoke insert,update,delete on public.teams,public.team_members from anon,authenticated;

alter table public.prospects add column tenant_id uuid references public.teams(id);
alter table public.interactions add column tenant_id uuid references public.teams(id);
alter table public.prospect_profiles add column tenant_id uuid references public.teams(id);
alter table public.strategies add column tenant_id uuid references public.teams(id);
alter table public.audit_logs add column tenant_id uuid references public.teams(id);
insert into public.teams(name,personal_owner_id)
 select 'Personal workspace',user_id from (select user_id from public.prospects union select user_id from public.audit_logs) owners where user_id is not null;
insert into public.team_members(team_id,user_id,role) select id,personal_owner_id,'owner' from public.teams;
update public.prospects p set tenant_id=t.id from public.teams t where p.user_id=t.personal_owner_id;
update public.interactions c set tenant_id=p.tenant_id from public.prospects p where c.prospect_id=p.id;
update public.prospect_profiles c set tenant_id=p.tenant_id from public.prospects p where c.prospect_id=p.id;
update public.strategies c set tenant_id=p.tenant_id from public.prospects p where c.prospect_id=p.id;
update public.audit_logs a set tenant_id=t.id from public.teams t where a.user_id=t.personal_owner_id;

create or replace function public.guard_tenant_record() returns trigger language plpgsql set search_path=public as $$
declare parent_team uuid; parent_owner uuid;
begin
 if TG_OP='UPDATE' and (NEW.tenant_id is distinct from OLD.tenant_id or NEW.user_id is distinct from OLD.user_id) then raise exception 'Record workspace and creator cannot be changed.'; end if;
 if TG_TABLE_NAME='prospects' then
  if TG_OP='INSERT' and NEW.user_id is distinct from auth.uid() and current_user in ('anon','authenticated') then raise exception 'Invalid record creator.'; end if;
 else
  select tenant_id,user_id into parent_team,parent_owner from public.prospects where id=NEW.prospect_id;
  if not found then raise exception 'Prospect not found or inaccessible.'; end if;
  if TG_OP='INSERT' and NEW.tenant_id is null then NEW.tenant_id:=parent_team; end if;
  if NEW.tenant_id is distinct from parent_team or NEW.user_id is distinct from parent_owner then raise exception 'Record must belong to the prospect workspace.'; end if;
 end if;
 return NEW;
end $$;
do $$ declare t text; begin
 foreach t in array array['prospects','interactions','prospect_profiles','strategies'] loop
  execute format('drop policy if exists %I on public.%I',t||'_owner_read',t);
  execute format('drop policy if exists %I on public.%I',t||'_owner_write',t);
  execute format('create policy %I on public.%I for all using(public.tenant_access(tenant_id,user_id)) with check(public.tenant_access(tenant_id,user_id))',t||'_tenant_access',t);
  execute format('create index %I on public.%I(tenant_id,created_at desc)',t||'_tenant_created',t);
  execute format('create trigger tenant_record_guard before insert or update on public.%I for each row execute function public.guard_tenant_record()',t);
 end loop;
end $$;
drop policy audit_owner_read on public.audit_logs;
create policy audit_tenant_read on public.audit_logs for select using(public.tenant_access(tenant_id,user_id));
create index audit_tenant_created on public.audit_logs(tenant_id,created_at desc);

create or replace function public.ensure_personal_team() returns uuid language plpgsql security definer set search_path=public as $$
declare team uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to manage a team.'; end if;
 insert into public.teams(name,personal_owner_id) values('Personal workspace',auth.uid()) on conflict(personal_owner_id) do nothing;
 select id into team from public.teams where personal_owner_id=auth.uid();
 insert into public.team_members(team_id,user_id,role,display_name) values(team,auth.uid(),'owner',coalesce(auth.jwt()->>'email','Consultant')) on conflict do nothing;
 return team;
end $$;
create or replace function public.create_team(p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare team uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to create a team.'; end if;
 if length(btrim(p_name)) not between 2 and 80 then raise exception 'Team name must be 2 to 80 characters.'; end if;
 insert into public.teams(name) values(btrim(p_name)) returning id into team;
 insert into public.team_members(team_id,user_id,role,display_name) values(team,auth.uid(),'owner',coalesce(auth.jwt()->>'email','Consultant'));
 return team;
end $$;
create or replace function public.create_team_invite(p_team uuid,p_role text default 'member') returns jsonb language plpgsql security definer set search_path=public as $$
declare code text; invitation uuid;
begin
 if coalesce(public.team_role(p_team),'') not in ('owner','admin') then raise exception 'Only team managers can invite members.'; end if;
 if p_role not in ('member','admin') or (p_role='admin' and public.team_role(p_team)<>'owner') then raise exception 'Only the owner can invite admins.'; end if;
 code:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.team_invites(team_id,code_hash,role,created_by) values(p_team,encode(sha256(convert_to(code,'UTF8')),'hex'),p_role,auth.uid()) returning id into invitation;
 return jsonb_build_object('id',invitation,'code',code,'expires_at',now()+interval '7 days');
end $$;
create or replace function public.join_team(p_code text) returns uuid language plpgsql security definer set search_path=public as $$
declare invitation public.team_invites;
begin
 if auth.uid() is null then raise exception 'Sign in to join a team.'; end if;
 select * into invitation from public.team_invites where code_hash=encode(sha256(convert_to(btrim(p_code),'UTF8')),'hex') for update;
 if not found or invitation.used_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now() then raise exception 'Invite is invalid, expired or already used.'; end if;
 if exists(select 1 from public.team_members where team_id=invitation.team_id and user_id=auth.uid()) then raise exception 'You already belong to this team.'; end if;
 insert into public.team_members(team_id,user_id,role,display_name) values(invitation.team_id,auth.uid(),invitation.role,coalesce(auth.jwt()->>'email','Consultant'));
 update public.team_invites set used_at=now() where id=invitation.id;
 return invitation.team_id;
end $$;
create or replace function public.manage_team(p_team uuid,p_action text,p_user uuid default null,p_value text default null,p_invite uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare actor_role text; target_role text;
begin
 actor_role:=public.team_role(p_team);
 if coalesce(actor_role,'') not in ('owner','admin') then raise exception 'Only team managers can change membership.'; end if;
 if p_action='rename' then
  if length(btrim(p_value)) not between 2 and 80 then raise exception 'Team name must be 2 to 80 characters.'; end if;
  update public.teams set name=btrim(p_value) where id=p_team;
 elsif p_action='revoke_invite' then
  update public.team_invites set revoked_at=now() where id=p_invite and team_id=p_team and (actor_role='owner' or role='member');
  if not found then raise exception 'Invite not found or inaccessible.'; end if;
 elsif p_action in ('update_member','remove_member') then
  select role into target_role from public.team_members where team_id=p_team and user_id=p_user for update;
  if not found or target_role='owner' then raise exception 'The team owner cannot be changed or removed.'; end if;
  if actor_role<>'owner' and (target_role<>'member' or p_action='update_member') then raise exception 'Only the owner can manage admins or change roles.'; end if;
  if p_action='remove_member' then delete from public.team_members where team_id=p_team and user_id=p_user;
  else
   if p_value not in ('member','admin') then raise exception 'Invalid member role.'; end if;
   update public.team_members set role=p_value where team_id=p_team and user_id=p_user;
  end if;
 else raise exception 'Unknown team action.';
 end if;
end $$;

-- Preserve append-only events while attaching their tenant to every operation.
create or replace function public.record_workspace_activity() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb; event_name text; extra jsonb;
begin
 r:=case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
 event_name:=lower(TG_OP)||'_'||TG_TABLE_NAME;
 extra:=jsonb_build_object('operation',TG_OP,'prospect_id',r->>'prospect_id');
 if TG_OP='INSERT' and TG_TABLE_NAME='prospect_profiles' then
  event_name:='generate_profile'; extra:=extra||jsonb_build_object('source',r->>'source','confidence',r->'confidence','interaction_count',(select count(*) from public.interactions where prospect_id=(r->>'prospect_id')::uuid));
 elsif TG_OP='INSERT' and TG_TABLE_NAME='strategies' then
  event_name:='generate_strategy'; extra:=extra||jsonb_build_object('profile_id',r->>'profile_id','source',r->>'source','confidence',r->'confidence');
 elsif TG_OP='UPDATE' and TG_TABLE_NAME in ('prospect_profiles','strategies') and (to_jsonb(OLD)->>'review_status') is distinct from (r->>'review_status') then
  event_name:=case when TG_TABLE_NAME='prospect_profiles' then 'profile_reviewed' else 'strategy_reviewed' end; extra:=extra||jsonb_build_object('review_status',r->>'review_status');
 elsif TG_OP='UPDATE' and TG_TABLE_NAME='prospects' and (to_jsonb(OLD)->>'status') is distinct from (r->>'status') then
  event_name:='prospect_status_changed'; extra:=extra||jsonb_build_object('status',r->>'status');
 end if;
 insert into public.audit_logs(actor,action,target_id,target_type,metadata,user_id,tenant_id) values(coalesce(auth.uid()::text,'demo-consultant'),event_name,(r->>'id')::uuid,TG_TABLE_NAME,extra,(r->>'user_id')::uuid,(r->>'tenant_id')::uuid);
 return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
create or replace function public.guard_strategy_source() returns trigger language plpgsql set search_path=public as $$
declare p public.prospect_profiles;
begin
 if NEW.profile_id is not null then
  select * into p from public.prospect_profiles where id=NEW.profile_id for share;
  if not found or p.prospect_id<>NEW.prospect_id or p.tenant_id is distinct from NEW.tenant_id then raise exception 'Profile must belong to the prospect workspace.'; end if;
  if (TG_OP='INSERT' or NEW.profile_id is distinct from OLD.profile_id or NEW.prospect_id is distinct from OLD.prospect_id or (NEW.review_status='approved' and OLD.review_status is distinct from NEW.review_status)) and p.review_status<>'approved' then raise exception 'Approve a matching profile first.'; end if;
 elsif TG_OP='INSERT' then raise exception 'Approve a matching profile first.';
 end if;
 return NEW;
end $$;
-- Tenant guard must run before strategy-source checks; triggers are alphabetical.
alter trigger tenant_record_guard on public.strategies rename to a_tenant_record_guard;
create or replace function public.suggest_status(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.prospects; mood text; suggested text; result jsonb;
begin
 select * into p from public.prospects where id=p_id;
 if not found or not public.tenant_access(p.tenant_id,p.user_id) then raise exception 'Prospect not found or inaccessible.'; end if;
 select mood_after into mood from public.interactions where prospect_id=p_id and tenant_id is not distinct from p.tenant_id order by created_at desc limit 1;
 if not found then raise exception 'Log an interaction first.'; end if;
 suggested:=case when p.status='new' and mood='positive' then 'engaged' else p.status end;
 result:=jsonb_build_object('status',suggested,'explanation','Latest recorded mood: '||coalesce(mood,'unknown')||'. This is a suggestion; review before applying.');
 insert into public.audit_logs(actor,action,target_id,target_type,metadata,user_id,tenant_id) values(coalesce(auth.uid()::text,'demo-consultant'),'suggest_status',p_id,'prospects',result,p.user_id,p.tenant_id);
 return result;
end $$;
revoke all on function public.team_role(uuid),public.tenant_access(uuid,uuid),public.ensure_personal_team(),public.create_team(text),public.create_team_invite(uuid,text),public.join_team(text),public.manage_team(uuid,text,uuid,text,uuid) from public;
grant execute on function public.team_role(uuid),public.tenant_access(uuid,uuid) to anon,authenticated;
grant execute on function public.ensure_personal_team(),public.create_team(text),public.create_team_invite(uuid,text),public.join_team(text),public.manage_team(uuid,text,uuid,text,uuid) to authenticated;

-- Assigned leads: team managers see the whole pipeline; consultants see their assignments.
alter table public.prospects add column assigned_to uuid;
update public.prospects set assigned_to=user_id where tenant_id is not null;
create index prospects_tenant_assignee on public.prospects(tenant_id,assigned_to);
create or replace function public.prospect_access(p_team uuid,p_owner uuid,p_assignee uuid) returns boolean language sql stable set search_path=public as $$
 select case when auth.uid() is null then p_team is null and p_owner is null
 else public.team_role(p_team) in ('owner','admin') or (public.team_role(p_team)='member' and p_assignee=auth.uid()) end;
$$;
create or replace function public.lead_access(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select public.prospect_access(tenant_id,user_id,assigned_to) from public.prospects where id=p_id),false);
$$;
create or replace function public.guard_tenant_record() returns trigger language plpgsql set search_path=public as $$
declare parent_team uuid; parent_owner uuid;
begin
 if TG_OP='UPDATE' and (NEW.tenant_id is distinct from OLD.tenant_id or NEW.user_id is distinct from OLD.user_id) then raise exception 'Record workspace and creator cannot be changed.'; end if;
 if TG_TABLE_NAME='prospects' then
  if TG_OP='INSERT' then
   if NEW.user_id is distinct from auth.uid() and current_user in ('anon','authenticated') then raise exception 'Invalid record creator.'; end if;
   if NEW.tenant_id is not null and NEW.assigned_to is null then NEW.assigned_to:=NEW.user_id; end if;
  end if;
  if NEW.tenant_id is null and NEW.assigned_to is not null then raise exception 'Demo records cannot be assigned.'; end if;
  if NEW.tenant_id is not null then
   if not exists(select 1 from public.team_members where team_id=NEW.tenant_id and user_id=NEW.assigned_to) then raise exception 'Assign the prospect to a current team member.'; end if;
   if (TG_OP='UPDATE' and NEW.assigned_to is distinct from OLD.assigned_to) or (TG_OP='INSERT' and NEW.assigned_to is distinct from auth.uid()) then
    if coalesce(public.team_role(NEW.tenant_id),'') not in ('owner','admin') and current_user in ('anon','authenticated') then raise exception 'Only team managers can assign prospects.'; end if;
   end if;
  end if;
 else
  select tenant_id,user_id into parent_team,parent_owner from public.prospects where id=NEW.prospect_id;
  if not found then raise exception 'Prospect not found or inaccessible.'; end if;
  if TG_OP='INSERT' and NEW.tenant_id is null then NEW.tenant_id:=parent_team; end if;
  if NEW.tenant_id is distinct from parent_team or NEW.user_id is distinct from parent_owner then raise exception 'Record must belong to the prospect workspace.'; end if;
 end if;
 return NEW;
end $$;
drop policy prospects_tenant_access on public.prospects;
create policy prospects_tenant_access on public.prospects for all using(public.prospect_access(tenant_id,user_id,assigned_to)) with check(public.prospect_access(tenant_id,user_id,assigned_to));
do $$ declare t text; begin
 foreach t in array array['interactions','prospect_profiles','strategies'] loop
  execute format('drop policy %I on public.%I',t||'_tenant_access',t);
  execute format('create policy %I on public.%I for all using(public.lead_access(prospect_id)) with check(public.lead_access(prospect_id) and public.tenant_access(tenant_id,user_id))',t||'_tenant_access',t);
 end loop;
end $$;
drop policy audit_tenant_read on public.audit_logs;
create policy audit_tenant_read on public.audit_logs for select using(
 (auth.uid() is null and tenant_id is null and user_id is null)
 or public.team_role(tenant_id) in ('owner','admin')
 or public.lead_access(case when target_type='prospects' then target_id else nullif(metadata->>'prospect_id','')::uuid end)
);
create or replace function public.suggest_status(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.prospects; mood text; suggested text; result jsonb;
begin
 select * into p from public.prospects where id=p_id;
 if not found or not public.lead_access(p_id) then raise exception 'Prospect not found or inaccessible.'; end if;
 select mood_after into mood from public.interactions where prospect_id=p_id and tenant_id is not distinct from p.tenant_id order by created_at desc limit 1;
 if not found then raise exception 'Log an interaction first.'; end if;
 suggested:=case when p.status='new' and mood='positive' then 'engaged' else p.status end;
 result:=jsonb_build_object('status',suggested,'explanation','Latest recorded mood: '||coalesce(mood,'unknown')||'. This is a suggestion; review before applying.');
 insert into public.audit_logs(actor,action,target_id,target_type,metadata,user_id,tenant_id) values(coalesce(auth.uid()::text,'demo-consultant'),'suggest_status',p_id,'prospects',result,p.user_id,p.tenant_id);
 return result;
end $$;
create or replace function public.assign_team_prospect(p_team uuid,p_id uuid,p_user uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if coalesce(public.team_role(p_team),'') not in ('owner','admin') then raise exception 'Only team managers can assign prospects.'; end if;
 if not exists(select 1 from public.team_members where team_id=p_team and user_id=p_user) then raise exception 'Assign the prospect to a current team member.'; end if;
 update public.prospects set assigned_to=p_user where id=p_id and tenant_id=p_team;
 if not found then raise exception 'Prospect not found or inaccessible.'; end if;
end $$;
-- Before removing a member, managers must reassign all of that member's leads.
create or replace function public.manage_team(p_team uuid,p_action text,p_user uuid default null,p_value text default null,p_invite uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare actor_role text; target_role text;
begin
 actor_role:=public.team_role(p_team);
 if coalesce(actor_role,'') not in ('owner','admin') then raise exception 'Only team managers can change membership.'; end if;
 if p_action='rename' then
  if length(btrim(p_value)) not between 2 and 80 then raise exception 'Team name must be 2 to 80 characters.'; end if;
  update public.teams set name=btrim(p_value) where id=p_team;
 elsif p_action='revoke_invite' then
  update public.team_invites set revoked_at=now() where id=p_invite and team_id=p_team and (actor_role='owner' or role='member');
  if not found then raise exception 'Invite not found or inaccessible.'; end if;
 elsif p_action in ('update_member','remove_member') then
  select role into target_role from public.team_members where team_id=p_team and user_id=p_user for update;
  if not found or target_role='owner' then raise exception 'The team owner cannot be changed or removed.'; end if;
  if actor_role<>'owner' and (target_role<>'member' or p_action='update_member') then raise exception 'Only the owner can manage admins or change roles.'; end if;
  if p_action='remove_member' then
   if exists(select 1 from public.prospects where tenant_id=p_team and assigned_to=p_user) then raise exception 'Reassign this member''s prospects before removal.'; end if;
   delete from public.team_members where team_id=p_team and user_id=p_user;
  else
   if p_value not in ('member','admin') then raise exception 'Invalid member role.'; end if;
   update public.team_members set role=p_value where team_id=p_team and user_id=p_user;
  end if;
 else raise exception 'Unknown team action.';
 end if;
end $$;
revoke all on function public.prospect_access(uuid,uuid,uuid),public.lead_access(uuid),public.assign_team_prospect(uuid,uuid,uuid) from public;
grant execute on function public.prospect_access(uuid,uuid,uuid),public.lead_access(uuid) to anon,authenticated;
grant execute on function public.assign_team_prospect(uuid,uuid,uuid) to authenticated;

