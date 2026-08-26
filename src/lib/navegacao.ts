// ═══════════════════════════════════════════════════════════════════════
//  A FONTE ÚNICA DA NAVEGAÇÃO — os pilares e o menu completo
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ HAVIA DUAS NAVEGAÇÕES, E NÃO CONCORDAVAM UMA COM A OUTRA             │
//  │                                                                     │
//  │   secretária (`NAV_PRINCIPAL`)  Simular · Guias · Quiz · Planos ·   │
//  │                                 Contabilistas                       │
//  │   telemóvel  (`SLOTS`)          Início · Guias · Quiz ·             │
//  │                                 Contabilistas · Conta               │
//  │                                                                     │
//  │ Duas listas, dois ficheiros, e nada que as obrigasse a concordar.    │
//  │ Divergiam em DOIS dos cinco lugares — «Simular» e «Planos» não       │
//  │ existiam no telemóvel; «Início» e «Conta» não existiam no            │
//  │ computador — e a divergência não dava erro nenhum: dava apenas duas  │
//  │ respostas diferentes à pergunta «onde posso ir?» consoante o ecrã.   │
//  │                                                                     │
//  │ Passa a haver UMA lista. A barra da secretária, a barra do           │
//  │ telemóvel, a folha do menu e o rodapé leem-na toda daqui, e          │
//  │ `navegacao.test.ts` reprova quando uma dessas superfícies deixa de a │
//  │ refletir. A regra vale por construção, não por disciplina.           │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O CANÓNICO E A EXPERIÊNCIA DA HOMEPAGE SÃO DUAS PORTAS DIFERENTES    │
//  │                                                                     │
//  │ Os quatro pilares da homepage — recibos verdes, por conta de outrem, │
//  │ empresa, comparar — nunca foram navegação. Eram um valor em          │
//  │ `localStorage` (`lib/perfil.tsx`) que ramificava o hero, a           │
//  │ calculadora e a secção de exploração no cliente. Não estavam na      │
//  │ barra, não estavam no menu, e não havia URL que abrisse um deles     │
//  │ sem passar pelo topo da homepage.                                    │
//  │                                                                     │
//  │ Cada pilar continua a ter uma rota canónica da ferramenta, indexável │
//  │ e alcançável sem JavaScript. Quando a homepage já sabe contar essa   │
//  │ etapa por inteiro, as superfícies de descoberta podem abrir também   │
//  │ uma experiência editorial em `/?foco=…`; o CTA dessa experiência é   │
//  │ que entra no motor completo. O rodapé, o menu e a pesquisa continuam │
//  │ a apontar para o canónico. Duas portas explícitas, nunca um URL que   │
//  │ muda de significado por baixo da pessoa.                             │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE SÃO CINCO E PORQUE «COMPARAR» NÃO É UM DELES                  │
//  │                                                                     │
//  │ Cinco é o número de lugares da barra do telemóvel, e esse número     │
//  │ está pinado com uma razão medida em `chrome-movel.test.ts`: com seis │
//  │ os rótulos deixam de caber a 360 px. Os pilares ocupam-nos           │
//  │ exactamente, sem folha extra e sem nenhum deles ficar escondido.     │
//  │                                                                     │
//  │ «Comparar» sai porque não é um sítio — é uma operação SOBRE três     │
//  │ dos outros (recibos verdes, salário, empresa). Continua a ser um     │
//  │ modo do simulador integrado e uma ferramenta com rota própria em     │
//  │ `/ferramentas/comparar-regimes`; deixa apenas de disputar um lugar   │
//  │ com destinos.                                                        │
//  │                                                                     │
//  │ E entram os dois motores que estavam enterrados: o de formação de    │
//  │ preço e o de descoberta de negócio. Ambos declaravam `surfaces:      │
//  │ "homepage"` no catálogo e nenhum aparecia lá — a promessa estava     │
//  │ escrita e o código não a cumpria (ver `ferramentas/validar.ts`).      │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  REGRAS DESTE FICHEIRO
//   · Dados puros. Sem React, sem `fiscal-data.ts`, sem motores. Vive no
//     chrome de todas as páginas públicas e não pode pagar bundle.
//     A ÚNICA importação é `TOTAL_FERRAMENTAS`, do catálogo — e é do
//     catálogo e NÃO de `seo.ts`, que importa os manifestos dos guias para
//     montar o sitemap e arrastaria as fichas editoriais para o bundle
//     inicial de todas as páginas públicas, para escrever um número.
//     Coberto por `busca-fronteira.test.ts`.
//   · O ícone é uma CHAVE (`components/ferramentas/icon-map.tsx` resolve-a),
//     pela mesma razão que o catálogo das ferramentas o faz.
//   · `href` é sempre o destino CANÓNICO da ferramenta. `homepageHref` é
//     opcional e só existe quando a homepage já implementa esse modo de
//     ponta a ponta. Nunca se confunde com `?modo=…`, que escolhe perfil.
// ═══════════════════════════════════════════════════════════════════════

