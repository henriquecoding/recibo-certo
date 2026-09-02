"use client";

// ─────────────────────────────────────────────────────────────────────────
//  A fronteira de erro de um workspace.
//
//  Sem ela, uma falha num adaptador ou numa store deixava o PAINEL INTEIRO
//  em branco — e uma página em branco não distingue «rebentou a desenhar»
//  de «perdi os teus dados». Diz as duas coisas que importam: o que falhou
//  e que o trabalho continua onde estava.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Warning } from "@/components/ui/Icons";

export default function ErroWorkspace({
  etiqueta,
  error,
  reset,
}: {
  etiqueta: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`[painel] ${etiqueta} falhou`, error);
  }, [etiqueta, error]);

  return (
    <div className="mx-auto max-w-2xl rounded-4xl border border-alert-border bg-alert-bg p-8 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-alert-text/10 text-alert-text">
        <Warning size={20} />
      </span>
      <h1 className="font-display text-lg font-semibold text-alert-text">Não foi possível abrir {etiqueta}</h1>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-alert-text/80">
        O teu trabalho continua guardado onde estava — isto é uma falha a desenhar esta página, não uma perda de dados.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-alert-text px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Tentar outra vez
        </button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-alert-border px-4 py-2.5 text-sm font-semibold text-alert-text transition-colors hover:underline"
        >
          Voltar à visão geral <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
