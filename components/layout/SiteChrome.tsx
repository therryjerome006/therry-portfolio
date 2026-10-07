"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer/Footer";
import { Navbar } from "@/components/navbar/Navbar";
import { BottomNav } from "@/components/network/BottomNav";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");

  return (
    <>
      {admin ? null : <Navbar />}
      <main id="contenu" className={admin ? undefined : "pb-20 lg:pb-0"}>
        {children}
      </main>
      {admin ? null : <BottomNav />}
      {admin ? null : <Footer />}
    </>
  );
}