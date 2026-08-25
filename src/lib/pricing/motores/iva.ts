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
  /**
   * Inversão do sujeito passivo (Art. 2.º, n.º 1, al. j) CIVA): não
   * liquida, mas DEDUZ. É a combinação que nenhuma isenção tem.
   */
  autoliquidacao: boolean;
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
   * É um ato isolado? Muda a regra: NUNCA é isento pelo Art. 53.º, por
   * muito baixo que seja o valor (n.º 6, al. a). Quem passa um recibo único
   * e conclui «não chego ao limiar, logo não levo IVA» engana-se — e só
   * descobre depois.
   */
  atoIsolado?: boolean;
  /**
   * Volume de negócios anual DECLARADO pelo utilizador. É o único número
   * com autoridade para corrigir o regime — ver o cabeçalho.
   */
  faturacaoAnual?: number;
  /** Tipo de vendedor, para o Art. 41.º e para o ato isolado. */
  tipoVendedor?: TipoVendedor;
  /** Art. 53.º n.º 5: no primeiro ano conta a estimativa do ano corrente. */
  primeiroAno?: boolean;
  /**
   * Serviços de construção civil a um sujeito passivo nacional com direito
   * à dedução: inverte-se o sujeito passivo. Ver `AUTOLIQUIDACAO_CONSTRUCAO`.
   */
  autoliquidacaoConstrucao?: boolean;
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
function entidadeDe(
  tipo: TipoVendedor | undefined,
  pediuIsencao: boolean,
  atoIsolado: boolean,
): EntidadeIVA {
  // O ato isolado manda sobre tudo: a sua regra é do próprio Art. 53.º e
  // não é uma preferência do utilizador que se possa contrariar.
  if (atoIsolado) return "ato_isolado";
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
  const atoIsolado = !!entrada.atoIsolado;

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
    entidade: entidadeDe(tipoVendedor, pediuIsencao, atoIsolado),
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
    : atoIsolado
      ? // Art. 53.º n.º 6 a): num ato isolado não há isenção por limiar,
        // escolha nenhuma a repõe, e o motor já devolveu a taxa devida.
        derivada.regimeEfetivo === "isento"
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
      autoliquidacao: false,
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
      // Quem já não liquida por estar isento não «inverte» nada: a fatura
      // sai sem imposto pelo Art. 53.º, e o direito à dedução continua a
      // não existir (n.º 3). Marcar aqui autoliquidação daria a esta
      // pessoa um custo sem IVA que ela não tem.
      autoliquidacao: false,
      regime: porNatureza ? "isento_art9" : "isento_art53",
      explicacao: porNatureza
        ? "Isento pela natureza da operação (Art. 9.º do CIVA). Não há limiar de faturação, mas também não há dedução do IVA suportado."
        : "Isento pelo Art. 53.º do CIVA: não acrescentas IVA ao preço, mas também não deduzes o IVA que pagas nas compras — por isso o teu custo real é o valor com IVA.",
    };
  }

  // ── Tributado: liquida e deduz ──────────────────────────────────────
  const escalaoEfetivo: EscalaoIVA =
    derivada.regimeEfetivo === "isento" ? escalaoVenda : derivada.regimeEfetivo;

  // ── Inversão do sujeito passivo (construção civil) ──────────────────
  //  NÃO É UMA ISENÇÃO, e é por isso que tem ramo próprio. O prestador não
  //  liquida — quem liquida é o adquirente — mas continua a DEDUZIR o IVA
  //  das compras nos termos gerais (arts. 19.º a 26.º). Tratar isto como
  //  «taxa = 0» reutilizando o ramo da isenção punha o custo dele COM IVA,
  //  inflando a base de custo em até 23% e o preço com ela.
  //
  //  Só aqui, depois de a isenção estar afastada: quem está isento pelo
  //  Art. 53.º já não liquidava, e a inversão não lhe devolve a dedução.
  if (entrada.autoliquidacaoConstrucao) {
    return {
      ...comum,
      escalaoVenda: escalaoEfetivo,
      taxaVenda: 0,
      liquida: false,
      deduz: true,
      regimeMargem: false,
      autoliquidacao: true,
      regime: "normal",
      explicacao:
        "Serviços de construção civil a um sujeito passivo nacional: inverte-se o sujeito passivo (Art. 2.º, n.º 1, al. j) CIVA). A fatura sai sem IVA, com a menção «IVA — autoliquidação», e é o teu cliente que o liquida e entrega. Não é isenção: continuas a deduzir o IVA das tuas compras, e por isso o teu custo é o valor SEM IVA.",
    };
  }

  return {
    ...comum,
    escalaoVenda: escalaoEfetivo,
    taxaVenda: derivada.taxaEfetiva,
    liquida: true,
    deduz: true,
    regimeMargem: false,
    autoliquidacao: false,
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

/**
 * O IVA suportado na compra que é RECUPERÁVEL — o outro lado de
 * `ivaNaoDedutivel`.
 *
 * Não muda o custo (quem deduz já tem o custo na base tributável), mas muda
 * a TESOURARIA: é isto que se abate ao IVA liquidado antes de entregar o
 * saldo ao Estado. Ignorá-lo faz a ferramenta mandar reservar o IVA todo
 * das vendas, que pode ser várias vezes o que a pessoa deve mesmo.
 */
export function ivaDedutivel(entrada: ValorComIVA, regiao: Regiao, deduz: boolean): number {
  if (!deduz) return 0;
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

// ═══════════════════════════════════════════════════════════════════════
//  O CONVERSOR — líquido ↔ PVP, com o regime lá dentro
//  ---------------------------------------------------------------------
//  `× (1 + t)` estava escrito à mão em cinco ficheiros. Enquanto só havia
//  um regime isso era repetição inofensiva; com o regime da margem passa a
//  ser cinco sítios a poder discordar sobre quanto o cliente paga.
//
//  ── O regime da margem (DL 199/96) ───────────────────────────────────
//
//  O IVA incide sobre a diferença entre o que se vendeu e o que se
//  comprou, e está CONTIDO nela — a fatura não o mostra à parte (Art. 6.º)
//  e o vendedor não deduz o IVA da aquisição (Art. 5.º).
//
//  Mantendo `precoLiquido` com o significado que tem em todo o lado — a
//  RECEITA do vendedor, já sem o IVA que vai entregar — sai:
//
//      IVA  = t × (P − Cₐ)              ← margem líquida × taxa
//      PVP  = P + IVA = P(1+t) − Cₐ·t
//
//  e `PVP = P + IVA` continua verdadeiro, que é o invariante 1. A conta
//  bate com a forma legal `(PVP − Cₐ) × t/(1+t)`: são a mesma coisa vista
//  da margem líquida e da margem bruta.
//
//  Consequência prática, e é grande: um bem comprado a 100 € com 142,86 €
//  de receita pretendida custa ao cliente 152,72 €, não 175,71 €. Vinte e
//  três euros de diferença — o preço a que o negócio se perde.
//
//  Abaixo do custo de aquisição não há IVA negativo: o Estado não devolve
//  imposto por se vender com prejuízo. Daí o `max(0, …)`, que é também o
//  que torna a função invertível em todo o domínio.
// ═══════════════════════════════════════════════════════════════════════

export interface ConversorPreco {
  /** Taxa da venda. No regime da margem, a taxa que incide na margem. */
  readonly taxa: number;
  /** O que o cliente paga, a partir da receita do vendedor. */
  paraPVP(precoLiquido: number): number;
  /** A receita do vendedor, a partir do que o cliente paga. */
  paraLiquido(pvp: number): number;
  /** O IVA contido neste preço. Sempre `paraPVP(p) − p`. */
  iva(precoLiquido: number): number;
}

export function conversorDe(
  situacao: Pick<SituacaoIVAPreco, "taxaVenda" | "regimeMargem">,
  custoAquisicao = 0,
): ConversorPreco {
  const t = fracao(situacao.taxaVenda, 0, 1);
  const ca = naoNegativo(custoAquisicao);

  if (!situacao.regimeMargem || ca <= 0) {
    return {
      taxa: t,
      paraPVP: (p) => num(p) * (1 + t),
      paraLiquido: (g) => dividir(num(g), 1 + t, num(g)),
      iva: (p) => num(p) * t,
    };
  }

  return {
    taxa: t,
    paraPVP: (p) => num(p) + Math.max(0, num(p) - ca) * t,
    // Inversa exata: abaixo do custo de aquisição não há imposto, logo o
    // que o cliente paga é o que o vendedor recebe.
    paraLiquido: (g) => (num(g) <= ca ? num(g) : dividir(num(g) + ca * t, 1 + t, num(g))),
    iva: (p) => Math.max(0, num(p) - ca) * t,
  };
}

/**
 * IVA a ENTREGAR ao Estado por unidade vendida. Não é o IVA liquidado: é o
 * saldo, já abatido do IVA dedutível suportado nas compras (Art. 19.º e
 * 22.º do CIVA). É este o número que sai da conta.
 *
 * A diferença não é cosmética. Um revendedor no regime normal que compre a
 * 100 € e venda a 146 € liquida 33,64 € e deduz 23,00 €: entrega 10,64 €.
 * Reservar os 33,64 € é reservar mais do triplo do devido — o mesmo tipo de
 * erro que reservar a menos, e igualmente capaz de estragar um mês.
 *
 * Nunca devolve negativo: uma posição credora é real (reporte ou pedido de
 * reembolso), mas não é dinheiro a sair, e é isso que esta função responde.
 */
export function ivaAEntregar(
  precoLiquido: number,
  custoAquisicao: number,
  situacao: SituacaoIVAPreco,
  ivaDedutivelPorUnidade = 0,
): number {
  if (!situacao.liquida) return 0;

  if (situacao.regimeMargem) {
    // DL 199/96: incide sobre a margem, e `precoLiquido` já é a receita do
    // vendedor sem o imposto — logo `t` sobre a margem LÍQUIDA, que é a
    // mesma conta que `t/(1+t)` sobre a margem bruta. Ver `conversorDe`.
    return conversorDe(situacao, custoAquisicao).iva(precoLiquido);
  }

  const liquidado = num(precoLiquido) * situacao.taxaVenda;
  return Math.max(0, liquidado - naoNegativo(ivaDedutivelPorUnidade));
}
