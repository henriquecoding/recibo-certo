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
  const meios = candidato.capacidades.flatMap((item) => item.avaliacoesAtivos);
  const meiosEmFaltaOuInadequados = meios.filter((item) => item.estado === "em-falta" || item.estado === "inadequado");
  const semMeios = meiosEmFaltaOuInadequados.length > 0;
  const meiosCriticosPorConfirmar = meios.filter(
    (item) => item.estado === "por-confirmar" && item.requisito.confirmarAntesDeRecomendar,
  );
  const meiosLimitados = meios.filter((item) => item.estado === "limitado");
  const notasDosMeios = (itens: typeof meios) => [...new Set(itens.map((item) => item.nota))].slice(0, 2).join(" ");
  const adequacaoPorResolver = semMeios || meiosCriticosPorConfirmar.length > 0 || meiosLimitados.length > 0;
  objecoes.push({
    id: "entrada",
    pergunta: "Consegues mesmo entrar neste mercado?",
    procede: adequacaoPorResolver,
    fatal: semMeios || meiosCriticosPorConfirmar.length > 0,
    resposta: semMeios
      ? `Falta pelo menos um meio, ou um dos meios declarados não é adequado. Enquanto isso não mudar, isto não é executável — é um objetivo. ${[...new Set(meiosEmFaltaOuInadequados.map((item) => `${item.requisito.finalidade}: ${item.nota}`))].slice(0, 2).join(" ")}`
      : meiosCriticosPorConfirmar.length > 0
        ? `O meio existe, mas a adequação profissional ainda não foi confirmada. A hipótese não é promovida até confirmares estado, disponibilidade, acesso e limites. ${notasDosMeios(meiosCriticosPorConfirmar)}`
        : meiosLimitados.length > 0
          ? `Os meios existem, mas há limitações declaradas. ${notasDosMeios(meiosLimitados)}`
          : "Tens as competências e meios confirmados que a execução pede.",
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
  // A mesma lista literal de ids existia aqui e em `restricoes.ts` para
  // perguntas diferentes. É agora uma propriedade declarada do modelo, e
  // um modelo novo tem de a responder para compilar.
  const dependePublicidade = candidato.modelo.dependeTrafegoPago;
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
    teto !== undefined && viabilidade.investimentoInicial !== null && viabilidade.investimentoInicial.max > teto;
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

  // ── O que precisas de tirar, contra o que isto custa ──────────────
  //  ┌──────────────────────────────────────────────────────────────┐
  //  │ `rendimento.minimoMensal` valia 5 pontos na profundidade do   │
  //  │ perfil e mostrava à pessoa a frase «serve para confrontar o   │
  //  │ modelo com o que precisas de tirar dele». Não confrontava     │
  //  │ nada: não existia uma única linha no motor que o lesse.       │
  //  │                                                              │
  //  │ O confronto honesto NÃO é estimar receita — isso o motor      │
  //  │ recusa fazer, e continua a recusar. É a soma que qualquer     │
  //  │ pessoa pode verificar: para tirares X por mês de um modelo    │
  //  │ que custa Y por mês antes de qualquer venda, a operação tem   │
  //  │ de gerar X + Y. É aritmética sobre dois números declarados,   │
  //  │ não uma projeção.                                            │
  //  └──────────────────────────────────────────────────────────────┘
  const minimo = contexto.rendimento.minimoMensal;
  const custoFixo = viabilidade.custoMensal;
  if (minimo !== undefined) {
    const comCusto = custoFixo !== null;
    objecoes.push({
      id: "rendimento",
      pergunta: `O modelo comporta os ${minimo.toLocaleString("pt-PT")} € por mês que precisas de tirar?`,
      procede: comCusto,
      fatal: false,
      resposta: comCusto
        ? `Este modelo tem ${custoFixo!.min.toLocaleString("pt-PT")}–${custoFixo!.max.toLocaleString("pt-PT")} €/mês de custo fixo antes de qualquer venda. Para tirares ${minimo.toLocaleString("pt-PT")} €, a operação tem de gerar pelo menos ${(minimo + custoFixo!.min).toLocaleString("pt-PT")}–${(minimo + custoFixo!.max).toLocaleString("pt-PT")} € por mês. Quantos clientes são, ao teu preço, é o que o motor de preço responde.`
        : `Sem espaço nem equipa, o custo fixo mensal é sobretudo o teu tempo. A operação tem de gerar os ${minimo.toLocaleString("pt-PT")} € que precisas mais o que gastares em materiais e deslocações — e o preço que o consegue apura-se no motor de preço.`,
    });
  }

  // ── O reinvestimento mensal contra o custo fixo mensal ────────────
  const mensal = contexto.capital.mensal;
  if (mensal !== undefined && custoFixo !== null) {
    const naoCobre = mensal < custoFixo.min;
    objecoes.push({
      id: "reinvestimento",
      pergunta: "Consegues aguentar o custo fixo nos meses sem receita?",
      procede: naoCobre,
      fatal: false,
      resposta: naoCobre
        ? `Declaraste conseguir pôr ${mensal.toLocaleString("pt-PT")} € por mês e o custo fixo mínimo deste modelo é ${custoFixo.min.toLocaleString("pt-PT")} €/mês. A diferença tem de vir da receita desde o primeiro mês, e isso raramente acontece.`
        : `Os ${mensal.toLocaleString("pt-PT")} € por mês que declaraste cobrem o custo fixo mínimo deste modelo enquanto a receita não chega.`,
    });
  }

  // ── Quando é que isto paga, contado a partir de hoje ──────────────
  const arranque = contexto.tempo.prazoArranqueMeses;
  if (arranque !== undefined && viabilidade.tempoAteReceitaMeses !== null) {
    const cedo = arranque + viabilidade.tempoAteReceitaMeses.min;
    const tarde = arranque + viabilidade.tempoAteReceitaMeses.max;
    objecoes.push({
      id: "calendario",
      pergunta: "Quando é que isto dá a primeira receita, contando a partir de hoje?",
      procede: false,
      fatal: false,
      resposta: `Disseste querer arrancar daqui a ${arranque} ${arranque === 1 ? "mês" : "meses"}. Somando o tempo que este modelo leva até cobrar, a primeira receita cai entre o mês ${cedo} e o mês ${tarde} a contar de hoje.`,
    });
  }

  // ── A estrutura pretendida, quando o modelo a interpela ───────────
  //  Não afirmamos nada de fiscal aqui: o comparador do produto é que
  //  responde, com a fonte legal ao lado. O que o motor faz é notar que
  //  a pergunta se levanta — e é uma pergunta que só se levanta em
  //  modelos com equipa, espaço ou stock.
  const pesado = candidato.modelo.precisaEquipa || candidato.modelo.precisaLojaFisica || candidato.modelo.precisaStock;
  if (contexto.estrutura === "recibos-verdes" && pesado) {
    objecoes.push({
      id: "estrutura",
      pergunta: "A estrutura que escolheste serve para este modelo?",
      procede: true,
      fatal: false,
      resposta:
        "Disseste querer arrancar em recibos verdes, e este modelo traz equipa, espaço ou stock. A escolha entre nome individual e sociedade muda responsabilidade, IVA e custos de estrutura — está no comparador, com a base legal, e é decisão a tomar antes de assinar seja o que for.",
    });
  }

  // ── Risco acima da tolerância ─────────────────────────────────────
  //  ┌──────────────────────────────────────────────────────────────┐
  //  │ FATAL POR ACUMULAÇÃO, E O PERFIL QUE NENHUM NEGÓCIO SATISFAZ │
  //  │                                                              │
  //  │ A regra era `fora.length >= 4`. Medido: um perfil «muito     │
  //  │ conservador» — tolerância 0 em todas as dimensões — recebia  │
  //  │ objeção fatal em DEZ de dez hipóteses, porque quatro         │
  //  │ dimensões (procura, operacional, volatilidade, dependência   │
  //  │ de clientes) nunca descem abaixo de 1 em negócio nenhum do   │
  //  │ grafo. Não havia resposta possível: o perfil era             │
  //  │ estruturalmente insatisfazível e o motor respondia «nenhuma  │
  //  │ hipótese serve», que é uma afirmação sobre o formulário e    │
  //  │ não sobre o mercado.                                         │
  //  │                                                              │
  //  │ Duas correções, e nenhuma delas é afrouxar a tolerância      │
  //  │ declarada em silêncio:                                       │
  //  │                                                              │
  //  │  1. A gravidade passa a contar, e não só o número. Quatro    │
  //  │     riscos de nível 1 não são o mesmo que um de nível 3, e   │
  //  │     só a presença de um DECISIVO torna a objeção fatal.      │
  //  │  2. Quando TODAS as dimensões excedem, o motor diz-lhe o que │
  //  │     isso significa — em vez de o repetir hipótese a hipótese │
  //  │     como se fosse defeito de cada uma.                       │
  //  └──────────────────────────────────────────────────────────────┘
  const fora = riscos.filter((item) => item.dentroDaTolerancia === false);
  const decisivo = fora.some((item) => item.nivel >= 3);
  const apurados = riscos.filter((item) => item.apurado);
  const toleranciaImpossivel = apurados.length > 0 && fora.length === apurados.length;

  objecoes.push({
    id: "risco",
    pergunta: "Algum risco excede o que declaraste tolerar?",
    procede: fora.length > 0,
    fatal: fora.length >= 4 && decisivo,
    resposta:
      fora.length === 0
        ? "Nenhuma dimensão de risco excede a tolerância que declaraste."
        : `${fora.length} ${fora.length === 1 ? "dimensão excede" : "dimensões excedem"} a tua tolerância: ${fora
            .map((item) => `${item.dimensao} (nível ${item.nivel})`)
            .join(
              ", ",
            )}.${decisivo ? " Pelo menos uma é decisiva." : " Nenhuma é decisiva — são riscos de fundo, presentes em quase todo o negócio."}`,
  });

  if (toleranciaImpossivel) {
    objecoes.push({
      id: "tolerancia",
      pergunta: "A tolerância que declaraste é satisfazível por algum negócio?",
      procede: true,
      fatal: false,
      resposta:
        "Todas as dimensões de risco apuradas excedem o que declaraste aceitar. Quatro delas — procura, operação, volatilidade e dependência de clientes — não descem abaixo do primeiro nível em negócio nenhum: criar alguma coisa é, por definição, aceitá-las. Isto diz mais sobre o perfil declarado do que sobre esta hipótese, e resolve-se em «Tolerância ao risco», dimensão a dimensão.",
    });
  }

  return objecoes;
}

/** Uma objeção fatal impede a promoção ao topo, por muito que pontue. */
export function temObjecaoFatal(objecoes: readonly ObjecaoStress[]): boolean {
  return objecoes.some((item) => item.fatal && item.procede);
}

export function objecoesQueProcedem(objecoes: readonly ObjecaoStress[]): readonly ObjecaoStress[] {
  return objecoes.filter((item) => item.procede);
}
