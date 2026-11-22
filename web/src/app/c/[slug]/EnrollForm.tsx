"use client";

import { useActionState } from "react";
import type { EnrollState } from "./actions";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function EnrollForm({
  action,
  accent,
  askBirthday,
}: {
  action: (prev: EnrollState, formData: FormData) => Promise<EnrollState>;
  accent: string;
  /** Le commerce propose une offre d'anniversaire : on demande le jour et le mois (facultatif). */
  askBirthday: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const v = state.values;
  // La clé change à chaque réponse : les champs reprennent les valeurs renvoyées.
  const k = JSON.stringify(v ?? {});

  const input = "field-qamar bg-surface";

  return (
    <form key={k} action={formAction} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono text-muted">Prénom</span>
        <input name="firstName" defaultValue={v?.firstName} autoComplete="given-name" required className={input} />
        {e.firstName && <span className="text-sm text-danger">{e.firstName}</span>}
      </label>

      <p className="-mb-1 text-sm text-muted">Pour retrouver votre carte : un e-mail ou un téléphone suffit.</p>

      <label className="flex flex-col gap-1.5">
        <span className="label-mono text-muted">E-mail</span>
        <input name="email" defaultValue={v?.email} type="email" autoComplete="email" inputMode="email" className={input} />
        {e.email && <span className="text-sm text-danger">{e.email}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label-mono text-muted">
          Téléphone <span className="normal-case tracking-normal">(facultatif si e-mail)</span>
        </span>
        <input name="phone" defaultValue={v?.phone} type="tel" autoComplete="tel" inputMode="tel" className={input} />
        {e.phone && <span className="text-sm text-danger">{e.phone}</span>}
      </label>

      {askBirthday && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="label-mono mb-1.5 text-muted">
            Votre anniversaire <span className="normal-case tracking-normal">(facultatif)</span>
          </legend>
          <div className="flex gap-2">
            <select name="birthDay" defaultValue={v?.birthDay ?? ""} aria-label="Jour" className={`${input} w-24`}>
              <option value="">Jour</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
            <select name="birthMonth" defaultValue={v?.birthMonth ?? ""} aria-label="Mois" className={`${input} flex-1`}>
              <option value="">Mois</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {e.birthday ? (
            <span className="text-sm text-danger">{e.birthday}</span>
          ) : (
            <span className="text-xs text-muted">Pour recevoir un cadeau ce jour-là. L&apos;année n&apos;est pas demandée.</span>
          )}
        </fieldset>
      )}

      <label className="flex items-start gap-3 text-sm text-muted">
        <input name="marketingConsent" defaultChecked={v?.marketingConsent} type="checkbox" className="mt-0.5 size-4 shrink-0" />
        <span>J&apos;accepte de recevoir les offres et actualités de la boutique sur ma carte. Désactivable à tout moment.</span>
      </label>

      {e.form && <p className="text-sm text-danger">{e.form}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-qamar mt-1 text-white"
        style={{ background: accent }}
      >
        {pending ? "Création de votre carte…" : "Obtenir ma carte"}
      </button>
    </form>
  );
}
