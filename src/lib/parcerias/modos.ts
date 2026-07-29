// ═══════════════════════════════════════════════════════════════════════
//  MODO DE PARCERIA — o eixo que faltava
//  ---------------------------------------------------------------------
//  O código já classificava cada rota por política de dados (`GuideDataMode`).
//  O que faltava era o outro lado da equação: o que está CONTRATADO com o
//  parceiro hoje.
//
//  A rota diz o que PODERIA fazer. A parceria diz o que ESTÁ CONTRATADO.
//  O modo efetivo é o mínimo dos dois — e é por isso que a Fase 1 se faz
//  ACRESCENTANDO um eixo, não removendo trabalho: uma rota de handoff numa
//  parceria em modo LIGACAO degrada para ligação, não desaparece.
//
//  Este módulo é puro e sem dependências de servidor de propósito: é
//  importado tanto pelo cliente (para saber que copy mostrar) como pelo
//  servidor (para decidir se uma rota de handoff pode sequer correr).
// ═══════════════════════════════════════════════════════════════════════

import type { GuideDataMode } from "@/lib/guias/manifests";

/** O que está contratado com este parceiro, hoje. */
export type ModoParceria =
  | "LIGACAO" //             Fase 1 — link de afiliado. Sem dados, sem conta, sem consentimento.
  | "HANDOFF_CONSENTIDO" //  Fase 2 — o utilizador escolhe campos; token opaco e temporário.
  | "CONTA_LIGADA"; //       Fase 3 — OAuth por utilizador, estados e webhooks.

export const MODOS_PARCERIA: readonly ModoParceria[] = [
  "LIGACAO",
  "HANDOFF_CONSENTIDO",
  "CONTA_LIGADA",
] as const;

/** Ordem de permissividade. Só serve para comparar; não é exposta. */
const ORDEM: Record<ModoParceria, number> = {
  LIGACAO: 0,
  HANDOFF_CONSENTIDO: 1,
  CONTA_LIGADA: 2,
};

const DATA_MODE_PARA_MODO: Record<GuideDataMode, ModoParceria> = {
  NO_DATA: "LIGACAO",
  CONSENTED_HANDOFF: "HANDOFF_CONSENTIDO",
  CONNECTED_ACCOUNT: "CONTA_LIGADA",
};

/** Converte a política de dados de uma rota no modo que ela exigiria. */
export function modoDaRota(dataMode: GuideDataMode): ModoParceria {
  return DATA_MODE_PARA_MODO[dataMode];
}

/**
 * O modo efetivo de uma superfície é o MÍNIMO entre o que a parceria tem
 * contratado e o que a rota declara precisar.
 *
 * Uma rota `CONSENTED_HANDOFF` numa parceria em `LIGACAO` corre em `LIGACAO`
 * — mostra o botão, abre o site do parceiro, e não transporta nada. O
 * inverso também vale: uma rota `NO_DATA` numa parceria com OAuth continua a
 * ser uma ligação simples, porque é tudo o que ela precisa.
 */
export function modoEfetivo(daParceria: ModoParceria, daRota: GuideDataMode): ModoParceria {
  const rota = modoDaRota(daRota);
  return ORDEM[daParceria] <= ORDEM[rota] ? daParceria : rota;
}

/** true quando o modo permite transportar dados do utilizador. */
export function transportaDados(modo: ModoParceria): boolean {
  return ORDEM[modo] >= ORDEM.HANDOFF_CONSENTIDO;
}

/** Converte um valor vindo da base de dados, com omissão segura. */
export function modoValido(valor: unknown): ModoParceria {
  return MODOS_PARCERIA.includes(valor as ModoParceria) ? (valor as ModoParceria) : "LIGACAO";
}
