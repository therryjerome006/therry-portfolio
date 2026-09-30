import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

export { SESSION_COOKIE };
const MAX_AGE = 60 * 60 * 24 * 7;

export async function hasValidSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await hasValidSession())) redirect("/admin/login");
}

export async function startSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(MAX_AGE), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
