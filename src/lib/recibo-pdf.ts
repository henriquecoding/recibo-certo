// ─────────────────────────────────────────────────────────────────────
//  Extração de dados de um recibo de vencimento em PDF — 100% no browser.
//  ---------------------------------------------------------------------
//  PRIVACIDADE: o ficheiro é lido na memória do browser (pdf.js) e NUNCA é
//  enviado para nenhum servidor nem guardado. Esta função extrai apenas o
//  necessário para preencher o simulador/auditoria e IGNORA de propósito
//  dados sensíveis: morada, NIB/IBAN, nº de contribuinte do trabalhador,
//  nº de beneficiário da Segurança Social e dados de seguro. O único dado
//  "mais sensível" extraído é o da EMPRESA (NIF, nome) e a função.
//
//  ESTRATÉGIA (recibos costumam ter 2 colunas: ABONOS | DESCONTOS):
//   1) `parseReciboTexto` — âncoras robustas sobre o TEXTO (independentes do
//      layout): salário base, remuneração sujeita + IRS (via taxa a 4 casas),
//      Segurança Social e total do subsídio (zip do bloco de descontos).
//   2) `parseReciboPosicional` — usa as COORDENADAS (x/y) de cada item para
//      reconstruir a tabela e ler, por linha, o subsídio (dias × valor/dia) e
//      o prémio sem misturar colunas.
//   3) `combinarRecibo` — só aceita os valores posicionais se passarem
//      validações (ex.: dias × valor/dia tem de bater com o total conhecido;
//      prémio tem de caber na diferença sujeita − base). Nunca mostra números
//      implausíveis — em caso de dúvida, fica para confirmação manual.
// ─────────────────────────────────────────────────────────────────────

import { analisarLayout, extrairRubricas, type ItemGeo } from "./recibo-layout";

export interface ReciboExtraido {
  empresaNome?: string;
  empresaNif?: string;
  funcao?: string;
  mes?: number; // 0–11
  ano?: number;
  /** Vencimento base mensal. */
  salarioBase?: number;
  /** Remuneração mensal sujeita a IRS/SS (base da auditoria). */
  remuneracaoSujeita?: number;
  /** IRS retido no recibo. */
  irsRetido?: number;
  /** Segurança Social descontada no recibo. */
  ssDesconto?: number;
  /** Subsídio de refeição por dia (se reconhecido). */
  subsidioRefeicaoDia?: number;
  /** Nº de dias de subsídio de refeição. */
  subsidioRefeicaoDias?: number;
  /** Subsídio de refeição — total do mês (abono). */
  subsidioRefeicaoTotal?: number;
  /** Subsídio de refeição pago em cartão/vale. */
  subsidioRefeicaoCartao?: boolean;
  /** Feriados trabalhados pagos no mês (sujeito a IRS/SS). */
  feriados?: number;
  /** Prémio pago no mês (ex.: desempenho). */
  premio?: number;
  /** Campos que não foi possível extrair (para a UI sinalizar). */
  porPreencher: string[];
}

/** Item de texto com posição (coordenadas do pdf.js). */
export interface ItemPos {
  str: string;
  x: number;
  y: number;
}

