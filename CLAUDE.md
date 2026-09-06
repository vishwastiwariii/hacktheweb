# CLAUDE.md

Guidance for Claude Code when working in this repo.

Also read `AGENTS.md` — this is Next.js 16, which differs from older versions.
Check `node_modules/next/dist/docs/` before writing framework code rather than
relying on memory of older Next.js APIs.

## What this project is

A hackathon scoring platform. Students log in with GitHub, form teams, claim
registered issues, and open PRs. A GitHub webhook creates a contribution record;
once the PR is merged and an admin approves it, points are written to a ledger and
the team score goes up.

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
- **No new dependencies** without asking first. The stack is fixed.
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

Rules that must not be broken:

- **Never update `teams.score` on its own.** Every score change writes a matching
  row in `point_transactions`. The ledger is the source of truth; the score column
  is a cached total.
- Approving a contribution is **one database transaction**: insert the point
  transaction, increment the team score, set the contribution to `APPROVED`, set
  `points_awarded = true`. All or nothing.
- Before awarding, re-check server-side: contribution exists, PR is merged, issue
  exists, `points_awarded` is still false. Never trust the client for any of this.
- `webhook_events.delivery_id` is unique. That uniqueness is the idempotency
  mechanism — insert first, and skip processing if it conflicts.
- Manual admin adjustments are also ledger rows, with a reason and the admin's id.

## Contribution state machine

`OPEN → MERGED → PENDING_REVIEW → APPROVED | REJECTED`

Plus two side states an admin resolves by hand:

- `UNMATCHED` — PR author isn't a registered participant
- `NEEDS_ISSUE_MAPPING` — no issue reference found in the PR title/body

Neither earns points until resolved.

## Webhook handling

`POST /api/github/webhook`

- Read the **raw** request body and verify the HMAC signature against
  `GITHUB_WEBHOOK_SECRET` before parsing JSON. A parsed-then-restringified body
  will not verify.
- Compare signatures in constant time.
- Reject invalid or missing signatures with 401. Return 200 for duplicate
  deliveries so GitHub stops retrying.
- Handle `pull_request` with actions `opened`, `reopened`, `synchronize`, `closed`.
  Merged means `pull_request.merged === true`, not just `closed`.
- Parse `Fixes #42` / `Closes #42` / `Resolves #42` from the PR title and body to
  map a PR to an issue. If that fails, set `NEEDS_ISSUE_MAPPING` rather than guessing.
- Store the raw payload before processing, so failures can be replayed.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in a client
  component, a `NEXT_PUBLIC_` variable, or anything shipped to the browser.
- Every mutation checks auth **and** role on the server. Students must not be able
  to approve contributions, change points, touch another team, or edit event config.
- RLS is on for every table. Public reads: events, repositories, issues,
  leaderboard. Participants: their own profile, team, team members, contributions,
  team point history. Reviewers: review/approve/reject. Admins: everything.
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
GITHUB_APP_ID
GITHUB_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

Never commit `.env` / `.env.local`, and never print secret values into output.
