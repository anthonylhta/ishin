import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = !!process.env.CLAUDE_API_KEY;
  const keyPrefix = process.env.CLAUDE_API_KEY?.substring(0, 15);
  
  return NextResponse.json({
    hasKey,
    keyPrefix: keyPrefix || 'none',
    fullLength: process.env.CLAUDE_API_KEY?.length || 0,
  });
}