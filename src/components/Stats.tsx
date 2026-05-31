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
    title: "Taxas de 2026 com fonte legal",
    sub: "IRS 23 %, SS 21,4 %, IVA art. 53.º — cada valor com base legal citada e data de verificação.",
  },
  {
    icon: <Lock size={18} />,
    title: "Os teus dados ficam contigo",
    sub: "Tudo corre no teu browser. Sem conta obrigatória, sem telemetria, sem acesso ao servidor.",
  },
  {
    icon: <Flag size={18} />,
    title: "Feito para Portugal, em português",
    sub: "Recibos verdes, regime simplificado, IRS Jovem e isenções — só as regras que te afetam.",
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
