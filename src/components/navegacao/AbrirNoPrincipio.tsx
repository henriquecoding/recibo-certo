"use client";

// ═══════════════════════════════════════════════════════════════════════
//  UMA NAVEGAÇÃO ABRE A PÁGINA NO PRINCÍPIO — sem excepções e sem sorte
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE ISTO NÃO PODE FICAR ENTREGUE AO NEXT                    │
//  │                                                                     │
//  │ O Next TENTA. `layout-router.js` procura o primeiro elemento do      │
//  │ segmento novo e, antes de rolar, faz esta pergunta:                  │
//  │                                                                     │
//  │     elementTop >= scroll-padding-top && elementTop <= alturaJanela   │
//  │       ? já está à vista, não mexo                                    │
//  │       : ponho a página no princípio                                  │
//  │                                                                     │
//  │ A intenção é boa e a consequência é má: aquilo é o ECRÃ INTEIRO. Se  │
//  │ o topo do segmento novo aterrar em qualquer sítio entre o cabeçalho  │
//  │ e o fundo do ecrã — o que depende da altura da página antiga, da     │
//  │ nova, de onde a pessoa estava e do que já hidratou — o Next dá a     │
//  │ página por «à vista» e não mexe. A pessoa fica onde estava, que numa │
//  │ página de 18 000 px é o rodapé.                                      │
//  │                                                                     │
//  │ Medido neste produto, a 390×780, DEPOIS de tirar os `scroll={false}` │
//  │ que causavam o mesmo mal por outra via: clicar em                    │
//  │ `/ferramentas/descobrir-negocio` a partir do fim da homepage abria   │
//  │ a 200 px, e `/ferramentas/planeador-contratacao` a 841 px. Nenhum    │
//  │ dos dois faz isto num carregamento directo — só na navegação, e só   │
//  │ às vezes. É a assinatura de uma heurística, não de um defeito nosso. │
//  │                                                                     │
//  │ Uma heurística que acerta quase sempre é exactamente o que não serve │
//  │ aqui: «quase sempre» quer dizer que a pessoa não consegue confiar no │
//  │ produto, e não consegue sequer descrever quando é que falha.         │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ `behavior: "auto"` É PARTE DA CORREÇÃO, NÃO UM PORMENOR              │
//  │                                                                     │
//  │ O `globals.css` põe `scroll-behavior: smooth` no `html`, e é para    │
//  │ isso que ele lá está: as âncoras dentro de uma página deslizam. Mas  │
//  │ um scroll ANIMADO é um scroll INTERROMPÍVEL — o dedo que acabou de   │
//  │ tocar cancela-o a meio, e o meio de uma página de 18 000 px é tão    │
//  │ mau como o fim. `auto` diz explicitamente «põe lá, agora», e passa   │
//  │ à frente do CSS sem lhe tocar.                                       │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Quanto tempo se mantém o princípio da página contra o framework.
 *
 * Medido: a cadeia de `scrollIntoView` do Next fecha-se aos ~600 ms depois
 * do clique, e a animação que ela lança dura mais ~400. Meio segundo não
 * chegava; um segundo é folga sobre o pior caso observado, e não custa
 * nada — a única coisa que corre aqui é uma comparação por frame, e o
 * primeiro gesto da pessoa cancela tudo.
 */
const JANELA_MS = 1000;

/** Os sinais de que a posição da página passou a ser de quem a lê. */
const GESTOS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

export default function AbrirNoPrincipio() {
  const pathname = usePathname();
  /**
   * A primeira passagem é a CHEGADA, e não uma navegação.
   *
   * Sem isto, abrir `/guias/x#seccao` ou recarregar a página a meio de uma
   * leitura era atirado para o topo — o browser tinha acabado de fazer a
   * coisa certa e nós desfazíamo-la. Um efeito com dependências corre
   * também na montagem, e é o mesmo laço em que já se caiu em
   * `BuscaGlobal` («montar não é mudar de página»).
   */
  const chegada = useRef(true);

  useEffect(() => {
    if (chegada.current) {
      chegada.current = false;
      return;
    }

    /**
     * Uma âncora é um destino PEDIDO, e ganha a esta regra.
     *
     * `/guias/x#quanto-pago` diz onde quer aterrar. Levar essa pessoa ao
     * topo seria trocar-lhe o destino pelo princípio — o mesmo defeito
     * deste ficheiro, ao contrário.
     */
    if (window.location.hash) return;

    /**
     * ┌───────────────────────────────────────────────────────────────┐
     * │ PÔR NO PRINCÍPIO UMA VEZ NÃO CHEGA — O NEXT ROLA DEPOIS DE NÓS │
     * │                                                               │
     * │ Isto era uma linha só, e uma linha só não resolvia o caso que  │
     * │ mais custa. Apanhado com `Element.prototype.scrollIntoView`    │
     * │ instrumentado, ao navegar da homepage para o planeador:        │
     * │                                                               │
     * │   1. window.scrollTo({top: 0})          ← nós                  │
     * │   2. scrollIntoView SECTION.mt-8        ← Next                 │
     * │   3. scrollIntoView SECTION.mt-12       ← Next                 │
     * │   … mais três …                                                │
     * │   7. scrollIntoView HEADER.superficie-fixa  ← Next, e este     │
     * │      deixava a página a 841 px, animados em ~400 ms            │
     * │                                                               │
     * │ São SEIS chamadas do próprio Next (a pilha passa pelo          │
     * │ `dontForceLayout` do `layout-router`), uma por cada nível de   │
     * │ segmento que se julga responsável pelo scroll. A última ganha, │
     * │ e a última não é o princípio da página.                        │
     * │                                                               │
     * │ Por isso não basta pôr no princípio: é preciso MANTER lá,      │
     * │ durante a janela em que o framework ainda está a decidir.      │
     * └───────────────────────────────────────────────────────────────┘
     *
     * ┌───────────────────────────────────────────────────────────────┐
     * │ E CEDE À PESSOA NO PRIMEIRO GESTO — SEM EXCEPÇÃO               │
     * │                                                               │
     * │ Um código que insiste em pôr a página no princípio é, para     │
     * │ quem já começou a ler, exactamente o mesmo defeito ao          │
     * │ contrário: o ecrã a mexer-se sozinho por baixo do dedo.        │
     * │                                                               │
     * │ Qualquer sinal de intenção — tocar, rodar a roda, uma tecla —  │
     * │ desliga isto no instante em que chega. A partir daí a posição  │
     * │ da página é de quem a está a ler, e de mais ninguém.           │
     * └───────────────────────────────────────────────────────────────┘
     */
    let ativo = true;
    let frame = 0;
    const inicio = performance.now();

    const largar = () => {
      ativo = false;
      cancelAnimationFrame(frame);
      for (const evento of GESTOS) window.removeEventListener(evento, largar);
    };
    for (const evento of GESTOS) {
      window.addEventListener(evento, largar, { passive: true, once: true });
    }

    const manter = () => {
      if (!ativo) return;
      // `scrollTo` e não `scrollTop = 0`: só o primeiro aceita `behavior`,
      // e é o `behavior` que passa à frente do `scroll-behavior: smooth`.
      if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (performance.now() - inicio >= JANELA_MS) return largar();
      frame = requestAnimationFrame(manter);
    };
    manter();

    return largar;
  }, [pathname]);

  return null;
}
