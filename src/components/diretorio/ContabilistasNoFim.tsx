"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A PONTE — a secção só existe quando alguém lá chega
//  ---------------------------------------------------------------------
//  Duas razões para esta camada, e nenhuma delas é estética:
//
//   1. **`next/dynamic` com `ssr:false` só é permitido dentro de um Client
//      Component**, e o `ToolShell` é servidor. É o mesmo ficheiro-ponte
//      que as ferramentas pesadas já usam (`app/ferramentas/*/lazy.tsx`).
//
//   2. **A secção vive no fim da página.** Importá-la estaticamente
//      arrastaria o cliente do Supabase, a autenticação e o motor de
//      afinidade para o pacote inicial de dezasseis ferramentas — para
//      desenhar uma coisa que a maioria das pessoas nunca chega a ver. O
//      observador monta-a quando o sentinela se aproxima do ecrã, com
//      `rootMargin` suficiente para o pedido já ter chegado quando a
//      secção aparece.
//
//  Sem `IntersectionObserver` (browsers antigos, ambientes de teste), a
//  secção monta-se de imediato: mais vale carregar cedo do que nunca.
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { Necessidade } from "@/lib/contabilistas/afinidade/tipos";

const Seccao = dynamic(() => import("./ContabilistasParaEsteResultado"), { ssr: false });

/** Quanto antes da dobra é que vale a pena começar a carregar. */
const MARGEM = "600px";

export default function ContabilistasNoFim({ necessidade }: { necessidade: Necessidade }) {
  const [perto, setPerto] = useState(false);
  const sentinela = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (perto) return;
    const alvo = sentinela.current;
    if (!alvo || typeof IntersectionObserver === "undefined") {
      setPerto(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setPerto(true);
          observador.disconnect();
        }
      },
      { rootMargin: MARGEM },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [perto]);

  return (
    <div ref={sentinela}>
      {perto && (
        // Uma falha aqui não pode levar o resultado fiscal com ela: a
        // ferramenta já respondeu à pergunta da pessoa, e isto é o que vem
        // depois.
        <ErrorBoundary etiqueta="os contabilistas para este resultado">
          <Seccao necessidade={necessidade} />
        </ErrorBoundary>
      )}
    </div>
  );
}
