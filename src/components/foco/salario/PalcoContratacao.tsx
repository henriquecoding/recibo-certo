"use client";

import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import type { Ato } from "@/components/palco/relogio";
import {
  ArrowRight,
  Briefcase,
  Building,
  Calendar,
  Check,
  Coin,
  ShieldCheck,
  Target,
  User,
} from "@/components/ui/Icons";

const ATOS_CONTRATACAO: Ato[] = [
  { id: "budget", rotulo: "Orçamento", legenda: "Reservar o custo anual máximo", duracao: 2100, beats: [] },
  { id: "package", rotulo: "Pacote", legenda: "Compor salário, refeição e custos do posto", duracao: 2300, beats: [] },
  { id: "money", rotulo: "3 dinheiros", legenda: "Separar empresa, trabalhador e Estado", duracao: 2400, beats: [] },
  { id: "decision", rotulo: "Decisão", legenda: "Ver o pacote que cabe antes da proposta", duracao: 2600, beats: [] },
];

const eur = (value: number) => `${value.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;

export default function PalcoContratacao() {
  return (
    <MolduraPalco
      id="palco-contratacao"
      tom="escuro"
      nome="O planeamento da contratação"
      resumo="Um orçamento anual é repartido entre pacote salarial, encargos públicos e custos do posto até chegar a uma proposta que cabe na empresa."
      narracao={[
        "A empresa começa com 42 000 euros por ano e preserva cinco por cento como margem de segurança.",
        "O posto soma vencimento base, subsídio de refeição, Segurança Social patronal e custos que não aparecem no recibo.",
        "O mesmo pacote é lido em três contas distintas: o que sai da empresa, o que chega ao trabalhador e o que é entregue ao Estado.",
        "A decisão mostra o custo anual, o intervalo de líquido sem dados pessoais e a capacidade que ainda precisa de ser validada.",
      ]}
      atos={ATOS_CONTRATACAO}
    >
      {(scene) => <HiringScene scene={scene} />}
    </MolduraPalco>
  );
}

function HiringScene({ scene }: { scene: CenaDoPalco }) {
  const visible = (index: number) => scene.estatico || scene.ato >= index;
  const active = (index: number) => !scene.estatico && scene.ato === index;
  const panel = (index: number) => `min-w-0 rounded-2xl border p-3.5 transition-all duration-500 sm:p-4 ${
    active(index)
      ? "border-brand-mint/65 bg-white/10 shadow-[0_12px_35px_rgba(0,0,0,.18)]"
      : visible(index)
        ? "border-white/15 bg-white/[.055]"
        : "border-white/10 bg-white/[.025] opacity-35"
  }`;

  return (
    <div aria-hidden className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0a211b]/80 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[.045] px-3.5 py-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-brand-mint"><Briefcase size={14} /> Contratação em estudo</p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">Continente · 40 h/semana · entrada em janeiro</p>
        </div>
        <span className="rounded-full border border-brand-mint/25 bg-brand/20 px-3 py-1.5 text-xs font-semibold text-brand-mint">Sem dados pessoais</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section className={panel(0)}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-mint/15 text-brand-mint"><Target size={16} /></span>
            {visible(0) ? <Check size={15} className="text-brand-mint" /> : null}
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-white/45">Orçamento anual</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-white">{eur(42_000)}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full w-[95%] rounded-full bg-brand-mint transition-[width] duration-700" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">5% fica intocável para imprevistos.</p>
        </section>

        <section className={panel(1)}>
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Coin size={16} className="text-brand-mint" /> O pacote</div>
          <dl className="mt-3 space-y-2.5 text-xs">
            {[
              ["Vencimento base", "2 000 € × 14"],
              ["Refeição em cartão", "10,20 € × 22"],
              ["Custos do posto", "870 € / ano"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 last:border-0">
                <dt className="text-white/55">{label}</dt><dd className="text-right font-semibold tabular-nums text-white/85">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={panel(2)}>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-white/45">Os três dinheiros</p>
          <div className="mt-3 space-y-2">
            {[
              [Building, "Empresa", "≈ 38 200 € / ano"],
              [User, "Trabalhador", "≈ 1 500–1 650 € / mês"],
              [ShieldCheck, "Estado", "IRS + duas contribuições"],
            ].map(([Icon, label, value]) => {
              const ItemIcon = Icon as typeof Building;
              return (
                <div key={String(label)} className="flex items-center gap-2.5 rounded-xl bg-white/[.055] p-2.5">
                  <ItemIcon size={15} className="flex-none text-brand-mint" />
                  <div className="min-w-0"><p className="text-xs font-semibold text-white">{String(label)}</p><p className="mt-0.5 text-xs leading-snug text-white/50">{String(value)}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${panel(3)} border-brand-mint/35 bg-brand/15`}>
          <div className="flex items-center gap-2 text-sm font-bold text-brand-mint"><Calendar size={16} /> A decisão</div>
          <p className="mt-3 font-display text-2xl font-semibold text-white">Cabe, com margem.</p>
          <p className="mt-2 text-xs leading-relaxed text-white/60">O primeiro ano inclui equipamento. Apoios potenciais não reduzem o custo até serem aprovados.</p>
          <div className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-brand-mint px-3 text-xs font-bold text-brand-deep">Ver a conta inteira <ArrowRight size={13} /></div>
        </section>
      </div>
    </div>
  );
}
