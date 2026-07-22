// ─────────────────────────────────────────────────────────────────────
//  Preços de serviços profissionais por região — contabilistas, notários
//  e advogados — para o MAPA UNIFICADO (`src/components/mapa/MapaRegioes`).
//  ---------------------------------------------------------------------
//  IMPORTANTE: estes valores NÃO são dados fiscais. São duas famílias:
//   · «tabela» — valores regulados/oficiais (atos notariais tabelados,
//     balcões públicos como Casa Pronta e Balcão das Heranças), iguais em
//     todo o país;
//   · «estimativa» — ESTIMATIVAS DE MERCADO (honorários liberalizados de
//     contabilistas e advogados), recolhidas de fontes públicas de
//     referência (ver `fontes` de cada profissão) e sujeitas a variação
//     por gabinete, complexidade e negociação.
//
//  Metodologia regional (igual à de `contabilista-regioes.ts`): parte-se da
//  banda nacional verificada e aplica-se um fator regional de custo (centros
//  urbanos e metropolitanos tendem a praticar honorários mais altos). Os
//  notários são a exceção: os atos tabelados custam o mesmo em qualquer
//  cartório, pelo que a banda é NACIONAL (sem variação regional).
// ─────────────────────────────────────────────────────────────────────

import { REGIOES_PRECO, PRECOS_REGIOES_VERIFICADO } from "@/lib/contabilista-regioes";
import { TABELA_HONORARIOS } from "@/lib/contabilista";

/** Data da última verificação das bandas de preços (fontes públicas). */
export const PROFISSIONAIS_VERIFICADO = "2026-07-22";

export type ProfissaoId = "contabilistas" | "notarios" | "advogados";

/** Camadas do mapa unificado: as três profissões + benefícios fiscais. */
export type FiltroMapa = ProfissaoId | "beneficios";

export interface BandaPreco {
  min: number;
  max: number;
}

export interface ServicoProfissional {
  nome: string;
  detalhe: string;
  min: number;
  max: number;
  /** Sufixo da unidade ("": custo único · "/mês" · "/h"). */
  unidade: string;
  /** true = valor de tabela regulada/oficial; false = estimativa de mercado. */
  tabela: boolean;
}

export interface Profissao {
  id: ProfissaoId;
  /** Nome da camada (plural, para o filtro). */
  nome: string;
  /** Nome do profissional (para copy). */
  singular: string;
  /** O que a banda regional representa (rótulo da legenda e do painel). */
  indicador: string;
  /** Sufixo da banda regional ("/mês", "", …). */
  unidade: string;
  /** false = banda nacional única (ex.: notários — atos tabelados). */
  variacaoRegional: boolean;
  descricao: string;
  /** Ordem profissional onde validar o profissional antes de contratar. */
  ordem: { nome: string; url: string; nota: string };
  /** Passos de contratação segura (2–3, curtos). */
  comoEscolher: string[];
  /** Serviços/atos frequentes com preços (nacionais). */
  servicos: ServicoProfissional[];
  fontes: { label: string; url: string }[];
  /** Nota de rodapé sobre a natureza dos valores. */
  nota: string;
}

// ── Bandas regionais ─────────────────────────────────────────────────────────
//
// Contabilistas: reutiliza as estimativas existentes (avença mensal, NUTS II).
// Advogados: consulta jurídica — banda nacional verificada 50–150 € (média
//   ~75 €; mais alta em Lisboa/Porto, fonte Zaask/portoadvogado), com fator
//   regional dentro do envelope verificado.
// Notários: banda nacional única (honorários de escritura em cartório privado
//   150–500 €, fonte ComparaJá/Doutor Finanças) — atos tabelados não variam.

const BANDA_NOTARIOS: BandaPreco = { min: 150, max: 500 };

const BANDAS_ADVOGADOS: Record<string, BandaPreco> = {
  aml: { min: 60, max: 150 },
  norte: { min: 55, max: 130 },
  algarve: { min: 50, max: 120 },
  centro: { min: 45, max: 110 },
  madeira: { min: 45, max: 110 },
  acores: { min: 45, max: 110 },
  alentejo: { min: 40, max: 100 },
};

const BANDAS_CONTABILISTAS: Record<string, BandaPreco> = Object.fromEntries(
  REGIOES_PRECO.map((r) => [r.id, { min: r.min, max: r.max }])
);

const BANDAS_NOTARIOS: Record<string, BandaPreco> = Object.fromEntries(
  REGIOES_PRECO.map((r) => [r.id, BANDA_NOTARIOS])
);

