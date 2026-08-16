"use client";

// ═══════════════════════════════════════════════════════════════════════
//  MENU FLUTUANTE — o que estava a ser cortado, e porquê
//  ---------------------------------------------------------------------
//  O menu `•••` de cada módulo abria-se e ficava CORTADO a meio. Não era
//  um `z-index` mal escolhido: `.modulo` declara `overflow: hidden` — que
//  tem de declarar, senão um Kanban com muitos cartões estica o cartão
//  para fora da célula da grelha —, e um filho `position: absolute` é
//  recortado pelo antepassado que o esconde, aconteça o que acontecer com
//  o `z-index`.
//
//  Não há forma de resolver isto dentro da árvore. A solução é sair dela:
//  o menu é montado em `document.body` por portal e posicionado em
//  coordenadas de viewport, a partir do retângulo do botão.
//
//  O que isso permite, e que a versão presa não permitia:
//
//   · **virar-se para cima** quando não há espaço em baixo. No telemóvel,
//     um módulo no fundo do ecrã abria um menu que caía fora da janela;
//   · **encostar-se à margem** quando não cabe à direita;
//   · **fechar ao rolar**, porque um menu ancorado a um botão que saiu do
//     ecrã fica a apontar para o nada.
//
//  Serve os três sítios que tinham a mesma avaria: o menu do módulo, o
//  «Alinhar» da barra de edição e o `•••` da vista.
// ═══════════════════════════════════════════════════════════════════════

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/** Distância entre o botão e o menu, e da margem da janela. */
const FOLGA = 6;
const MARGEM = 8;

interface Posicao {
  top: number;
  left: number;
  /** Largura máxima disponível — o menu nunca é mais largo do que a janela. */
  maxWidth: number;
  /** Altura máxima antes de precisar de rolar dentro de si. */
  maxHeight: number;
}

export default function MenuFlutuante({
  gatilho, etiqueta, children, alinhar = "direita", className,
}: {
  /** O botão que abre. Recebe as props de acessibilidade já prontas. */
  gatilho: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
  }) => ReactNode;
  etiqueta: string;
  children: ReactNode | ((fechar: () => void) => ReactNode);
  alinhar?: "esquerda" | "direita";
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<Posicao | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => {
    setAberto(false);
    // Devolver o foco ao gatilho: sem isto, fechar com Escape deixava o
    // foco no `body` e a navegação por teclado recomeçava do princípio.
    botao.current?.focus();
  }, []);

  const medir = useCallback(() => {
    const b = botao.current;
    const p = painel.current;
    if (!b) return;

    const r = b.getBoundingClientRect();
    const larguraMenu = p?.offsetWidth ?? 200;
    const alturaMenu = p?.offsetHeight ?? 160;

    const espacoAbaixo = window.innerHeight - r.bottom - FOLGA - MARGEM;
    const espacoAcima = r.top - FOLGA - MARGEM;
    // Vira para cima quando não cabe em baixo E cabe melhor em cima. É o
    // caso de um módulo no fundo do ecrã, que é onde isto se notava.
    const paraCima = espacoAbaixo < alturaMenu && espacoAcima > espacoAbaixo;

    const top = paraCima
      ? Math.max(MARGEM, r.top - FOLGA - alturaMenu)
      : r.bottom + FOLGA;

    const esquerdaPreferida =
      alinhar === "direita" ? r.right - larguraMenu : r.left;
    const left = Math.min(
      Math.max(MARGEM, esquerdaPreferida),
      Math.max(MARGEM, window.innerWidth - larguraMenu - MARGEM),
    );

    setPos({
      top,
      left,
      maxWidth: window.innerWidth - MARGEM * 2,
      maxHeight: Math.max(120, paraCima ? espacoAcima : espacoAbaixo),
    });
  }, [alinhar]);

  // Medir depois de o menu existir no DOM, mas antes de o browser pintar:
  // com `useEffect` via-se um salto do canto superior esquerdo para a
  // posição certa.
  useLayoutEffect(() => {
    if (aberto) medir();
  }, [aberto, medir]);

  useEffect(() => {
    if (!aberto) return;

    function fora(e: PointerEvent) {
      const alvo = e.target as Node | null;
      if (!alvo) return;
      if (botao.current?.contains(alvo) || painel.current?.contains(alvo)) return;
      setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); fechar(); }
    }
    // Rolar fecha: um menu ancorado a um botão que saiu do ecrã fica a
    // apontar para o nada. `capture` apanha também o scroll de contentores
    // internos — a grelha do painel rola dentro de si.
    function rolou() { setAberto(false); }

    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", rolou, true);
    window.addEventListener("resize", medir);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", rolou, true);
      window.removeEventListener("resize", medir);
    };
  }, [aberto, fechar, medir]);

  // Setas entre as entradas — é um `menu`, e um menu navega-se assim.
  function navegar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const itens = Array.from(
      painel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (itens.length === 0) return;
    const i = itens.indexOf(document.activeElement as HTMLElement);
    const proximo =
      e.key === "Home" ? 0
      : e.key === "End" ? itens.length - 1
      : e.key === "ArrowDown" ? (i + 1) % itens.length
      : (i - 1 + itens.length) % itens.length;
    itens[proximo]?.focus();
  }

  return (
    <>
      {gatilho({
        ref: botao,
        onClick: () => setAberto((a) => !a),
        "aria-expanded": aberto,
        "aria-haspopup": "menu",
      })}

      {aberto && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={painel}
            role="menu"
            aria-label={etiqueta}
            onKeyDown={navegar}
            className={className}
            style={{
              position: "fixed",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              // ⚠️ As classes que este menu recebe (`styles.menu`,
              // `styles.menuVista`) trazem `right: 0` do tempo em que eram
              // `position: absolute` presas ao botão. Com `left` E `right`
              // definidos e largura automática, o elemento ESTICA de um
              // lado ao outro da janela — o menu passava a ter a largura
              // do ecrã. Anular aqui é mais seguro do que caçar a
              // propriedade em três ficheiros CSS que outra pessoa pode
              // voltar a escrever.
              right: "auto",
              bottom: "auto",
              maxWidth: pos?.maxWidth,
              maxHeight: pos?.maxHeight,
              overflowY: "auto",
              zIndex: 90,
              // Invisível até estar medido: sem isto pisca no canto.
              visibility: pos ? "visible" : "hidden",
            }}
          >
            {typeof children === "function" ? children(fechar) : children}
          </div>,
          document.body,
        )}
    </>
  );
}
