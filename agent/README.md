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
3. **Proposes new golden-set cases** for the flagged ones, written to
   `agent/proposals/<timestamp>.json` (gitignored).

It **never edits `golden-set.json` itself** — a human reviews the proposals and
decides what to keep. The agent proposes; the human curates. That keeps the test
set trustworthy and is the right trust boundary for an automated grader.

## Run it

```bash
npm run mine                  # review the 50 most recent translations
MINE_LIMIT=100 npm run mine   # review more history
MINE_THRESHOLD=2 npm run mine # only flag harder failures (score <= 2)
```

Needs `CLAUDE_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and
`SUPABASE_SERVICE_ROLE_KEY` in the environment (pulled from `.env.local` locally,
from Actions secrets in CI). Calls the real API and costs money — so, like the
eval harness, it is **manual / scheduled, never wired into per-commit CI**.

On a schedule via `.github/workflows/failure-miner.yml` (weekly + manual
`workflow_dispatch`); the digest is posted to the Actions job summary and the
full proposals JSON is uploaded as an artifact.

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
