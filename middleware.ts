import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // Support both cookie name formats (dev vs prod/secure)
    cookieName: process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
  });

  const isLoggedIn = !!token;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === '/login';
  const isApiAuth = pathname.startsWith('/api/auth');
  const isPublic = pathname.startsWith('/_next') || pathname.startsWith('/favicon');

  if (isPublic || isApiAuth) return NextResponse.next();
  if (!isLoggedIn && !isLoginPage) return NextResponse.redirect(new URL('/login', req.url));
  if (isLoggedIn && isLoginPage) return NextResponse.redirect(new URL('/overview', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
