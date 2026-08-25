"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════
//  A MAQUINARIA DA COREOGRAFIA DO PALCO DO PREÇO
//  ---------------------------------------------------------------------
//  Os tempos e as curvas daqui são os de `docs/design/roteiro-animacao-preco.md`.
//  Esse documento é a fonte de verdade; este ficheiro é a sua execução, e
//  `coreografia.test.ts` verifica que os dois não divergem.
//
//  Aqui vive UMA decisão que vale a pena explicar antes do código:
//
//  ── Porque é que os beats não são `setTimeout` ────────────────────────
//
//  Porque a demonstração pode ser pausada, e uma cadeia de temporizadores
//  não sabe o que é uma pausa. Suspender e retomar dez `setTimeout` com o
//  tempo restante de cada um é possível, e é exatamente o tipo de código
//  que fica dessincronizado ao segundo bug.
//
//  Em vez disso há UM relógio por ato — o mesmo padrão que
//  `simulador/palco.tsx` já usa para a barra de progresso: um
//  `requestAnimationFrame` acumula tempo decorrido enquanto não está
//  parado, e dispara os beats cujo instante já passou. Pausar é deixar de
//  acumular. Não há nada para ressincronizar porque nunca houve dois
//  relógios.
// ═══════════════════════════════════════════════════════════════════════

// ── Curvas ─────────────────────────────────────────────────────────────
//  Cada uma existe para um tipo de acontecimento, e trocá-las estraga o
//  significado: `ASSENTA` passa do alvo e volta, o que num fade produz o
//  efeito elástico barato que o roteiro proíbe.

/**
 * Uma curva de Bézier como o `motion` a quer: uma tupla de quatro, e não
 * `number[]`. A diferença é o que impede um `as unknown as` em cada
 * `transition` — e um `as unknown as` num tipo de animação é exatamente
 * onde uma curva errada passaria despercebida.
 */
export type Curva = [number, number, number, number];

/** Chegadas, aparições, assentamentos. É o `EASE` da marca. */
export const ENTRADA: Curva = [0.16, 1, 0.3, 1];
/** Partidas. Acelera: uma coisa que parte tem de parecer puxada. */
export const SAIDA: Curva = [0.7, 0, 0.84, 0];
/** O trajeto de uma ficha. Simétrica — acelera a sair, trava a chegar. */
export const VIAGEM: Curva = [0.65, 0, 0.35, 1];
/** Passa do alvo e volta. Só para coisas que POUSAM. */
export const ASSENTA: Curva = [0.34, 1.56, 0.64, 1];

// ── Durações (ms) ──────────────────────────────────────────────────────
export const DUR = {
  micro: 160,
  entrada: 420,
  viagem: 640,
  viagemLonga: 760,
  contaParcela: 380,
  contaPreco: 980,
  desenrolar: 700,
  assenta: 340,
  impacto: 280,
} as const;

// ── A linha temporal ───────────────────────────────────────────────────

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

