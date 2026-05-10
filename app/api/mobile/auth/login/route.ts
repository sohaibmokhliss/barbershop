import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseClient } from '@/lib/supabase';
import {
  assertMobileAuthSecret,
  issueMobileToken,
} from '@/lib/mobile/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { login?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const login = typeof body.login === 'string' ? body.login.trim() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!login || !password) {
    return NextResponse.json(
      { error: 'Identifiant et mot de passe requis' },
      { status: 400 },
    );
  }

  let secret: string;
  try {
    secret = assertMobileAuthSecret();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  const passwordHash = createHash('sha256').update(password).digest('hex');
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('admin_credentials')
    .select('username')
    .eq('username', login)
    .eq('password_hash', passwordHash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Identifiant ou mot de passe incorrect' },
      { status: 401 },
    );
  }

  const token = issueMobileToken(login, secret);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return NextResponse.json({
    ok: true,
    token,
    tokenType: 'Bearer',
    expiresAt,
    user: { username: login },
  });
}
