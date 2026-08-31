"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O PONTEIRO ENCENADO — o rato que entra em cena, desliza e clica
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ A PRIMEIRA VERSÃO DISTO ESTAVA ERRADA POR CONSTRUÇÃO                │
//  │                                                                     │
//  │ Era um TWEEN: cada beat definia um alvo novo e um `useEffect`       │
//  │ arrancava uma interpolação de A para B. Três defeitos, todos        │
//  │ medidos em runtime e não deduzidos:                                 │
//  │                                                                     │
//  │  1. O alvo era um objeto `{x,y}` novo em cada `setState`, portanto  │
//  │     o efeito voltava a correr a cada beat e a interpolação          │
//  │     REINICIAVA. O cursor arrastava-se: 1 790 ms parado, depois      │
//  │     52 px em três frames, depois 1 400 ms parado outra vez.         │
//  │  2. O ponto era medido UMA vez, quando o beat disparava. O palco    │
//  │     ainda estava a encher-se, portanto a medição ficava velha e o   │
//  │     cursor ia para onde a peça JÁ NÃO estava — nasceu em x=-34,     │
//  │     fora do palco.                                                  │
//  │  3. O clique no campo nunca chegou a renderizar-se premido.         │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── A correção: deixa de ser um tween e passa a ser um SEGUIDOR ──────
//
//  O ponteiro não recebe um destino: recebe uma FUNÇÃO que lhe diz, a
//  cada frame, onde é que ele quer estar. Ele persegue esse ponto com uma
//  mola. Isso resolve os três defeitos de uma vez:
//
//   · não há efeito para reiniciar, porque não há efeito por alvo;
//   · o alvo é remedido a cada frame, portanto nunca envelhece — se a
//     peça se mexer a meio do percurso, o cursor acompanha;
//   · o estado premido é lido no mesmo sítio que a posição.
//
//  ── E uma mola, e não uma curva ──────────────────────────────────────
//
//  Uma mola dá de graça três dos princípios da animação clássica que uma
//  interpolação linear não dá: aceleração e desaceleração naturais
//  («slow in and slow out»), sobreposição do fim de um movimento com o
//  princípio do seguinte, e um ligeiro ultrapassar do alvo antes de
//  assentar. É o que separa um cursor que se move de um cursor que
//  parece ter massa.
//
//  Os valores estão subamortecidos de propósito, mas pouco: ~4% de
//  ultrapassagem. A regra da casa é a mesma de `ASSENTA` — um ressalto
//  que se NOTA lê-se como efeito; um que só se sente lê-se como peso.
//
//  ── A pausa ──────────────────────────────────────────────────────────
//
//  A versão do `HeroCard` era uma cadeia de quinze `setTimeout` e
//  continuava a andar e a clicar com a demonstração em pausa. Aqui o
//  relógio é o mesmo de tudo o resto: parar é deixar de integrar.
// ═══════════════════════════════════════════════════════════════════════

import { useContext, useEffect, useRef } from "react";
import { CursorArrow } from "@/components/ui/Icons";
import { PalcoContexto } from "./atores";
import type { Ponto } from "./medida";

/** O que o palco diz ao ponteiro, a cada frame. */
export interface LeituraPonteiro {
  /** Onde ele quer estar, medido AGORA. `null` esconde-o onde está. */
  ponto: Ponto | null;
  /** A carregar. */
  premido: boolean;
  /**
   * Teletransporta em vez de perseguir. Só para a entrada em cena: um
   * cursor que vem do canto superior esquerdo até ao seu lugar não é uma
   * entrada, é um erro a acontecer devagar.
   */
  imediato?: boolean;
}

// ── A mola ─────────────────────────────────────────────────────────────
//  `RIGIDEZ` decide a rapidez; `AMORTECIMENTO` decide quanto ultrapassa.
//  Com estes valores o cursor percorre 400 px em ~620 ms e ultrapassa
//  ~4% antes de assentar — dentro da escala de `DUR.viagemAmpla`.
const RIGIDEZ = 105;
const AMORTECIMENTO = 19;
/** Abaixo disto está parado; poupa frames sem que se note. */
const REPOUSO = 0.05;

// ── O carregar ─────────────────────────────────────────────────────────
//  Quanto o cursor encolhe ao premir, e com que rapidez lá chega.
//
//  Não é uma transição de CSS: a `transform` é reescrita a cada fotograma
//  pela mola, e uma transição sobre a mesma propriedade ficaria a
//  perseguir a posição com atraso. A escala integra-se no MESMO relógio,
//  por aproximação exponencial — `v += (alvo − v)·(1 − e^(−dt/τ))`, que é
//  estável seja qual for o `dt`.
//
//  Descer é mais rápido do que subir. Um dedo carrega com decisão e
//  levanta-se sem pressa; τ iguais nos dois sentidos leem-se como um
//  interruptor, não como uma mão.
const ESCALA_PREMIDO = 0.82;
const TAU_PREME = 0.03;
const TAU_SOLTA = 0.055;

