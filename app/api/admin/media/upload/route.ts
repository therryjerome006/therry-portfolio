import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAccess } from "@/lib/auth/session";
import type { UploadKind } from "@/lib/media/constants";
import { uploadObject } from "@/lib/media/storage";
import { validateUpload } from "@/lib/media/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await adminAccess())) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "") as UploadKind;
  if (kind !== "image" && kind !== "video" && kind !== "thumbnail") {
    return NextResponse.json({ error: "Type d'envoi inconnu." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choisissez un fichier." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = validateUpload(bytes, kind);
  if (typeof detected === "string") {
    return NextResponse.json({ error: detected }, { status: 400 });
  }

  try {
    const stored = await uploadObject(kind, `${randomUUID()}.${detected.extension}`, Buffer.from(bytes), detected.mime);
    return NextResponse.json({
      url: stored.url,
      bucket: stored.bucket,
      storagePath: stored.path,
      mimeType: detected.mime,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch {
    return NextResponse.json({ error: "L'envoi vers Supabase a échoué." }, { status: 502 });
  }
}
