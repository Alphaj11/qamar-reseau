// Aperçu fidèle d'une carte "storeCard" telle qu'elle apparaît dans le Wallet.
import type { Program } from "@/lib/types";

export function WalletCard({
  program,
  value,
  holder,
  qrDataUrl,
  serial,
}: {
  program: Program;
  value: number;
  holder?: string;
  qrDataUrl?: string;
  serial?: string;
}) {
  const isStamps = program.type === "stamps";
  const goal = isStamps ? program.stampsRequired : program.pointsRequired;
  const remaining = Math.max(0, goal - value);

  return (
    <div
      className="w-full max-w-[360px] rounded-2xl overflow-hidden shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]"
      style={{ background: program.bgColor, color: program.fgColor }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {program.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div
              className="size-8 shrink-0 rounded-full grid place-items-center text-sm font-bold"
              style={{ background: program.accentColor, color: program.bgColor }}
              aria-hidden
            >
              {program.merchantName.charAt(0)}
            </div>
          )}
          <span className="font-semibold truncate">{program.merchantName}</span>
        </div>
        <div className="text-right leading-tight">
          <div className="text-[10px] uppercase opacity-70">{isStamps ? "Tampons" : "Points"}</div>
          <div className="text-lg font-semibold tabular-nums">
            {value}
            {isStamps && <span className="opacity-60">/{goal}</span>}
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/strip/${program.slug}?value=${value}`}
        alt={isStamps ? `${value} tampons sur ${goal}` : `${value} points sur ${goal}`}
        width={750}
        height={288}
        className="w-full h-auto block"
      />

      <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-4 text-sm">
        <div>
          <div className="text-[10px] uppercase opacity-70">Récompense</div>
          <div className="font-medium">{program.rewardLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase opacity-70">{holder ? "Membre" : "Encore"}</div>
          <div className="font-medium">
            {holder ?? `${remaining} ${isStamps ? "tampon" : "pt"}${remaining > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {qrDataUrl && (
        <div className="flex flex-col items-center pb-5">
          <div className="bg-white p-2.5 rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code à présenter en caisse" width={150} height={150} />
          </div>
          {serial && <div className="mt-1.5 text-[11px] opacity-70 font-mono">{serial}</div>}
        </div>
      )}
    </div>
  );
}
