import { describe, expect, it } from "vitest";
import { addCents, applyPpm, eurosToCents, rateToPpm, subtractCentsFloor0, type Cents, type Ppm } from "../src/core/money";
import { evaluate, type Rule } from "../src/core/engine";
import { isOk } from "../src/core/decision";
import type { Dataset } from "../src/core/dataset";
import type { EvaluationContext, IsoDate } from "../src/core/types";
import { DATASET_2026 } from "../src/datasets/2026";
import { COVERAGE, allDomainsAreContractOnly } from "../src/domains/coverage";
import { route } from "../src/domains";
import { validateSource } from "../src/legal/validate";
import type { LegalSource } from "../src/legal/source";
import {
  adicionalSolidariedadeRule,
  type AdicionalSolidariedadeInput,
} from "../src/domains/personal-income-tax/adicional-solidariedade";

const ASOF = "2026-07-22" as IsoDate;

function baseContext(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  return { asOf: ASOF, taxYear: 2026, jurisdiction: "PT-CONTINENTE", ...overrides };
}

// ── Invariantes do dinheiro (cêntimos inteiros, ppm inteiro) ────────────────
describe("core/money — dinheiro em cêntimos, taxas em ppm", () => {
  it("converte euros para cêntimos inteiros", () => {
    expect(eurosToCents(12_880)).toBe(1_288_000);
    expect(eurosToCents(19.99)).toBe(1_999);
  });

  it("nunca produz NaN/Infinity", () => {
    expect(() => eurosToCents(Number.NaN)).toThrow();
    expect(() => eurosToCents(Number.POSITIVE_INFINITY)).toThrow();
  });

  it("rateToPpm converte taxas decimais sem erro de vírgula flutuante acumulado", () => {
    expect(rateToPpm(0.025)).toBe(25_000);
    expect(rateToPpm(0.214)).toBe(214_000);
  });

  it("subtractCentsFloor0 nunca deixa o resultado negativo", () => {
    expect(subtractCentsFloor0(100 as Cents, 200 as Cents)).toBe(0);
    expect(subtractCentsFloor0(300 as Cents, 200 as Cents)).toBe(100);
  });

  it("applyPpm aplica a taxa com arredondamento explícito", () => {
    // 10 000 cêntimos × 2,5% (25 000 ppm) = 250 cêntimos
    expect(applyPpm(10_000 as Cents, 25_000 as Ppm)).toBe(250);
  });

  it("addCents soma sem erro de float (100 × 1 cêntimo = 100 cêntimos exatos)", () => {
    const values = Array.from({ length: 100 }, () => 1 as Cents);
    expect(addCents(...values)).toBe(100);
  });
});

// ── Invariante #2: dataset não aprovado nunca produz "ok" ───────────────────
describe("core/engine — dataset não aprovado é recusado em modo normal", () => {
  const dummyRule: Rule<{ x: Cents }, Cents> = {
    id: "test.dummy",
    requiredFields: ["x"],
    effectivePeriod: { from: "2026-01-01" as IsoDate, to: "2026-12-31" as IsoDate },
    jurisdictions: ["PT-CONTINENTE"],
    sources: [],
    compute: (input) => ({ value: input.x, calculation: [] }),
  };

  it("DATASET_2026 está marcado como draft (ainda não aprovado)", () => {
    expect(DATASET_2026.status).toBe("draft");
  });

  it("recusa produzir 'ok' com um dataset draft em modo normal", () => {
    const decision = evaluate(dummyRule, { x: 100 as Cents }, DATASET_2026, baseContext());
    expect(decision.status).toBe("unsupported");
    expect(isOk(decision)).toBe(false);
  });

  it("só produz 'ok' com allowUnapprovedDataset explícito (dev/testes)", () => {
    const decision = evaluate(
      dummyRule,
      { x: 100 as Cents },
      DATASET_2026,
      baseContext({ allowUnapprovedDataset: true }),
    );
    expect(decision.status).toBe("ok");
  });

  it("mesmo com allowUnapprovedDataset, um dataset approved também funciona", () => {
    const approved: Dataset = { ...DATASET_2026, status: "approved" };
    const decision = evaluate(dummyRule, { x: 100 as Cents }, approved, baseContext());
    expect(decision.status).toBe("ok");
  });
});

// ── Invariante #4: campos em falta → needs_input, nunca zero/default ───────
describe("core/engine — campos obrigatórios em falta", () => {
  const approved: Dataset = { ...DATASET_2026, status: "approved" };
  const rule: Rule<{ a: Cents; b: Cents }, Cents> = {
    id: "test.soma",
    requiredFields: ["a", "b"],
    effectivePeriod: { from: "2026-01-01" as IsoDate, to: "2026-12-31" as IsoDate },
    jurisdictions: ["PT-CONTINENTE"],
    sources: [],
    compute: (input) => ({ value: addCents(input.a, input.b), calculation: [] }),
  };

  it("devolve needs_input quando falta um campo obrigatório", () => {
    const decision = evaluate(rule, { a: 100 as Cents } as never, approved, baseContext());
    expect(decision.status).toBe("needs_input");
    if (decision.status === "needs_input") {
      expect(decision.missingFields).toEqual(["b"]);
    }
  });

  it("nunca trata o campo em falta como zero — não devolve 'ok' com um total parcial", () => {
    const decision = evaluate(rule, { a: 100 as Cents } as never, approved, baseContext());
    expect(decision.status).not.toBe("ok");
  });
});

