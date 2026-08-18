// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE IVA DA PRICING ENGINE
//  ---------------------------------------------------------------------
//  Aqui vive UMA regra que nenhuma calculadora de preços do mercado
//  português modela, e que é a diferença entre um preço certo e um preço
//  23% errado:
//
//    A isenção do Art. 53.º CIVA tem DOIS efeitos, não um.
//
//      1. Não liquidas IVA  →  o PVP desce.
//      2. Não DEDUZES o IVA que suportas (Art. 53.º n.º 3)  →  o teu
//         custo de aquisição sobe para o valor COM IVA.
//
//  Tratar isenção como «taxa = 0» e deixar o custo na base tributável
//  produz um custo subestimado em até 23% e um preço recomendado abaixo do
//  sustentável. É o erro mais caro que uma ferramenta destas pode cometer,
//  porque é silencioso: o número parece plausível.
//
//  ── O regime NÃO é o que se responde num select ──────────────────────
//
//  Este ficheiro já não decide o enquadramento sozinho: DERIVA-O de
//  `situacaoIVA()` (`fiscal-iva.ts`), o mesmo motor que serve o simulador
//  de recibos verdes. Antes havia aqui um `switch` sobre a resposta do
//  utilizador — o que quer dizer que a ferramenta acreditava em quem lhe
//  dissesse «estou isento» com 40 000 € de faturação declarada.
//
//  O motor conhece o que o `switch` não conhecia: as três zonas do
//  Art. 53.º/58.º (isento, transição entre 15 000 e 18 750, perda
//  imediata acima), a isenção pela natureza da operação sem limiar
//  (Art. 9.º), o ato isolado que nunca é isento (Art. 53.º n.º 6 a), a
//  periodicidade da declaração (Art. 41.º) e quanto falta para o limiar.
//
//  ── Quem manda, quando há desacordo ──────────────────────────────────
//
//  A escolha do utilizador governa a matemática. A derivação só a corrige
//  no caso em que a lei não deixa margem: faturação DECLARADA acima de
//  18 750 € destrói a isenção do Art. 53.º na hora (Art. 58.º n.º 2 b), e
//  continuar a calcular a 0% seria recomendar um preço que não cobre o
//  IVA que a pessoa vai ter de entregar.
//
//  Duas fronteiras que se respeitam por construção:
//
//   · Quem está isento pela NATUREZA da operação (Art. 9.º) nunca é
//     contrariado por um limiar — a isenção dele não tem limiar nenhum.
//   · Uma faturação PROJETADA por nós (preço × unidades × 12) nunca
//     corrige regime nenhum. É uma estimativa nossa, não um facto do
//     utilizador; serve para AVISAR que o limiar se aproxima, e o aviso
//     vive em `avisos.ts`. Trocar o regime de alguém com base numa
//     projeção seria inventar uma certeza.
//
//  As taxas vêm de `IVA_TAXAS` em `fiscal-data.ts`. Zero literais aqui.
// ═══════════════════════════════════════════════════════════════════════

import { IVA_TAXAS } from "../../fiscal-data";
import { situacaoIVA, type EntidadeIVA, type ZonaIVA } from "../../fiscal-iva";
import type { RegimeIVA } from "../../fiscal";
import type {
  EscalaoIVA,
  Regiao,
  RegimeIVAVendedor,
  TipoVendedor,
  ValorComIVA,
} from "../tipos";
import { dividir, fracao, naoNegativo, num } from "../numeros";

export interface SituacaoIVAPreco {
  /** Taxa aplicada à VENDA. 0 quando isento. */
  taxaVenda: number;
  escalaoVenda: EscalaoIVA;
  liquida: boolean;
  /** Consegue deduzir o IVA das compras? */
  deduz: boolean;
  /** IVA incide só sobre a margem (DL 199/96)? */
  regimeMargem: boolean;
  regime: RegimeIVAVendedor;
  explicacao: string;

