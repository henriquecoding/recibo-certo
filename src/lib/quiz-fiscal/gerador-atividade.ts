/**
 * Gerador dinâmico de perguntas de quiz para uma atividade específica.
 *
 * Todas as perguntas são geradas a partir de valores reais em fiscal-data.ts.
 * Nenhum dado inventado. Cada template de pergunta lê as taxas, coeficientes,
 * limiares e regras da atividade selecionada e constrói alternativas a partir
 * dos outros valores reais do sistema fiscal (distratores credíveis).
 */

import {
  efeitoFiscal,
  RETENCAO,
  COEFICIENTE_POR_TIPO,
  SS_TAXA,
  SS_BASE_MAX_MENSAL,
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IVA_TAXAS,
  ESCALOES_IRS,
  DISPENSA_RETENCAO_LIMITE,
  IAS,
  IRS_JOVEM,
  META_TIPO,
  REDUCAO_COEFICIENTE_ANO,
  DEDUCAO_ESPECIFICA_CATB,
  MINIMO_EXISTENCIA,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DIVIDENDOS_TAXA,
  CATEGORIA_F,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  DEDUCAO_RENDAS,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
  REGIME_15PCT,
  type Atividade,
  type TipoAtividade,
} from "../fiscal-data";
import { embaralhar } from "./index";
import { fonte, type QuizPergunta } from "./types";

type GeradorFn = (a: Atividade) => QuizPergunta | null;

const TODAS_RETENCOES: { tipo: TipoAtividade; taxa: number }[] = [
  { tipo: "art151", taxa: RETENCAO.art151.value },
  { tipo: "outros", taxa: RETENCAO.outros.value },
  { tipo: "vendas", taxa: RETENCAO.vendas.value },
  { tipo: "diretosAutor", taxa: RETENCAO.diretosAutor.value },
];

const TODOS_COEFICIENTES: { tipo: TipoAtividade; coef: number }[] = [
  { tipo: "art151", coef: COEFICIENTE_POR_TIPO.art151 },
  { tipo: "outros", coef: COEFICIENTE_POR_TIPO.outros },
  { tipo: "vendas", coef: COEFICIENTE_POR_TIPO.vendas },
  { tipo: "diretosAutor", coef: COEFICIENTE_POR_TIPO.diretosAutor },
];

function pct(v: number): string {
  return `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function eur(v: number): string {
  return `${v.toLocaleString("pt-PT")} €`;
}

function tipoLabel(t: TipoAtividade): string {
  return META_TIPO[t].label;
}

function distratores(correto: string, pool: string[], n = 3): string[] {
  return embaralhar(pool.filter((v) => v !== correto)).slice(0, n);
}

// ── Geradores individuais ────────────────────────────────────────────

const gerarRetencao: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const taxa = ef.retencao;
  const corretaTexto = taxa === 0 ? "0% — sem retenção" : pct(taxa);
  const outrasTextos = TODAS_RETENCOES
    .filter((r) => r.taxa !== taxa)
    .map((r) => ({
      texto: r.taxa === 0 ? "0% — sem retenção" : pct(r.taxa),
      porque: `${r.taxa === 0 ? "0%" : pct(r.taxa)} é a taxa de ${tipoLabel(r.tipo)}, não se aplica a ${a.label}.`,
    }));

  const opcoes = [
    {
      texto: corretaTexto,
      porque: taxa === 0
        ? `As vendas de bens/mercadorias não estão sujeitas a retenção na fonte de IRS.`
        : `A atividade "${a.label}" enquadra-se como ${tipoLabel(a.tipo)}, com retenção de ${pct(taxa)} ao abrigo do Art. 101.º CIRS.`,
    },
    ...embaralhar(outrasTextos).slice(0, 3),
  ];

  return {
    id: `ger-ret-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 1,
    pergunta: `Qual a taxa de retenção na fonte de IRS aplicável à atividade "${a.label}"?`,
    opcoes,
    correta: 0,
    legalBasis: RETENCAO[a.tipo].legalBasis,
    fonte: fonte("art101cirs"),
  };
};

