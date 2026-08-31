// ═══════════════════════════════════════════════════════════════════════
//  OS PARÂMETROS DA DEMONSTRAÇÃO — derivados da engine, nunca escritos
//  ---------------------------------------------------------------------
//  `demo-homepage.ts` sabe compor um preço, mas não sabe qual é a taxa de
//  IVA nem quanto é que a Segurança Social e o IRS levam de cada fatura.
//  Esses dois números não se escrevem: pergunta-se-lhes à engine.
//
//  Isto corre UMA vez por processo do servidor, no âmbito do módulo, como
//  os exemplos do Hero em `src/app/page.tsx`. Nada disto atravessa a
//  fronteira para o cliente a não ser os poucos números do resultado.
//
//  ⚠️ Não importar daqui em código de cliente: `precificar` traz a engine
//  inteira atrás.
// ═══════════════════════════════════════════════════════════════════════

import { precificar, type ContextoPreco } from "@/lib/pricing";
import { IVA_TAXAS } from "@/lib/fiscal-data";
import { fracao } from "./numeros";
import {
  ENTRADAS_DEMO_PADRAO,
  type EntradasDemoPreco,
  type ParametrosDemoPreco,
} from "./demo-homepage";

/**
 * O contexto da demonstração: uma peça física, vendida direta ao
 * consumidor, no Continente. Sem canal e sem desconto — a homepage explica
 * a COMPOSIÇÃO do preço, e uma comissão de marketplace aqui só serviria
 * para o número deixar de ser explicável em quatro parcelas. O laboratório
 * mais abaixo na página é que a acrescenta.
 */
function contextoDemo(
  entradas: EntradasDemoPreco,
  vendedor: ContextoPreco["vendedor"],
): ContextoPreco {
  return {
    versao: 1,
    cenario: "produto_proprio",
    vendedor,
    produto: { natureza: "bem", escalaoVenda: "normal" },
    canal: { canal: "loja_fisica", cliente: "consumidor" },
    custos: {
      direto: { valor: entradas.materiais, incluiIVA: false, escalao: "normal" },
      variaveis: [
        { id: "trabalho", rotulo: "Trabalho", porUnidade: entradas.trabalho },
        { id: "estrutura", rotulo: "Estrutura", porUnidade: entradas.estrutura },
      ],
      fixos: [],
    },
    volume: { unidadesMes: 100 },
    objetivo: { modo: "markup", percentagem: entradas.markup },
  };
}

/** Sociedade: o IRC incide sobre o lucro e resolve-se depois do preço. */
export const VENDEDOR_EMPRESA: ContextoPreco["vendedor"] = {
  tipo: "empresa",
  regimeIVA: "normal",
  regiao: "continente",
};

/**
 * Trabalhador independente no simplificado, atividade de venda de bens,
 * terceiro ano (sem redução do coeficiente) e 30 000 € já faturados no ano.
 *
 * A faturação DECLARADA é o que fixa a taxa marginal de IRS. É fixa de
 * propósito: se variasse com o que a pessoa arrasta, o preço mudaria por
 * duas razões ao mesmo tempo e a demonstração deixava de explicar nada.
 */
export const VENDEDOR_RECIBOS_VERDES: ContextoPreco["vendedor"] = {
  tipo: "ti",
  regimeIVA: "normal",
  regiao: "continente",
  atividade: "vendas",
  anoAtividade: 3,
  faturacaoAnualPrevista: 30_000,
};

/** A fração da faturação que os impostos pessoais levam antes do lucro. */
export function fracaoFaturacaoDe(vendedor: ContextoPreco["vendedor"]): number {
  const r = precificar(contextoDemo(ENTRADAS_DEMO_PADRAO, vendedor));
  if (!r.ok || !r.fiscal.aplicavel) return 0;

  // O IRS sobre o LUCRO (contabilidade organizada) não é uma fração da
  // faturação e não pode entrar aqui: somá-lo cobrava imposto sobre o
  // custo. A demonstração usa o simplificado precisamente por isso.
  const irsSobreFaturacao = r.fiscal.irsBase === "faturacao" ? r.fiscal.irsFracao : 0;
  return fracao(r.fiscal.ssFracao + irsSobreFaturacao, 0, 0.9);
}

