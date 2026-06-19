"use client";

// Passo 5 do simulador guiado — "O que fazer a seguir": diagnóstico adaptado
// sobre a necessidade (ou não) de um Contabilista Certificado, com base no que
// foi preenchido/calculado. Honorários são estimativas de mercado.

import { useMemo, useState } from "react";
import {
  diagnosticoContabilista,
  TABELA_HONORARIOS,
  LIMITE_ISENCAO_IVA,
  LIMITE_CONTAB_ORGANIZADA,
  type NivelContabilista,
  type FormaJuridica,
  type ClientesAmbito,
} from "@/lib/contabilista";
import { fmt } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { Check, Warning, Building, ShieldCheck } from "@/components/ui/Icons";
import MapaPrecosRegioes from "@/components/contabilista/MapaPrecosRegioes";

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

const NIVEL_ESTILO: Record<NivelContabilista, { card: string; badge: string; barra: string; passos: number }> = {
  obrigatorio: { card: "border-clay-border bg-clay-bg", badge: "bg-clay text-white", barra: "bg-clay", passos: 5 },
  muito_recomendado: { card: "border-alert-border bg-alert-bg", badge: "bg-alert-text text-white", barra: "bg-alert-text", passos: 4 },
  recomendado: { card: "border-alert-border bg-alert-bg", badge: "bg-alert-text text-white", barra: "bg-alert-text", passos: 3 },
  opcional: { card: "border-brand/30 bg-brand-light", badge: "bg-brand text-white", barra: "bg-brand", passos: 2 },
  autonomo: { card: "border-brand/30 bg-brand-light", badge: "bg-brand text-white", barra: "bg-brand", passos: 1 },
};