export const ATOS: Ato[] = [
  {
    id: "custos",
    rotulo: "Custos",
    legenda: "Reunir o que a unidade custa",
    duracao: 2200,
    beats: [
      { id: "regua", em: 0 },
      { id: "materiais", em: 120 },
      { id: "trabalho", em: 300 },
      { id: "fixos", em: 480 },
      { id: "pegas", em: 900 },
    ],
  },
  {
    id: "base",
    rotulo: "Base",
    legenda: "Somar a base de custos",
    duracao: 2400,
    beats: [
      { id: "cartao", em: 0 },
      { id: "fichaA", em: 180 },
      { id: "fichaB", em: 400 },
      { id: "fichaC", em: 620 },
      // As aterragens não são beats: acontecem quando a ficha chega, e é a
      // chegada que faz o contador andar. Um beat de aterragem seria um
      // segundo relógio a dizer o que o primeiro já sabe — e a primeira
      // oportunidade para os dois discordarem.
      { id: "assenta", em: 1560 },
      { id: "parcelas", em: 1700 },
    ],
  },
  {
    id: "impostos",
    rotulo: "Markup e IVA",
    legenda: "Aplicar markup e IVA",
    duracao: 2600,
    beats: [
      { id: "acordaMarkup", em: 0 },
      { id: "chipMargem", em: 260 },
      // ── silêncio de 380 ms ──
      { id: "chipRetencao", em: 1280 },
      { id: "chipIVA", em: 1500 },
      { id: "estado", em: 2120 },
    ],
  },
  {
    id: "preco",
    rotulo: "Preço",
    legenda: "Fixar o preço recomendado",
    duracao: 3400,
    beats: [
      { id: "handoff", em: 0 },
      { id: "chega", em: 880 },
      // ── silêncio de 260 ms ──
      { id: "contaPreco", em: 1140 },
      { id: "regua", em: 1300 },
      { id: "zonas", em: 1440 },
      { id: "marcadorCai", em: 1700 },
      { id: "marcadorViaja", em: 1980 },
      { id: "barra", em: 2700 },
      { id: "resolve", em: 3300 },
    ],
  },
];

export const ULTIMO_ATO = ATOS.length - 1;

// ── O relógio dos beats ────────────────────────────────────────────────

export interface Coreografia {
  /** Já aconteceu, neste ato? */
  feito: (id: string) => boolean;
  /** Marca o ato inteiro como cumprido — para saltar direto ao resultado. */
  cumprirAto: () => void;
  /** Progresso 0–1 do ato, escrito no DOM por `ref` (não em estado). */
  barraRef: React.RefObject<HTMLSpanElement | null>;
}

export function useCoreografia({
  ato,
  ciclo,
  parado,
  estatico,
  aoTerminarAto,
}: {
  ato: number;
  /** Muda → o ato recomeça do princípio. */
  ciclo: number;
  parado: boolean;
  /** Movimento reduzido: tudo já aconteceu, nada corre. */
  estatico: boolean;
  aoTerminarAto: () => void;
}): Coreografia {
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
    const definicao = ATOS[ato];
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
        // Já estão em estado; não voltam a disparar neste ciclo de rAF.
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
  }, [chave, parado, estatico, ato]);

  const feito = useCallback(
    (id: string) => estatico || cumprido || feitos.has(id),
    [estatico, cumprido, feitos],
  );

  const cumprirAto = useCallback(() => setCumprido(true), []);

  return { feito, cumprirAto, barraRef };
}

// ── Medição ────────────────────────────────────────────────────────────

export interface Ponto {
  x: number;
  y: number;
}

/**
 * O centro de `alvo`, em coordenadas do `palco`.
 *
 * É medido em tempo de execução, e não pré-calculado, porque é isto que faz
 * o roteiro funcionar em qualquer disposição: no telemóvel as colunas
 * empilham e as fichas passam a viajar na vertical sem uma linha de código
 * a saber que existe um telemóvel.
 */
export function medir(alvo: Element | null, palco: Element | null): Ponto | null {
  if (!alvo || !palco) return null;
  const a = alvo.getBoundingClientRect();
  const p = palco.getBoundingClientRect();
  if (a.width === 0 && a.height === 0) return null;
  return { x: a.left - p.left + a.width / 2, y: a.top - p.top + a.height / 2 };
}

/**
 * O ponto de controlo do arco, a 18% da perpendicular.
 *
 * Uma linha reta entre dois pontos lê-se como teletransporte; um arco lê-se
 * como trajetória. Mais do que 18% e passa a maneirismo.
 */
export function arco(origem: Ponto, destino: Ponto): Ponto {
  const dx = destino.x - origem.x;
  const dy = destino.y - origem.y;
  const dist = Math.hypot(dx, dy) || 1;
  const desvio = dist * 0.18;
  return {
    x: dx / 2 + (-dy / dist) * desvio,
    y: dy / 2 + (dx / dist) * desvio,
  };
}
