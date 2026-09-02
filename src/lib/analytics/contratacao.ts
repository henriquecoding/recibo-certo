"use client";

import type { ContextoContratacao, OrigemContexto } from "./eventos";
import {
  ORIGENS_ARCO,
  PARAMETRO_ORIGEM,
  type OrigemArcoContratacao,
} from "@/lib/foco/arco-contratacao";

/**
 * A origem declarada na rota, quando existe e quando é uma das do arco.
 *
 * O parâmetro `?de=` é atribuição, não estado: não muda um único número do
 * planeador. Por isso a leitura é fechada — qualquer outro valor é
 * ignorado, e não há caminho para texto arbitrário do URL chegar à
 * medição.
 */
function origemDoArco(): OrigemArcoContratacao | null {
  if (typeof window === "undefined") return null;
  const valor = new URLSearchParams(window.location.search).get(PARAMETRO_ORIGEM);
  return ORIGENS_ARCO.find((origem) => origem === valor) ?? null;
}

export function contextoContratacao(
  source: Extract<OrigemContexto, "salario" | "ferramenta">,
): ContextoContratacao {
  const width = typeof window === "undefined" ? 1024 : window.innerWidth;
  // Só a ferramenta recebe entradas do arco; o palco do foco do salário é,
  // por definição, a origem `salario`.
  const arco = source === "ferramenta" ? origemDoArco() : null;
  return {
    device: width < 640 ? "movel" : width < 1024 ? "tablet" : "secretaria",
    theme: typeof document !== "undefined"
      && document.documentElement.classList.contains("dark")
      ? "escuro"
      : "claro",
    source: arco ? (`arco-${arco}` as OrigemContexto) : source,
  };
}
