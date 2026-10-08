"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAccountSignedIn } from "@/lib/auth/owner";
import { endSession, startSession } from "@/lib/auth/session";
import { clearLoginFailures, loginBlocked, recordLoginFailure } from "@/lib/auth/throttle";
import { passwordsMatch, safeAdminNext } from "@/lib/auth/token";

async function clientKey() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "local";
}

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const key = await clientKey();
  if (loginBlocked(key)) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return {
      error: "Définissez ADMIN_PASSWORD dans .env.local avant de vous connecter.",
    };
  }

  if (!(await adminAccountSignedIn())) {
    recordLoginFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { error: "Seul le compte administrateur peut entrer. Le mot de passe ne suffit pas." };
  }

  if (!password || !passwordsMatch(password, expected)) {
    recordLoginFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { error: "Mot de passe incorrect." };
  }

  clearLoginFailures(key);
  await startSession();
  redirect(safeAdminNext(String(formData.get("next") ?? "")));
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}
