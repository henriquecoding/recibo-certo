// ═══════════════════════════════════════════════════════════════════════
//  STRESS TEST — tentar destruir antes de promover
//  ---------------------------------------------------------------------
//  Ponto 45: antes de colocar uma oportunidade no topo, tentar matá-la.
//  As perguntas são sempre as mesmas e são feitas a todos os candidatos —
//  o que muda é a resposta, e essa depende dos dados de cada um.
//
//  Uma objeção `fatal` impede a promoção ao topo por muito que a
//  hipótese pontue. É o que separa um ranking de um juízo.
// ═══════════════════════════════════════════════════════════════════════

import { tetoDeCapital, type OpportunityContext } from "../contexto/tipos";
import type { CandidatoBruto } from "./gerador";
import type {
  AvaliacaoProcura,
  AvaliacaoRegulatoria,
  AvaliacaoViabilidade,
  ObjecaoStress,
  RiscoAvaliado,
} from "./tipos";

export interface EntradaStress {
  candidato: CandidatoBruto;
  contexto: OpportunityContext;
  viabilidade: AvaliacaoViabilidade;
  regulacao: AvaliacaoRegulatoria;
  procura: AvaliacaoProcura;
  riscos: readonly RiscoAvaliado[];
}

export function correrStressTest(entrada: EntradaStress): readonly ObjecaoStress[] {
  const { candidato, contexto, viabilidade, regulacao, procura, riscos } = entrada;
  const objecoes: ObjecaoStress[] = [];

  // ── A procura é suficientemente forte? ────────────────────────────
  const semProcuraObservavel = !candidato.problema.procuraObservavel;
  objecoes.push({
    id: "procura",
    pergunta: "A procura é suficientemente forte?",
    procede: semProcuraObservavel,
    fatal: false,
    resposta: semProcuraObservavel
      ? "Não sabemos. Nenhuma fonte pública portuguesa mede este problema — a resposta tem de vir de clientes, e é isso que o plano de validação testa primeiro."
      : "Existe fonte pública que mede a intensidade deste problema. Ver a evidência.",
  });

  // ── Concorrentes invisíveis ───────────────────────────────────────
  objecoes.push({
    id: "concorrencia",
    pergunta: "Existem concorrentes que não estamos a ver?",
    procede: procura.leitura === "desconhecida",
    fatal: false,
    resposta:
      procura.leitura === "desconhecida"
        ? "Provavelmente. O motor não tem sinal de oferta, e ausência de concorrentes na nossa análise não é ausência de concorrentes no mercado."
        : "Há sinal de oferta ligado a esta composição.",
  });

  // ── O preço suporta os custos? ────────────────────────────────────
  const semEconomia = viabilidade.cabeNoCapital === null;
  objecoes.push({
    id: "economia",
    pergunta: "O preço suporta os custos?",
    procede: true,
    fatal: false,
    resposta: semEconomia
      ? "Por apurar. O intervalo de investimento é estrutural e não foi confrontado com capital declarado — e o preço só se fixa no motor de preço, com os teus custos reais."
      : "O investimento estimado cabe no que declaraste, mas o preço sustentável só se apura no motor de preço com os teus custos reais.",
  });

  // ── A pessoa consegue mesmo entrar? ───────────────────────────────
  const semMeios = candidato.capacidades.some((item) => item.ativosEmFalta.length > 0);
  objecoes.push({
    id: "entrada",
    pergunta: "Consegues mesmo entrar neste mercado?",
    procede: semMeios,
    fatal: semMeios,
    resposta: semMeios
      ? "Falta pelo menos um meio que este trabalho exige. Enquanto faltar, isto não é executável — é um objetivo."
      : "Tens as competências e os meios que a execução pede.",
  });

  // ── Barreira regulatória ──────────────────────────────────────────
  objecoes.push({
    id: "regulacao",
    pergunta: "Existe barreira regulatória que trave o arranque?",
    procede: regulacao.barreira >= 2,
    fatal: false,
    resposta:
      regulacao.barreira >= 2
        ? `Sim: ${regulacao.requisitos.length} ${regulacao.requisitos.length === 1 ? "requisito" : "requisitos"} a tratar antes da primeira venda${regulacao.temIncerteza ? ", e nem todos são inequívocos" : ""}.`
        : regulacao.requisitos.length > 0
          ? "Requisitos existem, mas são de tratar em paralelo com a validação."
          : "Nenhum requisito identificado para esta composição.",
  });

  // ── Sazonalidade e moda ───────────────────────────────────────────
  objecoes.push({
    id: "sazonalidade",
    pergunta: "Isto é sazonal ou é uma moda passageira?",
    procede: candidato.problema.sazonalidade >= 2,
    fatal: false,
    resposta:
      candidato.problema.sazonalidade >= 2
        ? "A procura concentra-se em parte do ano. Não é moda, mas obriga a tesouraria que aguente os meses vazios."
        : "O problema é estrutural e não depende de um pico anual.",
  });

  // ── Dependência de publicidade ────────────────────────────────────
  const dependePublicidade = ["produto-digital", "loja-online", "venda-direta"].includes(candidato.modelo.id);
  objecoes.push({
    id: "aquisicao",
    pergunta: "O negócio depende excessivamente de publicidade?",
    procede: dependePublicidade,
    fatal: false,
    resposta: dependePublicidade
      ? "Este modelo vive de trazer tráfego. Se o custo de aquisição subir, a margem vai atrás — e esse custo não é controlável por ti."
      : "A aquisição é sobretudo direta, o que é mais lento e menos dependente de plataformas.",
  });

  // ── Tesouraria ────────────────────────────────────────────────────
  const teto = tetoDeCapital(contexto);
  const apertado =
    teto !== undefined &&
    viabilidade.investimentoInicial !== null &&
    viabilidade.investimentoInicial.max > teto;
  objecoes.push({
    id: "tesouraria",
    pergunta: "A tesouraria aguenta o tempo até à primeira receita?",
    procede: apertado,
    fatal: false,
    resposta: apertado
      ? "O topo do intervalo estimado ultrapassa o capital que declaraste. Cabe no mínimo, não cabe no pior caso — e os negócios raramente correm pelo melhor."
      : teto === undefined
        ? "Não declaraste capital, por isso não há como responder a isto."
        : "O intervalo estimado cabe no capital declarado, incluindo o topo.",
  });

  // ── Risco acima da tolerância ─────────────────────────────────────
  const fora = riscos.filter((item) => !item.dentroDaTolerancia);
  objecoes.push({
    id: "risco",
    pergunta: "Algum risco excede o que declaraste tolerar?",
    procede: fora.length > 0,
    fatal: fora.length >= 4,
    resposta:
      fora.length === 0
        ? "Nenhuma dimensão de risco excede a tolerância que declaraste."
        : `${fora.length} ${fora.length === 1 ? "dimensão excede" : "dimensões excedem"} a tua tolerância: ${fora.map((item) => item.dimensao).join(", ")}.`,
  });

  return objecoes;
}

/** Uma objeção fatal impede a promoção ao topo, por muito que pontue. */
export function temObjecaoFatal(objecoes: readonly ObjecaoStress[]): boolean {
  return objecoes.some((item) => item.fatal && item.procede);
}

export function objecoesQueProcedem(objecoes: readonly ObjecaoStress[]): readonly ObjecaoStress[] {
  return objecoes.filter((item) => item.procede);
}
