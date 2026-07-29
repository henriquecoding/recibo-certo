// Verificação final: cada ponto dos dois relatórios, validado por asserção.
import { describe, it, expect } from "vitest";
import * as FD from "@/lib/fiscal-data";
import * as F from "@/lib/fiscal";
import * as FDep from "@/lib/fiscal-dependente";
import * as FLab from "@/lib/fiscal-laboral";
import { solveNetToGross } from "@/lib/payroll-inverse";
import { GUIDE_MANIFESTS } from "@/lib/guias/manifests";
import { LEGAL_CLAIMS } from "@/lib/guias/claims";
import { LEITURAS_POR_GUIA } from "@/lib/guias";
import { DOMINIOS_QUE_BLOQUEIAM } from "@/lib/guias/legal-sources";

const claim = (id: string) => LEGAL_CLAIMS.find((c) => c.id === id);
const man = (id: string) => GUIDE_MANIFESTS.find((m) => m.id === id);

describe("RELATÓRIO 1 — simulador de vencimento", () => {
  it("1.1 um só motor, um só líquido", () => {
    const v = FDep.calcularVencimento({ salarioBruto: 1500, subsidioRefeicaoDia: 12, subsidioRefeicaoCartao: true, diasUteis: 22 });
    expect(v.liquido).toBeCloseTo(1418.93, 2);
  });
  it("1.2 custoEmpresa inclui o subsídio de refeição", () => {
    const v = FDep.calcularVencimento({ salarioBruto: 1000, subsidioRefeicaoDia: 10.46, subsidioRefeicaoCartao: true, diasUteis: 22 });
    expect(v.custoEmpresa).toBeCloseTo(1467.62, 2);
    expect(v.seguroAcidentesEstimado).toBeGreaterThan(0);
  });
  it("1.3 retenção e imposto apurado disponíveis lado a lado", () => {
    const m = FDep.mealheiroDependente({ salarioBruto: 1000 });
    expect(m.irsRetido).toBeCloseTo(504, 0);
    expect(m.irsApurado).toBeCloseTo(754, 0);
    expect(m.acerto).toBeCloseTo(250, 0);
  });
  it("1.4 deficiência: Art. 87.º + Art. 56.º-A", () => {
    const c = FDep.mealheiroDependente({ salarioBruto: 2500, deficiencia: true });
    expect(c.exclusaoDeficiencia).toBe(2500);
    expect(c.deducaoDeficiencia).toBeCloseTo(2148.52, 2);
  });
  it("1.5 adicional de solidariedade na categoria A", () => {
    const a = FDep.mealheiroDependente({ salarioBruto: 10000 });
    expect(a.adicionalSolidariedade).toBeCloseTo(1115, 0);
    expect(typeof F.adicionalSolidariedade).toBe("function");
  });
  it("1.6 deduções à coleta completas", () => {
    const c = FDep.mealheiroDependente({ salarioBruto: 2500, conjunta: true, deducoes: { saude: 2000 }, ascendentes: 1, pensaoAlimentos: 1200, ppr: { valor: 2000, escalaoIdade: "ate35" }, donativos: { valor: 500, fator: 1, semLimite: false } });
    expect(c.deducaoDespesas).toBeGreaterThan(0);
    expect(c.deducaoAscendentes).toBeGreaterThan(0);
    expect(c.deducaoPensaoAlimentos).toBeGreaterThan(0);
  });
  it("1.7 variável retido pela linha da tabela", () => {
    const s = FDep.mealheiroDependente({ salarioBruto: 2000 });
    const c = FDep.mealheiroDependente({ salarioBruto: 2000, variavelAnual: 6000 });
    expect(c.irsRetido - s.irsRetido).toBeGreaterThan(6000 * (s.irsRetido / 28000));
  });
  it("1.8 dedução por dependentes única, com bebés e guarda partilhada", () => {
    expect(F.deducaoDependentesColeta({ bebe: 1 })).toBe(FD.DEDUCAO_DEPENDENTE_BEBE.value);
    expect(F.deducaoDependentesColeta({ lista: [{ ate3: false, deficiente: false, guarda: 0.5 }] })).toBe(FD.DEDUCAO_DEPENDENTE.value * 0.5);
    const c = FDep.mealheiroDependente({ salarioBruto: 2500, dependentesBebe: 1 });
    expect(c.deducaoDependentes).toBe(FD.DEDUCAO_DEPENDENTE_BEBE.value);
  });
  it("1.10 taxaEfetiva com denominador único", () => {
    const v = FDep.calcularVencimento({ salarioBruto: 1500, subsidioRefeicaoDia: 12, subsidioRefeicaoCartao: true, diasUteis: 22 });
    const d = FDep.calcularReciboMensal({ salarioBruto: 1500, subsidioRefeicaoDia: 12, subsidioRefeicaoCartao: true, diasSubsidio: 22 });
    expect(v.taxaEfetiva).toBeCloseTo(d.taxaEfetiva, 9);
  });
  it("1.11 solver único, com casos insolúveis tratados", () => {
    expect(solveNetToGross({ target: 5000, liquidoDe: () => 100, maximoBruto: 10 }).reached).toBe(false);
  });
  it("1.13 âmbito novo alcançável", () => {
    expect(FLab.calcularPenhora({ liquidoMensal: 3000, temOutroRendimento: true }).penhoravel).toBeGreaterThan(0);
    expect(FLab.calcularTrabalhoNoturno({ retribuicaoMensal: 1200, horasNoturnas: 10 }).valorAcrescimo).toBeGreaterThan(0);
    expect(FLab.calcularSubsidioDoenca({ remuneracaoReferenciaMensal: 1200, diasIncapacidade: 20 }).total).toBeGreaterThan(0);
    expect(FLab.compararLicencaParental(1200)).toHaveLength(4);
    expect(FLab.calcularSubsidioDesemprego({ remuneracaoReferenciaMensal: 1500 }).montanteMensal).toBeGreaterThan(0);
    expect(FLab.calcularCessacaoContrato({ retribuicaoBase: 1200, dataAdmissao: "2010-01-01", dataCessacao: "2026-01-01" }).tranches.length).toBe(3);
    expect(FLab.calcularImpactoFaltas({ retribuicaoBase: 1200, diasFalta: 1, subsidioRefeicaoDia: 6, injustificada: true }).subsidioRefeicaoPerdido).toBeGreaterThan(0);
    expect(FLab.calcularTempoParcial(1200, 20).diasFerias).toBe(22);
    expect(FLab.calcularDireitoFerias({ retribuicaoMensal: 1200, diasNaoGozadosPorCulpaDoEmpregador: 5 }).indemnizacaoNaoGozadas).toBeGreaterThan(0);
  });
});

