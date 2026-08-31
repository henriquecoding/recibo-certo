"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O contador dos lugares vitalícios
//  ---------------------------------------------------------------------
//  Ilha de cliente minúscula, de propósito: a página de planos é servida
//  estaticamente e não vale a pena torná-la dinâmica por causa de um
//  número. O cartão aparece logo; o contador chega a seguir.
//
//  Este contador NÃO é o limite. O limite é um gatilho na base de dados,
//  que corre dentro da transação da compra. Aqui só se explica — e
//  desativa-se o botão, que é uma cortesia, não uma garantia.
//
//  ── Porque é que o pedido espera pelo ecrã ───────────────────────────
//
//  O cartão de planos vive muito abaixo da dobra e está nas CINCO leituras
//  editoriais da homepage. Pedir à montagem queria dizer um `fetch` dentro
//  do pico de hidratação de cada rota — e outro dentro da tarefa que faz o
//  commit de cada troca de foco, onde o orçamento é de 100 ms. Um número
//  que só se lê quando se chega ao cartão não tem de competir com isso.
//
//  Não é adiamento cosmético: o benchmark falha se uma troca de foco tocar
//  na nossa API (`apiNaTroca`, em `scripts/medir-desempenho.mjs`).
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Lock } from "@/components/ui/Icons";
import { usePerto } from "@/lib/use-perto";
import { textoLugares, type LugaresVitalicios } from "@/lib/plus/vitalicio";

export default function ContadorVitalicio({ cta }: { cta: string }) {
  const [lugares, setLugares] = useState<LugaresVitalicios | null>(null);
  const { ref, perto } = usePerto<HTMLDivElement>("400px 0px");

  useEffect(() => {
    if (!perto) return;
    let vivo = true;
    fetch("/api/vitalicio/lugares")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d) setLugares(d as LugaresVitalicios); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [perto]);

  // A leitura também pode falhar. Nesse estado não enviamos ninguém para um
  // pagamento que não conseguimos validar; o checkout repete a verificação.
  const aCarregar = lugares === null;
  const indisponivel = aCarregar || lugares?.verificado === false;
  const esgotado = lugares?.esgotado ?? false;
  const percentagem = lugares
    ? Math.min(100, Math.round((lugares.ocupados / Math.max(lugares.total, 1)) * 100))
    : 0;

  return (
    <>
      {/* Barra de lugares. Enquanto não se sabe, fica um espaço reservado
          com a mesma altura — senão o cartão salta quando o número chega. */}
      <div ref={ref} className="mt-4 min-h-[3.25rem]">
        {lugares ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className={`text-xs font-semibold ${esgotado ? "text-alert-text" : "text-stone-600 dark:text-stone-300"}`}>
                {textoLugares(lugares)}
              </span>
              <span className="text-xs tabular-nums text-stone-400">
                {lugares.ocupados}/{lugares.total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={lugares.ocupados}
              aria-valuemin={0}
              aria-valuemax={lugares.total}
              aria-label="Lugares vitalícios ocupados"
              className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${esgotado ? "bg-alert-text" : "bg-brand"}`}
                style={{ width: `${Math.max(percentagem, 1)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs font-medium text-stone-400">A confirmar disponibilidade…</p>
        )}
      </div>

      {esgotado || indisponivel ? (
        <>
          <span
            aria-disabled="true"
            className="mt-6 inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-400 dark:border-stone-700 dark:text-stone-500"
          >
            <Lock size={15} /> {aCarregar
              ? "A confirmar lugares"
              : indisponivel ? "Temporariamente indisponível" : "Lugares esgotados"}
          </span>
          <p className="mt-2 text-center text-xs text-stone-400">
            {aCarregar
              ? "O botão fica disponível assim que o limite for confirmado."
              : indisponivel
              ? "Não foi possível confirmar os lugares. Tenta novamente daqui a pouco."
              : "O Plus mensal continua disponível, com tudo o que o vitalício dava."}
          </p>
        </>
      ) : (
        <>
          <Link
            href="/dashboard/upgrade?modalidade=vitalicio"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-brand px-5 py-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand hover:text-white dark:text-brand"
          >
            {cta}
          </Link>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
            <Check size={12} className="text-brand" /> Pagamento único · sem renovação
          </p>
        </>
      )}
    </>
  );
}
