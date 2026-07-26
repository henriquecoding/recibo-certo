// ═══════════════════════════════════════════════════════════════════════
//  CAMPOS DO HANDOFF — módulo isomórfico
//  ---------------------------------------------------------------------
//  Extraído de `handoff.server.ts` porque o diálogo de consentimento corre
//  no cliente e precisa dos rótulos, mas não pode arrastar `node:crypto`.
//
//  A lista de rótulos é a fronteira do que é enviável: se um campo não
//  estiver aqui, não pode ser proposto nem autorizado. O servidor valida
//  contra esta mesma lista, por isso um cliente adulterado não consegue
//  alargar o consentimento.
// ═══════════════════════════════════════════════════════════════════════

export type CampoHandoff =
  | "entityType" | "activityCategory" | "vatTerritory" | "vatRegimeEstimate" | "socialSecuritySituation"
  | "grossEstimate" | "vatEstimate" | "withholdingEstimate" | "socialSecurityEstimate" | "irsEstimate"
  | "period" | "intent" | "sourceGuide";

/** Rótulos em pt-PT — é isto que o utilizador lê antes de autorizar. */
export const ROTULO_CAMPO: Record<CampoHandoff, string> = {
  entityType: "Tipo de entidade (particular, empresário em nome individual ou sociedade)",
  activityCategory: "Categoria da atividade",
  vatTerritory: "Território para efeitos de IVA (continente, Madeira ou Açores)",
  vatRegimeEstimate: "Regime de IVA estimado",
  socialSecuritySituation: "Situação perante a Segurança Social",
  grossEstimate: "Valor bruto estimado",
  vatEstimate: "IVA estimado",
  withholdingEstimate: "Retenção na fonte estimada",
  socialSecurityEstimate: "Contribuição estimada para a Segurança Social",
  irsEstimate: "IRS estimado",
  period: "Periodicidade da estimativa",
  intent: "O que pretendes fazer a seguir",
  sourceGuide: "Guia ou simulador de onde vieste",
};

export const CAMPOS_VALIDOS = Object.keys(ROTULO_CAMPO) as CampoHandoff[];

/** Nunca sai daqui, em nenhuma circunstância (ponto 8.2 da arquitetura). */
export const CAMPOS_NUNCA_ENVIADOS = [
  "NIF", "NISS", "nome", "morada", "email", "telefone", "IBAN",
  "dados de clientes", "documentos emitidos", "anexos", "credenciais",
] as const;
