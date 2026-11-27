// Envoi d'e-mails (pour l'instant : le lien « Code oublié »), par l'API HTTP de Resend.
// Variables : RESEND_API_KEY (clé secrète, côté serveur seulement) et MAIL_FROM
// (ex. « Qamar <no-reply@qamar-conception.fr> », domaine vérifié chez Resend : SPF + DKIM chez OVH).
// Sans configuration : en développement (ou avec MAIL_DRY_RUN=1) le message est écrit dans le terminal,
// en production il n'est pas envoyé.
import "server-only";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

/** Renvoie true si le message est parti (ou affiché en développement). */
export async function sendMail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    // MAIL_DRY_RUN=1 : tests automatiques sur un build de production, rien n'est envoyé
    if (process.env.NODE_ENV !== "production" || process.env.MAIL_DRY_RUN === "1") {
      console.info(`[e-mail de développement] À : ${mail.to}\nObjet : ${mail.subject}\n${mail.text}`);
      return true;
    }
    console.error("[e-mail] RESEND_API_KEY ou MAIL_FROM manquant : message non envoyé");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[e-mail] Resend a refusé le message (${res.status})`);
    return res.ok;
  } catch (e) {
    console.error("[e-mail] envoi impossible", e);
    return false;
  }
}

/** Échappe un texte pour l'insérer dans le HTML d'un e-mail. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