import { TOTAL_FERRAMENTAS } from "@/lib/ferramentas";

/** Um destino da navegação principal. */
export interface Pilar {
  id: string;
  /** Rota canónica. É sempre a da ferramenta, nunca uma query da homepage. */
  href: string;
  /** Experiência editorial da homepage, quando já está implementada. */
  homepageHref?: `/?foco=${string}`;
  /** O nome completo. É SEMPRE o nome acessível, em qualquer largura. */
  label: string;
  /**
   * O nome curto, para a barra do telemóvel e para a cápsula estreita.
   * Fica no DOM ao lado do longo e é `aria-hidden`: a CSS troca a palavra
   * que se vê, e o que um leitor de ecrã anuncia nunca depende do ecrã.
   */
  curto: string;
  /** Uma linha de resultado — o que a pessoa leva de lá. Para a folha do menu. */
  resultado: string;
  /** Chave de `ICONES_FERRAMENTAS`. */
  icone: string;
  /** Prefixos de rota que acendem este pilar. O primeiro que casar ganha. */
  prefixos: string[];
  /** Id no catálogo das ferramentas. `navegacao.test.ts` valida que existe. */
  toolId: string;
}

/**
 * OS CINCO PILARES, pela ordem do ciclo de vida e não por identidade.
 *
 * A pergunta que a ordem responde deixou de ser «quem és?» (independente,
 * dependente, empresa) e passou a ser «em que ponto estás?»:
 *
 *     que negócio abrir → quanto cobrar → quanto fica de cada recibo →
 *     quanto fica do salário → e se fosse uma empresa
 *
 * Os dois primeiros lugares são exactamente os dois motores que antes só
 * existiam dentro de `/ferramentas`. A ordem é contrato: quem aprendeu
 * onde está «Recibos» acerta-lhe sem olhar, e trocar as posições desfaz
 * isso sem aviso nenhum.
 */
