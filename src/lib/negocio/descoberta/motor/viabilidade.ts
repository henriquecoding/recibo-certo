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
// ═══════════════════════════════════════════════════════════════════════

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

  const prazo = contexto.tempo.prazoMaxPrimeiraReceitaMeses;
  const tempo = candidato.modelo.tempoAteReceitaMeses;
  const cabeNoPrazo = prazo === undefined ? null : tempo.min <= prazo;

  // O custo mensal só se estima quando o modelo tem custo recorrente
  // estrutural. Inventar um valor «de manutenção» para todos seria o tipo
  // de número plausível que este motor existe para não produzir.
  const custoMensal =
    candidato.modelo.precisaLojaFisica || candidato.modelo.precisaEquipa
      ? intervalo(
          Math.round(doModelo.min / 10),
          Math.round(doModelo.max / 6),
          "€/mês",
          {
            origem: "estimativa",
            fonte: "Estrutura do modelo de receita (ReciboCerto)",
            limitacao:
              "Modelos com espaço ou equipa têm custo fixo mensal antes de qualquer venda. O valor real depende da renda e dos salários concretos.",
          },
        )
      : null;

  if (custoMensal === null) {
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
    limitacoes,
  };
}
