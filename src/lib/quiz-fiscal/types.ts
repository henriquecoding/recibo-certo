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
  | "geral";

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
  { label: string; descricao: string; icon: string }
> = {
  retencao: {
    label: "Retenção na Fonte",
    descricao: "Taxas de retenção de IRS sobre recibos verdes (Art. 101.º CIRS)",
    icon: "Wallet",
  },
  iva: {
    label: "IVA",
    descricao: "Isenção (Art. 53.º) e taxas por região (Art. 18.º CIVA)",
    icon: "Scale",
  },
  seguranca_social: {
    label: "Segurança Social",
    descricao: "Taxas, bases de incidência e isenções para independentes",
    icon: "ShieldCheck",
  },
  regime_simplificado: {
    label: "Regime Simplificado",
    descricao: "Coeficientes e regras do Art. 31.º CIRS",
    icon: "ChartProjection",
  },
  irs_jovem: {
    label: "IRS Jovem",
    descricao: "Isenções progressivas para jovens até 35 anos",
    icon: "Sparkle",
  },
  escaloes_deducoes: {
    label: "Escalões e Deduções",
    descricao: "Escalões de IRS, dedução específica e deduções à coleta",
    icon: "Bank",
  },
  atividades: {
    label: "Classificação de Atividades",
    descricao: "Tabela do Art. 151.º CIRS e outros enquadramentos",
    icon: "Briefcase",
  },
  categoria_f: {
    label: "Rendimentos Prediais",
    descricao: "Categoria F — arrendamento (Art. 72.º CIRS)",
    icon: "Home",
  },
  prazos: {
    label: "Prazos e Obrigações",
    descricao: "Datas-limite fiscais e contributivas",
    icon: "Calendar",
  },
  geral: {
    label: "Conceitos Gerais",
    descricao: "Fundamentos do regime de trabalhador independente",
    icon: "FileSign",
  },
};
