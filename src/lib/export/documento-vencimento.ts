// ─────────────────────────────────────────────────────────────────────
//  Relatório de vencimento — UM modelo, quatro formatos
//  ---------------------------------------------------------------------
//  A verificação mais importante da lista da Parte 10, e a mais fácil de
//  esquecer: «o líquido do PDF, do XLSX e do CSV têm de ser o MESMO número».
//
//  A única forma de o garantir sem o testar em cada sítio é não haver «cada
//  sítio»: os quatro formatos leem deste modelo, que por sua vez lê do motor.
//  Nada aqui calcula fiscalidade — se calculasse, seria uma segunda fonte de
//  verdade, que é exatamente o defeito que a auditoria ao simulador apanhou.
// ─────────────────────────────────────────────────────────────────────

import type { ReciboMensalResult, VencimentoAnualResult } from "@/lib/fiscal-dependente";
import type { PayrollDisplayLine } from "@/lib/payroll-simulator-legacy-adapter";
import type { Proveniencia } from "./referencia";
import { cent, dataExtenso, eur, pctDoc } from "./dinheiro";
import { dinheiro, numero, texto, vazio, type TabelaCSV } from "./csv";
import type { ColunaXLSX, FolhaXLSX, LivroXLSX } from "./xlsx";
import { amplitude, niveisDePrestacao } from "./prestacoes";

export interface PressupostoDoc {
  codigo: string;
  rotulo: string;
  valor: string;
}

export interface BaseLegalDoc {
  norma: string;
  determina: string;
  verificadoEm: string;
}

export interface DocumentoVencimento {
  periodo: string;
  proveniencia: Proveniencia;
  pressupostos: readonly PressupostoDoc[];
  linhas: readonly PayrollDisplayLine[];
  mes: ReciboMensalResult;
  ano: VencimentoAnualResult;
  custoEmpresa: number;
  baseLegal: readonly BaseLegalDoc[];
  /** O que o documento não faz — quatro linhas honestas. */
  ambito: readonly string[];
  /** Memória de cálculo: existe para poder ser contestada. */
  memoria: readonly { rubrica: string; formula: string; valor: number; fonte: string }[];
  /**
   * As catorze prestações do ano, cada uma apurada pelo MOTOR — não derivada
   * dos totais anuais. É a diferença entre um gráfico auditável e um gráfico
   * bonito: repartir um total anual por doze exigiria supor em que mês cai
   * cada subsídio e quantos meses têm refeição, e nenhuma dessas coisas se
   * pode afirmar sem o dizer.
   */
  prestacoes: readonly { rotulo: string; liquido: number; destaque: boolean; nota?: string }[];
}

/** A resposta à pergunta. Tudo o resto no documento é justificação disto. */
export const liquidoDoMes = (doc: DocumentoVencimento): number => cent(doc.mes.liquido);

// ── Tabelas partilhadas ──────────────────────────────────────────────────────

const COLUNAS_RUBRICAS = [
  { codigo: "rubrica", rotulo: "Rubrica", tipo: "texto", largura: 34 },
  { codigo: "bruto_eur", rotulo: "Bruto / caixa", tipo: "dinheiro" },
  { codigo: "base_irs_eur", rotulo: "Base IRS", tipo: "dinheiro" },
  { codigo: "base_ss_eur", rotulo: "Base SS", tipo: "dinheiro" },
  { codigo: "irs_retido_eur", rotulo: "IRS retido", tipo: "dinheiro" },
  { codigo: "ss_trabalhador_eur", rotulo: "SS trabalhador", tipo: "dinheiro" },
  { codigo: "impacto_liquido_eur", rotulo: "Impacto líquido", tipo: "dinheiro" },
] as const satisfies readonly ColunaXLSX[];

const COLUNAS_ANO = [
  { codigo: "rubrica", rotulo: "Rubrica", tipo: "texto", largura: 34 },
  { codigo: "valor_eur", rotulo: "Valor", tipo: "dinheiro" },
] as const satisfies readonly ColunaXLSX[];

