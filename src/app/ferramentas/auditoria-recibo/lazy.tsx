"use client";

// Chunk próprio + fronteira de erro (§13.2). O componente arrasta os motores
// fiscais; importado estaticamente, entrava no JavaScript inicial de uma
// página cujo conteúdo útil de topo é editorial. E uma falha em runtime
// deixava a landing inteira em branco em vez de só a ferramenta.

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

const AuditoriaDynamic = dynamic(
  () => import("@/components/dependente/AuditoriaRecibo").then((m) => m.AuditoriaRecibo),
  { ssr: false, loading: () => <Esqueleto /> },
);

export default function AuditoriaReciboLazy() {
  return (
    <ErrorBoundary etiqueta="a auditoria do recibo">
      <AuditoriaDynamic />
    </ErrorBoundary>
  );
}
