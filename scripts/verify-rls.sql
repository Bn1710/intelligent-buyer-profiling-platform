begin;
insert into public.prospects(id,user_id,name,source,cultural_background,status) values
('c1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','RLS test A','referral','Malay','new'),
('c1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','RLS test B','referral','Mainland Chinese','new');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',true);
do $$ begin
 if (select count(*) from public.prospects where id = 'c1000000-0000-4000-8000-000000000001') <> 1 then raise exception 'A cannot read own row'; end if;
 if exists(select 1 from public.prospects where id = 'c1000000-0000-4000-8000-000000000002' or user_id is null) then raise exception 'A saw B or demo rows'; end if;
 begin
  insert into public.interactions(prospect_id,user_id,consultant_name) values('c1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','Spoof');
  raise exception 'Cross-owner child write allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{}}',true);
do $$ begin
 if (select count(*) from public.prospects where id = 'c1000000-0000-4000-8000-000000000002') <> 1 then raise exception 'B cannot read own row'; end if;
 if exists(select 1 from public.prospects where id = 'c1000000-0000-4000-8000-000000000001') then raise exception 'B saw A'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 if exists(select 1 from public.prospects where user_id is not null) then raise exception 'Anon saw private rows'; end if;
 begin
  perform public.suggest_status('c1000000-0000-4000-8000-000000000001');
  raise exception 'Anon RPC accessed private row';
 exception when raise_exception then
  if SQLERRM <> 'Prospect not found or inaccessible.' then raise; end if;
 end;
 begin
  update public.audit_logs set actor = 'spoof';
  raise exception 'Audit update was allowed';
 exception when insufficient_privilege then null; end;
end $$;
select 'PASS: consultant A/B isolation, demo isolation, cross-owner writes denied, private RPC denied, audit immutable' as result;
rollback;

