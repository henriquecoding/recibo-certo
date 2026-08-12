// ─────────────────────────────────────────────────────────────────────────
//  Invariantes do dashboard — a suite que a secção 9 do relatório pediu.
//
//  A auditoria notou que 1 052 testes podiam passar enquanto o painel
//  permanecia inconsistente, porque nenhum deles verificava os CONTRATOS
//  compostos: paridade entre superfícies, escopo anual, e os guardiões.
//  É isso que se testa aqui.
// ─────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import {
  resultadoDoRecibo,
  resumoDoAno,
  resumoDoMes,
  resumirRecibos,
  recibosDoAno,
  anoDoRecibo,
  METODOLOGIA_VERSION,
  type Recibo,
} from "@/lib/recibos-contrato";
import { recibosTabela } from "@/lib/export";
import { avaliarIVA } from "@/lib/fiscal-iva-guardiao";
import { avaliarRetencao, taxasPorPeso } from "@/lib/fiscal-retencao-guardiao";
import { avaliarSS, noPrimeiroAnoDeAtividade } from "@/lib/fiscal-ss-guardiao";
import { saudeFiscal } from "@/lib/insights";
import { IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO, IAS, SS_ACUMULACAO_LIMITE_MENSAL } from "@/lib/fiscal-data";
import { DEFAULTS as PREFS, normalizar, dentroDoPrimeiroAno } from "@/lib/store/preferencias-fiscais";
import { TIPOS_CENARIO, META_TIPO_CENARIO } from "@/lib/store/cenarios";
import { dataIsoValida, nifValido, telefoneValido, montanteValido } from "@/lib/validacao-dominio";
import { adaptarCenarioVencimento } from "@/lib/store/cenario-vencimento-adaptador";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LIMITE = IVA_ISENCAO_LIMITE.value;
const EXCESSO = IVA_ISENCAO_EXCESSO.value;

// ─── Golden dataset (secção 9.1) ────────────────────────────────────────
const recibo = (over: Partial<Recibo> = {}): Recibo => ({
  id: over.id ?? `r-${Math.random().toString(36).slice(2, 8)}`,
  data: "2026-03-15",
  cliente: "Cliente",
  valor: 1000,
  tipo: "art151",
  regiao: "continente",
  regimeIVA: "isento",
  baseSS: "servicos",
  dispensaRetencao: false,
  ...over,
});

const GOLDEN: Recibo[] = [
  // Art. 53.º sem retenção
  recibo({ id: "g1", data: "2026-01-10", valor: 1200, regimeIVA: "isento", dispensaRetencao: true }),
  // IVA normal com retenção
  recibo({ id: "g2", data: "2026-02-20", valor: 2500, regimeIVA: "normal", dispensaRetencao: false }),
  // Vendas (sem retenção por natureza) e base de SS de bens
  recibo({ id: "g3", data: "2026-06-30", valor: 800, tipo: "vendas", baseSS: "bens" }),
  // Direitos de autor — coeficiente e retenção distintos
  recibo({ id: "g4", data: "2026-09-01", valor: 3000, tipo: "diretosAutor" }),
  // Dois anos civis a coexistir
  recibo({ id: "g5", data: "2025-12-31", valor: 5000 }),
  recibo({ id: "g6", data: "2027-01-01", valor: 7000 }),
  // Com instantâneo da simulação anual
  recibo({
    id: "g7",
    data: "2026-11-11",
    valor: 1500,
    _computed: { irsEstimado: 260, segSocial: 224.7, iva: 0, liquido: 1015.3 },
  }),
];

