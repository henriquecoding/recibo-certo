"use client";

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import type { AuditoriaResult } from "@/lib/fiscal-dependente";
import { fmt, pct } from "@/lib/format";
import { Check, Warning } from "@/components/ui/Icons";

// Chip de métrica secundária da auditoria (base, custo empresa, taxa, líquido).
function Chip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
      <p className="text-[11px] text-stone-400">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-stone-400">{sub}</p>}
    </div>
  );
}

// Apresentação do resultado de uma auditoria de recibo (partilhada entre a
// página dedicada e o painel dentro do simulador). Não contém lógica fiscal —
// recebe o resultado já calculado pelo motor verificado `auditarRecibo`.
export function ResultadoAuditoria({ resultado }: { resultado: AuditoriaResult }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="space-y-3"
    >
      <div
        className={`flex items-center gap-2.5 rounded-2xl border p-4 ${
          resultado.tudoOk ? "border-brand/30 bg-brand-light" : "border-alert-border bg-alert-bg"
        }`}
      >
        <span className={resultado.tudoOk ? "text-brand-dark" : "text-alert-text"}>
          {resultado.tudoOk ? <Check size={18} /> : <Warning size={16} />}
        </span>
        <p className={`text-sm font-semibold ${resultado.tudoOk ? "text-brand-dark" : "text-alert-text"}`}>
          {resultado.tudoOk
            ? "O teu recibo parece correto face às tabelas de 2026."
            : "Encontrámos divergências face às tabelas de 2026."}
        </p>
      </div>

      {/* Ordem alinhada com os inputs: IRS à esquerda, Segurança Social à direita. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">IRS esperado</p>
          <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(resultado.irsEsperado)}</p>
          <p className={`text-xs mt-0.5 ${resultado.irsOk ? "text-brand" : "text-alert-text dark:text-amber-400"}`}>
            {resultado.irsOk ? "Corresponde" : `Diverge ${fmt(Math.abs(resultado.irsDiferenca))}`}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
          <p className="text-xs text-stone-400 mb-1">Segurança Social esperada</p>
          <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(resultado.ssEsperado)}</p>
          <p className={`text-xs mt-0.5 ${resultado.ssOk ? "text-brand" : "text-alert-text dark:text-amber-400"}`}>
            {resultado.ssOk ? "Corresponde" : `Diverge ${fmt(Math.abs(resultado.ssDiferenca))}`}
          </p>
        </div>
      </div>

      {/* IRS Jovem — só quando o regime está ativo na simulação/recibo. */}
      {resultado.isencaoJovemPct > 0 && (
        <div className="rounded-2xl border border-brand/25 bg-brand-light p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-brand-dark">IRS Jovem · isenção de {pct(resultado.isencaoJovemPct)}</p>
            <p className="font-display text-sm font-semibold text-brand-dark tabular-nums">{fmt(resultado.rendimentoIsentoJovem)} isentos</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-brand-dark/80">
            O IRS esperado já reflete a isenção do ano de benefício indicado. Confirma que o teu recibo aplica a mesma percentagem.
            {resultado.excedeTetoJovem ? " Parte do rendimento ultrapassa o teto mensal e volta a ser tributada." : ""}
          </p>
        </div>
      )}

      {/* Métricas adicionais — base, custo da entidade, taxa efetiva e líquido. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Chip label="Base de incidência" value={fmt(resultado.baseIncidencia)} sub="remuneração sujeita" />
        <Chip label="Custo p/ empresa" value={fmt(resultado.custoEmpresa)} sub="base + TSU 23,75%" />
        <Chip label="Taxa efetiva" value={pct(resultado.taxaEfetiva)} sub="IRS + SS / base" />
        <Chip
          label="Líquido esperado"
          value={fmt(resultado.liquidoEsperado)}
          sub={
            Math.abs(resultado.liquidoEsperado - resultado.liquidoDeclarado) > 2
              ? `pelo recibo: ${fmt(resultado.liquidoDeclarado)}`
              : "após IRS e SS"
          }
        />
      </div>

      {resultado.alertas.length > 0 && (
        <ul className="space-y-2">
          {resultado.alertas.map((a, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-3 text-xs text-alert-text">
              <span className="mt-0.5 flex-shrink-0"><Warning size={12} /></span>
              {a}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-stone-400 leading-relaxed">
        Estimativa pelas tabelas do Despacho 233-A/2026 (Continente), conforme a situação familiar. Pequenas diferenças
        podem resultar de arredondamentos ou de acertos a meio do ano.
      </p>
    </m.div>
  );
}