export function PassoContabilista({
  faturacaoAnual,
  despesasEstimadas = 0,
  onVoltar,
  mostrarMapa = true,
}: {
  faturacaoAnual: number;
  despesasEstimadas?: number;
  /** Opcional: quando ausente, esconde o botão "Voltar" (uso autónomo, ex.: comparador). */
  onVoltar?: () => void;
  /** Quando false, esconde o mapa de preços (há um mapa unificado por fora). */
  mostrarMapa?: boolean;
}) {
  const [formaJuridica, setFormaJuridica] = useState<FormaJuridica>("independente");
  const [clientes, setClientes] = useState<ClientesAmbito>("nacional");
  const [despesasStr, setDespesasStr] = useState(despesasEstimadas > 0 ? String(Math.round(despesasEstimadas)) : "");
  const [trabalhadores, setTrabalhadores] = useState(false);

  const diag = useMemo(
    () =>
      diagnosticoContabilista({
        formaJuridica,
        faturacaoAnual,
        despesasAnuais: num(despesasStr),
        clientes,
        trabalhadores,
      }),
    [formaJuridica, faturacaoAnual, despesasStr, clientes, trabalhadores]
  );

  const estilo = NIVEL_ESTILO[diag.nivel];

  // Posição da faturação na escala dos limites (isento · simplificado · organizada).
  const escalaMax = LIMITE_CONTAB_ORGANIZADA * 1.15;
  const pos = Math.min(100, (faturacaoAnual / escalaMax) * 100);
  const posIsencao = (LIMITE_ISENCAO_IVA / escalaMax) * 100;
  const posOrganizada = (LIMITE_CONTAB_ORGANIZADA / escalaMax) * 100;

  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";
  const toggleBtn = (ativo: boolean) =>
    `flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
      ativo
        ? "border-brand bg-brand text-white shadow-glow"
        : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
    }`;
  const labelCls = "mb-2 block text-xs font-semibold text-stone-600 dark:text-stone-400";

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-2 text-brand">Próximos passos</div>
        <h2 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Precisas de um contabilista?</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Com base na tua faturação de <strong className="text-stone-700 dark:text-stone-200">{fmt(faturacaoAnual)}/ano</strong> e
          em mais alguns dados, dizemos-te se — e quando — vale a pena contratar um Contabilista Certificado, e quanto custa.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ── Inputs ── */}
        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">A tua situação</p>

          <div className="space-y-4">
            <div>
              <span className={labelCls}>Forma jurídica</span>
              <div className="flex gap-2">
                <button type="button" aria-pressed={formaJuridica === "independente"} onClick={() => setFormaJuridica("independente")} className={toggleBtn(formaJuridica === "independente")}>
                  Independente
                </button>
                <button type="button" aria-pressed={formaJuridica === "sociedade"} onClick={() => setFormaJuridica("sociedade")} className={toggleBtn(formaJuridica === "sociedade")}>
                  Sociedade (Lda.)
                </button>
              </div>
            </div>

            <div>
              <span className={labelCls}>
                Clientes{" "}
                <InfoTip label="Porque importa">Clientes internacionais implicam VIES e Declarações Recapitulativas de IVA — bastante mais complexo.</InfoTip>
              </span>
              <div className="flex gap-2">
                <button type="button" aria-pressed={clientes === "nacional"} onClick={() => setClientes("nacional")} className={toggleBtn(clientes === "nacional")}>
                  Só nacionais
                </button>
                <button type="button" aria-pressed={clientes === "internacional"} onClick={() => setClientes("internacional")} className={toggleBtn(clientes === "internacional")}>
                  Internacionais
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="desp-op" className={labelCls}>
                Despesas da atividade por ano (€){" "}
                <InfoTip label="Porque importa">Se as tuas despesas reais (renda, equipamento, subcontratações…) superam 25% da faturação, a contabilidade organizada pode poupar IRS.</InfoTip>
              </label>
              <input id="desp-op" type="text" inputMode="decimal" autoComplete="off" value={despesasStr} onChange={(e) => setDespesasStr(soDecimal(e.target.value))} placeholder="0" className={campo} />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5">
              <input type="checkbox" checked={trabalhadores} onChange={(e) => setTrabalhadores(e.target.checked)} className="h-4 w-4 accent-brand" />
              <span className="text-sm text-stone-700 dark:text-stone-300">Tenho trabalhadores a cargo</span>
              <InfoTip label="Porque importa">Pagar salários implica processamento mensal, retenções e Segurança Social — sobe a necessidade de um contabilista.</InfoTip>
            </label>
          </div>
        </div>

        {/* ── Diagnóstico ── */}
        <div className={`rounded-3xl border p-5 ${estilo.card}`}>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${estilo.badge}`}>
              {diag.nivel === "obrigatorio" ? <Warning size={11} /> : <Check size={11} />}
              {diag.rotulo}
            </span>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">{diag.titulo}</h3>

          {/* Medidor de necessidade (1–5) */}
          <div className="mt-3 flex items-center gap-1.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= estilo.passos ? estilo.barra : "bg-stone-200 dark:bg-stone-700"}`} />
            ))}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{diag.mensagem}</p>

          <div className="mt-4 rounded-2xl bg-white/70 p-4 dark:bg-stone-900/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Honorário estimado</p>
            <p className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
              {fmt(diag.avencaMin)} – {fmt(diag.avencaMax)}
              <span className="ml-1 text-sm font-medium text-stone-400">{diag.pontual ? "· custo único" : "/mês"}</span>
            </p>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{diag.modelo}</p>
          </div>

          {diag.motivos.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {diag.motivos.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <Check size={12} className="mt-0.5 flex-shrink-0 text-brand" />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Onde te situas (limites) ── */}
      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Onde te situas</p>
        <div className="relative h-3 rounded-full bg-gradient-to-r from-brand/30 via-alert/50 to-clay/40">
          <span className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-stone-800 dark:bg-white" style={{ left: `${pos}%` }} aria-hidden />
          <span className="absolute top-4 -translate-x-1/2 text-[10px] text-stone-400" style={{ left: `${posIsencao}%` }}>{fmt(LIMITE_ISENCAO_IVA)}</span>
          <span className="absolute top-4 -translate-x-1/2 text-[10px] text-stone-400" style={{ left: `${posOrganizada}%` }}>{fmt(LIMITE_CONTAB_ORGANIZADA)}</span>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className={faturacaoAnual < LIMITE_ISENCAO_IVA ? "font-semibold text-brand" : "text-stone-400"}>Isento de IVA<br />&lt; {fmt(LIMITE_ISENCAO_IVA)}</div>
          <div className={faturacaoAnual >= LIMITE_ISENCAO_IVA && faturacaoAnual < LIMITE_CONTAB_ORGANIZADA ? "font-semibold text-alert-text" : "text-stone-400"}>Simplificado + IVA</div>
          <div className={faturacaoAnual >= LIMITE_CONTAB_ORGANIZADA ? "font-semibold text-clay-text" : "text-stone-400"}>Contab. organizada<br />≥ {fmt(LIMITE_CONTAB_ORGANIZADA)}</div>
        </div>
      </div>

      {/* ── Tabela de honorários ── */}
      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Honorários por perfil</p>
        <p className="mb-4 text-[11px] text-stone-400">Estimativas de mercado — variam por gabinete, número de documentos e região.</p>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-[11px] uppercase tracking-wider text-stone-400">
                <th className="px-2 py-2 font-semibold">Perfil</th>
                <th className="px-2 py-2 font-semibold">Complexidade</th>
                <th className="px-2 py-2 text-right font-semibold">€/mês</th>
              </tr>
            </thead>
            <tbody>
              {TABELA_HONORARIOS.map((p) => (
                <tr key={p.perfil} className="border-b border-stone-50 dark:border-stone-800/60 align-top">
                  <td className="px-2 py-2.5">
                    <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100">{p.perfil}</span>
                    <span className="block text-[11px] text-stone-400">{p.regime}</span>
                  </td>
                  <td className="px-2 py-2.5 text-[11px] text-stone-500 dark:text-stone-400">{p.complexidade}</td>
                  <td className="px-2 py-2.5 text-right text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                    {p.min}–{p.max}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Preços médios por região (oculto quando há um mapa unificado por fora) ── */}
      {mostrarMapa && (
        <div>
          <div className="mb-4">
            <h3 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">Preços médios por região</h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Quanto custa, em média, um contabilista na tua zona. Procura a tua cidade ou toca numa região.
            </p>
          </div>
          <MapaPrecosRegioes />
        </div>
      )}

      {/* ── Como contratar com segurança ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
          <ShieldCheck size={16} className="text-brand" />
          <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-200">Valida na OCC</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">Confirma que o contabilista está «Ativo» no diretório da Ordem dos Contabilistas Certificados antes de começar.</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
          <Building size={16} className="text-brand" />
          <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-200">Contrato + seguro</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">Formaliza um contrato de prestação de serviços e confirma o seguro de responsabilidade civil profissional ativo.</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
          <Check size={16} className="text-brand" />
          <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-200">Coimas {'>'} avença</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">As coimas por atrasos ou erros declarativos costumam ser muito superiores ao custo de meses de avença básica.</p>
        </div>
      </div>

      {onVoltar && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onVoltar}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-5 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-300 transition-all hover:border-brand hover:text-brand"
          >
            ← Voltar ao resultado
          </button>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-stone-400">
        Diagnóstico informativo. Os limites legais (isenção de IVA até {fmt(LIMITE_ISENCAO_IVA)}, contabilidade organizada
        obrigatória a partir de {fmt(LIMITE_CONTAB_ORGANIZADA)}) são oficiais; os honorários são estimativas de mercado e não
        substituem uma proposta de um Contabilista Certificado.
      </p>
    </div>
  );
}
