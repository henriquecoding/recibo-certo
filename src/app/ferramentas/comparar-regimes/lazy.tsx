"use client";

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function Esqueleto() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-72 rounded-4xl bg-stone-100 dark:bg-stone-800" />
        <div className="h-72 rounded-4xl bg-stone-100 dark:bg-stone-800" />
        <div className="h-72 rounded-4xl bg-stone-100 dark:bg-stone-800" />
      </div>
    </div>
  );
}

const ComparadorDynamic = dynamic(() => import("@/components/comparar/ComparadorCenarios"), {
  ssr: false,
  loading: () => <Esqueleto />,
});

export default function ComparadorLazy() {
  return (
    <ErrorBoundary etiqueta="o comparador de regimes">
      <ComparadorDynamic />
    </ErrorBoundary>
  );
}
