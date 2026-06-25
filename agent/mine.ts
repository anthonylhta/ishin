// Failure-miner agent.
//
//   npm run mine                 # review the most recent translations
//   MINE_LIMIT=100 npm run mine  # review more history
//   MINE_THRESHOLD=2 npm run mine# only flag harder failures (score <= 2)
//   MINE_JUDGE=api npm run mine  # force the paid API instead of the local CLI
//
// Closes the one documented weakness of the eval harness (evals/README.md): the
// golden set only grows if a human remembers to add a case after spotting a bad
// translation. This agent automates that discipline — it reads REAL translation
// history from Supabase, asks Claude to judge each one (the same LLM-as-judge
// pattern as the eval harness), and PROPOSES new golden-set cases for the likely
// failures. It never edits golden-set.json itself: a human reviews the proposals
// and decides what to keep, so curation stays human-in-the-loop.
//
// Two judge transports, same prompt + parser:
//   - local: routes each judgement through the `claude` CLI in headless mode,
//     so it spends your Claude Code subscription, not metered API tokens. This is
//     the DEFAULT for manual runs.
//   - api:   the metered Anthropic API via the SDK, pinned to temp 0 for
//     determinism. The DEFAULT in CI, where there is no Claude Code login.
// Pick explicitly with MINE_JUDGE=local|api. Either way it runs on a weekly
// schedule (or on demand), not in the per-commit CI path.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildMinerPrompt, parseMinerVerdict, type MinerVerdict } from './judge';
import type { GoldenCase, ToneId } from '../evals/types';

type JudgeMode = 'local' | 'api';

// API path: keep the judge in sync with the eval harness — a stronger model at
// temp 0. Local path: the same Sonnet family via the CLI's `sonnet` alias (the
// CLI can't pin temperature, so its verdicts are a touch less deterministic —
// acceptable for a human-curated mining pass).
const JUDGE_MODEL = 'claude-sonnet-4-6';
const LOCAL_JUDGE_MODEL = 'sonnet';
// Replace Claude Code's default system prompt with a tiny one: the judge prompt
// is fully self-contained, so this drops most of the per-call scaffolding the
// CLI would otherwise load.
const LOCAL_JUDGE_SYSTEM =
  'You are a precise evaluator. Follow the user instructions exactly and output only what they ask for — no tools, no preamble.';

const LIMIT = Math.max(1, Number(process.env.MINE_LIMIT ?? '50') || 50);
// Flag anything at or below this score (1-5). 3 = "understandable but off" or worse.
const THRESHOLD = Math.min(5, Math.max(1, Number(process.env.MINE_THRESHOLD ?? '3') || 3));

const AGENT_DIR = resolve(import.meta.dirname);
const PROPOSAL_DIR = resolve(AGENT_DIR, 'proposals');
// Local, gitignored watermark so each run only judges translations we haven't
// checked yet. Lives next to the proposals (also gitignored) — single-operator,
// single-machine state; no DB schema change, miner stays read-only on the table.
const STATE_FILE = resolve(AGENT_DIR, '.mine-state.json');
// Append-only log of every flagged translation, ever — one JSON object per line.
// The per-run snapshot files are point-in-time; this is the cumulative record.
const LOG_FILE = resolve(PROPOSAL_DIR, 'mined.jsonl');

// How far the miner has checked. `watermark` is the created_at of the newest
// translation already judged; the next run fetches only rows newer than it.
interface MineState {
  watermark: string | null; // null = nothing checked yet (start from the oldest)
  lastRunAt: string;
  totalChecked: number; // cumulative translations judged across all runs
  totalProposed: number; // cumulative proposals across all runs
}

function readState(): MineState {
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as Partial<MineState>;
    return {
      watermark: typeof s.watermark === 'string' ? s.watermark : null,
      lastRunAt: typeof s.lastRunAt === 'string' ? s.lastRunAt : '',
      totalChecked: typeof s.totalChecked === 'number' ? s.totalChecked : 0,
      totalProposed: typeof s.totalProposed === 'number' ? s.totalProposed : 0,
    };
  } catch {
    // No state yet, or it's unreadable — start clean rather than crashing.
    return { watermark: null, lastRunAt: '', totalChecked: 0, totalProposed: 0 };
  }
}

