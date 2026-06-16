// Failure-miner agent.
//
//   npm run mine                 # review the most recent translations
//   MINE_LIMIT=100 npm run mine  # review more history
//   MINE_THRESHOLD=2 npm run mine# only flag harder failures (score <= 2)
//
// Closes the one documented weakness of the eval harness (evals/README.md): the
// golden set only grows if a human remembers to add a case after spotting a bad
// translation. This agent automates that discipline — it reads REAL translation
// history from Supabase, asks Claude to judge each one (the same LLM-as-judge
// pattern as the eval harness), and PROPOSES new golden-set cases for the likely
// failures. It never edits golden-set.json itself: a human reviews the proposals
// and decides what to keep, so curation stays human-in-the-loop.
//
// Manual + costs real API calls, like the eval harness — runs on a weekly
// schedule (or on demand), not in the per-commit CI path.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMinerPrompt, parseMinerVerdict, type MinerVerdict } from './judge';
import type { GoldenCase, ToneId } from '../evals/types';

// Keep the judge in sync with the eval harness: a stronger model at temp 0.
const JUDGE_MODEL = 'claude-sonnet-4-6';

const LIMIT = Math.max(1, Number(process.env.MINE_LIMIT ?? '50') || 50);
// Flag anything at or below this score (1-5). 3 = "understandable but off" or worse.
const THRESHOLD = Math.min(5, Math.max(1, Number(process.env.MINE_THRESHOLD ?? '3') || 3));

const AGENT_DIR = resolve(import.meta.dirname);

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

async function judge(
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

  const apiKey = process.env.CLAUDE_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    console.error(
      'Missing env. Need CLAUDE_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.'
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Hit Supabase's PostgREST endpoint directly with fetch rather than
  // @supabase/supabase-js: the JS client constructs a realtime/WebSocket client
  // on init, which Node 20 lacks natively. A standalone read-only script doesn't
  // need any of that. Only translations (not checks); newest first, bounded.
  const query = new URLSearchParams({
    select: 'id,user_text,assistant_text,tone,message_type,created_at',
    message_type: 'eq.translation',
    order: 'created_at.desc',
    limit: String(LIMIT),
  });
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

  console.log(
    `Mining ${rows.length} translation(s), flagging score <= ${THRESHOLD}, judge ${JUDGE_MODEL}\n`
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
      v = await judge(client, input, tone, row.assistant_text);
    } catch (err) {
      console.log(`?  ${input.slice(0, 40)} — judge error, skipped (${String(err)})`);
      continue;
    }

    const flagged = v.score <= THRESHOLD || !v.natural;
    console.log(`${flagged ? '⚠' : '✓'} score ${v.score}  ${input.slice(0, 50)}`);
    if (!flagged) continue;

    // Don't propose two cases for the same source text in one run.
    if (known.has(input)) continue;
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

  summary(`### 🕵️ Failure-miner — ${new Date().toISOString().slice(0, 10)}`);
  summary(`Reviewed **${reviewed}** translations · proposed **${proposals.length}** new golden case(s).\n`);

  if (proposals.length === 0) {
    console.log('\nNothing to propose — recent translations look clean. 🎉');
    summary('Nothing to propose — recent translations look clean. 🎉');
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

  const outDir = resolve(AGENT_DIR, 'proposals');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(outDir, `${stamp}.json`);
  writeFileSync(file, JSON.stringify({ minedAt: new Date().toISOString(), threshold: THRESHOLD, proposals }, null, 2));
  console.log(`\nProposals written to ${file}`);
  console.log('Review them, then paste the keepers into evals/golden-set.json.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
