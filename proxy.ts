import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeAdminNext, SESSION_COOKIE, signPath, verifySessionToken } from "@/lib/auth/token";

async function withTrustedPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-pathname-sig", await signPath(pathname));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (pathname.startsWith("/api/admin")) {
    if (!authed) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const loginPage = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  if (loginPage || authed) return withTrustedPath(request);

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", safeAdminNext(pathname));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
