// ═══════════════════════════════════════════════════════════════════════
//  O que ainda falta responder — e o que cada resposta destranca
//  ---------------------------------------------------------------------
//  Puro e testável, separado da interface de propósito.
//
//  A régua é explícita: só conta como POR RESPONDER aquilo que a pessoa
//  ainda não disse. Um campo com valor por omissão legítimo (regime
//  simplificado, zero dependentes) está respondido — assumir o contrário
//  seria inventar uma barra de progresso que nunca chega ao fim.
//
//  E «não sei» conta como por responder, não como resposta errada: é
//  precisamente por não sabermos que o painel tem de dizer que não sabe.
// ═══════════════════════════════════════════════════════════════════════

import type { PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";

export type IdSeccao = "atividade" | "iva" | "retencao" | "seguranca-social" | "agregado";

export interface Seccao {
  id: IdSeccao;
  titulo: string;
  icone: string;
  /** O que o painel passa a conseguir dizer quando isto estiver preenchido. */
  destranca: string;
}

export const SECCOES: Seccao[] = [
  {
    id: "atividade",
    titulo: "Atividade",
    icone: "Calendar",
    destranca: "A isenção do primeiro ano de Segurança Social conta 12 meses a partir da data real — não de um ano civil.",
  },
  {
    id: "iva",
    titulo: "IVA",
    icone: "Receipt",
    destranca: "Sem o regime e a faturação do ano anterior, o guardião não te sabe dizer onde estás face ao limite do Art. 53.º.",
  },
  {
    id: "retencao",
    titulo: "Retenção na fonte",
    icone: "Coin",
    destranca: "A dispensa é facultativa e os pagamentos por conta só existem se a AT os liquidar. Nenhuma das duas se adivinha.",
  },
  {
    id: "seguranca-social",
    titulo: "Segurança Social",
    icone: "ShieldCheck",
    destranca: "A dispensa por acumulação depende de três condições cumulativas. Enquanto não estiverem confirmadas, reservamos o valor cheio.",
  },
  {
    id: "agregado",
    titulo: "Agregado e deduções",
    icone: "Home",
    destranca: "O IRS é progressivo: sem o rendimento do agregado, qualquer estimativa que déssemos ficaria abaixo do real.",
  },
];

/** Perguntas por responder em cada secção, no estado atual. */
export function porResponder(p: PreferenciasFiscais): Record<IdSeccao, string[]> {
  const faltas: Record<IdSeccao, string[]> = {
    atividade: [],
    iva: [],
    retencao: [],
    "seguranca-social": [],
    agregado: [],
  };

  if (!p.dataInicioAtividade) faltas.atividade.push("Data de início de atividade");

  if (p.regimeIVA === "desconhecido") faltas.iva.push("Regime de IVA");
  if (p.faturacaoAnoAnterior === null) faltas.iva.push("Faturação do ano anterior");

  if (p.optouDispensaRetencao === "nao-sei") faltas.retencao.push("Dispensa de retenção");
  if (p.pagamentosPorConta === "nao-sei") faltas.retencao.push("Pagamentos por conta");

  // As condições da acumulação só são perguntas quando há acumulação.
  if (p.acumulaEmprego) {
    if (p.acumulacaoEntidadesDistintas === "nao-sei") {
      faltas["seguranca-social"].push("Entidades distintas");
    }
    if (p.remuneracaoDependenteMensal === null) {
      faltas["seguranca-social"].push("Remuneração do trabalho dependente");
    }
    if (p.rendimentoCategoriaA === null) {
      faltas["seguranca-social"].push("Rendimento anual da categoria A");
    }
  }

  if (p.conjunta && p.rendimentoConjuge === null) {
    faltas.agregado.push("Rendimento do cônjuge");
  }

  return faltas;
}

/** Total de perguntas aplicáveis ao caso concreto desta pessoa. */
export function totalAplicavel(p: PreferenciasFiscais): number {
  // Atividade (1) + IVA (2) + retenção (2)
  let total = 5;
  if (p.acumulaEmprego) total += 3;
  if (p.conjunta) total += 1;
  return total;
}

export interface EstadoCompletude {
  faltas: Record<IdSeccao, string[]>;
  porResponderTotal: number;
  total: number;
  respondidas: number;
  /** 0–100, já arredondado. */
  percentagem: number;
  completo: boolean;
}

export function completude(p: PreferenciasFiscais): EstadoCompletude {
  const faltas = porResponder(p);
  const porResponderTotal = Object.values(faltas).reduce((s, l) => s + l.length, 0);
  const total = totalAplicavel(p);
  const respondidas = Math.max(0, total - porResponderTotal);
  return {
    faltas,
    porResponderTotal,
    total,
    respondidas,
    percentagem: total === 0 ? 100 : Math.round((respondidas / total) * 100),
    completo: porResponderTotal === 0,
  };
}
