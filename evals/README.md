# Naturalness evals

A small, repeatable way to measure **translation naturalness** — the thing unit
tests can't check. The runner gives the real shipping prompt a set of known-hard
inputs, asks a stronger model to grade each output, and writes a scorecard you
can diff across model/prompt changes.

It exists because translation quality here has historically been judged by vibes,
and that bit us (the 来よ uncertainty in ADR 0021/0026, the prompt typo in bug
2026-05-29). Every case in `golden-set.json` is a failure mode the prompt was
hardened against — the suite is that regression history made executable.

## Run it

```bash
npm run eval                 # one translation per case
EVAL_REPEATS=3 npm run eval  # average each case over 3 translations (more stable, 3× cost)
```

Needs `CLAUDE_API_KEY` in the environment. **This calls the real API and costs
money** (it counts against the same budget the `TRANSLATIONS_PAUSED` kill-switch
guards), and output is non-deterministic — so it is **manual only, never wired
into CI**. Trust the *delta between runs*, not a single absolute score.

## How it works

- `golden-set.json` — the test cases. Each has `input`, `tone`, a `watch_for`
  describing the specific failure to catch, and an optional `regression_of`
  pointing at the ADR/bug it guards.
- `run.ts` — for each case: translate with `buildSystemPrompt` + the same model
  and params as `app/api/translate/route.ts` (so a stray prompt edit shows up as
  a score drop), then grade with the judge. Aggregates over `EVAL_REPEATS`.
- `judge.ts` — the LLM-as-judge prompt (graded by `claude-sonnet-4-6` at
  temperature 0) and a tolerant JSON parser for its verdict.
- `scorecards/` — gitignored; one timestamped JSON per run for diffing.

A case **passes** when the judge calls it natural and the specific `watch_for`
failure was not committed.

## Typical workflow

Before swapping the translate model or editing the prompt: run on the current
code, make the change, run again, compare the two scorecards. That turns model
swaps from a leap of faith into a measured decision.

## Adding a case

Append to `golden-set.json`. Best source of new cases: every time you find a bad
translation in real use, add it here with a `watch_for` describing what went
wrong — so it can never silently regress again.