export const BANDAS_REGIONAIS: Record<ProfissaoId, Record<string, BandaPreco>> = {
  contabilistas: BANDAS_CONTABILISTAS,
  notarios: BANDAS_NOTARIOS,
  advogados: BANDAS_ADVOGADOS,
};

/** Banda de uma profissão numa região (fallback: banda nacional agregada). */
export function bandaProfissao(prof: ProfissaoId, regiaoId: string): BandaPreco {
  return BANDAS_REGIONAIS[prof][regiaoId] ?? bandaNacional(prof);
}

/** Banda nacional agregada de uma profissão (mín dos mín, máx dos máx). */
export function bandaNacional(prof: ProfissaoId): BandaPreco {
  const bandas = Object.values(BANDAS_REGIONAIS[prof]);
  return {
    min: Math.min(...bandas.map((b) => b.min)),
    max: Math.max(...bandas.map((b) => b.max)),
  };
}

/**
 * Nível de preço 0–1 de uma região face às restantes (para a escala de cor).
 * Profissões sem variação regional devolvem sempre 0.55 (tom médio uniforme).
 */
export function nivelProfissao(prof: ProfissaoId, regiaoId: string): number {
  if (!PROFISSOES[prof].variacaoRegional) return 0.55;
  const bandas = BANDAS_REGIONAIS[prof];
  const medios = Object.values(bandas).map((b) => (b.min + b.max) / 2);
  const lo = Math.min(...medios);
  const hi = Math.max(...medios);
  if (hi === lo) return 0.55;
  const b = bandaProfissao(prof, regiaoId);
  return ((b.min + b.max) / 2 - lo) / (hi - lo);
}

// ── Perfis das profissões ────────────────────────────────────────────────────

