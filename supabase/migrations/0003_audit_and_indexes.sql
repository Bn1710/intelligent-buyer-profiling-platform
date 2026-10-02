create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor text not null,
 action text not null,
 target_id uuid not null,
 target_type text not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy audit_demo_read on public.audit_logs for select to anon, authenticated using (true);
create policy audit_demo_append on public.audit_logs for insert to anon, authenticated with check (true);
grant select, insert on public.audit_logs to anon, authenticated;
revoke update, delete, truncate on public.audit_logs from anon, authenticated;
create index if not exists interactions_prospect_created on public.interactions(prospect_id, created_at desc);
create index if not exists profiles_prospect_created on public.prospect_profiles(prospect_id, created_at desc);
create index if not exists strategies_prospect_created on public.strategies(prospect_id, created_at desc);

