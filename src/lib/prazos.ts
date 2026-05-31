// ─────────────────────────────────────────────────────────────────────
//  Calendário de obrigações fiscais e contributivas (datas-limite).
//  Gera os prazos de um ano civil para trabalhadores independentes.
//  Datas conforme as regras gerais; casos particulares podem variar.
// ─────────────────────────────────────────────────────────────────────

export type CategoriaPrazo = "ss" | "iva" | "irs";

export interface Prazo {
  id: string;
  titulo: string;
  descricao: string;
  categoria: CategoriaPrazo;
  /** Data-limite (ISO yyyy-mm-dd). */
  data: string;
}

export const META_CATEGORIA: Record<CategoriaPrazo, { label: string; cor: string }> = {
  ss: { label: "Segurança Social", cor: "#1D9E75" },
  iva: { label: "IVA", cor: "#7A5C00" },
  irs: { label: "IRS", cor: "#0F6E56" },
};

const iso = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

/** Gera todos os prazos de um ano civil. */
export function gerarPrazos(ano: number): Prazo[] {
  const prazos: Prazo[] = [];

  // Declaração trimestral à Segurança Social (jan, abr, jul, out).
  const trimestresSS: { mes: number; tri: string }[] = [
    { mes: 1, tri: "4.º trimestre do ano anterior" },
    { mes: 4, tri: "1.º trimestre" },
    { mes: 7, tri: "2.º trimestre" },
    { mes: 10, tri: "3.º trimestre" },
  ];
  trimestresSS.forEach(({ mes, tri }) => {
    prazos.push({
      id: `ss-decl-${ano}-${mes}`,
      titulo: "Declaração trimestral — Segurança Social",
      descricao: `Declarar os rendimentos do ${tri}.`,
      categoria: "ss",
      data: iso(ano, mes, lastDayOfMonth(ano, mes)),
    });
  });

  // Pagamento mensal à Segurança Social (até dia 20 de cada mês).
  for (let mes = 1; mes <= 12; mes++) {
    prazos.push({
      id: `ss-pag-${ano}-${mes}`,
      titulo: "Pagamento — Segurança Social",
      descricao: "Contribuição mensal (entre os dias 10 e 20).",
      categoria: "ss",
      data: iso(ano, mes, 20),
    });
  }

  // IVA — declaração periódica trimestral (regime trimestral): dia 20 de
  // fev, mai, ago e nov.
  [
    { mes: 2, tri: "4.º trimestre do ano anterior" },
    { mes: 5, tri: "1.º trimestre" },
    { mes: 8, tri: "2.º trimestre" },
    { mes: 11, tri: "3.º trimestre" },
  ].forEach(({ mes, tri }) => {
    prazos.push({
      id: `iva-${ano}-${mes}`,
      titulo: "Declaração periódica de IVA (trimestral)",
      descricao: `Entrega referente ao ${tri}. Apenas para quem não está isento.`,
      categoria: "iva",
      data: iso(ano, mes, 20),
    });
  });

  // Pagamentos por conta de IRS (jul, set, dez — até dia 20).
  [7, 9, 12].forEach((mes, i) => {
    prazos.push({
      id: `irs-pc-${ano}-${mes}`,
      titulo: `${i + 1}.º pagamento por conta de IRS`,
      descricao: "Para quem não faz retenção na fonte.",
      categoria: "irs",
      data: iso(ano, mes, 20),
    });
  });

  // Entrega da declaração de IRS (1 abril a 30 junho).
  prazos.push({
    id: `irs-decl-${ano}`,
    titulo: "Entrega da declaração de IRS",
    descricao: "Período de entrega: 1 de abril a 30 de junho.",
    categoria: "irs",
    data: iso(ano, 6, 30),
  });

  return prazos.sort((a, b) => a.data.localeCompare(b.data));
}

function lastDayOfMonth(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function diasAte(dataIso: string, ref: Date = new Date()): number {
  const alvo = new Date(dataIso + "T00:00:00");
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000);
}

/** Próximos prazos a partir de hoje (inclui os de hoje). */
export function proximosPrazos(ref: Date = new Date(), limite = 6): Prazo[] {
  const ano = ref.getFullYear();
  const todos = [...gerarPrazos(ano), ...gerarPrazos(ano + 1)];
  return todos.filter((p) => diasAte(p.data, ref) >= 0).slice(0, limite);
}
