// GET /api/health → pour la sonde de disponibilité (UptimeRobot, Better Stack…).
import { connection } from "next/server";
import { load } from "@/lib/db";

export async function GET() {
  await connection();
  try {
    await load();
    return Response.json({ ok: true, time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[health]", e);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
