import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAccount } from "@/lib/auth/owner";
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

async function visitorIsAdmin(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  if (!url || !key || !hasSession) return false;
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
  const { data } = await supabase.auth.getUser();
  return isAdminAccount(data.user?.email);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (pathname.startsWith("/api/admin") || pathname.startsWith("/admin")) {
    const loginPage = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
    const response = pathname.startsWith("/api/admin") ? NextResponse.next() : await withTrustedPath(request);
    const owner = await visitorIsAdmin(request, response);
    if (pathname.startsWith("/api/admin")) {
      if (!authed || !owner) {
        const denied = NextResponse.json({ error: "Connexion requise." }, { status: 401 });
        if (authed) denied.cookies.delete(SESSION_COOKIE);
        return denied;
      }
      return response;
    }
    if (loginPage || (authed && owner)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", safeAdminNext(pathname));
    const redirect = NextResponse.redirect(url);
    if (authed) redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
  }

  return withVisitorSession(request, await withTrustedPath(request));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ico)$).*)"],
};
