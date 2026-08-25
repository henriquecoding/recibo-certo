// ─────────────────────────────────────────────────────────────────────
//  Calendário de obrigações fiscais e contributivas.
//
//  Reescrito a partir da Agenda Fiscal oficial de 2026 (RC-P0-06). O que
//  havia antes fixava os três pagamentos por conta de IRS no dia 20 — a
//  agenda marca 21 de setembro e 21 de dezembro — e tratava a declaração
//  periódica de IVA do 2.º trimestre como sendo de agosto, quando o Art. 41.º
//  n.º 10 do CIVA a prolonga até setembro. Avisar para a data errada é pior do
//  que não avisar.
//
//  Três coisas mudam de fundo:
//
//  1. DECLARAR e PAGAR passam a ser obrigações distintas. Entregar a
//     declaração periódica até dia 20 e pagar o imposto até dia 25 são dois
//     prazos; juntá-los num só escondia metade.
//  2. As datas são DERIVADAS e ajustadas por fim de semana e feriado, em vez
//     de escritas à mão ano a ano. A regra de transferência para o dia útil
//     seguinte (Art. 57.º-A da LGT) reproduz exatamente a agenda oficial de
//     2026 — e continua a acertar em 2027 sem ninguém lhe tocar.
//  3. Cada obrigação declara a base legal, a fonte e a data de revisão, e
//     sabe a QUEM se aplica. Um calendário igual para toda a gente punha
//     prazos de IVA a quem está isento (RC-P1-05).
// ─────────────────────────────────────────────────────────────────────

export type CategoriaPrazo = "ss" | "iva" | "irs";
/** Entregar a declaração e pagar o imposto são obrigações diferentes. */
export type NaturezaPrazo = "declaracao" | "pagamento";

/** A quem uma obrigação se aplica, dado o perfil conhecido. */
export type Aplicabilidade = "aplicavel" | "nao-aplicavel" | "preciso-de-informacao";

export interface Prazo {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaPrazo;
  natureza: NaturezaPrazo;
  /** Data-limite civil final (ISO yyyy-mm-dd), já ajustada por fim de semana/feriado. */
  data: string;
  /** Data-limite antes do ajuste, quando houve ajuste. */
  dataBase?: string;
  /** Base legal da obrigação. */
  base: string;
  /** Chave em `FONTES_PRAZOS`. */
  fonte: keyof typeof FONTES_PRAZOS;
  /** Última verificação da regra contra a fonte oficial (ISO). */
  revistoEm: string;
}

/** Um prazo com o veredicto de aplicabilidade ao perfil de quem o vê. */
export interface PrazoAvaliado extends Prazo {
  aplicabilidade: Aplicabilidade;
  /** Porque se aplica (ou porque não se sabe). Mostrado ao utilizador. */
  motivo: string;
}

export const FONTES_PRAZOS = {
  agendaDeclarativas: {
    label: "AT — Agenda Fiscal 2026, obrigações declarativas",
    url: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/calendario_fiscal/Documents/Obrigacoes_declarativas.pdf",
  },
  agendaPagamentos: {
    label: "AT — Agenda Fiscal 2026, obrigações de pagamento",
    url: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/calendario_fiscal/Documents/Obrigacoes_pagamento.pdf",
  },
  civa41: {
    label: "AT — Artigo 41.º do CIVA",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva41.aspx",
  },
  cirs60: {
    label: "AT — Artigo 60.º do CIRS",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs60.aspx",
  },
  cirs97: {
    label: "AT — Artigo 97.º do CIRS (pagamento do imposto)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs97.aspx",
  },
  cirs96: {
    label: "AT — Artigo 96.º do CIRS (restituição oficiosa)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs96.aspx",
  },
  segSocialTI: {
    label: "Segurança Social — Trabalhadores Independentes",
    url: "https://www.seg-social.pt/ptss/pssd/menu/trabalho/remuneracoes-contribuicoes/trabalhadores-independentes",
  },
} as const;

/** Data em que as regras deste ficheiro foram conferidas contra as fontes. */
export const PRAZOS_REVISTOS_EM = "2026-08-12";

