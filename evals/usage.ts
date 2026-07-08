// Per-model token accounting for an eval run. The runner folds each API
// response's usage into these totals so a finished run can be costed after the
// fact. Kept pure and SDK-free so it's unit-testable on its own; the runner
// executes on import, so this can't live there.

export interface ModelUsage {
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export type UsageTotals = Record<string, ModelUsage>;

export function addUsage(
  totals: UsageTotals,
  model: string,
  usage: { input_tokens: number; output_tokens: number }
): UsageTotals {
  const prev = totals[model] ?? { calls: 0, input_tokens: 0, output_tokens: 0 };
  return {
    ...totals,
    [model]: {
      calls: prev.calls + 1,
      input_tokens: prev.input_tokens + usage.input_tokens,
      output_tokens: prev.output_tokens + usage.output_tokens,
    },
  };
}
