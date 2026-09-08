# CLAUDE.md

Guidance for Claude Code when working in this repo.

Also read `AGENTS.md` — this is Next.js 16, which differs from older versions.
Check `node_modules/next/dist/docs/` before writing framework code rather than
relying on memory of older Next.js APIs.

## What this project is

A hackathon scoring platform. Students log in with GitHub, form teams, claim
issues, and open PRs. A GitHub webhook creates a contribution record; once the PR
is merged and an admin approves it, points are written to a ledger and the team
score goes up.

Repositories and issues are **imported from GitHub**, not created by hand: an
admin pastes a repo URL, the backend fetches the repo and all its open issues,
and `points:*` / `difficulty:*` labels on each issue are the source of truth for
its point value and difficulty. Admins only toggle whether an imported issue is
`available` for the hackathon — they never edit its points, difficulty, title or
body. See `## GitHub import` below.

See `README.md` for the full flow. The one thing that matters most:

```
PR webhook → verify signature → idempotency check → identify user → find team
→ find issue → contribution → merged? → pending review → admin approve
→ point transaction + team score (one transaction) → leaderboard
```

## Hard constraints

These override any default habits or anything the MVP plan doc says:

- **No shadcn/ui.** No component library at all. Write components by hand with
  Tailwind. Shared primitives go in `app/components/ui/`.
- **No `src/` directory.** Everything sits at the repo root, with app code under `app/`.
- **No new dependencies** without asking first. (`octokit` was added, with
  approval, for the GitHub import layer.)
- Do not build anything from the "What We Are Not Building" list in the README.

## Stack

Next.js 16 App Router · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Supabase (Postgres + Auth) · GitHub OAuth + GitHub App + webhooks · Zod ·
React Hook Form · deployed on Vercel.

## Layout

```
app/
├── (auth)/            login, auth callback
├── dashboard/         student-facing
├── admin/             admin-facing
├── leaderboard/       public
├── issues/            browse + detail
├── api/               route handlers, incl. github/webhook
├── components/{ui,teams,issues,contributions,leaderboard,admin}/
├── lib/{supabase,github,validation,scoring}/
└── types/
```

- Import via the `@/` alias: `@/app/lib/supabase/server`.
- Supabase clients already exist at `app/lib/supabase/client.ts` (browser) and
  `app/lib/supabase/server.ts` (server). Use them; don't create new clients inline.
- Server Components by default. Add `"use client"` only when the file needs state,
  effects, or event handlers.

## Database

Tables: `events`, `profiles`, `teams`, `team_members`, `repositories`,
`hackathon_issues`, `issue_claims`, `contributions`, `point_transactions`,
`webhook_events`.

`repositories` and `hackathon_issues` carry GitHub-owned columns
(`github_repo_id`, `github_issue_id`, `title`, `description`, `html_url`,
`labels`, `points`, `difficulty`, `github_created_at/updated_at`) plus
platform-owned state (`available`, `metadata_valid`, `metadata_error`). See
`supabase/migrations/20260907_github_repository_issue_import.sql`.

Rules that must not be broken:

- **Repositories and issues are imported from GitHub, never hand-authored.**
  `points` and `difficulty` come only from `points:*` / `difficulty:*` labels.
  Re-import refreshes GitHub-owned columns and must **not** overwrite `available`
  or `solved` (both platform-owned, like `available`).
  Uniqueness: `repositories(event_id, github_repo_id)`,
  `hackathon_issues(repository_id, github_issue_id)` — import upserts on these.
- **A solved issue is done.** When a `Fixes #n` PR merges, the webhook sets
  `hackathon_issues.solved` (recomputed from `contributions`, so a later
  rejection clears it). No team can claim a solved issue — an `issue_claims`
  BEFORE INSERT trigger enforces it in the DB, and any claim action must check
  `solved = false` too. Solved issues render as "Solved" in every issue list.
- **Never update `teams.score` on its own.** Every score change writes a matching
  row in `point_transactions`. The ledger is the source of truth; the score column
  is a cached total.
- Approving a contribution is **one database transaction**: insert the point
  transaction, increment the team score, set the contribution to `APPROVED`, set
  `points_awarded = true`. All or nothing.
