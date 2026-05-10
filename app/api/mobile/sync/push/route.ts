import { NextRequest, NextResponse } from 'next/server';
import {
  assertMobileAuthSecret,
  getBearerToken,
  verifyMobileToken,
} from '@/lib/mobile/auth';
import { pushMobileOperations, type MobileSyncPayload } from '@/lib/mobile/sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('operations' in body)) {
    return NextResponse.json(
      { error: 'operations array is required' },
      { status: 400 },
    );
  }

  const payload = body as { operations?: unknown };
  if (!Array.isArray(payload.operations)) {
    return NextResponse.json(
      { error: 'operations array is required' },
      { status: 400 },
    );
  }

  const response = await pushMobileOperations(payload as MobileSyncPayload);

  if (response.error) {
    return NextResponse.json(
      {
        error: response.error,
        serverTime: response.serverTime,
        cursor: response.cursor,
        results: response.results,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...response,
    user: { username: claims.sub },
  });
}
