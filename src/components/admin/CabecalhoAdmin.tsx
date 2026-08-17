"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CABEÇALHO DAS PÁGINAS DA ADMINISTRAÇÃO
//  ---------------------------------------------------------------------
//  Existe para as dez páginas abrirem da mesma maneira. Antes não abriam:
//  havia três tamanhos de título (`text-2xl`, `text-3xl`, `text-3xl
//  sm:text-4xl`), dois pesos (`font-bold`, `font-semibold`) e três cores
//  (`stone-800`, `stone-900`, `ink`) — e a diferença não queria dizer nada,
//  era a ordem por que as páginas foram escritas.
//
//  A regra que isto fixa: rótulo, título, e UMA linha que diz o que este
//  ecrã resolve. A ação, quando existe, fica à direita no desktop e por
//  baixo no telemóvel — nunca a competir com o título por espaço.
//
//  É o mesmo contrato que `CabecalhoPainel` fixou no painel de contabilista.
//  Não é o mesmo componente porque as duas molduras têm rótulos e barras de
//  topo diferentes; é o mesmo padrão, e é de propósito que se parecem.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function CabecalhoAdmin({
  titulo,
  descricao,
  acao,
  rotulo = "Administração",
  tituloNoTopo = true,
}: {
  /**
   * O título do ecrã.
   *
   * Tem de COMEÇAR pelo nome que a navegação dá a esta página (ver
   * `navegacao.tsx`). Um título mais completo é aceite; um título diferente
   * faz a pessoa duvidar de onde está, e o teste `admin-navegacao` recusa-o.
   */
  titulo: string;
  /** Uma linha. O que se faz aqui, ou o estado de agora. */
  descricao?: ReactNode;
  /** Ligação ou botão. Opcional — a maioria dos ecrãs não precisa. */
  acao?: ReactNode;
  rotulo?: string;
  /** Monta também o título na barra do topo (≥lg). */
  tituloNoTopo?: boolean;
}) {
  return (
    <>
      {tituloNoTopo && <TituloAdmin>{titulo}</TituloAdmin>}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8">
        <div className="min-w-0">
          <p className="eyebrow text-brand">{rotulo}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">{titulo}</h1>
          {descricao && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{descricao}</p>
          )}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </header>
    </>
  );
}

/**
 * O título do ecrã, na barra do topo (≥lg).
 *
 * A barra lateral diz em que SECÇÃO se está; esta linha diz em que PÁGINA.
 * Sem ela, a barra de topo do desktop ficava vazia e a única pista era o
 * realce na coluna da esquerda.
 */
export function TituloAdmin({ children }: { children: ReactNode }) {
  return (
    <PortalDoTopo alvo="admin-titulo">
      <span className="truncate text-sm font-semibold text-stone-700">{children}</span>
    </PortalDoTopo>
  );
}

/**
 * As ações do ecrã, na barra do topo (≥lg).
 *
 * Só a partir de `lg`: no telemóvel a barra do topo não tem espaço, e as
 * ações continuam junto ao conteúdo, onde o `acao` do cabeçalho as põe.
 */
export function AcoesAdmin({ children }: { children: ReactNode }) {
  return (
    <PortalDoTopo alvo="admin-acoes">
      <div className="hidden items-center gap-1.5 lg:flex">{children}</div>
    </PortalDoTopo>
  );
}

/**
 * O contentor é do layout e já existe quando a página monta. Procurá-lo num
 * efeito (e não durante o render) evita ler o DOM no servidor.
 */
function PortalDoTopo({ alvo, children }: { alvo: string; children: ReactNode }) {
  const [no, setNo] = useState<HTMLElement | null>(null);
  useEffect(() => setNo(document.getElementById(alvo)), [alvo]);
  if (!no) return null;
  return createPortal(children, no);
}