// ── Invariante #3: vigência e jurisdição ────────────────────────────────────
describe("core/engine — vigência e jurisdição", () => {
  const approved: Dataset = { ...DATASET_2026, status: "approved" };
  const rule: Rule<{ x: Cents }, Cents> = {
    id: "test.regional",
    requiredFields: ["x"],
    effectivePeriod: { from: "2026-01-01" as IsoDate, to: "2026-12-31" as IsoDate },
    jurisdictions: ["PT-MADEIRA"],
    sources: [],
    compute: (input) => ({ value: input.x, calculation: [] }),
  };

  it("devolve not_applicable fora da jurisdição da regra", () => {
    const decision = evaluate(rule, { x: 1 as Cents }, approved, baseContext({ jurisdiction: "PT-CONTINENTE" }));
    expect(decision.status).toBe("not_applicable");
  });

  it("devolve ok dentro da jurisdição certa", () => {
    const decision = evaluate(rule, { x: 1 as Cents }, approved, baseContext({ jurisdiction: "PT-MADEIRA" }));
    expect(decision.status).toBe("ok");
  });

  it("devolve not_applicable fora da vigência da regra", () => {
    const decision = evaluate(
      rule,
      { x: 1 as Cents },
      approved,
      baseContext({ jurisdiction: "PT-MADEIRA", asOf: "2027-01-01" as IsoDate }),
    );
    expect(decision.status).toBe("not_applicable");
  });
});

// ── Regra de demonstração: adicional de solidariedade ───────────────────────
describe("domains/personal-income-tax — adicional de solidariedade (regra de demonstração)", () => {
  const approved: Dataset = { ...DATASET_2026, status: "approved" };

  it("0 abaixo de 80 000 €", () => {
    const input: AdicionalSolidariedadeInput = { taxableIncomeCents: eurosToCents(60_000) };
    const decision = evaluate(adicionalSolidariedadeRule, input, approved, baseContext());
    expect(isOk(decision) && decision.value).toBe(0);
  });

  it("2,5% na parte entre 80 000 € e 250 000 € — mesmo valor que o motor legado", () => {
    const input: AdicionalSolidariedadeInput = { taxableIncomeCents: eurosToCents(100_000) };
    const decision = evaluate(adicionalSolidariedadeRule, input, approved, baseContext());
    // (100 000 - 80 000) × 2,5% = 500 € = 50 000 cêntimos
    expect(isOk(decision) && decision.value).toBe(eurosToCents(500));
  });

  it("proveniência completa: engineVersion, datasetId, ruleId, evaluatedAt", () => {
    const input: AdicionalSolidariedadeInput = { taxableIncomeCents: eurosToCents(100_000) };
    const decision = evaluate(adicionalSolidariedadeRule, input, approved, baseContext());
    expect(isOk(decision)).toBe(true);
    if (isOk(decision)) {
      expect(decision.provenance.datasetId).toBe("pt-2026");
      expect(decision.provenance.ruleId).toBe(adicionalSolidariedadeRule.id);
      expect(decision.provenance.engineVersion).toBeTruthy();
      expect(decision.provenance.evaluatedAt).toBeTruthy();
      expect(decision.calculation.length).toBeGreaterThan(0);
      expect(decision.sources).toContain("art68aCirs");
    }
  });
});

// ── Invariante #5: domínio não migrado falha fechado ────────────────────────
describe("domains — falhar fechado quando o domínio ainda não foi migrado", () => {
  it("todos os domínios mínimos estão registados como contract_only", () => {
    expect(allDomainsAreContractOnly()).toBe(true);
    expect(Object.keys(COVERAGE)).toHaveLength(10);
  });

  it("route() devolve sempre unsupported (nenhum domínio foi migrado)", () => {
    const decision = route("corporate-income-tax");
    expect(decision.status).toBe("unsupported");
  });
});

// ── Validação semântica de fontes legais (não só HTTP 200) ──────────────────
describe("legal/validate — deteta uma fonte desatualizada mesmo respondendo 200", () => {
  const source: LegalSource = {
    key: "art87circ",
    authority: "portal-financas",
    url: "https://info.portaldasfinancas.gov.pt/.../circ_rep/Pages/irc87.aspx",
    expectedTitleContains: ["Artigo 87"],
    forbiddenPhrases: ["versão em vigor até", "25 %"],
    legalReference: "Art. 87.º CIRC",
    effectivePeriod: { from: "2026-01-01" },
    state: "active",
  };

  it("reprova o caso real do relatório: página responde 200 mas mostra a taxa antiga", () => {
    const stale = validateSource(source, {
      finalUrl: source.url,
      title: "Artigo 87º - Taxas",
      bodyText: "Versão em vigor até 05/06/2013. A taxa do IRC é de 25 %.",
    });
    expect(stale.valid).toBe(false);
    expect(stale.problems.length).toBeGreaterThan(0);
  });

  it("aprova a fonte corrigida (CIRC_2R), com a taxa 2026", () => {
    const current = validateSource(source, {
      finalUrl: source.url,
      title: "Artigo 87.º - Taxas",
      bodyText: "A taxa do IRC é de 19 % em 2026.",
    });
    expect(current.valid).toBe(true);
    expect(current.problems).toHaveLength(0);
  });

  it("reprova uma fonte marcada como superseded/withdrawn independentemente do conteúdo", () => {
    const result = validateSource(
      { ...source, state: "withdrawn" },
      { finalUrl: source.url, title: "Artigo 87.º - Taxas", bodyText: "A taxa do IRC é de 19 % em 2026." },
    );
    expect(result.valid).toBe(false);
  });
});
