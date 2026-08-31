import { describe, expect, it } from "vitest";
import {
  eurFromDecimal,
  planEmploymentOffer,
  PT_EMPLOYER_2026,
  selectEmploymentPolicy,
  type EmploymentOfferInput,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { legacy2026WithholdingResolver } from "@/lib/payroll-engine-adapter";
import { dadosContratacao } from "@/lib/foco/dados-servidor";
import {
  dataDePagamento,
  estadoInicial,
  inputFromState,
  isoOuIndefinido,
  periodoDeTrabalho,
} from "@/components/contratacao/estado";

/**
 * Paridade entre superfícies (relatório, MOT-P0-015 e P0-12).
 *
 * O que estava errado: `src/lib/foco/dados-servidor.ts` repetia 42 000 €,
 * 1 500 €, 10,20 €, 40 h e 65% à mão; `estado.ts` tinha OUTRO conjunto dos
 * mesmos números; e o comentário «usa exatamente o mesmo motor» era verdade
 * quanto ao algoritmo e falso quanto aos pressupostos. Duas superfícies com
 * o mesmo rótulo podiam responder coisas diferentes.
 *
 * Agora ambas resolvem o mesmo `demoScenarioId` do release. Este teste é o
 * que impede que voltem a divergir.
 */

const DEMO_ID = "pt-employer-2026.demo.primeira-contratacao";
const HOJE = "2026-08-31";

const cenario = () => {
  const demo = PT_EMPLOYER_2026.demoScenarios.find((item) => item.id === DEMO_ID);
  if (!demo) throw new Error(`o release ativo não traz o cenário ${DEMO_ID}`);
  return demo;
};

describe("cross-surface — homepage e ferramenta resolvem o mesmo cenário", () => {
  it("o estado inicial do planeador vem do cenário do release, não de literais", () => {
    const demo = cenario();
    const inicial = estadoInicial(demo);
    expect(inicial.annualBudget).toBe(demo.annualBudget.cents / 100);
    expect(inicial.baseSalary).toBe(demo.baseSalaryMonthly.cents / 100);
    expect(inicial.mealDaily).toBe(demo.mealDaily.cents / 100);
    expect(inicial.normalWeeklyHours).toBe(demo.weeklyHoursHundredths / 100);
    expect(inicial.jurisdiction).toBe(demo.jurisdiction);
    expect(inicial.startDate).toBe(demo.startDate);
  });

  it("a homepage publica os valores do cenário do release", () => {
    const demo = cenario();
    const homepage = dadosContratacao();
    expect(homepage.orcamentoAnual).toBe(demo.annualBudget.cents / 100);
    expect(homepage.refeicaoDia).toBe(demo.mealDaily.cents / 100);
  });

  it("a homepage e a ferramenta chegam ao mesmo custo com o mesmo cenário", () => {
    const demo = cenario();
    const homepage = dadosContratacao();

    // Reconstrói o percurso da FERRAMENTA: estado inicial → input → motor.
    const inicial = estadoInicial(demo);
    const selecao = selectEmploymentPolicy({
      simulationAsOf: HOJE,
      workPeriod: periodoDeTrabalho(inicial.startDate) as never,
      payDate: dataDePagamento(inicial.startDate) as never,
      jurisdiction: inicial.jurisdiction,
      withholding: legacy2026WithholdingResolver,
    });
    expect(selecao.kind).toBe("ready");
    if (selecao.kind !== "ready") return;

    const base = inputFromState(inicial, HOJE);
    // A homepage declara seguro e SST como estimativas do posto inteiro; a
    // única diferença legítima entre as duas superfícies é essa declaração,
    // e é ela que este teste fixa em vez de a deixar implícita.
    const confirmado = (euros: number) =>
      ({ kind: "confirmed", amount: eurFromDecimal(euros) }) as const;
    const input: EmploymentOfferInput = {
      ...base,
      role: { ...base.role, productiveShare: demo.productiveShare },
      postCosts: {
        ...base.postCosts,
        accidentInsurance: {
          kind: "estimated",
          amount: eurFromDecimal(480),
          basis: "prémio médio de referência; depende da atividade e da seguradora",
        },
        healthAndSafety: {
          kind: "estimated",
          amount: eurFromDecimal(220),
          basis: "avença de serviço externo de SST",
        },
        training: confirmado(0),
        equipmentFirstYear: confirmado(1_200),
        recruitmentFirstYear: confirmado(0),
        software: confirmado(0),
        remoteWork: confirmado(0),
        other: confirmado(0),
      },
    };

    const preparado = planEmploymentOffer(input, selecao.bundle);
    expect(preparado.kind).toBe("ready");
    if (preparado.kind !== "ready") return;

    // O vencimento resolvido pelo orçamento é o mesmo nas duas superfícies:
    // é o número que a homepage anuncia e o que a ferramenta abre.
    expect(preparado.result.resolvedBaseSalaryMonthly.cents / 100).toBe(
      homepage.vencimentoBaseMensal,
    );
    expect(preparado.result.provenance.releaseId).toBe(PT_EMPLOYER_2026.releaseId);
  });

  it("a data de entrada e o período de trabalho não são o mesmo campo", () => {
    const demo = cenario();
    expect(periodoDeTrabalho(demo.startDate)).toBe(demo.workPeriod);
    expect(dataDePagamento(demo.startDate)).not.toBe(demo.startDate);
    expect(isoOuIndefinido("2026-02-31")).toBeUndefined();
    expect(periodoDeTrabalho("não é uma data")).toBe("");
  });
});