describe("invariante da verdade única (9.1)", () => {
  it("o mesmo recibo devolve os mesmos campos no painel e no CSV", () => {
    const tabela = recibosTabela(GOLDEN);
    GOLDEN.forEach((r, i) => {
      const x = resultadoDoRecibo(r);
      const linha = tabela.linhas[i];
      const valorDe = (idx: number) => {
        const c = linha[idx] as { tipo: string; valor?: unknown };
        return c.tipo === "vazio" ? null : (c.valor as number);
      };
      // Colunas: data, ano, cliente, tipo, bruto, iva, retenção, irs, ss, líquido, metodologia
      expect(valorDe(1)).toBe(x.anoFiscal);
      expect(valorDe(4)).toBeCloseTo(x.bruto, 6);
      expect(valorDe(5)).toBeCloseTo(x.ivaCobrado, 6);
      expect(valorDe(6)).toBeCloseTo(x.retencaoEfetiva, 6);
      expect(valorDe(7)).toBe(x.irsEstimado === null ? null : x.irsEstimado);
      expect(valorDe(8)).toBeCloseTo(x.segurancaSocialEstimada, 6);
      expect(valorDe(9)).toBeCloseTo(x.liquido, 6);
    });
  });

  it("o resumo agregado é a soma exata dos resultados individuais", () => {
    const doAno = recibosDoAno(GOLDEN, 2026);
    const r = resumoDoAno(GOLDEN, 2026);
    const soma = doAno.reduce(
      (acc, x) => {
        const v = resultadoDoRecibo(x);
        return {
          bruto: acc.bruto + v.bruto,
          iva: acc.iva + v.ivaCobrado,
          ret: acc.ret + v.retencaoEfetiva,
          ss: acc.ss + v.segurancaSocialEstimada,
          liq: acc.liq + v.liquido,
        };
      },
      { bruto: 0, iva: 0, ret: 0, ss: 0, liq: 0 },
    );
    expect(r.bruto).toBeCloseTo(soma.bruto, 6);
    expect(r.ivaCobrado).toBeCloseTo(soma.iva, 6);
    expect(r.retencaoEfetiva).toBeCloseTo(soma.ret, 6);
    expect(r.segurancaSocialEstimada).toBeCloseTo(soma.ss, 6);
    expect(r.liquido).toBeCloseTo(soma.liq, 6);
    expect(r.total).toBe(doAno.length);
  });

  it("o líquido é sempre bruto menos retenção efetiva menos SS", () => {
    GOLDEN.forEach((r) => {
      const x = resultadoDoRecibo(r);
      expect(x.liquido).toBeCloseTo(x.bruto - x.retencaoEfetiva - x.segurancaSocialEstimada, 6);
      expect(x.entradaConta).toBeCloseTo(x.bruto + x.ivaCobrado - x.retencaoEfetiva, 6);
    });
  });

  it("retenção efetiva e IRS anual estimado nunca são o mesmo campo", () => {
    const comSnapshot = resultadoDoRecibo(GOLDEN.find((r) => r.id === "g7")!);
    expect(comSnapshot.irsEstimado).toBe(260);
    expect(comSnapshot.origemIRS).toBe("snapshot");
    // A retenção continua a sair do motor, não do instantâneo.
    expect(comSnapshot.retencaoEfetiva).not.toBe(260);

    const semSnapshot = resultadoDoRecibo(GOLDEN.find((r) => r.id === "g2")!);
    expect(semSnapshot.irsEstimado).toBeNull();
    expect(semSnapshot.origemIRS).toBe("indisponivel");
  });

  it("IVA a entregar é nulo enquanto não houver IVA dedutível", () => {
    // Chamar-lhe "a entregar" com metade dos dados era afirmar o que não se
    // sabe (RC-P1-08).
    GOLDEN.forEach((r) => expect(resultadoDoRecibo(r).ivaAEntregar).toBeNull());
    expect(resumoDoAno(GOLDEN, 2026).ivaAEntregar).toBeNull();
  });

  it("cada resultado leva ano fiscal e versão de metodologia", () => {
    GOLDEN.forEach((r) => {
      const x = resultadoDoRecibo(r);
      expect(x.metodologiaVersion).toBe(METODOLOGIA_VERSION);
      expect(x.anoFiscal).toBe(Number(r.data.slice(0, 4)));
    });
  });
});

