// ═══════════════════════════════════════════════════════════════════════
//  A ARRUMAÇÃO DA ADMINISTRAÇÃO — seis secções, dez destinos
//  ---------------------------------------------------------------------
//  Fonte única da navegação do painel de administração. A barra lateral, a
//  doca do telemóvel e a linha de secção leem TODAS daqui. Escrever a mesma
//  lista em três sítios é como as barras divergem: uma ganha um destino, as
//  outras não, e a diferença só se descobre no telemóvel de alguém.
//
//  ── O QUE ISTO CORRIGE
//
//  Havia dez destinos numa lista plana, e a doca do telemóvel declarava
//  `grid-cols-6` para os arrumar. Dez itens em seis colunas dão duas linhas:
//  a barra passava a ~130 px de altura, o conteúdo reservava 96 px
//  (`pb-24`), e o fundo de cada página ficava por baixo da navegação. Não
//  era um desalinhamento — era conteúdo inalcançável.
//
//  O painel de contabilista já tinha feito esta viagem (ver
//  `components/contabilistas/navegacao.tsx`): dez destinos planos passaram a
//  seis secções, e a doca deixou de precisar de rolar. Isto é a mesma
//  correção, na última moldura que faltava.
//
//  ── OS EIXOS QUE ESTAVAM MISTURADOS
//
//  A lista plana punha lado a lado coisas que se fazem em ritmos
//  diferentes, e por isso nenhuma ordem ajudava:
//
//    · Filas com gente à espera do outro lado — casos sem contabilista,
//      candidaturas por decidir, reportes por responder. Abrem-se todos os
//      dias, e o custo de as ignorar é uma pessoa sem resposta.
//    · Quem está no produto — contas, lista de espera, propostas. Consulta-
//      se, não se despacha.
//    · O que se configura — anúncios. Mexe-se uma vez por semana.
//    · O que se verifica — auditoria fiscal. Mexe-se quando a lei muda.
//
//  ── O QUE NÃO MUDOU, E É O PONTO
//
//  Nenhuma rota foi apagada, movida ou renomeada. As dez páginas continuam
//  nos mesmos ficheiros e nos mesmos endereços: quem tinha um marcador em
//  `/admin/waitlist` continua a chegar lá. Agrupar é uma decisão de
//  NAVEGAÇÃO, e agrupar sem esconder é a única forma de não perder nada.
// ═══════════════════════════════════════════════════════════════════════

import type { ComponentType } from "react";
import {
  Award, BellAlert, Briefcase, CheckTrend, Coin, Flag, LayoutGrid, Megaphone,
  Shield, ShieldCheck, Target, User,
} from "@/components/ui/Icons";

export const BASE_ADMIN = "/admin";

export type IconeAdmin = ComponentType<{ size?: number; className?: string }>;

/** Uma página da administração. É sempre uma rota real — nunca um separador. */
export interface DestinoAdmin {
  href: string;
  /**
   * O nome da página.
   *
   * O `<h1>` da página tem de COMEÇAR por este nome. Quando divergem, a
   * linha de secção oferece um nome e o título por baixo responde outro —
   * não parte nada, e faz a pessoa duvidar de onde está. Um título mais
   * completo é aceite («Propostas» → «Propostas de investidores»); um
   * título diferente não. O teste `admin-navegacao` fixa isto.
   */
  label: string;
  Icon: IconeAdmin;
  /** Uma linha a dizer o que ali se resolve. Lida pela sidebar (`title`). */
  descricao: string;
}

/** Um grupo de destinos que responde à mesma pergunta. */
export interface SeccaoAdmin {
  id: string;
  label: string;
  /**
   * O rótulo da doca do telemóvel.
   *
   * Até dez caracteres: acima disso é truncado num lugar de ~3,7 rem e a
   * secção passa a chamar-se «Candidatur…».
   */
  curto: string;
  Icon: IconeAdmin;
  descricao: string;
  destinos: readonly DestinoAdmin[];
}

/**
 * As seis secções.
 *
 * A ordem é a do dia: primeiro o estado, depois a medida, depois o que
 * espera por resposta, depois quem está cá, e no fim o que se configura e
 * o que se verifica — que se mexem uma vez por semana, não uma vez por hora.
 */
