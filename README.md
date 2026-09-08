# Hack The Web

A web platform for running a college open-source hackathon.

Students log in with GitHub, form teams, claim issues, and solve them on GitHub.
When their pull request is merged and an admin approves it, their team gets points
and the leaderboard updates.

---

## The Idea

GitHub is already good at code, issues, pull requests, reviews and merges.
So we don't rebuild any of that. We only build the competition around it.

**GitHub handles:** code, issues, pull requests, reviews, merges, developer identity.

**We handle:** the event, teams, which issues count, who claimed what, which PR
belongs to which team, verification, points, point history, and the leaderboard.

**How we talk to GitHub:** the REST API (Octokit) for the admin side — an admin
pastes a repo URL and we pull the repo and its open issues, and re-import to
refresh them. Webhooks for everything ongoing — a `pull_request` event is what
creates and moves a contribution. Webhooks never edit repos or issues.

---

## How It Works

### For students

```
Login with GitHub
      ↓
Create or join a team
      ↓
Browse issues and claim one
      ↓
Solve it on GitHub and open a PR
      ↓
Platform picks up the PR automatically
      ↓
PR gets merged
      ↓
Admin approves it
      ↓
Team gets points → leaderboard updates
```

### For admins

```
Create the event
      ↓
Import a GitHub repo by URL
  (issues, points and difficulty come from GitHub labels)
      ↓
Toggle which imported issues are available for the hackathon
      ↓
Watch teams and incoming PRs
      ↓
Approve or reject contributions
      ↓
Adjust scores if needed → view the ledger
```

---

## The Most Important Part

Everything else is just screens around this one flow:

```
GitHub PR
   ↓
Webhook hits our API
   ↓
Verify the signature
   ↓
Skip it if we've seen this delivery before
   ↓
Find the GitHub user → find their team
   ↓
Find the issue the PR says it fixes
   ↓
Save a contribution
   ↓
Is the PR merged?
   ├── No  → wait for the next webhook
   └── Yes → mark it pending review
                ↓
          Admin reviews it
          ├── Reject  → 0 points
          └── Approve → point transaction → team score → leaderboard
```

A contribution moves through these states:

`OPEN → MERGED → PENDING_REVIEW → APPROVED` (or `REJECTED`)

Two extra states exist for problem cases:

- `UNMATCHED` — the PR author is not a registered participant
- `NEEDS_ISSUE_MAPPING` — we could not tell which issue the PR is for, so an admin maps it by hand

---

## Tech Stack

| Layer | What we use |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React + Tailwind CSS |
| Components | Hand-written, no component library |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + GitHub OAuth |
| GitHub link | GitHub App + webhooks |
| Validation | Zod |
| Forms | React Hook Form |
| Hosting | Vercel |

We are **not** using shadcn/ui. Components are written by hand with Tailwind.

We are **not** using a `src/` folder. Everything lives at the repo root.

---

## Folder Structure

```
app/
├── (auth)/            login and auth callback
├── dashboard/         student dashboard
├── admin/             admin dashboard
├── leaderboard/       public leaderboard
├── issues/            issue browser and issue detail
├── api/               route handlers (incl. the GitHub webhook)
├── components/        shared React components
│   ├── ui/            small building blocks (button, card, input…)
│   ├── teams/
│   ├── issues/
│   ├── contributions/
│   ├── leaderboard/
│   └── admin/
├── lib/
│   ├── supabase/      browser and server Supabase clients
│   ├── github/        webhook verification, PR parsing
│   ├── validation/    Zod schemas
│   └── scoring/       point awarding logic
└── types/             shared TypeScript types
```

Import with the `@/` alias, for example `import { createClient } from '@/app/lib/supabase/server'`.

---

## Database Tables

```
events              the hackathon itself
profiles            one per user, tied to their GitHub identity
teams               team name, join code, score
team_members        who is in which team
repositories        GitHub repos imported for the event (by URL)
hackathon_issues    issues imported from GitHub; points/difficulty from labels
issue_claims        which team claimed which issue
contributions       one row per pull request we are tracking
point_transactions  every point change, ever (the ledger)
webhook_events      raw GitHub webhooks, for idempotency and debugging
```

How they relate:

```
Event
 ├── Teams ── Team Members ── GitHub identity
 ├── Repositories ── Issues ── Claims
 └── Contributions ── Point Transactions
```

Team scores are never edited on their own. Every change to a score also writes a
row in `point_transactions`, so the whole competition is auditable.

---

## Getting Started

**1. Install**

```bash
npm install
```

**2. Set up environment variables**

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

The service role key is **server only**. Never put it in a `NEXT_PUBLIC_` variable
and never import it into a client component.

**3. Run it**

```bash
npm run dev
```

Open http://localhost:3000

**4. Test webhooks locally**

GitHub cannot reach `localhost`, so tunnel it:

```bash
ngrok http 3000
```

Point your GitHub App's webhook URL at `https://<your-tunnel>/api/github/webhook`.

---

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # eslint
```

## Rules For Awarding Points

Points are only given when **all** of this is true:

- the PR author is a registered participant on a team
- the PR is linked to an imported issue that is `available` and has valid label metadata
- the PR is actually merged
- an admin has approved the contribution
- points have not already been given for that contribution

Everything else scores zero.


## Definition Of Done

The MVP is finished when this works end to end, with nobody touching the database:

```
A student joins a team → claims an issue → solves it on GitHub →
opens a PR → the platform detects it → the PR is merged →
an admin approves it → points are awarded → the leaderboard updates
```