describe("escopo anual (RC-P0-01)", () => {
  it("um recibo de 2026 não entra no acumulado de 2027", () => {
    const de2026 = GOLDEN.filter((r) => r.data.startsWith("2026")).reduce((s, r) => s + r.valor, 0);
    expect(resumoDoAno(GOLDEN, 2026).bruto).toBeCloseTo(de2026, 6);
    expect(resumoDoAno(GOLDEN, 2027).bruto).toBeCloseTo(7000, 6);
    expect(resumoDoAno(GOLDEN, 2025).bruto).toBeCloseTo(5000, 6);
    // A soma dos anos é o total: nenhum recibo se perde nem se conta duas vezes.
    const total = GOLDEN.reduce((s, r) => s + r.valor, 0);
    expect(
      [2025, 2026, 2027].reduce((s, a) => s + resumoDoAno(GOLDEN, a).bruto, 0),
    ).toBeCloseTo(total, 6);
  });

  it("31/12 e 01/01 ficam nos seus anos, seja qual for o fuso", () => {
    // Lido do prefixo da data, não construído com `new Date` — é isto que
    // torna o resultado independente do relógio de quem abre o painel.
    expect(anoDoRecibo({ data: "2026-12-31" })).toBe(2026);
    expect(anoDoRecibo({ data: "2027-01-01" })).toBe(2027);
    const tz = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati"; // UTC+14
      expect(anoDoRecibo({ data: "2026-12-31" })).toBe(2026);
      process.env.TZ = "Pacific/Midway"; // UTC−11
      expect(anoDoRecibo({ data: "2027-01-01" })).toBe(2027);
    } finally {
      process.env.TZ = tz;
    }
  });

  it("o resumo do mês é escopado ao ano desse mês", () => {
    const r = resumoDoMes(GOLDEN, new Date(2026, 2, 15));
    expect(r.anoFiscal).toBe(2026);
    expect(r.total).toBe(0); // nenhum recibo em março de 2026 no dataset
    const marco = resumoDoMes([...GOLDEN, recibo({ id: "m1", data: "2026-03-02", valor: 100 })], new Date(2026, 2, 15));
    expect(marco.total).toBe(1);
  });

  it("uma vista histórica declara o escopo nulo em vez de o esquecer", () => {
    expect(resumirRecibos(GOLDEN, null).anoFiscal).toBeNull();
    expect(resumirRecibos(GOLDEN, null).total).toBe(GOLDEN.length);
  });
});

// ─── Limites fiscais (secção 9.2) ───────────────────────────────────────

describe("guardião de IVA nos limiares do Art. 53.º/58.º (9.2)", () => {
  const av = (faturado: number, anterior: number | null = 0) =>
    avaliarIVA({ faturadoNoAno: faturado, faturadoAnoAnterior: anterior, regime: "isento", hoje: new Date(2026, 5, 15) });

  it("14 999,99 € ainda está dentro do limite", () => {
    expect(av(LIMITE - 0.01).estado).toBe("preparacao");
    expect(av(LIMITE - 0.01).excesso).toBe(0);
  });

  it("15 000 € exatos ainda não é ultrapassagem", () => {
    expect(av(LIMITE).estado).toBe("preparacao");
    expect(av(LIMITE).excesso).toBe(0);
  });

  it("15 000,01 € é ultrapassagem até 25% — IVA só a 1 de janeiro seguinte", () => {
    const v = av(LIMITE + 0.01);
    expect(v.estado).toBe("excedido-ate-25");
    expect(v.excesso).toBeCloseTo(0.01, 6);
    expect(v.acao).toMatch(/janeiro de 2027/);
  });

  it("18 750 € continua dentro dos 25% de tolerância", () => {
    expect(av(EXCESSO).estado).toBe("excedido-ate-25");
  });

  it("18 750,01 € passa dos 25% — IVA devido desde o momento do excesso", () => {
    const v = av(EXCESSO + 0.01);
    expect(v.estado).toBe("excedido-mais-25");
    expect(v.acao).toMatch(/15 dias/);
  });

  it("o estado de ultrapassagem é alcançável (o bug da ordem de precedência)", () => {
    // Aos 95% do limite o antigo componente dizia "crítico" e nunca chegava a
    // reconhecer a ultrapassagem. 14 250 € são 95% de 15 000 €.
    expect(av(LIMITE * 0.95).estado).toBe("preparacao");
    expect(av(LIMITE * 1.01).estado).toBe("excedido-ate-25");
  });

  it("o excesso nunca aparece como zero depois de ultrapassar", () => {
    const v = av(LIMITE + 1234.56);
    expect(v.excesso).toBeCloseTo(1234.56, 6);
    expect(v.restante).toBe(0);
  });

  it("a elegibilidade afere-se pelo ANO ANTERIOR", () => {
    const v = avaliarIVA({ faturadoNoAno: 1000, faturadoAnoAnterior: LIMITE + 1, regime: "isento" });
    expect(v.estado).toBe("nao-elegivel");
  });

  it("sem regime conhecido não conclui nada", () => {
    expect(avaliarIVA({ faturadoNoAno: 20000, faturadoAnoAnterior: null, regime: null }).estado).toBe("sem-informacao");
  });

  it("no regime normal o limiar do Art. 53.º deixa de ser o assunto", () => {
    expect(avaliarIVA({ faturadoNoAno: 50000, faturadoAnoAnterior: null, regime: "normal-trimestral" }).estado)
      .toBe("regime-normal");
  });
});

