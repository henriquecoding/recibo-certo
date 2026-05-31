import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import {
  Wallet,
  ChartProjection,
  BellAlert,
  History,
  Export,
  Calculator,
  Warning,
} from "@/components/ui/Icons";
import type { ReactNode } from "react";

/* ── Visuais de apoio: pequenas demonstrações, não decoração ── */

function VisualSaldo() {
  const seg = [
    { w: "62%", c: "#1D9E75", round: "rounded-l-full" },
    { w: "23%", c: "#9FE1CB", round: "" },
    { w: "15%", c: "#D3D1C7", round: "rounded-r-full" },
  ];
  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-stone-400">Recibo de 2.000 €</span>
        <span className="font-display text-2xl font-semibold text-brand tabular-nums">1.241 €</span>
      </div>
      <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {seg.map((s) => (
          <div key={s.c} className={s.round} style={{ background: s.c, width: s.w }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#1D9E75" }} /> Teu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#9FE1CB" }} /> Retenção
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#D3D1C7" }} /> Seg. Social
        </span>
      </div>
    </div>
  );
}

function VisualReserva() {
  const linhas = [
    { l: "Reservar para Seg. Social", v: "299 €" },
    { l: "Reservar para IVA", v: "0 €" },
  ];
  return (
    <div className="space-y-2">
      {linhas.map((r) => (
        <div
          key={r.l}
          className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-card"
        >
          <span className="text-xs text-stone-500">{r.l}</span>
          <span className="text-sm font-semibold text-stone-800 tabular-nums">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function VisualPrazos() {
  const prazos = [
    { t: "Declaração trimestral SS", d: "20 jul", dias: "12 dias" },
    { t: "Pagamento por conta IRS", d: "31 jul", dias: "23 dias" },
  ];
  return (
    <div className="space-y-2">
      {prazos.map((p) => (
        <div
          key={p.t}
          className="flex items-center gap-3 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-alert text-alert-text">
            <Warning size={13} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-alert-text">{p.t}</div>
            <div className="text-[11px] text-alert-text/80">{p.d}</div>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-alert-text">{p.dias}</span>
        </div>
      ))}
    </div>
  );
}

interface Bloco {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  desc: string;
  visual: ReactNode;
}

const BLOCOS: Bloco[] = [
  {
    icon: <Wallet size={20} />,
    eyebrow: "O teu saldo real",
    title: "Vê o dinheiro, não os impostos.",
    desc: "Separamos automaticamente o que é teu do que é do Estado. O número grande que vês é, simplesmente, o que podes gastar — sem fazer contas, sem culpa.",
    visual: <VisualSaldo />,
  },
  {
    icon: <ChartProjection size={20} />,
    eyebrow: "Reserva automática",
    title: "Pôr de lado deixa de ser um susto.",
    desc: "Em cada recibo dizemos-te quanto reservar para a Segurança Social e para o IVA. Chega o trimestre e o dinheiro já lá está — nada de surpresas de última hora.",
    visual: <VisualReserva />,
  },
  {
    icon: <BellAlert size={20} />,
    eyebrow: "Alertas de prazos",
    title: "Nunca mais uma coima por esquecimento.",
    desc: "Declaração trimestral, pagamentos por conta, IRS anual — avisamos com semanas de antecedência. O detalhe que te poupa juros e dores de cabeça.",
    visual: <VisualPrazos />,
  },
];

const EXTRAS = [
  { icon: <Calculator size={16} />, label: "Simulador de IRS anual" },
  { icon: <History size={16} />, label: "Histórico de recibos" },
  { icon: <Export size={16} />, label: "Exportar para o contabilista" },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mb-14 max-w-2xl">
          <div className="eyebrow mb-3 text-brand">Porque precisas disto</div>
          <h2 className="font-display display-2 text-balance font-semibold text-ink">
            Não é uma calculadora. É tranquilidade financeira.
          </h2>
        </Reveal>

        <div className="space-y-16 sm:space-y-20">
          {BLOCOS.map((b, i) => (
            <Reveal key={b.title}>
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand">
                    {b.icon}
                  </div>
                  <div className="eyebrow mt-5 text-stone-400">{b.eyebrow}</div>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-stone-800 sm:text-3xl">{b.title}</h3>
                  <p className="mt-3 max-w-md text-stone-500">{b.desc}</p>
                </div>
                <div>{b.visual}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20">
          <StaggerGroup className="grid gap-4 sm:grid-cols-3">
            {EXTRAS.map((e) => (
              <StaggerItem
                key={e.label}
                className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-5 py-4 shadow-card"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  {e.icon}
                </span>
                <span className="text-sm font-medium text-stone-700">{e.label}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Reveal>
      </div>
    </section>
  );
}
