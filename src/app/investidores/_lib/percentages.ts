/**
 * Reparte um total em percentagens inteiras que somam EXATAMENTE 100.
 *
 * O donut da página mostrava 59 + 17 + 2 + 23 = 101%. Não era um erro de
 * cálculo: cada fatia era arredondada isoladamente com `Math.round`, e quatro
 * arredondamentos independentes não têm nenhuma razão para somar 100. Como os
 * segmentos do SVG usam `pathLength=100`, o excesso desenhava por cima do
 * início — um gráfico matematicamente incoerente numa página cujo argumento
 * inteiro é "os nossos números são de confiança".
 *
 * Método das maiores sobras (o mesmo que se usa para repartir mandatos): dá a
 * cada parte a sua parcela inteira e distribui o que sobra por quem tem a
 * maior fração cortada. É determinístico e a soma é 100 por construção.
 */
export function allocateWholePercentages(parts: number[], total: number): number[] {
  if (parts.length === 0) return [];
  if (!Number.isFinite(total) || total <= 0) return parts.map(() => 0);

  const raw = parts.map((part) => (Math.max(0, part) / total) * 100);
  const base = raw.map((v) => Math.floor(v));
  let sobra = 100 - base.reduce((s, v) => s + v, 0);

  // Quando as partes não perfazem o total (ex.: há uma fatia não representada),
  // `sobra` pode ser grande; quando excedem, pode ser negativa. Nos dois casos
  // o resultado tem de continuar a somar 100.
  const ordem = raw
    .map((valor, index) => ({ index, fracao: valor - Math.floor(valor) }))
    .sort((a, b) => b.fracao - a.fracao);

  for (let cursor = 0; sobra > 0; cursor += 1, sobra -= 1) {
    base[ordem[cursor % ordem.length].index] += 1;
  }
  for (let cursor = 0; sobra < 0; cursor += 1, sobra += 1) {
    const alvo = ordem[ordem.length - 1 - (cursor % ordem.length)].index;
    if (base[alvo] > 0) base[alvo] -= 1;
    else sobra -= 1; // nada a tirar aqui; segue para o próximo
  }

  return base;
}
