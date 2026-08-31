"use client";

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const Planeador = dynamic(() => import("@/components/contratacao/PlaneadorContratacao"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-52 rounded-3xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-64 rounded-3xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-52 rounded-3xl bg-stone-100 dark:bg-stone-800" />
    </div>
  ),
});

export default function PlaneadorContratacaoLazy({ hoje }: { hoje: string }) {
  return (
    <ErrorBoundary etiqueta="o planeador de contratação">
      <Planeador hoje={hoje} />
    </ErrorBoundary>
  );
}
