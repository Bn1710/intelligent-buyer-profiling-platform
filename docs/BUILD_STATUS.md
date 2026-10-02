# Build status — 2 October 2026

Production: https://intelligent-buyer-profiling-platfor.vercel.app

The complete consultant workflow is implemented: prospect CRUD, editable interaction timeline, five-dimensional profiles, consultant approval/rejection, editable strategies with at least three talking points, and persisted status updates. All four navigation sections contain live database records and open their prospect workspace. The pipeline ranks status × confidence and highlights declared budgets of at least 2M MYR when confidence is at least 70%.

The core engine was included in Sprint 1, as required by AGENTS.md. Sprint 2 completed the typed interaction data layer. Sprint 3 added structured-model validation, timeout fallback tests and approved-edit confirmation. Sprint 4 completed ranked priorities, strategy-source enforcement and audited status suggestions requiring approval. Sprint 5 adds email/password accounts, account confirmation callbacks, owner-scoped RLS, separate public demo rows and error/loading states. Each sprint was pushed to main. Vercel was connected to GitHub and a pnpm workspace installation issue was repaired through Git.

## Database

The provisioned project had no core tables. The original 0001 migration contains literal escaped text and remains unchanged. Executable migrations 0002–0007 create the documented schema, fictional seed data, indexes, append-only transactional audit triggers, the named status tool, strategy approval enforcement and private workspaces. These changes were applied through the Supabase SQL editor and verified through the application's anonymous key.

Anonymous users may only read/write ownerless demo rows. Signed-in consultants may read/write their own rows. The trusted app_metadata role management can read all records. Child writes must match their parent owner. Audit records cannot be inserted, edited or deleted by public clients. Suggestions validate ownership independently of RLS because their database function logs under a privileged trigger-like context.

## Verification

- Production build with TypeScript and ESLint enabled: passed.
- Five intelligence tests: passed, including malformed model output and provider timeout.
- API success scenario against the live Supabase database and production app: passed. Test-only records are removed with cascade checks; unrelated seed/demo rows remain.
- Transactional database tests with two authenticated identities and the anonymous role: passed. Own-row visibility, cross-owner denial, demo separation, private RPC denial and audit immutability are verified; fixtures are rolled back.
- Browser workflow: prospect creation and two notes persisted through production forms; generated profile/strategy and status update are checked in the production UI.
- Supabase Site URL and exact callback allow-list are configured for production, localhost:3000 and localhost:3001.

## AI configuration

Vercel's environment contained Supabase credentials but no OPENAI_API_KEY. The real server-side LLM integration is implemented, validated and tested with mocked success/failure responses; a live provider call is not verified. Until a key is supplied, Generate Profile/Strategy saves a clearly labelled evidence-based editable draft, never a falsely attributed AI result. Manual entry is also available. Evidence confidence follows the PRD's rule (0.5 + 0.1 × interaction count, capped at 0.9); it is not calibrated predictive accuracy.

Configure OPENAI_API_KEY as a server-only Vercel variable for live AI; OPENAI_MODEL optionally selects the model. Deploy changes by Git only.

## Team tenancy, mockups and mobile follow-up

Migration 0008 is applied. Each account receives a personal workspace that preserves its existing records. Users can create sales teams, join with a hashed single-use seven-day invitation, and switch teams. Owners manage roles; admins manage consultant invitations and membership. Consultants see only assigned prospects and their interactions, profiles, strategies and audit events. Owners/admins see the whole team pipeline. Members create leads assigned to themselves; managers reassign leads. Removal requires prior lead reassignment. The former global management visibility bypass is removed.

Active team cookies are checked against current membership on every request. SQL guards validate parent/child tenant consistency, creator identity and approved strategy sources. Database authorization tests run with multiple authenticated principals and anonymous access, with fixtures rolled back. They passed on the live database, including assignment/audit isolation, cross-tenant denial, invalid source linking and invitation expiry/revocation/replay. Use scripts/team-rls-tests.sql for the current model; earlier owner-only RLS tests describe the historical schema.

The existing public core API scenario still passes after tenancy: prospect, two observations, reviewed 70% profile, 66.5% strategy and Negotiating, plus audit, prerequisites and protected edits. The integrated production build, TypeScript, ESLint and five intelligence tests pass. Signed-in team authorization is verified at the SQL principal level; a full two-account browser login/invitation journey has not been exercised.

Mobile prospect cards replace the desktop table below 1200px. Phone navigation uses a dismissible modal drawer, controls have 44px targets and inputs use 16px text. Browser checks at 320, 375, 390, 430 and 768px show cards and no horizontal overflow; the phone detail and prospect form remain usable. Physical phone keyboard behavior has not been tested.

Two interactive fictional design concepts, Concierge and Team Operations, are available at /design/aira-workspace.html, each with desktop and phone layouts. They are explicitly local mockups; their forms never write production data.
