"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRecibos, resumir, type Recibo } from "@/lib/store/recibos";
import { gerarInsights, saudeFiscal, type Insight, type SaudeFiscal } from "@/lib/insights";
import { fmt } from "@/lib/format";
import { Receipt, Warning, Check, ArrowRight, History } from "@/components/ui/Icons";
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

export default function VisaoGeral() {
  const { recibos, carregado, naNuvem, locaisPorImportar, importarLocais, adiarImportacao } = useRecibos();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [saude, setSaude] = useState<SaudeFiscal>({ score: 0, estado: "Tranquilo", fatores: [] });
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
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

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-800">Visão geral</h1>
          <p className="mt-1 text-sm text-stone-500">O teu copiloto financeiro, sem surpresas.</p>
        </div>
        <Link
          href="/dashboard/recibos"
          className="btn-shine inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float"
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
          {/* Sem sessão + com dados locais → convidar a guardar na nuvem */}
          {!naNuvem && temRecibos && (
            <div className="col-span-12">
              <ProHint id="cloud-historico" icon={<History size={18} />} cta="Criar conta / entrar" href="/dashboard/conta">
                O teu histórico vive só neste dispositivo. Cria uma conta e fica seguro na nuvem, acessível do telemóvel
                ao portátil.
              </ProHint>
            </div>
          )}

          {/* Com sessão + recibos locais por trazer → oferecer importação */}
          {naNuvem && locaisPorImportar > 0 && (
            <div className="col-span-12">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand-light px-4 py-3">
                <span className="flex-shrink-0 text-brand"><History size={18} /></span>
                <p className="min-w-0 flex-1 text-sm text-brand-dark">
                  Tens {locaisPorImportar} {locaisPorImportar === 1 ? "recibo guardado" : "recibos guardados"} neste
                  dispositivo. Queres trazê-{locaisPorImportar === 1 ? "lo" : "los"} para a tua conta na nuvem?
                </p>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={importarLocais}
                    className="rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                  >
                    Trazer para a nuvem
                  </button>
                  <button
                    type="button"
                    onClick={adiarImportacao}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-white/40"
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saldo — a pergunta nº1, em destaque (estilo cartão) */}
          <div className="col-span-12 lg:col-span-5">
            <div className="relative h-full overflow-hidden rounded-4xl border border-brand bg-brand p-7 text-white shadow-glow">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
              />
              <div className="text-xs font-medium uppercase tracking-wider text-green-100">Disponível para gastar este mês</div>
              <div className="mt-1 font-display text-5xl font-semibold leading-none">
                <AnimatedNumber value={mes.liquido} />
              </div>
              <div className="mt-1.5 text-sm text-green-100/90">
                {mes.bruto > 0
                  ? `de ${fmt(mes.bruto)} faturados — o resto é do Estado.`
                  : "Ainda sem recibos este mês — regista o primeiro para começar."}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { l: "Retenção IRS", v: mes.retencao },
                  { l: "Seg. Social", v: mes.segSocial },
                  { l: "IVA", v: mes.iva },
                ].map((c) => (
                  <div key={c.l} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur">
                    <div className="text-[11px] text-green-100/80">{c.l}</div>
                    <div className="font-display text-base font-semibold">{fmt(c.v)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receita (barras) */}
          <div className="col-span-12 sm:col-span-7 lg:col-span-4">
            <ReceitaChart recibos={recibos} />
          </div>

          {/* Saúde fiscal (anel) */}
          <div className="col-span-12 sm:col-span-5 lg:col-span-3">
            <SaudeCard score={saude.score} estado={saude.estado} fatores={saude.fatores} />
          </div>

          {/* Distribuição (donut) */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <DistribuicaoDonut resumo={mes} />
          </div>

          {/* Limite de IVA */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <IvaProgresso recibos={recibos} />
          </div>

          {/* Poupança trimestral */}
          <div className="col-span-12 lg:col-span-4">
            <PoupancaTrimestral recibos={recibos} />
          </div>

          {/* Tabela de recibos recentes */}
          <div className="col-span-12 lg:col-span-8">
            <TabelaRecibos recibos={recibos} />
          </div>

          {/* Mini-calendário de prazos */}
          <div className="col-span-12 lg:col-span-4">
            <MiniCalendario />
          </div>

          {/* Insights proativos */}
          {insights.length > 0 && (
            <div className="col-span-12 lg:col-span-8">
              <div className="h-full rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
                <h2 className="mb-4 text-sm font-semibold text-stone-700">O que precisas de saber</h2>
                <ul className="space-y-2.5">
                  {insights.map((i, idx) => (
                    <InsightRow key={idx} insight={i} />
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Parceiro contextual */}
          {temRecibos && (
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <PartnerSpot context="dashboard" />
            </div>
          )}

          {/* Acumulado do ano */}
          <div className="col-span-12 lg:col-span-4">
            <div className="h-full rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
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
        </div>
      )}
    </div>
  );
}

function SaudeCard({ score, estado, fatores }: { score: number; estado: string; fatores: { label: string; ok: boolean }[] }) {
  const cor = score >= 80 ? "#1D9E75" : score >= 60 ? "#7A5C00" : "#b91c1c";
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-stone-700">Saúde fiscal</h2>
        <InfoTip>Indicador de organização (0–100) a partir da margem até ao limite de IVA, da antecedência do próximo prazo e do acompanhamento dos recibos. Não é uma garantia.</InfoTip>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r={r} fill="none" stroke="currentColor" className="text-stone-200" strokeWidth="8" />
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
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {[0, 1].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card" />
      ))}
    </div>
  );
}
