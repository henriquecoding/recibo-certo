import { semelhanca } from "../motor/diversidade";
import type { OpportunityCandidate } from "../motor/tipos";
import {
  PROOF_VALIDITY_DAYS,
  isMarketProof,
  type MarketHypothesis,
  type MarketProofKind,
} from "@/lib/negocio/market/hipoteses";
import { addDaysToIsoDate } from "@/lib/negocio/market/freshness";
import type { AssinaturaCandidato, FeedbackDescoberta, SessaoDescoberta } from "./tipos";

export interface AjusteAprendido {
  candidatoId: string;
  ajuste: number;
  razoes: readonly string[];
}

export interface ResultadoAprendizagem {
  candidatos: readonly OpportunityCandidate[];
  ajustes: ReadonlyMap<string, AjusteAprendido>;
  excluidos: number;
  ocultosPorJaVistos: number;
  rejeitadosPelasEscolhas: number;
}

export function assinaturaDe(candidato: OpportunityCandidate): AssinaturaCandidato {
  return {
    candidatoId: candidato.id,
    problemaId: candidato.problema.id,
    setor: candidato.setor,
    modeloId: candidato.modelo.id,
    capacidadeId: candidato.capacidadesUsadas[0]?.id,
    naturezas: candidato.naturezas,
  };
}

function correspondeEscopo(candidato: OpportunityCandidate, feedback: FeedbackDescoberta): boolean {
  const assinatura = feedback.assinatura;
  switch (feedback.escopo) {
    case "candidato":
      return candidato.id === assinatura.candidatoId;
    case "problema":
      return candidato.problema.id === assinatura.problemaId;
    case "setor":
      return candidato.setor === assinatura.setor;
    case "modelo":
      return candidato.modelo.id === assinatura.modeloId;
    case "capacidade":
      return candidato.capacidadesUsadas.some((item) => item.id === assinatura.capacidadeId);
  }
}

function candidatoDaAssinatura(
  candidatos: readonly OpportunityCandidate[],
  assinatura: AssinaturaCandidato | undefined,
): OpportunityCandidate | undefined {
  if (!assinatura) return undefined;
  return candidatos.find((item) => item.id === assinatura.candidatoId);
}

// ═══════════════════════════════════════════════════════════════════════
//  PROVAS DO UTILIZADOR — o laboratório volta a falar com o motor
//  ---------------------------------------------------------------------
//  A ferramenta já deixava registar entrevistas, orçamentos aceites,
//  pré-vendas, pilotos pagos e vendas. Essas provas viviam no percurso da
//  hipótese e NÃO voltavam ao motor: confirmar ou refutar uma ideia não
//  mudava a ordenação seguinte. Havia um bom laboratório e um bom motor,
//  e não havia um sistema de aprendizagem.
//
//  O que uma prova paga demonstra — e o que NÃO demonstra:
//
//   · demonstra que ESTA PESSOA consegue vender àquele tipo de cliente,
//     naquela forma de entrega. Isso é transferível para hipóteses
//     vizinhas, e é o que aqui se usa;
//   · NÃO demonstra que o mercado é bom. Uma venda não é uma série
//     oficial, e por isso nada disto toca em procura, oferta, evidência
//     ou confiança — vale exatamente como preferência declarada vale:
//     muda a SELEÇÃO, e a interface diz porquê.
//
//  A entrevista continua a valer zero, como no gate de evidência: ouvir
//  alguém dizer «era capaz de comprar» não é uma venda, e promover por
//  isso seria a forma mais rápida de a ferramenta mentir com boa
//  intenção.
//
//  Uma prova expira aos `PROOF_VALIDITY_DAYS` — o mesmo prazo que o gate
//  usa. Um piloto pago do ano passado não reordena o ecrã de hoje.
// ═══════════════════════════════════════════════════════════════════════

