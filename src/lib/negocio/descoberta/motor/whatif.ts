// ═══════════════════════════════════════════════════════════════════════
//  WHAT-IF — mudar uma variável e ver o efeito
//  ---------------------------------------------------------------------
//  Ponto 29. O que transforma isto de uma lista num sistema de decisão é
//  poder perguntar «e se eu puder investir mais 5 000 €?» e receber a
//  diferença — não uma lista nova sem explicação.
//
//  Cada cenário é uma transformação PURA do contexto. O pipeline volta a
//  correr sobre o contexto alterado e comparam-se os dois resultados: o
//  que entrou, o que saiu, e o que subiu.
// ═══════════════════════════════════════════════════════════════════════

import type { OpportunityContext } from "../contexto/tipos";
import type { ResultadoDescoberta } from "./pipeline";

export interface CenarioWhatIf {
  id: string;
  pergunta: string;
  /** Só faz sentido oferecer quando muda mesmo alguma coisa. */
  aplicavel: (contexto: OpportunityContext) => boolean;
  aplicar: (contexto: OpportunityContext) => OpportunityContext;
}

export const CENARIOS_WHATIF: readonly CenarioWhatIf[] = Object.freeze([
  {
    id: "mais-capital",
    pergunta: "E se puder investir mais 5 000 €?",
    aplicavel: (contexto) => contexto.capital.disponivelAgora !== undefined,
    aplicar: (contexto) => ({
      ...contexto,
      capital: {
        ...contexto.capital,
        disponivelAgora: (contexto.capital.disponivelAgora ?? 0) + 5000,
        maximo: contexto.capital.maximo === undefined ? undefined : contexto.capital.maximo + 5000,
        precisaComecarSemCapital: false,
      },
    }),
  },
  {
    id: "aceitar-b2b",
    pergunta: "E se aceitar trabalhar com empresas?",
    aplicavel: (contexto) => contexto.preferencias.mercado === "b2c",
    aplicar: (contexto) => ({
      ...contexto,
      preferencias: { ...contexto.preferencias, mercado: "indiferente" },
    }),
  },
  {
    id: "com-socio",
    pergunta: "E se tiver um sócio?",
    aplicavel: (contexto) => contexto.equipa.forma === "sozinho",
    aplicar: (contexto) => ({
      ...contexto,
      equipa: { forma: "socios", pessoas: 2, disponibilidadeContratar: contexto.equipa.disponibilidadeContratar },
    }),
  },
  {
    id: "mais-tempo",
    pergunta: "E se conseguir dedicar-me a tempo inteiro?",
    aplicavel: (contexto) => contexto.tempo.dedicacao !== "integral",
    aplicar: (contexto) => ({
      ...contexto,
      tempo: { ...contexto.tempo, dedicacao: "integral", horasSemana: undefined },
    }),
  },
  {
    id: "aceitar-digital",
    pergunta: "E se aceitar um negócio totalmente à distância?",
    aplicavel: (contexto) => contexto.preferencias.formato === "fisico",
    aplicar: (contexto) => ({
      ...contexto,
      preferencias: { ...contexto.preferencias, formato: "hibrido" },
    }),
  },
  {
    id: "alargar-zona",
    pergunta: "E se operar em todo o país?",
    aplicavel: (contexto) => contexto.localizacao.regiao !== "portugal",
    aplicar: (contexto) => ({
      ...contexto,
      localizacao: { ...contexto.localizacao, regiao: "portugal", alcance: "nacional" },
    }),
  },
  {
    id: "sem-restricoes",
    pergunta: "E se levantar as restrições que declarei?",
    aplicavel: (contexto) => contexto.restricoes.length > 0,
    aplicar: (contexto) => ({ ...contexto, restricoes: [] }),
  },
]);

export interface EfeitoWhatIf {
  cenario: CenarioWhatIf;
  /** Hipóteses que passam a aparecer e antes não apareciam. */
  novas: readonly { id: string; titulo: string }[];
  /** As que deixam de aparecer. */
  perdidas: readonly { id: string; titulo: string }[];
  /** As que sobem de pontuação, com a diferença. */
  subiram: readonly { id: string; titulo: string; delta: number }[];
  /** Quantas hipóteses deixam de ser descartadas. */
  desbloqueadas: number;
}

export function compararCenario(
  cenario: CenarioWhatIf,
  antes: ResultadoDescoberta,
  depois: ResultadoDescoberta,
): EfeitoWhatIf {
  const antesPorId = new Map(antes.candidatos.map((item) => [item.id, item]));
  const depoisPorId = new Map(depois.candidatos.map((item) => [item.id, item]));

  const novas = depois.candidatos
    .filter((item) => !antesPorId.has(item.id))
    .map((item) => ({ id: item.id, titulo: item.titulo }));

  const perdidas = antes.candidatos
    .filter((item) => !depoisPorId.has(item.id))
    .map((item) => ({ id: item.id, titulo: item.titulo }));

  const subiram = depois.candidatos
    .map((item) => {
      const anterior = antesPorId.get(item.id);
      if (!anterior) return null;
      const delta = item.pontuacaoGlobal - anterior.pontuacaoGlobal;
      return delta > 0 ? { id: item.id, titulo: item.titulo, delta } : null;
    })
    .filter((item): item is { id: string; titulo: string; delta: number } => item !== null)
    .sort((esquerda, direita) => direita.delta - esquerda.delta);

  return {
    cenario,
    novas,
    perdidas,
    subiram,
    desbloqueadas: Math.max(0, recusadas(antes) - recusadas(depois)),
  };
}

/**
 * Descartes que são RECUSAS, e não variantes deduplicadas.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ `descartados` mistura duas coisas diferentes: hipóteses recusadas   │
 * │ por uma restrição, e variantes da mesma hipótese removidas por      │
 * │ deduplicação (o mesmo par problema × modelo em duas formas de       │
 * │ entrega). Contar a diferença bruta fazia um cenário que apenas      │
 * │ reduzisse variantes duplicadas ser anunciado à pessoa como tendo    │
 * │ «desbloqueado hipóteses». Não desbloqueou nada — só deixou de       │
 * │ haver duas maneiras de escrever a mesma.                            │
 * └────────────────────────────────────────────────────────────────────┘
 */
function recusadas(resultado: ResultadoDescoberta): number {
  return resultado.descartados.filter((item) => item.motivo !== "duplicado").length;
}
