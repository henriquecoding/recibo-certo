// Relatório financeiro do vencimento em PDF (via janela de impressão).
// Recurso Pro: documento premium, detalhado e explicado. Sem dependências
// (usa window.print). Formata apenas valores já calculados pelo motor — não há
// nenhum número fiscal inventado aqui; as taxas/bases são as de `fiscal-data.ts`,
// recebidas como argumento para descrição.

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number.isFinite(n) ? n : 0);
const pctf = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const esc = (s: string) =>
  (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

export interface RelatorioVencimento {
  // ── Pressupostos da simulação ──
  situacao: string;
  dependentes: number;
  deficiencia: boolean;
  subsidioDia: number;
  subsidioForma: string; // "Cartão" | "Dinheiro" | "—"
  diasUteis: number;
  duodecimos: boolean;
  // ── Mês normal ──
  bruto: number;
  ssTrabalhador: number;
  irsRetido: number;
  subsidioRefeicaoTotal: number;
  subsidioRefeicaoIsento: number;
  subsidioRefeicaoTributado: number;
  liquido: number;
  liquidoMostrado: number;
  taxaEfetiva: number;
  custoEmpresa: number;
  // ── Taxas (para explicação) ──
  ssTaxaTrab: number; // 0,11
  tsuTaxa: number; // 0,2375
  // ── Ano (14 meses) ──
  brutoAnual: number;
  subsidioFerias: number;
  subsidioNatal: number;
  irsFerias: number;
  irsNatal: number;
  irsAnual: number;
  ssAnual: number;
  liquidoAnual: number;
  liquidoMedioMes: number;
}

export function printRelatorioVencimento(d: RelatorioVencimento): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(relatorioVencimentoHTML(d));
  w.document.close();
}

