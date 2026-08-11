// ─────────────────────────────────────────────────────────────────────────
//  Fonte única das ferramentas públicas — consumida pelo hub /ferramentas,
//  pela secção "Ferramentas" da homepage, pelo layout de breadcrumbs e pelos
//  testes de consistência (ecossistema.test.ts garante o espelho com
//  FERRAMENTA_SLUGS do seo.ts). Dados puros: sem "use client", sem motores
//  fiscais — só metadados de páginas que existem.
// ─────────────────────────────────────────────────────────────────────────

import {
  Calculator, Receipt, Search, Wallet, Sparkle, Building, User, Scale,
  ShieldCheck, MapPin,
} from "@/components/ui/Icons";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import type { Perfil } from "@/lib/perfil";
import type { Intencao, PerfilBusca, TipoDoc } from "@/lib/busca/esquema";

export type IconType = React.ComponentType<{ size?: number; className?: string }>;

/**
 * Metadados que SÓ a pesquisa usa.
 *
 * Vivem aqui, ao lado da ferramenta, e não numa segunda lista no índice de
 * pesquisa. Era essa segunda lista — escrita à mão, com 14 guias contra os
 * 167 publicados — que a auditoria do cabeçalho apanhou no ponto P0-01: um
 * catálogo paralelo não diverge com estrondo, diverge em silêncio.
 */
export interface BuscaMeta {
  /** Linguagem comum e erros frequentes de quem procura esta ferramenta. */
  aliases: string[];
  /** O que a pessoa vem cá fazer. Ver `src/lib/busca/esquema.ts`. */
  intencoes: Intencao[];
  perfis: PerfilBusca[];
  /** Desempate estável entre resultados semelhantes (0–100). */
  prioridade: number;
  /** Família apresentada no resultado. */
  grupo: string;
  /** Tipo do documento gerado — por omissão, `ferramenta`. */
  tipo?: TipoDoc;
}

export interface FerramentaMeta {
  /** Slug em FERRAMENTA_SLUGS (seo.ts); vazio nos cartões só-hub (comparador, quiz). */
  slug: string;
  href: string;
  titulo: string;
  descricao: string;
  Icon: IconType;
  badge: string;
  /** Cartões que só aparecem no hub /ferramentas (não na secção da homepage). */
  soHub?: boolean;
  /** Presente em todas: é o que alimenta o índice de pesquisa. */
  busca: BuscaMeta;
}

