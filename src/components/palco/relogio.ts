"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════
//  O RELÓGIO DOS ATOS — um só, para todos os palcos
//  ---------------------------------------------------------------------
//  ── Porque é que os beats não são `setTimeout` ────────────────────────
//
//  Porque uma demonstração pode ser pausada, e uma cadeia de temporizadores
//  não sabe o que é uma pausa. Suspender e retomar dez `setTimeout` com o
//  tempo restante de cada um é possível, e é exatamente o tipo de código
//  que fica dessincronizado ao segundo bug.
//
//  Em vez disso há UM relógio por ato: um `requestAnimationFrame` acumula
//  tempo decorrido enquanto não está parado, e dispara os beats cujo
//  instante já passou. Pausar é deixar de acumular. Não há nada para
//  ressincronizar porque nunca houve dois relógios.
//
//  A mesma decisão vale para as fichas (`atores.tsx`), e é o que torna a
//  pausa REAL em vez de decorativa — WCAG 2.2.2.
// ═══════════════════════════════════════════════════════════════════════

export interface Beat {
  id: string;
  /** ms desde o início do ato. */
  em: number;
}

export interface Ato {
  id: string;
  /** Curto — cabe por baixo da barra da régua de atos. */
  rotulo: string;
  /** Frase inteira, para o leitor de ecrã. */
  legenda: string;
  duracao: number;
  beats: Beat[];
}

export interface Relogio {
  /** Já aconteceu, neste ato? */
  feito: (id: string) => boolean;
  /** Marca o ato inteiro como cumprido — para saltar direto ao resultado. */
  cumprirAto: () => void;
  /** Progresso 0–1 do ato, escrito no DOM por `ref` (não em estado). */
  barraRef: React.RefObject<HTMLSpanElement | null>;
}

export function useRelogioDeAtos({
  atos,
  ato,
  ciclo,
  parado,
  estatico,
  aoTerminarAto,
}: {
  atos: readonly Ato[];
  ato: number;
  /** Muda → o ato recomeça do princípio. */
  ciclo: number;
  parado: boolean;
  /** Movimento reduzido: tudo já aconteceu, nada corre. */
  estatico: boolean;
  aoTerminarAto: () => void;
}): Relogio {
  const [feitos, setFeitos] = useState<ReadonlySet<string>>(new Set());
  const [cumprido, setCumprido] = useState(false);
  const barraRef = useRef<HTMLSpanElement>(null);

  // O callback vive num ref para que uma identidade nova não reinicie o
  // relógio a meio do ato.
  const terminarRef = useRef(aoTerminarAto);
  terminarRef.current = aoTerminarAto;

  const chave = `${ciclo}-${ato}`;

  useEffect(() => {
    setFeitos(new Set());
    setCumprido(false);
    if (barraRef.current) barraRef.current.style.transform = "scaleX(0)";
  }, [chave]);

  useEffect(() => {
    if (estatico || parado) return;
    const definicao = atos[ato];
    if (!definicao) return;

    let raf = 0;
    let decorrido = 0;
    let ultimo = performance.now();
    const porDisparar = definicao.beats.filter((b) => !feitos.has(b.id));

    const passo = (agora: number) => {
      decorrido += agora - ultimo;
      ultimo = agora;

      if (barraRef.current) {
        barraRef.current.style.transform = `scaleX(${Math.min(1, decorrido / definicao.duracao)})`;
      }

      const chegados = porDisparar.filter((b) => b.em <= decorrido).map((b) => b.id);
      if (chegados.length > 0) {
        setFeitos((atuais) => new Set([...atuais, ...chegados]));
        for (const id of chegados) {
          const i = porDisparar.findIndex((b) => b.id === id);
          if (i >= 0) porDisparar.splice(i, 1);
        }
      }

      if (decorrido >= definicao.duracao) {
        terminarRef.current();
        return;
      }
      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
    // `feitos` de propósito fora das dependências: entra na leitura inicial
    // para o retomar não repetir beats, mas incluí-lo reiniciaria o relógio
    // a cada beat disparado — que é precisamente o defeito que este desenho
    // existe para não ter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, parado, estatico, ato, atos]);

  const feito = useCallback(
    (id: string) => estatico || cumprido || feitos.has(id),
    [estatico, cumprido, feitos],
  );

  const cumprirAto = useCallback(() => setCumprido(true), []);

  return { feito, cumprirAto, barraRef };
}
