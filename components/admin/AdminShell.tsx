import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f8ff]">
      <AdminHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">{children}</div>
    </div>
  );
}
