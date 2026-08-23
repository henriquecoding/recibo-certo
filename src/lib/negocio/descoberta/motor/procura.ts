// ═══════════════════════════════════════════════════════════════════════
//  PROCURA E OFERTA — a distinção que decide tudo
//  ---------------------------------------------------------------------
//  Ponto 44 do pedido, e é o mais importante deste ficheiro:
//
//      alta procura + pouca oferta   ≠   pouca oferta + pouca procura
//
//  Ausência de concorrentes não é oportunidade. Pode ser ausência de
//  mercado — e essa é a leitura mais provável, porque mercados com
//  procura tendem a ter quem os sirva.
//
//  ── O TERMO QUE FALTAVA, E QUE JÁ NÃO FALTA ────────────────────────
//  Durante muito tempo este ficheiro dizia: «o motor continua sem sinais
//  de oferta; sem um termo da subtração, a lacuna não é calculável — e a
//  resposta correta é `desconhecida`». Estava certo, e recusar-se a
//  responder foi a decisão certa. Reetiquetar o RNAL como oferta teria
//  sido contar os futuros clientes como rivais.
//
//  A oferta entra agora por onde devia: `market/oferta.ts` lê o
//  indicador 0014449 do INE — empresas por NUTS 2024 e divisão da CAE —
//  e a ontologia diz em que divisão um operador desta hipótese se
//  inscreveria. Normalizado por população residente (INE 0012918), dá
//  operadores por dez mil habitantes, comparável entre as nove NUTS II.
//
//  ── E O SEGUNDO AVISO QUE ESTE FICHEIRO DEIXOU ─────────────────────
//  «Ter os dois sinais NÃO é ter a lacuna»: uma taxa de ocupação e uma
//  contagem de empresas não se subtraem. Continua verdade, e continua a
//  ser respeitado. O que a oferta permite agora é uma afirmação mais
//  modesta e verificável: se a densidade de operadores desta zona está
//  acima ou abaixo do que é normal no país, medida na mesma base para
//  todas as regiões. Só quando existe TAMBÉM sinal de procura é que essa
//  densidade vira leitura de lacuna — porque é a procura que distingue
//  «pouca oferta porque há espaço» de «pouca oferta porque não há
//  mercado», e essa distinção é o erro mais caro de quem escolhe um
//  negócio.
// ═══════════════════════════════════════════════════════════════════════

import { effectiveReferenceAgeDays } from "@/lib/negocio/market/freshness";
import { MARKET_REGIONS, marketRegionLabel, splitObservationsByRegion } from "@/lib/negocio/market/geografia";
import {
  lacunaPorConcelho,
  lerLacuna,
  lerOferta,
  populacaoRegionalDaMatriz,
  type ContagemRegional,
  type EscalaDeLacuna,
  type LeituraDeLacuna as QuocienteDeLocalizacao,
  type LeituraDeOferta,
  type PackOferta,
} from "@/lib/negocio/market/oferta";
import { MATRIZ_CONCELHOS } from "@/lib/negocio/market/oferta-concelhos";
import { tendenciaDe } from "@/lib/negocio/market/procura-nuts2";
import { CONCEITO_POR_CAPACIDADE } from "../conhecimento/dados/ontologia";
import type { MarketObservationSummary, MarketPilotEvidence } from "@/lib/negocio/market/opportunities";
import type { MarketOpportunityState } from "@/lib/negocio/market/tipos";
import type { Evidencia, LacunaDeEvidencia } from "../proveniencia";
import type { CandidatoBruto } from "./gerador";
import { agregarIntensidade, lerIntensidade } from "./intensidade";
import type { AvaliacaoProcura, LeituraDeLacuna, TendenciaLida } from "./tipos";

/** Traduz uma observação do pack público numa evidência do motor. */
function comoEvidencia(observacao: MarketObservationSummary, local: boolean): Evidencia {
  const tipo =
    observacao.kind === "demand"
      ? "procura"
      : observacao.kind === "transactional"
        ? "mercado"
        : observacao.kind === "supply" || observacao.kind === "competition"
          ? "concorrencia"
          : observacao.kind === "cost"
            ? "preco"
            : "demografia";

  return {
    id: observacao.id,
    tipo,
    afirmacao: observacao.seriesLabel,
    confianca: local ? 0.8 : 0.5,
    valor:
      typeof observacao.value === "number"
        ? { numero: observacao.value, unidade: observacao.unit }
        : undefined,
    proveniencia: {
      origem: "observado",
      fonte: observacao.sourceId.toUpperCase(),
      url: observacao.license.url,
      periodo: observacao.referencePeriod.label ?? observacao.referencePeriod.end,
      observadoEm: observacao.retrievedAt,
      geografia: local ? observacao.geography.name : "Portugal (contexto nacional)",
      limitacao: observacao.reading,
    },
  };
}

