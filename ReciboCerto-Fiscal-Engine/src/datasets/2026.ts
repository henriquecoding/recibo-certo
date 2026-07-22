import type { Dataset } from "../core/dataset";
import type { IsoDate } from "../core/types";

/**
 * Manifesto do dataset fiscal 2026. Deliberadamente `status: "draft"` — em
 * modo normal, `core/engine.ts::evaluate` recusa produzir decisões `ok` com
 * este dataset (ver `tests/core.test.ts`).
 *
 * Contém apenas um punhado de parâmetros reais, para provar o padrão
 * ponta-a-ponta (dataset → regra → decisão), não uma réplica de
 * `src/lib/fiscal-data.ts`. Os valores foram verificados nesta sessão contra
 * fontes oficiais (ver `legalBasis`/`sourceKey`), mas a aprovação do dataset
 * como um todo (revisão fiscal assinada, cenários dourados) ainda não
 * aconteceu — daí o `status: "draft"`.
 */
export const DATASET_2026: Dataset = {
  id: "pt-2026",
  taxYear: 2026,
  schemaVersion: "0.1.0",
  status: "draft",
  effectivePeriod: { from: "2026-01-01" as IsoDate, to: "2026-12-31" as IsoDate },
  jurisdictions: ["PT-CONTINENTE", "PT-MADEIRA", "PT-ACORES"],
  parameters: [
    {
      key: "minimo_existencia",
      value: 1_288_000, // 12 880,00 € em cêntimos
      unit: "cents",
      legalBasis: "Art. 70.º CIRS — mínimo de existência 2026 (RMMG 920 € × 14)",
      sourceKey: "art70cirs",
      lastVerified: "2026-06-11",
    },
    {
      key: "iva_isencao_limite",
      value: 1_500_000, // 15 000,00 € em cêntimos
      unit: "cents",
      legalBasis: "Art. 53.º CIVA — limite de isenção do regime especial",
      sourceKey: "portalFinancasIVA",
      lastVerified: "2026-06-11",
    },
    {
      key: "adicional_solidariedade_limiar1",
      value: 8_000_000, // 80 000,00 € em cêntimos
      unit: "cents",
      legalBasis: "Art. 68.º-A, n.º 1, al. a) CIRS — 1.º limiar do adicional de solidariedade",
      sourceKey: "art68aCirs",
      lastVerified: "2026-07-22",
    },
    {
      key: "adicional_solidariedade_limiar2",
      value: 25_000_000, // 250 000,00 € em cêntimos
      unit: "cents",
      legalBasis: "Art. 68.º-A, n.º 1, al. b) CIRS — 2.º limiar do adicional de solidariedade",
      sourceKey: "art68aCirs",
      lastVerified: "2026-07-22",
    },
    {
      key: "adicional_solidariedade_taxa1",
      value: 25_000, // 2,5% em ppm
      unit: "ppm",
      legalBasis: "Art. 68.º-A, n.º 1, al. a) CIRS — taxa de 2,5% entre 80 000 € e 250 000 €",
      sourceKey: "art68aCirs",
      lastVerified: "2026-07-22",
    },
    {
      key: "adicional_solidariedade_taxa2",
      value: 50_000, // 5% em ppm
      unit: "ppm",
      legalBasis: "Art. 68.º-A, n.º 1, al. b) CIRS — taxa de 5% acima de 250 000 €",
      sourceKey: "art68aCirs",
      lastVerified: "2026-07-22",
    },
  ],
  reviewers: [],
};