export const PILARES: Pilar[] = [
  {
    id: "descobrir",
    href: "/ferramentas/descobrir-negocio",
    homepageHref: "/?foco=descobrir",
    label: "Descobrir",
    curto: "Descobrir",
    resultado: "Que negócio testar, a partir do que sabes fazer e de sinais oficiais.",
    icone: "Lightbulb",
    prefixos: ["/ferramentas/descobrir-negocio"],
    toolId: "descobrir-negocio",
  },
  {
    id: "preco",
    href: "/ferramentas/calcular-preco",
    homepageHref: "/?foco=preco",
    label: "Preço",
    curto: "Preço",
    resultado: "Quanto cobrar para cobrir custos, comissões e impostos.",
    icone: "Coin",
    prefixos: ["/ferramentas/calcular-preco"],
    toolId: "calcular-preco",
  },
  {
    id: "recibos",
    href: "/ferramentas/recibos-verdes",
    homepageHref: "/?foco=recibos",
    label: "Recibos verdes",
    curto: "Recibos",
    resultado: "Quanto de cada recibo fica mesmo para ti, depois de tudo.",
    icone: "Receipt",
    prefixos: ["/ferramentas/recibos-verdes"],
    toolId: "recibos-verdes",
  },
  {
    id: "salario",
    href: "/ferramentas/recibo-vencimento",
    homepageHref: "/?foco=salario",
    label: "Salário",
    curto: "Salário",
    resultado: "O líquido de quem trabalha por conta de outrem, linha a linha.",
    icone: "Briefcase",
    prefixos: ["/ferramentas/recibo-vencimento"],
    toolId: "recibo-vencimento",
  },
  {
    id: "empresa",
    href: "/ferramentas/simulador-empresa",
    homepageHref: "/?foco=empresa",
    label: "Empresa",
    curto: "Empresa",
    resultado: "IRC, salário de gerência e dividendos — o que sobra ao fim do ano.",
    icone: "Building",
    prefixos: ["/ferramentas/simulador-empresa"],
    toolId: "simulador-empresa",
  },
];

/**
 * Nas superfícies que apresentam o percurso, abre primeiro a homepage
 * adaptada quando ela existe. Tudo o que é índice, pesquisa ou SEO continua
 * a ler `pilar.href`, o canónico da ferramenta.
 */
export function hrefDaSuperficiePilar(pilar: Pilar): string {
  return pilar.homepageHref ?? pilar.href;
}

/** Uma entrada do menu completo. */
export interface EntradaMenu {
  /** Só as secções o têm — é por ele que a barra do topo as escolhe. */
  id?: string;
  label: string;
  href: string;
  /** Uma linha de contexto. Opcional: as entradas legais não precisam. */
  desc?: string;
  icone?: string;
  /** Prefixos que a acendem, quando é um destino de secção. */
  prefixos?: string[];
  /**
   * Aparece na barra de secções, na primeira linha do cabeçalho de
   * secretária. É um SUBCONJUNTO do menu, não uma segunda lista: quem não
   * tem `topo` continua a existir — na folha, no rodapé e na pesquisa.
   */
  topo?: true;
  /**
   * O rótulo da barra do topo, quando é diferente do da folha. Mesmo padrão
   * que `Pilar.curto`: a folha tem espaço para dizer o nome inteiro e uma
   * linha de contexto por baixo; a barra tem uma palavra.
   *
   * É o nome ACESSÍVEL nessa superfície, e não uma abreviatura por cima de
   * outro nome — nada de `aria-label` com o rótulo longo. Um nome acessível
   * que não contém o texto visível é uma falha de WCAG 2.5.3 e, pior, deixa
   * quem usa comando de voz a dizer «Simular» a um alvo que se chama outra
   * coisa.
   */
  curto?: string;
}

export interface GrupoMenu {
  titulo: string;
  entradas: EntradaMenu[];
}

/**
 * A NAVEGAÇÃO COMPLETA — o que a cápsula não mostra.
 *
 * A cápsula leva os cinco pilares e um botão «Menu»; tudo o resto vive
 * aqui, numa folha com colunas, e no rodapé. Nada se perde: as mesmas
 * rotas continuam no índice de pesquisa, que está permanentemente a um
 * clique e — ao contrário de um menu — é pesquisável e navegável por
 * teclado.
 *
 * `SECOES` (o primeiro grupo) é o conjunto que ANTES vivia na barra. São
 * destinos a sério e continuam a acender-se: `destinoAtivo()` decide entre
 * eles e os pilares de uma só vez, para nunca haver dois `aria-current`
 * no mesmo documento.
 */
