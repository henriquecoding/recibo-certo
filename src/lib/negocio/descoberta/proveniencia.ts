// ═══════════════════════════════════════════════════════════════════════
//  PROVENIÊNCIA — de onde veio este número, e o que ele é
//  ---------------------------------------------------------------------
//  A regra absoluta do motor: nenhum número importante chega ao ecrã sem
//  saber responder a quatro perguntas — de onde veio, quando foi
//  observado, a que geografia corresponde, e se é dado real ou estimativa.
//
//  Estes tipos existem para tornar isso IMPOSSÍVEL de esquecer. Um
//  intervalo de investimento é um `Intervalo`, e um `Intervalo` sem
//  `origem` não compila. Não há caminho para pôr um número no resultado
//  sem dizer o que ele é.
//
//  As quatro origens são deliberadamente poucas, e a fronteira entre elas
//  é a que interessa a quem decide:
//
//   · observado  — uma fonte publicou isto, com período e geografia;
//   · estimativa — nós propomos um intervalo, com o método declarado;
//   · calculo    — deriva de observações ou estimativas já declaradas;
//   · hipotese   — a própria pessoa escreveu, ou o motor assumiu.
//
//  Uma estimativa nunca se disfarça de observação. É a diferença entre
//  «o INE contou 44 468 sociedades» e «achamos que isto custa 3 000 €».
// ═══════════════════════════════════════════════════════════════════════

export type OrigemDoNumero = "observado" | "estimativa" | "calculo" | "hipotese";

export const ROTULO_ORIGEM: Readonly<Record<OrigemDoNumero, string>> = Object.freeze({
  observado: "Dado observado",
  estimativa: "Estimativa",
  calculo: "Cálculo",
  hipotese: "Hipótese",
});

export interface Proveniencia {
  origem: OrigemDoNumero;
  /** Quem publicou, ou o método que produziu a estimativa. */
  fonte: string;
  /** URL, quando existe. Uma estimativa nossa não tem, e não finge ter. */
  url?: string;
  /** Data civil ou período a que o valor se refere. */
  periodo?: string;
  /** Quando foi recolhido ou calculado. */
  observadoEm?: string;
  /** A geografia a que o valor corresponde — nunca «Portugal» por defeito. */
  geografia?: string;
  /** O que o número NÃO diz. Obrigatório em estimativas. */
  limitacao?: string;
}

/**
 * Um intervalo com proveniência. Nunca um número exato sem fundamento.
 *
 * «Investimento inicial: 4 500 € – 8 000 €» é honesto; «6 247,34 €» é uma
 * precisão que nenhum dos nossos dados sustenta, e que se lê como se
 * sustentasse.
 */
export interface Intervalo {
  min: number;
  max: number;
  unidade: string;
  proveniencia: Proveniencia;
}

export function intervalo(
  min: number,
  max: number,
  unidade: string,
  proveniencia: Proveniencia,
): Intervalo {
  // Um intervalo invertido é um erro de dados, e passar despercebido faria
  // o ecrã mostrar «de 8 000 € a 4 500 €». Ordena-se, em vez de rebentar.
  return { min: Math.min(min, max), max: Math.max(min, max), unidade, proveniencia };
}

/** Soma intervalos conservando a PIOR proveniência dos dois. */
export function somarIntervalos(itens: readonly Intervalo[], fonte: string): Intervalo | null {
  if (itens.length === 0) return null;
  const unidades = new Set(itens.map((item) => item.unidade));
  // Somar euros com horas é um erro de programação, não um caso a tratar.
  if (unidades.size > 1) return null;

  // A regra de ouro do derivado: um valor calculado a partir de dois
  // herda a PIOR das duas origens. Uma soma de estimativas é uma
  // estimativa, nunca um cálculo com ar de observação.
  const pior: OrigemDoNumero = itens.some((item) => item.proveniencia.origem === "hipotese")
    ? "hipotese"
    : itens.some((item) => item.proveniencia.origem === "estimativa")
      ? "estimativa"
      : "calculo";

  return {
    min: itens.reduce((total, item) => total + item.min, 0),
    max: itens.reduce((total, item) => total + item.max, 0),
    unidade: itens[0]!.unidade,
    proveniencia: {
      origem: pior,
      fonte,
      limitacao: `Soma de ${itens.length} ${itens.length === 1 ? "parcela" : "parcelas"}; herda a origem menos firme das que a compõem.`,
    },
  };
}

/** Formata um intervalo em pt-PT, sem casas decimais falsas. */
export function formatarIntervalo(valor: Intervalo): string {
  // `useGrouping` explícito: em pt-PT, `(1900).toLocaleString()` devolve
  // «1900» sem separador e «12000» devolve «12 000». Deixar ao critério do
  // Intl fazia o mesmo intervalo aparecer com dois estilos de milhar.
  const fmt = (numero: number) =>
    numero.toLocaleString("pt-PT", {
      maximumFractionDigits: numero < 10 ? 1 : 0,
      useGrouping: true,
    });
  if (valor.min === valor.max) return `${fmt(valor.min)} ${valor.unidade}`;
  return `${fmt(valor.min)} – ${fmt(valor.max)} ${valor.unidade}`;
}

// ── EVIDÊNCIA ────────────────────────────────────────────────────────

export type TipoEvidencia =
  | "oficial"
  | "mercado"
  | "concorrencia"
  | "preco"
  | "procura"
  | "demografia"
  | "regulatoria"
  | "tendencia";

export const ROTULO_EVIDENCIA: Readonly<Record<TipoEvidencia, string>> = Object.freeze({
  oficial: "Fonte oficial",
  mercado: "Sinal de mercado",
  concorrencia: "Concorrência",
  preco: "Preço",
  procura: "Procura",
  demografia: "Demografia",
  regulatoria: "Regulação",
  tendencia: "Tendência",
});

/**
 * Uma afirmação sustentada. `confianca` é a força DESTA evidência, não a
 * do negócio — separar as duas é o ponto 21 do pedido.
 */
export interface Evidencia {
  id: string;
  tipo: TipoEvidencia;
  /** A afirmação, em pt-PT, sem número que a proveniência não cubra. */
  afirmacao: string;
  proveniencia: Proveniencia;
  /** Intervalo fechado [0, 1]. */
  confianca: number;
  /** O valor observado, quando existe. */
  valor?: { numero: number; unidade: string };
}

/**
 * O que falta saber. É tão informativo como o que se sabe — e é a peça
 * que impede o motor de preencher o silêncio com plausibilidade.
 */
export interface LacunaDeEvidencia {
  /** A pergunta por responder, em pt-PT. */
  pergunta: string;
  /** Que tipo de sinal a responderia. */
  tipo: TipoEvidencia;
  /** Porque não a temos hoje. */
  motivo: string;
}
