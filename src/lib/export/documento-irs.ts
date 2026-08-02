// ─────────────────────────────────────────────────────────────────────
//  Declaração simulada de IRS — o modelo único que alimenta o PDF
//  ---------------------------------------------------------------------
//  É o mais denso dos três documentos, e de propósito. Um recibo de
//  vencimento responde a uma pergunta do mês; uma declaração de IRS responde
//  à do ano inteiro, e quem a lê quer poder CONTESTAR cada passo — foi por
//  isso que a pediu em vez de olhar para o número no ecrã.
//
//  Por isso leva coisas que nenhum outro export tinha:
//
//   · os ESCALÕES um a um (Art. 68.º): quanto rendimento caiu em cada um e
//     quanto imposto pagou. É a diferença entre «a tua taxa é 26,3%» e
//     perceber porque é 26,3% quando o escalão marginal diz 35%;
//   · o LIMITE GLOBAL das deduções (Art. 78.º n.º 7) com a conta à vista:
//     quanto se somou, qual o teto, quanto se perdeu. É o sítio onde as
//     pessoas descobrem que juntar mais faturas já não muda nada;
//   · a dedução específica da categoria A (Art. 25.º) decomposta, incluindo
//     quando foi determinada pelas contribuições e não pelo piso.
//
//  Como nos outros: nenhum número é escrito à mão. Tudo vem de
//  `simularDeclaracaoIRS`.
// ─────────────────────────────────────────────────────────────────────

import type { DeclaracaoResult } from "@/lib/fiscal";
import type { CabecalhoDeclaracao } from "@/lib/export-irs";
import { cent, dataExtenso, eur, pctDoc, pctExatoDoc, regruparMilhares, repartirCentimos } from "./dinheiro";
import type { Proveniencia } from "./referencia";

export interface DocumentoIRS {
  /** O ano a que a declaração respeita, já escrito — «2026». */
  periodo: string;
  proveniencia: Proveniencia;
  resultado: DeclaracaoResult;
  cabecalho?: CabecalhoDeclaracao;
  ambito: string[];
}

/**
 * Uma linha de escalão, com o que o leitor precisa para refazer a conta.
 *
 * O imposto de cada fatia é repartido pelo método do maior resto para que a
 * coluna some EXATAMENTE a coleta que aparece no apuramento. Sem isso, oito
 * escalões arredondados ao cêntimo davam 17 622,53 € contra os 17 622,52 € da
 * linha da coleta — um cêntimo, no mesmo documento, na mesma página.
 */
function escaloes(r: DeclaracaoResult) {
  const lista = r.englobamento.escaloesAplicados;
  const coleta = r.coletaEnglobamento - r.englobamento.adicionalSolidariedade;
  const impostos = repartirCentimos(
    lista.map((e) => e.imposto),
    coleta,
  );
  const rendimentos = repartirCentimos(
    lista.map((e) => e.rendimento),
    r.rendimentoColetavel,
  );
  return lista.map((e, i) => ({
    // `ate: null` é o último escalão — não tem teto, e escrever um seria mentir.
    ate: e.ate === null ? null : cent(e.ate),
    // Uma casa SEMPRE: numa coluna, «48%» ao lado de «44,6%» lê-se como um
    // erro. As taxas do Art. 68.º são publicadas a uma casa decimal, por isso
    // não se perde precisão nenhuma — e um teste prende essa premissa, para o
    // dia em que uma tabela nova traga duas casas.
    taxaTexto: pctDoc(e.taxa),
    taxaExata: pctExatoDoc(e.taxa),
    rendimento: rendimentos[i],
    imposto: impostos[i],
  }));
}

/**
 * O limite global do Art. 78.º n.º 7, com a conta à vista.
 *
 * Devolve `null` quando não houve limitação — mostrar um teto que não mordeu
 * é ruído. Quando mordeu, é das informações mais úteis do documento inteiro:
 * diz exatamente quanto de dedução se perdeu.
 */
function limiteDeducoes(r: DeclaracaoResult) {
  const d = r.englobamento.deducoesDespesasDetalhe;
  if (!d.limitado) return null;
  return {
    somaBruta: cent(d.somaBruta),
    limiteGlobal: cent(d.limiteGlobal),
    dentroDoLimite: cent(d.dentroDoLimite),
    perdido: cent(d.somaBruta - d.dentroDoLimite),
  };
}

