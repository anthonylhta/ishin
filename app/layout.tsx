import type { Metadata } from 'next';
import { DM_Sans, Shippori_Mincho } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import Script from 'next/script';
import './globals.css';

const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tone Translator | Japanese Politeness Engine',
  description: 'Translate between Japanese and English with cultural precision',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" className="dark">
        <body className={`${dmSans.variable} ${shipporiMincho.variable} font-sans antialiased`}>
            {children}
          {/* Cloudflare Web Analytics (Core Web Vitals RUM) — only loads when a beacon token is configured */}
          {cfBeaconToken && (
            <Script
              src="https://static.cloudflareinsights.com/beacon.min.js"
              strategy="afterInteractive"
              data-cf-beacon={`{"token": "${cfBeaconToken}"}`}
            />
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}