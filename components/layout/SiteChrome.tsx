"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer/Footer";
import { Navbar } from "@/components/navbar/Navbar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");

  return (
    <>
      {admin ? null : <Navbar />}
      <main id="contenu">{children}</main>
      {admin ? null : <Footer />}
    </>
  );
}