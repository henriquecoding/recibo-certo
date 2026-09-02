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
  preco: "recibocerto:preco:v1",
  // A lista de produtos a que a pessoa já pôs preço. Separada do contexto
  // de trabalho de propósito: um é o que está a ser feito agora, a outra é
  // o que já ficou decidido — e recomeçar um não pode apagar a outra.
  "precos-guardados": "recibocerto:precos-guardados:v1",
  // O rascunho do estúdio de negócio. É o dado mais sensível que este
  // produto guarda no browser — custos de fornecedor, margens, volumes e
  // a estrutura de custos inteira — e por isso nunca sai daqui sem uma
  // ação explícita de «Guardar este projeto». Ver `store/negocio.ts`.
  negocio: "recibocerto:negocio:v1",
  // A ponte do estúdio para o simulador de empresa. Vive no cofre pela
  // mesma razão que o rascunho: leva volume de negócios, custos e
  // estrutura de alguém — e leva-os por TTL curto e consumo único, porque
  // um handoff que fica no browser deixa de ser uma ponte e passa a ser
  // uma cópia esquecida. Ver `store/handoff-negocio-empresa.ts`.
  "handoff-negocio-empresa": "recibocerto:handoff-negocio-empresa:v1",
  // As hipóteses de negócio que a pessoa está a testar: entrevistas,
  // orçamentos aceites, pilotos pagos e vendas. É a prova comercial dela e
  // dos clientes dela — a coisa que menos pode sair do dispositivo sem uma
  // decisão explícita. Ver `store/hipoteses-mercado.ts`.
  "hipoteses-mercado": "recibocerto:hipoteses-mercado:v1",
  // O perfil de empreendedor do motor de descoberta: zona, competências,
  // ativos, capital, restrições e tolerância ao risco. É, em conjunto, a
  // coisa mais identificadora que este produto sabe sobre alguém — e por
  // isso só é escrito depois de a pessoa carregar em «Guardar o meu
  // perfil», nunca em silêncio. Ver `store/perfil-descoberta.ts`.
  "perfil-descoberta": "recibocerto:perfil-descoberta:v1",
  // Os instantâneos das análises anteriores, para poder responder a «o
  // que mudou desde a última vez?». Guardam pontuação e composição, NUNCA
  // o contexto — comparar duas análises não pode obrigar a conservar o
  // perfil. Ver `store/perfil-descoberta.ts`.
  "instantaneos-descoberta": "recibocerto:instantaneos-descoberta:v1",
  // A ponte do motor de descoberta para o estúdio de negócio. Leva duas
  // coisas — o cenário de preço e o nome da oferta — porque um título
  // composto a partir das competências de alguém não pode viajar no URL
  // (§10). TTL curto e consumo único, como qualquer ponte: ver
  // `store/handoff-descoberta-negocio.ts`.
  "handoff-descoberta-negocio": "recibocerto:handoff-descoberta-negocio:v1",
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
  "recibocerto:painel-grupos-abertos":
    "Que grupos da sidebar ficam abertos. É geometria do aparelho, como o tema — e não diz o que a pessoa tem lá dentro.",
  "recibocerto:store-changed":
    "NÃO é uma chave de armazenamento: é o nome do evento que avisa o painel de que um cofre mudou. Transporta o nome do domínio e mais nada — ver `lib/dashboard/eventos.ts`.",
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

/**
 * Já correu a migração das chaves antigas nesta sessão de página?
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ISTO É O QUE FAZIA A MIGRAÇÃO NUNCA CORRER PARA QUEM NÃO TEM      │
 * │ CONTA — que é a maior parte de quem usa isto.                     │
 * │                                                                  │
 * │ O guarda era `if (novo === cofreAtual) return`. Para um visitante │
 * │ anónimo, `nomeDoCofre(null)` é `"anonimo"` — exatamente o valor   │
 * │ inicial de `cofreAtual`. A comparação dava igual à primeira       │
 * │ chamada e a função saía ANTES de migrar seja o que for.           │
 * │                                                                  │
 * │ O `auth.tsx` até tem um comentário a dizer «sem esta chamada, a   │
 * │ migração das chaves antigas nunca corria para quem usa a          │
 * │ aplicação sem conta» — a chamada foi acrescentada, o guarda       │
 * │ engoliu-a, e ninguém reparou porque os testes exercitam           │
 * │ `migrarParaCofre` diretamente e essa sempre esteve certa.         │
 * │                                                                  │
 * │ O efeito, medido: quem tinha o perfil fiscal gravado na chave     │
 * │ pré-cofre continuava a ver «diz-nos qual é o teu regime de IVA»   │
 * │ depois de o ter dito, e o painel de prazos mostrava-lhe as        │
 * │ declarações de IVA de que está isento. O mesmo valia para         │
 * │ recibos, cenários e tudo o resto que viveu fora do cofre.         │
 * │                                                                  │
 * │ A flag mantém o que o guarda queria (não repetir trabalho a cada  │
 * │ render) sem o que ele fazia por acidente (nunca o fazer).         │
 * └──────────────────────────────────────────────────────────────────┘
 */
let migracaoCorrida = false;

/** Quem está a usar, agora. Chamado pela camada de autenticação. */
export function definirCofre(userId: string | null | undefined): void {
  const novo = nomeDoCofre(userId);
  // A primeira chamada migra SEMPRE, mesmo que o cofre não mude de nome.
  if (novo === cofreAtual && migracaoCorrida) return;
  cofreAtual = novo;
  migracaoCorrida = true;
  migrarParaCofre(userId);
}

/**
 * Repõe o estado do módulo. Existe para os testes — sem isto, o primeiro
 * `definirCofre` de um ficheiro deixava a flag ligada para os seguintes.
 */
export function reporCofreParaTestes(): void {
  cofreAtual = COFRE_ANONIMO;
  migracaoCorrida = false;
}

export const cofreAtivo = (): string => cofreAtual;

/** A chave de um domínio no cofre em uso. É o que os repositórios chamam. */
export function chaveAtiva(dominio: Dominio): string {
  return `${DOMINIOS[dominio]}::${cofreAtual}`;
}
