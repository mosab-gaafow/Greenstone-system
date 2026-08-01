import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route protection (Next.js 16 proxy convention, formerly middleware).
 *
 * This is an **optimistic** check: it only looks at whether a session cookie is
 * present. It does not, and cannot, validate it — the Better Auth instance runs
 * in the Express backend, not here, so a real check would mean a network call on
 * every navigation.
 *
 * That is fine, because this is not security. It decides which page to render
 * first, nothing more. Every request for actual data goes to the backend, which
 * verifies the session and the caller's permissions on its own. A forged cookie
 * gets past this redirect and is then refused by the first API call, and the
 * authenticated layout sends the user back to the login page.
 */

const SESSION_COOKIE = 'better-auth.session_token';
const SECURE_SESSION_COOKIE = '__Secure-better-auth.session_token';

const LOGIN_PATH = '/login';

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(SESSION_COOKIE) || request.cookies.has(SECURE_SESSION_COOKIE);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = hasSessionCookie(request);

  if (pathname === LOGIN_PATH) {
    // Someone already signed in has no reason to see the login page.
    if (signedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  if (!signedIn) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    // Remember where they were headed, so sign-in can return them there.
    loginUrl.searchParams.set('next', `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals, static assets and the brand files.
     */
    '/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
