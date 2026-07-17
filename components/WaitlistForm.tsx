'use client';

import { useState } from 'react';
import { SpinnerIcon } from '@/components/Icons';

// Shape-only client pre-validation. The server is authoritative (app/api/waitlist);
// this just spares an obviously-bad submit a round trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '12px 14px',
  color: 'var(--text-primary)',
  fontSize: '15px',
  fontFamily: 'var(--font-sans)',
  lineHeight: 1.5,
  outline: 'none',
};

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [context, setContext] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — real users never see this
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    if (!EMAIL_RE.test(email.trim())) {
      setStatus('error');
      setError("That email doesn't look right.");
      return;
    }

    setStatus('submitting');
    setError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), context, website }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setStatus('success');
        return;
      }
      setStatus('error');
      setError(data.error ?? 'Something went wrong. Please try again.');
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <p style={{ fontSize: '15px', color: 'var(--text-body)', lineHeight: 1.6 }}>
        You&apos;re on the list. We&apos;ll be in touch — thank you.
      </p>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        aria-label="Email address"
        style={inputStyle}
      />

      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="What would this solve for you? (optional)"
        aria-label="What would this solve for you? (optional)"
        style={{ ...inputStyle, resize: 'vertical', minHeight: '84px' }}
      />

      {/* Honeypot: hidden from real users, catches bots that fill every field.
          Visually removed, off the tab order, and hidden from assistive tech. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: 0, opacity: 0, pointerEvents: 'none' }}
      />

      <button
        type="submit"
        disabled={submitting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'var(--accent-red)',
          color: 'var(--text-primary)',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          cursor: submitting ? 'default' : 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? (
          <>
            <SpinnerIcon size={16} />
            Joining…
          </>
        ) : (
          'Join the waitlist'
        )}
      </button>

      {status === 'error' && error && (
        <p style={{ fontSize: '14px', color: 'var(--accent-red)', lineHeight: 1.5 }}>{error}</p>
      )}
    </form>
  );
}
