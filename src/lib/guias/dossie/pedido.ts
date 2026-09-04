// ═══════════════════════════════════════════════════════════════════════
//  O PEDIDO DE ELEMENTOS — a lista PBC, e a volta que fecha o ciclo
//  ---------------------------------------------------------------------
//  É isto que faz do motor um motor e não uma exportação. Do lado do
//  cliente aparece onde ele já olha — no caso, na sala, e de volta na
//  CHECKLIST DO PRÓPRIO GUIA, com os itens pedidos marcados «o teu
//  contabilista pediu isto».
//
//  A prática que a indústria apurou, e que se segue à letra:
//   · numerado e por item, com convenção de nomes que mapeia para o número;
//   · PRAZO POR ITEM, nunca prazo global;
//   · adaptado ao caso — a lista nasce do guia concreto que a pessoa leu,
//     e não de um template que diz ao cliente que ninguém percebeu o caso.
//
//  E duas regras da casa:
//   · SÓ ITENS QUE EXISTEM NO DOSSIÊ, ou itens novos escritos pelo
//     profissional — e esses ficam marcados como tal. Nunca se pode
//     confundir o que o Guia disse com o que o profissional pediu.
//   · SEM PRAZOS INVENTADOS. Um item só ganha prazo se o contabilista o
//     escrever, ou se vier de uma data do próprio guia.
// ═══════════════════════════════════════════════════════════════════════

import type {
  DossieDeGuia, ItemDePedido, PedidoDeElementos, Selecao,
} from "./tipos";
import { RODAPE_DOSSIE } from "./tipos";
import { data, referencia } from "./formatos/comum";

/** O texto de um item pedido, com o mesmo limite que a base impõe. */
export const TEXTO_ITEM_MIN = 3;
export const TEXTO_ITEM_MAX = 400;

export interface OpcoesDoPedido {
  /** Referência legível do caso ou da partilha de onde o pedido nasce. */
  ref: string;
  /** Prazo comum a aplicar aos itens que não trazem data própria. */
  prazoPorOmissao?: string;
  agora?: Date;
  /** Identificador do pedido. Injetado para os testes serem estáveis. */
  id?: string;
}

/**
 * Transforma a seleção da consola numa lista PBC.
 *
 * A seleção pode atravessar secções — um contabilista seleciona três
 * elementos e uma pergunta em «não sei», e o que ele quer é uma lista só.
 * A numeração é sequencial sobre a seleção, e não sobre o dossiê: o
 * cliente recebe «1 a 4», não «3, 7, 8 e 11».
 */
export function pedidoDeElementos(
  dossie: DossieDeGuia,
  selecao: Selecao,
  o: OpcoesDoPedido,
): PedidoDeElementos {
  const agora = o.agora ?? new Date();
  const itens: ItemDePedido[] = [];

  for (const seccao of dossie.seccoes) {
    for (const item of seccao.itens) {
      if (!selecao.itens.has(item.id)) continue;
      // O resumo não é matéria de pedido: são as quatro linhas que
      // descrevem o caso, não coisas para o cliente ir buscar.
      if (seccao.id === "resumo") continue;
      itens.push({
        n: itens.length + 1,
        texto: item.texto.slice(0, TEXTO_ITEM_MAX),
        origem: "guia",
        itemId: item.id,
        proveniencia: item.proveniencia,
        estado: "pedido",
        // Do próprio guia, quando o item traz data. Nunca inventado.
        prazo: item.quando?.ate ?? o.prazoPorOmissao,
      });
    }
  }

  return {
    id: o.id ?? `pedido-${dossie.fixado.impressao.slice(0, 12)}-${agora.getTime()}`,
    dossie: { ref: o.ref, guia: dossie.guia.slug, impressao: dossie.fixado.impressao },
    itens,
    criadoEm: agora.toISOString(),
  };
}

/**
 * Um item escrito pelo profissional.
 *
 * Entra com `origem: "profissional"` e sem `itemId`: fica visível, para
 * sempre, que aquele pedido não saiu do guia. É a mesma disciplina que
 * separa `verified` de `review_required` — quem lê tem direito a saber
 * quem afirmou o quê.
 */
export function acrescentarItem(
  pedido: PedidoDeElementos,
  texto: string,
  prazo?: string,
  nota?: string,
): PedidoDeElementos {
  const limpo = texto.trim().slice(0, TEXTO_ITEM_MAX);
  if (limpo.length < TEXTO_ITEM_MIN) return pedido;
  return {
    ...pedido,
    itens: [
      ...pedido.itens,
      {
        n: pedido.itens.length + 1,
        texto: limpo,
        origem: "profissional",
        proveniencia: { origem: "pessoa", campo: "nota" },
        estado: "pedido",
        prazo,
        nota,
      },
    ],
  };
}

/**
 * Os itens de um pedido que dizem respeito a uma posição da checklist do
 * guia.
 *
 * É o que a `ChecklistGuia` usa para mostrar «pedido pelo teu contabilista
 * · até 12/09» na linha certa. Devolve um mapa por índice porque é assim
 * que a checklist se indexa — e porque um item pedido duas vezes (em dois
 * pedidos) tem de aparecer uma só.
 */
export function pedidosPorPosicao(
  // Só precisa dos itens: quem chama isto do lado do cliente lê a tabela e
  // não tem — nem precisa de ter — o dossiê inteiro em memória.
  pedidos: readonly { itens: readonly ItemDePedido[] }[],
): Map<number, ItemDePedido> {
  const mapa = new Map<number, ItemDePedido>();
  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      if (item.origem !== "guia" || !item.itemId) continue;
      const m = /^elementos\.(\d+)$/.exec(item.itemId);
      if (!m) continue;
      const posicao = Number(m[1]);
      const existente = mapa.get(posicao);
      // O mais recente ganha, e um item já entregue não é substituído por
      // um pedido antigo que ficou aberto.
      if (!existente || existente.estado !== "entregue") mapa.set(posicao, item);
    }
  }
  return mapa;
}

/** O pedido tal como o cliente o lê — e como se cola num email. */
export function pedidoParaMarkdown(pedido: PedidoDeElementos, dossie: DossieDeGuia): string {
  const l: string[] = [];
  l.push(`# Elementos pedidos — ${dossie.guia.titulo}`);
  l.push("");
  l.push(`Pedido a ${data(pedido.criadoEm)} · referência ${pedido.dossie.ref}`);
  l.push("");
  for (const item of pedido.itens) {
    const prazo = item.prazo ? ` — até ${data(item.prazo)}` : "";
    const quem = item.origem === "profissional" ? " _(pedido pelo contabilista)_" : "";
    l.push(`${item.n}. ${item.texto}${prazo}${quem}`);
    if (item.nota) l.push(`   > ${item.nota}`);
  }
  l.push("");
  l.push("---");
  l.push("");
  l.push(`Do ${referencia(dossie)}. ${RODAPE_DOSSIE}`);
  return l.join("\n");
}
