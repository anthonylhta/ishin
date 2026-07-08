import { describe, it, expect } from 'vitest';
import { addUsage, type UsageTotals } from '../evals/usage';

describe('addUsage', () => {
  it('opens a bucket for a model on first sight', () => {
    const totals = addUsage({}, 'model-a', { input_tokens: 10, output_tokens: 3 });
    expect(totals).toEqual({ 'model-a': { calls: 1, input_tokens: 10, output_tokens: 3 } });
  });

  it('accumulates repeated calls to the same model', () => {
    let totals: UsageTotals = {};
    totals = addUsage(totals, 'model-a', { input_tokens: 10, output_tokens: 3 });
    totals = addUsage(totals, 'model-a', { input_tokens: 5, output_tokens: 2 });
    expect(totals).toEqual({ 'model-a': { calls: 2, input_tokens: 15, output_tokens: 5 } });
  });

  it('keeps a separate bucket per model', () => {
    let totals: UsageTotals = {};
    totals = addUsage(totals, 'model-a', { input_tokens: 10, output_tokens: 3 });
    totals = addUsage(totals, 'model-b', { input_tokens: 8, output_tokens: 4 });
    expect(totals).toEqual({
      'model-a': { calls: 1, input_tokens: 10, output_tokens: 3 },
      'model-b': { calls: 1, input_tokens: 8, output_tokens: 4 },
    });
  });

  it('does not mutate the totals passed in', () => {
    const before: UsageTotals = {};
    const after = addUsage(before, 'model-a', { input_tokens: 1, output_tokens: 1 });
    expect(before).toEqual({});
    expect(after).not.toBe(before);
  });
});