export const SECOES: EntradaMenu[] = [
  {
    // ┌───────────────────────────────────────────────────────────────┐
    // │ «SIMULAR» É ESTA ENTRADA, E ESTEVE FORA DA BARRA POR ENGANO    │
    // │                                                               │
    // │ Saiu quando a barra passou a levar os pilares, com o argumento │
    // │ de que o hub já estava a um clique de qualquer um deles. O     │
    // │ argumento é verdadeiro e é irrelevante: chegar lá A PARTIR de  │
    // │ um pilar não é o mesmo que chegar lá sem ter escolhido pilar   │
    // │ nenhum, que é exactamente o estado de quem ainda não sabe qual │
    // │ é o seu. Os cinco pilares são as cinco perguntas mais comuns;  │
    // │ este é o índice das outras trinta e tal.                       │
    // │                                                               │
    // │ Fica onde sempre esteve — o primeiro da fila, à esquerda de    │
    // │ «Guias» — porque é a ordem que quem já usa o site tem na       │
    // │ memória, e mudá-la não pagava nada.                            │
    // └───────────────────────────────────────────────────────────────┘
    id: "ferramentas",
    topo: true,
    label: "Todas as ferramentas",
    curto: "Simular",
    href: "/ferramentas",
    // A contagem DERIVA do catálogo (§2.3). Nunca se escreve à mão.
    desc: `${TOTAL_FERRAMENTAS} simuladores, calculadoras e decisores num só sítio.`,
    icone: "Calculator",
    prefixos: ["/ferramentas"],
  },
  {
    id: "guias",
    topo: true,
    label: "Guias",
    href: "/guias",
    desc: "Passo a passo para cada obrigação, com base legal.",
    icone: "BookOpen",
    prefixos: ["/guias"],
  },
  {
    id: "quiz",
    topo: true,
    label: "Quiz Fiscal",
    href: "/quiz-fiscal",
    desc: "Testa o que sabes, com a fonte de cada resposta.",
    icone: "Trophy",
    prefixos: ["/quiz-fiscal"],
  },
  {
    id: "contabilistas",
    topo: true,
    label: "Contabilistas",
    href: "/contabilistas",
    desc: "O único sítio daqui que acaba com uma pessoa do outro lado.",
    icone: "Briefcase",
    prefixos: ["/contabilistas"],
  },
  {
    id: "planos",
    topo: true,
    label: "Planos",
    href: "/precos",
    desc: "O que é grátis, o que é Plus e o que a FIZ executa.",
    icone: "Coin",
    prefixos: ["/precos"],
  },
];

