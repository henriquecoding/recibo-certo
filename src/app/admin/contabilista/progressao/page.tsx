// ═══════════════════════════════════════════════════════════════════════
//  Progressão e comissão, em demonstração
//  ---------------------------------------------------------------------
//  Não há aqui nenhuma cópia do ecrã: é o MESMO módulo do painel real,
//  servido noutra morada. O que muda é a resposta da camada de dados, que
//  lê o endereço e devolve o consultório de demonstração — ver
//  `src/lib/contabilistas/demonstracao/rotas.ts`.
//
//  Vale a pena dizer o que a demonstração NÃO faz aqui: não desbloqueia
//  patamares. Não é uma limitação da simulação — é a mesma regra do painel
//  real, onde a cobrança ainda não está ligada e onde nenhuma política dá
//  escrita destas tabelas ao cliente. Um botão que funcionasse na
//  demonstração daria a entender que funciona no painel verdadeiro.
// ═══════════════════════════════════════════════════════════════════════

export { default } from "@/app/contabilista/progressao/page";
