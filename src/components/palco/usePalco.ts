"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MÁQUINA DE ESTADOS DE UM PALCO — sem a moldura à volta
//  ---------------------------------------------------------------------
//  Isto vivia dentro de `MolduraPalco`, e enquanto os cinco palcos
//  usaram a mesma moldura isso chegava. O hero da bússola quebrou o
//  pressuposto: precisa exatamente das mesmas regras — o ato inicial é o
//  último, só a montagem rebobina, a pausa pára o relógio, ir para um ato
//  é pô-lo a correr, a cena acaba — e de NENHUMA da moldura, porque um
//  hero com cabeçalho de demonstração deixa de ser um hero.
//
//  A alternativa era copiar cinquenta linhas de estado para o hero. É a
//  mesma decisão que já se tomou uma vez com as curvas de movimento, e
//  que já tinha começado a divergir antes de alguém dar por isso.
//
//  ── O que este hook GARANTE, e nenhum consumidor pode desfazer ───────
//
//   1. **A cena servida está resolvida.** `ato` começa no ÚLTIMO e
//      `estatico` é `true` até à montagem. Sem JavaScript e com
//      movimento reduzido, o resultado completo está no HTML.
//   2. **A pausa pára tudo** (WCAG 2.2.2) — o relógio deixa de acumular
//      e `estadoPalco` propaga-o às fichas, aos contadores e ao ponteiro.
//   3. **A cena acaba.** Não reinicia em ciclo: uma cena que recomeça
//      sozinha ensina o olho que nada ali depende de si.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRelogioDeAtos, type Ato } from "./relogio";

export interface Palco {
  /** O índice do ato em curso. */
  ato: number;
  /** O relógio cru — só para LANÇAR coisas, nunca para desenhar. */
  feito: (id: string) => boolean;
  /**
   * O que se DESENHA lê isto, e não `feito`.
   *
   * No servidor o relógio nunca correu, portanto nenhum beat disparou —
   * desenhar a partir dele escreve `opacity: 0` no HTML servido e quem
   * chega sem JavaScript fica sem o resultado.
   */
  emCena: (id: string) => boolean;
  /** Sem JavaScript ou com movimento reduzido. */
  estatico: boolean;
  /** Já houve um render no cliente. */
  montado: boolean;
  parado: boolean;
  /** O último ato correu até ao fim. */
  finalizado: boolean;
  ciclo: number;
  barraRef: React.RefObject<HTMLSpanElement | null>;
  /** O que o leitor de ecrã ouve quando alguém navega à mão. */
  anuncio: string;
  alternarPausa: () => void;
  /**
   * A pessoa tomou conta: a cena acaba onde está e não volta a andar.
   *
   * Não é pausa — ver o bloco em `entregar`, mais abaixo.
   */
  entregar: () => void;
  /** Ir para um ato é PÔ-LO A CORRER, e repor o que ele constrói. */
  irPara: (indice: number) => void;
  rever: () => void;
  /** Para o `PalcoContexto.Provider`. */
  estadoPalco: { parado: boolean; imediato: boolean };
}

