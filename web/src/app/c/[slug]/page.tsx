// Page d'inscription ouverte en scannant le QR code posé au comptoir.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProgramBySlug } from "@/lib/db";
import { birthdayOf } from "@/lib/birthday";
import { merchantIsActive } from "@/lib/subscription";
import { WalletCard } from "@/components/WalletCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { EnrollForm } from "./EnrollForm";
import { enrollAction } from "./actions";

export default function EnrollPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Enroll params={params} />
    </Suspense>
  );
}

async function Enroll({ params }: { params: PageProps<"/c/[slug]">["params"] }) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) notFound();
  if (!(await merchantIsActive(program.merchantId))) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 flex flex-col gap-2">
        <p className="label-mono text-muted">{program.merchantName}</p>
        <h1 className="text-2xl font-semibold">Ce programme de fidélité n&apos;est pas disponible pour le moment.</h1>
      </main>
    );
  }

  const bonus = program.welcomeBonus;
  const unit = program.type === "stamps" ? "tampon" : "point";

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <p className="label-mono text-muted">{program.merchantName}</p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight">
          Votre carte de fidélité, directement dans votre téléphone
        </h1>
        <p className="text-muted">
          Pas d&apos;application à installer. {program.rewardLabel} au bout de{" "}
          {program.type === "stamps"
            ? `${program.stampsRequired} tampons`
            : `${program.pointsRequired} points`}
          {bonus > 0 && `, et ${bonus} ${unit}${bonus > 1 ? "s" : ""} offert${bonus > 1 ? "s" : ""} dès maintenant`}
          .
        </p>
      </header>

      <div className="flex justify-center">
        <WalletCard program={program} value={program.type === "stamps" ? Math.min(bonus, program.stampsRequired) : bonus} />
      </div>

      <EnrollForm action={enrollAction.bind(null, slug)} accent={program.accentColor} askBirthday={birthdayOf(program).enabled} />

      {program.terms && <p className="text-xs text-muted">{program.terms}</p>}
    </main>
  );
}