describe("RELATÓRIO 1 — comparador", () => {
  it("2.1 dependentes nos três cenários", () => {
    const a = FDep.compararCategorias({ brutoAnual: 40000, dependentes: 0 });
    const b = FDep.compararCategorias({ brutoAnual: 40000, dependentes: 2 });
    expect(b.freelancer.liquido).toBeGreaterThan(a.freelancer.liquido);
    expect(b.dependente.liquido).toBeGreaterThan(a.dependente.liquido);
  });
  it("2.2 categoria A pelo IRS apurado", () => {
    expect(FDep.compararCategorias({ brutoAnual: 40000 }).dependente.liquido).toBeCloseTo(27451, 0);
    expect(FDep.compararCategorias({ brutoAnual: 80000 }).dependente.liquido).toBeCloseTo(47887, 0);
  });
  it("2.3/2.4 contabilista e derrama configuráveis", () => {
    const c = FDep.compararCategorias({ brutoAnual: 40000, custosEmpresa: 1920, derrama: 0 });
    expect(c.empresa.custosEmpresa).toBe(1920);
    expect(c.empresa.derrama).toBe(0);
  });
  it("2.6 uma só fórmula de IRC", () => {
    expect(typeof F.coletaIRC).toBe("function");
    expect(F.coletaIRC(40000)).toBeGreaterThan(0);
  });
  it("2.7 custo do empregador disponível", () => {
    expect(FDep.compararCategorias({ brutoAnual: 40000 }).dependente.custoEmpregador).toBeCloseTo(49500, 0);
  });
  it("2.8 situação pessoal completa chega ao motor", () => {
    const s = FDep.compararCategorias({ brutoAnual: 30000 });
    const c = FDep.compararCategorias({ brutoAnual: 30000, irsJovemAno: 1, estadoCivil: "casadoUnico", conjunta: true, regiao: "madeira", deducoes: { saude: 1000 } });
    expect(c.dependente.liquido).not.toBeCloseTo(s.dependente.liquido, 0);
  });
});

