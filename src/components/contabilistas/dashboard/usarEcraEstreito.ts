"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ESTAMOS ABAIXO DOS 640px?
//  ---------------------------------------------------------------------
//  Não é uma preferência de desenho: é o ponto onde `painel-modular.module.css`
//  troca a grelha de doze colunas por uma LISTA em coluna. A partir daí,
//  `grid-column` e `grid-row` são ignorados — e tudo o que os manipula
//  deixa de ter efeito visível.
//
//  Era esse o problema. Em modo de edição num telemóvel havia um grip para
//  arrastar, um canto para redimensionar, uma etiqueta «L» e um botão para
//  mostrar a grelha — e nenhuma das quatro coisas mudava fosse o que fosse
//  no ecrã, porque todas escrevem em coordenadas que a lista não lê. Uma
//  afordância que não faz nada é pior do que não existir: a pessoa tenta,
//  não acontece nada, e conclui que a aplicação está avariada.
//
//  O CSS esconde o que é visual. Isto existe para o que é lógica — as
//  entradas do menu `•••`, que têm de ser outras.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

/** O mesmo valor do `@media (max-width: 639px)` do módulo CSS. */
export const LARGURA_LISTA = 639;

export function usarEcraEstreito(): boolean {
  // Começa `false` para o servidor e o primeiro render do cliente darem o
  // mesmo resultado. O efeito corrige logo a seguir, antes de a pessoa ter
  // tempo de tocar em nada.
  const [estreito, setEstreito] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${LARGURA_LISTA}px)`);
    const ler = () => setEstreito(mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);

  return estreito;
}
