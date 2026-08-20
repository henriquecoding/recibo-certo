"use client";

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const Studio = dynamic(() => import("@/components/negocio/DescobrirNegocioStudio"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-64 rounded-4xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-48 rounded-4xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-48 rounded-4xl bg-stone-100 dark:bg-stone-800" />
    </div>
  ),
});

export default function DescobrirNegocioLazy() {
  return <ErrorBoundary etiqueta="o motor de oportunidades"><Studio /></ErrorBoundary>;
}
