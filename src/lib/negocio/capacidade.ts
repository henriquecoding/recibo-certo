// ═══════════════════════════════════════════════════════════════════════
//  CAPACIDADE — a ponte que falta entre preço e faturação
//  ---------------------------------------------------------------------
//  `PVP × vendas` produz sempre um número. O número pode ser
//  operacionalmente impossível e o ecrã não dá sinal nenhum:
//
//      100 projetos/mês × 20 h = 2 000 horas por mês.
//
//  Um mês tem 730 horas. O plano não é ambicioso — é inexistente. E o
//  perigo não é o exagero óbvio: é o plano que pede 115% da capacidade,
//  parece razoável, e falha em março quando alguém adoece.
//
//  ── DUAS UNIDADES, NUNCA MISTURADAS ────────────────────────────────
//  · HORAS — o gargalo partilhado. Todas as ofertas que consomem tempo
//    competem pelas MESMAS horas produtivas, e por isso o teto é do
//    negócio, não de cada oferta;
//  · UNIDADES/CLIENTES/PROJETOS — o teto de uma oferta em particular
//    (lote de produção, limite de stock, limite que a pessoa escreveu).
//
//  Somar as duas seria comparar horas com bolos. Por isso há duas
//  funções, e a interface mostra-as separadas.
//
//  ── O QUE ESTE MÓDULO NUNCA FAZ ────────────────────────────────────
//  Corrigir o volume. Um plano acima da capacidade pode ser exatamente o
//  que a pessoa quer testar antes de decidir contratar alguém. O módulo
//  diz que não cabe e diz quanto falta; a decisão é dela.
// ═══════════════════════════════════════════════════════════════════════

import { FERIAS, FORMACAO_CONTINUA, HORARIO_SEMANAL_COMPLETO } from "@/lib/fiscal-data";
import { cent, dividir, num } from "@/lib/pricing/numeros";
import { capacidadeDe } from "./ofertas";
import type {
  DiagnosticoCapacidade,
  EstadoCapacidade,
  EstruturaNegocio,
  ResultadoOfertaNegocio,
  TrabalhadorPlaneado,
} from "./tipos";

/** Acima disto a capacidade é «apertada»: não é impossível, é frágil. */
export const LIMIAR_APERTADO = 0.85;

// ═══════════════════════════════════════════════════════════════════════
//  A CAPACIDADE QUE A EQUIPA ACRESCENTA — §39-40
//  ---------------------------------------------------------------------
//  Contratar alguém subia o custo e o ponto de equilíbrio, e não mexia na
//  capacidade. Isso torna QUALQUER contratação economicamente unilateral
//  e sempre má — o que é falso para um cargo produtivo, e é precisamente
//  a decisão que a ferramenta devia ajudar a tomar.
//
//  ── O QUE NÃO SE ASSUME ────────────────────────────────────────────
//  Que contratar aumenta a capacidade. Um administrativo, um comercial ou
//  um contabilista custam e não entregam mais horas faturáveis. Por isso
//  `capacidade.aumenta` nasce por declarar, e o valor por omissão é NÃO.
//
//  ── E O TEMPO QUE NÃO É PRODUTIVO ──────────────────────────────────
//  §37: a formação contínua (Art. 131.º CT, 40 h anuais mínimas) sai do
//  teto produtivo, tal como as férias. Um posto de 40 h/semana não
//  entrega 40 × 52 horas faturáveis por ano, e a diferença é material.
// ═══════════════════════════════════════════════════════════════════════

/** As semanas de férias que a lei garante, em semanas de 5 dias úteis. */
const SEMANAS_FERIAS = FERIAS.diasUteisAno.value / 5;
const SEMANAS_ANO = 52;

export interface HorasDoPosto {
  id: string;
  funcao: string;
  /** Horas faturáveis por mês, já sem férias nem formação. */
  horasMes: number;
  /** Ofertas que este posto consegue entregar. Vazio = todas. */
  ofertas: string[];
}

export interface CapacidadeEquipa {
  /** Horas faturáveis que a equipa acrescenta por mês. */
  horasMes: number;
  postos: HorasDoPosto[];
}

