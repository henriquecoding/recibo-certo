"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «ESTÁ ALGUÉM A JOGAR O QUIZ?» — perguntado num sítio só
//  ---------------------------------------------------------------------
//  Enquanto uma pergunta está no ecrã, o produto tira o chrome do caminho:
//  é uma tarefa com tempo, e a barra de navegação, o dock de pesquisa e a
//  acção comercial não competem com ela. O quiz anuncia esse estado com
//  uma classe no `<body>` — é o único canal possível, porque quem o emite
//  (`QuizFiscalApp`) e quem o lê (o chrome, montado no layout) não têm
//  nenhum antepassado comum onde pudesse viver um contexto.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE ISTO É UM MÓDULO E NÃO UM OBSERVADOR EM CADA COMPONENTE       │
//  │                                                                     │
//  │ O nome da classe estava escrito à mão em dois ficheiros — o que a    │
//  │ põe e o que a lê — e o `MutationObserver` que a vigia estava copiado │
//  │ no chrome inferior. Ao acrescentar o chrome superior seriam três     │
//  │ cópias da mesma cadeia de caracteres e dois observadores a fazer o   │
//  │ mesmo trabalho.                                                     │
//  │                                                                     │
//  │ E já tinha custado: o chrome de baixo desaparecia durante o jogo e o │
//  │ de cima ficava, com «Começar» ao lado de uma pergunta a contar       │
//  │ tempo. Nenhum dos dois estava errado sozinho; faltava é os dois      │
//  │ estarem a ler a mesma coisa.                                        │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

export const CLASSE_QUIZ_A_JOGAR = "quiz-playing";

/**
 * `true` enquanto houver uma pergunta no ecrã.
 *
 * `emRota` é a otimização que vale a pena manter: fora do quiz não há nada
 * que possa pôr a classe, e um observador de atributos do `<body>` em todas
 * as páginas públicas é trabalho por uma resposta que nunca muda.
 */
export function useQuizAJogar(emRota: boolean): boolean {
  const [aJogar, setAJogar] = useState(false);

  useEffect(() => {
    if (!emRota) {
      setAJogar(false);
      return;
    }
    const ler = () => setAJogar(document.body.classList.contains(CLASSE_QUIZ_A_JOGAR));
    ler();
    const obs = new MutationObserver(ler);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [emRota]);

  return aJogar;
}