// As cores usam `var(--cat-x, fallback)` (definidas em globals.css) em vez de
// hex fixo: são aplicadas via `style={{ color/background: meta.cor }}` no
// calendário e por isso escapam ao override `.dark` (que só reescreve classes
// Tailwind). O castanho-oliva do IVA em particular ficava ilegível sobre um
// cartão já escurecido — a variável troca automaticamente com o tema.
export const META_CATEGORIA: Record<CategoriaPrazo, { label: string; cor: string }> = {
  ss: { label: "Segurança Social", cor: "var(--cat-ss, #1D9E75)" },
  iva: { label: "IVA", cor: "var(--cat-iva, #7A5C00)" },
  irs: { label: "IRS", cor: "var(--cat-irs, #0F6E56)" },
};

export const META_NATUREZA: Record<NaturezaPrazo, { label: string; verbo: string }> = {
  declaracao: { label: "Declaração", verbo: "Declarar" },
  pagamento: { label: "Pagamento", verbo: "Pagar" },
};

// ─── Dias úteis e feriados ─────────────────────────────────────────────

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * Feriados nacionais obrigatórios (Lei n.º 7/2009, Código do Trabalho,
 * Art. 234.º). Os feriados municipais não entram: variam por concelho e não
 * suspendem prazos fiscais nacionais.
 */
