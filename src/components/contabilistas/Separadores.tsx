"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SEPARADORES — o padrão ARIA completo, num sítio só
//  ---------------------------------------------------------------------
//  Havia cinco implementações à mão no painel (agenda, fidelidade,
//  trabalho, tabela de clientes, vistas do workspace) e todas paravam a
//  meio: `role="tab"` com `aria-selected`, e depois nada — sem
//  `aria-controls`, sem `role="tabpanel"`, sem `tabIndex` rotativo, sem
//  navegação por setas.
//
//  Um `role="tab"` sem painel associado é pior do que um botão: promete a
//  um leitor de ecrã uma estrutura que não existe. Anuncia «separador 2 de
//  4» e depois não há forma de saber que região é que ele controla, nem de
//  lá chegar.
//
//  Este componente faz as quatro coisas que faltavam:
//   · `aria-controls` a apontar para o painel, e o painel com o `id`;
//   · `tabIndex` rotativo — só o separador ativo entra na ordem de
//     tabulação, e as setas movem entre eles (é o que a APG especifica);
//   · Home/End para os extremos;
//   · foco visível pelo `focus-marca` do design system.
//
//  Onde NÃO há painel associado — filtros que reordenam a mesma lista —
//  a resposta certa não é este componente, são botões com `aria-pressed`.
//  É o que a página de partilhas já fazia bem.
// ═══════════════════════════════════════════════════════════════════════

import { useId, useRef, type ReactNode } from "react";

export interface Separador<T extends string> {
  id: T;
  rotulo: ReactNode;
  /** Contagem opcional à direita do rótulo. */
  contagem?: number;
}

export default function Separadores<T extends string>({
  itens, ativo, onEscolher, etiqueta, className, painelId,
}: {
  itens: readonly Separador<T>[];
  ativo: T;
  onEscolher: (id: T) => void;
  /** O que a lista de separadores é, para quem não vê o ecrã. */
  etiqueta: string;
  className?: string;
  /**
   * O `id` do painel que estes separadores controlam. Quem usar isto tem
   * de pôr o mesmo `id` e `role="tabpanel"` no conteúdo — há um par de
   * ajuda em `PainelDoSeparador` para não haver desculpa.
   */
  painelId?: string;
}) {
  const base = useId();
  const lista = useRef<HTMLDivElement>(null);

  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    const teclas = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();

    const i = itens.findIndex((x) => x.id === ativo);
    const proximo =
      e.key === "Home" ? 0
      : e.key === "End" ? itens.length - 1
      : e.key === "ArrowRight" ? (i + 1) % itens.length
      : (i - 1 + itens.length) % itens.length;

    const alvo = itens[proximo];
    if (!alvo) return;
    onEscolher(alvo.id);
    // O foco segue a seleção — é o padrão de «automatic activation» da
    // APG, e é o que faz sentido aqui: mudar de separador não custa nada.
    lista.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${base}-${alvo.id}`)}`)
      ?.focus();
  }

  return (
    <div
      ref={lista}
      role="tablist"
      aria-label={etiqueta}
      onKeyDown={aoTeclar}
      className={className ?? "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"}
    >
      {itens.map((s) => {
        const eAtivo = s.id === ativo;
        return (
          <button
            key={s.id}
            id={`${base}-${s.id}`}
            type="button"
            role="tab"
            aria-selected={eAtivo}
            aria-controls={painelId}
            tabIndex={eAtivo ? 0 : -1}
            onClick={() => onEscolher(s.id)}
            className={`focus-marca inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
              eAtivo
                ? "bg-brand text-white"
                : "bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            {s.rotulo}
            {typeof s.contagem === "number" && (
              <span className={`tabular-nums ${eAtivo ? "text-white/70" : "text-stone-400"}`}>
                {s.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** O outro lado do contrato: o painel que os separadores controlam. */
export function PainelDoSeparador({
  id, children, className,
}: { id: string; children: ReactNode; className?: string }) {
  return (
    <div id={id} role="tabpanel" tabIndex={-1} className={className}>
      {children}
    </div>
  );
}