/**
 * AS SECÇÕES QUE VÃO À PRIMEIRA LINHA DO CABEÇALHO.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ NÃO É UMA SEGUNDA LISTA — É UM FILTRO SOBRE A PRIMEIRA               │
 * │                                                                     │
 * │ Foi a tentação óbvia (escrever aqui os quatro rótulos outra vez) e   │
 * │ era exactamente o defeito que este ficheiro existe para não repetir. │
 * │ A barra do topo mostra as secções que declaram `topo`; a folha do    │
 * │ menu mostra-as TODAS. Acrescentar uma secção nova ao menu e esquecer │
 * │ a barra deixa de poder pô-las a discordar: são a mesma lista, vista  │
 * │ com dois recortes.                                                   │
 * │                                                                     │
 * │ A folha continua a ser um SUPERCONJUNTO de propósito — é a           │
 * │ «navegação completa», e é o único caminho no telemóvel, onde não há  │
 * │ primeira linha nenhuma.                                              │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const SECOES_TOPO: EntradaMenu[] = SECOES.filter((s) => s.topo);

export const MENU_GRUPOS: GrupoMenu[] = [
  {
    titulo: "Ir para",
    // ┌─────────────────────────────────────────────────────────────────┐
    // │ «INÍCIO» NÃO ESTÁ AQUI, E A AUSÊNCIA É DELIBERADA                │
    // │                                                                 │
    // │ Esteve. E punha DOIS caminhos para `/` na mesma superfície: a    │
    // │ marca, no cabeçalho da folha, e uma entrada chamada «Início»     │
    // │ logo por baixo. É o mesmo defeito que «Contabilistas» já teve —  │
    // │ estar na barra e dentro da folha ao mesmo tempo — e que o        │
    // │ `chrome-movel.test.ts` apanha.                                   │
    // │                                                                 │
    // │ Fica a marca, porque é o caminho para casa em TODO o produto: no │
    // │ cabeçalho de secretária, no topo do telemóvel, no rodapé e aqui. │
    // │ Uma entrada de lista não podia competir com isso sem ensinar     │
    // │ duas convenções para a mesma coisa.                              │
    // └─────────────────────────────────────────────────────────────────┘
    entradas: SECOES,
  },
  {
    titulo: "Aprender",
    entradas: [
      { label: "Calendário fiscal", href: "/dashboard/prazos", desc: "Todas as datas de entrega, num só sítio.", icone: "Clock" },
      { label: "Classificar atividade", href: "/ferramentas/classificar-atividade", desc: "Retenção, coeficiente e SS por profissão.", icone: "Search" },
      { label: "Mapa de preços por região", href: "/ferramentas/mapa-contabilistas", desc: "Contabilistas, notários e advogados.", icone: "MapPin" },
      { label: "Comparar regimes", href: "/ferramentas/comparar-regimes", desc: "Recibos verdes, contrato ou empresa, lado a lado.", icone: "Scale" },
    ],
  },
  {
    titulo: "Confiar",
    entradas: [
      { label: "Metodologia", href: "/metodologia", desc: "Como calculamos e o que nunca fazemos." },
      { label: "Estado dos dados", href: "/estado-dos-dados", desc: "O que foi verificado, quando e com que fonte." },
      { label: "Alterações fiscais", href: "/changelog-fiscal", desc: "O que mudou na lei e o que mudámos por causa disso." },
    ],
  },
  {
    titulo: "Legal",
    entradas: [
      { label: "Privacidade", href: "/privacidade" },
      { label: "Termos", href: "/termos" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

/**
 * QUAL DOS DESTINOS ESTÁ ACESO — e é sempre UM, no máximo.
 *
 * Decidir de uma vez, pela ordem, resolve por construção o defeito que a
 * versão anterior tinha: em `/ferramentas/classificar-atividade`
 * respondiam DOIS itens que sim, e dois `aria-current="page"` no mesmo
 * documento dizem a um leitor de ecrã que a pessoa está em dois sítios.
 *
 * Os PILARES vêm primeiro porque são mais específicos:
 * `/ferramentas/recibos-verdes` é do pilar «Recibos verdes», não da secção
 * «Todas as ferramentas», mesmo casando com o prefixo das duas.
 */
export type Destino = { tipo: "pilar"; pilar: Pilar } | { tipo: "secao"; secao: EntradaMenu };

const casa = (pathname: string, prefixos: string[] | undefined) =>
  (prefixos ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function destinoAtivo(pathname: string | null | undefined): Destino | null {
  if (!pathname) return null;
  const pilar = PILARES.find((p) => casa(pathname, p.prefixos));
  if (pilar) return { tipo: "pilar", pilar };
  const secao = SECOES.find((s) => casa(pathname, s.prefixos));
  return secao ? { tipo: "secao", secao } : null;
}

/** O `href` aceso, ou `null`. É isto que as barras comparam. */
export function hrefAtivo(pathname: string | null | undefined): string | null {
  const d = destinoAtivo(pathname);
  if (!d) return null;
  return d.tipo === "pilar" ? d.pilar.href : d.secao.href;
}

/** Todos os destinos que uma superfície pode acender, sem repetições. */
export const TODOS_OS_DESTINOS: EntradaMenu[] = [
  ...PILARES.map((p) => ({ label: p.label, href: p.href, desc: p.resultado, icone: p.icone, prefixos: p.prefixos })),
  ...SECOES,
];
