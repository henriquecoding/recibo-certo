// ═══════════════════════════════════════════════════════════════════════
//  O PISO DA CONSULTA PAGA
//  ---------------------------------------------------------------------
//  Módulo PURO de propósito: não importa nada e não fala com a base de
//  dados. É o que lhe permite ser usado pelo painel do contabilista, que
//  tem de funcionar tanto com dados reais como em demonstração — a regra
//  vive em `__tests__/contabilistas-demonstracao.test.ts` e vale também
//  para uma constante que, à primeira vista, não parecia ter lado nenhum.
//
//  ── A aritmética ────────────────────────────────────────────────────
//  A plataforma declara `fees.payer: "application"` no Connect: a taxa da
//  Stripe é debitada a ELA, não ao contabilista. Ele recebe o que combinou
//  menos a nossa comissão, e é isso que torna a promessa simples de dizer.
//
//  O reverso é que a comissão é uma PERCENTAGEM (1000 bps no patamar Base,
//  500 no Parceiro) e a taxa da Stripe tem uma parte FIXA — cerca de
//  1,5% + 0,25 € num cartão europeu. Abaixo de um certo valor a parte fixa
//  come a percentagem inteira e a plataforma paga para intermediar:
//
//    · patamar Base (10%)    → equilíbrio a ~2,94 €
//    · patamar Parceiro (5%) → equilíbrio a ~7,15 €
//
//  10 € cobre qualquer patamar com cartão europeu, com folga.
//
//  ── Zero continua a ser um preço ────────────────────────────────────
//  E é o ponto todo do desenho. A primeira conversa costuma ser grátis, e
//  obrigar a inventar um valor era pior do que não ter piso nenhum. O piso
//  é sobre COBRAR, não sobre atender: a regra é «ou grátis, ou pelo menos
//  10 €», nunca «pelo menos 10 €».
//
//  Espelhado pelos CHECK `tipos_consulta_preco_piso` e
//  `agendamentos_preco_piso`. A base é que decide; isto é para a pessoa
//  ler a razão antes de carregar no botão, em vez do erro cru do Postgres.
// ═══════════════════════════════════════════════════════════════════════

export const PRECO_MINIMO_CONSULTA_CENTS = 1000;

/** A mesma pergunta que os CHECK da base fazem. */
export function precoDeConsultaValido(cents: number): boolean {
  return cents === 0 || cents >= PRECO_MINIMO_CONSULTA_CENTS;
}

export const COPY_PRECO_MINIMO =
  "Uma consulta é grátis (0 €) ou custa pelo menos 10 €. Entre os dois, o que a "
  + "Stripe cobra por processar o pagamento é maior do que a nossa comissão.";
