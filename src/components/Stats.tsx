import { ShieldCheck, Lock, Flag } from "@/components/ui/Icons";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";

interface Pilar {
  icon: React.ReactNode;
  title: string;
  sub: string;
}

const PILARES: Pilar[] = [
  {
    icon: <ShieldCheck size={18} />,
    title: "Taxas de 2026 verificadas",
    sub: "Cada parâmetro com base legal e fonte oficial — revisto e datado.",
  },
  {
    icon: <Lock size={18} />,
    title: "Os teus dados ficam contigo",
    sub: "Tudo corre no teu dispositivo. Sem conta, sem partilha, sem rasto.",
  },
  {
    icon: <Flag size={18} />,
    title: "Feito para a lei portuguesa",
    sub: "IRS, Segurança Social e IVA, com as regras de Portugal — num só sítio.",
  },
];

export default function Stats() {
  return (
    <section className="px-6 py-12">
      <StaggerGroup className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-4xl border border-stone-100 bg-stone-100 shadow-card sm:grid-cols-3">
        {PILARES.map((p) => (
          <StaggerItem key={p.title} className="bg-white p-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand">{p.icon}</div>
            <div className="mt-4 text-sm font-semibold text-stone-800">{p.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{p.sub}</p>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
