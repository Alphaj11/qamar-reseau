"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestAction, resetAction, type RequestState, type ResetState } from "./actions";

const input = "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base outline-none focus:border-foreground/40";

export function RequestForm() {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestAction, {});
  if (state.sent) {
    return (
      <p className="rounded-2xl bg-accent-soft px-4 py-3">
        Si un compte existe avec cette adresse, vous allez recevoir un e-mail avec un lien. Il est valable 30 minutes et ne sert
        qu&apos;une fois. Pensez à regarder dans les indésirables.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono text-muted">E-mail du compte</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={state.email} className={input} />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-qamar">
        Recevoir un lien
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetAction.bind(null, token), {});
  if (state.done) {
    return (
      <p className="rounded-2xl bg-accent-soft px-4 py-3">
        C&apos;est fait. Connectez-vous dans l&apos;application avec votre nouveau code. Les autres appareils connectés ont été
        déconnectés.
      </p>
    );
  }
  if (state.expired) return <Expired />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono text-muted">Nouveau code (6 à 8 chiffres)</span>
        <input name="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} required className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono text-muted">Confirmez le code</span>
        <input name="pinConfirm" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} required className={input} />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-qamar">
        Enregistrer le nouveau code
      </button>
    </form>
  );
}

export function Expired() {
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-2xl border border-line px-4 py-3">Ce lien a expiré ou a déjà servi.</p>
      <Link href="/code-oublie" className="underline decoration-accent underline-offset-2">
        Demander un nouveau lien
      </Link>
    </div>
  );
}
