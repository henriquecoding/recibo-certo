import { ShieldCheck, Lock, Flag } from "@/components/ui/Icons";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import {
  RETENCAO,
  SS_TAXA,
  IVA_ISENCAO_LIMITE,
} from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

const PILARES = [
  {
    icon: <ShieldCheck size={16} />,
    metric: pct(RETENCAO.art151.value),
    accent: "text-brand",
    label: "Retenção IRS Art. 151.º",
    sub: "Verificado com fonte AT · 2026",
  },
  {
    icon: <Lock size={16} />,
    metric: "0 €",
    accent: "text-stone-800",
    label: "Custo para começar",
    sub: "Sem conta, sem dados enviados",
  },
  {
    icon: <Flag size={16} />,
    metric: pct(SS_TAXA.value),
    accent: "text-stone-800",
    label: "Taxa Segurança Social",
    sub: "Regime simplificado · Recibos verdes",
  },
  {
    icon: <ShieldCheck size={16} />,
    metric: `${(IVA_ISENCAO_LIMITE.value / 1000).toFixed(0)}k €`,
    accent: "text-stone-800",
    label: "Limite isenção IVA",
    sub: "Art. 53.º CIVA · art. 282.º CIVA",
  },
] as const;

export default function Stats() {
  return (
    <section className="px-6 py-10">
      <StaggerGroup className="mx-auto grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
        {PILARES.map((p) => (
          <StaggerItem key={p.label}>
            <div className="group h-full rounded-3xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
                {p.icon}
              </div>
              <div className={`font-display text-3xl font-semibold tabular-nums leading-none ${p.accent}`}>
                {p.metric}
              </div>
              <div className="mt-2 text-xs font-semibold text-stone-700">{p.label}</div>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{p.sub}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
