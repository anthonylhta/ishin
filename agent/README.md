# Failure-miner agent

An autonomous quality agent that keeps the eval harness honest.

## The problem it solves

The naturalness eval harness (`evals/`) has one documented weakness: the golden
set only grows if **a human remembers** to add a case every time they spot a bad
translation in real use. That discipline decays. This agent automates it.

## What it does

On a schedule (or on demand), the agent:

1. **Reads real translation history** from Supabase (the `translations` table).
2. **Judges each translation with Claude** — the same LLM-as-judge pattern the
   eval harness uses (Sonnet, temperature 0), but with no prior expectation: it
   decides whether the output is a likely failure and, if so, *names* the failure.
3. **Proposes new golden-set cases** for the flagged ones, appended to
   `agent/proposals/mined.jsonl` (the cumulative log, one line per flagged
   translation) and snapshotted to `agent/proposals/<timestamp>.json` (both
   gitignored).

It **never edits `golden-set.json` itself** — a human reviews the proposals and
decides what to keep. The agent proposes; the human curates. That keeps the test
set trustworthy and is the right trust boundary for an automated grader.

## Incremental by default (only the unchecked)

The miner remembers how far it has checked in `agent/.mine-state.json` (a local,
gitignored, per-machine watermark — the `created_at` of the newest translation
already judged). Each run fetches **only rows newer than the watermark**,
oldest-first, capped at `MINE_LIMIT` — so nothing is re-judged, and a backlog
larger than `MINE_LIMIT` advances contiguously across runs (no gaps). The
watermark advances over judged, clean, and skipped rows alike, and is saved even
when nothing was proposed.

Every run prints coverage so you always know where you stand, e.g.:

```
Checked through 2026-05-22 23:41:36. 243 translation(s) still unchecked (6 checked, 1 proposed all-time).
```

Typical use: run once with a big limit to backfill, then `npm run mine` weekly to
sweep whatever is new since last time.

```bash
MINE_LIMIT=500 npm run mine   # first pass: chew through the backlog
npm run mine                  # weekly: only the translations added since last run
```

## Run it

```bash
npm run mine                  # incremental: unchecked rows, up to 50, local judge
MINE_LIMIT=100 npm run mine   # raise the per-run cap
MINE_THRESHOLD=2 npm run mine # only flag harder failures (score <= 2)
MINE_JUDGE=api npm run mine   # force the paid API instead of the local CLI
MINE_SINCE=all npm run mine   # ignore the watermark, start from the oldest
MINE_SINCE=2026-06-01 npm run mine  # start from a specific point
MINE_RESET=1 npm run mine     # forget the watermark and re-check from scratch
```

### Two judge transports (same prompt, same parser)

The judge prompt and verdict parsing are identical; only how the model is reached
differs:

- **local** (default for manual runs) — routes each judgement through the
  `claude` CLI in headless mode (`claude -p`), so it spends your **Claude Code
  subscription**, not metered API tokens. Needs the `claude` CLI on `PATH` and
  signed in; **no `CLAUDE_API_KEY` required**. The CLI can't pin temperature to 0,
  so verdicts are a touch less deterministic than the API path — fine for a
  human-curated mining pass. (To keep calls lean it runs from a temp dir with a
  minimal system prompt, and strips API keys from the child env so it can't
  silently fall back to paid billing.)
- **api** (default in CI) — the metered Anthropic API via the SDK, pinned to
  temp 0, matching the eval harness exactly. Needs `CLAUDE_API_KEY`.

Pick explicitly with `MINE_JUDGE=local|api`. Either transport needs
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the history read
(pulled from `.env.local` locally, from Actions secrets in CI). Like the eval
harness, it is **manual / scheduled, never wired into per-commit CI**.

On a schedule via `.github/workflows/failure-miner.yml` (weekly + manual
`workflow_dispatch`) it runs in **api** mode — the runner has no Claude Code
login. The digest is posted to the Actions job summary and the full proposals
JSON is uploaded as an artifact.

## How it connects to the rest of the project

- Reuses `detectToEnglish` + `TONES` from the shipping translate utils, so it
  judges direction exactly as the app does.
- Reuses the `GoldenCase` shape from `evals/types.ts`, so a proposal pastes
  straight into the golden set after review.
- Same judge model and temperature as `evals/run.ts`, so its verdicts are
  consistent with the eval harness it feeds.

## A note on data

It reads production translation text. In this single-operator portfolio project
that's the operator's own data; in a real multi-user product you'd scope it to
consented data or run it only over a held-out sample. Calling that boundary out
is deliberate — an automated agent that reads user content needs an explicit
privacy stance.
