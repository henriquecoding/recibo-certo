"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O que se diz a quem vai gerir (ou cancelar) a subscrição
//  ---------------------------------------------------------------------
//  O cancelamento acontece no portal do Stripe, fora daqui. Este é o
//  último momento em que somos nós a falar — e portanto o único em que
//  podemos dizer o que acontece aos dados.
//
//  Não é um obstáculo: o botão que continua está sempre disponível, tem o
//  mesmo peso visual, e não há contagens decrescentes nem texto a tentar
//  demover ninguém. É informação antes de uma decisão, que é o oposto de
//  um dark pattern — e é também o que permite exportar ANTES de sair, em
//  vez de descobrir tarde demais.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, Check, Close, Warning } from "@/components/ui/Icons";
import { DIAS_ATE_PURGA, DADOS_APAGADOS, DADOS_MANTIDOS } from "@/lib/plus/purga";

export default function AvisoCancelamento({
  aberto, aFechar, aContinuar,
}: {
  aberto: boolean;
  aFechar: () => void;
  aContinuar: () => void;
}) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const primeiroRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    primeiroRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); aFechar(); return; }
      if (e.key !== "Tab") return;
      // Foco preso: um modal que deixa sair o foco por baixo é um modal que
      // um leitor de ecrã atravessa sem saber que está lá.
      const focaveis = caixaRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focaveis?.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar, true);
    return () => document.removeEventListener("keydown", aoTeclar, true);
  }, [aberto, aFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-cancelar-titulo"
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl bg-white shadow-float dark:bg-stone-900 sm:rounded-4xl"
      >
        <div className="flex items-start gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:p-6">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <Lock size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="aviso-cancelar-titulo" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
              Antes de gerires a subscrição
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Se cancelares, o que está guardado na nuvem é apagado dos nossos servidores{" "}
              <strong className="text-stone-700 dark:text-stone-200">{DIAS_ATE_PURGA} dias depois</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={aFechar}
            aria-label="Fechar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
          >
            <Close size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600 dark:bg-stone-800/60 dark:text-stone-300">
            Não guardamos dados fiscais de quem já não usa o serviço. É a decisão mais segura para
            ti: dados que não guardamos não podem ser expostos se alguma coisa correr mal do nosso
            lado.
          </p>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-alert-text">
              <Warning size={12} /> Apagado ao fim de {DIAS_ATE_PURGA} dias
            </p>
            <ul className="space-y-1.5">
              {DADOS_APAGADOS.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-alert-text" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark dark:text-brand">
              <Check size={12} /> Não é tocado
            </p>
            <ul className="space-y-1.5">
              {DADOS_MANTIDOS.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Tens {DIAS_ATE_PURGA} dias para exportar o que quiseres levar, ou para voltar atrás —
            se resubscreveres dentro desse prazo, nada é apagado. Cancelar a subscrição não apaga a
            tua conta.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-stone-100 p-5 dark:border-stone-800 sm:flex-row-reverse sm:p-6">
          <button
            ref={primeiroRef}
            type="button"
            onClick={aContinuar}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Continuar para a gestão
          </button>
          <Link
            href="/dashboard/cenarios"
            onClick={aFechar}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-300"
          >
            Exportar primeiro
          </Link>
        </div>
      </div>
    </div>
  );
}