export interface EntradaProcura {
  candidato: CandidatoBruto;
  /** O pack público, indexado por template curado. */
  evidencePorTemplate: ReadonlyMap<string, MarketPilotEvidence>;
  /** Contagem de operadores por divisão CAE. Ausente = sem oferta lida. */
  oferta?: PackOferta;
  /** O instante da análise. Entra na frescura e é fixo por corrida. */
  agora: string;
}

/**
 * Meia-vida da frescura, em dias, por tipo de sinal.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ A atualidade era binária: `observadas === 0 ? null : 100`. Uma      │
 * │ leitura de 2019 e uma de 2026 valiam exatamente o mesmo. Existia    │
 * │ — e existe — um módulo que sabe classificar frescura                │
 * │ (`market/freshness.ts`, 104 linhas) e o motor de descoberta         │
 * │ simplesmente nunca o chamava.                                       │
 * │                                                                    │
 * │ O decaimento é contínuo e a meia-vida depende do que a série mede,  │
 * │ porque envelhecer não é a mesma coisa em todas: uma ocupação        │
 * │ hoteleira envelhece em meses e um índice de envelhecimento          │
 * │ demográfico envelhece em anos. Dar-lhes o mesmo relógio seria       │
 * │ descartar demografia boa e aceitar conjuntura velha.                │
 * └────────────────────────────────────────────────────────────────────┘
 */
const MEIA_VIDA_DIAS: Readonly<Record<string, number>> = Object.freeze({
  demand: 365,
  transactional: 548,
  supply: 1095,
  competition: 1095,
  cost: 365,
  negative: 365,
  structural: 1460,
});

/** 0–100 pela idade efetiva desde o fim do período de referência. */
function frescuraDe(
  observacoes: readonly MarketObservationSummary[],
  agora: string,
): number | null {
  const valores: number[] = [];
  for (const observacao of observacoes) {
    const idade = effectiveReferenceAgeDays(observacao, agora);
    if (idade === null) continue;
    const meiaVida = MEIA_VIDA_DIAS[observacao.kind] ?? 730;
    valores.push(100 * Math.pow(0.5, idade / meiaVida));
  }
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((total, item) => total + item, 0) / valores.length);
}

/** Acima disto a densidade conta como fora do normal do país. */
const Z_DECISIVO = 0.75;

/**
 * Como se nomeia o universo de comparação, na escala em que ele está.
 *
 * A distinção não é estilo: «acima da mediana das nove regiões» e «acima
 * da mediana dos 308 concelhos» são afirmações com força muito
 * diferente, e quem lê tem direito a saber qual delas está a ler.
 */
function unidades(leitura: LeituraDeOferta): string {
  return leitura.escala === "regiao"
    ? `nas ${leitura.regioesComparadas} regiões`
    : `nos ${leitura.regioesComparadas} concelhos do país`;
}

/**
 * A oferta desta composição, se a ontologia souber classificá-la.
 *
 * A capacidade dominante é a que decide: é ela que descreve o que a
 * pessoa faria, e portanto em que atividade se inscreveria. Usar o
 * problema em vez da capacidade daria a mesma divisão a hipóteses
 * completamente diferentes que atacam o mesmo problema por vias opostas.
 */
/**
 * O denominador da normalização: o do INE quando existe, a soma dos
 * concelhos commitados quando não.
 *
 * Calculada uma vez por processo — a matriz não muda entre pedidos, e
 * refazer a soma dos 308 concelhos por cada candidato seria trabalho
 * repetido dentro do laço mais quente do motor.
 */
const POPULACAO_DA_MATRIZ: readonly ContagemRegional[] = MATRIZ_CONCELHOS
  ? populacaoRegionalDaMatriz(MATRIZ_CONCELHOS)
  : [];

function populacaoParaNormalizar(
  oferta: PackOferta | undefined,
): readonly ContagemRegional[] | undefined {
  if (oferta?.populacao && oferta.populacao.length > 0) return oferta.populacao;
  return POPULACAO_DA_MATRIZ.length > 0 ? POPULACAO_DA_MATRIZ : undefined;
}

/**
 * O quociente de localização, quando os dois termos existem.
 *
 * Exige três coisas ao mesmo tempo: concelho declarado, divisão do
 * operador conhecida, e uma base de clientes CONTÁVEL. Falta uma e
 * devolve `null` — porque um quociente com um denominador aproximado é
 * um número plausível e uma conclusão errada, e este é o sítio do motor
 * onde isso custa mais caro.
 */
