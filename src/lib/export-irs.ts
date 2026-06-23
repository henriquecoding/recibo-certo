// Exportação da declaração simulada de IRS — relatório imprimível / PDF.
// Sem dependências: abre uma janela com HTML autossuficiente e chama print().
// Só corre no cliente.

import type { DeclaracaoResult } from "@/lib/fiscal";

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const pctf = (n: number) => `${(n * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;
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

const num = (n: number) => n.toFixed(2).replace(".", ",");
const csvCell = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;

/** Exporta a declaração simulada como CSV (download), separador ';' (pt-PT). */
export function exportarDeclaracaoCSV(r: DeclaracaoResult, cab?: CabecalhoDeclaracao): void {
  if (typeof window === "undefined") return;
  const linhas: string[] = [];
  if (cab) {
    linhas.push("Identificação e agregado;");
    if (cab.nome) linhas.push(`Nome;${csvCell(cab.nome)}`);
    if (cab.nif) linhas.push(`NIF;${csvCell(cab.nif)}`);
    linhas.push(`Residência fiscal;${csvCell(cab.residencia)}`);
    linhas.push(`Estado civil;${csvCell(cab.estadoCivil)}`);
    linhas.push(`Tributação;${csvCell(cab.tributacao)}`);
    linhas.push(`Dependentes;${csvCell(cab.dependentes.join(" | ") || "—")}`);
    linhas.push(`Ascendentes a cargo;${cab.ascendentes}`);
    linhas.push("");
  }
  linhas.push("Rendimentos por categoria;;;;");
  linhas.push("Anexo;Categoria;Bruto;Englobado;Imposto autónomo");
  for (const c of r.componentes) {
    linhas.push([csvCell(c.anexo), csvCell(c.rotulo), num(c.bruto), num(c.englobado), num(c.impostoAutonomo)].join(";"));
  }
  linhas.push("");
  linhas.push("Apuramento;");
  const ap: Array<[string, number]> = [
    ["Rendimento global", r.rendimentoGlobal],
    ["Rendimento coletável", r.rendimentoColetavel],
    ["Coleta (englobamento)", r.coletaEnglobamento],
    ["Tributação autónoma", r.impostoAutonomo],
    ["Deduções à coleta", r.deducoesColeta],
    ["Crédito dupla tributação", r.creditoDuplaTributacao],
    ["IRS total estimado", r.irsTotal],
    ["Segurança Social (cat. B)", r.ssAnual],
    ["Retenções + pag. por conta", r.retencoesTotais + r.pagamentosPorConta],
    [r.saldo >= 0 ? "Reembolso estimado" : "Imposto a pagar estimado", Math.abs(r.saldo)],
  ];
  for (const [k, v] of ap) linhas.push(`${csvCell(k)};${num(v)}`);
  linhas.push("");
  linhas.push("Memória de cálculo;;");
  linhas.push("Anexo;Descrição;Valor");
  for (const l of r.memoria) {
    linhas.push([csvCell(l.anexo || ""), csvCell(l.rotulo + (l.baseLegal ? ` (${l.baseLegal})` : "")), num(l.valor)].join(";"));
  }

  const conteudo = "﻿" + linhas.join("\r\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "simulacao-irs.csv";
  a.click();
  URL.revokeObjectURL(url);
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
