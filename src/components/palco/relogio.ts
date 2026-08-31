"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RelogioDeCena } from "./frame";

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
//  Em vez disso há UM relógio por cena: este consumidor acumula o `delta`
//  partilhado enquanto não está parado, e dispara os beats cujo
//  instante já passou. Pausar é deixar de acumular. Não há nada para
//  ressincronizar porque nunca houve dois relógios.
//
//  O mesmo relógio serve as fichas (`atores.tsx`), e é o que torna a
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
  estatico,
  relogioDeCena,
  aoTerminarAto,
}: {
  atos: readonly Ato[];
  ato: number;
  /** Muda → o ato recomeça do princípio. */
  ciclo: number;
  /** Movimento reduzido: tudo já aconteceu, nada corre. */
  estatico: boolean;
  /** A única fonte de frames da cena, partilhada com todos os atores. */
  relogioDeCena: RelogioDeCena;
  aoTerminarAto: () => void;
}): Relogio {
  const [feitos, setFeitos] = useState<ReadonlySet<string>>(new Set());
  const [cumprido, setCumprido] = useState(false);
  const barraRef = useRef<HTMLSpanElement>(null);
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ O ESPELHO SÍNCRONO DE `feitos`, E PORQUE É QUE ELE TEM DE EXISTIR │
  // │                                                                   │
  // │ O relógio filtrava os beats por disparar contra o ESTADO          │
  // │ `feitos`, e o estado é assíncrono. Reiniciar um ato a meio        │
  // │ (carregar em «Recomeçar», ou saltar para um passo na régua)       │
  // │ mudava a chave: o efeito de reposição pedia `setFeitos(new Set())`│
  // │ e o efeito do relógio, no MESMO commit, ainda lia o conjunto      │
  // │ antigo. Os beats que já tinham disparado ficavam de fora de       │
  // │ `porDisparar` — e como o estado a seguir era limpo, nunca mais    │
  // │ disparavam. Ficavam mortos até ao fim do ato.                     │
  // │                                                                   │
  // │ Foi assim que o ponteiro do palco dos recibos nunca entrou em     │
  // │ cena: `d1` disparava e `ponteiroEntra`, 1 420 ms ANTES, não.      │
  // │ Media-se a olho como «cheio de bugs» e era um só, aqui.           │
  // │                                                                   │
  // │ O espelho é escrito no mesmo instante em que o beat dispara, e o  │
  // │ efeito de reposição limpa-o antes de o relógio arrancar — porque  │
  // │ os efeitos correm pela ordem em que são declarados.               │
  // └───────────────────────────────────────────────────────────────────┘
  const feitosRef = useRef<Set<string>>(new Set());

  // O callback vive num ref para que uma identidade nova não reinicie o
  // relógio a meio do ato.
  const terminarRef = useRef(aoTerminarAto);
  terminarRef.current = aoTerminarAto;

  const chave = `${ciclo}-${ato}`;

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ COM MOVIMENTO REDUZIDO A BARRA NÃO SE REPÕE A ZERO                │
  // │                                                                   │
  // │ A reposição escrevia `scaleX(0)` em todos os casos, e com         │
  // │ `prefers-reduced-motion` ninguém a volta a encher: o relógio sai  │
  // │ no `if (estatico) return`. O ato ativo ficava com a barra vazia   │
  // │ — o contrário do que o JSX declara (`estatico → scaleX(1)`).      │
  // │                                                                   │
  // │ E não era só o desenho. Com movimento reduzido o `globals.css`    │
  // │ deixa uma transição de 0,01 ms em TUDO (`transition-duration`     │
  // │ com `!important`), portanto reescrever o transform criava uma     │
  // │ animação — que o portão do desempenho apanhava como «a cena       │
  // │ continua ativa», de forma intermitente, consoante o instante da   │
  // │ amostra. Não escrever nada é a correção das duas coisas.          │
  // └───────────────────────────────────────────────────────────────────┘
  useEffect(() => {
    feitosRef.current = new Set();
    setFeitos(new Set());
    setCumprido(false);
    if (barraRef.current) {
      barraRef.current.style.transform = estatico ? "scaleX(1)" : "scaleX(0)";
    }
  }, [chave, estatico]);

  useEffect(() => {
    if (estatico) return;
    const definicao = atos[ato];
    if (!definicao) return;

    let decorrido = 0;
    const porDisparar = definicao.beats.filter((b) => !feitosRef.current.has(b.id));

    return relogioDeCena.inscrever(({ delta }) => {
      decorrido += delta;

      if (barraRef.current) {
        barraRef.current.style.transform = `scaleX(${Math.min(1, decorrido / definicao.duracao)})`;
      }

      const chegados = porDisparar.filter((b) => b.em <= decorrido).map((b) => b.id);
      if (chegados.length > 0) {
        for (const id of chegados) feitosRef.current.add(id);
        setFeitos((atuais) => new Set([...atuais, ...chegados]));
        for (const id of chegados) {
          const i = porDisparar.findIndex((b) => b.id === id);
          if (i >= 0) porDisparar.splice(i, 1);
        }
      }

      if (decorrido >= definicao.duracao) {
        terminarRef.current();
        return false;
      }
      return true;
    });
    // O espelho (`feitosRef`) é lido em vez do estado, de propósito: o
    // estado não está disponível no mesmo commit em que a chave muda, e o
    // relógio precisa de saber o que já disparou NESTE ato — nem antes,
    // nem no ato anterior.
  }, [chave, estatico, ato, atos, relogioDeCena]);

  const feito = useCallback(
    (id: string) => estatico || cumprido || feitos.has(id),
    [estatico, cumprido, feitos],
  );

  const cumprirAto = useCallback(() => setCumprido(true), []);

  return { feito, cumprirAto, barraRef };
}
