import type { DatasetManifest } from "../core/model";
import { LEGAL_SOURCE_LIST } from "../legal/catalogue";

/**
 * Manifesto intencionalmente não aprovado. O motor recusa-o por defeito até
 * existirem revisão fiscal, testes dourados e registo de aprovação.
 */
export const PT_2026_DATASET: DatasetManifest = Object.freeze({
  id: "pt-2026.2026-07-22-draft.1",
  schemaVersion: "1.0.0",
  taxYear: 2026,
  status: "draft",
  effective: { from: "2026-01-01", to: "2026-12-31" },
  jurisdictions: ["PT-CONTINENTE", "PT-MADEIRA", "PT-ACORES"],
  sourceIds: LEGAL_SOURCE_LIST.map((source) => source.id),
  productionReady: false,
  createdAt: "2026-07-22",
  notes: [
    "Payroll funcional em draft; os restantes domínios continuam contratuais.",
    "O adaptador de retenção reutiliza temporariamente tabelas do legado e exige validação dourada.",
    "Não alterar para approved sem revisão fiscal independente e testes dourados.",
    "Portugal é a jurisdição normativa; países estrangeiros são apenas países de fonte.",
  ],
} satisfies DatasetManifest);

export const DATASETS: readonly DatasetManifest[] = Object.freeze([PT_2026_DATASET]);
