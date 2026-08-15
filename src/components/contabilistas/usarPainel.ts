"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  BASE_PAINEL, basePainel, eDemonstracao, hrefNoPainel, type ModoPainel,
} from "@/lib/contabilistas/demonstracao/rotas";

export interface Painel {
  /** A raiz onde o painel está aberto: `/contabilista` ou `/admin/contabilista`. */
  base: string;
  modo: ModoPainel;
  /** Atalho legível: `painel.demonstracao` em vez de comparar strings. */
  demonstracao: boolean;
  /**
   * Traduz uma ligação do painel para a base onde ele está aberto.
   *
   * As páginas continuam a escrever o endereço verdadeiro — `/contabilista/agenda`
   * — e é este passo que o leva para a demonstração quando é lá que a pessoa
   * está. O que não é do painel (`/dashboard`, `/contabilistas/<slug>`) passa
   * sem ser tocado.
   */
  href: (destino: string) => string;
}

/**
 * Onde é que este painel está aberto.
 *
 * Lê-se do endereço e não de um contexto: um contexto teria de ser montado
 * por cima de cada página, e uma página esquecida ficava com ligações a
 * apontar para fora da demonstração sem ninguém dar por isso.
 */
export function usarPainel(): Painel {
  const pathname = usePathname();
  const base = basePainel(pathname);
  const demonstracao = eDemonstracao(pathname);

  const href = useCallback(
    (destino: string) => hrefNoPainel(destino, base),
    [base]
  );

  return useMemo(
    () => ({ base, modo: demonstracao ? "demonstracao" : "real", demonstracao, href }),
    [base, demonstracao, href]
  );
}

export { BASE_PAINEL };
