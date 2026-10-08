import { NextResponse } from "next/server";
import { adminAccess } from "@/lib/auth/session";
import { deleteObject, storageRef } from "@/lib/media/storage";

export async function POST(request: Request) {
  if (!(await adminAccess())) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const ref = storageRef(String(body?.url ?? ""));
  if (!ref) return NextResponse.json({ error: "Fichier inconnu." }, { status: 400 });
  await deleteObject(ref.bucket, ref.path);
  return NextResponse.json({ ok: true });
}
