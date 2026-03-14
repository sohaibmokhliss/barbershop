import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const authBypassEnabled = process.env.DEV_BYPASS_AUTH === 'true';
  const bypassAuth = process.env.NODE_ENV !== 'production' && isLocalhost && authBypassEnabled;

  if (bypassAuth) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/admin/rendezvous', request.url));
    }
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET?.trim() ?? '';
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = await verifySessionToken(token, secret);

  // Redirect already-authenticated users away from the login page
  if (pathname === '/login') {
    if (valid) {
      return NextResponse.redirect(new URL('/admin/rendezvous', request.url));
    }
    return NextResponse.next();
  }

  // Protect all /admin/* and /api/appointments/* routes
  if (!valid) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/api/appointments/:path*'],
};
