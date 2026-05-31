// Exportação de recibos — CSV (download) e PDF (via janela de impressão).
// Sem dependências: usa Blob/URL e window.print. Só corre no cliente.

import { calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { META_TIPO } from "@/lib/fiscal-data";

const num = (n: number) => n.toFixed(2).replace(".", ",");

export function recibosToCSV(recibos: Recibo[]): string {
  const cab = ["Data", "Cliente", "Tipo", "Valor", "IVA", "Retenção IRS", "Segurança Social", "Líquido"];
  const linhas = recibos.map((r) => {
    const c = calcularRecibo(r);
    return [
      r.data,
      `"${(r.cliente || "").replace(/"/g, '""')}"`,
      `"${META_TIPO[r.tipo].label}"`,
      num(c.bruto),
      num(c.iva),
      num(c.retencaoIRS),
      num(c.segSocial),
      num(c.liquido),
    ].join(";");
  });
  // BOM para o Excel reconhecer UTF-8; separador ';' (convenção pt-PT).
  return "﻿" + [cab.join(";"), ...linhas].join("\r\n");
}

export function downloadCSV(recibos: Recibo[], filename = "recibos.csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([recibosToCSV(recibos)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

export function printRecibosPDF(recibos: Recibo[]): void {
  if (typeof window === "undefined") return;
  const total = recibos.reduce(
    (acc, r) => {
      const c = calcularRecibo(r);
      acc.bruto += c.bruto;
      acc.liquido += c.liquido;
      return acc;
    },
    { bruto: 0, liquido: 0 }
  );

  const rows = recibos
    .map((r) => {
      const c = calcularRecibo(r);
      return `<tr><td>${r.data}</td><td>${escapeHtml(r.cliente)}</td><td>${escapeHtml(
        META_TIPO[r.tipo].label
      )}</td><td class="n">${eur(c.bruto)}</td><td class="n">${eur(c.iva)}</td><td class="n">${eur(
        c.retencaoIRS
      )}</td><td class="n">${eur(c.segSocial)}</td><td class="n b">${eur(c.liquido)}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Recibos — ReciboCerto</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a17;padding:32px;}
    h1{font-size:20px;margin:0 0 4px;color:#0F6E56;}
    .sub{color:#777;font-size:12px;margin-bottom:24px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee;}
    th{background:#f5f4f0;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#666;}
    .n{text-align:right;font-variant-numeric:tabular-nums;}
    .b{font-weight:700;color:#0F6E56;}
    tfoot td{border-top:2px solid #1D9E75;font-weight:700;}
  </style></head><body>
  <h1>ReciboCerto — Recibos</h1>
  <div class="sub">Gerado em ${new Date().toLocaleDateString("pt-PT")} · ${recibos.length} recibos</div>
  <table><thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th class="n">Valor</th><th class="n">IVA</th><th class="n">Retenção</th><th class="n">Seg. Social</th><th class="n">Líquido</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="3">Total</td><td class="n">${eur(total.bruto)}</td><td colspan="3"></td><td class="n">${eur(
    total.liquido
  )}</td></tr></tfoot></table>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return (s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch));
}
