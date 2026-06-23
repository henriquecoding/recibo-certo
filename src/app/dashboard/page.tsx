"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRecibos, resumirDashboard, type Recibo } from "@/lib/store/recibos";
import { usePreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { usePerfil } from "@/lib/perfil";
import { gerarInsights, saudeFiscal, type Insight, type SaudeFiscal } from "@/lib/insights";
import { fmt } from "@/lib/format";
import { Receipt, Warning, Check, ArrowRight, History, Calendar, Wallet, Building } from "@/components/ui/Icons";
import PainelCenarioTipo from "@/components/dashboard/PainelCenarioTipo";
import InfoTip from "@/components/ui/InfoTip";
import ProHint from "@/components/ui/ProHint";
import ProGate from "@/components/ui/ProGate";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import IvaProgresso from "@/components/dashboard/IvaProgresso";
import PoupancaTrimestral from "@/components/dashboard/PoupancaTrimestral";
import GuardiaoRetencao from "@/components/dashboard/GuardiaoRetencao";
import GuardiaoSS from "@/components/dashboard/GuardiaoSS";
import EstimativaIRS from "@/components/dashboard/EstimativaIRS";
import TabelaRecibos from "@/components/dashboard/TabelaRecibos";
import MiniCalendario from "@/components/dashboard/MiniCalendario";
import Onboarding from "@/components/dashboard/Onboarding";
import PartnerSpot from "@/components/dashboard/PartnerSpot";
import HubRecursos from "@/components/dashboard/HubRecursos";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const ReceitaChart = dynamic(() => import("@/components/dashboard/ReceitaChart"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />,
});

const DistribuicaoDonut = dynamic(() => import("@/components/dashboard/DistribuicaoDonut"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />,
});

function mesAtual(recibos: Recibo[]): Recibo[] {
  const agora = new Date();
  const p = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  return recibos.filter((r) => r.data.startsWith(p));
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

type Lente = "recibos" | "vencimento" | "empresa";

export default function VisaoGeral() {
  const { recibos, carregado, naNuvem, locaisPorImportar, importarLocais, adiarImportacao } = useRecibos();
  const { prefs } = usePreferenciasFiscais();
  const { perfil, definir } = usePerfil();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [saude, setSaude] = useState<SaudeFiscal>({ score: 0, estado: "Tranquilo", fatores: [] });
  const [onboarded, setOnboarded] = useState(true);
  const [mounted, setMounted] = useState(false);

  const opcoesFiscais = useMemo(() => ({
    isencaoSSPrimeiroAno: prefs.isencaoSSPrimeiroAno,
    acumulaEmprego: prefs.acumulaEmprego,
    irsJovemAno: prefs.irsJovemAno > 0 ? prefs.irsJovemAno : undefined,
  }), [prefs]);

  useEffect(() => {
    setMounted(true);
    try {
      setOnboarded(localStorage.getItem("recibocerto:onboarded") === "1");
    } catch {
      /* localStorage indisponível */
    }
  }, []);

  const concluirOnboarding = () => {
    try {
      localStorage.setItem("recibocerto:onboarded", "1");
    } catch {
      /* ignora */
    }
    setOnboarded(true);
  };

  useEffect(() => {
    if (carregado) {
      setInsights(gerarInsights(recibos, opcoesFiscais));
      setSaude(saudeFiscal(recibos));
    }
  }, [carregado, recibos, opcoesFiscais]);

  const mes = resumirDashboard(mesAtual(recibos));
  const ano = resumirDashboard(recibos);
  const temRecibos = recibos.length > 0;

  // ── Lente do dashboard: adapta os dados e gráficos ao tipo de cenário ──────
  // Deriva do perfil global (partilhado com a homepage); "comparar" cai em
  // recibos verdes. O seletor abaixo muda o perfil e, com ele, a lente.
  const lente: Lente = perfil === "dependente" ? "vencimento" : perfil === "empresa" ? "empresa" : "recibos";
  const LENTES: { chave: Lente; perfil: "independente" | "dependente" | "empresa"; label: string; Icon: typeof Receipt }[] = [
    { chave: "recibos", perfil: "independente", label: "Recibos verdes", Icon: Receipt },
    { chave: "vencimento", perfil: "dependente", label: "Por conta de outrem", Icon: Wallet },
    { chave: "empresa", perfil: "empresa", label: "Empresa", Icon: Building },
  ];

  const ctaPorLente: Record<Lente, { label: string; href: string }> = {
    recibos: { label: "Registar recibo", href: "/#calculadora" },
    vencimento: { label: "Simular vencimento", href: "/dashboard/recibo-vencimento" },
    empresa: { label: "Simular empresa", href: "/dashboard/empresa" },
  };
  const cta = ctaPorLente[lente];

  const dataHoje = mounted
    ? new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="mx-auto max-w-5xl">

      {/* ── Cabeçalho da página ─────────────────────────────────── */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          {mounted && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-400 capitalize shadow-card dark:border-stone-700 dark:bg-stone-800">
              <Calendar size={11} />
              {dataHoje}
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
            {mounted ? saudacao() : "Visão geral"}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">O teu copiloto financeiro, sem surpresas.</p>
        </div>
        <Link
          href={cta.href}
          className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float"
        >
          <Receipt size={16} />
          {cta.label}
        </Link>
      </header>

      {/* ── Seletor de lente: adapta o dashboard ao tipo de cenário ───────── */}
      <div role="tablist" aria-label="Tipo de cenário" className="mb-6 inline-flex flex-wrap gap-1.5 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-1 shadow-sm dark:border-stone-700 dark:bg-stone-900/60">
        {LENTES.map((l) => {
          const ativo = lente === l.chave;
          return (
            <button
              key={l.chave}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => definir(l.perfil)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                ativo
                  ? "bg-brand text-white shadow-glow"
                  : "text-stone-500 hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand"
              }`}
            >
              <l.Icon size={14} />
              {l.label}
            </button>
          );
        })}
      </div>

      {lente !== "recibos" ? (
        <PainelCenarioTipo tipo={lente} />
      ) : !carregado ? (
        <Skeleton />
      ) : !onboarded && !temRecibos ? (
        <Onboarding onConcluir={concluirOnboarding} />
      ) : (
        <div className="grid grid-cols-12 items-start gap-4">

          {/* ── Banner: guardar na nuvem ─────────────────────────── */}
          {!naNuvem && temRecibos && (
            <div className="col-span-12">
              <ProHint id="cloud-historico" icon={<History size={18} />} cta="Criar conta / entrar" href="/dashboard/conta">
                O teu histórico vive só neste dispositivo. Cria uma conta e fica seguro na nuvem, acessível do telemóvel
                ao portátil.
              </ProHint>
            </div>
          )}

          {/* ── Banner: importar recibos locais ──────────────────── */}
          {naNuvem && locaisPorImportar > 0 && (
            <div className="col-span-12">
              <div className="rounded-2xl border border-brand/30 bg-brand-light px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 text-brand"><History size={18} /></span>
                  <p className="text-sm text-brand-dark">
                    Tens {locaisPorImportar} {locaisPorImportar === 1 ? "recibo guardado" : "recibos guardados"} neste
                    dispositivo. Queres trazê-{locaisPorImportar === 1 ? "lo" : "los"} para a tua conta na nuvem?
                  </p>
                </div>
                <div className="mt-3 flex gap-2 pl-[30px]">
                  <button type="button" onClick={importarLocais}
                    className="rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark">
                    Trazer para a nuvem
                  </button>
                  <button type="button" onClick={adiarImportacao}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-white/40">
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ ROW 1: Hero saldo (dominant) + painel lateral ════ */}

          {/* ── Saldo hero — cartão principal ────────────────────── */}
          <div className="col-span-12 lg:col-span-8">
            <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-7 text-white shadow-glow sm:p-8">
              {/* Orbs decorativos */}
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
              <div aria-hidden className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-brand-mint/20 blur-2xl" />

              {/* Top row: mês + faturado */}
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">Este mês</div>
                  {mes.bruto > 0 && (
                    <div className="mt-0.5 text-sm font-medium text-green-100/80">
                      {fmt(mes.bruto)} faturados
                    </div>
                  )}
                </div>
                {mounted && (
                  <div className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-green-100 capitalize backdrop-blur">
                    {new Date().toLocaleDateString("pt-PT", { month: "long" })}
                  </div>
                )}
              </div>

              {/* Métrica principal */}
              <div className="relative mt-4">
                <div className="text-xs font-medium uppercase tracking-wider text-green-100/60">Disponível para gastar</div>
                <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums sm:text-5xl lg:text-6xl">
                  <AnimatedNumber value={mes.liquido} />
                </div>
                {mes.bruto === 0 && (
                  <div className="mt-2 text-sm text-green-100/70">Regista o primeiro recibo para começar.</div>
                )}
              </div>

              {/* Barra: proporção tua vs Estado */}
              {mes.bruto > 0 && (
                <div className="relative mt-5">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="rounded-full bg-white/70 transition-all duration-700"
                      style={{ width: `${Math.round((mes.liquido / mes.bruto) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-green-100/50">
                    {Math.round((mes.liquido / mes.bruto) * 100)}% do faturado é mesmo teu
                  </div>
                </div>
              )}

              {/* Mini-cards: IRS, SS, IVA */}
              <div className="relative mt-5 grid grid-cols-3 gap-2">
                {[
                  { l: "IRS estimado", v: mes.retencao },
                  { l: "Seg. Social", v: mes.segSocial },
                  { l: "IVA", v: mes.iva },
                ].map((c) => (
                  <div key={c.l} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                    <div className="text-[11px] text-green-100/70">{c.l}</div>
                    <div className="mt-0.5 font-display text-base font-semibold">{fmt(c.v)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Painel lateral: Saúde + Acumulado ───────────────── */}
          <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <ProGate title="Saúde Fiscal" description="Indicador detalhado da tua situação fiscal — diversificação, reservas e organização.">
              <SaudeCard score={saude.score} estado={saude.estado} fatores={saude.fatores} />
            </ProGate>
            <div className="flex-1 rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Acumulado do ano</h2>
              <Linha label="Faturado" value={ano.bruto} />
              <Linha label="IRS estimado" value={ano.retencao} />
              <Linha label="IVA cobrado" value={ano.iva} />
              <Linha label="Segurança Social" value={ano.segSocial} />
              <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                <Linha label="Líquido para ti" value={ano.liquido} destaque />
              </div>
            </div>
          </div>

          {/* ══ ROW 2: Gráfico de receitas + Calendário ══════════ */}

          <div className="col-span-12 lg:col-span-7">
            <ErrorBoundary etiqueta="gráfico de receitas">
              <ReceitaChart recibos={recibos} />
            </ErrorBoundary>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <ErrorBoundary etiqueta="mini calendário">
              <MiniCalendario />
            </ErrorBoundary>
          </div>

          {/* ══ ROW 3: Três painéis de análise ═══════════════════ */}

          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <ErrorBoundary etiqueta="distribuição do mês">
              <DistribuicaoDonut resumo={mes} />
            </ErrorBoundary>
          </div>

          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <ErrorBoundary etiqueta="progresso IVA">
              <IvaProgresso recibos={recibos} />
            </ErrorBoundary>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <PoupancaTrimestral recibos={recibos} />
          </div>

          {/* ══ ROW 3b: Guardiões (Retenção + Seg. Social) ══════ */}

          <div className="col-span-12 sm:col-span-6">
            <GuardiaoRetencao recibos={recibos} />
          </div>

          <div className="col-span-12 sm:col-span-6">
            <GuardiaoSS recibos={recibos} primeiroAno={prefs.isencaoSSPrimeiroAno} acumulaEmprego={prefs.acumulaEmprego} />
          </div>

          {/* ══ ROW 4: Estimativa IRS + Tabela + Insights ═══════ */}

          <div className="col-span-12 lg:col-span-4">
            <ErrorBoundary etiqueta="estimativa IRS">
              <EstimativaIRS recibos={recibos} prefs={prefs} />
            </ErrorBoundary>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <TabelaRecibos recibos={recibos} />
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {insights.length > 0 && (
              <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">O que precisas de saber</h2>
                <ul className="space-y-2.5">
                  {insights.map((i, idx) => (
                    <InsightRow key={idx} insight={i} />
                  ))}
                </ul>
              </div>
            )}
            {temRecibos && <PartnerSpot context="dashboard" />}
          </div>

        </div>
      )}

      {/* ── Hub: todo o site a partir do dashboard ───────────────── */}
      {carregado && <HubRecursos />}
    </div>
  );
}

/* ── Sub-componentes ──────────────────────────────────────────────── */

function SaudeCard({ score, estado, fatores }: { score: number; estado: string; fatores: { label: string; ok: boolean }[] }) {
  const corClasse = score >= 80 ? "text-brand" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const corSVG = score >= 80 ? "var(--color-brand, #1D9E75)" : score >= 60 ? "#b45309" : "#b91c1c";
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Saúde fiscal</h2>
        <InfoTip>
          Indicador de organização (0–100) a partir da margem até ao limite de IVA, da antecedência do próximo prazo
          e do acompanhamento dos recibos. Não é uma garantia.
        </InfoTip>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`Saúde fiscal: ${score} de 100 — ${estado}`}>
            <circle cx="42" cy="42" r={r} fill="none" stroke="currentColor" className="text-stone-100 dark:text-stone-800" strokeWidth="8" />
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke={corSVG}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 42 42)"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
            />
            <text x="42" y="47" textAnchor="middle" className="font-display text-stone-800 dark:text-stone-100" fontSize="20" fontWeight="600" fill="currentColor">
              {score}
            </text>
          </svg>
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${corClasse}`}>{estado}</div>
          <ul className="mt-1.5 space-y-1">
            {fatores.map((f) => (
              <li key={f.label} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <span className={f.ok ? "text-brand" : "text-stone-300 dark:text-stone-600"}>
                  {f.ok ? <Check size={12} /> : <Warning size={12} />}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const cfg = {
    ok: { bg: "bg-brand-light dark:bg-brand/10", text: "text-brand-dark dark:text-brand", icon: <Check size={14} /> },
    info: { bg: "bg-stone-100 dark:bg-stone-800", text: "text-stone-600 dark:text-stone-300", icon: <ArrowRight size={14} /> },
    alerta: { bg: "bg-alert-bg", text: "text-alert-text", icon: <Warning size={14} /> },
  }[insight.tom];
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${cfg.bg} ${cfg.text}`}>
        {cfg.icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{insight.titulo}</div>
        <div className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">{insight.descricao}</div>
      </div>
    </li>
  );
}

function Linha({ label, value, destaque = false }: { label: string; value: number; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${destaque ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-500 dark:text-stone-400"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${destaque ? "text-brand" : "text-stone-700 dark:text-stone-300"}`}>
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />
        ))}
      </div>
    </div>
  );
}
