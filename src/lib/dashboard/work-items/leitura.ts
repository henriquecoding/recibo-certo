"use client";

// ─────────────────────────────────────────────────────────────────────────
//  A LEITURA CRUA DOS COFRES — sem passar pelas stores.
//
//  Parece um desvio e não é. As stores de Descobrir, de Preço e de Negócio
//  importam os motores para VALIDAR o que leem: `perfil-descoberta.ts`
//  traz `CONTEXTO_INICIAL` e `ATIVOS` do motor de descoberta,
//  `hipoteses-mercado.ts` traz a geografia de mercado, `negocio.ts` traz as
//  migrações. Está certo — quem devolve um `OpportunityContext` tem de o
//  saber normalizar.
//
//  Mas a visão geral não quer um `OpportunityContext`. Quer saber se há
//  trabalho e de quando é. Chamar as stores para isso arrastaria os
//  motores para o chunk da página que tem de ser a mais leve do produto
//  (§15.2 do relatório: nada de `descoberta/**`, `market/bulk/**` ou
//  `pricing/**` no overview).
//
//  Por isso lê-se aqui a chave do cofre e olha-se só para os METADADOS do
//  envelope. Nunca para os dados sensíveis lá dentro.
// ─────────────────────────────────────────────────────────────────────────

import { chaveAtiva, type Dominio } from "@/lib/store/cofre";
import { lerChave } from "@/lib/store/persistencia";

export type Leitura<T> =
  | { estado: "vazio" }
  | { estado: "lido"; valor: T }
  /** Existe, e não se consegue ler. Nunca se confunde com «vazio». */
  | { estado: "ilegivel"; versaoEncontrada?: number };

export function lerEnvelope<T extends object>(dominio: Dominio): Leitura<T> {
  let bruto: string | null = null;
  try {
    bruto = lerChave(chaveAtiva(dominio));
  } catch {
    // `lerChave` já engole o erro; isto cobre um `chaveAtiva` sem cofre.
    return { estado: "ilegivel" };
  }
  if (!bruto) return { estado: "vazio" };

  try {
    const valor: unknown = JSON.parse(bruto);
    if (!valor || typeof valor !== "object") return { estado: "ilegivel" };
    return { estado: "lido", valor: valor as T };
  } catch {
    return { estado: "ilegivel" };
  }
}

/** ISO válido, ou `null`. Uma data inválida não pode ordenar uma lista. */
export function iso(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length === 0) return null;
  const t = Date.parse(valor);
  return Number.isNaN(t) ? null : valor;
}

/** O mais recente de um conjunto de datas. `null` quando não há nenhuma. */
export function maisRecente(...datas: Array<string | null | undefined>): string | null {
  const validas = datas.map(iso).filter((d): d is string => d !== null);
  if (validas.length === 0) return null;
  return validas.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}

export const arrayDe = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : []);
