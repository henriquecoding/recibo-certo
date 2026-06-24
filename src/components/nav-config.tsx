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
} from "@/components/ui/Icons";

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
    href: "/dashboard/simulador",
    Icon: Calculator,
  },
  {
    label: "Classificar atividade",
    desc: "Retenção, coeficiente e SS por profissão.",
    href: "/dashboard/classificar-atividade",
    Icon: Search,
  },
  {
    label: "Mapa de contabilistas",
    desc: "Preço médio por região, num mapa.",
    href: "/dashboard/mapa-contabilistas",
    Icon: MapPin,
  },
  {
    label: "Todas as ferramentas",
    desc: "12 simuladores e ferramentas num só sítio.",
    href: "/ferramentas",
    Icon: Briefcase,
  },
];

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
    label: "Alertas de prazos",
    desc: "Nunca mais percas uma data fiscal.",
    href: "/dashboard/prazos",
    Icon: BellAlert,
  },
];
