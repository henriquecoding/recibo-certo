"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Hipóteses de negócio — LOCAL, e só local.
//
//  Aqui ficam entrevistas, orçamentos aceites, pilotos pagos e vendas. É
//  prova comercial de quem escreveu e, muitas vezes, informação sobre
//  clientes concretos. O relatório é explícito: perfil, localização exata,
//  entrevistas e clientes ficam no dispositivo por omissão.
//
//  Por isso este repositório não tem — nem pode ganhar sem uma decisão
//  deliberada — qualquer caminho para a nuvem. O pack público de mercado
//  viaja na direção contrária: entra, não sai.
//
//  A chave vive no cofre pela mesma razão do rascunho de negócio: num
//  browser partilhado, uma chave global mostrava a carteira de clientes de
//  quem entrou antes. Ver `store/cofre.ts`.
// ─────────────────────────────────────────────────────────────────────────

import type { MarketHypothesis, MarketProof } from "@/lib/negocio/market/hipoteses";
import { marketRegion, type MarketRegion } from "@/lib/negocio/market/geografia";
import { chaveAtiva } from "./cofre";
import { gravarChave, lerChave, removerChave } from "./persistencia";
import { anunciarMudanca } from "@/lib/dashboard/eventos";

const CHAVE = () => chaveAtiva("hipoteses-mercado");

export const ENVELOPE_HIPOTESES_VERSAO = 1;

export interface EnvelopeHipoteses {
  versao: typeof ENVELOPE_HIPOTESES_VERSAO;
  hipoteses: MarketHypothesis[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PROOF_KINDS = new Set(["interview", "accepted_quote", "pre_sale", "paid_pilot", "sale"]);

function provaValida(value: unknown): value is MarketProof {
  if (!value || typeof value !== "object") return false;
  const proof = value as Partial<MarketProof>;
  return (
    typeof proof.id === "string" &&
    proof.id.length > 0 &&
    typeof proof.kind === "string" &&
    PROOF_KINDS.has(proof.kind) &&
    typeof proof.occurredAt === "string" &&
    ISO_DATE.test(proof.occurredAt)
  );
}

/**
 * Valida a FORMA, não o conteúdo — a mesma disciplina do rascunho de
 * negócio. Uma prova malformada é descartada sozinha; não leva as outras
 * atrás nem impede a ferramenta de abrir.
 */
function hipoteseValida(value: unknown): value is MarketHypothesis {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MarketHypothesis>;
  return (
    typeof item.templateId === "string" &&
    item.templateId.length > 0 &&
    typeof item.region === "string" &&
    marketRegion(item.region) !== undefined &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string" &&
    Array.isArray(item.proofs)
  );
}

function sanear(item: MarketHypothesis): MarketHypothesis {
  return {
    ...item,
    region: item.region as MarketRegion,
    proofs: item.proofs.filter(provaValida),
    requirementsReviewed: item.requirementsReviewed === true,
    pricing:
      item.pricing &&
      typeof item.pricing.priceNet === "number" &&
      Number.isFinite(item.pricing.priceNet)
        ? item.pricing
        : undefined,
  };
}

export function lerHipoteses(): MarketHypothesis[] {
  const bruto = lerChave(CHAVE());
  if (!bruto) return [];
  try {
    const lido = JSON.parse(bruto) as Partial<EnvelopeHipoteses> | null;
    if (!lido || lido.versao !== ENVELOPE_HIPOTESES_VERSAO || !Array.isArray(lido.hipoteses)) {
      return [];
    }
    return lido.hipoteses.filter(hipoteseValida).map(sanear);
  } catch {
    return [];
  }
}

/**
 * Grava a lista inteira. Silencioso por desenho: sem armazenamento (janela
 * privada, quota cheia) a ferramenta continua a calcular — só não retoma.
 */
export function gravarHipoteses(hipoteses: readonly MarketHypothesis[]): void {
  gravarChave(
    CHAVE(),
    JSON.stringify({
      versao: ENVELOPE_HIPOTESES_VERSAO,
      hipoteses: [...hipoteses],
    } satisfies EnvelopeHipoteses),
  );
  anunciarMudanca("hipoteses");
}

export function lerHipotese(templateId: string): MarketHypothesis | undefined {
  return lerHipoteses().find((item) => item.templateId === templateId);
}

/** Substitui a hipótese deste template, conservando todas as outras. */
export function guardarHipotese(hipotese: MarketHypothesis): MarketHypothesis[] {
  const restantes = lerHipoteses().filter((item) => item.templateId !== hipotese.templateId);
  const proximas = [...restantes, sanear(hipotese)].sort((left, right) =>
    left.templateId.localeCompare(right.templateId),
  );
  gravarHipoteses(proximas);
  return proximas;
}

export function apagarHipotese(templateId: string): MarketHypothesis[] {
  const proximas = lerHipoteses().filter((item) => item.templateId !== templateId);
  gravarHipoteses(proximas);
  return proximas;
}

export function limparHipoteses(): void {
  removerChave(CHAVE());
  anunciarMudanca("hipoteses");
}