/**
 * As taxas efetivas de CADA remuneração paga no mês, em separado.
 *
 * O n.º 10 do Despacho 233-A/2026 impõe esta apresentação à entidade pagadora
 * sempre que o pagamento inclui mais do que uma remuneração. Um relatório que
 * serve para conferir o recibo tem de mostrar as mesmas taxas que o recibo é
 * obrigado a mostrar — uma taxa média não é comparável com nenhuma delas.
 */
const COLUNAS_TAXAS_EFETIVAS = [
  { codigo: "remuneracao", rotulo: "Remuneração", tipo: "texto", largura: 26 },
  { codigo: "base_eur", rotulo: "Base", tipo: "dinheiro" },
  { codigo: "retencao_eur", rotulo: "Retenção", tipo: "dinheiro" },
  { codigo: "taxa_efetiva", rotulo: "Taxa efetiva", tipo: "percentagem" },
  { codigo: "fonte", rotulo: "Base legal", tipo: "texto", largura: 30 },
] as const satisfies readonly ColunaXLSX[];

const COLUNAS_MEMORIA = [
  { codigo: "rubrica", rotulo: "Rubrica", tipo: "texto", largura: 30 },
  { codigo: "formula", rotulo: "Como se chega ao valor", tipo: "texto", largura: 52 },
  { codigo: "valor_eur", rotulo: "Valor", tipo: "dinheiro" },
  { codigo: "fonte", rotulo: "Base legal", tipo: "texto", largura: 26 },
] as const satisfies readonly ColunaXLSX[];

/** Linhas do mês, na ordem em que aparecem no documento. */
function linhasRubricas(doc: DocumentoVencimento) {
  return doc.linhas.map((linha) => [
    linha.label,
    cent(linha.amount),
    cent(linha.irsBase),
    cent(linha.socialSecurityBase),
    cent(linha.irsWithheld),
    cent(linha.employeeSocialSecurity),
    cent(linha.netImpact),
  ]);
}

function linhasTaxasEfetivas(doc: DocumentoVencimento) {
  return doc.mes.taxasEfetivasRetencao.map((linha) => [
    linha.rotulo,
    cent(linha.base),
    cent(linha.retencao),
    linha.taxa,
    linha.fonte,
  ]);
}

function linhasAno(doc: DocumentoVencimento) {
  const a = doc.ano;
  const linhas: [string, number][] = [
    ["Salário base × 14 (12 meses + férias + Natal)", a.brutoAnual],
    ["Subsídio de refeição no ano", a.subsidioRefeicaoAnual],
    ["Parte do subsídio acima do limite (tributada)", a.subsidioRefeicaoTributadoAnual],
    ["Base de incidência da Segurança Social", a.baseSSAnual],
    ["IRS sobre salários (12×)", -a.irsSalario],
    ["IRS sobre o subsídio de férias", -a.irsFerias],
    ["IRS sobre o subsídio de Natal", -a.irsNatal],
    ["Segurança Social do ano", -a.ssAnual],
    ["Líquido anual", a.liquidoAnual],
    ["Líquido médio por mês", a.liquidoMedioMes],
  ];
  return linhas.map(([rubrica, valor]) => [rubrica, cent(valor)]);
}

// ── CSV ──────────────────────────────────────────────────────────────────────

