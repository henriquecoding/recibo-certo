// ═══════════════════════════════════════════════════════════════════════
//  O COFRE — cada pessoa com o seu, no mesmo browser
//  ---------------------------------------------------------------------
//  As chaves locais eram globais: `recibocerto:recibos:v1`, sem nada que
//  dissesse de quem eram. Num browser partilhado — um computador de casa,
//  um portátil de trabalho, um telemóvel emprestado — isso significava que
//  a pessoa que entrasse a seguir via os recibos, os vencimentos e o
//  perfil fiscal de quem tinha entrado antes.
//
//  É a mesma coisa que a migração 038 fecha do lado do servidor, aberta do
//  lado do browser. E não era preciso ninguém fazer nada de errado: bastava
//  sair da conta e outra pessoa entrar.
//
//  A partir daqui cada chave vive num cofre, e o cofre é a pessoa. Mudar de
//  conta muda de cofre; não há nada para limpar, porque não há nada
//  partilhado. Quem não tem sessão escreve no cofre `anonimo`, que é o
//  comportamento que sempre teve — e é o único que continua a poder ser
//  visto por quem usar o browser a seguir, porque não há por onde saber a
//  quem pertence.
// ═══════════════════════════════════════════════════════════════════════

import { lerChave, gravarChave, removerChave } from "./persistencia";

/**
 * Os domínios que vivem no browser. Um sítio só, e é este.
 *
 * A zona de perigo limpava `recibocerto:recibos` quando a chave era
 * `recibocerto:recibos:v1` — e o mesmo em mais duas. Ou seja: apagava-se
 * na nuvem, recarregava-se a página, e os dados locais continuavam lá.
 * Ninguém deu por isso porque a lista estava escrita duas vezes.
 */
export const DOMINIOS = {
  recibos: "recibocerto:recibos:v1",
  vencimentos: "recibocerto:vencimentos:v1",
  cenarios: "recibocerto:cenarios:v1",
  "perfil-fiscal": "recibocerto:preferencias-fiscais:v1",
  prazos: "recibocerto:prazos-cumpridos:v1",
  "recibos-computed": "recibocerto:recibos-computed:v1",
  "simulador-irs": "recibocerto:sim-irs:v1",
  perfil: "recibocerto:perfil:v1",
  "ponte-vencimento": "recibocerto:cenario-vencimento:v2",
  "ponte-empresa": "recibocerto:export-empresa:v1",
  "ponte-recibos": "recibocerto:export-recibos-verdes:v1",
} as const;

/**
 * O que fica fora do cofre, e por que razão.
 *
 * Nem tudo o que está no browser são dados de uma pessoa. Uma preferência
 * de tema é do aparelho, não de quem o usa — pô-la num cofre fazia o site
 * mudar de aspeto ao entrar na conta, o que é um defeito e não uma
 * proteção. Escrever aqui é uma decisão; não escrever nada faz o teste
 * de completude falhar, que é o que se quer.
 */
export const FORA_DO_COFRE: Record<string, string> = {
  "recibocerto:theme": "Preferência do aparelho. Num cofre, o site mudava de aspeto ao entrar na conta.",
  "recibocerto:onboarded": "Se já se viu a apresentação neste aparelho.",
  "recibocerto:cookie-consent": "O consentimento é do navegador, e é o que a lei pede que persista mesmo sem sessão.",
  "recibocerto:cookie-consent-changed": "Sinal interno da mudança de consentimento.",
  "recibocerto:abrir-cookies": "Sinal interno para reabrir o painel de cookies.",
  "recibocerto:atribuicao": "Atribuição de campanha, deliberadamente do aparelho e sem identidade.",
  "recibocerto:export-usos:v1": "Contador de exportações por aparelho, sem conteúdo nenhum.",
};

export type Dominio = keyof typeof DOMINIOS;

/** O cofre de quem não tem sessão. Continua a ser partilhado, e é dito. */
export const COFRE_ANONIMO = "anonimo";

