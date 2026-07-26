// ═══════════════════════════════════════════════════════════════════════
//  MODO DE PRÉ-VISUALIZAÇÃO DA INTEGRAÇÃO FIZ
//  ---------------------------------------------------------------------
//  Problema real: a parceria está em negociação, não há credenciais nem
//  sandbox, e sem isso a integração é invisível — não há forma de rever o
//  desenho antes de a FIZ existir do outro lado.
//
//  Este módulo serve um catálogo de capacidades LOCAL e simula a resolução
//  de rotas e o handoff, para que a experiência completa possa ser vista e
//  discutida. Nada sai para a rede.
//
//  Salvaguardas, porque um modo assim não pode ser confundido com o real:
//    · liga em deploys de ramo e em desenvolvimento; em produção só com
//      NEXT_PUBLIC_FIZ_PREVIEW="true", explicitamente;
//    · desliga-se sozinho se houver credenciais reais configuradas — a
//      partir daí manda sempre a FIZ verdadeira;
//    · tudo o que devolve vem marcado com `preview: true`, e a interface
//      mostra um aviso permanente;
//    · o URL de destino aponta para uma página nossa de explicação, não
//      para a FIZ: em pré-visualização ninguém é enviado para lado nenhum.
// ═══════════════════════════════════════════════════════════════════════

import { fizAtiva, previewPermitidoNoCliente } from "./flag";
import { fizServerConfig } from "./config";
import type { CapabilityCatalog, GuideRoute } from "./contracts";

export function previewAtivo(): boolean {
  if (!fizAtiva()) return false;
  if (!previewPermitidoNoCliente()) return false;
  // Se há credenciais reais, a pré-visualização sai de cena — a FIZ
  // verdadeira manda sempre.
  const c = fizServerConfig();
  return !(c.clientId && c.clientSecret);
}

/** Destino usado em pré-visualização: uma página nossa, nunca a FIZ. */
export function destinoDePreview(): string {
  return `${fizServerConfig().appUrl}/integracoes/fiz/pre-visualizacao`;
}

/**
 * Catálogo simulado. As chaves correspondem exatamente às que os manifestos
 * dos Guias e as rotas dos simuladores pedem — é isso que torna a
 * pré-visualização fiel: se faltar uma capacidade aqui, a interface mostra
 * "indisponível", tal como faria em produção.
 *
 * Os estados foram escolhidos para exercitar TODOS os casos da interface,
 * não para dar sempre o caminho feliz.
 */
export function catalogoDePreview(): CapabilityCatalog {
  const agora = new Date();
  const validade = new Date(agora.getTime() + 60 * 60 * 1000);

  return {
    version: "preview-2026-07-26",
    generatedAt: agora.toISOString(),
    validUntil: validade.toISOString(),
    capabilities: [
      {
        key: "onboarding.freelancer",
        label: "Abertura de atividade com acompanhamento",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "MIXED"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["START_ONBOARDING"],
      },
      {
        key: "onboarding.review-setup",
        label: "Revisão do enquadramento fiscal",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "MIXED"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["REVIEW_SETUP"],
      },
      {
        key: "invoicing.draft",
        label: "Preparar documento na FIZ",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "COMPANY"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["CREATE_DRAFT"],
      },
      {
        key: "invoicing.withholding-setup",
        label: "Configurar retenção na fonte",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["CONFIGURE"],
      },
      {
        key: "invoicing.foreign-customer",
        label: "Preparar cliente estrangeiro",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["CONFIGURE"],
      },
      {
        key: "vat.setup",
        label: "Tratar do IVA na FIZ",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "COMPANY"],
        dataModes: ["CONNECTED_ACCOUNT"],
        actions: ["OPEN_DECLARATION"],
        requiredScopes: ["obligations.read", "declarations.read"],
      },
      {
        key: "social-security.declaration",
        label: "Declaração trimestral de Segurança Social",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI"],
        dataModes: ["CONNECTED_ACCOUNT"],
        actions: ["OPEN_DECLARATION"],
        requiredScopes: ["obligations.read", "declarations.read"],
      },
      {
        key: "obligations.overview",
        label: "As minhas obrigações reais",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "COMPANY", "EMPLOYEE", "MIXED"],
        dataModes: ["CONNECTED_ACCOUNT"],
        actions: ["OPEN_OVERVIEW"],
        requiredScopes: ["obligations.read", "deadlines.read"],
      },
      {
        key: "irs.preparation",
        label: "Preparação do IRS",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "EMPLOYEE", "MIXED"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["START_IRS"],
      },
      {
        key: "irs.status",
        label: "Estado do IRS",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "EMPLOYEE", "MIXED"],
        dataModes: ["CONNECTED_ACCOUNT"],
        actions: ["OPEN_STATUS"],
        requiredScopes: ["declarations.read"],
      },
      {
        key: "expenses.categories",
        label: "Categorias de despesa",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "COMPANY"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["CONFIGURE"],
      },
      {
        // Serviço pago da FIZ — exercita o estado "requer_plano_fiz", para se
        // ver que nunca é confundido com o Recibo Certo Plus.
        key: "accountant.assessment",
        label: "Avaliação por contabilista",
        availability: "AVAILABLE",
        audiences: ["TI", "ENI", "COMPANY", "MIXED"],
        dataModes: ["NO_DATA", "CONSENTED_HANDOFF"],
        actions: ["REQUEST_ASSESSMENT"],
        productKeys: ["fiz.contabilidade"],
      },
      {
        key: "company.onboarding",
        label: "Constituição de empresa",
        availability: "AVAILABLE",
        audiences: ["COMPANY", "ENI"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["START_COMPANY"],
        productKeys: ["fiz.empresas"],
      },
      {
        // Degradada de propósito: mostra que a interface continua utilizável.
        key: "company.obligations",
        label: "Obrigações da empresa",
        availability: "DEGRADED",
        audiences: ["COMPANY"],
        dataModes: ["CONNECTED_ACCOUNT"],
        actions: ["OPEN_OVERVIEW"],
        requiredScopes: ["obligations.read"],
      },
      {
        // Indisponível de propósito: o guia correspondente não mostra nada.
        key: "tax-setup.review",
        label: "Revisão da configuração fiscal",
        availability: "UNAVAILABLE",
        audiences: ["TI", "ENI"],
        dataModes: ["CONSENTED_HANDOFF"],
        actions: ["REVIEW_SETUP"],
      },
    ],
  };
}

/** Resolução simulada de uma rota, a partir do catálogo local. */
export function rotaDePreview(entrada: {
  capabilityKey: string;
  dataMode: GuideRoute["dataMode"];
  label: string;
}): GuideRoute | null {
  const cap = catalogoDePreview().capabilities.find((c) => c.key === entrada.capabilityKey);
  if (!cap) return null;

  return {
    destinationKey: `${entrada.capabilityKey}.preview`,
    capabilityKey: cap.key,
    action: cap.actions[0] ?? "OPEN",
    dataMode: entrada.dataMode,
    requiresConsent: entrada.dataMode === "CONSENTED_HANDOFF",
    label: entrada.label,
    disclosure:
      "Pré-visualização: a integração com a FIZ ainda não está ativa. Nenhum dado é enviado e nenhuma ação é executada.",
    requiredScopes: cap.requiredScopes ?? [],
    availability: cap.availability,
    unavailableReason: cap.availability === "UNAVAILABLE" ? "Capacidade desativada nesta pré-visualização." : null,
  };
}
