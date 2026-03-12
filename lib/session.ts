/**
 * Session cookie utilities using HMAC-SHA256.
 * Uses only Web Crypto APIs — works in both Edge Runtime (middleware)
 * and Node.js runtime (API route handlers).
 */

export const COOKIE_NAME = 'session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = padded.length % 4;
  const withPadding =
    remainder > 0 ? padded + '='.repeat(4 - remainder) : padded;
  return atob(withPadding);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a signed session token: base64url(payload).base64url(signature)
 * Payload = base64url(JSON({ iat: Date.now() }))
 */
export async function createSessionToken(secret: string): Promise<string> {
  const payload = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ iat: Date.now() })),
  );
  const key = await getHmacKey(secret);
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${base64urlEncode(sigBuf)}`;
}

/**
 * Verify a session token. Returns false if:
 *  - token is missing / malformed
 *  - HMAC signature is invalid
 *  - token is older than SESSION_MAX_AGE
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;

  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 0) return false;

  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  try {
    const key = await getHmacKey(secret);
    const expectedSigBuf = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload),
    );
    const expectedSig = base64urlEncode(expectedSigBuf);

    // Constant-time comparison to prevent timing attacks
    if (sig.length !== expectedSig.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return false;

    // Check token age
    const decoded = JSON.parse(base64urlDecode(payload)) as { iat: number };
    if (Date.now() - decoded.iat > SESSION_MAX_AGE * 1000) return false;

    return true;
  } catch {
    return false;
  }
}
