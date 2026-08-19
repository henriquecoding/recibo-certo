// O programa fundador e a negociação, pela porta que sabe em que modo o
// painel está aberto. Ver `nucleo.ts`.
//
// A demonstração mostra o ECRÃ inteiro — um contabilista a experimentar o
// painel tem de perceber o que o programa é — mas não escreve nada. Um
// lugar de fundador atribuído numa demonstração seria uma promessa que a
// base de dados não conhece, e uma proposta de valor enviada para o
// administrador seria uma pessoa real a receber trabalho a partir de um
// ecrã de exemplo.

import * as real from "@/lib/contabilistas/progressao/dados";
import {
  LUGARES_FUNDADORES,
  type LugaresFundadores, type PropostaDesbloqueio,
} from "@/lib/contabilistas/progressao/fundadores";
import { emDemonstracao } from "./nucleo";

export type { LugaresFundadores, PropostaDesbloqueio };

const NA_DEMONSTRACAO = {
  erro: "A demonstração não envia propostas ao administrador. No painel real isto funciona.",
};

/**
 * Na demonstração, os lugares aparecem com sete ocupados.
 *
 * Não é um número inventado a fingir de real: é um exemplo — como o resto
 * da loja de demonstração — escolhido para o ecrã mostrar as duas coisas
 * que interessam, o contador a contar e o programa ainda aberto.
 */
export async function lugaresFundadores(): Promise<LugaresFundadores> {
  if (emDemonstracao()) {
    return {
      total: LUGARES_FUNDADORES, ocupados: 7, restantes: 3,
      esgotado: false, verificado: true,
    };
  }
  return real.lugaresFundadores();
}

export async function meuLugarDeFundador(): Promise<{
  numero: number; atribuidoEm: string;
} | null> {
  if (emDemonstracao()) return null;
  return real.meuLugarDeFundador();
}

export async function minhasPropostas(): Promise<PropostaDesbloqueio[]> {
  if (emDemonstracao()) return [];
  return real.minhasPropostas();
}

export async function proporValor(
  valorCents: number, justificacao: string,
): Promise<{ erro?: string; id?: string }> {
  if (emDemonstracao()) return NA_DEMONSTRACAO;
  return real.proporValor(valorCents, justificacao);
}

export async function aceitarContraproposta(id: string): Promise<{ erro?: string }> {
  if (emDemonstracao()) return NA_DEMONSTRACAO;
  return real.aceitarContraproposta(id);
}
