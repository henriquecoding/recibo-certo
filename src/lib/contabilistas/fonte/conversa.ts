// A conversa e o sino, pela porta que sabe em que modo o painel está
// aberto. Ver `nucleo.ts`.
//
// Os limites (`ANEXO_MAX_BYTES`, `ANEXOS_MAX`, `MENSAGEM_MAX`,
// `TIPOS_ANEXO_ACEITES`) e o `tamanhoLegivel` reexportam-se tal e qual: a
// demonstração tem de recusar um ficheiro de 12 MB pela mesma razão e com o
// mesmo número que o painel real.

import * as real from "../conversa";
import type { Mensagem, Notificacao } from "../conversa";
import { emDemonstracao, loja } from "./nucleo";

export {
  ANEXOS_MAX, ANEXO_MAX_BYTES, MENSAGEM_MAX, TIPOS_ANEXO_ACEITES, tamanhoLegivel,
} from "../conversa";
export type { Anexo, Mensagem, Notificacao, ResultadoEnvio, TipoNotificacao } from "../conversa";

export async function listarMensagens(vinculoId: string): Promise<Mensagem[]> {
  if (emDemonstracao()) return (await loja()).listarMensagens(vinculoId);
  return real.listarMensagens(vinculoId);
}

export async function enviarMensagem(p: {
  vinculoId: string;
  autorId: string;
  corpo: string;
  ficheiros?: File[];
}): Promise<real.ResultadoEnvio> {
  if (emDemonstracao()) return (await loja()).enviarMensagem(p);
  return real.enviarMensagem(p);
}

export async function marcarLidas(vinculoId: string, meuId: string): Promise<void> {
  if (emDemonstracao()) return (await loja()).marcarLidas(vinculoId, meuId);
  return real.marcarLidas(vinculoId, meuId);
}

export async function urlDoAnexo(
  caminho: string,
  tipo: "anexo" | "documento" = "anexo"
): Promise<string | null> {
  if (emDemonstracao()) return (await loja()).semFicheiro();
  return real.urlDoAnexo(caminho, tipo);
}

/**
 * As escutas não abrem canal na demonstração.
 *
 * São síncronas — devolvem já a função de cancelamento — e por isso não
 * passam pela loja: não há nada para carregar, e devolver um adeus vazio é
 * exatamente o comportamento certo quando ninguém vai escrever do outro lado.
 */
export function escutarMensagens(vinculoId: string, aoChegar: (m: Mensagem) => void): () => void {
  if (emDemonstracao()) return () => {};
  return real.escutarMensagens(vinculoId, aoChegar);
}

export function escutarNotificacoes(userId: string, aoChegar: (n: Notificacao) => void): () => void {
  if (emDemonstracao()) return () => {};
  return real.escutarNotificacoes(userId, aoChegar);
}

export async function listarNotificacoes(limite = 30): Promise<Notificacao[]> {
  if (emDemonstracao()) return (await loja()).listarNotificacoes(limite);
  return real.listarNotificacoes(limite);
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  if (emDemonstracao()) return (await loja()).marcarNotificacaoLida(id);
  return real.marcarNotificacaoLida(id);
}

export async function marcarTodasLidas(): Promise<void> {
  if (emDemonstracao()) return (await loja()).marcarTodasLidas();
  return real.marcarTodasLidas();
}
