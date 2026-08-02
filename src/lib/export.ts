// Exportação de recibos — CSV (download) e PDF (via janela de impressão).
//
// A serialização, o arredondamento e a formatação vêm de `src/lib/export/*`.
// Um formatador de dinheiro por ficheiro é como se chegava a «2051,58 €» numa
// linha e «24 748,00 €» na seguinte, dentro do mesmo documento.

import { calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { META_TIPO } from "@/lib/fiscal-data";
import {
  dinheiro,
  escreverCSV,
  texto,
  data as celulaData,
  type DialetoCSV,
  type TabelaCSV,
} from "@/lib/export/csv";
import { eur } from "@/lib/export/dinheiro";
import { MIME, descarregar } from "@/lib/export/nomes";

/** Uma tabela, um cabeçalho — códigos estáveis ao lado dos rótulos legíveis. */
const COLUNAS_RECIBOS = [
  { codigo: "data", rotulo: "Data" },
  { codigo: "cliente", rotulo: "Cliente" },
  { codigo: "tipo", rotulo: "Tipo" },
  { codigo: "bruto_eur", rotulo: "Valor" },
  { codigo: "iva_eur", rotulo: "IVA" },
  { codigo: "retencao_irs_eur", rotulo: "Retenção IRS" },
  { codigo: "seguranca_social_eur", rotulo: "Segurança Social" },
  { codigo: "liquido_eur", rotulo: "Líquido" },
] as const;

export function recibosTabela(recibos: Recibo[]): TabelaCSV {
  return {
    colunas: COLUNAS_RECIBOS,
    linhas: recibos.map((r) => {
      const c = calcularRecibo(r);
      return [
        celulaData(r.data),
        texto(r.cliente || ""),
        texto(META_TIPO[r.tipo].label),
        dinheiro(c.bruto),
        dinheiro(c.iva),
        dinheiro(c.retencaoIRS),
        dinheiro(c.segSocial),
        dinheiro(c.liquido),
      ];
    }),
  };
}

export function recibosToCSV(recibos: Recibo[], dialeto: DialetoCSV = "humano"): string {
  return escreverCSV(recibosTabela(recibos), { dialeto });
}

export function downloadCSV(recibos: Recibo[], filename = "recibos.csv", dialeto: DialetoCSV = "humano"): void {
  descarregar(recibosToCSV(recibos, dialeto), filename, MIME.csv);
}

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
