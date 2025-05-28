import { NextResponse } from "next/server";

export function middleware(request) {
  // Check if user has deviceId cookie (your authentication method)
  const deviceId = request.cookies.get("deviceId")?.value;

  // If no deviceId, redirect to home page
  if (!deviceId) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  // If authenticated, allow access
  return NextResponse.next();
}

// Protect all routes except home page
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - / (home page)
     * - /api (API routes)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - /assets (static assets)
     */
    "/((?!^/$|api|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
