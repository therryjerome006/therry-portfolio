"use server";

import { createClient } from "@supabase/supabase-js";
import { isAgeBand } from "@/lib/network/constants";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function registerAccount(formData: FormData): Promise<{ error?: string }> {
  const admin = adminClient();
  if (!admin) return { error: "La connexion n'est pas disponible." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40);
  const ageBand = String(formData.get("ageBand") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indiquez une adresse e-mail valide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (!displayName) return { error: "Indiquez un nom." };
  if (!isAgeBand(ageBand)) return { error: "Choisissez une tranche d'âge." };

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, age_band: ageBand },
  });
  if (!error) return {};
  if (error.code === "email_exists" || error.message.toLowerCase().includes("already")) {
    return { error: "Un compte existe déjà avec cette adresse." };
  }
  return { error: "Le compte n'a pas pu être créé." };
}
