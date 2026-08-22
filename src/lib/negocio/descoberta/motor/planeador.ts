// ═══════════════════════════════════════════════════════════════════════
//  QUERY PLANNER — o que seria preciso investigar, dito com precisão
//  ---------------------------------------------------------------------
//  Pontos 34 e 35 do pedido. O plano é um artefacto de primeira classe:
//  duas hipóteses diferentes geram investigações diferentes, e o plano
//  diz QUAIS — com a fonte, a métrica, o âmbito geográfico e a frescura
//  exigida.
//
//  ── O QUE ESTE FICHEIRO NÃO FAZ, E PORQUÊ ──────────────────────────
//  Não executa as consultas. Executá-las exigiria uma integração de
//  pesquisa que este repositório não tem, e improvisá-la com um modelo de
//  linguagem produziria números sem proveniência — exatamente o que o
//  ponto 32 proíbe e o que a fronteira 12 do produto impede.
//
//  Publicar o plano por executar é a alternativa honesta: a pessoa vê o
//  que falta saber, com o nome da fonte que responderia, e o motor não
//  finge ter investigado. É também o mapa para quem ligar a próxima
//  fonte — o RNAL do Turismo de Portugal é o candidato registado.
//
//  ── SOBRE AS CONSULTAS ─────────────────────────────────────────────
//  Nunca «melhores negócios Portugal 2026». Isso recicla listas. As
//  consultas são de SINAL: contagens, preços praticados, prazos de
//  espera, ofertas de emprego por preencher, contratos celebrados.
// ═══════════════════════════════════════════════════════════════════════

import { marketRegionLabel } from "@/lib/negocio/market/geografia";
import type { TipoEvidencia } from "../proveniencia";
import type { CandidatoBruto } from "./gerador";

export type FonteCandidata =
  | "ine"
  | "eurostat"
  | "base-gov"
  | "iefp"
  | "turismo-portugal"
  | "bpstat"
  | "municipio"
  | "regulador"
  | "associacao-setorial";

export const ROTULO_FONTE: Readonly<Record<FonteCandidata, string>> = Object.freeze({
  ine: "INE",
  eurostat: "Eurostat",
  "base-gov": "Portal BASE (IMPIC)",
  iefp: "IEFP",
  "turismo-portugal": "Turismo de Portugal",
  bpstat: "BPstat — Banco de Portugal",
  municipio: "Dados municipais",
  regulador: "Entidade reguladora do setor",
  "associacao-setorial": "Associação setorial",
});

export interface ConsultaPlaneada {
  /** O que se quer saber, em pt-PT. Nunca uma query de motor de busca. */
  pergunta: string;
  tipo: TipoEvidencia;
  fontes: readonly FonteCandidata[];
  /** A métrica concreta que responderia. */
  metrica: string;
  /** Ao nível a que a resposta faz sentido. */
  ambito: string;
  /** Quanto tempo uma resposta continua a valer. */
  frescuraMaximaDias: number;
  /** Já está ligada ao motor de evidência? */
  ligada: boolean;
}

export interface PlanoDeInvestigacao {
  candidatoId: string;
  consultas: readonly ConsultaPlaneada[];
  /** Quantas das consultas já têm fonte ligada e a responder. */
  ligadas: number;
}

/**
 * TTL por tipo de sinal. Dados diferentes envelhecem a velocidades
 * diferentes: uma lei não muda como um preço muda, e tratar as duas com
 * a mesma validade é enganar-se numa das direções.
 */
export const FRESCURA_POR_TIPO: Readonly<Record<TipoEvidencia, number>> = Object.freeze({
  regulatoria: 730,
  demografia: 730,
  oficial: 548,
  mercado: 548,
  concorrencia: 180,
  procura: 365,
  preco: 90,
  tendencia: 90,
});