function quocienteDoCandidato(
  candidato: CandidatoBruto,
  pack: PackOferta | undefined,
): QuocienteDeLocalizacao | null {
  if (!pack) return null;
  const conceito = CONCEITO_POR_CAPACIDADE.get(candidato.dominante.id);
  if (!conceito || conceito.cae.length === 0) return null;
  const base = candidato.problema.baseDeClientes;
  if (base.tipo === "nao-contavel") return null;

  // ── A ZONA É O TERRITÓRIO DECLARADO, NÃO O CONCELHO ────────────────
  //  Quem disse «a minha região» compete na região, e ler-lhe só o
  //  concelho descreveria um mercado que não é o dela. Quem desenhou um
  //  raio compete dentro do círculo. É esta linha que faz o alcance e o
  //  raio moverem um número — antes não moviam nenhum, e a interface
  //  dizia-o com todas as letras porque era verdade.
  const { territorio } = candidato;
  if (territorio.codigos.length === 0) return null;
  const alvo =
    territorio.codigos.length === 1
      ? territorio.codigos[0]!
      : { codigos: territorio.codigos, nome: territorio.nome };

  return lerLacuna(
    pack,
    conceito.cae,
    base.tipo === "residentes" ? { tipo: "residentes" } : { tipo: "empresas", cae: base.cae, ressalva: base.ressalva },
    alvo,
  );
}

function ofertaDoCandidato(
  candidato: CandidatoBruto,
  pack: PackOferta | undefined,
): { leitura: LeituraDeOferta; ressalva?: string } | null {
  if (!pack || pack.divisoes.length === 0) return null;
  const conceito = CONCEITO_POR_CAPACIDADE.get(candidato.dominante.id);
  if (!conceito || conceito.cae.length === 0) return null;
  // O concelho quando existe, a região quando não. A escala vai na
  // leitura e sai ao ecrã: uma densidade entre 308 concelhos e uma entre
  // nove regiões não são a mesma afirmação.
  const leitura = lerOferta(
    pack,
    conceito.cae,
    candidato.concelho
      ? { tipo: "concelho", codigo: candidato.concelho }
      : { tipo: "regiao", regiao: candidato.regiao },
  );
  if (!leitura) return null;
  return { leitura, ressalva: conceito.ressalva };
}

