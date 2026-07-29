"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Carregamento diferido do simulador e da demo.
//
//  A página é servida como Server Component, mas `next/dynamic` com
//  `ssr: false` só é permitido dentro de um Client Component — daí este
//  ficheiro-ponte.
//
//  Porquê: `SimuladorIRS` arrasta `fiscal.ts`, `fiscal-data.ts` e
//  `irs-guiado.ts` — centenas de KB de JavaScript que, importados
//  estaticamente, bloqueavam a primeira pintura de uma página cujo conteúdo
//  útil (o hero e a demo) está muito acima do simulador. O simulador vive
//  abaixo da dobra, atrás de uma âncora `#simulador`: só precisa de estar
//  pronto quando o utilizador lá chega.
//
//  O padrão já é usado noutras páginas pesadas (`SimuladorIntegrado`,
//  `ComparadorCenarios`, `ExplorarSecao`) — faltava aqui.
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

/** Esqueleto com a altura aproximada do simulador, para não saltar o layout. */
function EsqueletoSimulador() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-12 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <div className="h-64 rounded-4xl bg-stone-100 dark:bg-stone-800" />
          <div className="h-40 rounded-4xl bg-stone-100 dark:bg-stone-800" />
        </div>
        <div className="h-80 rounded-4xl bg-stone-100 dark:bg-stone-800" />
      </div>
    </div>
  );
}

function EsqueletoDemo() {
  return (
    <div
      className="h-[26rem] w-full max-w-md animate-pulse rounded-4xl bg-stone-100 dark:bg-stone-800"
      aria-hidden="true"
    />
  );
}

const SimuladorIRSDynamic = dynamic(() => import("@/components/simulador/SimuladorIRS"), {
  ssr: false,
  loading: () => <EsqueletoSimulador />,
});

const DemoIRSDynamic = dynamic(() => import("@/components/simulador/DemoIRS"), {
  ssr: false,
  loading: () => <EsqueletoDemo />,
});

/**
 * O `ErrorBoundary` garante que uma falha no simulador não deixa a página em
 * branco: o conteúdo editorial à volta (guias, FAQ, anexos) continua a servir.
 */
export function SimuladorIRSLazy() {
  return (
    <ErrorBoundary>
      <SimuladorIRSDynamic semCabecalho />
    </ErrorBoundary>
  );
}

export function DemoIRSLazy() {
  return (
    <ErrorBoundary>
      <DemoIRSDynamic />
    </ErrorBoundary>
  );
}