export function feriadosNacionais(ano: number): Set<string> {
  const pascoa = domingoDePascoa(ano);
  const fixos: [number, number][] = [
    [1, 1],   // Ano Novo
    [4, 25],  // Dia da Liberdade
    [5, 1],   // Dia do Trabalhador
    [6, 10],  // Dia de Portugal
    [8, 15],  // Assunção de Nossa Senhora
    [10, 5],  // Implantação da República
    [11, 1],  // Todos os Santos
    [12, 1],  // Restauração da Independência
    [12, 8],  // Imaculada Conceição
    [12, 25], // Natal
  ];
  const s = new Set(fixos.map(([m, d]) => iso(ano, m, d)));
  // Móveis: Sexta-feira Santa (−2), Páscoa (0) e Corpo de Deus (+60).
  [-2, 0, 60].forEach((delta) => {
    const d = somaDias(pascoa, delta);
    s.add(iso(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  });
  return s;
}

const iso = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

/**
 * Transfere uma data-limite para o dia útil seguinte quando cai a sábado,
 * domingo ou feriado (Art. 57.º-A da LGT). É esta regra que faz o dia 20 de
 * setembro de 2026 — um domingo — aparecer na agenda oficial como dia 21.
 */
export function proximoDiaUtil(dataIso: string): string {
  const [a, m, d] = dataIso.split("-").map(Number);
  const feriados = new Set([...feriadosNacionais(a), ...feriadosNacionais(a + 1)]);
  const cursor = new Date(a, m - 1, d);
  for (let i = 0; i < 10; i++) {
    const s = iso(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6 && !feriados.has(s)) return s;
    cursor.setDate(cursor.getDate() + 1);
  }
  return dataIso;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/** Constrói um prazo com a data já ajustada, registando a data original. */
function prazo(
  base: Omit<Prazo, "data" | "dataBase" | "revistoEm">,
  ano: number,
  mes: number,
  dia: number,
): Prazo {
  const bruta = iso(ano, mes, dia);
  const ajustada = proximoDiaUtil(bruta);
  return {
    ...base,
    data: ajustada,
    ...(ajustada !== bruta ? { dataBase: bruta } : {}),
    revistoEm: PRAZOS_REVISTOS_EM,
  };
}

// ─── Geração ───────────────────────────────────────────────────────────

/**
 * Todos os prazos de um ano civil, declarações e pagamentos separados.
 *
 * Ainda não filtra por perfil — isso é `prazosAplicaveis`. Quem mostrar esta
 * lista crua tem de a rotular como calendário geral.
 */
export function gerarPrazos(ano: number): Prazo[] {
  const prazos: Prazo[] = [];

  // ── Segurança Social ────────────────────────────────────────────────
  // Declaração trimestral de rendimentos: até ao último dia do mês seguinte
  // ao fim do trimestre.
  ([
    { mes: 1, tri: "4.º trimestre do ano anterior" },
    { mes: 4, tri: "1.º trimestre" },
    { mes: 7, tri: "2.º trimestre" },
    { mes: 10, tri: "3.º trimestre" },
  ] as const).forEach(({ mes, tri }) => {
    prazos.push(prazo({
      id: `ss-decl-${ano}-${mes}`,
      titulo: "Declaração trimestral — Segurança Social",
      descricao: `Declarar na Segurança Social Direta os rendimentos do ${tri}.`,
      categoria: "ss",
      natureza: "declaracao",
      base: "Art. 151.º do Código dos Regimes Contributivos",
      fonte: "segSocialTI",
    }, ano, mes, ultimoDiaDoMes(ano, mes)));
  });

  // Contribuição mensal: paga-se entre o dia 10 e o dia 20 do mês seguinte
  // àquele a que respeita.
  for (let mes = 1; mes <= 12; mes++) {
    prazos.push(prazo({
      id: `ss-pag-${ano}-${mes}`,
      titulo: "Pagamento — Segurança Social",
      descricao: "Contribuição mensal do trabalhador independente (janela do dia 10 ao dia 20).",
      categoria: "ss",
      natureza: "pagamento",
      base: "Art. 43.º do Código dos Regimes Contributivos",
      fonte: "segSocialTI",
    }, ano, mes, 20));
  }

  // ── IVA — regime normal trimestral ──────────────────────────────────
  // Declaração até ao dia 20 do 2.º mês seguinte ao trimestre; o 2.º
  // trimestre tem o prazo prolongado até setembro (Art. 41.º n.º 10 CIVA) —
  // era isto que o calendário anterior colocava erradamente em agosto.
  ([
    { mes: 2, tri: "4.º trimestre do ano anterior", nota: "" },
    { mes: 5, tri: "1.º trimestre", nota: "" },
    { mes: 9, tri: "2.º trimestre", nota: " O prazo do 2.º trimestre é prolongado até setembro (Art. 41.º n.º 10 do CIVA)." },
    { mes: 11, tri: "3.º trimestre", nota: "" },
  ] as const).forEach(({ mes, tri, nota }) => {
    prazos.push(prazo({
      id: `iva-decl-tri-${ano}-${mes}`,
      titulo: "Declaração periódica de IVA (trimestral)",
      descricao: `Entregar a declaração periódica referente ao ${tri}.${nota}`,
      categoria: "iva",
      natureza: "declaracao",
      base: "Art. 41.º, n.º 1, al. b) do CIVA",
      fonte: "civa41",
    }, ano, mes, 20));

    prazos.push(prazo({
      id: `iva-pag-tri-${ano}-${mes}`,
      titulo: "Pagamento de IVA (trimestral)",
      descricao: `Pagar o imposto apurado na declaração do ${tri}. É um prazo distinto do da entrega.`,
      categoria: "iva",
      natureza: "pagamento",
      base: "Art. 27.º, n.º 1 do CIVA",
      fonte: "agendaPagamentos",
    }, ano, mes, 25));
  });

  // ── IVA — regime normal mensal ──────────────────────────────────────
  // Declaração até ao dia 20 do 2.º mês seguinte; pagamento até ao dia 25.
  for (let mes = 1; mes <= 12; mes++) {
    const refMes = ((mes + 9) % 12) + 1; // mês a que respeita (M−2)
    prazos.push(prazo({
      id: `iva-decl-mes-${ano}-${mes}`,
      titulo: "Declaração periódica de IVA (mensal)",
      descricao: `Entregar a declaração periódica das operações de ${NOME_MES[refMes - 1]}.`,
      categoria: "iva",
      natureza: "declaracao",
      base: "Art. 41.º, n.º 1, al. a) do CIVA",
      fonte: "civa41",
    }, ano, mes, 20));

    prazos.push(prazo({
      id: `iva-pag-mes-${ano}-${mes}`,
      titulo: "Pagamento de IVA (mensal)",
      descricao: `Pagar o imposto apurado na declaração de ${NOME_MES[refMes - 1]}.`,
      categoria: "iva",
      natureza: "pagamento",
      base: "Art. 27.º, n.º 1 do CIVA",
      fonte: "agendaPagamentos",
    }, ano, mes, 25));
  }

  // ── IRS — pagamentos por conta ──────────────────────────────────────
  // Julho, setembro e dezembro. A agenda de 2026 marca 20/jul, 21/set e
  // 21/dez: os dois últimos porque o dia 20 cai a um domingo.
  ([
    { mes: 7, ordinal: "Primeiro" },
    { mes: 9, ordinal: "Segundo" },
    { mes: 12, ordinal: "Terceiro" },
  ] as const).forEach(({ mes, ordinal }, i) => {
    prazos.push(prazo({
      id: `irs-pc-${ano}-${mes}`,
      titulo: `${i + 1}.º pagamento por conta de IRS`,
      descricao: `${ordinal} pagamento por conta para titulares de rendimentos da categoria B. Só é devido a quem a AT tenha liquidado pagamentos por conta.`,
      categoria: "irs",
      natureza: "pagamento",
      base: "Art. 102.º do CIRS",
      fonte: "agendaPagamentos",
    }, ano, mes, 20));
  });

  // ── IRS — declaração anual ──────────────────────────────────────────
  prazos.push(prazo({
    id: `irs-decl-${ano}`,
    titulo: "Entrega da declaração de IRS (Modelo 3)",
    descricao: "Período de entrega: 1 de abril a 30 de junho, qualquer que seja a categoria de rendimentos.",
    categoria: "irs",
    natureza: "declaracao",
    base: "Art. 60.º do CIRS",
    fonte: "cirs60",
  }, ano, 6, 30));

  // ── IRS — acerto da nota de liquidação ──────────────────────────────
  // A maior saída do ano para quem factura sem retenção, e a que faltava
  // aqui: entregar a declaração em junho não é pagar. Quem entrega dentro do
  // prazo é notificado da liquidação até 31 de julho (Art. 77.º) e paga até
  // 31 de agosto (Art. 97.º, n.º 1, al. a)). O reembolso corre no mesmo
  // prazo, por remissão do Art. 96.º — é por isso um só marco no calendário,
  // com dois sentidos possíveis.
  prazos.push(prazo({
    id: `irs-pag-${ano}`,
    titulo: "Acerto de IRS da nota de liquidação",
    descricao: "Data-limite do acerto do ano anterior: paga-se aqui o imposto que a liquidação apurar — e é também até aqui que é restituído o reembolso, quando o apuramento é a favor (Art. 96.º).",
    categoria: "irs",
    natureza: "pagamento",
    base: "Art. 97.º, n.º 1, al. a) do CIRS",
    fonte: "cirs97",
  }, ano, 8, 31));

  return prazos.sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
}

const NOME_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// ─── Motor de aplicabilidade (RC-P1-05) ────────────────────────────────

/** O que é preciso saber para decidir que obrigações se aplicam a alguém. */
export interface PerfilPrazos {
  /** Regime de IVA efetivo. `null` = ainda não sabemos. */
  regimeIVA: "isento" | "normal-trimestral" | "normal-mensal" | null;
  /** Está inscrito como trabalhador independente? `null` = não sabemos. */
  atividadeAberta: boolean | null;
  /** A AT liquidou-lhe pagamentos por conta? `null` = não sabemos. */
  pagamentosPorConta: boolean | null;
  /** Está no período de isenção do primeiro ano de atividade? */
  isencaoSSPrimeiroAno: boolean;
}

export const PERFIL_PRAZOS_DESCONHECIDO: PerfilPrazos = {
  regimeIVA: null,
  atividadeAberta: null,
  pagamentosPorConta: null,
  isencaoSSPrimeiroAno: false,
};

function avaliar(p: Prazo, perfil: PerfilPrazos): { aplicabilidade: Aplicabilidade; motivo: string } {
  // ── IVA ───────────────────────────────────────────────────────────
  if (p.categoria === "iva") {
    if (perfil.regimeIVA === null) {
      return { aplicabilidade: "preciso-de-informacao", motivo: "Depende do teu regime de IVA — diz-nos qual é para saberes se te aplica." };
    }
    if (perfil.regimeIVA === "isento") {
      return { aplicabilidade: "nao-aplicavel", motivo: "Estás isento de IVA (Art. 53.º do CIVA): não entregas declaração periódica." };
    }
    const trimestral = p.id.includes("-tri-");
    const ehTeu = perfil.regimeIVA === (trimestral ? "normal-trimestral" : "normal-mensal");
    return ehTeu
      ? { aplicabilidade: "aplicavel", motivo: `Estás no regime normal ${trimestral ? "trimestral" : "mensal"}.` }
      : { aplicabilidade: "nao-aplicavel", motivo: `Só se aplica ao regime normal ${trimestral ? "trimestral" : "mensal"}.` };
  }

  // ── Segurança Social ──────────────────────────────────────────────
  if (p.categoria === "ss") {
    if (perfil.atividadeAberta === null) {
      return { aplicabilidade: "preciso-de-informacao", motivo: "Depende de teres atividade aberta como trabalhador independente." };
    }
    if (!perfil.atividadeAberta) {
      return { aplicabilidade: "nao-aplicavel", motivo: "Sem atividade aberta não há obrigação contributiva como independente." };
    }
    if (p.natureza === "pagamento" && perfil.isencaoSSPrimeiroAno) {
      return { aplicabilidade: "nao-aplicavel", motivo: "Estás no período de isenção do primeiro ano de atividade — declaras, mas não pagas." };
    }
    return { aplicabilidade: "aplicavel", motivo: "Aplica-se a quem tem atividade aberta como independente." };
  }

  // ── IRS ───────────────────────────────────────────────────────────
  if (p.id.startsWith("irs-pc-")) {
    if (perfil.pagamentosPorConta === null) {
      return { aplicabilidade: "preciso-de-informacao", motivo: "Só é devido se a AT te tiver liquidado pagamentos por conta. Confirma na nota de liquidação." };
    }
    return perfil.pagamentosPorConta
      ? { aplicabilidade: "aplicavel", motivo: "Tens pagamentos por conta liquidados pela AT." }
      : { aplicabilidade: "nao-aplicavel", motivo: "A AT não te liquidou pagamentos por conta." };
  }

  // O acerto aplica-se a toda a gente: quem tem imposto a pagar tem aqui a
  // data-limite, e quem tem reembolso tem aqui a data até à qual o recebe.
  // Dizer "não se aplica" a quem vai receber seria esconder-lhe o prazo.
  if (p.id.startsWith("irs-pag-")) {
    return {
      aplicabilidade: "aplicavel",
      motivo: "Data-limite do acerto do ano anterior — a pagar se a liquidação apurar imposto, a receber se apurar reembolso.",
    };
  }

  // A declaração anual de IRS aplica-se a toda a gente com rendimentos.
  return { aplicabilidade: "aplicavel", motivo: "Aplica-se a todos os sujeitos passivos de IRS." };
}

/** Os prazos do ano, cada um com o veredicto de aplicabilidade ao perfil. */
export function prazosAvaliados(ano: number, perfil: PerfilPrazos = PERFIL_PRAZOS_DESCONHECIDO): PrazoAvaliado[] {
  return gerarPrazos(ano).map((p) => ({ ...p, ...avaliar(p, perfil) }));
}

/** Só os prazos que se aplicam mesmo. Nunca inclui os "preciso de informação". */
export function prazosAplicaveis(ano: number, perfil: PerfilPrazos): PrazoAvaliado[] {
  return prazosAvaliados(ano, perfil).filter((p) => p.aplicabilidade === "aplicavel");
}

export function diasAte(dataIso: string, ref: Date = new Date()): number {
  const [a, m, d] = dataIso.split("-").map(Number);
  const alvo = new Date(a, m - 1, d);
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000);
}

/**
 * Próximos prazos a partir de hoje (inclui os de hoje).
 *
 * Sem perfil devolve o calendário geral — quem o mostrar tem de o dizer. Com
 * perfil devolve só o que se aplica de facto: era o prazo genérico mais
 * próximo, aplicável ou não, que contaminava o indicador de saúde fiscal.
 */
export function proximosPrazos(ref: Date = new Date(), limite = 6, perfil?: PerfilPrazos): PrazoAvaliado[] {
  const ano = ref.getFullYear();
  const fonte = perfil
    ? [...prazosAplicaveis(ano, perfil), ...prazosAplicaveis(ano + 1, perfil)]
    : [...prazosAvaliados(ano), ...prazosAvaliados(ano + 1)];
  return fonte
    .filter((p) => diasAte(p.data, ref) >= 0)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, limite);
}