describe("guardião de retenção (RC-P1-03)", () => {
  // Valores baixos de propósito: a 500 €/mês a previsão anual fica bem abaixo
  // dos 15 000 €, para o teste isolar a OPÇÃO e não a proximidade do limite.
  const recibos2026 = [recibo({ id: "a", data: "2026-02-01", valor: 500 }), recibo({ id: "b", data: "2026-05-01", valor: 500 })];

  it("distingue poder dispensar de ter optado", () => {
    const semSaber = avaliarRetencao({ recibos: recibos2026, ano: 2026, optouDispensa: null, faturadoAnoAnterior: null, hoje: new Date(2026, 5, 15) });
    expect(semSaber.estado).toBe("sem-informacao");
    expect(semSaber.emFalta.length).toBeGreaterThan(0);

    const optou = avaliarRetencao({ recibos: recibos2026, ano: 2026, optouDispensa: true, faturadoAnoAnterior: 10000, hoje: new Date(2026, 5, 15) });
    expect(optou.estado).toBe("optou-dispensa");

    const naoOptou = avaliarRetencao({ recibos: recibos2026, ano: 2026, optouDispensa: false, faturadoAnoAnterior: 10000, hoje: new Date(2026, 5, 15) });
    expect(naoOptou.estado).toBe("pode-dispensar");
  });

  it("a dispensa cessa no mês SEGUINTE ao da ultrapassagem", () => {
    const muitos = [
      recibo({ id: "x1", data: "2026-01-15", valor: 8000 }),
      recibo({ id: "x2", data: "2026-04-10", valor: 8000 }),
    ];
    const v = avaliarRetencao({ recibos: muitos, ano: 2026, optouDispensa: true, faturadoAnoAnterior: 0, hoje: new Date(2026, 5, 1) });
    expect(v.estado).toBe("deve-reter");
    expect(v.cessaEm).toBe("2026-05"); // ultrapassa em abril → cessa em maio
  });

  it("as taxas são ponderadas por VALOR, não por contagem de recibos", () => {
    const misto = [
      ...Array.from({ length: 10 }, (_, i) => recibo({ id: `p${i}`, data: "2026-01-05", valor: 50, tipo: "outros" })),
      recibo({ id: "grande", data: "2026-02-05", valor: 40000, tipo: "art151" }),
    ];
    const taxas = taxasPorPeso(misto, 2026);
    // O de 40 000 € pesa mais do que dez de 50 €, mesmo sendo um só.
    expect(taxas[0].tipo).toBe("art151");
    expect(taxas[0].peso).toBeGreaterThan(0.9);
  });

  it("a previsão do ano entra na decisão, não só o acumulado", () => {
    // 6 000 € em fevereiro projetam 36 000 € no ano — muito acima do limite.
    const v = avaliarRetencao({
      recibos: [recibo({ id: "f", data: "2026-02-01", valor: 6000 })],
      ano: 2026,
      optouDispensa: true,
      faturadoAnoAnterior: 0,
      hoje: new Date(2026, 1, 20),
    });
    expect(v.estado).toBe("aviso");
    expect(v.previsaoAnual).toBeGreaterThan(v.limite);
  });
});

