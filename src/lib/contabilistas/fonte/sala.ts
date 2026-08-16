// A sala de acompanhamento — pela porta que sabe em que modo o painel
// está aberto. Ver `nucleo.ts`.

import * as real from "../sala/dados";
import type { EventoTimeline, PedidoCliente } from "../sala/tipos";
import { emDemonstracao, loja } from "./nucleo";

export type { DecisaoPedido, NovoPedido } from "../sala/dados";

export async function listarPedidos(vinculoId: string): Promise<PedidoCliente[]> {
  if (emDemonstracao()) return (await loja()).listarPedidos(vinculoId);
  return real.listarPedidos(vinculoId);
}

export async function criarPedido(
  p: real.NovoPedido,
): Promise<{ erro?: string; id?: string }> {
  if (emDemonstracao()) return (await loja()).criarPedido(p);
  return real.criarPedido(p);
}

export async function responderPedido(p: {
  pedidoId: string;
  texto?: string | null;
  mensagemId?: string | null;
}): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).responderPedido(p);
  return real.responderPedido(p);
}

export async function decidirPedido(
  pedidoId: string,
  decisao: real.DecisaoPedido,
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).decidirPedido(pedidoId, decisao);
  return real.decidirPedido(pedidoId, decisao);
}

export async function listarTimeline(p: {
  vinculoId: string;
  ate?: string | null;
  limite?: number;
}): Promise<EventoTimeline[]> {
  if (emDemonstracao()) return (await loja()).listarTimeline(p);
  return real.listarTimeline(p);
}

/** Na demonstração não se abre canal nenhum — devolve o adeus vazio. */
export function escutarPedidos(vinculoId: string, aoMudar: () => void): () => void {
  if (emDemonstracao()) return () => {};
  return real.escutarPedidos(vinculoId, aoMudar);
}
