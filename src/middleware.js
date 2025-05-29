import { NextResponse } from "next/server";

export function middleware(request) {
  const deviceId = request.cookies.get("deviceId")?.value;
  const { pathname } = request.nextUrl;

  if (!deviceId) {
    const loginSignupUrl = new URL("/", request.url);

    if (pathname !== "/") {
      return NextResponse.redirect(loginSignupUrl);
    }
    return NextResponse.next();
  }

  if (deviceId && pathname === "/") {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - '/api/:path*' (API routes)
     * - '/_next/static/:path*' (Next.js static files)
     * - '/_next/image/:path*' (Next.js image optimization files)
     * - '/favicon.ico' (favicon)
     * - '/assets/:path*' (your custom assets folder)
     * - The root path '/' because it's your login/signup page and doesn't require authentication *before* middleware runs.
     * - Any specific file extensions that should be ignored
     */
    "/((?!api|_next/static|_next/image|favicon.ico|assets|/$|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$).*)",
  ],
};
