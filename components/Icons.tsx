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

// The brand seal mark — 以心 carved (白文-style) out of a vermilion hanko square.
// The characters are embedded Shippori Mincho 600 outlines (SIL OFL), each
// normalized to a 100×100 box: the app only self-hosts the font's latin subset,
// so SVG text would fall back to whatever JP font the OS has — paths render the
// mark identically everywhere, and rasterize to favicons without a font.
const SEAL_I =
  'M73.41 69.74Q66.30 78.75 54.62 85.98Q42.94 93.21 25.36 98.78L24.47 96.89Q43.72 87.88 54.78 77.42Q65.85 66.96 70.75 54.78Q75.64 42.60 77.20 26.36Q77.75 20.80 77.75 14.68Q77.75 7.01 76.97 1.22Q85.65 2 89.04 2.73Q92.44 3.45 92.44 4.23Q92.44 4.67 91.43 5.23L89.43 6.56Q88.88 20.58 87.76 30.53Q86.65 40.49 83.87 49.61Q81.09 58.73 75.86 66.41Q88.21 71.97 94.10 78.81Q100 85.65 100 91.32Q100 94.10 98.61 95.83Q97.22 97.55 94.99 97.55Q92.99 97.55 90.77 96.11Q88.54 90.21 83.82 83.26Q79.09 76.31 73.41 69.74M24.36 5.78L25.25 70.19L27.70 69.41Q39.93 65.52 52.73 61.07L53.17 62.51Q31.26 76.08 8.45 86.99Q8.12 87.99 7.40 88.82Q6.67 89.66 5.90 89.99L0 77.42Q5.67 76.20 15.13 73.30L14.13 1.45Q21.36 1.78 24.25 2.28Q27.14 2.78 27.14 3.45Q27.14 3.89 26.25 4.45L24.36 5.78M36.37 14.91L37.49 14.24Q45.83 17.13 51.17 20.97Q56.51 24.81 58.84 28.70Q61.18 32.59 61.18 35.93Q61.18 38.60 59.79 40.32Q58.40 42.05 56.28 42.05Q54.28 42.05 51.95 40.38Q50.39 34.59 45.94 27.70Q41.49 20.80 36.37 14.91';
const SEAL_KOKORO =
  'M30.52 2.22L30.85 1.44Q42.84 2.77 50.44 6.05Q58.05 9.32 61.38 13.32Q64.71 17.31 64.71 21.09Q64.71 23.75 63.15 25.53Q61.60 27.30 59.27 27.30Q57.38 27.30 55.60 26.19Q52.94 20.75 46.28 14.26Q39.62 7.77 30.30 3L30.52 2.22M28.97 87.46L28.97 46.39Q28.97 32.41 27.52 23.64Q35.63 25.64 38.73 26.80Q41.84 27.97 41.84 28.75Q41.84 29.08 40.95 29.74L39.07 30.97L39.07 84.57Q39.07 86.57 40.29 87.29Q41.51 88.01 45.06 88.01L57.82 88.01Q66.37 88.01 69.15 87.68Q70.37 87.57 71.09 87.18Q71.81 86.79 72.25 85.79Q73.92 82.57 77.14 67.81L78.36 67.81L78.69 86.57Q81.13 87.57 82.02 88.57Q82.91 89.57 82.91 91.23Q82.91 94.01 80.80 95.56Q78.69 97.11 73.14 97.84Q67.59 98.56 57.05 98.56L43.51 98.56Q37.74 98.56 34.63 97.61Q31.52 96.67 30.24 94.34Q28.97 92.01 28.97 87.46M75.36 34.41L76.14 33.30Q88.57 39.62 94.28 47.72Q100 55.83 100 63.26Q100 67.92 98.11 70.98Q96.23 74.03 93.56 74.03Q91.01 74.03 88.79 71.14Q88.79 62.04 85.57 51.83Q82.35 41.62 75.36 34.41M14.32 34.52L15.87 34.52Q18.87 43.84 18.87 52.05Q18.87 59.16 16.87 64.54Q14.87 69.92 11.88 73.03Q8.77 76.47 5.22 76.47Q2.44 76.47 1 74.36Q0 73.03 0 71.25Q0 68.26 2.89 65.70Q7.77 61.82 11.15 53.22Q14.54 44.62 14.32 34.52';

export const SealMark = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
    <rect width="100" height="100" rx="17" fill="var(--accent-red)" />
    <g fill="var(--background)">
      <g transform="translate(32 11) scale(0.36)"><path d={SEAL_I} /></g>
      <g transform="translate(32 53) scale(0.36)"><path d={SEAL_KOKORO} /></g>
    </g>
  </svg>
);
