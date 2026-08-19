// A subscrição de calendário, pela porta que sabe em que modo o painel
// está aberto. Ver `nucleo.ts`.
//
// Na demonstração NÃO se finge que funciona. Um endereço de calendário que
// parece criado e não responde é pior do que um botão que recusa: a pessoa
// subscreve-o no telemóvel, fica à espera das consultas, e conclui que o
// produto está avariado. Recusa-se com a razão à frente.

import * as real from "@/lib/calendario/assinatura";
import type {
  Assinatura, DetalheDoCalendario, PapelDeCalendario,
} from "@/lib/calendario/assinatura";
import { emDemonstracao } from "./nucleo";

export type { Assinatura, DetalheDoCalendario, PapelDeCalendario };
export { urlDoFeed } from "@/lib/calendario/assinatura";

const NA_DEMONSTRACAO = {
  erro: "A demonstração não cria endereços de calendário. No painel real isto funciona.",
};

export async function obterAssinatura(
  papel: PapelDeCalendario,
): Promise<Assinatura | null> {
  if (emDemonstracao()) return null;
  return real.obterAssinatura(papel);
}

export async function criarOuRodar(
  papel: PapelDeCalendario,
  detalhe: DetalheDoCalendario = "completo",
  alarmeMin: number | null = 60,
): Promise<{ erro?: string; url?: string }> {
  if (emDemonstracao()) return NA_DEMONSTRACAO;
  return real.criarOuRodar(papel, detalhe, alarmeMin);
}

export async function ajustar(
  papel: PapelDeCalendario,
  detalhe: DetalheDoCalendario,
  alarmeMin: number | null,
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return NA_DEMONSTRACAO;
  return real.ajustar(papel, detalhe, alarmeMin);
}

export async function revogar(
  papel: PapelDeCalendario,
): Promise<{ erro?: string }> {
  if (emDemonstracao()) return NA_DEMONSTRACAO;
  return real.revogar(papel);
}
