"use client";

import { useState, useMemo } from "react";
import { auditarRecibo } from "@/lib/fiscal-dependente";
import { SS_DEPENDENTE } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { ResultadoAuditoria } from "@/components/dependente/ResultadoAuditoria";
import { ShieldCheck, Mail } from "@/components/ui/Icons";

const DEPENDENTES = [0, 1, 2, 3, 4];
const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

export function AuditoriaRecibo() {
  const { user } = useAuth();

  const [brutoStr, setBrutoStr] = useState("1500");
  const [dependentes, setDependentes] = useState(0);
  const [irsStr, setIrsStr] = useState("");
  const [ssStr, setSsStr] = useState("");
  const [submetido, setSubmetido] = useState(false);
  const [envio, setEnvio] = useState<"idle" | "a-enviar" | "enviado" | "erro">("idle");

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

  async function enviarPorEmail() {
    setEnvio("a-enviar");
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setEnvio("erro");
        return;
      }
      const res = await fetch("/api/email/auditoria", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          salarioBruto: num(brutoStr),
          dependentes,
          irsDeclarado: num(irsStr),
          ssDeclarado: num(ssStr),
        }),
      });
      setEnvio(res.ok ? "enviado" : "erro");
    } catch {
      setEnvio("erro");
    }
  }

  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Auditoria do recibo de vencimento</p>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Grátis</span>
      </div>

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
            <InfoTip label="Onde está">Linha &quot;Retenção IRS&quot; ou &quot;IRS&quot; do teu recibo de vencimento.</InfoTip>
          </label>
          <div className="relative">
            <input id="a-irs" type="text" inputMode="decimal" autoComplete="off" value={irsStr} onChange={(e) => setIrsStr(soDecimal(e.target.value))} placeholder="0" className={campo} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
          </div>
        </div>
        <div>
          <label htmlFor="a-ss" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
            Segurança Social no recibo{" "}
            <InfoTip label="Onde está">Linha &quot;Segurança Social&quot; do teu recibo ({pct(SS_DEPENDENTE.trabalhador.value)} do bruto).</InfoTip>
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
        <div className="mt-6 space-y-3">
          <ResultadoAuditoria resultado={resultado} />

          {user && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={enviarPorEmail}
                disabled={envio === "a-enviar" || envio === "enviado"}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-all hover:border-brand hover:text-brand disabled:opacity-60"
              >
                <Mail size={14} />
                {envio === "enviado" ? "Enviado" : envio === "a-enviar" ? "A enviar…" : "Enviar relatório por email"}
              </button>
              {envio === "erro" && <span className="text-xs text-alert-text dark:text-amber-400">Não foi possível enviar.</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
