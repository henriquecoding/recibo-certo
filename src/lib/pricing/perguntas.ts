// ═══════════════════════════════════════════════════════════════════════
//  O MAPA DE PERGUNTAS — a UX progressiva, em dados
//  ---------------------------------------------------------------------
//  Se as perguntas vivessem no componente, cada cenário novo seria mais um
//  `if` no JSX e a ordem das perguntas ficaria refém do layout. Aqui são
//  dados: cada cenário declara o que pergunta no modo rápido, o que guarda
//  para o modo preciso, e com que contexto começa.
//
//  A REGRA DO MODO RÁPIDO: no máximo cinco perguntas até ao primeiro
//  resultado. Não é uma preferência estética — é a diferença entre uma
//  ferramenta que se usa e um formulário que se abandona. Tudo o que não
//  couber nas cinco tem um valor por omissão defensável e visível, que a
//  pessoa pode corrigir depois.
//
//  E os valores por omissão são declarados, nunca escondidos: o resultado
//  diz sempre «estamos a assumir X» quando assume.
// ═══════════════════════════════════════════════════════════════════════

import type { CenarioInicial, ContextoPreco } from "./tipos";

export interface DefinicaoCenarioInicial {
  chave: CenarioInicial;
  /** A frase que a pessoa reconhece. Não é uma categoria — é uma intenção. */
  rotulo: string;
  /** Um exemplo concreto. Concretizar é o que faz a pessoa escolher. */
  exemplo: string;
  /** Chave do `icon-map` das ferramentas. */
  icone: string;
  /** Campos do modo rápido, por ordem. */
  rapido: CampoPergunta[];
  /** Blocos que só aparecem no modo preciso. */
  avancado: BlocoAvancado[];
  contexto: () => ContextoPreco;
}

export type CampoPergunta =
  | "custo_compra"
  | "custo_producao"
  | "horas"
  | "valor_hora"
  | "materiais"
  | "margem"
  | "volume"
  | "canal"
  | "iva"
  | "preco_pensado"
  | "objetivo_ganho";

export type BlocoAvancado =
  | "custos_fixos"
  | "custos_variaveis"
  | "comissoes"
  | "pagamento"
  | "devolucoes"
  | "desperdicio"
  | "escaloes"
  | "fiscalidade"
  | "tempo_detalhe"
  | "producao_detalhe"
  | "desconto"
  | "cac";

// ─── Contexto base ─────────────────────────────────────────────────────

/**
 * O ponto de partida. Todos os valores aqui são pressupostos declarados —
 * a interface mostra-os como tal e o resultado avisa quando um deles está
 * a fazer trabalho a mais (ex.: zero custos fixos).
 */
export function contextoBase(): ContextoPreco {
  return {
    versao: 1,
    cenario: "nao_sei",
    vendedor: {
      tipo: "nao_sei",
      regimeIVA: "nao_sei",
      regiao: "continente",
      atividade: "art151",
      anoAtividade: 3,
    },
    produto: { natureza: "bem", escalaoVenda: "normal" },
    canal: { canal: "loja_fisica", cliente: "consumidor" },
    custos: { direto: { valor: 0, incluiIVA: true, escalao: "normal" }, variaveis: [], fixos: [] },
    volume: { unidadesMes: 50 },
    objetivo: { modo: "margem", percentagem: 0.35 },
  };
}

const com = (patch: (c: ContextoPreco) => void) => (): ContextoPreco => {
  const c = contextoBase();
  patch(c);
  return c;
};

// ─── Os cenários ───────────────────────────────────────────────────────