/** As tabelas do documento, cada uma no seu ficheiro. */
export function tabelasCSV(doc: DocumentoVencimento): { variante: string; nome: string; tabela: TabelaCSV }[] {
  return [
    {
      variante: "rubricas",
      nome: "Mês — rubricas",
      tabela: {
        colunas: COLUNAS_RUBRICAS.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
        linhas: [
          ...linhasRubricas(doc).map((linha) => [
            texto(String(linha[0])),
            ...linha.slice(1).map((valor) => dinheiro(Number(valor))),
          ]),
          [
            texto("TOTAL"),
            dinheiro(doc.mes.brutoTotal),
            dinheiro(doc.mes.brutoTotal - doc.mes.ajudasIsentas - doc.mes.subsidioRefeicaoIsento),
            dinheiro(doc.mes.baseSS),
            dinheiro(doc.mes.irsTotal),
            dinheiro(doc.mes.ssTrabalhador),
            dinheiro(doc.mes.liquido),
          ],
        ],
      },
    },
    {
      variante: "taxas-efetivas",
      nome: "Mês — taxa efetiva de cada remuneração",
      tabela: {
        colunas: COLUNAS_TAXAS_EFETIVAS.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
        linhas: doc.mes.taxasEfetivasRetencao.map((linha) => [
          texto(linha.rotulo),
          dinheiro(linha.base),
          dinheiro(linha.retencao),
          texto(pctDoc(linha.taxa)),
          texto(linha.fonte),
        ]),
      },
    },
    {
      variante: "ano",
      nome: "Ano — decomposição",
      tabela: {
        colunas: COLUNAS_ANO.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
        linhas: linhasAno(doc).map((linha) => [texto(String(linha[0])), dinheiro(Number(linha[1]))]),
      },
    },
    {
      variante: "prestacoes",
      nome: "Ano — as 14 prestações",
      tabela: {
        colunas: [
          { codigo: "prestacao", rotulo: "Prestação" },
          { codigo: "liquido_eur", rotulo: "Líquido" },
          { codigo: "nota", rotulo: "Nota" },
        ],
        linhas: doc.prestacoes.map((p) => [texto(p.rotulo), dinheiro(p.liquido), texto(p.nota ?? "")]),
      },
    },
    {
      variante: "memoria",
      nome: "Memória de cálculo",
      tabela: {
        colunas: COLUNAS_MEMORIA.map(({ codigo, rotulo }) => ({ codigo, rotulo })),
        linhas: doc.memoria.map((m) => [texto(m.rubrica), texto(m.formula), dinheiro(m.valor), texto(m.fonte)]),
      },
    },
    {
      variante: "pressupostos",
      nome: "Pressupostos",
      tabela: {
        colunas: [
          { codigo: "pressuposto", rotulo: "Pressuposto" },
          { codigo: "valor", rotulo: "Valor" },
        ],
        linhas: doc.pressupostos.map((p) => [texto(p.codigo), texto(p.valor)]),
      },
    },
  ];
}

// ── XLSX ─────────────────────────────────────────────────────────────────────

export function livroXLSX(doc: DocumentoVencimento): LivroXLSX {
  const folhas: FolhaXLSX[] = [
    {
      nome: "Mês — rubricas",
      colunas: COLUNAS_RUBRICAS,
      linhas: linhasRubricas(doc),
      totais: ["bruto_eur", "base_irs_eur", "base_ss_eur", "irs_retido_eur", "ss_trabalhador_eur", "impacto_liquido_eur"],
      nota: "O total é uma fórmula SUBTOTAL: ao filtrar linhas, ele acompanha o filtro em vez de mentir.",
    },
    {
      nome: "Mês — taxa efetiva",
      colunas: COLUNAS_TAXAS_EFETIVAS,
      linhas: linhasTaxasEfetivas(doc),
      nota: "Com mais do que uma remuneração no mesmo pagamento, a entidade tem de apresentar a taxa de cada uma em separado (Despacho 233-A/2026, n.º 10).",
    },
    { nome: "Ano — decomposição", colunas: COLUNAS_ANO, linhas: linhasAno(doc) },
    {
      nome: "Ano — as 14 prestações",
      colunas: [
        { codigo: "prestacao", rotulo: "Prestação", tipo: "texto", largura: 16 },
        { codigo: "liquido_eur", rotulo: "Líquido", tipo: "dinheiro" },
        { codigo: "nota", rotulo: "Nota", tipo: "texto", largura: 30 },
      ],
      linhas: doc.prestacoes.map((p) => [p.rotulo, cent(p.liquido), p.nota ?? ""]),
      totais: ["liquido_eur"],
      nota: "O mês de cada subsídio depende da entidade empregadora — por isso aparecem no fim, identificados, e não num mês inventado.",
    },
    {
      nome: "Memória de cálculo",
      colunas: COLUNAS_MEMORIA,
      linhas: doc.memoria.map((m) => [m.rubrica, m.formula, cent(m.valor), m.fonte]),
    },
    {
      nome: "Pressupostos",
      colunas: [
        { codigo: "pressuposto", rotulo: "Pressuposto", tipo: "texto", largura: 38 },
        { codigo: "valor", rotulo: "Valor", tipo: "texto", largura: 40 },
      ],
      linhas: doc.pressupostos.map((p) => [p.rotulo, p.valor]),
      nota: "Um relatório sem os seus pressupostos não é verificável, e não verificável é não confiável.",
    },
  ];

  return {
    titulo: `Relatório de vencimento · ${doc.periodo}`,
    assunto: "Decomposição do vencimento mensal e anual — IRS, Segurança Social e custo para a empresa",
    folhas,
    proveniencia: doc.proveniencia,
    baseLegal: doc.baseLegal,
    ambito: doc.ambito,
  };
}

