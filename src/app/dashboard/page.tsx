"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRecibos, resumir, type Recibo } from "@/lib/store/recibos";
import { gerarInsights, saudeFiscal, type Insight, type SaudeFiscal } from "@/lib/insights";
import { fmt } from "@/lib/format";
import { Receipt, Warning, Check, ArrowRight, History, Calendar } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";
import ProHint from "@/components/ui/ProHint";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import ReceitaChart from "@/components/dashboard/ReceitaChart";
import IvaProgresso from "@/components/dashboard/IvaProgresso";
import PoupancaTrimestral from "@/components/dashboard/PoupancaTrimestral";
import DistribuicaoDonut from "@/components/dashboard/DistribuicaoDonut";
import TabelaRecibos from "@/components/dashboard/TabelaRecibos";
import MiniCalendario from "@/components/dashboard/MiniCalendario";
import Onboarding from "@/components/dashboard/Onboarding";
import PartnerSpot from "@/components/dashboard/PartnerSpot";

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

export default function VisaoGeral() {
  const { recibos, carregado, naNuvem, locaisPorImportar, importarLocais, adiarImportacao } = useRecibos();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [saude, setSaude] = useState<SaudeFiscal>({ score: 0, estado: "Tranquilo", fatores: [] });
  const [onboarded, setOnboarded] = useState(true);
  const [mounted, setMounted] = useState(false);

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
      setInsights(gerarInsights(recibos));
      setSaude(saudeFiscal(recibos));
    }
  }, [carregado, recibos]);

  const mes = resumir(mesAtual(recibos));
  const ano = resumir(recibos);
  const temRecibos = recibos.length > 0;

  const dataHoje = mounted
    ? new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="mx-auto max-w-5xl">

      {/* ── Cabeçalho da página ─────────────────────────────────── */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          {mounted && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-400 capitalize shadow-card">
              <Calendar size={11} />
              {dataHoje}
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold text-stone-800">
            {mounted ? saudacao() : "Visão geral"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">O teu copiloto financeiro, sem surpresas.</p>
        </div>
        <Link
          href="/dashboard/recibos"
          className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float"
        >
          <Receipt size={16} />
          Registar recibo
        </Link>
      </header>

      {!carregado ? (
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
                <div className="mt-1 font-display text-6xl font-semibold leading-none tabular-nums sm:text-7xl">
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
                  { l: "Retenção IRS", v: mes.retencao },
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
            <SaudeCard score={saude.score} estado={saude.estado} fatores={saude.fatores} />
            <div className="flex-1 rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
              <h2 className="mb-4 text-sm font-semibold text-stone-700">Acumulado do ano</h2>
              <Linha label="Faturado" value={ano.bruto} />
              <Linha label="Retenção de IRS" value={ano.retencao} />
              <Linha label="IVA cobrado" value={ano.iva} />
              <Linha label="Segurança Social" value={ano.segSocial} />
              <div className="mt-3 border-t border-stone-100 pt-3">
                <Linha label="Líquido para ti" value={ano.liquido} destaque />
              </div>
            </div>
          </div>

          {/* ══ ROW 2: Gráfico de receitas + Calendário ══════════ */}

          <div className="col-span-12 lg:col-span-7">
            <ReceitaChart recibos={recibos} />
          </div>

          <div className="col-span-12 lg:col-span-5">
            <MiniCalendario />
          </div>

          {/* ══ ROW 3: Três painéis de análise ═══════════════════ */}

          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <DistribuicaoDonut resumo={mes} />
          </div>

          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <IvaProgresso recibos={recibos} />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <PoupancaTrimestral recibos={recibos} />
          </div>

          {/* ══ ROW 4: Tabela de recibos + Insights ══════════════ */}

          <div className="col-span-12 lg:col-span-8">
            <TabelaRecibos recibos={recibos} />
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {insights.length > 0 && (
              <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
                <h2 className="mb-4 text-sm font-semibold text-stone-700">O que precisas de saber</h2>
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
    </div>
  );
}

/* ── Sub-componentes ──────────────────────────────────────────────── */

function SaudeCard({ score, estado, fatores }: { score: number; estado: string; fatores: { label: string; ok: boolean }[] }) {
  const cor = score >= 80 ? "#1D9E75" : score >= 60 ? "#7A5C00" : "#b91c1c";
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-stone-700">Saúde fiscal</h2>
        <InfoTip>
          Indicador de organização (0–100) a partir da margem até ao limite de IVA, da antecedência do próximo prazo
          e do acompanhamento dos recibos. Não é uma garantia.
        </InfoTip>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r={r} fill="none" stroke="currentColor" className="text-stone-100" strokeWidth="8" />
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke={cor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 42 42)"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
            />
            <text x="42" y="47" textAnchor="middle" className="font-display text-stone-800" fontSize="20" fontWeight="600" fill="currentColor">
              {score}
            </text>
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: cor }}>{estado}</div>
          <ul className="mt-1.5 space-y-1">
            {fatores.map((f) => (
              <li key={f.label} className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className={f.ok ? "text-brand" : "text-stone-300"}>
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
    ok: { bg: "bg-brand-light", text: "text-brand-dark", icon: <Check size={14} /> },
    info: { bg: "bg-stone-100", text: "text-stone-600", icon: <ArrowRight size={14} /> },
    alerta: { bg: "bg-alert-bg", text: "text-alert-text", icon: <Warning size={14} /> },
  }[insight.tom];
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${cfg.bg} ${cfg.text}`}>
        {cfg.icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-800">{insight.titulo}</div>
        <div className="text-xs leading-relaxed text-stone-500">{insight.descricao}</div>
      </div>
    </li>
  );
}

function Linha({ label, value, destaque = false }: { label: string; value: number; destaque?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${destaque ? "font-semibold text-stone-800" : "text-stone-500"}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${destaque ? "text-brand" : "text-stone-700"}`}>
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
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-100 bg-white shadow-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card" />
        ))}
      </div>
    </div>
  );
}