export function buildResearchPlan(candidato: CandidatoBruto): PlanoDeInvestigacao {
  const zona = candidato.regiao === "portugal" ? "Portugal" : marketRegionLabel(candidato.regiao);
  const consultas: ConsultaPlaneada[] = [];

  const juntar = (consulta: ConsultaPlaneada) => consultas.push(consulta);

  // ── 1. Quantos clientes possíveis existem na zona ─────────────────
  juntar({
    pergunta: `Quantos ${candidato.problema.clientes[0]?.toLocaleLowerCase("pt-PT") ?? "clientes possíveis"} existem em ${zona}?`,
    tipo: "oficial",
    fontes: candidato.problema.mercado === "b2c" ? ["ine", "municipio"] : ["ine", "associacao-setorial"],
    metrica:
      candidato.problema.mercado === "b2c"
        ? "População residente por escalão etário e concelho"
        : "Empresas por localização geográfica e atividade económica (CAE)",
    ambito: `NUTS II ou concelho — ${zona}`,
    frescuraMaximaDias: FRESCURA_POR_TIPO.demografia,
    ligada: candidato.problema.sinais.length > 0,
  });

  // ── 2. O sinal de OFERTA, que hoje falta sempre ───────────────────
  juntar({
    pergunta: `Quantos operadores já servem este problema em ${zona}?`,
    tipo: "concorrencia",
    fontes:
      candidato.problema.setor === "turismo"
        ? ["turismo-portugal", "regulador"]
        : ["regulador", "associacao-setorial", "ine"],
    metrica: "Contagem de operadores registados por zona, a partir de registo administrativo",
    ambito: `NUTS II — ${zona}`,
    frescuraMaximaDias: FRESCURA_POR_TIPO.concorrencia,
    ligada: false,
  });

  // ── 3. Preço praticado ────────────────────────────────────────────
  juntar({
    pergunta: "Que preço é praticado hoje por este trabalho?",
    tipo: "preco",
    fontes: ["bpstat", "associacao-setorial"],
    metrica: "Margem e estrutura de custos medianas por CAE e escalão de dimensão",
    ambito: "Nacional por CAE — contexto setorial, nunca sinal local",
    frescuraMaximaDias: FRESCURA_POR_TIPO.preco,
    ligada: false,
  });

  // ── 4. Regulação ──────────────────────────────────────────────────
  if (candidato.problema.regulacoes.length > 0) {
    juntar({
      pergunta: "Que requisitos são mesmo obrigatórios para esta atividade concreta?",
      tipo: "regulatoria",
      fontes: ["regulador"],
      metrica: "Regime aplicável, confirmado junto da entidade competente",
      ambito: "Nacional, com variações municipais",
      frescuraMaximaDias: FRESCURA_POR_TIPO.regulatoria,
      ligada: false,
    });
  }

  // ── 5. Sinais específicos por gatilho ─────────────────────────────
  for (const gatilho of candidato.problema.gatilhos) {
    switch (gatilho) {
      case "compra-publica":
        juntar({
          pergunta: `Quantos procedimentos abertos à concorrência houve em ${zona} no último ano?`,
          tipo: "mercado",
          fontes: ["base-gov"],
          metrica: "Contratos celebrados e procedimentos abertos, por NUTS II e ano",
          ambito: `NUTS II — ${zona}`,
          frescuraMaximaDias: FRESCURA_POR_TIPO.mercado,
          ligada: true,
        });
        break;
      case "escassez-de-pessoas":
        juntar({
          pergunta: "Há ofertas de emprego por preencher neste setor e nesta zona?",
          tipo: "mercado",
          fontes: ["iefp"],
          metrica: "Ofertas de emprego por região e atividade",
          ambito: `Região — ${zona}`,
          frescuraMaximaDias: FRESCURA_POR_TIPO.mercado,
          ligada: false,
        });
        break;
      case "turismo":
        juntar({
          pergunta: `Qual é a intensidade da atividade turística em ${zona}?`,
          tipo: "procura",
          fontes: ["ine", "turismo-portugal"],
          metrica: "Taxa de ocupação-quarto e estabelecimentos registados",
          ambito: `NUTS II — ${zona}`,
          frescuraMaximaDias: FRESCURA_POR_TIPO.procura,
          ligada: candidato.problema.sinais.includes("tourism-occupancy"),
        });
        break;
      case "envelhecimento":
        juntar({
          pergunta: `Qual é o índice de envelhecimento de ${zona}?`,
          tipo: "demografia",
          fontes: ["ine"],
          metrica: "Índice de envelhecimento por NUTS II",
          ambito: `NUTS II — ${zona}`,
          frescuraMaximaDias: FRESCURA_POR_TIPO.demografia,
          ligada: candidato.problema.sinais.includes("senior-ageing-index") || candidato.problema.sinais.includes("home-ageing-index"),
        });
        break;
      case "digitalizacao":
        juntar({
          pergunta: "Que défice digital existe na classe de empresas que este problema serve?",
          tipo: "oficial",
          fontes: ["eurostat", "ine"],
          metrica: "Índice de intensidade digital por classe de dimensão",
          ambito: "Nacional — contexto, não sinal local",
          frescuraMaximaDias: FRESCURA_POR_TIPO.oficial,
          ligada: candidato.problema.sinais.includes("digital-intensity-micro"),
        });
        break;
      case "evento-de-vida":
        juntar({
          pergunta: `Quantos eventos que criam este problema aconteceram em ${zona} no último ano?`,
          tipo: "mercado",
          fontes: ["ine"],
          metrica: "Transações de alojamentos familiares por NUTS II e ano",
          ambito: `NUTS II — ${zona}`,
          frescuraMaximaDias: FRESCURA_POR_TIPO.mercado,
          ligada: candidato.problema.sinais.includes("home-transactions"),
        });
        break;
      default:
        break;
    }
  }

  // Deduplicar por pergunta: dois gatilhos podem pedir a mesma coisa.
  const vistas = new Set<string>();
  const unicas = consultas.filter((consulta) => {
    if (vistas.has(consulta.pergunta)) return false;
    vistas.add(consulta.pergunta);
    return true;
  });

  return {
    candidatoId: candidato.id,
    consultas: unicas,
    ligadas: unicas.filter((consulta) => consulta.ligada).length,
  };
}
