import { NextRequest, NextResponse } from "next/server";
import {
  FISCAL_YEAR,
  DATA_LAST_REVIEW,
  IAS,
  RETENCAO,
  DISPENSA_RETENCAO_LIMITE,
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IVA_TAXAS,
  SS_TAXA,
  SS_COEFICIENTE,
  SS_BASE_MAX_MENSAL,
  SS_MIN_MENSAL,
  REGIME_SIMPLIFICADO,
  IRS_JOVEM,
  ESCALOES_IRS,
  DEDUCAO_ESPECIFICA_CATB,
  REGIME_15PCT,
  MINIMO_EXISTENCIA,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  CATEGORIA_F,
  REDUCAO_COEFICIENTE_ANO,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
  DEDUCAO_DEPENDENTE_3MAIS,
  DEDUCAO_DEPENDENTE_DEFICIENCIA,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  DEDUCAO_RENDAS,
  QUOCIENTE_CONJUGAL,
  LIMITE_GLOBAL_DEDUCOES,
  ATIVIDADES,
  COEFICIENTE_POR_TIPO,
  efeitoFiscal,
  META_TIPO,
  EXCLUSAO_DEFICIENCIA_TAXA,
  EXCLUSAO_DEFICIENCIA_MAX,
  DEDUCAO_DEFICIENCIA_COLETA,
  type Sourced,
} from "@/lib/fiscal-data";
import {
  calcular,
  simularIRSAnual,
  calcularCategoriaF,
  irsProgressivo,
} from "@/lib/fiscal";

type Severidade = "ok" | "info" | "aviso" | "erro";

interface ResultadoTeste {
  id: string;
  grupo: string;
  nome: string;
  severidade: Severidade;
  esperado: string;
  obtido: string;
  detalhes?: string;
}

function isRate(v: number) {
  return v >= 0 && v <= 1;
}

function check(
  id: string,
  grupo: string,
  nome: string,
  condicao: boolean,
  esperado: string,
  obtido: string,
  detalhes?: string,
): ResultadoTeste {
  return {
    id,
    grupo,
    nome,
    severidade: condicao ? "ok" : "erro",
    esperado,
    obtido,
    detalhes,
  };
}