/** A escada, em pontos de ajuste. A entrevista não sobe nenhum degrau. */
const PESO_DA_PROVA: Readonly<Record<MarketProofKind, number>> = Object.freeze({
  interview: 0,
  accepted_quote: 4,
  pre_sale: 6,
  paid_pilot: 9,
  sale: 12,
});

/** O identificador com que uma hipótese guardada se liga a um candidato. */
function chaveDe(candidato: OpportunityCandidate): string {
  return candidato.seedTemplateId ?? candidato.id;
}

interface EfeitoDasProvas {
  /** Por chave de hipótese: quanto a própria hipótese sobe. */
  propria: Map<string, { ajuste: number; razao: string }>;
  /** Mercado + entrega que a pessoa já provou conseguir servir. */
  vizinhanca: { mercado: string; entrega: string }[];
  /** Modelos de receita cuja economia não fechou na pricing engine. */
  modelosSemViabilidade: Set<string>;
}

function lerProvas(
  candidatos: readonly OpportunityCandidate[],
  hipoteses: readonly MarketHypothesis[],
  agora: string,
): EfeitoDasProvas {
  const porChave = new Map<string, OpportunityCandidate>();
  for (const candidato of candidatos) porChave.set(chaveDe(candidato), candidato);

  const efeito: EfeitoDasProvas = {
    propria: new Map(),
    vizinhanca: [],
    modelosSemViabilidade: new Set(),
  };

  for (const hipotese of hipoteses) {
    const referencia = porChave.get(hipotese.templateId);

    // ── O que a pricing engine concluiu ─────────────────────────────
    //  «Não fecha» é a prova NEGATIVA mais forte que existe aqui: não é
    //  uma opinião sobre o mercado, é a economia unitária desta pessoa a
    //  não dar. Penaliza o MODELO, não o setor — o problema pode ser bom
    //  e a forma de cobrar não.
    if (hipotese.pricing && hipotese.pricing.viable === false && referencia) {
      efeito.modelosSemViabilidade.add(referencia.modelo.id);
    }

    let melhor = 0;
    let melhorTipo: MarketProofKind | null = null;
    for (const prova of hipotese.proofs) {
      // Expirada não conta. O gate usa o mesmo prazo pela mesma razão.
      // Data malformada devolve `null` e também não conta: uma prova que
      // não se consegue datar não pode reordenar nada.
      const validaAte = addDaysToIsoDate(prova.occurredAt, PROOF_VALIDITY_DAYS);
      if (validaAte === null || validaAte < agora.slice(0, 10)) continue;
      const peso = PESO_DA_PROVA[prova.kind] ?? 0;
      if (peso > melhor) {
        melhor = peso;
        melhorTipo = prova.kind;
      }
      // Só provas de mercado pagas ensinam vizinhança. Um orçamento
      // aceite ainda não é dinheiro recebido.
      if (
        referencia &&
        isMarketProof(prova.kind) &&
        (prova.kind === "paid_pilot" || prova.kind === "sale")
      ) {
        efeito.vizinhanca.push({
          mercado: referencia.mercado,
          entrega: referencia.entrega,
        });
      }
    }

    if (melhor > 0 && melhorTipo !== null) {
      efeito.propria.set(hipotese.templateId, {
        ajuste: melhor,
        razao:
          melhorTipo === "sale" || melhorTipo === "paid_pilot"
            ? "Já provaste esta hipótese com dinheiro recebido."
            : "Já registaste uma prova comercial nesta hipótese.",
      });
    }
  }

  return efeito;
}

/**
 * Feedback altera a seleção, nunca os scores de mercado nem a confiança.
 * Assim a interface consegue dizer «subiu porque pediste mais disto» sem
 * fingir que apareceu evidência nova.
 *
 * As provas do utilizador entram pela MESMA porta, e pela mesma razão:
 * uma venda tua é informação sobre ti, não uma série oficial sobre o
 * mercado. Ver o bloco acima.
 */
