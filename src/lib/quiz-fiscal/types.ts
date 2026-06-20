import { SOURCES, type SourceKey } from "../fiscal-data";

export type QuizCategoria =
  | "retencao"
  | "iva"
  | "seguranca_social"
  | "regime_simplificado"
  | "irs_jovem"
  | "escaloes_deducoes"
  | "atividades"
  | "categoria_f"
  | "prazos"
  | "geral"
  // ── Categoria A — trabalho dependente (por conta de outrem) ──
  | "dep_irs"
  | "dep_ss"
  | "dep_subsidios"
  // ── Empresas — sociedades e tributação ──
  | "empresa_criacao"
  | "empresa_legislacao"
  | "empresa_fiscalidade";

/** Agrupamento temático das categorias (organiza o ecrã de seleção). */
export type QuizGrupo = "independente" | "dependente" | "empresa";

export const META_GRUPO_QUIZ: Record<QuizGrupo, { label: string; descricao: string }> = {
  independente: {
    label: "Trabalho Independente",
    descricao: "Recibos verdes — Categoria B",
  },
  dependente: {
    label: "Trabalho Dependente",
    descricao: "Recibo de vencimento — Categoria A",
  },
  empresa: {
    label: "Empresas",
    descricao: "Sociedades, constituição e tributação",
  },
};

export interface QuizFonte {
  label: string;
  url: string;
}

export interface QuizOpcao {
  texto: string;
  porque: string;
}

export interface QuizPergunta {
  id: string;
  categoria: QuizCategoria;
  dificuldade: 1 | 2 | 3;
  pergunta: string;
  opcoes: QuizOpcao[];
  correta: number;
  legalBasis: string;
  fonte: QuizFonte;
}

export function fonte(key: SourceKey): QuizFonte {
  const s = SOURCES[key];
  return { label: s.label, url: s.url };
}

export const META_CATEGORIA_QUIZ: Record<
  QuizCategoria,
  { label: string; descricao: string; icon: string; grupo: QuizGrupo }
> = {
  retencao: {
    label: "Retenção na Fonte",
    descricao: "Taxas de retenção de IRS sobre recibos verdes (Art. 101.º CIRS)",
    icon: "Wallet",
    grupo: "independente",
  },
  iva: {
    label: "IVA",
    descricao: "Isenção (Art. 53.º) e taxas por região (Art. 18.º CIVA)",
    icon: "Scale",
    grupo: "independente",
  },
  seguranca_social: {
    label: "Segurança Social",
    descricao: "Taxas, bases de incidência e isenções para independentes",
    icon: "ShieldCheck",
    grupo: "independente",
  },
  regime_simplificado: {
    label: "Regime Simplificado",
    descricao: "Coeficientes e regras do Art. 31.º CIRS",
    icon: "ChartProjection",
    grupo: "independente",
  },
  irs_jovem: {
    label: "IRS Jovem",
    descricao: "Isenções progressivas para jovens até 35 anos",
    icon: "Sparkle",
    grupo: "independente",
  },
  escaloes_deducoes: {
    label: "Escalões e Deduções",
    descricao: "Escalões de IRS, dedução específica e deduções à coleta",
    icon: "Bank",
    grupo: "independente",
  },
  atividades: {
    label: "Classificação de Atividades",
    descricao: "Tabela do Art. 151.º CIRS e outros enquadramentos",
    icon: "Briefcase",
    grupo: "independente",
  },
  categoria_f: {
    label: "Rendimentos Prediais",
    descricao: "Categoria F — arrendamento (Art. 72.º CIRS)",
    icon: "Home",
    grupo: "independente",
  },
  prazos: {
    label: "Prazos e Obrigações",
    descricao: "Datas-limite fiscais e contributivas",
    icon: "Calendar",
    grupo: "independente",
  },
  geral: {
    label: "Conceitos Gerais",
    descricao: "Fundamentos do regime de trabalhador independente",
    icon: "FileSign",
    grupo: "independente",
  },

  // ── Categoria A — trabalho dependente ──
  dep_irs: {
    label: "IRS no Salário",
    descricao: "Retenção na fonte do vencimento (tabelas 2026, Tabela I, Continente)",
    icon: "Receipt",
    grupo: "dependente",
  },
  dep_ss: {
    label: "Segurança Social (TSU)",
    descricao: "11% do trabalhador e 23,75% da entidade empregadora",
    icon: "ShieldCheck",
    grupo: "dependente",
  },
  dep_subsidios: {
    label: "Subsídios e Abonos",
    descricao: "Refeição, férias/Natal, ajudas de custo e trabalho suplementar",
    icon: "Wallet",
    grupo: "dependente",
  },

  // ── Empresas ──
  empresa_criacao: {
    label: "Criar Empresa",
    descricao: "Constituição, Empresa na Hora, capital social e formas jurídicas",
    icon: "Building",
    grupo: "empresa",
  },
  empresa_legislacao: {
    label: "Legislação & Sociedades",
    descricao: "Tipos de sociedade, órgãos sociais e responsabilidade (CSC)",
    icon: "Scale",
    grupo: "empresa",
  },
  empresa_fiscalidade: {
    label: "IRC & Tributação",
    descricao: "IRC, derrama, dividendos, tributação autónoma e benefícios fiscais",
    icon: "Calculator",
    grupo: "empresa",
  },
};
