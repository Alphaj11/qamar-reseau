// Service web PassKit (appelé par les iPhone, pas par nous).
// https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
//
//   POST   /v1/devices/{device}/registrations/{passTypeId}/{serial}   enregistrer un iPhone
//   GET    /v1/devices/{device}/registrations/{passTypeId}            cartes modifiées
//   DELETE /v1/devices/{device}/registrations/{passTypeId}/{serial}   désenregistrer
//   GET    /v1/passes/{passTypeId}/{serial}                           dernière version de la carte
//   POST   /v1/log                                                    journaux d'erreurs de l'iPhone
import { buildApplePass, PKPASS_MIME } from "@/lib/wallet/apple";
import { appleConfig } from "@/lib/wallet/config";
import {
  cardBySerial,
  registerDevice,
  serialsForDevice,
  tokenMatches,
  unregisterDevice,
} from "@/lib/wallet/registry";

type Ctx = { params: Promise<{ path: string[] }> };

const empty = (status: number) => new Response(null, { status });

/** Vérifie "Authorization: ApplePass <token>" pour la carte demandée. */
async function authorizedCard(request: Request, serial: string) {
  const token = request.headers.get("authorization")?.replace(/^ApplePass\s+/i, "");
  const bundle = await cardBySerial(serial);
  if (!bundle || !tokenMatches(bundle.card.authToken, token)) return undefined;
  return bundle;
}

function match(path: string[], pattern: string[]) {
  if (path.length !== pattern.length) return undefined;
  const out: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i].startsWith(":")) out[pattern[i].slice(1)] = decodeURIComponent(path[i]);
    else if (pattern[i] !== path[i]) return undefined;
  }
  return out;
}

export async function POST(request: Request, { params }: Ctx) {
  const { path } = await params;
  const cfg = appleConfig();
  if (!cfg) return empty(503);

  if (match(path, ["v1", "log"])) {
    const body = await request.json().catch(() => null);
    console.warn("[passkit] journaux iPhone :", JSON.stringify(body)?.slice(0, 2000));
    return empty(200);
  }

  const m = match(path, ["v1", "devices", ":device", "registrations", ":passType", ":serial"]);
  if (!m) return empty(404);
  if (m.passType !== cfg.passTypeId) return empty(404);
  if (!(await authorizedCard(request, m.serial))) return empty(401);
  const body = (await request.json().catch(() => null)) as { pushToken?: unknown } | null;
  if (typeof body?.pushToken !== "string" || !body.pushToken) return empty(400);
  const created = await registerDevice(m.device, m.serial, body.pushToken);
  return empty(created ? 201 : 200);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { path } = await params;
  const cfg = appleConfig();
  if (!cfg) return empty(503);
  const m = match(path, ["v1", "devices", ":device", "registrations", ":passType", ":serial"]);
  if (!m || m.passType !== cfg.passTypeId) return empty(404);
  if (!(await authorizedCard(request, m.serial))) return empty(401);
  await unregisterDevice(m.device, m.serial);
  return empty(200);
}

export async function GET(request: Request, { params }: Ctx) {
  const { path } = await params;
  const cfg = appleConfig();
  if (!cfg) return empty(503);

  const list = match(path, ["v1", "devices", ":device", "registrations", ":passType"]);
  if (list) {
    if (list.passType !== cfg.passTypeId) return empty(404);
    const since = new URL(request.url).searchParams.get("passesUpdatedSince") ?? undefined;
    const { serials, lastUpdated, registered } = await serialsForDevice(list.device, since);
    if (!registered) return empty(404);
    if (!serials.length) return empty(204);
    return Response.json({ serialNumbers: serials, lastUpdated });
  }

  const pass = match(path, ["v1", "passes", ":passType", ":serial"]);
  if (pass) {
    if (pass.passType !== cfg.passTypeId) return empty(404);
    const bundle = await authorizedCard(request, pass.serial);
    if (!bundle) return empty(401);
    const lastModified = new Date(bundle.card.updatedAt);
    const since = request.headers.get("if-modified-since");
    // Précision HTTP à la seconde
    if (since && Math.floor(lastModified.getTime() / 1000) <= Math.floor(Date.parse(since) / 1000)) return empty(304);
    const file = await buildApplePass(bundle.card, bundle.program, bundle.customer);
    if (!file) return empty(503);
    return new Response(new Uint8Array(file), {
      headers: { "Content-Type": PKPASS_MIME, "Last-Modified": lastModified.toUTCString(), "Cache-Control": "no-store" },
    });
  }

  return empty(404);
}
