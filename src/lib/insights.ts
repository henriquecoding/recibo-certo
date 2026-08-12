// Motor de insights proativos e "saúde fiscal" — transforma os recibos
// registados em avisos acionáveis. Tudo derivado de dados reais (sem métricas
// inventadas); cada fator do score é transparente.
//
// A "saúde fiscal" deixou de dar um número quando não tem por onde o tirar
// (RC-P1-04). Com zero recibos chegava a 72 — um valor com aparência de
// diagnóstico assente em nada: não sabia se as declarações tinham sido
// entregues, se havia reserva, se o prazo mais próximo sequer se aplicava, nem
// em que regime a pessoa estava. Agora, sem evidência, o cartão diz "por
// configurar" e mostra o que falta.

import { resumoDoMes, faturadoNoAno, anoFiscalCorrente, type Recibo, type OpcoesCalcRecibo } from "@/lib/recibos-contrato";
import { proximosPrazos, diasAte, type PrazoAvaliado, type PerfilPrazos } from "@/lib/prazos";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import {
  perfilPrazos,
  lacunasDoPerfil,
  DEFAULTS as PREFS_DEFAULTS,
  type PreferenciasFiscais,
} from "@/lib/store/preferencias-fiscais";
import { fmt, pct } from "@/lib/format";

export type Tom = "ok" | "info" | "alerta";

export interface Insight {
  tom: Tom;
  titulo: string;
  descricao: string;
}

