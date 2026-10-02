import { createServerClient } from "@supabase/ssr";
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

async function withVisitorSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  if (!url || !key || !hasSession) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (pathname.startsWith("/api/admin")) {
    if (!authed) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    return withVisitorSession(request, NextResponse.next());
  }

  if (pathname.startsWith("/admin")) {
    const loginPage = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
    if (loginPage || authed) return withVisitorSession(request, await withTrustedPath(request));
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", safeAdminNext(pathname));
    return NextResponse.redirect(url);
  }

  return withVisitorSession(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ico)$).*)"],
};
