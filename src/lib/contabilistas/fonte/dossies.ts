// ═══════════════════════════════════════════════════════════════════════
//  DOSSIÊS DE GUIA — pela porta que sabe em que modo o painel está aberto
//  ---------------------------------------------------------------------
//  Ver `nucleo.ts`. A regra é a mesma que vale para todo o painel: a
//  página não sabe em que modo está, e por isso o ecrã que a demonstração
//  mostra é literalmente o ecrã real.
//
//  A leitura já vem resolvida por `fonte/dados.ts` — um dossiê chega como
//  `Partilha` com `tipo: "dossie_guia"`, e a demonstração devolve as suas.
//  O que falta é a ESCRITA: pedir elementos ao cliente.
//
//  Na demonstração, pedir NÃO escreve. E não é preguiça: a loja de
//  demonstração é um consultório inventado, e um pedido gravado ali criaria
//  a expectativa de uma resposta que nunca vem. Devolve-se sucesso porque é
//  o que a interface tem de saber para se comportar como no real — e não se
//  escreve porque não há a quem.
// ═══════════════════════════════════════════════════════════════════════

import type { PedidoDeElementos } from "@/lib/guias/dossie/tipos";
import { emDemonstracao } from "./nucleo";

export type OrigemDoPedido = "partilha" | "caso_dossie" | "ligacao";

export async function criarPedidoDeElementos(p: {
  origem: OrigemDoPedido;
  origemId: string;
  pedido: PedidoDeElementos;
  guiaSlug: string;
}): Promise<{ erro?: string; id?: string }> {
  if (emDemonstracao()) {
    return { id: `demo-${p.pedido.id}` };
  }
  // Importação dinâmica pela mesma razão que a loja: a camada de dados do
  // motor de dossiê não vai no pacote de quem abre o painel e nunca pede
  // nada.
  const { criarPedido } = await import("@/lib/guias/dossie/dados");
  return criarPedido(p);
}
