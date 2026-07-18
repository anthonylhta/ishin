import Link from 'next/link';
import { SealMark } from '@/components/Icons';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <SealMark size={44} />
      <div style={{ marginTop: '28px', fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
        ページが見つかりません
      </div>
      <div style={{ marginTop: '8px', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        This page doesn&apos;t exist.
      </div>
      <Link
        href="/"
        style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--accent-gold)', textDecoration: 'none' }}
      >
        ← Back to ishin.io
      </Link>
    </main>
  );
}
