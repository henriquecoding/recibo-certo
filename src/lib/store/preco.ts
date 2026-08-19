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
  versao: 2;
  contexto: T;
  respondidos: readonly string[];
}

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
): { contexto: T; respondidos: string[] } | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as unknown;
    if (!lido || typeof lido !== "object") return null;

    const env = lido as Partial<EnvelopePreco<T>> & { versao?: number };

    if (env.versao === 2 && env.contexto && (env.contexto as T).versao === versaoContexto) {
      return {
        contexto: env.contexto as T,
        respondidos: Array.isArray(env.respondidos) ? env.respondidos.filter((r) => typeof r === "string") : [],
      };
    }

    // v1: o contexto era gravado à cabeça, sem envelope.
    if (env.versao === versaoContexto) {
      return { contexto: lido as T, respondidos: [] };
    }

    return null;
  } catch {
    return null;
  }
}

export function gravarContextoPreco(contexto: unknown, respondidos: readonly string[] = []): void {
  gravarChave(CHAVE(), JSON.stringify({ versao: 2, contexto, respondidos } satisfies EnvelopePreco<unknown>));
}

export function limparContextoPreco(): void {
  removerChave(CHAVE());
}
