-- Run after 0009 as database owner. Direct authenticated writes model REST access.
begin;
insert into public.teams(id,name) values('e9000000-0000-4000-8000-000000000001','Review QC team');
insert into public.team_members(team_id,user_id,role) values
 ('e9000000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000001','owner');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d9000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.prospects(id,tenant_id,user_id,name) values
 ('c9000000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000001','Review QC lead'),
 ('c9000000-0000-4000-8000-000000000002','e9000000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000001','Other QC lead');
insert into public.prospect_profiles(id,prospect_id,user_id,summary,review_status,source,confidence) values
 ('a9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000001',auth.uid(),'Original','approved','rules-assisted',0.7),
 ('a9000000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000001',auth.uid(),'Alternative','approved','rules-assisted',0.7),
 ('a9000000-0000-4000-8000-000000000003','c9000000-0000-4000-8000-000000000002',auth.uid(),'Other lead','approved','rules-assisted',0.7);
insert into public.strategies(id,prospect_id,user_id,profile_id,pitch_angle,review_status) values
 ('f9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000001',auth.uid(),'a9000000-0000-4000-8000-000000000001','Original pitch','approved');
do $$ begin
 -- A no-op content write and a review-only write must preserve approval.
 update public.prospect_profiles set summary=summary,review_status='approved' where id='a9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.prospect_profiles where id='a9000000-0000-4000-8000-000000000001' and review_status='approved') then raise exception 'No-op profile edit invalidated approval'; end if;
 update public.strategies set review_status='approved' where id='f9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.strategies where id='f9000000-0000-4000-8000-000000000001' and review_status='approved') then raise exception 'No-op strategy review invalidated approval'; end if;
 -- Supplying approved alongside new content cannot preserve an old approval.
 update public.prospect_profiles set summary='Direct REST edit',review_status='approved' where id='a9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.prospect_profiles where id='a9000000-0000-4000-8000-000000000001' and review_status='unreviewed') then raise exception 'Content edit retained profile approval'; end if;
 update public.prospect_profiles set review_status='approved' where id='a9000000-0000-4000-8000-000000000001';
 update public.prospect_profiles set source='consultant-edited' where id='a9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.prospect_profiles where id='a9000000-0000-4000-8000-000000000001' and review_status='unreviewed') then raise exception 'Source edit retained approval'; end if;
 update public.prospect_profiles set review_status='approved' where id='a9000000-0000-4000-8000-000000000001';
 update public.prospect_profiles set confidence=0.8 where id='a9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.prospect_profiles where id='a9000000-0000-4000-8000-000000000001' and review_status='unreviewed') then raise exception 'Confidence edit retained approval'; end if;
 update public.prospect_profiles set review_status='approved' where id='a9000000-0000-4000-8000-000000000001';
 update public.strategies set pitch_angle='Direct strategy edit',review_status='approved' where id='f9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.strategies where id='f9000000-0000-4000-8000-000000000001' and review_status='unreviewed') then raise exception 'Content edit retained strategy approval'; end if;
 update public.strategies set review_status='approved' where id='f9000000-0000-4000-8000-000000000001';
 update public.strategies set profile_id='a9000000-0000-4000-8000-000000000002' where id='f9000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.strategies where id='f9000000-0000-4000-8000-000000000001' and review_status='unreviewed') then raise exception 'Changed source retained approval'; end if;
 begin
  update public.strategies set profile_id='a9000000-0000-4000-8000-000000000003' where id='f9000000-0000-4000-8000-000000000001'; raise exception 'Wrong-prospect source accepted';
 exception when raise_exception then if SQLERRM<>'Profile must belong to the prospect workspace.' then raise; end if; end;
 update public.prospect_profiles set review_status='unreviewed' where id='a9000000-0000-4000-8000-000000000001';
 begin
  update public.strategies set profile_id='a9000000-0000-4000-8000-000000000001' where id='f9000000-0000-4000-8000-000000000001'; raise exception 'Unapproved changed source accepted';
 exception when raise_exception then if SQLERRM<>'Approve a matching profile first.' then raise; end if; end;
 update public.strategies set review_status='approved' where id='f9000000-0000-4000-8000-000000000001';
 delete from public.prospect_profiles where id='a9000000-0000-4000-8000-000000000002';
 if not exists(select 1 from public.strategies where id='f9000000-0000-4000-8000-000000000001' and profile_id is null and review_status='unreviewed') then raise exception 'Source deletion did not preserve an unreviewed historical draft'; end if;
 begin
  update public.strategies set review_status='approved' where id='f9000000-0000-4000-8000-000000000001'; raise exception 'Orphan strategy approved';
 exception when raise_exception then if SQLERRM<>'Approve a matching profile first.' then raise; end if; end;
 begin
  insert into public.strategies(prospect_id,user_id,profile_id) values('c9000000-0000-4000-8000-000000000001',auth.uid(),null); raise exception 'Missing source insert accepted';
 exception when raise_exception then if SQLERRM<>'Approve a matching profile first.' then raise; end if; end;
end $$;
select 'PASS: direct edits invalidate approval; no-op reviews preserve it; changed sources validate; deletion preserves drafts; orphan approval denied' as result;
rollback;
