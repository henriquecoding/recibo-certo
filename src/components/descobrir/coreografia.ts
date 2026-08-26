"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Curva = [number, number, number, number];

/** Chegadas e assentamentos — a curva da marca. */
export const ENTRADA: Curva = [0.16, 1, 0.3, 1];
/** Partidas e rejeições. */
export const SAIDA: Curva = [0.7, 0, 0.84, 0];
/** Percurso completo de uma ficha. */
export const VIAGEM: Curva = [0.65, 0, 0.35, 1];
/** Só para a hipótese final, que pousa e assenta. */
export const ASSENTA: Curva = [0.34, 1.42, 0.64, 1];

export const DUR = {
  micro: 160,
  entrada: 420,
  viagem: 740,
  viagemLonga: 820,
  rejeicao: 500,
  assenta: 760,
  impacto: 300,
} as const;

export interface BeatDescobrir {
  id: string;
  em: number;
}

export interface AtoDescobrir {
  id: string;
  rotulo: string;
  legenda: string;
  duracao: number;
  beats: BeatDescobrir[];
}

/**
 * A linha temporal corresponde, beat por beat, ao roteiro em
 * `docs/design/roteiro-animacao-descobrir.md`.
 */
export const ATOS_DESCOBRIR: AtoDescobrir[] = [
  {
    id: "contexto",
    rotulo: "Contexto",
    legenda: "Ler capacidades e disponibilidade sem as transformar numa identidade",
    duracao: 3000,
    beats: [
      { id: "abreEntrada", em: 0 },
      { id: "enviaCompetencia", em: 220 },
      { id: "enviaDados", em: 520 },
      { id: "enviaTempo", em: 820 },
      { id: "contextoLido", em: 2300 },
    ],
  },
  {
    id: "fronteiras",
    rotulo: "Fronteiras",
    legenda: "Eliminar padrões incompatíveis antes de ordenar o que sobra",
    duracao: 3200,
    beats: [
      { id: "abreFronteiras", em: 0 },
      { id: "enviaStock", em: 280 },
      { id: "enviaDisponibilidade", em: 680 },
      { id: "enviaEquipa", em: 1080 },
      { id: "sobrevivente", em: 2200 },
    ],
  },
  {
    id: "evidencia",
    rotulo: "Evidência",
    legenda: "Separar o que uma fonte observou do que ainda exige prova local",
    duracao: 3500,
    beats: [
      { id: "abreEvidencia", em: 0 },
      { id: "enviaFonte", em: 260 },
      { id: "abreLacunas", em: 1260 },
      { id: "enviaProva", em: 1900 },
    ],
  },
  {
    id: "hipotese",
    rotulo: "Hipótese",
    legenda: "Compor uma hipótese com primeiro teste e critério para a rejeitar",
    duracao: 4100,
    beats: [
      { id: "preparaHipotese", em: 0 },
      { id: "enviaHipotese", em: 360 },
      { id: "mostraModelo", em: 1720 },
      { id: "mostraTeste", em: 2160 },
      { id: "mostraCriterio", em: 2780 },
      { id: "conclui", em: 3500 },
    ],
  },
];

export const ULTIMO_ATO_DESCOBRIR = ATOS_DESCOBRIR.length - 1;

export interface CoreografiaDescobrir {
  feito: (id: string) => boolean;
  barraRef: React.RefObject<HTMLSpanElement | null>;
}

/**
 * Um só relógio conduz os beats e a barra. O tempo decorrido vive num ref para
 * que pausar e retomar continue exatamente no mesmo ponto, em vez de reiniciar
 * o ato ou de deixar a barra separar-se da cena.
 */
export function useCoreografiaDescobrir({
  ato,
  ciclo,
  parado,
  estatico,
  aoTerminarAto,
}: {
  ato: number;
  ciclo: number;
  parado: boolean;
  estatico: boolean;
  aoTerminarAto: () => void;
}): CoreografiaDescobrir {
  const [feitos, setFeitos] = useState<ReadonlySet<string>>(new Set());
  const feitosRef = useRef<ReadonlySet<string>>(new Set());
  const decorridoRef = useRef(0);
  const barraRef = useRef<HTMLSpanElement>(null);
  const terminarRef = useRef(aoTerminarAto);
  terminarRef.current = aoTerminarAto;

  const chave = `${ciclo}-${ato}`;

  useEffect(() => {
    const vazios = new Set<string>();
    feitosRef.current = vazios;
    setFeitos(vazios);
    decorridoRef.current = 0;
    if (barraRef.current) barraRef.current.style.transform = "scaleX(0)";
  }, [chave]);

  useEffect(() => {
    if (estatico || parado) return;
    const definicao = ATOS_DESCOBRIR[ato];
    if (!definicao) return;

    let raf = 0;
    let ultimo = performance.now();

    const passo = (agora: number) => {
      decorridoRef.current = Math.min(
        definicao.duracao,
        decorridoRef.current + (agora - ultimo),
      );
      ultimo = agora;

      if (barraRef.current) {
        barraRef.current.style.transform = `scaleX(${decorridoRef.current / definicao.duracao})`;
      }

      const chegados = definicao.beats
        .filter(
          (beat) =>
            beat.em <= decorridoRef.current && !feitosRef.current.has(beat.id),
        )
        .map((beat) => beat.id);

      if (chegados.length > 0) {
        const seguintes = new Set([...feitosRef.current, ...chegados]);
        feitosRef.current = seguintes;
        setFeitos(seguintes);
      }

      if (decorridoRef.current >= definicao.duracao) {
        terminarRef.current();
        return;
      }

      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [ato, chave, estatico, parado]);

  const feito = useCallback(
    (id: string) => estatico || feitos.has(id),
    [estatico, feitos],
  );

  return { feito, barraRef };
}

export interface Ponto {
  x: number;
  y: number;
}

/** Centro de um elemento em coordenadas do palco. */
export function medir(alvo: Element | null, palco: Element | null): Ponto | null {
  if (!alvo || !palco) return null;
  const a = alvo.getBoundingClientRect();
  const p = palco.getBoundingClientRect();
  if (a.width === 0 && a.height === 0) return null;
  return {
    x: a.left - p.left + a.width / 2,
    y: a.top - p.top + a.height / 2,
  };
}

/** Ponto de controlo relativo para uma Bézier quadrática discreta. */
export function arco(origem: Ponto, destino: Ponto): Ponto {
  const dx = destino.x - origem.x;
  const dy = destino.y - origem.y;
  const distancia = Math.hypot(dx, dy) || 1;
  const desvio = distancia * 0.16;
  return {
    x: dx / 2 + (-dy / distancia) * desvio,
    y: dy / 2 + (dx / distancia) * desvio,
  };
}

/** Avalia `y` em função de `x`, tal como uma curva CSS. */
export function bezier([x1, y1, x2, y2]: Curva): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const emX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const emY = (t: number) => ((ay * t + by) * t + cy) * t;
  const derivadaX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const erro = emX(t) - x;
      if (Math.abs(erro) < 1e-6) break;
      const derivada = derivadaX(t);
      if (Math.abs(derivada) < 1e-6) break;
      t -= erro / derivada;
    }
    return emY(t);
  };
}

export const entre = (de: number, para: number, t: number) => de + (para - de) * t;

