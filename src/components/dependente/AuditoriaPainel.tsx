"use client";

// Painel de auditoria embutido no simulador de recibo de vencimento. Reutiliza
// os dados da simulação (situação, dependentes) e pede o que consta no recibo
// (IRS retido + Segurança Social), comparando com as tabelas oficiais de 2026.
// A auditoria manual é GRATUITA. Nada é guardado.
//
// Quando vem de um PDF importado, recebe a "remuneração sujeita" do recibo
// (base exata do esperado) e os valores declarados já preenchidos.

import { useState, useMemo } from "react";
import { auditarRecibo, type VencimentoInput } from "@/lib/fiscal-dependente";
import { ResultadoAuditoria } from "@/components/dependente/ResultadoAuditoria";
import { fmt } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { ShieldCheck } from "@/components/ui/Icons";

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

export function AuditoriaPainel({
  input,
  irsInicial = "",
  ssInicial = "",
  remuneracaoSujeita,
}: {
  input: VencimentoInput;
  irsInicial?: string;
  ssInicial?: string;
  remuneracaoSujeita?: number;
}) {
  const [irsStr, setIrsStr] = useState(irsInicial);
  const [ssStr, setSsStr] = useState(ssInicial);
  const [submetido, setSubmetido] = useState(!!(irsInicial && ssInicial));

  const resultado = useMemo(
    () => auditarRecibo({ ...input, irsDeclarado: num(irsStr), ssDeclarado: num(ssStr), remuneracaoSujeita }),
    [input, irsStr, ssStr, remuneracaoSujeita]
  );

  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900/40 shadow-card">
      {/* Cabeçalho da secção */}
      <div className="flex items-start gap-3 border-b border-stone-100 dark:border-stone-800 bg-gradient-to-br from-brand-light/60 to-transparent dark:from-brand/10 p-5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">Auditar o meu recibo</h3>
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Grátis</span>
            <InfoTip label="Como funciona">
              Compara o IRS retido e a Segurança Social do teu recibo com o que as tabelas oficiais de 2026 determinam.
              {remuneracaoSujeita
                ? ` Base do recibo: ${fmt(remuneracaoSujeita)} (remuneração sujeita).`
                : ` Base desta simulação: ${fmt(input.salarioBruto)} · ${input.dependentes ?? 0} dep.`}
            </InfoTip>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {remuneracaoSujeita
              ? `Confirma os valores do teu recibo (remuneração sujeita de ${fmt(remuneracaoSujeita)}) — comparamos com o esperado para 2026.`
              : "Introduz o IRS e a Segurança Social que constam no teu recibo e confrontamos com esta simulação."}
          </p>
        </div>
      </div>

      {/* Inputs + ação */}
      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="aud-irs" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              IRS retido no recibo
            </label>
            <div className="relative">
              <input id="aud-irs" type="text" inputMode="decimal" autoComplete="off" value={irsStr} onChange={(e) => setIrsStr(soDecimal(e.target.value))} placeholder="0" className={campo} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </div>
          <div>
            <label htmlFor="aud-ss" className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Segurança Social no recibo
            </label>
            <div className="relative">
              <input id="aud-ss" type="text" inputMode="decimal" autoComplete="off" value={ssStr} onChange={(e) => setSsStr(soDecimal(e.target.value))} placeholder="0" className={campo} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSubmetido(true)}
          className="btn-shine mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
        >
          <ShieldCheck size={15} /> Auditar o meu recibo
        </button>

        {submetido && (
          <div className="mt-4">
            <ResultadoAuditoria resultado={resultado} />
          </div>
        )}
      </div>
    </div>
  );
}
