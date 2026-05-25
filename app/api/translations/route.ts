import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service-role client bypasses RLS; user scoping is enforced below via Clerk's userId.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const VALID_TONES = ['casual', 'polite', 'formal', 'blunt'] as const;
const MAX_USER_TEXT = 2000;
const MAX_ASSISTANT_TEXT = 4000;
const MAX_EXPLANATION = 1000;

// GET - Load all translations for the logged-in user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Load translations error:', error);
    return NextResponse.json({ error: 'Failed to load translations' }, { status: 500 });
  }
}

// POST - Save a new translation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userText, assistantText, tone, explanation } = await request.json();

    if (!userText || typeof userText !== 'string' || userText.length > MAX_USER_TEXT) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (!assistantText || typeof assistantText !== 'string' || assistantText.length > MAX_ASSISTANT_TEXT) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (!tone || !(VALID_TONES as readonly string[]).includes(tone)) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 });
    }
    if (explanation != null && (typeof explanation !== 'string' || explanation.length > MAX_EXPLANATION)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Ensure the user row exists before inserting (satisfies FK constraint).
    // /api/user/sync handles this on sign-in, but this guards against races.
    await supabase
      .from('users')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

    const { data, error } = await supabase
      .from('translations')
      .insert({
        user_id: userId,
        user_text: userText,
        assistant_text: assistantText,
        tone,
        explanation,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Save translation error:', error);
    return NextResponse.json({ error: 'Failed to save translation' }, { status: 500 });
  }
}

// DELETE - Delete one translation (?id=...) or all for the user
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let query = supabase.from('translations').delete().eq('user_id', userId);
    if (id) {
      query = query.eq('id', id);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete translations error:', error);
    return NextResponse.json({ error: 'Failed to delete translations' }, { status: 500 });
  }
}
