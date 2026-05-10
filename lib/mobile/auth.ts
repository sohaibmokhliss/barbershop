import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

type TokenPayload = {
  sub: string;
  iat: number;
  exp: number;
  scope: 'mobile-sync';
};

function base64urlEncode(input: string | Buffer): string {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = padded.length % 4;
  const normalized =
    remainder > 0 ? padded + '='.repeat(4 - remainder) : padded;
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function getMobileAuthSecret(): string {
  return (
    process.env.MOBILE_SESSION_SECRET?.trim() ??
    process.env.SESSION_SECRET?.trim() ??
    ''
  );
}

export function issueMobileToken(username: string, secret: string): string {
  const now = Date.now();
  const payload: TokenPayload = {
    sub: username,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS * 1000,
    scope: 'mobile-sync',
  };

  const payloadPart = base64urlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(payloadPart).digest();
  return `${payloadPart}.${base64urlEncode(signature)}`;
}

export function verifyMobileToken(
  token: string | undefined,
  secret: string,
): TokenPayload | null {
  if (!token) return null;

  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 0) return null;

  const payloadPart = token.slice(0, dotIdx);
  const signaturePart = token.slice(dotIdx + 1);

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payloadPart)
      .digest();
    const actualSignature = Buffer.from(signaturePart.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(base64urlDecode(payloadPart)) as TokenPayload;
    if (payload.scope !== 'mobile-sync') return null;
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      return null;
    }
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: NextRequest): string | undefined {
  const header = request.headers.get('authorization');
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

export function assertMobileAuthSecret(): string {
  const secret = getMobileAuthSecret();
  if (!secret) {
    throw new Error('Missing mobile auth secret');
  }
  return secret;
}