// ── Dados para o compositor tipográfico ──────────────────────────────────────

/**
 * O JSON que o template Typst consome. O template NÃO calcula nada: recebe
 * números já apurados. É essa regra que torna o documento auditável — se o
 * template pudesse calcular, passava a haver duas respostas para a mesma
 * pergunta e nenhuma forma de saber qual delas está impressa.
 */
export function dadosTypst(doc: DocumentoVencimento) {
  return {
    periodo: doc.periodo,
    // A data de emissão vai composta em português: «2026-08-01T12:00:00.000Z»
    // é a forma de a guardar, não a de a ler.
    proveniencia: { ...doc.proveniencia, emitidoEm: dataExtenso(doc.proveniencia.emitidoEm) },
    resposta: {
      rotulo: "Líquido deste mês",
      valor: liquidoDoMes(doc),
      // Formatado aqui e não no template: o template não formata dinheiro,
      // recebe-o composto — é a mesma regra que o impede de calcular.
      contexto: `de ${eur(doc.mes.brutoTotal)} de remunerações e abonos`,
    },
    totais: {
      bruto: cent(doc.mes.brutoTotal),
      irs: cent(doc.mes.irsTotal),
      ss: cent(doc.mes.ssTrabalhador),
      liquido: cent(doc.mes.liquido),
      baseSS: cent(doc.mes.baseSS),
      taxaEfetiva: doc.mes.taxaEfetiva,
      custoEmpresa: cent(doc.custoEmpresa),
      seguroAcidentes: cent(doc.mes.seguroAcidentesEstimado),
    },
    pressupostos: doc.pressupostos.map((p) => ({ rotulo: p.rotulo, valor: p.valor })),
    rubricas: doc.linhas.map((linha) => ({
      rubrica: linha.label,
      detalhe: linha.detail ?? "",
      fonte: linha.source,
      tratamento: linha.treatment,
      bruto: cent(linha.amount),
      baseIRS: cent(linha.irsBase),
      baseSS: cent(linha.socialSecurityBase),
      irs: cent(linha.irsWithheld),
      ss: cent(linha.employeeSocialSecurity),
      liquido: cent(linha.netImpact),
    })),
    ano: {
      bruto: cent(doc.ano.brutoAnual),
      refeicao: cent(doc.ano.subsidioRefeicaoAnual),
      refeicaoTributada: cent(doc.ano.subsidioRefeicaoTributadoAnual),
      irs: cent(doc.ano.irsAnual),
      ss: cent(doc.ano.ssAnual),
      liquido: cent(doc.ano.liquidoAnual),
      liquidoMedioMes: cent(doc.ano.liquidoMedioMes),
    },
    taxasEfetivas: doc.mes.taxasEfetivasRetencao.map((linha) => ({
      rotulo: linha.rotulo,
      base: cent(linha.base),
      retencao: cent(linha.retencao),
      taxaTexto: pctDoc(linha.taxa),
      fonte: linha.fonte,
    })),
    memoria: doc.memoria.map((m) => ({ ...m, valor: cent(m.valor) })),
    prestacoes: doc.prestacoes.map((p) => ({ ...p, liquido: cent(p.liquido), nota: p.nota ?? "" })),
    // Os níveis são o que o relatório desenha; as prestações ficam para o CSV e
    // para a folha de cálculo, onde catorze linhas são catorze linhas úteis.
    niveis: niveisDePrestacao(doc.prestacoes).map((n) => ({ ...n, nota: n.nota ?? "" })),
    amplitude: (() => {
      const a = amplitude(doc.prestacoes);
      return a
        ? { menor: a.menor.rotulo, maior: a.maior.rotulo, diferenca: a.diferenca, valorMenor: a.menor.liquido, valorMaior: a.maior.liquido }
        : null;
    })(),
    baseLegal: doc.baseLegal,
    ambito: doc.ambito,
  };
}
