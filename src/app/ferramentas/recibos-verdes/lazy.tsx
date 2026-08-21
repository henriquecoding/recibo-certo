"use client";

// Ponte de carregamento diferido: `next/dynamic` com `ssr:false` só é
// permitido dentro de um Client Component, e o simulador integrado arrasta
// os motores fiscais inteiros. A página em si continua a ser servidor.

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function Esqueleto() {
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

const RecibosVerdesStudioDynamic = dynamic(
  () => import("@/components/recibos-verdes/RecibosVerdesStudio"),
  {
  ssr: false,
  loading: () => <Esqueleto />,
  },
);

export default function SimuladorRecibosVerdesLazy() {
  return (
    <ErrorBoundary etiqueta="o simulador de recibos verdes">
      <RecibosVerdesStudioDynamic />
    </ErrorBoundary>
  );
}
