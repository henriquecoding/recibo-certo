"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import {
  ENTRADA,
  SAIDA,
  VIAGEM,
  DUR,
  arco,
  bezier,
  entre,
  type Ponto,
} from "./coreografia";

// ═══════════════════════════════════════════════════════════════════════
//  OS ATORES DO PALCO
//  ---------------------------------------------------------------------
//  A regra do roteiro que estes componentes existem para cumprir:
//
//    Nada muda de valor sozinho. Um número só muda porque alguma coisa
//    lhe chegou.
//
//  A `Ficha` é a coisa que chega. O `Contador` é o número que muda por
//  causa disso — e é a `Ficha`, ao chegar, que o manda mudar.
//
//  ── Porque é que a ficha não usa o `motion` ──────────────────────────
//
//  Porque o `motion` não sabe o que é a nossa pausa. Uma auditoria em
//  runtime apanhou-o: com a demonstração pausada a meio do ato da base, as
//  fichas continuavam a voar e a aterrar — a pausa parava o relógio dos
//  beats e mais nada. Além de ser um defeito de qualidade, é o WCAG 2.2.2
//  a não ser cumprido: conteúdo em movimento tem de poder ser parado.
//
//  A ficha passou a ter relógio próprio, com o mesmo desenho do relógio
//  dos atos: um `requestAnimationFrame` que só acumula tempo enquanto não
//  está parado. Pausar é deixar de acumular. Não há nada para
//  ressincronizar porque não há dois relógios.
// ═══════════════════════════════════════════════════════════════════════

/**
 * O estado do palco que os atores precisam de conhecer.
 *
 * Em contexto e não em `props` porque `imediato` e `parado` são condições
 * do PALCO, não de cada número: passá-los à mão a catorze contadores era
 * catorze sítios para um deles ficar para trás.
 */
export const PalcoPreco = createContext<{ parado: boolean; imediato: boolean }>({
  parado: false,
  imediato: false,
});

/**
 * Um número que anda até ao valor novo em vez de saltar para ele.
 *
 * ⚠️ `imediato` não é uma otimização — é uma regra de interação. Durante um
 * arrasto o dedo é a autoridade, e interpolar 380 ms entre o que o dedo faz
 * e o que o ecrã mostra lê-se como atraso, não como suavidade.
 */
