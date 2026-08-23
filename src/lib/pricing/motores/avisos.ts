// ═══════════════════════════════════════════════════════════════════════
//  AVISOS — o que a ferramenta tem obrigação de dizer
//  ---------------------------------------------------------------------
//  Um simulador que devolve «9,99 €» e fica calado quando esse preço perde
//  dinheiro não é neutro: é cúmplice. Este motor existe para que o
//  resultado nunca possa ser apresentado sem os avisos que o acompanham.
//
//  Três famílias:
//   · financeiros — estás a vender abaixo do custo, a margem não fecha, o
//     break-even é inalcançável;
//   · fiscais — limiares que estás prestes a cruzar (Art. 53.º, vendas à
//     distância na UE), efeitos que mudam a conta;
//   · legais — o que a lei portuguesa obriga a fazer com o preço depois de
//     ele estar decidido (afixação, saldos, devoluções).
//
//  A terceira família é a que nenhuma calculadora tem e é a que evita
//  coimas.
// ═══════════════════════════════════════════════════════════════════════

import { IVA_ISENCAO_LIMITE } from "../../fiscal-data";
import type {
  Aviso,
  ContextoPreco,
  DetalheBreakEven,
  DetalheFiscalVendedor,
  ResultadoDesconto,
} from "../tipos";
import { LIVRE_RESOLUCAO, PRECO_AO_CONSUMIDOR, REDUCAO_PRECO_30_DIAS, VENDAS_DISTANCIA_UE } from "../regras";
import type { ResultadoComissoes } from "./comissoes";
import type { ResultadoCustos } from "./custos";
import type { SaidaSolver } from "./preco";
import type { SaidaMargem } from "./margem";
import { taxaDe, type SituacaoIVAPreco } from "./iva";
import type { ResultadoTempo } from "./tempo";
import { capacidadeMensal } from "./tempo";
import { num } from "../numeros";

const eur = (n: number) => `${num(n).toFixed(2).replace(".", ",")} €`;
const pctTexto = (n: number) => `${(num(n) * 100).toFixed(1).replace(".", ",")}%`;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export interface EntradaAvisos {
  contexto: ContextoPreco;
  situacaoIVA: SituacaoIVAPreco;
  saida: SaidaSolver;
  margem: SaidaMargem;
  breakEven: DetalheBreakEven;
  fiscal: DetalheFiscalVendedor;
  desconto?: ResultadoDesconto;
  comissoes: ResultadoComissoes;
  custos: ResultadoCustos;
  tempo: ResultadoTempo | null;
  unidadesMes: number;
}