export function aplicarAprendizagem(
  candidatos: readonly OpportunityCandidate[],
  sessao: SessaoDescoberta | undefined,
  hipoteses: readonly MarketHypothesis[] = [],
  agora: string = new Date().toISOString(),
): ResultadoAprendizagem {
  const provas = hipoteses.length === 0 ? null : lerProvas(candidatos, hipoteses, agora);

  if (!sessao && provas === null) {
    return {
      candidatos,
      ajustes: new Map(),
      excluidos: 0,
      ocultosPorJaVistos: 0,
      rejeitadosPelasEscolhas: 0,
    };
  }

  const vistos = new Set(sessao?.vistos ?? []);
  const ancora = candidatoDaAssinatura(candidatos, sessao?.ancora);
  const positivos = (sessao?.feedback ?? []).filter(
    (item) => item.acao === "interessa" || item.acao === "mais-como-isto",
  );
  const negativos = (sessao?.feedback ?? []).filter(
    (item) => item.acao === "nao-e-para-mim" || item.acao === "nao-viavel-agora",
  );

  const ajustes = new Map<string, AjusteAprendido>();
  const sobreviventes: OpportunityCandidate[] = [];
  let excluidos = 0;
  let ocultosPorJaVistos = 0;
  let rejeitadosPelasEscolhas = 0;

  for (const candidato of candidatos) {
    const ocultarVisto = sessao !== undefined && sessao.modo !== "normal" && vistos.has(candidato.id);
    const rejeitado = negativos.some((item) => correspondeEscopo(candidato, item));
    if (ocultarVisto || rejeitado) {
      excluidos += 1;
      if (ocultarVisto) ocultosPorJaVistos += 1;
      if (rejeitado) rejeitadosPelasEscolhas += 1;
      continue;
    }

    let ajuste = 0;
    const razoes: string[] = [];

    for (const positivo of positivos) {
      if (correspondeEscopo(candidato, positivo)) {
        ajuste += positivo.escopo === "candidato" ? 4 : 10;
        razoes.push("Coincide com uma preferência que indicaste nesta visita.");
      }
    }

    if (ancora && sessao?.modo === "mais-como-isto") {
      const proximidade = semelhanca(ancora, candidato);
      ajuste += Math.round(proximidade * 28);
      if (proximidade >= 0.4) razoes.push("É próxima da hipótese em que pediste mais deste género.");
    }

    if (ancora && sessao?.modo === "diferente") {
      const proximidade = semelhanca(ancora, candidato);
      ajuste -= Math.round(proximidade * 24);
      if (proximidade <= 0.2) razoes.push("Foi favorecida por ser diferente do que já viste.");
    }

    if (provas !== null) {
      const propria = provas.propria.get(chaveDe(candidato));
      if (propria) {
        ajuste += propria.ajuste;
        razoes.push(propria.razao);
      }

      // Vizinhança: mesmo tipo de cliente E mesma forma de entrega. As
      // duas condições juntas, nunca uma: vender presencialmente a
      // empresas não prova que se vende à distância a consumidores.
      const vizinha = provas.vizinhanca.some(
        (item) => item.mercado === candidato.mercado && item.entrega === candidato.entrega,
      );
      if (vizinha && !propria) {
        ajuste += 5;
        razoes.push(
          "Já vendeste a este tipo de cliente, nesta forma de entrega — o caminho até ao primeiro sim é mais curto.",
        );
      }

      if (provas.modelosSemViabilidade.has(candidato.modelo.id)) {
        ajuste -= 14;
        razoes.push(
          "Este modelo de receita já não fechou as contas contigo no motor de preço.",
        );
      }
    }

    sobreviventes.push(candidato);
    ajustes.set(candidato.id, {
      candidatoId: candidato.id,
      ajuste,
      razoes: [...new Set(razoes)],
    });
  }

  return {
    candidatos: sobreviventes,
    ajustes,
    excluidos,
    ocultosPorJaVistos,
    rejeitadosPelasEscolhas,
  };
}