describe("guardião de Segurança Social (RC-P0-08)", () => {
  const base = {
    recibos: [recibo({ id: "s1", data: "2026-02-10", valor: 3000 }), recibo({ id: "s2", data: "2026-03-10", valor: 3000 })],
    ano: 2026,
    hoje: new Date(2026, 2, 20), // 1.º trimestre
  };

  it("um booleano de acumulação NÃO zera a reserva", () => {
    const v = avaliarSS({
      ...base,
      dataInicioAtividade: "",
      acumulaEmprego: true,
      entidadesDistintas: null,
      remuneracaoDependenteMensal: null,
    });
    expect(v.estado).toBe("acumulacao-por-confirmar");
    expect(v.valorReservar).toBeGreaterThan(0);
    expect(v.emFalta.length).toBeGreaterThan(0);
  });

  it("com todas as condições cumpridas e abaixo de 4 × IAS, dispensa", () => {
    const v = avaliarSS({
      ...base,
      recibos: [recibo({ id: "s3", data: "2026-02-10", valor: 500 })],
      dataInicioAtividade: "2020-01-01",
      acumulaEmprego: true,
      entidadesDistintas: true,
      remuneracaoDependenteMensal: IAS.value + 100,
    });
    expect(v.estado).toBe("dispensa-acumulacao");
    expect(v.valorReservar).toBe(0);
    expect(v.rendimentoRelevanteMedioMensal).toBeLessThanOrEqual(SS_ACUMULACAO_LIMITE_MENSAL.value);
  });

  it("acima de 4 × IAS contribui sobre o EXCEDENTE, não sobre tudo nem zero", () => {
    const v = avaliarSS({
      ...base,
      recibos: [recibo({ id: "s4", data: "2026-02-10", valor: 30000 })],
      dataInicioAtividade: "2020-01-01",
      acumulaEmprego: true,
      entidadesDistintas: true,
      remuneracaoDependenteMensal: IAS.value + 100,
    });
    expect(v.estado).toBe("acumulacao-parcial");
    expect(v.valorReservar).toBeGreaterThan(0);
    // Menos do que a contribuição cheia sobre a base toda.
    expect(v.valorReservar).toBeLessThan(v.baseTotal * 0.214);
  });

  it("remuneração do dependente abaixo de 1 × IAS não dá dispensa", () => {
    const v = avaliarSS({
      ...base,
      dataInicioAtividade: "2020-01-01",
      acumulaEmprego: true,
      entidadesDistintas: true,
      remuneracaoDependenteMensal: IAS.value - 1,
    });
    expect(v.estado).toBe("normal");
    expect(v.valorReservar).toBeGreaterThan(0);
  });

  it("o primeiro ano deriva da data REAL de início", () => {
    expect(noPrimeiroAnoDeAtividade("2026-01-01", new Date(2026, 5, 1))).toBe(true);
    expect(noPrimeiroAnoDeAtividade("2024-01-01", new Date(2026, 5, 1))).toBe(false);
    // Sem data, não se afirma nem se nega.
    expect(noPrimeiroAnoDeAtividade("", new Date(2026, 5, 1))).toBeNull();
    expect(dentroDoPrimeiroAno("2026-03-01", new Date(2026, 8, 1))).toBe(true);
  });
});

// ─── Saúde fiscal (RC-P1-04) ────────────────────────────────────────────

describe("saúde fiscal sem falsa precisão", () => {
  it("sem recibos e sem perfil não devolve score", () => {
    const s = saudeFiscal([], { prefs: PREFS, ref: new Date(2026, 5, 15) });
    expect(s.score).toBeNull();
    expect(s.estado).toBe("Por configurar");
    expect(s.emFalta.length).toBeGreaterThan(0);
    expect(s.confianca).toBe("insuficiente");
  });

  it("com perfil e recibos devolve um score explicável", () => {
    const prefs = { ...PREFS, regimeIVA: "isento" as const, pagamentosPorConta: "nao" as const, dataInicioAtividade: "2020-01-01" };
    const s = saudeFiscal([recibo({ id: "h1", data: "2026-06-05", valor: 1000 })], { prefs, ref: new Date(2026, 5, 15) });
    expect(s.score).not.toBeNull();
    expect(s.score!).toBeGreaterThanOrEqual(0);
    expect(s.score!).toBeLessThanOrEqual(100);
    expect(s.metodologia.length).toBeGreaterThan(0);
    expect(s.fatores.length).toBeGreaterThan(0);
  });

  it("nunca finge saber o que foi entregue", () => {
    const prefs = { ...PREFS, regimeIVA: "isento" as const, pagamentosPorConta: "nao" as const };
    const s = saudeFiscal([recibo({ id: "h2", data: "2026-06-05", valor: 1000 })], { prefs, ref: new Date(2026, 5, 15) });
    expect(s.fatores.some((f) => f.estado === "desconhecido" && /por confirmar/i.test(f.label))).toBe(true);
  });
});

// ─── Validação de domínio (RC-P1-12) ────────────────────────────────────

