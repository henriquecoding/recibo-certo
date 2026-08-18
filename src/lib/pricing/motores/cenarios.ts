// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE CENÁRIOS — «e se…?»
//  ---------------------------------------------------------------------
//  Um cenário não é um preço diferente: é um CONTEXTO diferente corrido
//  pelo mesmo motor. Por isso este ficheiro não sabe calcular nada — sabe
//  transformar contextos e voltar a chamar `precificar`.
//
//  A vantagem é que nenhum cenário pode divergir do cálculo principal:
//  quando o motor mudar, os cenários mudam com ele. Foi assim que a
//  «Situação de IVA» acabou por existir em três versões neste projeto —
//  três sítios a implementar a mesma coisa à mão.
// ═══════════════════════════════════════════════════════════════════════

import type { CenarioComparado, ChaveCenario, ContextoPreco } from "../tipos";
import { precificar } from "../motor";
import { canalPorId } from "../regras";
import { cent, fracao, num } from "../numeros";

export interface DefinicaoCenario {
  chave: ChaveCenario;
  rotulo: string;
  descricao: string;
  transformar: (c: ContextoPreco) => ContextoPreco;
}

const clonar = (c: ContextoPreco): ContextoPreco => structuredClone(c);

const comMargem = (delta: number) => (c: ContextoPreco): ContextoPreco => {
  const novo = clonar(c);
  if (novo.objetivo.modo === "margem") {
    novo.objetivo = {
      ...novo.objetivo,
      percentagem: fracao((novo.objetivo.percentagem ?? 0.3) + delta, 0, 0.95),
    };
  } else if (novo.objetivo.modo === "markup") {
    novo.objetivo = {
      ...novo.objetivo,
      percentagem: Math.max(0, (novo.objetivo.percentagem ?? 0.5) + delta * 2),
    };
  }
  return novo;
};

export const CENARIOS: DefinicaoCenario[] = [
  {
    chave: "conservador",
    rotulo: "Conservador",
    descricao: "Menos 10 pontos de margem — o preço que entra mais facilmente no mercado.",
    transformar: comMargem(-0.1),
  },
  {
    chave: "recomendado",
    rotulo: "Recomendado",
    descricao: "O objetivo que definiste.",
    transformar: clonar,
  },
  {
    chave: "ambicioso",
    rotulo: "Ambicioso",
    descricao: "Mais 10 pontos de margem — exige uma proposta de valor que o sustente.",
    transformar: comMargem(0.1),
  },
  {
    chave: "desconto10",
    rotulo: "Com 10% de desconto",
    descricao: "O mesmo preço, promovido a 10%.",
    transformar: (c) => {
      const novo = clonar(c);
      novo.desconto = { tipo: "promocao", percentagem: 0.1 };
      return novo;
    },
  },
  {
    chave: "marketplace",
    rotulo: "Através de marketplace",
    descricao: "Com a comissão típica de um marketplace generalista.",
    transformar: (c) => {
      const novo = clonar(c);
      const canal = canalPorId("worten");
      novo.canal = {
        ...novo.canal,
        canal: "marketplace",
        marketplaceId: "worten",
        comissaoPercentagem: canal?.comissaoTipica ?? 0.13,
      };
      return novo;
    },
  },
  {
    chave: "com_portes",
    rotulo: "Portes pagos por ti",
    descricao: "Envio grátis para o cliente — o custo passa para o teu lado.",
    transformar: (c) => {
      const novo = clonar(c);
      novo.custos = {
        ...novo.custos,
        portesAbsorvidos: num(novo.custos.portesAbsorvidos) > 0 ? novo.custos.portesAbsorvidos : 4.5,
      };
      return novo;
    },
  },
  {
    chave: "volume_dobro",
    rotulo: "Dobro do volume",
    descricao: "As contas fixas repartidas por o dobro das vendas.",
    transformar: (c) => {
      const novo = clonar(c);
      novo.volume = { unidadesMes: Math.max(1, num(novo.volume.unidadesMes) * 2) };
      return novo;
    },
  },
  {
    chave: "custo_mais_10",
    rotulo: "Custo sobe 10%",
    descricao: "O fornecedor aumenta. O teste de resistência do teu preço.",
    transformar: (c) => {
      const novo = clonar(c);
      novo.custos = {
        ...novo.custos,
        direto: { ...novo.custos.direto, valor: num(novo.custos.direto.valor) * 1.1 },
      };
      return novo;
    },
  },
];

export function compararCenarios(
  contexto: ContextoPreco,
  chaves?: ChaveCenario[],
): CenarioComparado[] {
  const selecionados = chaves
    ? CENARIOS.filter((c) => chaves.includes(c.chave))
    : CENARIOS.filter((c) => ["conservador", "recomendado", "ambicioso"].includes(c.chave));

  return selecionados.map((def) => {
    const r = precificar(def.transformar(contexto));
    const pvpFinal = r.desconto ? r.desconto.pvpComDesconto : r.pvp;
    const lucroFinal = r.desconto ? r.desconto.lucroDepois : r.margem.lucroUnidade;

    // O mensal sem desconto vem do motor, não de `lucroUnidade × volume`:
    // `lucroUnidade` já vem arredondado a cêntimos, e multiplicá-lo pelo
    // volume propaga o arredondamento (616,30 € numa tabela contra 616,00 €
    // no cartão ao lado, para o mesmo cenário). §11 da especificação.
    const mensal = r.desconto
      ? r.desconto.lucroDepois * num(contexto.volume.unidadesMes)
      : r.margem.lucroMensal;

    return {
      chave: def.chave,
      rotulo: def.rotulo,
      descricao: def.descricao,
      pvp: cent(pvpFinal),
      precoLiquido: r.precoLiquido,
      margem: r.desconto ? r.desconto.margemDepois : r.margem.margem,
      lucroUnidade: cent(lucroFinal),
      lucroMensal: cent(mensal),
      breakEvenUnidades: r.breakEven.unidades,
      possivel: r.ok && lucroFinal >= 0,
    };
  });
}

/** Um único cenário, para os botões «e se eu…». */
export function correrCenario(contexto: ContextoPreco, chave: ChaveCenario): CenarioComparado | null {
  const encontrado = compararCenarios(contexto, [chave]);
  return encontrado[0] ?? null;
}
