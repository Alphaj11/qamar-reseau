// Réponses JSON de l'API caisse. L'appli native n'a pas besoin de CORS.
// En développement, la version web de l'appli (localhost:8081) l'utilise : on l'ouvre à tous.
// En production, seules les origines listées dans CORS_ORIGINS (séparées par des virgules) y ont droit.
// Les sessions passent par l'en-tête Authorization (pas de cookie) : un autre site ne peut pas s'en servir.
import "server-only";
import { ForbiddenError, RuleError } from "./merchant";
import { authenticate } from "./staff";
import { merchantIsActive, merchantIsDemo } from "./subscription";
import type { Staff } from "./types";

const allowed = (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const CORS: Record<string, string> =
  process.env.NODE_ENV !== "production"
    ? { "Access-Control-Allow-Origin": "*" }
    : allowed.length === 1
      ? { "Access-Control-Allow-Origin": allowed[0] }
      : {};
Object.assign(CORS, {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

export const DEMO_MESSAGE = "Mode démo : rien n'est enregistré. Avec votre compte, ce bouton fonctionne pour de vrai.";

export const unauthorized = () => json({ error: "Session expirée, reconnectez-vous" }, 401);

/**
 * Authentifie le vendeur, vérifie l'abonnement du commerce, puis exécute le traitement
 * en traduisant les erreurs métier en HTTP. `allowInactive` : routes du compte
 * (consultables même sans abonnement, pour savoir quoi faire).
 */
export async function withStaff(
  request: Request,
  handler: (staff: Staff) => Promise<Response>,
  opts: { allowInactive?: boolean } = {},
) {
  const staff = await authenticate(request);
  if (!staff) return unauthorized();
  if (!opts.allowInactive && !(await merchantIsActive(staff.merchantId))) {
    return json({ error: "L'abonnement de ce commerce n'est pas actif", code: "subscription_inactive" }, 402);
  }
  // Boutique de démo : on peut tout regarder, rien modifier
  if (request.method !== "GET" && (await merchantIsDemo(staff.merchantId))) {
    return json({ error: DEMO_MESSAGE, code: "demo" }, 403);
  }
  try {
    return await handler(staff);
  } catch (e) {
    if (e instanceof ForbiddenError) return json({ error: e.message }, 403);
    if (e instanceof RuleError) return json({ error: e.message }, 422);
    console.error(e);
    return json({ error: "Erreur serveur" }, 500);
  }
}

/** Lit un corps JSON ; renvoie null si absent ou invalide. */
export const readJson = (request: Request) => request.json().catch(() => null) as Promise<unknown>;
