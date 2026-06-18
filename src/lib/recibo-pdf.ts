// ─────────────────────────────────────────────────────────────────────
//  Extração de dados de um recibo de vencimento em PDF — 100% no browser.
//  ---------------------------------------------------------------------
//  PRIVACIDADE: o ficheiro é lido na memória do browser (pdf.js) e NUNCA é
//  enviado para nenhum servidor nem guardado. Esta função extrai apenas o
//  necessário para preencher o simulador/auditoria e IGNORA de propósito
//  dados sensíveis: morada, NIB/IBAN, nº de contribuinte do trabalhador,
//  nº de beneficiário da Segurança Social e dados de seguro. O único dado
//  "mais sensível" extraído é o da EMPRESA (NIF, nome) e a função.
//  A extração é best-effort: o que não for reconhecido fica para
//  preenchimento manual (o utilizador confirma sempre antes de aplicar).
// ─────────────────────────────────────────────────────────────────────

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
  /** Nº de dias de subsídio de refeição (quantidade da linha de abono). */
  subsidioRefeicaoDias?: number;
  /** Subsídio de refeição — total do mês (abono). */
  subsidioRefeicaoTotal?: number;
  /** Subsídio de refeição pago em cartão/vale. */
  subsidioRefeicaoCartao?: boolean;
  /** Feriados trabalhados pagos no mês (sujeito a IRS/SS). */
  feriados?: number;
  /** Prémio pago no mês (ex.: desempenho). */
  premio?: number;
  /** Desconto por faltas no mês (informativo — já refletido na rem. sujeita). */
  faltasValor?: number;
  /** Campos que não foi possível extrair (para a UI sinalizar). */
  porPreencher: string[];
}

const MESES = [
  "janeiro", "fevereiro", "março", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
// "março" e "marco" mapeiam ambos para o índice 2.
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
 * Colunas numéricas de uma linha de abono/desconto a partir do índice da
 * designação: numa tabela [Cód · Designação · Quant. · Valor Uni · Valor], devolve
 * os valores em ordem. Pára na próxima linha (código inteiro), próxima designação
 * (texto) ou em "TOTAL". Ignora texto que ainda faça parte da designação.
 */
function colunasLinha(toks: string[], idx: number, janela = 10): number[] {
  const out: number[] = [];
  let comecou = false;
  for (let i = idx + 1; i < Math.min(toks.length, idx + 1 + janela); i++) {
    const t = toks[i];
    if (isCurrency(t)) {
      out.push(toNum(t));
      comecou = true;
      continue;
    }
    if (!comecou) {
      if (/^total/i.test(t)) break;
      continue; // ainda na designação (pode estar partida em vários tokens)
    }
    if (/^\d{1,4}$/.test(t) || /[A-Za-zÀ-ÿ]/.test(t) || /^total/i.test(t)) break;
  }
  return out;
}

/** Colunas da primeira linha cuja designação corresponde ao padrão. */
function colunasPorDesignacao(toks: string[], re: RegExp): number[] | undefined {
  const idx = toks.findIndex((t) => re.test(t));
  if (idx < 0) return undefined;
  const cols = colunasLinha(toks, idx);
  return cols.length ? cols : undefined;
}

/**
 * Parser puro (testável sem browser). Recebe os "itens" de texto do pdf.js.
 */
export function parseReciboTexto(itens: string[]): ReciboExtraido {
  const toks = itens.map((t) => (t ?? "").replace(/ /g, " ").trim()).filter(Boolean);
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
      // o valor retido é a moeda seguinte ao sujeito
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

  // ── Subsídio de refeição: linha de abono [dias · valor/dia · total]. ──
  const idxSub = toks.findIndex((t) => /subs[íi]dio.*refei/i.test(t));
  if (idxSub >= 0) {
    r.subsidioRefeicaoCartao = /cart[ãa]o/i.test(toks[idxSub]);
    const cols = colunasLinha(toks, idxSub);
    if (cols.length >= 3) {
      // [Quant. · Valor Uni · Valor] → dias, valor/dia, total.
      r.subsidioRefeicaoDias = Math.round(cols[0]);
      r.subsidioRefeicaoDia = cols[1];
      if (r.subsidioRefeicaoTotal === undefined) r.subsidioRefeicaoTotal = cols[cols.length - 1];
    } else if (cols.length >= 1 && r.subsidioRefeicaoTotal === undefined) {
      r.subsidioRefeicaoTotal = cols[cols.length - 1];
    }
  }

  // ── Feriados trabalhados e prémio (linhas de abono) — o "Valor" é a última coluna. ──
  const colsFeriados = colunasPorDesignacao(toks, /feriado/i);
  if (colsFeriados) r.feriados = colsFeriados[colsFeriados.length - 1];

  const colsPremio = colunasPorDesignacao(toks, /pr[ée]mio/i);
  if (colsPremio) r.premio = colsPremio[colsPremio.length - 1];

  // ── Faltas (desconto) — informativo. ──
  const colsFaltas = colunasPorDesignacao(toks, /\bfaltas?\b/i);
  if (colsFaltas) r.faltasValor = colsFaltas[colsFaltas.length - 1];

  // ── Reconstrução da remuneração sujeita se a âncora da taxa falhar. ──
  if (r.remuneracaoSujeita === undefined && r.salarioBase !== undefined) {
    const soma = r.salarioBase + (r.feriados ?? 0) + (r.premio ?? 0);
    if (soma > r.salarioBase) r.remuneracaoSujeita = Math.round(soma * 100) / 100;
  }

  // ── Sinalizar o que ficou por extrair (preenchimento manual). ──
  if (r.salarioBase === undefined) r.porPreencher.push("Salário base");
  if (r.remuneracaoSujeita === undefined) r.porPreencher.push("Remuneração sujeita");
  if (r.irsRetido === undefined) r.porPreencher.push("IRS retido");
  if (r.ssDesconto === undefined) r.porPreencher.push("Segurança Social");

  return r;
}

/**
 * Lê o PDF no browser (pdf.js) e extrai os dados. O ficheiro nunca sai do
 * dispositivo. Lança em caso de PDF inválido/sem texto (scan) — a UI trata.
 */
export async function extrairReciboPDF(file: File): Promise<ReciboExtraido> {
  const pdfjs = await import("pdfjs-dist");
  // Worker servido na mesma origem (copiado para /public por scripts/copy-pdf-worker.mjs).
  // Sem CDN externo — o ficheiro nunca sai do dispositivo.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const itens: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if ("str" in item && item.str) itens.push(item.str);
    }
  }
  if (itens.join("").trim().length < 20) {
    throw new Error("PDF sem texto reconhecível (provavelmente digitalizado).");
  }
  return parseReciboTexto(itens);
}
