# Tone Translator

Japanese ⇄ English translation with tone control. Pick a politeness register, translate, and check whether your Japanese actually sounds natural.

**Try it live:** [tone.anthonyta.dev](https://tone.anthonyta.dev)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

---

## What it does

Japanese politeness isn't a single setting. The same thought can be casual between friends or stiffly formal in a business email, and choosing wrong is the difference between sounding natural and sounding rude. Most translators flatten this — one textbook-stiff output regardless of who you're talking to.

Tone Translator makes the register an explicit choice. Pick how you want to come across, translate in either direction, and get a short note on the nuance behind the result. When you're writing Japanese yourself, switch to check mode to confirm it's grammatical and sounds like something a native would actually say.

The product bias is **naturalness over literalness**, with casual as the primary register — built for real conversations, not textbook sentences.

## Features

- **Tone control** — four registers: 普通 Casual, 丁寧 Polite, 正式 Formal, 直接 Blunt. Casual is the default, tuned to read the way friends actually text.
- **Automatic direction detection** — type in either language; it detects the source and translates into the other.
- **Naturalness check** — switch to CHECK mode to verify your Japanese (or English) is correct and natural for the chosen register. Returns a ✓ / ⚠ verdict with a short explanation and a suggested fix, checking for common Japanese mistakes such as giving/receiving direction (あげる/くれる), transitive/intransitive verb pairs, particle choice, and register consistency.
- **Nuance explanations** — every translation comes with a one-line note on the cultural or stylistic choice behind it.
- **Translation feed** — translations and checks flow into a clean, minimal feed grouped by date: your input sits as a small contained note and the translation is given the focus, each with a one-line nuance note beneath it.
- **Accounts & private history** — sign in and your history syncs to your account across devices; guests get an ephemeral, in-memory session.
- **History management** — copy any result, delete single entries, or clear everything.
- **Considered, minimal UI** — a restrained, content-first design where the input recedes and the translation is the hero, set in Mincho serif for Japanese on a warm "ink-wash" dark palette, all built from a custom CSS design-token system and a consistent inline-SVG icon set.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript |
| AI | Claude Haiku (translation) + Claude Sonnet (naturalness check) via the Anthropic API, streamed |
| Auth | Clerk |
| Database | PostgreSQL (Supabase) |
| Styling | CSS design tokens + Tailwind CSS v4 |
| Hosting | Vercel |

## Architecture highlights

- **Per-user data isolation.** Clerk owns authentication; every row is stamped with the Clerk `userId`, and the API scopes all reads, writes, and deletes to the signed-in user. The server uses Supabase's service-role key while Row-Level Security locks the public key out of the table.
- **Streaming output.** Both the translate and check endpoints stream plain text directly to the client. The translate client splits on an `[[EXPLANATION]]` sentinel; the check client parses the first newline as the verdict/body boundary. Formatting is applied from the first character during streaming, so there's no layout snap on completion, and messages are finalized in place with no visible flash.
- **Optimistic UI.** Your message appears instantly and the streaming reply fills in live. The record is persisted after streaming completes, and the temporary ID is swapped for the real database ID with no visible change.
- **Prompt design as a first-class concern.** Translation and naturalness-check prompts are built by pure, unit-tested functions and guarded by inline snapshots, so an accidental edit fails the test suite instead of silently shipping.
- **IP rate limiting.** Both endpoints enforce a per-IP request budget using an in-memory fixed-window counter, keyed off Vercel's `x-vercel-forwarded-for` header to prevent client-side spoofing.

## CI / Quality

Every push and pull request runs a GitHub Actions pipeline — dependency audit, TypeScript type check, ESLint, Vitest unit tests, and a full production build. Branch protection on `main` requires the pipeline to pass before merging.

---

Built by [Anthony](https://github.com/anthonylhta).
