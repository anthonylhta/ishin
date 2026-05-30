'use client';

import { useEffect } from 'react';

// Registers the service worker in production only — registering in dev
// interferes with Next's HMR and caches stale chunks. PWA behaviour is
// verified against a production build (`next build && next start`).
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