export const FERRAMENTAS: FerramentaMeta[] = [
  {
    slug: "simulador-irs",
    href: "/ferramentas/simulador-irs",
    titulo: "Simulador de IRS anual",
    descricao:
      "O IRS de 2026 completo: todas as categorias e anexos (A, B, E, F, G, H e J), tributação conjunta e memória de cálculo — do rendimento ao reembolso.",
    Icon: Calculator,
    badge: "O mais completo",
    busca: {
      aliases: ["irs", "simulador irs", "irs anual", "reembolso irs", "acerto de irs", "declaração de irs", "englobamento"],
      intencoes: ["simular", "cumprir"],
      perfis: ["todos"],
      prioridade: 95,
      grupo: "Simuladores",
    },
  },
  {
    slug: "recibo-vencimento",
    href: "/ferramentas/recibo-vencimento",
    titulo: "Simulador de recibo de vencimento",
    descricao:
      "Por conta de outrem? Do salário bruto ao líquido — IRS retido, Segurança Social e subsídio de refeição, com as tabelas oficiais de 2026.",
    Icon: User,
    badge: "Simulador",
    busca: {
      aliases: ["recibo de vencimento", "salário líquido", "bruto para líquido", "ordenado", "conta de outrem", "subsídio de refeição", "categoria a"],
      intencoes: ["simular"],
      perfis: ["dependente"],
      prioridade: 90,
      grupo: "Simuladores",
    },
  },
  {
    slug: "auditoria-recibo",
    href: "/ferramentas/auditoria-recibo",
    titulo: "Auditoria do recibo de vencimento",
    descricao:
      "Introduz os valores do teu recibo e descobre se a entidade aplicou bem o IRS e a Segurança Social de 2026. Deteta erros a teu favor.",
    Icon: ShieldCheck,
    badge: "Plus",
    busca: {
      aliases: ["auditar recibo", "erro no recibo", "recibo errado", "desconto errado", "verificar recibo de vencimento"],
      intencoes: ["simular", "cumprir"],
      perfis: ["dependente"],
      prioridade: 75,
      grupo: "Ferramentas",
    },
  },
  {
    slug: "mapa-contabilistas",
    href: "/ferramentas/mapa-contabilistas",
    titulo: "Mapa de preços por região",
    descricao:
      "Contabilistas, notários e advogados: quanto custam na tua região, num único mapa com filtros — incluindo os benefícios fiscais de cada zona do país.",
    Icon: MapPin,
    badge: "Mapa",
    busca: {
      aliases: ["contabilista", "quanto custa um contabilista", "avença", "notário", "advogado", "honorários", "escritura", "procuração"],
      intencoes: ["compreender", "cumprir"],
      perfis: ["todos"],
      prioridade: 70,
      grupo: "Ferramentas",
    },
  },
  {
    slug: "",
    href: "/?modo=comparar",
    titulo: "Recibos verdes, contrato ou empresa?",
    descricao:
      "Para o mesmo rendimento anual, compara o líquido como trabalhador por conta de outrem, em recibos verdes ou através de uma empresa (IRC + dividendos), com o ponto de viragem e o calendário fiscal.",
    Icon: Scale,
    badge: "Comparador",
    soHub: true,
    busca: {
      aliases: ["comparar", "comparador", "recibos verdes ou contrato", "compensa abrir empresa", "ponto de viragem", "contrato vs recibos verdes"],
      intencoes: ["simular", "compreender"],
      perfis: ["todos"],
      prioridade: 92,
      grupo: "Simuladores",
    },
  },
  {
    slug: "ato-isolado",
    href: "/ferramentas/ato-isolado",
    titulo: "Ato isolado ou atividade?",
    descricao:
      "Responde a 4 perguntas simples e fica a saber se deves emitir um ato isolado ou abrir atividade nas Finanças.",
    Icon: Receipt,
    badge: "Decisor",
    busca: {
      aliases: ["ato isolado", "acto isolado", "abrir atividade ou não", "recibo único", "trabalho pontual"],
      intencoes: ["compreender", "cumprir"],
      perfis: ["independente"],
      prioridade: 72,
      grupo: "Decisores",
    },
  },
  {
    slug: "regime-simplificado",
    href: "/ferramentas/regime-simplificado",
    titulo: "Calculadora de regime simplificado",
    descricao:
      "Insere a tua faturação e atividade. Calcula coeficiente, rendimento tributável, IRS estimado e taxa efetiva.",
    Icon: Calculator,
    badge: "Calculadora",
    busca: {
      aliases: ["regime simplificado", "coeficiente", "rendimento tributável", "taxa efetiva", "75%", "recibos verdes"],
      intencoes: ["simular"],
      perfis: ["independente"],
      prioridade: 85,
      grupo: "Simuladores",
    },
  },
  {
    slug: "classificar-atividade",
    href: "/ferramentas/classificar-atividade",
    titulo: "Classificar atividade fiscal",
    descricao:
      "Pesquisa a tua profissão e descobre a retenção na fonte, o coeficiente e a base de Segurança Social aplicável.",
    Icon: Search,
    badge: "Comparador",
    busca: {
      aliases: ["classificar atividade", "código de atividade", "cae", "art 151", "artigo 151", "profissão", "retenção por profissão"],
      intencoes: ["compreender", "cumprir"],
      perfis: ["independente"],
      prioridade: 80,
      grupo: "Ferramentas",
    },
  },
  {
    slug: "simulador-empresa",
    href: "/ferramentas/simulador-empresa",
    titulo: "Simulador de empresa (Lda)",
    descricao:
      "Simula o resultado líquido de abrir uma sociedade: IRC, dividendos, custos de operação e passos para constituição. Guiado e completo.",
    Icon: Building,
    badge: "Simulador",
    busca: {
      aliases: ["abrir empresa", "sociedade", "lda", "unipessoal", "irc", "dividendos", "derrama", "tributação autónoma"],
      intencoes: ["simular", "compreender"],
      perfis: ["empresa"],
      prioridade: 88,
      grupo: "Simuladores",
    },
  },
  {
    slug: "simulador-herancas",
    href: "/ferramentas/simulador-herancas",
    titulo: "Simulador de heranças e sucessões",
    descricao:
      "Quem herda o quê e quanto se paga de Imposto do Selo — a família direta é isenta. Meação, legítima e quota disponível, partilha e comparação herança vs doação. Guiado e completo.",
    Icon: Scale,
    badge: "Simulador",
    busca: {
      aliases: ["heranças", "herança", "doações", "doação", "imposto do selo", "partilha", "legítima", "meação", "herdar casa"],
      intencoes: ["simular", "compreender"],
      perfis: ["todos"],
      prioridade: 74,
      grupo: "Simuladores",
    },
  },
  {
    slug: "payout-mor",
    href: "/ferramentas/payout-mor",
    titulo: "Wizard recibo Merchant of Record",
    descricao:
      "Configura o recibo verde para payout do Paddle ou Lemon Squeezy em 5 passos. IVA, retenção e NIF preenchidos.",
    Icon: Wallet,
    badge: "Wizard",
    busca: {
      aliases: ["merchant of record", "mor", "paddle", "lemon squeezy", "payout", "recibo para plataforma"],
      intencoes: ["cumprir", "simular"],
      perfis: ["independente"],
      prioridade: 60,
      grupo: "Ferramentas",
    },
  },
  {
    slug: "",
    href: "/quiz-fiscal",
    titulo: "Quiz Fiscal",
    descricao: `${TOTAL_PERGUNTAS_META.toLocaleString("pt-PT")} perguntas sobre IRS, IVA, Segurança Social e mais — com base legal e fontes oficiais. Testa os teus conhecimentos.`,
    Icon: Sparkle,
    badge: "Quiz",
    soHub: true,
    busca: {
      aliases: ["quiz", "quiz fiscal", "perguntas", "testar conhecimentos", "treinar"],
      intencoes: ["compreender"],
      perfis: ["todos"],
      prioridade: 55,
      grupo: "Aprender",
      tipo: "quiz",
    },
  },
];