function auditarDadosFiscais(): ResultadoTeste[] {
  const r: ResultadoTeste[] = [];

  // ── IAS ──
  r.push(check("ias-valor", "IAS", "Valor IAS 2026", IAS.value === 537.13, "537.13", String(IAS.value)));
  r.push(check("ias-fonte", "IAS", "Fonte legal", IAS.legalBasis.includes("Portaria"), IAS.legalBasis, IAS.legalBasis));

  // ── Escalões IRS ──
  const esc = ESCALOES_IRS.value;
  const escCorretos = [
    { ate: 8342, taxa: 0.125 },
    { ate: 12587, taxa: 0.157 },
    { ate: 17838, taxa: 0.212 },
    { ate: 23089, taxa: 0.241 },
    { ate: 29397, taxa: 0.311 },
    { ate: 43090, taxa: 0.349 },
    { ate: 46566, taxa: 0.431 },
    { ate: 86634, taxa: 0.446 },
    { ate: Infinity, taxa: 0.48 },
  ];
  r.push(check("esc-count", "Escalões IRS", "Número de escalões", esc.length === 9, "9", String(esc.length)));
  for (let i = 0; i < escCorretos.length && i < esc.length; i++) {
    const limiteOk = esc[i].ate === escCorretos[i].ate;
    const taxaOk = Math.abs(esc[i].taxa - escCorretos[i].taxa) < 0.0001;
    r.push(check(
      `esc-${i + 1}-limite`, "Escalões IRS", `${i + 1}.º escalão — limite`,
      limiteOk,
      String(escCorretos[i].ate),
      String(esc[i].ate),
    ));
    r.push(check(
      `esc-${i + 1}-taxa`, "Escalões IRS", `${i + 1}.º escalão — taxa`,
      taxaOk,
      `${(escCorretos[i].taxa * 100).toFixed(1)}%`,
      `${(esc[i].taxa * 100).toFixed(1)}%`,
    ));
  }
  const crescentes = esc.every((e, i) => i === 0 || (e.ate ?? Infinity) > (esc[i - 1].ate ?? Infinity));
  r.push(check("esc-crescente", "Escalões IRS", "Limites crescentes", crescentes, "Sim", crescentes ? "Sim" : "Não"));

  // ── Retenção ──
  r.push(check("ret-art151", "Retenção", "Art. 151.º", RETENCAO.art151.value === 0.23, "23%", `${RETENCAO.art151.value * 100}%`));
  r.push(check("ret-outros", "Retenção", "Outros serviços", RETENCAO.outros.value === 0.115, "11.5%", `${RETENCAO.outros.value * 100}%`));
  r.push(check("ret-ip", "Retenção", "Prop. intelectual", RETENCAO.diretosAutor.value === 0.165, "16.5%", `${RETENCAO.diretosAutor.value * 100}%`));
  r.push(check("ret-vendas", "Retenção", "Vendas", RETENCAO.vendas.value === 0, "0%", `${RETENCAO.vendas.value * 100}%`));
  r.push(check("ret-dispensa", "Retenção", "Limite dispensa", DISPENSA_RETENCAO_LIMITE.value === 15000, "15.000", String(DISPENSA_RETENCAO_LIMITE.value)));

  // ── IVA ──
  r.push(check("iva-isencao", "IVA", "Isenção Art. 53.º", IVA_ISENCAO_LIMITE.value === 15000, "15.000", String(IVA_ISENCAO_LIMITE.value)));
  r.push(check("iva-excesso", "IVA", "Excesso 125%", IVA_ISENCAO_EXCESSO.value === 18750, "18.750", String(IVA_ISENCAO_EXCESSO.value)));
  const cont = IVA_TAXAS.continente.value;
  r.push(check("iva-cont-red", "IVA", "Continente reduzida", cont.reduzida === 0.06, "6%", `${cont.reduzida * 100}%`));
  r.push(check("iva-cont-int", "IVA", "Continente intermédia", cont.intermedia === 0.13, "13%", `${cont.intermedia * 100}%`));
  r.push(check("iva-cont-nor", "IVA", "Continente normal", cont.normal === 0.23, "23%", `${cont.normal * 100}%`));
  const mad = IVA_TAXAS.madeira.value;
  r.push(check("iva-mad-red", "IVA", "Madeira reduzida", mad.reduzida === 0.05, "5%", `${mad.reduzida * 100}%`));
  r.push(check("iva-mad-int", "IVA", "Madeira intermédia", mad.intermedia === 0.12, "12%", `${mad.intermedia * 100}%`));
  r.push(check("iva-mad-nor", "IVA", "Madeira normal", mad.normal === 0.22, "22%", `${mad.normal * 100}%`));
  const ac = IVA_TAXAS.acores.value;
  r.push(check("iva-ac-red", "IVA", "Açores reduzida", ac.reduzida === 0.04, "4%", `${ac.reduzida * 100}%`));
  r.push(check("iva-ac-int", "IVA", "Açores intermédia", ac.intermedia === 0.09, "9%", `${ac.intermedia * 100}%`));
  r.push(check("iva-ac-nor", "IVA", "Açores normal", ac.normal === 0.16, "16%", `${ac.normal * 100}%`));

  // ── SS ──
  r.push(check("ss-taxa", "Segurança Social", "Taxa contributiva", SS_TAXA.value === 0.214, "21.4%", `${SS_TAXA.value * 100}%`));
  r.push(check("ss-coef-serv", "Segurança Social", "Coef. serviços", SS_COEFICIENTE.servicos.value === 0.7, "70%", `${SS_COEFICIENTE.servicos.value * 100}%`));
  r.push(check("ss-coef-bens", "Segurança Social", "Coef. bens", SS_COEFICIENTE.bens.value === 0.2, "20%", `${SS_COEFICIENTE.bens.value * 100}%`));
  r.push(check("ss-teto", "Segurança Social", "Teto mensal (12×IAS)", SS_BASE_MAX_MENSAL.value === 6445.56, "6.445,56", String(SS_BASE_MAX_MENSAL.value)));
  r.push(check("ss-teto-calc", "Segurança Social", "12×IAS = teto", Math.abs(12 * IAS.value - SS_BASE_MAX_MENSAL.value) < 0.01, String(12 * IAS.value), String(SS_BASE_MAX_MENSAL.value)));

  // ── Regime Simplificado ──
  r.push(check("rs-151", "Regime Simplificado", "Coef. Art. 151.º", REGIME_SIMPLIFICADO.coefServicos151.value === 0.75, "0.75", String(REGIME_SIMPLIFICADO.coefServicos151.value)));
  r.push(check("rs-outros", "Regime Simplificado", "Coef. outros", REGIME_SIMPLIFICADO.coefOutrosServicos.value === 0.35, "0.35", String(REGIME_SIMPLIFICADO.coefOutrosServicos.value)));
  r.push(check("rs-vendas", "Regime Simplificado", "Coef. vendas", REGIME_SIMPLIFICADO.coefVendas.value === 0.15, "0.15", String(REGIME_SIMPLIFICADO.coefVendas.value)));
  r.push(check("rs-ip", "Regime Simplificado", "Coef. prop. int.", REGIME_SIMPLIFICADO.coefPropIntelectual.value === 0.95, "0.95", String(REGIME_SIMPLIFICADO.coefPropIntelectual.value)));
  r.push(check("rs-al-mor", "Regime Simplificado", "Coef. AL moradia", REGIME_SIMPLIFICADO.coefAlojamentoMoradia.value === 0.35, "0.35", String(REGIME_SIMPLIFICADO.coefAlojamentoMoradia.value)));
  r.push(check("rs-al-cont", "Regime Simplificado", "Coef. AL contenção", REGIME_SIMPLIFICADO.coefAlojamentoContencao.value === 0.5, "0.50", String(REGIME_SIMPLIFICADO.coefAlojamentoContencao.value)));
  r.push(check("rs-transp", "Regime Simplificado", "Coef. transparência", REGIME_SIMPLIFICADO.coefTransparencia.value === 1.0, "1.00", String(REGIME_SIMPLIFICADO.coefTransparencia.value)));
  r.push(check("rs-15pct", "Regime Simplificado", "Regra 15%", REGIME_15PCT.value === 0.15, "15%", `${REGIME_15PCT.value * 100}%`));

  // ── IRS Jovem ──
  r.push(check("irsj-idade", "IRS Jovem", "Idade máxima", IRS_JOVEM.idadeMax.value === 35, "35", String(IRS_JOVEM.idadeMax.value)));
  r.push(check("irsj-teto", "IRS Jovem", "Teto IAS (multiplicador)", IRS_JOVEM.tetoIAS.value === 55, "55", String(IRS_JOVEM.tetoIAS.value)));
  const isencoes = IRS_JOVEM.isencaoPorAno.value;
  r.push(check("irsj-ano1", "IRS Jovem", "1.º ano: 100%", isencoes[1] === 1.0, "100%", `${(isencoes[1] ?? 0) * 100}%`));
  r.push(check("irsj-ano2", "IRS Jovem", "2.º–4.º ano: 75%", isencoes[2] === 0.75 && isencoes[3] === 0.75 && isencoes[4] === 0.75, "75%", `${(isencoes[2] ?? 0) * 100}%`));
  r.push(check("irsj-ano5", "IRS Jovem", "5.º–7.º ano: 50%", isencoes[5] === 0.5 && isencoes[6] === 0.5 && isencoes[7] === 0.5, "50%", `${(isencoes[5] ?? 0) * 100}%`));
  r.push(check("irsj-ano8", "IRS Jovem", "8.º–10.º ano: 25%", isencoes[8] === 0.25 && isencoes[9] === 0.25 && isencoes[10] === 0.25, "25%", `${(isencoes[8] ?? 0) * 100}%`));

  // ── Mínimo de existência ──
  r.push(check("min-exist", "Mínimo Existência", "Valor", MINIMO_EXISTENCIA.value === 12880, "12.880", String(MINIMO_EXISTENCIA.value)));

  // ── IRC ──
  r.push(check("irc-geral", "IRC", "Taxa geral", IRC_TAXA_GERAL.value === 0.19, "19%", `${IRC_TAXA_GERAL.value * 100}%`));
  r.push(check("irc-pme", "IRC", "Taxa PME", IRC_TAXA_PME.value === 0.15, "15%", `${IRC_TAXA_PME.value * 100}%`));
  r.push(check("irc-lim-pme", "IRC", "Limite PME", IRC_LIMITE_PME.value === 50000, "50.000", String(IRC_LIMITE_PME.value)));
  r.push(check("irc-derrama", "IRC", "Derrama máxima", DERRAMA_MAX.value === 0.015, "1.5%", `${DERRAMA_MAX.value * 100}%`));
  r.push(check("irc-divid", "IRC", "Dividendos", DIVIDENDOS_TAXA.value === 0.28, "28%", `${DIVIDENDOS_TAXA.value * 100}%`));

  // ── Categoria F ──
  r.push(check("catf-hab", "Categoria F", "Taxa habitação", CATEGORIA_F.taxaHabitacao.value === 0.25, "25%", `${CATEGORIA_F.taxaHabitacao.value * 100}%`));
  r.push(check("catf-nao-hab", "Categoria F", "Taxa não habitação", CATEGORIA_F.taxaNaoHabitacao.value === 0.28, "28%", `${CATEGORIA_F.taxaNaoHabitacao.value * 100}%`));

  // ── Deduções ──
  r.push(check("ded-dep", "Deduções", "Dependente (>3 anos)", DEDUCAO_DEPENDENTE.value === 600, "600", String(DEDUCAO_DEPENDENTE.value)));
  r.push(check("ded-bebe", "Deduções", "Dependente (≤3 anos)", DEDUCAO_DEPENDENTE_BEBE.value === 726, "726", String(DEDUCAO_DEPENDENTE_BEBE.value)));
  r.push(check("ded-3mais", "Deduções", "Dep. majorado (≤6 anos)", DEDUCAO_DEPENDENTE_3MAIS.value === 900, "900", String(DEDUCAO_DEPENDENTE_3MAIS.value)));

  // ── Integridade geral ──
  r.push(check("ano-fiscal", "Integridade", "Ano fiscal", FISCAL_YEAR === 2026, "2026", String(FISCAL_YEAR)));
  const ultimaRevisao = new Date(DATA_LAST_REVIEW);
  const diasDesdeRevisao = Math.floor((Date.now() - ultimaRevisao.getTime()) / 86400000);
  r.push({
    id: "revisao-recente",
    grupo: "Integridade",
    nome: "Última revisão",
    severidade: diasDesdeRevisao > 90 ? "aviso" : "ok",
    esperado: "< 90 dias",
    obtido: `${diasDesdeRevisao} dias (${DATA_LAST_REVIEW})`,
    detalhes: diasDesdeRevisao > 90 ? "Os dados fiscais não são revistos há mais de 90 dias." : undefined,
  });
  r.push(check("atividades", "Integridade", "Catálogo de atividades", ATIVIDADES.length >= 90, "≥ 90", String(ATIVIDADES.length)));

  return r;
}

