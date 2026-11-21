// Formats d'affichage en français.

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const numberFmt = new Intl.NumberFormat("fr-FR");

// Le français utilise une espace fine insécable (U+202F) que la police Geist ne dessine pas :
// les chiffres se collaient (« 1222 » au lieu de « 1 222 »). On la remplace par une espace insécable classique.
const spaces = (s: string) => s.replace(/[\u202f\u2009]/g, "\u00a0");

export const formatNumber = (n: number) => spaces(numberFmt.format(n));
export const formatDate = (iso: string) => spaces(dateFmt.format(new Date(iso)));
export const formatDateTime = (iso: string) => spaces(dateTimeFmt.format(new Date(iso)));

/** "aujourd'hui", "hier", "il y a 3 j", sinon la date. */
export function formatRelative(iso: string | undefined, now = new Date()) {
  if (!iso) return "jamais";
  const d = new Date(iso);
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return formatDate(iso);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n > 1 ? many : one}`;

export function describeOp(kind: "stamp" | "points" | "reward", amount: number) {
  if (kind === "reward") return "Récompense utilisée";
  if (kind === "stamp") return `+${plural(amount, "tampon")}`;
  return `+${plural(amount, "point")}`;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** "03-12" → "12 mars" */
export function formatBirthday(mmdd: string) {
  const [m, d] = mmdd.split("-").map(Number);
  return `${d === 1 ? "1er" : d} ${MONTHS[m - 1] ?? ""}`.trim();
}
