"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DE QUE CONTABILISTA É QUE ESTA FERRAMENTA PRECISA
//  ---------------------------------------------------------------------
//  A secção de contabilistas vive DENTRO do resultado de cada ferramenta —
//  que é onde a pessoa está quando decide o passo seguinte. Mas o que ela
//  precisa de saber (que áreas este cenário pede) vem do catálogo das
//  ferramentas, e o catálogo não pode descer para o browser: são centenas
//  de linhas de metadados para desenhar três cartões.
//
//  Havia três formas de resolver isto, e duas eram piores:
//
//   · **cada ferramenta importa o catálogo** — resolve, e põe o catálogo
//     inteiro no pacote de dezasseis páginas;
//   · **cada página passa a necessidade como propriedade** — resolve, e
//     obriga a enfiar um argumento por dezasseis pontes de carregamento
//     diferido e dezasseis assinaturas de componente, das quais metade não
//     tem nada que ver com contabilistas;
//   · **contexto** — o `ToolShell`, que é servidor e já tem o catálogo na
//     mão, calcula a necessidade uma vez e deixa-a aqui. Quem quiser,
//     pega. Ninguém tem de a passar.
//
//  E há um efeito lateral que não é acidente: FORA de uma ferramenta o
//  contexto está vazio, e a secção não desenha nada. As mesmas calculadoras
//  aparecem embutidas em guias (`/guias/seguranca-social` usa a mesma
//  `CalculadoraSSTrimestral`); lá não há necessidade declarada, e por isso
//  não há cartões. A regra vale por construção, não por um `if` em cada
//  sítio.
// ═══════════════════════════════════════════════════════════════════════

import { createContext, useContext, type ReactNode } from "react";
import type { Necessidade } from "@/lib/contabilistas/afinidade/tipos";

const Contexto = createContext<Necessidade | null>(null);

export function ProvedorNecessidade({
  valor,
  children,
}: {
  valor: Necessidade;
  children: ReactNode;
}) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** A necessidade da ferramenta à volta, ou `null` fora de uma. */
export function useNecessidade(): Necessidade | null {
  return useContext(Contexto);
}
