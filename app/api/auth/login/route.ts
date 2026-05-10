import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let body: { login?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!sessionSecret) {
    console.error('Missing SESSION_SECRET environment variable');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const submittedLogin = typeof body.login === 'string' ? body.login.trim() : '';
  const submittedPassword = typeof body.password === 'string' ? body.password.trim() : '';

  if (!submittedLogin || !submittedPassword) {
    return NextResponse.json({ error: 'Identifiant et mot de passe requis' }, { status: 400 });
  }

  const passwordHash = createHash('sha256').update(submittedPassword).digest('hex');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('admin_credentials')
    .select('id')
    .eq('username', submittedLogin)
    .eq('password_hash', passwordHash)
    .maybeSingle();

  if (error) {
    console.error('Supabase login query failed:', error.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect' }, { status: 401 });
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
