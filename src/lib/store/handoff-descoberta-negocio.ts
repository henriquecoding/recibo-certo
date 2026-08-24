"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A PONTE DESCOBERTA → ESTÚDIO DE NEGÓCIO
//  ---------------------------------------------------------------------
//  ┌──────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTAVA PARTIDO                                              │
//  │                                                                  │
//  │ O dossier só oferecia «construir no estúdio» quando a hipótese    │
//  │ coincidia com um dos 24 dossiers curados, porque a ponte era um   │
//  │ `?o=<id do catálogo>` e um id de catálogo é a única coisa que uma │
//  │ composição gerada não tem.                                       │
//  │                                                                  │
//  │ Ou seja: as hipóteses que o motor existe para compor — as que     │
//  │ ninguém escreveu à mão — eram exatamente as que não tinham        │
//  │ continuidade. Numa corrida real com duas hipóteses apresentadas,  │
//  │ uma seguia para o estúdio e a outra acabava ali.                  │
//  └──────────────────────────────────────────────────────────────────┘
//
//  ── PORQUE NÃO VAI NO URL ──────────────────────────────────────────
//  §10, a mesma regra da ponte estúdio → empresa: um `?nome=Serviço+de
//  +limpeza+para+alojamento+local` fica no histórico, nos logs de quem
//  servir a página e no `document.referrer`. O id curado podia lá andar
//  porque é público e não diz nada sobre quem o escolheu; o título de uma
//  hipótese COMPOSTA a partir das competências de alguém já diz.
//
//  ── O QUE ESTA PONTE LEVA ──────────────────────────────────────────
//  Duas coisas, e mais nenhuma: o cenário de preço e o nome da oferta. É
//  o `OpportunityPricingSeed` que o estúdio já aceitava do caminho
//  curado — nem capital, nem receita estimada, nem pontuação. O estúdio
//  não herda números do motor de descoberta; herda uma OFERTA por
//  preencher, e a pricing engine continua a ser a única a calcular.
//
//  ── TTL MAIS CURTO QUE O DA PONTE PARA A EMPRESA ───────────────────
//  Trinta minutos, e não duas horas. A ponte para o simulador de empresa
//  tem um ecrã de revisão pelo meio («isto é o que vamos levar»); esta é
//  um clique só e o efeito aparece já dentro do estúdio. Uma chave
//  esquecida durante duas horas voltava a semear uma oferta a quem
//  entrasse no estúdio pela barra lateral, sem perceber de onde vinha.
// ═══════════════════════════════════════════════════════════════════════

import { CENARIOS_INICIAIS, type CenarioInicial } from "@/lib/pricing/tipos";
import type { OpportunityPricingSeed } from "@/lib/negocio/market/opportunity-handoff";
import { chaveAtiva } from "./cofre";
import { gravarChave, lerChave, removerChave } from "./persistencia";

const CHAVE = () => chaveAtiva("handoff-descoberta-negocio");

/** A versão do envelope. Sobe quando a forma mudar. */
export const SEMENTE_VERSAO = 1;

/** Ver a nota do cabeçalho: metade de meia hora chega para atravessar. */
export const SEMENTE_TTL_MS = 30 * 60 * 1000;

/** O nome de uma oferta não é um parágrafo. */
const NOME_MAX = 120;

interface EnvelopeSemente {
  versao: typeof SEMENTE_VERSAO;
  gravadoEm: number;
  semente: OpportunityPricingSeed;
}

/**
 * Guarda a semente. Silencioso por desenho, como a outra ponte: sem
 * armazenamento (modo privado, quota cheia) o estúdio abre na mesma — só
 * não recebe a oferta, e a pessoa cria-a como sempre criou.
 */
export function guardarSementeOportunidade(semente: OpportunityPricingSeed): boolean {
  const nome = semente.nome.trim().slice(0, NOME_MAX);
  if (nome.length === 0) return false;
  if (!CENARIOS_INICIAIS.includes(semente.cenario)) return false;

  const envelope: EnvelopeSemente = {
    versao: SEMENTE_VERSAO,
    gravadoEm: Date.now(),
    semente: { cenario: semente.cenario, nome },
  };
  return gravarChave(CHAVE(), JSON.stringify(envelope)).ok;
}

/**
 * Espreita sem consumir.
 *
 * Devolve `null` a qualquer sinal de estranheza — versão errada, JSON
 * ilegível, fora do prazo, cenário que já não existe. Um estado que não
 * se percebe nunca pode impedir o estúdio de abrir.
 */
export function espreitarSementeOportunidade(): OpportunityPricingSeed | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;

  try {
    const lido: unknown = JSON.parse(bruto);
    if (!lido || typeof lido !== "object") return null;

    const env = lido as Partial<EnvelopeSemente>;
    if (env.versao !== SEMENTE_VERSAO) return null;
    if (typeof env.gravadoEm !== "number" || !Number.isFinite(env.gravadoEm)) return null;
    // Um `gravadoEm` no futuro é relógio trocado, não uma ponte válida.
    const idade = Date.now() - env.gravadoEm;
    if (idade < 0 || idade > SEMENTE_TTL_MS) return null;

    return normalizarSemente(env.semente);
  } catch {
    return null;
  }
}

/**
 * Lê E APAGA. É o que o estúdio chama à entrada.
 *
 * Apagar mesmo quando a validação falha é deliberado: um payload que não
 * passa hoje também não passa amanhã, e deixá-lo lá garantia que voltava
 * a falhar em cada abertura.
 */
export function consumirSementeOportunidade(): OpportunityPricingSeed | null {
  const s = espreitarSementeOportunidade();
  limparSementeOportunidade();
  return s;
}

export function limparSementeOportunidade(): void {
  removerChave(CHAVE());
}

/**
 * Aceita o que reconhece, recusa o resto inteiro.
 *
 * §95 — nunca `as` sobre um `JSON.parse`. Meia semente (nome sem cenário)
 * faria o estúdio criar uma oferta com um cenário por omissão e apresentá-la
 * como se tivesse vindo do motor.
 */
export function normalizarSemente(bruto: unknown): OpportunityPricingSeed | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;

  if (typeof o.nome !== "string") return null;
  const nome = o.nome.trim();
  if (nome.length === 0 || nome.length > NOME_MAX) return null;

  if (typeof o.cenario !== "string") return null;
  if (!CENARIOS_INICIAIS.includes(o.cenario as CenarioInicial)) return null;

  return { cenario: o.cenario as CenarioInicial, nome };
}
