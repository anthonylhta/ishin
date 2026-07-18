import Link from 'next/link';
import { SealMark } from '@/components/Icons';

// The marketing/legal-page footer (/, /business, /privacy, /terms, /changelog).
// Deliberately not rendered inside the /personal app view — the product keeps
// its own chrome; only the empty-state byline links Privacy from there.
export default function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 24px 28px' }}>
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <SealMark size={28} />
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3em', color: 'var(--text-primary)' }}>
              ISHIN
            </div>
            <div style={{ marginTop: '5px', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-serif)' }}>
              以心伝心 — understanding without words
            </div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.74rem', paddingTop: '2px' }}>
          <Link className="ishin-foot-link" href="/personal">Personal</Link>
          <Link className="ishin-foot-link" href="/business">Business</Link>
          <Link className="ishin-foot-link" href="/changelog">Changelog</Link>
          <Link className="ishin-foot-link" href="/privacy">Privacy</Link>
          <Link className="ishin-foot-link" href="/terms">Terms</Link>
          <a
            className="ishin-foot-link"
            href="https://github.com/anthonylhta/ishin"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
      <div
        style={{
          maxWidth: '720px',
          margin: '22px auto 0',
          fontSize: '0.68rem',
          color: 'var(--text-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <span>© 2026 Ishin · Built by Anthony Ta</span>
        <a href="mailto:hello@ishin.io" style={{ color: 'inherit', textDecoration: 'none' }}>
          hello@ishin.io
        </a>
      </div>
    </footer>
  );
}
