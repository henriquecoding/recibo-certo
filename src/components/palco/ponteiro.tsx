"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O PONTEIRO ENCENADO — o rato que entra em cena, desliza e clica
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ISTO JÁ EXISTIA, E ERA A MELHOR COISA DA HOMEPAGE                   │
//  │                                                                     │
//  │ O `HeroCard` tinha um cursor de rato que aparecia, deslizava até ao │
//  │ campo, CLICAVA (com anel de toque e o cursor a afundar), esperava   │
//  │ enquanto o valor era escrito com uma gralha pelo meio, voltava,     │
//  │ deslizava até «Calcular» e clicava outra vez.                       │
//  │                                                                     │
//  │ Quando escrevi os palcos novos, portei a digitação e deixei o       │
//  │ ponteiro para trás — «a essência», escrevi em comentário. Não era   │
//  │ a essência: era metade. Uma pessoa a escrever num campo sem nada    │
//  │ ter clicado nele é um vídeo de um campo a preencher-se sozinho.     │
//  │ O que faz aquilo parecer alguém a usar o produto é a MÃO.           │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── O que muda na mudança de casa ────────────────────────────────────
//
//  Lá era uma cadeia de `setTimeout` com quinze entradas. Uma cadeia de
//  temporizadores não sabe o que é uma pausa: com a demonstração «em
//  pausa» o cursor continuava a andar e a clicar. É o mesmo defeito que
//  já foi apanhado nas fichas, no mesmo sítio, pela mesma razão.
//
//  Aqui o ponteiro tem relógio próprio — um `requestAnimationFrame` que
//  só acumula tempo enquanto não está parado —, exatamente como a `Ficha`
//  e o `Contador`. Parar é deixar de acumular, e o rato fica onde está.
// ═══════════════════════════════════════════════════════════════════════

import { useContext, useEffect, useRef, useState } from "react";
import { CursorArrow } from "@/components/ui/Icons";
import { PalcoContexto } from "./atores";
import { DUR, ENTRADA, bezier, entre } from "./curvas";
import type { Ponto } from "./medida";

export interface EstadoPonteiro {
  /** Para onde vai. `null` esconde-o sem o mover. */
  em: Ponto | null;
  /** Premido: o cursor afunda, como um dedo a carregar. */
  premido: boolean;
  /** Quanto demora a chegar. Um percurso longo não anda mais depressa. */
  duracao?: number;
}

/**
 * O cursor encenado.
 *
 * Interpola a própria posição — não a delega ao `motion` — porque a pausa
 * tem de o parar a meio do percurso, e porque a posição de partida do
 * próximo movimento é onde ELE ESTÁ, e não onde o último alvo dizia. Com
 * o `motion` a tratar disto, um alvo novo a meio de um percurso fazia o
 * cursor saltar para trás antes de arrancar.
 */
export function Ponteiro({ estado }: { estado: EstadoPonteiro }) {
  const { parado } = useContext(PalcoContexto);
  const ref = useRef<HTMLDivElement>(null);
  const paradoRef = useRef(parado);
  paradoRef.current = parado;
  /** Onde ele está agora. É daqui que o percurso seguinte parte. */
  const atualRef = useRef<Ponto | null>(null);

  useEffect(() => {
    const destino = estado.em;
    const no = ref.current;
    if (!no || !destino) return;

    const origem = atualRef.current;
    // Sem origem, aparece já no sítio: é a entrada em cena, e um cursor a
    // vir do canto superior esquerdo do palco leria como um erro.
    if (!origem) {
      atualRef.current = destino;
      no.style.transform = `translate(-50%, -50%) translate(${destino.x}px, ${destino.y}px)`;
      return;
    }

    const duracao = estado.duracao ?? DUR.viagemAmpla;
    const curva = bezier(ENTRADA);
    let raf = 0;
    let decorrido = 0;
    let ultimo = performance.now();

    const passo = (agora: number) => {
      if (!paradoRef.current) decorrido += agora - ultimo;
      ultimo = agora;
      const t = Math.min(1, decorrido / duracao);
      const f = curva(t);
      const x = entre(origem.x, destino.x, f);
      const y = entre(origem.y, destino.y, f);
      atualRef.current = { x, y };
      if (ref.current) {
        ref.current.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
      if (t < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [estado.em, estado.duracao]);

  if (!estado.em && !atualRef.current) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-40 transition-[opacity,scale] duration-150 ease-out"
      style={{
        opacity: estado.em ? 1 : 0,
        scale: estado.premido ? 0.78 : 1,
      }}
    >
      <CursorArrow size={22} className="text-ink drop-shadow-[0_2px_6px_rgba(26,26,23,.35)]" />
    </div>
  );
}

/**
 * O anel do clique.
 *
 * Não é o `Anel` de impacto das fichas: aquele diz «uma coisa aterrou
 * aqui» e este diz «alguém carregou aqui». Vive menos tempo, é maior e
 * arranca de mais perto do centro — é a diferença entre uma chegada e um
 * toque, e usá-los indistintamente apagaria essa diferença.
 */
export function Toque({ em }: { em: Ponto }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-30 h-12 w-12 rounded-full border-2 border-brand/60 transition-[opacity,scale] duration-[600ms] ease-out"
      style={{
        left: em.x,
        top: em.y,
        translate: "-50% -50%",
        opacity: visivel ? 0 : 0.85,
        scale: visivel ? 1.15 : 0.15,
      }}
    />
  );
}
