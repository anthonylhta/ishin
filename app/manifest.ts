import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tone Translator',
    short_name: 'Tone',
    description:
      'Fast, natural-sounding Japanese ⇄ English translator with tone control.',
    start_url: '/',
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
