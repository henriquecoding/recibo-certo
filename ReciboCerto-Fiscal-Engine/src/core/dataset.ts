import type { EffectivePeriod, Jurisdiction } from "./types";

/**
 * Estado de revisão de um dataset (ARCHITECTURE.md, secção "Aprovação").
 * `draft` — construção; `reviewed` — revisão técnica concluída;
 * `approved` — revisão fiscal registada e cenários dourados aprovados;
 * `retired` — impede novas avaliações, preserva reprodutibilidade histórica.
 */
export type DatasetStatus = "draft" | "reviewed" | "approved" | "retired";

export interface DatasetParameter {
  key: string;
  value: number;
  unit: "cents" | "ppm" | "count" | "years";
  legalBasis: string;
  sourceKey: string;
  lastVerified: string;
}

export interface DatasetReviewer {
  role: "tecnico" | "fiscal" | "juridico";
  name: string;
  date: string;
}

/**
 * Manifesto de dataset anual (RELATORIO §9.4). Imutável — uma alteração de
 * ano cria um novo dataset, nunca uma mutação do anterior.
 */
export interface Dataset {
  id: string;
  taxYear: number;
  schemaVersion: string;
  status: DatasetStatus;
  effectivePeriod: EffectivePeriod;
  jurisdictions: Jurisdiction[];
  parameters: DatasetParameter[];
  reviewers: DatasetReviewer[];
}

export function findParameter(dataset: Dataset, key: string): DatasetParameter | undefined {
  return dataset.parameters.find((p) => p.key === key);
}

/**
 * Um dataset só pode produzir decisões `ok` quando `approved` — ou quando o
 * contexto tem `allowUnapprovedDataset` (só para dev/testes; nunca exposto
 * pela aplicação pública). Ver `engine.ts::evaluate`, que aplica este gate.
 */
export function isApproved(dataset: Dataset): boolean {
  return dataset.status === "approved";
}
