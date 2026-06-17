// Relatório financeiro do vencimento em PDF (via janela de impressão).
// Sem dependências: usa Blob/URL e window.print. Só corre no cliente.
// Formata apenas valores já calculados pelo motor (nada é inventado aqui).

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number.isFinite(n) ? n : 0);

const pctf = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;

export interface RelatorioVencimento {
  /** Contexto da simulação. */
  situacao: string;
  dependentes: number;
  // Mês normal.
  bruto: number;
  ssTrabalhador: number;
  irsRetido: number;
  subsidioRefeicaoTotal: number;
  subsidioRefeicaoIsento: number;
  liquido: number;
  taxaEfetiva: number;
  custoEmpresa: number;
  // Ano (14 meses).
  brutoAnual: number;
  subsidioFerias: number;
  subsidioNatal: number;
  irsAnual: number;
  ssAnual: number;
  liquidoAnual: number;
}

export function printRelatorioVencimento(d: RelatorioVencimento): void {
  if (typeof window === "undefined") return;

  const linha = (l: string, v: string, forte = false) =>
    `<tr${forte ? ' class="b"' : ""}><td>${l}</td><td class="n">${v}</td></tr>`;

  const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Relatório de vencimento — ReciboCerto</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a17;padding:32px;max-width:680px;margin:0 auto;}
    h1{font-size:20px;margin:0 0 4px;color:#0F6E56;}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin:24px 0 8px;}
    .sub{color:#777;font-size:12px;margin-bottom:8px;}
    .hero{margin:16px 0;padding:16px 18px;background:#E1F5EE;border-radius:12px;}
    .hero .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#0F6E56;}
    .hero .v{font-size:28px;font-weight:700;color:#0F6E56;font-variant-numeric:tabular-nums;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    td{padding:7px 10px;border-bottom:1px solid #eee;}
    .n{text-align:right;font-variant-numeric:tabular-nums;}
    tr.b td{font-weight:700;color:#0F6E56;border-top:2px solid #1D9E75;border-bottom:none;}
    .foot{margin-top:24px;font-size:11px;color:#888;line-height:1.5;}
  </style></head><body>
  <h1>ReciboCerto — Relatório de vencimento</h1>
  <div class="sub">Gerado em ${new Date().toLocaleDateString("pt-PT")} · ${d.situacao} · ${d.dependentes} dependente(s)</div>

  <div class="hero"><div class="lbl">Vencimento líquido mensal estimado</div><div class="v">${eur(d.liquido)}</div></div>

  <h2>Mês normal</h2>
  <table><tbody>
    ${linha("Salário bruto", eur(d.bruto))}
    ${linha("Segurança Social (trabalhador)", "− " + eur(d.ssTrabalhador))}
    ${linha("Retenção na fonte de IRS", "− " + eur(d.irsRetido))}
    ${linha("Subsídio de refeição (do qual isento)", `${eur(d.subsidioRefeicaoTotal)} (${eur(d.subsidioRefeicaoIsento)})`)}
    ${linha("Vencimento líquido", eur(d.liquido), true)}
    ${linha("Taxa efetiva (IRS + SS / bruto)", pctf(d.taxaEfetiva))}
    ${linha("Custo total para a empresa (com TSU)", eur(d.custoEmpresa))}
  </tbody></table>

  <h2>Ao ano (14 meses)</h2>
  <table><tbody>
    ${linha("Bruto anual", eur(d.brutoAnual))}
    ${linha("Subsídio de férias", eur(d.subsidioFerias))}
    ${linha("Subsídio de Natal", eur(d.subsidioNatal))}
    ${linha("IRS + Segurança Social no ano", "− " + eur(d.irsAnual + d.ssAnual))}
    ${linha("Líquido anual", eur(d.liquidoAnual), true)}
  </tbody></table>

  <div class="foot">
    Estimativa para o Continente, segundo as tabelas de retenção na fonte do Despacho n.º 233-A/2026
    (Tabelas I a VII conforme a situação familiar e a deficiência), ano completo de trabalho.
    Não cobre as Regiões Autónomas (Açores/Madeira). Não substitui o recibo de vencimento oficial
    nem aconselhamento de um contabilista certificado.
  </div>
  <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
