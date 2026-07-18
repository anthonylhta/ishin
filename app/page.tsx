export const dynamic = 'force-dynamic';

import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export default function Home() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(48px + env(safe-area-inset-top)) 20px calc(40px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '720px', textAlign: 'center' }}>
        {/* Wordmark */}
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            fontSize: 'clamp(3.25rem, 13vw, 4.5rem)',
            lineHeight: 1,
            color: 'var(--text-primary)',
          }}
        >
          以心
        </div>
        <div
          style={{
            marginTop: '16px',
            fontSize: '0.9rem',
            fontWeight: 500,
            letterSpacing: '0.55em',
            textIndent: '0.55em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Ishin
        </div>

        {/* Origin line */}
        <p
          style={{
            marginTop: '28px',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          From <span style={{ fontFamily: 'var(--font-serif)' }}>以心伝心</span> — understanding
          that doesn&apos;t need words.
        </p>

        {/* Positioning */}
        <p
          style={{
            margin: '20px auto 0',
            maxWidth: '540px',
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: 'var(--text-body)',
          }}
        >
          Japanese ⇄ English translation where the unsaid part — register, cushioning, distance —
          survives the trip.
        </p>

        {/* Paths */}
        <div
          style={{
            marginTop: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            textAlign: 'left',
          }}
        >
          <Link
            href="/personal"
            className="ishin-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--accent-gold)',
              }}
            >
              For you
            </span>
            <span
              style={{
                marginTop: '8px',
                fontSize: '1.3rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Personal
            </span>
            <span
              style={{
                marginTop: '12px',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--text-body)',
              }}
            >
              A fast, natural translator for real conversations — casual or polite, with a
              naturalness check. Free; sign in to keep your history.
            </span>
            <span
              style={{
                marginTop: '18px',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              Open the translator →
            </span>
          </Link>

          <Link
            href="/business"
            className="ishin-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--accent-gold)',
              }}
            >
              For teams
            </span>
            <span
              style={{
                marginTop: '8px',
                fontSize: '1.3rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Business
            </span>
            <span
              style={{
                marginTop: '12px',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--text-body)',
              }}
            >
              Your message can be grammatically perfect and still land wrong. Ishin catches the
              missing cushion before your client does.
            </span>
            <span
              style={{
                marginTop: '18px',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
              }}
            >
              Early access — join the waitlist →
            </span>
          </Link>
        </div>

      </div>
    </main>
    <SiteFooter />
    </div>
  );
}
