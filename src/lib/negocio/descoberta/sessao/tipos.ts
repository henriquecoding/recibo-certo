import type { NaturezaOferta } from "../contexto/tipos";

export type AcaoFeedback = "interessa" | "mais-como-isto" | "nao-e-para-mim" | "nao-viavel-agora";

export type MotivoFeedback =
  | "tipo-de-trabalho"
  | "setor"
  | "clientes"
  | "modelo-de-receita"
  | "investimento"
  | "tempo"
  | "esforco-fisico"
  | "risco-regulacao"
  | "localizacao"
  | "outro";

export type EscopoFeedback = "candidato" | "problema" | "setor" | "modelo" | "capacidade";
export type ModoSessao = "normal" | "continuar" | "mais-como-isto" | "diferente";

/** Só os atributos necessários para reaplicar uma decisão localmente. */
export interface AssinaturaCandidato {
  candidatoId: string;
  problemaId: string;
  setor: string;
  modeloId: string;
  capacidadeId?: string;
  naturezas: readonly NaturezaOferta[];
}

export interface FeedbackDescoberta {
  id: string;
  acao: AcaoFeedback;
  motivo?: MotivoFeedback;
  escopo: EscopoFeedback;
  assinatura: AssinaturaCandidato;
}

/**
 * Vive apenas no estado React desta visita. Não usa localStorage, cookie,
 * conta ou Supabase; fechar/recarregar apaga o que o motor aprendeu.
 */
export interface SessaoDescoberta {
  versao: 1;
  vistos: readonly string[];
  feedback: readonly FeedbackDescoberta[];
  modo: ModoSessao;
  ancora?: AssinaturaCandidato;
}

export const SESSAO_INICIAL: SessaoDescoberta = Object.freeze({
  versao: 1,
  vistos: [],
  feedback: [],
  modo: "normal",
});

export function comVistos(sessao: SessaoDescoberta, ids: readonly string[]): SessaoDescoberta {
  return { ...sessao, vistos: [...new Set([...sessao.vistos, ...ids])] };
}

export function comFeedback(sessao: SessaoDescoberta, entrada: Omit<FeedbackDescoberta, "id">): SessaoDescoberta {
  const id = `f${sessao.feedback.length + 1}`;
  return { ...sessao, feedback: [...sessao.feedback, { ...entrada, id }] };
}