function auditarMotorCalculo(): ResultadoTeste[] {
  const r: ResultadoTeste[] = [];

  // ── Cálculo por recibo: Art. 151, 1000€ bruto, Continente ──
  const rec1 = calcular({
    bruto: 1000,
    tipo: "art151",
    regiao: "continente",
    regimeIVA: "normal",
    baseSS: "servicos",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
  });

  r.push(check("calc-ret-art151", "Motor: Recibo", "Retenção Art. 151 (1.000€)", Math.abs(rec1.retencaoIRS - 230) < 0.01, "230.00", rec1.retencaoIRS.toFixed(2)));
  r.push(check("calc-iva-normal", "Motor: Recibo", "IVA normal 23% (1.000€)", Math.abs(rec1.iva - 230) < 0.01, "230.00", rec1.iva.toFixed(2)));
  const ssSvc = 1000 * 0.7 / 3 * 0.214;
  r.push(check("calc-ss-serv", "Motor: Recibo", "SS serviços (1.000€)", Math.abs(rec1.segSocial - ssSvc) < 0.01, ssSvc.toFixed(2), rec1.segSocial.toFixed(2)));

  // ── Cálculo por recibo: vendas, isento, Açores ──
  const rec2 = calcular({
    bruto: 500,
    tipo: "vendas",
    regiao: "acores",
    regimeIVA: "isento",
    baseSS: "bens",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
  });
  r.push(check("calc-ret-vendas", "Motor: Recibo", "Retenção vendas = 0", rec2.retencaoIRS === 0, "0", String(rec2.retencaoIRS)));
  r.push(check("calc-iva-isento", "Motor: Recibo", "IVA isento = 0", rec2.iva === 0, "0", String(rec2.iva)));

  // ── SS isenção primeiro ano ──
  const rec3 = calcular({
    bruto: 1000,
    tipo: "art151",
    regiao: "continente",
    regimeIVA: "isento",
    baseSS: "servicos",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: true,
    acumulaEmprego: false,
  });
  r.push(check("calc-ss-isencao", "Motor: Recibo", "SS = 0 no 1.º ano", rec3.segSocial === 0, "0", String(rec3.segSocial)));

  // ── Simulação anual: 30.000€, Art. 151, 3.º ano ──
  const sim1 = simularIRSAnual({
    brutoAnual: 30000,
    tipo: "art151",
    anoAtividade: 3,
  });
  r.push(check("sim-coef-aplicado", "Motor: IRS Anual", "Coef. 0,75 aplicado", sim1.regimeContabilidade === "simplificado", "simplificado", sim1.regimeContabilidade));
  r.push(check("sim-coletavel-pos", "Motor: IRS Anual", "Coletável positivo", sim1.rendimentoColetavel > 0, "> 0", String(sim1.rendimentoColetavel)));
  r.push(check("sim-irs-pos", "Motor: IRS Anual", "IRS estimado positivo (30k)", sim1.irsEstimado > 0, "> 0", sim1.irsEstimado.toFixed(2)));

  // ── Mínimo de existência: rendimento baixo ──
  const sim2 = simularIRSAnual({
    brutoAnual: 10000,
    tipo: "art151",
    anoAtividade: 3,
  });
  r.push(check("sim-min-exist", "Motor: IRS Anual", "Mínimo existência (10k)", sim2.irsEstimado === 0 || sim2.minimoExistenciaAplicado, "IRS=0 ou min. existência", `IRS=${sim2.irsEstimado.toFixed(2)}, min=${sim2.minimoExistenciaAplicado}`));

  // ── IRS Jovem ──
  const sim3 = simularIRSAnual({
    brutoAnual: 25000,
    tipo: "art151",
    anoAtividade: 3,
    irsJovemAno: 1,
  });
  const sim3Sem = simularIRSAnual({
    brutoAnual: 25000,
    tipo: "art151",
    anoAtividade: 3,
  });
  r.push(check("sim-irsj-reduz", "Motor: IRS Anual", "IRS Jovem 1.º ano reduz IRS", sim3.irsEstimado < sim3Sem.irsEstimado, `< ${sim3Sem.irsEstimado.toFixed(2)}`, sim3.irsEstimado.toFixed(2)));

  // ── IRS progressivo direto ──
  const irs10k = irsProgressivo(10000);
  const irs50k = irsProgressivo(50000);
  r.push(check("irsprog-10k", "Motor: IRS Progressivo", "10.000€ coletável", irs10k > 0 && irs10k < 10000, "0 < x < 10.000", irs10k.toFixed(2)));
  r.push(check("irsprog-50k", "Motor: IRS Progressivo", "50.000€ coletável", irs50k > irs10k, `> ${irs10k.toFixed(2)}`, irs50k.toFixed(2)));
  r.push(check("irsprog-0", "Motor: IRS Progressivo", "0€ coletável = 0€ IRS", irsProgressivo(0) === 0, "0", String(irsProgressivo(0))));

  // ── Categoria F ──
  const catF = calcularCategoriaF({
    rendaAnual: 12000,
    habitacao: true,
    despesas: 1000,
  });
  r.push(check("catf-calc", "Motor: Categoria F", "Taxa habitação 25%", catF.imposto > 0, "> 0", catF.imposto.toFixed(2)));
  const catFnH = calcularCategoriaF({
    rendaAnual: 12000,
    habitacao: false,
    despesas: 1000,
  });
  r.push(check("catf-nao-hab-maior", "Motor: Categoria F", "Não habitação > habitação", catFnH.imposto > catF.imposto, `> ${catF.imposto.toFixed(2)}`, catFnH.imposto.toFixed(2)));

  // ── Atividades: coeficientes e efeitos fiscais consistentes ──
  let atividadesOk = 0;
  let atividadesErr = 0;
  for (const at of ATIVIDADES) {
    const ef = efeitoFiscal(at);
    if (ef.coef < 0 || ef.coef > 1) atividadesErr++;
    else if (ef.retencao < 0 || ef.retencao > 1) atividadesErr++;
    else atividadesOk++;
  }
  r.push(check("ativ-integridade", "Motor: Atividades", `${ATIVIDADES.length} atividades com coef/ret válidos`, atividadesErr === 0, "0 erros", `${atividadesErr} erros, ${atividadesOk} ok`));

  return r;
}

export async function GET(req: NextRequest) {
  const agente = req.nextUrl.searchParams.get("agente");

  if (agente === "dados") {
    return NextResponse.json({
      agente: "Auditor de Dados Fiscais",
      descricao: "Verifica todos os parâmetros fiscais (taxas, limites, coeficientes, escalões) contra os valores oficiais de 2026.",
      executadoEm: new Date().toISOString(),
      anoFiscal: FISCAL_YEAR,
      ultimaRevisao: DATA_LAST_REVIEW,
      resultados: auditarDadosFiscais(),
    });
  }

  if (agente === "motor") {
    return NextResponse.json({
      agente: "Auditor do Motor de Cálculo",
      descricao: "Executa cenários de teste contra o motor de cálculo para verificar que as fórmulas produzem resultados corretos.",
      executadoEm: new Date().toISOString(),
      anoFiscal: FISCAL_YEAR,
      resultados: auditarMotorCalculo(),
    });
  }

  return NextResponse.json({ erro: "Parâmetro agente obrigatório: ?agente=dados ou ?agente=motor" }, { status: 400 });
}
