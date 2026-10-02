import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browser: SupabaseClient | null | undefined;

export function browserClient() {
  if (browser !== undefined) return browser;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  browser = url && key ? createBrowserClient(url, key) : null;
  return browser;
}

export async function signInWithProvider(provider: "google", nextPath: string) {
  const supabase = browserClient();
  if (!supabase) return { error: "La connexion n'est pas disponible." };
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  return { error: error?.message };
}
