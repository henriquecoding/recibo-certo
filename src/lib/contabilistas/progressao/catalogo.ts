/**
 * Progressão e Comissão — domínio puro.
 *
 * Valores oficiais do Relatório Mestre §164. Se a Referência C mostrar
 * outro número, o relatório ganha; o mockup é direção visual.
 *
 * Este ficheiro espelha `public.comissao_patamares` (versão 1). O SQL é
 * a autoridade em runtime — há um teste que compara os dois.
 */

export interface Patamar {
  ordem: number;
  slug: string;
  titulo: string;
  /** Basis points. 10% = 1000. Nunca float para dinheiro. */
  comissaoBps: number;
  xpMinimo: number;
  /**
   * Clientes distintos com pelo menos um serviço pago. Segundo eixo
   * proposto pelo mockup («1 / 3 clientes»). A 0 na versão 1: comporta-se
   * exatamente como a especificação só-XP até os valores serem decididos.
   */
  clientesMinimo: number;
  /** null no patamar Base: não se compra o ponto de partida. */
  precoDesbloqueioCents: number | null;
}

export const CATALOGO_VERSAO = 1;

export const PATAMARES: readonly Patamar[] = Object.freeze([
  { ordem: 1, slug: "base",        titulo: "Base",        comissaoBps: 1000, xpMinimo: 0,    clientesMinimo: 0, precoDesbloqueioCents: null },
  { ordem: 2, slug: "ativo",       titulo: "Ativo",       comissaoBps: 900,  xpMinimo: 200,  clientesMinimo: 0, precoDesbloqueioCents: 1499 },
  { ordem: 3, slug: "crescimento", titulo: "Crescimento", comissaoBps: 800,  xpMinimo: 500,  clientesMinimo: 0, precoDesbloqueioCents: 2499 },
  { ordem: 4, slug: "consolidado", titulo: "Consolidado", comissaoBps: 700,  xpMinimo: 900,  clientesMinimo: 0, precoDesbloqueioCents: 3999 },
  { ordem: 5, slug: "referencia",  titulo: "Referência",  comissaoBps: 600,  xpMinimo: 1500, clientesMinimo: 0, precoDesbloqueioCents: 6499 },
  { ordem: 6, slug: "parceiro",    titulo: "Parceiro",    comissaoBps: 500,  xpMinimo: 2300, clientesMinimo: 0, precoDesbloqueioCents: 9999 },
]);

export const XP_POR_EVENTO = Object.freeze({
  servicoElegivel: 10,
  primeiroServicoDeNovoCliente: 25,
  cartaoElegivelConcluido: 100,
});

/** Um cartão com meta abaixo disto não gera moeda profissional (§62). */
export const META_MINIMA_CARTAO_PROFISSIONAL = 5;

export function patamarPorOrdem(ordem: number): Patamar | undefined {
  return PATAMARES.find((p) => p.ordem === ordem);
}

export function patamarConquistado(xp: number, clientesElegiveis = Number.MAX_SAFE_INTEGER): number {
  let ordem = 1;
  for (const p of PATAMARES) {
    if (xp >= p.xpMinimo && clientesElegiveis >= p.clientesMinimo) ordem = p.ordem;
  }
  return ordem;
}

/**
 * As duas dimensões nunca se tocam. Comprar não cria XP; ganhar XP não
 * cria uma compra. O que o contabilista vê é o máximo das duas (§53).
 */
export function patamarEfetivo(conquistado: number, comprado: number): number {
  return Math.max(conquistado, comprado);
}

export function proximoPatamar(efetivo: number): Patamar | undefined {
  return patamarPorOrdem(efetivo + 1);
}

export function comissaoPercentagem(bps: number): number {
  return bps / 100;
}

