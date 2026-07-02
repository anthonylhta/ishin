// The grader: an LLM-as-judge prompt + a tolerant parser for its JSON verdict.
// Kept separate from the runner so the rubric is easy to read and tweak.

import { detectToEnglish, TONES } from '../app/api/translate/utils';
import type { ToneId, Verdict } from './types';

// Build the prompt that asks a stronger model to grade ONE translation. The
// judge sees the source, the expected target language (derived the same way the
// translator decides direction), and the specific failure to watch for.
export function buildJudgePrompt(
  input: string,
  tone: ToneId,
  watchFor: string,
  output: string
): string {
  const targetLang = detectToEnglish(input)
    ? 'natural, idiomatic English'
    : `natural Japanese in the ${TONES[tone]}`;

  return `You are a strict native-speaker translation grader. Judge ONLY the OUTPUT below — do not translate anything yourself.

SOURCE (between the triple quotes, may span multiple lines): """${input}"""
EXPECTED TARGET: ${targetLang}
SPECIFICALLY WATCH FOR: ${watchFor}

OUTPUT TO GRADE:
${output}

Rate how natural and correct the OUTPUT reads to a native speaker, and whether it commits the specific failure named above.

Reply with ONLY a JSON object, no prose, no markdown fences:
{"score": <1-5 integer>, "natural": <true|false>, "watch_for_violated": <true|false>, "issues": [<short strings>]}

Scoring guide:
- 5: a native would genuinely text or write this; correct and idiomatic.
- 4: natural with a minor nit.
- 3: understandable but a bit off or stiff.
- 2: a real grammar/register error or unnatural phrasing.
- 1: wrong language, untranslated, an obeyed instruction, or broken grammar.
"watch_for_violated" is true if the OUTPUT commits the specific failure named in WATCH FOR.`;
}

// Sonnet usually returns clean JSON, but tolerate stray prose or ```json fences
// by extracting the first {...} block. Throws if nothing parseable is found so
// the runner can record the case as a hard failure rather than silently pass.
export function parseVerdict(raw: string): Verdict {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Judge returned no JSON object: ${raw.slice(0, 200)}`);
  }
  // Sonnet occasionally echoes the prompt's <…> placeholder syntax literally
  // (e.g. `"natural": <false>`), which isn't valid JSON. Unwrap angle brackets
  // around scalar values before parsing so that one slip doesn't fail the case.
  const json = raw.slice(start, end + 1).replace(/<\s*(true|false|null|-?\d+(?:\.\d+)?)\s*>/gi, '$1');
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Judge JSON was not an object');
  }
  const v = parsed as Partial<Verdict>;
  return {
    score: typeof v.score === 'number' ? v.score : 0,
    natural: v.natural === true,
    watch_for_violated: v.watch_for_violated === true,
    issues: Array.isArray(v.issues) ? v.issues.map(String) : [],
  };
}