/**
 * As horas faturáveis que um posto acrescenta, por mês.
 *
 * Deliberadamente CONSERVADOR: tira as férias, tira a formação e só
 * depois aplica a fração produtiva. Contar as horas duas vezes daria um
 * teto maior e um plano que não cabe — e o módulo inteiro existe para
 * apanhar planos que não cabem.
 */
export function horasProdutivasDoPosto(t: TrabalhadorPlaneado): number {
  const cap = t.capacidade;
  if (!cap?.aumenta) return 0;

  const horasSemana = num(cap.horasSemana) > 0 ? num(cap.horasSemana) : HORARIO_SEMANAL_COMPLETO.value;
  const fracao = num(cap.fracaoProdutiva) > 0 ? Math.min(1, num(cap.fracaoProdutiva)) : 1;

  const horasAno = horasSemana * (SEMANAS_ANO - SEMANAS_FERIAS);
  // Sem horas declaradas, usa-se o mínimo legal: é o que a empresa TEM de
  // dar, e ignorá-lo daria um teto que a lei não permite atingir.
  const formacaoAno = num(t.formacao?.horasAno) > 0
    ? num(t.formacao?.horasAno)
    : FORMACAO_CONTINUA.horasAnuais.value;

  return cent(Math.max(0, (horasAno - formacaoAno) * fracao) / 12);
}

/** O que a equipa inteira acrescenta ao teto de horas do negócio. */
export function capacidadeDaEquipa(estrutura: EstruturaNegocio | undefined): CapacidadeEquipa {
  const postos: HorasDoPosto[] = [];

  for (const t of estrutura?.trabalhadores ?? []) {
    // Um posto sem salário não é uma contratação (§41) — e por isso
    // também não é capacidade.
    if (num(t.remuneracao?.salarioBaseMensal) <= 0) continue;
    const horasMes = horasProdutivasDoPosto(t);
    if (horasMes <= 0) continue;
    postos.push({
      id: t.id,
      funcao: t.funcao?.trim() || "posto sem nome",
      horasMes,
      ofertas: t.capacidade?.ofertas ?? [],
    });
  }

  return { horasMes: cent(postos.reduce((s, p) => s + p.horasMes, 0)), postos };
}

/**
 * Capacidade de cada oferta face ao volume esperado.
 *
 * Só entram as ofertas com teto conhecido — declarado ou derivado do
 * modelo de tempo. Inventar um teto para uma revenda seria pior do que
 * não ter nenhum: daria um aviso falso sobre um limite que não existe.
 */
export function diagnosticarCapacidade(
  resultados: readonly ResultadoOfertaNegocio[],
): DiagnosticoCapacidade[] {
  const diagnosticos: DiagnosticoCapacidade[] = [];

  for (const r of resultados) {
    const cap = capacidadeDe(r.oferta);
    if (!cap || num(cap.maximoMes) <= 0) continue;

    const maximo = num(cap.maximoMes);
    const carga = r.unidadesMes;
    const utilizacao = dividir(carga, maximo);
    const estado = estadoDe(utilizacao);

    diagnosticos.push({
      ofertaId: r.oferta.id,
      nome: r.oferta.nome,
      unidade: cap.unidade,
      estado,
      carga,
      maximo,
      utilizacao,
      mensagem: mensagemDe(estado, {
        nome: r.oferta.nome,
        unidade: cap.unidade,
        carga,
        maximo,
        motivo: cap.motivo,
      }),
    });
  }

  return diagnosticos;
}

/**
 * O gargalo do NEGÓCIO em horas: todas as ofertas que consomem tempo
 * partilham as mesmas horas produtivas.
 *
 * Devolve `null` quando nenhuma oferta declara tempo — sem tempo
 * declarado não há gargalo de horas para diagnosticar.
 */