export function formatarComissao(bps: number): string {
  const pct = comissaoPercentagem(bps);
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1).replace(".", ",")}%`;
}

/* ------------------------------------------------------------------ */
/* Créditos de Fidelidade                                              */
/* ------------------------------------------------------------------ */

export interface OpcaoCredito {
  creditos: number;
  descontoPct: number;
}

/** Marcos, não escada. Com 10 créditos o desconto é 20%, nunca 5+15+20. */
export const MARCOS_CREDITO: readonly OpcaoCredito[] = Object.freeze([
  { creditos: 0,  descontoPct: 0 },
  { creditos: 1,  descontoPct: 5 },
  { creditos: 5,  descontoPct: 15 },
  { creditos: 10, descontoPct: 20 },
]);

export function descontoPorCreditos(creditos: number): number {
  let pct = 0;
  for (const m of MARCOS_CREDITO) if (creditos >= m.creditos) pct = m.descontoPct;
  return pct;
}

export function creditosDoMarco(creditos: number): number {
  let usados = 0;
  for (const m of MARCOS_CREDITO) if (creditos >= m.creditos) usados = m.creditos;
  return usados;
}

/**
 * Opções que a UI oferece com um dado saldo. O melhor desconto pode ser
 * recomendado, mas nunca forçado: guardar créditos para o patamar
 * Parceiro é uma decisão legítima (§65).
 */
export function opcoesDisponiveis(saldo: number): OpcaoCredito[] {
  return MARCOS_CREDITO.filter((m) => saldo >= m.creditos);
}

/** Cálculo em cêntimos. O servidor recalcula; isto é só para mostrar. */
export function precoComDesconto(baseCents: number, pct: number): number {
  return Math.round((baseCents * (100 - pct)) / 100);
}

export interface Simulacao {
  baseCents: number;
  creditosUsados: number;
  descontoPct: number;
  finalCents: number;
  saldoDepois: number;
}

export function simularDesbloqueio(
  alvo: Patamar,
  saldoCreditos: number,
  creditosEscolhidos: number,
): Simulacao | null {
  if (alvo.precoDesbloqueioCents === null) return null;
  const escolhidos = Math.min(Math.max(creditosEscolhidos, 0), saldoCreditos);
  const creditosUsados = creditosDoMarco(escolhidos);
  const descontoPct = descontoPorCreditos(creditosUsados);
  return {
    baseCents: alvo.precoDesbloqueioCents,
    creditosUsados,
    descontoPct,
    finalCents: precoComDesconto(alvo.precoDesbloqueioCents, descontoPct),
    saldoDepois: saldoCreditos - creditosUsados,
  };
}

export function formatarEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/* ------------------------------------------------------------------ */
/* Estado para a UI                                                    */
/* ------------------------------------------------------------------ */

export interface EstadoProgressao {
  xp: number;
  clientesElegiveis: number;
  creditosDisponiveis: number;
  creditosReservados: number;
  patamarConquistado: number;
  patamarComprado: number;
}

export interface VistaProgressao {
  atual: Patamar;
  proximo: Patamar | null;
  efetivo: number;
  xp: number;
  xpEmFalta: number;
  clientesEmFalta: number;
  /** 0..1 dentro do intervalo entre o patamar atual e o seguinte. */
  progressoNoIntervalo: number;
  noTopo: boolean;
  simulacaoMelhorDesconto: Simulacao | null;
}

export function vistaProgressao(estado: EstadoProgressao): VistaProgressao {
  const efetivo = patamarEfetivo(estado.patamarConquistado, estado.patamarComprado);
  const atual = patamarPorOrdem(efetivo) ?? PATAMARES[0]!;
  const proximo = proximoPatamar(efetivo) ?? null;

  if (!proximo) {
    return {
      atual, proximo: null, efetivo, xp: estado.xp, xpEmFalta: 0, clientesEmFalta: 0,
      progressoNoIntervalo: 1, noTopo: true, simulacaoMelhorDesconto: null,
    };
  }

  const base = atual.xpMinimo;
  const alcance = Math.max(proximo.xpMinimo - base, 1);
  const progresso = Math.min(Math.max((estado.xp - base) / alcance, 0), 1);

  return {
    atual, proximo, efetivo, xp: estado.xp,
    xpEmFalta: Math.max(proximo.xpMinimo - estado.xp, 0),
    clientesEmFalta: Math.max(proximo.clientesMinimo - estado.clientesElegiveis, 0),
    progressoNoIntervalo: progresso,
    noTopo: false,
    simulacaoMelhorDesconto: simularDesbloqueio(
      proximo, estado.creditosDisponiveis, estado.creditosDisponiveis),
  };
}

/* ------------------------------------------------------------------ */
/* Copy — a comissão DESCE                                             */
/* ------------------------------------------------------------------ */

/**
 * O §164 proíbe pelo nome a frase «Cada patamar aumenta a tua comissão».
 * Lida à letra diz o contrário do que acontece, e num ecrã que mostra
 * 10% → 5% cria uma contradição visível: o número desce e o texto diz
 * que sobe. Estas são as três formulações que dizem a verdade sem
 * deixarem de ser positivas.
 */
export function copyJornadaProgressao(
  variante: "reducao" | "plataforma" | "intervalo" = "reducao",
): string {
  switch (variante) {
    case "reducao":   return "Cada patamar reduz a comissão do Recibo Certo.";
    case "plataforma": return "Quanto mais avanças, menos fica a plataforma.";
    case "intervalo": return "A tua jornada: de 10% para 5% de comissão.";
  }
}

/**
 * Os marcos são de CRÉDITOS DISPONÍVEIS, não de cartões concluídos.
 * Os créditos são consumidos ao comprar: quem concluiu 10 cartões mas já
 * gastou 5 tem direito a 15%, não a 20%. Dizer «10 cartões concluídos →
 * 20%» promete um desconto que o saldo não suporta.
 */
export function descricaoDescontoFidelidade(): Array<{ rotulo: string; desconto: string }> {
  return MARCOS_CREDITO.filter((m) => m.creditos > 0).map((m) => ({
    rotulo: m.creditos === 1 ? "1 crédito disponível" : `${m.creditos} créditos disponíveis`,
    desconto: `${m.descontoPct}% de desconto`,
  }));
}

/** Frase do hero quando faltam XP e/ou clientes para o próximo patamar. */
export function copyEmFalta(v: VistaProgressao): string | null {
  if (v.noTopo || !v.proximo) return null;
  const partes: string[] = [];
  if (v.xpEmFalta > 0) partes.push(`${v.xpEmFalta} XP`);
  if (v.clientesEmFalta > 0) {
    partes.push(v.clientesEmFalta === 1 ? "1 cliente elegível" : `${v.clientesEmFalta} clientes elegíveis`);
  }
  if (partes.length === 0) return `Já reúnes as condições para ${formatarComissao(v.proximo.comissaoBps)}.`;
  return `Faltam ${partes.join(" e ")} para chegar a ${formatarComissao(v.proximo.comissaoBps)} de comissão.`;
}