const MESES = [
  "janeiro", "fevereiro", "março", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MES_INDICE: Record<string, number> = {
  janeiro: 0, fevereiro: 1, "março": 2, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const reCurrency = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
const reTaxa4 = /^\d{1,2},\d{4}$/; // ex.: 4,6100 (taxa de IRS do mês)

function toNum(t: string): number {
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
function isCurrency(t: string): boolean {
  return reCurrency.test(t.trim());
}

/** Próximo token de moeda a partir de um índice (exclusive). */
function proximaMoeda(toks: string[], from: number, limite = 12): number | undefined {
  for (let i = from + 1; i < Math.min(toks.length, from + 1 + limite); i++) {
    if (isCurrency(toks[i])) return toNum(toks[i]);
  }
  return undefined;
}

/**
 * Parser de TEXTO (testável sem browser): âncoras robustas que não dependem
 * da ordem de leitura entre colunas.
 */
export function parseReciboTexto(itens: string[]): ReciboExtraido {
  const toks = itens.map((t) => (t ?? "").replace(/ /g, " ").trim()).filter(Boolean);
  const full = toks.join(" ").replace(/\s+/g, " ");
  const r: ReciboExtraido = { porPreencher: [] };

  // ── Empresa: NIF português com prefixo PT (o do trabalhador vem sem PT). ──
  const nif = full.match(/\bPT\s?(\d{9})\b/);
  if (nif) {
    r.empresaNif = "PT" + nif[1];
    const idx = toks.findIndex((t) => /\bPT\s?\d{9}\b/.test(t));
    if (idx > 0) {
      const antes = toks[idx - 1];
      if (/[A-Za-zÀ-ÿ]/.test(antes) && antes.length > 2) r.empresaNome = antes;
      const depois = toks[idx + 1];
      if (depois && /[A-Za-zÀ-ÿ]/.test(depois) && !isCurrency(depois) && depois.length > 2) {
        r.funcao = depois;
      }
    }
  }

  // ── Mês e ano de processamento. ──
  const md = full.match(new RegExp(`\\b(${MESES.join("|")})\\s+de\\s+(20\\d{2})\\b`, "i"));
  if (md) {
    r.mes = MES_INDICE[md[1].toLowerCase()];
    r.ano = parseInt(md[2], 10);
  }

  // ── Remuneração sujeita + IRS retido: âncora na taxa de IRS (4 casas). ──
  const idxTaxa = toks.findIndex((t) => reTaxa4.test(t));
  if (idxTaxa >= 0) {
    const sujeito = proximaMoeda(toks, idxTaxa, 4);
    if (sujeito !== undefined) {
      r.remuneracaoSujeita = sujeito;
      const idxSuj = toks.findIndex((t, i) => i > idxTaxa && isCurrency(t));
      if (idxSuj >= 0) {
        const retido = proximaMoeda(toks, idxSuj, 4);
        if (retido !== undefined) r.irsRetido = retido;
      }
    }
  }

  // ── Vencimento base: "Venc. Mensal :". ──
  const idxVenc = toks.findIndex((t) => /venc\.?\s*mensal/i.test(t));
  if (idxVenc >= 0) r.salarioBase = proximaMoeda(toks, idxVenc, 10);

  // ── Descontos: zip designações × valores entre DESCONTOS e TOTAL DESCONTOS. ──
  const ini = toks.findIndex((t) => /^DESCONTOS$/i.test(t));
  const fim = toks.findIndex((t) => /total\s+descontos/i.test(t));
  if (ini >= 0 && fim > ini) {
    const bloco = toks.slice(ini + 1, fim);
    const designacoes = bloco.filter(
      (t) => /[A-Za-zÀ-ÿ]/.test(t) && !/^c[óo]d/i.test(t) && !/^designa/i.test(t) && !/^valor$/i.test(t)
    );
    const valores = bloco.filter((t) => isCurrency(t));
    designacoes.forEach((d, i) => {
      const v = valores[i];
      if (v === undefined) return;
      if (/seg.*social|seguran[çc]a/i.test(d) && r.ssDesconto === undefined) r.ssDesconto = toNum(v);
      if (/^irs$|reten[çc].*irs/i.test(d) && r.irsRetido === undefined) r.irsRetido = toNum(v);
      if (/subs[íi]dio.*refei/i.test(d) && r.subsidioRefeicaoTotal === undefined) r.subsidioRefeicaoTotal = toNum(v);
    });
  }

  // ── Forma de pagamento do subsídio de refeição (cartão vs. dinheiro). ──
  const idxSub = toks.findIndex((t) => /subs[íi]dio.*refei/i.test(t));
  if (idxSub >= 0) r.subsidioRefeicaoCartao = /cart[ãa]o/i.test(toks[idxSub]);

  // ── Sinalizar o que ficou por extrair (preenchimento manual). ──
  if (r.salarioBase === undefined) r.porPreencher.push("Salário base");
  if (r.remuneracaoSujeita === undefined) r.porPreencher.push("Remuneração sujeita");
  if (r.irsRetido === undefined) r.porPreencher.push("IRS retido");
  if (r.ssDesconto === undefined) r.porPreencher.push("Segurança Social");

  return r;
}

/**
 * Parser POSICIONAL (testável): reconstrói a tabela a partir das coordenadas.
 * Separa as colunas ABONOS/DESCONTOS pela maior lacuna horizontal entre valores
 * e, para cada linha (mesmo y), lê só os valores da coluna de abonos.
 */
export function parseReciboPosicional(itens: ItemPos[]): Partial<ReciboExtraido> {
  const out: Partial<ReciboExtraido> = {};
  const norm = itens.map((i) => ({ str: (i.str ?? "").trim(), x: i.x, y: i.y })).filter((i) => i.str);
  const nums = norm.filter((i) => isCurrency(i.str));
  if (nums.length < 3) return out;

  // Divisória ABONOS|DESCONTOS = maior lacuna horizontal entre posições de valores.
  const xs = [...new Set(nums.map((n) => n.x))].sort((a, b) => a - b);
  let xSplit = Infinity;
  let maxGap = 0;
  for (let i = 1; i < xs.length; i++) {
    const g = xs[i] - xs[i - 1];
    if (g > maxGap) {
      maxGap = g;
      xSplit = (xs[i] + xs[i - 1]) / 2;
    }
  }
  const limiteX = maxGap > 60 ? xSplit : Infinity; // sem 2 colunas → tudo é "abonos"
  const rowTol = 5;

  // Valores (coluna de abonos) na mesma linha de uma designação, da esquerda p/ direita.
  // Usa a ocorrência MAIS À ESQUERDA da designação (a tabela de abonos é a da esquerda),
  // evitando apanhar a linha homónima do lado dos descontos (ex.: "Subsídio … (D)").
  const colunas = (re: RegExp): number[] | undefined => {
    const cands = norm.filter((i) => re.test(i.str));
    if (!cands.length) return undefined;
    const anchor = cands.reduce((a, b) => (b.x < a.x ? b : a));
    const linha = nums
      .filter((n) => Math.abs(n.y - anchor.y) <= rowTol && n.x > anchor.x && n.x < limiteX)
      .sort((a, b) => a.x - b.x)
      .map((n) => toNum(n.str));
    return linha.length ? linha : undefined;
  };

  const sub = colunas(/subs[íi]dio.*refei/i);
  if (sub && sub.length >= 3) {
    // [Quant. · Valor Uni · Valor] → dias, valor/dia, total.
    out.subsidioRefeicaoDias = Math.round(sub[0]);
    out.subsidioRefeicaoDia = sub[1];
    out.subsidioRefeicaoTotal = sub[sub.length - 1];
  } else if (sub && sub.length === 1) {
    out.subsidioRefeicaoTotal = sub[0];
  }

  const fer = colunas(/feriado/i);
  if (fer) out.feriados = fer[fer.length - 1];

  const pre = colunas(/pr[ée]mio/i);
  if (pre) out.premio = pre[pre.length - 1];

  return out;
}

/**
 * Combina o parser de texto (âncoras robustas) com o posicional (linhas),
 * validando os valores posicionais antes de os aceitar — nunca devolve números
 * implausíveis.
 */
export function combinarRecibo(base: ReciboExtraido, pos: Partial<ReciboExtraido>): ReciboExtraido {
  const r: ReciboExtraido = { ...base };
  const sujeita = r.remuneracaoSujeita;
  const salBase = r.salarioBase ?? 0;
  // Margem onde cabem os rendimentos sujeitos além do salário (feriados + prémio).
  const margem = sujeita !== undefined ? Math.max(0, sujeita - salBase) : Infinity;

  // Subsídio de refeição: aceitar dia/dias só se o produto bater com o total
  // conhecido (forte validação), e se forem plausíveis.
  const dia = pos.subsidioRefeicaoDia;
  const dias = pos.subsidioRefeicaoDias;
  if (dia !== undefined && dias !== undefined && dia > 0 && dia <= 30 && dias >= 1 && dias <= 31) {
    const totalPos = Math.round(dia * dias * 100) / 100;
    const totalConhecido = r.subsidioRefeicaoTotal ?? pos.subsidioRefeicaoTotal;
    if (totalConhecido === undefined || Math.abs(totalPos - totalConhecido) <= 1) {
      r.subsidioRefeicaoDia = dia;
      r.subsidioRefeicaoDias = dias;
      r.subsidioRefeicaoTotal = totalConhecido ?? totalPos;
    }
  } else if (
    r.subsidioRefeicaoTotal === undefined &&
    pos.subsidioRefeicaoTotal !== undefined &&
    pos.subsidioRefeicaoTotal > 0 &&
    pos.subsidioRefeicaoTotal < 3000
  ) {
    r.subsidioRefeicaoTotal = pos.subsidioRefeicaoTotal;
  }

  // Prémio: aceitar só se positivo e couber na diferença sujeita − base.
  if (pos.premio !== undefined && pos.premio > 0 && pos.premio <= margem + 1) {
    r.premio = pos.premio;
  }
  // Feriados: idem (informativo; a UI deriva o resto da sujeita).
  if (pos.feriados !== undefined && pos.feriados > 0 && pos.feriados <= margem + 1) {
    r.feriados = pos.feriados;
  }

  return r;
}

/**
 * Lê o PDF no browser (pdf.js) e extrai os dados. O ficheiro nunca sai do
 * dispositivo. Lança em caso de PDF inválido/sem texto (scan) — a UI trata.
 *
 * Pipeline (determinístico, sem IA):
 *   1) recolhe cada fragmento com a sua GEOMETRIA (caixa delimitadora já
 *      normalizada para a rotação da página via viewport.transform);
 *   2) `parseReciboTexto` extrai âncoras robustas (base, sujeita+IRS, SS, total);
 *   3) `analisarLayout` reconstrói a tabela ABONOS|DESCONTOS e VALIDA em malha
 *      fechada (Σabonos = ilíquido). Só se validar é que as rubricas detalhadas
 *      (subsídio dia×dias, prémio, feriados) são consideradas fiáveis;
 *   4) caso não valide, recorre ao parser posicional com validações de sanidade.
 */
export async function extrairReciboPDF(file: File): Promise<ReciboExtraido> {
  const pdfjs = await import("pdfjs-dist");
  // Worker servido na mesma origem (copiado para /public por scripts/copy-pdf-worker.mjs).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const strings: string[] = [];
  const posicoes: ItemPos[] = [];
  const geos: ItemGeo[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    // viewport.transform mapeia o espaço do PDF (y-up) para o ecrã (y-down) e
    // já aplica a rotação /Rotate da página — coordenadas consistentes.
    const viewport = page.getViewport({ scale: 1 });
    const vt = viewport.transform;
    const aplicar = (x: number, y: number): [number, number] => [
      vt[0] * x + vt[2] * y + vt[4],
      vt[1] * x + vt[3] * y + vt[5],
    ];
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if (!("str" in item) || !item.str) continue;
      strings.push(item.str);
      const tr = item.transform;
      if (!Array.isArray(tr) || tr.length < 6) continue;
      const e = tr[4];
      const f = tr[5];
      const w = item.width ?? 0;
      const h = item.height ?? 0;
      // Caixa delimitadora pela transformação das 4 esquinas (corrige rotação/escala).
      const cantos = [aplicar(e, f), aplicar(e + w, f), aplicar(e, f + h), aplicar(e + w, f + h)];
      const xs = cantos.map((c) => c[0]);
      const ys = cantos.map((c) => c[1]);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      posicoes.push({ str: item.str, x: left, y: top });
      geos.push({ str: item.str, left, top, right, bottom });
    }
  }
  if (strings.join("").trim().length < 20) {
    throw new Error("PDF sem texto reconhecível (provavelmente digitalizado).");
  }

  const base = parseReciboTexto(strings);

  // Motor de layout determinístico, validado em malha fechada.
  try {
    const analise = analisarLayout(geos);
    if (analise.abonosValidados) {
      const rub = extrairRubricas(analise);
      if (rub.salarioBase !== undefined && base.salarioBase === undefined) base.salarioBase = rub.salarioBase;
      if (rub.subsidioRefeicaoTotal !== undefined) {
        base.subsidioRefeicaoTotal = rub.subsidioRefeicaoTotal;
        if (rub.subsidioRefeicaoDia !== undefined) base.subsidioRefeicaoDia = rub.subsidioRefeicaoDia;
        if (rub.subsidioRefeicaoDias !== undefined) base.subsidioRefeicaoDias = rub.subsidioRefeicaoDias;
        if (rub.subsidioRefeicaoCartao !== undefined) base.subsidioRefeicaoCartao = rub.subsidioRefeicaoCartao;
      }
      if (rub.premio !== undefined) base.premio = rub.premio;
      if (rub.feriados !== undefined) base.feriados = rub.feriados;
      if (base.ssDesconto === undefined && rub.ssDesconto !== undefined) base.ssDesconto = rub.ssDesconto;
      if (base.irsRetido === undefined && rub.irsRetido !== undefined) base.irsRetido = rub.irsRetido;
      return base;
    }
  } catch {
    /* layout é best-effort — se falhar, usa o parser posicional abaixo */
  }

  // Recurso: parser posicional simples com validações de sanidade.
  let pos: Partial<ReciboExtraido> = {};
  try {
    pos = parseReciboPosicional(posicoes);
  } catch {
    /* ignora — usa só as âncoras de texto */
  }
  return combinarRecibo(base, pos);
}
