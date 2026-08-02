// ─────────────────────────────────────────────────────────────────────
//  Dinheiro — arredondamento e formatação, uma vez só
//  ---------------------------------------------------------------------
//  Sete sítios do projeto escreviam a sua própria formatação de euros, e o
//  resultado era visível: `2051,58 €` numa linha e `24 748,00 €` na seguinte,
//  no MESMO documento. Isto é a fonte única.
//
//  Duas correções medidas, ambas silenciosas até se reparar nelas:
//
//   · `toFixed(2)` não é um arredondador de dinheiro. Arredonda o número que
//     EXISTE em binário, não o que se escreveu: 1867,665 está guardado como
//     1867,66499999999996… e sai 1867,66 quando a resposta é 1867,67. Num
//     produto que vende exatidão, um cêntimo de diferença entre o PDF e o CSV
//     do mesmo documento é o pior defeito possível.
//
//   · O CLDR do pt-PT tem `minimumGroupingDigits: 2` — o separador de milhares
//     só entra a partir de cinco algarismos. `useGrouping: "always"` repõe o
//     agrupamento a partir do milhar, que é o que um documento financeiro
//     precisa para as colunas lerem todas da mesma maneira.
// ─────────────────────────────────────────────────────────────────────

/** Casas decimais do cêntimo. */
export const CASAS_CENTIMO = 2;

/**
 * Arredondamento meio-para-cima com correção do erro de representação
 * binária. É o arredondamento que as pessoas esperam de dinheiro (e o que a
 * AT usa nas tabelas): 0,005 sobe.
 *
 * A correção de epsilon reescala o valor e volta a arredondar sobre a
 * representação decimal do número, o que resolve os casos em que o valor
 * guardado está uns bilionésimos abaixo do meio.
 */
export function arredondar(valor: number, casas: number = CASAS_CENTIMO): number {
  if (!Number.isFinite(valor)) return 0;
  const fator = 10 ** casas;
  // `toPrecision(15)` descarta o ruído da representação binária sem tocar em
  // nenhum algarismo significativo de um valor monetário plausível.
  const escalado = Number((valor * fator).toPrecision(15));
  const arredondado = Math.round(Math.abs(escalado) + Number.EPSILON) * Math.sign(escalado);
  return arredondado / fator;
}

/** `arredondar` ao cêntimo — o caso esmagadoramente mais comum. */
export const cent = (valor: number): number => arredondar(valor, CASAS_CENTIMO);

/** Valor finito e não negativo (entradas do utilizador, campos opcionais). */
export const positivo = (valor: number | undefined | null): number =>
  Math.max(0, Number.isFinite(valor as number) ? (valor as number) : 0);

const formatador = (opcoes: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("pt-PT", { useGrouping: "always", ...opcoes });

const EUR = formatador({
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Euros para leitura humana: `1 850,00 €`, `24 748,00 €`. Sempre agrupado,
 * sempre com duas casas, sempre arredondado antes de formatar — para que o
 * número impresso seja exatamente o número que as outras vias do documento
 * somaram.
 */
export const eur = (valor: number): string => EUR.format(cent(valor));

/**
 * Euros sem símbolo nem agrupamento, com ponto decimal. É o que vai para uma
 * célula numérica de CSV/XLSX: o símbolo, o separador de milhares e a vírgula
 * são as três coisas que fazem o Excel importar o valor como TEXTO — e uma
 * coluna de texto não soma.
 */
export const eurMaquina = (valor: number): string => cent(valor).toFixed(CASAS_CENTIMO);

/**
 * Euros para a folha de cálculo em português: vírgula decimal, sem símbolo e
 * sem separador de milhares. O símbolo vive no formato da célula, não no
 * conteúdo.
 */
export const eurFolhaPT = (valor: number): string => eurMaquina(valor).replace(".", ",");

const PCT1 = formatador({ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Percentagem com uma casa: `23,6%`. */
export const pctDoc = (fracao: number): string =>
  PCT1.format(Number.isFinite(fracao) ? fracao : 0);

/**
 * Percentagem com as casas que a fonte publicou, sem zeros supérfluos —
 * para taxas em que a precisão É a informação (10,15% não é 10,2%).
 */
export function pctExatoDoc(fracao: number, maxCasas = 2): string {
  const n = Number.isFinite(fracao) ? fracao * 100 : 0;
  return `${n.toFixed(maxCasas).replace(/\.?0+$/, "").replace(".", ",")}%`;
}

/**
 * Número simples (horas, dias, unidades) com no máximo `maxCasas` decimais e
 * sem zeros à direita: `1,25`, `22`, `40`.
 */
export function numeroDoc(valor: number, maxCasas = 2): string {
  return formatador({ maximumFractionDigits: maxCasas }).format(
    arredondar(Number.isFinite(valor) ? valor : 0, maxCasas),
  );
}

/** Data ISO 8601 (`2026-07-31`) — o dialeto de máquina. */
export function dataISO(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Data portuguesa (`31/07/2026`) — o dialeto humano. */
export function dataPT(valor: Date | string): string {
  const iso = dataISO(valor);
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Data por extenso (`31 de julho de 2026`) — cabeçalhos e rodapés. */
export function dataExtenso(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
}
