# PRD — AIRA Prospect Profiling Platform

## Problem
Sales Consultants at AIRA Residence (luxury condo, KL) have no tool to tailor their pitch and closing strategy to a prospect's socio-economic profile, investment objectives, cultural background (Malay, Malay-Chinese, Malay-Indian, Mainland Chinese), lifestyle aspirations, and behavioral tendencies. Conversions suffer from generic pitches.

## Target User
3 Sales Consultants + management. Internal tool, not for resale.

## Core Objects
- **Prospects** — lead data: name, contact, source, cultural background, budget range, status.
- **Interactions** — consultant observations: personality, intentions, objections, lifestyle notes, mood after meeting.
- **Profiles** — AI-generated socio-behavioral analysis (value + source + confidence + review_status).
- **Strategies** — tailored pitch + closing approach per prospect.

## MVP (v1) Checklist
- [x] Add/edit/delete a prospect with lead data
- [x] Log interaction observations after each meeting
- [x] Generate a behavioral profile from prospect + interaction data (AI, with review status)
- [x] Generate a tailored strategy: pitch angle, key talking points, closing technique, cultural considerations
- [x] View prospect list with status and latest profile summary
- [x] All CRUD persists to DB; UI reflects changes live
- [x] Works without login (demo-first with seed data)

## Non-goals (v1)
- Social media/press scraping automation
- Automated messaging to prospects
- CRM replacement or booking-form integration
- Multi-tenant or external user accounts

## Success Scenario
Consultant creates a prospect (Mainland Chinese, investor), logs two interaction notes (risk-averse, family-oriented). Clicks "Generate Profile" — gets a behavioral analysis with confidence scores. Clicks "Generate Strategy" — gets a pitch angle (capital preservation + legacy), three talking points, a closing technique (soft, relationship-first), and cultural notes. Consultant uses it in the next meeting and marks the prospect status as "Negotiating."

