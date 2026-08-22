// ═══════════════════════════════════════════════════════════════════════
//  CONFIANÇA ≠ FIT ≠ MERCADO
//  ---------------------------------------------------------------------
//  Ponto 21 do pedido, e é uma das ideias mais importantes do motor. Uma
//  oportunidade pode ser:
//
//      Fit: alto  ·  Mercado: alto  ·  Confiança: média
//
//  e isso é informação completamente diferente de um número único. A
//  confiança fala do QUE SABEMOS, não do negócio: baixa confiança não
//  significa má oportunidade — significa que a análise ainda não tem em
//  que se apoiar, e diz o que falta.
// ═══════════════════════════════════════════════════════════════════════

import { cobertura } from "./scoring";
import type { AvaliacaoConfianca, AvaliacaoProcura, AvaliacaoRegulatoria, OpportunityScore } from "./tipos";
import type { CandidatoBruto } from "./gerador";

export function avaliarConfianca(
  candidato: CandidatoBruto,
  scores: OpportunityScore,
  procura: AvaliacaoProcura,
  regulacao: AvaliacaoRegulatoria,
): AvaliacaoConfianca {
  const motivos: string[] = [];
  const parte = cobertura(scores);

  const observacoes = procura.evidencias.length;
  if (observacoes === 0) {
    motivos.push("Nenhuma observação oficial ligada a esta composição.");
  } else {
    motivos.push(
      `${observacoes} ${observacoes === 1 ? "leitura oficial" : "leituras oficiais"} com fonte, período e geografia.`,
    );
  }

  if (scores.lacunaDeOferta === null) {
    motivos.push("Sem sinal de oferta, não é possível dizer se o mercado já está servido.");
  }
  if (scores.procura === null) {
    motivos.push("A procura deste problema não é medida por fonte pública portuguesa.");
  }
  if (scores.economia === null) {
    motivos.push("Não declaraste capital nem prazo, por isso a economia não foi confrontada com nada.");
  }
  if (regulacao.temIncerteza) {
    motivos.push("Pelo menos um requisito regulatório depende do caso concreto e tem de ser confirmado.");
  }
  if (candidato.seedTemplateId) {
    motivos.push("Existe um dossier curado equivalente, revisto por uma pessoa.");
  }

  // A escala é da COBERTURA, não do score. Uma hipótese excelente sobre
  // a qual não sabemos nada tem confiança insuficiente, e é assim que
  // deve ser apresentada.
  const nivel: AvaliacaoConfianca["nivel"] =
    parte >= 0.9 && observacoes >= 2
      ? "alta"
      : parte >= 0.75 && observacoes >= 1
        ? "media"
        : parte >= 0.6
          ? "baixa"
          : "insuficiente";

  return { nivel, cobertura: parte, motivos };
}

export const ROTULO_CONFIANCA: Readonly<Record<AvaliacaoConfianca["nivel"], string>> = Object.freeze({
  alta: "Confiança alta",
  media: "Confiança média",
  baixa: "Confiança baixa",
  insuficiente: "Ainda sem base para confiar",
});

/** A frase honesta que acompanha cada nível. Ponto 20: não esconder incerteza. */
export const FRASE_CONFIANCA: Readonly<Record<AvaliacaoConfianca["nivel"], string>> = Object.freeze({
  alta: "A análise assenta em observações com fonte e período, e quase todas as dimensões tinham base para ser avaliadas.",
  media: "Há sinais oficiais a sustentar parte da análise, e outras dimensões ficaram por apurar.",
  baixa: "Há sinais interessantes, mas ainda temos pouca evidência local — a maior parte desta leitura é estrutural, não observada.",
  insuficiente:
    "Não temos dados suficientes para sustentar esta hipótese. Aparece porque encaixa no teu contexto, e é tudo o que podemos afirmar hoje.",
});
