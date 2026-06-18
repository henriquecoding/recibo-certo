"use client";

// Painel de auditoria embutido no simulador de recibo de vencimento. Reutiliza
// os dados da simulação atual (bruto, dependentes, situação, subsídio) e pede
// apenas o que consta no recibo (IRS retido + Segurança Social), comparando com
// as tabelas oficiais de 2026. Mesmo tiering vinculado à conta da página
// dedicada: 1.ª auditoria grátis (com conta) · as seguintes são Pro.

import { useState, useMemo } from "react";
import Link from "next/link";
import { auditarRecibo, type VencimentoInput } from "@/lib/fiscal-dependente";
import { useAuditorias } from "@/lib/store/auditorias";
import { ResultadoAuditoria } from "@/components/dependente/ResultadoAuditoria";
import { fmt } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { ShieldCheck, Lock, Sparkle } from "@/components/ui/Icons";

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
const soDecimal = (s: string) => s.replace(/[^\d.,]/g, "");

export function AuditoriaPainel({ input }: { input: VencimentoInput }) {
  const { carregado, ehPro, podeAuditar, precisaLogin, precisaPro, registar, abrirLogin } = useAuditorias();

  const [irsStr, setIrsStr] = useState("");
  const [ssStr, setSsStr] = useState("");
  const [submetido, setSubmetido] = useState(false);
  const [registado, setRegistado] = useState(false);

  const resultado = useMemo(
    () => auditarRecibo({ ...input, irsDeclarado: num(irsStr), ssDeclarado: num(ssStr) }),
    [input, irsStr, ssStr]
  );

  function aoAuditar() {
    if (precisaLogin) {
      abrirLogin();
      return;
    }
    if (precisaPro) return;
    setSubmetido(true);
    if (!registado) {
      setRegistado(true);
      void registar({
        salarioBruto: input.salarioBruto,
        dependentes: input.dependentes ?? 0,
        irsDeclarado: num(irsStr),
        ssDeclarado: num(ssStr),
        tudoOk: resultado.tudoOk,
      });
    }
  }

  const subCard = "rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-800/40 p-4";
  const eyebrow = "text-[11px] font-semibold uppercase tracking-wide text-stone-400";
  const campo =
    "w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand";

  return (
    <div className={subCard}>
      <div className="mb-1 flex items-center gap-1.5">
        <ShieldCheck size={14} className="text-brand" />
        <p className={eyebrow}>Auditar o meu recibo</p>
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

      <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
        <ShieldCheck size={13} className="text-brand" />
        {!carregado
          ? "A preparar a auditoria…"
          : ehPro
          ? "Auditorias ilimitadas — plano Pro."
          : precisaLogin
          ? "A 1.ª auditoria é grátis para quem tem conta. As seguintes são Pro."
          : podeAuditar
          ? "Tens 1 auditoria grátis na tua conta. As seguintes são Pro."
          : "Já usaste a tua auditoria grátis. As seguintes são Pro."}
      </p>

      {precisaPro ? (
        <div className="mt-3 rounded-xl border border-brand/20 bg-brand-light p-4 text-center">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-white"><Lock size={16} /></span>
          <p className="mt-2 text-sm font-semibold text-brand-dark">Já usaste a tua auditoria grátis</p>
          <p className="mt-1 text-xs text-brand-dark/80">Com o plano Pro auditas o teu recibo sempre que precisares.</p>
          <Link
            href="/precos"
            className="btn-shine mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            Ver o plano Pro
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={aoAuditar}
          disabled={!carregado}
          className="btn-shine mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float disabled:opacity-60"
        >
          {precisaLogin ? <Sparkle size={15} /> : <ShieldCheck size={15} />}
          {precisaLogin ? "Entrar para auditar grátis" : "Auditar o meu recibo"}
        </button>
      )}

      {submetido && !precisaPro && (
        <div className="mt-4 space-y-3">
          <ResultadoAuditoria resultado={resultado} />
          {!ehPro && (
            <p className="rounded-xl border border-brand/20 bg-brand-light px-3 py-2 text-xs text-brand-dark">
              Esta foi a tua auditoria grátis. Para auditares sempre que quiseres,{" "}
              <Link href="/precos" className="font-semibold underline underline-offset-2">passa a Pro</Link>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
