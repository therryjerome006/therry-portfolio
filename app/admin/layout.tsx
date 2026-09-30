import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { hasValidSession } from "@/lib/auth/session";
import { adminSecretConfigured, pathSignatureMatches, safeAdminNext } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!adminSecretConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20">
        <h1 className="text-2xl font-bold text-ink">Administration indisponible</h1>
        <p className="mt-3 leading-7 text-muted">
          Définissez un mot de passe d&apos;administration avant d&apos;ouvrir cet espace.
        </p>
      </main>
    );
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const trusted = await pathSignatureMatches(pathname, headerList.get("x-pathname-sig"));
  const loginPage = trusted && (pathname === "/admin/login" || pathname.startsWith("/admin/login/"));
  const authed = await hasValidSession();

  if (!loginPage && !authed) {
    redirect(`/admin/login?next=${encodeURIComponent(safeAdminNext(trusted ? pathname : "/admin/blog"))}`);
  }

  if (!authed) return children;
  return <AdminShell>{children}</AdminShell>;
}
