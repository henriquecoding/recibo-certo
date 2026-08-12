"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Atalhos de intenção do hero — melhoria progressiva
//  ---------------------------------------------------------------------
//  São âncoras a sério (`<a href>`): renderizam no servidor, funcionam sem
//  JavaScript, são partilháveis e abrem em separador novo com o botão do
//  meio. Com JavaScript, o clique é intercetado para filtrar na hora, sem
//  ir à rede — o requisito de «menos de 100 ms» (§13.3).
//
//  A sincronização com a grelha faz-se pelo mesmo canal que o back/forward
//  já usa: `history.pushState` seguido de um evento `popstate`. Não é
//  preciso estado partilhado, contexto nem um segundo mecanismo — a ilha
//  da grelha já sabe reagir a isto.
// ═══════════════════════════════════════════════════════════════════════

import type { MouseEvent } from "react";
import { ArrowRight } from "@/components/ui/Icons";
import { ROTULO_INTENT_CURTO, type ToolIntent } from "@/lib/ferramentas";

const ATALHOS: Array<{ objetivo: ToolIntent; rotulo: string }> = [
  { objetivo: "calcular", rotulo: "Calcular o líquido" },
  { objetivo: "comparar", rotulo: "Comparar opções" },
  { objetivo: "verificar", rotulo: "Verificar um recibo" },
  { objetivo: "cumprir", rotulo: "Cumprir uma obrigação" },
];

export default function AtalhosIntencao() {
  const aoClicar = (e: MouseEvent<HTMLAnchorElement>, objetivo: ToolIntent) => {
    // Só interceta o clique simples com o botão principal: Ctrl/Cmd/Shift e
    // o botão do meio continuam a abrir noutro separador, como se espera.
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    window.history.pushState(null, "", `/ferramentas?objetivo=${objetivo}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    document.getElementById("todas")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <nav aria-label="Atalhos por objetivo" className="mt-6 flex flex-wrap gap-2">
      {ATALHOS.map(({ objetivo, rotulo }) => (
        <a
          key={objetivo}
          href={`/ferramentas?objetivo=${objetivo}`}
          onClick={(e) => aoClicar(e, objetivo)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          <span className="sr-only">{ROTULO_INTENT_CURTO[objetivo]}: </span>
          {rotulo}
          <ArrowRight size={14} />
        </a>
      ))}
    </nav>
  );
}
