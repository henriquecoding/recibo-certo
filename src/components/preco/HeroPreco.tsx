"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Building,
  Coin,
  Lock,
  Receipt,
  RotateCcw,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Clock,
  LayoutGrid,
  CheckTrend,
} from "@/components/ui/Icons";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import {
  BotaoPausa,
  ReguaDeAtos,
  useRelogioDePalco,
  type AtoDaRegua,
} from "@/components/simulador/palco";
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
//  Quatro atos com causa e consequência: as parcelas entram, juntam-se numa
//  base, recebem markup e IVA, e só então o preço se fixa na régua. Nada se
//  move por decoração — cada movimento é uma operação da aritmética que a
//  pessoa está a ver acontecer.
//
//  ── Porque é que isto não importa a engine ───────────────────────────
//
//  Porque recalcula a cada pixel arrastado, e portanto corre no cliente.
//  `precificar()` traz `regras.ts`, `fiscal-data.ts` e dezoito motores
//  atrás — acima da dobra, para toda a gente. `lib/pricing/demo-homepage.ts`
//  tem a forma fechada da mesma equação, e um teste compara as duas numa
//  grelha inteira de entradas. A taxa de IVA e a fração de impostos pessoais
//  chegam em `parametros`, calculadas no servidor pela engine a sério.
//
//  ── A cor aqui significa alguma coisa ────────────────────────────────
//
//    stone  · o que a unidade custa a existir
//    areia  · o IVA — passa pelas mãos do vendedor e vai para o Estado
//    clay   · Segurança Social e IRS — sai da fatura e não volta
//    brand  · o lucro — a única parcela que fica
//
//  Trocar isto por cinco tons bonitos faz a barra da composição deixar de
//  se poder ler sem legenda.
// ═══════════════════════════════════════════════════════════════════════

const ATOS: AtoDaRegua[] = [
  { id: "custos", rotulo: "Custos", legenda: "Reunir o que a unidade custa" },
  { id: "base", rotulo: "Base", legenda: "Somar a base de custos" },
  { id: "impostos", rotulo: "Markup e IVA", legenda: "Aplicar markup e IVA" },
  { id: "preco", rotulo: "Preço", legenda: "Fixar o preço recomendado" },
];

const DURACAO_ATO = [2400, 2200, 2600, 3000] as const;

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

const CONTROLOS: {
  chave: ChaveEntrada;
  rotulo: string;
  nota: string;
  Icon: typeof Coin;
}[] = [
  { chave: "materiais", rotulo: "Materiais", nota: "por unidade", Icon: ShoppingBag },
  { chave: "trabalho", rotulo: "Trabalho", nota: "tempo aplicado", Icon: Clock },
  { chave: "estrutura", rotulo: "Custos fixos", nota: "quota imputada", Icon: LayoutGrid },
  { chave: "markup", rotulo: "Markup", nota: "acréscimo ao custo", Icon: CheckTrend },
];

