import {
  selectEmploymentPolicy,
  type ReleaseSelection,
  type ReleaseSelectionContext,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { legacy2026WithholdingResolver } from "@/lib/payroll-engine-adapter";

/**
 * Fronteira única entre a aplicação e o motor patronal.
 *
 * É o ÚNICO módulo da aplicação autorizado a compor um contexto de release e
 * a chamar o seletor. Componentes, páginas e superfícies de demonstração
 * pedem aqui — e o que recebem é um `EmploymentPolicyBundle` ou uma recusa
 * explicada. Nenhum deles volta a importar uma política anual
 * (relatório, MOT-P0-001, MOT-P0-013).
 *
 * O resolvedor de retenção continua a vir do adaptador do legado. Fica
 * amarrado aqui, num sítio só, para que a substituição por tabelas do
 * release seja uma linha e não uma caça pelo repositório.
 */

export type PedidoDeRelease = Omit<ReleaseSelectionContext, "withholding">;

export function resolverReleasePatronal(pedido: PedidoDeRelease): ReleaseSelection {
  return selectEmploymentPolicy({
    ...pedido,
    withholding: legacy2026WithholdingResolver,
  });
}

/** Frase pública da recusa. Deriva do estado, não é escrita à mão na UI. */
export function explicarRecusa(selection: Exclude<ReleaseSelection, { kind: "ready" }>): {
  titulo: string;
  detalhe: string;
  motivos: readonly string[];
} {
  if (selection.kind === "stale_policy") {
    return {
      titulo: "Ainda não há regras publicadas para esta data",
      detalhe:
        "O planeador não reutiliza a política de outro ano para preencher o vazio. Assim que o release desta vigência for publicado, o cenário volta a abrir.",
      motivos: [selection.reason],
    };
  }
  return {
    titulo: "Este caso está fora do que o release cobre",
    detalhe:
      "Preferimos dizer que não sabemos a devolver um número que não conseguimos sustentar.",
    motivos: selection.reasons,
  };
}
