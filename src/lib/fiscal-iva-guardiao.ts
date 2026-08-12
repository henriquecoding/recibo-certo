// ─────────────────────────────────────────────────────────────────────────
//  Máquina de estados da isenção de IVA — Artigos 53.º e 58.º do CIVA.
//
//  O componente anterior tinha um estado inalcançável e uma conclusão jurídica
//  errada (RC-P0-07):
//
//  · a ordem de decisão testava "crítico" a partir de 95% ANTES de testar
//    "alerta" a partir de 100%, por isso o estado de ultrapassagem nunca era
//    atingido — quem passasse o limite via "Atingiste 95%";
//  · depois do limite, o valor restante era truncado a zero e reaproveitado
//    como "Excedido em", mostrando 0 € de excesso a quem tinha excedido;
//  · e, sobretudo, tratava qualquer ultrapassagem como perda imediata da
//    isenção. O Art. 58.º distingue: até 25% acima do limiar, o IVA é devido a
//    partir de 1 de janeiro do ano seguinte; acima de 25%, é devido desde o
//    momento do excesso. São consequências e prazos diferentes.
//
//  Aqui a decisão é derivada dos artigos, com o regime efetivo e a
//  elegibilidade do ano anterior explícitos — e "não sei" é um estado, não um
//  valor por omissão.
// ─────────────────────────────────────────────────────────────────────────

import { IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO } from "@/lib/fiscal-data";

export type EstadoIVA =
  /** Não sabemos o regime — não se conclui nada. */
  | "sem-informacao"
  /** Já está no regime normal: o limiar do Art. 53.º não é o assunto. */
  | "regime-normal"
  /** Não era elegível este ano (faturou acima do limite no ano anterior). */
  | "nao-elegivel"
  /** Isento, com folga. */
  | "folgado"
  /** Isento, ≥ 80% do limite. */
  | "aviso"
  /** Isento, ≥ 90% do limite. */
  | "preparacao"
  /** Ultrapassou o limite em até 25% — IVA a partir de 1 de janeiro seguinte. */
  | "excedido-ate-25"
  /** Ultrapassou em mais de 25% — IVA devido desde o momento do excesso. */
  | "excedido-mais-25";

export interface EntradaGuardiaoIVA {
  /** Faturação do ano civil corrente. */
  faturadoNoAno: number;
  /** Faturação do ano anterior. `null` = desconhecida. */
  faturadoAnoAnterior: number | null;
  /** Regime efetivo. `null` = desconhecido. */
  regime: "isento" | "normal-trimestral" | "normal-mensal" | null;
  /** Referência temporal (injetável para testes). */
  hoje?: Date;
}

export interface VeredictoIVA {
  estado: EstadoIVA;
  limite: number;
  limiteExcesso: number;
  faturado: number;
  /** Quanto falta até ao limite. 0 depois de ultrapassado. */
  restante: number;
  /** Quanto passou do limite. 0 antes de o ultrapassar — nunca confundido com o restante. */
  excesso: number;
  /** Percentagem do limite, sem truncar acima de 100. */
  percentagem: number;
  titulo: string;
  mensagem: string;
  /** O que a lei manda fazer a seguir. */
  acao: string | null;
  base: string;
  severidade: "neutro" | "aviso" | "alerta" | "urgente";
  /** Mês em que, ao ritmo atual, o limite é ultrapassado. Nunca sai do ano civil. */
  projecao: Date | null;
}

/**
 * Projeta o mês de ultrapassagem ao ritmo médio do ano.
 *
 * Limitada ao ano civil: o limiar do Art. 53.º é anual e reinicia a 1 de
 * janeiro, por isso projetar "ultrapassas em março do ano que vem" a partir da
 * faturação DESTE ano não descreve nada.
 */
export function projetarDataLimite(
  faturado: number,
  limite: number,
  hoje: Date = new Date(),
): Date | null {
  if (faturado >= limite) return null;
  const mesesDecorridos = hoje.getMonth() + 1;
  const mediaMensal = faturado / mesesDecorridos;
  if (mediaMensal <= 0) return null;
  const mesesRestantes = Math.ceil((limite - faturado) / mediaMensal);
  if (mesesRestantes <= 0) return null;
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth() + mesesRestantes, 1);
  // Fora do ano civil deixa de ser uma projeção útil.
  if (alvo.getFullYear() !== hoje.getFullYear()) return null;
  return alvo;
}

