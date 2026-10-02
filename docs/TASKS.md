# Tasks & Sprints

## Sprint 1 — Core Data + Prospect CRUD (no login wall)
**Goal:** Prospect list, create, edit, delete persists to DB and renders live.
- [x] Create Supabase tables + seed data (migration SQL)
- [x] Data-access layer in `lib/data/prospects.ts`
- [x] Prospect list page (loading/empty/ready states)
- [x] New/edit prospect form (cultural background, budget, status)
- [x] Delete prospect with confirm
- [x] Left sidebar nav shell (responsive)
**DoD:** A user can create, edit, and delete a prospect and see the change immediately in the list. Empty state shows when no prospects exist.

## Sprint 2 — Interactions
**Goal:** Log and view meeting observations per prospect.
- [x] `lib/data/interactions.ts`
- [x] Interaction form (personality, intentions, objections, mood)
- [x] Interaction timeline on prospect detail page
- [x] Block profile generation when 0 interactions
**DoD:** User logs an interaction and it appears in the prospect's timeline. At least one interaction is required before profile generation.

## Sprint 3 — Profile Generation (CORE ENGINE)
**Goal:** AI behavioral profile generated from prospect + interactions.
- [x] `lib/ai/profile.ts` — prompt builder + LLM call + structured JSON parse
- [x] `generate_profile` server action
- [x] Profile view with all 5 dimensions + confidence + review_status
- [x] Approve/reject profile buttons
- [x] Audit log entry on generation
**DoD:** User clicks Generate Profile, sees structured analysis with confidence score, can approve or reject it.

## Sprint 4 — Strategy Generation (v1 FUNCTIONAL MILESTONE)
**Goal:** Tailored pitch + closing strategy from approved profile.
- [x] `lib/ai/strategy.ts` — prompt builder + LLM call
- [x] `generate_strategy` server action
- [x] Strategy view: pitch angle, talking points, closing technique, cultural considerations
- [x] Prospect status update flow
- [x] Dashboard: prospects ranked by status × confidence
**DoD:** Success scenario works end-to-end — prospect created, interaction logged, profile generated, strategy generated, status updated. **← v1 functional**

## Sprint 5 — Polish + Lock Down
**Goal:** Auth, RLS, edge states.
- [x] Supabase auth (login/signup)
- [x] RLS owner-scoped policies (replace v1 permissive)
- [x] Error/loading states for AI failures
- [x] Manual entry fallback when AI unavailable
- [x] Test plan execution
**DoD:** Logged-in consultant sees only their prospects. AI failures show graceful error, not crash.

## Gantt
```
Sprint 1: Data + Prospect CRUD     ██
Sprint 2: Interactions               ██
Sprint 3: Profile generation            ██
Sprint 4: Strategy + Dashboard            ██  ← v1 functional
Sprint 5: Auth + RLS + Polish                ██
```

