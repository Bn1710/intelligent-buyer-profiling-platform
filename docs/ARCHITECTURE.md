# Architecture

## Stack
Next.js (App Router) + Supabase (Postgres + RLS) + Vercel. AI via server-side API routes calling an LLM.

## Build Now vs Later
**Now:** prospect CRUD, interaction logging, profile generation, strategy generation, dashboard list.
**Later:** social-media data enrichment, automated follow-up task creation, performance analytics, auth + per-user RLS.

## Key User Action Flow
1. Consultant opens Prospects, clicks "New Prospect" → fills form → saves.
2. Opens prospect → logs an interaction (observations, objections, mood).
3. Clicks "Generate Profile" → server reads prospect + all interactions → LLM produces structured behavioral analysis → stored with source/confidence/review_status.
4. Clicks "Generate Strategy" → server reads profile + prospect data → LLM returns pitch angle, talking points, closing technique, cultural notes → stored.
5. Consultant reviews, edits, uses in next meeting, updates prospect status.

## Nav Shell
Persistent left sidebar (desktop): Prospects, Interactions, Profiles, Strategies. Collapses to hamburger on mobile. Current section highlighted.

## Layer Plan
1. **Data layer** — Supabase tables, RLS (permissive v1), typed data-access functions in `lib/data/`.
2. **App logic** — server actions for CRUD + generation in `lib/actions/`.
3. **AI module** — `lib/ai/` builds prompts from queried context, calls LLM, returns structured JSON.

The core (prospect + interaction CRUD) runs with AI off. Profile/strategy generation degrade to manual entry if AI is unavailable.

## Repo Structure
```
src/
  features/
    prospects/     (UI + types)
    interactions/
    profiles/
    strategies/
  components/      (shared shell, forms, tables)
  lib/
    data/           (all DB reads/writes)
    actions/        (server actions)
    ai/             (LLM calls, prompt builders)
  tests/            (beside features)
```

## Module Map
| Module | Responsibility | Owns | Build Order |
|---|---|---|---|
| prospects | Prospect CRUD + list view | prospects table | 1 |
| interactions | Log meeting observations | interactions table | 2 |
| profiles | AI behavioral analysis | prospect_profiles table | 3 |
| strategies | Tailored pitch/closing strategy | strategies table | 4 |
