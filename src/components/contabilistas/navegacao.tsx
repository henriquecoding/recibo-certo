// ═══════════════════════════════════════════════════════════════════════
//  A ARRUMAÇÃO DO PAINEL DE GESTÃO — seis secções, dez destinos
//  ---------------------------------------------------------------------
//  Este ficheiro é a fonte única da navegação do painel. A barra lateral,
//  a doca do telemóvel, a linha de secção e a paleta de pesquisa leem TODAS
//  daqui — e é isso que impede a divergência que já aconteceu no site:
//  duas barras com o mesmo nome a apontar para rotas diferentes, e só uma
//  delas a acender.
//
//  ── O QUE MUDOU, E PORQUÊ
//
//  Havia dez destinos numa lista plana. Dez não se arrumam na cabeça de
//  ninguém, e no telemóvel nem no ecrã cabiam: a doca rolava na horizontal
//  e o destino activo tinha de ser trazido ao centro por JavaScript. Uma
//  barra de navegação que precisa de `scrollIntoView` para se explicar não
//  é uma barra de navegação — é uma lista com um penso.
//
//  Três pares estavam separados na navegação e juntos nos dados:
//
//    · Clientes ↔ Partilhas — uma partilha é o que AQUELE cliente enviou.
//      A ficha do cliente já mostrava os envios e já tinha um link para as
//      Partilhas; a navegação é que dizia que eram assuntos diferentes.
//    · Recebimentos ↔ Progressão — o patamar da progressão É a comissão
//      que sai de cada recebimento. `pagamentos/page.tsx` lê a progressão
//      para conseguir escrever a sua própria linha da comissão.
//    · Casos ↔ Tarefas — casos é trabalho por propor, tarefas é trabalho
//      por entregar. A paleta já tratava os dois como «o que espera por ti».
//
//  E dois eixos mentais estavam misturados na mesma lista: o trabalho
//  SOBRE clientes e o negócio DO PRÓPRIO contabilista.
//
//  ── O QUE NÃO MUDOU, E É O PONTO
//
//  Nenhuma rota foi apagada, movida ou renomeada. As dez páginas continuam
//  nos mesmos ficheiros e nos mesmos endereços: quem tinha um marcador
//  em `/contabilista/progressao` continua a chegar lá, o espelho de
//  demonstração em `/admin/contabilista/*` continua a ser o mesmo módulo
//  re-exportado, e a paleta continua a indexar as dez folhas — agora com
//  o nome da secção como alias, portanto procurar «negócio» encontra as
//  três de dentro. Agrupar é uma decisão de NAVEGAÇÃO, e agrupar sem
//  esconder é a única forma de não perder nada.
// ═══════════════════════════════════════════════════════════════════════

import type { ComponentType } from "react";
import {
  Award, BookOpen, Briefcase, Calendar, Gift, Invoice, LayoutGrid, PaperClip,
  Settings, Target, User, Wallet,
} from "@/components/ui/Icons";

/** O que espera por resposta, por domínio. Vem de `contagensDoPainel`. */
export interface ContagensDoPainel {
  pedidos: number;
  partilhasPorLer: number;
  consultasPorConfirmar: number;
}

export const SEM_CONTAGENS: ContagensDoPainel = {
  pedidos: 0,
  partilhasPorLer: 0,
  consultasPorConfirmar: 0,
};

export type IconePainel = ComponentType<{ size?: number; className?: string }>;

/** Uma página do painel. É sempre uma rota real — nunca um separador. */
export interface DestinoDoPainel {
  href: string;
  label: string;
  /** Para a doca do telemóvel, onde o rótulo tem de caber em ~4 rem. */
  curto: string;
  Icon: IconePainel;
  /**
   * Uma linha a dizer o que ali se resolve.
   *
   * Serve a paleta de pesquisa: um resultado «Fidelidade» sem mais nada
   * obriga a abrir para saber se é aquilo que se procura. Com a linha, a
   * decisão faz-se na lista.
   */
  descricao: string;
  /** Quantas coisas esperam por resposta neste destino. */
  porResponder?: (c: ContagensDoPainel) => number;
}

/** Um grupo de destinos que se responde à mesma pergunta. */
export interface SeccaoDoPainel {
  id: string;
  label: string;
  /** Para a doca do telemóvel. */
  curto: string;
  Icon: IconePainel;
  /** O que esta secção resolve, numa frase. Lido pela paleta e por `aria`. */
  descricao: string;
  destinos: readonly DestinoDoPainel[];
}

/**
 * As seis secções.
 *
 * A ordem é a do dia de trabalho: primeiro o resumo, depois as pessoas,
 * depois o que se lhes faz, depois o tempo, depois o negócio próprio, e no
 * fim a presença pública — que se edita uma vez por mês, não uma vez por
 * hora.
 */
