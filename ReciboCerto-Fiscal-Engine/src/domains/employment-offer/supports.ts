import type { ISODate } from "../../core/model";
import { eurCents } from "../../core/money";
import { supportAmountWithMajorations } from "../../releases/pt-employer-2026";
import type {
  HiringSupportCatalog,
  HiringSupportProgram,
  SupportFactSheet,
} from "../../releases/types";
import type { SupportAssessment, SupportRequirementVerdict } from "./types";

/**
 * Triagem declarativa de apoios à contratação.
 *
 * Substitui a lista fechada em `policy-2026.ts`, que dava falsos positivos e
 * falsos negativos (MOT-P0-010). Três correções materiais, verificadas nas
 * páginas oficiais das medidas a 31 de agosto de 2026:
 *
 * 1. As duas medidas exigem contrato a tempo completo. O motor só validava
 *    `fullTime` numa delas.
 * 2. A cronologia certa não é «candidatura antes do contrato». O contrato
 *    pode ser celebrado antes da candidatura, desde que DEPOIS do registo da
 *    oferta no iefponline, e a candidatura entra dentro dos 30 dias seguidos
 *    a esse registo.
 * 3. Faltavam requisitos materiais — criação líquida de emprego, situação
 *    regularizada, despedimentos recentes, piso remuneratório do +Talento —
 *    e faltavam montante, majorações, manutenção e risco de restituição.
 *
 * Um estado `potential` diz apenas «compatível com os factos declarados».
 * Não é candidatura aberta, não é dotação disponível e não é aprovação.
 */

export interface SupportAssessmentQuery {
  catalogue: HiringSupportCatalog;
  /** Data a que a triagem se refere. */
  asOf: ISODate;
  facts: SupportFactSheet | undefined;
}

function assessProgram(
  program: HiringSupportProgram,
  asOf: ISODate,
  facts: SupportFactSheet,
): SupportAssessment {
  const maxAmount = supportAmountWithMajorations(
    program,
    program.majorations.slice(0, program.maxMajorations).map((item) => item.id),
  );

  const base = {
    id: program.id,
    name: program.name,
    authority: program.authority,
    programVersion: program.programVersion,
    sourceUrl: program.sourceUrl,
    sourceIds: program.sourceIds,
    verifiedAt: program.verifiedAt,
    applicationWindow: program.applicationWindow,
    budgetStatus: program.budgetStatus,
    baseAmount: program.baseAmount,
    baseAmountBasis: program.baseAmountBasis,
    maxAmountWithMajorations: eurCents(maxAmount.cents),
    majorations: program.majorations.map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.detail,
    })),
    maintenanceMonths: program.maintenanceMonths,
    clawback: program.clawback,
    conditionalOnly: true as const,
  };

  const requirements: SupportRequirementVerdict[] = program.requirements.map(
    (requirement) => {
      const outcome = requirement.evaluate(facts);
      return {
        key: requirement.key,
        subject: requirement.subject,
        label: requirement.label,
        detail: requirement.detail,
        outcome: outcome.kind,
        message: outcome.kind === "unmet" ? outcome.reason : outcome.kind === "unknown" ? outcome.asks : undefined,
      };
    },
  );

  // A janela fecha antes de qualquer requisito material: não vale a pena
  // perguntar factos por uma candidatura que já não se apresenta.
  if (asOf < program.applicationWindow.from || asOf > program.applicationWindow.to) {
    return {
      ...base,
      status: "window_closed",
      explanation:
        asOf > program.applicationWindow.to
          ? `O período de candidaturas terminou a ${program.applicationWindow.to}. Confirma no IEFP se abriu novo período.`
          : `O período de candidaturas abre a ${program.applicationWindow.from}.`,
      requirements,
      missingFacts: [],
    };
  }

  if (program.budgetStatus === "exhausted") {
    return {
      ...base,
      status: "window_closed",
      explanation: "A dotação da medida está esgotada para este período.",
      requirements,
      missingFacts: [],
    };
  }

  const unmet = requirements.filter((item) => item.outcome === "unmet");
  if (unmet.length > 0) {
    return {
      ...base,
      status: "not_applicable",
      explanation: `Os factos indicados não cumprem: ${unmet.map((item) => item.label.toLocaleLowerCase("pt-PT")).join("; ")}.`,
      requirements,
      missingFacts: [],
    };
  }

  const unknown = requirements.filter((item) => item.outcome === "unknown");
  if (unknown.length > 0) {
    return {
      ...base,
      status: "needs_input",
      explanation:
        "Há uma medida potencialmente compatível, mas faltam factos para uma triagem responsável.",
      requirements,
      missingFacts: unknown.map((item) => item.message ?? item.label),
    };
  }

  return {
    ...base,
    status: "potential",
    explanation:
      "Os factos declarados são compatíveis com os requisitos publicados. Não é aprovação, não confirma dotação disponível e não reduz o custo do posto.",
    requirements,
    missingFacts: [],
  };
}

export function assessHiringSupports(
  query: SupportAssessmentQuery,
): readonly SupportAssessment[] {
  const facts = query.facts ?? {};
  return query.catalogue.programs.map((program) =>
    assessProgram(program, query.asOf, facts),
  );
}
