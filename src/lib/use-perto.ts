"use client";

import { useEffect, useRef, useState } from "react";

// Sinaliza quando um elemento está prestes a entrar no ecrã (IntersectionObserver
// com margem generosa). Usado para adiar o carregamento de secções pesadas
// (simuladores, DemoIRS) sem o utilizador notar — quando lá chega, já está pronto.
// Extraído da CalculadoraSecao para ser partilhado.
export function usePerto<T extends HTMLElement>(rootMargin = "800px 0px") {
  const ref = useRef<T>(null);
  const [perto, setPerto] = useState(false);

  useEffect(() => {
    if (perto) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setPerto(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPerto(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [perto, rootMargin]);

  return { ref, perto };
}
