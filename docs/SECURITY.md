# Security

## Secret Handling
- LLM API key stored in Vercel env vars (server-side only). Never exposed to client.
- Supabase service key server-side only; anon key is public (read-safe under RLS).
- No secrets in frontend code, env files committed, or client bundles.

## Permission Model
- **v1 (demo-first):** all tables permissive — anonymous read/write. No login wall.
- **Lock-down sprint:** enable per-user RLS. `auth.uid() = user_id` on all tables. Consultants see only their own prospects; management sees all (via role check).
- Agent (LLM) inherits the calling user's permissions — never runs as service role from client.

## Approved Tools Rule
- Only named server-side actions: `generate_profile`, `generate_strategy`, `suggest_status`.
- No generic `run_any` or `send_any` endpoints. No arbitrary SQL execution from client.

## Audit Principle
Every AI-generated action logs: actor, action name, target, timestamp, metadata. Audit log is append-only. Consultant can see what was auto-generated and when.

## Data Sensitivity
Prospect names/contacts are personal data. Lock-down must precede any real prospect data entry. Until then, only demo/seed data is used.
