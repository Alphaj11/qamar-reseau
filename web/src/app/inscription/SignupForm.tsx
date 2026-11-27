"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base outline-none focus:border-foreground/40";

function Field({
  name,
  label,
  error,
  ...rest
}: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono text-muted">{label}</span>
      <input name={name} className={input} {...rest} />
      {error && <span className="text-sm text-danger">{error}</span>}
    </label>
  );
}

export interface PlanOption {
  id: "monthly" | "yearly";
  name: string;
  label: string;
  ttc: string;
  detail: string;
}

export function SignupForm({ cta, plans }: { cta: string; plans: PlanOption[] }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});
  const e = state.errors ?? {};
  const v = state.values;

  return (
    <form key={JSON.stringify(v ?? {})} action={action} className="flex flex-col gap-4" noValidate>
      {plans.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono mb-2 text-muted">Formule</legend>
          {plans.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3.5 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input type="radio" name="plan" value={p.id} defaultChecked={(v?.plan ?? "monthly") === p.id} className="mt-1 size-4 shrink-0" />
              <span className="flex flex-1 flex-col">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-semibold">{p.label}</span>
                </span>
                <span className="text-sm text-muted">
                  {p.detail} · {p.ttc}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="plan" value="monthly" />
      )}

      <Field name="businessName" label="Nom du commerce" defaultValue={v?.businessName} autoComplete="organization" error={e.businessName} />
      <Field name="ownerName" label="Votre nom" defaultValue={v?.ownerName} autoComplete="name" error={e.ownerName} />
      <Field name="email" label="E-mail" type="email" inputMode="email" defaultValue={v?.email} autoComplete="email" error={e.email} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="pin" label="Code de connexion" type="password" inputMode="numeric" autoComplete="new-password" error={e.pin} />
        <Field name="pinConfirm" label="Confirmer le code" type="password" inputMode="numeric" autoComplete="new-password" error={e.pinConfirm} />
      </div>
      <p className="-mt-2 text-xs text-muted">6 à 8 chiffres. Vous l&apos;utiliserez pour vous connecter à l&apos;application.</p>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input name="terms" type="checkbox" className="mt-0.5 size-4 shrink-0" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgv" className="text-foreground underline decoration-accent underline-offset-2" target="_blank">
            conditions générales de vente
          </Link>{" "}
          et j&apos;ai lu la{" "}
          <Link href="/confidentialite" className="text-foreground underline decoration-accent underline-offset-2" target="_blank">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      {e.terms && <span className="-mt-2 text-sm text-danger">{e.terms}</span>}
      {e.plan && <p className="text-sm text-danger">{e.plan}</p>}
      {e.form && <p className="text-sm text-danger">{e.form}</p>}

      <button type="submit" disabled={pending} className="btn-qamar mt-1">
        {pending ? "Création du compte…" : cta}
      </button>
    </form>
  );
}
