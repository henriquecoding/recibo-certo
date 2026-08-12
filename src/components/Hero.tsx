"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck, FileSign, Warning, Calendar, Check, Sparkle, CursorArrow } from "@/components/ui/Icons";
import { scrollToId } from "@/lib/scroll";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { ferramentasPorPerfil } from "@/lib/ferramentas";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { guiasPorPerfil } from "@/lib/guias-config";
import SeletorModo from "@/components/SeletorModo";
import ComoFuncionaModal from "@/components/ComoFuncionaModal";
import type { ComparacaoCategoriasResult, VencimentoResult } from "@/lib/fiscal-dependente";
import type { CalcResult } from "@/lib/fiscal";
import FizLogo from "@/components/fiz/FizLogo";
import FizActionButton from "@/components/fiz/FizActionButton";
import { fizAtiva } from "@/lib/fiz/flag";
import { NOTA_LIGACAO } from "@/content/parcerias-copy";
import type { FizIntent } from "@/lib/guias/manifests";
import {
  BotaoPausa,
  ReguaDeAtos,
  TituloAto,
  linha as linhaVar,
  palco as palcoVars,
  useRelogioDePalco,
  type AtoDaRegua,
} from "@/components/simulador/palco";

// Selos de confiança — enxutos (2). O detalhe das fontes e as contagens do
// ecossistema vivem, sem repetição, na faixa de números e na secção Fontes.
const TRUST = [
  { icon: <ShieldCheck size={14} />, text: "Taxas de 2026 verificadas" },
  { icon: <FileSign size={14} />, text: "Base legal em cada cálculo" },
];

const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

interface TypingStep { text: string; delay: number }

interface CardData {
  etiqueta: string;
  heroLabel: string;
  bruto: number;
  teu: number;
  irs: number;
  ss: number;
  pctSufixo: string;
  linhas: { l: string; v: string; valor: number; strong?: boolean }[];
  /**
   * Como se leem as `linhas` — e não é um detalhe de estilo.
   *
   * `deducoes`: cada linha não-final é algo que SAI do bruto, e leva sinal de
   * menos. `cenarios`: cada linha é um líquido alternativo, lado a lado.
   *
   * A distinção faltava e o desenho inferia o sinal a partir de `strong`, que
   * quer dizer outra coisa (é o total / o vencedor). Resultado: o cartão de
   * comparação anunciava «− 21 560 €» e «− 18 036 €» para os caminhos
   * perdedores, como se fossem despesas em vez de rendimentos líquidos.
   */
  modoLinhas: "deducoes" | "cenarios";
  box: { tom: "alerta" | "info"; titulo: string; sub: string };
  /**
   * O passo que fecha a demo: o que acontece DEPOIS de saber o número.
   *
   * O ReciboCerto explica, calcula e prepara; quem emite, declara e vigia as
   * obrigações reais é a FIZ. Sem este quarto tempo a demo termina no
   * resultado e deixa por responder a pergunta que toda a gente faz a
   * seguir — "e agora, quem trata disto?".
   *
   * Só aparece com a integração ligada (`fizAtiva()`); com ela desligada a
   * demo continua a fazer sentido sem alterações.
   */
  fiz?: {
    titulo: string;
    sub: string;
    /** Rótulo do botão. Em modo LIGACAO abre o site do parceiro. */
    cta: string;
    /** Intenção, para o destino por caminho quando a FIZ o confirmar. */
    intent: FizIntent;
  };
  nota: string;
  typingSteps: TypingStep[];
}

/**
 * Números dos quatro cartões do Hero.
 *
 * TODOS vêm do motor fiscal verificado, calculados no SERVIDOR (`page.tsx`) e
 * entregues aqui já resolvidos — assim o motor não entra no bundle inicial do
 * cliente e não há flash de valores. Nenhum montante fiscal é escrito à mão
 * neste ficheiro: é a regra 1 do CLAUDE.md aplicada também à montra.
 */
function criarExemplos({
  CMP,
  REC,
  VENC,
}: {
  CMP: ComparacaoCategoriasResult;
  REC: CalcResult;
  VENC: VencimentoResult;
}): Record<
  Perfil,
  {
    h1: ReactNode;
    sub: string;
    primary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    secondary: {
      label: string;
      href?: string;
      scrollTo?: string;
      setModo?: Perfil;
      /** Abre o modal "Como funciona" (substitui o antigo scroll para a secção
       *  #features, removida na Homepage 3.0 — o botão tinha ficado morto). */
      modal?: boolean;
    };
    card: CardData;
  }
