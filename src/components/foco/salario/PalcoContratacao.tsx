"use client";

import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import type { Ato } from "@/components/palco/relogio";
import {
  ArrowRight,
  Briefcase,
  Building,
  Check,
  ShieldCheck,
  Target,
  User,
} from "@/components/ui/Icons";

export interface DadosContratacao {
  orcamentoAnual: number;
  margemSegurancaPercentagem: number;
  orcamentoUtilizavel: number;
  vencimentoBaseMensal: number;
  refeicaoDia: number;
  refeicaoDiasMes: number;
  custoAnual: number;
  custoPrimeiroAno: number;
  liquidoMensalMinimo: number;
  liquidoMensalMaximo: number;
  encargosPublicosMinimos: number;
  encargosPublicosMaximos: number;
  custoHoraProdutiva: number | null;
  receitaAnualNecessaria: number | null;
  horasProdutivasAno: number | null;
}

const ATOS_CONTRATACAO: Ato[] = [
  { id: "budget", rotulo: "Orçamento", legenda: "Reservar o custo anual máximo", duracao: 2100, beats: [] },
  { id: "package", rotulo: "Pacote", legenda: "Compor salário, refeição e custos do posto", duracao: 2300, beats: [] },
  { id: "money", rotulo: "3 dinheiros", legenda: "Separar empresa, trabalhador e Estado", duracao: 2400, beats: [] },
  { id: "decision", rotulo: "Decisão", legenda: "Validar capacidade antes da proposta", duracao: 2600, beats: [] },
];

