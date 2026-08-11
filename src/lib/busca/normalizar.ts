// ─────────────────────────────────────────────────────────────────────
//  Normalização de texto para pesquisa — puro, testável, sem estado.
// ─────────────────────────────────────────────────────────────────────

/**
 * Tudo em minúsculas, sem acentos e sem pontuação.
 *
 * `toLocaleLowerCase("pt-PT")` e não `toLowerCase()`: são iguais para o
 * alfabeto português, mas o dia em que alguém escrever um `İ` turco a
 * diferença aparece — e um índice de pesquisa que muda de comportamento
 * conforme a região do dispositivo é um defeito impossível de reproduzir.
 *
 * A pontuação vira ESPAÇO e não vazio: «fatura-recibo» tem de dar dois
 * tokens («fatura», «recibo») para quem escreve só um deles encontrar o
 * documento. Colá-los daria «faturarecibo», que nenhuma pessoa escreve.
 */
export function normalizar(valor: string): string {
  return valor
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(valor: string): string[] {
  const limpo = normalizar(valor);
  return limpo ? limpo.split(" ").filter(Boolean) : [];
}

/**
 * `true` quando `a` e `b` estão a UMA edição de distância (ou são iguais).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE NÃO É UM LEVENSHTEIN COMPLETO                                 │
 * │                                                                     │
 * │ A pergunta aqui nunca é «qual é a distância»; é «é no máximo um».    │
 * │ Com esse tecto, a resposta sai de uma passagem linear sobre as duas  │
 * │ palavras, sem matriz e sem alocar nada — e isto corre uma vez por    │
 * │ token de documento, por token de consulta, por tecla escrita.        │
 * │                                                                     │
 * │ Um Levenshtein completo daria o mesmo resultado a pagar O(n·m) de    │
 * │ tempo e de memória para deitar fora tudo o que fosse maior que 1.    │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function distanciaAteUm(a: string, b: string): boolean {
  if (a === b) return true;
  const [curta, longa] = a.length <= b.length ? [a, b] : [b, a];
  if (longa.length - curta.length > 1) return false;

  let i = 0;
  let j = 0;
  let erros = 0;
  while (i < curta.length && j < longa.length) {
    if (curta[i] === longa[j]) {
      i++;
      j++;
      continue;
    }
    if (++erros > 1) return false;
    // Comprimentos iguais → substituição (avançam os dois). Comprimentos
    // diferentes → inserção na palavra longa (só ela avança).
    if (curta.length === longa.length) i++;
    j++;
  }
  // O que sobrar da palavra longa é mais uma edição.
  return erros + (longa.length - j) <= 1;
}