export function reunirAvisos(e: EntradaAvisos): Aviso[] {
  const avisos: Aviso[] = [];

  // ═══ 1. Financeiros ══════════════════════════════════════════════

  if (!e.saida.ok && e.saida.motivo === "margem_inalcancavel") {
    avisos.push({
      id: "margem-impossivel",
      severidade: "perigo",
      titulo: "Essa margem não existe a nenhum preço",
      texto: `Depois de comissões e impostos sobre a faturação, sobram-te ${pctTexto(
        Math.max(0, e.saida.fracaoDisponivel),
      )} de cada euro cobrado. Subir o preço não ajuda — as comissões sobem na mesma proporção. O que muda o resultado é baixar a margem pretendida, negociar a comissão ou mudar de canal.`,
    });
  }

  if (e.saida.ok && e.margem.contribuicaoUnidade < 0) {
    avisos.push({
      id: "abaixo-do-custo",
      severidade: "perigo",
      titulo: "A este preço perdes dinheiro em cada venda",
      texto: `Cada venda tira-te ${eur(
        Math.abs(e.margem.contribuicaoUnidade),
      )} depois de tudo o que varia com ela. Vender mais não resolve: aumenta o prejuízo na mesma proporção.`,
    });
  } else if (e.saida.ok && e.margem.lucroUnidade < 0) {
    avisos.push({
      id: "nao-cobre-fixos",
      severidade: "atencao",
      titulo: "Cobre a venda, não cobre as contas fixas",
      texto: `Sobra ${eur(
        e.margem.contribuicaoUnidade,
      )} por venda, mas a tua parte de custos fixos é maior do que isso ao volume que esperas. Ou vendes mais, ou cobras mais, ou cortas fixos.`,
    });
  }

  if (e.saida.ok && e.margem.contribuicaoPercentagem > 0 && e.margem.contribuicaoPercentagem < 0.1) {
    avisos.push({
      id: "margem-fina",
      severidade: "atencao",
      titulo: "Margem muito fina",
      texto: `Ficas com ${pctTexto(
        e.margem.contribuicaoPercentagem,
      )} de margem de contribuição. Um aumento de 5% no custo do fornecedor come quase tudo — e um desconto de 5% também.`,
    });
  }

  if (e.breakEven.possivel && e.unidadesMes > 0 && e.breakEven.unidades > e.unidadesMes) {
    avisos.push({
      id: "break-even-inalcancavel",
      severidade: "atencao",
      titulo: "Não chegas ao equilíbrio com o volume que esperas",
      texto: `Precisas de ${e.breakEven.unidades} vendas por mês e esperas ${e.unidadesMes}. A diferença são ${
        e.breakEven.unidades - e.unidadesMes
      } vendas — ou o equivalente em preço.`,
    });
  }

  const capacidade = capacidadeMensal(e.tempo);
  if (capacidade !== null && e.unidadesMes > capacidade) {
    avisos.push({
      id: "capacidade-excedida",
      severidade: "atencao",
      titulo: "Não tens horas para esse volume",
      texto: `Com as horas faturáveis que declaraste, cabem ${capacidade} por mês — e estás a contar com ${e.unidadesMes}. O preço pode estar certo e o plano continuar a ser impossível.`,
    });
  }

  if (e.comissoes.sobreBruto >= 0.2) {
    avisos.push({
      id: "comissao-alta",
      severidade: "info",
      titulo: "A comissão pesa mais do que parece",
      texto: `${pctTexto(e.comissoes.sobreBruto)} sobre o valor com IVA equivalem a ${pctTexto(
        e.comissoes.sobreBruto * (1 + e.situacaoIVA.taxaVenda),
      )} do que te fica. É a diferença que a maioria das contas de cabeça ignora.`,
    });
  }

  // ═══ 2. Fiscais ══════════════════════════════════════════════════

  if (e.situacaoIVA.regime === "isento_art53") {
    const anual = e.unidadesMes * 12;
    avisos.push({
      id: "isencao-art53-duplo-efeito",
      severidade: "info",
      titulo: "Estar isento de IVA não é só não cobrar IVA",
      texto: `Também não deduzes o IVA que pagas nas compras (Art. 53.º n.º 3), por isso o teu custo real é o valor com IVA — é assim que está calculado aqui.${
        anual > 0
          ? ` Atenção ao limiar: acima de ${eur(IVA_ISENCAO_LIMITE.value)} de faturação anual deixas de estar isento.`
          : ""
      }`,
      fonte: "Art. 53.º CIVA",
      fonteUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
    });
  }

  // ── Regime da margem: o que a engine ainda NÃO põe dentro do preço ──
  //  Declarar a inexatidão em vez de a esconder. No DL 199/96 o IVA está
  //  CONTIDO na margem — não se acrescenta ao preço —, e o solver ainda o
  //  trata como taxa por cima. A tesouraria já usa a fórmula certa
  //  (t/(1+t) sobre a margem); a formação do preço não, e enquanto for
  //  assim tem de estar dito.
  if (e.situacaoIVA.regimeMargem) {
    avisos.push({
      id: "regime-margem-confirmar-enquadramento",
      severidade: "atencao",
      titulo: "O regime da margem exige enquadramento próprio",
      texto:
        "Neste regime o IVA incide sobre a diferença entre o que pagaste e o que vais receber — e está CONTIDO nessa margem, não acrescentado ao preço. Aqui o preço ainda é formado como se o IVA fosse por cima: usa-o como ponto de partida e confirma o enquadramento com o teu contabilista antes de o afixar.",
      fonte: "DL n.º 199/96 — regime especial de tributação da margem",
      fonteUrl: "https://diariodarepublica.pt/dr/detalhe/decreto-lei/199-1996-435847",
    });
  }

  // ── Contas fixas declaradas sem volume para as repartir ────────────
  //  Sem unidades por mês não há por onde dividir a renda, e ela cai fora
  //  do preço inteira. O número deixa de estar errado por pouco: fica
  //  otimista pelo valor todo da estrutura. Dizê-lo é a única saída
  //  honesta — inventar um volume seria pior.
  if (e.custos.fixosMensais > 0 && e.unidadesMes <= 0) {
    avisos.push({
      id: "fixos-sem-volume",
      severidade: "atencao",
      titulo: "As tuas contas fixas ficaram de fora deste preço",
      texto: `Declaraste ${eur(
        e.custos.fixosMensais,
      )} por mês de custos fixos, mas não disseste quantas vendas esperas — e sem isso não há por onde os repartir. O preço acima cobre o que cada venda custa, não a tua estrutura. Indica o volume mensal e ele passa a cobrir as duas coisas.`,
    });
  }

  // ── Ato isolado: nunca isento, por muito baixo que seja ────────────
  //  O erro que este aviso existe para evitar: «é só um trabalho pequeno,
  //  não chego aos 15 000 €, logo não levo IVA». O Art. 53.º n.º 6 a)
  //  exclui a isenção de quem pratica uma só operação tributável, e quem
  //  passar o recibo sem IVA fica a dever esse IVA ao Estado.
  if (e.contexto.cenario === "ato_isolado") {
    avisos.push({
      id: "ato-isolado-leva-iva",
      severidade: "atencao",
      titulo: "Num ato isolado há sempre IVA",
      texto:
        `${e.situacaoIVA.oQueAcontece} ${e.situacaoIVA.oQueTensDeFazer} O limiar dos ` +
        `${eur(IVA_ISENCAO_LIMITE.value)} não te salva aqui: ele é para quem tem atividade aberta.`,
      fonte: "Art. 53.º, n.º 6, al. a) CIVA",
      fonteUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
    });
  }

  // ── O limiar do Art. 53.º visto A PARTIR DO PREÇO ──────────────────
  //  A pergunta que uma calculadora de preços pode responder e um
  //  simulador de IRS não: a este preço e a este volume, QUANDO é que
  //  deixo de estar isento?
  //
  //  A projeção é nossa, não é um facto do utilizador — por isso avisa e
  //  nunca corrige o regime (ver o cabeçalho de `iva.ts`). O mês sai de
  //  uma faturação constante ao longo do ano: é o pressuposto mais simples
  //  que se pode declarar, e está declarado no texto.
  if (
    e.saida.ok &&
    !e.situacaoIVA.liquida &&
    e.situacaoIVA.zona !== "isento_natureza" &&
    e.unidadesMes > 0
  ) {
    const faturacaoMes = e.saida.precoLiquido * e.unidadesMes;
    const projetada = faturacaoMes * 12;
    const limiar = e.situacaoIVA.limiar;

    if (projetada > limiar && faturacaoMes > 0) {
      // Em que mês a faturação acumulada cruza o limiar.
      const mes = Math.min(12, Math.ceil(limiar / faturacaoMes));
      const acimaDoImediato = projetada > e.situacaoIVA.limiarImediato;
      avisos.push({
        id: "limiar-art53-a-este-preco",
        severidade: acimaDoImediato ? "atencao" : "info",
        titulo: `A este preço, passas o limiar da isenção em ${MESES[mes - 1]}`,
        texto:
          `Com ${eur(e.saida.precoLiquido)} por unidade e ${e.unidadesMes} unidades por mês, ` +
          `faturas cerca de ${eur(projetada)} por ano — acima dos ${eur(limiar)} do Art. 53.º. ` +
          (acimaDoImediato
            ? `E como isso ultrapassa os ${eur(e.situacaoIVA.limiarImediato)} (o limiar excedido em mais de 25%), a isenção cai de imediato, não em janeiro: ` +
              `a partir daí ou o teu PVP sobe ${pctTexto(taxaDe(e.contexto.vendedor.regiao, e.situacaoIVA.escalaoVenda))} ou a margem desce.`
            : `A isenção só se perde a 1 de janeiro seguinte — mas a partir daí ou o teu PVP sobe ` +
              `${pctTexto(taxaDe(e.contexto.vendedor.regiao, e.situacaoIVA.escalaoVenda))} ou a margem desce. ` +
              `Vale a pena decidir isso agora, e não em janeiro.`) +
          " A conta assume que vendes o mesmo todos os meses; se a tua atividade for sazonal, o mês muda.",
        fonte: acimaDoImediato ? "Art. 58.º n.º 2 b) CIVA" : "Art. 58.º n.º 2 a) CIVA",
        fonteUrl:
          "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-58-o-do-civa.aspx",
      });
    }
  }

  // A derivação contrariou a resposta do utilizador. Nunca em silêncio.
  if (e.situacaoIVA.corrigidaPeloLimiar) {
    avisos.push({
      id: "isencao-ja-perdida",
      severidade: "atencao",
      titulo: "Disseste que estás isento, mas já não podes estar",
      texto: `${e.situacaoIVA.oQueAcontece} ${e.situacaoIVA.oQueTensDeFazer} O preço aqui já está calculado com IVA — recomendar-te um preço sem ele seria recomendar-te um preço que não cobre o que vais ter de entregar.`,
      fonte: e.situacaoIVA.baseLegal[0],
    });
  }

  // Art. 41.º: a periodicidade não muda o preço, mas muda a tesouraria —
  // e o motor fiscal já a sabe, por isso não custa nada dizê-la.
  if (e.situacaoIVA.periodicidade === "mensal") {
    avisos.push({
      id: "iva-declaracao-mensal",
      severidade: "info",
      titulo: "A tua declaração de IVA é mensal",
      texto: `${e.situacaoIVA.quandoAcontece} Isso muda a tesouraria: o IVA que cobras fica menos tempo na tua conta do que ficaria no regime trimestral.`,
      fonte: "Art. 41.º n.º 1 CIVA",
    });
  }

  // O motor de tempo produz a comparação mais útil que esta ferramenta tem
  // — «a conta rápida daria X €/hora; com férias, horas não faturáveis e
  // impostos, o número real é Y» — e ela estava a ser calculada e deitada
  // fora: `ResultadoPreco` não expõe o tempo, e ninguém lia `tempo.notas`.
  for (const [i, nota] of (e.tempo?.notas ?? []).entries()) {
    avisos.push({
      id: `tempo-nota-${i}`,
      severidade: "info",
      titulo: "A conta por hora não é o que parece",
      texto: nota,
    });
  }

  if (e.contexto.vendedor.tipo === "ti" && !e.contexto.vendedor.faturacaoAnualPrevista) {
    avisos.push({
      id: "sem-faturacao-anual",
      severidade: "info",
      titulo: "Sem a tua faturação anual, o IRS fica de fora",
      texto:
        "O mesmo euro faturado custa 13% de IRS a quem fatura 12 000 € e 43,5% a quem fatura 60 000 €. Diz-nos a faturação anual prevista e o preço passa a contar com o imposto real.",
    });
  }

  // Descoberta durante a verificação numérica, e vale a pena dizê-la:
  // a taxa marginal de IRS de um trabalhador independente NÃO cresce sempre
  // com a faturação. Entre ~12 000 € e ~16 000 €, a extinção progressiva do
  // mínimo de existência empurra-a acima de 40% — mais alta do que a de quem
  // fatura 70 000 €. Quem está nessa faixa perde quase metade de cada euro
  // adicional para o IRS, e ninguém lho diz.
  if (
    e.fiscal.aplicavel &&
    e.fiscal.irsFracao > 0.35 &&
    num(e.contexto.vendedor.faturacaoAnualPrevista) > 0 &&
    num(e.contexto.vendedor.faturacaoAnualPrevista) < 20000
  ) {
    avisos.push({
      id: "zona-minimo-existencia",
      severidade: "atencao",
      titulo: "Estás numa faixa em que cada euro extra é muito caro",
      texto: `Ao nível de faturação que indicaste, ${pctTexto(
        e.fiscal.irsFracao,
      )} de cada euro adicional vai para o IRS — mais do que paga quem fatura 70 000 €. É o efeito da extinção progressiva do mínimo de existência, e passa assim que ultrapassares esta faixa. Não é razão para cobrar menos: é razão para saber que o salto seguinte compensa mais do que parece.`,
      fonte: "Art. 70.º CIRS — mínimo de existência",
      fonteUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs70.aspx",
    });
  }

  // ── R9 · Regiões autónomas ─────────────────────────────────────────
  //  A Lei das Finanças das Regiões Autónomas (Lei Orgânica 2/2013) permite
  //  às assembleias regionais baixar as taxas nacionais de IRS até 30%, e em
  //  2026 as duas regiões aplicam o diferencial máximo em TODOS os escalões.
  //  O motor já o aplica — este aviso existe para a pessoa saber que está a
  //  ser aplicado, e para tornar visível a única coisa que o pode tornar
  //  errado: o IRS segue a RESIDÊNCIA, e o campo que o decide é o mesmo que
  //  responde pelo IVA, que segue a OPERAÇÃO. Coincidem quase sempre. Quando
  //  não coincidem, mais vale a pessoa saber do que descobrir na liquidação.
  const vend = e.contexto.vendedor;
  const residencia = vend.residenciaFiscal ?? vend.regiao;
  if (vend.tipo === "ti" && (residencia === "madeira" || residencia === "acores")) {
    const regiaoNome = residencia === "madeira" ? "Madeira" : "Açores";
    avisos.push({
      id: "irs-regiao-autonoma",
      severidade: "info",
      titulo: `Este preço já conta com o IRS mais baixo da ${regiaoNome}`,
      texto: `Quem reside fiscalmente na ${regiaoNome} paga menos 30% de IRS do que no continente, em todos os escalões, e a redução abrange o rendimento da tua atividade. Esse desconto já está neste cálculo — por isso o preço que te propomos é mais baixo do que seria para a mesma pessoa em Lisboa. Uma ressalva: quem decide isto é onde RESIDES, não onde está o cliente. Se resides no continente e só tens cá atividade, diz-nos — o IVA continua a ser o da região, mas o IRS não.`,
      fonte: "Lei Orgânica 2/2013 (Finanças das Regiões Autónomas) — diferencial de 30% nas taxas do Art. 68.º CIRS",
      fonteUrl: "https://diariodarepublica.pt/dr/detalhe/lei-organica/2-2013-499317",
    });
  }

  if (e.contexto.vendedor.isencaoSSPrimeiroAno) {
    avisos.push({
      id: "ss-primeiro-ano",
      severidade: "atencao",
      titulo: "O teu preço tem de aguentar o segundo ano",
      texto:
        "A isenção de Segurança Social do primeiro ano acaba. Quando acabar, cerca de 15% de cada euro de serviços passa a sair para a Segurança Social. Um preço calculado sem isso deixa de fechar exatamente quando as contas começam.",
      fonte: "Art. 157.º do Código Contributivo",
      fonteUrl: "https://www.seg-social.pt",
    });
  }

  if (e.contexto.canal.cliente === "empresa_ue") {
    avisos.push({
      id: "b2b-ue-autoliquidacao",
      severidade: "info",
      titulo: "Cliente empresa noutro país da UE",
      texto:
        "Em serviços B2B intracomunitários aplica-se a autoliquidação: não liquidas IVA português, mas precisas de registo no VIES e de declaração recapitulativa. Confirma o enquadramento antes de emitir a fatura.",
      fonte: "Art. 6.º n.º 6 CIVA",
      fonteUrl:
        "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva6.aspx",
    });
  }

  if (
    e.contexto.canal.canal === "loja_online" &&
    e.contexto.canal.cliente === "consumidor" &&
    e.unidadesMes > 0
  ) {
    avisos.push({
      id: "vendas-distancia-ue",
      severidade: "info",
      titulo: "Se vendes para outros países da UE",
      texto: `Acima de ${eur(
        VENDAS_DISTANCIA_UE.value.limiarAnual,
      )} por ano em vendas a consumidores noutros Estados-membros, o IVA passa a ser o do país de destino — o que muda o teu PVP em cada mercado. O Balcão Único (OSS) simplifica a declaração.`,
      fonte: VENDAS_DISTANCIA_UE.fonte,
      fonteUrl: VENDAS_DISTANCIA_UE.fonteUrl,
    });
  }

  // ═══ 3. Legais ═══════════════════════════════════════════════════

  if (e.contexto.canal.cliente === "consumidor") {
    avisos.push({
      id: "preco-consumidor-com-iva",
      severidade: "info",
      titulo: "O preço que mostras ao consumidor é o preço com IVA",
      texto:
        "A lei portuguesa obriga a indicar o preço total, com todos os impostos e encargos incluídos, de forma visível e inequívoca. O valor sem IVA é para a tua gestão, não para a montra.",
      fonte: PRECO_AO_CONSUMIDOR.fonte,
      fonteUrl: PRECO_AO_CONSUMIDOR.fonteUrl,
    });
  }

  if (e.desconto && e.desconto.percentagem > 0) {
    avisos.push({
      id: "regra-30-dias",
      severidade: "atencao",
      titulo: "Anunciar um desconto tem regras",
      texto: `O preço de referência que podes anunciar é o mais baixo que praticaste nos ${REDUCAO_PRECO_30_DIAS.value.dias} dias anteriores — incluindo promoções nesse período. Saldos exigem ainda comunicação à ASAE com ${REDUCAO_PRECO_30_DIAS.value.diasAntecedenciaComunicacao} dias úteis de antecedência.`,
      fonte: REDUCAO_PRECO_30_DIAS.fonte,
      fonteUrl: REDUCAO_PRECO_30_DIAS.fonteUrl,
    });

    if (e.desconto.destruiRentabilidade) {
      avisos.push({
        id: "desconto-destroi-margem",
        severidade: "perigo",
        titulo: "Este desconto tira-te dinheiro",
        texto: `Com ${pctTexto(e.desconto.percentagem)} de desconto passas de ${eur(
          e.desconto.lucroAntes,
        )} para ${eur(e.desconto.lucroDepois)} por venda. O máximo que aguentas antes de perder dinheiro é ${pctTexto(
          e.desconto.descontoMaximo,
        )}.`,
      });
    } else if (e.desconto.unidadesExtraParaCompensar && e.desconto.unidadesExtraParaCompensar > 0) {
      avisos.push({
        id: "desconto-volume-necessario",
        severidade: "info",
        titulo: "Quanto tens de vender a mais para compensar",
        texto: `Para manteres o mesmo lucro total com ${pctTexto(
          e.desconto.percentagem,
        )} de desconto, precisas de mais ${e.desconto.unidadesExtraParaCompensar} vendas por mês. Se a campanha não trouxer isso, o desconto custa dinheiro.`,
      });
    }
  }

  if (
    e.contexto.canal.canal === "loja_online" ||
    e.contexto.canal.canal === "marketplace" ||
    e.contexto.canal.canal === "redes_sociais"
  ) {
    const semDevolucoes = !e.contexto.custos.taxaDevolucao;
    avisos.push({
      id: "devolucoes-online",
      severidade: semDevolucoes ? "atencao" : "info",
      titulo: semDevolucoes ? "Não contaste com devoluções" : "Devoluções nas vendas à distância",
      texto: `Na venda à distância o consumidor tem ${LIVRE_RESOLUCAO.value.dias} dias para devolver sem dar motivo, e tu reembolsas os portes de entrega originais.${
        semDevolucoes
          ? " Com zero por cento de devoluções no cálculo, o preço está otimista."
          : ""
      }`,
      fonte: LIVRE_RESOLUCAO.fonte,
      fonteUrl: LIVRE_RESOLUCAO.fonteUrl,
    });
  }

  // ═══ 4. Qualidade dos dados ══════════════════════════════════════

  if (e.custos.fixosMensais === 0 && e.contexto.vendedor.tipo !== "particular") {
    avisos.push({
      id: "sem-custos-fixos",
      severidade: "info",
      titulo: "Zero custos fixos é raro",
      texto:
        "Contabilidade, software de faturação, seguros, telecomunicações, renda ou a Segurança Social mínima existem mesmo nos meses sem vendas. Sem eles, o mínimo sustentável aparece mais baixo do que é.",
    });
  }

  return avisos;
}