> {
  const EMP = {
    liquido: Math.round(CMP.empresa.liquido),
    irc: Math.round(CMP.empresa.irc),
    derrama: Math.round(CMP.empresa.derrama),
    dividendos: Math.round(CMP.empresa.dividendos),
    impostos: Math.round(CMP.empresa.irc + CMP.empresa.derrama + CMP.empresa.dividendos),
    custos: Math.round(CMP.empresa.custosEmpresa),
  };
  const CMP_LIQ = {
    dependente: Math.round(CMP.dependente.liquido),
    freelancer: Math.round(CMP.freelancer.liquido),
    empresa: Math.round(CMP.empresa.liquido),
  };
  const CMP_BEST = Math.max(CMP_LIQ.dependente, CMP_LIQ.freelancer, CMP_LIQ.empresa);

  // A faturação comparada não é uma constante deste ficheiro: é a que o motor
  // recebeu no servidor. Tê-la nos dois sítios era garantir que um dia
  // divergiam e o cartão anunciava um bruto diferente daquele que calculou.
  const FAT = CMP.dependente.bruto;

  // Percentagens derivadas do próprio resultado, não escritas ao lado dele:
  // se a taxa mudar em `fiscal-data.ts`, o rótulo acompanha.
  const pctRet = Math.round(REC.taxaRetencao * 100);
  const pctSS = VENC.bruto > 0 ? Math.round((VENC.ssTrabalhador / VENC.bruto) * 100) : 0;

  return {
  independente: {
    h1: (
      <>
        Sabe quanto é <span className="text-brand">teu</span>, quanto reservar e quando pagar.
      </>
    ),
    sub: "O copiloto financeiro para trabalhadores independentes em Portugal — sem surpresas no fim do ano.",
    primary: { label: "Calcular o meu recibo", scrollTo: "calculadora" },
    secondary: { label: "Como funciona", modal: true },
    card: {
      etiqueta: `Recibo de ${eur0(REC.bruto)} · Art. 151.º`,
      heroLabel: "O que é mesmo teu",
      bruto: REC.bruto,
      teu: REC.liquido,
      irs: REC.retencaoIRS,
      ss: REC.segSocial,
      pctSufixo: "deste recibo é mesmo teu",
      linhas: [
        { l: `Retenção IRS (${pctRet}%)`, v: `− ${eur0(REC.retencaoIRS)}`, valor: REC.retencaoIRS },
        { l: "Segurança Social", v: `− ${eur0(REC.segSocial)}`, valor: REC.segSocial },
        { l: "Disponível para gastar", v: eur0(REC.liquido), valor: REC.liquido, strong: true },
      ],
      modoLinhas: "deducoes",
      box: {
        tom: "alerta",
        titulo: "Prazo SS — 20 julho",
        sub: `Reserva ${eur0(REC.segSocial)} para não seres apanhado`,
      },
      // Em modo LIGACAO nada é transportado — a copy tem de o refletir. A
      // frase antiga («as tuas obrigações reais, tratadas por…») descrevia o
      // handoff da Fase 2.
      fiz: {
        titulo: "Emitir e declarar com a FIZ",
        sub: "Faturação certificada, IVA e Segurança Social tratados por quem executa",
        cta: "Conhecer a FIZ",
        intent: "CONFIGURE_FREELANCER",
      },
      nota: "Atividade estabelecida (2.º ano ou seguinte). No 1.º ano de atividade, a Segurança Social é isenta e a retenção na fonte pode ser dispensada.",
      typingSteps: [
        { text: "2", delay: 320 },
        { text: "20", delay: 260 },
        { text: "200", delay: 240 },
        { text: "2003", delay: 300 },
        { text: "200", delay: 600 },
        { text: "2000", delay: 280 },
        { text: eur0(REC.bruto), delay: 500 },
      ],
    },
  },
  dependente: {
    h1: (
      <>
        Do salário bruto,
        <br />
        sabe o teu <span className="text-brand">líquido real.</span>
      </>
    ),
    sub: "Vê o que devias receber ao fim do mês — com a retenção de IRS de 2026, a Segurança Social e os subsídios de férias e de Natal. Depois compara com o teu recibo de vencimento.",
    primary: { label: "Simular o meu salário", scrollTo: "calculadora" },
    secondary: { label: "Comparar caminhos", setModo: "comparar" },
    card: {
      etiqueta: `Salário de ${eur0(VENC.bruto)} · Continente`,
      heroLabel: "O teu líquido",
      bruto: VENC.bruto,
      teu: VENC.liquido,
      irs: VENC.irsRetido,
      ss: VENC.ssTrabalhador,
      pctSufixo: "do bruto chega ao bolso",
      linhas: [
        { l: "Retenção IRS", v: `− ${eur0(VENC.irsRetido)}`, valor: VENC.irsRetido },
        { l: `Segurança Social (${pctSS}%)`, v: `− ${eur0(VENC.ssTrabalhador)}`, valor: VENC.ssTrabalhador },
        { l: "Vencimento líquido", v: eur0(VENC.liquido), valor: VENC.liquido, strong: true },
      ],
      modoLinhas: "deducoes",
      box: { tom: "info", titulo: "14 meses por ano", sub: "Subsídios de férias e de Natal incluídos" },
      nota: "Líquido de um mês normal, sem subsídio de refeição. Tabela I (não casado, sem dependentes), Continente.",
      typingSteps: [
        { text: "1", delay: 300 },
        { text: "15", delay: 280 },
        { text: "150", delay: 260 },
        { text: "1500", delay: 240 },
        { text: eur0(VENC.bruto), delay: 500 },
      ],
    },
  },
  empresa: {
    h1: (
      <>
        Vale a pena <span className="text-brand">abrir empresa?</span> Vê o líquido real.
      </>
    ),
    sub: "Simula a tua sociedade — IRC PME, derrama, tributação autónoma e distribuição de dividendos. Descobre quanto te fica no bolso e quando compensa face aos recibos verdes.",
    primary: { label: "Simular a minha empresa", scrollTo: "calculadora" },
    secondary: { label: "Comparar caminhos", setModo: "comparar" },
    card: {
      etiqueta: `Faturação ${eur0(FAT)}/ano · via empresa`,
      heroLabel: "Líquido pela empresa",
      bruto: FAT,
      teu: EMP.liquido,
      irs: EMP.impostos,
      ss: EMP.custos,
      pctSufixo: "fica contigo via empresa",
      // Os três impostos separados, não somados numa linha só: é a diferença
      // entre dizer «saem 11 964 €» e mostrar de onde vem cada euro. O motor
      // já devolve a decomposição — era só não a deitar fora.
      linhas: [
        { l: "IRC (PME + taxa geral)", v: `− ${eur0(EMP.irc)}`, valor: EMP.irc },
        { l: "Derrama municipal", v: `− ${eur0(EMP.derrama)}`, valor: EMP.derrama },
        { l: "IRS sobre dividendos", v: `− ${eur0(EMP.dividendos)}`, valor: EMP.dividendos },
        { l: "Custos de estrutura", v: `− ${eur0(EMP.custos)}`, valor: EMP.custos },
        { l: "Líquido anual estimado", v: eur0(EMP.liquido), valor: EMP.liquido, strong: true },
      ],
      modoLinhas: "deducoes",
      box: { tom: "info", titulo: "IRC PME a 15%", sub: "Sobre os primeiros 50 000 € de lucro tributável" },
      fiz: {
        titulo: "Constituir e manter com a FIZ",
        sub: "Contabilidade organizada e obrigações da sociedade",
        cta: "Ver a FIZ para empresas",
        intent: "START_COMPANY",
      },
      nota: `Estimativa para ${eur0(FAT)}/ano de faturação. Modela IRC PME, derrama e dividendos a 28% — não substitui um contabilista certificado.`,
      typingSteps: [
        { text: "3", delay: 280 },
        { text: "30", delay: 240 },
        { text: "300", delay: 220 },
        { text: "3000", delay: 240 },
        { text: "30009", delay: 300 },
        { text: "3000", delay: 620 },
        { text: "30000", delay: 260 },
        { text: eur0(FAT), delay: 550 },
      ],
    },
  },
  comparar: {
    h1: (
      <>
        Qual o <span className="text-brand">melhor caminho</span> para o teu rendimento?
      </>
    ),
    sub: "Para o mesmo rendimento anual, compara o líquido como por conta de outrem, recibos verdes ou empresa — com o ponto de viragem e o calendário fiscal de cada cenário.",
    primary: { label: "Comparar cenários", scrollTo: "calculadora" },
    secondary: { label: "Como funciona", modal: true },
    card: {
      etiqueta: `Mesmo rendimento · ${eur0(FAT)}/ano`,
      heroLabel: "Mais líquido",
      bruto: FAT,
      teu: CMP_BEST,
      irs: CMP_LIQ.freelancer,
      ss: CMP_LIQ.dependente,
      pctSufixo: "no melhor cenário",
      linhas: [
        { l: "Por conta de outrem", v: eur0(CMP_LIQ.dependente), valor: CMP_LIQ.dependente, strong: CMP.melhor === "dependente" },
        { l: "Recibos verdes", v: eur0(CMP_LIQ.freelancer), valor: CMP_LIQ.freelancer, strong: CMP.melhor === "freelancer" },
        { l: "Empresa (Lda)", v: eur0(CMP_LIQ.empresa), valor: CMP_LIQ.empresa, strong: CMP.melhor === "empresa" },
      ],
      modoLinhas: "cenarios",
      box: { tom: "info", titulo: "Uma base, três caminhos", sub: "Vê o ponto de viragem e o calendário fiscal" },
      fiz: {
        titulo: "Confirmar a escolha com a FIZ",
        sub: "Um contabilista certificado valida antes de mudares",
        cta: "Falar com um contabilista",
        intent: "FIND_ACCOUNTANT",
      },
      nota: `Estimativa para ${eur0(FAT)}/ano. Ajusta o rendimento e os pressupostos na ferramenta de comparação.`,
      typingSteps: [
        { text: "3", delay: 280 },
        { text: "30", delay: 240 },
        { text: "300", delay: 220 },
        { text: "3000", delay: 240 },
        { text: "30000", delay: 280 },
        { text: eur0(FAT), delay: 550 },
      ],
    },
  },
  };
}

