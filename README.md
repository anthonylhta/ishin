# Ishin（以心）

From 以心伝心 — understanding that passes between people without being spoken. Ishin is Japanese ⇄ English communication that lands the way it was meant: the register, the cushioning, the distance a relationship demands — the parts a literal translation drops are exactly the parts it keeps.

**Try it live:** [ishin.io](https://ishin.io)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

---

## Two sides

Ishin is one idea — *say it so it lands* — split across two products:

- **Personal** ([`/personal`](https://ishin.io/personal)) — a free, fast, natural-sounding JP⇄EN translator for real conversations. Pick a register (casual is the default, tuned to read the way friends actually text), translate in either direction, and one-tap **check** whether your own Japanese sounds native. This is the original **Tone Translator**; its full history lives in this repo — browse it at the [`tone-translator-final`](https://github.com/anthonylhta/ishin/tree/tone-translator-final) tag.
- **Business** ([`/business`](https://ishin.io/business), early access) — the product direction: a review layer for professional communication that catches messages which are *grammatically correct but culturally wrong* — the missing cushion before a refusal, the too-blunt no, the soft decline that reads as a yes. Both directions. The waitlist is live.

## What it does

Japanese politeness isn't a single setting. The same thought can be casual between friends or stiffly formal in a client email, and choosing wrong is the difference between sounding natural and sounding rude — or, in business, between keeping an account and losing it. Most translators flatten this into one textbook-stiff output regardless of who you're talking to.

Ishin makes the register an explicit choice. On the personal side you pick how you want to come across, translate either direction, and get a short note on the nuance behind the result; switch to check mode to confirm your own Japanese is grammatical and sounds like something a native would actually say. On the business side the same cultural read becomes a review pass: it flags the message that parses fine but sends the wrong social signal, and suggests the cushioning that makes it land.

The bias throughout is **naturalness over literalness**, with casual as the primary register — built for real conversations, not textbook sentences.

## Architecture highlights

- **Streaming translation pipeline.** The personal translator's translate and check endpoints both stream plain text straight to the client. The translate stream splits on an `[[EXPLANATION]]` sentinel; the check stream parses the first newline as the verdict/body boundary. Formatting is applied from the first character, so there's no layout snap on completion, and messages finalize in place with no flash.
- **Per-direction model routing.** Translation isn't one model — each direction is routed to a different Claude model, a faster one for English→Japanese and a stronger one for Japanese→English, each with its own request parameters. Which model handles which direction was decided by the eval harness below, not by guesswork.
- **Naturalness-first prompt design.** The translation and naturalness-check prompts are built by pure, unit-tested functions and pinned by inline snapshots, so an accidental edit fails the suite instead of silently shipping. They carry hardening drawn from real failures — anti-injection, a Japanese grammar checklist (giving/receiving, transitive/intransitive, particles, request forms), casual person-reference rules, and register mirroring so keigo in stays deferential out.
- **Deterministic direction detection.** The translation direction is chosen by inspecting the input's script (kana/kanji vs. Latin), not by asking the model — so Japanese input can never be echoed straight back untranslated.
- **Per-user data isolation.** Clerk owns authentication; every row is stamped with the Clerk `userId`, and the API scopes all reads, writes, and deletes to the signed-in user. The server holds Supabase's service-role key while Row-Level Security locks the public key out of the tables — the same pattern guards the business waitlist, which only its own service-role route can read or write.
- **Installable PWA.** A hand-rolled service worker serves HTML network-first (auth-driven pages are never cached), static assets stale-while-revalidate, and falls back to an offline page; a versioned cache flushes stale entries on deploy.
- **Performance.** Fonts are self-hosted through `next/font` (no external Google Fonts request), the UI server-renders instead of gating on auth, the streaming feed is memoized so only the live message re-renders, and a keep-warm ping kills cold-start latency.

## Prompt quality: evals + failure mining

Translation quality is the thing unit tests can't check, so it gets its own measurement loop:

- An **eval harness** runs the real shipping prompt against a golden set of known-hard inputs — each case a failure mode the prompt was hardened against — and has a stronger Claude model grade every output, writing a scorecard you can diff across model and prompt changes. Every model swap becomes a measured decision instead of a leap of faith.
- A **production failure-miner** samples real translations, judges them, and proposes new golden cases from whatever it catches — so real-world misses feed straight back into the regression set.

Both call the paid API, so they run manually, never in CI.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript |
| AI | Claude via the Anthropic API — per-direction models, streamed |
| Auth | Clerk |
| Database | PostgreSQL (Supabase) |
| Styling | CSS design tokens + Tailwind CSS v4 |
| Hosting | Vercel |

## CI / Quality

Every push and pull request runs a GitHub Actions pipeline — dependency audit, TypeScript type check, ESLint, Vitest unit tests, and a full production build. Branch protection on `main` requires it to pass before merging.

---

Built by [Anthony](https://github.com/anthonylhta).
