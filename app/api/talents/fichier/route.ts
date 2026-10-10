import { NextResponse } from "next/server";
import { downloadTalentFile } from "@/lib/talents/files";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function mimeOf(path: string, fallback: string) {
  if (path.endsWith(".pdf")) return "application/pdf";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".jpg")) return "image/jpeg";
  return fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const type = url.searchParams.get("type");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Introuvable", { status: 404 });
  const supabase = await createClient();
  if (!supabase) return new NextResponse("Indisponible", { status: 503 });
  const { data } = type === "livrable"
    ? await supabase.from("project_deliverables").select("storage_path").eq("id", id).maybeSingle()
    : type === "service"
      ? await supabase.from("service_media").select("storage_path, mime_type").eq("id", id).maybeSingle()
      : await supabase.from("portfolio_media").select("storage_path, mime_type").eq("id", id).maybeSingle();
  const path = data?.storage_path ? String(data.storage_path) : "";
  if (!path) return new NextResponse("Introuvable", { status: 404 });
  const body = await downloadTalentFile(path);
  if (!body) return new NextResponse("Introuvable", { status: 404 });
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": mimeOf(path, "application/octet-stream"),
      "cache-control": type === "livrable" ? "private, no-store" : "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
