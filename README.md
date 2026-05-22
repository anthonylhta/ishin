# ⛩️ Tone Translator

> Japanese ↔ English translation that gets the *tone* right — choose a politeness level and get a culturally aware translation, plus a short note on why it reads that way.

**Live demo:** _(https://tone-translator-seven.vercel.app)_

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
- **Schema-enforced LLM output.** The translation endpoint uses Claude's structured outputs (a JSON schema passed via `output_config.format`), so every response is guaranteed valid and parseable — no brittle markdown-stripping or fragile parsing. It generates only the register the user selected, keeping latency and token cost down.
- **Optimistic UI.** Your message appears instantly and is reconciled with the persisted record once the API responds, so the conversation feels real-time.
- **Next.js 16 Proxy.** Clerk's middleware runs in `proxy.ts` (Next 16's renamed middleware), protecting routes before requests reach the app.

---

Built by [Anthony](https://github.com/anthonylhta).
