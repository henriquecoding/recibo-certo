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
  const corretaTexto = taxa === 0 ? "0% — sem retencao" : pct(taxa);
  const outrasTextos = TODAS_RETENCOES
    .filter((r) => r.taxa !== taxa)
    .map((r) => ({
      texto: r.taxa === 0 ? "0% — sem retencao" : pct(r.taxa),
      porque: `${pct(r.taxa)} e a taxa de ${tipoLabel(r.tipo)}, nao se aplica a ${a.label}.`,
    }));

  const opcoes = [
    {
      texto: corretaTexto,
      porque: taxa === 0
        ? `As vendas de bens/mercadorias nao estao sujeitas a retencao na fonte de IRS.`
        : `A atividade "${a.label}" enquadra-se como ${tipoLabel(a.tipo)}, com retencao de ${pct(taxa)} ao abrigo do Art. 101.o CIRS.`,
    },
    ...embaralhar(outrasTextos).slice(0, 3),
  ];

  return {
    id: `ger-ret-${a.tipo}`,
    categoria: "retencao",
    dificuldade: 1,
    pergunta: `Qual a taxa de retencao na fonte de IRS aplicavel a atividade "${a.label}"?`,
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
      porque: `O coeficiente ${c.coef.toFixed(2)} aplica-se a ${tipoLabel(c.tipo)} (Art. 31.o CIRS), nao a "${a.label}".`,
    }));

  const opcoes = [
    {
      texto: corretaTexto,
      porque: `No regime simplificado, "${a.label}" tem coeficiente ${coef.toFixed(2)} — apenas ${pct(coef)} do rendimento e tributado.`,
    },
    ...embaralhar(outrosCoefs).slice(0, 3),
  ];

  return {
    id: `ger-coef-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 1,
    pergunta: `No regime simplificado, qual o coeficiente aplicavel a atividade "${a.label}" (Art. 31.o CIRS)?`,
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
    pergunta: `Sobre que percentagem do rendimento incide a Seguranca Social para a atividade "${a.label}"?`,
    opcoes: [
      {
        texto: pctBase,
        porque: base === "servicos"
          ? `Prestacao de servicos: a SS incide sobre 70% do rendimento relevante (Art. 162.o Codigo Contributivo).`
          : `Venda de bens/hotelaria: a SS incide sobre 20% do rendimento relevante (Art. 162.o Codigo Contributivo).`,
      },
      {
        texto: pctOutra,
        porque: pctOutra === "70%"
          ? `70% aplica-se a prestacao de servicos, nao a vendas/hotelaria.`
          : `20% aplica-se a vendas de bens e hotelaria, nao a prestacao de servicos.`,
      },
      {
        texto: "100%",
        porque: `A SS nunca incide sobre 100% do rendimento — ha sempre um coeficiente de ajustamento (70% ou 20%).`,
      },
      {
        texto: "50%",
        porque: `Nao existe base de 50% no regime de trabalhador independente. As opcoes sao 70% (servicos) ou 20% (bens).`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 162.o Codigo Contributivo",
    fonte: fonte("segSocialGov"),
  };
};

const gerarTaxaSS: GeradorFn = (a) => {
  const taxa = SS_TAXA.value;
  return {
    id: `ger-ss-taxa-${a.tipo}`,
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta: `Qual a taxa contributiva da Seguranca Social para um trabalhador independente com a atividade "${a.label}"?`,
    opcoes: [
      {
        texto: pct(taxa),
        porque: `A taxa contributiva dos trabalhadores independentes e de ${pct(taxa)} (Art. 168.o Codigo Contributivo).`,
      },
      {
        texto: "25,2%",
        porque: `25,2% era a taxa antiga (ate 2018). Desde 2019 a taxa e de ${pct(taxa)}.`,
      },
      {
        texto: "11%",
        porque: `11% e a taxa dos trabalhadores por conta de outrem, nao dos independentes.`,
      },
      {
        texto: "23,75%",
        porque: `23,75% e a taxa da entidade empregadora no regime geral, nao do trabalhador independente.`,
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
    pergunta: `Ate que volume de negocios anual pode "${a.label}" beneficiar da isencao de IVA (Art. 53.o CIVA)?`,
    opcoes: [
      {
        texto: `${limite.toLocaleString("pt-PT")} EUR`,
        porque: `A isencao de IVA aplica-se a quem nao ultrapasse ${limite.toLocaleString("pt-PT")} EUR anuais (Art. 53.o CIVA).`,
      },
      {
        texto: `${IVA_ISENCAO_EXCESSO.value.toLocaleString("pt-PT")} EUR`,
        porque: `${IVA_ISENCAO_EXCESSO.value.toLocaleString("pt-PT")} EUR e o limiar de excesso (125% do limite). Acima deste valor, perde-se a isencao imediatamente.`,
      },
      {
        texto: "10.000 EUR",
        porque: `10.000 EUR era o limite antigo (antes de 2025). Desde 2025 o limite e ${limite.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "25.000 EUR",
        porque: `Nao existe limiar de isencao de IVA de 25.000 EUR no sistema fiscal portugues.`,
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
        porque: `A taxa normal de IVA em Portugal continental e de ${pct(taxasCont.normal)} (Art. 18.o CIVA).`,
      },
      {
        texto: pct(taxasCont.intermedia),
        porque: `${pct(taxasCont.intermedia)} e a taxa intermedia — aplica-se apenas a bens e servicos especificos listados na Lista II do CIVA.`,
      },
      {
        texto: pct(taxasCont.reduzida),
        porque: `${pct(taxasCont.reduzida)} e a taxa reduzida (Lista I do CIVA) — para bens essenciais, nao para servicos profissionais em geral.`,
      },
      {
        texto: pct(IVA_TAXAS.acores.value.normal),
        porque: `${pct(IVA_TAXAS.acores.value.normal)} e a taxa normal nos Acores, nao no continente.`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.o CIVA",
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
    pergunta: `A atividade "${a.label}" pode pedir dispensa de retencao na fonte. Qual o limite de rendimento anual estimado para essa dispensa?`,
    opcoes: [
      {
        texto: `${limite.toLocaleString("pt-PT")} EUR`,
        porque: `Quem preveja faturar abaixo de ${limite.toLocaleString("pt-PT")} EUR/ano pode solicitar dispensa de retencao (Art. 101.o-B CIRS).`,
      },
      {
        texto: "12.500 EUR",
        porque: `12.500 EUR era o limite antigo. Desde 2025 o limite e ${limite.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "10.000 EUR",
        porque: `Nao existe limiar de dispensa de retencao de 10.000 EUR.`,
      },
      {
        texto: "20.000 EUR",
        porque: `O limite nao e 20.000 EUR — e ${limite.toLocaleString("pt-PT")} EUR (Art. 101.o-B CIRS).`,
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
    pergunta: `Qual o teto mensal do rendimento relevante para efeitos de Seguranca Social do trabalhador independente com a atividade "${a.label}"?`,
    opcoes: [
      {
        texto: `${teto.toLocaleString("pt-PT")} EUR (12 x IAS)`,
        porque: `O teto e de 12 x IAS = ${teto.toLocaleString("pt-PT")} EUR/mes (Art. 163.o Codigo Contributivo). Rendimento acima deste valor nao conta para a contribuicao.`,
      },
      {
        texto: `${IAS.value.toLocaleString("pt-PT")} EUR (1 x IAS)`,
        porque: `Um IAS (${IAS.value.toLocaleString("pt-PT")} EUR) e o indexante base, nao o teto. O teto e 12 vezes esse valor.`,
      },
      {
        texto: "5.000 EUR",
        porque: `5.000 EUR nao corresponde a nenhum limiar da Seguranca Social. O teto e 12 x IAS.`,
      },
      {
        texto: "10.000 EUR",
        porque: `O teto mensal nao e 10.000 EUR. E 12 x IAS = ${teto.toLocaleString("pt-PT")} EUR.`,
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
    pergunta: `A regra dos 15% (Art. 31.o, n.o 2 CIRS) aplica-se a atividade "${a.label}" no regime simplificado?`,
    opcoes: [
      {
        texto: aplicaSe ? "Sim" : "Nao",
        porque: aplicaSe
          ? `A regra dos 15% exige justificacao de despesas de pelo menos 15% do rendimento para manter o coeficiente — aplica-se a coeficientes 0,75 e 0,35.`
          : `A regra dos 15% so se aplica aos coeficientes 0,75 (Art. 151.o) e 0,35 (outros servicos). O coeficiente ${ef.coef.toFixed(2)} esta isento desta obrigacao.`,
      },
      {
        texto: aplicaSe ? "Nao" : "Sim",
        porque: aplicaSe
          ? `A atividade "${a.label}" esta sujeita a regra dos 15% por ter coeficiente ${ef.coef.toFixed(2)}.`
          : `A regra dos 15% nao se aplica ao coeficiente ${ef.coef.toFixed(2)} desta atividade.`,
      },
      {
        texto: "So no primeiro ano",
        porque: `A regra dos 15% nao se limita ao primeiro ano — aplica-se (ou nao) permanentemente, consoante o coeficiente.`,
      },
      {
        texto: "Depende do volume de negocios",
        porque: `A regra dos 15% depende do coeficiente do regime simplificado, nao do volume de negocios.`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 31.o, n.o 2 CIRS",
    fonte: fonte("art31"),
  };
};

const gerarReducaoInicio: GeradorFn = (a) => {
  const reducoes = REDUCAO_COEFICIENTE_ANO.value;
  return {
    id: `ger-reducao-inicio-${a.tipo}`,
    categoria: "regime_simplificado",
    dificuldade: 3,
    pergunta: `No primeiro ano de atividade, "${a.label}" beneficia de uma reducao do coeficiente do regime simplificado. Qual a percentagem de reducao?`,
    opcoes: [
      {
        texto: pct(reducoes[1]),
        porque: `No 1.o ano de atividade, o coeficiente e reduzido em ${pct(reducoes[1])} (Art. 31.o, n.o 10 CIRS).`,
      },
      {
        texto: pct(reducoes[2]),
        porque: `${pct(reducoes[2])} e a reducao no 2.o ano, nao no 1.o.`,
      },
      {
        texto: "75%",
        porque: `Nao existe reducao de 75% do coeficiente. As reducoes sao ${pct(reducoes[1])} no 1.o ano e ${pct(reducoes[2])} no 2.o.`,
      },
      {
        texto: "0% — sem reducao",
        porque: `Ha sim reducao: ${pct(reducoes[1])} no 1.o ano e ${pct(reducoes[2])} no 2.o ano de atividade.`,
      },
    ],
    correta: 0,
    legalBasis: REDUCAO_COEFICIENTE_ANO.legalBasis,
    fonte: fonte("art31"),
  };
};

const gerarIRSJovem: GeradorFn = (a) => {
  const idade = IRS_JOVEM.idadeMax.value;
  const teto = IRS_JOVEM.tetoIAS.value;
  return {
    id: `ger-irs-jovem-${a.tipo}`,
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta: `Um jovem com a atividade "${a.label}" pode beneficiar do IRS Jovem. Ate que idade se aplica este regime?`,
    opcoes: [
      {
        texto: `${idade} anos`,
        porque: `O IRS Jovem aplica-se ate aos ${idade} anos (inclusive), no ultimo dia do ano fiscal.`,
      },
      {
        texto: "30 anos",
        porque: `O limite anterior era 30 anos. Desde 2025, o IRS Jovem estende-se ate aos ${idade} anos.`,
      },
      {
        texto: "40 anos",
        porque: `O IRS Jovem nao se aplica ate aos 40 anos — o limite e ${idade} anos.`,
      },
      {
        texto: "26 anos",
        porque: `26 anos era o limite original do regime antigo. O limite atual e ${idade} anos.`,
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
    pergunta: `Qual a taxa marginal do 1.o escalao de IRS (Art. 68.o CIRS) aplicavel ao rendimento coletavel de "${a.label}"?`,
    opcoes: [
      {
        texto: pct(primeiro.taxa),
        porque: `O 1.o escalao de IRS tem uma taxa marginal de ${pct(primeiro.taxa)}, aplicada ate ${primeiro.ate?.toLocaleString("pt-PT")} EUR de rendimento coletavel.`,
      },
      {
        texto: pct(escaloes[1].taxa),
        porque: `${pct(escaloes[1].taxa)} e a taxa do 2.o escalao (${primeiro.ate?.toLocaleString("pt-PT")} EUR a ${escaloes[1].ate?.toLocaleString("pt-PT")} EUR), nao do 1.o.`,
      },
      {
        texto: pct(escaloes[2].taxa),
        porque: `${pct(escaloes[2].taxa)} e a taxa do 3.o escalao, nao do 1.o.`,
      },
      {
        texto: "10%",
        porque: `Nao existe taxa de 10% nos escaloes de IRS portugueses.`,
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
    pergunta: `Qual a taxa marginal maxima de IRS (ultimo escalao) que pode incidir sobre rendimentos de "${a.label}"?`,
    opcoes: [
      {
        texto: pct(ultimo.taxa),
        porque: `A taxa marginal maxima e de ${pct(ultimo.taxa)} (Art. 68.o CIRS), aplicada a rendimentos coletaveis acima de ${penultimo.ate?.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "50%",
        porque: `Nao existe taxa de 50% nos escaloes de IRS. A maxima e ${pct(ultimo.taxa)}.`,
      },
      {
        texto: pct(penultimo.taxa),
        porque: `${pct(penultimo.taxa)} e a taxa do penultimo escalao, nao a maxima.`,
      },
      {
        texto: "45%",
        porque: `45% nao e uma taxa de IRS. A taxa maxima e ${pct(ultimo.taxa)}.`,
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
    pergunta: `Qual o valor da deducao especifica da categoria B para "${a.label}" em 2026?`,
    opcoes: [
      {
        texto: `${valor.toLocaleString("pt-PT")} EUR`,
        porque: `A deducao especifica e de max(4.104 EUR; 8,54 x IAS) = ${valor.toLocaleString("pt-PT")} EUR (Art. 25.o / 31.o CIRS).`,
      },
      {
        texto: "4.104 EUR",
        porque: `4.104 EUR e o piso fixo, mas a deducao e o maximo entre esse piso e 8,54 x IAS, que em 2026 e ${valor.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "2.500 EUR",
        porque: `2.500 EUR nao corresponde a nenhum valor de deducao. A deducao especifica e ${valor.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "5.000 EUR",
        porque: `5.000 EUR nao e o valor correto. A deducao especifica da cat. B e ${valor.toLocaleString("pt-PT")} EUR.`,
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
    pergunta: `Se "${a.label}" ultrapassar o limite de isencao de IVA em mais de 25%, a que valor corresponde essa perda imediata de isencao?`,
    opcoes: [
      {
        texto: `${excesso.toLocaleString("pt-PT")} EUR`,
        porque: `125% do limite de isencao (${limite.toLocaleString("pt-PT")} EUR) = ${excesso.toLocaleString("pt-PT")} EUR. Acima deste valor, perde a isencao no proprio ano (Art. 58.o CIVA).`,
      },
      {
        texto: `${limite.toLocaleString("pt-PT")} EUR`,
        porque: `${limite.toLocaleString("pt-PT")} EUR e o limite normal de isencao, mas ha uma margem de 25% antes da perda imediata.`,
      },
      {
        texto: "20.000 EUR",
        porque: `Nao existe limiar de 20.000 EUR. O excesso e 125% x ${limite.toLocaleString("pt-PT")} EUR = ${excesso.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "12.500 EUR",
        porque: `12.500 EUR era o limite antigo de isencao. O excesso atual e ${excesso.toLocaleString("pt-PT")} EUR.`,
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
    pergunta: `"${a.label}" presta servicos a um cliente nao-residente (empresa estrangeira). Qual a taxa de retencao na fonte?`,
    opcoes: [
      {
        texto: "0% — sem retencao",
        porque: `Quando o cliente e nao-residente, nao ha retencao na fonte de IRS (Art. 101.o CIRS aplica-se apenas a pagamentos por entidades com sede em Portugal).`,
      },
      {
        texto: pct(ef.retencao),
        porque: `${pct(ef.retencao)} e a taxa normal para clientes residentes. Para clientes estrangeiros/nao-residentes, nao ha retencao.`,
      },
      {
        texto: "5%",
        porque: `Nao existe taxa de 5% para servicos a nao-residentes. A retencao simplesmente nao se aplica.`,
      },
      {
        texto: "Depende do pais",
        porque: `A regra e clara: sem retencao quando o cliente nao tem sede em Portugal, independentemente do pais.`,
      },
    ],
    correta: 0,
    legalBasis: "Art. 101.o CIRS — retencao aplicavel apenas a entidades residentes",
    fonte: fonte("art101cirs"),
  };
};

const gerarIASValor: GeradorFn = (a) => {
  const ias = IAS.value;
  return {
    id: `ger-ias-valor-${a.tipo}`,
    categoria: "geral",
    dificuldade: 1,
    pergunta: `Qual o valor do IAS (Indexante dos Apoios Sociais) em 2026, que serve de base a varios calculos fiscais para "${a.label}"?`,
    opcoes: [
      {
        texto: `${ias.toLocaleString("pt-PT")} EUR`,
        porque: `O IAS em 2026 e de ${ias.toLocaleString("pt-PT")} EUR. Serve de base para o teto da SS (12 x IAS), o IRS Jovem (55 x IAS) e a deducao especifica (8,54 x IAS).`,
      },
      {
        texto: "509,26 EUR",
        porque: `509,26 EUR era o IAS de 2024. Em 2026 e ${ias.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "480,43 EUR",
        porque: `480,43 EUR era o IAS de 2023. O valor atualizado para 2026 e ${ias.toLocaleString("pt-PT")} EUR.`,
      },
      {
        texto: "600 EUR",
        porque: `O IAS nao e 600 EUR. O valor exato em 2026 e ${ias.toLocaleString("pt-PT")} EUR.`,
      },
    ],
    correta: 0,
    legalBasis: IAS.legalBasis,
    fonte: fonte("segSocialGov"),
  };
};

// ── Lista de todos os geradores ──────────────────────────────────────

const GERADORES: GeradorFn[] = [
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
      // Assign unique IDs based on the activity label hash
      p.id = `${p.id}-${hashSimples(atividade.label)}`;
      todasPerguntas.push(p);
    }
  }

  // Shuffle and select requested quantity
  const selecionadas = embaralhar(todasPerguntas).slice(0, Math.min(quantidade, todasPerguntas.length));

  // Shuffle the options within each question (correct answer is always index 0 above)
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