/* ── Contagem animada suave ──────────────────────────────────── */

function CountUp({ target, delay = 0, prefix = "" }: { target: number; delay?: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setVal(0);
    setStarted(false);
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [target, delay]);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Arredondar aqui também: o caminho animado faz `Math.round` a cada
      // fotograma, este não fazia, e quem tem movimento reduzido via
      // «1240,4 €» onde os outros viam «1240 €». Só se notou quando os
      // valores deixaram de ser inteiros escritos à mão e passaram a vir do
      // motor.
      setVal(Math.round(target));
      return;
    }
    let raf = 0;
    const dur = 900;
    const start = performance.now();
    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);

  return <>{prefix}{val.toLocaleString("pt-PT")} €</>;
}

/** Linha de detalhe do cartão, com o valor a contar de zero. */
function LinhaCartao({
  rotulo,
  valor,
  prefixo,
  delay,
}: {
  rotulo: string;
  valor: number;
  prefixo: string;
  delay: number;
}) {
  return (
    <m.div
      variants={linhaVar}
      className="flex min-h-[32px] items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800/50"
    >
      <span className="min-w-0 truncate text-xs text-stone-500 dark:text-stone-400">{rotulo}</span>
      <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-200">
        <CountUp target={valor} delay={delay} prefix={prefixo} />
      </span>
    </m.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Cartão hero — demo «em direto»: encenação de utilização real
   ─────────────────────────────────────────────────────────────
   Coreografia por ciclo (~11 s):
     1. o cartão acorda com ESQUELETO a respirar — nunca fica em
        branco (o conteúdo real, invisível, reserva a altura);
     2. um cursor entra em cena, desliza até ao campo e CLICA
        (ripple + anel de foco) — o valor é digitado com gralha
        corrigida, como um humano;
     3. o cursor desliza até «Calcular» e clica — o botão afunda
        e passa a "a calcular";
     4. o resultado rebenta: número em contagem com pop, clarão
        da marca, faísca, barra de proporção, e cada esqueleto
        transforma-se na linha real em cascata;
     5. pausa de leitura → fade → recomeço.
   `prefers-reduced-motion`: resultado final estático, sem cursor.
   ══════════════════════════════════════════════════════════════ */

type Phase = "idle" | "focusing" | "typing" | "typed" | "calculating" | "result";

interface Ponteiro {
  x: number;
  y: number;
  op: number; // opacidade
  dur: number; // duração do deslize até este alvo
  premido: boolean; // "afunda" no clique
}

const FADE_MS = 600;

/**
 * Compasso da encenação de entrada, em milissegundos.
 *
 * Vive num objeto e não espalhado por `t += 260` porque tem DOIS leitores: o
 * agendador dos passos e o relógio da régua, que precisa de saber quanto dura
 * o primeiro ato antes de ele começar. Com os números soltos, mexer num deles
 * dessincronizava a barra da encenação sem nada falhar visivelmente — o pior
 * tipo de avaria.
 */
const COMPASSO = {
  entradaCursor: 650,
  aparece: 60,
  deslizaAteCampo: 260,
  ateClicar: 880,
  solta: 170,
  ateEscrever: 260,
  depoisDeEscrever: 500,
  ateBotao: 300,
  deslizaAteBotao: 760,
  soltaBotao: 170,
  desvanece: 230,
  calcula: 480,
} as const;

const SOMA_COMPASSO = Object.values(COMPASSO).reduce((a, b) => a + b, 0);

/** Duração total do ato de entrada, digitação incluída. */
function duracaoEntrada(steps: TypingStep[]): number {
  return SOMA_COMPASSO + steps.reduce((s, p) => s + p.delay, 0);
}

// ── Atos ─────────────────────────────────────────────────────────────────
//  O cartão deixou de despejar o resultado inteiro de uma vez. Agora
//  desenrola-o: de onde vem, o que fica, o que aí vem, e quem trata disso.
//  A encenação (cursor + digitação) é o primeiro ato, não um preâmbulo — daí
//  aparecer na régua como qualquer outro.

type AtoHero = "entrada" | "decomposicao" | "resultado" | "contexto" | "fiz";

const META_ATO: Record<AtoHero, { rotulo: string; legenda: string }> = {
  entrada: { rotulo: "Valor", legenda: "Inserir o valor e calcular" },
  decomposicao: { rotulo: "Onde vai", legenda: "Para onde vai o dinheiro" },
  resultado: { rotulo: "O que fica", legenda: "Quanto fica contigo" },
  contexto: { rotulo: "A reter", legenda: "O que convém não esqueceres" },
  // A régua é o caminho declarado. Um leitor de ecrã anuncia «Passo N de M:
  // …» — e deve dizer que este passo leva para fora antes de lá chegar.
  fiz: { rotulo: "Parceiro", legenda: "Quem trata das obrigações — ligação para a FIZ" },
};

const DUR_ATO: Record<Exclude<AtoHero, "entrada">, number> = {
  decomposicao: 2800,
  resultado: 2600,
  contexto: 2800,
  fiz: 3000,
};

function HeroCard({ perfil, card }: { perfil: Perfil; card: CardData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(false);
  const mostrarFiz = fizAtiva();
  const [fading, setFading] = useState(false);
  const [cycle, setCycle] = useState(0);

  // Atos deste perfil. O da FIZ só entra se a integração estiver ligada E o
  // cartão tiver conteúdo de parceiro (o de vencimento não tem).
  const atos = useMemo<AtoHero[]>(() => {
    const base: AtoHero[] = ["entrada", "decomposicao", "resultado", "contexto"];
    return mostrarFiz && card.fiz ? [...base, "fiz"] : base;
  }, [mostrarFiz, card.fiz]);

  const [idxAto, setIdxAto] = useState(0);
  const [parado, setParado] = useState(false);
  const [sobrevoo, setSobrevoo] = useState(false);

  // Cursor de rato encenado + ripple do clique — medidos por ciclo em relação
  // ao cartão. A altura do cartão é estável durante o ciclo (o esqueleto ocupa
  // o lugar do conteúdo real), por isso as medições não desatualizam.
  const [ponteiro, setPonteiro] = useState<Ponteiro | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const reduz = useReducedMotion();

  /**
   * `useReducedMotion` devolve `null` no servidor e o valor real no cliente.
   * Ao contrário da `DemoIRS`, que é `ssr: false` e nunca é renderizada no
   * servidor, este cartão vem no HTML — por isso deixar a preferência decidir
   * o que se DESENHA (montar ou não o botão de pausa, encher ou não a barra do
   * ato) fazia o HTML do servidor e o do cliente divergirem, e a hidratação
   * falhava com a árvore inteira a ser refeita.
   *
   * Para efeitos, `reduz` serve — correm depois da montagem. Para desenhar,
   * usa-se este, que só passa a `true` depois do primeiro render.
   */
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const reduzNoDesenho = montado && Boolean(reduz);

  const pctTeu = Math.round((card.teu / card.bruto) * 100);

  const seg: { v: number; color?: string; cls?: string }[] = [
    { v: card.teu, color: "#1D9E75" },
    { v: card.irs, color: "#9FE1CB" },
    { v: card.ss, cls: "text-brand-deep" },
  ];
  const totalSeg = seg.reduce((s, p) => s + p.v, 0) || 1;

  const ato = atos[Math.min(idxAto, atos.length - 1)];
  const emPausa = sobrevoo || parado;
  // Linhas que SAEM do bruto, sem as de valor nulo: quando o motor devolve
  // zero (o caso dos custos de estrutura, que ninguém arbitrou), a linha
  // dizia «− 0 €» e parecia avariada.
  const linhasSaida = card.linhas.filter((r) => !r.strong && r.valor > 0);
  const linhaTotal = card.linhas.find((r) => r.strong) ?? card.linhas[card.linhas.length - 1];

  const isFocused = phase !== "idle";
  const showCursor = phase === "typing" || phase === "typed";
  const isCalculating = phase === "calculating";
  const isResult = phase === "result";

  // O relógio é um só para os dois tempos da demo: durante a encenação mede-a
  // (daí a duração vir do mesmo COMPASSO que a agenda), e depois mede cada
  // ato. No fim do último, recomeça o ciclo.
  const barraRef = useRelogioDePalco({
    duracaoMs: ato === "entrada" ? duracaoEntrada(card.typingSteps) : DUR_ATO[ato],
    chave: `${perfil}-${cycle}-${idxAto}`,
    parado: reduz || emPausa,
    aoTerminar: () => {
      if (idxAto < atos.length - 1) {
        setIdxAto(idxAto + 1);
        return;
      }
      // Último ato: desvanece e volta ao princípio.
      setFading(true);
      setTimeout(() => setCycle((c) => c + 1), FADE_MS);
    },
  });

  const atosDaRegua = useMemo<AtoDaRegua[]>(
    () => atos.map((a) => ({ id: a, ...META_ATO[a] })),
    [atos],
  );

  // Saltar para um ato assume o comando: se o utilizador está a navegar, a
  // rotação automática por cima disso seria uma luta.
  const irParaAto = (idx: number) => {
    setParado(true);
    setIdxAto(idx);
    if (idx > 0 && phase !== "result") {
      // Saltar à frente durante a encenação: mostra já o resultado, senão o
      // palco ficava a explicar um número que ainda não apareceu.
      setPhase("result");
      setTypedText(card.typingSteps[card.typingSteps.length - 1].text);
      setPonteiro(null);
    }
  };

  useEffect(() => {
    if (reduz) return;
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, [reduz]);

  useEffect(() => {
    if (reduz) {
      // Sem movimento: o cartão abre já calculado, no ato do resultado, e
      // navega-se pela régua. Nada arranca sozinho.
      setPhase("result");
      setTypedText(card.typingSteps[card.typingSteps.length - 1].text);
      setIdxAto(atos.indexOf("resultado"));
      setFading(false);
      setPonteiro(null);
      return;
    }

    setPhase("idle");
    setTypedText("");
    setIdxAto(0);
    setCursorVisible(false);
    setFading(false);
    setPonteiro(null);
    setRipple(null);

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    function at(ms: number, fn: () => void) {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    }

    // Centro de um elemento em px, relativo ao canto do cartão.
    const rel = (el: HTMLElement | null, fx: number, fy: number) => {
      const base = cardRef.current;
      if (!el || !base) return null;
      const a = el.getBoundingClientRect();
      const b = base.getBoundingClientRect();
      return { x: a.left - b.left + a.width * fx, y: a.top - b.top + a.height * fy };
    };
    const alvoCampo = () => rel(inputRef.current, 0.34, 0.7);
    const alvoBotao = () => rel(btnRef.current, 0.5, 0.62);

    let t = COMPASSO.entradaCursor;
    // 1 · cursor entra em cena (aparece parado, depois desliza até ao campo)
    at(t, () => {
      const base = cardRef.current;
      if (!base) return;
      setPonteiro({ x: base.offsetWidth * 0.78, y: base.offsetHeight * 0.5, op: 0, dur: 0, premido: false });
    });
    t += COMPASSO.aparece;
    at(t, () => setPonteiro((p) => (p ? { ...p, op: 1, dur: 0.25 } : p)));
    t += COMPASSO.deslizaAteCampo;
    at(t, () => {
      const a = alvoCampo();
      if (a) setPonteiro((p) => (p ? { ...p, ...a, dur: 0.8 } : p));
    });

    // 2 · clique no campo → foco + ripple
    t += COMPASSO.ateClicar;
    at(t, () => {
      setPhase("focusing");
      setPonteiro((p) => (p ? { ...p, premido: true } : p));
      const a = alvoCampo();
      if (a) setRipple({ ...a, id: t });
    });
    t += COMPASSO.solta;
    at(t, () => setPonteiro((p) => (p ? { ...p, premido: false } : p)));

    // 3 · o rato "estaciona" (esbate-se) e a escrita começa
    t += COMPASSO.ateEscrever;
    at(t, () => {
      setPhase("typing");
      setCursorVisible(true);
      setPonteiro((p) => (p ? { ...p, x: p.x + 110, y: p.y + 62, op: 0, dur: 0.5 } : p));
    });
    for (const step of card.typingSteps) {
      t += step.delay;
      const txt = step.text;
      at(t, () => setTypedText(txt));
    }
    t += COMPASSO.depoisDeEscrever;
    at(t, () => setPhase("typed"));

    // 4 · cursor regressa e desliza até «Calcular»
    t += COMPASSO.ateBotao;
    at(t, () => {
      const a = alvoBotao();
      if (a) setPonteiro((p) => (p ? { ...p, ...a, op: 1, dur: 0.65 } : p));
    });
    t += COMPASSO.deslizaAteBotao;
    at(t, () => {
      setPonteiro((p) => (p ? { ...p, premido: true } : p));
      const a = alvoBotao();
      if (a) setRipple({ ...a, id: t });
      setPhase("calculating");
    });
    t += COMPASSO.soltaBotao;
    at(t, () => setPonteiro((p) => (p ? { ...p, premido: false } : p)));
    t += COMPASSO.desvanece;
    at(t, () => setPonteiro((p) => (p ? { ...p, op: 0, dur: 0.4 } : p)));

    // 5 · o número aparece — e a partir daqui quem manda é o relógio dos
    //     atos. A cascata de revelações que existia aqui despejava tudo em
    //     dois segundos; agora cada tempo tem o palco só para si.
    t += COMPASSO.calcula;
    at(t, () => setPhase("result"));

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [perfil, cycle, card.typingSteps, reduz]);

  // Estado visual do botão «Calcular» encenado.
  const btnEstado: "repouso" | "pronto" | "calc" | "feito" = isResult
    ? "feito"
    : isCalculating
      ? "calc"
      : phase === "typed"
        ? "pronto"
        : "repouso";
  const btnCls = {
    repouso: "border border-stone-200 bg-white text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-500",
    pronto: "bg-brand text-white shadow-glow",
    calc: "bg-brand text-white",
    feito: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand",
  }[btnEstado];
  const btnPremido = Boolean(ponteiro?.premido) && (isCalculating || phase === "typed");

  // Esqueleto: barra fantasma que respira enquanto o resultado não chega.
  const ghost = "rounded-full bg-stone-200/80 animate-pulse motion-reduce:animate-none dark:bg-stone-700";

  return (
    <div
      onMouseEnter={() => setSobrevoo(true)}
      onMouseLeave={() => setSobrevoo(false)}
      onFocusCapture={() => setSobrevoo(true)}
      onBlurCapture={() => setSobrevoo(false)}
    >
      {/* Indicador «Demo em direto» — pilha premium, coerente com o DemoIRS */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          aria-hidden
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark dark:bg-brand/10 dark:text-brand"
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduzNoDesenho && !emPausa && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70 motion-reduce:animate-none" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Demo em direto
        </span>
        {/* Sem isto, a única forma de parar era passar o rato — que não existe
            em ecrã tátil nem para quem navega por teclado (WCAG 2.2.2). */}
        {!reduzNoDesenho && <BotaoPausa parado={parado} onAlternar={() => setParado((p) => !p)} />}
      </div>

      {/* Cartão — sombra/borda acompanham a fase; palco do cursor encenado */}
      <div
        ref={cardRef}
        className={`relative rounded-4xl border bg-white p-6 transition-all duration-700 dark:bg-stone-900 sm:p-7 ${
          isResult && !fading
            ? "border-brand/20 shadow-float dark:border-brand/15"
            : isFocused && !fading
              ? "border-stone-200/80 shadow-lift dark:border-stone-700"
              : "border-stone-200/80 shadow-card dark:border-stone-700"
        }`}
      >
        <div
          style={{
            opacity: fading ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease-out`,
          }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-400">{card.etiqueta}</span>
            <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
              Exemplo
            </span>
          </div>

          {/* Campo simulado + clarão no resultado */}
          <div className="relative mt-4">
            {isResult && !reduzNoDesenho && (
              <m.div
                aria-hidden
                className="pointer-events-none absolute -inset-3 rounded-3xl bg-brand/25 blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            )}
            <div
              ref={inputRef}
              className={`relative overflow-hidden rounded-2xl border-2 px-4 py-4 transition-all duration-500 ${
                isFocused
                  ? "border-brand/30 bg-brand/[0.02] shadow-[0_0_0_4px_rgba(29,158,117,0.06)] dark:border-brand/20 dark:bg-brand/[0.04]"
                  : "border-stone-100 bg-stone-50/60 dark:border-stone-700 dark:bg-stone-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  {card.heroLabel}
                </div>
                {/* Botão «Calcular» encenado — o cursor clica-o de verdade */}
                <button
                  ref={btnRef}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className={`pointer-events-none inline-flex h-8 min-w-[88px] flex-shrink-0 select-none items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-bold transition-all duration-300 ${btnCls}`}
                  style={{ transform: btnPremido ? "scale(0.92)" : "scale(1)" }}
                >
                  {btnEstado === "calc" ? (
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((d) => (
                        <m.span
                          key={d}
                          className="h-1 w-1 rounded-full bg-white"
                          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: d * 0.12, ease: "easeInOut" }}
                        />
                      ))}
                    </span>
                  ) : btnEstado === "feito" ? (
                    <>
                      <Check size={11} /> Calculado
                    </>
                  ) : (
                    "Calcular"
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-baseline font-display text-[2.5rem] font-semibold leading-none tabular-nums sm:text-5xl">
                {isResult ? (
                  <m.span
                    className="inline-flex items-baseline text-brand"
                    initial={reduzNoDesenho ? false : { opacity: 0, y: 10, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <CountUp target={card.teu} delay={0} />
                  </m.span>
                ) : isCalculating ? (
                  <span className="text-stone-300 dark:text-stone-600">{typedText}</span>
                ) : typedText ? (
                  <span className="text-stone-800 dark:text-stone-100">{typedText}</span>
                ) : (
                  // Valores arbitrários (não `text-stone-200 dark:text-stone-700`): a
                  // classe base `text-stone-200` é remapeada às cegas pelo `.dark`
                  // global (para #2e3329, quase invisível) e ganha sempre o empate de
                  // especificidade contra um `dark:` explícito — o placeholder ficava
                  // invisível na 1.ª imagem da demo. Escrever a cor final diretamente
                  // evita a colisão por completo.
                  <span className="text-[#e7e5e4] dark:text-[#57534e]">0 €</span>
                )}
                {showCursor && (
                  <span
                    className={`ml-0.5 inline-block h-9 w-[2.5px] translate-y-[2px] rounded-full bg-brand transition-opacity duration-75 sm:h-11 ${
                      cursorVisible ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden
                  />
                )}
                {isResult && !reduzNoDesenho && (
                  <m.span
                    aria-hidden
                    className="ml-2 self-start text-brand"
                    initial={{ opacity: 0, scale: 0, rotate: -40 }}
                    animate={{ opacity: 1, scale: [0, 1.25, 1], rotate: 0 }}
                    transition={{ duration: 0.55, delay: 0.55, ease: EASE }}
                  >
                    <Sparkle size={15} />
                  </m.span>
                )}
              </div>

              {/* A calcular — varrimento de progresso no fundo do campo */}
              {isCalculating && (
                <m.div
                  className="absolute inset-x-0 bottom-0 h-[3px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  <m.div
                    className="h-full bg-gradient-to-r from-brand/30 via-brand to-brand/30"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.6, ease: EASE }}
                  />
                </m.div>
              )}
            </div>
          </div>

          {/* Barra de proporção — âncora visual: aparece com o número e
              fica, enquanto os atos passam por cima dela. */}
          <div
            aria-hidden
            className={`mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 ${
              isResult ? "" : "animate-pulse motion-reduce:animate-none"
            }`}
          >
            {seg.map((p, i) => (
              <div
                key={i}
                className={`transition-all duration-700 ease-out ${
                  i === 0 ? "rounded-l-full" : i === seg.length - 1 ? "rounded-r-full" : ""
                } ${p.cls ?? ""}`}
                style={{
                  background: p.cls ? "currentColor" : p.color,
                  width: isResult ? `${(p.v / totalSeg) * 100}%` : "0%",
                  transitionDelay: isResult ? `${200 + i * 150}ms` : "0ms",
                }}
              />
            ))}
          </div>

          {/* ── Palco dos atos ──────────────────────────────────────
              Antes, tudo isto era revelado de uma vez em cascata: as linhas,
              a caixa, a nota e a faixa do parceiro caíam em dois segundos e
              o cartão ficava quieto quatro. Agora cada tempo tem o palco só
              para si e o cartão conta o cálculo em vez de o despejar.

              Altura mínima fixa, medida no ato mais alto: sem ela o cartão
              cresce e encolhe a cada mudança e a página estremece por baixo. */}
          <div className="mt-4 min-h-[10.5rem]">
            {!isResult ? (
              <div className="space-y-1.5" aria-hidden>
                {card.linhas.map((_, i) => (
                  <div key={i} className="flex min-h-[32px] items-center justify-between rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
                    <span className={`h-2.5 ${i === 0 ? "w-28" : i === 1 ? "w-24" : "w-32"} ${ghost}`} />
                    <span className={`h-2.5 w-12 ${ghost}`} />
                  </div>
                ))}
                <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/60 p-3 dark:border-stone-700/60 dark:bg-stone-800/40">
                  <span className="h-6 w-6 flex-shrink-0 animate-pulse rounded-full bg-stone-200/80 motion-reduce:animate-none dark:bg-stone-700" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className={`h-2.5 w-36 max-w-full ${ghost}`} />
                    <span className={`h-2 w-48 max-w-full ${ghost}`} />
                  </span>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {/* Dois níveis, de propósito: o de fora faz o cruzamento entre
                    atos (opacidade explícita), o de dentro escalona a entrada
                    das linhas (rótulos de variante). Juntar os dois num só
                    elemento deixava-o preso a `opacity: 0` — o `initial` era um
                    objeto e o `animate` um rótulo que não define opacidade, por
                    isso nunca havia para onde animar de volta. */}
                <m.div
                  key={ato}
                  initial={reduzNoDesenho ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduzNoDesenho ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2 }}
                >
                  <m.div variants={palcoVars} initial={reduzNoDesenho ? false : "oculto"} animate="entra">
                  {ato === "decomposicao" && (
                    <>
                      <TituloAto nota={card.modoLinhas === "cenarios" ? "lado a lado" : "sai do bruto"}>
                        {card.modoLinhas === "cenarios" ? "Os caminhos possíveis" : "Para onde vai"}
                      </TituloAto>
                      <div className="space-y-1.5">
                        {(card.modoLinhas === "cenarios" ? card.linhas : linhasSaida).map((r, i) => (
                          <LinhaCartao
                            key={r.l}
                            rotulo={r.l}
                            valor={r.valor}
                            // Só um desconto leva sinal de menos. Um cenário
                            // alternativo é um líquido, não uma dedução.
                            prefixo={card.modoLinhas === "deducoes" ? "− " : ""}
                            delay={i * 180}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {ato === "resultado" && (
                    <>
                      <TituloAto nota={`${pctTeu}%`}>
                        {card.modoLinhas === "cenarios" ? "O melhor caminho" : "O que fica contigo"}
                      </TituloAto>
                      <m.div variants={linhaVar} className="rounded-xl bg-brand-light px-3 py-2.5 dark:bg-brand/10">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-xs font-semibold text-brand-dark dark:text-brand">
                            {linhaTotal.l}
                          </span>
                          <span className="flex-shrink-0 text-sm font-bold tabular-nums text-brand-dark dark:text-brand">
                            <CountUp target={linhaTotal.valor} delay={0} />
                          </span>
                        </div>
                      </m.div>
                      {/* Duas linhas, não uma frase com separador: a 360px o
                          texto quebra e o «·» ficava órfão no fim da linha. */}
                      <m.div
                        variants={linhaVar}
                        className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                      >
                        <span className="block font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                          {pctTeu}% {card.pctSufixo}
                        </span>
                        <span className="mt-0.5 block text-[11px]">o resto é do Estado</span>
                      </m.div>
                    </>
                  )}

                  {ato === "contexto" && (
                    <>
                      <TituloAto>O que convém não esqueceres</TituloAto>
                      <m.div
                        variants={linhaVar}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 ${
                          card.box.tom === "alerta"
                            ? "border-alert-border bg-alert-bg"
                            : "border-brand/20 bg-brand-light"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                            card.box.tom === "alerta" ? "bg-alert text-alert-text" : "bg-brand text-white"
                          }`}
                        >
                          {card.box.tom === "alerta" ? <Warning size={12} /> : <Calendar size={12} />}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold ${card.box.tom === "alerta" ? "text-alert-text" : "text-brand-dark"}`}>
                            {card.box.titulo}
                          </div>
                          <div className={`text-xs ${card.box.tom === "alerta" ? "text-alert-text/80" : "text-brand-dark/80"}`}>
                            {card.box.sub}
                          </div>
                        </div>
                      </m.div>
                      <m.p variants={linhaVar} className="mt-2.5 text-[11px] leading-relaxed text-stone-400">
                        {card.nota}
                      </m.p>
                    </>
                  )}

                  {/* A cor da FIZ marca a fronteira: o verde acima é nosso,
                      esta faixa é do parceiro. */}
                  {ato === "fiz" && card.fiz && (
                    <>
                      <TituloAto nota="Parceiro">E depois do número</TituloAto>
                      <m.div
                        variants={linhaVar}
                        className="rounded-xl border border-fiz-200 bg-fiz-50 p-2.5 dark:border-stone-700 dark:bg-stone-800/60"
                      >
                        <div className="flex items-center gap-2.5">
                          <FizLogo size={22} className="flex-shrink-0 rounded-lg" decorativo />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                              {card.fiz.titulo}
                            </div>
                            <div className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                              {card.fiz.sub}
                            </div>
                          </div>
                        </div>
                        {/* As trancas: quem chegou ao botão — com o rato, com
                            o dedo ou com o teclado — escolheu parar. `sobrevoo`
                            pausa mas é reversível ao sair; aqui usa-se
                            `parado`, que é uma tranca, para que um movimento
                            acidental não faça o alvo saltar debaixo do cursor.
                            Retoma-se no BotaoPausa, que já existe e já é
                            acessível. */}
                        <FizActionButton
                          href={`/ir/fiz?s=demo.hero&v=compacta&i=${card.fiz.intent}`}
                          className="mt-2.5"
                          onPointerEnter={() => setParado(true)}
                          onFocus={() => setParado(true)}
                          onTouchStart={() => setParado(true)}
                        >
                          {card.fiz.cta}
                        </FizActionButton>
                      </m.div>
                      <m.p variants={linhaVar} className="mt-2 text-[11px] leading-relaxed text-stone-400">
                        {NOTA_LIGACAO}
                      </m.p>
                    </>
                  )}
                  </m.div>
                </m.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Cursor encenado + ripple de clique ─────────────────── */}
        {ripple && !reduzNoDesenho && !sobrevoo && (
          <m.span
            key={ripple.id}
            aria-hidden
            className="pointer-events-none absolute z-20 h-12 w-12 rounded-full border-2 border-brand/60"
            style={{ left: ripple.x - 24, top: ripple.y - 24 }}
            initial={{ scale: 0.15, opacity: 0.85 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
        {ponteiro && !reduzNoDesenho && !sobrevoo && (
          <m.div
            aria-hidden
            className="pointer-events-none absolute z-30"
            initial={false}
            animate={{
              left: ponteiro.x,
              top: ponteiro.y,
              opacity: fading ? 0 : ponteiro.op,
              scale: ponteiro.premido ? 0.8 : 1,
            }}
            transition={{
              left: { duration: ponteiro.dur, ease: EASE },
              top: { duration: ponteiro.dur, ease: EASE },
              opacity: { duration: 0.3 },
              scale: { duration: 0.14, ease: "easeOut" },
            }}
          >
            <CursorArrow size={21} className="drop-shadow-md" />
          </m.div>
        )}
      </div>

      {/* ── Régua dos atos ────────────────────────────────────────
          Substitui o antigo rodapé "Insere o valor / Calcula / Resultado",
          que era `aria-hidden`, não se podia clicar e só descrevia a
          encenação — deixava de fora tudo o que vem depois do número. */}
      <div
        className="mt-4"
        style={{ opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease-out` }}
      >
        <ReguaDeAtos
          atos={atosDaRegua}
          indiceAtivo={idxAto}
          barraRef={barraRef}
          estatico={reduzNoDesenho}
          onIr={irParaAto}
        />
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */

export default function Hero({
  cmp,
  recibo,
  vencimento,
}: {
  cmp: ComparacaoCategoriasResult;
  recibo: CalcResult;
  vencimento: VencimentoResult;
}) {
  const { perfil, definir } = usePerfil();
  const EXEMPLO = useMemo(
    () => criarExemplos({ CMP: cmp, REC: recibo, VENC: vencimento }),
    [cmp, recibo, vencimento],
  );
  const dados = EXEMPLO[perfil];
  const c = dados.card;
  const [comoFuncionaAberto, setComoFuncionaAberto] = useState(false);

  // Atalhos do perfil ativo — a mesma curadoria das secções (fonte única).
  const atalhoFerramenta = ferramentasPorPerfil(perfil).destaque;
  const atalhoGuia = guiasPorPerfil(perfil)[0];

  // No telemóvel os CTAs são barras de largura total, empilhadas: a 360px, dois
  // botões lado a lado davam ~150px cada e "Calcular o meu recibo" partia-se em
  // duas linhas com a seta a flutuar ao lado. A partir de `sm:` voltam à fila,
  // com a largura do seu texto.
  const btnBase = "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all sm:w-auto sm:px-6";
  const btnPrimario = `btn-shine ${btnBase} bg-brand text-white shadow-glow hover:-translate-y-0.5 hover:shadow-float`;
  const btnSecundario = `${btnBase} border border-stone-200 bg-white text-stone-700 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-stone-600 dark:hover:bg-stone-700`;

  return (
    // O `pt` contava duas vezes o mesmo espaço: o `Nav` já reserva 72px com
    // um espaçador próprio em ecrã largo, e o `pt-20` somava mais 80 por cima
    // — 152px até ao conteúdo, dos quais ~79 completamente vazios por baixo
    // da barra. No telemóvel não há espaçador nem barra no topo, e os mesmos
    // 80px ficavam a olhar para o nada. Agora: 24px no telemóvel, 32px a
    // partir de `sm:` e 40px no desktop SOMADOS ao espaçador do Nav.
    // `data-hero`: marca o primeiro ecrã para o `BotaoTopo` — é ao sair daqui
    // que o botão de voltar ao topo entra em cena.
    <section
      data-hero
      className="grain relative overflow-hidden px-6 pt-6 pb-14 sm:pt-8 lg:pt-10 lg:pb-20"
    >
      {/* Atmosfera: dois halos que seguem a composição — um por trás do cartão
          (canto superior direito), outro a apoiar o bloco de texto (em baixo, à
          esquerda). Antes o segundo estava a meia altura do lado esquerdo e
          cortava o título ao meio com uma mancha verde. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-brand/12 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-brand-mint/15 blur-3xl" />
      </div>

      {/* `items-center`: as duas colunas passaram a ter alturas próximas, e
          centrá-las uma na outra elimina o vazio que sobrava por baixo do
          cartão. `gap-y` menor do que `gap-x` — no telemóvel as colunas são
          uma pilha e 48px entre elas era um buraco. */}
      <div className="mx-auto grid max-w-5xl items-center gap-x-12 gap-y-10 lg:grid-cols-2">
        {/* Uma medida só para toda a coluna de texto. Sem ela, entre `sm:` e
            `lg:` (onde ainda não há duas colunas) cada bloco tinha o seu limite
            — seletor a 512px, título a toda a largura, subtítulo a 46ch — e o
            lado direito ficava serrilhado. A partir de `lg:` quem manda é a
            grelha. */}
        <m.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-xl lg:max-w-none"
        >
          <m.div variants={staggerItem}>
            <SeletorModo />
          </m.div>

          <m.h1 variants={staggerItem} className="mt-7 font-display display-hero text-balance font-semibold text-ink">
            {dados.h1}
          </m.h1>

          <m.p variants={staggerItem} className="mt-5 max-w-[46ch] text-base leading-relaxed text-stone-500 sm:text-lg">
            {dados.sub}
          </m.p>

          <m.div variants={staggerItem} className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {dados.primary.setModo ? (
              <button
                type="button"
                onClick={() => {
                  definir(dados.primary.setModo!);
                  scrollToId("calculadora");
                }}
                className={btnPrimario}
              >
                {dados.primary.label}
                <ArrowRight />
              </button>
            ) : dados.primary.href ? (
              <Link href={dados.primary.href} className={btnPrimario}>
                {dados.primary.label}
                <ArrowRight />
              </Link>
            ) : (
              <button type="button" onClick={() => scrollToId(dados.primary.scrollTo!)} className={btnPrimario}>
                {dados.primary.label}
                <ArrowRight />
              </button>
            )}
            {dados.secondary.modal ? (
              <button
                type="button"
                onClick={() => setComoFuncionaAberto(true)}
                aria-haspopup="dialog"
                className={btnSecundario}
              >
                {dados.secondary.label}
              </button>
            ) : dados.secondary.setModo ? (
              <button
                type="button"
                onClick={() => {
                  definir(dados.secondary.setModo!);
                  scrollToId("calculadora");
                }}
                className={btnSecundario}
              >
                {dados.secondary.label}
              </button>
            ) : dados.secondary.href ? (
              <Link href={dados.secondary.href} className={btnSecundario}>
                {dados.secondary.label}
              </Link>
            ) : (
              <button type="button" onClick={() => scrollToId(dados.secondary.scrollTo!)} className={btnSecundario}>
                {dados.secondary.label}
              </button>
            )}
          </m.div>

          {/* ── Rodapé do bloco de texto ────────────────────────────────────
              Os atalhos e os selos de confiança eram duas filas de texto solto
              a seguir aos CTAs, cada uma com o seu espaçamento — no telemóvel
              partiam-se em linhas desalinhadas e liam-se como sobras. Agora são
              um degrau próprio: uma régua a abrir, os atalhos como pastilhas
              (alvo tátil a sério, não um link de 13px) e os selos por baixo, em
              voz baixa. */}
          <m.div
            variants={staggerItem}
            className="mt-8 border-t border-stone-200/70 pt-6 dark:border-stone-800"
          >
            {/* Atalhos que se moldam ao perfil: a ferramenta certa + o guia certo */}
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`atalhos-${perfil}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Para ti
                </span>
                {[
                  { href: atalhoFerramenta.canonicalHref, Icon: iconeDe(atalhoFerramenta.icon), titulo: atalhoFerramenta.title },
                  { href: atalhoGuia.href, Icon: atalhoGuia.icon, titulo: atalhoGuia.titulo },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark hover:shadow-card dark:border-stone-700 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:text-brand"
                  >
                    <a.Icon size={13} className="flex-shrink-0 text-brand" />
                    {a.titulo}
                    <ArrowRight size={10} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                ))}
              </m.div>
            </AnimatePresence>

            <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              {TRUST.map((b) => (
                <li key={b.text} className="flex items-center gap-2">
                  <span className="flex-shrink-0 text-brand">{b.icon}</span>
                  <span className="text-xs font-medium text-stone-500">{b.text}</span>
                </li>
              ))}
            </ul>
          </m.div>
        </m.div>

        <m.div
          key={perfil}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          className="relative max-w-xl lg:max-w-none"
        >
          <HeroCard perfil={perfil} card={c} />
        </m.div>
      </div>

      <ComoFuncionaModal
        aberto={comoFuncionaAberto}
        onFechar={() => setComoFuncionaAberto(false)}
      />
    </section>
  );
}