export function usePalco(atos: readonly Ato[]): Palco {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ UMA FONTE SÓ PARA `prefers-reduced-motion`                        │
  // │                                                                   │
  // │ Havia duas, e discordavam. O efeito de montagem lia `matchMedia`  │
  // │ diretamente (porque `useReducedMotion()` do `motion` devolve o    │
  // │ valor de omissão no primeiro render) e `estatico` era calculado   │
  // │ só a partir do hook. Quando as duas respostas divergiam saía um   │
  // │ estado que não devia existir: o efeito desistia — ato preso no    │
  // │ último, relógio parado — e `estatico` dizia que não, portanto     │
  // │ desenhavam-se os controlos de pausa e de régua de uma             │
  // │ demonstração que nunca ia andar. Um palco morto com botões.       │
  // │                                                                   │
  // │ Aparece em qualquer Chromium que não declare a preferência, que   │
  // │ é o caso de qualquer sessão automatizada — e foi assim que se     │
  // │ apanhou, a olhar para o palco e não para o código.                │
  // │                                                                   │
  // │ Agora a preferência é lida UMA vez, aqui, e é ela que decide as   │
  // │ duas coisas. `null` é «ainda não sabemos» — o render do servidor, │
  // │ onde a cena tem de estar resolvida.                               │
  // └───────────────────────────────────────────────────────────────────┘
  const [reduz, setReduz] = useState<boolean | null>(null);
  const ultimoAto = atos.length - 1;

  const [ato, setAto] = useState(ultimoAto);
  const [parado, setParado] = useState(true);
  const [finalizado, setFinalizado] = useState(true);
  const [ciclo, setCiclo] = useState(0);
  const [anuncio, setAnuncio] = useState("");

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setReduz(consulta.matches);
    aplicar();
    // Quem liga ou desliga a preferência a meio não fica com a cena
    // congelada até recarregar a página.
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    if (reduz === null) return;
    if (reduz) {
      setAto(ultimoAto);
      setParado(true);
      setFinalizado(true);
      return;
    }
    // O HTML servido contém o resultado completo. Só aqui a cena rebobina.
    setAto(0);
    setParado(false);
    setFinalizado(false);
    setCiclo((atual) => atual + 1);
  }, [reduz, ultimoAto]);

  const montado = reduz !== null;
  const estatico = reduz !== false;

  const terminarAto = useCallback(() => {
    if (ato < ultimoAto) {
      setAto(ato + 1);
      return;
    }
    setFinalizado(true);
    setParado(true);
  }, [ato, ultimoAto]);

  const { feito, barraRef } = useRelogioDeAtos({
    atos,
    ato,
    ciclo,
    parado,
    estatico,
    aoTerminarAto: terminarAto,
  });

  const emCena = useCallback((beat: string) => !montado || feito(beat), [montado, feito]);

  const irPara = useCallback(
    (indice: number) => {
      setAnuncio(`Passo ${indice + 1} de ${atos.length}: ${atos[indice]?.legenda}.`);
      setAto(indice);
      // Com a navegação a pausar, saltar para o último ato deixava-o preso
      // no primeiro frame para sempre: nenhum beat chegava a disparar.
      setParado(false);
      setFinalizado(false);
      setCiclo((atual) => atual + 1);
    },
    [atos],
  );

  const rever = useCallback(() => {
    setAnuncio(`Demonstração reiniciada no primeiro passo: ${atos[0]?.legenda}.`);
    setAto(0);
    setParado(false);
    setFinalizado(false);
    setCiclo((atual) => atual + 1);
  }, [atos]);

  const alternarPausa = useCallback(() => setParado((valor) => !valor), []);

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ ENTREGAR NÃO É PAUSAR                                             │
  // │                                                                   │
  // │ Pausar é uma tranca que alguém abre a seguir. Entregar é o fim:   │
  // │ a pessoa tomou conta da cena e o roteiro não volta a tomá-la.     │
  // │                                                                   │
  // │ A primeira versão do hero da bússola resolvia isto com uma        │
  // │ SUSPENSÃO — o relógio parava enquanto o rato estivesse em cima e  │
  // │ voltava sozinho ao sair. Parecia delicado e era o contrário:      │
  // │ bastava afastar o rato para o roteiro trocar o painel que a       │
  // │ pessoa tinha acabado de abrir. Uma demonstração que retoma o      │
  // │ comando depois de alguém lhe tocar está a discutir com quem a     │
  // │ está a usar.                                                      │
  // │                                                                   │
  // │ A cena fica onde está e o controlo passa a ser «Rever» — que é    │
  // │ um convite, não uma disputa.                                      │
  // └───────────────────────────────────────────────────────────────────┘
  const entregar = useCallback(() => {
    setParado(true);
    setFinalizado(true);
  }, []);

  const estadoPalco = useMemo(
    () => ({ parado: parado || estatico, imediato: false }),
    [estatico, parado],
  );

  return {
    ato,
    feito,
    emCena,
    estatico,
    montado,
    parado,
    finalizado,
    ciclo,
    barraRef,
    anuncio,
    alternarPausa,
    entregar,
    irPara,
    rever,
    estadoPalco,
  };
}

/**
 * Um palco precisa de um sítio onde medir e posicionar peças absolutas.
 *
 * Vive aqui e não em cada consumidor porque o `Ponteiro` e as `Ficha`s
 * assumem que o elemento é `relative` — e assumir isso em cinco sítios é
 * a forma de um deles se esquecer.
 */
export function usePalcoRef() {
  return useRef<HTMLDivElement>(null);
}
