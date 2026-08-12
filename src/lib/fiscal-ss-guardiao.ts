// ─────────────────────────────────────────────────────────────────────────
//  Guardião da Segurança Social — condições reais, não um booleano.
//
//  O cartão anterior zerava a reserva a quem tivesse `acumulaEmprego` ligado,
//  dizendo que "a SS já está coberta pelo empregador" (RC-P0-08). A dispensa
//  por acumulação do Art. 157.º n.º 1 al. a) do Código Contributivo depende de
//  TRÊS condições cumulativas:
//
//    1. o trabalho dependente e o independente são prestados a entidades
//       distintas e sem relação de domínio ou grupo entre si;
//    2. a remuneração do trabalho dependente é igual ou superior a 1 × IAS;
//    3. o rendimento relevante médio mensal da atividade independente não
//       excede 4 × IAS — acima disso contribui-se sobre o excedente.
//
//  Faltando qualquer uma, a reserva não pode ser zero. E o "primeiro ano" era
//  outro booleano solto, independente da data real de início: passa a
//  derivar-se dela, que é o que a lei conta.
// ─────────────────────────────────────────────────────────────────────────

import {
  SS_TAXA,
  SS_COEFICIENTE,
  SS_ACUMULACAO_LIMITE_MENSAL,
  SS_ISENCAO_PRIMEIRO_ANO_MESES,
  IAS,
  ATIVIDADES,
  efeitoFiscal,
  type BaseSS,
} from "@/lib/fiscal-data";
import { recibosDoTrimestre, type Recibo } from "@/lib/recibos-contrato";
import { dataIsoValida } from "@/lib/validacao-dominio";

export type EstadoSS =
  /** Isento pelos primeiros 12 meses de atividade. */
  | "isencao-primeiro-ano"
  /** Todas as condições da acumulação verificadas e abaixo de 4 × IAS. */
  | "dispensa-acumulacao"
  /** Acumula, mas o rendimento excede 4 × IAS: contribui sobre o excedente. */
  | "acumulacao-parcial"
  /** Diz que acumula, mas falta confirmar condições — não se zera nada. */
  | "acumulacao-por-confirmar"
  /** Contribuição normal. */
  | "normal";

export interface CondicaoSS {
  label: string;
  estado: "cumprida" | "nao-cumprida" | "por-confirmar";
  detalhe: string;
}

export interface EntradaGuardiaoSS {
  recibos: Recibo[];
  ano: number;
  /** Data real de início de atividade (ISO). Vazia = desconhecida. */
  dataInicioAtividade: string;
  acumulaEmprego: boolean;
  /** As entidades são distintas e sem relação entre si? `null` = não sabemos. */
  entidadesDistintas: boolean | null;
  /** Remuneração mensal do trabalho dependente. `null` = desconhecida. */
  remuneracaoDependenteMensal: number | null;
  hoje?: Date;
}

export interface VeredictoSS {
  estado: EstadoSS;
  trimestre: number;
  /** Rendimento bruto do trimestre. */
  rendimentoTrimestre: number;
  baseServicos: number;
  baseBens: number;
  baseTotal: number;
  /** Rendimento relevante MÉDIO MENSAL — a grandeza que a lei compara com 4 × IAS. */
  rendimentoRelevanteMedioMensal: number;
  /** Contribuição a reservar para o trimestre. Nunca zero por suposição. */
  valorReservar: number;
  limiteAcumulacao: number;
  condicoes: CondicaoSS[];
  titulo: string;
  mensagem: string;
  severidade: "neutro" | "aviso" | "alerta";
  emFalta: string[];
}

function baseSsDoRecibo(r: Recibo): BaseSS {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return efeitoFiscal(ativ).baseSS;
  }
  return r.baseSS;
}

/**
 * Está dentro dos primeiros 12 meses de atividade?
 *
 * Derivado da data real de início. Um booleano à parte permitia configurações
 * contraditórias — "primeiro ano" ligado com atividade aberta há cinco anos.
 */
