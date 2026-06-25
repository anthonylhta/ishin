// Naturalness eval runner.
//
//   npm run eval            # one pass over the golden set
//   EVAL_REPEATS=3 npm run eval   # average each case over N translations
//
// For each case it calls the REAL shipping translate prompt (buildSystemPrompt
// + the same model/params as app/api/translate/route.ts), then asks Sonnet to
// grade the output. Prints a scorecard and writes a timestamped JSON snapshot to
// evals/scorecards/ (gitignored) so runs can be diffed across model/prompt
// changes. Manual + costs real API calls — never wire this into CI.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSystemPrompt, detectToEnglish, translateModelFor } from '../app/api/translate/utils';
import { buildJudgePrompt, parseVerdict } from './judge';
import type { CaseResult, GoldenCase, RunSample, Verdict } from './types';

// The translator mirrors production: per-direction by default (Haiku EN→JP,
// Sonnet JP→EN — see translateModelFor in route.ts's utils). EVAL_TRANSLATE_MODEL
// forces a single model across both directions, to A/B a candidate against the
// shipping split; the chosen model is printed in the header and recorded in the
// scorecard.
const TRANSLATE_MODEL_OVERRIDE = process.env.EVAL_TRANSLATE_MODEL;
const TRANSLATE_MODEL_LABEL =
  TRANSLATE_MODEL_OVERRIDE ?? 'per-direction (Haiku EN→JP / Sonnet JP→EN)';
const TRANSLATE_MAX_TOKENS = 1024;
const TRANSLATE_TEMPERATURE = 0.5;

// The grader. A stronger model than the translator, at temperature 0.
const JUDGE_MODEL = 'claude-sonnet-4-6';

const REPEATS = Math.max(1, Number(process.env.EVAL_REPEATS ?? '1') || 1);

const EVALS_DIR = resolve(import.meta.dirname);

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// Produce one translation with the exact prompt + params the app ships, and
// strip the trailing [[EXPLANATION]]/[[MAX_TOKENS]] markers so the judge grades
// only the translated message.
async function translate(client: Anthropic, c: GoldenCase): Promise<string> {
  const toEnglish = detectToEnglish(c.input);
  const userInstruction = toEnglish
    ? `Translate this Japanese text into English:\n\n"""${c.input}"""`
    : `Translate this English text into Japanese in the "${c.tone}" register:\n\n"""${c.input}"""`;

  const msg = await client.messages.create({
    model: TRANSLATE_MODEL_OVERRIDE ?? translateModelFor(toEnglish),
    max_tokens: TRANSLATE_MAX_TOKENS,
    temperature: TRANSLATE_TEMPERATURE,
    system: buildSystemPrompt(c.tone, toEnglish),
    messages: [{ role: 'user', content: userInstruction }],
  });

  return textOf(msg).split('[[EXPLANATION]]')[0].replace('[[MAX_TOKENS]]', '').trim();
}

async function judge(client: Anthropic, c: GoldenCase, output: string): Promise<Verdict> {
  const msg = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 512,
    temperature: 0,
    messages: [{ role: 'user', content: buildJudgePrompt(c.input, c.tone, c.watch_for, output) }],
  });
  return parseVerdict(textOf(msg));
}

// Translate + grade a case REPEATS times and fold into one result: average
// score, "natural"/"passed" by majority, "violated" if it ever happened. Each
// repeat's own output+verdict is kept (runs[]) so flaky cases stay legible.
async function runCase(client: Anthropic, c: GoldenCase): Promise<CaseResult> {
  const runs: RunSample[] = [];
  for (let i = 0; i < REPEATS; i++) {
    try {
      const output = await translate(client, c);
      runs.push({ output, ...(await judge(client, c, output)) });
    } catch (err) {
      // One flaky repeat — a malformed judge verdict or a transient API error —
      // must not crash the whole run (it would discard every case after it).
      // Record it as a failed sample so the other repeats and cases still stand.
      console.log(`  ! ${c.id} run ${i + 1} errored: ${String(err).slice(0, 100)}`);
      runs.push({
        output: '',
        score: 0,
        natural: false,
        watch_for_violated: false,
        issues: [`run errored: ${String(err).slice(0, 120)}`],
      });
    }
  }

  const avgScore = runs.reduce((s, r) => s + r.score, 0) / runs.length;
  const naturalCount = runs.filter((r) => r.natural).length;
  const natural = naturalCount > runs.length / 2;
  const violated = runs.some((r) => r.watch_for_violated);

  return {
    id: c.id,
    input: c.input,
    tone: c.tone,
    regression_of: c.regression_of,
    runs,
    score: Math.round(avgScore * 100) / 100,
    natural,
    watch_for_violated: violated,
    passed: natural && !violated,
  };
}

async function main(): Promise<void> {
  // Standalone tsx scripts don't get Next.js's automatic .env.local loading, so
  // pull CLAUDE_API_KEY from the project's .env.local the way the app would.
  // Falls through silently if there's no file (e.g. the key is already exported).
  try {
    process.loadEnvFile(resolve(EVALS_DIR, '..', '.env.local'));
  } catch {
    // no .env.local — use whatever is already in the environment
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('CLAUDE_API_KEY is not set. Add it to your environment and re-run.');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const cases = JSON.parse(
    readFileSync(resolve(EVALS_DIR, 'golden-set.json'), 'utf8')
  ) as GoldenCase[];

  console.log(`Running ${cases.length} cases × ${REPEATS} repeat(s) — model ${TRANSLATE_MODEL_LABEL}, judge ${JUDGE_MODEL}\n`);

  const results: CaseResult[] = [];
  for (const c of cases) {
    const r = await runCase(client, c);
    results.push(r);
    const mark = r.passed ? '✓' : '✗';
    console.log(`${mark} ${r.id.padEnd(28)} score ${r.score}${r.watch_for_violated ? '  [WATCH_FOR VIOLATED]' : ''}`);
  }

  const passed = results.filter((r) => r.passed).length;
  const avg = results.reduce((s, r) => s + r.score, 0) / results.length;

  console.log('\n--- failures ---');
  const failures = results.filter((r) => !r.passed);
  if (failures.length === 0) {
    console.log('none 🎉');
  } else {
    for (const f of failures) {
      console.log(`\n✗ ${f.id} (avg score ${f.score})`);
      console.log(`  in:  ${f.input}`);
      f.runs.forEach((run, i) => {
        const flag = run.watch_for_violated ? ' [VIOLATED]' : '';
        console.log(`  run ${i + 1} (score ${run.score}${flag}): ${run.output}`);
        if (run.issues.length) console.log(`    why: ${run.issues.join('; ')}`);
      });
    }
  }

  console.log(`\n${passed}/${results.length} passed · avg score ${(Math.round(avg * 100) / 100).toFixed(2)}`);

  const scorecardsDir = resolve(EVALS_DIR, 'scorecards');
  mkdirSync(scorecardsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(scorecardsDir, `${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        translateModel: TRANSLATE_MODEL_LABEL,
        judgeModel: JUDGE_MODEL,
        repeats: REPEATS,
        passed,
        total: results.length,
        avgScore: Math.round(avg * 100) / 100,
        results,
      },
      null,
      2
    )
  );
  console.log(`\nScorecard written to ${file}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
