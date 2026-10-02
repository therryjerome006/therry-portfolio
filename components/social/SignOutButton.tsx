"use client";

import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-line h-10 min-h-0 px-3"
      onClick={async () => {
        await browserClient()?.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
