"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Persistência do simulador de preço.
//
//  Local e só local. A calculadora funciona sem conta, sem login e sem
//  email — é o que o catálogo promete (`access.account: "none"`,
//  `privacy: "local-only"`) e é o que o código tem de cumprir. Nada disto
//  vai para a nuvem, mesmo com sessão iniciada.
//
//  A chave vive no cofre porque um contexto de preço é dados de uma pessoa:
//  custos de fornecedor, faturação anual prevista e margens pretendidas.
//  Num browser partilhado, deixá-la global mostrava a estrutura de custos
//  de quem entrou antes — o problema que `store/cofre.ts` existe para
//  fechar.
// ─────────────────────────────────────────────────────────────────────────

import { lerChave, gravarChave, removerChave } from "./persistencia";
import { chaveAtiva } from "./cofre";
import { anunciarMudanca } from "@/lib/dashboard/eventos";

const CHAVE = () => chaveAtiva("preco");

/**
 * O que se guarda a partir da v2: o contexto E o que a pessoa respondeu.
 *
 * `respondidos` não cabe dentro do `ContextoPreco` de propósito — esse é o
 * contrato do motor, e quais campos foram tocados é assunto da interface.
 * Envelopá-los mantém as duas coisas juntas no cofre sem as misturar no
 * tipo.
 */
export interface EnvelopePreco<T> {
  versao: 3;
  contexto: T;
  respondidos: readonly string[];
  /**
   * ISO da última gravação.
   *
   * ┌───────────────────────────────────────────────────────────────┐
   * │ SEM DATA NÃO HÁ «CONTINUAR DE ONDE FICASTE»                    │
   * │                                                               │
   * │ O envelope v2 sabia o que estava a meio e não sabia de quando. │
   * │ Um painel que ordena trabalho por recência não conseguia pôr o │
   * │ rascunho de preço na fila — a única coisa que podia fazer era  │
   * │ inventar uma data, e uma data inventada num cartão é           │
   * │ indistinguível de uma verdadeira.                              │
   * │                                                               │
   * │ Um envelope v2 continua a ler-se (a migração é na leitura, e   │
   * │ nunca se apaga a chave antiga no mesmo ciclo). Fica sem data   │
   * │ até à gravação seguinte, e o painel diz isso em vez de fingir. │
   * └───────────────────────────────────────────────────────────────┘
   */
  atualizadoEm: string;
}

/** A versão que se escreve hoje. A leitura aceita as anteriores. */
export const ENVELOPE_PRECO_VERSAO = 3;

/**
 * Lê o contexto guardado. Devolve `null` a qualquer sinal de estranheza —
 * um estado ilegível nunca pode impedir a ferramenta de abrir, e um estado
 * de outra versão do esquema é pior do que nenhum.
 */
export function lerContextoPreco<T extends { versao: number }>(versaoEsperada: number): T | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as T;
    if (!lido || typeof lido !== "object" || lido.versao !== versaoEsperada) return null;
    return lido;
  } catch {
    return null;
  }
}

/**
 * Lê o envelope v2 e, não o encontrando, aceita um contexto v1 solto.
 *
 * A retrocompatibilidade não é cortesia: quem tinha meia hora de custos
 * de fornecedor introduzidos abriria a ferramenta e encontrá-la-ia vazia,
 * sem nada que explicasse porquê. Um cofre v1 lê-se como um contexto sem
 * nenhum campo respondido — que é exatamente o que ele é, porque a
 * informação nunca foi guardada.
 */
export function lerEnvelopePreco<T extends { versao: number }>(
  versaoContexto: number,
): { contexto: T; respondidos: string[]; atualizadoEm: string | null } | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as unknown;
    if (!lido || typeof lido !== "object") return null;

    const env = lido as Partial<EnvelopePreco<T>> & { versao?: number };

    // v3 e v2 têm a mesma forma; a v3 acrescenta a data. Aceitar as duas é
    // o que impede que meia hora de custos introduzidos desapareça só
    // porque o esquema cresceu.
    if ((env.versao === 3 || env.versao === 2) && env.contexto && (env.contexto as T).versao === versaoContexto) {
      return {
        contexto: env.contexto as T,
        respondidos: Array.isArray(env.respondidos) ? env.respondidos.filter((r) => typeof r === "string") : [],
        atualizadoEm: typeof env.atualizadoEm === "string" ? env.atualizadoEm : null,
      };
    }

    // v1: o contexto era gravado à cabeça, sem envelope.
    if (env.versao === versaoContexto) {
      return { contexto: lido as T, respondidos: [], atualizadoEm: null };
    }

    return null;
  } catch {
    return null;
  }
}

export function gravarContextoPreco(contexto: unknown, respondidos: readonly string[] = []): void {
  const envelope: EnvelopePreco<unknown> = {
    versao: ENVELOPE_PRECO_VERSAO,
    contexto,
    respondidos,
    atualizadoEm: new Date().toISOString(),
  };
  const r = gravarChave(CHAVE(), JSON.stringify(envelope));
  // Só se anuncia o que ficou mesmo gravado (§12.3).
  if (r.ok) anunciarMudanca("preco");
}

export function limparContextoPreco(): void {
  removerChave(CHAVE());
  anunciarMudanca("preco");
}
