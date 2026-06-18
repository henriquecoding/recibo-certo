// ─────────────────────────────────────────────────────────────────────
//  Motor de layout DETERMINÍSTICO para recibos de vencimento (sem IA).
//  ---------------------------------------------------------------------
//  Reconstrói a tabela do recibo a partir da GEOMETRIA (coordenadas de cada
//  fragmento de texto), em vez de assumir uma leitura linear de cima para
//  baixo. Recibos têm tipicamente duas tabelas lado a lado (ABONOS | DESCONTOS)
//  e descrições que ocupam várias linhas — uma leitura linear funde colunas e
//  troca valores. Aqui:
//    1) agrupam-se fragmentos em LINHAS por tolerância vertical (δY);
//    2) deteta-se a calha (gutter) que separa ABONOS de DESCONTOS;
//    3) cada linha é segmentada por lado e em [Cód · Designação · Quant · Valor
//       Uni · Valor];
//    4) descrições sem valor são associadas à linha anterior (multi-linha);
//    5) os totais (ILÍQUIDO/DESCONTOS/LÍQUIDO) são lidos por lado;
//    6) VALIDAÇÃO em malha fechada: Σabonos = ilíquido, Σdescontos = descontos,
//       líquido = ilíquido − descontos (tolerância ε = 0,02 €). Só dados que
//       reconciliam são considerados fiáveis.
//
//  Funções puras e testáveis (recebem itens já normalizados em y-down).
// ─────────────────────────────────────────────────────────────────────