/** Gera insights ordenados por relevância (alertas primeiro). */
export function gerarInsights(recibos: Recibo[], opcoes?: OpcoesCalcRecibo, prefs?: PreferenciasFiscais): Insight[] {
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
  const ano = anoFiscalCorrente();
  const faturado = faturadoNoAno(recibos, ano);
  const mes = resumoDoMes(recibos, new Date(), opcoes);
  // Só prazos que se aplicam mesmo: o genérico mais próximo dizia à pessoa
  // isenta de IVA para entregar a declaração periódica.
  const perfil = prefs ? perfilPrazos(prefs) : undefined;
  const prox = proximosPrazos(new Date(), 1, perfil as PerfilPrazos | undefined)[0] as PrazoAvaliado | undefined;

  // IVA — proximidade do limite de isenção.
  if (faturado > limiteIVA) {
    insights.push({
      tom: "alerta",
      titulo: "Ultrapassaste o limite de isenção de IVA",
      descricao: `Já faturaste ${fmt(faturado)} em ${ano} (limite ${fmt(limiteIVA)}). Vais ter de cobrar IVA — confirma o teu enquadramento.`,
    });
  } else if (faturado >= 0.8 * limiteIVA) {
    insights.push({
      tom: "alerta",
      titulo: "Perto do limite de isenção de IVA",
      descricao: `Estás a ${pct(faturado / limiteIVA)} do limite. Faltam ${fmt(limiteIVA - faturado)} antes de teres de cobrar IVA.`,
    });
  }

  // Reserva de SS do mês.
  if (mes.segurancaSocialEstimada > 0) {
    insights.push({
      tom: "info",
      titulo: "Reserva para a Segurança Social",
      descricao: `Aparta ${fmt(mes.segurancaSocialEstimada)} dos recibos deste mês. A contribuição paga-se entre o dia 10 e o dia 20 do mês seguinte.`,
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

// ─── Saúde fiscal ──────────────────────────────────────────────────────

export type EstadoFator = "ok" | "atencao" | "desconhecido";

export interface Fator {
  label: string;
  estado: EstadoFator;
  /** Compatibilidade com os cartões antigos: `ok` só quando é mesmo ok. */
  ok: boolean;
}

export type EstadoSaude = "Por configurar" | "Tranquilo" | "Atenção" | "Cuidado";

export interface SaudeFiscal {
  /** `null` quando não há evidência suficiente para pontuar. */
  score: number | null;
  estado: EstadoSaude;
  fatores: Fator[];
  /** O que falta para o indicador passar a ser calculável. */
  emFalta: string[];
  confianca: "completo" | "parcial" | "insuficiente";
  /** Como o número é feito — publicado, não escondido. */
  metodologia: string;
}

export interface ContextoSaude {
  prefs?: PreferenciasFiscais;
  /**
   * O produto já sabe quais obrigações foram entregues/pagas? Enquanto não
   * souber, o indicador não pode falar em cumprimento.
   */
  temPrazosConfirmados?: boolean;
  ref?: Date;
}

const METODOLOGIA =
  "Indicador de organização (0–100) com três fatores de igual peso: margem até ao limite de isenção de IVA, " +
  "antecedência do próximo prazo APLICÁVEL ao teu perfil e acompanhamento dos recibos do mês. " +
  "Não avalia cumprimento — não sabemos o que já entregaste — nem substitui um contabilista.";

/**
 * "Saúde fiscal" 0–100 a partir de fatores transparentes, ou `null` quando os
 * dados não chegam.
 *
 * A regra é simples: um fator que não se consegue avaliar não vira pontos.
 * Se sobrar menos de um fator avaliável, não há score nenhum.
 */
export function saudeFiscal(recibos: Recibo[], contexto: ContextoSaude = {}): SaudeFiscal {
  const prefs = contexto.prefs ?? PREFS_DEFAULTS;
  const ref = contexto.ref ?? new Date();
  const ano = ref.getFullYear();
  const emFalta = lacunasDoPerfil(prefs);

  const fatores: Fator[] = [];
  const pontos: number[] = [];

  // ── Fator 1: margem até ao limite de isenção de IVA ────────────────
  // Só faz sentido para quem está (ou pode estar) no Art. 53.º. Para quem já
  // está no regime normal, a margem não é um risco — é passado.
  const temRecibosDoAno = recibos.some((r) => r.data.startsWith(String(ano)));
  if (prefs.regimeIVA === "desconhecido") {
    fatores.push({ label: "Margem até ao limite de IVA", estado: "desconhecido", ok: false });
  } else if (prefs.regimeIVA === "isento") {
    const margem = Math.max(0, Math.min(1, 1 - faturadoNoAno(recibos, ano) / IVA_ISENCAO_LIMITE.value));
    pontos.push(margem);
    fatores.push({ label: "Margem até ao limite de IVA", estado: margem > 0.2 ? "ok" : "atencao", ok: margem > 0.2 });
  } else {
    // No regime normal o fator não se aplica: não pontua nem penaliza.
    fatores.push({ label: "Limite de IVA não aplicável (regime normal)", estado: "ok", ok: true });
    pontos.push(1);
  }

  // ── Fator 2: antecedência do próximo prazo APLICÁVEL ───────────────
  const perfil = perfilPrazos(prefs);
  const conheceRegime = perfil.regimeIVA !== null || perfil.pagamentosPorConta !== null;
  if (!conheceRegime) {
    fatores.push({ label: "Próximo prazo com antecedência", estado: "desconhecido", ok: false });
  } else {
    const prox = proximosPrazos(ref, 1, perfil as PerfilPrazos)[0];
    if (!prox) {
      fatores.push({ label: "Sem obrigações aplicáveis à vista", estado: "ok", ok: true });
      pontos.push(1);
    } else {
      const dias = diasAte(prox.data, ref);
      const f = dias > 14 ? 1 : dias > 7 ? 0.66 : 0.33;
      pontos.push(f);
      fatores.push({ label: "Próximo prazo com antecedência", estado: f >= 0.66 ? "ok" : "atencao", ok: f >= 0.66 });
    }
  }

  // ── Fator 3: acompanhamento dos recibos ────────────────────────────
  if (!temRecibosDoAno) {
    fatores.push({ label: "Recibos em dia", estado: "desconhecido", ok: false });
  } else {
    const doMes = resumoDoMes(recibos, ref).total > 0;
    pontos.push(doMes ? 1 : 0.6);
    fatores.push({ label: "Recibos em dia", estado: doMes ? "ok" : "atencao", ok: doMes });
  }

  // ── Cumprimento: por agora nunca é conhecido ───────────────────────
  if (!contexto.temPrazosConfirmados) {
    fatores.push({ label: "Obrigações entregues (por confirmar)", estado: "desconhecido", ok: false });
  }

  // Menos de dois fatores avaliáveis não é um diagnóstico — é um palpite.
  if (pontos.length < 2) {
    return {
      score: null,
      estado: "Por configurar",
      fatores,
      emFalta: emFalta.length > 0 ? emFalta : ["Registar pelo menos um recibo deste ano"],
      confianca: "insuficiente",
      metodologia: METODOLOGIA,
    };
  }

  const score = Math.round((pontos.reduce((a, b) => a + b, 0) / pontos.length) * 100);
  const estado: EstadoSaude = score >= 80 ? "Tranquilo" : score >= 60 ? "Atenção" : "Cuidado";

  return {
    score,
    estado,
    fatores,
    emFalta,
    confianca: emFalta.length === 0 ? "completo" : "parcial",
    metodologia: METODOLOGIA,
  };
}