export function avaliarProcura({ candidato, evidencePorTemplate, oferta, agora }: EntradaProcura): AvaliacaoProcura {
  const lacunas: LacunaDeEvidencia[] = [];
  const evidencias: Evidencia[] = [];

  // ── DUAS PONTES PARA A MESMA EVIDÊNCIA ───────────────────────────
  //  A primeira sempre existiu: quando o candidato compõe um par
  //  (problema, modelo) que um dossier curado também ataca, herda o pack
  //  desse dossier. Cobria cinco dossiers — 16 % das hipóteses, medido.
  //
  //  A segunda estava declarada e nunca tinha sido ligada. Cada problema
  //  do grafo diz, no campo `sinais`, que séries o medem — dezanove dos
  //  vinte e oito declaram pelo menos uma. Esse campo só era lido pelo
  //  PLANEADOR, para marcar uma consulta como «já ligada»: o plano dizia
  //  que a fonte estava ligada e a evidência não aparecia em lado nenhum.
  //  Duas partes do mesmo motor a discordar uma da outra.
  //
  //  As duas somam-se, e a soma é deduplicada pelo id da observação: um
  //  dossier curado não perde as séries que o seu pack tem a mais (o
  //  registo de alojamento local, por exemplo, que nenhum problema
  //  declara), e uma composição sem dossier passa a receber as séries
  //  que o seu problema declara.
  const vistas = new Set<string>();
  const brutas: MarketObservationSummary[] = [];
  const brutasVistas = new Set<string>();
  const estadosDoGate: MarketOpportunityState[] = [];
  let bloqueadasPeloGate = 0;

  // ── O GATE PASSA A GOVERNAR ──────────────────────────────────────
  //  `market/evidence-gate.ts` é a peça mais rigorosa do repositório —
  //  oito estados, triangulação entre origens estatísticas independentes,
  //  bloqueio por saúde da fonte, exigência de um teste de falsificação —
  //  e este motor consumia `observations` cru e ignorava-o. O efeito
  //  prático: um piloto em `stale` ou `contradicted` contribuía para a
  //  procura exatamente como um `evidence_qualified`.
  //
  //  `usableObservationIds` já vinha no payload e nunca era lido. Passa a
  //  ser o filtro: uma observação que o gate não considera utilizável não
  //  entra no score nem na evidência. Não desaparece em silêncio — fica
  //  contada em `bloqueadasPeloGate` e dita na nota.
  const juntar = (pacote: MarketPilotEvidence, observacoes: readonly MarketObservationSummary[]) => {
    const utilizaveis = new Set(pacote.gate.usableObservationIds);
    const admitidas: MarketObservationSummary[] = [];
    for (const observacao of observacoes) {
      if (utilizaveis.has(observacao.id)) admitidas.push(observacao);
      else if (!brutasVistas.has(observacao.id) && !vistas.has(observacao.id)) bloqueadasPeloGate += 1;
    }
    if (admitidas.length === 0) return;
    estadosDoGate.push(pacote.gate.state);

    // A distribuição regional precisa de TODAS as regiões da série, não
    // só da nossa: é ela que dá o percentil. As outras regiões nunca
    // aparecem como evidência — servem de régua, não de afirmação.
    for (const observacao of admitidas) {
      if (brutasVistas.has(observacao.id)) continue;
      brutasVistas.add(observacao.id);
      brutas.push(observacao);
    }

    const { local, nacional } = splitObservationsByRegion(admitidas, candidato.regiao);
    for (const observacao of local) {
      if (vistas.has(observacao.id)) continue;
      vistas.add(observacao.id);
      evidencias.push(comoEvidencia(observacao, true));
    }
    for (const observacao of nacional) {
      if (vistas.has(observacao.id)) continue;
      vistas.add(observacao.id);
      evidencias.push(comoEvidencia(observacao, false));
    }
  };

  const pack = candidato.seedTemplateId ? evidencePorTemplate.get(candidato.seedTemplateId) : undefined;
  if (pack) juntar(pack, pack.observations);

  // ── O VETO DO PRÓPRIO PROBLEMA ───────────────────────────────────
  //  Três problemas declaram sinais E declaram-se NÃO observáveis, e não
  //  é um descuido: a ocupação hoteleira não mede se um produtor tem
  //  tempo para o lado comercial, e a contagem de sociedades nascidas não
  //  mede se uma equipa comercial anda sem lista. São contexto — servem
  //  ao planeador para saber que fonte consultar — e não medem a
  //  intensidade da necessidade.
  //
  //  Anexá-los como procura seria o motor a contradizer-se: a nota diz
  //  «nenhuma fonte pública mede isto» e o cartão ao lado mostrava um
  //  número a fingir que media. Quando o problema se declara não
  //  observável, os sinais ficam no plano de investigação e fora da
  //  evidência.
  if (candidato.problema.sinais.length > 0 && candidato.problema.procuraObservavel) {
    const pedidos = new Set(candidato.problema.sinais);
    for (const disponivel of evidencePorTemplate.values()) {
      juntar(disponivel, disponivel.observations.filter((observacao) => pedidos.has(observacao.seriesId)));
    }
  }

  // ── A oferta, quando a ontologia sabe classificar a hipótese ─────
  // ── O QUOCIENTE, QUANDO É CALCULÁVEL ─────────────────────────────
  //  Operadores por mil CLIENTES, e não por mil habitantes. A diferença
  //  não é cosmética: em Albufeira há 52,4 empresas de limpeza por dez
  //  mil habitantes contra 8,3 em Lisboa, o que a faz parecer seis vezes
  //  mais servida. Por alojamento — que é o cliente real desta hipótese
  //  — são 135 contra 89, e a diferença encolhe para 1,5×. Albufeira tem
  //  clientes a mais, não operadores a mais. São conclusões opostas a
  //  partir dos mesmos números, e a errada é a que usa o denominador
  //  errado.
  const quociente = quocienteDoCandidato(candidato, oferta);
  if (quociente) {
    evidencias.push({
      id: `ine:lq:${quociente.nomeDaZona}:${quociente.periodoEmpresas}`,
      tipo: "concorrencia",
      afirmacao: `Operadores por mil ${quociente.unidadeCliente === "empresas" ? "clientes possíveis" : "residentes"} em ${quociente.nomeDaZona}`,
      confianca: 0.85,
      valor: {
        numero: Math.round(quociente.porMilClientes * 10) / 10,
        unidade: `por mil ${quociente.unidadeCliente === "empresas" ? "clientes" : "residentes"}`,
      },
      proveniencia: {
        origem: "calculo",
        fonte: "INE — empresas por concelho e divisão da CAE (0014449), sobre a base de clientes declarada do problema",
        url: "https://www.ine.pt/xurl/indx/0014449/PT",
        periodo: quociente.periodoEmpresas,
        observadoEm: oferta!.geradoEm,
        geografia: quociente.nomeDaZona,
        limitacao: [
          `${quociente.operadores} operadores para ${quociente.clientes.toLocaleString("pt-PT")} ${quociente.unidadeCliente === "empresas" ? "clientes possíveis" : "residentes"} — percentil ${quociente.percentil} entre ${quociente.unidadesComparadas} concelhos, mediana ${quociente.medianaNacional.toFixed(1)}.`,
          // Um território é a SOMA dos seus concelhos, e o percentil
          // posiciona essa soma na distribuição dos concelhos
          // individuais. É uma comparação legítima e é outra coisa —
          // dizê-lo é o que impede «percentil 62» de se ler como se o
          // território fosse um concelho.
          quociente.escala === "territorio"
            ? `A leitura soma os ${quociente.concelhosNaZona} concelhos de ${quociente.nomeDaZona} e compara o resultado com um concelho típico do país.`
            : "",
          quociente.ressalva ?? "",
          "Conta inscrições na CAE, não operadores desta hipótese em concreto, e não pondera dimensão nem se cada empresa está ativa.",
        ]
          .filter(Boolean)
          .join(" "),
      },
    });
    lacunas.push({
      pergunta: "Quantos desses operadores servem mesmo este tipo de cliente?",
      tipo: "concorrencia",
      motivo:
        "O quociente compara duas inscrições na CAE — a do operador e a do cliente. É a base comparável que faltava, e continua a não distinguir quem serve este segmento de quem se limita a estar na mesma divisão.",
    });
  }

  const densidade = ofertaDoCandidato(candidato, oferta);
  if (densidade) {
    const { leitura: densa, ressalva } = densidade;
    evidencias.push({
      id: `ine:business.count:${densa.divisoes.join("+")}:${densa.aqui.codigo}:${densa.periodoOferta}`,
      tipo: "concorrencia",
      afirmacao: `Empresas registadas em ${densa.designacoes.join(" e ")}`,
      confianca: 0.8,
      valor: { numero: densa.aqui.operadores, unidade: "empresas" },
      proveniencia: {
        origem: "observado",
        fonte: "INE",
        url: "https://www.ine.pt/xurl/indx/0014449/PT",
        periodo: densa.periodoOferta,
        observadoEm: oferta!.geradoEm,
        geografia: densa.aqui.nome,
        limitacao: [
          `Conta empresas inscritas na divisão da CAE, não operadores desta hipótese em concreto${ressalva ? `: ${ressalva}` : "."}`,
          `São ${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes, contra ${densa.medianaNacional.toFixed(1)} de mediana ${unidades(densa)} — percentil ${densa.percentil}.`,
          "Não pondera dimensão, qualidade nem se cada empresa está ativa.",
        ].join(" "),
      },
    });
  }

  const temProcura = evidencias.some((item) => item.tipo === "procura" || item.tipo === "mercado");
  const temOferta = evidencias.some((item) => item.tipo === "concorrencia");

  // ── A INTENSIDADE, QUE É O QUE AS SÉRIES DIZEM ───────────────────
  //  Presença e intensidade são perguntas diferentes. `temProcura`
  //  responde «existe alguma série que meça isto?» e serve à leitura da
  //  lacuna. A intensidade responde «e o que é que ela diz aqui?», e é
  //  ela — não a contagem de linhas — que pontua.
  const intensidade = agregarIntensidade(
    lerIntensidade({
      observacoes: brutas.filter(
        (item) => item.kind === "demand" || item.kind === "transactional",
      ),
      regiao: candidato.regiao,
      // ── O denominador nunca depende da rede ────────────────────────
      //  `oferta.populacao` vem de um pedido ao INE feito na altura, e
      //  quando ele falha as CONTAGENS deixam de ser normalizáveis: o
      //  eixo da procura, dezassete pontos em cem, desaparece sem
      //  deixar rasto no ecrã. A matriz commitada traz a população dos
      //  308 concelhos e está no repositório — somada às NUTS II dá o
      //  mesmo denominador, sem rede.
      //
      //  A ordem é «o observado primeiro, o calculado a seguir»: a
      //  leitura regional do INE é melhor do que a nossa soma, e só
      //  entra a soma quando não há leitura nenhuma.
      populacao: populacaoParaNormalizar(oferta),
    }),
  );

  // O estado mais forte entre os packs que contribuíram. É o TETO da
  // confiança: um dossier em `template` nunca sustenta «confiança alta»,
  // por muitas linhas que traga.
  const ORDEM_ESTADO: readonly MarketOpportunityState[] = [
    "contradicted",
    "stale",
    "template",
    "signal_detected",
    "candidate",
    "evidence_qualified",
    "user_validated",
    "operating",
  ];
  const estadoGate =
    estadosDoGate.length === 0
      ? null
      : estadosDoGate.reduce((melhor, atual) =>
          ORDEM_ESTADO.indexOf(atual) > ORDEM_ESTADO.indexOf(melhor) ? atual : melhor,
        );

  // ── A leitura ────────────────────────────────────────────────────
  let leitura: LeituraDeLacuna = "desconhecida";
  let nota =
    "Não há sinal de oferta nem de concorrência para este problema. Sem os dois termos, a lacuna não é calculável — e ausência de concorrentes não é o mesmo que oportunidade.";

  // ── O QUOCIENTE MANDA, QUANDO EXISTE ─────────────────────────────
  //  É a única leitura deste motor que compara os dois termos na MESMA
  //  base — operadores e clientes, os dois contados em empresas (ou em
  //  pessoas). Por isso não precisa de um sinal de procura ao lado: a
  //  contagem de clientes JÁ É o indicador de procura que distingue
  //  «pouca oferta porque há espaço» de «pouca oferta porque não há
  //  mercado». É esse cruzamento que o método do quociente de
  //  localização faz, e é o que faltava para a lacuna ser calculável
  //  fora dos cinco dossiers com piloto.
  if (quociente) {
    const cliente = quociente.unidadeCliente === "empresas" ? "clientes possíveis" : "residentes";
    const comum = `${quociente.operadores} operadores para ${quociente.clientes.toLocaleString("pt-PT")} ${cliente} em ${quociente.nomeDaZona} — ${quociente.porMilClientes.toFixed(1)} por mil, contra ${quociente.medianaNacional.toFixed(1)} de mediana nos ${quociente.unidadesComparadas} concelhos (percentil ${quociente.percentil})`;

    if (quociente.percentil <= 25) {
      leitura = "procura-com-pouca-oferta";
      nota = `${comum}. É o sinal mais favorável que dados oficiais conseguem dar: há menos quem sirva por cada cliente possível do que na maior parte do país. Continua a não provar que alguém paga — isso prova-se com um cliente, não com uma estatística.`;
    } else if (quociente.percentil >= 75) {
      leitura = "procura-com-muita-oferta";
      nota = `${comum}. É um mercado servido: há mais quem sirva por cada cliente possível do que na maior parte do país. Não o impede, mas obriga a uma diferença que se explique numa frase.`;
    } else {
      leitura = "oferta-na-media";
      nota = `${comum}. Nem mercado por servir, nem mercado cheio: a diferença vai ter de vir da tua execução, não da geografia.`;
    }
    if (quociente.ressalva) {
      lacunas.push({
        pergunta: "A base de clientes é mesmo esta?",
        tipo: "concorrencia",
        motivo: quociente.ressalva,
      });
    }
  } else if (temProcura && densidade) {
    // ── Os dois termos, e agora numa base comparável ─────────────────
    //  O aviso antigo deste ramo continua a valer para as UNIDADES: uma
    //  taxa de ocupação e uma contagem de empresas não se subtraem. O
    //  que mudou é que a oferta passou a ter uma referência interna —
    //  a densidade desta zona contra a mediana das nove regiões, medida
    //  na mesma base em todas. Isso não dá a subtração do relatório; dá
    //  uma afirmação mais modesta e verificável, e é a procura ao lado
    //  que a torna legível: com procura publicada, muita oferta é
    //  mercado servido e pouca oferta é espaço por ocupar. Sem procura,
    //  as duas leituras seriam indistinguíveis — e é por isso que este
    //  ramo exige as duas.
    const { leitura: densa, ressalva } = densidade;
    const acima = densa.z >= Z_DECISIVO;
    const abaixo = densa.z <= -Z_DECISIVO;

    if (acima) {
      leitura = "procura-com-muita-oferta";
      nota = `Há procura publicada e a oferta instalada é densa: ${densa.aqui.operadores} empresas em ${densa.designacoes.join(" e ")} em ${densa.aqui.nome}, ${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes contra ${densa.medianaNacional.toFixed(1)} de mediana ${unidades(densa)} — percentil ${densa.percentil}. Entrar aqui é entrar num mercado servido — o que não o impede, mas obriga a uma diferença que se explique numa frase.`;
    } else if (abaixo) {
      leitura = "procura-com-pouca-oferta";
      nota = `Há procura publicada e a oferta instalada em ${densa.aqui.nome} é rala: ${densa.aqui.porDezMil.toFixed(1)} empresas por dez mil habitantes contra ${densa.medianaNacional.toFixed(1)} de mediana ${unidades(densa)} — percentil ${densa.percentil}. É o sinal mais favorável que este motor consegue produzir com dados oficiais — e continua a não provar que alguém paga. Prova-se com um cliente, não com uma estatística.`;
    } else {
      leitura = "desconhecida";
      nota = `Há procura publicada e a oferta de ${densa.aqui.nome} está dentro do normal do país (${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes, mediana ${densa.medianaNacional.toFixed(1)} ${unidades(densa)}). Nem mercado por servir, nem mercado cheio: a diferença vai ter de vir da tua execução, não da geografia.`;
    }
    if (ressalva) {
      lacunas.push({
        pergunta: `Quantas dessas empresas fazem mesmo isto, e não outra coisa da mesma divisão?`,
        tipo: "concorrencia",
        motivo: `A contagem vem de uma divisão larga da CAE. ${ressalva}`,
      });
    }
  } else if (densidade) {
    // ── Oferta sem procura: metade da conta, dita como metade ────────
    //  Este é o caso que o ficheiro sempre avisou ser perigoso. Sem
    //  procura, uma densidade baixa é indistinguível de um mercado que
    //  não existe — e ler ausência de concorrentes como oportunidade é
    //  precisamente o erro que este motor recusa cometer.
    const { leitura: densa, ressalva } = densidade;
    leitura = "desconhecida";
    nota = `Sabemos quantos já operam em ${densa.aqui.nome} — ${densa.aqui.operadores} empresas em ${densa.designacoes.join(" e ")}, ${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes contra ${densa.medianaNacional.toFixed(1)} de mediana ${unidades(densa)} — e não sabemos se há procura publicada para este problema. Sem os dois, densidade baixa tanto pode ser espaço por ocupar como mercado que não existe.`;
    lacunas.push({
      pergunta: "Há alguma leitura oficial que meça a procura deste problema na tua zona?",
      tipo: "procura",
      motivo:
        "A oferta já está contada. Falta o outro termo — e é ele que distingue pouca oferta com espaço de pouca oferta sem mercado.",
    });
    if (ressalva) {
      lacunas.push({
        pergunta: "Quantas dessas empresas fazem mesmo isto?",
        tipo: "concorrencia",
        motivo: `A contagem vem de uma divisão larga da CAE. ${ressalva}`,
      });
    }
  } else if (temProcura && temOferta) {

    // ── Ter os dois sinais NÃO é ter a lacuna ────────────────────────
    //  Este ramo dizia «procura com pouca oferta» assim que existisse um
    //  sinal de cada — e era inalcançável, por isso ninguém reparou. O
    //  dia em que uma série `supply` entrasse, qualquer hipótese com
    //  procura ganhava 90 em 100 na lacuna sem que nada tivesse sido
    //  comparado. Era um 90 de borla à espera de acontecer.
    //
    //  Para saber se a oferta é pouca ou muita é preciso compará-la com
    //  a procura na MESMA base: operadores por habitante, por cliente
    //  possível, por euro gasto. Duas séries com unidades diferentes —
    //  uma taxa de ocupação e uma contagem de empresas — não se subtraem.
    //  Enquanto essa base não estiver declarada, a resposta é a mesma que
    //  quando não havia sinal nenhum: não sabemos.
    leitura = "desconhecida";
    nota =
      "Há sinal de procura e sinal de oferta, mas medidos em unidades que não se comparam. Saber se a oferta é pouca ou muita exige pôr as duas na mesma base — e enquanto isso não estiver feito, dizer «há lacuna» seria uma conclusão sem conta nenhuma por trás.";
    lacunas.push({
      pergunta: "Quantos operadores existem por cada cliente possível nesta zona?",
      tipo: "concorrencia",
      motivo:
        "Os dois sinais existem mas não estão na mesma base. Falta a série que os torne comparáveis — por habitante, por alojamento ou por empresa da zona.",
    });
  } else if (temProcura) {
    leitura = "desconhecida";
    nota =
      "Há sinal de procura publicado, mas nenhum de oferta. Não sabemos quantos já servem este mercado — e isso é metade da decisão.";
    lacunas.push({
      pergunta: `Quantos operadores já servem este problema em ${candidato.regiao === "portugal" ? "Portugal" : "esta zona"}?`,
      tipo: "concorrencia",
      motivo:
        "O motor não tem hoje nenhuma série de oferta ligada. Registos administrativos por zona resolveriam isto sem recorrer a plataformas comerciais.",
    });
  } else if (!candidato.problema.procuraObservavel) {
    leitura = "desconhecida";
    nota =
      "Nenhuma fonte pública portuguesa mede a procura deste problema. A prova tem de vir de clientes — e é isso que o plano de validação faz.";
    lacunas.push({
      pergunta: "Quantas pessoas ou empresas têm mesmo este problema na tua zona?",
      tipo: "procura",
      motivo: "Não existe estatística oficial que o meça. Só entrevistas e orçamentos aceites respondem.",
    });
  } else {
    leitura = "desconhecida";
    nota =
      "Este problema tem fontes públicas que o poderiam medir, mas nenhuma está ligada a esta composição.";
    lacunas.push({
      pergunta: "Que leitura oficial mede a intensidade deste problema na tua zona?",
      tipo: "oficial",
      motivo: "As séries existentes estão ligadas a outras composições. Ver o plano de investigação.",
    });
  }

  if (!temOferta) {
    lacunas.push({
      pergunta: "A pouca oferta é falta de quem sirva, ou falta de quem compre?",
      tipo: "concorrencia",
      motivo:
        "Sem contagem de operadores, as duas hipóteses são indistinguíveis — e confundi-las é o erro mais caro de quem escolhe um negócio.",
    });
  }

  // ── O que a zona por fixar custa, dito onde se pode agir ─────────
  //  Sem zona escolhida não há leitura local, e sem leitura local uma
  //  série não tem contra o que ser normalizada. Isto não é uma falha do
  //  motor: é uma resposta em falta, e é acionável num clique.
  if (temProcura && intensidade.posicao === null) {
    lacunas.push({
      pergunta:
        candidato.regiao === "portugal"
          ? "Em que zona vais operar?"
          : "Que régua compara esta série entre regiões?",
      tipo: "procura",
      motivo:
        candidato.regiao === "portugal"
          ? "As séries existem e estão ligadas. Sem zona fixada não há valor local para comparar com o resto do país — e é a comparação que transforma um número numa leitura."
          : "As séries desta composição não trazem valor comparável para esta zona: ou são contagens sem população para as dividir, ou não têm leitura regional publicada.",
    });
  }

  if (bloqueadasPeloGate > 0) {
    lacunas.push({
      pergunta: "Porque é que algumas leituras não contam?",
      tipo: "oficial",
      motivo: `${bloqueadasPeloGate} ${bloqueadasPeloGate === 1 ? "observação foi excluída" : "observações foram excluídas"} pelo gate de evidência — fonte expirada, em quarentena ou com mapeamento semântico por aprovar. Aparecer sem contar seria pior do que não aparecer.`,
    });
  }

  return {
    leitura,
    evidencias,
    lacunas,
    nota,
    intensidade,
    estadoGate,
    bloqueadasPeloGate,
    frescura: frescuraDe(brutas, agora),
    // A distribuição que o quociente já calculou, ordenada em vez de
    // deitada fora. Não custa um pedido nem um dado novo — ver
    // `lacunaPorConcelho`, incluindo a razão por que vem sempre com os
    // dois extremos e nunca como um ranking de oportunidade.
    escalaDeLacuna: escalaDoCandidato(candidato, oferta),
    tendencias: tendenciasDoCandidato(candidato),
  };
}

