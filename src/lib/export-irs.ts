// Exportação da declaração simulada de IRS em CSV.
//
// O PDF saía daqui por `window.print()` e passou para `/api/documentos/irs`:
// composto no servidor, com as fontes da marca, PDF/A-2a + PDF/UA-1 e uma
// referência verificável. Ver `src/lib/export/documento-irs.ts`.

import type { DeclaracaoResult } from "@/lib/fiscal";
import { dinheiro, escreverCSV, numero, texto, type TabelaCSV } from "@/lib/export/csv";
import { criarProveniencia } from "@/lib/export/referencia";
import { MIME, descarregar, nomeFicheiro } from "@/lib/export/nomes";


/** Cabeçalho do relatório: identificação e agregado familiar. */
export interface CabecalhoDeclaracao {
  nome: string;
  nif: string;
  residencia: string;
  estadoCivil: string;
  tributacao: string;
  dependentes: string[];
  ascendentes: number;
}

/**
 * A simulação de IRS tem TRÊS tabelas — rendimentos por categoria, apuramento
 * e memória de cálculo. Um CSV só sabe ter uma.
 *
 * A versão anterior escrevia as três no mesmo ficheiro, separadas por linhas em
 * branco e com três cabeçalhos diferentes. Nenhuma ferramenta importa isso: não
 * era uma tabela, era um relatório com a extensão errada. Agora são três
 * ficheiros, cada um com um cabeçalho e nada por cima dele.
 */
export function declaracaoTabelas(r: DeclaracaoResult, cab?: CabecalhoDeclaracao): {
  nome: string;
  variante: string;
  tabela: TabelaCSV;
}[] {
  const tabelas: { nome: string; variante: string; tabela: TabelaCSV }[] = [];

  if (cab) {
    tabelas.push({
      nome: "Identificação e agregado",
      variante: "agregado",
      tabela: {
        colunas: [
          { codigo: "campo", rotulo: "Campo" },
          { codigo: "valor", rotulo: "Valor" },
        ],
        linhas: [
          ...(cab.nome ? [[texto("Nome"), texto(cab.nome)]] : []),
          ...(cab.nif ? [[texto("NIF"), texto(cab.nif)]] : []),
          [texto("Residência fiscal"), texto(cab.residencia)],
          [texto("Estado civil"), texto(cab.estadoCivil)],
          [texto("Tributação"), texto(cab.tributacao)],
          [texto("Dependentes"), texto(cab.dependentes.join(" | "))],
          [texto("Ascendentes a cargo"), numero(cab.ascendentes)],
        ],
      },
    });
  }

  tabelas.push({
    nome: "Rendimentos por categoria",
    variante: "rendimentos",
    tabela: {
      colunas: [
        { codigo: "anexo", rotulo: "Anexo" },
        { codigo: "categoria", rotulo: "Categoria" },
        { codigo: "bruto_eur", rotulo: "Bruto" },
        { codigo: "englobado_eur", rotulo: "Englobado" },
        { codigo: "imposto_autonomo_eur", rotulo: "Imposto autónomo" },
      ],
      linhas: r.componentes.map((c) => [
        texto(c.anexo),
        texto(c.rotulo),
        dinheiro(c.bruto),
        dinheiro(c.englobado),
        dinheiro(c.impostoAutonomo),
      ]),
    },
  });

  const apuramento: Array<[string, string, number]> = [
    ["rendimento_global", "Rendimento global", r.rendimentoGlobal],
    ["rendimento_coletavel", "Rendimento coletável", r.rendimentoColetavel],
    ["coleta_englobamento", "Coleta (englobamento)", r.coletaEnglobamento],
    ["tributacao_autonoma", "Tributação autónoma", r.impostoAutonomo],
    ["deducoes_coleta", "Deduções à coleta", r.deducoesColeta],
    ["credito_dupla_tributacao", "Crédito dupla tributação", r.creditoDuplaTributacao],
    ["irs_total", "IRS total estimado", r.irsTotal],
    ["seguranca_social_cat_b", "Segurança Social (cat. B)", r.ssAnual],
    ["retencoes_e_pagamentos_conta", "Retenções + pagamentos por conta", r.retencoesTotais + r.pagamentosPorConta],
    [r.saldo >= 0 ? "reembolso_estimado" : "imposto_a_pagar_estimado", r.saldo >= 0 ? "Reembolso estimado" : "Imposto a pagar estimado", Math.abs(r.saldo)],
  ];
  tabelas.push({
    nome: "Apuramento",
    variante: "apuramento",
    tabela: {
      colunas: [
        { codigo: "codigo", rotulo: "Código" },
        { codigo: "rubrica", rotulo: "Rubrica" },
        { codigo: "valor_eur", rotulo: "Valor" },
      ],
      linhas: apuramento.map(([codigo, rotulo, valor]) => [texto(codigo), texto(rotulo), dinheiro(valor)]),
    },
  });

  tabelas.push({
    nome: "Memória de cálculo",
    variante: "memoria",
    tabela: {
      colunas: [
        { codigo: "anexo", rotulo: "Anexo" },
        { codigo: "descricao", rotulo: "Descrição" },
        { codigo: "base_legal", rotulo: "Base legal" },
        { codigo: "valor_eur", rotulo: "Valor" },
      ],
      linhas: r.memoria.map((l) => [
        texto(l.anexo || ""),
        texto(l.rotulo),
        texto(l.baseLegal || ""),
        dinheiro(l.valor),
      ]),
    },
  });

  return tabelas;
}

/**
 * Exporta a simulação como um ficheiro por tabela, nos dois dialetos. A
 * referência partilhada permite a quem receba os ficheiros saber que falam
 * todos do mesmo apuramento.
 */
export async function exportarDeclaracaoCSV(r: DeclaracaoResult, cab?: CabecalhoDeclaracao): Promise<void> {
  if (typeof window === "undefined") return;
  const { referencia } = await criarProveniencia("irs", { componentes: r.componentes, saldo: r.saldo });
  for (const { variante, tabela } of declaracaoTabelas(r, cab)) {
    for (const dialeto of ["humano", "maquina"] as const) {
      const nome = nomeFicheiro({
        assunto: "simulacao de IRS",
        referencia,
        variante: dialeto === "maquina" ? `${variante}-dados` : variante,
        extensao: "csv",
      });
      descarregar(escreverCSV(tabela, { dialeto }), nome, MIME.csv);
    }
  }
}
