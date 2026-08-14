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
// A contagem vem do catálogo das ferramentas e NÃO de `seo.ts`: esse
// importa os manifestos dos guias para montar o sitemap, e o cabeçalho
// passaria a arrastar as 169 fichas editoriais para o bundle inicial de
// todas as páginas públicas — para escrever um número.
// Coberto por `busca-fronteira.test.ts`.
import { TOTAL_FERRAMENTAS } from "@/lib/ferramentas";

// A contagem deriva do catálogo (§2.3): conta ferramentas reais, não cartões.
const N_FERRAMENTAS = TOTAL_FERRAMENTAS;

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
    desc: `${N_FERRAMENTAS} ferramentas e simuladores num só sítio.`,
    href: "/ferramentas",
    Icon: Briefcase,
  },
];

/**
 * A NAVEGAÇÃO PRINCIPAL do cabeçalho.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ISTO É NAVEGAÇÃO. NÃO É O ÂMBITO DA PESQUISA — E ERA (P1-01)             │
 * │                                                                         │
 * │ A lista anterior chamava-se `NAV_AMBITOS` e prometia duas coisas com um  │
 * │ elemento: levar a uma página E mudar o que a barra por baixo procura. A  │
 * │ promessa cumpria-se em dois dos quatro itens:                            │
 * │                                                                         │
 * │   /guias                        → âmbito «guias»       ✓                 │
 * │   /ferramentas/classificar…     → âmbito «atividades»  ✓                 │
 * │   /quiz-fiscal                  → âmbito «ferramentas» ✗                 │
 * │   /precos                       → âmbito «ferramentas» ✗                 │
 * │                                                                         │
 * │ «Quiz» e «Planos» PARECIAM âmbitos e não mudavam corpus nenhum. No       │
 * │ telemóvel era pior: abrir a pesquisa em Quiz anunciava «Ferramentas».    │
 * │                                                                         │
 * │ Passam a ser contratos separados, porque respondem a perguntas           │
 * │ diferentes: a navegação responde a «onde estou?», e a intenção da        │
 * │ pesquisa (`INTENCOES`, em `lib/busca/esquema.ts`) responde a «o que      │
 * │ preciso de resolver?». Não devem partilhar estado por acidente.          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ O QUE ACONTECEU AO MENU «RECURSOS FISCAIS»                               │
 * │                                                                         │
 * │ Era um mega-dropdown de nove destinos que abria ao passar o rato. Sai da │
 * │ barra, e nenhum dos nove se perde: estão todos no índice de pesquisa,    │
 * │ que está permanentemente a um clique e — ao contrário de um menu — é     │
 * │ pesquisável, navegável por teclado e alcançável no telemóvel.            │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface NavPrincipalItem {
  label: string;
  href: string;
  /** Prefixos de rota que acendem este item. O primeiro que casar ganha. */
  prefixos: string[];
}

export const NAV_PRINCIPAL: NavPrincipalItem[] = [
  // `/ferramentas` e não `/#calculadora`: o item acende agora em TODAS as
  // páginas de ferramenta. Antes só acendia na raiz exacta, e as dez páginas
  // de `/ferramentas/...` ficavam sem indicador nenhum de onde se estava.
  { label: "Simular", href: "/ferramentas", prefixos: ["/ferramentas"] },
  { label: "Guias", href: "/guias", prefixos: ["/guias"] },
  { label: "Quiz", href: "/quiz-fiscal", prefixos: ["/quiz-fiscal"] },
  { label: "Planos", href: "/precos", prefixos: ["/precos"] },
  // O diretório de contabilistas entra na barra, e não num menu, porque é a
  // única coisa aqui que acaba com uma PESSOA do outro lado — ligar-se,
  // marcar consulta, enviar uma simulação. Nenhuma dessas exige plano pago,
  // e esconder isso atrás de «Planos» dava a entender o contrário.
  //
  // `/contabilistas` e não `/contabilista`: o painel de gestão vive no
  // singular e não acende este item (o prefixo casa na rota exacta ou no
  // separador — ver `navAtivo`).
  { label: "Contabilistas", href: "/contabilistas", prefixos: ["/contabilistas"] },
];

/**
 * Qual dos itens está aceso — e é sempre UM, no máximo.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO É UMA FUNÇÃO E NÃO UM TESTE POR ITEM                         │
 * │                                                                         │
 * │ A versão anterior perguntava a cada item, em separado, se a rota lhe     │
 * │ pertencia. Em `/ferramentas/classificar-atividade` respondiam DOIS que   │
 * │ sim, e dois `aria-current="page"` no mesmo documento dizem a um leitor   │
 * │ de ecrã que a pessoa está em dois sítios.                                │
 * │                                                                         │
 * │ Decidir de uma vez, pela ORDEM da lista, resolve por construção: o mais  │
 * │ específico está primeiro e ganha. E como é uma função, o teste verifica  │
 * │ exactamente o que o cabeçalho executa — não uma segunda regra parecida.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export function navAtivo(pathname: string | null | undefined): NavPrincipalItem | null {
  if (!pathname) return null;
  return (
    NAV_PRINCIPAL.find((a) => a.prefixos.some((p) => pathname === p || pathname.startsWith(`${p}/`))) ?? null
  );
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
