# AIRA Prospect Profiling Platform

Live app: https://intelligent-buyer-profiling-platfor.vercel.app

A working consultant workspace for AIRA Residence: create a prospect, log observations, generate and review a profile, prepare a tailored strategy, and update the relationship status. The homepage is the public demo; sign in to work with private prospect records.

## Local development

Use Node.js 22 and pnpm 9.15.9.

```bash
pnpm install
vercel link
vercel env pull .env.local
pnpm dev
```

Use the existing Supabase URL and anonymous key from Vercel. A service-role key is not required by the app. Never commit environment files.

## Database migrations

The originally committed 0001_init.sql contains literal escaped text; it is preserved. On this provisioned project, executable migrations 0002 through 0007 have been applied. For a fresh database, run those executable migrations in order through Supabase's SQL editor. Do not replay the old escaped 0001 file. Later migrations add the append-only audit log, seed demo records, transactional activity triggers, named status suggestions and owner-scoped policies.

Demo rows have user_id NULL and are only accessible in the anonymous workspace. Signed-in consultants access their own records. A trusted app_metadata.role of management enables management read access.

## Optional live AI

Set OPENAI_API_KEY in Vercel for server-side model calls, optionally OPENAI_MODEL (default gpt-4.1-mini). Without a key or when the provider fails, generation saves an explicitly labelled evidence-based draft. Profiles and strategies can also be entered or edited manually, then reviewed. Confidence measures recorded evidence count according to the PRD rule, not prediction accuracy.

Signup confirmation uses /auth/callback. Supabase's Site URL and redirect allow-list are configured for the live app and localhost:3000/3001.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
pnpm test:core
```

test:core runs the success scenario against the running app and its real database. It creates uniquely named test records, verifies persistence and audits, then deletes only those records and checks cascade cleanup. TEST_APP_URL can point it at a preview or production URL. scripts/verify-rls.sql verifies two consultant identities and anonymous isolation inside a rolled-back transaction.

Deployment is by commits pushed to main. Vercel is connected to this GitHub repository. Pin the requested identity:

```bash
git config user.email "335252254+Bn1710@users.noreply.github.com"
git config user.name "Bn1710"
git add -A
git commit -m "Describe the change"
git push origin main
```

See docs/BUILD_STATUS.md for shipped functionality, verification and the remaining live-AI configuration.

