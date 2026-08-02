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

/**
 * Reparte um total pelas suas parcelas de forma que a soma das parcelas
 * arredondadas seja EXATAMENTE o total arredondado.
 *
 * Arredondar cada parcela ao cêntimo e somá-las não dá, em geral, o mesmo que
 * arredondar a soma: os erros de arredondamento acumulam-se. Numa tabela de
 * escalões de IRS isso significa uma coluna cujo total não bate certo com a
 * linha da coleta um centímetro mais abaixo, no mesmo documento — que é
 * exatamente o defeito que faz um leitor deixar de confiar em tudo o resto.
 *
 * O método é o do maior resto: trunca-se cada parcela ao cêntimo e distribui-se
 * o que faltar, um cêntimo de cada vez, pelas parcelas que mais perderam a
 * truncar. Cada parcela fica a menos de um cêntimo do valor exato, e a soma
 * fecha ao cêntimo. É o que se faz em contabilidade para repartir um total, e
 * não uma invenção deste projeto.
 */
export function repartirCentimos(valores: readonly number[], total: number): number[] {
  if (valores.length === 0) return [];

  const alvo = Math.round(arredondar(total) * 100);
  const chao = valores.map((v) => Math.floor(arredondar(v * 100, 6)));
  const restos = valores.map((v, i) => arredondar(v * 100, 6) - chao[i]);

  let sobra = alvo - chao.reduce((s, c) => s + c, 0);
  // Se a diferença não é de meia dúzia de cêntimos, o total não é a soma
  // destas parcelas — repartir seria esconder um erro de cálculo, não um
  // arredondamento. Devolve-se o arredondamento simples e deixa-se o defeito à
  // vista de quem o possa corrigir.
  if (Math.abs(sobra) > valores.length + 1) return valores.map(cent);

  const ordem = restos
    .map((resto, i) => ({ resto, i }))
    .sort((a, b) => (sobra > 0 ? b.resto - a.resto : a.resto - b.resto));

  const centimos = [...chao];
  const passo = Math.sign(sobra);
  for (let k = 0; sobra !== 0; k++) {
    centimos[ordem[k % ordem.length].i] += passo;
    sobra -= passo;
  }
  return centimos.map((c) => c / 100);
}

/** O separador de milhares do pt-PT: espaço inquebrável, não um espaço normal. */
const SEPARADOR_MILHARES = " ";

/**
 * Reagrupa os milhares de valores já escritos dentro de uma frase.
 *
 * Existe por uma razão concreta e visível. As fórmulas da memória de cálculo
 * são construídas no motor com o formatador da INTERFACE, que segue o CLDR do
 * pt-PT à risca — e o CLDR só agrupa a partir de cinco algarismos
 * (`minimumGroupingDigits: 2`). Numa página de UI isso é correto; numa coluna
 * de documento produz «5060,00 €» na linha de cima e «1 206,20 €» na de baixo,
 * que é exatamente o defeito que este módulo existe para eliminar.
 *
 * Reformatar as fórmulas no motor obrigaria a passar-lhe um formatador, e
 * mudar o formatador da interface faria o site inteiro deixar de seguir o
 * CLDR por causa de uma tabela. Reagrupar à saída é a correção mínima.
 *
 * Só toca em números com EXATAMENTE duas casas decimais e quatro ou mais
 * algarismos inteiros: percentagens (uma casa) e referências legais («Art.
 * 78.º», «n.º 2») ficam intactas.
 */
export function regruparMilhares(texto: string): string {
  return texto.replace(/\d+,\d{2}(?!\d)/g, (numero) => {
    const [inteiro, decimal] = numero.split(",");
    if (inteiro.length <= 3) return numero;
    const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILHARES);
    return `${agrupado},${decimal}`;
  });
}

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
