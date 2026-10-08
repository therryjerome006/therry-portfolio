import { createClient } from "@/lib/supabase/server";

export const adminAccountEmail = "therryjerome006@gmail.com";

export function isAdminAccount(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === adminAccountEmail;
}

export async function adminAccountSignedIn() {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  return isAdminAccount(data.user?.email);
}