const eur = (value: number, digits = 0) => value.toLocaleString("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

export default function PalcoContratacao({ dados }: { dados: DadosContratacao }) {
  return (
    <MolduraPalco
      id="palco-contratacao"
      tom="escuro"
      nome="O planeamento"
      resumo="O orçamento passa por pacote, encargos públicos e capacidade até chegar a uma proposta que cabe na empresa."
      narracao={[
        `A empresa começa com ${eur(dados.orcamentoAnual)} por ano e preserva ${dados.margemSegurancaPercentagem} por cento como margem de segurança.`,
        `O motor compõe um vencimento base mensal de ${eur(dados.vencimentoBaseMensal)} com refeição e custos do posto.`,
        `O custo anual estabilizado é ${eur(dados.custoAnual)}; o líquido mensal provável fica entre ${eur(dados.liquidoMensalMinimo)} e ${eur(dados.liquidoMensalMaximo)} sem dados pessoais.`,
        dados.custoHoraProdutiva && dados.receitaAnualNecessaria
          ? `Cada hora produtiva custa ${eur(dados.custoHoraProdutiva, 2)} e o posto precisa de suportar ${eur(dados.receitaAnualNecessaria)} de receita anual à margem indicada.`
          : "A proposta só avança depois de a empresa confirmar a capacidade necessária para pagar o posto.",
      ]}
      atos={ATOS_CONTRATACAO}
    >
      {(scene) => <HiringScene scene={scene} dados={dados} />}
    </MolduraPalco>
  );
}

function HiringScene({ scene, dados }: { scene: CenaDoPalco; dados: DadosContratacao }) {
  const reached = (index: number) => scene.estatico || scene.ato >= index;
  const active = (index: number) => !scene.estatico && scene.ato === index;
  const spentPercent = Math.min(100, (dados.custoAnual / dados.orcamentoAnual) * 100);
  const safePercent = Math.max(0, 100 - dados.margemSegurancaPercentagem);
  const publicMiddle = (dados.encargosPublicosMinimos + dados.encargosPublicosMaximos) / 2;
  const publicPercent = dados.custoAnual > 0 ? (publicMiddle / dados.custoAnual) * 100 : 0;
  const companyPercent = Math.max(0, 100 - publicPercent);

  return (
    <div aria-hidden className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0a211b]/80 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-brand-mint"><Briefcase size={14} /> Contratação em estudo</p>
          <p className="mt-1 text-xs text-white/50">Continente · 40 h/semana · sem dados pessoais</p>
        </div>
        <span className="rounded-full border border-brand-mint/25 bg-brand/20 px-3 py-1.5 text-xs font-semibold text-brand-mint">Motor fiscal 2026</span>
      </div>

      <section className={`mt-4 rounded-2xl border p-3.5 transition-all duration-500 sm:p-4 ${active(0) ? "border-brand-mint/70 bg-white/10" : "border-white/10 bg-white/[.035]"}`}>
        <div className="flex items-end justify-between gap-4">
          <div><p className="texto-micro font-bold uppercase tracking-[.14em] text-white/45">Régua do orçamento anual</p><p className="mt-1 font-display text-2xl font-semibold tabular-nums text-white">{eur(dados.orcamentoAnual)}</p></div>
          <p className="text-right text-xs leading-relaxed text-white/55"><strong className="text-brand-mint">{eur(dados.orcamentoUtilizavel)}</strong><br />pode ser usado</p>
        </div>
        <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-white/10">
          <span className="absolute inset-y-0 left-0 rounded-full bg-brand-mint transition-[width] duration-700" style={{ width: reached(0) ? `${spentPercent}%` : "0%" }} />
          <span className="absolute inset-y-0 w-px bg-white/80" style={{ left: `${safePercent}%` }} />
        </div>
        <div className="mt-2 flex justify-between texto-micro text-white/40"><span>{eur(dados.custoAnual)} composto</span><span>{dados.margemSegurancaPercentagem}% protegido</span></div>
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
        <section className={`rounded-2xl border p-3.5 transition-all duration-500 sm:p-4 ${active(1) ? "border-brand-mint/70 bg-white/10" : "border-white/10 bg-white/[.035]"}`}>
          <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-bold text-white"><Target size={15} className="text-brand-mint" /> Pacote composto</p>{reached(1) ? <Check size={15} className="text-brand-mint" /> : null}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Metric label="Base mensal" value={eur(dados.vencimentoBaseMensal)} />
            <Metric label="Refeição" value={`${eur(dados.refeicaoDia, 2)} × ${dados.refeicaoDiasMes}`} />
            <Metric label="Primeiro ano" value={eur(dados.custoPrimeiroAno)} />
          </div>
          <div className="mt-4 flex h-5 overflow-hidden rounded-lg bg-white/10">
            <span className="flex items-center bg-brand-mint/80 px-2 texto-micro font-bold text-brand-deep transition-[width] duration-700" style={{ width: reached(1) ? `${companyPercent}%` : "0%" }}>Empresa</span>
            <span className="flex items-center justify-end bg-clay/80 px-2 texto-micro font-bold text-white transition-[width] duration-700" style={{ width: reached(2) ? `${publicPercent}%` : "0%" }}>Estado</span>
          </div>
        </section>

        <section className={`rounded-2xl border p-3.5 transition-all duration-500 sm:p-4 ${active(2) ? "border-brand-mint/70 bg-white/10" : "border-white/10 bg-white/[.035]"}`}>
          <p className="texto-micro font-bold uppercase tracking-[.14em] text-white/45">Os três dinheiros</p>
          <div className="mt-3 space-y-2">
            <MoneyLine Icon={Building} label="Sai da empresa" value={eur(dados.custoAnual)} visible={reached(2)} />
            <MoneyLine Icon={User} label="Chega ao trabalhador" value={`${eur(dados.liquidoMensalMinimo)}–${eur(dados.liquidoMensalMaximo)}/mês`} visible={reached(2)} />
            <MoneyLine Icon={ShieldCheck} label="Segue para o Estado" value={`${eur(dados.encargosPublicosMinimos)}–${eur(dados.encargosPublicosMaximos)}/ano`} visible={reached(2)} />
          </div>
        </section>
      </div>

      <section className={`mt-3 grid gap-3 rounded-2xl border p-3.5 transition-all duration-500 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4 ${active(3) ? "border-brand-mint/75 bg-brand/20" : "border-white/10 bg-white/[.035]"}`}>
        <div>
          <p className="texto-micro font-bold uppercase tracking-[.14em] text-brand-mint">Linha de equilíbrio</p>
          <p className="mt-1 font-display text-xl font-semibold text-white">{dados.receitaAnualNecessaria ? `${eur(dados.receitaAnualNecessaria)} de receita/ano` : "Capacidade por validar"}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">{dados.custoHoraProdutiva ? `${eur(dados.custoHoraProdutiva, 2)} por hora produtiva · ${Math.round(dados.horasProdutivasAno ?? 0).toLocaleString("pt-PT")} h/ano` : "Indica margem e produtividade na ferramenta completa."}</p>
        </div>
        <div className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-brand-mint px-4 text-xs font-bold text-brand-deep transition-opacity duration-500 ${reached(3) ? "opacity-100" : "opacity-35"}`}>A proposta cabe <ArrowRight size={13} /></div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/[.055] p-2.5"><p className="texto-micro uppercase tracking-wide text-white/40">{label}</p><p className="mt-1 text-xs font-semibold tabular-nums text-white/85">{value}</p></div>;
}

function MoneyLine({ Icon, label, value, visible }: { Icon: typeof Building; label: string; value: string; visible: boolean }) {
  return <div className={`flex items-center gap-2.5 rounded-xl bg-white/[.045] p-2.5 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-30"}`}><Icon size={14} className="flex-none text-brand-mint" /><div className="min-w-0"><p className="texto-micro text-white/45">{label}</p><p className="truncate text-xs font-semibold tabular-nums text-white/85">{value}</p></div></div>;
}