  // ── Derivado de `situacaoIVA()` ────────────────────────────────────
  /** Zona do Art. 53.º/58.º apurada pelo motor fiscal. */
  zona: ZonaIVA;
  limiar: number;
  limiarImediato: number;
  /** Quanto falta para o limiar (negativo se já passou). */
  margemAteLimiar: number;
  /** Art. 41.º: só para sociedades. `null` no resto. */
  periodicidade: "mensal" | "trimestral" | null;
  /** Faturação anual DECLARADA que serviu para derivar. 0 quando não há. */
  faturacaoConsiderada: number;
  /**
   * A derivação contrariou a resposta do utilizador? Só acontece na perda
   * imediata do Art. 58.º n.º 2 b), e a interface tem de o dizer — mudar o
   * número de alguém em silêncio é pior do que não o mudar.
   */
  corrigidaPeloLimiar: boolean;
  /** Copy do motor fiscal, para não haver duas versões da mesma explicação. */
  titulo: string;
  oQueAcontece: string;
  quandoAcontece: string;
  oQueTensDeFazer: string;
  baseLegal: string[];
}

/** Taxa de um escalão numa região. Nunca um literal. */
export function taxaDe(regiao: Regiao, escalao: EscalaoIVA): number {
  return IVA_TAXAS[regiao].value[escalao];
}

export interface EntradaSituacaoIVAPreco {
  regime: RegimeIVAVendedor;
  regiao: Regiao;
  escalaoVenda: EscalaoIVA;
  /**
   * Volume de negócios anual DECLARADO pelo utilizador. É o único número
   * com autoridade para corrigir o regime — ver o cabeçalho.
   */
  faturacaoAnual?: number;
  /** Tipo de vendedor, para o Art. 41.º e para o ato isolado. */
  tipoVendedor?: TipoVendedor;
  /** Art. 53.º n.º 5: no primeiro ano conta a estimativa do ano corrente. */
  primeiroAno?: boolean;
}

/**
 * `TipoVendedor` da engine de preço → `EntidadeIVA` do motor fiscal.
 *
 * Uma sociedade só entra como `"sociedade"` quando NÃO invocou uma isenção.
 * O motor trata a sociedade pelo Art. 41.º — regime normal, periodicidade —
 * e devolveria «tributado» a uma sociedade que declarasse estar isenta sem
 * dizer quanto fatura. Isso não seria uma derivação: seria ignorar a
 * resposta. Quem invoca uma isenção é analisado pelo limiar do Art. 53.º,
 * que é a regra que decide o caso dele — e que continua a corrigi-lo se a
 * faturação declarada provar que a isenção já caiu.
 */
function entidadeDe(tipo: TipoVendedor | undefined, pediuIsencao: boolean): EntidadeIVA {
  return tipo === "empresa" && !pediuIsencao ? "sociedade" : "ti";
}

/**
 * O que se entrega ao motor fiscal como «regime escolhido».
 *
 * `nao_sei` é o caso interessante: com faturação declarada, entrega-se
 * «isento» para que seja o LIMIAR a decidir — que é exatamente o serviço
 * que `situacaoIVA()` presta. Sem faturação declarada não há de onde
 * derivar, e mantém-se o pressuposto antigo: regime normal, porque é o que
 * produz o preço mais alto e o aviso mais útil. Assumir isenção seria
 * otimista no sítio errado — recomendaria um preço mais baixo a quem
 * afinal tem de entregar IVA ao Estado.
 */
function escolhaParaMotor(
  regime: RegimeIVAVendedor,
  escalaoVenda: EscalaoIVA,
  temFaturacao: boolean,
): { regimeEscolhido: RegimeIVA; isentoPorNatureza: boolean } {
  switch (regime) {
    case "isento_art53":
      return { regimeEscolhido: "isento", isentoPorNatureza: false };
    case "isento_art9":
      return { regimeEscolhido: "isento", isentoPorNatureza: true };
    case "nao_sei":
      return {
        regimeEscolhido: temFaturacao ? "isento" : escalaoVenda,
        isentoPorNatureza: false,
      };
    case "margem":
    case "normal":
    default:
      return { regimeEscolhido: escalaoVenda, isentoPorNatureza: false };
  }
}

