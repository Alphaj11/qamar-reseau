// GET /api/cron/daily → tâches du matin : anniversaires puis relance des clients absents.
// À appeler une fois par jour vers 10 h (heure de Paris) par un planificateur (Vercel Cron, cron du serveur…),
// avec l'en-tête « Authorization: Bearer <CRON_SECRET> ».
import crypto from "crypto";
import { runBirthdays } from "@/lib/birthday";
import { runWinback } from "@/lib/winback";
import { notifyCardsChanged } from "@/lib/wallet/notify";

function authorized(request: Request, secret: string) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET non configuré", { status: 503 });
  if (!authorized(request, secret)) return new Response("Non autorisé", { status: 401 });

  // Anniversaires d'abord : un client fêté aujourd'hui n'est pas « absent » à relancer en plus
  const birthdays = await runBirthdays();
  const celebrated = new Set(birthdays.flatMap((b) => b.serials));
  const winback = await runWinback(Date.now(), celebrated);

  // Les envois se font ici (et non en arrière-plan) : la tâche planifiée attend la fin
  for (const b of [...birthdays, ...winback]) {
    if (b.serials.length) await notifyCardsChanged(b.serials, { message: { header: b.merchantName, body: b.message } });
  }
  return Response.json({
    birthdays: birthdays.reduce((s, b) => s + b.serials.length, 0),
    winback: winback.reduce((s, b) => s + b.serials.length, 0),
  });
}