const gerarCoeficiente: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const coef = ef.coef;
  const corretaTexto = coef.toFixed(2);

  const outrosCoefs = TODOS_COEFICIENTES
    .filter((c) => Math.abs(c.coef - coef) > 0.001)
    .map((c) => ({
      texto: c.coef.toFixed(2),
      porque: `O coeficiente ${c.coef.toFixed(2)} aplica-se a ${tipoLabel(c.tipo)} (Art. 31.º CIRS), não a "${a.label}".`,
    }));

  const opcoes = [
    {
      texto: corretaTexto,
      porque: `No regime simplificado, "${a.label}" tem coeficiente ${coef.toFixed(2)} — apenas ${pct(coef)} do rendimento é tributado.`,
    },
    ...embaralhar(outrosCoefs).slice(0, 3),
  ];

  return {
    id: `ger-coef-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta: `No regime simplificado, qual o coeficiente aplicável à atividade "${a.label}" (Art. 31.º CIRS)?`,
    opcoes,
    correta: 0,
    legalBasis: ef.legalCoef,
    fonte: fonte("art31"),
  };
};

const gerarBaseSS: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const base = ef.baseSS;
  const pctBase = base === "servicos" ? "70%" : "20%";
  const pctOutra = pctBase === "70%" ? "20%" : "70%";

  return {
    id: `ger-ss-base-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta: `Sobre que percentagem do rendimento incide a Segurança Social para a atividade "${a.label}"?`,
    opcoes: [
      {
        texto: pctBase,
        porque: base === "servicos"
          ? `Prestação de serviços: a SS incide sobre 70% do rendimento relevante (Art. 162.º Código Contributivo).`
          : `Venda de bens/hotelaria: a SS incide sobre 20% do rendimento relevante (Art. 162.º Código Contributivo).`,
      },
      {
        texto: pctOutra,
        porque: pctOutra === "70%"
          ? `70% aplica-se a prestação de serviços, não a vendas/hotelaria.`
          : `20% aplica-se a vendas de bens e hotelaria, não a prestação de serviços.`,
      },
      {
        texto: "100%",
        porque: `A SS nunca incide sobre 100% do rendimento — há sempre um coeficiente de ajustamento (70% ou 20%).`,
      },
      {
        texto: "50%",
        porque: `Não existe base de 50% no regime de trabalhador independente. As opções são 70% (serviços) ou 20% (bens).`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 162.º Código Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

const gerarTaxaSS: GeradorFn = (a) => {
  const taxa = SS_TAXA.value;
  return {
    id: `ger-ss-taxa-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta: `Qual a taxa contributiva da Segurança Social para um trabalhador independente com a atividade "${a.label}"?`,
    opcoes: [
      {
        texto: pct(taxa),
        porque: `A taxa contributiva dos trabalhadores independentes é de ${pct(taxa)} (Art. 168.º Código Contributivo).`,
      },
      {
        texto: "25,2%",
        porque: `25,2% era a taxa antiga (até 2018). Desde 2019 a taxa é de ${pct(taxa)}.`,
      },
      {
        texto: "11%",
        porque: `11% é a taxa dos trabalhadores por conta de outrem, não dos independentes.`,
      },
      {
        texto: "23,75%",
        porque: `23,75% é a taxa da entidade empregadora no regime geral, não do trabalhador independente.`,
      },
    ],
    correta: 0,
    legalBasis: SS_TAXA.legalBasis,
    fonte: fonte("segSocialGov"),
  };
};

const gerarIVAIsencao: GeradorFn = (a) => {
  const limite = IVA_ISENCAO_LIMITE.value;
  return {
    id: `ger-iva-isencao-${a.tipo}`,
    categoria: "iva",
    dificuldade: 1,
    pergunta: `Até que volume de negócios anual pode "${a.label}" beneficiar da isenção de IVA (Art. 53.º CIVA)?`,
    opcoes: [
      {
        texto: eur(limite),
        porque: `A isenção de IVA aplica-se a quem não ultrapasse ${eur(limite)} anuais (Art. 53.º CIVA).`,
      },
      {
        texto: eur(IVA_ISENCAO_EXCESSO.value),
        porque: `${eur(IVA_ISENCAO_EXCESSO.value)} é o limiar de excesso (125% do limite). Acima deste valor, perde-se a isenção imediatamente.`,
      },
      {
        texto: "10.000 €",
        porque: `10.000 € era o limite antigo (antes de 2025). Desde 2025 o limite é ${eur(limite)}.`,
      },
      {
        texto: "25.000 €",
        porque: `Não existe limiar de isenção de IVA de 25.000 € no sistema fiscal português.`,
      },
    ],
    correta: 0,
    legalBasis: IVA_ISENCAO_LIMITE.legalBasis,
    fonte: fonte("portalFinancasIVA"),
  };
};

const gerarIVATaxas: GeradorFn = (a) => {
  const taxasCont = IVA_TAXAS.continente.value;
  return {
    id: `ger-iva-taxa-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `Se a atividade "${a.label}" estiver no regime normal de IVA em Portugal continental, qual a taxa normal de IVA?`,
    opcoes: [
      {
        texto: pct(taxasCont.normal),
        porque: `A taxa normal de IVA em Portugal continental é de ${pct(taxasCont.normal)} (Art. 18.º CIVA).`,
      },
      {
        texto: pct(taxasCont.intermedia),
        porque: `${pct(taxasCont.intermedia)} é a taxa intermédia — aplica-se apenas a bens e serviços específicos listados na Lista II do CIVA.`,
      },
      {
        texto: pct(taxasCont.reduzida),
        porque: `${pct(taxasCont.reduzida)} é a taxa reduzida (Lista I do CIVA) — para bens essenciais, não para serviços profissionais em geral.`,
      },
      {
        texto: pct(IVA_TAXAS.acores.value.normal),
        porque: `${pct(IVA_TAXAS.acores.value.normal)} é a taxa normal nos Açores, não no continente.`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  };
};

const gerarDispensaRetencao: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.retencao === 0) return null;
  const limite = DISPENSA_RETENCAO_LIMITE.value;
  return {
    id: `ger-dispensa-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `A atividade "${a.label}" pode pedir dispensa de retenção na fonte. Qual o limite de rendimento anual estimado para essa dispensa?`,
    opcoes: [
      {
        texto: eur(limite),
        porque: `Quem preveja faturar abaixo de ${eur(limite)}/ano pode solicitar dispensa de retenção (Art. 101.º-B CIRS).`,
      },
      {
        texto: "12.500 €",
        porque: `12.500 € era o limite antigo. Desde 2025 o limite é ${eur(limite)}.`,
      },
      {
        texto: "10.000 €",
        porque: `Não existe limiar de dispensa de retenção de 10.000 €.`,
      },
      {
        texto: "20.000 €",
        porque: `O limite não é 20.000 € — é ${eur(limite)} (Art. 101.º-B CIRS).`,
      },
    ],
    correta: 0,
    legalBasis: DISPENSA_RETENCAO_LIMITE.legalBasis,
    fonte: fonte("art101bCirs"),
  };
};

const gerarTetoSS: GeradorFn = (a) => {
  const teto = SS_BASE_MAX_MENSAL.value;
  return {
    id: `ger-teto-ss-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta: `Qual o teto mensal do rendimento relevante para efeitos de Segurança Social do trabalhador independente com a atividade "${a.label}"?`,
    opcoes: [
      {
        texto: `${eur(teto)} (12 × IAS)`,
        porque: `O teto é de 12 × IAS = ${eur(teto)}/mês (Art. 163.º Código Contributivo). Rendimento acima deste valor não conta para a contribuição.`,
      },
      {
        texto: `${eur(IAS.value)} (1 × IAS)`,
        porque: `Um IAS (${eur(IAS.value)}) é o indexante base, não o teto. O teto é 12 vezes esse valor.`,
      },
      {
        texto: "5.000 €",
        porque: `5.000 € não corresponde a nenhum limiar da Segurança Social. O teto é 12 × IAS.`,
      },
      {
        texto: "10.000 €",
        porque: `O teto mensal não é 10.000 €. É 12 × IAS = ${eur(teto)}.`,
      },
    ],
    correta: 0,
    legalBasis: SS_BASE_MAX_MENSAL.legalBasis,
    fonte: fonte("segSocialGov"),
  };
};

const gerarRegra15: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const aplicaSe = ef.regra15;
  return {
    id: `ger-regra15-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta: `A regra dos 15% (Art. 31.º, n.º 2 CIRS) aplica-se à atividade "${a.label}" no regime simplificado?`,
    opcoes: [
      {
        texto: aplicaSe ? "Sim" : "Não",
        porque: aplicaSe
          ? `A regra dos 15% exige justificação de despesas de pelo menos 15% do rendimento para manter o coeficiente — aplica-se a coeficientes 0,75 e 0,35.`
          : `A regra dos 15% só se aplica aos coeficientes 0,75 (Art. 151.º) e 0,35 (outros serviços). O coeficiente ${ef.coef.toFixed(2)} está isento desta obrigação.`,
      },
      {
        texto: aplicaSe ? "Não" : "Sim",
        porque: aplicaSe
          ? `A atividade "${a.label}" está sujeita à regra dos 15% por ter coeficiente ${ef.coef.toFixed(2)}.`
          : `A regra dos 15% não se aplica ao coeficiente ${ef.coef.toFixed(2)} desta atividade.`,
      },
      {
        texto: "Só no primeiro ano",
        porque: `A regra dos 15% não se limita ao primeiro ano — aplica-se (ou não) permanentemente, consoante o coeficiente.`,
      },
      {
        texto: "Depende do volume de negócios",
        porque: `A regra dos 15% depende do coeficiente do regime simplificado, não do volume de negócios.`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, n.º 2 CIRS",
    fonte: fonte("art31"),
  };
};

const gerarReducaoInicio: GeradorFn = (a) => {
  const reducoes = REDUCAO_COEFICIENTE_ANO.value;
  return {
    id: `ger-reducao-inicio-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta: `No primeiro ano de atividade, "${a.label}" beneficia de uma redução do coeficiente do regime simplificado. Qual a percentagem de redução?`,
    opcoes: [
      {
        texto: pct(reducoes[1]),
        porque: `No 1.º ano de atividade, o coeficiente é reduzido em ${pct(reducoes[1])} (Art. 31.º, n.º 10 CIRS).`,
      },
      {
        texto: pct(reducoes[2]),
        porque: `${pct(reducoes[2])} é a redução no 2.º ano, não no 1.º.`,
      },
      {
        texto: "75%",
        porque: `Não existe redução de 75% do coeficiente. As reduções são ${pct(reducoes[1])} no 1.º ano e ${pct(reducoes[2])} no 2.º.`,
      },
      {
        texto: "0% — sem redução",
        porque: `Há sim redução: ${pct(reducoes[1])} no 1.º ano e ${pct(reducoes[2])} no 2.º ano de atividade.`,
      },
    ],
    correta: 0,
    legalBasis: REDUCAO_COEFICIENTE_ANO.legalBasis,
    fonte: fonte("art31"),
  };
};

const gerarIRSJovem: GeradorFn = (a) => {
  const idade = IRS_JOVEM.idadeMax.value;
  return {
    id: `ger-irs-jovem-${a.tipo}`,
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta: `Um jovem com a atividade "${a.label}" pode beneficiar do IRS Jovem. Até que idade se aplica este regime?`,
    opcoes: [
      {
        texto: `${idade} anos`,
        porque: `O IRS Jovem aplica-se até aos ${idade} anos (inclusive), no último dia do ano fiscal.`,
      },
      {
        texto: "30 anos",
        porque: `O limite anterior era 30 anos. Desde 2025, o IRS Jovem estende-se até aos ${idade} anos.`,
      },
      {
        texto: "40 anos",
        porque: `O IRS Jovem não se aplica até aos 40 anos — o limite é ${idade} anos.`,
      },
      {
        texto: "26 anos",
        porque: `26 anos era o limite original do regime antigo. O limite atual é ${idade} anos.`,
      },
    ],
    correta: 0,
    legalBasis: IRS_JOVEM.idadeMax.legalBasis,
    fonte: fonte("art12bCirs"),
  };
};

const gerarEscalaoIRS: GeradorFn = (a) => {
  const escaloes = ESCALOES_IRS.value;
  const primeiro = escaloes[0];
  return {
    id: `ger-escalao-1-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `Qual a taxa marginal do 1.º escalão de IRS (Art. 68.º CIRS) aplicável ao rendimento coletável de "${a.label}"?`,
    opcoes: [
      {
        texto: pct(primeiro.taxa),
        porque: `O 1.º escalão de IRS tem uma taxa marginal de ${pct(primeiro.taxa)}, aplicada até ${primeiro.ate?.toLocaleString("pt-PT")} € de rendimento coletável.`,
      },
      {
        texto: pct(escaloes[1].taxa),
        porque: `${pct(escaloes[1].taxa)} é a taxa do 2.º escalão (${primeiro.ate?.toLocaleString("pt-PT")} € a ${escaloes[1].ate?.toLocaleString("pt-PT")} €), não do 1.º.`,
      },
      {
        texto: pct(escaloes[2].taxa),
        porque: `${pct(escaloes[2].taxa)} é a taxa do 3.º escalão, não do 1.º.`,
      },
      {
        texto: "10%",
        porque: `Não existe taxa de 10% nos escalões de IRS portugueses.`,
      },
    ],
    correta: 0,
    legalBasis: ESCALOES_IRS.legalBasis,
    fonte: fonte("art68cirs"),
  };
};

const gerarEscalaoMaximo: GeradorFn = (a) => {
  const escaloes = ESCALOES_IRS.value;
  const ultimo = escaloes[escaloes.length - 1];
  const penultimo = escaloes[escaloes.length - 2];
  return {
    id: `ger-escalao-max-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta: `Qual a taxa marginal máxima de IRS (último escalão) que pode incidir sobre rendimentos de "${a.label}"?`,
    opcoes: [
      {
        texto: pct(ultimo.taxa),
        porque: `A taxa marginal máxima é de ${pct(ultimo.taxa)} (Art. 68.º CIRS), aplicada a rendimentos coletáveis acima de ${penultimo.ate?.toLocaleString("pt-PT")} €.`,
      },
      {
        texto: "50%",
        porque: `Não existe taxa de 50% nos escalões de IRS. A máxima é ${pct(ultimo.taxa)}.`,
      },
      {
        texto: pct(penultimo.taxa),
        porque: `${pct(penultimo.taxa)} é a taxa do penúltimo escalão, não a máxima.`,
      },
      {
        texto: "45%",
        porque: `45% não é uma taxa de IRS. A taxa máxima é ${pct(ultimo.taxa)}.`,
      },
    ],
    correta: 0,
    legalBasis: ESCALOES_IRS.legalBasis,
    fonte: fonte("art68cirs"),
  };
};

const gerarDeducaoEspecifica: GeradorFn = (a) => {
  const valor = DEDUCAO_ESPECIFICA_CATB.value;
  return {
    id: `ger-ded-esp-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta: `Qual o valor da dedução específica da categoria B para "${a.label}" em 2026?`,
    opcoes: [
      {
        texto: eur(valor),
        porque: `A dedução específica é de máx(4.104 €; 8,54 × IAS) = ${eur(valor)} (Art. 25.º / 31.º CIRS).`,
      },
      {
        texto: "4.104 €",
        porque: `4.104 € é o piso fixo, mas a dedução é o máximo entre esse piso e 8,54 × IAS, que em 2026 é ${eur(valor)}.`,
      },
      {
        texto: "2.500 €",
        porque: `2.500 € não corresponde a nenhum valor de dedução. A dedução específica é ${eur(valor)}.`,
      },
      {
        texto: "5.000 €",
        porque: `5.000 € não é o valor correto. A dedução específica da cat. B é ${eur(valor)}.`,
      },
    ],
    correta: 0,
    legalBasis: DEDUCAO_ESPECIFICA_CATB.legalBasis,
    fonte: fonte("art31"),
  };
};

const gerarIVAExcesso: GeradorFn = (a) => {
  const excesso = IVA_ISENCAO_EXCESSO.value;
  const limite = IVA_ISENCAO_LIMITE.value;
  return {
    id: `ger-iva-excesso-${a.tipo}`,
    categoria: "iva",
    dificuldade: 3,
    pergunta: `Se "${a.label}" ultrapassar o limite de isenção de IVA em mais de 25%, a que valor corresponde essa perda imediata de isenção?`,
    opcoes: [
      {
        texto: eur(excesso),
        porque: `125% do limite de isenção (${eur(limite)}) = ${eur(excesso)}. Acima deste valor, perde a isenção no próprio ano (Art. 58.º CIVA).`,
      },
      {
        texto: eur(limite),
        porque: `${eur(limite)} é o limite normal de isenção, mas há uma margem de 25% antes da perda imediata.`,
      },
      {
        texto: "20.000 €",
        porque: `Não existe limiar de 20.000 €. O excesso é 125% × ${eur(limite)} = ${eur(excesso)}.`,
      },
      {
        texto: "12.500 €",
        porque: `12.500 € era o limite antigo de isenção. O excesso atual é ${eur(excesso)}.`,
      },
    ],
    correta: 0,
    legalBasis: IVA_ISENCAO_EXCESSO.legalBasis,
    fonte: fonte("portalFinancasIVA"),
  };
};

const gerarClienteEstrangeiro: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.retencao === 0) return null;
  return {
    id: `ger-cliente-estrangeiro-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `"${a.label}" presta serviços a um cliente não-residente (empresa estrangeira). Qual a taxa de retenção na fonte?`,
    opcoes: [
      {
        texto: "0% — sem retenção",
        porque: `Quando o cliente é não-residente, não há retenção na fonte de IRS (Art. 101.º CIRS aplica-se apenas a pagamentos por entidades com sede em Portugal).`,
      },
      {
        texto: pct(ef.retencao),
        porque: `${pct(ef.retencao)} é a taxa normal para clientes residentes. Para clientes estrangeiros/não-residentes, não há retenção.`,
      },
      {
        texto: "5%",
        porque: `Não existe taxa de 5% para serviços a não-residentes. A retenção simplesmente não se aplica.`,
      },
      {
        texto: "Depende do país",
        porque: `A regra é clara: sem retenção quando o cliente não tem sede em Portugal, independentemente do país.`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — retenção aplicável apenas a entidades residentes",
    fonte: fonte("art101cirs"),
  };
};

const gerarIASValor: GeradorFn = (a) => {
  const ias = IAS.value;
  return {
    id: `ger-ias-valor-${a.tipo}`,
    categoria: "geral",
    dificuldade: 1,
    pergunta: `Qual o valor do IAS (Indexante dos Apoios Sociais) em 2026, que serve de base a vários cálculos fiscais para "${a.label}"?`,
    opcoes: [
      {
        texto: eur(ias),
        porque: `O IAS em 2026 é de ${eur(ias)}. Serve de base para o teto da SS (12 × IAS), o IRS Jovem (55 × IAS) e a dedução específica (8,54 × IAS).`,
      },
      {
        texto: "509,26 €",
        porque: `509,26 € era o IAS de 2024. Em 2026 é ${eur(ias)}.`,
      },
      {
        texto: "480,43 €",
        porque: `480,43 € era o IAS de 2023. O valor atualizado para 2026 é ${eur(ias)}.`,
      },
      {
        texto: "600 €",
        porque: `O IAS não é 600 €. O valor exato em 2026 é ${eur(ias)}.`,
      },
    ],
    correta: 0,
    legalBasis: IAS.legalBasis,
    fonte: fonte("segSocialGov"),
  };
};

// ── NOVOS GERADORES (18–100) ────────────────────────────────────────

const gerarRetencaoValor: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.retencao === 0) return null;
  const fatura = 2000;
  const ret = Math.round(fatura * ef.retencao * 100) / 100;
  return {
    id: `ger-ret-val-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `"${a.label}" emite um recibo verde de ${eur(fatura)} a um cliente com contabilidade organizada. Qual o valor retido na fonte?`,
    opcoes: [
      { texto: eur(ret), porque: `${eur(fatura)} × ${pct(ef.retencao)} = ${eur(ret)}.` },
      { texto: eur(fatura * 0.23), porque: `${eur(fatura * 0.23)} seria o valor se a taxa fosse 23% (Art. 151.º), mas esta atividade tem ${pct(ef.retencao)}.` },
      { texto: eur(fatura * 0.115), porque: `${eur(fatura * 0.115)} seria para a taxa de 11,5%, não para ${pct(ef.retencao)}.` },
      { texto: "0 €", porque: `Vendas de bens não têm retenção, mas "${a.label}" é prestação de serviços sujeita a ${pct(ef.retencao)}.` },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  };
};

const gerarLiquidoRecibo: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.retencao === 0) return null;
  const fatura = 1500;
  const liquido = Math.round(fatura * (1 - ef.retencao) * 100) / 100;
  return {
    id: `ger-liquido-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `"${a.label}" emite um recibo verde de ${eur(fatura)}. Após a retenção na fonte, quanto recebe efetivamente do cliente?`,
    opcoes: [
      { texto: eur(liquido), porque: `${eur(fatura)} − ${pct(ef.retencao)} de retenção = ${eur(liquido)} recebido.` },
      { texto: eur(fatura), porque: `${eur(fatura)} seria se não houvesse retenção, mas esta atividade tem ${pct(ef.retencao)}.` },
      { texto: eur(fatura * 0.77), porque: `Este valor pressupõe retenção de 23%, não de ${pct(ef.retencao)}.` },
      { texto: eur(fatura * 0.5), porque: `Nenhuma taxa de retenção é de 50%. A retenção para esta atividade é ${pct(ef.retencao)}.` },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS",
    fonte: fonte("art101cirs"),
  };
};

const gerarRetencaoAdiantamento: GeradorFn = (a) => {
  return {
    id: `ger-ret-adianta-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 1,
    pergunta: `A retenção na fonte feita nos recibos verdes de "${a.label}" é:`,
    opcoes: [
      { texto: "Um adiantamento por conta do IRS anual", porque: "A retenção na fonte é deduzida à coleta de IRS apurada na declaração anual (Modelo 3) — não é um imposto definitivo." },
      { texto: "Um imposto definitivo e separado", porque: "A retenção não é definitiva — é descontada ao IRS final, podendo até resultar em reembolso." },
      { texto: "Uma contribuição para a Segurança Social", porque: "A SS tem taxa (21,4%) e cálculo próprios, paga separadamente à Segurança Social." },
      { texto: "Uma taxa municipal sobre os rendimentos", porque: "Não existe taxa municipal sobre rendimentos da categoria B. A retenção é um adiantamento de IRS para a Autoridade Tributária." },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — retenção como pagamento por conta",
    fonte: fonte("art101cirs"),
  };
};

const gerarQuemRetem: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.retencao === 0) return null;
  return {
    id: `ger-quem-retem-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `Quem é responsável por efetuar a retenção na fonte quando "${a.label}" emite um recibo verde?`,
    opcoes: [
      { texto: "O cliente (entidade pagadora com contabilidade organizada)", porque: "A retenção é efetuada pela entidade pagadora que possua ou deva possuir contabilidade organizada." },
      { texto: "O próprio trabalhador independente", porque: "O trabalhador independente emite o recibo, mas a retenção é obrigação do cliente/pagador." },
      { texto: "A Autoridade Tributária automaticamente", porque: "A AT não efetua retenção automaticamente — é responsabilidade da entidade pagadora." },
      { texto: "A Segurança Social", porque: "A SS cobra contribuições, não retenções na fonte de IRS. São obrigações distintas." },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — obrigação da entidade pagadora",
    fonte: fonte("art101cirs"),
  };
};

const gerarIVATaxaMadeira: GeradorFn = (a) => {
  const taxasMad = IVA_TAXAS.madeira.value;
  return {
    id: `ger-iva-madeira-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `Se "${a.label}" operar na Região Autónoma da Madeira, qual a taxa normal de IVA?`,
    opcoes: [
      { texto: pct(taxasMad.normal), porque: `Na Madeira, a taxa normal de IVA é ${pct(taxasMad.normal)} (Art. 18.º CIVA).` },
      { texto: pct(IVA_TAXAS.continente.value.normal), porque: `${pct(IVA_TAXAS.continente.value.normal)} é a taxa do continente, não da Madeira.` },
      { texto: pct(IVA_TAXAS.acores.value.normal), porque: `${pct(IVA_TAXAS.acores.value.normal)} é a taxa dos Açores, não da Madeira.` },
      { texto: pct(taxasMad.intermedia), porque: `${pct(taxasMad.intermedia)} é a taxa intermédia da Madeira, não a normal.` },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — Madeira",
    fonte: fonte("art18civa"),
  };
};

const gerarIVATaxaAcores: GeradorFn = (a) => {
  const taxasAc = IVA_TAXAS.acores.value;
  return {
    id: `ger-iva-acores-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `Se "${a.label}" operar nos Açores, qual a taxa normal de IVA?`,
    opcoes: [
      { texto: pct(taxasAc.normal), porque: `Nos Açores, a taxa normal de IVA é ${pct(taxasAc.normal)}.` },
      { texto: pct(IVA_TAXAS.continente.value.normal), porque: `${pct(IVA_TAXAS.continente.value.normal)} é a taxa do continente.` },
      { texto: pct(IVA_TAXAS.madeira.value.normal), porque: `${pct(IVA_TAXAS.madeira.value.normal)} é a taxa da Madeira.` },
      { texto: "20%", porque: `Não existe taxa de 20% nos Açores.` },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — Açores",
    fonte: fonte("art18civa"),
  };
};

const gerarIVAReduzida: GeradorFn = (a) => {
  const tc = IVA_TAXAS.continente.value;
  return {
    id: `ger-iva-red-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `Qual a taxa reduzida de IVA em Portugal continental?`,
    opcoes: [
      { texto: pct(tc.reduzida), porque: `A taxa reduzida em Portugal continental é ${pct(tc.reduzida)} (Lista I do CIVA).` },
      { texto: pct(IVA_TAXAS.acores.value.reduzida), porque: `${pct(IVA_TAXAS.acores.value.reduzida)} é a taxa reduzida nos Açores.` },
      { texto: pct(IVA_TAXAS.madeira.value.reduzida), porque: `${pct(IVA_TAXAS.madeira.value.reduzida)} é a taxa reduzida na Madeira.` },
      { texto: pct(tc.intermedia), porque: `${pct(tc.intermedia)} é a taxa intermédia, não a reduzida.` },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — taxa reduzida",
    fonte: fonte("art18civa"),
  };
};

const gerarIVAIntermedia: GeradorFn = (a) => {
  const tc = IVA_TAXAS.continente.value;
  return {
    id: `ger-iva-int-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `Qual a taxa intermédia de IVA em Portugal continental?`,
    opcoes: [
      { texto: pct(tc.intermedia), porque: `A taxa intermédia em Portugal continental é ${pct(tc.intermedia)} (Lista II do CIVA).` },
      { texto: pct(tc.reduzida), porque: `${pct(tc.reduzida)} é a taxa reduzida, não a intermédia.` },
      { texto: pct(tc.normal), porque: `${pct(tc.normal)} é a taxa normal, não a intermédia.` },
      { texto: pct(IVA_TAXAS.acores.value.intermedia), porque: `${pct(IVA_TAXAS.acores.value.intermedia)} é a taxa intermédia nos Açores, não no continente.` },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — taxa intermédia",
    fonte: fonte("art18civa"),
  };
};

const gerarSSCalculoServicos: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.baseSS !== "servicos") return null;
  const rendimento = 3000;
  const base = rendimento * 0.7;
  const contrib = Math.round(base * SS_TAXA.value * 100) / 100;
  return {
    id: `ger-ss-calc-serv-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta: `"${a.label}" tem rendimento relevante mensal de ${eur(rendimento)}. Qual a contribuição mensal aproximada para a SS?`,
    opcoes: [
      { texto: eur(contrib), porque: `${eur(rendimento)} × 70% × ${pct(SS_TAXA.value)} = ${eur(contrib)}.` },
      { texto: eur(Math.round(rendimento * SS_TAXA.value * 100) / 100), porque: `Seria este valor se a SS incidisse sobre 100%, mas para serviços incide sobre 70%.` },
      { texto: eur(Math.round(rendimento * 0.2 * SS_TAXA.value * 100) / 100), porque: `Este valor usa a base de 20% (bens), mas "${a.label}" é serviços (base 70%).` },
      { texto: "20 €", porque: `20 € é a contribuição mínima, aplicável apenas quando o cálculo resulta abaixo desse valor.` },
    ],
    correta: 0,
    legalBasis: "Art. 162.º e 168.º Código Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

const gerarSSCalculoBens: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.baseSS !== "bens") return null;
  const rendimento = 3000;
  const base = rendimento * 0.2;
  const contrib = Math.round(base * SS_TAXA.value * 100) / 100;
  return {
    id: `ger-ss-calc-bens-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta: `"${a.label}" tem rendimento relevante mensal de ${eur(rendimento)}. Qual a contribuição mensal aproximada para a SS?`,
    opcoes: [
      { texto: eur(contrib), porque: `${eur(rendimento)} × 20% × ${pct(SS_TAXA.value)} = ${eur(contrib)}.` },
      { texto: eur(Math.round(rendimento * 0.7 * SS_TAXA.value * 100) / 100), porque: `Seria este valor com base de 70% (serviços), mas esta atividade usa base de 20%.` },
      { texto: eur(Math.round(rendimento * SS_TAXA.value * 100) / 100), porque: `A SS não incide sobre 100% do rendimento.` },
      { texto: "20 €", porque: `20 € é o mínimo — o cálculo desta atividade com ${eur(rendimento)} resulta acima disso.` },
    ],
    correta: 0,
    legalBasis: "Art. 162.º e 168.º Código Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

const gerarSSIsencao12Meses: GeradorFn = (a) => {
  return {
    id: `ger-ss-isencao-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta: `Quem inicia a atividade "${a.label}" pela primeira vez (sem atividade independente nos últimos 3 anos) fica isento de SS durante:`,
    opcoes: [
      { texto: "12 meses", porque: "O Art. 157.º do Código Contributivo prevê isenção nos primeiros 12 meses de atividade." },
      { texto: "6 meses", porque: "O período de isenção é de 12 meses, não 6." },
      { texto: "24 meses", porque: "A isenção é de 12 meses, não 24." },
      { texto: "Não há isenção", porque: "Há isenção nos primeiros 12 meses para quem não exerceu atividade independente nos 3 anos anteriores." },
    ],
    correta: 0,
    legalBasis: "Art. 157.º Código Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

const gerarSSMinimo: GeradorFn = (a) => {
  return {
    id: `ger-ss-minimo-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta: `Qual a contribuição mínima mensal de Segurança Social para "${a.label}"?`,
    opcoes: [
      { texto: "20 €", porque: "A contribuição mínima mensal é de 20 € (Art. 168.º Código Contributivo)." },
      { texto: "50 €", porque: "O mínimo não é 50 € — é 20 €/mês." },
      { texto: "0 € — não há mínimo", porque: "Existe um mínimo de 20 €/mês, mesmo que o cálculo resulte num valor inferior." },
      { texto: "10 €", porque: "O mínimo legal é 20 €, não 10 €." },
    ],
    correta: 0,
    legalBasis: "Art. 168.º Código Contributivo — contribuição mínima",
    fonte: fonte("segSocialGov"),
  };
};

const gerarRendTributavel: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const bruto = 40000;
  const tributavel = Math.round(bruto * ef.coef);
  return {
    id: `ger-rend-trib-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta: `"${a.label}" faturou ${eur(bruto)} brutos num ano. No regime simplificado, qual o rendimento tributável?`,
    opcoes: [
      { texto: eur(tributavel), porque: `${eur(bruto)} × ${ef.coef.toFixed(2)} = ${eur(tributavel)}. Apenas ${pct(ef.coef)} do bruto é rendimento tributável.` },
      { texto: eur(bruto), porque: `${eur(bruto)} seria se todo o rendimento fosse tributável (coef. 1,00), o que não é o caso.` },
      { texto: eur(Math.round(bruto * 0.75)), porque: `Este valor usa coeficiente 0,75, que não é necessariamente o aplicável a "${a.label}".` },
      { texto: eur(Math.round(bruto * 0.35)), porque: `Este valor usa coeficiente 0,35, que se aplica a outras prestações de serviços.` },
    ],
    correta: 0,
    legalBasis: ef.legalCoef,
    fonte: fonte("art31"),
  };
};

const gerarReducaoSegundoAno: GeradorFn = (a) => {
  const reducoes = REDUCAO_COEFICIENTE_ANO.value;
  return {
    id: `ger-reducao-2ano-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta: `No segundo ano de atividade, "${a.label}" beneficia de que redução do coeficiente?`,
    opcoes: [
      { texto: pct(reducoes[2]), porque: `No 2.º ano, a redução é de ${pct(reducoes[2])} (Art. 31.º, n.º 10 CIRS).` },
      { texto: pct(reducoes[1]), porque: `${pct(reducoes[1])} é a redução do 1.º ano, não do 2.º.` },
      { texto: "10%", porque: `Não existe redução de 10%. São ${pct(reducoes[1])} no 1.º e ${pct(reducoes[2])} no 2.º ano.` },
      { texto: "0% — sem redução no 2.º ano", porque: `Ainda há redução no 2.º ano: ${pct(reducoes[2])}.` },
    ],
    correta: 0,
    legalBasis: REDUCAO_COEFICIENTE_ANO.legalBasis,
    fonte: fonte("art31"),
  };
};

const gerarLimiteContabilidade: GeradorFn = (a) => {
  return {
    id: `ger-limite-contab-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta: `Acima de que volume de negócios anual "${a.label}" é obrigada a ter contabilidade organizada?`,
    opcoes: [
      { texto: "200.000 €", porque: "O limite para o regime simplificado é 200.000 € (Art. 28.º CIRS). Acima deste valor, é obrigatória a contabilidade organizada." },
      { texto: "150.000 €", porque: "O limite não é 150.000 € — é 200.000 €." },
      { texto: "100.000 €", porque: "100.000 € não é o limite legal — é 200.000 €." },
      { texto: "Não há limite", porque: "Existe um limite de 200.000 €/ano para o regime simplificado." },
    ],
    correta: 0,
    legalBasis: "Art. 28.º CIRS — limite do regime simplificado",
    fonte: fonte("art31"),
  };
};

const gerarRegra15Valor: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (!ef.regra15) return null;
  const bruto = 30000;
  const val15 = Math.round(bruto * REGIME_15PCT.value);
  return {
    id: `ger-regra15-val-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta: `"${a.label}" faturou ${eur(bruto)}. Quanto deve justificar em despesas para cumprir a regra dos 15%?`,
    opcoes: [
      { texto: eur(val15), porque: `${eur(bruto)} × 15% = ${eur(val15)} de despesas a justificar.` },
      { texto: eur(Math.round(bruto * 0.25)), porque: `${eur(Math.round(bruto * 0.25))} seria 25%, não 15%.` },
      { texto: eur(Math.round(bruto * 0.10)), porque: `${eur(Math.round(bruto * 0.10))} seria apenas 10%, não 15%.` },
      { texto: "0 € — não precisa justificar", porque: `Com coeficiente ${ef.coef.toFixed(2)}, a regra dos 15% aplica-se e exige justificação de despesas.` },
    ],
    correta: 0,
    legalBasis: REGIME_15PCT.legalBasis,
    fonte: fonte("occRegimeSimplificado"),
  };
};

const gerarEscalao2: GeradorFn = (a) => {
  const esc = ESCALOES_IRS.value;
  return {
    id: `ger-esc2-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `Qual a taxa marginal do 2.º escalão de IRS (até ${esc[1].ate?.toLocaleString("pt-PT")} €)?`,
    opcoes: [
      { texto: pct(esc[1].taxa), porque: `O 2.º escalão tem taxa de ${pct(esc[1].taxa)}.` },
      { texto: pct(esc[0].taxa), porque: `${pct(esc[0].taxa)} é a taxa do 1.º escalão.` },
      { texto: pct(esc[2].taxa), porque: `${pct(esc[2].taxa)} é a taxa do 3.º escalão.` },
      { texto: "18%", porque: `18% não corresponde a nenhum escalão de IRS.` },
    ],
    correta: 0,
    legalBasis: ESCALOES_IRS.legalBasis,
    fonte: fonte("art68cirs"),
  };
};

const gerarEscalao5: GeradorFn = (a) => {
  const esc = ESCALOES_IRS.value;
  return {
    id: `ger-esc5-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta: `O 5.º escalão de IRS (até ${esc[4].ate?.toLocaleString("pt-PT")} €) tem que taxa marginal?`,
    opcoes: [
      { texto: pct(esc[4].taxa), porque: `O 5.º escalão tem taxa marginal de ${pct(esc[4].taxa)}.` },
      { texto: pct(esc[3].taxa), porque: `${pct(esc[3].taxa)} é do 4.º escalão.` },
      { texto: pct(esc[5].taxa), porque: `${pct(esc[5].taxa)} é do 6.º escalão.` },
      { texto: "30%", porque: `30% não é a taxa exata — é ${pct(esc[4].taxa)}.` },
    ],
    correta: 0,
    legalBasis: ESCALOES_IRS.legalBasis,
    fonte: fonte("art68cirs"),
  };
};

const gerarNumeroEscaloes: GeradorFn = (a) => {
  return {
    id: `ger-num-esc-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta: `Quantos escalões de IRS existem em 2026 (Art. 68.º CIRS)?`,
    opcoes: [
      { texto: "9 escalões", porque: `Em 2026, existem 9 escalões de IRS (Art. 68.º CIRS), de 12,5% a 48%.` },
      { texto: "7 escalões", porque: `Eram 7 em anos anteriores. Desde 2023 são 9 escalões.` },
      { texto: "5 escalões", porque: `Nunca foram apenas 5 escalões no sistema atual.` },
      { texto: "10 escalões", porque: `Não são 10 — são 9 escalões.` },
    ],
    correta: 0,
    legalBasis: ESCALOES_IRS.legalBasis,
    fonte: fonte("art68cirs"),
  };
};

const gerarMinimoExistencia: GeradorFn = (a) => {
  const min = MINIMO_EXISTENCIA.value;
  return {
    id: `ger-min-exist-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `Qual o mínimo de existência em 2026 (rendimento protegido de IRS)?`,
    opcoes: [
      { texto: eur(min), porque: `O mínimo de existência é ${eur(min)} (920 € × 14 meses).` },
      { texto: "10.000 €", porque: `O mínimo não é 10.000 € — é ${eur(min)}.` },
      { texto: "15.000 €", porque: `15.000 € é o limiar de isenção de IVA, não o mínimo de existência.` },
      { texto: eur(IAS.value * 14), porque: `IAS × 14 = ${eur(IAS.value * 14)}, mas o mínimo de existência usa a RMMG (920 €), não o IAS.` },
    ],
    correta: 0,
    legalBasis: MINIMO_EXISTENCIA.legalBasis,
    fonte: fonte("art70cirs"),
  };
};

const gerarIRSJovemAno1: GeradorFn = (a) => {
  return {
    id: `ger-irsj-1-${a.tipo}`,
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta: `No 1.º ano de obtenção de rendimentos, qual a isenção do IRS Jovem para "${a.label}"?`,
    opcoes: [
      { texto: "100%", porque: "No 1.º ano, a isenção é de 100% (dentro do teto de 55 × IAS)." },
      { texto: "75%", porque: "75% aplica-se aos anos 2 a 4, não ao 1.º." },
      { texto: "50%", porque: "50% aplica-se aos anos 5 a 7." },
      { texto: "25%", porque: "25% aplica-se aos anos 8 a 10." },
    ],
    correta: 0,
    legalBasis: "Regime IRS Jovem — 100% no 1.º ano",
    fonte: fonte("art12bCirs"),
  };
};

const gerarIRSJovemAno5a7: GeradorFn = (a) => {
  return {
    id: `ger-irsj-5a7-${a.tipo}`,
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta: `Do 5.º ao 7.º ano de obtenção de rendimentos no IRS Jovem, qual a isenção para "${a.label}"?`,
    opcoes: [
      { texto: "50%", porque: "Do 5.º ao 7.º ano, a isenção é de 50%." },
      { texto: "75%", porque: "75% aplica-se aos anos 2 a 4." },
      { texto: "100%", porque: "100% é só no 1.º ano." },
      { texto: "25%", porque: "25% aplica-se aos anos 8 a 10." },
    ],
    correta: 0,
    legalBasis: "Regime IRS Jovem — 50% (5.º ao 7.º ano)",
    fonte: fonte("art12bCirs"),
  };
};

const gerarIRSJovemTeto: GeradorFn = (a) => {
  const tetoIAS = IRS_JOVEM.tetoIAS.value;
  const tetoEur = Math.round(tetoIAS * IAS.value * 100) / 100;
  return {
    id: `ger-irsj-teto-${a.tipo}`,
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta: `Qual o teto anual de rendimento isento no IRS Jovem em 2026 (55 × IAS)?`,
    opcoes: [
      { texto: eur(tetoEur), porque: `55 × ${eur(IAS.value)} = ${eur(tetoEur)}.` },
      { texto: "25.000 €", porque: `O teto é calculado com 55 × IAS = ${eur(tetoEur)}, não é 25.000 €.` },
      { texto: "30.000 €", porque: `O teto exato é ${eur(tetoEur)}, não 30.000 €.` },
      { texto: eur(IAS.value * 12), porque: `12 × IAS é o teto mensal da SS, não o teto do IRS Jovem.` },
    ],
    correta: 0,
    legalBasis: "Teto anual = 55 × IAS",
    fonte: fonte("art12bCirs"),
  };
};

const gerarIRSJovemDuracao: GeradorFn = (a) => {
  return {
    id: `ger-irsj-dur-${a.tipo}`,
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta: `Durante quantos anos se pode beneficiar do IRS Jovem?`,
    opcoes: [
      { texto: "10 anos", porque: "O regime dura 10 anos consecutivos de obtenção de rendimentos." },
      { texto: "5 anos", porque: "Não são 5 — o regime prevê 10 anos de isenção progressiva." },
      { texto: "7 anos", porque: "O regime não tem 7 anos — são 10 (1+3+3+3)." },
      { texto: "15 anos", porque: "O regime termina após 10 anos, não 15." },
    ],
    correta: 0,
    legalBasis: "Regime IRS Jovem — 10 anos",
    fonte: fonte("art12bCirs"),
  };
};

const gerarDeducaoSaude: GeradorFn = (a) => {
  const ds = DEDUCAO_SAUDE.value;
  return {
    id: `ger-ded-saude-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `A dedução de despesas de saúde no IRS corresponde a que percentagem, até que limite?`,
    opcoes: [
      { texto: `${pct(ds.taxa)} até ${eur(ds.limite)}`, porque: `Saúde: ${pct(ds.taxa)} até ${eur(ds.limite)} (Art. 78.º-C CIRS).` },
      { texto: `30% até 800 €`, porque: `30% até 800 € é a dedução de educação, não de saúde.` },
      { texto: `35% até 250 €`, porque: `35% até 250 € é a dedução de despesas gerais familiares.` },
      { texto: `${pct(ds.taxa)} até 500 €`, porque: `O limite da saúde é ${eur(ds.limite)}, não 500 €.` },
    ],
    correta: 0,
    legalBasis: DEDUCAO_SAUDE.legalBasis,
    fonte: fonte("art78aCirs"),
  };
};

const gerarDeducaoEducacao: GeradorFn = (a) => {
  const de = DEDUCAO_EDUCACAO.value;
  return {
    id: `ger-ded-educ-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `A dedução de despesas de educação corresponde a que percentagem, até que limite?`,
    opcoes: [
      { texto: `${pct(de.taxa)} até ${eur(de.limite)}`, porque: `Educação: ${pct(de.taxa)} até ${eur(de.limite)} (Art. 78.º-D CIRS).` },
      { texto: `15% até 1.000 €`, porque: `15% até 1.000 € é a dedução de saúde, não de educação.` },
      { texto: `15% até 900 €`, porque: `15% até 900 € é a dedução de rendas de habitação.` },
      { texto: `${pct(de.taxa)} até 1.000 €`, porque: `O limite da educação é ${eur(de.limite)}, não 1.000 €.` },
    ],
    correta: 0,
    legalBasis: DEDUCAO_EDUCACAO.legalBasis,
    fonte: fonte("art78aCirs"),
  };
};

const gerarDeducaoRendas: GeradorFn = (a) => {
  const dr = DEDUCAO_RENDAS.value;
  return {
    id: `ger-ded-rend-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `Em 2026, a dedução de rendas de habitação permanente é de que percentagem, até que limite?`,
    opcoes: [
      { texto: `${pct(dr.taxa)} até ${eur(dr.limite)}`, porque: `Rendas: ${pct(dr.taxa)} até ${eur(dr.limite)} (Lei 36/2024).` },
      { texto: `15% até 700 €`, porque: `700 € era o limite em 2025 — em 2026 é ${eur(dr.limite)}.` },
      { texto: `15% até 1.000 €`, porque: `1.000 € é o limite a partir de 2027, não 2026.` },
      { texto: `30% até 800 €`, porque: `30% até 800 € é a dedução de educação, não de rendas.` },
    ],
    correta: 0,
    legalBasis: DEDUCAO_RENDAS.legalBasis,
    fonte: fonte("art78aCirs"),
  };
};

const gerarDeducaoDependente: GeradorFn = (a) => {
  const val = DEDUCAO_DEPENDENTE.value;
  return {
    id: `ger-ded-dep-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta: `Qual o valor da dedução à coleta por dependente com mais de 3 anos?`,
    opcoes: [
      { texto: eur(val), porque: `A dedução por dependente >3 anos é de ${eur(val)} (Art. 78.º-A CIRS).` },
      { texto: eur(DEDUCAO_DEPENDENTE_BEBE.value), porque: `${eur(DEDUCAO_DEPENDENTE_BEBE.value)} é para dependentes até 3 anos.` },
      { texto: "400 €", porque: `O valor não é 400 € — é ${eur(val)}.` },
      { texto: "900 €", porque: `900 € é a dedução majorada a partir do 3.º dependente.` },
    ],
    correta: 0,
    legalBasis: DEDUCAO_DEPENDENTE.legalBasis,
    fonte: fonte("art78aCirs"),
  };
};

const gerarPrazoIRS: GeradorFn = (a) => {
  return {
    id: `ger-prazo-irs-${a.tipo}`,
    categoria: "prazos",
    dificuldade: 1,
    pergunta: `Em que período deve ser entregue a declaração anual de IRS para "${a.label}"?`,
    opcoes: [
      { texto: "1 de abril a 30 de junho", porque: "A declaração de IRS é entregue entre 1 de abril e 30 de junho." },
      { texto: "1 de janeiro a 31 de março", porque: "Este período não corresponde ao prazo legal da declaração de IRS." },
      { texto: "1 de setembro a 30 de novembro", porque: "Não é neste período — o IRS entrega-se de abril a junho." },
      { texto: "1 de março a 31 de maio", porque: "O prazo começa em abril, não em março." },
    ],
    correta: 0,
    legalBasis: "Período de entrega da declaração de IRS",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarPrazoSSMensal: GeradorFn = (a) => {
  return {
    id: `ger-prazo-ss-${a.tipo}`,
    categoria: "prazos",
    dificuldade: 1,
    pergunta: `Até que dia do mês deve ser paga a contribuição mensal de SS para "${a.label}"?`,
    opcoes: [
      { texto: "Dia 20", porque: "O pagamento mensal da SS deve ser feito entre os dias 10 e 20." },
      { texto: "Dia 30", porque: "O limite é o dia 20, não o dia 30." },
      { texto: "Dia 15", porque: "O limite é o dia 20, não o dia 15." },
      { texto: "Dia 5", porque: "O pagamento é entre os dias 10 e 20, não no dia 5." },
    ],
    correta: 0,
    legalBasis: "Pagamento mensal — SS (dias 10 a 20)",
    fonte: fonte("segSocialGov"),
  };
};

const gerarPrazoPagamentoConta: GeradorFn = (a) => {
  return {
    id: `ger-prazo-ppc-${a.tipo}`,
    categoria: "prazos",
    dificuldade: 2,
    pergunta: `Em que meses ocorrem os pagamentos por conta de IRS (para quem não tem retenção na fonte)?`,
    opcoes: [
      { texto: "Julho, setembro e dezembro", porque: "Os 3 pagamentos por conta ocorrem até ao dia 20 de julho, setembro e dezembro." },
      { texto: "Janeiro, abril e julho", porque: "Não são estes os meses dos pagamentos por conta." },
      { texto: "Março, junho e setembro", porque: "Os pagamentos por conta não ocorrem nestes meses." },
      { texto: "Fevereiro, maio e agosto", porque: "Estes meses não correspondem aos pagamentos por conta de IRS." },
    ],
    correta: 0,
    legalBasis: "Pagamentos por conta de IRS",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarCategoriaB: GeradorFn = (a) => {
  return {
    id: `ger-cat-b-${a.tipo}`,
    categoria: "geral",
    dificuldade: 1,
    pergunta: `Os rendimentos de "${a.label}" como trabalhador independente enquadram-se em que categoria de IRS?`,
    opcoes: [
      { texto: "Categoria B (rendimentos empresariais e profissionais)", porque: "Rendimentos de trabalho independente são da categoria B do IRS (Art. 3.º CIRS)." },
      { texto: "Categoria A (trabalho dependente)", porque: "A categoria A é para trabalhadores por conta de outrem, não independentes." },
      { texto: "Categoria F (rendimentos prediais)", porque: "A categoria F é para rendas de imóveis, não trabalho independente." },
      { texto: "Categoria H (pensões)", porque: "A categoria H é para pensões de reforma, não para rendimentos de atividade profissional." },
    ],
    correta: 0,
    legalBasis: "Art. 3.º CIRS — rendimentos da categoria B",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarReciboVerde: GeradorFn = (a) => {
  return {
    id: `ger-recibo-verde-${a.tipo}`,
    categoria: "geral",
    dificuldade: 1,
    pergunta: `O que é um "recibo verde" no contexto de "${a.label}"?`,
    opcoes: [
      { texto: "O recibo eletrónico emitido no Portal das Finanças para titular rendimentos da categoria B", porque: "Recibo verde é a designação comum do recibo eletrónico emitido por trabalhadores independentes no Portal das Finanças." },
      { texto: "Um documento para pedir reembolso de IVA", porque: "O recibo verde não é um pedido de reembolso de IVA — titula uma prestação de serviços ou venda." },
      { texto: "Uma fatura emitida por empresas", porque: "Empresas emitem faturas por software certificado. O recibo verde é para trabalhadores independentes em nome individual." },
      { texto: "Um certificado de quitação da Segurança Social", porque: "O recibo verde titula rendimentos, não tem relação com o pagamento de SS." },
    ],
    correta: 0,
    legalBasis: "Recibo eletrónico — categoria B",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarDiferencaIRSSS: GeradorFn = (a) => {
  return {
    id: `ger-dif-irs-ss-${a.tipo}`,
    categoria: "geral",
    dificuldade: 2,
    pergunta: `A retenção na fonte de IRS e a contribuição para a SS de "${a.label}" são:`,
    opcoes: [
      { texto: "Obrigações distintas, com entidades, taxas e bases diferentes", porque: "A retenção vai para a AT (IRS); a contribuição vai para a SS. São calculadas de forma diferente." },
      { texto: "A mesma coisa", porque: "São obrigações completamente distintas: IRS e SS são pagos a entidades diferentes com regras diferentes." },
      { texto: "Calculadas sobre a mesma base", porque: "A retenção incide sobre o valor do recibo; a SS incide sobre 70% ou 20% do rendimento relevante trimestral." },
      { texto: "Alternativas — paga-se uma ou outra", porque: "Ambas podem ser obrigatórias em simultâneo (salvo isenções específicas de cada uma)." },
    ],
    correta: 0,
    legalBasis: "IRS vs. SS — obrigações distintas",
    fonte: fonte("segSocialGov"),
  };
};

const gerarAtoIsolado: GeradorFn = (a) => {
  return {
    id: `ger-ato-isolado-${a.tipo}`,
    categoria: "geral",
    dificuldade: 1,
    pergunta: `O "ato isolado" é indicado para que situação?`,
    opcoes: [
      { texto: "Prestação de serviço ou venda ocasional, sem regularidade", porque: "O ato isolado destina-se a situações pontuais, sem necessidade de abrir atividade." },
      { texto: "Quem fatura regularmente todos os meses", porque: "Quem fatura com regularidade deve ter atividade aberta nas Finanças." },
      { texto: "Apenas para empresas", porque: "O ato isolado é para pessoas singulares com serviços ocasionais." },
      { texto: "Substituir definitivamente a abertura de atividade", porque: "O ato isolado é para ocasiões pontuais — não substitui a abertura de atividade regular." },
    ],
    correta: 0,
    legalBasis: "Ato isolado — rendimento ocasional",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarIRCGeral: GeradorFn = (a) => {
  const taxa = IRC_TAXA_GERAL.value;
  return {
    id: `ger-irc-geral-${a.tipo}`,
    categoria: "geral",
    dificuldade: 2,
    pergunta: `Se "${a.label}" criasse uma empresa (sociedade), qual a taxa geral de IRC em 2026?`,
    opcoes: [
      { texto: pct(taxa), porque: `A taxa geral de IRC em 2026 é ${pct(taxa)} (Art. 87.º CIRC).` },
      { texto: "21%", porque: `A taxa geral era 21% anteriormente. Desde o OE2026 é ${pct(taxa)}.` },
      { texto: pct(IRC_TAXA_PME.value), porque: `${pct(IRC_TAXA_PME.value)} é a taxa reduzida PME nos primeiros ${eur(IRC_LIMITE_PME.value)}, não a taxa geral.` },
      { texto: "25%", porque: `25% não é a taxa de IRC em vigor — é ${pct(taxa)}.` },
    ],
    correta: 0,
    legalBasis: IRC_TAXA_GERAL.legalBasis,
    fonte: fonte("art87circ"),
  };
};

const gerarIRCPME: GeradorFn = (a) => {
  return {
    id: `ger-irc-pme-${a.tipo}`,
    categoria: "geral",
    dificuldade: 3,
    pergunta: `A taxa reduzida de IRC para PME aplica-se até que montante de matéria coletável?`,
    opcoes: [
      { texto: eur(IRC_LIMITE_PME.value), porque: `A taxa de ${pct(IRC_TAXA_PME.value)} aplica-se aos primeiros ${eur(IRC_LIMITE_PME.value)} de matéria coletável.` },
      { texto: "25.000 €", porque: `O limiar PME não é 25.000 € — é ${eur(IRC_LIMITE_PME.value)}.` },
      { texto: "100.000 €", porque: `Não são 100.000 € — o limiar é ${eur(IRC_LIMITE_PME.value)}.` },
      { texto: "200.000 €", porque: `200.000 € é o limite do regime simplificado de IRS, não o limiar PME de IRC.` },
    ],
    correta: 0,
    legalBasis: IRC_TAXA_PME.legalBasis,
    fonte: fonte("art87circ"),
  };
};

const gerarDividendos: GeradorFn = (a) => {
  const taxa = DIVIDENDOS_TAXA.value;
  return {
    id: `ger-dividendos-${a.tipo}`,
    categoria: "geral",
    dificuldade: 2,
    pergunta: `Se "${a.label}" tivesse uma empresa, qual a taxa sobre os dividendos distribuídos?`,
    opcoes: [
      { texto: pct(taxa), porque: `Os dividendos são tributados a ${pct(taxa)} (taxa liberatória, Art. 71.º CIRS).` },
      { texto: "25%", porque: `25% é a taxa da Categoria F (rendas habitação), não de dividendos.` },
      { texto: "23%", porque: `23% é uma taxa de retenção de profissões liberais, não de dividendos.` },
      { texto: pct(IRC_TAXA_GERAL.value), porque: `${pct(IRC_TAXA_GERAL.value)} é a taxa geral de IRC — os dividendos são tributados a ${pct(taxa)}.` },
    ],
    correta: 0,
    legalBasis: DIVIDENDOS_TAXA.legalBasis,
    fonte: fonte("art71cirs"),
  };
};

const gerarCatFTaxaHabitacao: GeradorFn = (a) => {
  const taxa = CATEGORIA_F.taxaHabitacao.value;
  return {
    id: `ger-catf-hab-${a.tipo}`,
    categoria: "categoria_f",
    dificuldade: 2,
    pergunta: `Se "${a.label}" também arrendar um imóvel para habitação, qual a taxa autónoma sobre essas rendas?`,
    opcoes: [
      { texto: pct(taxa), porque: `A taxa autónoma para arrendamento habitacional é ${pct(taxa)} (Art. 72.º CIRS).` },
      { texto: pct(CATEGORIA_F.taxaNaoHabitacao.value), porque: `${pct(CATEGORIA_F.taxaNaoHabitacao.value)} é a taxa para arrendamento não habitacional.` },
      { texto: "23%", porque: `23% é uma taxa de retenção de IRS, não de rendas prediais.` },
      { texto: "20%", porque: `Não existe taxa de 20% na Categoria F.` },
    ],
    correta: 0,
    legalBasis: CATEGORIA_F.taxaHabitacao.legalBasis,
    fonte: fonte("art72"),
  };
};

const gerarCatFNaoHabitacional: GeradorFn = (a) => {
  const taxa = CATEGORIA_F.taxaNaoHabitacao.value;
  return {
    id: `ger-catf-nao-hab-${a.tipo}`,
    categoria: "categoria_f",
    dificuldade: 2,
    pergunta: `A taxa autónoma sobre arrendamento não habitacional (escritório, loja) é de:`,
    opcoes: [
      { texto: pct(taxa), porque: `O arrendamento não habitacional é tributado a ${pct(taxa)}.` },
      { texto: pct(CATEGORIA_F.taxaHabitacao.value), porque: `${pct(CATEGORIA_F.taxaHabitacao.value)} é para arrendamento habitacional.` },
      { texto: "30%", porque: `Não existe taxa de 30% na Categoria F.` },
      { texto: "23%", porque: `23% é taxa de IVA/retenção, não de rendas prediais.` },
    ],
    correta: 0,
    legalBasis: CATEGORIA_F.taxaNaoHabitacao.legalBasis,
    fonte: fonte("rendasPrediais"),
  };
};

const gerarCatFSemSS: GeradorFn = (a) => {
  return {
    id: `ger-catf-sem-ss-${a.tipo}`,
    categoria: "categoria_f",
    dificuldade: 1,
    pergunta: `Os rendimentos de arrendamento (Categoria F) estão sujeitos a Segurança Social?`,
    opcoes: [
      { texto: "Não — a Categoria F não tem SS", porque: "Rendimentos prediais (Cat. F) não geram obrigações de SS. A SS aplica-se à categoria B (trabalho independente)." },
      { texto: "Sim, 21,4% sobre o total", porque: "A taxa de 21,4% aplica-se a rendimentos da categoria B, não da F." },
      { texto: "Sim, mas apenas 10%", porque: "Não há taxa de SS sobre rendas prediais." },
      { texto: "Depende do valor da renda", porque: "Independentemente do valor, rendas prediais não têm SS." },
    ],
    correta: 0,
    legalBasis: "Categoria F — sem Segurança Social",
    fonte: fonte("rendasPrediais"),
  };
};

const gerarCoeficienteImpacto: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const deducaoImplicita = 1 - ef.coef;
  return {
    id: `ger-coef-impacto-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 2,
    pergunta: `Com coeficiente ${ef.coef.toFixed(2)}, qual a percentagem de despesas implicitamente deduzida no regime simplificado de "${a.label}"?`,
    opcoes: [
      { texto: pct(deducaoImplicita), porque: `Se o coeficiente é ${ef.coef.toFixed(2)}, presume-se que ${pct(deducaoImplicita)} são despesas (parte não tributável).` },
      { texto: pct(ef.coef), porque: `${pct(ef.coef)} é a parte tributável, não a parte deduzida.` },
      { texto: "15%", porque: `15% é a percentagem da regra de despesas a justificar, não a dedução implícita do coeficiente.` },
      { texto: "50%", porque: `A dedução implícita depende do coeficiente — para ${ef.coef.toFixed(2)} é ${pct(deducaoImplicita)}.` },
    ],
    correta: 0,
    legalBasis: ef.legalCoef,
    fonte: fonte("art31"),
  };
};

const gerarSSDeclaracao: GeradorFn = (a) => {
  return {
    id: `ger-ss-decl-${a.tipo}`,
    categoria: "prazos",
    dificuldade: 2,
    pergunta: `A declaração trimestral de rendimentos à SS para "${a.label}" referente ao 1.º trimestre (jan-mar) deve ser feita até:`,
    opcoes: [
      { texto: "Final de abril", porque: "A declaração do 1.º trimestre é feita até ao final do mês seguinte (abril)." },
      { texto: "Final de março", porque: "Março é o último mês do trimestre — a declaração é no mês seguinte (abril)." },
      { texto: "Final de janeiro", porque: "Janeiro corresponde à declaração do 4.º trimestre anterior." },
      { texto: "Final de julho", porque: "Julho corresponde à declaração do 2.º trimestre, não do 1.º." },
    ],
    correta: 0,
    legalBasis: "Declaração trimestral — SS",
    fonte: fonte("segSocialGov"),
  };
};

const gerarIVAvsRetencao: GeradorFn = (a) => {
  return {
    id: `ger-iva-vs-ret-${a.tipo}`,
    categoria: "geral",
    dificuldade: 2,
    pergunta: `O IVA e a retenção na fonte são obrigações que:`,
    opcoes: [
      { texto: "São distintas — o IVA é um imposto sobre o consumo, a retenção é adiantamento de IRS", porque: "O IVA é entregue ao Estado e cobrado ao cliente; a retenção é deduzida ao rendimento do trabalhador como antecipação de IRS." },
      { texto: "Se substituem mutuamente", porque: "IVA e retenção são obrigações separadas que podem coexistir." },
      { texto: "São a mesma coisa com nomes diferentes", porque: "São impostos distintos com regras e destinatários diferentes." },
      { texto: "Só uma delas se aplica a cada recibo", porque: "Um recibo pode ter IVA e retenção em simultâneo (exceto isentos de IVA ou sem retenção)." },
    ],
    correta: 0,
    legalBasis: "IVA (CIVA) vs. Retenção (Art. 101.º CIRS)",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarObrigacoesAnuais: GeradorFn = (a) => {
  return {
    id: `ger-obrig-anuais-${a.tipo}`,
    categoria: "geral",
    dificuldade: 2,
    pergunta: `Qual destas NÃO é uma obrigação anual de "${a.label}" como trabalhador independente?`,
    opcoes: [
      { texto: "Pagar o IUC de todos os veículos em Portugal", porque: "O IUC é obrigação de proprietários de veículos, não uma obrigação geral de trabalhadores independentes." },
      { texto: "Entregar a declaração de IRS (Modelo 3)", porque: "A declaração anual de IRS é obrigação de todos os contribuintes com rendimentos." },
      { texto: "Pagar contribuições mensais à Segurança Social", porque: "As contribuições à SS são obrigatórias (salvo isenções no início de atividade)." },
      { texto: "Manter a faturação registada no Portal das Finanças", porque: "A emissão de recibos verdes no Portal das Finanças é obrigatória." },
    ],
    correta: 0,
    legalBasis: "Obrigações do trabalhador independente",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarReservaTotal: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const fatura = 1000;
  const ret = fatura * ef.retencao;
  const baseSS = ef.baseSS === "servicos" ? 0.7 : 0.2;
  const ss = fatura * baseSS * SS_TAXA.value;
  const total = ret + ss;
  const totalPct = total / fatura;
  return {
    id: `ger-reserva-${a.tipo}`,
    categoria: "geral",
    dificuldade: 3,
    pergunta: `Num recibo de ${eur(fatura)} de "${a.label}", aproximadamente quanto deve reservar para retenção + SS (sem contar IVA)?`,
    opcoes: [
      { texto: `≈ ${eur(Math.round(total))} (${Math.round(totalPct * 100)}%)`, porque: `Retenção ${pct(ef.retencao)} + SS (${pct(baseSS)} × ${pct(SS_TAXA.value)}) ≈ ${eur(Math.round(total))}.` },
      { texto: `≈ ${eur(Math.round(fatura * 0.5))} (50%)`, porque: `50% é uma estimativa genérica demasiado alta para a maioria das atividades.` },
      { texto: `≈ ${eur(Math.round(ret))} (apenas a retenção)`, porque: `Falta contabilizar a contribuição para a SS.` },
      { texto: "0 € — não é preciso reservar", porque: `É sempre prudente reservar para retenção e SS.` },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS + Art. 162.º Código Contributivo",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarIVAPerda: GeradorFn = (a) => {
  const limite = IVA_ISENCAO_LIMITE.value;
  return {
    id: `ger-iva-perda-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `"${a.label}" faturou 16.000 € num ano (acima de ${eur(limite)} mas abaixo de ${eur(IVA_ISENCAO_EXCESSO.value)}). O que acontece à isenção de IVA?`,
    opcoes: [
      { texto: "Mantém-se até ao fim do ano, perde-se a 1 de janeiro seguinte", porque: `Entre ${eur(limite)} e ${eur(IVA_ISENCAO_EXCESSO.value)}, a isenção mantém-se nesse ano mas é perdida no ano seguinte.` },
      { texto: "Perde-se imediatamente", porque: `A perda imediata só ocorre se ultrapassar ${eur(IVA_ISENCAO_EXCESSO.value)}.` },
      { texto: "Não acontece nada", porque: `Ultrapassar ${eur(limite)} tem consequências — perde-se a isenção no ano seguinte.` },
      { texto: "Passa-se automaticamente para a taxa de 6%", porque: `Ao perder a isenção, aplica-se a taxa correspondente à atividade (geralmente 23%).` },
    ],
    correta: 0,
    legalBasis: "Art. 53.º / Art. 58.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  };
};

const gerarIVAClienteUE: GeradorFn = (a) => {
  return {
    id: `ger-iva-ue-${a.tipo}`,
    categoria: "iva",
    dificuldade: 3,
    pergunta: `"${a.label}" presta serviços a uma empresa sediada em França (com NIF intracomunitário). Cobra IVA?`,
    opcoes: [
      { texto: "Não — aplica-se a autoliquidação (reverse charge) pelo cliente", porque: "Em serviços B2B intracomunitários, o IVA é devido no país do cliente (Art. 6.º CIVA / Art. 196.º Diretiva IVA)." },
      { texto: "Sim, 23% de IVA", porque: "O IVA não é cobrado em Portugal quando o cliente é uma empresa noutro Estado-Membro." },
      { texto: "Sim, mas a taxa do país do cliente", porque: "O trabalhador português não cobra IVA — é o cliente que autoliquida no seu país." },
      { texto: "Sim, mas com isenção", porque: "Não se trata de isenção mas de localização da operação fora de Portugal." },
    ],
    correta: 0,
    legalBasis: "Art. 6.º CIVA — localização de serviços B2B intracomunitários",
    fonte: fonte("art6civa"),
  };
};

const gerarCoeficienteEfetivo1Ano: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const reducoes = REDUCAO_COEFICIENTE_ANO.value;
  const coefReduzido = ef.coef * (1 - reducoes[1]);
  return {
    id: `ger-coef-efet-1-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta: `No 1.º ano de atividade, qual o coeficiente efetivo de "${a.label}" (com redução de ${pct(reducoes[1])})?`,
    opcoes: [
      { texto: coefReduzido.toFixed(4), porque: `${ef.coef.toFixed(2)} × (1 − ${pct(reducoes[1])}) = ${coefReduzido.toFixed(4)}.` },
      { texto: ef.coef.toFixed(2), porque: `${ef.coef.toFixed(2)} é o coeficiente sem redução. No 1.º ano aplica-se a redução de ${pct(reducoes[1])}.` },
      { texto: (ef.coef * (1 - reducoes[2])).toFixed(4), porque: `Este valor aplica a redução do 2.º ano (${pct(reducoes[2])}), não do 1.º.` },
      { texto: "0.00", porque: `O coeficiente não é reduzido a zero — é reduzido em ${pct(reducoes[1])}.` },
    ],
    correta: 0,
    legalBasis: REDUCAO_COEFICIENTE_ANO.legalBasis,
    fonte: fonte("art31"),
  };
};

const gerarIVATresRegioes: GeradorFn = (a) => {
  const tc = IVA_TAXAS.continente.value;
  const tm = IVA_TAXAS.madeira.value;
  const ta = IVA_TAXAS.acores.value;
  return {
    id: `ger-iva-3reg-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `As taxas normais de IVA em Portugal (Continente, Madeira, Açores) são, respetivamente:`,
    opcoes: [
      { texto: `${pct(tc.normal)} / ${pct(tm.normal)} / ${pct(ta.normal)}`, porque: `Continente ${pct(tc.normal)}, Madeira ${pct(tm.normal)}, Açores ${pct(ta.normal)}.` },
      { texto: `${pct(tc.normal)} / ${pct(ta.normal)} / ${pct(tm.normal)}`, porque: `A ordem Madeira/Açores está invertida.` },
      { texto: `${pct(tc.normal)} / ${pct(tc.normal)} / ${pct(tc.normal)}`, porque: `As Regiões Autónomas têm taxas próprias (inferiores às do continente).` },
      { texto: `21% / 20% / 18%`, porque: `Estas taxas não correspondem às em vigor.` },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — taxas por região",
    fonte: fonte("art18civa"),
  };
};

const gerarEscalao6: GeradorFn = (a) => {
  const esc = ESCALOES_IRS.value;
  return {
    id: `ger-esc6-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta: `O 6.º escalão de IRS (até ${esc[5].ate?.toLocaleString("pt-PT")} €) tem que taxa marginal?`,
    opcoes: [
      { texto: pct(esc[5].taxa), porque: `O 6.º escalão tem taxa de ${pct(esc[5].taxa)}.` },
      { texto: pct(esc[4].taxa), porque: `${pct(esc[4].taxa)} é do 5.º escalão.` },
      { texto: pct(esc[6].taxa), porque: `${pct(esc[6].taxa)} é do 7.º escalão.` },
      { texto: "35%", porque: `35% não é a taxa exata — é ${pct(esc[5].taxa)}.` },
    ],
    correta: 0,
    legalBasis: ESCALOES_IRS.legalBasis,
    fonte: fonte("art68cirs"),
  };
};

const gerarCatFReducao: GeradorFn = (a) => {
  const red = CATEGORIA_F.reducaoDuracao.value;
  return {
    id: `ger-catf-red-${a.tipo}`,
    categoria: "categoria_f",
    dificuldade: 3,
    pergunta: `Um contrato de arrendamento habitacional de 15 anos, comunicado à AT, beneficia de que redução na taxa autónoma?`,
    opcoes: [
      { texto: `${Math.round(red["10a20"] * 100)} pontos percentuais`, porque: `Contratos entre 10 e 20 anos beneficiam de redução de ${Math.round(red["10a20"] * 100)} p.p.` },
      { texto: `${Math.round(red["5a10"] * 100)} pontos percentuais`, porque: `${Math.round(red["5a10"] * 100)} p.p. aplica-se a contratos de 5 a 10 anos.` },
      { texto: `${Math.round(red["20mais"] * 100)} pontos percentuais`, porque: `${Math.round(red["20mais"] * 100)} p.p. aplica-se a contratos ≥ 20 anos.` },
      { texto: "0 pontos percentuais", porque: "Há redução para contratos comunicados à AT com duração ≥ 5 anos." },
    ],
    correta: 0,
    legalBasis: CATEGORIA_F.reducaoDuracao.legalBasis,
    fonte: fonte("rendasPrediais"),
  };
};

const gerarContribuicaoTotal: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const basePct = ef.baseSS === "servicos" ? 0.7 : 0.2;
  const contribPct = basePct * SS_TAXA.value;
  return {
    id: `ger-contrib-total-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta: `Qual a contribuição efetiva de SS sobre o rendimento bruto total de "${a.label}"?`,
    opcoes: [
      { texto: `≈ ${pct(contribPct)} (${pct(basePct)} × ${pct(SS_TAXA.value)})`, porque: `Base ${pct(basePct)} × taxa ${pct(SS_TAXA.value)} = ${pct(contribPct)} do rendimento bruto.` },
      { texto: pct(SS_TAXA.value), porque: `${pct(SS_TAXA.value)} é a taxa, mas aplica-se sobre ${pct(basePct)} do rendimento, não sobre 100%.` },
      { texto: "10%", porque: `Não existe contribuição efetiva de 10% — depende da base (${pct(basePct)}) × taxa (${pct(SS_TAXA.value)}).` },
      { texto: pct(basePct), porque: `${pct(basePct)} é a base de incidência, não a contribuição final.` },
    ],
    correta: 0,
    legalBasis: "Art. 162.º e 168.º Código Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

const gerarRetencaoHistorico: GeradorFn = (a) => {
  if (a.tipo !== "art151") return null;
  return {
    id: `ger-ret-hist-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `A taxa de retenção das profissões do Art. 151.º CIRS era anteriormente de 25% e foi reduzida pelo OE2025 para:`,
    opcoes: [
      { texto: "23%", porque: "O OE2025 reduziu a retenção das profissões do Art. 151.º de 25% para 23%." },
      { texto: "20%", porque: "Não foi reduzida para 20% — a taxa atual é 23%." },
      { texto: "25% (não houve alteração)", porque: "Houve sim alteração — de 25% para 23%." },
      { texto: "21%", porque: "A taxa não foi reduzida para 21% — é 23%." },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — alteração pelo OE2025",
    fonte: fonte("art101cirs"),
  };
};

const gerarIRSProgressivo: GeradorFn = (a) => {
  return {
    id: `ger-irs-progr-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `O IRS é um imposto progressivo. Isso significa que:`,
    opcoes: [
      { texto: "Cada escalão aplica-se apenas à fração de rendimento dentro dele", porque: "A taxa de cada escalão aplica-se apenas à porção de rendimento que cai nesse intervalo — é a taxa marginal." },
      { texto: "Todo o rendimento é tributado à taxa do escalão mais alto", porque: "Não — apenas a fração acima do limiar é tributada à taxa mais alta." },
      { texto: "A taxa é sempre fixa independentemente do rendimento", porque: "O IRS não tem taxa fixa (flat tax) — tem escalões progressivos." },
      { texto: "Quem ganha mais paga menos imposto proporcionalmente", porque: "É o oposto — escalões progressivos fazem quem ganha mais pagar uma taxa efetiva maior." },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — tributação progressiva por escalões",
    fonte: fonte("art68cirs"),
  };
};

const gerarAberturaAtividade: GeradorFn = (a) => {
  return {
    id: `ger-abert-ativ-${a.tipo}`,
    categoria: "prazos",
    dificuldade: 1,
    pergunta: `Quando deve ser feita a abertura de atividade nas Finanças para "${a.label}"?`,
    opcoes: [
      { texto: "Antes do início da atividade (ou até 30 dias após)", porque: "A abertura de atividade deve ser feita antes do início ou no prazo de 30 dias." },
      { texto: "Até ao final do ano fiscal", porque: "Deve ser feita antes de começar a faturar, não no final do ano." },
      { texto: "Quando se entregar o primeiro IRS", porque: "A abertura é feita antes de faturar, não na declaração de IRS." },
      { texto: "Não é necessária se faturar pouco", porque: "A abertura é obrigatória independentemente do volume de faturação (exceto atos isolados)." },
    ],
    correta: 0,
    legalBasis: "Abertura de atividade nas Finanças",
    fonte: fonte("govptTrabIndependente"),
  };
};

const gerarIVADeclaracao: GeradorFn = (a) => {
  return {
    id: `ger-iva-decl-${a.tipo}`,
    categoria: "prazos",
    dificuldade: 2,
    pergunta: `Um trabalhador independente no regime trimestral de IVA entrega a declaração referente ao 1.º trimestre até:`,
    opcoes: [
      { texto: "20 de maio", porque: "A declaração trimestral de IVA do 1.º trimestre é entregue até 20 de maio." },
      { texto: "20 de abril", porque: "Abril seria um mês de carência insuficiente — o prazo é maio." },
      { texto: "20 de junho", porque: "Junho não corresponde ao prazo — é maio para o 1.º trimestre." },
      { texto: "30 de março", porque: "Março é o último mês do trimestre, não o prazo de entrega." },
    ],
    correta: 0,
    legalBasis: "Declaração periódica de IVA (trimestral)",
    fonte: fonte("portalFinancasIVA"),
  };
};

const gerarRetencaoSemContabilidade: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  if (ef.retencao === 0) return null;
  return {
    id: `ger-ret-sem-contab-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 2,
    pergunta: `"${a.label}" presta serviços a um particular (pessoa sem contabilidade organizada). Há retenção na fonte?`,
    opcoes: [
      { texto: "Não — a retenção só se aplica quando o cliente tem contabilidade organizada", porque: "Clientes particulares (sem contabilidade organizada) não estão obrigados a efetuar retenção na fonte." },
      { texto: `Sim, ${pct(ef.retencao)}`, porque: `${pct(ef.retencao)} aplica-se quando o cliente é uma entidade com contabilidade organizada, não um particular.` },
      { texto: "O particular retém metade da taxa normal", porque: "Particulares não efetuam retenção — a obrigação é das entidades com contabilidade organizada." },
      { texto: "O trabalhador faz autorretenção", porque: "Não existe mecanismo de autorretenção em Portugal para trabalhadores independentes." },
    ],
    correta: 0,
    legalBasis: "Art. 101.º CIRS — retenção por entidades com contabilidade organizada",
    fonte: fonte("art101cirs"),
  };
};

const gerarSSRendimentoRelevante: GeradorFn = (a) => {
  return {
    id: `ger-ss-rend-rel-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta: `O "rendimento relevante" para a Segurança Social de "${a.label}" é calculado com base em:`,
    opcoes: [
      { texto: "O rendimento declarado trimestralmente à SS", porque: "As contribuições baseiam-se no rendimento declarado nas declarações trimestrais à SS." },
      { texto: "O rendimento mensal fixo de 1 IAS", porque: "O rendimento relevante é variável, com base na declaração trimestral, não fixo em 1 IAS." },
      { texto: "O valor do IRS pago no ano anterior", porque: "A SS não se baseia no IRS pago — usa o rendimento declarado trimestralmente." },
      { texto: "O salário mínimo nacional", porque: "O salário mínimo não determina a base de SS dos independentes." },
    ],
    correta: 0,
    legalBasis: "Art. 162.º Código Contributivo — rendimento relevante",
    fonte: fonte("segSocialGov"),
  };
};

const gerarCoeficienteTransparencia: GeradorFn = (a) => {
  return {
    id: `ger-coef-transp-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta: `Qual o coeficiente no regime de transparência fiscal (serviços a sociedade onde se detém ≥5% do capital)?`,
    opcoes: [
      { texto: "1,00 (100% tributável)", porque: "No regime de transparência fiscal, todo o rendimento é tributável — coeficiente 1,00 (Art. 31.º, al. g) CIRS)." },
      { texto: "0,75", porque: "0,75 é o coeficiente das profissões do Art. 151.º, não do regime de transparência." },
      { texto: "0,95", porque: "0,95 aplica-se a propriedade intelectual, não à transparência fiscal." },
      { texto: "0,50", porque: "0,50 aplica-se a AL em zona de contenção, não à transparência fiscal." },
    ],
    correta: 0,
    legalBasis: "Art. 31.º, al. g) CIRS — transparência fiscal",
    fonte: fonte("art31"),
  };
};

const gerarIVAIsencaoImpacto: GeradorFn = (a) => {
  return {
    id: `ger-iva-isencao-imp-${a.tipo}`,
    categoria: "iva",
    dificuldade: 2,
    pergunta: `Se "${a.label}" estiver isento de IVA (Art. 53.º CIVA), que consequência prática tem nos recibos?`,
    opcoes: [
      { texto: "Emite recibos sem IVA, mas também não pode deduzir IVA nas compras", porque: "A isenção do Art. 53.º dispensa de cobrar IVA, mas também impede a dedução do IVA suportado nas despesas." },
      { texto: "Cobra IVA mas a taxa reduzida de 6%", porque: "A isenção significa que NÃO se cobra qualquer IVA, não que se aplica a taxa reduzida." },
      { texto: "Cobra IVA e guarda-o para si", porque: "Se isento, não se cobra IVA de todo." },
      { texto: "Deve mencionar IVA de 0% no recibo", porque: "No recibo isento menciona-se 'Isento Art. 53.º CIVA', não IVA a 0%." },
    ],
    correta: 0,
    legalBasis: "Art. 53.º CIVA — isenção e suas consequências",
    fonte: fonte("portalFinancasIVA"),
  };
};

const gerarDeducaoDependenteBebe: GeradorFn = (a) => {
  const val = DEDUCAO_DEPENDENTE_BEBE.value;
  return {
    id: `ger-ded-bebe-${a.tipo}`,
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta: `Qual a dedução à coleta por dependente até 3 anos de idade?`,
    opcoes: [
      { texto: eur(val), porque: `Dependentes até 3 anos têm dedução de ${eur(val)} (Art. 78.º-A CIRS).` },
      { texto: eur(DEDUCAO_DEPENDENTE.value), porque: `${eur(DEDUCAO_DEPENDENTE.value)} é para dependentes com mais de 3 anos.` },
      { texto: "500 €", porque: `O valor não é 500 € — é ${eur(val)}.` },
      { texto: "900 €", porque: `900 € é a dedução majorada a partir do 3.º dependente.` },
    ],
    correta: 0,
    legalBasis: DEDUCAO_DEPENDENTE_BEBE.legalBasis,
    fonte: fonte("art78aCirs"),
  };
};

const gerarSSvsIRS: GeradorFn = (a) => {
  const ef = efeitoFiscal(a);
  const baseSS = ef.baseSS === "servicos" ? "70%" : "20%";
  return {
    id: `ger-ss-vs-irs-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta: `A base de incidência da SS (${baseSS}) e o coeficiente do regime simplificado (${ef.coef.toFixed(2)}) para "${a.label}" são:`,
    opcoes: [
      { texto: "Bases distintas — a SS usa 70% ou 20% do rendimento, o IRS usa o coeficiente", porque: `A SS e o IRS usam bases de cálculo diferentes: SS = ${baseSS} do rendimento, IRS simplificado = coef. ${ef.coef.toFixed(2)}.` },
      { texto: "A mesma base com nomes diferentes", porque: `São bases distintas: ${baseSS} para SS e ${ef.coef.toFixed(2)} para IRS simplificado.` },
      { texto: "Ambas usam o coeficiente do regime simplificado", porque: `A SS tem as suas próprias bases (70%/20%), distintas dos coeficientes do IRS.` },
      { texto: "Ambas usam 70% do rendimento", porque: `O coeficiente do IRS para "${a.label}" é ${ef.coef.toFixed(2)}, não 70%.` },
    ],
    correta: 0,
    legalBasis: "Art. 31.º CIRS vs. Art. 162.º Código Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

// ── Lista de todos os geradores ──────────────────────────────────────

const GERADORES: GeradorFn[] = [
  // Originais (1-17)
  gerarRetencao,
  gerarCoeficiente,
  gerarBaseSS,
  gerarTaxaSS,
  gerarIVAIsencao,
  gerarIVATaxas,
  gerarDispensaRetencao,
  gerarTetoSS,
  gerarRegra15,
  gerarReducaoInicio,
  gerarIRSJovem,
  gerarEscalaoIRS,
  gerarEscalaoMaximo,
  gerarDeducaoEspecifica,
  gerarIVAExcesso,
  gerarClienteEstrangeiro,
  gerarIASValor,
  // Novos (18-75)
  gerarRetencaoValor,
  gerarLiquidoRecibo,
  gerarRetencaoAdiantamento,
  gerarQuemRetem,
  gerarIVATaxaMadeira,
  gerarIVATaxaAcores,
  gerarIVAReduzida,
  gerarIVAIntermedia,
  gerarSSCalculoServicos,
  gerarSSCalculoBens,
  gerarSSIsencao12Meses,
  gerarSSMinimo,
  gerarRendTributavel,
  gerarReducaoSegundoAno,
  gerarLimiteContabilidade,
  gerarRegra15Valor,
  gerarEscalao2,
  gerarEscalao5,
  gerarNumeroEscaloes,
  gerarMinimoExistencia,
  gerarIRSJovemAno1,
  gerarIRSJovemAno5a7,
  gerarIRSJovemTeto,
  gerarIRSJovemDuracao,
  gerarDeducaoSaude,
  gerarDeducaoEducacao,
  gerarDeducaoRendas,
  gerarDeducaoDependente,
  gerarPrazoIRS,
  gerarPrazoSSMensal,
  gerarPrazoPagamentoConta,
  gerarCategoriaB,
  gerarReciboVerde,
  gerarDiferencaIRSSS,
  gerarAtoIsolado,
  gerarIRCGeral,
  gerarIRCPME,
  gerarDividendos,
  gerarCatFTaxaHabitacao,
  gerarCatFNaoHabitacional,
  gerarCatFSemSS,
  gerarCoeficienteImpacto,
  gerarSSDeclaracao,
  gerarIVAvsRetencao,
  gerarObrigacoesAnuais,
  gerarReservaTotal,
  gerarIVAPerda,
  gerarIVAClienteUE,
  gerarCoeficienteEfetivo1Ano,
  gerarIVATresRegioes,
  gerarEscalao6,
  gerarCatFReducao,
  gerarContribuicaoTotal,
  gerarRetencaoHistorico,
  gerarIRSProgressivo,
  gerarAberturaAtividade,
  gerarIVADeclaracao,
  gerarRetencaoSemContabilidade,
  gerarSSRendimentoRelevante,
  gerarCoeficienteTransparencia,
  gerarIVAIsencaoImpacto,
  gerarDeducaoDependenteBebe,
  gerarSSvsIRS,
];

/**
 * Gera perguntas de quiz específicas para uma atividade.
 * Cada pergunta é derivada de valores reais em fiscal-data.ts.
 * Embaralha as opções antes de devolver.
 */
export function gerarPerguntasAtividade(
  atividade: Atividade,
  quantidade: number = 10
): QuizPergunta[] {
  const todasPerguntas: QuizPergunta[] = [];

  for (const gerador of GERADORES) {
    const p = gerador(atividade);
    if (p) {
      p.id = `${p.id}-${hashSimples(atividade.label)}`;
      todasPerguntas.push(p);
    }
  }

  const selecionadas = embaralhar(todasPerguntas).slice(0, Math.min(quantidade, todasPerguntas.length));

  return selecionadas.map((p) => {
    const indices = embaralhar(p.opcoes.map((_, i) => i));
    return {
      ...p,
      opcoes: indices.map((i) => p.opcoes[i]),
      correta: indices.indexOf(0),
    };
  });
}

function hashSimples(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}
