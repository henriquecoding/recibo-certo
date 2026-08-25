// ─────────────────────────────────────────────────────────────────────
//  Motor do calendário fiscal do simulador.
//
//  Existia antes dentro de `TimelineFiscal.tsx`, em constantes escritas à
//  mão — e estava errado em três sítios que custam dinheiro a quem confia
//  nele:
//
//  1. O IVA do 2.º trimestre caía em AGOSTO. O Art. 41.º n.º 10 do CIVA
//     prolonga esse prazo até setembro. `src/lib/prazos.ts` já tinha a regra
//     certa e um teste a fixá-la — o simulador é que não a lia.
//  2. O acerto de IRS caía em JUNHO. Junho é o fim do prazo de ENTREGA da
//     declaração (Art. 60.º); o dinheiro só se move até 31 de agosto
//     (Art. 97.º n.º 1 al. a)), e o reembolso é restituído no mesmo prazo
//     (Art. 96.º). Avisar para junho manda reservar dois meses cedo demais e,
//     pior, deixa quem tem de pagar sem aviso no mês em que a conta chega.
//  3. Todos os prazos diziam «até dia 20». O IVA paga-se ao dia 25
//     (Art. 27.º n.º 1), a declaração trimestral da Segurança Social vai ao
//     último dia do mês, e o dia 20 salta para o dia útil seguinte quando cai
//     a um fim de semana ou feriado — em 2026 os pagamentos por conta são a
//     21 de setembro e a 21 de dezembro, não a 20.
//
//  A correção não é reescrever melhores constantes: é deixar de as ter. Este
//  módulo compõe o calendário a partir de `gerarPrazos(ano)`, que deriva cada
//  data da lei, ajusta fins de semana e feriados (Art. 57.º-A da LGT) e traz
//  base legal, fonte e data de revisão agarradas. Aqui só se acrescenta o que
//  o motor de prazos não pode saber: quanto dinheiro passa em cada marco.
//
//  Duas coisas que este ficheiro trata como inegociáveis:
//
//  • DECLARAR e PAGAR são movimentos distintos. Um mês sem pagamentos pode
//    ter obrigações — julho tem a declaração trimestral à Segurança Social —
//    e escrever-lhe «Sem obrigações» é uma falsidade útil a ninguém.
//  • Nenhum movimento chega ao ecrã sem `base`, `fonte` e `revistoEm`. O tipo
//    não tem caminho para o evitar.
// ─────────────────────────────────────────────────────────────────────

import {
  gerarPrazos,
  FONTES_PRAZOS,
  PRAZOS_REVISTOS_EM,
  type Prazo,
  type NaturezaPrazo,
} from "@/lib/prazos";

/**
 * Famílias do calendário. Separa-se `ppc` de `irs` porque são duas saídas
 * com naturezas diferentes — a prestação por conta é adiantamento, o acerto
 * é ajuste de contas — e quem lê o calendário precisa de as distinguir a
 * cores. Na lei ambos são IRS.
 */
export type TipoMovimento = "ss" | "iva" | "irs" | "ppc";

/** Para onde vai o dinheiro. As declarações não movem nenhum. */
export type SentidoMovimento = "saida" | "entrada" | "neutro";

export type FontePrazo = keyof typeof FONTES_PRAZOS;

export interface MovimentoFiscal {
  /** Único e estável dentro do ano: serve de `key` e de âncora nos testes. */
  id: string;
  tipo: TipoMovimento;
  natureza: NaturezaPrazo;
  sentido: SentidoMovimento;
  /** Rótulo curto, para a grelha de meses. */
  rotulo: string;
  /** Título completo, para o painel de detalhe. */
  titulo: string;
  descricao: string;
  /** Zero nas declarações — não há dinheiro a mexer. */
  valor: number;
  /** Data-limite ISO, já transferida para dia útil quando era preciso. */
  data: string;
  /** Data-limite antes do ajuste, quando houve ajuste. */
  dataBase?: string;
  base: string;
  fonte: FontePrazo;
  revistoEm: string;
}

export interface MesCalendario {
  /** 0 = janeiro. */
  indice: number;
  /** "Jan" — o rótulo da grelha. */
  nome: string;
  /** "janeiro" — para leitores de ecrã e para o painel. */
  nomeLongo: string;
  movimentos: MovimentoFiscal[];
  saidas: number;
  entradas: number;
  /** Movimentos que mexem dinheiro (exclui declarações). */
  temDinheiro: boolean;
}

export interface TotaisCalendario {
  ss: number;
  iva: number;
  ppc: number;
  /** Acerto a pagar. O reembolso vive em `reembolso`. */
  irs: number;
  reembolso: number;
  saidas: number;
  entradas: number;
  /** `saidas − entradas`: o que o ano custa mesmo. */
  liquido: number;
}

