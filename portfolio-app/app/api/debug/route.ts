import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions) as any;
  if (!session) return NextResponse.json({ error: 'No session' });

  // Return safe debug info — no actual token values
  return NextResponse.json({
    hasSession: true,
    hasAccessToken: !!session.accessToken,
    accessTokenLength: session.accessToken?.length || 0,
    accessTokenPrefix: session.accessToken?.slice(0, 10) || null,
    sessionError: session.error || null,
    userEmail: session.user?.email || null,
  });
}
