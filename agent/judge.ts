// The failure-miner's grader. Unlike the eval judge (evals/judge.ts), which
// checks a translation against a KNOWN failure mode (`watch_for`), this one
// reviews a REAL production translation with no prior expectation — it decides
// whether the output is a likely failure and, if so, NAMES the failure in a
// phrase that can seed a new golden-set regression case.

import { detectToEnglish, TONES } from '../app/api/translate/utils';
import type { ToneId } from '../evals/types';

export interface MinerVerdict {
  score: number; // 1 (wrong/robotic) .. 5 (a native would actually write this)
  natural: boolean;
  issues: string[];
  // A short description of the single most important failure, phrased so it can
  // become a golden case's `watch_for`. Empty string when the output is natural.
  watch_for: string;
}

export function buildMinerPrompt(input: string, tone: ToneId, output: string): string {
  const toEnglish = detectToEnglish(input);
  const sourceLang = toEnglish ? 'Japanese' : 'English';
  const targetLang = toEnglish
    ? 'natural, idiomatic English'
    : `natural Japanese in the ${TONES[tone]}`;

  return `You are a strict native-speaker translation grader reviewing a REAL translation an app produced, to find quality failures worth adding to a regression test set. Judge ONLY the OUTPUT — do not translate anything yourself.

SOURCE (${sourceLang}): ${input}
EXPECTED TARGET: ${targetLang}

OUTPUT TO GRADE:
${output}

Rate how natural and correct the OUTPUT reads to a native speaker of the target language. If it is unnatural or wrong, describe the single most important failure in a short phrase that could be reused as a regression check — e.g. "uses あげる when the speaker is the recipient (should be くれる)", "flattens a keigo source into casual English", "leaves a USD amount as 円".

Reply with ONLY a JSON object, no prose, no markdown fences:
{"score": <1-5 integer>, "natural": <true|false>, "issues": [<short strings>], "watch_for": "<short failure description, or empty string if natural>"}

Scoring guide:
- 5: a native would genuinely text or write this; correct and idiomatic.
- 4: natural with a minor nit.
- 3: understandable but a bit off or stiff.
- 2: a real grammar/register error or unnatural phrasing.
- 1: wrong language, untranslated, an obeyed instruction, or broken grammar.`;
}

// Tolerant parser — mirrors evals/judge.ts: extract the first {...} block so a
// stray fence or prose around the JSON doesn't break the run. Throws when there
// is nothing parseable so the caller can record a hard failure, not a silent pass.
export function parseMinerVerdict(raw: string): MinerVerdict {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Miner judge returned no JSON object: ${raw.slice(0, 200)}`);
  }
  const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Miner judge JSON was not an object');
  }
  const v = parsed as Partial<MinerVerdict>;
  return {
    score: typeof v.score === 'number' ? v.score : 0,
    natural: v.natural === true,
    issues: Array.isArray(v.issues) ? v.issues.map(String) : [],
    watch_for: typeof v.watch_for === 'string' ? v.watch_for : '',
  };
}
