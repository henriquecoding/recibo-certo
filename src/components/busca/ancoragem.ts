"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DE UM PAINEL ANCORADO — escrito uma vez, para os dois
//  ---------------------------------------------------------------------
//  Há duas pesquisas neste produto: a do site (`busca/*`) e a do painel de
//  gestão (`contabilistas/BuscaDoPainel`). Indexam coisas diferentes e
//  desenham resultados diferentes — isso é próprio de cada uma. O que NÃO
//  é próprio de cada uma é a forma de abrir e de fechar.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE ISTO SAIU DE DENTRO DO PAINEL DO SITE                         │
//  │                                                                     │
//  │ A do painel era um diálogo modal: véu por cima de tudo, foco preso,  │
//  │ scroll bloqueado, e — no telemóvel — o campo no TOPO de uma folha    │
//  │ centrada. A do site tinha deixado de o ser, e ficou a diferença      │
//  │ absurda: a mesma pessoa, no mesmo telemóvel, a escrever no fundo do  │
//  │ ecrã num sítio e no topo no outro.                                   │
//  │                                                                     │
//  │ A tentação era copiar o comportamento para o segundo ficheiro. Isso  │
//  │ é como se chega a dois contratos de acessibilidade parecidos e nunca │
//  │ iguais — e o que quase ninguém revê é sempre o segundo.              │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Aqui vive o que os dois partilham: quando fechar, e quanto do ecrã
//  sobra quando o teclado virtual abre. A ancoragem e o conteúdo ficam
//  com cada um — são a parte que é mesmo diferente.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

/**
 * Fechar um painel que NÃO é modal.
 *
 * Num diálogo modal o browser trata disto. Aqui é explícito, e são três
 * caminhos com a mesma regra — o clique fora, o foco que sai e o Escape:
 *
 *  · `pointerdown` e não `click`, para um clique que começa DENTRO e acaba
 *    fora (ao seleccionar texto) não fechar o painel;
 *  · `focusin` e não `onBlur`, porque o foco sai no `mousedown` — antes do
 *    `click` — e fechar aí destrói o alvo do gesto que ainda vem a caminho;
 *  · dentro do CHROME espera-se pelo `click`: nessa altura a navegação já
 *    foi despachada pelo próprio elemento, e fechar a seguir não lhe tira
 *    nada. Sem esta excepção, carregar num separador com o painel aberto
 *    fechava a pesquisa e não navegava.
 */
export function useFecharAoSair({
  ativo,
  caixa,
  chrome,
  aoFechar,
  aoFecharComFoco,
}: {
  ativo: boolean;
  caixa: React.RefObject<HTMLElement | null>;
  /** Selector do chrome que não pode ser destruído pelo próprio gesto. */
  chrome: string;
  /** Fecha sem mexer no foco: clique fora, saída por Tab, navegação. */
  aoFechar: () => void;
  /** Fecha e devolve o foco à barra: Escape e o botão ✕. */
  aoFecharComFoco: () => void;
}) {
  useEffect(() => {
    // Sem painel no ecrã não há «clicar fora»: com a caixa a null, qualquer
    // clique em qualquer sítio contaria como fora e fecharia uma pesquisa
    // que ainda nem apareceu.
    if (!ativo) return;

    const dentroDoPainel = (alvo: Node | null) => !!alvo && !!caixa.current?.contains(alvo);
    const dentroDoChrome = (alvo: Node | null) =>
      !!alvo && !!(alvo instanceof Element ? alvo : alvo.parentElement)?.closest(chrome);

    const onPointerDown = (e: PointerEvent) => {
      const alvo = e.target as Node | null;
      if (dentroDoPainel(alvo) || dentroDoChrome(alvo)) return;
      aoFechar();
    };

    const onClique = (e: MouseEvent) => {
      const alvo = e.target as Node | null;
      if (dentroDoPainel(alvo)) return;
      if (dentroDoChrome(alvo)) aoFechar();
    };

    const onFoco = (e: FocusEvent) => {
      const alvo = e.target as Node | null;
      if (dentroDoPainel(alvo) || dentroDoChrome(alvo)) return;
      aoFechar();
    };

    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      // Escape não indica destino: quem o carrega quer voltar ao campo.
      aoFecharComFoco();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClique);
    document.addEventListener("focusin", onFoco);
    document.addEventListener("keydown", onTecla);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClique);
      document.removeEventListener("focusin", onFoco);
      document.removeEventListener("keydown", onTecla);
    };
  }, [ativo, caixa, chrome, aoFechar, aoFecharComFoco]);
}

/**
 * Quanto do ecrã o teclado virtual está a ocupar, e quanto sobra.
 *
 * `window.innerHeight` não muda quando o teclado abre no iOS — só o
 * `visualViewport` sabe. E `position: fixed` resolve contra o viewport de
 * LAYOUT, que também não encolhe: sem isto, uma barra ancorada ao fundo do
 * ecrã fica por baixo do teclado, com o campo onde se escreve escondido
 * por trás dele. É a falha clássica que costuma levar as pessoas a
 * desistirem e a fazerem um modal centrado.
 */
export function useTecladoVirtual(ativo: boolean) {
  const [tecladoInset, setTecladoInset] = useState(0);
  const [alturaVisivel, setAlturaVisivel] = useState(0);

  useEffect(() => {
    if (!ativo) {
      setTecladoInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const atualizar = () => {
      setTecladoInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      setAlturaVisivel(vv.height);
    };
    atualizar();
    vv.addEventListener("resize", atualizar);
    vv.addEventListener("scroll", atualizar);
    return () => {
      vv.removeEventListener("resize", atualizar);
      vv.removeEventListener("scroll", atualizar);
    };
  }, [ativo]);

  return { tecladoInset, alturaVisivel };
}
