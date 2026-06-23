import { useEffect, useRef } from "react";

// Scroll suave para uma secção por id. Seguro em SSR (verifica `document`).
export function scrollToId(id: string): void {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Faz a janela rolar até ao topo de um contentor sempre que `passo` muda — para
 * o utilizador de um simulador guiado nunca ficar "perdido" a meio do ecrã
 * quando o passo seguinte é mais curto que o anterior. Devolve uma `ref` para
 * colocar no contentor do simulador (que deve ter `scroll-mt-*` para folga sob a
 * Nav fixa). Não rola na montagem inicial e respeita `prefers-reduced-motion`.
 */
export function useScrollTopOnStep<T>(passo: T) {
  const ref = useRef<HTMLDivElement>(null);
  const montado = useRef(false);
  useEffect(() => {
    if (!montado.current) {
      montado.current = true; // não rola ao montar — só quando o passo muda
      return;
    }
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    el.scrollIntoView({ behavior: reduz ? "auto" : "smooth", block: "start" });
  }, [passo]);
  return ref;
}
