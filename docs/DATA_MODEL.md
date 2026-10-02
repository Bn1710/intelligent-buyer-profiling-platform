# Data Model

## prospects
| Field | Type |
|---|---|
| id | uuid pk |
| user_id | uuid nullable |
| name | text not null |
| contact_info | text |
| source | text (walk-in/referral/social/press) |
| cultural_background | text (Malay/Malay-Chinese/Malay-Indian/Mainland Chinese) |
| budget_range | text |
| status | text default 'new' (new/engaged/negotiating/closed-won/closed-lost) |
| created_at | timestamptz default now() |

RLS v1: permissive read/write for demo. Lock-down: owner = user_id.

## interactions
| Field | Type |
|---|---|
| id | uuid pk |
| user_id | uuid nullable |
| prospect_id | uuid not null → prospects.id |
| consultant_name | text |
| interaction_type | text (call/meeting/site-visit/whatsapp) |
| personality_observations | text |
| intentions | text |
| objections | text |
| lifestyle_notes | text |
| mood_after | text (positive/neutral/negative) |
| created_at | timestamptz default now() |

RLS v1 permissive; later owner-scoped.

## prospect_profiles (AI-generated)
| Field | Type |
|---|---|
| id | uuid pk |
| user_id | uuid nullable |
| prospect_id | uuid → prospects.id |
| summary | text (AI-generated value) |
| socio_economic | jsonb (AI value) |
| investment_objectives | jsonb (AI value) |
| behavioral_tendencies | jsonb (AI value) |
| lifestyle_aspirations | jsonb (AI value) |
| motivations | jsonb (AI value) |
| source | text (model name) |
| confidence | numeric (0–1) |
| review_status | text default 'unreviewed' (unreviewed/approved/rejected) |
| created_at | timestamptz default now() |

## strategies (AI-generated)
| Field | Type |
|---|---|
| id | uuid pk |
| user_id | uuid nullable |
| prospect_id | uuid → prospects.id |
| profile_id | uuid → prospect_profiles.id |
| pitch_angle | text (AI value) |
| talking_points | jsonb (AI value, array) |
| closing_technique | text (AI value) |
| cultural_considerations | text (AI value) |
| source | text |
| confidence | numeric (0–1) |
| review_status | text default 'unreviewed' |
| created_at | timestamptz default now() |

**AI fields convention:** every AI-generated value stores value + source + confidence + review_status at the record level.
