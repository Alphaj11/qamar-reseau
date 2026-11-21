// Pages vues par les clients du commerce : univers Qamar en version claire.
import { PoweredBy } from "@/components/QamarLogo";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="clair flex min-h-dvh flex-1 flex-col print:min-h-0">
      {children}
      <div className="print:hidden">
        <PoweredBy />
      </div>
    </div>
  );
}
