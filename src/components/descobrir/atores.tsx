"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { m } from "motion/react";
import {
  DUR,
  ENTRADA,
  SAIDA,
  VIAGEM,
  arco,
  bezier,
  entre,
  type Ponto,
} from "./coreografia";

/** Pausar o palco suspende também todas as fichas que já estão no ar. */
export const EstadoPalcoDescobrir = createContext({ parado: false });

export type TomFichaDescobrir =
  | "contexto"
  | "fronteira"
  | "fonte"
  | "prova"
  | "hipotese";

const TONS: Record<TomFichaDescobrir, string> = {
  contexto:
    "border-brand-mint/70 bg-[#dff7ef] text-brand-deep shadow-[0_8px_28px_rgba(4,36,28,.24)]",
  fronteira:
    "border-[#e7c98e]/80 bg-[#fff3cf] text-[#6b4e13] shadow-[0_8px_28px_rgba(4,36,28,.24)]",
  fonte:
    "border-[#9fc8e7]/80 bg-[#eaf5fd] text-[#21597e] shadow-[0_8px_28px_rgba(4,36,28,.24)]",
  prova:
    "border-clay-border bg-clay-bg text-clay-text shadow-[0_8px_28px_rgba(4,36,28,.24)]",
  hipotese:
    "border-brand bg-brand text-white shadow-[0_12px_36px_rgba(23,126,94,.38)]",
};

export interface FichaDescobrirEmCena {
  id: string;
  origem: Ponto;
  destino: Ponto;
  rotulo: string;
  tom: TomFichaDescobrir;
  duracao?: number;
}

const NASCE_ATE = 0.12;
const CHEGA_EM = 0.88;

/**
 * Uma ficha semântica que nasce numa origem medida, percorre um arco e só no
 * impacto altera o destino. O relógio próprio é o que torna a pausa real.
 */
export function FichaDescobrir({
  ficha,
  aoChegar,
  aoSair,
}: {
  ficha: FichaDescobrirEmCena;
  aoChegar: (ficha: FichaDescobrirEmCena) => void;
  aoSair: (id: string) => void;
}) {
  const { parado } = useContext(EstadoPalcoDescobrir);
  const noRef = useRef<HTMLSpanElement>(null);
  const paradoRef = useRef(parado);
  paradoRef.current = parado;
  const chegarRef = useRef(aoChegar);
  chegarRef.current = aoChegar;
  const sairRef = useRef(aoSair);
  sairRef.current = aoSair;

  useEffect(() => {
    const duracao = ficha.duracao ?? DUR.viagem;
    const controlo = arco(ficha.origem, ficha.destino);
    const dx = ficha.destino.x - ficha.origem.x;
    const dy = ficha.destino.y - ficha.origem.y;
    const curvaEntrada = bezier(ENTRADA);
    const curvaViagem = bezier(VIAGEM);
    const curvaSaida = bezier(SAIDA);

    let raf = 0;
    let decorrido = 0;
    let ultimo = performance.now();
    let chegou = false;

    const pintar = (progresso: number) => {
      const no = noRef.current;
      if (!no) return;

      let x = 0;
      let y = 0;
      let opacidade = 1;
      let escala = 1;

      if (progresso < NASCE_ATE) {
        const fase = curvaEntrada(progresso / NASCE_ATE);
        opacidade = fase;
        escala = entre(0.82, 1, fase);
      } else if (progresso < CHEGA_EM) {
        const fase = curvaViagem(
          (progresso - NASCE_ATE) / (CHEGA_EM - NASCE_ATE),
        );
        const inverso = 1 - fase;
        x = 2 * inverso * fase * controlo.x + fase * fase * dx;
        y = 2 * inverso * fase * controlo.y + fase * fase * dy;
      } else {
        const fase = curvaSaida((progresso - CHEGA_EM) / (1 - CHEGA_EM));
        x = dx;
        y = dy;
        opacidade = 1 - fase;
        escala = entre(1, 0.62, fase);
      }

      no.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${escala})`;
      no.style.opacity = String(opacidade);
    };

    pintar(0);

    const passo = (agora: number) => {
      if (!paradoRef.current) decorrido += agora - ultimo;
      ultimo = agora;
      const progresso = Math.min(1, decorrido / duracao);
      pintar(progresso);

      if (!chegou && progresso >= CHEGA_EM) {
        chegou = true;
        chegarRef.current(ficha);
      }

      if (progresso >= 1) {
        sairRef.current(ficha.id);
        return;
      }

      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [ficha]);

  return (
    <span
      ref={noRef}
      aria-hidden
      className={`pointer-events-none absolute z-30 max-w-[9.5rem] truncate whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[-.01em] ${TONS[ficha.tom]}`}
      style={{ left: ficha.origem.x, top: ficha.origem.y, opacity: 0 }}
    >
      {ficha.rotulo}
    </span>
  );
}

export function AnelImpactoDescobrir({ em, tom }: { em: Ponto; tom: TomFichaDescobrir }) {
  const cor =
    tom === "fronteira"
      ? "border-[#e7c98e]"
      : tom === "fonte"
        ? "border-[#8fc1e4]"
        : tom === "prova"
          ? "border-clay-border"
          : "border-brand-mint";

  return (
    <m.span
      aria-hidden
      className={`pointer-events-none absolute z-20 h-6 w-6 rounded-full border-2 ${cor}`}
      style={{ left: em.x, top: em.y, translateX: "-50%", translateY: "-50%" }}
      initial={{ opacity: 0.62, scale: 0.38 }}
      animate={{ opacity: 0, scale: 1.75 }}
      transition={{ duration: DUR.impacto / 1000, ease: ENTRADA }}
    />
  );
}