/**
 * Resolve a situação de IVA do vendedor para efeitos de preço.
 *
 * Adaptador sobre `situacaoIVA()`: o enquadramento e toda a copy vêm do
 * motor fiscal; o que se decide aqui é só o que a engine de preço precisa e
 * o motor não conhece — se DEDUZ o IVA das compras e se está no regime da
 * margem do DL 199/96, que é um conceito de formação de preço e não uma
 * zona do Art. 53.º.
 */
export function situacaoIVAPreco(entrada: EntradaSituacaoIVAPreco): SituacaoIVAPreco {
  const { regime, regiao, escalaoVenda, tipoVendedor, primeiroAno } = entrada;

  const faturacaoConsiderada = naoNegativo(entrada.faturacaoAnual);
  const temFaturacao = faturacaoConsiderada > 0;
  const pediuIsencao = regime === "isento_art53" || regime === "isento_art9";
  const { regimeEscolhido, isentoPorNatureza } = escolhaParaMotor(
    regime,
    escalaoVenda,
    temFaturacao,
  );

  const derivada = situacaoIVA({
    faturacaoAnual: faturacaoConsiderada,
    regiao,
    regimeEscolhido,
    entidade: entidadeDe(tipoVendedor, pediuIsencao),
    primeiroAno,
    isentoPorNatureza,
  });

  // A escolha do utilizador diz se LIQUIDA IVA; o motor diz se a lei ainda
  // lho permite. A correção fica presa à única condição em que a lei não
  // deixa margem — e à faturação DECLARADA, nunca a uma projeção nossa.
  const pediuIsencaoPorLimiar = regime === "isento_art53" || regime === "nao_sei";
  const corrigidaPeloLimiar =
    pediuIsencaoPorLimiar &&
    !isentoPorNatureza &&
    temFaturacao &&
    faturacaoConsiderada > derivada.limiarImediato;

  // Quem manda, em três linhas:
  //  · Art. 9.º        → sempre isento, nenhum limiar o contraria;
  //  · isenção pedida  → a escolha vale, SALVO perda imediata provada pela
  //                      faturação declarada;
  //  · nao_sei/normal  → o motor decide, que é para isso que ele existe.
  const isentoEfetivo = isentoPorNatureza
    ? true
    : pediuIsencao
      ? !corrigidaPeloLimiar
      : derivada.regimeEfetivo === "isento";

  const comum = {
    escalaoVenda,
    zona: derivada.zona,
    limiar: derivada.limiar,
    limiarImediato: derivada.limiarImediato,
    margemAteLimiar: derivada.margemAteLimiar,
    periodicidade: derivada.periodicidade,
    faturacaoConsiderada,
    corrigidaPeloLimiar,
    titulo: derivada.titulo,
    oQueAcontece: derivada.oQueAcontece,
    quandoAcontece: derivada.quandoAcontece,
    oQueTensDeFazer: derivada.oQueTensDeFazer,
    baseLegal: derivada.baseLegal,
  };

  // ── Regime da margem (DL 199/96) ────────────────────────────────────
  // Não é uma zona do Art. 53.º: é uma base de incidência diferente para
  // quem revende bens em segunda mão. O motor fiscal não o modela, e por
  // isso é o único ramo que se decide aqui.
  if (regime === "margem") {
    return {
      ...comum,
      taxaVenda: taxaDe(regiao, escalaoVenda),
      liquida: true,
      deduz: false,
      regimeMargem: true,
      regime,
      explicacao:
        "Regime da margem (DL 199/96): o IVA incide sobre a diferença entre o preço de venda e o de compra, não sobre o preço total.",
    };
  }

  // ── Isento: pelo Art. 9.º, ou pelo limiar do Art. 53.º ──────────────
  if (isentoEfetivo) {
    const porNatureza = derivada.zona === "isento_natureza";
    return {
      ...comum,
      taxaVenda: 0,
      liquida: false,
      deduz: false,
      regimeMargem: false,
      regime: porNatureza ? "isento_art9" : "isento_art53",
      explicacao: porNatureza
        ? "Isento pela natureza da operação (Art. 9.º do CIVA). Não há limiar de faturação, mas também não há dedução do IVA suportado."
        : "Isento pelo Art. 53.º do CIVA: não acrescentas IVA ao preço, mas também não deduzes o IVA que pagas nas compras — por isso o teu custo real é o valor com IVA.",
    };
  }

  // ── Tributado: liquida e deduz ──────────────────────────────────────
  const escalaoEfetivo: EscalaoIVA =
    derivada.regimeEfetivo === "isento" ? escalaoVenda : derivada.regimeEfetivo;

  return {
    ...comum,
    escalaoVenda: escalaoEfetivo,
    taxaVenda: derivada.taxaEfetiva,
    liquida: true,
    deduz: true,
    regimeMargem: false,
    regime: "normal",
    explicacao: corrigidaPeloLimiar
      ? `Disseste que estás isento, mas com ${Math.round(faturacaoConsiderada).toLocaleString("pt-PT")} € de faturação anual já ultrapassaste os ${derivada.limiarImediato.toLocaleString("pt-PT")} € do Art. 58.º n.º 2 b) — a isenção cessa de imediato. O preço está calculado com IVA, que é o que vais ter de entregar.`
      : "Regime normal de IVA: liquidas IVA ao cliente e deduzes o IVA que suportas nas compras — por isso o custo relevante é o valor sem IVA.",
  };
}

