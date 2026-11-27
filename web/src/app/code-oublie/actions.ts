"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { completePinReset, requestPinReset } from "@/lib/pin-reset";

export type RequestState = { sent?: boolean; error?: string; email?: string };

export async function requestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().max(120).safeParse(email).success) return { error: "E-mail invalide", email };
  const ip = clientIp(await headers());
  const wait = (await hit(`reset-ip:${ip}`, 5, 60 * 60_000)) || (await hit(`reset-mail:${email}`, 3, 60 * 60_000));
  if (wait) return { error: tooMany(wait), email };
  // Envoi après la réponse : même délai de réponse que le compte existe ou non
  after(() => requestPinReset(email).catch((e) => console.error("[code oublié]", e)));
  return { sent: true };
}

export type ResetState = { done?: boolean; error?: string; expired?: boolean };

const pinSchema = z
  .object({ pin: z.string().regex(/^\d{6,8}$/, "Code de 6 à 8 chiffres"), pinConfirm: z.string() })
  .refine((d) => d.pin === d.pinConfirm, { message: "Les deux codes sont différents" });

export async function resetAction(token: string, _prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = pinSchema.safeParse({ pin: String(formData.get("pin") ?? ""), pinConfirm: String(formData.get("pinConfirm") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const wait = await hit(`reset-use:${clientIp(await headers())}`, 10, 60 * 60_000);
  if (wait) return { error: tooMany(wait) };
  return (await completePinReset(token, parsed.data.pin)) ? { done: true } : { expired: true };
}
