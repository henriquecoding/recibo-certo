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

export function gravarContextoPreco(contexto: unknown): void {
  gravarChave(CHAVE(), JSON.stringify(contexto));
}

export function limparContextoPreco(): void {
  removerChave(CHAVE());
}
