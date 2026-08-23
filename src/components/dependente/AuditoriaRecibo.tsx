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
import { parseNumericDraft, sanitizeNumericDraft } from "@/lib/numeric-input";
import ContabilistasNoResultado from "@/components/diretorio/ContabilistasNoResultado";

const MAX_DEPENDENTES = 20;
const num = (s: string) => Math.max(0, parseNumericDraft(s) ?? 0);
const soDecimal = (s: string) => sanitizeNumericDraft(s);

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
          {/* Um botão «4+» que enviava exatamente 4 ao motor auditava quem tem
              cinco dependentes com a retenção de quem tem quatro. O campo passa
              a aceitar o número real. */}
          <label htmlFor="a-dependentes" className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">Dependentes</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Menos dependentes"
              onClick={() => setDependentes(Math.max(0, dependentes - 1))}
              disabled={dependentes <= 0}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-semibold leading-none text-stone-600 transition hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            >
              −
            </button>
            <input
              id="a-dependentes"
              type="text"
              inputMode="numeric"
              value={String(dependentes)}
              onChange={(e) => {
                const parsed = parseNumericDraft(sanitizeNumericDraft(e.target.value, { maxDecimals: 0 }), { maxDecimals: 0 });
                setDependentes(parsed === null ? 0 : Math.min(MAX_DEPENDENTES, Math.max(0, Math.floor(parsed))));
              }}
              className={`${campo} text-center tabular-nums`}
            />
            <button
              type="button"
              aria-label="Mais dependentes"
              onClick={() => setDependentes(Math.min(MAX_DEPENDENTES, dependentes + 1))}
              disabled={dependentes >= MAX_DEPENDENTES}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-semibold leading-none text-stone-600 transition hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            >
              +
            </button>
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

      {/* Só depois de submeter: antes disso não há auditoria, e um recibo
          com um desconto errado é precisamente o caso em que vale a pena
          falar com alguém. */}
      <ContabilistasNoResultado pronto={submetido} />
    </div>
  );
}
