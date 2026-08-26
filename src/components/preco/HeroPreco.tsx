"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m, useReducedMotion, type Transition } from "motion/react";
import {
  ArrowRight,
  Building,
  CheckTrend,
  Clock,
  Coin,
  LayoutGrid,
  Lock,
  Receipt,
  RotateCcw,
  Scale,
  ShieldCheck,
  ShoppingBag,
} from "@/components/ui/Icons";
import { BotaoPausa, ReguaDeAtos } from "@/components/simulador/palco";
import {
  ENTRADA,
  ASSENTA,
  DUR,
  ATOS,
  ULTIMO_ATO,
  medir,
  useCoreografia,
  type Curva,
  type Ponto,
} from "./coreografia";
import { Anel, Contador, Ficha, PalcoPreco, type FichaEmCena } from "./atores";
import {
  ENTRADAS_DEMO_PADRAO,
  LIMITES_DEMO_PRECO,
  composicaoDemo,
  reguaDemo,
  type EntradasDemoPreco,
  type ParametrosDemoPreco,
} from "@/lib/pricing/demo-homepage";

// ═══════════════════════════════════════════════════════════════════════
//  O PALCO DO PREÇO
//  ---------------------------------------------------------------------
//  A coreografia está escrita em `docs/design/roteiro-animacao-preco.md` e
//  os seus tempos vivem em `coreografia.ts`. Este ficheiro encena-a.
//
//  A regra de que tudo o resto decorre:
//
//    Nada muda de valor sozinho. Um número só muda porque alguma coisa
//    lhe chegou.
//
//  É por isso que a base de custos nasce vazia e conta em três degraus —
//  uma por cada ficha que aterra — em vez de aparecer somada. A soma é
//  MOSTRADA, não afirmada, e é essa a diferença entre uma demonstração e
//  uma animação decorativa.
//
//  ── Porque é que isto não importa a engine ───────────────────────────
//
//  Porque recalcula a cada pixel arrastado, e portanto corre no cliente.
//  `precificar()` traz `regras.ts`, `fiscal-data.ts` e dezoito motores
//  atrás. `lib/pricing/demo-homepage.ts` tem a forma fechada da mesma
//  equação, e um teste compara as duas numa grelha inteira de entradas.
//
//  ── A cor aqui significa alguma coisa ────────────────────────────────
//
//    stone  · o que a unidade custa a existir
//    areia  · o IVA — passa pelas mãos do vendedor e vai para o Estado
//    clay   · Segurança Social e IRS — sai da fatura e não volta
//    brand  · o lucro — a única parcela que fica
// ═══════════════════════════════════════════════════════════════════════

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pct1 = (n: number) =>
  `${(n * 100).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
/** Uma taxa legal escreve-se como a lei a escreve: 23%, não 23,0%. */
const pctLimpa = (n: number) =>
  `${(n * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;

type ChaveEntrada = keyof EntradasDemoPreco;

/** Quanto vale um pixel arrastado, por controlo. */
const SENSIBILIDADE: Record<ChaveEntrada, number> = {
  materiais: 0.055,
  trabalho: 0.055,
  estrutura: 0.03,
  markup: 0.0022,
};

/** O salto de uma seta do teclado. */
const PASSO_TECLADO: Record<ChaveEntrada, number> = {
  materiais: 0.5,
  trabalho: 0.5,
  estrutura: 0.25,
  markup: 0.005,
};

const CONTROLOS = [
  { chave: "materiais", rotulo: "Materiais", nota: "por unidade", Icon: ShoppingBag, beat: "materiais", subida: 3 },
  { chave: "trabalho", rotulo: "Trabalho", nota: "tempo aplicado", Icon: Clock, beat: "trabalho", subida: 2 },
  { chave: "estrutura", rotulo: "Custos fixos", nota: "quota imputada", Icon: LayoutGrid, beat: "fixos", subida: 2 },
  { chave: "markup", rotulo: "Markup", nota: "acréscimo ao custo", Icon: CheckTrend, beat: "apagaMarkup", subida: 2 },
] as const satisfies readonly {
  chave: ChaveEntrada;
  rotulo: string;
  nota: string;
  Icon: typeof Coin;
  beat: string;
  subida: number;
}[];

/** As três fichas do ato da base, e de que linha nasce cada uma. */
const FICHAS_DE_CUSTO = [
  { id: "fichaA", chave: "materiais" },
  { id: "fichaB", chave: "trabalho" },
  { id: "fichaC", chave: "estrutura" },
] as const;

function arredondar(chave: ChaveEntrada, valor: number) {
  const fator = chave === "markup" ? 1e4 : 100;
  return Math.round(valor * fator) / fator;
}

function limitar(chave: ChaveEntrada, valor: number) {
  const [min, max] = LIMITES_DEMO_PRECO[chave];
  return arredondar(chave, Math.min(max, Math.max(min, valor)));
}

const formatarEntrada = (chave: ChaveEntrada, valor: number) =>
  chave === "markup" ? pct1(valor) : eur(valor);

export default function HeroPreco({ parametros }: { parametros: ParametrosDemoPreco }) {
  const reduz = useReducedMotion();
  const [montado, setMontado] = useState(false);

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A CENA NASCE RESOLVIDA E SÓ DEPOIS RECUA PARA SE EXPLICAR         │
  // │                                                                   │
  // │ O estado inicial é o ÚLTIMO ato. Quem chega sem JavaScript — ou   │
  // │ antes de a hidratação acabar — recebe o preço, a régua e a        │
  // │ composição já no HTML. Começar no primeiro ato punha 35,55 €      │
  // │ debaixo de «mínimo para cobrir custos» e nunca lá chegava o       │
  // │ resto: a demonstração passava de explicação a requisito.          │
  // └───────────────────────────────────────────────────────────────────┘
  const [ato, setAto] = useState(ULTIMO_ATO);
  const [parado, setParado] = useState(true);
  const [ciclo, setCiclo] = useState(0);
  const [entradas, setEntradas] = useState<EntradasDemoPreco>(ENTRADAS_DEMO_PADRAO);
  const [regimeIdx, setRegimeIdx] = useState(0);
  const [aArrastar, setAArrastar] = useState<ChaveEntrada | null>(null);
  /** O valor de onde o arrasto partiu, para se poder mostrar o quanto mudou. */
  const [arrastoDe, setArrastoDe] = useState<number | null>(null);

  const [fichas, setFichas] = useState<FichaEmCena[]>([]);
  const [aneis, setAneis] = useState<{ id: string; em: Ponto }[]>([]);
  const [baseAcumulada, setBaseAcumulada] = useState(0);

  const palcoRef = useRef<HTMLDivElement>(null);
  const cartaoRef = useRef<HTMLDivElement>(null);
  const pilhaRef = useRef<HTMLDivElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const valorRefs = useRef<Partial<Record<ChaveEntrada, HTMLSpanElement | null>>>({});
  const arrasto = useRef<{ chave: ChaveEntrada; ponteiro: number; x: number; valor: number } | null>(null);
  /** Fichas já lançadas neste ciclo — impede um segundo lançamento por re-render. */
  const lancadas = useRef<Set<string>>(new Set());
  /** O que cada ficha faz ao aterrar. */
  const aoAterrarRef = useRef<Record<string, (() => void) | undefined>>({});

  useEffect(() => {
    setMontado(true);
    // `useReducedMotion()` devolve `null` no primeiro render, por isso a
    // preferência lê-se aqui. Sem isto, a cena rebobinava por um instante a
    // quem pediu para nada se mexer.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAto(0);
    setParado(false);
  }, []);

  const estatico = montado && Boolean(reduz);
  const regime = parametros.regimes[regimeIdx] ?? parametros.regimes[0];

  const composicao = useMemo(
    () =>
      composicaoDemo(entradas, {
        taxaIVA: parametros.taxaIVA,
        fracaoFaturacao: regime.fracaoFaturacao,
      }),
    [entradas, parametros.taxaIVA, regime.fracaoFaturacao],
  );
  const regua = useMemo(() => reguaDemo(composicao), [composicao]);

  const alternativa = useMemo(() => {
    const outro = parametros.regimes[regimeIdx === 0 ? 1 : 0];
    return composicaoDemo(entradas, {
      taxaIVA: parametros.taxaIVA,
      fracaoFaturacao: outro.fracaoFaturacao,
    });
  }, [entradas, parametros, regimeIdx]);

  const avancar = useCallback(() => {
    setAto((a) => {
      if (a < ULTIMO_ATO) return a + 1;
      // A sequência TERMINA no resultado e fica lá. Reiniciar sozinho é o
      // que faz uma demonstração parecer um GIF: o olho aprende que nada do
      // que ali está depende de si.
      setParado(true);
      return a;
    });
  }, []);

  const coreografia = useCoreografia({
    ato,
    ciclo,
    parado,
    estatico,
    aoTerminarAto: avancar,
  });
  const { feito, cumprirAto, barraRef } = coreografia;

  /**
   * O beat já aconteceu — ou a cena nunca chegou a começar.
   *
   * ⚠️ Esta distinção não é cosmética. `feito()` responde pelo RELÓGIO, e no
   * servidor o relógio nunca correu: nenhum beat disparou. Desenhar a partir
   * dele diretamente escrevia `opacity: 0` na régua, na composição e no preço
   * recomendado do HTML servido — e quem chega sem JavaScript ficava com
   * 35,55 € debaixo de «mínimo para cobrir custos», sem nunca ver o resto.
   *
   * Antes da montagem a cena está no FIM, que é o que o HTML traz. Só depois
   * de hidratar é que o relógio passa a mandar e a sequência rebobina.
   *
   * Os lançamentos de fichas continuam a ler `feito()` cru, de propósito: são
   * uma consequência do relógio, e uma ficha lançada antes de a hidratação
   * acabar viajaria de um ponto que ainda não está no seu lugar final.
   */
  const emCena = useCallback((id: string) => !montado || feito(id), [montado, feito]);

  // Cada ato/ciclo novo limpa a cena: fichas no ar de um ato anterior
  // aterrariam num destino que já não significa o mesmo.
  useEffect(() => {
    lancadas.current = new Set();
    aoAterrarRef.current = {};
    setFichas([]);
    setAneis([]);
    // Sempre, e não `if (ato < 1)`.
    //
    // Com a reposição condicional, saltar para o ato da base pela régua de
    // atos entrava nele com a soma do ato anterior já feita: a pessoa via
    // 28,90 € onde devia ver `—`, e o ato que existe para MOSTRAR a soma
    // mostrava-a resolvida. Apanhado em runtime.
    setBaseAcumulada(0);
  }, [ciclo, ato]);

  const lancar = useCallback(
    (opcoes: {
      id: string;
      origem: Element | null;
      destino: Element | null;
      rotulo: string;
      tom: FichaEmCena["tom"];
      duracao?: number;
      aoAterrar?: () => void;
    }) => {
      if (lancadas.current.has(opcoes.id)) return;
      const palco = palcoRef.current;
      const origem = medir(opcoes.origem, palco);
      const destino = medir(opcoes.destino, palco);
      // Sem medida não há trajetória — e uma ficha a viajar de (0,0) seria
      // pior do que ficha nenhuma. O contador do destino corre na mesma.
      if (!origem || !destino) {
        opcoes.aoAterrar?.();
        lancadas.current.add(opcoes.id);
        return;
      }
      lancadas.current.add(opcoes.id);
      aoAterrarRef.current[opcoes.id] = opcoes.aoAterrar;
      setFichas((atuais) => [
        ...atuais,
        { id: opcoes.id, origem, destino, rotulo: opcoes.rotulo, tom: opcoes.tom, duracao: opcoes.duracao },
      ]);
    },
    [],
  );

  /**
   * A ficha ENCOSTA. É aqui que o contador do destino anda e nasce o anel.
   *
   * Separado de `sair` de propósito: o número tem de mudar no instante em
   * que a coisa lá chega (88% do percurso), não quando ela acaba de se
   * dissolver. Com um único evento no fim, a causa via-se a desaparecer
   * antes de o efeito acontecer.
   */
  const chegar = useCallback((id: string) => {
    setFichas((atuais) => {
      const ficha = atuais.find((f) => f.id === id);
      if (ficha) setAneis((anteriores) => [...anteriores, { id, em: ficha.destino }]);
      return atuais;
    });
    aoAterrarRef.current[id]?.();
    aoAterrarRef.current[id] = undefined;
    window.setTimeout(
      () => setAneis((anteriores) => anteriores.filter((a) => a.id !== id)),
      DUR.impacto + 60,
    );
  }, []);

  /** A ficha acabou de se dissolver: sai de cena. */
  const sair = useCallback((id: string) => {
    setFichas((atuais) => atuais.filter((f) => f.id !== id));
  }, []);

  // ── ATO 2 · as três fichas de custo ──────────────────────────────────
  const fichaA = feito("fichaA");
  const fichaB = feito("fichaB");
  const fichaC = feito("fichaC");
  useEffect(() => {
    if (ato !== 1 || estatico) return;
    for (const { id, chave } of FICHAS_DE_CUSTO) {
      if (!feito(id)) continue;
      const valor = entradas[chave];
      lancar({
        id,
        origem: valorRefs.current[chave] ?? null,
        destino: cartaoRef.current,
        rotulo: eur(valor),
        tom: "custo",
        aoAterrar: () => setBaseAcumulada((b) => Math.round((b + valor) * 100) / 100),
      });
    }
    // `entradas` fora das dependências de propósito: uma ficha já no ar leva
    // o valor com que partiu. Relançá-la a meio do voo com um valor novo era
    // o mesmo que mudar a pergunta depois de dada a resposta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ato, estatico, fichaA, fichaB, fichaC, lancar]);

  // ── ATO 4 · a entrega do total ao resultado ──────────────────────────
  const handoff = feito("handoff");
  useEffect(() => {
    if (ato !== 3 || estatico || !handoff) return;
    lancar({
      id: "handoff",
      origem: pilhaRef.current,
      destino: resultadoRef.current,
      rotulo: eur(composicao.pvp),
      tom: "total",
      duracao: DUR.viagemLonga,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ato, estatico, handoff, lancar]);

  // ── O que já aconteceu ───────────────────────────────────────────────
  const baseVisivel = ato >= 1 || estatico;
  const baseValor = ato === 1 ? baseAcumulada : composicao.base;
  const temRetencao = composicao.retencaoPessoal > 0;
  const chipsVisiveis = {
    margem: emCena("chipMargem") || ato >= 3,
    retencao: temRetencao && (emCena("chipRetencao") || ato >= 3),
    iva: emCena("chipIVA") || ato >= 3,
  };
  const resultadoAceso = emCena("chega");
  const precoFinal = emCena("contaPreco");
  const reguaAberta = emCena("regua") && ato === 3;
  const marcadorVisivel = emCena("marcadorCai");
  const marcadorNoLugar = emCena("marcadorViaja");
  const composicaoVisivel = emCena("barra");
  const resolvido = emCena("resolve");
  const arrastando = aArrastar !== null;

  const precoVisivel = precoFinal ? composicao.pvp : composicao.minimoPVP;
  const marcadorEm = marcadorNoLugar ? regua.preco : regua.minimo;

  // ── Interação ────────────────────────────────────────────────────────
  const recomecar = useCallback(() => {
    setBaseAcumulada(0);
    setParado(false);
    setAto(0);
    setCiclo((c) => c + 1);
  }, []);

  /**
   * Uma alteração manual salta para o resultado.
   *
   * Nunca reinicia a sequência: quem arrasta já viu a explicação, ou
   * decidiu não a ver. Reiniciá-la seria responder a uma pergunta com a
   * introdução outra vez.
   */
  const fixarNoResultado = useCallback(() => {
    setParado(true);
    setAto(ULTIMO_ATO);
    setBaseAcumulada(0);
    cumprirAto();
  }, [cumprirAto]);

  const definir = useCallback((chave: ChaveEntrada, valor: number) => {
    setEntradas((atual) => ({ ...atual, [chave]: limitar(chave, valor) }));
  }, []);

  const reporExemplo = useCallback(() => {
    setEntradas(ENTRADAS_DEMO_PADRAO);
    setRegimeIdx(0);
    recomecar();
  }, [recomecar]);

  const aoDescer = (evento: React.PointerEvent<HTMLDivElement>, chave: ChaveEntrada) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrasto.current = { chave, ponteiro: evento.pointerId, x: evento.clientX, valor: entradas[chave] };
    setAArrastar(chave);
    setArrastoDe(entradas[chave]);
    fixarNoResultado();
  };

  const aoMover = (evento: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    if (!a || a.ponteiro !== evento.pointerId) return;
    definir(a.chave, a.valor + (evento.clientX - a.x) * SENSIBILIDADE[a.chave]);
  };

  const aoLargar = (evento: React.PointerEvent<HTMLDivElement>) => {
    if (arrasto.current?.ponteiro !== evento.pointerId) return;
    arrasto.current = null;
    setAArrastar(null);
    setArrastoDe(null);
  };

  const aoTeclado = (evento: React.KeyboardEvent<HTMLDivElement>, chave: ChaveEntrada) => {
    const [min, max] = LIMITES_DEMO_PRECO[chave];
    const passo = PASSO_TECLADO[chave] * (evento.shiftKey ? 4 : 1);
    const mapa: Record<string, number | undefined> = {
      ArrowRight: entradas[chave] + passo,
      ArrowUp: entradas[chave] + passo,
      ArrowLeft: entradas[chave] - passo,
      ArrowDown: entradas[chave] - passo,
      PageUp: entradas[chave] + passo * 4,
      PageDown: entradas[chave] - passo * 4,
      Home: min,
      End: max,
    };
    const alvo = mapa[evento.key];
    if (alvo === undefined) return;
    evento.preventDefault();
    definir(chave, alvo);
    fixarNoResultado();
  };

  /** Uma transição do roteiro, já silenciada quando o movimento é reduzido. */
  const estadoDoPalco = useMemo(
    // `parado` não inclui `estatico`: com movimento reduzido não há nada em
    // curso para parar, e marcar tudo como parado só suspenderia contadores
    // que já saltam direto para o valor final.
    () => ({ parado: parado && !estatico, imediato: arrastando }),
    [parado, estatico, arrastando],
  );

  const t = (ms: number, curva: Curva = ENTRADA): Transition =>
    estatico ? { duration: 0 } : { duration: ms / 1000, ease: curva };

  const parcelas = [
    { rotulo: "Materiais", valor: entradas.materiais, cor: "bg-stone-400 dark:bg-stone-500" },
    { rotulo: "Trabalho", valor: entradas.trabalho, cor: "bg-stone-300 dark:bg-stone-600" },
    { rotulo: "Custos fixos", valor: entradas.estrutura, cor: "bg-categoria-areia-border dark:bg-stone-700" },
    { rotulo: "SS e IRS", valor: composicao.retencaoPessoal, cor: "bg-clay" },
    { rotulo: "IVA", valor: composicao.iva, cor: "bg-categoria-areia-text/70 dark:bg-categoria-areia-text" },
    { rotulo: "Lucro", valor: composicao.lucro, cor: "bg-brand" },
  ].filter((p) => p.valor > 0);

  return (
    // O estado do palco chega aos contadores e às fichas por contexto: são
    // condições do PALCO, não de cada número. Passá-las à mão a catorze
    // contadores era catorze sítios para um deles ficar para trás — e foi
    // assim que a pausa deixou de parar as fichas.
    <PalcoPreco.Provider value={estadoDoPalco}>
    <section
      data-hero
      className="grain relative overflow-hidden px-4 pb-14 pt-5 sm:px-6 sm:pb-20 sm:pt-8"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-40 -top-52 h-[32rem] w-[32rem] rounded-full border border-categoria-areia-border/50 dark:border-stone-800" />
        <div className="absolute -left-56 top-24 h-[26rem] w-[26rem] rounded-full bg-categoria-areia-bg/60 blur-3xl dark:bg-brand/[.07]" />
        <div className="absolute -bottom-40 right-1/4 h-[22rem] w-[22rem] rounded-full bg-brand-light/50 blur-3xl dark:bg-brand/[.06]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
            <Coin size={14} />
            Formar um preço
            <span aria-hidden className="h-1 w-1 rounded-full bg-brand/50" />
            Portugal
          </div>
          {/* A escala pára nos 4,4rem, e não nos 5,4rem do hero de Descobrir.
              Ali o título É o primeiro ecrã; aqui o primeiro ecrã é o palco. */}
          <h1 className="text-balance font-display text-[clamp(2.2rem,5.4vw,4.4rem)] font-semibold leading-[.98] tracking-[-.035em] text-ink">
            O preço não nasce de um palpite.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Custos, trabalho, impostos e margem formam um valor que sustenta o negócio.
          </p>
        </div>

        {/* ── O palco ───────────────────────────────────────────────── */}
        <div
          ref={palcoRef}
          data-palco="preco"
          className="relative mt-7 rounded-[2rem] border border-categoria-areia-border bg-stone-50 shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:mt-9 sm:rounded-[2.5rem]"
        >
          {/* As fichas e os anéis vivem sobre o palco inteiro, em absoluto:
              as coordenadas são medidas no DOM em tempo de execução, e é por
              isso que no telemóvel — com as colunas empilhadas — viajam na
              vertical sem uma linha de código a saber que há um telemóvel. */}
          {fichas.map((ficha) => (
            <Ficha key={ficha.id} ficha={ficha} aoChegar={chegar} aoSair={sair} />
          ))}
          {aneis.map((anel) => (
            <Anel key={anel.id} em={anel.em} />
          ))}

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_78%_38%,rgba(255,255,255,.65),transparent_46%)] dark:bg-[radial-gradient(circle_at_78%_38%,rgba(255,255,255,.035),transparent_46%)] sm:rounded-[2.5rem]"
          />

          {/* Cabeçalho do palco */}
          <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-categoria-areia-border/70 px-4 py-3.5 dark:border-stone-800 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {!estatico && !parado && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50 motion-reduce:animate-none" />
                )}
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[.14em] text-stone-500 dark:text-stone-400">
                Composição do exemplo
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-stone-400 sm:inline">Peça física · Continente</span>
              {!estatico && <BotaoPausa parado={parado} onAlternar={() => setParado((p) => !p)} />}
              <button
                type="button"
                onClick={recomecar}
                aria-label="Repetir a demonstração desde o início"
                className="focus-marca flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-brand/40 hover:text-brand dark:border-stone-700 dark:text-stone-400"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            Passo {ato + 1} de {ATOS.length}: {ATOS[ato]?.legenda}. Preço recomendado{" "}
            {eur(composicao.pvp)} com IVA.
          </p>

          <div className="relative grid gap-x-0 gap-y-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,.95fr)_minmax(0,.6fr)_minmax(0,1.55fr)] lg:gap-y-0 lg:py-7">
            {/* ── 1. Entradas ──────────────────────────────────────── */}
            <div className="lg:pr-5">
              <div className="relative flex items-center justify-between pb-2 text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">
                <span>Entradas</span>
                <span className="normal-case tracking-normal">arrasta ou usa as setas</span>
                {/* A régua do cabeçalho desenha-se da esquerda: é o «começa
                    aqui» do primeiro ato, dito com uma linha em vez de texto. */}
                <m.span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px origin-left bg-stone-200 dark:bg-stone-700"
                  initial={false}
                  animate={{ scaleX: emCena("regua") || ato > 0 ? 1 : 0 }}
                  transition={t(320)}
                />
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {CONTROLOS.map(({ chave, rotulo, nota, Icon, beat, subida }) => {
                  const valor = entradas[chave];
                  const [min, max] = LIMITES_DEMO_PRECO[chave];
                  const activo = aArrastar === chave;
                  // ┌─────────────────────────────────────────────────────┐
                  // │ A TRIAGEM É O QUE O PRIMEIRO ATO TEM PARA DIZER     │
                  // │                                                     │
                  // │ As quatro linhas começam iguais. No ato dos custos, │
                  // │ três acendem e o markup ESCURECE — vê-se a separar. │
                  // │ Antes o markup nascia apagado, o que é uma          │
                  // │ afirmação: a pessoa via um controlo esbatido e não  │
                  // │ sabia porquê. No ato dos impostos ele volta a       │
                  // │ acender, porque muda de papel.                      │
                  // │                                                     │
                  // │ E os custos ficam acesos DEPOIS do seu ato: com     │
                  // │ `ato > 1` os três esbatiam-se outra vez durante a   │
                  // │ soma, o que lia como um piscar sem causa.           │
                  // └─────────────────────────────────────────────────────┘
                  const aceso =
                    chave === "markup" ? ato >= 2 || !emCena(beat) : ato > 0 || emCena(beat);
                  const outroArrastado = arrastando && !activo;
                  return (
                    <m.div
                      key={chave}
                      role="slider"
                      tabIndex={0}
                      aria-valuemin={chave === "markup" ? min * 100 : min}
                      aria-valuemax={chave === "markup" ? max * 100 : max}
                      aria-valuenow={chave === "markup" ? Number((valor * 100).toFixed(1)) : valor}
                      aria-valuetext={formatarEntrada(chave, valor)}
                      aria-label={`${rotulo}, ${nota}`}
                      // `initial={false}` em todas as peças do palco, e não é
                      // preferência: com um `initial` opaco o SSR escreve
                      // `opacity: 0` no HTML e quem não recebe JavaScript fica
                      // com um palco em branco. Anima-se a ÊNFASE, nunca a
                      // existência.
                      initial={false}
                      animate={{
                        opacity: outroArrastado ? 0.7 : aceso ? 1 : 0.55,
                        y: aceso && ato === 0 && !estatico ? -subida : 0,
                        scale: activo ? 1.015 : 1,
                      }}
                      transition={t(activo ? DUR.micro : DUR.entrada)}
                      onPointerDown={(e) => aoDescer(e, chave)}
                      onPointerMove={aoMover}
                      onPointerUp={aoLargar}
                      onPointerCancel={aoLargar}
                      onKeyDown={(e) => aoTeclado(e, chave)}
                      className={`focus-marca grid min-h-[56px] cursor-ew-resize touch-none select-none grid-cols-[2rem_1fr_auto] items-center gap-2.5 rounded-xl px-2 py-2 ${
                        activo ? "bg-white shadow-card dark:bg-stone-800" : "hover:bg-white/70 dark:hover:bg-stone-800/60"
                      }`}
                    >
                      <m.span
                        initial={false}
                        animate={{
                          borderColor: aceso ? "rgba(23,126,94,.4)" : "rgba(214,206,191,1)",
                          color: aceso ? "rgb(20,116,85)" : "rgb(120,113,108)",
                        }}
                        transition={t(DUR.entrada)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border bg-white dark:bg-stone-900"
                      >
                        <Icon size={15} />
                      </m.span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                          {rotulo}
                        </span>
                        {/* A nota é informação de repouso. Durante o arrasto
                            o que interessa é QUANTO mudou — e a linha já tem
                            o lugar para o dizer, sem nada de novo a aparecer
                            por cima do dedo. */}
                        {activo && arrastoDe !== null && Math.abs(valor - arrastoDe) > 1e-9 ? (
                          <span
                            className={`block truncate text-[10px] font-semibold tabular-nums ${
                              valor > arrastoDe
                                ? "text-categoria-areia-text"
                                : "text-brand dark:text-brand-mint"
                            }`}
                          >
                            {valor > arrastoDe ? "+" : "−"}{" "}
                            {formatarEntrada(chave, Math.abs(valor - arrastoDe))}
                          </span>
                        ) : (
                          <span className="block truncate text-[10px] text-stone-400">{nota}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          ref={(el) => {
                            valorRefs.current[chave] = el;
                          }}
                          className="font-display text-[15px] font-semibold tabular-nums text-ink"
                        >
                          {formatarEntrada(chave, valor)}
                        </span>
                        {/* As pegas respiram UMA vez quando a cena assenta.
                            Convida sem insistir; nunca repete. */}
                        <m.span
                          aria-hidden
                          className="flex flex-col gap-[3px]"
                          initial={false}
                          animate={{
                            opacity: activo ? 0.9 : resolvido && !estatico ? [0.3, 0.65, 0.3] : 0.3,
                          }}
                          transition={
                            resolvido && !activo && !estatico
                              ? { duration: 1.4, delay: 0.6, ease: "easeInOut" }
                              : t(DUR.micro)
                          }
                        >
                          <i className="block h-[3px] w-[3px] rounded-full bg-stone-500" />
                          <i className="block h-[3px] w-[3px] rounded-full bg-stone-500" />
                          <i className="block h-[3px] w-[3px] rounded-full bg-stone-500" />
                        </m.span>
                      </span>
                    </m.div>
                  );
                })}
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-stone-200 pt-1 text-[10px] text-stone-400 dark:border-stone-700">
                <span>Valores sem IVA</span>
                {/* `min-h-[36px]`: com `py-1` o alvo media 88×23 e falhava o
                    mínimo de 24×24 do WCAG 2.2 (2.5.8) em todas as vistas. */}
                <button
                  type="button"
                  onClick={reporExemplo}
                  className="focus-marca -mr-1 inline-flex min-h-[36px] items-center rounded-full px-3 font-semibold text-brand underline decoration-stone-300 underline-offset-4 hover:decoration-brand"
                >
                  Repor exemplo
                </button>
              </div>
            </div>

            {/* ── 2. A ponte: base, markup e IVA ───────────────────── */}
            <div className="relative flex items-center justify-center border-y border-stone-200 py-5 dark:border-stone-800 lg:border-x lg:border-y-0 lg:px-4 lg:py-0">
              <Conector lado="esquerda" aceso={ato >= 1 || estatico} pulsa={false} t={t} />
              <Conector lado="direita" aceso={ato >= 3 || estatico} pulsa={handoff && !estatico} t={t} />

              <div ref={pilhaRef} className="relative flex w-full flex-col items-center gap-2.5">
                <m.div
                  ref={cartaoRef}
                  initial={false}
                  animate={{
                    opacity: baseVisivel ? 1 : 0,
                    // O overshoot marca a última aterragem: é o que dá massa
                    // ao cartão. `ASSENTA` só entra em coisas que POUSAM.
                    scale: emCena("assenta") && ato === 1 && !estatico ? [1, 1.035, 1] : baseVisivel ? 1 : 0.96,
                  }}
                  transition={
                    emCena("assenta") && ato === 1 && !estatico
                      ? { duration: DUR.assenta / 1000, ease: ASSENTA }
                      : t(360)
                  }
                  className="w-full max-w-[13rem] rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-center shadow-card dark:border-stone-700 dark:bg-stone-800"
                >
                  <div className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-400">
                    Base de custos
                  </div>
                  <div className="mt-1 font-display text-[22px] font-semibold tabular-nums text-ink">
                    {ato === 1 && baseValor === 0 ? (
                      <span className="text-stone-300 dark:text-stone-600">—</span>
                    ) : (
                      <Contador valor={baseValor} formato={eur} />
                    )}
                  </div>
                  <m.div
                    initial={false}
                    animate={{ opacity: emCena("parcelas") || ato >= 2 ? 1 : 0 }}
                    transition={t(280)}
                    className="mt-1 text-[9px] tabular-nums text-stone-400"
                  >
                    {eur(entradas.materiais)} + {eur(entradas.trabalho)} + {eur(entradas.estrutura)}
                  </m.div>
                </m.div>

                {/* As fichas de fórmula saem DE BAIXO do cartão — são
                    produzidas por ele, e o movimento tem de o dizer. */}
                <AnimatePresence initial={false}>
                  {chipsVisiveis.margem && (
                    <ChipFormula
                      key="margem"
                      rotulo="Markup"
                      tom="margem"
                      valor={composicao.lucro}
                     
                      estatico={estatico}
                    />
                  )}
                  {chipsVisiveis.retencao && (
                    <ChipFormula
                      key="retencao"
                      rotulo="SS e IRS"
                      tom="retencao"
                      valor={composicao.retencaoPessoal}
                     
                      estatico={estatico}
                    />
                  )}
                  {chipsVisiveis.iva && (
                    <ChipFormula
                      key="iva"
                      rotulo={`IVA · ${pctLimpa(parametros.taxaIVA)}`}
                      tom="iva"
                      valor={composicao.iva}
                     
                      estatico={estatico}
                      anotacao={emCena("estado") || ato >= 3 ? "→ Estado" : undefined}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── 3. O resultado ───────────────────────────────────── */}
            <m.div
              ref={resultadoRef}
              initial={false}
              animate={{ opacity: resultadoAceso ? 1 : 0.55 }}
              transition={t(520)}
              className="min-w-0 lg:pl-6"
            >
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">
                <m.span
                  initial={false}
                  animate={
                    resolvido && !estatico
                      ? { scale: [0.6, 1.25, 1], opacity: 1 }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={resolvido && !estatico ? { duration: 0.42, ease: ENTRADA } : t(0)}
                  className={`h-1.5 w-1.5 rounded-full ${
                    resolvido ? "bg-brand" : "border border-stone-300 dark:border-stone-600"
                  }`}
                />
                {resolvido ? "Resultado" : "Resultado em formação"}
              </div>

              <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-end">
                <div>
                  <div className="font-display text-[clamp(2.9rem,7.5vw,3.9rem)] font-semibold leading-[.9] tracking-[-.04em] tabular-nums text-ink">
                    <Contador
                      valor={precoVisivel}
                      formato={eur}
                      duracao={DUR.contaPreco}
                     
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {precoFinal ? "Preço recomendado, com IVA" : "Mínimo para cobrir custos"}
                  </div>
                </div>

                {/* Uma métrica só aparece depois de existir na narrativa.
                    O preço mínimo sai dos custos e vale desde o primeiro ato.
                    O lucro e a margem só existem depois de haver markup — e
                    mostrá-los a 0,55 de opacidade enquanto a cena ainda os
                    está a construir era contar o fim ao mesmo tempo que se
                    contava o princípio. */}
                <dl className="grid grid-cols-3 divide-x divide-stone-200 dark:divide-stone-700">
                  {[
                    { rotulo: "Preço mínimo", valor: composicao.minimoPVP, formato: eur, desde: 0 },
                    { rotulo: "Lucro por venda", valor: composicao.lucro, formato: eur, desde: 2 },
                    { rotulo: "Margem", valor: composicao.margem, formato: pct1, desde: 2 },
                  ].map((metrica, i) => {
                    const existe = ato >= metrica.desde || estatico || !montado;
                    return (
                      <div key={metrica.rotulo} className={`min-w-0 px-2 ${i === 0 ? "pl-0" : ""}`}>
                        <dt className="text-[9px] leading-tight text-stone-400">{metrica.rotulo}</dt>
                        <dd className="mt-1 font-display text-[15px] font-semibold tabular-nums text-ink">
                          {existe ? (
                            <Contador valor={metrica.valor} formato={metrica.formato} />
                          ) : (
                            <span className="text-stone-300 dark:text-stone-600">—</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>

              {/* A régua */}
              <div className="mt-5">
                <m.div
                  aria-hidden
                  className="flex h-4 origin-left overflow-hidden rounded-full border border-categoria-areia-border dark:border-stone-700"
                  initial={false}
                  // A opacidade acompanha o desenrolar. Encolhida a 4% e
                  // opaca, a régua ficava um traço de dois pixéis parado no
                  // canto — lia como detrito, não como uma peça prestes a
                  // abrir. Aparece ao abrir-se.
                  animate={{
                    scaleX: reguaAberta || estatico || ato > 3 ? 1 : 0.04,
                    opacity: reguaAberta || estatico || ato > 3 ? 1 : 0,
                  }}
                  transition={
                    estatico
                      ? { duration: 0 }
                      : {
                          scaleX: { duration: DUR.desenrolar / 1000, ease: ENTRADA },
                          opacity: { duration: 0.22, ease: ENTRADA },
                        }
                  }
                >
                  {[
                    { classe: "bg-clay-bg text-clay-text", texto: "não cobre", largura: `${Math.max(18, regua.minimo)}%` },
                    { classe: "bg-alert-bg text-alert-text", texto: "sustentável", largura: `${Math.max(14, regua.preco - regua.minimo)}%` },
                    { classe: "flex-1 bg-brand-light text-brand-dark dark:bg-brand/25 dark:text-brand-mint", texto: "margem saudável", largura: undefined },
                  ].map((zona, i) => (
                    <m.span
                      key={zona.texto}
                      className={`grid place-items-center text-[8px] font-semibold ${zona.classe}`}
                      style={{ width: zona.largura }}
                      initial={false}
                      // Zero, e não 0.25: com a régua encolhida a `scaleX(.04)`
                      // os rótulos ficam comprimidos num borrão de dois pixéis.
                      // Uma coisa que ainda não se pode ler não deve ver-se.
                      animate={{ opacity: emCena("zonas") || estatico ? 1 : 0 }}
                      transition={estatico ? { duration: 0 } : { duration: 0.36, delay: i * 0.09, ease: ENTRADA }}
                    >
                      {zona.texto}
                    </m.span>
                  ))}
                </m.div>

                {/* O eixo e os rótulos entram COM a régua.
                    Com a régua encolhida a `scaleX(.04)` mas o eixo já
                    desenhado, ficava uma escala de 20 a 70 € pendurada sem
                    nada a que pertencer — um elemento órfão, que lê como
                    peça meio carregada. */}
                <m.div
                  className="relative mt-1 h-8"
                  initial={false}
                  animate={{ opacity: reguaAberta || estatico || ato > 3 ? 1 : 0 }}
                  transition={estatico ? { duration: 0 } : { duration: 0.42, delay: reguaAberta ? 0.12 : 0, ease: ENTRADA }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-2.5 border-b border-stone-300 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_9px)] text-stone-300 dark:border-stone-700 dark:text-stone-700"
                  />
                  <div
                    aria-hidden
                    className="absolute top-0 h-4 border-l border-dashed border-clay transition-[left] duration-700"
                    style={{ left: `${regua.minimo}%` }}
                  >
                    <span className="absolute left-0 top-[1.05rem] -translate-x-1/2 text-[8px] font-medium text-clay-text">
                      mínimo
                    </span>
                  </div>
                  {/* O marcador CAI no mínimo e só depois viaja. São dois
                      factos diferentes — «o mínimo é aqui» e «o preço fica
                      ali» — e uma trajetória única contá-los-ia como um. */}
                  <m.div
                    className="absolute -top-[1.15rem] w-px bg-brand"
                    style={{ height: "2.4rem" }}
                    initial={false}
                    animate={{
                      left: `${marcadorEm}%`,
                      opacity: marcadorVisivel || estatico ? 1 : 0,
                      y: marcadorVisivel || estatico ? 0 : -14,
                    }}
                    transition={
                      estatico
                        ? { duration: 0 }
                        : marcadorNoLugar
                          ? { left: { duration: 0.72, ease: ASSENTA }, opacity: { duration: 0.2 }, y: { duration: 0.2 } }
                          : { duration: 0.32, ease: ENTRADA }
                    }
                  >
                    <m.span
                      aria-hidden
                      className="absolute -top-1.5 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-brand bg-white dark:bg-stone-900"
                      initial={false}
                      animate={{ scale: arrastando ? 1.15 : 1 }}
                      transition={t(DUR.micro)}
                    >
                      <i className="block h-1.5 w-1.5 rounded-full bg-brand" />
                    </m.span>
                  </m.div>
                </m.div>

                <m.div
                  className="flex justify-between text-[9px] tabular-nums text-stone-400"
                  aria-hidden
                  initial={false}
                  animate={{ opacity: reguaAberta || estatico || ato > 3 ? 1 : 0 }}
                  transition={estatico ? { duration: 0 } : { duration: 0.42, delay: reguaAberta ? 0.18 : 0, ease: ENTRADA }}
                >
                  {regua.marcas.map((marca) => (
                    <span key={marca}>{marca} €</span>
                  ))}
                </m.div>
              </div>

              {/* A composição — o LUCRO é o último a crescer. É a conclusão,
                  e uma conclusão não entra ao mesmo tempo que os dados. */}
              <m.div
                initial={false}
                animate={{ opacity: composicaoVisivel || estatico ? 1 : 0 }}
                transition={t(360)}
                className="mt-5"
              >
                <div className="flex items-baseline justify-between gap-2 text-[10px] text-stone-400">
                  <span>A composição do preço</span>
                  <span className="font-semibold tabular-nums text-stone-600 dark:text-stone-300">
                    total · <Contador valor={composicao.pvp} formato={eur} />
                  </span>
                </div>
                <div className="mt-1.5 flex h-3 gap-[3px]" aria-hidden>
                  {parcelas.map((p, i) => (
                    <m.i
                      key={p.rotulo}
                      className={`block min-w-[6px] origin-left rounded-sm ${p.cor}`}
                      style={{ flexGrow: p.valor, flexBasis: 0 }}
                      initial={false}
                      animate={{ scaleX: composicaoVisivel || estatico ? 1 : 0 }}
                      transition={
                        estatico
                          ? { duration: 0 }
                          : { duration: 0.42, delay: composicaoVisivel ? i * 0.09 : 0, ease: ENTRADA }
                      }
                    />
                  ))}
                </div>
                {/* Grelha em ecrã estreito, proporções a partir de `sm`: em
                    fila proporcional no telemóvel, o LUCRO — a parcela que a
                    pessoa veio ver — saía para fora do scroll. */}
                <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2.5 sm:flex sm:gap-1.5">
                  {parcelas.map((p, i) => (
                    <m.li
                      key={p.rotulo}
                      className="min-w-0 text-center"
                      style={{ flexGrow: p.valor, flexBasis: 0 }}
                      initial={false}
                      animate={{ opacity: composicaoVisivel || estatico ? 1 : 0 }}
                      transition={
                        estatico
                          ? { duration: 0 }
                          : { duration: 0.3, delay: composicaoVisivel ? i * 0.09 + 0.08 : 0 }
                      }
                    >
                      <span className="block text-[11px] font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                        <Contador valor={p.valor} formato={eur} />
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-tight text-stone-400">
                        {p.rotulo}
                      </span>
                    </m.li>
                  ))}
                </ul>
              </m.div>
            </m.div>
          </div>

          {/* ── A consequência: a mesma peça, duas formas de operar ─── */}
          <div className="relative border-t border-categoria-areia-border/70 px-4 py-4 dark:border-stone-800 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <Scale size={16} className="mt-0.5 flex-shrink-0 text-brand" />
                <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  A mesma peça, operada de outra forma, custa{" "}
                  <strong className="font-semibold tabular-nums text-ink">
                    <Contador valor={alternativa.pvp} formato={eur} />
                  </strong>{" "}
                  para deixar o mesmo lucro.{" "}
                  <span className="text-stone-500 dark:text-stone-400">{regime.nota}</span>
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Como operas o negócio"
                className="flex flex-shrink-0 rounded-full border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-800"
              >
                {parametros.regimes.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={regimeIdx === i}
                    onClick={() => {
                      setRegimeIdx(i);
                      fixarNoResultado();
                    }}
                    className={`focus-marca inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors ${
                      regimeIdx === i
                        ? "bg-brand text-white shadow-card"
                        : "text-stone-500 hover:text-brand-dark dark:text-stone-400"
                    }`}
                  >
                    {r.id === "empresa" ? <Building size={12} /> : <Receipt size={12} />}
                    {r.rotulo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative px-4 pb-4 sm:px-6">
            <ReguaDeAtos
              atos={ATOS}
              indiceAtivo={ato}
              barraRef={barraRef}
              estatico={estatico}
              // Ir para um ato é PÔ-LO A CORRER, não parar nele.
              //
              // Com `setParado(true)` — o que estava aqui — clicar num passo
              // levava a pessoa para um ato que nunca acontecia: o relógio
              // ficava suspenso, nenhum beat disparava, e saltar para «Fixar o
              // preço» deixava o preço preso em 35,55 € para sempre. A régua
              // de atos era uma navegação que não navegava. Apanhado em
              // runtime; coberto por `coreografia-preco.test.ts`.
              onIr={(i) => {
                setParado(false);
                setAto(i);
              }}
            />
          </div>
        </div>

        {/* ── Ações ────────────────────────────────────────────────── */}
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ferramentas/calcular-preco"
            className="btn-shine focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float sm:w-auto"
          >
            Calcular com os meus dados <ArrowRight size={15} />
          </Link>
          <a
            href="#como-se-forma"
            className="focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 no-underline transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:w-auto"
          >
            Ver como se forma <Coin size={14} />
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <Lock size={12} className="text-brand" /> Os teus números ficam neste dispositivo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-brand" /> IVA pelo {parametros.fonteIVA}
          </span>
        </div>
      </div>
    </section>
    </PalcoPreco.Provider>
  );
}

/**
 * Uma ficha de fórmula: sai de baixo do cartão da base e conta desde zero.
 *
 * `inicial={0}` é o que faz a contagem existir — sem ele montava já feita, e
 * o valor aparecia em vez de ser somado.
 */
function ChipFormula({
  rotulo,
  tom,
  valor,
  estatico,
  anotacao,
}: {
  rotulo: string;
  tom: "margem" | "retencao" | "iva";
  valor: number;
  estatico: boolean;
  anotacao?: string;
}) {
  const cores = {
    margem: "border-brand/25 bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
    retencao: "border-clay-border bg-clay-bg text-clay-text",
    iva: "border-categoria-areia-border bg-categoria-areia-bg text-categoria-areia-text dark:border-stone-700 dark:bg-stone-800 dark:text-[#e7c98e]",
  }[tom];

  return (
    <m.div
      initial={estatico ? false : { opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.92 }}
      transition={estatico ? { duration: 0 } : { duration: DUR.entrada / 1000, ease: ENTRADA }}
      className={`flex w-full max-w-[13rem] items-center justify-between gap-2 rounded-full border px-3 py-1.5 ${cores}`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide">{rotulo}</span>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums">
        {anotacao && <span className="text-[8px] font-medium opacity-70">{anotacao}</span>}+{" "}
        <Contador
          valor={valor}
          formato={(n) => `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
          duracao={520}
          inicial={estatico ? undefined : 0}
        />
      </span>
    </m.div>
  );
}

/**
 * O nó que marca a passagem de uma coluna para a seguinte, e que pulsa
 * quando a ficha do total lhe passa por cima.
 *
 * Só existe a partir de `lg`, onde há divisórias verticais para o segurar.
 * Em ecrã estreito as colunas empilham e a ordem de leitura já é a ordem do
 * cálculo — um conector aí apontaria para o sítio errado.
 */
function Conector({
  lado,
  aceso,
  pulsa,
  t,
}: {
  lado: "esquerda" | "direita";
  aceso: boolean;
  pulsa: boolean;
  t: (ms: number, curva?: Curva) => Transition;
}) {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 lg:block ${
        lado === "esquerda" ? "-left-[5px]" : "-right-[5px]"
      }`}
    >
      <m.span
        className={`block h-2.5 w-2.5 rounded-full border ${
          aceso
            ? "border-brand bg-brand"
            : "border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-900"
        }`}
        initial={false}
        animate={
          pulsa
            ? { scale: [1, 1.7, 1], boxShadow: ["0 0 0 0 rgba(23,126,94,0)", "0 0 0 6px rgba(23,126,94,.16)", "0 0 0 0 rgba(23,126,94,0)"] }
            : { scale: 1 }
        }
        transition={pulsa ? { duration: 0.6, ease: ENTRADA } : t(500)}
      />
    </span>
  );
}
