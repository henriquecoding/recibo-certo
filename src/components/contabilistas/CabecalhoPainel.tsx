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
import { TituloDoPainel } from "./AcoesDoPainel";

export default function CabecalhoPainel({
  titulo,
  descricao,
  acao,
  rotulo = "Painel de gestão",
  tituloNoTopo = true,
}: {
  titulo: string;
  /** Uma linha. O que se faz aqui, ou o estado de agora. */
  descricao?: ReactNode;
  /** Ligação ou botão. Opcional — a maioria dos ecrãs não precisa. */
  acao?: ReactNode;
  rotulo?: string;
  /**
   * Monta também o título na barra do topo (≥lg).
   *
   * Havia DOIS sistemas de cabeçalho no painel e nenhuma página sabia qual
   * usar: quatro ecrãs preenchiam `#painel-titulo` pelo portal, seis nunca
   * o preenchiam — e a barra do topo ficava vazia nesses —, e dois faziam
   * as duas coisas, mostrando o mesmo título duas vezes no mesmo ecrã.
   *
   * Agora é uma chamada só. Quem já monta o seu próprio `TituloDoPainel`
   * (porque quer um texto diferente do `<h1>`, como a workspace com «A
   * editar · Meu dia») passa `tituloNoTopo={false}` e continua a mandar.
   */
  tituloNoTopo?: boolean;
}) {
  return (
    <>
      {tituloNoTopo && <TituloDoPainel>{titulo}</TituloDoPainel>}
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
    </>
  );
}
