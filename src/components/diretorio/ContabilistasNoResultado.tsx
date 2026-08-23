"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A PONTE — dentro do resultado, e só quando há resultado
//  ---------------------------------------------------------------------
//  Chama-se «no resultado» e não «no fim» porque o sítio mudou, e a
//  diferença não é de arrumação: esteve durante uma versão no rodapé da
//  página, depois dos guias e das ferramentas relacionadas. Aí competia
//  com navegação e chegava tarde. A decisão «isto merece uma pessoa»
//  toma-se com o número à vista, no fim da simulação — não oito mil pixels
//  abaixo dele.
//
//  Três coisas acontecem aqui, e nenhuma na secção pesada:
//
//   1. **A necessidade vem do contexto** (ver `contexto.tsx`). Fora de uma
//      ferramenta não há contexto, e não se desenha nada — é o que faz as
//      mesmas calculadoras, quando embutidas em guias, não trazerem
//      cartões atrás.
//
//   2. **`pronto` é a fronteira do resultado.** Uma ferramenta com o
//      formulário em branco ainda não é uma pergunta; oferecer um
//      contabilista aí é oferecer ajuda para nada. Cada ferramenta passa a
//      sua própria definição de «já há resultado».
//
//   3. **`next/dynamic` com `ssr:false` só é permitido dentro de um Client
//      Component**, e a secção arrasta o cliente do Supabase, a
//      autenticação e o motor de afinidade. O observador monta-a quando o
//      sentinela se aproxima do ecrã, com `rootMargin` suficiente para o
//      pedido já ter chegado quando ela aparece.
//
//  Sem `IntersectionObserver` (browsers antigos, ambientes de teste), a
//  secção monta-se de imediato: mais vale carregar cedo do que nunca.
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { Necessidade } from "@/lib/contabilistas/afinidade/tipos";
import { useNecessidade } from "./contexto";

const Seccao = dynamic(() => import("./ContabilistasParaEsteResultado"), { ssr: false });

/** Quanto antes da dobra é que vale a pena começar a carregar. */
const MARGEM = "600px";

export default function ContabilistasNoResultado({
  pronto = true,
  necessidade: explicita,
  className,
}: {
  /**
   * Já há um resultado no ecrã?
   *
   * Por omissão sim — quem coloca isto dentro de um bloco que só existe
   * com resultado já respondeu à pergunta pela colocação. Quem o coloca
   * num bloco sempre presente tem de responder aqui.
   */
  pronto?: boolean;
  /** Para quem não está dentro de um `ToolShell` e sabe o que pede. */
  necessidade?: Necessidade;
  className?: string;
}) {
  const doContexto = useNecessidade();
  const necessidade = explicita ?? doContexto;

  const [perto, setPerto] = useState(false);
  const sentinela = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (perto || !pronto) return;
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
  }, [perto, pronto]);

  if (!necessidade || !pronto) return null;

  return (
    <div ref={sentinela} className={className}>
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
