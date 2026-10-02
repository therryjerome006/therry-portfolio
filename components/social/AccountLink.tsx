"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export function AccountLink({ className = "btn btn-line hidden h-10 min-h-0 px-3 sm:inline-flex" }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const name = data.user?.user_metadata?.display_name;
      setLabel(data.user ? String(name || "Compte") : "");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const name = session?.user.user_metadata?.display_name;
      setLabel(session?.user ? String(name || "Compte") : "");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (label === null) return null;
  if (!label) {
    return (
      <Link href="/connexion" className={className}>
        Connexion
      </Link>
    );
  }
  return (
    <Link href="/profil" className={className}>
      {label}
    </Link>
  );
}
