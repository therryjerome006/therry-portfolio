import { NextResponse } from "next/server";
import { editorialDatabase } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "La tâche automatique n'est pas configurée." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const db = editorialDatabase();
  if (!db) return NextResponse.json({ error: "Base indisponible." }, { status: 503 });
  const released = await db.query<{ item_id: string | null; outcome: string }>(`select item_id, outcome from public.editorial_release(null)`);
  return NextResponse.json({
    ok: true,
    results: released.rows.map((row) => ({ id: row.item_id, outcome: row.outcome })),
  });
}
