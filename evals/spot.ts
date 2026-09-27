// Subscription spot check — the per-change validation step of the eval cadence
// (ADR 0047): run a handful of golden cases through the exact shipping prompt
// and the eval judge, but via `claude -p` (headless Claude Code) instead of the
// metered API. Same prompt, same tiers, same rubric as evals/run.ts; $0 metered.
//
//   npm run spot -- --ids case-a,case-b              # cases from golden-set.json, ×3
//   npm run spot -- --cases probes.json --repeats 2  # ad hoc cases (GoldenCase[])
//   npm run spot -- --ids case-a --cases probes.json # both
//
// The prompt is whatever the working tree's buildSystemPrompt says, so run it
// once before editing the prompt (the pre-rule baseline) and once after.
//
// Caveats, the same every time: the CLI sets neither Haiku's 0.5 temperature nor
// Sonnet 5's disabled thinking, and the judge is the CLI's `sonnet` alias rather
// than Sonnet 4.6 at temperature 0. Directional evidence — the full scorecard
// (`npm run eval`) is the real test.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
  buildSystemPrompt,
  detectToEnglish,
  translateModelFor,
  TONES,
} from '../app/api/translate/utils';
import { buildJudgePrompt, parseVerdict } from './judge';
import type { GoldenCase, RunSample } from './types';

const JUDGE_MODEL = 'sonnet';
const JUDGE_SYSTEM =
  'You are a precise evaluator. Follow the user instructions exactly and output only what they ask for — no tools, no preamble.';
const EVALS_DIR = resolve(import.meta.dirname);

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

// Strip API keys so the CLI can never fall back to metered billing (mirrors
// agent/mine.ts).
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.CLAUDE_API_KEY;
  return env;
}

function ask(prompt: string, model: string, system: string): string {
  const res = spawnSync(
    'claude',
    [
      '-p',
      prompt,
      '--model',
      model,
      '--system-prompt',
      system,
      '--output-format',
      'json',
      '--max-turns',
      '1',
      '--no-session-persistence',
    ],
    {
      cwd: tmpdir(),
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: childEnv(),
    }
  );
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`claude CLI exited ${res.status}: ${(res.stderr || '').slice(0, 300)}`);
  }
  const envelope = JSON.parse(res.stdout) as { result?: string; is_error?: boolean; subtype?: string };
  if (envelope.is_error || typeof envelope.result !== 'string') {
    throw new Error(`claude CLI returned no result (${envelope.subtype ?? 'unknown'})`);
  }
  return envelope.result;
}

// Same user-turn wrapping as run.ts / route.ts, same marker stripping. The
// shipping system prompt goes in via --system-prompt, which REPLACES the CLI's
// default Claude Code scaffolding, so nothing else is in the context.
function translate(c: GoldenCase): string {
  const toEnglish = detectToEnglish(c.input);
  const userInstruction = toEnglish
    ? `Translate this Japanese text into English:\n\n"""${c.input}"""`
    : `Translate this English text into Japanese in the "${c.tone}" register:\n\n"""${c.input}"""`;
  const raw = ask(userInstruction, translateModelFor(toEnglish), buildSystemPrompt(c.tone, toEnglish));
  return raw.split('[[EXPLANATION]]')[0].replace('[[MAX_TOKENS]]', '').trim();
}

function loadCases(): GoldenCase[] {
  const cases: GoldenCase[] = [];
  const ids = argValue('--ids');
  if (ids) {
    const golden = JSON.parse(readFileSync(resolve(EVALS_DIR, 'golden-set.json'), 'utf8')) as GoldenCase[];
    for (const id of ids.split(',').map((s) => s.trim()).filter(Boolean)) {
      const c = golden.find((g) => g.id === id);
      if (!c) throw new Error(`No golden case with id "${id}"`);
      cases.push(c);
    }
  }
  const file = argValue('--cases');
  if (file) {
    const extra = JSON.parse(readFileSync(resolve(file), 'utf8')) as unknown;
    if (!Array.isArray(extra)) throw new Error(`${file} must be a JSON array of cases`);
    for (const c of extra as Partial<GoldenCase>[]) {
      if (!c.id || !c.input || !c.tone || !c.watch_for || !Object.hasOwn(TONES, c.tone)) {
        throw new Error(`Malformed case in ${file}: ${JSON.stringify(c).slice(0, 120)}`);
      }
      cases.push(c as GoldenCase);
    }
  }
  if (cases.length === 0) {
    throw new Error('Nothing to run — pass --ids a,b,c and/or --cases file.json');
  }
  return cases;
}

function main(): void {
  const repeats = Math.max(1, Number(argValue('--repeats') ?? '3') || 3);
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8', env: childEnv() });
  if (probe.error || probe.status !== 0) {
    console.error('Needs the `claude` CLI on PATH and signed in.');
    process.exit(1);
  }
  const cases = loadCases();
  console.log(
    `Spot-checking ${cases.length} case(s) × ${repeats} on claude -p — ` +
      `translate per-direction (Haiku EN→JP / Sonnet 5 JP→EN), judge ${JUDGE_MODEL}\n`
  );

  const summary: string[] = [];
  for (const c of cases) {
    console.log(`── ${c.id}`);
    console.log(`   in: ${c.input}`);
    const runs: RunSample[] = [];
    for (let i = 0; i < repeats; i++) {
      try {
        const output = translate(c);
        const verdict = parseVerdict(ask(buildJudgePrompt(c.input, c.tone, c.watch_for, output), JUDGE_MODEL, JUDGE_SYSTEM));
        runs.push({ output, ...verdict });
        const ok = verdict.natural && !verdict.watch_for_violated;
        console.log(`   ${ok ? '✓' : '✗'} ${i + 1}: ${output}`);
        console.log(`      score ${verdict.score}${verdict.watch_for_violated ? ' [WATCH_FOR VIOLATED]' : ''}${verdict.issues.length ? ` — ${verdict.issues.join('; ')}` : ''}`);
      } catch (err) {
        runs.push({ output: '', score: 0, natural: false, watch_for_violated: false, issues: [String(err).slice(0, 120)] });
        console.log(`   ! ${i + 1}: errored — ${String(err).slice(0, 120)}`);
      }
    }
    const passes = runs.filter((r) => r.natural && !r.watch_for_violated).length;
    const avg = runs.reduce((s, r) => s + r.score, 0) / runs.length;
    summary.push(`${passes}/${runs.length}  avg ${avg.toFixed(2)}  ${c.id}`);
    console.log('');
  }

  console.log('--- summary (passes/repeats) ---');
  for (const line of summary) console.log(line);
}

main();
