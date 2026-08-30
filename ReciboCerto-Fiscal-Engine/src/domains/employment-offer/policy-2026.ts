import type { ISODate } from "../../core/model";
import type {
  HiringSupportFacts,
  SupportAssessment,
} from "./types";

export const EMPLOYMENT_OFFER_ENGINE_VERSION = "employment-offer-2026.1.0";
export const EMPLOYMENT_OFFER_POLICY_DATE: ISODate = "2026-08-30";

interface SupportPolicy {
  id: string;
  name: string;
  sourceUrl: string;
  verifiedAt: ISODate;
  applicationWindow: { from: ISODate; to: ISODate };
  required: readonly {
    key: keyof HiringSupportFacts;
    label: string;
    accepts: (value: unknown) => boolean;
  }[];
}

const OPEN_WINDOW = {
  from: "2026-07-15",
  to: "2026-12-15",
} as const satisfies { from: ISODate; to: ISODate };

const SUPPORTS_2026: readonly SupportPolicy[] = [
  {
    id: "iefp-mais-emprego-2026",
    name: "+Emprego",
    sourceUrl: "https://www.iefp.pt/apoios-a-contratacao",
    verifiedAt: EMPLOYMENT_OFFER_POLICY_DATE,
    applicationWindow: OPEN_WINDOW,
    required: [
      { key: "registeredUnemployed", label: "inscrição no IEFP", accepts: (v) => v === true },
      { key: "permanentContract", label: "contrato sem termo", accepts: (v) => v === true },
      { key: "applicationBeforeContract", label: "candidatura antes do contrato", accepts: (v) => v === true },
    ],
  },
  {
    id: "iefp-emprego-mais-talento-2026",
    name: "Emprego +Talento",
    sourceUrl: "https://www.iefp.pt/apoios-a-contratacao",
    verifiedAt: EMPLOYMENT_OFFER_POLICY_DATE,
    applicationWindow: OPEN_WINDOW,
    required: [
      { key: "registeredUnemployed", label: "inscrição no IEFP", accepts: (v) => v === true },
      { key: "permanentContract", label: "contrato sem termo", accepts: (v) => v === true },
      { key: "fullTime", label: "tempo completo", accepts: (v) => v === true },
      { key: "applicationBeforeContract", label: "candidatura antes do contrato", accepts: (v) => v === true },
      { key: "candidateAge", label: "idade do candidato", accepts: (v) => typeof v === "number" && v <= 35 },
      { key: "qualificationLevel", label: "nível de qualificação", accepts: (v) => typeof v === "number" && v >= 6 },
    ],
  },
];

export function assessHiringSupports(
  asOf: ISODate,
  facts: HiringSupportFacts | undefined,
): readonly SupportAssessment[] {
  return SUPPORTS_2026.map((support) => {
    const base = {
      id: support.id,
      name: support.name,
      sourceUrl: support.sourceUrl,
      verifiedAt: support.verifiedAt,
      applicationWindow: support.applicationWindow,
      conditionalOnly: true as const,
    };
    if (asOf < support.applicationWindow.from || asOf > support.applicationWindow.to) {
      return {
        ...base,
        status: "window_closed" as const,
        explanation: "A janela conhecida não abrange a data desta simulação. Confirma uma nova abertura no IEFP.",
        missingFacts: [],
      };
    }

    const missing = support.required
      .filter((requirement) => facts?.[requirement.key] === undefined)
      .map((requirement) => requirement.label);
    if (missing.length > 0) {
      return {
        ...base,
        status: "needs_input" as const,
        explanation: "Há uma medida potencial, mas faltam factos para uma triagem responsável.",
        missingFacts: missing,
      };
    }

    const rejected = support.required.filter(
      (requirement) => !requirement.accepts(facts?.[requirement.key]),
    );
    if (rejected.length > 0) {
      return {
        ...base,
        status: "not_applicable" as const,
        explanation: `Os factos indicados não cumprem: ${rejected.map((item) => item.label).join(", ")}.`,
        missingFacts: [],
      };
    }

    return {
      ...base,
      status: "potential" as const,
      explanation: "Os factos mínimos parecem compatíveis. Isto não é aprovação nem reduz automaticamente o custo.",
      missingFacts: [],
    };
  });
}

