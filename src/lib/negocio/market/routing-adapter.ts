// ═══════════════════════════════════════════════════════════════════════
//  HIPÓTESE → ROUTING COMERCIAL
//  ---------------------------------------------------------------------
//  O cartão de descoberta tinha dois links do mesmo peso, escolhidos à
//  mão pela página. A disciplina de crescimento é explícita no contrário:
//  a hierarquia não é escolhida pela página, passam-se sinais e
//  `escolherRota()` decide — e nunca há duas ações com o mesmo peso.
//
//  Este adapter só produz SINAIS. Nunca uma rota, nunca um CTA próprio.
//
//  ── A GUARDA QUE MAIS IMPORTA AQUI ─────────────────────────────────
//  Uma hipótese que ainda é só um `template` do catálogo não sustenta
//  recomendação comercial nenhuma: sai como `fora_de_escopo` e a
//  primeira regra de `escolherRota` fecha todas as rotas sozinha. O mesmo
//  para uma hipótese `contradicted` — o motor deixou de a suportar, e
//  vender-lhe seja o que for em cima disso seria vender o oposto do que a
//  ferramenta acabou de dizer.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoConfianca } from "@/lib/analytics/eventos";
import type { SinaisDoUtilizador } from "@/lib/routing";
import type { MarketHypothesis } from "./hipoteses";
import type { BusinessDiscoveryProfile } from "./opportunities";
import type { MarketEvidenceGateResult } from "./tipos";

/** O estado do gate na escala que a medição e o routing usam. */
export function confiancaDaHipotese(gate: MarketEvidenceGateResult): EstadoConfianca {
  switch (gate.state) {
    case "evidence_qualified":
    case "user_validated":
    case "operating":
      return "completo";
    case "candidate":
    case "signal_detected":
      return "estimado";
    default:
      // `template`, `stale` e `contradicted`: não há aqui resultado que
      // sustente uma recomendação comercial.
      return "fora_de_escopo";
  }
}

export interface OpcoesSinaisHipotese {
  temContabilistaVinculado?: boolean;
  ehPlus?: boolean;
  decisoesAnteriores?: number;
}

export function sinaisDaHipotese(
  gate: MarketEvidenceGateResult,
  profile: BusinessDiscoveryProfile,
  hypothesis: MarketHypothesis | undefined,
  opcoes: OpcoesSinaisHipotese = {},
): SinaisDoUtilizador {
  // A estrutura que a pessoa DIZ estar a pensar não é um enquadramento
  // apurado — é uma preferência. Vale como sinal, e é por isso que
  // «quero comparar» sai como desconhecido em vez de escolher por ela.
  const enquadramento =
    profile.structure === "empresa"
      ? "sociedade"
      : profile.structure === "recibos-verdes"
        ? "independente"
        : "desconhecido";

  return {
    confianca: confiancaDaHipotese(gate),
    // Um dossier sem uma única observação utilizável e sem prova local é
    // conteúdo editorial, não um resultado.
    temResultado: gate.usableObservationIds.length > 0 || (hypothesis?.proofs.length ?? 0) > 0,
    enquadramento,
    // Já houve dinheiro em cima da mesa: isto deixou de ser uma ideia e
    // passou a ser uma atividade a precisar de enquadramento a sério.
    casoComplexo: hypothesis?.proofs.some((proof) => proof.kind === "sale") ?? false,
    decisoesAnteriores: opcoes.decisoesAnteriores,
    ehPlus: opcoes.ehPlus,
    temContabilistaVinculado: opcoes.temContabilistaVinculado,
  };
}
