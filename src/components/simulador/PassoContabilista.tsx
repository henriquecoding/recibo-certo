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
import { Check, Warning, Building, ShieldCheck, FileSign, Wallet } from "@/components/ui/Icons";
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

  const regimeAtual = faturacaoAnual < LIMITE_ISENCAO_IVA
    ? "isento"
    : faturacaoAnual < LIMITE_CONTAB_ORGANIZADA
      ? "simplificado"
      : "organizada";

  const DICAS = [
    { Icon: ShieldCheck, titulo: "Valida na OCC", texto: "Confirma que o contabilista está «Ativo» no diretório da Ordem dos Contabilistas Certificados antes de começar." },
    { Icon: Building, titulo: "Contrato + seguro", texto: "Formaliza um contrato de prestação de serviços e confirma o seguro de responsabilidade civil profissional ativo." },
    { Icon: Warning, titulo: "Coimas > avença", texto: "As coimas por atrasos ou erros declarativos costumam ser muito superiores ao custo de meses de avença básica." },
  ] as const;

  return (
    <div className="rounded-4xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card sm:p-6 space-y-6">
      {/* ── Cabeçalho da secção ── */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-brand/15">
          <FileSign size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Precisas de um contabilista?</p>
          <p className="text-[11px] text-stone-400">Diagnóstico adaptado com base na tua faturação de {fmt(faturacaoAnual)}/ano</p>
        </div>
      </div>

      {/* ── Onde te situas (regime) ── */}
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-4 sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">O teu regime</p>
        <div className="relative">
          <div className="flex h-2.5 overflow-hidden rounded-full">
            <div className="bg-brand/30 dark:bg-brand/20" style={{ width: `${posIsencao}%` }} />
            <div className="bg-alert/40 dark:bg-alert/25" style={{ width: `${posOrganizada - posIsencao}%` }} />
            <div className="bg-clay/30 dark:bg-clay/20 flex-1" />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-white dark:border-stone-800 shadow-sm"
            style={{
              left: `${pos}%`,
              background: regimeAtual === "isento" ? "#1D9E75" : regimeAtual === "simplificado" ? "#E8D97A" : "#B45B3E",
            }}
            aria-hidden
          />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-1">
          {([
            { id: "isento" as const, label: "Isento de IVA", sub: `< ${fmt(LIMITE_ISENCAO_IVA)}`, cor: "text-brand" },
            { id: "simplificado" as const, label: "Simplificado + IVA", sub: `${fmt(LIMITE_ISENCAO_IVA)} – ${fmt(LIMITE_CONTAB_ORGANIZADA)}`, cor: "text-alert-text" },
            { id: "organizada" as const, label: "Contab. organizada", sub: `≥ ${fmt(LIMITE_CONTAB_ORGANIZADA)}`, cor: "text-clay-text" },
          ] as const).map((r) => (
            <div
              key={r.id}
              className={`rounded-xl px-2 py-2 text-center transition-all ${
                regimeAtual === r.id
                  ? `${r.cor} bg-white dark:bg-stone-800 shadow-sm font-semibold ring-1 ring-stone-200/60 dark:ring-stone-700`
                  : "text-stone-400"
              }`}
            >
              <p className="text-[11px] leading-tight">{r.label}</p>
              <p className="text-[10px] tabular-nums opacity-70">{r.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Inputs + Diagnóstico ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Painel de inputs */}
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-4 sm:p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">A tua situação</p>
          <div className="space-y-3.5">
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
                Despesas de atividade (€/ano){" "}
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

        {/* Painel de diagnóstico */}
        <div className={`rounded-2xl border p-4 sm:p-5 ${estilo.card}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${estilo.badge}`}>
                {diag.nivel === "obrigatorio" ? <Warning size={11} /> : <Check size={11} />}
                {diag.rotulo}
              </span>
              <h3 className="mt-2.5 font-display text-lg font-semibold text-stone-800 dark:text-stone-100 leading-snug">{diag.titulo}</h3>
            </div>
            <div className="flex gap-1 flex-shrink-0 pt-1" aria-label={`Nível ${estilo.passos} de 5`} aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`h-1.5 w-5 rounded-full ${n <= estilo.passos ? estilo.barra : "bg-stone-200 dark:bg-stone-700"}`} />
              ))}
            </div>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{diag.mensagem}</p>

          <div className="mt-4 rounded-xl bg-white/70 dark:bg-stone-900/50 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Honorário estimado</p>
              <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 tabular-nums leading-tight">
                {fmt(diag.avencaMin)} – {fmt(diag.avencaMax)}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{diag.pontual ? "Custo único" : "Por mês"} · {diag.modelo}</p>
            </div>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/60">
              <Wallet size={20} className="text-brand" />
            </span>
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

      {/* ── Honorários por perfil ── */}
      <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-brand/15">
            <Wallet size={14} />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Honorários por perfil</p>
        </div>
        <p className="mb-4 ml-[38px] text-[11px] text-stone-400">Estimativas de mercado — variam por gabinete, documentos e região.</p>
        <div className="space-y-2">
          {TABELA_HONORARIOS.map((p) => (
            <div key={p.perfil} className="flex items-center gap-3 rounded-xl border border-stone-200/60 dark:border-stone-700/60 bg-white dark:bg-stone-800 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{p.perfil}</p>
                <p className="text-[11px] text-stone-400 leading-tight">{p.regime} · {p.complexidade}</p>
              </div>
              <span className="flex-shrink-0 rounded-lg bg-brand/8 dark:bg-brand/12 px-2.5 py-1 text-xs font-bold tabular-nums text-brand-dark dark:text-brand">
                {p.min}–{p.max}€
              </span>
            </div>
          ))}
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
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-brand/15">
            <ShieldCheck size={14} />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400">Contratação segura</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {DICAS.map((d, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">{d.titulo}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{d.texto}</p>
              </div>
            </div>
          ))}
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