/** As rubricas de dedução com valor. As de valor zero não são informação. */
function rubricasDeducao(r: DeclaracaoResult) {
  const e = r.englobamento;
  const d = e.deducoesDespesasDetalhe;
  const linhas: { rubrica: string; valor: number; base: string; foraDoTeto: boolean }[] = [
    { rubrica: "Dependentes", valor: e.deducaoDependentes, base: "Art. 78.º-A", foraDoTeto: true },
    { rubrica: "Ascendentes em comunhão de habitação", valor: e.deducaoAscendentes, base: "Art. 78.º-A", foraDoTeto: true },
    { rubrica: "Despesas gerais familiares", valor: d.gerais, base: "Art. 78.º-B", foraDoTeto: d.geraisForaDoLimite },
    { rubrica: "Despesas de saúde", valor: d.saude, base: "Art. 78.º-C", foraDoTeto: false },
    { rubrica: "Despesas de educação", valor: d.educacao, base: "Art. 78.º-D", foraDoTeto: false },
    { rubrica: "Encargos com imóveis (rendas)", valor: d.rendas, base: "Art. 78.º-E", foraDoTeto: false },
    { rubrica: "Encargos com lares", valor: d.lares, base: "Art. 84.º", foraDoTeto: false },
    { rubrica: "PPR", valor: d.ppr, base: "Art. 21.º EBF", foraDoTeto: false },
    { rubrica: "Donativos", valor: d.donativos, base: "Art. 63.º EBF", foraDoTeto: false },
    { rubrica: "Pensões de alimentos", valor: d.pensaoAlimentos, base: "Art. 83.º-A", foraDoTeto: false },
    { rubrica: "Deficiência do sujeito passivo", valor: e.deducaoDeficiencia, base: "Art. 87.º", foraDoTeto: true },
  ];
  return linhas.filter((l) => l.valor > 0).map((l) => ({ ...l, valor: cent(l.valor) }));
}

/**
 * O caminho do rendimento bruto até ao coletável.
 *
 * Só aparecem os degraus que existem neste caso. Uma linha «IRS Jovem: 0 €»
 * num documento de quem não tem direito ao IRS Jovem é ruído que faz duvidar
 * do resto.
 */
function funil(r: DeclaracaoResult) {
  const e = r.englobamento;
  const passos: { rotulo: string; valor: number; base?: string }[] = [
    { rotulo: "Rendimento global declarado", valor: cent(r.rendimentoGlobal) },
  ];
  const somar = (rotulo: string, valor: number, base?: string) => {
    if (Math.abs(valor) > 0.005) passos.push({ rotulo, valor: cent(-Math.abs(valor)), base });
  };
  // O primeiro degrau, e o maior na maioria dos casos: o rendimento que NÃO
  // vai a englobamento. Sem esta linha o funil saltava de 84 050 € para
  // 58 440 € sem explicar os 25 610 € pelo meio — e um funil com um degrau por
  // explicar é pior do que nenhum.
  somar(
    "Rendimento tributado a taxas próprias, fora do englobamento",
    r.componentes.reduce((s, c) => s + c.bruto - c.englobado, 0),
    "Arts. 71.º-72.º",
  );
  somar("Isenção do IRS Jovem", e.isencaoJovem, "Art. 12.º-B");
  somar("Exclusão do Programa Regressar", e.exclusaoProgramaRegressar, "Art. 12.º-A");
  somar("Exclusão por deficiência", e.exclusaoDeficiencia, "Art. 56.º-A");
  somar("Abatimento do mínimo de existência", e.abatimentoMinimoExistencia, "Art. 70.º");
  return { passos, coletavel: cent(r.rendimentoColetavel) };
}

