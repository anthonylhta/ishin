import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  normalizeEmail,
  parseWaitlistBody,
  MAX_EMAIL_CHARS,
  MAX_CONTEXT_CHARS,
} from '../app/api/waitlist/utils';

describe('isValidEmail', () => {
  it.each([
    'a@b.co',
    'anthony.ta@live.com',
    'first.last+tag@sub.example.co.jp',
  ])('accepts a well-formed address "%s"', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    '',
    'no-at-sign.com',
    'no@domain',
    'spaces in@email.com',
    'two@@at.com',
    '@nolocal.com',
    'trailing@dot.',
  ])('rejects the malformed address "%s"', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it(`rejects an address longer than ${MAX_EMAIL_CHARS} characters`, () => {
    const longLocal = 'a'.repeat(MAX_EMAIL_CHARS); // local part alone exceeds the cap
    expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
  });

  it(`accepts an address at exactly ${MAX_EMAIL_CHARS} characters`, () => {
    const domain = '@example.com';
    const local = 'a'.repeat(MAX_EMAIL_CHARS - domain.length);
    const email = local + domain;
    expect(email.length).toBe(MAX_EMAIL_CHARS);
    expect(isValidEmail(email)).toBe(true);
  });
});

describe('normalizeEmail', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  a@b.co  ')).toBe('a@b.co');
  });

  it('lowercases', () => {
    expect(normalizeEmail('Anthony.TA@Live.COM')).toBe('anthony.ta@live.com');
  });

  it('trims and lowercases together', () => {
    expect(normalizeEmail('  Foo@Bar.Com\n')).toBe('foo@bar.com');
  });
});

describe('parseWaitlistBody', () => {
  it('parses a happy-path body', () => {
    const result = parseWaitlistBody({ email: 'a@b.co', context: 'we email JP partners daily', form_extra: '' });
    expect(result).toEqual({
      email: 'a@b.co',
      context: 'we email JP partners daily',
      honeypotTripped: false,
    });
  });

  it('trims context and drops it when empty', () => {
    expect(parseWaitlistBody({ email: 'a@b.co', context: '   ' }).context).toBeNull();
    expect(parseWaitlistBody({ email: 'a@b.co', context: '  hi  ' }).context).toBe('hi');
  });

  it(`truncates context at ${MAX_CONTEXT_CHARS} characters instead of rejecting`, () => {
    const long = 'x'.repeat(MAX_CONTEXT_CHARS + 200);
    const result = parseWaitlistBody({ email: 'a@b.co', context: long });
    expect(result.context).toHaveLength(MAX_CONTEXT_CHARS);
  });

  it('trips the honeypot when form_extra is a non-empty string', () => {
    expect(parseWaitlistBody({ email: 'a@b.co', form_extra: 'http://spam.example' }).honeypotTripped).toBe(true);
  });

  it('does not trip the honeypot for an empty or missing form_extra', () => {
    expect(parseWaitlistBody({ email: 'a@b.co', form_extra: '' }).honeypotTripped).toBe(false);
    expect(parseWaitlistBody({ email: 'a@b.co' }).honeypotTripped).toBe(false);
  });

  it('does not trip the honeypot for the legacy website field (the key moved)', () => {
    expect(parseWaitlistBody({ email: 'a@b.co', website: 'http://spam.example' }).honeypotTripped).toBe(false);
  });

  it('degrades missing fields to defaults', () => {
    expect(parseWaitlistBody({})).toEqual({ email: '', context: null, honeypotTripped: false });
  });

  it('tolerates malformed field types', () => {
    const result = parseWaitlistBody({ email: 123, context: { nope: true }, form_extra: 42 });
    expect(result).toEqual({ email: '', context: null, honeypotTripped: false });
  });

  it.each([null, undefined, 'a string', 42, []])('tolerates a non-object body (%s)', (body) => {
    expect(parseWaitlistBody(body)).toEqual({ email: '', context: null, honeypotTripped: false });
  });
});
