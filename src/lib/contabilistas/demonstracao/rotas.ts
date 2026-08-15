// ═══════════════════════════════════════════════════════════════════════
//  AS DUAS MORADAS DO MESMO PAINEL
//  ---------------------------------------------------------------------
//  O painel de gestão do contabilista tem UM código e duas moradas:
//  `/contabilista`, onde vive o trabalho real de quem tem clientes, e
//  `/admin/contabilista`, onde a administração abre o MESMO painel com
//  dados inventados.
//
//  Não há uma segunda implementação, e é essa a razão de tudo isto existir:
//  uma cópia do painel para a administração ver deixaria de dizer a verdade
//  sobre o original à segunda alteração. Aqui, mexer numa página muda os
//  dois — porque é a mesma página.
//
//  O modo lê-se do ENDEREÇO, e não de um interruptor global. Um interruptor
//  pode ficar ligado por engano; um endereço não. `/contabilista` nunca é
//  `/admin/contabilista`, e por isso nenhum contabilista pode cair em dados
//  simulados sem ter escrito o endereço da administração.
// ═══════════════════════════════════════════════════════════════════════

/** Onde vive o painel real. */
export const BASE_PAINEL = "/contabilista";

/** Onde a administração vê o mesmo painel, com dados inventados. */
export const BASE_DEMONSTRACAO = "/admin/contabilista";

export type ModoPainel = "real" | "demonstracao";

/**
 * O caminho está dentro do painel de demonstração?
 *
 * A comparação é por segmento, não por prefixo de texto: `/admin/contabilistas`
 * (a lista da administração) não é o painel de demonstração, e confundir os
 * dois punha a administração a gerir contabilistas reais num ecrã que diz
 * «dados inventados».
 */
export function eDemonstracao(caminho: string | null | undefined): boolean {
  if (!caminho) return false;
  return caminho === BASE_DEMONSTRACAO || caminho.startsWith(`${BASE_DEMONSTRACAO}/`);
}

export function modoDoCaminho(caminho: string | null | undefined): ModoPainel {
  return eDemonstracao(caminho) ? "demonstracao" : "real";
}

/** A raiz do painel para o caminho onde a pessoa está. */
export function basePainel(caminho: string | null | undefined): string {
  return eDemonstracao(caminho) ? BASE_DEMONSTRACAO : BASE_PAINEL;
}

/**
 * Traduz uma ligação do painel para a base onde o painel está aberto.
 *
 * As páginas continuam a escrever `/contabilista/agenda` — é o que se lê
 * melhor, e é o endereço verdadeiro. Quem está na demonstração recebe
 * `/admin/contabilista/agenda` sem que a página o saiba.
 *
 * O que NÃO é do painel fica como está: `/contabilistas/marta-nogueira` é o
 * diretório público, `/dashboard` é a área do cliente. Reescrevê-los levava
 * a administração para dentro de um endereço que não existe.
 */
export function hrefNoPainel(href: string, base: string): string {
  if (base === BASE_PAINEL) return href;
  if (href === BASE_PAINEL) return base;
  if (href.startsWith(`${BASE_PAINEL}/`)) return base + href.slice(BASE_PAINEL.length);
  return href;
}

/**
 * O modo do endereço que o browser está a mostrar.
 *
 * É daqui que a camada de dados sabe se responde com a base de dados ou com
 * a loja de demonstração. Fora do browser não há endereço nenhum, e a
 * resposta é sempre «real» — nenhum render no servidor pode servir dados
 * inventados por omissão.
 */
export function modoCorrente(): ModoPainel {
  if (typeof window === "undefined") return "real";
  return modoDoCaminho(window.location.pathname);
}

/** Atalho: estamos, neste instante, dentro da demonstração? */
export function emDemonstracao(): boolean {
  return modoCorrente() === "demonstracao";
}