- Before awarding, re-check server-side: contribution exists, PR is merged, issue
  exists and is `available` + `metadata_valid`, `points_awarded` is still false,
  and the point value equals `hackathon_issues.points` (from the GitHub label —
  never a number from the client). Never trust the client for any of this.
- `webhook_events.delivery_id` is unique. That uniqueness is the idempotency
  mechanism — insert first, and skip processing if it conflicts.
- Manual admin adjustments are also ledger rows, with a reason and the admin's id.

## Contribution state machine

`OPEN → MERGED → PENDING_REVIEW → APPROVED | REJECTED`

Plus two side states an admin resolves by hand:

- `UNMATCHED` — PR author isn't a registered participant
- `NEEDS_ISSUE_MAPPING` — no issue reference found in the PR title/body

Neither earns points until resolved.

## Claiming

A claim is a team taking an issue so nobody else works on it. One active claim
per issue (`issue_claims` unique on `issue_id`); claims aren't released, they end
when the issue is solved.

- `claimIssueAction` (`app/issues/actions.ts`) → `claimIssue`
  (`app/lib/services/claim.service.ts`). The client sends only the issue id; the
  server re-derives the team from the session and re-checks: caller is on a team
  for the active event, issue belongs to the event and is
  `available` + `metadata_valid` + `solved = false` + unclaimed, team is under
  `MAX_ACTIVE_CLAIMS_PER_TEAM`.
- The database is the backstop: `unique (issue_id)` collapses races, and the
  `issue_claims_block_solved` trigger rejects a claim on a solved issue.
- RLS (`20260909_issue_claims_flow.sql`): anyone signed in reads claims (just
  "taken"); a participant inserts only for a team they belong to, in their own
  name. No update/delete.
- The claim button's state (claim / your team's / claimed / solved / join a
  team) is decided server-side from `IssueRecord.claimedByTeamId` + the viewer's
  team and passed to `ClaimButton`.

## Review & scoring

The admin queue is `/admin/contributions` (`getReviewQueue` in
`app/lib/services/review.service.ts`), filterable by pending / needs-attention /
approved / rejected. Each row has a **View PR** link (`contributions.pr_url`).

Approve and reject are Postgres `SECURITY DEFINER` functions
(`20260909_review_contributions.sql`), called via `supabase.rpc` from
`POST /api/admin/contributions/approve` and `.../reject` (both `requireAdmin`,
Zod-validated, client sends only `contributionId`):

- `approve_contribution(uuid)` is **one transaction**: it re-reads the row
  `for update`, re-checks `merged` + team + issue + `available` +
  `metadata_valid` + `points_awarded = false`, takes the point value from
  `hackathon_issues.points` (never the client), then inserts the
  `point_transactions` AWARD row, bumps `teams.score`, sets the contribution
  `APPROVED` + `points_awarded = true`, and keeps the issue `solved`. A partial
  unique index (`point_transactions.contribution_id` where `kind = 'AWARD'`)
  makes a double-approve impossible.
- `reject_contribution(uuid, text)` writes **no** ledger row and no score
  change: sets `REJECTED` + optional `review_note`, and recomputes
  `hackathon_issues.solved` (a rejected PR no longer resolves its issue).
  It refuses if `points_awarded` is already true — reverse that with an
  `ADJUSTMENT` ledger row instead.
- `auth.uid()` inside both functions is the reviewer; they also re-check
  `profiles.is_admin`.

## GitHub import

Admin pastes `https://github.com/owner/repo` →
`POST /api/admin/repositories/import` (admin-only, Zod-validated).

Flow: parse URL → `GET /repos/{owner}/{repo}` → upsert `repositories` →
paginate `GET /repos/{owner}/{repo}/issues?state=open` (100/page, drop anything
with a `pull_request` field) → parse labels → upsert `hackathon_issues`.

- Code lives in `app/lib/github/`: `client.ts` (Octokit, server-only,
  `GITHUB_TOKEN`), `parse-repository-url.ts`, `repository.ts`, `issues.ts`,
  `labels.ts`, `import-repository.ts`.
- Label rules (`labels.ts`): exactly one `points:<non-negative int>`, at most one
  `difficulty:<easy|medium|hard>`. Multiple or malformed → the issue is stored
  with `metadata_valid = false` and a `metadata_error`; it cannot be claimed.
- Import is idempotent (upsert on the unique keys above). Re-import updates
  GitHub-owned columns only; `available` is left as the admin set it.