export const PROFISSOES: Record<ProfissaoId, Profissao> = {
  contabilistas: {
    id: "contabilistas",
    nome: "Contabilistas",
    singular: "Contabilista Certificado",
    indicador: "Avença mensal",
    unidade: "/mês",
    variacaoRegional: true,
    descricao:
      "Avença mensal típica de um Contabilista Certificado para um trabalhador independente. Sociedades e contabilidade organizada custam mais.",
    ordem: {
      nome: "Ordem dos Contabilistas Certificados (OCC)",
      url: "https://www.occ.pt/pt-pt/registo-publico-dos-contabilistas-certificados-inscritos",
      nota: "Confirma que o contabilista está «Ativo» no registo público da OCC antes de contratar.",
    },
    comoEscolher: [
      "Valida o registo «Ativo» no diretório público da OCC.",
      "Formaliza contrato de prestação de serviços e confirma o seguro de responsabilidade civil.",
      "Compara pelo volume de documentos e complexidade (IVA, internacional) — as coimas custam mais do que meses de avença.",
    ],
    servicos: TABELA_HONORARIOS.map((p) => ({
      nome: p.perfil,
      detalhe: `${p.regime} · ${p.complexidade}`,
      min: p.min,
      max: p.max,
      unidade: p.pontual ? "" : "/mês",
      tabela: false,
    })),
    fontes: [
      {
        label: "OCC — registo público de Contabilistas Certificados",
        url: "https://www.occ.pt/pt-pt/registo-publico-dos-contabilistas-certificados-inscritos",
      },
    ],
    nota: "Honorários liberalizados — não há tabela oficial. Estimativas de mercado para clientes nacionais com poucos documentos.",
  },
  notarios: {
    id: "notarios",
    nome: "Notários",
    singular: "Notário",
    indicador: "Escritura de compra e venda (honorários)",
    unidade: "",
    variacaoRegional: false,
    descricao:
      "Grande parte dos atos notariais tem valor de tabela — custa o mesmo em qualquer cartório do país. As escrituras em cartório privado têm honorários variáveis.",
    ordem: {
      nome: "Ordem dos Notários",
      url: "https://www.notarios.pt",
      nota: "Confirma que o cartório consta da lista oficial da Ordem dos Notários.",
    },
    comoEscolher: [
      "Para atos tabelados (procuração, testamento), qualquer cartório cobra o mesmo — escolhe pela proximidade.",
      "Para escrituras, pede orçamento escrito e compara com os balcões públicos (Casa Pronta, Balcão das Heranças), que têm preço fixo.",
      "Leva os documentos organizados: certidões em falta pagam-se à parte.",
    ],
    servicos: [
      {
        nome: "Procuração pública",
        detalhe: "Valor de tabela — igual em qualquer cartório. Acresce ~10 € por interveniente adicional.",
        min: 31,
        max: 65,
        unidade: "",
        tabela: true,
      },
      {
        nome: "Testamento público",
        detalhe: "113,45 € + IVA em cartório privado; ~159 € no cartório notarial público.",
        min: 113,
        max: 200,
        unidade: "",
        tabela: true,
      },
      {
        nome: "Habilitação de herdeiros",
        detalhe: "150 € simples · 375 € com registo dos bens · 425 € com registo e partilha (Balcão das Heranças).",
        min: 150,
        max: 425,
        unidade: "",
        tabela: true,
      },
      {
        nome: "Escritura de compra e venda",
        detalhe:
          "Honorários do cartório privado (sem impostos nem registos). Alternativa pública: Balcão Casa Pronta — 375 € sem crédito, 700 € com crédito à habitação.",
        min: 150,
        max: 500,
        unidade: "",
        tabela: false,
      },
    ],
    fontes: [
      { label: "gov.pt — habilitação de herdeiros (preços)", url: "https://www.gov.pt/servicos/fazer-a-habilitacao-de-herdeiros-com-registo-de-bens" },
      { label: "ComparaJá — quanto custa a escritura (2026)", url: "https://www.comparaja.pt/credito-habitacao/artigos/quanto-custa-escritura-imovel" },
      { label: "E-Konomista — quanto custa uma procuração", url: "https://www.e-konomista.pt/quanto-custa-uma-procuracao/" },
      { label: "Ordem dos Notários", url: "https://www.notarios.pt" },
    ],
    nota: "Atos tabelados custam o mesmo em todo o país; aos valores pode acrescer IVA e certidões. Impostos (IMT, selo) e registos pagam-se à parte.",
  },
  advogados: {
    id: "advogados",
    nome: "Advogados",
    singular: "Advogado",
    indicador: "Consulta jurídica",
    unidade: "",
    variacaoRegional: true,
    descricao:
      "Honorários livres, mais altos nos grandes centros (Lisboa, Porto). A consulta média nacional ronda os 75 €; especialidades como fiscal ou societário custam mais.",
    ordem: {
      nome: "Ordem dos Advogados (OA)",
      url: "https://portal.oa.pt",
      nota: "Confirma a cédula profissional na pesquisa pública da Ordem dos Advogados.",
    },
    comoEscolher: [
      "Confirma a cédula profissional na pesquisa pública da OA.",
      "Pede uma estimativa de honorários por escrito antes de avançar (é prática recomendada pela Ordem).",
      "Aos valores acresce IVA a 23% — confirma se o orçamento o inclui.",
    ],
    servicos: [
      {
        nome: "Consulta jurídica",
        detalhe: "30–60 minutos; média nacional ~75 €. Especialidades (fiscal, societário, imobiliário) chegam a 150–300 €.",
        min: 50,
        max: 150,
        unidade: "",
        tabela: false,
      },
      {
        nome: "Hora de trabalho",
        detalhe: "Varia com a experiência do advogado e a especialidade.",
        min: 60,
        max: 220,
        unidade: "/h",
        tabela: false,
      },
      {
        nome: "Parecer jurídico escrito",
        detalhe: "Depende da complexidade do tema e dos documentos a analisar.",
        min: 150,
        max: 400,
        unidade: "",
        tabela: false,
      },
      {
        nome: "Avença mensal (negócios)",
        detalhe: "Acompanhamento contínuo para empresas e independentes com atividade regular.",
        min: 300,
        max: 800,
        unidade: "/mês",
        tabela: false,
      },
    ],
    fontes: [
      { label: "Zaask — honorários de advogados em Portugal", url: "https://www.zaask.pt/quanto-custa/advogados" },
      { label: "Ordem dos Advogados — pesquisa pública", url: "https://portal.oa.pt" },
    ],
    nota: "Honorários liberalizados — estimativas de mercado. Casos judiciais e especialidades técnicas fogem a estas bandas.",
  },
};

export const PROFISSOES_LISTA: Profissao[] = [
  PROFISSOES.contabilistas,
  PROFISSOES.notarios,
  PROFISSOES.advogados,
];

/** Datas de verificação a mostrar no rodapé (contabilistas mantém a própria). */
export const VERIFICACOES: Record<ProfissaoId, string> = {
  contabilistas: PRECOS_REGIOES_VERIFICADO,
  notarios: PROFISSIONAIS_VERIFICADO,
  advogados: PROFISSIONAIS_VERIFICADO,
};