/**
 * Converte um valor introduzido pelo utilizador no CUSTO RELEVANTE.
 *
 * A regra em duas linhas:
 *   · quem deduz  → o custo é a base tributável (sem IVA)
 *   · quem não deduz → o custo é o valor pago (com IVA)
 *
 * O que torna isto subtil é que o valor introduzido pode vir de qualquer
 * das formas, e o utilizador raramente sabe qual delas tem à frente. Por
 * isso `ValorComIVA` obriga a declarar — não há omissão possível.
 */
export function custoRelevante(entrada: ValorComIVA, regiao: Regiao, deduz: boolean): number {
  const valor = naoNegativo(entrada?.valor);
  if (valor === 0) return 0;

  const taxaCompra = taxaDe(regiao, entrada.escalao);
  const semIVA = entrada.incluiIVA ? dividir(valor, 1 + taxaCompra, valor) : valor;
  const comIVA = entrada.incluiIVA ? valor : valor * (1 + taxaCompra);

  return deduz ? semIVA : comIVA;
}

/** Quanto de IVA está «preso» no custo por não ser dedutível. */
export function ivaNaoDedutivel(entrada: ValorComIVA, regiao: Regiao, deduz: boolean): number {
  if (deduz) return 0;
  const valor = naoNegativo(entrada?.valor);
  if (valor === 0) return 0;
  const taxaCompra = taxaDe(regiao, entrada.escalao);
  return entrada.incluiIVA
    ? valor - dividir(valor, 1 + taxaCompra, valor)
    : valor * taxaCompra;
}

/** PVP a partir do preço líquido. */
export const pvpDe = (precoLiquido: number, taxa: number): number =>
  num(precoLiquido) * (1 + fracao(taxa, 0, 1));

/** Preço líquido a partir do PVP. */
export const liquidoDe = (pvp: number, taxa: number): number =>
  dividir(num(pvp), 1 + fracao(taxa, 0, 1), num(pvp));

/**
 * IVA a entregar ao Estado por unidade vendida.
 *
 * No regime da margem incide só sobre a diferença — e nunca sobre uma
 * margem negativa, porque não há IVA a devolver por vender com prejuízo.
 */
export function ivaAEntregar(
  precoLiquido: number,
  custoDireto: number,
  situacao: SituacaoIVAPreco,
): number {
  if (!situacao.liquida) return 0;
  if (situacao.regimeMargem) {
    const margem = Math.max(0, num(precoLiquido) - num(custoDireto));
    return margem * situacao.taxaVenda;
  }
  return num(precoLiquido) * situacao.taxaVenda;
}