function arredondar(chave: ChaveEntrada, valor: number) {
  const casas = chave === "markup" ? 4 : 2;
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function limitar(chave: ChaveEntrada, valor: number) {
  const [min, max] = LIMITES_DEMO_PRECO[chave];
  return arredondar(chave, Math.min(max, Math.max(min, valor)));
}

const formatarEntrada = (chave: ChaveEntrada, valor: number) =>
  chave === "markup" ? pct1(valor) : eur(valor);

/**
 * O nó que marca a passagem de uma coluna para a seguinte.
 *
 * Só existe a partir de `lg`, onde há divisórias verticais para o segurar.
 * Em ecrã estreito as colunas empilham e a ordem de leitura já é a ordem do
 * cálculo — um conector aí seria a apontar para o sítio errado.
 */
function Conector({
  lado,
  aceso,
  estatico,
}: {
  lado: "esquerda" | "direita";
  aceso: boolean;
  estatico: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 lg:block ${
        lado === "esquerda" ? "-left-[5px]" : "-right-[5px]"
      }`}
    >
      <span
        className={`block h-2.5 w-2.5 rounded-full border transition-all duration-500 ${
          aceso
            ? "border-brand bg-brand shadow-[0_0_0_4px_rgba(23,126,94,.12)]"
            : "border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-900"
        }`}
        style={estatico ? { transitionDuration: "0ms" } : undefined}
      />
    </span>
  );
}

export default function HeroPreco({ parametros }: { parametros: ParametrosDemoPreco }) {
  const reduz = useReducedMotion();
  const [montado, setMontado] = useState(false);
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A CENA NASCE RESOLVIDA E SÓ DEPOIS RECUA PARA SE EXPLICAR         │
  // │                                                                   │
  // │ O estado inicial é o ÚLTIMO ato, não o primeiro. Quem chega sem   │
  // │ JavaScript — ou antes de a hidratação acabar — recebe o preço     │
  // │ recomendado, a régua, a composição e as métricas já no HTML.      │
  // │ Começar no primeiro ato punha 35,55 € debaixo de «mínimo para     │
  // │ cobrir custos» e nunca lá chegava o resto: a demonstração passava │
  // │ de explicação a requisito.                                        │
  // │                                                                   │
  // │ Com JavaScript, o efeito de montagem rebobina para o ato 0 e a    │
  // │ sequência corre. Com movimento reduzido, fica exatamente onde     │
  // │ nasceu — que é o resultado, não uma versão pior dele.             │
  // └───────────────────────────────────────────────────────────────────┘
  const [ato, setAto] = useState(ATOS.length - 1);
  const [parado, setParado] = useState(true);
  const [ciclo, setCiclo] = useState(0);
  const [entradas, setEntradas] = useState<EntradasDemoPreco>(ENTRADAS_DEMO_PADRAO);
  const [regimeIdx, setRegimeIdx] = useState(0);
  const [aArrastar, setAArrastar] = useState<ChaveEntrada | null>(null);
  const arrasto = useRef<{ chave: ChaveEntrada; ponteiro: number; x: number; valor: number } | null>(
    null,
  );

  useEffect(() => {
    setMontado(true);
    // `useReducedMotion()` ainda devolve `null` no primeiro render, por isso a
    // preferência lê-se aqui diretamente. Sem isto, a cena rebobinava por um
    // instante a quem pediu para nada se mexer.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAto(0);
    setParado(false);
  }, []);

  const estatico = montado && Boolean(reduz);
  const regime = parametros.regimes[regimeIdx] ?? parametros.regimes[0];

  const composicao = useMemo(
    () => composicaoDemo(entradas, { taxaIVA: parametros.taxaIVA, fracaoFaturacao: regime.fracaoFaturacao }),
    [entradas, parametros.taxaIVA, regime.fracaoFaturacao],
  );
  const regua = useMemo(() => reguaDemo(composicao), [composicao]);

  const alternativa = useMemo(() => {
    const outro = parametros.regimes[regimeIdx === 0 ? 1 : 0];
    return {
      regime: outro,
      composicao: composicaoDemo(entradas, {
        taxaIVA: parametros.taxaIVA,
        fracaoFaturacao: outro.fracaoFaturacao,
      }),
    };
  }, [entradas, parametros, regimeIdx]);

  const barraRef = useRelogioDePalco({
    duracaoMs: DURACAO_ATO[ato] ?? DURACAO_ATO[0],
    chave: `${ciclo}-${ato}-${regimeIdx}`,
    parado: parado || Boolean(reduz),
    aoTerminar: () => {
      // A sequência termina no resultado e fica lá. Reiniciar sozinho é o
      // que faz uma demonstração parecer um GIF: o olho aprende que nada
      // do que ali está depende de si.
      if (ato < ATOS.length - 1) setAto((a) => a + 1);
      else setParado(true);
    },
  });

  // Antes do terceiro ato o preço ainda não existe — o que está no ecrã é o
  // mínimo que cobre custos. Mostrar já o recomendado seria contar o fim.
  const precoVisivel = ato >= 3 ? composicao.pvp : composicao.minimoPVP;
  const marcadorVisivel = ato >= 3 ? regua.preco : regua.minimo;

  const recomecar = useCallback(() => {
    setParado(false);
    setAto(0);
    setCiclo((c) => c + 1);
  }, []);

  /** Uma alteração manual salta para o fim: o resultado é a resposta. */
  const fixarNoResultado = useCallback(() => {
    setParado(true);
    setAto(ATOS.length - 1);
  }, []);

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
    arrasto.current = {
      chave,
      ponteiro: evento.pointerId,
      x: evento.clientX,
      valor: entradas[chave],
    };
    setAArrastar(chave);
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
  };

  const aoTeclado = (evento: React.KeyboardEvent<HTMLDivElement>, chave: ChaveEntrada) => {
    const [min, max] = LIMITES_DEMO_PRECO[chave];
    const passo = PASSO_TECLADO[chave] * (evento.shiftKey ? 4 : 1);
    const mapa: Record<string, number | undefined> = {
      ArrowRight: entradas[chave] + passo,
      ArrowUp: entradas[chave] + passo,
      ArrowLeft: entradas[chave] - passo,
      ArrowDown: entradas[chave] - passo,
      Home: min,
      End: max,
      PageUp: entradas[chave] + passo * 4,
      PageDown: entradas[chave] - passo * 4,
    };
    const alvo = mapa[evento.key];
    if (alvo === undefined) return;
    evento.preventDefault();
    definir(chave, alvo);
    fixarNoResultado();
  };

  const transicao = estatico ? { duration: 0 } : { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

  const parcelas = [
    { rotulo: "Materiais", valor: entradas.materiais, cor: "bg-stone-400 dark:bg-stone-500" },
    { rotulo: "Trabalho", valor: entradas.trabalho, cor: "bg-stone-300 dark:bg-stone-600" },
    { rotulo: "Custos fixos", valor: entradas.estrutura, cor: "bg-categoria-areia-border dark:bg-stone-700" },
    { rotulo: "SS e IRS", valor: composicao.retencaoPessoal, cor: "bg-clay dark:bg-clay" },
    { rotulo: "IVA", valor: composicao.iva, cor: "bg-categoria-areia-text/70 dark:bg-categoria-areia-text" },
    { rotulo: "Lucro", valor: composicao.lucro, cor: "bg-brand" },
  ].filter((p) => p.valor > 0);

  return (
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
              Ali o título É o primeiro ecrã; aqui o primeiro ecrã é o palco —
              um título maior empurrava o preço para fora da dobra e a pessoa
              chegava à prova por scroll, que é o oposto de a ver acontecer. */}
          <h1 className="text-balance font-display text-[clamp(2.2rem,5.4vw,4.4rem)] font-semibold leading-[.98] tracking-[-.035em] text-ink">
            O preço não nasce de um palpite.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Custos, trabalho, impostos e margem formam um valor que sustenta o negócio.
          </p>
        </div>

        {/* ── O palco ───────────────────────────────────────────────── */}
        <div
          data-palco="preco"
          className="relative mt-7 rounded-[2rem] border border-categoria-areia-border bg-stone-50 shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:mt-9 sm:rounded-[2.5rem]"
        >
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
              <span className="hidden text-[11px] text-stone-400 sm:inline">
                Peça física · Continente
              </span>
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
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 text-[10px] font-bold uppercase tracking-[.12em] text-stone-400 dark:border-stone-700">
                <span>Entradas</span>
                <span className="normal-case tracking-normal">arrasta ou usa as setas</span>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {CONTROLOS.map(({ chave, rotulo, nota, Icon }, indice) => {
                  const valor = entradas[chave];
                  const [min, max] = LIMITES_DEMO_PRECO[chave];
                  const activo = aArrastar === chave;
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
                      // uma preferência: com um `initial` opaco o SSR escreve
                      // `opacity: 0` no HTML, e quem não recebe JavaScript
                      // fica com um palco em branco. O que se anima é a
                      // ÊNFASE — no primeiro ato as entradas avançam e
                      // acendem, uma a uma —, nunca a existência.
                      initial={false}
                      animate={{
                        x: ato === 0 && !estatico ? 4 : 0,
                        opacity: ato === 0 || ato >= 3 || estatico ? 1 : 0.72,
                      }}
                      transition={{ ...transicao, delay: estatico ? 0 : indice * 0.08 }}
                      onPointerDown={(e) => aoDescer(e, chave)}
                      onPointerMove={aoMover}
                      onPointerUp={aoLargar}
                      onPointerCancel={aoLargar}
                      onKeyDown={(e) => aoTeclado(e, chave)}
                      className={`focus-marca grid min-h-[56px] cursor-ew-resize touch-none select-none grid-cols-[2rem_1fr_auto] items-center gap-2.5 rounded-xl px-2 py-2 transition-colors ${
                        activo
                          ? "bg-white shadow-card dark:bg-stone-800"
                          : "hover:bg-white/70 dark:hover:bg-stone-800/60"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                          activo
                            ? "border-brand/40 bg-brand-light text-brand dark:bg-brand/20"
                            : "border-stone-200 bg-white text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                          {rotulo}
                        </span>
                        <span className="block truncate text-[10px] text-stone-400">{nota}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-display text-[15px] font-semibold tabular-nums text-ink">
                          {formatarEntrada(chave, valor)}
                        </span>
                        <span
                          aria-hidden
                          className={`flex flex-col gap-[3px] transition-opacity ${activo ? "opacity-90" : "opacity-30"}`}
                        >
                          <i className="block h-[3px] w-[3px] rounded-full bg-stone-500" />
                          <i className="block h-[3px] w-[3px] rounded-full bg-stone-500" />
                          <i className="block h-[3px] w-[3px] rounded-full bg-stone-500" />
                        </span>
                      </span>
                    </m.div>
                  );
                })}
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-stone-200 pt-1 text-[10px] text-stone-400 dark:border-stone-700">
                <span>Valores sem IVA</span>
                {/* `min-h-[36px]`: com `py-1` o alvo media 88×23 e falhava o
                    mínimo de 24×24 do WCAG 2.2 (2.5.8) em todas as vistas —
                    apanhado por `auditar-a11y-homepage-preco.mjs`. */}
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
              {/*
                Os dois nós do caudal.
                Aqui esteve um feixe de quatro bezier a convergir, como no
                protótipo. Naquele desenho a coluna do meio tinha 430 px; nesta
                grelha tem ~215, e o cartão da base ocupava-a toda: as curvas
                ficavam escondidas por baixo dele e só se via a ponta esquerda,
                que lia como ruído em vez de convergência. A soma já está dita
                em aritmética dentro do cartão («14,80 + 9,60 + 4,50»); o que
                faltava era o SENTIDO do caudal, e para isso um nó que acende
                na divisória chega e lê-se em qualquer largura.
              */}
              <Conector lado="esquerda" aceso={ato >= 1 || estatico} estatico={estatico} />
              <Conector lado="direita" aceso={ato >= 3 || estatico} estatico={estatico} />

              <div className="relative flex w-full flex-col items-center gap-2.5">
                <m.div
                  initial={false}
                  animate={{
                    opacity: ato >= 1 || estatico ? 1 : 0.25,
                    y: ato >= 1 || estatico ? 0 : 6,
                  }}
                  transition={transicao}
                  className="w-full max-w-[13rem] rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-center shadow-card dark:border-stone-700 dark:bg-stone-800"
                >
                  <div className="text-[9px] font-bold uppercase tracking-[.12em] text-stone-400">
                    Base de custos
                  </div>
                  <div className="mt-1 font-display text-[22px] font-semibold tabular-nums text-ink">
                    {eur(composicao.base)}
                  </div>
                  <div className="mt-1 text-[9px] tabular-nums text-stone-400">
                    {eur(entradas.materiais)} + {eur(entradas.trabalho)} + {eur(entradas.estrutura)}
                  </div>
                </m.div>

                <m.div
                  initial={false}
                  animate={{
                    opacity: ato >= 2 || estatico ? 1 : 0,
                    y: ato >= 2 || estatico ? 0 : 8,
                  }}
                  transition={transicao}
                  className="flex w-full max-w-[13rem] items-center justify-between gap-2 rounded-full border border-brand/25 bg-brand-light px-3 py-1.5 dark:bg-brand/15"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide text-brand-dark dark:text-brand-mint">
                    Markup
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-brand-dark dark:text-brand-mint">
                    + {eur(composicao.lucro)}
                  </span>
                </m.div>

                {composicao.retencaoPessoal > 0 && (
                  <m.div
                    initial={false}
                    animate={{
                      opacity: ato >= 2 || estatico ? 1 : 0,
                      y: ato >= 2 || estatico ? 0 : 8,
                    }}
                    transition={{ ...transicao, delay: estatico ? 0 : 0.1 }}
                    className="flex w-full max-w-[13rem] items-center justify-between gap-2 rounded-full border border-clay-border bg-clay-bg px-3 py-1.5"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wide text-clay-text">
                      SS e IRS
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-clay-text">
                      + {eur(composicao.retencaoPessoal)}
                    </span>
                  </m.div>
                )}

                <m.div
                  initial={false}
                  animate={{
                    opacity: ato >= 2 || estatico ? 1 : 0,
                    y: ato >= 2 || estatico ? 0 : 8,
                  }}
                  transition={{ ...transicao, delay: estatico ? 0 : 0.2 }}
                  className="flex w-full max-w-[13rem] items-center justify-between gap-2 rounded-full border border-categoria-areia-border bg-categoria-areia-bg px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide text-categoria-areia-text">
                    IVA · {pctLimpa(parametros.taxaIVA)}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-categoria-areia-text">
                    + {eur(composicao.iva)}
                  </span>
                </m.div>
              </div>
            </div>

            {/* ── 3. O resultado ───────────────────────────────────── */}
            <m.div
              initial={false}
              animate={{ opacity: ato >= 3 || estatico ? 1 : 0.55 }}
              transition={transicao}
              className="min-w-0 lg:pl-6"
            >
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-stone-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${ato >= 3 ? "bg-brand" : "border border-stone-300 dark:border-stone-600"}`}
                />
                {ato >= 3 ? "Resultado" : "Resultado em formação"}
              </div>

              <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-end">
                <div>
                  <div className="font-display text-[clamp(2.9rem,7.5vw,3.9rem)] font-semibold leading-[.9] tracking-[-.04em] tabular-nums text-ink">
                    <AnimatedNumber value={precoVisivel} format={eur} />
                  </div>
                  <div className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {ato >= 3 ? "Preço recomendado, com IVA" : "Mínimo para cobrir custos"}
                  </div>
                </div>

                <dl className="grid grid-cols-3 divide-x divide-stone-200 dark:divide-stone-700">
                  {[
                    { rotulo: "Preço mínimo", valor: eur(composicao.minimoPVP) },
                    { rotulo: "Lucro por venda", valor: eur(composicao.lucro) },
                    { rotulo: "Margem", valor: pct1(composicao.margem) },
                  ].map((metrica, i) => (
                    <div key={metrica.rotulo} className={`min-w-0 px-2 ${i === 0 ? "pl-0" : ""}`}>
                      <dt className="text-[9px] leading-tight text-stone-400">{metrica.rotulo}</dt>
                      <dd className="mt-1 font-display text-[15px] font-semibold tabular-nums text-ink">
                        {metrica.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* A régua */}
              <div className="mt-5">
                <div
                  className="flex h-4 overflow-hidden rounded-full border border-categoria-areia-border dark:border-stone-700"
                  style={{
                    transformOrigin: "left",
                    transform: ato >= 3 || estatico ? "scaleX(1)" : "scaleX(.06)",
                    transition: estatico ? "none" : "transform .9s cubic-bezier(.16,1,.3,1)",
                  }}
                  aria-hidden
                >
                  <span
                    className="grid place-items-center bg-clay-bg text-[8px] font-semibold text-clay-text"
                    style={{ width: `${Math.max(18, regua.minimo)}%` }}
                  >
                    não cobre
                  </span>
                  <span
                    className="grid place-items-center bg-alert-bg text-[8px] font-semibold text-alert-text"
                    style={{ width: `${Math.max(14, regua.preco - regua.minimo)}%` }}
                  >
                    sustentável
                  </span>
                  <span className="grid flex-1 place-items-center bg-brand-light text-[8px] font-semibold text-brand-dark dark:bg-brand/25 dark:text-brand-mint">
                    margem saudável
                  </span>
                </div>

                <div className="relative mt-1 h-8">
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-2.5 border-b border-stone-300 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_9px)] text-stone-300 dark:border-stone-700 dark:text-stone-700"
                  />
                  {/* A linha do mínimo sem rótulo era um traço vermelho sem
                      referente — a pessoa via um aviso e não sabia de quê. */}
                  <div
                    aria-hidden
                    className="absolute top-0 h-4 border-l border-dashed border-clay"
                    style={{
                      left: `${regua.minimo}%`,
                      transition: estatico ? "none" : "left .9s cubic-bezier(.16,1,.3,1)",
                    }}
                  >
                    <span className="absolute left-0 top-[1.05rem] -translate-x-1/2 text-[8px] font-medium text-clay-text">
                      mínimo
                    </span>
                  </div>
                  <div
                    className="absolute -top-[1.15rem] w-px bg-brand"
                    style={{
                      left: `${marcadorVisivel}%`,
                      height: "2.4rem",
                      transition: estatico ? "none" : "left 1s cubic-bezier(.16,1,.3,1)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute -top-1.5 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-brand bg-white dark:bg-stone-900"
                    >
                      <i className="block h-1.5 w-1.5 rounded-full bg-brand" />
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-[9px] tabular-nums text-stone-400" aria-hidden>
                  {regua.marcas.map((marca) => (
                    <span key={marca}>{marca} €</span>
                  ))}
                </div>
              </div>

              {/* A composição */}
              <m.div
                initial={false}
                animate={{ opacity: ato >= 3 || estatico ? 1 : 0, y: ato >= 3 || estatico ? 0 : 8 }}
                transition={transicao}
                className="mt-5"
              >
                <div className="flex items-baseline justify-between gap-2 text-[10px] text-stone-400">
                  <span>A composição do preço</span>
                  <span className="font-semibold tabular-nums text-stone-600 dark:text-stone-300">
                    total · {eur(composicao.pvp)}
                  </span>
                </div>
                <div className="mt-1.5 flex h-3 gap-[3px]" aria-hidden>
                  {parcelas.map((p) => (
                    <i
                      key={p.rotulo}
                      className={`block min-w-[6px] rounded-sm ${p.cor}`}
                      style={{ flexGrow: p.valor, flexBasis: 0 }}
                    />
                  ))}
                </div>
                {/*
                  Grelha em ecrã estreito, proporções a partir de `sm`.
                  Com a fila proporcional também no telemóvel, as parcelas
                  pequenas encolhiam abaixo do legível e a última — o LUCRO —
                  saía para fora do scroll horizontal. A parcela que a pessoa
                  veio ver não pode ser a que fica escondida.
                */}
                <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2.5 sm:flex sm:gap-1.5">
                  {parcelas.map((p) => (
                    <li
                      key={p.rotulo}
                      className="min-w-0 text-center"
                      style={{ flexGrow: p.valor, flexBasis: 0 }}
                    >
                      <span className="block text-[11px] font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                        {eur(p.valor)}
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-tight text-stone-400">
                        {p.rotulo}
                      </span>
                    </li>
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
                    {eur(alternativa.composicao.pvp)}
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
              onIr={(i) => {
                setParado(true);
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
  );
}
