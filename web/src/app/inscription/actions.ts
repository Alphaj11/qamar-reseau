"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { z } from "zod";
import { availablePlans, createAccount, createCheckout, SignupError, stripeConfig } from "@/lib/subscription";

const schema = z
  .object({
    businessName: z.string().trim().min(2, "Indiquez le nom du commerce").max(40),
    ownerName: z.string().trim().min(1, "Indiquez votre nom").max(40),
    email: z.string().trim().toLowerCase().pipe(z.email("E-mail invalide").max(120)),
    pin: z.string().regex(/^\d{6,8}$/, "Code de 6 à 8 chiffres"),
    pinConfirm: z.string(),
    terms: z.literal(true, { error: "Acceptez les conditions pour continuer" }),
    plan: z.enum(["monthly", "yearly"], { error: "Choisissez une formule" }),
  })
  .refine((d) => availablePlans().includes(d.plan), { message: "Cette formule n'est pas disponible", path: ["plan"] })
  .refine((d) => d.pin === d.pinConfirm, { message: "Les deux codes sont différents", path: ["pinConfirm"] });

export type SignupState = {
  errors?: Record<string, string>;
  values?: { businessName: string; ownerName: string; email: string; plan: string };
};

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const raw = {
    businessName: String(formData.get("businessName") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    email: String(formData.get("email") ?? ""),
    pin: String(formData.get("pin") ?? ""),
    pinConfirm: String(formData.get("pinConfirm") ?? ""),
    terms: formData.get("terms") === "on",
    plan: String(formData.get("plan") ?? "monthly"),
  };
  const values = { businessName: raw.businessName, ownerName: raw.ownerName, email: raw.email, plan: raw.plan };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { errors, values };
  }

  const wait = await hit(`signup:${clientIp(await headers())}`, 5, 60 * 60_000);
  if (wait) return { errors: { form: tooMany(wait) }, values };

  let merchantId: string;
  let checkoutUrl: string | undefined;
  try {
    const merchant = await createAccount(parsed.data);
    merchantId = merchant.id;
    if (stripeConfig()) checkoutUrl = await createCheckout(merchant, parsed.data.email);
  } catch (e) {
    if (e instanceof SignupError) return { errors: { email: e.message }, values };
    console.error("[inscription]", e);
    return { errors: { form: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." }, values };
  }
  redirect(checkoutUrl ?? `/inscription/merci?m=${merchantId}`);
}
