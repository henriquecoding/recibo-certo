/**
 * Modelo de fonte legal com validação semântica (RELATORIO §7, "Porque o
 * verificador atual falha"). O verificador legado
 * (`scripts/check-fiscal-data.mjs --check-sources`) só confirma HTTP 200 —
 * uma página de legislação revogada também responde 200. Este modelo guarda
 * o suficiente para detetar isso.
 */
export type SourceAuthority =
  | "portal-financas"
  | "diario-republica"
  | "seguranca-social"
  | "gov-pt"
  | "occ"
  | "outra";

export type SourceState = "active" | "superseded" | "pending" | "conflict" | "withdrawn";

export interface LegalSource {
  key: string;
  authority: SourceAuthority;
  /** URL tal como usada no motor. */
  url: string;
  /** URL final após redirecionamentos, se diferente de `url`. */
  canonicalUrl?: string;
  /** Excerto de título esperado na página (ex.: "Artigo 87.º"). */
  expectedTitleContains: string[];
  /** Expressões cuja presença invalida a fonte (ex.: "versão até 2013"). */
  forbiddenPhrases: string[];
  legalReference: string;
  effectivePeriod: { from: string; to?: string };
  state: SourceState;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface FetchedContent {
  finalUrl: string;
  title: string;
  bodyText: string;
}

export interface SourceValidationResult {
  valid: boolean;
  problems: string[];
}
