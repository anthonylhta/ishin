import type { Metadata, Viewport } from 'next';
import { DM_Sans, Shippori_Mincho } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tone Translator | Japanese Politeness Engine',
  description:
    'Translate between Japanese and English with cultural precision — tone, nuance, and a clear explanation of every choice.',
  applicationName: 'Tone Translator',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tone',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0b0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-background">
      <body className={`${dmSans.variable} ${shipporiMincho.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
