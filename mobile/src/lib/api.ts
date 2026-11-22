// Appels à l'API caisse. L'adresse du serveur vient de EXPO_PUBLIC_API_URL (.env).
import type {
  Account,
  Campaign,
  CardView,
  CustomerRow,
  HistoryEntry,
  Home,
  PendingOp,
  ProgramSettings,
  Session,
  Snapshot,
  Stats,
  SyncResult,
  TeamMember,
  BirthdayOverview,
  BirthdaySettings,
  ReviewOverview,
  ReviewSettings,
  WinbackOverview,
  WinbackSettings,
} from "./types";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Erreur réseau (pas de connexion, serveur injoignable) : on reste en mode hors ligne. */
export class OfflineError extends Error {}
/** Session expirée ou invalide : il faut se reconnecter. */
export class AuthError extends Error {}
/** Abonnement du commerce inactif (HTTP 402) : l'appli affiche l'écran Abonnement. */
export class SubscriptionError extends Error {}
/** Refus métier ou droits insuffisants : message à montrer tel quel. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string; timeoutMs?: number } = {}): Promise<T> {
  const { token, timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new OfflineError("Pas de connexion");
  } finally {
    clearTimeout(timer);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401 && token) throw new AuthError(body.error ?? "Session expirée");
  if (res.status === 402) throw new SubscriptionError(body.error ?? "Abonnement inactif");
  if (!res.ok) throw new ApiError(body.error ?? `Erreur ${res.status}`, res.status);
  return body;
}

export const api = {
  login: (email: string, pin: string) =>
    call<Session>("/api/staff/login", { method: "POST", body: JSON.stringify({ email, pin }) }),
  /** Session sur la boutique de démonstration, sans compte. */
  demo: () => call<Session>("/api/staff/demo", { method: "POST" }),
  snapshot: (token: string) => call<Snapshot>("/api/staff/snapshot", { token }),
  card: (token: string, serial: string) =>
    call<{ card: CardView }>(`/api/staff/cards/${encodeURIComponent(serial)}`, { token }),
  sync: (token: string, ops: PendingOp[]) =>
    call<{ results: SyncResult[] }>("/api/staff/sync", {
      method: "POST",
      token,
      body: JSON.stringify({ ops }),
      timeoutMs: 15000,
    }),
  customers: (token: string, q = "") =>
    call<{ customers: CustomerRow[] }>(`/api/staff/customers?q=${encodeURIComponent(q)}`, { token }),
  customer: (token: string, serial: string) =>
    call<{ customer: CustomerRow; history: HistoryEntry[] }>(`/api/staff/customers/${encodeURIComponent(serial)}`, { token }),
  stats: (token: string, days: number) => call<Stats>(`/api/staff/stats?days=${days}`, { token }),
  settings: (token: string) => call<{ settings: ProgramSettings }>("/api/staff/program", { token }),
  /** Envoie le logo (image en base64) : le serveur le recadre en 256 × 256. */
  uploadLogo: (token: string, image: string) =>
    call<{ settings: ProgramSettings }>("/api/staff/program/logo", { method: "POST", token, body: JSON.stringify({ image }), timeoutMs: 30000 }),
  deleteLogo: (token: string) => call<{ settings: ProgramSettings }>("/api/staff/program/logo", { method: "DELETE", token }),
  /** Envoie la photo de bannière (base64) : le serveur la recadre au format Wallet. */
  uploadBanner: (token: string, image: string) =>
    call<{ settings: ProgramSettings }>("/api/staff/program/banner", { method: "POST", token, body: JSON.stringify({ image }), timeoutMs: 30000 }),
  deleteBanner: (token: string) => call<{ settings: ProgramSettings }>("/api/staff/program/banner", { method: "DELETE", token }),
  updateSettings: (token: string, patch: Partial<ProgramSettings>) =>
    call<{ settings: ProgramSettings }>("/api/staff/program", { method: "PATCH", token, body: JSON.stringify(patch) }),
  campaigns: (token: string) => call<{ campaigns: Campaign[]; perDay: number; remainingToday: number }>("/api/staff/campaigns", { token }),
  sendCampaign: (token: string, message: string) =>
    call<{ campaign: Campaign }>("/api/staff/campaigns", { method: "POST", token, body: JSON.stringify({ message }) }),
  winback: (token: string) => call<WinbackOverview>("/api/staff/winback", { token }),
  updateWinback: (token: string, patch: Partial<WinbackSettings>) =>
    call<WinbackOverview>("/api/staff/winback", { method: "PATCH", token, body: JSON.stringify(patch) }),
  review: (token: string) => call<ReviewOverview>("/api/staff/review", { token }),
  updateReview: (token: string, patch: Partial<ReviewSettings>) =>
    call<ReviewOverview>("/api/staff/review", { method: "PATCH", token, body: JSON.stringify(patch) }),
  birthday: (token: string) => call<BirthdayOverview>("/api/staff/birthday", { token }),
  updateBirthday: (token: string, patch: Partial<BirthdaySettings>) =>
    call<BirthdayOverview>("/api/staff/birthday", { method: "PATCH", token, body: JSON.stringify(patch) }),
  home: (token: string) => call<Home>("/api/staff/home", { token }),
  account: (token: string) => call<Account>("/api/staff/account", { token }),
  deleteCustomer: (token: string, serial: string) =>
    call<{ ok: true }>(`/api/staff/customers/${encodeURIComponent(serial)}`, { method: "DELETE", token }),
  team: (token: string) => call<{ team: TeamMember[] }>("/api/staff/team", { token }),
  addTeamMember: (token: string, member: { name: string; email: string; pin: string }) =>
    call<{ member: TeamMember }>("/api/staff/team", { method: "POST", token, body: JSON.stringify(member) }),
  removeTeamMember: (token: string, id: string) =>
    call<{ ok: true }>(`/api/staff/team/${encodeURIComponent(id)}`, { method: "DELETE", token }),
  /** Ferme la session côté serveur. */
  logout: (token: string) => call<{ ok: true }>("/api/staff/logout", { method: "POST", token, timeoutMs: 4000 }),
  /** Supprime le compte (vendeur : son accès ; responsable : tout le commerce et l'abonnement). */
  deleteAccount: (token: string) =>
    call<{ ok: true; scope: "staff" | "merchant" }>("/api/staff/account", { method: "DELETE", token, body: JSON.stringify({ confirm: "SUPPRIMER" }) }),
  changePin: (token: string, current: string, next: string) =>
    call<{ ok: true }>("/api/staff/me/pin", { method: "POST", token, body: JSON.stringify({ current, next }) }),
  /** Lien de paiement / facturation : utilisé seulement sur la version web (pas d'achat dans les applis). */
  billing: (token: string) => call<{ url: string }>("/api/staff/billing", { method: "POST", token }),
  /** Fichier d'export (Excel, CSV, PDF) : version web de l'appli, téléchargé directement. */
  async exportFile(token: string, q: ExportQuery) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/staff/export?${exportParams(q)}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new OfflineError("Pas de connexion");
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new ApiError(body.error ?? `Erreur ${res.status}`, res.status);
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `export.${q.format}`;
    return { blob: await res.blob(), name };
  },
  /** Lien de téléchargement à usage unique (2 min) : le téléphone l'ouvre dans son navigateur. */
  async exportLink(token: string, q: ExportQuery) {
    const { path } = await call<{ path: string }>(`/api/staff/export/link?${exportParams(q)}`, { token });
    return `${API_URL}${path}`;
  },
};

export interface ExportQuery {
  format: "xlsx" | "csv" | "pdf";
  data?: "clients" | "passages";
  days?: number;
}

const exportParams = (q: ExportQuery) =>
  new URLSearchParams({ format: q.format, data: q.data ?? "clients", days: String(q.days ?? 30) }).toString();
