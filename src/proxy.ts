import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic access check for the admin area: without a session cookie, pages redirect to the
 * login. The real check (session in the database) happens in every page, Server Action and
 * Route Handler; this only avoids rendering for strangers.
 */

const SECURE = process.env.NODE_ENV === "production";
const ADMIN_COOKIE = SECURE ? "__Host-kovali-admin" : "kovali-admin";

const PUBLIC_PATHS = ["/admin/login", "/admin/einrichtung"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || request.cookies.has(ADMIN_COOKIE)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/admin/login", request.url);
  if (pathname !== "/admin") {
    login.searchParams.set("next", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