describe("RELATÓRIO 2 — auditoria dos guias", () => {
  it("A1 bloqueio declarado por domínio", () => {
    expect(DOMINIOS_QUE_BLOQUEIAM.length).toBeGreaterThan(10);
    expect(DOMINIOS_QUE_BLOQUEIAM).toContain("diariodarepublica.pt");
  });
  it("A2/A3 as 14 reciprocidades", () => {
    const pares: [string, string][] = [
      ["iva-recibos-verdes", "recuperar-iva-incobravel"], ["iva-recibos-verdes", "iva-de-caixa"],
      ["fatura-vs-recibo", "juros-de-mora"], ["fatura-vs-recibo", "fatura-nao-paga"],
      ["seguranca-social", "falsos-recibos-verdes"], ["acumulacao-emprego", "falsos-recibos-verdes"],
      ["abrir-empresa", "reversao-gerentes"], ["unipessoal-vs-eni", "reversao-gerentes"],
      ["irc", "reversao-gerentes"], ["reembolso-irs", "contestar-liquidacao"],
      ["reembolso-irs", "juros-indemnizatorios"], ["calendario-fiscal", "prazos-fiscais-divida"],
      ["calendario-fiscal", "plano-prestacoes"], ["cessar-atividade", "prazos-fiscais-divida"],
      ["contabilidade-organizada", "iva-de-caixa"], ["recibo-vencimento", "penhora-limites"],
      ["recibo-vencimento", "falsos-recibos-verdes"], ["escaloes-irs", "contestar-liquidacao"],
      ["abrir-atividade", "falsos-recibos-verdes"],
    ];
    for (const [de, para] of pares) expect(man(de)!.relatedGuideIds, `${de}→${para}`).toContain(para);
  });
  it("A4 leituras complementares nos 14 + nos 14 novos", () => {
    const todos = ["fatura-nao-paga","juros-de-mora","cobrar-divida","recuperar-iva-incobravel","iva-de-caixa","contestar-liquidacao","prazos-fiscais-divida","juros-indemnizatorios","execucao-fiscal","plano-prestacoes","suspender-execucao","penhora-limites","reversao-gerentes","falsos-recibos-verdes","salario-gerente-ou-dividendos","distribuir-lucros","pagamentos-por-conta-irc","prejuizos-fiscais","contratar-primeiro-trabalhador","modelo-22-e-ies","fechar-empresa","baixa-medica","licenca-parental","subsidio-desemprego","fim-do-contrato","ferias-direitos","trabalho-noturno-e-turnos","faltas-ao-trabalho"];
    for (const s of todos) expect(LEITURAS_POR_GUIA[s]?.length, s).toBeGreaterThan(0);
  });
  it("A5 três âncoras corrigidas", () => {
    expect(claim("juros-de-mora.sem-interpelacao")!.nota).toContain("Art. 7.º");
    expect(claim("juros-de-mora.indemnizacao-40")!.nota).toContain("Art. 8.º");
    expect(claim("prestacoes.limite-36")!.nota).toContain("n.º 5");
    expect(claim("prestacoes.alargamento")!.nota).toContain("n.º 6");
  });
  it("A6 exclusão do IVA e das retenções", () => {
    expect(claim("prestacoes.exclusao-iva-retencoes")!.statement).toContain("retidas na fonte");
  });
  it("A7 plano oficioso", () => {
    expect(claim("prestacoes.plano-oficioso")!.statement).toContain("5 000");
    expect(FD.PLANO_PRESTACOES.automaticoSingulares.value).toBe(5000);
    expect(FD.PLANO_PRESTACOES.automaticoColetivas.value).toBe(10000);
  });
  it("A8 unidade de conta traduzida", () => {
    expect(FD.UNIDADE_CONTA.value).toBe(102);
    expect(FD.PRESTACOES_ALARGAMENTO_LIMIAR_EUR).toBe(51000);
  });
  it("A9 taxa de juro", () => {
    expect(FD.JUROS_MORA.transacoesComerciais.value).toBeCloseTo(0.1015, 4);
    expect(FD.JUROS_MORA.outrosCreditosComerciais.value).toBeCloseTo(0.0915, 4);
    expect(FD.JUROS_MORA.civis.value).toBeCloseTo(0.04, 4);
    expect(FD.JUROS_MORA.vigenciaComercialAte).toBe("2026-06-30");
  });
  it("A10 entidades públicas", () => {
    expect(claim("juros-de-mora.entidades-publicas")!.statement).toContain("o mesmo");
  });
  it("A11 penhora alargada", () => {
    expect(claim("penhora.conta-bancaria")).toBeDefined();
    expect(claim("penhora.alimentos")).toBeDefined();
    expect(claim("penhora.casa-morada-familia")).toBeDefined();
  });
  it("A12 reversão: direito imediato", () => {
    expect(claim("reversao.isencao-custas-juros")).toBeDefined();
    expect(claim("reversao.prazo-oposicao")!.statement).toContain("30 dias");
    expect(claim("reversao.audiencia-previa")).toBeDefined();
    expect(claim("reversao.prescricao-responsavel")).toBeDefined();
  });
  it("A13 recuperar IVA: aplicabilidade e dois deveres", () => {
    expect(claim("recuperar-iva.aplicabilidade")).toBeDefined();
    expect(claim("recuperar-iva.dever-comunicar")).toBeDefined();
    expect(claim("recuperar-iva.dever-reentregar")).toBeDefined();
  });
  it("A14 contagem igual nos dois prazos", () => {
    expect(claim("prazos-divida.contagem-igual")!.statement).toContain("da mesma maneira");
  });
  it("A15 reembolso atrasado + taxa", () => {
    expect(claim("juros-indem.reembolso-irs-atrasado")).toBeDefined();
    expect(claim("juros-indem.taxa")!.ruleKey).toBe("JUROS_MORA.civis");
  });
  it("A16 números no motor e engineBindings preenchidos", () => {
    const semBindings = ["fatura-nao-paga","juros-de-mora","cobrar-divida","execucao-fiscal","plano-prestacoes","penhora-limites","falsos-recibos-verdes"]
      .filter((s) => man(s)!.engineBindings.length === 0);
    expect(semBindings).toEqual([]);
  });
  it("14 guias novos, catálogo de 57", () => {
    const novos = ["salario-gerente-ou-dividendos","distribuir-lucros","pagamentos-por-conta-irc","prejuizos-fiscais","contratar-primeiro-trabalhador","modelo-22-e-ies","fechar-empresa","baixa-medica","licenca-parental","subsidio-desemprego","fim-do-contrato","ferias-direitos","trabalho-noturno-e-turnos","faltas-ao-trabalho"];
    for (const id of novos) {
      const m = man(id);
      expect(m, id).toBeDefined();
      expect(m!.status, id).toBe("draft");
      expect(LEGAL_CLAIMS.filter((c) => c.guideId === id).length, id).toBeGreaterThan(0);
    }
    expect(GUIDE_MANIFESTS).toHaveLength(57);
    expect(GUIDE_MANIFESTS.filter((m) => m.categoria === "Empresas")).toHaveLength(12);
    expect(GUIDE_MANIFESTS.filter((m) => m.categoria === "Conta de outrem")).toHaveLength(10);
  });
});
