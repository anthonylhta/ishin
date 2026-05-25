import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Called once on sign-in to ensure the user row exists in our DB.
// Uses currentUser() to grab the email from Clerk.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress ?? null;

    const { error } = await supabase
      .from('users')
      .upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: false });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
  }
}
