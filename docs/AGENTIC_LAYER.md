# Agentic Layer

## Risk Levels

### Low (auto)
- Generate behavioral profile from stored data
- Generate tailored strategy from profile + prospect data
- Tag prospect with suggested status
- Summarize interaction notes

### Medium (light approval)
- Create a follow-up task from strategy recommendations
- Update prospect status based on interaction mood

### High (always approval)
- Send a drafted follow-up message to prospect (not in v1)
- Modify a consultant-approved profile

### Critical (human-only)
- Delete a prospect record
- Delete interaction history
- Any external communication

## Named Tools (v1)
- `generate_profile` — input: prospect_id; reads prospect + interactions; calls LLM; stores structured profile.
- `generate_strategy` — input: prospect_id; reads latest approved profile; calls LLM; stores strategy.
- `suggest_status` — input: prospect_id + latest interaction; returns suggested status (no auto-write).

No raw `run_any` / `send_any`. Only these named tools.

## Audit Log Fields
| Field | Type |
|---|---|
| id | uuid pk |
| actor | text (consultant name or 'system') |
| action | text (generate_profile/generate_strategy/suggest_status) |
| target_id | uuid |
| target_type | text |
| metadata | jsonb |
| created_at | timestamptz |

## v1 vs Later
- **v1:** generate_profile, generate_strategy, suggest_status. All low-risk, auto-executed on button click.
- **Later:** follow-up task creation (medium), drafted messages (high), consultant performance analytics.
