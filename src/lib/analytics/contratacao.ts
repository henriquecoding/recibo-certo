"use client";

import type { ContextoContratacao } from "./eventos";

export function contextoContratacao(
  source: ContextoContratacao["source"],
): ContextoContratacao {
  const width = typeof window === "undefined" ? 1024 : window.innerWidth;
  return {
    device: width < 640 ? "movel" : width < 1024 ? "tablet" : "secretaria",
    theme: typeof document !== "undefined"
      && document.documentElement.classList.contains("dark")
      ? "escuro"
      : "claro",
    source,
  };
}
