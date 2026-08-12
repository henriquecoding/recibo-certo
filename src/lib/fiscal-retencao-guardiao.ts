// ─────────────────────────────────────────────────────────────────────────
//  Dispensa de retenção na fonte — Artigo 101.º-B do CIRS.
//
//  O guardião anterior derivava o estado só do acumulado do ano e chegava a
//  afirmar "Dispensado de reter" (RC-P1-03). A dispensa não é automática:
//
//  · é FACULTATIVA — quem pode dispensar tem de optar por isso;
//  · a elegibilidade afere-se por uma PREVISÃO do ano corrente (e, para quem
//    já tinha atividade, pelo que faturou no ano anterior);
//  · cessa no mês seguinte àquele em que o limite é ultrapassado, não no
//    instante;
//  · e nada disto se aplica quando o pagador não é entidade com contabilidade
//    organizada — aí nunca há retenção, esteja-se ou não abaixo do limite.
//
//  Quatro situações distintas, portanto, e não uma escala. É o que este
//  módulo modela.
// ─────────────────────────────────────────────────────────────────────────

import { DISPENSA_RETENCAO_LIMITE, RETENCAO, ATIVIDADES, efeitoFiscal, type TipoAtividade } from "@/lib/fiscal-data";
import { anoDoRecibo, mesDoRecibo, type Recibo } from "@/lib/recibos-contrato";

export type EstadoRetencao =
  /** Faltam dados para concluir. */
  | "sem-informacao"
  /** Abaixo do limite e não optou (ou não sabemos se optou): PODE pedir dispensa. */
  | "pode-dispensar"
  /** Abaixo do limite e optou pela dispensa: não há retenção. */
  | "optou-dispensa"
  /** Ultrapassou o limite: a dispensa cessa e passa a haver retenção. */
  | "deve-reter"
  /** Perto do limite. */
  | "aviso";

export interface EntradaGuardiaoRetencao {
  recibos: Recibo[];
  ano: number;
  /** Optou efetivamente pela dispensa? `null` = não sabemos. */
  optouDispensa: boolean | null;
  /** Faturação do ano anterior. `null` = desconhecida. */
  faturadoAnoAnterior: number | null;
  hoje?: Date;
}

/** Taxa de retenção de um recibo concreto, resolvida pelo pacote da atividade. */
export function taxaRetencaoDoRecibo(r: Recibo): number {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return efeitoFiscal(ativ).retencao;
  }
  return RETENCAO[r.tipo].value;
}

export interface TaxaPorPeso {
  tipo: TipoAtividade;
  taxa: number;
  /** Faturação a esta taxa, no ano. */
  base: number;
  /** Peso no total faturado. */
  peso: number;
}

/**
 * As taxas aplicáveis, por VALOR faturado e não por contagem de recibos.
 *
 * A "taxa dominante" anterior era a do tipo com mais recibos: dez faturas de
 * 50 € batiam uma de 40 000 € e a percentagem exibida não descrevia o
 * dinheiro de ninguém.
 */
export function taxasPorPeso(recibos: Recibo[], ano: number): TaxaPorPeso[] {
  const doAno = recibos.filter((r) => anoDoRecibo(r) === ano);
  const total = doAno.reduce((s, r) => s + r.valor, 0);
  const mapa = new Map<string, TaxaPorPeso>();
  for (const r of doAno) {
    const tipo = r.atividade ? (ATIVIDADES.find((a) => a.label === r.atividade)?.tipo ?? r.tipo) : r.tipo;
    const taxa = taxaRetencaoDoRecibo(r);
    const chave = `${tipo}|${taxa}`;
    const atual = mapa.get(chave) ?? { tipo, taxa, base: 0, peso: 0 };
    atual.base += r.valor;
    mapa.set(chave, atual);
  }
  return [...mapa.values()]
    .map((t) => ({ ...t, peso: total > 0 ? t.base / total : 0 }))
    .sort((a, b) => b.base - a.base);
}

export interface VeredictoRetencao {
  estado: EstadoRetencao;
  limite: number;
  faturado: number;
  /** Faturação projetada para o ano inteiro, ao ritmo atual. */
  previsaoAnual: number;
  taxas: TaxaPorPeso[];
  /** Taxa a aplicar quando há uma só; `null` quando são várias. */
  taxaUnica: number | null;
  titulo: string;
  mensagem: string;
  /** Quando a dispensa cessa, se cessar. */
  cessaEm: string | null;
  base: string;
  severidade: "neutro" | "aviso" | "alerta";
  /** O que falta saber para o veredicto ser firme. */
  emFalta: string[];
}

