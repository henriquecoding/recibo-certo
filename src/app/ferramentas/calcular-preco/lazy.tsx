"use client";

// Chunk próprio + fronteira de erro (§13.2). O simulador arrasta a engine
// de preço e, com ela, `fiscal-data.ts` e os motores de IRS e Segurança
// Social. Importado estaticamente, entrava no JavaScript inicial de uma
// página cujo topo é editorial — e uma falha em runtime deixava a landing
// inteira em branco em vez de só a ferramenta.

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function Esqueleto() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-20 rounded-4xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}

const SimuladorDynamic = dynamic(() => import("@/components/precos/SimuladorPreco"), {
  ssr: false,
  loading: () => <Esqueleto />,
});

export default function SimuladorPrecoLazy({ cenarioInicial }: { cenarioInicial?: string | null }) {
  return (
    <ErrorBoundary etiqueta="o simulador de preço">
      <SimuladorDynamic cenarioInicial={cenarioInicial} />
    </ErrorBoundary>
  );
}
