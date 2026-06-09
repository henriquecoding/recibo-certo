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

/* ── Visuais de apoio: demonstrações premium do produto ─────── */

function VisualSaldo() {
  const items = [
    { l: "Retenção IRS", v: "460 €" },
    { l: "Seg. Social", v: "299 €" },
    { l: "IVA", v: "0 €" },
  ];
  return (
    <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-6 text-white shadow-glow">
      {/* Orbs */}
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />

      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">
          Recibo de 2.000 €
        </div>
        <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums">
          1.241 €
        </div>
        <div className="mt-1 text-xs text-green-100/70">disponível para gastar</div>

        {/* Barra split */}
        <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="rounded-full bg-white/70" style={{ width: "62%" }} />
        </div>
        <div className="mt-1 text-[11px] text-green-100/50">62% deste recibo é mesmo teu</div>

        {/* Mini-cards */}
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {items.map((c) => (
            <div key={c.l} className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
              <div className="text-[10px] text-green-100/70 leading-tight">{c.l}</div>
              <div className="mt-0.5 text-xs font-semibold tabular-nums">{c.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisualReserva() {
  const itens = [
    { l: "Segurança Social", v: 299, total: 450, pct: 66 },
    { l: "Reserva para IRS", v: 138, total: 460, pct: 30 },
  ];
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Mealheiro fiscal
        </span>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
          Este trimestre
        </span>
      </div>
      <div className="space-y-4">
        {itens.map((r) => (
          <div key={r.l}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-medium text-stone-600">{r.l}</span>
              <span className="font-semibold tabular-nums text-stone-800">
                {r.v} €
                <span className="font-normal text-stone-400"> / {r.total} €</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-brand-light p-3 text-center">
        <div className="text-[11px] font-medium text-brand-dark">Total reservado este mês</div>
        <div className="mt-0.5 font-display text-xl font-semibold text-brand tabular-nums">437 €</div>
      </div>
    </div>
  );
}

function VisualPrazos() {
  const prazos = [
    { t: "Declaração trimestral SS", d: "20 jul", dias: 12, urgente: true },
    { t: "Pagamento por conta IRS", d: "31 jul", dias: 23, urgente: false },
  ];
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Próximos prazos
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-alert-text">
          2
        </span>
      </div>
      <div className="space-y-2">
        {prazos.map((p) => (
          <div
            key={p.t}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
              p.urgente ? "border border-alert-border bg-alert-bg" : "border border-stone-100 bg-stone-50"
            }`}
          >
            <div className={`flex w-10 flex-shrink-0 flex-col items-center ${p.urgente ? "text-alert-text" : "text-brand"}`}>
              <span className="font-display text-lg font-semibold leading-none tabular-nums">{p.dias}</span>
              <span className="text-[9px] uppercase tracking-wide opacity-70">dias</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-xs font-semibold ${p.urgente ? "text-alert-text" : "text-stone-700"}`}>
                {p.t}
              </div>
              <div className={`text-[10px] ${p.urgente ? "text-alert-text/70" : "text-stone-400"}`}>{p.d}</div>
            </div>
            {p.urgente && (
              <Warning size={13} className="flex-shrink-0 text-alert-text" />
            )}
          </div>
        ))}
      </div>
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
