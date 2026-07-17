import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, isRateLimited } from '../translate/utils';
import { isValidEmail, normalizeEmail, parseWaitlistBody } from './utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client bypasses RLS; the waitlist table has no anon policies so
// only this route (holding the service-role key) can read or write it.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  // Rate limit first, on an isolated bucket so waitlist spam can't drain (or be
  // drained by) the translate limiter's shared per-instance Map.
  const ip = getClientIp(request.headers);
  if (isRateLimited('waitlist:' + ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { email, context, honeypotTripped } = parseWaitlistBody(body);

  // Honeypot: a bot filled the hidden `website` field. Pretend it worked (no
  // insert, no error) so the bot can't tell it was caught. Checked before the DB
  // call so it costs nothing.
  if (honeypotTripped) {
    return NextResponse.json({ ok: true });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }

  const normalized = normalizeEmail(email);
  const country = request.headers.get('x-vercel-ip-country') ?? null;

  const { error } = await supabase
    .from('waitlist')
    .insert({ email: normalized, context, source: 'business-landing', country });

  if (error) {
    // Unique violation → this email is already on the list. Return success so
    // the response can't be used to enumerate who has signed up.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true });
    }
    console.error('Waitlist insert error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
