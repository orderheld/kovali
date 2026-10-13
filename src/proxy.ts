import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic access check for the admin area and the candidate portal: without a session
 * cookie, pages redirect to the login. The real check (session in the database) happens in
 * every page, Server Action and Route Handler; this only avoids rendering for strangers.
 */

const SECURE = process.env.NODE_ENV === "production";
const ADMIN_COOKIE = SECURE ? "__Host-kovali-admin" : "kovali-admin";
const PORTAL_COOKIE = SECURE ? "__Host-kovali-portal" : "kovali-portal";

const ADMIN_PUBLIC = ["/admin/login", "/admin/einrichtung"];
const PORTAL_PUBLIC = ["/portal/login", "/portal/einladung", "/portal/passwort"];

function isPublic(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const cookie = admin ? ADMIN_COOKIE : PORTAL_COOKIE;
  const publicPaths = admin ? ADMIN_PUBLIC : PORTAL_PUBLIC;

  if (isPublic(pathname, publicPaths) || request.cookies.has(cookie)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin/api/") || pathname.startsWith("/portal/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL(admin ? "/admin/login" : "/portal/login", request.url);
  if (pathname !== "/admin" && pathname !== "/portal") {
    login.searchParams.set("next", pathname + request.nextUrl.search);
  }
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/portal", "/portal/:path*"],
};
