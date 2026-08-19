// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → ROUTING COMERCIAL
//  ---------------------------------------------------------------------
//  `escolherRota()` já decide entre sem parceiro, contabilista, FIZ e
//  Plus, com hierarquia auditável e motivo legível. Este adapter só
//  produz os SINAIS — nunca uma rota, nunca um CTA próprio.
//
//  ── A GUARDA QUE MAIS IMPORTA ──────────────────────────────────────
//  Um resultado `exploratorio` é um exemplo: sai dos valores por omissão
//  dos cenários e ninguém o confirmou. Monetizar isso é exatamente a
//  «ansiedade mal resolvida» que o §12.1 proíbe monetizar — por isso a
//  confiança sai como `fora_de_escopo`, e a primeira regra de
//  `escolherRota` fecha todas as rotas comerciais sozinha.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoConfianca } from "@/lib/analytics/eventos";
import type { SinaisDoUtilizador } from "@/lib/routing";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

/** A confiança do negócio, na escala que a medição e o routing usam. */
export function confiancaParaRouting(negocio: ResultadoNegocio): EstadoConfianca {
  switch (negocio.confianca) {
    case "estruturado":
      return "completo";
    case "estimado":
      return "estimado";
    default:
      // Um exemplo não sustenta recomendação comercial nenhuma.
      return "fora_de_escopo";
  }
}

export interface OpcoesSinais {
  temContabilistaVinculado?: boolean;
  ehPlus?: boolean;
  decisoesAnteriores?: number;
}

export function sinaisDoNegocio(
  negocio: ResultadoNegocio,
  contexto: ContextoNegocio,
  opcoes: OpcoesSinais = {},
): SinaisDoUtilizador {
  const enquadramento =
    contexto.fiscal.enquadramento === "sociedade"
      ? "sociedade"
      : contexto.fiscal.enquadramento === "eni"
        ? "eni"
        : contexto.fiscal.enquadramento === "independente"
          ? "independente"
          : "desconhecido";

  const organizada = contexto.ofertas.some(
    (o) => o.pricing.vendedor.regimeContabilidade === "organizada",
  );

  return {
    confianca: confiancaParaRouting(negocio),
    // Um negócio sem ofertas não produziu resultado nenhum — é uma página
    // informativa disfarçada de ferramenta.
    temResultado: negocio.ofertas.length > 0,
    enquadramento,
    contabilidadeOrganizada: organizada,
    multiJurisdicao: contexto.ofertas.some(
      (o) => o.pricing.canal.cliente === "empresa_ue" || o.pricing.canal.cliente === "fora_ue",
    ),
    // Contratar alguém é julgamento profissional: contrato de trabalho,
    // processamento salarial, obrigações declarativas mensais.
    casoComplexo: (contexto.estrutura?.trabalhadores?.length ?? 0) > 0,
    temContabilistaVinculado: opcoes.temContabilistaVinculado,
    ehPlus: opcoes.ehPlus,
    decisoesAnteriores: opcoes.decisoesAnteriores,
  };
}