export type RegimeIVACalendario = "isento" | "normal-trimestral" | "normal-mensal";

/** Os pagamentos por conta, na forma mínima que o calendário precisa. */
export interface PagamentosContaCalendario {
  total: number;
  prestacao: number;
  /** Meses de vencimento, 1 = janeiro. */
  meses: number[];
}

export interface CalendarioFiscalInput {
  ano: number;
  /** Contribuição mensal para a Segurança Social. */
  ssMensal: number;
  /**
   * Isenção contributiva do primeiro ano de atividade. Dispensa o
   * PAGAMENTO; a declaração trimestral mantém-se (Art. 151.º do CRC).
   */
  isencaoSS: boolean;
  /**
   * Acerto anual de IRS na convenção do motor: positivo é reembolso a
   * receber, negativo é imposto a pagar.
   */
  acertoIRS: number;
  regimeIVA: RegimeIVACalendario;
  /** IVA liquidado no ano inteiro, repartido pelos períodos do regime. */
  ivaAnual: number;
  pagamentosConta?: PagamentosContaCalendario;
}

export interface CalendarioFiscal {
  ano: number;
  meses: MesCalendario[];
  totais: TotaisCalendario;
  /** Todos os movimentos do ano, por data. */
  movimentos: MovimentoFiscal[];
  regimeIVA: RegimeIVACalendario;
  /** Data em que as regras de prazo foram conferidas contra as fontes. */
  revistoEm: string;
}

export const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

export const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/**
 * `corAro` desenha o mesmo ponto em contorno, para os meses em que a
 * categoria só traz papelada: cheio = dinheiro a mexer, contorno = só
 * declaração. Sem isto, um ponto vermelho em junho — que é a entrega da
 * Modelo 3, não um pagamento — lia-se como imposto a sair.
 */
export const META_MOVIMENTO: Record<
  TipoMovimento,
  { legenda: string; nome: string; corDot: string; corAro: string; corChip: string }
> = {
  ss: {
    legenda: "SS",
    nome: "Segurança Social",
    corDot: "bg-amber-400",
    corAro: "ring-amber-400/70",
    corChip:
      "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800/40",
  },
  iva: {
    legenda: "IVA",
    nome: "IVA",
    corDot: "bg-blue-400",
    corAro: "ring-blue-400/70",
    corChip:
      "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800/40",
  },
  irs: {
    legenda: "IRS",
    nome: "IRS",
    corDot: "bg-red-400",
    corAro: "ring-red-400/70",
    corChip:
      "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-800/40",
  },
  ppc: {
    legenda: "Pag. conta",
    nome: "Pagamentos por conta",
    corDot: "bg-violet-400",
    corAro: "ring-violet-400/70",
    corChip:
      "bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-800/40",
  },
};

/** Chip de uma ENTRADA — o reembolso é o único movimento a favor. */
export const CHIP_ENTRADA =
  "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800/40";
export const DOT_ENTRADA = "bg-emerald-400";

// ─── Utilitários de data ───────────────────────────────────────────────

/** Índice do mês (0–11) de uma data ISO, sem passar por `Date` nem por fusos. */
export function mesDaData(dataIso: string): number {
  return Number(dataIso.slice(5, 7)) - 1;
}

/** Dia do mês de uma data ISO. */
export function diaDaData(dataIso: string): number {
  return Number(dataIso.slice(8, 10));
}

/** "31 ago" — o formato curto da grelha e das linhas de detalhe. */
export function dataCurta(dataIso: string): string {
  return `${diaDaData(dataIso)} ${MESES_CURTOS[mesDaData(dataIso)].toLowerCase()}`;
}

/** "31 de agosto de 2026" — o formato do painel de detalhe. */
export function dataPorExtenso(dataIso: string): string {
  return `${diaDaData(dataIso)} de ${MESES_LONGOS[mesDaData(dataIso)]} de ${dataIso.slice(0, 4)}`;
}

// ─── Construção ────────────────────────────────────────────────────────

/** Indexa os prazos do ano por id, para os buscar sem varrer a lista. */
function indexarPrazos(ano: number): Map<string, Prazo> {
  return new Map(gerarPrazos(ano).map((p) => [p.id, p]));
}

/** Copia de um `Prazo` tudo o que é proveniência, sem deixar escapar nada. */
function proveniencia(p: Prazo): Pick<MovimentoFiscal, "data" | "dataBase" | "base" | "fonte" | "revistoEm"> {
  return {
    data: p.data,
    ...(p.dataBase ? { dataBase: p.dataBase } : {}),
    base: p.base,
    fonte: p.fonte as FontePrazo,
    revistoEm: p.revistoEm,
  };
}