export const CENARIOS_INICIAIS_DEF: DefinicaoCenarioInicial[] = [
  {
    chave: "produto_revenda",
    rotulo: "Um produto que compro para revender",
    exemplo: "Roupa, acessórios, eletrónica, produtos de loja",
    icone: "ShoppingBag",
    rapido: ["custo_compra", "iva", "margem", "volume"],
    avancado: ["custos_variaveis", "custos_fixos", "escaloes", "comissoes", "pagamento", "devolucoes", "desperdicio", "fiscalidade", "desconto"],
    contexto: com((c) => {
      c.cenario = "produto_revenda";
      c.produto.natureza = "bem";
      c.custos.direto = { valor: 10, incluiIVA: true, escalao: "normal" };
      c.objetivo = { modo: "margem", percentagem: 0.4 };
    }),
  },
  {
    chave: "produto_proprio",
    rotulo: "Um produto que faço eu",
    exemplo: "Artesanato, bolos, cosmética, mobiliário, peças únicas",
    icone: "Sparkle",
    rapido: ["materiais", "horas", "margem", "volume"],
    avancado: ["producao_detalhe", "tempo_detalhe", "custos_variaveis", "custos_fixos", "desperdicio", "fiscalidade", "comissoes", "desconto"],
    contexto: com((c) => {
      c.cenario = "produto_proprio";
      c.produto.natureza = "bem";
      c.producao = {
        materias: [
          { id: "m1", rotulo: "Matéria-prima", custoLote: { valor: 50, incluiIVA: true, escalao: "normal" }, unidadesPorLote: 10 },
        ],
        custoHoraMaoObra: 12,
        horasPorUnidade: 1,
      };
      c.volume = { unidadesMes: 30 };
      c.objetivo = { modo: "margem", percentagem: 0.45 };
    }),
  },
  {
    chave: "produto_digital",
    rotulo: "Um produto digital",
    exemplo: "Ebook, curso, template, licença, ficheiro",
    icone: "Laptop",
    rapido: ["custo_producao", "margem", "volume", "canal"],
    avancado: ["custos_fixos", "comissoes", "pagamento", "cac", "fiscalidade", "desconto"],
    contexto: com((c) => {
      c.cenario = "produto_digital";
      c.produto.natureza = "digital";
      c.canal = { canal: "loja_online", cliente: "consumidor", metodoPagamentoId: "stripe_eee" };
      c.custos.direto = { valor: 0, incluiIVA: false, escalao: "normal" };
      c.volume = { unidadesMes: 20 };
      c.objetivo = { modo: "margem", percentagem: 0.7 };
    }),
  },
  {
    chave: "servico",
    rotulo: "Um serviço",
    exemplo: "Consultoria, design, limpeza, reparações, fotografia",
    icone: "Briefcase",
    rapido: ["horas", "valor_hora", "margem", "volume"],
    avancado: ["tempo_detalhe", "custos_variaveis", "custos_fixos", "fiscalidade", "comissoes", "desconto"],
    contexto: com((c) => {
      c.cenario = "servico";
      c.produto.natureza = "servico";
      c.canal = { canal: "venda_direta", cliente: "empresa_pt" };
      c.vendedor.tipo = "ti";
      c.tempo = {
        horasPorUnidade: 8,
        horasSemana: 40,
        semanasFerias: 4.4,
        semanasSemCliente: 2,
        taxaFaturavel: 0.6,
        rendimentoAnualPretendido: 24000,
      };
      c.volume = { unidadesMes: 10 };
      c.objetivo = { modo: "margem", percentagem: 0.3 };
    }),
  },
  {
    chave: "servico_hora",
    rotulo: "Quanto cobrar por hora",
    exemplo: "Explicações, aulas, assistência, trabalho ao tempo",
    icone: "Clock",
    rapido: ["objetivo_ganho", "horas", "iva"],
    avancado: ["tempo_detalhe", "custos_fixos", "fiscalidade"],
    contexto: com((c) => {
      c.cenario = "servico_hora";
      c.produto.natureza = "servico";
      c.canal = { canal: "venda_direta", cliente: "consumidor" };
      c.vendedor.tipo = "ti";
      c.tempo = {
        horasPorUnidade: 1,
        horasSemana: 40,
        semanasFerias: 4.4,
        semanasSemCliente: 2,
        taxaFaturavel: 0.6,
        rendimentoAnualPretendido: 24000,
      };
      c.volume = { unidadesMes: 100 };
      c.objetivo = { modo: "margem", percentagem: 0.15 };
    }),
  },
  {
    chave: "projeto",
    rotulo: "Um trabalho ou projeto com preço fechado",
    exemplo: "Um site, uma obra, uma campanha, um evento",
    icone: "Target",
    rapido: ["horas", "valor_hora", "materiais", "margem"],
    avancado: ["tempo_detalhe", "custos_variaveis", "custos_fixos", "fiscalidade"],
    contexto: com((c) => {
      c.cenario = "projeto";
      c.produto.natureza = "servico";
      c.canal = { canal: "orcamento", cliente: "empresa_pt" };
      c.vendedor.tipo = "ti";
      c.tempo = {
        horasPorUnidade: 40,
        horasSemana: 40,
        semanasFerias: 4.4,
        semanasSemCliente: 2,
        taxaFaturavel: 0.6,
        rendimentoAnualPretendido: 30000,
      };
      c.volume = { unidadesMes: 2 };
      c.objetivo = { modo: "margem", percentagem: 0.25 };
    }),
  },
  {
    chave: "encomenda",
    rotulo: "Uma encomenda por medida",
    exemplo: "Bolo de aniversário, peça personalizada, catering",
    icone: "Gift",
    rapido: ["materiais", "horas", "margem"],
    avancado: ["producao_detalhe", "tempo_detalhe", "custos_variaveis", "custos_fixos", "fiscalidade"],
    contexto: com((c) => {
      c.cenario = "encomenda";
      c.produto.natureza = "bem";
      c.canal = { canal: "orcamento", cliente: "consumidor" };
      c.producao = {
        materias: [
          { id: "m1", rotulo: "Ingredientes / materiais", custoLote: { valor: 20, incluiIVA: true, escalao: "reduzida" }, unidadesPorLote: 1 },
        ],
        custoHoraMaoObra: 12,
        horasPorUnidade: 3,
      };
      c.volume = { unidadesMes: 12 };
      c.objetivo = { modo: "margem", percentagem: 0.4 };
    }),
  },
  {
    chave: "loja_online",
    rotulo: "Para vender na minha loja online",
    exemplo: "Shopify, WooCommerce, site próprio",
    icone: "Globe",
    rapido: ["custo_compra", "iva", "margem", "volume"],
    avancado: ["pagamento", "custos_variaveis", "custos_fixos", "devolucoes", "cac", "comissoes", "fiscalidade", "desconto"],
    contexto: com((c) => {
      c.cenario = "loja_online";
      c.produto.natureza = "bem";
      c.canal = {
        canal: "loja_online",
        cliente: "consumidor",
        metodoPagamentoId: "stripe_eee",
      };
      c.custos = {
        direto: { valor: 10, incluiIVA: true, escalao: "normal" },
        variaveis: [{ id: "emb", rotulo: "Embalagem", porUnidade: 0.8 }],
        fixos: [],
        portesAbsorvidos: 0,
        taxaDevolucao: 0.05,
        custoDevolucao: 5,
      };
      c.objetivo = { modo: "margem", percentagem: 0.45 };
    }),
  },
  {
    chave: "marketplace",
    rotulo: "Para vender num marketplace",
    exemplo: "Amazon, Worten, Fnac, KuantoKusta, Etsy, OLX",
    icone: "ShoppingBag",
    rapido: ["custo_compra", "canal", "margem", "volume"],
    avancado: ["comissoes", "pagamento", "custos_variaveis", "custos_fixos", "devolucoes", "fiscalidade", "desconto"],
    contexto: com((c) => {
      c.cenario = "marketplace";
      c.produto.natureza = "bem";
      c.canal = {
        canal: "marketplace",
        cliente: "consumidor",
        marketplaceId: "worten",
      };
      c.custos = {
        direto: { valor: 15, incluiIVA: true, escalao: "normal" },
        variaveis: [{ id: "emb", rotulo: "Embalagem", porUnidade: 0.8 }],
        fixos: [],
        portesAbsorvidos: 3.5,
        taxaDevolucao: 0.08,
        custoDevolucao: 6,
      };
      c.objetivo = { modo: "margem", percentagem: 0.35 };
    }),
  },
  {
    chave: "objetivo",
    rotulo: "Sei quanto quero ganhar",
    exemplo: "«Quero 2 000 € por mês — o que tenho de cobrar?»",
    icone: "ChartProjection",
    rapido: ["objetivo_ganho", "volume", "custo_compra", "iva"],
    avancado: ["custos_fixos", "custos_variaveis", "fiscalidade", "comissoes"],
    contexto: com((c) => {
      c.cenario = "objetivo";
      c.objetivo = { modo: "lucro_mensal", valor: 2000 };
      c.volume = { unidadesMes: 100 };
    }),
  },
  {
    chave: "nao_sei",
    rotulo: "Ainda não tenho a certeza",
    exemplo: "Começa pelo mais simples e vamos descobrindo",
    icone: "Lightbulb",
    rapido: ["custo_compra", "margem", "volume"],
    avancado: ["custos_fixos", "custos_variaveis", "comissoes", "fiscalidade"],
    contexto: contextoBase,
  },
];

export const cenarioPorChave = (chave: CenarioInicial): DefinicaoCenarioInicial =>
  CENARIOS_INICIAIS_DEF.find((c) => c.chave === chave) ?? CENARIOS_INICIAIS_DEF[CENARIOS_INICIAIS_DEF.length - 1];

/** Aceita o `?c=` da URL sem confiar nele. */
export const cenarioDeQuery = (valor: string | null | undefined): CenarioInicial | null => {
  if (!valor) return null;
  const encontrado = CENARIOS_INICIAIS_DEF.find((c) => c.chave === valor);
  return encontrado ? encontrado.chave : null;
};