export function avaliarIVA(entrada: EntradaGuardiaoIVA): VeredictoIVA {
  const limite = IVA_ISENCAO_LIMITE.value;
  const limiteExcesso = IVA_ISENCAO_EXCESSO.value;
  const hoje = entrada.hoje ?? new Date();
  const faturado = Math.max(0, entrada.faturadoNoAno);
  const restante = Math.max(0, limite - faturado);
  const excesso = Math.max(0, faturado - limite);
  const percentagem = limite > 0 ? (faturado / limite) * 100 : 0;

  const comum = { limite, limiteExcesso, faturado, restante, excesso, percentagem };

  // ── Sem regime conhecido não se conclui nada ───────────────────────
  if (entrada.regime === null) {
    return {
      ...comum,
      estado: "sem-informacao",
      titulo: "Limite de isenção de IVA",
      mensagem: "Para te dizermos onde estás face ao limite do Art. 53.º, precisamos de saber o teu regime de IVA.",
      acao: "Indica o teu regime de IVA no perfil fiscal.",
      base: "Art. 53.º do CIVA",
      severidade: "neutro",
      projecao: null,
    };
  }

  // ── Já no regime normal ────────────────────────────────────────────
  if (entrada.regime !== "isento") {
    return {
      ...comum,
      estado: "regime-normal",
      titulo: "Estás no regime normal de IVA",
      mensagem: `Liquidas IVA nas tuas faturas, por isso o limite de ${eur(limite)} do Art. 53.º já não te condiciona. Faturaste ${eur(faturado)} este ano.`,
      acao: null,
      base: "Art. 41.º do CIVA",
      severidade: "neutro",
      projecao: null,
    };
  }

  // ── Elegibilidade do ano anterior (Art. 53.º, n.º 1) ───────────────
  // A isenção depende do volume de negócios do ANO ANTERIOR. Quem passou o
  // limite no ano passado não está isento este ano, faturasse o que
  // faturasse agora.
  if (entrada.faturadoAnoAnterior !== null && entrada.faturadoAnoAnterior > limite) {
    return {
      ...comum,
      estado: "nao-elegivel",
      titulo: "A isenção do Art. 53.º não se aplica este ano",
      mensagem: `No ano anterior faturaste ${eur(entrada.faturadoAnoAnterior)}, acima do limite de ${eur(limite)}. A isenção afere-se pelo volume do ano anterior.`,
      acao: "Confirma com o teu contabilista se já estás enquadrado no regime normal.",
      base: "Art. 53.º, n.º 1 do CIVA",
      severidade: "alerta",
      projecao: null,
    };
  }

  // ── Ultrapassagem: a ordem importa, do mais grave para o menos ─────
  if (faturado > limiteExcesso) {
    return {
      ...comum,
      estado: "excedido-mais-25",
      titulo: "Ultrapassaste o limite em mais de 25%",
      mensagem: `Faturaste ${eur(faturado)}, ${eur(faturado - limiteExcesso)} acima dos ${eur(limiteExcesso)} que marcam os 25%. Neste caso o IVA é devido a partir do momento do excesso — não só no ano seguinte.`,
      acao: "Entrega a declaração de alterações nos 15 dias seguintes ao excesso e passa a liquidar IVA.",
      base: "Art. 58.º, n.º 2 e n.º 5 do CIVA",
      severidade: "urgente",
      projecao: null,
    };
  }

  if (faturado > limite) {
    return {
      ...comum,
      estado: "excedido-ate-25",
      titulo: "Ultrapassaste o limite de isenção",
      mensagem: `Faturaste ${eur(faturado)}, ${eur(excesso)} acima do limite de ${eur(limite)} — mas dentro dos 25% de tolerância (até ${eur(limiteExcesso)}). A isenção mantém-se até ao fim do ano.`,
      acao: `Entrega a declaração de alterações durante janeiro de ${hoje.getFullYear() + 1}; passas a liquidar IVA a partir de 1 de janeiro.`,
      base: "Art. 58.º, n.º 2 do CIVA",
      severidade: "alerta",
      projecao: null,
    };
  }

  // ── Ainda dentro do limite ─────────────────────────────────────────
  const projecao = projetarDataLimite(faturado, limite, hoje);

  if (faturado >= limite * 0.9) {
    return {
      ...comum,
      estado: "preparacao",
      titulo: "A 90% do limite de isenção",
      mensagem: `Faltam ${eur(restante)} para os ${eur(limite)}. Vale a pena preparar já a mudança de regime.`,
      acao: "Fala com o teu contabilista sobre o momento de alterar o regime.",
      base: "Art. 53.º do CIVA",
      severidade: "aviso",
      projecao,
    };
  }

  if (faturado >= limite * 0.8) {
    return {
      ...comum,
      estado: "aviso",
      titulo: "A 80% do limite de isenção",
      mensagem: `Faltam ${eur(restante)} para os ${eur(limite)}. Ainda há margem, mas convém acompanhar.`,
      acao: null,
      base: "Art. 53.º do CIVA",
      severidade: "aviso",
      projecao,
    };
  }

  return {
    ...comum,
    estado: "folgado",
    titulo: "Dentro do limite de isenção",
    mensagem: `Faturaste ${eur(faturado)} de um limite de ${eur(limite)}. Sem IVA a liquidar por agora.`,
    acao: null,
    base: "Art. 53.º do CIVA",
    severidade: "neutro",
    projecao,
  };
}

function eur(n: number): string {
  return `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
