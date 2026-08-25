import { semelhanca } from "../motor/diversidade";
import type { OpportunityCandidate } from "../motor/tipos";
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

/**
 * Feedback altera a seleção, nunca os scores de mercado nem a confiança.
 * Assim a interface consegue dizer «subiu porque pediste mais disto» sem
 * fingir que apareceu evidência nova.
 */
export function aplicarAprendizagem(
  candidatos: readonly OpportunityCandidate[],
  sessao: SessaoDescoberta | undefined,
): ResultadoAprendizagem {
  if (!sessao) {
    return {
      candidatos,
      ajustes: new Map(),
      excluidos: 0,
      ocultosPorJaVistos: 0,
      rejeitadosPelasEscolhas: 0,
    };
  }

  const vistos = new Set(sessao.vistos);
  const ancora = candidatoDaAssinatura(candidatos, sessao.ancora);
  const positivos = sessao.feedback.filter((item) => item.acao === "interessa" || item.acao === "mais-como-isto");
  const negativos = sessao.feedback.filter(
    (item) => item.acao === "nao-e-para-mim" || item.acao === "nao-viavel-agora",
  );

  const ajustes = new Map<string, AjusteAprendido>();
  const sobreviventes: OpportunityCandidate[] = [];
  let excluidos = 0;
  let ocultosPorJaVistos = 0;
  let rejeitadosPelasEscolhas = 0;

  for (const candidato of candidatos) {
    const ocultarVisto = sessao.modo !== "normal" && vistos.has(candidato.id);
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

    if (ancora && sessao.modo === "mais-como-isto") {
      const proximidade = semelhanca(ancora, candidato);
      ajuste += Math.round(proximidade * 28);
      if (proximidade >= 0.4) razoes.push("É próxima da hipótese em que pediste mais deste género.");
    }

    if (ancora && sessao.modo === "diferente") {
      const proximidade = semelhanca(ancora, candidato);
      ajuste -= Math.round(proximidade * 24);
      if (proximidade <= 0.2) razoes.push("Foi favorecida por ser diferente do que já viste.");
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