/** A ferramenta em destaque na homepage, por perfil (curadoria explícita). */
export const DESTAQUE_POR_PERFIL: Record<Perfil, string> = {
  independente: "classificar-atividade",
  dependente: "recibo-vencimento",
  empresa: "simulador-empresa",
  comparar: "simulador-irs",
};

/** Os 4 cartões da grelha da homepage, por perfil (sem o destaque).
    Contagem constante por perfil → a secção não salta de altura na troca. */
export const ORDEM_POR_PERFIL: Record<Perfil, string[]> = {
  independente: ["regime-simplificado", "ato-isolado", "payout-mor", "simulador-herancas"],
  dependente: ["auditoria-recibo", "simulador-irs", "simulador-herancas", "ato-isolado"],
  empresa: ["mapa-contabilistas", "simulador-irs", "simulador-herancas", "regime-simplificado"],
  comparar: ["recibo-vencimento", "regime-simplificado", "simulador-empresa", "mapa-contabilistas"],
};

const porSlug = (slug: string): FerramentaMeta | undefined =>
  FERRAMENTAS.find((f) => f.slug === slug);

/** Destaque + grelha de um perfil, já resolvidos e na ordem curada. */
export function ferramentasPorPerfil(perfil: Perfil): {
  destaque: FerramentaMeta;
  restantes: FerramentaMeta[];
} {
  const destaque = porSlug(DESTAQUE_POR_PERFIL[perfil]) ?? FERRAMENTAS[0];
  const restantes = ORDEM_POR_PERFIL[perfil]
    .map(porSlug)
    .filter((f): f is FerramentaMeta => Boolean(f));
  return { destaque, restantes };
}