/**
 * O nome do cofre a partir do id de quem está com sessão.
 *
 * Só os primeiros doze caracteres: chega para não colidir, e uma chave de
 * `localStorage` é visível em qualquer separador de programador — não há
 * razão para lá deixar o id inteiro.
 */
export function nomeDoCofre(userId: string | null | undefined): string {
  if (!userId) return COFRE_ANONIMO;
  return userId.replace(/-/g, "").slice(0, 12);
}

/** A chave completa de um domínio, no cofre de quem está a usar. */
export function chaveNoCofre(dominio: Dominio, userId: string | null | undefined): string {
  return `${DOMINIOS[dominio]}::${nomeDoCofre(userId)}`;
}

/** Todas as chaves de um cofre. Usada por quem apaga. */
export function chavesDoCofre(userId: string | null | undefined): string[] {
  return (Object.keys(DOMINIOS) as Dominio[]).map((d) => chaveNoCofre(d, userId));
}

/**
 * Traz o que estava na chave global para o cofre de quem entrou.
 *
 * Corre uma vez por domínio e por cofre. Sem isto, quem já usava a
 * aplicação abria-a depois desta mudança e via tudo vazio — os dados
 * estavam lá, na chave antiga, e ninguém lhes chegava.
 *
 * A chave antiga é REMOVIDA depois de copiada. Deixá-la ficar era manter
 * exatamente o problema que isto vem resolver: a pessoa seguinte a entrar
 * neste browser voltaria a encontrá-la.
 *
 * Só migra para o cofre de quem tem sessão OU para o anónimo se ninguém
 * tiver — nunca de um cofre para outro.
 */
export function migrarParaCofre(userId: string | null | undefined): void {
  if (typeof window === "undefined") return;

  for (const dominio of Object.keys(DOMINIOS) as Dominio[]) {
    const antiga = DOMINIOS[dominio];
    const conteudo = lerChave(antiga);
    if (conteudo === null) continue;

    const nova = chaveNoCofre(dominio, userId);
    // Se o cofre já tem alguma coisa, o que lá está ganha: foi escrito
    // depois, por esta pessoa, e sobrepor-lhe dados de proveniência
    // desconhecida seria trocar o certo pelo duvidoso.
    if (lerChave(nova) === null) {
      const r = gravarChave(nova, conteudo);
      // Falhando a cópia, a chave antiga FICA. Perder os dados a tentar
      // arrumá-los é pior do que a desarrumação.
      if (!r.ok) continue;
    }
    removerChave(antiga);
  }
}

/** Esvazia um cofre inteiro. É o que a zona de perigo chama. */
export function esvaziarCofre(userId: string | null | undefined): void {
  for (const chave of chavesDoCofre(userId)) removerChave(chave);
}


// ── O cofre em uso ──────────────────────────────────────────────────
//
// Os repositórios leem e escrevem em funções de módulo que não recebem
// quem está com sessão — e passar o id por todas elas seria mudar dezenas
// de assinaturas para dizer sempre a mesma coisa.
//
// Em vez disso, o cofre ativo é estado do módulo, e quem o define é a
// camada de autenticação, num sítio só. Antes de ela responder, o cofre é
// o anónimo: é o que estava certo para quem não tem sessão, e para quem
// tem significa uma leitura vazia que se corrige assim que a sessão
// chega. Vazio por um instante é recuperável; ver os dados de outra
// pessoa não é.
let cofreAtual: string = COFRE_ANONIMO;

/** Quem está a usar, agora. Chamado pela camada de autenticação. */
export function definirCofre(userId: string | null | undefined): void {
  const novo = nomeDoCofre(userId);
  if (novo === cofreAtual) return;
  cofreAtual = novo;
  migrarParaCofre(userId);
}

export const cofreAtivo = (): string => cofreAtual;

/** A chave de um domínio no cofre em uso. É o que os repositórios chamam. */
export function chaveAtiva(dominio: Dominio): string {
  return `${DOMINIOS[dominio]}::${cofreAtual}`;
}
