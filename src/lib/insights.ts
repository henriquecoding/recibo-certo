// Motor de insights proativos e "saúde fiscal" — transforma os recibos
// registados em avisos acionáveis. Tudo derivado de dados reais (sem métricas
// inventadas); cada fator do score é transparente.

import { calcularRecibo, resumir, type Recibo, type OpcoesCalcRecibo } from "@/lib/store/recibos";
import { proximosPrazos, diasAte, type Prazo } from "@/lib/prazos";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export type Tom = "ok" | "info" | "alerta";

export interface Insight {
  tom: Tom;
  titulo: string;
  descricao: string;
}

function faturadoNoAno(recibos: Recibo[]): number {
  const ano = new Date().getFullYear();
  return recibos
    .filter((r) => new Date(r.data + "T00:00:00").getFullYear() === ano)
    .reduce((s, r) => s + r.valor, 0);
}

function recibosDoMes(recibos: Recibo[]): Recibo[] {
  const agora = new Date();
  const p = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  return recibos.filter((r) => r.data.startsWith(p));
}

/** Gera insights ordenados por relevância (alertas primeiro). */
export function gerarInsights(recibos: Recibo[], opcoes?: OpcoesCalcRecibo): Insight[] {
  if (recibos.length === 0) {
    return [
      {
        tom: "info",
        titulo: "Começa por registar um recibo",
        descricao: "Assim que registares recibos, mostramos quanto reservar, prazos e riscos personalizados.",
      },
    ];
  }

  const insights: Insight[] = [];
  const limiteIVA = IVA_ISENCAO_LIMITE.value;
  const faturado = faturadoNoAno(recibos);
  const mes = resumir(recibosDoMes(recibos), opcoes);
  const prox = proximosPrazos(new Date(), 1)[0] as Prazo | undefined;

  // IVA — proximidade do limite de isenção.
  if (faturado > limiteIVA) {
    insights.push({
      tom: "alerta",
      titulo: "Ultrapassaste o limite de isenção de IVA",
      descricao: `Já faturaste ${fmt(faturado)} este ano (limite ${fmt(limiteIVA)}). Vais ter de cobrar IVA — confirma o teu enquadramento.`,
    });
  } else if (faturado >= 0.8 * limiteIVA) {
    insights.push({
      tom: "alerta",
      titulo: "Perto do limite de isenção de IVA",
      descricao: `Estás a ${pct(faturado / limiteIVA)} do limite. Faltam ${fmt(limiteIVA - faturado)} antes de teres de cobrar IVA.`,
    });
  }

  // Reserva de SS do mês.
  if (mes.segSocial > 0) {
    insights.push({
      tom: "info",
      titulo: "Reserva para a Segurança Social",
      descricao: `Aparta ${fmt(mes.segSocial)} dos recibos deste mês. O pagamento à SS é até ao dia 20.`,
    });
  }

  // Próximo prazo.
  if (prox) {
    const dias = diasAte(prox.data);
    insights.push({
      tom: dias <= 7 ? "alerta" : "info",
      titulo: prox.titulo,
      descricao: dias === 0 ? `${prox.descricao} É hoje.` : `${prox.descricao} Faltam ${dias} dias.`,
    });
  }

  if (insights.length === 0 || insights.every((i) => i.tom !== "alerta")) {
    insights.unshift({
      tom: "ok",
      titulo: "Estás em dia",
      descricao: "Sem surpresas fiscais à vista. Continua a registar os recibos para manteres tudo sob controlo.",
    });
  }

  return insights.slice(0, 4);
}

export interface Fator {
  label: string;
  ok: boolean;
}

export interface SaudeFiscal {
  score: number;
  estado: "Tranquilo" | "Atenção" | "Cuidado";
  fatores: Fator[];
}

/**
 * "Saúde fiscal" 0–100, a partir de três fatores transparentes:
 * margem até ao limite de IVA, antecedência do próximo prazo e
 * acompanhamento dos recibos. É um indicador de organização, não uma garantia.
 */
export function saudeFiscal(recibos: Recibo[]): SaudeFiscal {
  const limiteIVA = IVA_ISENCAO_LIMITE.value;
  const faturado = faturadoNoAno(recibos);
  const margemIVA = Math.max(0, Math.min(1, 1 - faturado / limiteIVA));

  const prox = proximosPrazos(new Date(), 1)[0] as Prazo | undefined;
  const dias = prox ? diasAte(prox.data) : 30;
  const prazoFator = dias > 14 ? 1 : dias > 7 ? 0.66 : 0.33;

  const acompanha = recibosDoMes(recibos).length > 0 ? 1 : recibos.length > 0 ? 0.6 : 0.4;

  const score = Math.round(40 * margemIVA + 30 * prazoFator + 30 * acompanha);
  const estado = score >= 80 ? "Tranquilo" : score >= 60 ? "Atenção" : "Cuidado";

  return {
    score,
    estado,
    fatores: [
      { label: "Margem até ao limite de IVA", ok: margemIVA > 0.2 },
      { label: "Próximo prazo com antecedência", ok: prazoFator >= 0.66 },
      { label: "Recibos em dia", ok: acompanha >= 1 },
    ],
  };
}
