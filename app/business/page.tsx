export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import WaitlistForm from '@/components/WaitlistForm';
import { WarningIcon } from '@/components/Icons';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: "Ishin for Business — catch the message that's correct but wrong",
  description:
    'A review layer for Japanese ⇄ English business communication: catches messages that are grammatically right but culturally wrong — the missing cushion, the too-blunt no, the misread soft decline.',
};

// Quiet uppercase micro-label above each step of the worked example.
const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '1.4px',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: '10px',
};

const serifJp: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '19px',
  color: 'var(--text-primary)',
  lineHeight: 1.7,
};

const glossStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-tertiary)',
  fontStyle: 'italic',
  marginTop: '8px',
};

export default function BusinessPage() {
  return (
    <>
    <main
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '720px',
        margin: '0 auto',
        padding: '56px 22px 96px',
      }}
    >
      {/* Wordmark row — links home */}
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '10px',
          textDecoration: 'none',
          marginBottom: '64px',
        }}
      >
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--accent-gold)' }}>以心</span>
        <span
          style={{
            fontSize: '12px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Ishin
        </span>
      </Link>

      {/* Hero */}
      <header style={{ marginBottom: '56px' }}>
        <h1
          style={{
            fontSize: 'clamp(30px, 6vw, 46px)',
            lineHeight: 1.15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
          }}
        >
          Grammatically perfect. Culturally wrong.
        </h1>
        <p
          style={{
            marginTop: '22px',
            fontSize: '17px',
            lineHeight: 1.7,
            color: 'var(--text-body)',
          }}
        >
          Translation tools check your words. Nobody checks the moves a message is expected to make — the apology
          before a refusal, the softness of a no, the distance the relationship demands.{' '}
          <span style={{ fontFamily: 'var(--font-serif)' }}>以心伝心</span> is understanding that never gets said.
          That&apos;s the part we check.
        </p>
      </header>

      {/* Worked example — the centerpiece, told slowly in one contained block */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '48px',
        }}
      >
        {/* Step 1 — the source message */}
        <div>
          <div style={labelStyle}>A teammate writes:</div>
          <p style={{ fontSize: '18px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            We can&apos;t take this on.
          </p>
        </div>

        {/* Step 2 — a correct-but-bare rendering */}
        <div style={{ marginTop: '28px' }}>
          <div style={labelStyle}>Any translator renders it correctly:</div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={serifJp}>「その件は対応できません。」</div>
            <div style={glossStyle}>(&nbsp;We cannot handle this matter.&nbsp;)</div>
          </div>
        </div>

        {/* Step 3 — the flag */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '20px',
            padding: '16px 18px',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent-red)',
            borderRadius: '10px',
          }}
        >
          <span style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }}>
            <WarningIcon size={18} />
          </span>
          <p style={{ fontSize: '14px', color: 'var(--text-body)', lineHeight: 1.65 }}>
            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Correct — and abrupt.</span> A Japanese
            business refusal is expected to open with a cushion (
            <span style={{ fontFamily: 'var(--font-serif)' }}>クッション言葉</span>): an apology or softener before
            the no. Without it, this reads as a door slammed.
          </p>
        </div>

        {/* Step 4 — the suggested rewrite */}
        <div style={{ marginTop: '28px' }}>
          <div style={labelStyle}>What Ishin suggests:</div>
          <div
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-gold)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={serifJp}>「恐れ入りますが、その件はご対応いたしかねます。」</div>
            <div style={glossStyle}>(&nbsp;We&apos;re terribly sorry, but we&apos;re unable to take this on.&nbsp;)</div>
          </div>
          <p
            style={{
              marginTop: '14px',
              fontSize: '14px',
              color: 'var(--accent-gold)',
              lineHeight: 1.65,
            }}
          >
            Same refusal. The cushion doesn&apos;t change the answer — it tells the reader the relationship survives it.
          </p>
        </div>
      </section>

      {/* Both-directions note */}
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '40px' }}>
        It works in reverse, too: when a partner writes{' '}
        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-body)' }}>「前向きに検討します」</span> —
        literally &quot;we&apos;ll consider it positively&quot; — Ishin tells you it often signals a polite decline,
        before you forecast the deal.
      </p>

      {/* Use-case line */}
      <p
        style={{
          fontSize: '17px',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
          marginBottom: '72px',
        }}
      >
        Support replies that keep accounts. Sales follow-ups that don&apos;t overstep. Partner emails that sound like
        you&apos;ve done this before.
      </p>

      {/* Waitlist */}
      <section
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '48px',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Early access</h2>
        <p style={{ marginTop: '14px', marginBottom: '28px', fontSize: '16px', color: 'var(--text-body)', lineHeight: 1.7 }}>
          We&apos;re building Ishin for Business with the first teams on the list — people who live this problem. Tell us
          about yours.
        </p>

        <WaitlistForm />

        <p style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Or reach me on{' '}
          <a
            href="https://www.linkedin.com/in/anthonylhta"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
          >
            LinkedIn
          </a>
          .
        </p>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
