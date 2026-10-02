# Tasks & Sprints

## Sprint 1 — Core Data + Prospect CRUD (no login wall)
**Goal:** Prospect list, create, edit, delete persists to DB and renders live.
- [ ] Create Supabase tables + seed data (migration SQL)
- [ ] Data-access layer in `lib/data/prospects.ts`
- [ ] Prospect list page (loading/empty/ready states)
- [ ] New/edit prospect form (cultural background, budget, status)
- [ ] Delete prospect with confirm
- [ ] Left sidebar nav shell (responsive)
**DoD:** A user can create, edit, and delete a prospect and see the change immediately in the list. Empty state shows when no prospects exist.

## Sprint 2 — Interactions
**Goal:** Log and view meeting observations per prospect.
- [ ] `lib/data/interactions.ts`
- [ ] Interaction form (personality, intentions, objections, mood)
- [ ] Interaction timeline on prospect detail page
- [ ] Block profile generation when 0 interactions
**DoD:** User logs an interaction and it appears in the prospect's timeline. At least one interaction is required before profile generation.

## Sprint 3 — Profile Generation (CORE ENGINE)
**Goal:** AI behavioral profile generated from prospect + interactions.
- [ ] `lib/ai/profile.ts` — prompt builder + LLM call + structured JSON parse
- [ ] `generate_profile` server action
- [ ] Profile view with all 5 dimensions + confidence + review_status
- [ ] Approve/reject profile buttons
- [ ] Audit log entry on generation
**DoD:** User clicks Generate Profile, sees structured analysis with confidence score, can approve or reject it.

## Sprint 4 — Strategy Generation (v1 FUNCTIONAL MILESTONE)
**Goal:** Tailored pitch + closing strategy from approved profile.
- [ ] `lib/ai/strategy.ts` — prompt builder + LLM call
- [ ] `generate_strategy` server action
- [ ] Strategy view: pitch angle, talking points, closing technique, cultural considerations
- [ ] Prospect status update flow
- [ ] Dashboard: prospects ranked by status × confidence
**DoD:** Success scenario works end-to-end — prospect created, interaction logged, profile generated, strategy generated, status updated. **← v1 functional**

## Sprint 5 — Polish + Lock Down
**Goal:** Auth, RLS, edge states.
- [ ] Supabase auth (login/signup)
- [ ] RLS owner-scoped policies (replace v1 permissive)
- [ ] Error/loading states for AI failures
- [ ] Manual entry fallback when AI unavailable
- [ ] Test plan execution
**DoD:** Logged-in consultant sees only their prospects. AI failures show graceful error, not crash.

## Gantt
```
Sprint 1: Data + Prospect CRUD     ██
Sprint 2: Interactions               ██
Sprint 3: Profile generation            ██
Sprint 4: Strategy + Dashboard            ██  ← v1 functional
Sprint 5: Auth + RLS + Polish                ██
```
