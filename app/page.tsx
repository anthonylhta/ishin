export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import HomeClient from './HomeClient';

// Coarse mobile detection from the User-Agent so the server renders the correct
// composer on first paint and phones don't flash the desktop layout before the
// client-side matchMedia check runs. This is only the *initial* guess —
// HomeClient's matchMedia listener corrects any edge cases (tablets, desktop
// mode, window resizes) after mount.
const MOBILE_UA = /Android|iPhone|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export default async function Page() {
  const ua = (await headers()).get('user-agent') ?? '';
  const initialIsMobile = MOBILE_UA.test(ua);
  return <HomeClient initialIsMobile={initialIsMobile} />;
}
