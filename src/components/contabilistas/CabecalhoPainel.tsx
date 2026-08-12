// Cabeçalho de página do painel de gestão.
//
// Existe para os seis ecrãs do painel abrirem da mesma maneira. Antes,
// dois tinham uma linha de contexto por baixo do título, um tinha uma
// ligação, e três não tinham nada — e a diferença não queria dizer nada:
// era a ordem por que foram escritos.
//
// A regra que isto fixa: rótulo, título, e UMA linha que diz o que este
// ecrã resolve. A ação, quando existe, fica à direita no desktop e por
// baixo no telemóvel — nunca a competir com o título por espaço.

import type { ReactNode } from "react";

export default function CabecalhoPainel({
  titulo,
  descricao,
  acao,
  rotulo = "Painel de gestão",
}: {
  titulo: string;
  /** Uma linha. O que se faz aqui, ou o estado de agora. */
  descricao?: ReactNode;
  /** Ligação ou botão. Opcional — a maioria dos ecrãs não precisa. */
  acao?: ReactNode;
  rotulo?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="eyebrow">{rotulo}</p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">{titulo}</h1>
        {descricao && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{descricao}</p>
        )}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}
