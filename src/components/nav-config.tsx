// Estrutura de navegação partilhada entre o header de desktop (Nav.tsx) e o
// chrome inferior do telemóvel (ChromeMobile.tsx). Uma só fonte para os dois,
// para que o menu do telemóvel tenha exatamente o que há no header normal.

import {
  Calculator,
  Search,
  MapPin,
  Briefcase,
  BookOpen,
  Trophy,
  BellAlert,
  Scale,
} from "@/components/ui/Icons";
import { FERRAMENTA_SLUGS } from "@/lib/seo";

export interface NavItem {
  label: string;
  desc: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const NAV_FERRAMENTAS: NavItem[] = [
  {
    label: "Simuladores",
    desc: "IRS, recibos verdes, vencimento e empresa.",
    href: "/#calculadora",
    Icon: Calculator,
  },
  {
    label: "Heranças e sucessões",
    desc: "Partilha e Imposto do Selo — a família é isenta.",
    href: "/ferramentas/simulador-herancas",
    Icon: Scale,
  },
  {
    label: "Classificar atividade",
    desc: "Retenção, coeficiente e SS por profissão.",
    href: "/ferramentas/classificar-atividade",
    Icon: Search,
  },
  {
    label: "Mapa de preços por região",
    desc: "Contabilistas, notários e advogados.",
    href: "/ferramentas/mapa-contabilistas",
    Icon: MapPin,
  },
  {
    label: "Todas as ferramentas",
    desc: `${FERRAMENTA_SLUGS.length} ferramentas e simuladores num só sítio.`,
    href: "/ferramentas",
    Icon: Briefcase,
  },
];

/**
 * Os ÂMBITOS do cabeçalho — a linha por cima da barra de pesquisa.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ISTO NÃO É UM MENU AO LADO DA PESQUISA — É O ÂMBITO DELA                 │
 * │                                                                         │
 * │ A diferença é toda. Um menu leva a outra página e a pesquisa fica na     │
 * │ mesma; um âmbito muda O QUE a barra por baixo procura. Aqui é as duas    │
 * │ coisas ao mesmo tempo, e de propósito: cada item é uma ligação a sério   │
 * │ — funciona sem JavaScript, abre noutro separador com `⌘+clique`, entra   │
 * │ no histórico — e a barra segue o destino porque a categoria é DEDUZIDA   │
 * │ da rota (`categoriaPorContexto`), não guardada num estado à parte.       │
 * │                                                                         │
 * │ Uma segunda memória — «o âmbito escolhido no cabeçalho» — divergiria da  │
 * │ rota na primeira navegação que não passasse por aqui: um link no corpo   │
 * │ da página, o botão «voltar», uma partilha. A rota é a única verdade que  │
 * │ todos os caminhos já actualizam.                                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ O QUE ACONTECEU AO MENU «RECURSOS FISCAIS»                               │
 * │                                                                         │
 * │ Era um mega-dropdown de nove destinos que abria ao passar o rato. Sai da │
 * │ barra, e nenhum dos nove se perde: passam todos para o painel de         │
 * │ pesquisa, que está permanentemente a um clique e — ao contrário de um    │
 * │ menu — é pesquisável, navegável por teclado e alcançável no telemóvel.   │
 * │                                                                         │
 * │ Um menu que só abre com `hover` é, na prática, invisível para quem usa   │
 * │ toque. Trocá-lo por um painel de pesquisa não é perder navegação: é      │
 * │ deixar de a esconder atrás de um gesto que metade dos dispositivos não   │
 * │ tem.                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface AmbitoHeader {
  label: string;
  href: string;
  /** Prefixos de rota que acendem este item. O primeiro que casar ganha. */
  prefixos: string[];
}

export const NAV_AMBITOS: AmbitoHeader[] = [
  { label: "Simuladores", href: "/#calculadora", prefixos: [] },
  { label: "Guias", href: "/guias", prefixos: ["/guias", "/quiz-fiscal"] },
  {
    label: "Atividades",
    href: "/ferramentas/classificar-atividade",
    prefixos: ["/ferramentas/classificar-atividade", "/dashboard/classificar-atividade"],
  },
  { label: "Ferramentas", href: "/ferramentas", prefixos: ["/ferramentas"] },
  { label: "Planos", href: "/precos", prefixos: ["/precos"] },
];

/**
 * Qual dos âmbitos está aceso — e é sempre UM, no máximo.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO É UMA FUNÇÃO E NÃO UM TESTE POR ITEM                         │
 * │                                                                         │
 * │ A versão anterior perguntava a cada item, em separado, se a rota lhe     │
 * │ pertencia. Em `/ferramentas/classificar-atividade` respondiam DOIS que   │
 * │ sim — «Atividades», pelo prefixo completo, e «Ferramentas», porque a     │
 * │ rota também começa por `/ferramentas`. O cabeçalho marcava duas páginas  │
 * │ ao mesmo tempo, e dois `aria-current="page"` no mesmo documento dizem a  │
 * │ um leitor de ecrã que a pessoa está em dois sítios.                      │
 * │                                                                         │
 * │ Decidir de uma vez, pela ORDEM da lista, resolve por construção: o mais  │
 * │ específico está primeiro e ganha. E como é uma função, o teste verifica  │
 * │ exactamente o que o cabeçalho executa — não uma segunda regra parecida.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export function ambitoAtivo(pathname: string | null | undefined): AmbitoHeader | null {
  if (!pathname) return null;
  const comPrefixo = NAV_AMBITOS.find(
    (a) => a.prefixos.length > 0 && a.prefixos.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
  );
  if (comPrefixo) return comPrefixo;
  // A lista vazia é a página inicial: não tem prefixo porque `/` seria prefixo
  // de tudo. Só acende quando a rota é exactamente a raiz.
  return pathname === "/" ? (NAV_AMBITOS.find((a) => a.prefixos.length === 0) ?? null) : null;
}

export const NAV_APRENDER: NavItem[] = [
  {
    label: "Simulador de IRS",
    desc: "Página dedicada: calcula o teu IRS anual de 2026.",
    href: "/ferramentas/simulador-irs",
    Icon: Calculator,
  },
  {
    label: "Guias fiscais",
    desc: "Passo a passo para cada obrigação.",
    href: "/guias",
    Icon: BookOpen,
  },
  {
    label: "Quiz Fiscal",
    desc: "Testa os teus conhecimentos com base legal.",
    href: "/quiz-fiscal",
    Icon: Trophy,
  },
  {
    label: "Calendário fiscal",
    desc: "Todas as datas de entrega, num só sítio.",
    href: "/dashboard/prazos",
    Icon: BellAlert,
  },
];
