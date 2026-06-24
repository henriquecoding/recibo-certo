"use client";

// Pré-carregamento dos simuladores por INTENÇÃO (hover/foco/toque no seletor de
// modo), em vez de descarregar todos no arranque. Mantém a troca de modo quase
// instantânea sem desperdiçar dados: modos pesados (ex.: «Por conta de outrem»,
// ~1 MB) só são descarregados quando o utilizador mostra intenção de os usar.
//
// O import() dinâmico só dispara quando a função é chamada (não arrasta nada
// para o bundle inicial). O browser deduplica/caches os pedidos por módulo.

import type { Perfil } from "@/lib/perfil";

const feito = new Set<string>();

function umaVez(chave: string, carregar: () => Promise<unknown>) {
  if (feito.has(chave)) return;
  feito.add(chave);
  carregar().catch(() => {
    // Falha de prefetch não é crítica — o chunk volta a ser pedido ao renderizar.
    feito.delete(chave);
  });
}

/** Aquece o chunk do simulador correspondente ao modo indicado. */
export function prefetchSimulador(perfil: Perfil): void {
  if (typeof window === "undefined") return;
  if (perfil === "dependente") {
    umaVez("dependente", () => import("@/components/dependente/SimuladorVencimento"));
  } else if (perfil === "comparar") {
    umaVez("comparar", () => import("@/components/comparar/ComparadorCenarios"));
  } else {
    // independente e empresa partilham o SimuladorIntegrado (vistas diferentes).
    umaVez("integrado", () => import("@/components/SimuladorIntegrado"));
  }
}
