// ═══════════════════════════════════════════════════════════════════════
//  O AVISO DE QUE ALGO MUDOU NO DISPOSITIVO — sem dizer o quê.
//  ---------------------------------------------------------------------
//  `localStorage` tem um defeito conhecido: o evento `storage` dispara em
//  TODOS os separadores MENOS naquele que escreveu. Quem grava um rascunho
//  de preço e volta ao painel no mesmo separador não recebe aviso nenhum —
//  e o painel mostra o estado de antes até alguém recarregar a página.
//
//  Este ficheiro fecha os dois lados:
//    · `anunciarMudanca()` dispara um `CustomEvent` para o próprio separador;
//    · `subscreverMudancas()` ouve esse evento E o `storage` dos outros.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE VIAJA NO EVENTO É UM NOME DE DOMÍNIO. MAIS NADA.               │
//  │                                                                     │
//  │ Nem título, nem id, nem valor, nem contexto. Um evento de interface  │
//  │ que transportasse o conteúdo passaria a ser uma segunda cópia dos    │
//  │ dados — desta vez fora do cofre, ao alcance de qualquer script na    │
//  │ página. Quem ouve vai LER a fonte outra vez; é a fonte que manda.    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Sem React e sem `use client`: é chamado de dentro das stores, que já
//  correm no cliente, e tem de poder ser importado por um teste em Node
//  sem arrastar nada.
// ═══════════════════════════════════════════════════════════════════════

export const EVENTO_MUDANCA = "recibocerto:store-changed";

/** Os domínios que o painel observa. É um enum fechado, não texto livre. */
export type DominioTrabalho =
  | "descoberta"
  | "hipoteses"
  | "preco"
  | "precos-guardados"
  | "negocio"
  | "cenarios";

/**
 * Diz que um domínio mudou. Chamado DEPOIS de a escrita ter sido confirmada
 * — anunciar antes seria prometer o que ainda pode falhar.
 */
export function anunciarMudanca(dominio: DominioTrabalho): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_MUDANCA, { detail: { dominio } }));
  } catch {
    /* ambiente sem CustomEvent: o painel atualiza no próximo carregamento */
  }
}

/**
 * Ouve mudanças, do próprio separador e dos outros. Devolve a função que
 * cancela — é o contrato que `useSyncExternalStore` espera.
 *
 * As atualizações são agrupadas num microtask: gravar um rascunho toca em
 * duas chaves e não pode custar dois `render` da visão geral inteira.
 */
export function subscreverMudancas(aoMudar: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let agendado = false;
  const notificar = () => {
    if (agendado) return;
    agendado = true;
    queueMicrotask(() => {
      agendado = false;
      aoMudar();
    });
  };

  const noStorage = (e: StorageEvent) => {
    // Só as chaves deste produto. O `storage` também traz as de terceiros.
    if (e.key === null || e.key.startsWith("recibocerto:")) notificar();
  };

  window.addEventListener(EVENTO_MUDANCA, notificar);
  window.addEventListener("storage", noStorage);
  return () => {
    window.removeEventListener(EVENTO_MUDANCA, notificar);
    window.removeEventListener("storage", noStorage);
  };
}
