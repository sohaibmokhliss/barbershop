import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session';

export async function POST(request: NextRequest) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    console.error('Missing ADMIN_PASSWORD or SESSION_SECRET environment variable');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (body.password !== adminPassword) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const token = await createSessionToken(sessionSecret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
