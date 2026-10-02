-- Run after 0008 as database owner. All fixtures and RPC effects roll back.
begin;
insert into public.teams(id,name) values
('e8000000-0000-4000-8000-000000000001','Tenant isolation A'),
('e8000000-0000-4000-8000-000000000002','Tenant isolation B');
insert into public.team_members(team_id,user_id,role,display_name) values
('e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','owner','Owner A'),
('e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000002','member','Consultant A'),
('e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000003','member','Consultant B'),
('e8000000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000004','owner','Other tenant');
insert into public.prospects(id,tenant_id,user_id,assigned_to,name,status) values
('c8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000002','Assigned to A','new'),
('c8000000-0000-4000-8000-000000000002','e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000003','Assigned to B','new'),
('c8000000-0000-4000-8000-000000000003','e8000000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000004','d8000000-0000-4000-8000-000000000004','Other tenant lead','new');
insert into public.interactions(id,prospect_id,user_id,tenant_id,mood_after) values
('b8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','positive'),
('b8000000-0000-4000-8000-000000000002','c8000000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','negative');
insert into public.prospect_profiles(id,prospect_id,tenant_id,user_id,review_status,summary) values
('a8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','approved','Approved source'),
('a8000000-0000-4000-8000-000000000002','c8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','unreviewed','Unreviewed source'),
('a8000000-0000-4000-8000-000000000003','c8000000-0000-4000-8000-000000000003','e8000000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000004','approved','Other tenant source');
insert into public.strategies(id,prospect_id,tenant_id,user_id,profile_id,review_status) values
('f8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','unreviewed');
create temporary table tenant_test_invites(label text primary key, invitation jsonb);
grant all on tenant_test_invites to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000002","role":"authenticated","email":"a@example.com"}',true);
do $$ begin
 if (select count(*) from public.prospects where id in ('c8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000002','c8000000-0000-4000-8000-000000000003'))<>1 then raise exception 'Assigned consultant saw unassigned or cross-tenant leads'; end if;
 if exists(select 1 from public.interactions where id='b8000000-0000-4000-8000-000000000002') then raise exception 'Unassigned interactions exposed'; end if;
 if exists(select 1 from public.audit_logs where target_id='c8000000-0000-4000-8000-000000000002' or metadata->>'prospect_id'='c8000000-0000-4000-8000-000000000002') then raise exception 'Unassigned audit exposed'; end if;
 begin
  update public.strategies set profile_id='a8000000-0000-4000-8000-000000000002' where id='f8000000-0000-4000-8000-000000000001'; raise exception 'Unapproved changed source accepted';
 exception when raise_exception then if SQLERRM<>'Approve a matching profile first.' then raise; end if; end;
 begin
  update public.strategies set profile_id='a8000000-0000-4000-8000-000000000003' where id='f8000000-0000-4000-8000-000000000001'; raise exception 'Cross-tenant profile link accepted';
 exception when raise_exception then if SQLERRM<>'Profile must belong to the prospect workspace.' then raise; end if; end;
 update public.prospects set status='engaged' where id='c8000000-0000-4000-8000-000000000001';
 if not found then raise exception 'Member cannot edit assigned lead'; end if;
 begin
  perform public.suggest_status('c8000000-0000-4000-8000-000000000002'); raise exception 'Unassigned status RPC exposed';
 exception when raise_exception then if SQLERRM<>'Prospect not found or inaccessible.' then raise; end if; end;
 begin
  update public.prospects set assigned_to='d8000000-0000-4000-8000-000000000003' where id='c8000000-0000-4000-8000-000000000001'; raise exception 'Member reassigned a lead';
 exception when raise_exception then if SQLERRM<>'Only team managers can assign prospects.' then raise; end if; end;
 begin
  perform public.create_team_invite('e8000000-0000-4000-8000-000000000001'); raise exception 'Member invited';
 exception when raise_exception then if SQLERRM<>'Only team managers can invite members.' then raise; end if; end;
 begin
  insert into public.interactions(prospect_id,user_id,tenant_id) values('c8000000-0000-4000-8000-000000000003','d8000000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001'); raise exception 'Cross-tenant child accepted';
 exception when raise_exception then if SQLERRM<>'Prospect not found or inaccessible.' then raise; end if; end;
 begin
  update public.team_members set role='owner' where user_id='d8000000-0000-4000-8000-000000000002'; raise exception 'Direct privilege escalation accepted';
 exception when insufficient_privilege then null; end;
 insert into public.prospects(id,tenant_id,user_id,name) values('c8000000-0000-4000-8000-000000000004','e8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000002','Member-created self assignment');
 if not exists(select 1 from public.prospects where id='c8000000-0000-4000-8000-000000000004' and assigned_to=auth.uid()) then raise exception 'New member lead not self-assigned'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.com"}',true);
