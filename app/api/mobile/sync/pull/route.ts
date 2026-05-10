import { NextRequest, NextResponse } from 'next/server';
import {
  assertMobileAuthSecret,
  getBearerToken,
  verifyMobileToken,
} from '@/lib/mobile/auth';
import { pullMobileAppointments } from '@/lib/mobile/sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let secret: string;
  try {
    secret = assertMobileAuthSecret();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  const token = getBearerToken(request);
  const claims = verifyMobileToken(token, secret);

  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = request.nextUrl.searchParams.get('since') ?? undefined;
  const response = await pullMobileAppointments({ since });
  if (response.error) {
    return NextResponse.json(
      {
        error: response.error,
        serverTime: response.serverTime,
        cursor: response.cursor,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ...response,
    user: { username: claims.sub },
  });
}
