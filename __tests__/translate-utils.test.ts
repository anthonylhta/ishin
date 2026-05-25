import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getClientIp,
  isRateLimited,
  buildSystemPrompt,
  validateTranslationInput,
  hits,
  TONES,
  MAX_INPUT_CHARS,
  RATE_LIMIT,
} from '../app/api/translate/utils';

function makeHeaders(values: Record<string, string>): { get(name: string): string | null } {
  return { get: (name: string) => values[name] ?? null };
}

describe('getClientIp', () => {
  it('returns x-vercel-forwarded-for when present', () => {
    expect(getClientIp(makeHeaders({ 'x-vercel-forwarded-for': '1.2.3.4' }))).toBe('1.2.3.4');
  });

  it('takes only the first IP from a comma-separated list', () => {
    expect(getClientIp(makeHeaders({ 'x-vercel-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
  });

  it('trims whitespace from the IP', () => {
    expect(getClientIp(makeHeaders({ 'x-vercel-forwarded-for': '  1.2.3.4  ' }))).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when vercel header is absent', () => {
    expect(getClientIp(makeHeaders({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
  });

  it('returns "unknown" when no IP headers are present', () => {
    expect(getClientIp(makeHeaders({}))).toBe('unknown');
  });
});

describe('isRateLimited', () => {
  beforeEach(() => {
    hits.clear();
    vi.useRealTimers();
  });

  it('allows the first request', () => {
    expect(isRateLimited('10.0.0.1')).toBe(false);
  });

  it(`allows up to ${RATE_LIMIT} requests`, () => {
    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(isRateLimited('10.0.0.2')).toBe(false);
    }
  });

  it(`blocks the ${RATE_LIMIT + 1}th request`, () => {
    for (let i = 0; i < RATE_LIMIT; i++) isRateLimited('10.0.0.3');
    expect(isRateLimited('10.0.0.3')).toBe(true);
  });

  it('tracks different IPs independently', () => {
    for (let i = 0; i < RATE_LIMIT; i++) isRateLimited('10.0.0.4');
    expect(isRateLimited('10.0.0.4')).toBe(true);
    expect(isRateLimited('10.0.0.5')).toBe(false);
  });

  it('resets after the window expires', () => {
    vi.useFakeTimers();
    for (let i = 0; i < RATE_LIMIT; i++) isRateLimited('10.0.0.6');
    expect(isRateLimited('10.0.0.6')).toBe(true);
    vi.advanceTimersByTime(60_001);
    expect(isRateLimited('10.0.0.6')).toBe(false);
  });
});

describe('buildSystemPrompt', () => {
  it.each(Object.keys(TONES))('includes the tone description for "%s"', (tone) => {
    const prompt = buildSystemPrompt(tone);
    expect(prompt).toContain(TONES[tone]);
    expect(prompt).toContain(`"${tone}"`);
  });

  it('includes the [[EXPLANATION]] separator instruction', () => {
    expect(buildSystemPrompt('casual')).toContain('[[EXPLANATION]]');
  });
});

describe('validateTranslationInput', () => {
  it('returns null for valid input', () => {
    expect(validateTranslationInput('hello', 'casual')).toBeNull();
  });

  it('rejects missing text', () => {
    const result = validateTranslationInput('', 'casual');
    expect(result?.status).toBe(400);
    expect(result?.error).toMatch(/required/i);
  });

  it('rejects whitespace-only text', () => {
    expect(validateTranslationInput('   ', 'casual')?.status).toBe(400);
  });

  it('rejects null text', () => {
    expect(validateTranslationInput(null, 'casual')?.status).toBe(400);
  });

  it(`rejects text over ${MAX_INPUT_CHARS} characters`, () => {
    const result = validateTranslationInput('a'.repeat(MAX_INPUT_CHARS + 1), 'casual');
    expect(result?.status).toBe(400);
    expect(result?.error).toMatch(/too long/i);
  });

  it(`allows text at exactly ${MAX_INPUT_CHARS} characters`, () => {
    expect(validateTranslationInput('a'.repeat(MAX_INPUT_CHARS), 'casual')).toBeNull();
  });

  it('rejects an unknown tone', () => {
    const result = validateTranslationInput('hello', 'slang');
    expect(result?.status).toBe(400);
    expect(result?.error).toMatch(/invalid tone/i);
  });

  it('rejects a missing tone', () => {
    expect(validateTranslationInput('hello', null)?.status).toBe(400);
  });

  it.each(Object.keys(TONES))('accepts valid tone "%s"', (tone) => {
    expect(validateTranslationInput('hello', tone)).toBeNull();
  });
});