/**
 * O que as séries desta hipótese fizeram no último período.
 *
 * Só as séries que o problema declara — as mesmas que alimentam a
 * intensidade. Uma tendência de uma série que não descreve este problema
 * seria contexto disfarçado de sinal.
 *
 * O limiar de 1 % separa «estável» de movimento: abaixo disso, a
 * variação está dentro do que uma revisão estatística costuma mexer, e
 * desenhar uma seta seria dar direção ao ruído.
 */
function tendenciasDoCandidato(candidato: CandidatoBruto): readonly TendenciaLida[] {
  const codigo = MARKET_REGIONS.find((item) => item.id === candidato.regiao)?.nutsCode ?? null;
  const lidas: TendenciaLida[] = [];
  for (const seriesId of candidato.problema.sinais) {
    const encontrada = tendenciaDe(seriesId, codigo);
    if (!encontrada) continue;
    const { tendencia, variacao, nacional } = encontrada;
    lidas.push({
      seriesId: tendencia.seriesId,
      seriesLabel: tendencia.seriesLabel,
      unidade: tendencia.unidade,
      periodoAnterior: tendencia.periodoAnterior,
      periodoAtual: tendencia.periodoAtual,
      anterior: variacao.anterior,
      atual: variacao.atual,
      variacaoPct: variacao.variacaoPct,
      nacional,
      direcao:
        Math.abs(variacao.variacaoPct) < 1
          ? "estavel"
          : variacao.variacaoPct > 0
            ? "subiu"
            : "desceu",
    });
  }
  return lidas;
}

/** A escala ao concelho, quando os dois termos do quociente existem. */
function escalaDoCandidato(
  candidato: CandidatoBruto,
  pack: PackOferta | undefined,
): EscalaDeLacuna | null {
  if (!pack) return null;
  const conceito = CONCEITO_POR_CAPACIDADE.get(candidato.dominante.id);
  if (!conceito || conceito.cae.length === 0) return null;
  const base = candidato.problema.baseDeClientes;
  if (base.tipo === "nao-contavel") return null;
  return lacunaPorConcelho(
    pack,
    conceito.cae,
    base.tipo === "residentes"
      ? { tipo: "residentes" }
      : { tipo: "empresas", cae: base.cae, ressalva: base.ressalva },
    { codigoDoConcelho: candidato.concelho, quantos: 5 },
  );
}

export const ROTULO_LACUNA: Readonly<Record<LeituraDeLacuna, string>> = Object.freeze({
  "procura-com-pouca-oferta": "Procura com pouca oferta",
  "procura-com-muita-oferta": "Procura com oferta instalada",
  "oferta-na-media": "Oferta dentro do normal",
  "pouca-procura": "Pouca procura observada",
  desconhecida: "Lacuna por apurar",
});
