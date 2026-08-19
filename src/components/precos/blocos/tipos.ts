import type { ContextoPreco } from "@/lib/pricing";

/**
 * O contrato de qualquer bloco do modo preciso.
 *
 * Um bloco recebe o contexto e uma forma de o mudar, e não sabe mais nada
 * — nem que blocos existem à sua volta, nem se está aberto, nem quem
 * decidiu a ordem. É `Afinar.tsx` que monta a lista a partir de
 * `pricing/blocos.ts`; os blocos só desenham campos.
 */
export interface PropsBloco {
  contexto: ContextoPreco;
  atualizar: (campo: string, patch: (c: ContextoPreco) => void) => void;
}
