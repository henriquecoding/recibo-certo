"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Close, Check, Lock, ShieldCheck } from "@/components/ui/Icons";
import FizActionButton from "./FizActionButton";
import { FizMarca } from "./FizLogo";
import FizDisclosure from "./FizDisclosure";

// ─────────────────────────────────────────────────────────────────────────
//  Diálogo de consentimento do handoff.
//
//  Regras invioláveis (ponto 8.3 da arquitetura, 8.5 da auditoria):
//    · mostra os CAMPOS EXATOS e os respetivos valores antes de enviar;
//    · NENHUM consentimento vem pré-selecionado;
//    · recusar não faz perder a simulação;
//    · identifica as duas entidades e a finalidade;
//    · enviar é gratuito — não há verificação de plano em lado nenhum.
//
//  Mobile-first: folha inferior a partir de 360px, diálogo centrado em sm+.
// ─────────────────────────────────────────────────────────────────────────

export interface CampoConsentimento {
  campo: string;
  rotulo: string;
  valor: string;
}

interface FizConsentDialogProps {
  aberto: boolean;
  aoFechar: () => void;
  campos: CampoConsentimento[];
  /** O que o utilizador vai conseguir fazer na FIZ a seguir. */
  finalidade: string;
  divulgacao: string;
  camposNuncaEnviados: readonly string[];
  ocupado?: boolean;
  erro?: string | null;
  aoAutorizar: (camposAutorizados: string[]) => void;
}

export default function FizConsentDialog({
  aberto,
  aoFechar,
  campos,
  finalidade,
  divulgacao,
  camposNuncaEnviados,
  ocupado = false,
  erro = null,
  aoAutorizar,
}: FizConsentDialogProps) {
  // Começa VAZIO — nada pré-selecionado, por decisão de produto.
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto) setSelecionados([]);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    painel.current?.focus();
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const alternar = (campo: string) =>
    setSelecionados((atual) => (atual.includes(campo) ? atual.filter((c) => c !== campo) : [...atual, campo]));

  const nenhumSelecionado = selecionados.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-4xl border border-fiz-200 bg-white shadow-float outline-none dark:bg-stone-900 sm:rounded-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-fiz-200 bg-fiz-50 px-5 py-4 rounded-t-4xl">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fiz-700">
              <span>ReciboCerto</span>
              <span aria-hidden>→</span>
              <FizMarca size={14} />
            </div>
            <h2 id={tituloId} className="font-display text-lg font-semibold text-ink">
              O que vais enviar para a FIZ
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{finalidade}</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar sem enviar"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-white/70 hover:text-stone-800 dark:hover:bg-stone-800"
          >
            <Close size={16} />
          </button>
        </div>

        {/* Corpo scrollável */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
              Escolhe o que autorizas. Nada está selecionado à partida.
            </legend>
            <ul className="space-y-2">
              {campos.map((c) => {
                const ativo = selecionados.includes(c.campo);
                return (
                  <li key={c.campo}>
                    <label
                      className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                        ativo
                          ? "border-fiz-400 bg-fiz-50"
                          : "border-stone-200 bg-white hover:border-fiz-300 dark:border-stone-700 dark:bg-stone-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={() => alternar(c.campo)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                          ativo ? "border-fiz-600 bg-fiz text-fiz-ink" : "border-stone-300 dark:border-stone-600"
                        }`}
                      >
                        {ativo && <Check size={12} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-stone-800 dark:text-stone-100">{c.rotulo}</span>
                        <span className="mt-0.5 block break-words text-xs text-stone-500 dark:text-stone-400">{c.valor}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {/* O que nunca sai daqui — tão importante como o que sai. */}
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
              <Lock size={13} className="text-brand" /> O que nunca enviamos
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              {camposNuncaEnviados.join(" · ")}.
            </p>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-brand" />
            <span>
              Enviar é gratuito e não depende de subscrição. Se recusares, a tua simulação
              mantém-se aqui, intacta.
            </span>
          </p>

          {erro && (
            <p role="alert" className="mt-3 rounded-xl bg-clay-bg px-3 py-2 text-xs text-clay-text">
              {erro}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-stone-200 px-5 py-4 dark:border-stone-700">
          <FizDisclosure texto={divulgacao} className="mb-3" />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoFechar}
              className="min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Não enviar
            </button>
            <FizActionButton
              onClick={() => aoAutorizar(selecionados)}
              desativado={nenhumSelecionado}
              ocupado={ocupado}
            >
              {nenhumSelecionado ? "Escolhe o que enviar" : `Autorizar e continuar (${selecionados.length})`}
            </FizActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
