// ═══════════════════════════════════════════════════════════════════════
//  VIABILIDADE — intervalos, e nunca falsa precisão
//  ---------------------------------------------------------------------
//  «4 500 € – 8 000 €» é honesto. «6 247,34 €» é uma precisão que nenhum
//  dado nosso sustenta e que se lê como se sustentasse. Este ficheiro só
//  produz intervalos, e cada um carrega a proveniência que diz que é uma
//  estimativa estrutural — não uma observação de mercado.
//
//  O que este ficheiro NÃO faz: calcular preço. Isso é do motor canónico
//  (`src/lib/pricing`), que é a única porta de preço do produto. Aqui
//  estima-se o que é preciso para ARRANCAR, que é outra pergunta.
//
//  ── PORQUE O TESTE BINÁRIO SAIU ────────────────────────────────────
//  Durante muito tempo a economia decidia-se assim:
//
//      cabeNoCapital = investimentoInicial.min <= teto
//
//  Um intervalo de 4 500–30 000 € «cabia» num teto de 5 000 €. O stress
//  test, na linha ao lado, escrevia a objeção certa — «cabe no mínimo,
//  não cabe no pior caso, e os negócios raramente correm pelo melhor» — e
//  o score usava o mínimo à mesma. Média medida do eixo: 94,9 em 100, com
//  o topo saturado.
//
//  O booleano continua a existir porque há sítios onde a pergunta é
//  mesmo binária (a restrição que ELIMINA, e a objeção do stress test).
//  O que mudou é que o SCORE deixou de o usar: passa a ler a FRAÇÃO do
//  intervalo que o teto cobre. Um teto que cobre o mínimo e mais nada
//  vale perto de zero; um teto que cobre o topo vale um. Fica contínuo,
//  penaliza a cauda, e mantém a honestidade de o intervalo ser intervalo.
// ═══════════════════════════════════════════════════════════════════════

import { SMN, SS_DEPENDENTE } from "@/lib/fiscal-data";
import { intervalo, somarIntervalos, type Intervalo } from "../proveniencia";
import { tetoDeCapital, type OpportunityContext } from "../contexto/tipos";
import type { CandidatoBruto } from "./gerador";
import type { AvaliacaoViabilidade } from "./tipos";

/** Custo estimado de cumprir requisitos regulatórios, por severidade. */
const CUSTO_REGULATORIO: Readonly<Record<0 | 1 | 2 | 3, [number, number]>> = {
  0: [0, 0],
  1: [50, 400],
  2: [300, 2000],
  3: [1000, 6000],
};

/**
 * Que fração de um intervalo é que um teto cobre, em [0, 1].
 *
 * `null` quando não há teto declarado — que NÃO é zero: zero diria «não
 * cabe nada», e o que se passa é que ninguém respondeu.
 *
 * Um intervalo degenerado (min === max) só admite a resposta binária, e
 * é a única circunstância em que a devolve.
 */
export function fracaoCoberta(alcance: Intervalo | null, teto: number | undefined): number | null {
  if (alcance === null || teto === undefined) return null;
  if (alcance.max <= alcance.min) return teto >= alcance.min ? 1 : 0;
  const parte = (teto - alcance.min) / (alcance.max - alcance.min);
  return Math.max(0, Math.min(1, parte));
}

/**
 * O custo fixo mensal de uma operação com equipa, calculado e não inventado.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ O ÚNICO NÚMERO INVENTADO DE UM MOTOR QUE OS PROÍBE                  │
 * │                                                                    │
 * │ Este campo era `capitalTipico.min / 10` a `capitalTipico.max / 6`. │
 * │ O divisor 10 e o divisor 6 não tinham proveniência nenhuma: nem    │
 * │ método, nem fonte, nem razão escrita. Num motor que se recusa a    │
 * │ estimar receita, estimar custo fixo por uma fração arbitrária do   │
 * │ capital era a exceção que enfraquecia a regra inteira.             │
 * │                                                                    │
 * │ Passa a ser um CÁLCULO sobre dados fiscais verificados: a RMMG em  │
 * │ vigor e a TSU da entidade empregadora, ambas de `fiscal-data.ts`,  │
 * │ com base legal e `lastVerified`. Duas pessoas ao mínimo legal, com │
 * │ os catorze meses repartidos por doze. É verificável, é a fronteira │
 * │ INFERIOR real de uma operação com equipa, e diz o que não inclui.  │
 * │                                                                    │
 * │ O espaço próprio não ganhou substituto e ficou sem número: a renda │
 * │ domina o custo, varia por concelho e por metro quadrado, e não há  │
 * │ série ligada que a meça. Dizer «não estimamos, e é isto que pesa»  │
 * │ é mais útil do que uma fração do capital com ar de conta.          │
 * └────────────────────────────────────────────────────────────────────┘
 */
