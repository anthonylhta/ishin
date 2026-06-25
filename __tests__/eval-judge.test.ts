import { describe, it, expect } from 'vitest';
import { parseVerdict } from '../evals/judge';

describe('parseVerdict', () => {
  it('parses a clean verdict object', () => {
    const v = parseVerdict(
      '{"score": 4, "natural": true, "watch_for_violated": false, "issues": ["minor nit"]}'
    );
    expect(v).toEqual({ score: 4, natural: true, watch_for_violated: false, issues: ['minor nit'] });
  });

  it('tolerates the judge echoing <…> placeholders literally', () => {
    // Sonnet sometimes copies the prompt's `<true|false>` placeholder syntax,
    // emitting invalid JSON like `"natural": <false>`. This used to throw and
    // crash the whole eval run — it must now parse cleanly.
    const v = parseVerdict(
      '{"score": <2>, "natural": <false>, "watch_for_violated": <true>, "issues": []}'
    );
    expect(v).toEqual({ score: 2, natural: false, watch_for_violated: true, issues: [] });
  });

  it('extracts the JSON object from surrounding prose or ```json fences', () => {
    const v = parseVerdict(
      '```json\n{"score": 5, "natural": true, "watch_for_violated": false, "issues": []}\n```'
    );
    expect(v.score).toBe(5);
    expect(v.natural).toBe(true);
  });

  it('coerces missing or wrong-typed fields to safe defaults', () => {
    const v = parseVerdict('{"score": 3}');
    expect(v).toEqual({ score: 3, natural: false, watch_for_violated: false, issues: [] });
  });

  it('throws when there is no JSON object to parse', () => {
    expect(() => parseVerdict('the judge said nothing useful')).toThrow();
  });
});
