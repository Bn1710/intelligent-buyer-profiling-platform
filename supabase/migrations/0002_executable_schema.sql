-- AIRA Prospect Profiling Platform — v1 schema (demo-first, permissive RLS)
-- Core tables only. Secondary tables (audit_logs, tasks) added in later sprints.

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  contact_info text,
  source text,
  cultural_background text,
  budget_range text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table prospects enable row level security;
drop policy if exists "prospects_v1_read" on prospects;
create policy "prospects_v1_read" on prospects for select using (true);
drop policy if exists "prospects_v1_write" on prospects;
create policy "prospects_v1_write" on prospects for all using (true) with check (true);

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  prospect_id uuid not null references prospects(id) on delete cascade,
  consultant_name text,
  interaction_type text,
  personality_observations text,
  intentions text,
  objections text,
  lifestyle_notes text,
  mood_after text,
  created_at timestamptz not null default now()
);
alter table interactions enable row level security;
drop policy if exists "interactions_v1_read" on interactions;
create policy "interactions_v1_read" on interactions for select using (true);
drop policy if exists "interactions_v1_write" on interactions;
create policy "interactions_v1_write" on interactions for all using (true) with check (true);

create table if not exists prospect_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  prospect_id uuid not null references prospects(id) on delete cascade,
  summary text,
  socio_economic jsonb,
  investment_objectives jsonb,
  behavioral_tendencies jsonb,
  lifestyle_aspirations jsonb,
  motivations jsonb,
  source text,
  confidence numeric,
  review_status text not null default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table prospect_profiles enable row level security;
drop policy if exists "prospect_profiles_v1_read" on prospect_profiles;
create policy "prospect_profiles_v1_read" on prospect_profiles for select using (true);
drop policy if exists "prospect_profiles_v1_write" on prospect_profiles;
create policy "prospect_profiles_v1_write" on prospect_profiles for all using (true) with check (true);

create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  prospect_id uuid not null references prospects(id) on delete cascade,
  profile_id uuid references prospect_profiles(id) on delete set null,
  pitch_angle text,
  talking_points jsonb,
  closing_technique text,
  cultural_considerations text,
  source text,
  confidence numeric,
  review_status text not null default 'unreviewed',
  created_at timestamptz not null default now()
);
alter table strategies enable row level security;
drop policy if exists "strategies_v1_read" on strategies;
create policy "strategies_v1_read" on strategies for select using (true);
drop policy if exists "strategies_v1_write" on strategies;
create policy "strategies_v1_write" on strategies for all using (true) with check (true);


