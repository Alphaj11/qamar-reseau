// Boutons "Ajouter à Apple Wallet / Google Wallet".
// Actifs dès que la plateforme correspondante est configurée (variables d'environnement).
import { walletStatus } from "@/lib/wallet/config";

const base = "flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-semibold";

export function WalletButtons({ cardId }: { cardId: string }) {
  const status = walletStatus();
  return (
    <div className="flex flex-col gap-2.5">
      {status.apple ? (
        <a href={`/api/wallet/apple/${cardId}`} className={`${base} bg-black text-white`}>
          Ajouter à Apple Wallet
        </a>
      ) : (
        <button disabled className={`${base} bg-black text-white opacity-50`}>
          Ajouter à Apple Wallet
        </button>
      )}
      {status.google ? (
        <a href={`/api/wallet/google/${cardId}`} className={`${base} border border-line bg-surface`}>
          Ajouter à Google Wallet
        </a>
      ) : (
        <button disabled className={`${base} border border-line bg-surface opacity-50`}>
          Ajouter à Google Wallet
        </button>
      )}
      {(!status.apple || !status.google) && (
        <p className="text-xs text-muted text-center">
          {!status.apple && !status.google
            ? "Ajout au Wallet disponible très bientôt."
            : `Ajout à ${status.apple ? "Google" : "Apple"} Wallet disponible très bientôt.`}
        </p>
      )}
    </div>
  );
}
