// ═══════════════════════════════════════════════════════════════════════
//  A FONTE DE DADOS DO PAINEL — uma porta, duas respostas
//  ---------------------------------------------------------------------
//  As páginas do painel deixaram de falar diretamente com `dados.ts`,
//  `casos.ts`, `conversa.ts`, `trabalho.ts` e `linkedin.ts`. Falam com os
//  módulos desta pasta, que têm exatamente os mesmos nomes e as mesmas
//  assinaturas — e que, conforme o endereço onde o painel está aberto,
//  encaminham para a base de dados ou para a loja de demonstração.
//
//  Porquê uma porta em vez de um `if` dentro de cada página: para que a
//  página não saiba. Uma página que sabe em que modo está acaba com dois
//  caminhos, e o caminho da demonstração deixa de provar seja o que for
//  sobre o real. Aqui a diferença vive num sítio só, e as ~4000 linhas de
//  interface são literalmente as mesmas nos dois modos.
//
//  A loja de demonstração entra por importação DINÂMICA. Não é ergonomia:
//  é para que o consultório inventado — nomes, casos, conversas — não vá
//  no pacote de quem abre o painel a sério.
// ═══════════════════════════════════════════════════════════════════════

import { emDemonstracao } from "../demonstracao/rotas";

export { emDemonstracao };

/** A loja, carregada só quando o endereço é o da demonstração. */
export function loja() {
  return import("../demonstracao/loja");
}
