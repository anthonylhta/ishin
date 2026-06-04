// Shared types for the naturalness eval harness. See evals/README.md.

import { TONES } from '../app/api/translate/utils';

export type ToneId = keyof typeof TONES;

// One case in the golden set. Seeded from real failure modes the prompt was
// hardened against — each `regression_of` points at the ADR/bug it guards.
export interface GoldenCase {
  id: string;
  input: string;
  tone: ToneId;
  watch_for: string;
  regression_of?: string;
}

// The judge (Sonnet) returns this for each translation it grades.
export interface Verdict {
  score: number; // 1 (wrong/robotic) .. 5 (a native would actually write this)
  natural: boolean;
  watch_for_violated: boolean; // did it hit the specific failure named in the case?
  issues: string[];
}

// One row in the scorecard: the case, what the translator produced, and the
// averaged verdict across repeats.
export interface CaseResult extends Verdict {
  id: string;
  input: string;
  tone: ToneId;
  output: string;
  regression_of?: string;
  passed: boolean; // natural && !watch_for_violated
}