export const SECCOES: readonly SeccaoDoPainel[] = [
  {
    id: "hoje",
    label: "Hoje",
    curto: "Hoje",
    Icon: LayoutGrid,
    descricao: "O painel que compões: vistas e módulos com o estado de agora.",
    destinos: [
      {
        href: "/contabilista",
        label: "Hoje",
        curto: "Hoje",
        Icon: LayoutGrid,
        descricao: "As tuas vistas e módulos, com o estado de agora.",
      },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    curto: "Clientes",
    Icon: User,
    descricao: "As pessoas que acompanhas e o que elas te enviaram.",
    destinos: [
      {
        href: "/contabilista/clientes",
        label: "Clientes",
        curto: "Lista",
        Icon: User,
        descricao: "Quem acompanhas, com a ficha completa de cada pessoa.",
        porResponder: (c) => c.pedidos,
      },
      {
        href: "/contabilista/partilhas",
        label: "Partilhas",
        curto: "Partilhas",
        Icon: PaperClip,
        descricao: "Simulações que os clientes escolheram enviar-te.",
        porResponder: (c) => c.partilhasPorLer,
      },
      {
        // Um dossiê não é uma simulação: é o caso de alguém, projetado a
        // partir de um guia, com a base legal e os elementos por reunir. A
        // consola é outra — seleciona-se, extrai-se e pede-se — e por isso
        // tem porta própria.
        href: "/contabilista/dossies",
        label: "Dossiês de guia",
        curto: "Dossiês",
        Icon: BookOpen,
        descricao: "Casos que os clientes prepararam a partir de um guia.",
      },
    ],
  },
  {
    id: "trabalho",
    label: "Trabalho",
    curto: "Trabalho",
    Icon: Briefcase,
    descricao: "O que está por propor e o que está por entregar.",
    destinos: [
      {
        href: "/contabilista/casos",
        label: "Casos",
        curto: "Casos",
        Icon: Briefcase,
        descricao: "Pedidos encaminhados a que respondes com uma proposta.",
      },
      {
        href: "/contabilista/trabalho",
        label: "Tarefas",
        curto: "Tarefas",
        Icon: Target,
        descricao: "O quadro: por tratar, a fazer, à espera do cliente, entregue.",
      },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    curto: "Agenda",
    Icon: Calendar,
    descricao: "As consultas marcadas e os horários que publicas.",
    destinos: [
      {
        href: "/contabilista/agenda",
        label: "Agenda",
        curto: "Agenda",
        Icon: Calendar,
        descricao: "Consultas por confirmar, semana, mês e semana-tipo.",
        porResponder: (c) => c.consultasPorConfirmar,
      },
    ],
  },
  {
    id: "negocio",
    label: "Negócio",
    curto: "Negócio",
    Icon: Wallet,
    descricao: "O dinheiro que entra, o que fideliza, e o que baixa a comissão.",
    destinos: [
      {
        href: "/contabilista/pagamentos",
        label: "Recebimentos",
        curto: "Recebo",
        Icon: Invoice,
        descricao: "Onde o dinheiro das consultas cai, e o que já lá caiu.",
      },
      {
        href: "/contabilista/fidelidade",
        label: "Fidelidade",
        curto: "Fidelidade",
        Icon: Gift,
        descricao: "A regra do cartão, os cartões em curso e os benefícios emitidos.",
      },
      {
        href: "/contabilista/progressao",
        label: "Progressão",
        curto: "Progressão",
        Icon: Award,
        descricao: "O teu patamar, a comissão de agora e o que falta para a próxima.",
      },
    ],
  },
  {
    id: "perfil",
    label: "Perfil",
    curto: "Perfil",
    Icon: Settings,
    descricao: "A tua presença pública e as definições da conta.",
    destinos: [
      {
        href: "/contabilista/perfil",
        label: "Perfil",
        curto: "Perfil",
        Icon: Settings,
        descricao: "Apresentação, áreas, tipos de consulta, LinkedIn e recebimentos.",
      },
    ],
  },
];

/** As dez folhas, achatadas. É isto que a paleta de pesquisa indexa. */
export const DESTINOS: readonly DestinoDoPainel[] = SECCOES.flatMap((s) => s.destinos);

/**
 * Onde uma secção aterra quando se carrega nela.
 *
 * É sempre o primeiro destino — nunca uma página-índice inventada. Uma
 * secção que abrisse num ecrã de escolha punha um clique entre a pessoa e
 * o trabalho, todas as vezes.
 */
export function hrefDaSeccao(seccao: SeccaoDoPainel): string {
  return seccao.destinos[0].href;
}

/** Quantas coisas esperam por resposta em toda a secção. */
export function porResponderNaSeccao(
  seccao: SeccaoDoPainel,
  contagens: ContagensDoPainel,
): number {
  return seccao.destinos.reduce((total, d) => total + (d.porResponder?.(contagens) ?? 0), 0);
}

/**
 * Este destino é o que está aberto?
 *
 * A raiz do painel compara-se por igualdade e o resto por prefixo: sem
 * isso, `/contabilista` seria prefixo de tudo e o «Hoje» acendia em todos
 * os ecrãs. O `base` é o do painel onde a pessoa está — o real ou o da
 * demonstração —, porque a comparação é feita já depois de `painel.href`.
 */
export function destinoAtivo(destinoResolvido: string, pathname: string, base: string): boolean {
  return destinoResolvido === base
    ? pathname === destinoResolvido
    : pathname === destinoResolvido || pathname.startsWith(`${destinoResolvido}/`);
}

/**
 * A secção onde este caminho vive.
 *
 * `resolver` traduz o endereço escrito («/contabilista/casos») para a base
 * onde o painel está aberto, que na demonstração é outra. Devolve
 * `undefined` para um caminho que não seja de nenhum destino — e quem
 * chama tem de aguentar isso sem partir, porque as fichas de cliente
 * (`/contabilista/clientes/<id>`) entram aqui pelo prefixo mas uma rota
 * futura pode não entrar.
 */
export function seccaoDoCaminho(
  pathname: string,
  base: string,
  resolver: (destino: string) => string,
): SeccaoDoPainel | undefined {
  return SECCOES.find((s) =>
    s.destinos.some((d) => destinoAtivo(resolver(d.href), pathname, base)),
  );
}