/** O que o Typst recebe. Tudo já arredondado e escrito em pt-PT. */
export function dadosTypst(doc: DocumentoIRS) {
  const r = doc.resultado;
  const e = r.englobamento;
  const devolve = r.saldo >= 0;
  const pago = cent(r.retencoesTotais + r.pagamentosPorConta);

  const componentes = r.componentes.map((c) => ({
    anexo: c.anexo,
    categoria: c.rotulo,
    bruto: cent(c.bruto),
    englobado: cent(c.englobado),
    autonomo: cent(c.impostoAutonomo),
  }));
  const totalComponentes = {
    bruto: cent(componentes.reduce((s, c) => s + c.bruto, 0)),
    englobado: cent(componentes.reduce((s, c) => s + c.englobado, 0)),
    autonomo: cent(componentes.reduce((s, c) => s + c.autonomo, 0)),
  };

  const linhasEscaloes = escaloes(r);
  const cab = doc.cabecalho;

  return {
    periodo: doc.periodo,
    proveniencia: { ...doc.proveniencia, emitidoEm: dataExtenso(doc.proveniencia.emitidoEm) },

    // ── A capa ────────────────────────────────────────────────────────────
    // O título muda com o sinal do saldo: quem vai receber e quem vai pagar
    // não estão a fazer a mesma pergunta.
    resposta: {
      titulo: devolve ? "O que o Estado te devolve" : "O que ainda falta pagar",
      rotulo: devolve ? "Reembolso estimado" : "Imposto a pagar, estimado",
      valor: cent(Math.abs(r.saldo)),
      contexto: `de ${eur(cent(r.irsTotal))} de IRS apurado, contra ${eur(pago)} já entregues`,
      devolve,
    },
    // A barra compara o que já foi entregue com o imposto apurado — as duas
    // grandezas que produzem o saldo, e as únicas que o leitor pode conferir.
    segmentos: [
      { rotulo: "IRS apurado no ano", valor: cent(r.irsTotal) },
      { rotulo: devolve ? "Entregue a mais" : "Ainda em falta", valor: cent(Math.abs(r.saldo)) },
    ],
    totais: {
      rendimentoGlobal: cent(r.rendimentoGlobal),
      rendimentoColetavel: cent(r.rendimentoColetavel),
      irsTotal: cent(r.irsTotal),
      taxaEfetivaTexto: pctDoc(r.taxaEfetiva),
      // A marginal é a taxa do último escalão tocado. A distância entre as duas
      // é a coisa mais mal compreendida do IRS português.
      taxaMarginalTexto: linhasEscaloes.length > 0 ? linhasEscaloes[linhasEscaloes.length - 1].taxaTexto : "—",
      ssAnual: cent(r.ssAnual),
    },

    // ── Identificação ─────────────────────────────────────────────────────
    identificacao: cab
      ? [
          ...(cab.nome ? [{ rotulo: "Nome", valor: cab.nome }] : []),
          ...(cab.nif ? [{ rotulo: "NIF", valor: cab.nif }] : []),
          { rotulo: "Residência fiscal", valor: cab.residencia },
          { rotulo: "Estado civil", valor: cab.estadoCivil },
          { rotulo: "Tributação", valor: cab.tributacao },
          ...(cab.dependentes.length > 0
            ? [{ rotulo: "Dependentes", valor: cab.dependentes.join(" · ") }]
            : []),
          ...(cab.ascendentes > 0
            ? [{ rotulo: "Ascendentes a cargo", valor: String(cab.ascendentes) }]
            : []),
        ]
      : [],

    // ── Rendimentos ───────────────────────────────────────────────────────
    componentes,
    totalComponentes,

    // ── Do bruto ao coletável ─────────────────────────────────────────────
    funil: funil(r),

    // ── Os escalões ───────────────────────────────────────────────────────
    escaloes: linhasEscaloes,
    totalEscaloes: {
      rendimento: cent(linhasEscaloes.reduce((s, l) => s + l.rendimento, 0)),
      imposto: cent(linhasEscaloes.reduce((s, l) => s + l.imposto, 0)),
    },
    adicionalSolidariedade: cent(e.adicionalSolidariedade),
    // Vazio quando IFICI/RNH aplicam taxa fixa — nesse caso não há escalões, e
    // dizê-lo é mais honesto do que mostrar uma tabela em branco.
    taxaFixa: e.ificiAplicado ? "IFICI — taxa especial de 20%" : e.rnhAntigoAplicado ? "RNH — taxa especial de 20%" : "",

    // ── Deduções ──────────────────────────────────────────────────────────
    deducoes: rubricasDeducao(r),
    deducoesTotal: cent(e.deducoesColetaTotal),
    limiteDeducoes: limiteDeducoes(r),

    // ── Apuramento ────────────────────────────────────────────────────────
    apuramento: [
      { rubrica: "Coleta do englobamento", valor: cent(r.coletaEnglobamento), base: "Art. 68.º" },
      { rubrica: "Tributação autónoma das taxas especiais", valor: cent(r.impostoAutonomo), base: "Arts. 71.º-72.º" },
      { rubrica: "Deduções à coleta", valor: cent(-r.deducoesColeta), base: "Art. 78.º" },
      { rubrica: "Crédito por dupla tributação internacional", valor: cent(-r.creditoDuplaTributacao), base: "Art. 81.º" },
    ].filter((l) => Math.abs(l.valor) > 0.005),
    irsTotal: cent(r.irsTotal),
    pagamentos: [
      { rubrica: "Retenções na fonte", valor: cent(r.retencoesTotais) },
      { rubrica: "Pagamentos por conta", valor: cent(r.pagamentosPorConta) },
    ].filter((l) => Math.abs(l.valor) > 0.005),
    pago,
    saldo: cent(r.saldo),

    // ── Memória e avisos ──────────────────────────────────────────────────
    memoria: r.memoria.map((l) => ({
      anexo: l.anexo ?? "",
      rubrica: l.rotulo,
      // As fórmulas vêm do motor com o formatador da interface; sem isto,
      // «5060,00 €» e «1 206,20 €» apareciam na mesma coluna.
      formula: regruparMilhares(l.formula ?? ""),
      base: l.baseLegal ?? "",
      valor: cent(l.valor),
    })),
    avisos: r.avisos,
    ambito: doc.ambito,
  };
}