export function parametrosDemoPreco(): ParametrosDemoPreco {
  const referencia = precificar(contextoDemo(ENTRADAS_DEMO_PADRAO, VENDEDOR_EMPRESA));

  return {
    taxaIVA: referencia.taxaIVA,
    fonteIVA: IVA_TAXAS.continente.legalBasis,
    regimes: [
      {
        id: "empresa",
        rotulo: "Sociedade",
        fracaoFaturacao: fracaoFaturacaoDe(VENDEDOR_EMPRESA),
        nota: "O IRC incide sobre o lucro do ano, não sobre cada fatura.",
      },
      {
        id: "recibos-verdes",
        rotulo: "Recibos verdes",
        fracaoFaturacao: fracaoFaturacaoDe(VENDEDOR_RECIBOS_VERDES),
        nota: "Segurança Social e IRS do simplificado saem de cada fatura.",
      },
    ],
  };
}

/** Só para os testes: a resposta da engine, para comparar com a forma fechada. */
export function precoDaEngine(entradas: EntradasDemoPreco, vendedor: ContextoPreco["vendedor"]) {
  return precificar(contextoDemo(entradas, vendedor));
}

// ═══════════════════════════════════════════════════════════════════════
//  O LABORATÓRIO — quatro situações reais sobre a MESMA peça
//  ---------------------------------------------------------------------
//  Cada cenário existe para ensinar uma regra portuguesa que muda o preço e
//  que quase nenhuma calculadora modela. Todos correm na engine, aqui no
//  servidor: o laboratório na página só troca entre resultados já feitos, e
//  por isso não leva um único cálculo para o cliente.
// ═══════════════════════════════════════════════════════════════════════

export interface CenarioDemoPreco {
  id: string;
  rotulo: string;
  /** A pergunta que a pessoa está a fazer ao escolher este cenário. */
  pergunta: string;
  pvp: number;
  liquido: number;
  lucro: number;
  margem: number;
  /** Diferença de PVP contra a venda direta. */
  variacaoPVP: number;
  /** A regra que explica a diferença. */
  explicacao: string;
  fonte: string;
}

export function cenariosDemoPreco(): CenarioDemoPreco[] {
  const construir = (patch: (c: ContextoPreco) => void) => {
    const c = contextoDemo(ENTRADAS_DEMO_PADRAO, VENDEDOR_EMPRESA);
    patch(c);
    return precificar(c);
  };

  const direta = construir(() => {});

  const bruto = (r: ReturnType<typeof precificar>) => ({
    pvp: r.pvp,
    liquido: r.precoLiquido,
    lucro: r.margem.lucroUnidade,
    margem: r.margem.margem,
    variacaoPVP: Math.round((r.pvp - direta.pvp) * 100) / 100,
  });

  const marketplace = construir((c) => {
    c.canal = { canal: "marketplace", cliente: "consumidor", comissaoPercentagem: 0.15 };
  });

  const isento = construir((c) => {
    c.vendedor = { ...VENDEDOR_EMPRESA, regimeIVA: "isento_art53" };
  });

  const recibosVerdes = construir((c) => {
    c.vendedor = VENDEDOR_RECIBOS_VERDES;
  });

  return [
    {
      id: "direta",
      rotulo: "Venda direta",
      pergunta: "E se vender eu, sem intermediário?",
      ...bruto(direta),
      explicacao:
        "A referência: o preço cobre os custos, o markup fica como lucro e o IVA é entregue ao Estado.",
      fonte: IVA_TAXAS.continente.legalBasis,
    },
    {
      id: "marketplace",
      rotulo: "Marketplace",
      pergunta: "E se vender num marketplace com 15% de comissão?",
      ...bruto(marketplace),
      explicacao:
        "A comissão incide sobre o total da encomenda, IVA incluído — 15% do bruto são 18,45% do líquido. Por isso o preço sobe mais do que 15%.",
      fonte: "Preçários dos canais em pricing/regras.ts, com data de verificação",
    },
    {
      id: "isento",
      rotulo: "Isento do Art. 53.º",
      pergunta: "E se estiver isento de IVA?",
      ...bruto(isento),
      explicacao:
        "A isenção tem dois efeitos, não um. Não liquidas IVA — o cliente paga menos — mas também não o deduzes nas compras, e os materiais passam a custar o valor com IVA. Isenção não é margem grátis: é outra base de custo.",
      fonte: "Art. 53.º CIVA, n.os 1 e 3",
    },
    {
      id: "recibos-verdes",
      rotulo: "Recibos verdes",
      pergunta: "E se operar a recibos verdes?",
      ...bruto(recibosVerdes),
      explicacao:
        "A Segurança Social e o IRS do simplificado incidem sobre a faturação, não sobre o lucro. Saem de cada fatura, e o preço tem de os repor.",
      fonte: "Art. 168.º do Código Contributivo e Art. 31.º CIRS",
    },
  ];
}