/** Constrói o HTML do relatório (puro — testável sem `window`). */
export function relatorioVencimentoHTML(d: RelatorioVencimento): string {
  const fica = Math.max(0, d.bruto - d.ssTrabalhador - d.irsRetido);
  const base = d.bruto || 1;
  const wFica = (fica / base) * 100;
  const wIrs = (d.irsRetido / base) * 100;
  const wSs = (d.ssTrabalhador / base) * 100;
  const ficaPct = fica / base;

  const dataGeracao = new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  const temSubsidio = d.subsidioRefeicaoTotal > 0;

  // Linha de tabela com rubrica · explicação · valor.
  const lin = (rubrica: string, explica: string, valor: string, forte = false) =>
    `<tr${forte ? ' class="b"' : ""}><td class="rub">${rubrica}</td><td class="exp">${explica}</td><td class="n">${valor}</td></tr>`;

  // Par de pressuposto (label · valor).
  const press = (label: string, valor: string) =>
    `<div class="kv"><span class="k">${label}</span><span class="v">${valor}</span></div>`;

  const chip = (label: string, valor: string) =>
    `<div class="chip"><div class="cl">${label}</div><div class="cv">${valor}</div></div>`;

  const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
  <title>Relatório de vencimento — ReciboCerto</title>
  <style>
    @page { size: A4; margin: 16mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1A1A17; margin: 0; font-size: 12px; line-height: 1.5; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1D9E75; padding-bottom: 12px; }
    .brand { font-size: 20px; font-weight: 800; color: #0F6E56; letter-spacing: -0.02em; }
    .brand small { display: block; font-size: 10px; font-weight: 600; color: #1D9E75; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
    .doc { text-align: right; }
    .doc .t { font-size: 14px; font-weight: 700; }
    .doc .d { font-size: 11px; color: #777; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #0F6E56; margin: 22px 0 8px; }
    .hero { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 16px; padding: 16px 18px; background: #E1F5EE; border-radius: 14px; }
    .hero .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #0F6E56; }
    .hero .big { font-size: 30px; font-weight: 800; color: #0F6E56; font-variant-numeric: tabular-nums; line-height: 1.1; }
    .hero .note { font-size: 10px; color: #4b7a6a; }
    .chips { display: flex; gap: 8px; }
    .chip { background: #fff; border: 1px solid #cdeadd; border-radius: 10px; padding: 8px 12px; min-width: 92px; }
    .chip .cl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: #777; }
    .chip .cv { font-size: 15px; font-weight: 700; color: #1A1A17; font-variant-numeric: tabular-nums; }
    .press { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .kv { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #f0efea; padding: 5px 0; }
    .kv .k { color: #777; } .kv .v { font-weight: 600; text-align: right; }
    .bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin: 6px 0 10px; }
    .bar i { display: block; height: 100%; }
    .legend { display: flex; gap: 18px; flex-wrap: wrap; font-size: 11px; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    td.rub { font-weight: 600; width: 32%; }
    td.exp { color: #777; font-size: 11px; }
    td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; width: 18%; }
    tr.b td { font-weight: 800; color: #0F6E56; border-top: 2px solid #1D9E75; border-bottom: none; background: #f4fbf8; }
    .explica { margin-top: 18px; padding: 14px 16px; background: #faf9f6; border: 1px solid #ececE6; border-radius: 12px; font-size: 11px; color: #555; }
    .explica h3 { margin: 0 0 6px; font-size: 11px; color: #1A1A17; }
    .explica li { margin: 3px 0; }
    .foot { margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; line-height: 1.5; }
    .foot b { color: #777; }
  </style></head><body><div class="wrap">

  <div class="head">
    <div class="brand">ReciboCerto<small>Copiloto fiscal</small></div>
    <div class="doc"><div class="t">Relatório de vencimento</div><div class="d">Gerado em ${dataGeracao}</div></div>
  </div>

  <div class="hero">
    <div>
      <div class="lbl">Vencimento líquido mensal estimado</div>
      <div class="big">${eur(d.liquidoMostrado)}</div>
      <div class="note">${d.duodecimos ? "Média mensal com subsídios de férias e Natal em duodécimos." : "Mês normal, sem os subsídios de férias e de Natal."}</div>
    </div>
    <div class="chips">
      ${chip("Taxa efetiva", pctf(d.taxaEfetiva))}
      ${chip("Custo p/ empresa", eur(d.custoEmpresa))}
      ${chip("Líquido anual", eur(d.liquidoAnual))}
    </div>
  </div>

  <h2>Pressupostos da simulação</h2>
  <div class="press">
    ${press("Salário bruto mensal", eur(d.bruto))}
    ${press("Situação familiar", esc(d.situacao))}
    ${press("Dependentes", String(d.dependentes))}
    ${press("Grau de incapacidade ≥ 60%", d.deficiencia ? "Sim" : "Não")}
    ${press("Subsídio de refeição", temSubsidio ? `${eur(d.subsidioDia)}/dia · ${esc(d.subsidioForma)}` : "Não aplicável")}
    ${press("Dias úteis considerados", temSubsidio ? String(d.diasUteis) : "—")}
    ${press("Subsídios de férias/Natal", d.duodecimos ? "Em duodécimos" : "Por inteiro")}
    ${press("Região", "Continente")}
  </div>

  <h2>Para onde vai o salário bruto</h2>
  <div class="bar">
    <i style="width:${wFica}%;background:#1D9E75"></i>
    <i style="width:${wIrs}%;background:#9FE1CB"></i>
    <i style="width:${wSs}%;background:#C2745A"></i>
  </div>
  <div class="legend">
    <span><i class="dot" style="background:#1D9E75"></i> Fica contigo · ${eur(fica)} (${pctf(ficaPct)})</span>
    <span><i class="dot" style="background:#9FE1CB"></i> Retenção IRS · ${eur(d.irsRetido)}</span>
    <span><i class="dot" style="background:#C2745A"></i> Segurança Social · ${eur(d.ssTrabalhador)}</span>
  </div>

  <h2>Mês normal — decomposição</h2>
  <table><tbody>
    ${lin("Salário bruto", "Remuneração base mensal", eur(d.bruto))}
    ${lin("Segurança Social", `Contribuição do trabalhador (${pctf(d.ssTaxaTrab)} do bruto)`, "− " + eur(d.ssTrabalhador))}
    ${lin("Retenção na fonte de IRS", "Adiantamento mensal segundo a tabela da situação familiar (Despacho 233-A/2026)", "− " + eur(d.irsRetido))}
    ${
      temSubsidio
        ? lin(
            "Subsídio de refeição",
            `${eur(d.subsidioRefeicaoTotal)} no total · ${eur(d.subsidioRefeicaoIsento)} isento${d.subsidioRefeicaoTributado > 0 ? ` · ${eur(d.subsidioRefeicaoTributado)} tributado` : ""}`,
            "+ " + eur(d.subsidioRefeicaoIsento)
          )
        : ""
    }
    ${lin("Vencimento líquido", "O que recebes na conta num mês normal", eur(d.liquido), true)}
    ${lin("Taxa efetiva", "IRS + Segurança Social a dividir pelo bruto", pctf(d.taxaEfetiva))}
    ${lin("Custo total para a empresa", `Bruto + Taxa Social Única da entidade (${pctf(d.tsuTaxa)})`, eur(d.custoEmpresa))}
  </tbody></table>

  <h2>Ao ano — 14 meses</h2>
  <table><tbody>
    ${lin("Bruto anual", "12 meses de salário + subsídios de férias e de Natal", eur(d.brutoAnual))}
    ${lin("Subsídio de férias", `Tributado em separado · − ${eur(d.irsFerias)} de IRS`, eur(d.subsidioFerias))}
    ${lin("Subsídio de Natal", `Tributado em separado · − ${eur(d.irsNatal)} de IRS`, eur(d.subsidioNatal))}
    ${lin("IRS retido no ano", "Soma da retenção do salário e dos subsídios", "− " + eur(d.irsAnual))}
    ${lin("Segurança Social no ano", `${pctf(d.ssTaxaTrab)} sobre todas as remunerações`, "− " + eur(d.ssAnual))}
    ${lin("Líquido anual", `Equivale a ${eur(d.liquidoMedioMes)}/mês em média`, eur(d.liquidoAnual), true)}
  </tbody></table>

  <div class="explica">
    <h3>Como ler este relatório</h3>
    <ul>
      <li>A <b>retenção na fonte</b> é um adiantamento mensal de IRS. O imposto definitivo é apurado na declaração anual — podes receber reembolso ou ter de pagar a diferença.</li>
      <li>Os <b>subsídios de férias e de Natal</b> são tributados de forma autónoma (Art. 99.º-C CIRS): a tabela aplica-se a cada um isoladamente, não somados ao salário do mês.</li>
      <li>O <b>custo para a empresa</b> inclui a Taxa Social Única da entidade (${pctf(d.tsuTaxa)}), que acresce ao teu bruto — útil para enquadrar uma negociação salarial.</li>
      ${temSubsidio ? `<li>O <b>subsídio de refeição</b> é isento de IRS e Segurança Social até ao limite diário; o que exceder é tributado.</li>` : ""}
    </ul>
  </div>

  <div class="foot">
    <b>Fonte:</b> tabelas de retenção na fonte do Despacho n.º 233-A/2026 (Tabelas I a VII, Continente), conforme a situação familiar e a deficiência.
    Estimativa para ano completo de trabalho; não cobre as Regiões Autónomas (Açores/Madeira).
    Não substitui o recibo de vencimento oficial nem aconselhamento de um contabilista certificado.
    Gerado por ReciboCerto · recibocerto.pt
  </div>

  </div><script>window.onload=function(){window.print();}</script></body></html>`;

  return html;
}
