// Exportação da declaração simulada de IRS — relatório imprimível / PDF.
// Sem dependências: abre uma janela com HTML autossuficiente e chama print().
// Só corre no cliente.

import type { DeclaracaoResult } from "@/lib/fiscal";
import { dinheiro, escreverCSV, numero, texto, type TabelaCSV } from "@/lib/export/csv";
import { criarProveniencia } from "@/lib/export/referencia";
import { MIME, descarregar, nomeFicheiro } from "@/lib/export/nomes";
import { eur as eurDoc, pctDoc } from "@/lib/export/dinheiro";

const eur = eurDoc;
const pctf = pctDoc;
const esc = (s: string) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

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

export function exportarDeclaracaoIRS(r: DeclaracaoResult, cab?: CabecalhoDeclaracao): void {
  if (typeof window === "undefined") return;

  const componentes = r.componentes
    .map(
      (c) =>
        `<tr><td>${esc(c.anexo)}</td><td>${esc(c.rotulo)}</td><td class="n">${eur(c.bruto)}</td><td class="n">${
          c.englobado > 0 ? eur(c.englobado) : c.impostoAutonomo > 0 ? eur(c.impostoAutonomo) + " (autónomo)" : "—"
        }</td></tr>`
    )
    .join("");

  const memoria = r.memoria
    .map(
      (l) =>
        `<tr><td>${l.anexo ? esc(l.anexo) : ""}</td><td>${esc(l.rotulo)}${
          l.formula ? `<br><span class="muted">${esc(l.formula)}</span>` : ""
        }${l.baseLegal ? `<br><span class="muted i">${esc(l.baseLegal)}</span>` : ""}</td><td class="n ${
          l.valor < 0 ? "neg" : ""
        }">${l.valor < 0 ? "− " : ""}${eur(Math.abs(l.valor))}</td></tr>`
    )
    .join("");

  const linhasResumo: Array<[string, string]> = [
    ["Rendimento global", eur(r.rendimentoGlobal)],
    ["Rendimento coletável", eur(r.rendimentoColetavel)],
    ["Coleta (englobamento)", eur(r.coletaEnglobamento)],
    ["Tributação autónoma", eur(r.impostoAutonomo)],
    ["Deduções à coleta", "− " + eur(r.deducoesColeta)],
    ["Crédito por dupla tributação", "− " + eur(r.creditoDuplaTributacao)],
    ["IRS total estimado", eur(r.irsTotal)],
    ["Taxa efetiva", pctf(r.taxaEfetiva)],
    ["Retenções + pagamentos por conta", "− " + eur(r.retencoesTotais + r.pagamentosPorConta)],
    ["Segurança Social (cat. B)", eur(r.ssAnual)],
  ];
  const resumo = linhasResumo.map(([k, v]) => `<tr><td>${k}</td><td class="n">${v}</td></tr>`).join("");

  const reembolso = r.saldo >= 0;

  // Secção de identificação e agregado (opcional).
  const agregado = cab
    ? `<h2>Identificação e agregado</h2>
       <table><tbody>
         ${cab.nome ? `<tr><td>Nome</td><td class="n">${esc(cab.nome)}</td></tr>` : ""}
         ${cab.nif ? `<tr><td>NIF</td><td class="n">${esc(cab.nif)}</td></tr>` : ""}
         <tr><td>Residência fiscal</td><td class="n">${esc(cab.residencia)}</td></tr>
         <tr><td>Estado civil</td><td class="n">${esc(cab.estadoCivil)}</td></tr>
         <tr><td>Tributação</td><td class="n">${esc(cab.tributacao)}</td></tr>
         <tr><td>Dependentes</td><td class="n">${cab.dependentes.length ? esc(cab.dependentes.join("; ")) : "—"}</td></tr>
         <tr><td>Ascendentes a cargo</td><td class="n">${cab.ascendentes}</td></tr>
       </tbody></table>`
    : "";

  const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Simulação de IRS — ReciboCerto</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a17;padding:32px;max-width:820px;margin:0 auto;}
    h1{font-size:20px;margin:0 0 2px;color:#0F6E56;}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin:26px 0 8px;}
    .sub{color:#777;font-size:12px;margin-bottom:20px;}
    .hero{background:#E1F5EE;border:1px solid #9CE0C8;border-radius:14px;padding:16px 18px;margin-bottom:8px;}
    .hero .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#0F6E56;}
    .hero .v{font-size:28px;font-weight:700;color:${reembolso ? "#0F6E56" : "#7A5C00"};}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top;}
    th{background:#f5f4f0;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#666;}
    .n{text-align:right;font-variant-numeric:tabular-nums;}
    .neg{color:#0F6E56;}
    .muted{color:#999;font-size:10px;}
    .i{font-style:italic;}
    .foot{margin-top:28px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px;}
  </style></head><body>
  <h1>ReciboCerto — Simulação de IRS</h1>
  <div class="sub">Gerado em ${new Date().toLocaleDateString("pt-PT")} · ano fiscal 2026 · estimativa</div>

  <div class="hero">
    <div class="lbl">${reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}</div>
    <div class="v">${eur(Math.abs(r.saldo))}</div>
  </div>

  ${agregado}

  <h2>Rendimentos por categoria</h2>
  <table><thead><tr><th>Anexo</th><th>Categoria</th><th class="n">Bruto</th><th class="n">Englobado / imposto</th></tr></thead>
  <tbody>${componentes || '<tr><td colspan="4">Sem rendimentos.</td></tr>'}</tbody></table>

  <h2>Apuramento</h2>
  <table><tbody>${resumo}</tbody></table>

  <h2>Memória de cálculo</h2>
  <table><thead><tr><th>Anexo</th><th>Descrição</th><th class="n">Valor</th></tr></thead>
  <tbody>${memoria}</tbody></table>

  <div class="foot">Estimativa com base na legislação em vigor para 2026. Não substitui o apuramento oficial da Autoridade Tributária nem aconselhamento de contabilista certificado.</div>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