export function Ponteiro({ ler }: { ler: () => LeituraPonteiro }) {
  const { relogioDeCena } = useContext(PalcoContexto);
  const ref = useRef<HTMLDivElement>(null);
  // A função é relida a cada frame a partir de uma ref: assim o palco
  // pode passar uma closure nova a cada render sem reiniciar nada.
  const lerRef = useRef(ler);
  lerRef.current = ler;

  useEffect(() => {
    let pos: Ponto | null = null;
    let vel = { x: 0, y: 0 };
    let escala = 1;
    let visivelAnterior: boolean | null = null;

    const escrever = () => {
      const no = ref.current;
      if (!no || !pos) return;
      // ┌───────────────────────────────────────────────────────────────┐
      // │ A ESCALA TEM DE VIVER DENTRO DA `transform`                   │
      // │                                                               │
      // │ Estava na propriedade individual `scale`, e isso não é o mesmo │
      // │ sítio. O CSS compõe as propriedades individuais e a            │
      // │ `transform` por esta ordem — `translate`, `rotate`, `scale`,   │
      // │ e só DEPOIS `transform` — o que na matriz final significa que  │
      // │ a `transform` se aplica ao ponto PRIMEIRO e a `scale` escala   │
      // │ o resultado à volta da origem do elemento.                    │
      // │                                                               │
      // │ Ou seja: o cursor estava em (x, y) por `transform`, e premir   │
      // │ passava-o para (0,82·x · 0,82·y) — encolhia a POSIÇÃO, não o   │
      // │ desenho. A 178 px de altura, o clique atirava-o 43 px para     │
      // │ cima e 40 px para a esquerda, num fotograma. Não era uma       │
      // │ animação mal calibrada: era um teletransporte.                │
      // │                                                               │
      // │ Dentro da `transform`, depois das duas translações, a escala   │
      // │ compõe-se onde tem de se compor: à volta do sítio onde o       │
      // │ cursor está.                                                  │
      // └───────────────────────────────────────────────────────────────┘
      no.style.transform =
        `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${escala})`;
    };

    return relogioDeCena.inscrever(({ delta }) => {
      // Passo máximo defensivo: o relógio partilhado já devolve zero ao
      // retomar, mas limitar o integrador também o protege de um frame lento.
      const dt = Math.min(0.032, delta / 1000);
      const no = ref.current;
      if (!no) return true;

      const { ponto, premido, imediato } = lerRef.current();

      if (visivelAnterior !== Boolean(ponto)) {
        visivelAnterior = Boolean(ponto);
        no.style.opacity = ponto ? "1" : "0";
      }
      if (!ponto) return true;

      if (!pos || imediato) {
        pos = { ...ponto };
        vel = { x: 0, y: 0 };
        escala = 1;
        escrever();
        return true;
      }

      // O carregar, no mesmo relógio que o percurso. `1 − e^(−dt/τ)` em vez
      // de um passo fixo: com o separador em segundo plano o `dt` cresce e
      // um passo fixo saltava o alvo.
      const alvoEscala = premido ? ESCALA_PREMIDO : 1;
      escala += (alvoEscala - escala) * (1 - Math.exp(-dt / (premido ? TAU_PREME : TAU_SOLTA)));

      // Mola: a = k·(alvo − pos) − c·v
      const ax = RIGIDEZ * (ponto.x - pos.x) - AMORTECIMENTO * vel.x;
      const ay = RIGIDEZ * (ponto.y - pos.y) - AMORTECIMENTO * vel.y;
      vel = { x: vel.x + ax * dt, y: vel.y + ay * dt };
      pos = { x: pos.x + vel.x * dt, y: pos.y + vel.y * dt };

      if (
        Math.abs(ponto.x - pos.x) < REPOUSO &&
        Math.abs(ponto.y - pos.y) < REPOUSO &&
        Math.hypot(vel.x, vel.y) < REPOUSO
      ) {
        pos = { ...ponto };
        vel = { x: 0, y: 0 };
      }
      escrever();
      return true;
    });
  }, [relogioDeCena]);

  return (
    // ⚠️ SEM `style` no JSX, e a opacidade inicial numa CLASSE.
    //
    //  A opacidade é escrita imperativamente pelo relógio. Com um
    //  `style={{ opacity: 0 }}` no JSX, cada render do palco — e há
    //  dezenas por ato — devolvia o elemento a invisível por cima do que
    //  o relógio tinha acabado de escrever. O cursor movia-se
    //  corretamente e nunca se via: `transform` a mudar, `opacity` presa
    //  em 0. Um estilo em linha ganha sempre à classe, portanto a classe
    //  serve de estado inicial e nunca mais interfere.
    <div
      ref={ref}
      aria-hidden
      // Sem `transition-[scale]`: a escala é integrada no relógio, dentro
      // da `transform`. Uma transição de CSS sobre a mesma propriedade que
      // o relógio reescreve a cada fotograma ficava a perseguir a posição.
      className="pointer-events-none absolute left-0 top-0 z-40 opacity-0"
    >
      <CursorArrow size={22} className="text-ink drop-shadow-[0_2px_8px_rgba(26,26,23,.45)]" />
    </div>
  );
}

/**
 * O anel do clique.
 *
 * Não é o `Anel` de impacto das fichas: aquele diz «uma coisa aterrou
 * aqui», este diz «alguém carregou aqui». Vive menos tempo, é maior e
 * arranca de mais perto do centro — a diferença entre uma chegada e um
 * toque, que usá-los indistintamente apagaria.
 */
export function Toque({ em }: { em: Ponto }) {
  const { parado } = useContext(PalcoContexto);
  return (
    <span
      aria-hidden
      className="rc-toque-palco pointer-events-none absolute z-30 h-11 w-11 rounded-full border-2 border-brand/70"
      style={{
        left: em.x,
        top: em.y,
        animationPlayState: parado ? "paused" : "running",
      }}
    />
  );
}