export function avaliarRetencao(entrada: EntradaGuardiaoRetencao): VeredictoRetencao {
  const limite = DISPENSA_RETENCAO_LIMITE.value;
  const hoje = entrada.hoje ?? new Date();
  const doAno = entrada.recibos.filter((r) => anoDoRecibo(r) === entrada.ano);
  const faturado = doAno.reduce((s, r) => s + r.valor, 0);
  const taxas = taxasPorPeso(entrada.recibos, entrada.ano);
  const taxaUnica = taxas.length === 1 ? taxas[0].taxa : null;

  // Previsão anual ao ritmo médio — é por previsão que o Art. 101.º-B afere,
  // não pelo que já se faturou.
  const mesesDecorridos = entrada.ano === hoje.getFullYear() ? hoje.getMonth() + 1 : 12;
  const previsaoAnual = mesesDecorridos > 0 ? (faturado / mesesDecorridos) * 12 : faturado;

  const emFalta: string[] = [];
  if (entrada.optouDispensa === null) emFalta.push("Se optaste pela dispensa de retenção");
  if (entrada.faturadoAnoAnterior === null) emFalta.push("A tua faturação do ano anterior");

  const comum = { limite, faturado, previsaoAnual, taxas, taxaUnica, emFalta };

  // ── Já ultrapassou: a dispensa cessa no mês SEGUINTE ───────────────
  if (faturado > limite) {
    const mesUltrapassagem = mesDaUltrapassagem(doAno, limite);
    const cessaEm = mesUltrapassagem === null
      ? null
      : `${entrada.ano}-${String(Math.min(12, mesUltrapassagem + 1)).padStart(2, "0")}`;
    return {
      ...comum,
      estado: "deve-reter",
      titulo: "A dispensa de retenção cessou",
      mensagem:
        `Já faturaste ${eur(faturado)}, acima do limite de ${eur(limite)}. A dispensa cessa no mês seguinte àquele em que ` +
        `o limite foi ultrapassado — a partir daí, as entidades com contabilidade organizada devem reter.`,
      cessaEm,
      base: "Art. 101.º-B, n.º 1, al. a) e n.º 2 do CIRS",
      severidade: "alerta",
    };
  }

  // ── Previsão a apontar para cima do limite ─────────────────────────
  if (previsaoAnual > limite || faturado >= 0.85 * limite) {
    return {
      ...comum,
      estado: "aviso",
      titulo: "A caminho do limite da dispensa",
      mensagem:
        `Faturaste ${eur(faturado)} e, ao ritmo atual, o ano fecha perto de ${eur(previsaoAnual)}. ` +
        `Acima de ${eur(limite)} deixas de poder dispensar a retenção.`,
      cessaEm: null,
      base: "Art. 101.º-B, n.º 1, al. a) do CIRS",
      severidade: "aviso",
    };
  }

  // ── Abaixo do limite: elegível. Mas optou? ─────────────────────────
  if (entrada.optouDispensa === true) {
    return {
      ...comum,
      estado: "optou-dispensa",
      titulo: "Optaste pela dispensa de retenção",
      mensagem:
        "Indicaste que exerceste a opção, por isso os teus recibos saem sem retenção. Mantém a menção do " +
        "Art. 101.º-B nas faturas a entidades nacionais.",
      cessaEm: null,
      base: "Art. 101.º-B, n.º 1, al. a) do CIRS",
      severidade: "neutro",
    };
  }

  if (entrada.optouDispensa === null) {
    return {
      ...comum,
      estado: "sem-informacao",
      titulo: "Podes ter direito a dispensar a retenção",
      mensagem:
        `Com ${eur(faturado)} faturados, estás abaixo do limite de ${eur(limite)} — mas a dispensa é facultativa e ` +
        "só vale se a tiveres exercido. Diz-nos se optaste para deixarmos de adivinhar.",
      cessaEm: null,
      base: "Art. 101.º-B, n.º 1, al. a) do CIRS",
      severidade: "neutro",
    };
  }

  return {
    ...comum,
    estado: "pode-dispensar",
    titulo: "Podes pedir a dispensa de retenção",
    mensagem:
      `Estás abaixo do limite de ${eur(limite)} e não exerceste a opção, por isso as entidades continuam a reter. ` +
      "Podes optar pela dispensa quando quiseres.",
    cessaEm: null,
    base: "Art. 101.º-B, n.º 1, al. a) do CIRS",
    severidade: "neutro",
  };
}

/** Mês (1–12) em que o acumulado passou o limite. */
function mesDaUltrapassagem(doAno: Recibo[], limite: number): number | null {
  const ordenados = [...doAno].sort((a, b) => a.data.localeCompare(b.data));
  let acc = 0;
  for (const r of ordenados) {
    acc += r.valor;
    if (acc > limite) return mesDoRecibo(r);
  }
  return null;
}

function eur(n: number): string {
  return `${Math.round(n).toLocaleString("pt-PT")} €`;
}
