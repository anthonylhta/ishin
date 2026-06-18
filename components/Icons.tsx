// Shared inline SVG icon set (Lucide-style, 1.8 stroke, currentColor so each icon
// inherits the surrounding text token). Replaces the emoji that were used as UI
// chrome — emoji render per-OS and read as a hobby project. Size via the `size`
// prop; color by setting `color` on a parent.
import type { ReactNode } from 'react';

function Icon({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export const SendIcon = ({ size }: { size?: number }) => (
  <Icon size={size}><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></Icon>
);

export const SpinnerIcon = ({ size }: { size?: number }) => (
  <svg
    width={size ?? 18}
    height={size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className="icon-spin"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" />
  </svg>
);

export const ClipboardIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </Icon>
);

export const LightbulbIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 1 0 6.5 8c0 1.6.6 2.7 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" /><path d="M10 22h4" />
  </Icon>
);

export const WarningIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </Icon>
);

export const CopyIcon = ({ size }: { size?: number }) => (
  <Icon size={size ?? 15}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const CheckIcon = ({ size }: { size?: number }) => (
  <Icon size={size ?? 15}><path d="M20 6 9 17l-5-5" /></Icon>
);

export const TrashIcon = ({ size }: { size?: number }) => (
  <Icon size={size ?? 15}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
  </Icon>
);

// Points down by default; rotate 180° for the open/expanded state.
export const ChevronIcon = ({ size }: { size?: number }) => (
  <Icon size={size ?? 16}><path d="m6 9 6 6 6-6" /></Icon>
);

// The brand torii mark (filled, red + gold) — same shapes as app/icon.svg minus
// the dark background tile, so it sits on any surface. Used for the empty state.
export const ToriiMark = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="92 140 328 284" style={{ display: 'block' }} aria-hidden>
    <rect x="92" y="150" width="328" height="32" rx="9" fill="var(--accent-red)" />
    <rect x="100" y="146" width="312" height="7" rx="3.5" fill="var(--accent-gold)" />
    <rect x="245" y="182" width="22" height="46" fill="var(--accent-red-dark)" />
    <rect x="126" y="226" width="260" height="30" rx="7" fill="var(--accent-red)" />
    <rect x="166" y="182" width="32" height="232" rx="5" fill="var(--accent-red)" />
    <rect x="314" y="182" width="32" height="232" rx="5" fill="var(--accent-red)" />
  </svg>
);
