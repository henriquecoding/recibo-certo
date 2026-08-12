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
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Lock } from "@/components/ui/Icons";
import { textoLugares, type LugaresVitalicios } from "@/lib/plus/vitalicio";

export default function ContadorVitalicio({ cta }: { cta: string }) {
  const [lugares, setLugares] = useState<LugaresVitalicios | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/vitalicio/lugares")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d) setLugares(d as LugaresVitalicios); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const esgotado = lugares?.esgotado ?? false;
  const percentagem = lugares
    ? Math.min(100, Math.round((lugares.ocupados / Math.max(lugares.total, 1)) * 100))
    : 0;

  return (
    <>
      {/* Barra de lugares. Enquanto não se sabe, fica um espaço reservado
          com a mesma altura — senão o cartão salta quando o número chega. */}
      <div className="mt-4 min-h-[3.25rem]">
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
        ) : null}
      </div>

      {esgotado ? (
        <>
          <span
            aria-disabled="true"
            className="mt-6 inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-400 dark:border-stone-700 dark:text-stone-500"
          >
            <Lock size={15} /> Lugares esgotados
          </span>
          <p className="mt-2 text-center text-xs text-stone-400">
            O Plus mensal continua disponível, com tudo o que o vitalício dava.
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
