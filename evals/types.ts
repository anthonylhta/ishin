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

// One repeat: the exact output produced and the verdict on THAT output. Stored
// per-repeat so a flaky case (different output each run) is legible — the
// alternative of keeping one output but all repeats' issues describes outputs
// you can't see.
export interface RunSample extends Verdict {
  output: string;
}

// One row in the scorecard: the case plus every repeat, with the aggregated
// verdict across them.
export interface CaseResult {
  id: string;
  input: string;
  tone: ToneId;
  regression_of?: string;
  runs: RunSample[];
  score: number; // mean across repeats
  natural: boolean; // majority across repeats
  watch_for_violated: boolean; // true if any repeat violated
  passed: boolean; // natural && !watch_for_violated
}
