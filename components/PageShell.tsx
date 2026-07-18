import Link from 'next/link';
import { SealMark } from '@/components/Icons';
import SiteFooter from '@/components/SiteFooter';

// Shared chrome for the content pages (/privacy, /terms, /changelog): wordmark
// home-link, title, optional sub-line, narrow readable column, site footer.
export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <main style={{ flex: 1, padding: '44px 24px 56px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <SealMark size={22} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.3em', color: 'var(--text-secondary)' }}>
              ISHIN
            </span>
          </Link>
          <h1 style={{ marginTop: '36px', fontSize: '1.7rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && (
            <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>{subtitle}</div>
          )}
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// The content pages' shared type styles: gold section caps + readable body.
export const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2
    style={{
      margin: '36px 0 10px',
      fontSize: '0.68rem',
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--accent-gold)',
    }}
  >
    {children}
  </h2>
);

export const Body = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-body)', marginBottom: '10px' }}>{children}</p>
);

// Inline emphasis / links inside Body copy.
export const Strong = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>
);

export const BodyLink = ({ href, external }: { href: string; external?: boolean }) => (
  <a
    href={href}
    style={{ color: 'var(--text-primary)' }}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
  >
    {href.startsWith('mailto:') ? href.slice(7) : href.replace(/^https?:\/\//, '')}
  </a>
);
