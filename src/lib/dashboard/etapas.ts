// ═══════════════════════════════════════════════════════════════════════
//  AS QUATRO ETAPAS DO NEGÓCIO — e o que cada uma diz quando está vazia.
//  ---------------------------------------------------------------------
//  Liga o MANIFESTO (onde a etapa vive) ao CONTRATO DE TRABALHO (o que já
//  foi feito nela). Dados puros: é lido pela visão geral e pelo hub móvel.
//
//  A copy do estado vazio não é promocional. O painel responde a «onde
//  fiquei e o que faço agora»; a explicação editorial — porquê descobrir,
//  porquê pôr preço — continua nas páginas públicas, que são a porta.
// ═══════════════════════════════════════════════════════════════════════

import type { TipoTrabalho } from "./work-items/tipos";

export interface EtapaNegocio {
  /** O id do destino em `NAV_DASHBOARD`. */
  navId: string;
  tipo: TipoTrabalho;
  /** O que a etapa devolve a quem a percorre. Uma linha. */
  resultado: string;
  /** O que diz o cartão quando ainda não há trabalho nenhum. */
  vazio: { descricao: string; label: string };
}

export const ETAPAS: EtapaNegocio[] = [
  {
    navId: "descobrir",
    tipo: "descoberta",
    resultado: "Que negócio testar, a partir do que sabes fazer e de sinais oficiais.",
    vazio: { descricao: "Ainda não há perfil nem análise.", label: "Começar perfil" },
  },
  {
    navId: "precos",
    tipo: "preco",
    resultado: "Quanto cobrar para cobrir custos, comissões e impostos.",
    vazio: { descricao: "Ainda não calculaste nenhum preço.", label: "Calcular um preço" },
  },
  {
    navId: "negocio",
    tipo: "negocio",
    resultado: "Ofertas, custos e viabilidade — se as contas fecham.",
    vazio: { descricao: "Ainda não há projeto começado.", label: "Criar projeto" },
  },
  {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ PARA QUEM CONTRATA                                             │
    // │                                                               │
    // │ O quarto passo, e o primeiro em que o negócio deixa de caber   │
    // │ numa pessoa. A pergunta não é «quanto é o ordenado»: é quanto  │
    // │ custa o posto à empresa, que salário cabe no orçamento, quanto │
    // │ é que a pessoa recebe mesmo, e quanto tem o posto de gerar     │
    // │ para se pagar.                                                 │
    // └───────────────────────────────────────────────────────────────┘
    navId: "contratar",
    tipo: "contratacao",
    resultado: "Custo do posto, salário que cabe no orçamento e o líquido de quem entra.",
    vazio: { descricao: "Ainda não planeaste nenhuma contratação.", label: "Planear uma contratação" },
  },
];

export const etapaPorTipo = (tipo: TipoTrabalho): EtapaNegocio | undefined =>
  ETAPAS.find((e) => e.tipo === tipo);