export function gargaloDeHoras(
  resultados: readonly ResultadoOfertaNegocio[],
  /** As horas que a equipa acrescenta ao teto (§40). */
  equipa?: CapacidadeEquipa,
): DiagnosticoCapacidade | null {
  const comHoras = resultados.filter((r) => (r.horasMes ?? 0) > 0);
  const daEquipa = equipa?.horasMes ?? 0;
  if (comHoras.length === 0) return null;

  const carga = comHoras.reduce((s, r) => s + (r.horasMes ?? 0), 0);

  // O teto é o MAIOR das horas produtivas declaradas, não a soma: as
  // ofertas partilham a mesma semana de trabalho. Somar os tetos de três
  // ofertas de 40 h/semana daria 120 h/semana à mesma pessoa.
  const doTitular = comHoras.reduce((maior, r) => {
    const cap = capacidadeDe(r.oferta);
    const horasPorUnidade = num(r.oferta.pricing.tempo?.horasPorUnidade);
    if (!cap || !cap.derivada || horasPorUnidade <= 0) return maior;
    // `maximoMes` está em unidades; convertê-lo de volta a horas dá as
    // horas produtivas que o modelo de tempo daquela oferta declara.
    return Math.max(maior, cap.maximoMes * horasPorUnidade);
  }, 0);

  // A equipa SOMA-SE ao titular: são pessoas diferentes, com semanas de
  // trabalho diferentes. É o oposto das ofertas, que partilham a mesma.
  const maximo = doTitular + daEquipa;

  if (maximo <= 0) return null;

  const utilizacao = dividir(carga, maximo);
  const estado = estadoDe(utilizacao);

  return {
    ofertaId: "__horas__",
    nome: "Horas de trabalho",
    unidade: "horas",
    estado,
    carga: Math.round(carga),
    maximo: Math.round(maximo),
    utilizacao,
    mensagem: mensagemDeHoras(estado, Math.round(carga), Math.round(maximo), Math.round(daEquipa)),
  };
}

function estadoDe(utilizacao: number): EstadoCapacidade {
  if (!Number.isFinite(utilizacao) || utilizacao <= 0) return "desconhecida";
  if (utilizacao > 1.0000001) return "excedida";
  if (utilizacao >= LIMIAR_APERTADO) return "apertada";
  return "folgada";
}

function mensagemDe(
  estado: EstadoCapacidade,
  e: { nome: string; unidade: string; carga: number; maximo: number; motivo?: string },
): string {
  const u = rotuloUnidade(e.unidade, e.maximo);
  const porque = e.motivo ? ` (${e.motivo})` : "";

  switch (estado) {
    case "excedida":
      return `${e.nome}: o plano pede ${e.carga} ${u} por mês e só cabem ${e.maximo}${porque}. Faltam ${
        e.carga - e.maximo
      } — este cenário não acontece sem mudar alguma coisa: mais horas, menos tempo por cada, ou alguém que ajude.`;
    case "apertada":
      return `${e.nome}: ${e.carga} de ${e.maximo} ${u} por mês${porque}. Cabe, mas sem folga — uma semana de doença ou um cliente que atrasa e o mês não fecha.`;
    case "folgada":
      return `${e.nome}: ${e.carga} de ${e.maximo} ${u} por mês${porque}. Há espaço para crescer sem mudar a estrutura.`;
    default:
      return `${e.nome}: sem limite de capacidade declarado.`;
  }
}

function mensagemDeHoras(
  estado: EstadoCapacidade,
  carga: number,
  maximo: number,
  daEquipa = 0,
): string {
  // Quando parte do teto vem da equipa, diz-se — senão o número parece
  // vir de lado nenhum e ninguém sabe o que o faria mudar.
  const comEquipa = daEquipa > 0 ? ` (${maximo - daEquipa} tuas + ${daEquipa} da equipa)` : "";

  switch (estado) {
    case "excedida":
      return `Somando tudo o que planeaste vender, são ${carga} horas de trabalho por mês — e só tens ${maximo}${comEquipa} horas faturáveis. Faltam ${
        carga - maximo
      } horas: o mix não cabe em quem cá está.`;
    case "apertada":
      return `São ${carga} horas por mês das ${maximo}${comEquipa} que tens. Cabe, mas sem margem para imprevistos.`;
    case "folgada":
      return `São ${carga} horas por mês das ${maximo}${comEquipa} disponíveis. Sobra tempo para vender mais ou para o que não é faturável.`;
    default:
      return "Sem horas suficientes declaradas para avaliar o gargalo.";
  }
}

const rotuloUnidade = (unidade: string, n: number): string => {
  const singular = n === 1;
  switch (unidade) {
    case "horas":
      return singular ? "hora" : "horas";
    case "clientes":
      return singular ? "cliente" : "clientes";
    case "projetos":
      return singular ? "projeto" : "projetos";
    default:
      return singular ? "unidade" : "unidades";
  }
};