do $$ begin
 if (select count(*) from public.prospects where id in ('c8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000002'))<>2 then raise exception 'Owner cannot see all team leads'; end if;
 if exists(select 1 from public.prospects where id='c8000000-0000-4000-8000-000000000003') then raise exception 'Owner saw other tenant'; end if;
 begin
  perform public.assign_team_prospect('e8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000004'); raise exception 'Assigned outsider';
 exception when raise_exception then if SQLERRM<>'Assign the prospect to a current team member.' then raise; end if; end;
 begin
  perform public.manage_team('e8000000-0000-4000-8000-000000000001','remove_member','d8000000-0000-4000-8000-000000000002'); raise exception 'Removed assigned member';
 exception when raise_exception then if SQLERRM<>'Reassign this member''s prospects before removal.' then raise; end if; end;
 perform public.assign_team_prospect('e8000000-0000-4000-8000-000000000001','c8000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000003');
end $$;
insert into tenant_test_invites values('join',public.create_team_invite('e8000000-0000-4000-8000-000000000001','member'));
insert into tenant_test_invites values('expire',public.create_team_invite('e8000000-0000-4000-8000-000000000001','member'));
insert into tenant_test_invites values('revoke',public.create_team_invite('e8000000-0000-4000-8000-000000000001','member'));
reset role;
update public.team_invites set expires_at=now()-interval '1 minute' where id=(select (invitation->>'id')::uuid from tenant_test_invites where label='expire');
set local role authenticated;
select public.manage_team('e8000000-0000-4000-8000-000000000001','revoke_invite',null,null,(select (invitation->>'id')::uuid from tenant_test_invites where label='revoke'));
select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.prospects where id='c8000000-0000-4000-8000-000000000001') then raise exception 'Old assignee retains access'; end if;
 if exists(select 1 from public.audit_logs where target_id='c8000000-0000-4000-8000-000000000001' or metadata->>'prospect_id'='c8000000-0000-4000-8000-000000000001') then raise exception 'Old assignee retains audit access'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000005","role":"authenticated","email":"joiner@example.com"}',true);
select public.join_team((select invitation->>'code' from tenant_test_invites where label='join'));
do $$ begin
 if public.team_role('e8000000-0000-4000-8000-000000000001')<>'member' then raise exception 'Invite did not create membership'; end if;
 if exists(select 1 from public.prospects where tenant_id='e8000000-0000-4000-8000-000000000001') then raise exception 'New member saw unassigned leads'; end if;
 begin
  perform public.join_team((select invitation->>'code' from tenant_test_invites where label='expire')); raise exception 'Expired invitation accepted';
 exception when raise_exception then if SQLERRM<>'Invite is invalid, expired or already used.' then raise; end if; end;
 begin
  perform public.join_team((select invitation->>'code' from tenant_test_invites where label='revoke')); raise exception 'Revoked invitation accepted';
 exception when raise_exception then if SQLERRM<>'Invite is invalid, expired or already used.' then raise; end if; end;
 begin
  perform public.join_team((select invitation->>'code' from tenant_test_invites where label='join')); raise exception 'Reused invitation accepted';
 exception when raise_exception then if SQLERRM<>'Invite is invalid, expired or already used.' then raise; end if; end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 if exists(select 1 from public.prospects where tenant_id is not null or user_id is not null) then raise exception 'Anonymous private lead leak'; end if;
 begin
  perform public.suggest_status('c8000000-0000-4000-8000-000000000001'); raise exception 'Anonymous private RPC allowed';
 exception when raise_exception then if SQLERRM<>'Prospect not found or inaccessible.' then raise; end if; end;
end $$;
select 'PASS: assigned lead isolation, team owner visibility, cross-tenant denial, assignment controls, auto-self assignment, single-use/revoked invites and demo separation' as result;
rollback;

