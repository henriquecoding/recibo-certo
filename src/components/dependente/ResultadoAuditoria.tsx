"use client";

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import type { AuditoriaResult } from "@/lib/fiscal-dependente";
import { fmt } from "@/lib/format";
import { Check, Warning } from "@/components/ui/Icons";

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