function writeState(state: MineState): void {
  mkdirSync(AGENT_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// Count translations still newer than the watermark, so each run can report how
// much of the table remains unchecked. PostgREST returns the exact total in the
// Content-Range header ("0-0/123") when asked with Prefer: count=exact.
async function countUnchecked(
  url: string,
  key: string,
  watermark: string | null
): Promise<number | null> {
  const q = new URLSearchParams({ select: 'id', message_type: 'eq.translation', limit: '1' });
  if (watermark) q.set('created_at', `gt.${watermark}`);
  const r = await fetch(`${url}/rest/v1/translations?${q}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  const total = r.headers.get('content-range')?.split('/')[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : null;
}

// One mined translation that the judge flagged, packaged for human review.
interface Proposal {
  proposedCase: GoldenCase; // ready to paste into evals/golden-set.json after review
  score: number;
  issues: string[];
  output: string; // the actual translation that was flagged
  created_at: string; // when the original translation happened
}

interface TranslationRow {
  id: string;
  user_text: string;
  assistant_text: string;
  tone: string;
  message_type: string;
  created_at: string;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// Force the subscription (OAuth) path for the local CLI: drop any API keys so it
// can never silently fall back to metered API billing — the whole point of local
// mode. CLAUDE_API_KEY is this project's name (the CLI ignores it); ANTHROPIC_API_KEY
// is the one the CLI would actually bill against.
function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.CLAUDE_API_KEY;
  return env;
}

// API transport: metered Anthropic API via the SDK, temp 0.
async function judgeApi(
  client: Anthropic,
  input: string,
  tone: ToneId,
  output: string
): Promise<MinerVerdict> {
  const msg = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 512,
    temperature: 0,
    messages: [{ role: 'user', content: buildMinerPrompt(input, tone, output) }],
  });
  return parseMinerVerdict(textOf(msg));
}

// Local transport: the SAME judge prompt through `claude -p` (headless), spending
// your Claude Code subscription instead of API tokens. Runs from a temp cwd so the
// project's CLAUDE.md doesn't bias the judge, with stdin ignored so the CLI doesn't
// wait on it. Synchronous on purpose — the mining loop judges one row at a time.
function judgeLocal(input: string, tone: ToneId, output: string): MinerVerdict {
  const res = spawnSync(
    'claude',
    [
      '-p',
      buildMinerPrompt(input, tone, output),
      '--model',
      LOCAL_JUDGE_MODEL,
      '--output-format',
      'json',
      '--max-turns',
      '1',
      '--system-prompt',
      LOCAL_JUDGE_SYSTEM,
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
  const envelope = JSON.parse(res.stdout) as {
    result?: string;
    is_error?: boolean;
    subtype?: string;
  };
  if (envelope.is_error || typeof envelope.result !== 'string') {
    throw new Error(`claude CLI returned no result (${envelope.subtype ?? 'unknown'})`);
  }
  return parseMinerVerdict(envelope.result);
}

// Dispatch on the chosen transport. Returns a promise either way so the loop can
// uniformly `await` it.
async function judge(
  mode: JudgeMode,
  client: Anthropic | null,
  input: string,
  tone: ToneId,
  output: string
): Promise<MinerVerdict> {
  if (mode === 'local') return judgeLocal(input, tone, output);
  return judgeApi(client as Anthropic, input, tone, output);
}

// Append a line to the GitHub Actions job summary when running in CI, so the
// digest is visible in the Actions UI without downloading the artifact.
function summary(line: string): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) appendFileSync(path, line + '\n');
}

async function main(): Promise<void> {
  // tsx scripts don't get Next's automatic .env.local loading (mirrors run.ts).
  try {
    process.loadEnvFile(resolve(AGENT_DIR, '..', '.env.local'));
  } catch {
    // no .env.local — use whatever is already exported (e.g. in CI)
  }

  // Default the judge by context: local (subscription) for manual runs, api for
  // CI (no Claude Code login on the runner). MINE_JUDGE overrides either way.
  const inCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);
  const requested = (process.env.MINE_JUDGE ?? '').toLowerCase();
  const mode: JudgeMode =
    requested === 'local' ? 'local' : requested === 'api' ? 'api' : inCI ? 'api' : 'local';

  const apiKey = process.env.CLAUDE_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  if (mode === 'api' && !apiKey) {
    console.error('MINE_JUDGE=api needs CLAUDE_API_KEY. Drop it to use the local `claude` CLI.');
    process.exit(1);
  }

  // Fail fast with a helpful message if local mode can't reach a signed-in CLI,
  // rather than logging a per-row judge error for every translation.
  if (mode === 'local') {
    const probe = spawnSync('claude', ['--version'], { encoding: 'utf8', env: childEnv() });
    if (probe.error || probe.status !== 0) {
      console.error(
        'Local judge mode needs the `claude` CLI on PATH and signed in.\n' +
          'Sign in to Claude Code, or run with MINE_JUDGE=api to use the paid API.'
      );
      process.exit(1);
    }
  }

  const client = mode === 'api' ? new Anthropic({ apiKey: apiKey as string }) : null;

  // Resume from where we left off. MINE_RESET=1 forgets the watermark and
  // re-checks; MINE_SINCE=all starts from the oldest, MINE_SINCE=<ISO> from a
  // given point; otherwise pick up after the stored watermark.
  const reset = process.env.MINE_RESET === '1' || process.env.MINE_RESET === 'true';
  let state = reset
    ? { watermark: null, lastRunAt: '', totalChecked: 0, totalProposed: 0 }
    : readState();
  const since = (process.env.MINE_SINCE ?? '').trim();
  const sinceBound =
    since.toLowerCase() === 'all' ? null : since ? since : state.watermark;

  // Hit Supabase's PostgREST endpoint directly with fetch rather than
  // @supabase/supabase-js: the JS client constructs a realtime/WebSocket client
  // on init, which Node 20 lacks natively. A standalone read-only script doesn't
  // need any of that. Only translations (not checks). Oldest-first from the
  // watermark so a backlog larger than LIMIT advances contiguously (no gaps) —
  // LIMIT is a per-run cap, not a sliding window.
  const query = new URLSearchParams({
    select: 'id,user_text,assistant_text,tone,message_type,created_at',
    message_type: 'eq.translation',
    order: 'created_at.asc',
    limit: String(LIMIT),
  });
  if (sinceBound) query.set('created_at', `gt.${sinceBound}`);
  const res = await fetch(`${supabaseUrl}/rest/v1/translations?${query}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!res.ok) {
    console.error(`Supabase read failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as TranslationRow[];

  // Don't re-propose cases the golden set already covers (match on source text).
  const golden = JSON.parse(
    readFileSync(resolve(AGENT_DIR, '..', 'evals', 'golden-set.json'), 'utf8')
  ) as GoldenCase[];
  const known = new Set(golden.map((c) => c.input.trim()));

  const judgeLabel =
    mode === 'local' ? `local CLI (claude -p, ${LOCAL_JUDGE_MODEL})` : `API (${JUDGE_MODEL})`;
  const from = sinceBound ? `since ${sinceBound.slice(0, 19)}` : 'from the oldest';
  console.log(
    `Mining ${rows.length} new translation(s) ${from}, ` +
      `flagging score <= ${THRESHOLD}, judge ${judgeLabel}\n`
  );

  const proposals: Proposal[] = [];
  let reviewed = 0;
  let skipped = 0;

  for (const row of rows) {
    const input = row.user_text.trim();
    if (!input || known.has(input)) {
      skipped++;
      continue;
    }
    reviewed++;

    const tone = row.tone as ToneId;
    let v: MinerVerdict;
    try {
      v = await judge(mode, client, input, tone, row.assistant_text);
    } catch (err) {
      console.log(`?  ${input.slice(0, 40)} — judge error, skipped (${String(err)})`);
      continue;
    }

    const flagged = v.score <= THRESHOLD || !v.natural;
    console.log(`${flagged ? '⚠' : '✓'} score ${v.score}  ${input.slice(0, 50)}`);
    if (!flagged) continue;

    // Record the source so a later repeat of the same text isn't proposed twice
    // (the top-of-loop guard then skips it).
    known.add(input);

    const stampId = row.created_at.slice(0, 10).replace(/-/g, '');
    proposals.push({
      proposedCase: {
        id: `mined-${stampId}-${proposals.length + 1}`,
        input,
        tone,
        watch_for: v.watch_for || v.issues.join('; ') || 'unnatural or incorrect output',
        regression_of: `mined from production ${row.created_at.slice(0, 10)}`,
      },
      score: v.score,
      issues: v.issues,
      output: row.assistant_text,
      created_at: row.created_at,
    });
  }

  console.log(
    `\nReviewed ${reviewed}, skipped ${skipped} (empty or already in golden set). ` +
      `Proposed ${proposals.length} new case(s).`
  );

  // Advance the watermark to the newest row we fetched (rows are ascending, so
  // it's the last one). This covers judged, skipped, and clean rows alike — they
  // have all been seen, so the next run won't re-check them. Persisted even when
  // nothing was proposed, otherwise a clean run would re-judge the same rows.
  const newWatermark = rows.length > 0 ? rows[rows.length - 1].created_at : state.watermark;
  state = {
    watermark: newWatermark,
    lastRunAt: new Date().toISOString(),
    totalChecked: state.totalChecked + reviewed,
    totalProposed: state.totalProposed + proposals.length,
  };
  writeState(state);

  const remaining = await countUnchecked(supabaseUrl, serviceRoleKey, newWatermark);
  const through = newWatermark ? newWatermark.slice(0, 19).replace('T', ' ') : 'nothing yet';
  const remainingStr = remaining === null ? 'an unknown number of' : remaining.toLocaleString();
  console.log(
    `Checked through ${through}. ${remainingStr} translation(s) still unchecked ` +
      `(${state.totalChecked} checked, ${state.totalProposed} proposed all-time).`
  );

  summary(`### 🕵️ Failure-miner — ${new Date().toISOString().slice(0, 10)}`);
  summary(
    `Reviewed **${reviewed}** translations · proposed **${proposals.length}** new golden case(s) · ` +
      `**${remainingStr}** still unchecked.\n`
  );

  if (proposals.length === 0) {
    console.log('\nNothing to propose — these translations look clean. 🎉');
    summary('Nothing to propose — these translations look clean. 🎉');
    return;
  }

  console.log('\n--- proposed golden cases (review before adding) ---');
  for (const p of proposals) {
    console.log(`\n⚠ ${p.proposedCase.id} (score ${p.score})`);
    console.log(`  in:   ${p.proposedCase.input}`);
    console.log(`  out:  ${p.output}`);
    console.log(`  why:  ${p.proposedCase.watch_for}`);
    summary(`- **${p.proposedCase.id}** (score ${p.score}) — \`${p.proposedCase.input}\` → ${p.proposedCase.watch_for}`);
  }

  mkdirSync(PROPOSAL_DIR, { recursive: true });
  const minedAt = new Date().toISOString();

  // Cumulative append-only log: one line per flagged translation, so frequent
  // small runs accrete into a single file you review over time.
  const logLines =
    proposals
      .map((p) =>
        JSON.stringify({
          minedAt,
          id: p.proposedCase.id,
          score: p.score,
          tone: p.proposedCase.tone,
          input: p.proposedCase.input,
          output: p.output,
          watch_for: p.proposedCase.watch_for,
          issues: p.issues,
          created_at: p.created_at,
        })
      )
      .join('\n') + '\n';
  appendFileSync(LOG_FILE, logLines);

  // Per-run snapshot, ready to paste into the golden set after review.
  const file = resolve(PROPOSAL_DIR, `${minedAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify({ minedAt, threshold: THRESHOLD, proposals }, null, 2));
  console.log(`\nProposals appended to ${LOG_FILE}`);
  console.log(`Snapshot written to ${file}`);
  console.log('Review them, then paste the keepers into evals/golden-set.json.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
