"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { auditarRecibo } from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { useSubscricao } from "@/lib/stripe/subscription";
import { Check, Warning, ShieldCheck, Lock } from "@/components/ui/Icons";

const DEPENDENTES = [0, 1, 2, 3, 4];
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

export function AuditoriaRecibo() {
  const { plano } = useSubscricao();
  const ehPro = plano === "pro";

  const [brutoStr, setBrutoStr] = useState("1500");
  const [dependentes, setDependentes] = useState(0);
  const [irsStr, setIrsStr] = useState("");
  const [ssStr, setSsStr] = useState("");
  const [submetido, setSubmetido] = useState(false);

  const resultado = useMemo(
    () =>
      auditarRecibo({
        salarioBruto: num(brutoStr),
        dependentes,
        irsDeclarado: num(irsStr),
        ssDeclarado: num(ssStr),
      }),
    [brutoStr, dependentes, irsStr, ssStr]
  );

  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Auditoria do recibo de vencimento
      </p>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="a-bruto" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Salário bruto mensal
          </label>
          <div className="relative">
            <input id="a-bruto" type="text" inputMode="decimal" autoComplete="off" value={brutoStr} onChange={(e) => setBrutoStr(soDecimal(e.target.value))} className={campo} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
        </div>
        <div>
          <span className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">Dependentes</span>
          <div className="flex gap-1.5" role="group" aria-label="Número de dependentes">
            {DEPENDENTES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={dependentes === d}
                onClick={() => setDependentes(d)}
                className={`flex-1 rounded-xl border px-2 py-2.5 text-sm font-semibold transition-all ${
                  dependentes === d
                    ? "border-brand bg-brand text-white shadow-glow"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-brand"
                }`}
              >
                {d === 4 ? "4+" : d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="a-irs" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            IRS retido no recibo{" "}
            <InfoTip label="Onde está">Linha "Retenção IRS" ou "IRS" do teu recibo de vencimento.</InfoTip>
          </label>
          <div className="relative">
            <input id="a-irs" type="text" inputMode="decimal" autoComplete="off" value={irsStr} onChange={(e) => setIrsStr(soDecimal(e.target.value))} placeholder="0" className={campo} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
        </div>
        <div>
          <label htmlFor="a-ss" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Segurança Social no recibo{" "}
            <InfoTip label="Onde está">Linha "Segurança Social" do teu recibo ({pct(SS_DEPENDENTE.trabalhador.value)} do bruto).</InfoTip>
          </label>
          <div className="relative">
            <input id="a-ss" type="text" inputMode="decimal" autoComplete="off" value={ssStr} onChange={(e) => setSsStr(soDecimal(e.target.value))} placeholder="0" className={campo} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSubmetido(true)}
        className="btn-shine mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
      >
        <ShieldCheck size={16} /> Auditar o meu recibo
      </button>

      {/* Resultado */}
      {submetido && (
        ehPro ? (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mt-6 space-y-3"
          >
            <div
              className={`flex items-center gap-2.5 rounded-2xl border p-4 ${
                resultado.tudoOk
                  ? "border-brand/30 bg-brand-light"
                  : "border-alert-border bg-alert-bg"
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

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
                <p className="text-xs text-stone-400 mb-1">Segurança Social esperada</p>
                <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(resultado.ssEsperado)}</p>
                <p className={`text-xs mt-0.5 ${resultado.ssOk ? "text-brand" : "text-alert-text dark:text-amber-400"}`}>
                  {resultado.ssOk ? "Corresponde" : `Diverge ${fmt(Math.abs(resultado.ssDiferenca))}`}
                </p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4">
                <p className="text-xs text-stone-400 mb-1">IRS esperado</p>
                <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">{fmt(resultado.irsEsperado)}</p>
                <p className={`text-xs mt-0.5 ${resultado.irsOk ? "text-brand" : "text-alert-text dark:text-amber-400"}`}>
                  {resultado.irsOk ? "Corresponde" : `Diverge ${fmt(Math.abs(resultado.irsDiferenca))}`}
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
              Estimativa pela Tabela I (não casado ou casado, dois titulares), Continente. Pequenas
              diferenças podem resultar de arredondamentos ou de acertos a meio do ano.
            </p>
          </m.div>
        ) : (
          <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-light p-5 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white"><Lock size={18} /></span>
            <p className="mt-3 text-sm font-semibold text-brand-dark">A auditoria é uma funcionalidade Pro</p>
            <p className="mt-1 text-xs text-brand-dark/80">
              Vê de imediato se a Segurança Social e a retenção de IRS do teu recibo batem certo com as tabelas de 2026.
            </p>
            <Link
              href="/precos"
              className="btn-shine mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5"
            >
              Ver o plano Pro
            </Link>
          </div>
        )
      )}
    </div>
  );
}
