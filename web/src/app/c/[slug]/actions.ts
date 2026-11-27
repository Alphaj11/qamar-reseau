"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { z } from "zod";
import { enroll, getProgramBySlug } from "@/lib/db";
import { birthdayOf, isValidBirthday } from "@/lib/birthday";
import { merchantIsActive, merchantIsDemo } from "@/lib/subscription";

const schema = z
  .object({
    firstName: z.string().trim().min(1, "Indiquez votre prénom").max(60),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .optional()
      .transform((v) => v || undefined)
      .pipe(z.email("E-mail invalide").optional()),
    phone: z
      .string()
      .optional()
      .transform((v) => (v ? v.replace(/[^\d+]/g, "") : undefined) || undefined)
      .refine((v) => !v || /^\+?\d{9,15}$/.test(v), "Numéro invalide"),
    marketingConsent: z.boolean(),
    birthDay: z.string().regex(/^\d{0,2}$/),
    birthMonth: z.string().regex(/^\d{0,2}$/),
  })
  .refine((d) => !d.birthDay === !d.birthMonth, { message: "Choisissez le jour et le mois", path: ["birthday"] })
  .refine((d) => !d.birthDay || isValidBirthday(`${d.birthMonth.padStart(2, "0")}-${d.birthDay.padStart(2, "0")}`), {
    message: "Cette date n'existe pas",
    path: ["birthday"],
  })
  .refine((d) => d.email || d.phone, {
    message: "Indiquez un e-mail ou un téléphone",
    path: ["email"],
  });

export type EnrollState = {
  errors?: Record<string, string>;
  /** Valeurs saisies, renvoyées pour ne pas vider le formulaire en cas d'erreur. */
  values?: { firstName: string; email: string; phone: string; marketingConsent: boolean; birthDay: string; birthMonth: string };
};

// Action publique (pas de compte client) : on valide strictement l'entrée.
export async function enrollAction(
  slug: string,
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const program = await getProgramBySlug(slug);
  if (!program) return { errors: { form: "Ce programme n'existe plus." } };
  if (!(await merchantIsActive(program.merchantId))) return { errors: { form: "Ce programme n'est pas disponible pour le moment." } };
  if (await merchantIsDemo(program.merchantId)) return { errors: { form: "Boutique de démonstration : l'inscription est désactivée." } };

  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    marketingConsent: formData.get("marketingConsent") === "on",
    // Seulement si le commerce propose l'offre d'anniversaire (pas de donnée inutile)
    birthDay: birthdayOf(program).enabled ? String(formData.get("birthDay") ?? "") : "",
    birthMonth: birthdayOf(program).enabled ? String(formData.get("birthMonth") ?? "") : "",
  };
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, values };
  }

  const wait = await hit(`enroll:${clientIp(await headers())}`, 15, 10 * 60_000);
  if (wait) return { errors: { form: tooMany(wait) }, values };

  const { birthDay, birthMonth, ...data } = parsed.data;
  const birthday = birthDay ? `${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}` : undefined;
  const card = await enroll({ programId: program.id, ...data, birthday });
  redirect(`/carte/${card.id}`);
}
