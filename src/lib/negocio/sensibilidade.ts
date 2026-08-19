// ═══════════════════════════════════════════════════════════════════════
//  SENSIBILIDADE — «e se as coisas não correrem como esperas?»
//  ---------------------------------------------------------------------
//  Um plano de negócio com um único cenário é uma previsão. Com choques,
//  é uma decisão informada: passa a saber-se QUAL premissa é que, se
//  estiver errada, estraga tudo — e é essa a que se vai confirmar
//  primeiro.
//
//  ── DETERMINÍSTICO, NÃO MONTE CARLO ────────────────────────────────
//  Choques fixos, resultado reprodutível, sem distribuições inventadas.
//  Uma simulação estocástica precisaria de variâncias que ninguém tem, e
//  devolveria um intervalo de confiança sobre palpites — a mesma falsa
//  precisão que a regra «nunca devolver um número sem faixa» combate.
//
//  ── O QUE UM CHOQUE NÃO PODE FAZER ─────────────────────────────────
//  Mudar o PREÇO quando o eixo é o volume. O preço de cada oferta é
//  resolvido com o volume declarado na oferta (os custos fixos por
//  unidade repartem-se por ele); se o choque de volume também mexesse
//  nesse repartimento, o teste mediria duas coisas ao mesmo tempo e o
//  tornado deixaria de significar o que diz.
// ═══════════════════════════════════════════════════════════════════════

import { cent, dividir, num } from "@/lib/pricing/numeros";
import { agregar } from "./agregar";
import type {
  ContextoNegocio,
  EixoSensibilidade,
  EixoTornado,
  ImpactoSensibilidade,
  ResultadoSensibilidade,
} from "./tipos";

/**
 * Os choques. Assimétricos de propósito: o risco de um negócio novo é
 * quase sempre vender menos, não vender mais.
 */
export const CHOQUES: Record<EixoSensibilidade, readonly number[]> = {
  volume: [-0.3, -0.2, -0.1, 0.1],
  preco: [-0.1, -0.05, 0.05, 0.1],
  custo: [0.1, 0.2],
  overhead: [0.1, 0.2],
};

const ROTULOS: Record<EixoSensibilidade, string> = {
  volume: "Vendas por mês",
  preco: "Preço",
  custo: "Custo variável",
  overhead: "Custos de estrutura",
};

/**
 * O resultado operacional depois de um choque num eixo.
 *
 * Os três eixos que não são o volume aplicam-se ao AGREGADO e não ao
 * `ContextoPreco` de cada oferta — de propósito. Mexer no preço dentro do
 * contexto faria a engine reformar o preço a partir do objetivo de
 * margem, e o resultado seria «o que acontece se eu pedir menos margem»,
 * que é outra pergunta. Aqui pergunta-se «e se o mercado só pagar menos
 * 10%?», que é o preço a descer com os custos no sítio.
 */
function resultadoComChoque(
  contexto: ContextoNegocio,
  eixo: EixoSensibilidade,
  choque: number,
): number {
  if (eixo === "volume") {
    const volumes: Record<string, number> = {};
    for (const o of contexto.ofertas) {
      const base = Math.max(0, Math.round(num(o.volume.esperadoMes)));
      volumes[o.id] = Math.max(0, Math.round(base * (1 + choque)));
    }
    const a = agregar(contexto, { volumes });
    return a.resultadoOperacionalMes;
  }

  const base = agregar(contexto);

  switch (eixo) {
    case "preco": {
      // O preço desce; os custos variáveis em euros ficam onde estavam,
      // menos a parte que é percentagem do preço (comissões, impostos
      // sobre a faturação), que desce com ele. A engine já sabe qual é
      // essa fração: `custo.fracaoSobreLiquido` e `fracaoSobreBruto`.
      let receita = 0;
      let custos = 0;
      for (const r of base.ofertas) {
        const receitaNova = r.mensal.receitaSemIVA * (1 + choque);
        const proporcional =
          (num(r.preco.custo.fracaoSobreLiquido) +
            num(r.preco.custo.fracaoSobreBruto) * (1 + num(r.preco.taxaIVA))) *
          r.mensal.receitaSemIVA;
        const fixoEmEuros = Math.max(0, r.custosVariaveisOperacionaisMes - proporcional);
        receita += receitaNova;
        custos += fixoEmEuros + proporcional * (1 + choque);
      }
      return cent(receita - custos - base.custosFixosMes);
    }
    case "custo":
      return cent(
        base.receitaSemIVAMes - base.custosVariaveisMes * (1 + choque) - base.custosFixosMes,
      );
    case "overhead":
      return cent(
        base.margemContribuicaoMes - base.custosFixosMes * (1 + choque),
      );
  }
}

export function analisarSensibilidade(contexto: ContextoNegocio): ResultadoSensibilidade {
  const base = agregar(contexto).resultadoOperacionalMes;

  const impactos: ImpactoSensibilidade[] = [];
  const tornado: EixoTornado[] = [];

  for (const eixo of Object.keys(CHOQUES) as EixoSensibilidade[]) {
    // Um eixo sem matéria não entra: sem custos de estrutura, «e se o
    // overhead subir 20%?» é uma barra de zero a ocupar espaço.
    if (eixo === "overhead" && agregar(contexto).custosFixosMes <= 0) continue;

    const doEixo: ImpactoSensibilidade[] = CHOQUES[eixo].map((choque) => {
      const resultado = resultadoComChoque(contexto, eixo, choque);
      return {
        eixo,
        rotulo: ROTULOS[eixo],
        choque,
        resultadoOperacionalMes: resultado,
        delta: cent(resultado - base),
        quebra: resultado < 0 && base >= 0,
      };
    });

    impactos.push(...doEixo);

    const valores = doEixo.map((i) => i.resultadoOperacionalMes);
    const melhor = Math.max(...valores);
    const pior = Math.min(...valores);
    tornado.push({ eixo, rotulo: ROTULOS[eixo], amplitude: cent(melhor - pior), melhor, pior });
  }

  tornado.sort((x, y) => y.amplitude - x.amplitude);

  return {
    base,
    impactos,
    tornado,
    critico: tornado[0],
  };
}

/**
 * Quanto pode o volume cair antes de o resultado ficar negativo.
 * `null` quando já está negativo ou quando não há queda que o torne.
 */
export function margemDeSeguranca(contexto: ContextoNegocio): number | null {
  const a = agregar(contexto);
  if (a.resultadoOperacionalMes <= 0) return null;
  if (a.margemContribuicaoMes <= 0) return null;
  return dividir(a.resultadoOperacionalMes, a.margemContribuicaoMes);
}