export function Contador({
  valor,
  formato,
  duracao = DUR.contaParcela,
  inicial,
}: {
  valor: number;
  formato: (n: number) => string;
  duracao?: number;
  /**
   * Donde parte à primeira montagem. É o que permite a uma ficha de fórmula
   * nascer a zero e contar até ao seu valor: sem isto, montava já feita e a
   * contagem nunca chegava a existir.
   */
  inicial?: number;
}) {
  const { parado, imediato } = useContext(PalcoPreco);
  const [mostrado, setMostrado] = useState(inicial ?? valor);
  const anterior = useRef(inicial ?? valor);
  const paradoRef = useRef(parado);
  paradoRef.current = parado;
  /** O último valor DESENHADO. É daqui que a contagem seguinte parte. */
  const mostradoRef = useRef(mostrado);
  mostradoRef.current = mostrado;

  useEffect(() => {
    const reduzido =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const de = anterior.current;
    if (imediato || reduzido || de === valor || duracao <= 0) {
      anterior.current = valor;
      setMostrado(valor);
      return;
    }

    let raf = 0;
    let decorrido = 0;
    let ultimo = performance.now();
    const curva = bezier(ENTRADA);

    const passo = (agora: number) => {
      if (!paradoRef.current) decorrido += agora - ultimo;
      ultimo = agora;
      const t = Math.min(1, decorrido / duracao);
      setMostrado(entre(de, valor, curva(t)));
      if (t < 1) raf = requestAnimationFrame(passo);
      else anterior.current = valor;
    };
    raf = requestAnimationFrame(passo);

    return () => {
      cancelAnimationFrame(raf);
      // ⚠️ NÃO se escreve `anterior.current = valor` aqui.
      //
      // A limpeza corre quando o valor muda a meio de uma contagem — o que
      // acontece a cada pixel de um arrasto. Marcar o alvo como «já lá
      // chegámos» fazia a contagem seguinte partir de um número que não
      // estava no ecrã, e o resultado era um salto visível. O ponto de
      // partida certo é o último valor DESENHADO.
      anterior.current = mostradoRef.current;
    };
    // `mostrado` é lido por ref na limpeza, de propósito: pô-lo nas
    // dependências reiniciava a animação a cada frame que ela própria pinta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, duracao, imediato]);

  return <>{formato(mostrado)}</>;
}

export type TomDaFicha = "custo" | "margem" | "retencao" | "iva" | "total";

const TONS: Record<TomDaFicha, string> = {
  custo: "border-stone-300 bg-white text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100",
  margem: "border-brand/40 bg-brand-light text-brand-dark dark:bg-brand/25 dark:text-brand-mint",
  retencao: "border-clay-border bg-clay-bg text-clay-text",
  iva: "border-categoria-areia-border bg-categoria-areia-bg text-categoria-areia-text dark:border-stone-600 dark:bg-stone-800 dark:text-[#e7c98e]",
  total: "border-brand bg-brand text-white",
};

export interface FichaEmCena {
  id: string;
  origem: Ponto;
  destino: Ponto;
  rotulo: string;
  tom: TomDaFicha;
  duracao?: number;
}

/** As três fases da ficha, em fração do percurso total. Ver o roteiro §2.1. */
const NASCER_ATE = 0.12;
const CHEGA_EM = 0.88;

/**
 * A ficha: nasce numa origem medida, descreve um arco até um destino medido,
 * e ao CHEGAR dispara o contador do destino — antes de se dissolver.
 *
 * O disparo é aos 88%, quando encosta, e não aos 100%, quando acaba de
 * desaparecer: o número tem de mudar no instante em que a coisa lá chega,
 * ou a causa deixa de se ver ligada ao efeito.
 *
 * `aria-hidden`: é a FORMA de dizer o que a região viva já diz por palavras.
 */
export function Ficha({
  ficha,
  aoChegar,
  aoSair,
}: {
  ficha: FichaEmCena;
  aoChegar: (id: string) => void;
  aoSair: (id: string) => void;
}) {
  const { parado } = useContext(PalcoPreco);
  const ref = useRef<HTMLSpanElement>(null);
  const paradoRef = useRef(parado);
  paradoRef.current = parado;
  const aoChegarRef = useRef(aoChegar);
  aoChegarRef.current = aoChegar;
  const aoSairRef = useRef(aoSair);
  aoSairRef.current = aoSair;

  useEffect(() => {
    const duracao = ficha.duracao ?? DUR.viagem;
    const meio = arco(ficha.origem, ficha.destino);
    const dx = ficha.destino.x - ficha.origem.x;
    const dy = ficha.destino.y - ficha.origem.y;
    const cNascer = bezier(ENTRADA);
    const cViagem = bezier(VIAGEM);
    const cSair = bezier(SAIDA);

    let raf = 0;
    let decorrido = 0;
    let ultimo = performance.now();
    let chegou = false;

    const pintar = (t: number) => {
      const no = ref.current;
      if (!no) return;

      let x = 0;
      let y = 0;
      let opacidade = 1;
      let escala = 1;

      if (t < NASCER_ATE) {
        const f = cNascer(t / NASCER_ATE);
        opacidade = f;
        escala = entre(0.8, 1, f);
      } else if (t < CHEGA_EM) {
        // Bézier quadrática: um arco a sério, e não três segmentos retos
        // disfarçados. Uma reta entre dois pontos lê-se como teletransporte.
        const f = cViagem((t - NASCER_ATE) / (CHEGA_EM - NASCER_ATE));
        const u = 1 - f;
        x = 2 * u * f * meio.x + f * f * dx;
        y = 2 * u * f * meio.y + f * f * dy;
      } else {
        const f = cSair((t - CHEGA_EM) / (1 - CHEGA_EM));
        x = dx;
        y = dy;
        opacidade = 1 - f;
        escala = entre(1, 0.6, f);
      }

      no.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${escala})`;
      no.style.opacity = String(opacidade);
    };

    pintar(0);

    const passo = (agora: number) => {
      if (!paradoRef.current) decorrido += agora - ultimo;
      ultimo = agora;
      const t = Math.min(1, decorrido / duracao);
      pintar(t);

      if (!chegou && t >= CHEGA_EM) {
        chegou = true;
        aoChegarRef.current(ficha.id);
      }
      if (t >= 1) {
        aoSairRef.current(ficha.id);
        return;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
    // A ficha é imutável depois de nascer: o valor com que partiu é o valor
    // que entrega. Relançá-la a meio do voo com outro seria mudar a pergunta
    // depois de dada a resposta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficha.id]);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums shadow-card ${TONS[ficha.tom]}`}
      style={{ left: ficha.origem.x, top: ficha.origem.y, opacity: 0 }}
    >
      {/* O VALOR é o que viaja. Uma pastilha vazia a atravessar o palco é
          movimento sem conteúdo — decoração, exatamente o que o §7 proíbe.
          É o `14,80 €` a sair da linha e a entrar na base que faz a soma ser
          mostrada em vez de afirmada. */}
      {ficha.rotulo}
    </span>
  );
}

/** O anel de impacto que fica onde uma ficha chegou. */
export function Anel({ em }: { em: Ponto }) {
  return (
    <m.span
      aria-hidden
      className="pointer-events-none absolute z-20 h-6 w-6 rounded-full border-2 border-brand"
      style={{ left: em.x, top: em.y, translateX: "-50%", translateY: "-50%" }}
      initial={{ opacity: 0.5, scale: 0.4 }}
      animate={{ opacity: 0, scale: 1.6 }}
      transition={{ duration: DUR.impacto / 1000, ease: ENTRADA }}
    />
  );
}
