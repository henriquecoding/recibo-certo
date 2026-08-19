"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Persistência do estúdio de negócio — RASCUNHO LOCAL, e só local.
//
//  Um `ContextoNegocio` é a coisa mais sensível que este produto guarda:
//  custos de fornecedor, margens pretendidas, volumes esperados, a
//  estrutura de custos inteira e o CAC. Isso é segredo comercial de quem
//  o escreveu, não conteúdo a sincronizar por omissão.
//
//  ── A FRONTEIRA DO §24 ───────────────────────────────────────────────
//  · enquanto se edita  →  cofre local, escopado ao utilizador/browser,
//                          retomável, NUNCA sincronizado;
//  · «Guardar este projeto» →  aí sim, `useCenarios()` decide o destino,
//                          e a interface diz em voz alta quando é nuvem.
//
//  Autosave local não é consentimento para a nuvem. É a diferença entre
//  não perder trabalho e publicá-lo — e confundi-las uma vez basta para
//  a promessa `privacy: "local-only"` deixar de ser verdadeira.
//
//  A chave vive no cofre pela mesma razão que a do preço: num browser
//  partilhado, uma chave global mostrava o plano de negócios de quem
//  entrou antes. Ver `store/cofre.ts`.
// ─────────────────────────────────────────────────────────────────────────

import type { ContextoNegocio } from "@/lib/negocio/tipos";
import { chaveAtiva } from "./cofre";
import { gravarChave, lerChave, removerChave } from "./persistencia";

const CHAVE = () => chaveAtiva("negocio");

/** Versão do envelope. Sobe quando a forma do rascunho mudar. */
export const ENVELOPE_NEGOCIO_VERSAO = 1;

export interface EnvelopeNegocio {
  versao: typeof ENVELOPE_NEGOCIO_VERSAO;
  contexto: ContextoNegocio;
}

/**
 * Lê o rascunho. Devolve `null` a qualquer sinal de estranheza — um
 * estado ilegível nunca pode impedir a ferramenta de abrir, e um estado
 * de outra versão do esquema é pior do que nenhum.
 *
 * A validação é deliberadamente conservadora: confirma a FORMA (os
 * campos que o motor lê sem verificar) e não o conteúdo. Um volume
 * negativo é saneado pelos motores; um `ofertas` que não é array
 * rebentaria no primeiro `.map`.
 */
export function lerRascunhoNegocio(): ContextoNegocio | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as unknown;
    if (!lido || typeof lido !== "object") return null;

    const env = lido as Partial<EnvelopeNegocio>;
    if (env.versao !== ENVELOPE_NEGOCIO_VERSAO) return null;

    const c = env.contexto;
    if (!valido(c)) return null;
    return c;
  } catch {
    return null;
  }
}

function valido(c: unknown): c is ContextoNegocio {
  if (!c || typeof c !== "object") return false;
  const o = c as Partial<ContextoNegocio>;
  if (o.versao !== 1) return false;
  if (typeof o.id !== "string" || o.id.length === 0) return false;
  if (!Array.isArray(o.ofertas)) return false;
  // Uma oferta sem `pricing` faria `precificar()` rebentar no primeiro
  // acesso, e o ecrã ficaria em branco sem explicação.
  if (o.ofertas.some((of) => !of || typeof of !== "object" || !of.pricing || !of.volume)) return false;
  if (!o.estrutura || !Array.isArray(o.estrutura.overheadMensal)) return false;
  if (!Array.isArray(o.estrutura.investimentosIniciais)) return false;
  if (!o.procura || typeof o.procura.horizonteMeses !== "number") return false;
  if (!o.fiscal || typeof o.fiscal.enquadramento !== "string") return false;
  if (!Array.isArray(o.respondidos)) return false;
  if (!o.meta || typeof o.meta.criadoEm !== "string") return false;
  return true;
}

/**
 * Grava o rascunho. Silencioso por desenho: sem armazenamento disponível
 * (modo privado, quota cheia) a ferramenta continua a funcionar — só não
 * retoma. Uma calculadora que se recusa a calcular porque não consegue
 * guardar é pior do que uma que não guarda.
 */
export function gravarRascunhoNegocio(contexto: ContextoNegocio): void {
  gravarChave(
    CHAVE(),
    JSON.stringify({ versao: ENVELOPE_NEGOCIO_VERSAO, contexto } satisfies EnvelopeNegocio),
  );
}

export function limparRascunhoNegocio(): void {
  removerChave(CHAVE());
}

/** Há trabalho por retomar? Peek não-destrutivo, para o convite de retoma. */
export function haRascunhoNegocio(): boolean {
  return lerRascunhoNegocio() !== null;
}
