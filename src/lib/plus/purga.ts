// ═══════════════════════════════════════════════════════════════════════
//  O QUE ACONTECE AOS DADOS QUANDO A SUBSCRIÇÃO ACABA
//  ---------------------------------------------------------------------
//  Minimização de dados, que é uma medida de segurança e não uma cláusula
//  de estilo: dados que não guardamos não podem ser expostos. Deixar o
//  histórico fiscal de ex-subscritores acumular indefinidamente é guardar
//  risco sem contrapartida — para nós e para a pessoa.
//
//  A janela de 30 dias não é hesitação: uma subscrição também acaba quando
//  um cartão expira, e apagar no instante em que o estado muda destruiria
//  os dados de quem nunca escolheu sair. Dá tempo para resolver o
//  pagamento, exportar o que é seu, ou voltar atrás.
//
//  O QUE NUNCA É APAGADO: o que está no dispositivo. Isso não é nosso.
// ═══════════════════════════════════════════════════════════════════════

/** Espelha `dias_ate_purga()` na base de dados, que é a origem do número. */
export const DIAS_ATE_PURGA = 30;

/** O que desaparece do servidor, dito como a pessoa o reconhece. */
export const DADOS_APAGADOS = [
  "Recibos verdes guardados na nuvem",
  "Recibos de vencimento guardados",
  "Cenários de simulação sincronizados",
  "O perfil fiscal guardado na conta",
] as const;

/** O que fica, e porquê. Omitir isto faria o aviso parecer maior do que é. */
export const DADOS_MANTIDOS = [
  "A tua conta e o acesso continuam a existir",
  "O que está guardado no teu dispositivo não é tocado",
  "O histórico de faturação, que a lei obriga a conservar",
] as const;
