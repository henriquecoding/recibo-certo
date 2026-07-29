// ═══════════════════════════════════════════════════════════════════════
//  MANIFESTO DE ENCAMINHAMENTO PARA A FIZ
//  ---------------------------------------------------------------------
//  Ponto 5.1 da arquitetura da parceria. Tabela versionada, testável e
//  revista sempre que um Guia ou uma capacidade da FIZ mudarem.
//
//  É DERIVADO de `src/lib/guias/manifests.ts` — a fonte única continua a
//  ser o manifesto do Guia. Este módulo existe para dar à FIZ (e à revisão
//  conjunta) uma vista única e estável de todas as rotas acordadas, no
//  formato do contrato, sem ter de ler os manifestos completos.
//
//  Ponto 5.4: nenhuma rota contém URLs. O destino resolve-se por chave.
// ═══════════════════════════════════════════════════════════════════════

import {
  GUIDE_MANIFESTS,
  type FizIntent,
  type GuideTopic,
  type GuideDataMode,
} from "@/lib/guias/manifests";
import type { GuideAudience } from "@/lib/guias/claims";
import { FIZ_CONTRACT_VERSION } from "@/lib/fiz/contracts";

export interface FizGuideRoute {
  guideSlug: string;
  topic: GuideTopic;
  audience: GuideAudience[];
  intent: FizIntent;
  /** O que o utilizador vai conseguir fazer a seguir, em pt-PT. */
  recommendedAction: string;
  /** Chave de capacidade pedida ao catálogo. NUNCA um URL. */
  destinationKey: string;
  dataMode: GuideDataMode;
  requiredScopes: string[];
  /** Ações irreversíveis ficam sempre do lado da FIZ, com revisão humana. */
  exigeRevisaoHumana: boolean;
  /** Só entra em produção depois da validação bilateral (ponto 3). */
  enabled: boolean;
}

/** Scopes mínimos por modo de dados. A ligação básica não pede escrita. */
const SCOPES_POR_MODO: Record<GuideDataMode, string[]> = {
  NO_DATA: [],
  CONSENTED_HANDOFF: [],
  CONNECTED_ACCOUNT: ["profile.read", "obligations.read", "deadlines.read", "declarations.read"],
};

/**
 * Rotas ativadas, POR LOTES.
 *
 * A regra anterior era «nada ativo até à validação bilateral», e estava
 * certa enquanto o único modo possível era o handoff. Com um modo de ligação
 * contratado, a regra real é outra: uma rota nunca corre em modo mais
 * permissivo do que o que a parceria tem contratado — e isso é garantido por
 * `modoEfetivo()`, não por uma lista vazia.
 *
 * Começa-se pelos Guias de maior tráfego e com a intenção mais bem servida
 * pelo destino da FIZ. Os restantes entram depois de haver números destes.
 * Ativar uma rota AINDA NÃO A PÕE NO AR: é preciso `PARCERIAS_ATIVAS=true` no
 * ambiente e a linha da parceria ativa no Supabase.
 */
const ROTAS_ATIVAS: readonly string[] = [
  "abrir-atividade",
  "regime-simplificado",
  "iva-recibos-verdes",
  "seguranca-social",
  "retencao-na-fonte",
];

export const FIZ_GUIDE_ROUTES: FizGuideRoute[] = GUIDE_MANIFESTS.flatMap((m) => {
  if (!m.fizAction) return [];
  const a = m.fizAction;
  return [{
    guideSlug: m.slug,
    topic: a.topic,
    audience: m.audiences,
    intent: a.intent,
    recommendedAction: a.fallbackLabel,
    destinationKey: a.requiredCapability,
    dataMode: a.dataPolicy,
    requiredScopes: SCOPES_POR_MODO[a.dataPolicy],
    exigeRevisaoHumana: a.exigeRevisaoHumana ?? false,
    enabled: ROTAS_ATIVAS.includes(m.slug),
  }];
});

/** Guias que, por decisão editorial, NÃO encaminham para a FIZ.
    Documentado para que a ausência não pareça um esquecimento. */
export const GUIAS_SEM_ACAO_FIZ: { slug: string; razao: string }[] = GUIDE_MANIFESTS
  .filter((m) => !m.fizAction)
  .map((m) => ({
    slug: m.slug,
    razao:
      m.slug === "recibo-vencimento"
        ? "Sem envio por defeito: o conteúdo é de trabalho dependente e a continuação natural é uma ferramenta do ReciboCerto."
        : m.slug === "subsidios-ferias-natal"
          ? "Guia informativo de direito laboral — não existe ação operacional fiscal a executar."
          : m.slug === "trabalho-suplementar"
            ? "A continuação é a calculadora do ReciboCerto, não uma operação fiscal."
            : "Sem ação operacional correspondente no catálogo da FIZ.",
  }));

export const MANIFESTO_ROTAS_META = {
  contractVersion: FIZ_CONTRACT_VERSION,
  revistoEm: "2026-07-26",
  totalGuias: GUIDE_MANIFESTS.length,
  comAcao: FIZ_GUIDE_ROUTES.length,
  semAcao: GUIAS_SEM_ACAO_FIZ.length,
  ativas: FIZ_GUIDE_ROUTES.filter((r) => r.enabled).length,
} as const;

export function rotaDoGuia(slug: string): FizGuideRoute | undefined {
  return FIZ_GUIDE_ROUTES.find((r) => r.guideSlug === slug);
}

/** true quando este Guia tem rota FIZ E ela está ativada. */
export function rotaDoGuiaAtiva(slug: string): boolean {
  return rotaDoGuia(slug)?.enabled ?? false;
}

/**
 * Slugs listados em `ROTAS_ATIVAS` que não correspondem a nenhum Guia com
 * `fizAction`. Um erro de escrita aqui é silencioso — a rota simplesmente
 * nunca ativa —, por isso fica exposto para o teste o apanhar.
 */
export const ROTAS_ATIVAS_ORFAS: readonly string[] = ROTAS_ATIVAS.filter(
  (slug) => !FIZ_GUIDE_ROUTES.some((r) => r.guideSlug === slug),
);