export const SECCOES_ADMIN: readonly SeccaoAdmin[] = [
  {
    id: "visao",
    label: "Visão geral",
    curto: "Visão",
    Icon: LayoutGrid,
    descricao: "O estado do site e os atalhos para o trabalho de hoje.",
    destinos: [
      {
        href: "/admin",
        label: "Visão geral",
        Icon: LayoutGrid,
        descricao: "Estado do site, contagens e atalhos rápidos.",
      },
    ],
  },
  {
    id: "medicao",
    label: "Medição",
    curto: "Medição",
    Icon: CheckTrend,
    descricao: "O painel semanal: o que mudou e que decisão é que isso pede.",
    destinos: [
      {
        href: "/admin/painel",
        label: "Painel semanal",
        Icon: CheckTrend,
        descricao: "Os blocos de decisão da semana, com a pergunta a que cada número responde.",
      },
    ],
  },
  {
    id: "triagem",
    label: "Triagem",
    curto: "Triagem",
    Icon: Target,
    descricao: "As filas com gente à espera de resposta do outro lado.",
    destinos: [
      {
        href: "/admin/casos",
        label: "Casos",
        Icon: Briefcase,
        // Deixou de ser uma fila de trabalho. As conversas não passam por
        // aqui — o que este ecrã mostra é o que alguém de dentro de um caso
        // nos entregou, e os casos que ainda não têm contabilista nenhum.
        descricao: "Mensagens que nos foram entregues, e casos à espera de alguém.",
      },
      {
        href: "/admin/contabilistas",
        label: "Contabilistas",
        Icon: Shield,
        descricao: "Candidaturas a conta de contabilista: aprovar, recusar ou suspender.",
      },
      {
        href: "/admin/verificacao",
        label: "Verificação na Ordem",
        Icon: Award,
        descricao: "Confirmar números de inscrição no registo público da OCC, e renovar os que estão a caducar.",
      },
      {
        href: "/admin/reportes",
        label: "Central de reportes",
        Icon: Flag,
        descricao: "Feedback do produto e reportes de perguntas do quiz fiscal.",
      },
    ],
  },
  {
    id: "pessoas",
    label: "Pessoas",
    curto: "Pessoas",
    Icon: User,
    descricao: "Quem já cá está, quem espera para entrar e quem nos procurou.",
    destinos: [
      {
        href: "/admin/contas",
        label: "Contas",
        Icon: User,
        descricao: "Lista, pesquisa e papéis das contas — com contagens, nunca conteúdo fiscal.",
      },
      {
        href: "/admin/waitlist",
        label: "Lista de espera",
        Icon: BellAlert,
        descricao: "Os emails inscritos à espera do plano Plus.",
      },
      {
        href: "/admin/propostas",
        label: "Propostas",
        Icon: Coin,
        descricao: "Propostas de investimento recebidas pelo formulário de investidores.",
      },
    ],
  },
  {
    id: "site",
    label: "Site",
    curto: "Site",
    Icon: Megaphone,
    descricao: "O que aparece nas páginas: parceiros, banners e anúncios nativos.",
    destinos: [
      {
        href: "/admin/anuncios",
        label: "Anúncios",
        Icon: Megaphone,
        descricao: "Parceiros, Google Ads, banners e anúncios nativos, com posições e ordem.",
      },
    ],
  },
  {
    id: "fiscal",
    label: "Fiscal",
    curto: "Fiscal",
    Icon: ShieldCheck,
    descricao: "A verificação dos dados e cálculos contra as normas em vigor.",
    destinos: [
      {
        href: "/admin/auditoria",
        label: "Auditoria fiscal",
        Icon: ShieldCheck,
        descricao: "Agentes que validam taxas, coeficientes e cálculos contra a lei portuguesa.",
      },
    ],
  },
];

/** As dez folhas, achatadas. */
export const DESTINOS_ADMIN: readonly DestinoAdmin[] = SECCOES_ADMIN.flatMap((s) => s.destinos);

/**
 * Onde uma secção aterra quando se carrega nela.
 *
 * É sempre o primeiro destino — nunca uma página-índice inventada. Uma
 * secção que abrisse num ecrã de escolha punha um clique entre a pessoa e o
 * trabalho, todas as vezes.
 */
export function hrefDaSeccaoAdmin(seccao: SeccaoAdmin): string {
  return seccao.destinos[0].href;
}

/**
 * Este destino é o que está aberto?
 *
 * A raiz compara-se por igualdade e o resto por prefixo TERMINADO EM BARRA.
 * Sem a barra, `startsWith` diria que `/admin/contas` está aberto em
 * `/admin/contas-antigas`; e sem a igualdade, `/admin` estaria aberto em
 * todos os ecrãs — que era metade do que a moldura antiga fazia.
 */
export function destinoAtivoAdmin(href: string, pathname: string): boolean {
  return href === BASE_ADMIN
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A secção onde este caminho vive.
 *
 * Devolve `undefined` para um caminho que não seja de nenhum destino — o
 * login e o espelho de demonstração do painel de contabilista vivem fora
 * desta moldura, e quem chama tem de aguentar isso sem partir.
 */
export function seccaoDoCaminhoAdmin(pathname: string): SeccaoAdmin | undefined {
  return SECCOES_ADMIN.find((s) => s.destinos.some((d) => destinoAtivoAdmin(d.href, pathname)));
}

/** O destino aberto, quando há um. Serve o título da barra de topo. */
export function destinoDoCaminhoAdmin(pathname: string): DestinoAdmin | undefined {
  return DESTINOS_ADMIN.find((d) => destinoAtivoAdmin(d.href, pathname));
}