const arred = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/**
 * O calendário de um ano: cada marco legal com o dinheiro que lhe passa pela
 * frente. As datas nunca são inventadas aqui — vêm todas de `gerarPrazos`.
 */
export function construirCalendarioFiscal(input: CalendarioFiscalInput): CalendarioFiscal {
  const { ano, isencaoSS, acertoIRS, regimeIVA, pagamentosConta } = input;
  const ssMensal = Math.max(0, arred(input.ssMensal));
  const ivaAnual = Math.max(0, arred(input.ivaAnual));

  const prazos = indexarPrazos(ano);
  const movimentos: MovimentoFiscal[] = [];

  const usar = (id: string, monta: (p: Prazo) => MovimentoFiscal | null) => {
    const p = prazos.get(id);
    if (!p) return;
    const m = monta(p);
    if (m) movimentos.push(m);
  };

  // ── Segurança Social ────────────────────────────────────────────────
  // A declaração trimestral existe mesmo durante a isenção do primeiro ano:
  // declara-se, não se paga. É o que enche os meses que o calendário antigo
  // dava como vazios.
  ([1, 4, 7, 10] as const).forEach((mes) => {
    usar(`ss-decl-${ano}-${mes}`, (p) => ({
      id: p.id,
      tipo: "ss",
      natureza: "declaracao",
      sentido: "neutro",
      rotulo: "Declaração SS",
      titulo: p.titulo,
      descricao: p.descricao,
      valor: 0,
      ...proveniencia(p),
    }));
  });

  if (!isencaoSS && ssMensal > 0) {
    for (let mes = 1; mes <= 12; mes++) {
      usar(`ss-pag-${ano}-${mes}`, (p) => ({
        id: p.id,
        tipo: "ss",
        natureza: "pagamento",
        sentido: "saida",
        rotulo: "SS",
        titulo: p.titulo,
        descricao: p.descricao,
        valor: ssMensal,
        ...proveniencia(p),
      }));
    }
  }

  // ── IVA ─────────────────────────────────────────────────────────────
  // Entregar a declaração periódica e pagar o imposto são dois prazos — dia
  // 20 e dia 25 — e o calendário mostra os dois. O 2.º trimestre entrega-se
  // em setembro, não em agosto: é a regra que este ficheiro existe para não
  // voltar a perder.
  if (regimeIVA !== "isento") {
    const trimestral = regimeIVA === "normal-trimestral";
    const mesesIVA = trimestral ? [2, 5, 9, 11] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const sufixo = trimestral ? "tri" : "mes";
    const parcela = arred(ivaAnual / mesesIVA.length);

    mesesIVA.forEach((mes) => {
      usar(`iva-decl-${sufixo}-${ano}-${mes}`, (p) => ({
        id: p.id,
        tipo: "iva",
        natureza: "declaracao",
        sentido: "neutro",
        rotulo: "Declaração IVA",
        titulo: p.titulo,
        descricao: p.descricao,
        valor: 0,
        ...proveniencia(p),
      }));

      if (parcela <= 0) return;
      usar(`iva-pag-${sufixo}-${ano}-${mes}`, (p) => ({
        id: p.id,
        tipo: "iva",
        natureza: "pagamento",
        sentido: "saida",
        rotulo: "IVA",
        titulo: p.titulo,
        descricao: p.descricao,
        valor: parcela,
        ...proveniencia(p),
      }));
    });
  }

  // ── IRS — pagamentos por conta ──────────────────────────────────────
  const prestacao = arred(pagamentosConta?.prestacao ?? 0);
  if (prestacao > 0) {
    (pagamentosConta?.meses ?? []).forEach((mes) => {
      usar(`irs-pc-${ano}-${mes}`, (p) => ({
        id: p.id,
        tipo: "ppc",
        natureza: "pagamento",
        sentido: "saida",
        rotulo: "Pag. conta",
        titulo: p.titulo,
        descricao: p.descricao,
        valor: prestacao,
        ...proveniencia(p),
      }));
    });
  }

  // ── IRS — declaração anual ──────────────────────────────────────────
  usar(`irs-decl-${ano}`, (p) => ({
    id: p.id,
    tipo: "irs",
    natureza: "declaracao",
    sentido: "neutro",
    rotulo: "Declaração IRS",
    titulo: p.titulo,
    descricao: p.descricao,
    valor: 0,
    ...proveniencia(p),
  }));

  // ── IRS — acerto ────────────────────────────────────────────────────
  // Agosto, não junho. E o reembolso partilha a data com o pagamento, por
  // remissão do Art. 96.º para os prazos do Art. 97.º — muda o sentido e a
  // base legal, não o marco.
  const irsAPagar = acertoIRS < 0 ? arred(Math.abs(acertoIRS)) : 0;
  const irsAReceber = acertoIRS > 0 ? arred(acertoIRS) : 0;
  const notaDoAno =
    "O acerto é apurado na declaração do ano anterior, entregue até 30 de junho; a nota de liquidação chega até 31 de julho (Art. 77.º). O valor mostrado é o que resulta de um ano igual ao que simulaste.";

  if (irsAPagar > 0) {
    usar(`irs-pag-${ano}`, (p) => ({
      id: p.id,
      tipo: "irs",
      natureza: "pagamento",
      sentido: "saida",
      rotulo: "Acerto IRS",
      titulo: "Acerto de IRS a pagar",
      descricao: `Data-limite do pagamento do imposto apurado na liquidação. ${notaDoAno}`,
      valor: irsAPagar,
      ...proveniencia(p),
    }));
  }

  if (irsAReceber > 0) {
    usar(`irs-pag-${ano}`, (p) => ({
      // O reembolso é um movimento próprio e não pode partilhar o `id` do
      // prazo: seriam duas linhas com a mesma `key`.
      id: `irs-reembolso-${ano}`,
      tipo: "irs",
      natureza: "pagamento",
      sentido: "entrada",
      rotulo: "Reembolso",
      titulo: "Reembolso de IRS",
      descricao: `Data-limite da restituição: a diferença a teu favor é devolvida até ao termo do prazo do Art. 97.º. ${notaDoAno}`,
      valor: irsAReceber,
      ...proveniencia(p),
      base: "Art. 96.º do CIRS (remete para os prazos do Art. 97.º)",
      fonte: "cirs96",
    }));
  }

  movimentos.sort(
    (a, b) => a.data.localeCompare(b.data) || ordemNatureza(a) - ordemNatureza(b) || a.id.localeCompare(b.id),
  );

  // ── Agregação por mês ───────────────────────────────────────────────
  const meses: MesCalendario[] = MESES_CURTOS.map((nome, indice) => ({
    indice,
    nome,
    nomeLongo: MESES_LONGOS[indice],
    movimentos: [],
    saidas: 0,
    entradas: 0,
    temDinheiro: false,
  }));

  const totais: TotaisCalendario = {
    ss: 0, iva: 0, ppc: 0, irs: 0, reembolso: 0,
    saidas: 0, entradas: 0, liquido: 0,
  };

  movimentos.forEach((m) => {
    const mes = meses[mesDaData(m.data)];
    mes.movimentos.push(m);
    if (m.sentido === "saida") {
      mes.saidas = arred(mes.saidas + m.valor);
      totais.saidas = arred(totais.saidas + m.valor);
      mes.temDinheiro = true;
      if (m.tipo === "ss") totais.ss = arred(totais.ss + m.valor);
      if (m.tipo === "iva") totais.iva = arred(totais.iva + m.valor);
      if (m.tipo === "ppc") totais.ppc = arred(totais.ppc + m.valor);
      if (m.tipo === "irs") totais.irs = arred(totais.irs + m.valor);
    } else if (m.sentido === "entrada") {
      mes.entradas = arred(mes.entradas + m.valor);
      totais.entradas = arred(totais.entradas + m.valor);
      totais.reembolso = arred(totais.reembolso + m.valor);
      mes.temDinheiro = true;
    }
  });

  totais.liquido = arred(totais.saidas - totais.entradas);

  return { ano, meses, totais, movimentos, regimeIVA, revistoEm: PRAZOS_REVISTOS_EM };
}

/** Dentro do mesmo dia, o dinheiro vem antes da papelada. */
function ordemNatureza(m: MovimentoFiscal): number {
  return m.natureza === "pagamento" ? 0 : 1;
}

/**
 * Regime de IVA a partir do volume de negócios, para quem já não está
 * isento: o limiar dos 650 000 € do Art. 41.º separa mensal de trimestral.
 */
export function regimeIVAPorVolume(
  temIva: boolean,
  faturacaoAnual: number,
  limiarMensal: number,
): RegimeIVACalendario {
  if (!temIva) return "isento";
  return faturacaoAnual >= limiarMensal ? "normal-mensal" : "normal-trimestral";
}

/**
 * Fração do ano já decorrida, em dias — não em meses. `(mes + 1) / 12` dava
 * 67% logo a 1 de agosto, o que é falso por quase um mês inteiro.
 */
export function progressoDoAno(hoje: Date): number {
  const ano = hoje.getFullYear();
  const inicio = new Date(ano, 0, 1).getTime();
  const fim = new Date(ano + 1, 0, 1).getTime();
  const agora = new Date(ano, hoje.getMonth(), hoje.getDate()).getTime();
  return Math.min(1, Math.max(0, (agora - inicio) / (fim - inicio)));
}
