// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGO DE CAPACIDADES DA FIZ
//  ---------------------------------------------------------------------
//  Ponto 6.1/6.3 da arquitetura: o Recibo Certo não codifica URLs da FIZ em
//  dezenas de componentes. Pergunta ao catálogo o que está disponível e usa
//  a chave devolvida.
//
//  Cache por versão, com "última versão válida" servida durante falhas
//  curtas — o Guia nunca fica preso à espera da FIZ.
// ═══════════════════════════════════════════════════════════════════════

import { pedirFiz } from "./client.server";
import { PARTNER_SCOPES, type CapabilityCatalog, type Capability, type CapabilityAvailability } from "./contracts";
import { FizError } from "./errors";

interface CacheCatalogo {
  catalogo: CapabilityCatalog;
  obtidoEm: number;
}

const TTL_MS = 10 * 60 * 1000;
/** Durante quanto tempo servimos um catálogo expirado se a FIZ falhar. */
const TOLERANCIA_MS = 24 * 60 * 60 * 1000;

let cache: CacheCatalogo | null = null;

export function limparCacheCapacidades(): void {
  cache = null;
}

export interface ResultadoCatalogo {
  catalogo: CapabilityCatalog | null;
  /** true quando estamos a servir cache expirada por a FIZ estar em baixo. */
  degradado: boolean;
}

export async function obterCatalogo(): Promise<ResultadoCatalogo> {
  const agora = Date.now();
  if (cache && agora - cache.obtidoEm < TTL_MS) {
    return { catalogo: cache.catalogo, degradado: false };
  }

  try {
    const { dados, naoModificado } = await pedirFiz<CapabilityCatalog>({
      caminho: "/v1/partner/capabilities",
      scopes: [PARTNER_SCOPES.capabilities],
      query: { ifVersion: cache?.catalogo.version },
      aceitarNaoModificado: true,
    });

    if (naoModificado && cache) {
      cache = { catalogo: cache.catalogo, obtidoEm: agora };
      return { catalogo: cache.catalogo, degradado: false };
    }
    if (dados) {
      cache = { catalogo: dados, obtidoEm: agora };
      return { catalogo: dados, degradado: false };
    }
    throw new FizError("indisponivel", "Catálogo de capacidades vazio.");
  } catch (erro) {
    // Falha curta: continuamos com a última versão válida, marcada como tal.
    if (cache && agora - cache.obtidoEm < TOLERANCIA_MS) {
      return { catalogo: cache.catalogo, degradado: true };
    }
    if (erro instanceof FizError && erro.silencioso) {
      return { catalogo: null, degradado: false };
    }
    return { catalogo: null, degradado: true };
  }
}

export async function capacidade(chave: string): Promise<Capability | null> {
  const { catalogo } = await obterCatalogo();
  return catalogo?.capabilities.find((c) => c.key === chave) ?? null;
}

/** Uma capacidade ausente do catálogo é tratada como indisponível — nunca
    como disponível por omissão. */
export async function disponibilidadeDe(chave: string): Promise<CapabilityAvailability> {
  const c = await capacidade(chave);
  return c?.availability ?? "UNAVAILABLE";
}

/** Invalidação por webhook `partner.capability.changed`. */
export function invalidarCatalogo(): void {
  cache = null;
}
