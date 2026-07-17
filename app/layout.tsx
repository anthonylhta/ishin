import type { Metadata, Viewport } from 'next';
import { DM_Sans, Shippori_Mincho } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import Script from 'next/script';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
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
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ishin — Japanese ⇄ English that lands as intended',
  description:
    'Cross-cultural Japanese ⇄ English communication: a free casual/polite translator, and a business review layer that catches messages that are correct but culturally wrong.',
  applicationName: 'Ishin',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ishin',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D0D0B',
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
    <ClerkProvider afterSignOutUrl="/personal">
      <html lang="en" className="dark">
        <body className={`${dmSans.variable} ${shipporiMincho.variable} font-sans antialiased`}>
            {children}
          <ServiceWorkerRegistrar />
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