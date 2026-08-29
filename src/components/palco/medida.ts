// ═══════════════════════════════════════════════════════════════════════
//  MEDIR O PALCO — onde nasce e onde morre uma ficha
//  ---------------------------------------------------------------------
//  Partilhado pelos palcos de Preço e de Descobrir, que mediam a mesma
//  coisa com o mesmo código em dois ficheiros.
// ═══════════════════════════════════════════════════════════════════════

export interface Ponto {
  x: number;
  y: number;
}

/**
 * O centro de `alvo`, em coordenadas do `palco`.
 *
 * É medido em tempo de execução, e não pré-calculado, porque é isto que faz
 * uma coreografia funcionar em qualquer disposição: no telemóvel as colunas
 * empilham e as fichas passam a viajar na vertical sem uma linha de código
 * a saber que existe um telemóvel.
 *
 * Devolve `null` — e não `{ x: 0, y: 0 }` — quando não há o que medir. Um
 * zero silencioso faria a ficha viajar do canto superior esquerdo, que é
 * pior do que ficha nenhuma: parece intencional.
 */
export function medir(alvo: Element | null, palco: Element | null): Ponto | null {
  if (!alvo || !palco) return null;
  const a = alvo.getBoundingClientRect();
  const p = palco.getBoundingClientRect();
  if (a.width === 0 && a.height === 0) return null;
  return { x: a.left - p.left + a.width / 2, y: a.top - p.top + a.height / 2 };
}

/** O desvio do arco, em fração da distância percorrida. */
const DESVIO_DO_ARCO = 0.16;

/**
 * O ponto de controlo do arco, a 16% da perpendicular.
 *
 * Uma linha reta entre dois pontos lê-se como teletransporte; um arco lê-se
 * como trajetória. Mais do que isto e passa a maneirismo.
 *
 * ── Porque 16% e não 18% ──────────────────────────────────────────────
 *
 * Os dois palcos divergiam aqui, como divergiam em `ASSENTA`. Fica o valor
 * menor, pela mesma razão: entre duas escolhas que ninguém distingue lado a
 * lado, a contida é a que não se nota — e uma trajetória que se NOTA como
 * curva deixa de ser trajetória e passa a ser um floreado.
 */
export function arco(origem: Ponto, destino: Ponto): Ponto {
  const dx = destino.x - origem.x;
  const dy = destino.y - origem.y;
  const dist = Math.hypot(dx, dy) || 1;
  const desvio = dist * DESVIO_DO_ARCO;
  return {
    x: dx / 2 + (-dy / dist) * desvio,
    y: dy / 2 + (dx / dist) * desvio,
  };
}