function custoDeEquipa(pessoas: number): Intervalo {
  const mensalPorPessoa = SMN.value * (1 + SS_DEPENDENTE.entidade.value);
  // Catorze meses de retribuição repartidos por doze de tesouraria: os
  // subsídios são devidos e ignorá-los subavaliava o custo em ~17 %.
  const comSubsidios = (mensalPorPessoa * 14) / 12;
  return intervalo(
    Math.round(comSubsidios),
    Math.round(comSubsidios * pessoas),
    "€/mês",
    {
      origem: "calculo",
      fonte: `RMMG ${SMN.value.toLocaleString("pt-PT")} € + TSU da entidade ${(SS_DEPENDENTE.entidade.value * 100).toLocaleString("pt-PT")} %`,
      url: "https://www.seg-social.pt/entidades-contratantes",
      limitacao: `Uma a ${pessoas} pessoas ao mínimo legal, com os catorze meses repartidos por doze. Não inclui subsídio de refeição, seguro de acidentes de trabalho, formação obrigatória nem substituições. É o piso, não o custo real.`,
    },
  );
}

export function avaliarViabilidade(
  candidato: CandidatoBruto,
  contexto: OpportunityContext,
  barreiraRegulatoria: 0 | 1 | 2 | 3,
): AvaliacaoViabilidade {
  const limitacoes: string[] = [];

  const doModelo = candidato.modelo.capitalTipico;
  const [regMin, regMax] = CUSTO_REGULATORIO[barreiraRegulatoria];
  const parcelas: Intervalo[] = [doModelo];

  if (regMax > 0) {
    parcelas.push(
      intervalo(regMin, regMax, "€", {
        origem: "estimativa",
        fonte: "Requisitos regulatórios identificados para esta atividade",
        limitacao:
          "Ordem de grandeza de licenças, seguros e habilitações. Os valores concretos dependem do município e da entidade, e têm de ser confirmados.",
      }),
    );
  }

  // Ativos que a pessoa JÁ TEM não voltam a ser orçamentados. É a
  // diferença entre uma estimativa e um preçário: quem já tem carrinha
  // não precisa de comprar carrinha.
  const ativos = new Set(contexto.ativos);
  const emFalta = candidato.capacidades
    .flatMap((item) => item.capacidade.ativosNecessarios)
    .filter((ativo) => !ativos.has(ativo));
  if (emFalta.length > 0) {
    limitacoes.push(
      `Não estão orçamentados ${emFalta.length} ${emFalta.length === 1 ? "ativo" : "ativos"} que este trabalho exige e que não declaraste ter.`,
    );
  }

  const investimentoInicial = somarIntervalos(
    parcelas,
    "Modelo de receita + requisitos regulatórios",
  );

  limitacoes.push(
    "O intervalo vem da estrutura do modelo de receita, não de preços observados no teu mercado. É ordem de grandeza para decidir se avança, não um orçamento.",
  );
  if (candidato.problema.procuraObservavel === false) {
    limitacoes.push(
      "Não há fonte pública portuguesa que meça a procura deste problema, pelo que a receita não é estimável sem falar com clientes.",
    );
  }

  const teto = tetoDeCapital(contexto);
  const cabeNoCapital =
    teto === undefined || investimentoInicial === null ? null : investimentoInicial.min <= teto;
  const fracaoCapitalCoberta = fracaoCoberta(investimentoInicial, teto);

  const prazo = contexto.tempo.prazoMaxPrimeiraReceitaMeses;
  const tempo = candidato.modelo.tempoAteReceitaMeses;
  const cabeNoPrazo = prazo === undefined ? null : tempo.min <= prazo;
  const fracaoPrazoCoberta = fracaoCoberta(tempo, prazo);

  // ── Custo fixo mensal: só quando é derivável, e sempre com método ──
  const custoMensal = candidato.modelo.precisaEquipa ? custoDeEquipa(2) : null;

  if (candidato.modelo.precisaLojaFisica) {
    limitacoes.push(
      "Não estimamos a renda: domina o custo fixo deste modelo, varia por concelho e por metro quadrado, e não há série ligada que a meça. Confirma-a antes de decidir — é o número que decide se o mês fecha.",
    );
  } else if (custoMensal === null) {
    limitacoes.push(
      "Sem espaço nem equipa, o custo fixo mensal é sobretudo o teu tempo — e esse entra no preço, não no arranque.",
    );
  }

  return {
    investimentoInicial,
    custoMensal,
    tempoAteReceitaMeses: tempo,
    cabeNoCapital,
    cabeNoPrazo,
    fracaoCapitalCoberta,
    fracaoPrazoCoberta,
    limitacoes,
  };
}
