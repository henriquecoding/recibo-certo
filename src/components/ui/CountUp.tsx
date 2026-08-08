"use client";

import { useCallback, useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";

// ─────────────────────────────────────────────────────────────────────
//  Conta de 0 até `value` quando entra no viewport.
//
//  A versão anterior renderizava uma MotionValue como filho do span. Isso
//  significava que o HTML servido continha "0": o valor só passava a
//  existir depois de o JavaScript correr e o elemento entrar no ecrã.
//
//  O §3.4 do relatório estratégico apanhou o efeito numa extração estática
//  da homepage — «contadores a zero» — e o impacto é maior do que parece.
//  Estes números são a prova social do site («167 guias fiscais», «1.600
//  perguntas»), e quem os lia como zero era: os motores de busca, os
//  rastreadores de IA que o §10 quer que nos citem, os leitores de ecrã
//  que anunciam o conteúdo antes da animação, e qualquer pessoa com o
//  JavaScript a falhar. Ou seja: exatamente o público que a prova social
//  existe para convencer via HTML.
//
//  Agora o valor final está no HTML desde o primeiro byte e a animação é
//  só isso — uma animação. Escreve por cima do texto de forma imperativa,
//  em vez de o produzir. É a regra do §9.2: «conteúdo essencial e prova
//  social renderizados no servidor; JavaScript apenas para interação
//  progressiva.»
// ─────────────────────────────────────────────────────────────────────

export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1300,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  const formatar = useCallback(
    (v: number) => {
      const n = new Intl.NumberFormat("pt-PT", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v);
      return `${prefix}${n}${suffix}`;
    },
    [decimals, prefix, suffix],
  );

  useEffect(() => {
    const no = ref.current;
    // Sem movimento reduzido e fora de vista não há nada a fazer: o texto
    // correto já está no elemento desde a renderização no servidor.
    if (!no || !inView || reduce) return;

    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: EASE,
      onUpdate: (v) => {
        no.textContent = formatar(v);
      },
      onComplete: () => {
        no.textContent = formatar(value);
      },
    });
    return () => {
      controls.stop();
      no.textContent = formatar(value);
    };
  }, [inView, value, reduce, durationMs, formatar]);

  return (
    <span ref={ref} className={className}>
      {formatar(value)}
    </span>
  );
}
