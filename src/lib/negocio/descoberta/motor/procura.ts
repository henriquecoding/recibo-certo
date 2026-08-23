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

import { marketRegionLabel, splitObservationsByRegion } from "@/lib/negocio/market/geografia";
import { lerOferta, type LeituraDeOferta, type PackOferta } from "@/lib/negocio/market/oferta";
import { CONCEITO_POR_CAPACIDADE } from "../conhecimento/dados/ontologia";
import type { MarketObservationSummary, MarketPilotEvidence } from "@/lib/negocio/market/opportunities";
import type { Evidencia, LacunaDeEvidencia } from "../proveniencia";
import type { CandidatoBruto } from "./gerador";
import type { AvaliacaoProcura, LeituraDeLacuna } from "./tipos";

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
}

/** Acima disto a densidade conta como fora do normal do país. */
const Z_DECISIVO = 0.75;

/**
 * A oferta desta composição, se a ontologia souber classificá-la.
 *
 * A capacidade dominante é a que decide: é ela que descreve o que a
 * pessoa faria, e portanto em que atividade se inscreveria. Usar o
 * problema em vez da capacidade daria a mesma divisão a hipóteses
 * completamente diferentes que atacam o mesmo problema por vias opostas.
 */
function ofertaDoCandidato(
  candidato: CandidatoBruto,
  pack: PackOferta | undefined,
): { leitura: LeituraDeOferta; ressalva?: string } | null {
  if (!pack || pack.divisoes.length === 0) return null;
  const conceito = CONCEITO_POR_CAPACIDADE.get(candidato.dominante.id);
  if (!conceito || conceito.cae.length === 0) return null;
  const leitura = lerOferta(pack, conceito.cae, candidato.regiao);
  if (!leitura) return null;
  return { leitura, ressalva: conceito.ressalva };
}

export function avaliarProcura({ candidato, evidencePorTemplate, oferta }: EntradaProcura): AvaliacaoProcura {
  const lacunas: LacunaDeEvidencia[] = [];
  const evidencias: Evidencia[] = [];

  // A ponte para a evidência real passa pelos seeds: um candidato só
  // chega às séries do INE quando compõe um par (problema, modelo) que
  // um dossier curado também ataca. Para os outros — a maioria — não há
  // observação, e o motor diz isso.
  const pack = candidato.seedTemplateId ? evidencePorTemplate.get(candidato.seedTemplateId) : undefined;

  if (pack) {
    const { local, nacional } = splitObservationsByRegion(pack.observations, candidato.regiao);
    for (const observacao of local) evidencias.push(comoEvidencia(observacao, true));
    for (const observacao of nacional) evidencias.push(comoEvidencia(observacao, false));
  }

  // ── A oferta, quando a ontologia sabe classificar a hipótese ─────
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
        geografia: marketRegionLabel(candidato.regiao),
        limitacao: [
          `Conta empresas inscritas na divisão da CAE, não operadores desta hipótese em concreto${ressalva ? `: ${ressalva}` : "."}`,
          `São ${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes, contra ${densa.medianaNacional.toFixed(1)} de mediana nas ${densa.regioesComparadas} regiões.`,
          "Não pondera dimensão, qualidade nem se cada empresa está ativa.",
        ].join(" "),
      },
    });
  }

  const temProcura = evidencias.some((item) => item.tipo === "procura" || item.tipo === "mercado");
  const temOferta = evidencias.some((item) => item.tipo === "concorrencia");

  // ── A leitura ────────────────────────────────────────────────────
  let leitura: LeituraDeLacuna = "desconhecida";
  let nota =
    "Não há sinal de oferta nem de concorrência para este problema. Sem os dois termos, a lacuna não é calculável — e ausência de concorrentes não é o mesmo que oportunidade.";

  if (temProcura && densidade) {
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
      nota = `Há procura publicada e a oferta instalada é densa: ${densa.aqui.operadores} empresas em ${densa.designacoes.join(" e ")} nesta zona, ${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes contra ${densa.medianaNacional.toFixed(1)} de mediana nacional. Entrar aqui é entrar num mercado servido — o que não o impede, mas obriga a uma diferença que se explique numa frase.`;
    } else if (abaixo) {
      leitura = "procura-com-pouca-oferta";
      nota = `Há procura publicada e a oferta instalada é rala: ${densa.aqui.porDezMil.toFixed(1)} empresas por dez mil habitantes contra ${densa.medianaNacional.toFixed(1)} de mediana nacional. É o sinal mais favorável que este motor consegue produzir com dados oficiais — e continua a não provar que alguém paga. Prova-se com um cliente, não com uma estatística.`;
    } else {
      leitura = "desconhecida";
      nota = `Há procura publicada e a oferta desta zona está dentro do normal do país (${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes, mediana ${densa.medianaNacional.toFixed(1)}). Nem mercado por servir, nem mercado cheio: a diferença vai ter de vir da tua execução, não da geografia.`;
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
    nota = `Sabemos quantos já operam aqui — ${densa.aqui.operadores} empresas em ${densa.designacoes.join(" e ")}, ${densa.aqui.porDezMil.toFixed(1)} por dez mil habitantes contra ${densa.medianaNacional.toFixed(1)} de mediana nacional — e não sabemos se há procura publicada para este problema. Sem os dois, densidade baixa tanto pode ser espaço por ocupar como mercado que não existe.`;
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

  return { leitura, evidencias, lacunas, nota };
}

export const ROTULO_LACUNA: Readonly<Record<LeituraDeLacuna, string>> = Object.freeze({
  "procura-com-pouca-oferta": "Procura com pouca oferta",
  "procura-com-muita-oferta": "Procura com oferta instalada",
  "pouca-procura": "Pouca procura observada",
  desconhecida: "Lacuna por apurar",
});
