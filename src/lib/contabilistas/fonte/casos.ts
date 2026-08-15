// Os casos encaminhados, pela porta que sabe em que modo o painel está
// aberto. Ver `nucleo.ts`.
//
// As constantes e as funções puras — `AREAS`, `URGENCIAS`, `euros`,
// `nifValido`, `estadoDoCasoLegivel` — reexportam-se tal e qual. Não têm
// dois modos porque não tocam em dados.

import * as real from "../casos";
import type {
  AnexoDaProposta, Caso, DocumentoDoCaso, MensagemDoCaso, NovaProposta, Proposta,
} from "../casos";
import { emDemonstracao, loja } from "./nucleo";

export {
  AREAS, SITUACAO_MAX, SITUACAO_MIN, TETO_DE_ENCAMINHAMENTOS, URGENCIAS,
  estadoDoCasoLegivel, euros, nifMascarado, nifValido,
} from "../casos";
export type {
  AnexoDaProposta, AreaDoCaso, Caso, DocumentoDoCaso, EstadoDoCaso, EstadoMensagem,
  EstadoProposta, MensagemDoCaso, NovaProposta, Proposta, UrgenciaDoCaso,
} from "../casos";

export async function listarCasos(): Promise<Caso[]> {
  if (emDemonstracao()) return (await loja()).listarCasos();
  return real.listarCasos();
}

export async function listarMensagensDoCaso(casoId: string): Promise<MensagemDoCaso[]> {
  if (emDemonstracao()) return (await loja()).listarMensagensDoCaso(casoId);
  return real.listarMensagensDoCaso(casoId);
}

export async function listarPropostas(casoId: string): Promise<Proposta[]> {
  if (emDemonstracao()) return (await loja()).listarPropostas(casoId);
  return real.listarPropostas(casoId);
}

export async function submeterMensagem(
  casoId: string,
  autorId: string,
  papel: "cliente" | "contabilista",
  corpo: string
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).submeterMensagem(casoId, autorId, papel, corpo);
  return real.submeterMensagem(casoId, autorId, papel, corpo);
}

export async function enviarProposta(p: NovaProposta): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).enviarProposta(p);
  return real.enviarProposta(p);
}

export async function listarDocumentosDoCaso(casoId: string): Promise<DocumentoDoCaso[]> {
  if (emDemonstracao()) return (await loja()).listarDocumentosDoCaso(casoId);
  return real.listarDocumentosDoCaso(casoId);
}

export async function listarAnexosDaProposta(propostaId: string): Promise<AnexoDaProposta[]> {
  if (emDemonstracao()) return (await loja()).listarAnexosDaProposta(propostaId);
  return real.listarAnexosDaProposta(propostaId);
}

/**
 * Anexar e descarregar não existem na demonstração — e não se fingem.
 *
 * Um ficheiro que parece subir e não sobe é pior do que um erro: a pessoa
 * fica a achar que enviou o contrato. Aqui recusa-se com a razão à frente.
 */
export async function enviarFicheiro(
  contexto: "caso" | "proposta",
  alvo: string,
  ficheiro: File,
  opcoes?: { eContrato?: boolean }
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return (await loja()).envioRecusado();
  return real.enviarFicheiro(contexto, alvo, ficheiro, opcoes);
}

export async function urlDoFicheiro(caminho: string): Promise<string | null> {
  if (emDemonstracao()) return (await loja()).semFicheiro();
  return real.urlDoFicheiro(caminho);
}

export function escutarCaso(casoId: string, aoMudar: () => void): () => void {
  // Sem canal de Realtime na demonstração: não há segunda pessoa do outro
  // lado a escrever, e abrir uma ligação por montagem gastaria o plano a
  // ouvir uma sala vazia.
  if (emDemonstracao()) return () => {};
  return real.escutarCaso(casoId, aoMudar);
}