/** Fragmento de texto com a sua caixa delimitadora (y-down, já normalizado). */
export interface ItemGeo {
  str: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LinhaTabela {
  codigo?: string;
  descricao: string;
  quant?: number;
  valorUni?: number;
  valor: number;
}

export interface AnaliseLayout {
  abonos: LinhaTabela[];
  descontos: LinhaTabela[];
  totalIliquido?: number;
  totalDescontos?: number;
  totalLiquido?: number;
  /** Σabonos ≈ totalIliquido (malha fechada dos abonos). */
  abonosValidados: boolean;
  /** Σdescontos ≈ totalDescontos. */
  descontosValidados: boolean;
  /** ilíquido − descontos ≈ líquido. */
  liquidoValidado: boolean;
  avisos: string[];
}

/** Rubricas conhecidas extraídas do layout (mapeáveis ao simulador). */
export interface LayoutRubricas {
  salarioBase?: number;
  subsidioRefeicaoDia?: number;
  subsidioRefeicaoDias?: number;
  subsidioRefeicaoTotal?: number;
  subsidioRefeicaoCartao?: boolean;
  feriados?: number;
  premio?: number;
  ssDesconto?: number;
  irsRetido?: number;
}

const EPS = 0.02; // tolerância de arredondamento (€)
const reCur = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;

export function isCurrencyTok(t: string): boolean {
  return reCur.test((t ?? "").trim());
}
export function toNumber(t: string): number {
  const n = parseFloat((t ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

const cx = (i: ItemGeo) => (i.left + i.right) / 2;
const cy = (i: ItemGeo) => (i.top + i.bottom) / 2;

// ── 1) Agrupamento de linhas por tolerância vertical (δY dinâmico). ──────────
function agruparLinhas(itens: ItemGeo[]): ItemGeo[][] {
  const limpos = itens.filter((i) => (i.str ?? "").trim().length > 0);
  if (!limpos.length) return [];
  const alturas = limpos.map((i) => i.bottom - i.top).filter((h) => h > 0).sort((a, b) => a - b);
  const medH = alturas.length ? alturas[Math.floor(alturas.length / 2)] : 8;
  const tol = Math.min(6, Math.max(3, medH * 0.6));

  const ordenados = [...limpos].sort((a, b) => cy(a) - cy(b) || a.left - b.left);
  const linhas: ItemGeo[][] = [];
  let mediaY = NaN;
  for (const it of ordenados) {
    const y = cy(it);
    const grupo = linhas[linhas.length - 1];
    if (grupo && Math.abs(y - mediaY) <= tol) {
      grupo.push(it);
      mediaY = grupo.reduce((s, g) => s + cy(g), 0) / grupo.length;
    } else {
      linhas.push([it]);
      mediaY = y;
    }
  }
  linhas.forEach((l) => l.sort((a, b) => a.left - b.left));
  return linhas;
}

// ── 2) Divisória que separa as tabelas ABONOS | DESCONTOS. ───────────────────
//  Usa SINAIS DE CABEÇALHO (fiáveis), não uma calha qualquer: a lacuna entre a
//  descrição e a coluna de valores DENTRO de uma tabela não deve ser confundida
//  com a divisória entre as duas tabelas. Se não houver duas tabelas, devolve
//  Infinity (recibo de coluna única) e tudo é tratado como abonos.
function detetarSplitX(itens: ItemGeo[]): number {
  // 1) Cabeçalho "DESCONTOS" → início da coluna direita.
  const desc = itens.find((i) => /^descontos$/i.test(i.str.trim()));
  if (desc) return desc.left - 2;

  // 2) Segunda ocorrência dos cabeçalhos "Designação"/"Cód." (2.ª tabela).
  const heads = itens
    .filter((i) => /^(designa|c[óo]d)/i.test(i.str.trim()))
    .sort((a, b) => a.left - b.left);
  for (let k = 1; k < heads.length; k++) {
    if (heads[k].left - heads[k - 1].left > 120) return heads[k].left - 2;
  }

  // 3) Sem evidência de duas tabelas → coluna única.
  return Infinity;
}

function ultimaMoeda(itens: ItemGeo[]): number | undefined {
  let v: number | undefined;
  for (const i of [...itens].sort((a, b) => a.left - b.left)) {
    if (isCurrencyTok(i.str)) v = toNumber(i.str);
  }
  return v;
}

// ── 3/4) Construir uma linha de tabela a partir de um lado. ──────────────────
function construirLinha(itens: ItemGeo[], isAbono: boolean): LinhaTabela | "continuacao" | null {
  if (!itens.length) return null;
  const ordenados = [...itens].sort((a, b) => a.left - b.left);
  const nums = ordenados.filter((i) => isCurrencyTok(i.str)).map((i) => toNumber(i.str));
  const textos = ordenados.filter((i) => !isCurrencyTok(i.str)).map((i) => i.str.trim()).filter(Boolean);

  let codigo: string | undefined;
  let descTokens = textos;
  if (textos.length && /^\d{1,4}$/.test(textos[0])) {
    codigo = textos[0];
    descTokens = textos.slice(1);
  }
  const descricao = descTokens
    .filter((t) => !/^(c[óo]d|designa|quant|valor)/i.test(t))
    .join(" ")
    .trim();

  if (nums.length === 0) {
    // Sem valores nem código → possível continuação de descrição.
    if (!codigo && descricao) return "continuacao";
    return null;
  }

  const valor = nums[nums.length - 1];
  const linha: LinhaTabela = { codigo, descricao, valor };
  if (isAbono && nums.length >= 3) {
    linha.quant = nums[0];
    linha.valorUni = nums[1];
  }
  return linha;
}

// ── Motor principal. ─────────────────────────────────────────────────────────
export function analisarLayout(itens: ItemGeo[]): AnaliseLayout {
  const avisos: string[] = [];
  const res: AnaliseLayout = {
    abonos: [],
    descontos: [],
    abonosValidados: false,
    descontosValidados: false,
    liquidoValidado: false,
    avisos,
  };
  const linhas = agruparLinhas(itens);
  if (linhas.length < 3) return res;

  const splitX = detetarSplitX(itens);

  for (const linha of linhas) {
    const texto = linha.map((i) => i.str).join(" ");
    const temIliquido = /il[íi]quido/i.test(texto);
    const temTotalDescontos = /total/i.test(texto) && /descontos/i.test(texto);
    const temLiquido = /l[íi]quido/i.test(texto) && !temIliquido;

    const esquerda = linha.filter((i) => cx(i) < splitX);
    const direita = linha.filter((i) => cx(i) >= splitX);

    if (temIliquido || temTotalDescontos || temLiquido) {
      if (temIliquido) res.totalIliquido = ultimaMoeda(esquerda) ?? ultimaMoeda(linha);
      if (temTotalDescontos) res.totalDescontos = ultimaMoeda(direita) ?? ultimaMoeda(linha);
      if (temLiquido) res.totalLiquido = ultimaMoeda(linha);
      continue; // linhas de total não são linhas de dados
    }

    const la = construirLinha(esquerda, true);
    if (la === "continuacao" && res.abonos.length) {
      res.abonos[res.abonos.length - 1].descricao += " " + esquerda.map((i) => i.str.trim()).join(" ");
    } else if (la && la !== "continuacao") {
      res.abonos.push(la);
    }

    const ld = construirLinha(direita, false);
    if (ld === "continuacao" && res.descontos.length) {
      res.descontos[res.descontos.length - 1].descricao += " " + direita.map((i) => i.str.trim()).join(" ");
    } else if (ld && ld !== "continuacao") {
      res.descontos.push(ld);
    }
  }

  // ── 6) Validação em malha fechada. ──
  const somaAbonos = round2(res.abonos.reduce((s, r) => s + r.valor, 0));
  const somaDescontos = round2(res.descontos.reduce((s, r) => s + r.valor, 0));
  if (res.totalIliquido !== undefined) {
    res.abonosValidados = Math.abs(somaAbonos - res.totalIliquido) <= EPS;
    if (!res.abonosValidados) avisos.push(`Abonos somam ${somaAbonos} € mas o total ilíquido é ${res.totalIliquido} €.`);
  }
  if (res.totalDescontos !== undefined) {
    res.descontosValidados = Math.abs(somaDescontos - res.totalDescontos) <= EPS;
  }
  if (res.totalIliquido !== undefined && res.totalDescontos !== undefined && res.totalLiquido !== undefined) {
    res.liquidoValidado = Math.abs(res.totalIliquido - res.totalDescontos - res.totalLiquido) <= EPS;
  }
  return res;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const RE_VENC = /\bvenc|vencimento|remunera[çc][ãa]o base/i;
const RE_SUBSIDIO = /subs[íi]dio.*(refei|alimenta)/i;
const RE_FERIADOS = /feriado/i;
const RE_PREMIO = /pr[ée]mio/i;
const RE_SEGSOCIAL = /seg.*social|seguran[çc]a\s*social/i;
const RE_IRS = /\birs\b|reten[çc].*irs/i;

/** Mapeia as linhas validadas para rubricas conhecidas do simulador. */
export function extrairRubricas(a: AnaliseLayout): LayoutRubricas {
  const r: LayoutRubricas = {};
  for (const linha of a.abonos) {
    const d = linha.descricao;
    if (RE_SUBSIDIO.test(d)) {
      r.subsidioRefeicaoTotal = linha.valor;
      if (linha.quant !== undefined && linha.valorUni !== undefined) {
        r.subsidioRefeicaoDias = Math.round(linha.quant);
        r.subsidioRefeicaoDia = linha.valorUni;
      }
      r.subsidioRefeicaoCartao = /cart[ãa]o/i.test(d);
    } else if (RE_FERIADOS.test(d)) {
      r.feriados = round2((r.feriados ?? 0) + linha.valor);
    } else if (RE_PREMIO.test(d)) {
      r.premio = round2((r.premio ?? 0) + linha.valor);
    } else if (RE_VENC.test(d) && r.salarioBase === undefined) {
      r.salarioBase = linha.valor;
    }
  }
  for (const linha of a.descontos) {
    const d = linha.descricao;
    if (RE_SEGSOCIAL.test(d) && r.ssDesconto === undefined) r.ssDesconto = linha.valor;
    else if (RE_IRS.test(d) && r.irsRetido === undefined) r.irsRetido = linha.valor;
  }
  return r;
}
