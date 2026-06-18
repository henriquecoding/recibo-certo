"use client";

// Painel de auditoria embutido no simulador de recibo de vencimento. Reutiliza
// os dados da simulação atual (bruto, dependentes, situação, subsídio) e pede
// apenas o que consta no recibo (IRS retido + Segurança Social), comparando com
// as tabelas oficiais de 2026. A auditoria manual é GRATUITA. Nada é guardado.

import { useState, useMemo } from "react";
import { auditarRecibo, type VencimentoInput } from "@/lib/fiscal-dependente";
import { ResultadoAuditoria } from "@/components/dependente/ResultadoAuditoria";
import { fmt } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { ShieldCheck } from "@/components/ui/Icons";

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

export function AuditoriaPainel({ input }: { input: VencimentoInput }) {
  const [irsStr, setIrsStr] = useState("");
  const [ssStr, setSsStr] = useState("");
  const [submetido, setSubmetido] = useState(false);

  const resultado = useMemo(
    () => auditarRecibo({ ...input, irsDeclarado: num(irsStr), ssDeclarado: num(ssStr) }),
    [input, irsStr, ssStr]
  );

  const subCard = "rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40 p-4";
  const eyebrow = "text-[11px] font-semibold uppercase tracking-wide text-stone-400";
  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className={subCard}>
      <div className="mb-1 flex items-center gap-1.5">
        <ShieldCheck size={14} className="text-brand" />
        <p className={eyebrow}>Auditar o meu recibo</p>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Grátis</span>
        <InfoTip label="Como funciona">
          Compara o IRS retido e a Segurança Social do teu recibo com o que as tabelas oficiais de 2026 determinam para
          esta simulação ({fmt(input.salarioBruto)} · {input.dependentes ?? 0} dep.). Assinala divergências acima de uma
          pequena tolerância de arredondamento.
        </InfoTip>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-stone-400">
        Introduz os valores que constam no teu recibo para os confrontarmos com esta simulação.
      </p>

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
  );
}
