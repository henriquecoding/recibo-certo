// ═══════════════════════════════════════════════════════════════════════
//  DESTINO POR INTENÇÃO
//  ---------------------------------------------------------------------
//  Aqui está o problema comercial, em números do próprio repositório:
//  29 dos 54 Guias declaram `intent: "FIND_ACCOUNTANT"`. São Guias sobre
//  penhoras, dívidas fiscais, injunções, cessação de contrato. Outros 6 são
//  `PREPARE_IRS`, 4 `CONFIGURE_VAT`, 4 `CONFIGURE_SOCIAL_SECURITY`.
//
//  Se o link de afiliado for uma única URL, os 54 Guias e os 8 simuladores
//  acabam todos na mesma página genérica. Quem chega de um Guia sobre
//  penhora de vencimento vê uma página de faturação para freelancers. A taxa
//  de conversão que daí sai não mede a nossa audiência — mede o desajuste —
//  e é essa taxa que vai servir de argumento para a Fase 2.
//
//  ⚠️ POR CONFIRMAR COM A FIZ: se o link pessoal preserva um caminho de
//  aterragem. Enquanto `caminho_suportado` for `false` na linha da parceria,
//  este mapa NÃO é consultado e tudo cai no destino base. Nunca se inventa
//  um caminho no site de outra pessoa.
//
//  Os caminhos abaixo estão na navegação de `fiz.co`. O que não está
//  confirmado é se o link pessoal os preserva — daí o `caminho_suportado`.
// ═══════════════════════════════════════════════════════════════════════

import type { FizIntent } from "@/lib/guias/manifests";

/**
 * Caminho de aterragem por intenção, ou `null` para «usar o destino base».
 *
 * Um `null` aqui não é um esquecimento: é a afirmação de que, para aquela
 * intenção, não conhecemos um destino melhor do que a raiz.
 */
export const DESTINO_POR_INTENT: Record<FizIntent, string | null> = {
  START_FREELANCER: "/invoicing/",
  CONFIGURE_FREELANCER: "/invoicing/",
  CONFIGURE_VAT: "/iva/",
  CONFIGURE_SOCIAL_SECURITY: "/segsoc/",
  PREPARE_IRS: "/irs/",
  START_COMPANY: "/empresas/",
  FIND_ACCOUNTANT: "/contabilistas/",
};

/**
 * Superfícies canónicas — uma chave por sítio onde uma parceria pode
 * aparecer. É esta lista que o admin mostra e que a medição usa: sem um
 * vocabulário fechado, «fim do guia» e «guia.next_step» acabam a contar a
 * mesma coisa em duas linhas diferentes.
 */
export const SUPERFICIES = [
  "guia.next_step",
  "simulador.plano_acao",
  "demo.hero",
  "demo.hero.faixa",
  "demo.irs",
  "demo.irs.faixa",
  "precos.faixa",
  "dashboard.partner_spot",
  // As 8 posições de `AnuncioForm`.
  "anuncio.dashboard",
  "anuncio.receitas",
  "anuncio.recibos",
  "anuncio.prazos",
  "anuncio.simulador",
  "anuncio.comparador",
  "anuncio.landing_hero",
  "anuncio.landing_pricing",
] as const;

export type Superficie = (typeof SUPERFICIES)[number];

export function superficieValida(valor: string): valor is Superficie {
  return (SUPERFICIES as readonly string[]).includes(valor);
}

/** Rótulos legíveis, para o formulário do admin e para o painel. */
export const ROTULO_SUPERFICIE: Record<Superficie, string> = {
  "guia.next_step": "Fim de cada Guia",
  "simulador.plano_acao": "Fim de cada simulador",
  "demo.hero": "Demonstração da página inicial (ato final)",
  "demo.hero.faixa": "Faixa por baixo da demonstração da página inicial",
  "demo.irs": "Demonstração do IRS (ato final)",
  "demo.irs.faixa": "Faixa por baixo da demonstração do IRS",
  "precos.faixa": "Página de Preços",
  "dashboard.partner_spot": "Cartão contextual do painel",
  "anuncio.dashboard": "Anúncio — painel",
  "anuncio.receitas": "Anúncio — receitas",
  "anuncio.recibos": "Anúncio — recibos",
  "anuncio.prazos": "Anúncio — prazos",
  "anuncio.simulador": "Anúncio — simulador",
  "anuncio.comparador": "Anúncio — comparador",
  "anuncio.landing_hero": "Anúncio — topo da página inicial",
  "anuncio.landing_pricing": "Anúncio — grelha de planos",
};