- `GITHUB_TOKEN` is server-only — never `NEXT_PUBLIC_`. GitHub API errors
  (404 / 401 / 403 / 429 / 5xx) are mapped to safe messages; never leak the
  token or a stack trace.
- Public issue lists show only `available = true AND metadata_valid = true`.
  Lists are paginated (`getIssuesPage`, `?page=`, `app/components/ui/pagination.tsx`).

## Webhook handling

`POST /api/github/webhook`

**REST vs webhooks.** The Octokit REST layer (`app/lib/github/`) owns the admin
side: importing a repo and its issues, and re-import refreshes. Webhooks own
**pull requests only** — they create and advance `contributions`. They do **not**
write `repositories` or `hackathon_issues`; issue/repo state comes from re-import.

**Pipeline** (`route.ts` → `process-webhook.ts` → `handle-pull-request.ts`):

```
GitHub → verify signature → store webhook_events → return 200 → process event
```

- Read the **raw** request body and verify the HMAC signature (`node:crypto`)
  against `GITHUB_WEBHOOK_SECRET` before parsing JSON. A parsed-then-restringified
  body will not verify.
- Compare signatures in constant time, and guard the length first —
  `crypto.timingSafeEqual` throws on a length mismatch.
- Reject invalid or missing signatures with 401. Return 200 for duplicate
  deliveries so GitHub stops retrying.
- The route uses the **service-role** client (`app/lib/supabase/service.ts`): a
  webhook has no session, and `webhook_events` / `contributions` are closed to
  anon under RLS. That client is server-only.
- Store the raw payload (unique `delivery_id`) **before** processing; processing
  runs in `after()` once the 200 is sent, and records `processed_at` /
  `process_error` on the row so a failure can be replayed.
- Handle `pull_request` with actions `opened`, `reopened`, `synchronize`, `closed`.
  Merged means `pull_request.merged === true`, not just `closed`.
- Parse `Fixes #42` / `Closes #42` / `Resolves #42` from the PR title and body to
  map a PR to an issue. If that fails, set `NEEDS_ISSUE_MAPPING` rather than guessing.
- The webhook advances a contribution only through `OPEN` / `PENDING_REVIEW` /
  `UNMATCHED` / `NEEDS_ISSUE_MAPPING`. Once it is `APPROVED` / `REJECTED` (admin),
  later deliveries refresh GitHub fields but never move `status` or
  `points_awarded`.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in a client
  component, a `NEXT_PUBLIC_` variable, or anything shipped to the browser.
- Every mutation checks auth **and** role on the server. Students must not be able
  to approve contributions, change points, touch another team, or edit event config.
- RLS is on for every table. Public reads: events, repositories, issues,
  leaderboard. Participants: their own profile, team, team members, contributions,
  team point history. Reviewers: review/approve/reject. Admins: everything.
- A `profiles` row is auto-provisioned for every auth user by an
  `on_auth_user_created` trigger (see
  `supabase/migrations/20260908_profiles_auto_provision.sql`), and a signed-in
  user can read only their own row. `is_admin` is set by an admin in SQL —
  users have no write access to `profiles`. The admin guard lives in
  `app/lib/auth/admin.ts`: `requireAdmin()` (throws, for route handlers) and
  `requireAdminPage()` (redirects, for pages/layouts).
- Validate all input with Zod schemas from `app/lib/validation/`.
- GitHub identity is the canonical participant identity — a GitHub account maps to
  at most one team per event.

## Conventions

- TypeScript strict. No `any`; type Supabase rows from `app/types/`.
- Zod schema per form/endpoint, shared between client validation and server checks.
- Server Actions for mutations where they fit; route handlers for GitHub webhooks
  and anything external.
- Tailwind utility classes inline. No CSS modules, no styled-components.
- Match the existing file's style. Comment only where the reasoning is non-obvious
  (idempotency, transaction boundaries, signature verification).

## Commands

```bash
npm run dev      # dev server
npm run build    # production build — run before claiming a task is done
npm run lint     # eslint
```

There is no test suite yet. Verify work by running the build and exercising the
flow in the browser.

## Env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # server only
GITHUB_TOKEN                  # server only — used by the repo/issue import
GITHUB_APP_ID
GITHUB_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

Never commit `.env` / `.env.local`, and never print secret values into output.
