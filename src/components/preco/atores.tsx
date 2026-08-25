"use client";

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { ENTRADA, SAIDA, VIAGEM, DUR, arco, type Ponto } from "./coreografia";

// ═══════════════════════════════════════════════════════════════════════
//  OS ATORES DO PALCO
//  ---------------------------------------------------------------------
//  A regra do roteiro que estes dois componentes existem para cumprir:
//
//    Nada muda de valor sozinho. Um número só muda porque alguma coisa
//    lhe chegou.
//
//  A `Ficha` é a coisa que chega. O `Contador` é o número que muda por
//  causa disso — e é a `Ficha`, ao aterrar, que o manda mudar.
// ═══════════════════════════════════════════════════════════════════════

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
  imediato = false,
  inicial,
}: {
  valor: number;
  formato: (n: number) => string;
  duracao?: number;
  imediato?: boolean;
  /**
   * Donde parte à primeira montagem. É o que permite a uma ficha de fórmula
   * nascer a zero e contar até ao seu valor: sem isto, montava já feita e a
   * contagem nunca chegava a existir.
   */
  inicial?: number;
}) {
  const [mostrado, setMostrado] = useState(inicial ?? valor);
  const anterior = useRef(inicial ?? valor);
  const raf = useRef<number | undefined>(undefined);

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

    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      // A mesma cúbica de saída da curva ENTRADA: chega depressa e assenta.
      const suave = 1 - (1 - t) ** 3;
      setMostrado(de + (valor - de) * suave);
      if (t < 1) raf.current = requestAnimationFrame(passo);
      else anterior.current = valor;
    };
    raf.current = requestAnimationFrame(passo);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      anterior.current = valor;
    };
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

/**
 * A ficha: nasce numa origem medida, descreve um arco até um destino medido,
 * e ao aterrar dissolve-se — disparando, no mesmo instante, o contador do
 * destino.
 *
 * Posiciona-se em absoluto sobre o palco e é `aria-hidden`: é a FORMA de
 * dizer o que a região viva já diz por palavras.
 */
export function Ficha({
  ficha,
  aoAterrar,
}: {
  ficha: FichaEmCena;
  aoAterrar: (id: string) => void;
}) {
  const meio = arco(ficha.origem, ficha.destino);
  const dx = ficha.destino.x - ficha.origem.x;
  const dy = ficha.destino.y - ficha.origem.y;
  const duracao = (ficha.duracao ?? DUR.viagem) / 1000;

  return (
    <m.span
      aria-hidden
      className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums shadow-card ${TONS[ficha.tom]}`}
      style={{ left: ficha.origem.x, top: ficha.origem.y, translateX: "-50%", translateY: "-50%" }}
      initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
      animate={{
        // Três fases numa só declaração, com `times` a dar-lhes o peso do
        // roteiro: aparecer (0→12%), viajar (12→88%), dissolver (88→100%).
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.6],
        x: [0, 0, meio.x, dx],
        y: [0, 0, meio.y, dy],
      }}
      transition={{
        duration: duracao,
        times: [0, 0.12, 0.56, 1],
        ease: [ENTRADA, VIAGEM, SAIDA],
      }}
      onAnimationComplete={() => aoAterrar(ficha.id)}
    >
      {/* O VALOR é o que viaja. Uma pastilha vazia a atravessar o palco é
          movimento sem conteúdo — decoração, exatamente o que o §7 proíbe.
          É o `14,80 €` a sair da linha e a entrar na base que faz a soma
          ser mostrada em vez de afirmada. */}
      {ficha.rotulo}
    </m.span>
  );
}

/** O anel de impacto que fica onde uma ficha aterrou. */
export function Anel({ em, tom = "brand" }: { em: Ponto; tom?: "brand" | "areia" }) {
  return (
    <m.span
      aria-hidden
      className={`pointer-events-none absolute z-20 h-6 w-6 rounded-full border-2 ${
        tom === "brand" ? "border-brand" : "border-categoria-areia-text"
      }`}
      style={{ left: em.x, top: em.y, translateX: "-50%", translateY: "-50%" }}
      initial={{ opacity: 0.5, scale: 0.4 }}
      animate={{ opacity: 0, scale: 1.6 }}
      transition={{ duration: DUR.impacto / 1000, ease: ENTRADA }}
    />
  );
}
