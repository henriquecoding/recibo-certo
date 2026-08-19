"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Preços guardados — os produtos a que a pessoa já pôs preço.
//
//  Local e só local, como o contexto de trabalho: `privacy: "local-only"`
//  no catálogo não é uma etiqueta, é uma promessa. Uma lista de produtos
//  com custos de fornecedor e margens é exatamente o tipo de coisa que não
//  pode sair do dispositivo sem que alguém o peça.
//
//  Vive no cofre (`store/cofre.ts`), e não numa chave global: num browser
//  partilhado, a estrutura de custos de quem entrou antes não pode ficar à
//  vista de quem entra a seguir.
// ─────────────────────────────────────────────────────────────────────────

import { lerChave, gravarChave, removerChave } from "./persistencia";
import { chaveAtiva } from "./cofre";

const CHAVE = () => chaveAtiva("precos-guardados");

/** Quantos cabem. Passar disto é sinal de que falta uma ferramenta, não espaço. */
export const MAXIMO_GUARDADOS = 24;

export interface PrecoGuardado<T = unknown> {
  id: string;
  /** O nome que a pessoa deu. É por ele que os distingue. */
  nome: string;
  /** ISO da última gravação. */
  em: string;
  /** O cenário, para o cartão poder dizer do que se trata. */
  cenario: string;
  /**
   * Os três números que fazem uma comparação valer a pena. Guardados
   * porque recalcular vinte contextos ao abrir uma lista é trabalho a
   * mais para mostrar uma grelha.
   */
  pvp: number;
  margem: number;
  lucroMensal: number;
  /** O contexto completo, para se poder reabrir e continuar. */
  contexto: T;
  /** Os campos que tinham sido respondidos. */
  respondidos: string[];
}

interface Envelope<T> {
  versao: 1;
  itens: PrecoGuardado<T>[];
}

/** Lê a lista. Qualquer estranheza devolve vazio — nunca um erro. */
export function lerPrecosGuardados<T>(): PrecoGuardado<T>[] {
  const bruto = lerChave(CHAVE());
  if (!bruto) return [];
  try {
    const lido = JSON.parse(bruto) as Envelope<T>;
    if (!lido || lido.versao !== 1 || !Array.isArray(lido.itens)) return [];
    return lido.itens.filter((i) => i && typeof i.id === "string" && typeof i.nome === "string");
  } catch {
    return [];
  }
}

/**
 * Grava um preço. Se já existir um com o mesmo `id`, substitui-o — é o que
 * «guardar outra vez» significa depois de mexer nos números.
 */
export function guardarPreco<T>(item: PrecoGuardado<T>): PrecoGuardado<T>[] {
  const atuais = lerPrecosGuardados<T>();
  const semEste = atuais.filter((i) => i.id !== item.id);
  const novos = [item, ...semEste].slice(0, MAXIMO_GUARDADOS);
  gravarChave(CHAVE(), JSON.stringify({ versao: 1, itens: novos } satisfies Envelope<T>));
  return novos;
}

export function apagarPrecoGuardado<T>(id: string): PrecoGuardado<T>[] {
  const novos = lerPrecosGuardados<T>().filter((i) => i.id !== id);
  if (novos.length === 0) {
    removerChave(CHAVE());
    return [];
  }
  gravarChave(CHAVE(), JSON.stringify({ versao: 1, itens: novos } satisfies Envelope<T>));
  return novos;
}
