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
//  O motor de mercado deste repositório continua sem sinais de oferta.
//  Não por falta de fontes que contem operadores — o RNAL conta 111 mil
//  alojamentos locais por região — mas porque nenhuma delas conta os
//  operadores DESTAS hipóteses. Todas as hipóteses do produto são
//  serviços prestados a alguém; o RNAL conta esse alguém. Lê-lo como
//  oferta seria contar os clientes como rivais.
//
//  Sem um termo da subtração, a lacuna não é calculável — e a resposta
//  correta é `desconhecida`, com a pergunta em falta escrita. Fabricar
//  uma contagem de concorrentes seria exatamente a alucinação que o
//  ponto 32 proíbe; reetiquetar uma contagem de clientes seria a mesma
//  alucinação com melhor disfarce.
// ═══════════════════════════════════════════════════════════════════════

import { splitObservationsByRegion } from "@/lib/negocio/market/geografia";
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
}

export function avaliarProcura({ candidato, evidencePorTemplate }: EntradaProcura): AvaliacaoProcura {
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

  const temProcura = evidencias.some((item) => item.tipo === "procura" || item.tipo === "mercado");
  const temOferta = evidencias.some((item) => item.tipo === "concorrencia");

  // ── A leitura ────────────────────────────────────────────────────
  let leitura: LeituraDeLacuna = "desconhecida";
  let nota =
    "Não há sinal de oferta nem de concorrência para este problema. Sem os dois termos, a lacuna não é calculável — e ausência de concorrentes não é o mesmo que oportunidade.";

  if (temProcura && temOferta) {
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
