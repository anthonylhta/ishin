# ⛩️ Tone Translator

> Japanese ↔ English translation that gets the *tone* right — choose a politeness level and get a culturally aware translation, plus a short note on why it reads that way.

**Live demo:** _(https://tone.anthonyta.dev)_

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Claude](https://img.shields.io/badge/AI-Claude-D97757?logo=anthropic&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

---

## Screenshots

| Sign in | Translating | History |
|---------|-------------|---------|
| ![Sign in](docs/screenshots/signin.png) | ![Translating](docs/screenshots/translate.png) | ![History](docs/screenshots/history.png) |

## What it does

Japanese politeness isn't a single setting — the same sentence can be casual between friends or stiffly formal in a business email, and choosing wrong is the difference between sounding natural and sounding rude. Tone Translator makes that choice explicit: pick a register, and the translation is shaped to match.

## Features

- **Tone control** — translate at four politeness registers: 普通 Casual, 丁寧 Polite, 正式 Formal, and 直接 Blunt.
- **Automatic direction detection** — type in either language; it detects the source and translates to the other (EN → JA or JA → EN).
- **Explanations, not just output** — every translation comes with a brief note on the nuance or cultural choice behind it, so it's a learning tool, not a black box.
- **Chat-style history** — translations flow into a conversation view, grouped by date (Today, Yesterday, This Week, Older) with collapsible sections.
- **Accounts & private history** — sign in and your translations are saved to your account, following you across devices.
- **Manage your history** — copy any result, delete individual entries, or clear everything (with a confirmation step).
- **Japanese-inspired UI** — Mincho serif typography for the output, a dark palette, and a custom design-token system.

## Tech Stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript |
| AI | Anthropic Claude (Haiku 4.5) — schema-enforced structured outputs |
| Auth | Clerk |
| Database | PostgreSQL (Supabase) |
| Styling | CSS design tokens + Tailwind CSS v4 |
| Hosting | Vercel |

## Architecture Highlights

- **Per-user data isolation.** Clerk owns authentication; every translation row is stamped with the Clerk `userId`, and the API scopes all reads, writes, and deletes to the signed-in user. The server talks to the database with Supabase's service-role key while **Row-Level Security** locks the public key out of the table — the API is the only door in.
- **Streaming output.** The translation API streams plain text chunks from Claude directly to the client. The client accumulates them, splitting on a `[[EXPLANATION]]` sentinel to separate the translation from the nuance note. The message is finalized in-place once streaming completes — no flash or re-render.
- **Optimistic UI.** Your message appears instantly; the streaming assistant message fills in live. The record is persisted to Supabase after streaming completes and the temp ID is swapped for the real DB ID without any visible change.
- **IP rate limiting.** The translate endpoint enforces 15 requests/minute per IP using an in-memory fixed-window counter. Vercel's `x-vercel-forwarded-for` header is used instead of `x-forwarded-for` to prevent client-side spoofing.
- **Next.js 16 Proxy.** Clerk's middleware runs in `proxy.ts` (Next 16's renamed middleware), protecting routes before requests reach the app.

## CI / Quality

Every push and pull request runs a GitHub Actions pipeline:

1. `npm audit --audit-level=high` — blocks on high/critical dependency vulnerabilities
2. `npx tsc --noEmit` — TypeScript type check
3. `npm run lint` — ESLint
4. `npm test` — Vitest unit tests (translate utilities, input validation, rate limiting, date grouping)
5. `npm run build` — full Next.js production build

Branch protection on `main` requires the pipeline to pass before merging.

## Running Locally

**Prerequisites:** Node.js 20+, plus free accounts on [Anthropic](https://console.anthropic.com), [Clerk](https://clerk.com), and [Supabase](https://supabase.com).

```bash
git clone https://github.com/anthonylhta/tone-translator.git
cd tone-translator
npm install
```

Create a `.env.local` in the project root:

```bash
# Anthropic (Claude API)
CLAUDE_API_KEY=sk-ant-...

# Clerk (authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only; Supabase -> Settings -> API
```

Run the following in the Supabase SQL editor (Dashboard → SQL Editor → New query). Run the two blocks in order:

**1. Create the `translations` table:**

```sql
create table if not exists translations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_text text not null,
  assistant_text text not null,
  tone text,
  explanation text,
  created_at timestamptz not null default now()
);
create index if not exists translations_user_id_created_at_idx
  on translations (user_id, created_at);

alter table translations enable row level security;
```

**2. Create the `users` table and add the FK** (see `supabase/migration_add_users.sql` for the full script including backfill for existing rows):

```sql
create table if not exists users (
  id         text        primary key,  -- Clerk userId
  email      text,
  created_at timestamptz default now()
);

alter table translations
  add constraint translations_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;

alter table users enable row level security;
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — translate as a guest right away, or sign in to save your history.

---

Built by [Anthony](https://github.com/anthonylhta).
