import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ishin',
    short_name: 'Ishin',
    description:
      'Cross-cultural Japanese ⇄ English communication: a free casual/polite translator, and a business review layer that catches messages that are correct but culturally wrong.',
    id: '/personal',
    start_url: '/personal',
    display: 'standalone',
    background_color: '#0D0D0B',
    theme_color: '#0D0D0B',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