describe("validação de domínio", () => {
  it("recusa datas que não existem no calendário", () => {
    expect(dataIsoValida("2026-02-30")).toBe(false);
    expect(dataIsoValida("2026-13-01")).toBe(false);
    expect(dataIsoValida("ontem")).toBe(false);
    expect(dataIsoValida("2026-02-28")).toBe(true);
    expect(dataIsoValida("2028-02-29")).toBe(true); // ano bissexto
    expect(dataIsoValida("2026-02-29")).toBe(false);
  });

  it("recusa montantes negativos e não finitos", () => {
    expect(montanteValido(-1)).toBe(false);
    expect(montanteValido(Number.NaN)).toBe(false);
    expect(montanteValido(Infinity)).toBe(false);
    expect(montanteValido(0)).toBe(true);
  });

  it("valida o dígito de controlo do NIF e o telefone", () => {
    expect(nifValido("123456789")).toBe(true);
    expect(nifValido("123456788")).toBe(false);
    expect(telefoneValido("912345678")).toBe(true);
    expect(telefoneValido("+351 912 345 678")).toBe(true);
    expect(telefoneValido("112")).toBe(false);
  });

  it("as preferências normalizam enums inválidos em vez de os aceitar", () => {
    const p = normalizar({ regimeIVA: "inventado", dependentes: -3, despSaude: "muito", conjunta: true });
    expect(p.regimeIVA).toBe("desconhecido");
    expect(p.dependentes).toBe(0);
    expect(p.despSaude).toBe(0);
    expect(p.conjunta).toBe(true);
  });
});

// ─── Cenários (RC-P0-04, RC-P1-09) ──────────────────────────────────────

describe("cenários: uma fonte só de tipos", () => {
  it("heranças é um tipo de primeira classe", () => {
    expect(TIPOS_CENARIO).toContain("herancas");
    expect(META_TIPO_CENARIO.herancas.rota).toBe("/dashboard/herancas");
  });

  it("a constraint SQL aceita exatamente os tipos do cliente", () => {
    // Uma constraint mais estreita do que o cliente é como os cenários de
    // heranças eram guardados na aparência e recusados na realidade.
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/032_dashboard_contrato.sql"), "utf8");
    const m = sql.match(/CHECK \(tipo IN \(([^)]+)\)\)/);
    expect(m).not.toBeNull();
    const naSql = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
    expect(naSql).toEqual([...TIPOS_CENARIO].sort());
  });

  it("META_TIPO_CENARIO cobre todos os tipos declarados", () => {
    TIPOS_CENARIO.forEach((t) => {
      expect(META_TIPO_CENARIO[t]).toBeDefined();
      expect(META_TIPO_CENARIO[t].rota.startsWith("/dashboard/")).toBe(true);
    });
  });
});

// ─── Ponte vencimento → IRS (RC-P1-02) ──────────────────────────────────

describe("adaptador do cenário de vencimento", () => {
  const snapshotV2 = {
    version: 2,
    gross: "1500",
    dependants: 2,
    mealEnabled: true,
    mealDaily: "10",
    mealDays: "22",
    mealCard: true,
    region: "madeira",
    maritalStatus: "casado",
    disability: true,
    youthIrs: true,
    youthYear: 3,
    duodecimos: true,
    rubrics: [
      { id: "1", type: "bonus", amount: 300, hours: 0, days: 0, dailyAmount: 0 },
      { id: "2", type: "travel_national", amount: 0, hours: 0, days: 5, dailyAmount: 50 },
    ],
  };

  it("preserva o que a ponte legada perdia", () => {
    const v = adaptarCenarioVencimento(snapshotV2)!;
    expect(v).not.toBeNull();
    expect(v.regiao).toBe("madeira");
    expect(v.estadoCivil).toBe("casado");
    expect(v.deficiencia).toBe(true);
    expect(v.irsJovemAno).toBe(3);
    expect(v.duodecimos).toBe(true);
    // Prémio (300) + ajudas de custo (5 × 50 = 250) = 550/mês → 6 600/ano.
    expect(v.rubricasAnualizadas).toBeCloseTo(6600, 6);
    expect(v.brutoAnual).toBeGreaterThan(1500 * 14);
  });

  it("lê também o formato antigo, sem rebentar", () => {
    const v = adaptarCenarioVencimento({ salarioBruto: 1200, dependentes: 1, subsidioRefeicaoDia: 6, diasUteis: 22 })!;
    expect(v.salarioBase).toBe(1200);
    expect(v.dependentes).toBe(1);
    expect(v.versao).toBe(1);
  });

  it("diz o que NÃO importou em vez de o esconder", () => {
    const v = adaptarCenarioVencimento(snapshotV2)!;
    expect(v.naoImportado.length).toBeGreaterThan(0);
    expect(v.naoImportado.join(" ")).toMatch(/anualizadas/);
  });

  it("um instantâneo sem salário não gera importação vazia", () => {
    expect(adaptarCenarioVencimento({ version: 2, gross: "0" })).toBeNull();
  });
});