export function noPrimeiroAnoDeAtividade(dataInicio: string, hoje: Date = new Date()): boolean | null {
  if (!dataIsoValida(dataInicio)) return null;
  const [a, m, d] = dataInicio.split("-").map(Number);
  const meses = SS_ISENCAO_PRIMEIRO_ANO_MESES.value;
  const fim = new Date(a, m - 1 + meses, d);
  return hoje.getTime() < fim.getTime();
}

export function avaliarSS(entrada: EntradaGuardiaoSS): VeredictoSS {
  const hoje = entrada.hoje ?? new Date();
  const trimestre = Math.floor(hoje.getMonth() / 3);
  const doTrimestre = recibosDoTrimestre(entrada.recibos, entrada.ano, trimestre);

  const bases = doTrimestre.reduce(
    (acc, r) => {
      const bs = baseSsDoRecibo(r);
      const coef = SS_COEFICIENTE[bs].value;
      if (bs === "servicos") acc.baseServicos += r.valor * coef;
      else acc.baseBens += r.valor * coef;
      acc.rendimento += r.valor;
      return acc;
    },
    { baseServicos: 0, baseBens: 0, rendimento: 0 },
  );
  const baseTotal = bases.baseServicos + bases.baseBens;
  // O rendimento relevante que a lei compara com 4 × IAS é a MÉDIA MENSAL do
  // trimestre, não o total trimestral.
  const medioMensal = baseTotal / 3;
  const contribuicaoNormal = baseTotal * SS_TAXA.value;
  const limiteAcumulacao = SS_ACUMULACAO_LIMITE_MENSAL.value;
  const ias = IAS.value;

  const comum = {
    trimestre,
    rendimentoTrimestre: bases.rendimento,
    baseServicos: bases.baseServicos,
    baseBens: bases.baseBens,
    baseTotal,
    rendimentoRelevanteMedioMensal: medioMensal,
    limiteAcumulacao,
  };

  // ── Primeiro ano de atividade ──────────────────────────────────────
  const primeiroAno = noPrimeiroAnoDeAtividade(entrada.dataInicioAtividade, hoje);
  if (primeiroAno === true) {
    return {
      ...comum,
      estado: "isencao-primeiro-ano",
      valorReservar: 0,
      condicoes: [{
        label: "Primeiros 12 meses de atividade",
        estado: "cumprida",
        detalhe: `Início em ${entrada.dataInicioAtividade}. A isenção cobre ${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses.`,
      }],
      titulo: "Isento no primeiro ano de atividade",
      mensagem:
        `Estás nos primeiros ${SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses de atividade independente: declaras os ` +
        "rendimentos trimestralmente, mas não há contribuição a pagar.",
      severidade: "neutro",
      emFalta: [],
    };
  }

  // ── Acumulação com trabalho dependente ─────────────────────────────
  if (entrada.acumulaEmprego) {
    const condicoes: CondicaoSS[] = [];
    const emFalta: string[] = [];

    // Condição 1 — entidades distintas.
    if (entrada.entidadesDistintas === null) {
      condicoes.push({
        label: "Entidades distintas e sem relação entre si",
        estado: "por-confirmar",
        detalhe: "A dispensa exige que o teu empregador e o teu cliente não sejam a mesma entidade nem do mesmo grupo.",
      });
      emFalta.push("Se o empregador e o cliente são entidades distintas");
    } else {
      condicoes.push({
        label: "Entidades distintas e sem relação entre si",
        estado: entrada.entidadesDistintas ? "cumprida" : "nao-cumprida",
        detalhe: entrada.entidadesDistintas
          ? "Confirmado."
          : "Sendo a mesma entidade (ou do mesmo grupo), a dispensa não se aplica.",
      });
    }

    // Condição 2 — remuneração do dependente ≥ 1 × IAS.
    if (entrada.remuneracaoDependenteMensal === null) {
      condicoes.push({
        label: `Remuneração do trabalho dependente ≥ ${eur(ias)}`,
        estado: "por-confirmar",
        detalhe: `A dispensa exige remuneração mensal igual ou superior a 1 × IAS (${eur(ias)}).`,
      });
      emFalta.push("A remuneração mensal do teu trabalho dependente");
    } else {
      const cumpre = entrada.remuneracaoDependenteMensal >= ias;
      condicoes.push({
        label: `Remuneração do trabalho dependente ≥ ${eur(ias)}`,
        estado: cumpre ? "cumprida" : "nao-cumprida",
        detalhe: `Indicaste ${eur(entrada.remuneracaoDependenteMensal)}/mês.`,
      });
    }

    // Condição 3 — rendimento relevante médio mensal ≤ 4 × IAS.
    const dentroDoLimite = medioMensal <= limiteAcumulacao;
    condicoes.push({
      label: `Rendimento relevante médio ≤ ${eur(limiteAcumulacao)}/mês`,
      estado: dentroDoLimite ? "cumprida" : "nao-cumprida",
      detalhe: `A tua média mensal do trimestre é ${eur(medioMensal)}.`,
    });

    const algumaFalha = condicoes.some((c) => c.estado === "nao-cumprida" && !c.label.startsWith("Rendimento relevante"));
    const algumaPorConfirmar = condicoes.some((c) => c.estado === "por-confirmar");

    // Falta confirmar → NUNCA zerar. A reserva mantém-se pelo cálculo normal.
    if (algumaPorConfirmar) {
      return {
        ...comum,
        estado: "acumulacao-por-confirmar",
        valorReservar: contribuicaoNormal,
        condicoes,
        titulo: "Podes estar isento — falta confirmar",
        mensagem:
          "Indicaste que acumulas com trabalho dependente, mas a dispensa do Art. 157.º depende de condições que " +
          "ainda não confirmámos. Até lá reservamos o valor cheio: é melhor sobrar do que faltar.",
        severidade: "aviso",
        emFalta,
      };
    }

    // Condição de fundo falhada → contribuição normal, sem dispensa.
    if (algumaFalha) {
      return {
        ...comum,
        estado: "normal",
        valorReservar: contribuicaoNormal,
        condicoes,
        titulo: "A dispensa por acumulação não se aplica",
        mensagem: "Uma das condições do Art. 157.º não está cumprida, por isso contribuis pelo regime normal.",
        severidade: "aviso",
        emFalta: [],
      };
    }

    // Acima de 4 × IAS → contribui sobre o EXCEDENTE (não sobre tudo, nem zero).
    if (!dentroDoLimite) {
      const excedenteMensal = medioMensal - limiteAcumulacao;
      const valorReservar = excedenteMensal * SS_TAXA.value * 3;
      return {
        ...comum,
        estado: "acumulacao-parcial",
        valorReservar,
        condicoes,
        titulo: "Contribuis sobre o excedente",
        mensagem:
          `A tua média mensal (${eur(medioMensal)}) ultrapassa os 4 × IAS (${eur(limiteAcumulacao)}). ` +
          "A dispensa cobre até esse limite; sobre o que passa, contribuis normalmente.",
        severidade: "aviso",
        emFalta: [],
      };
    }

    return {
      ...comum,
      estado: "dispensa-acumulacao",
      valorReservar: 0,
      condicoes,
      titulo: "Dispensado por acumulação",
      mensagem:
        "Com as condições do Art. 157.º cumpridas e a média mensal abaixo de 4 × IAS, não há contribuição a " +
        "pagar como independente. Confirma sempre na Segurança Social Direta.",
      severidade: "neutro",
      emFalta: [],
    };
  }

  // ── Regime normal ──────────────────────────────────────────────────
  const emFalta = primeiroAno === null ? ["A data de início da tua atividade"] : [];
  return {
    ...comum,
    estado: "normal",
    valorReservar: contribuicaoNormal,
    condicoes: [],
    titulo: "Contribuição do trimestre",
    mensagem:
      "Valor estimado para reservares. A declaração é trimestral e a contribuição paga-se todos os meses, " +
      "entre o dia 10 e o dia 20.",
    severidade: "neutro",
    emFalta,
  };
}

function eur(n: number): string {
  return `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
