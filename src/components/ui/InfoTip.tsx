"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// Informativo acessível para termos técnicos. Abre por rato (hover), por foco
// de teclado e por toque, com role="tooltip" e aria-describedby.
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ PORQUE É QUE O PAINEL VIVE NUM PORTAL COM POSIÇÃO CALCULADA           │
// │                                                                      │
// │ A versão anterior era `absolute left-1/2 -translate-x-1/2 w-60`: o    │
// │ painel nascia sempre centrado no botão, com 240px fixos. Num ecrã de  │
// │ 360px, um botão perto da margem direita punha o painel a terminar em  │
// │ x=414 — 54px fora do ecrã, cortados pelo `overflow-x` da página. Não  │
// │ era um caso raro: medido no simulador de salário, 5 dos 7 painéis da  │
// │ página saíam do viewport (dois pela direita, um pela esquerda, dois   │
// │ por baixo).                                                          │
// │                                                                      │
// │ Nenhuma variante de `left/right` resolvia isto sem saber onde está o  │
// │ botão. E `absolute` continuava preso ao `overflow-hidden` e ao        │
// │ contexto de empilhamento do cartão em que vive. Daí: portal para o    │
// │ `body`, `position: fixed`, coordenadas medidas a partir do botão e    │
// │ presas ao viewport com folga — nunca corta, nunca fica por baixo.     │
// └──────────────────────────────────────────────────────────────────────┘
//
// O Escape fecha-o sem tirar o foco do botão porque a WCAG 2.1 · 1.4.13
// («Content on Hover or Focus») exige que conteúdo que aparece por hover ou
// foco seja *dispensável* sem mover o ponteiro nem o foco. Sem isto, quem
// navega por teclado tem o painel colado ao ecrã até sair do botão — e o
// painel tapa o campo seguinte. O axe não deteta esta falha: só se vê a
// testar o teclado à mão.

/** Folga mínima entre o painel e qualquer margem do ecrã. */
const MARGEM = 12;
/** Distância entre o botão e o painel (onde cabe o bico). */
const FOLGA = 10;
/** Largura máxima; abaixo disto usa o que o ecrã tiver. */
const LARGURA_MAX = 320;
/** Altura mínima que justifica abrir de um lado em vez do outro. */
const ALTURA_MINIMA = 96;

/**
 * `useLayoutEffect` no cliente, `useEffect` no servidor. O componente é
 * renderizado no servidor (só o painel é que não), e chamar lá o de layout
 * enche a consola de avisos sem fazer nada.
 */
const useLayoutEffectIsomorfico = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Posicao {
  left: number;
  top: number;
  largura: number;
  alturaMax: number;
  /** Coordenadas do bico, em viewport: vive fora do painel porque o painel
   *  pode ter scroll e cortaria qualquer coisa desenhada na sua margem. */
  bicoLeft: number;
  bicoTop: number;
  acima: boolean;
}

export default function InfoTip({ children, label = "Mais informação" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Posicao | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLSpanElement>(null);
  // Toque dentro do painel não pode fechá-lo: num telemóvel, um painel com
  // várias linhas precisa de scroll, e o scroll começa por um `pointerdown`
  // que tira o foco do botão. Sem esta guarda, tentar ler o painel fechava-o.
  const aInteragir = useRef(false);
  // Este foco veio de um ponteiro (rato ou dedo) ou do teclado? É a distinção
  // que decide se o `onFocus` abre o painel — ver o bloco no `onFocus`.
  const focoDePonteiro = useRef(false);
  // Ver a nota em `colocar()`: o fecho por «saiu do ecrã» só vale depois de o
  // botão lá ter estado.
  const jaEsteveVisivel = useRef(false);
  const id = useId();

  const colocar = useCallback(() => {
    const botao = botaoRef.current;
    const painel = painelRef.current;
    if (!botao || !painel) return;

    const alvo = botao.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;

    // ┌────────────────────────────────────────────────────────────────┐
    // │ FECHAR PORQUE O BOTÃO SAIU DO ECRÃ — MAS SÓ DEPOIS DE LÁ TER    │
    // │ ESTADO.                                                        │
    // │                                                                │
    // │ Quando se chega ao botão por Tab, o navegador rola até ele      │
    // │ DEPOIS de despachar o foco — e a rolagem é suave, por isso os   │
    // │ primeiros eventos de scroll ainda o apanham fora do ecrã.       │
    // │ Fechar aí matava o painel a quem navega por teclado, que é      │
    // │ exatamente quem depende dele. Medido: o painel abria e          │
    // │ desaparecia em menos de meio segundo.                          │
    // │                                                                │
    // │ Com esta memória, o fecho só se aplica a um botão que já esteve │
    // │ visível — ou seja, a quem o afastou a deslizar.                 │
    // └────────────────────────────────────────────────────────────────┘
    const visivel = alvo.bottom > 0 && alvo.top < vh;
    if (visivel) jaEsteveVisivel.current = true;
    else if (jaEsteveVisivel.current) {
      setOpen(false);
      return;
    }

    const largura = Math.min(LARGURA_MAX, vw - MARGEM * 2);
    const espacoAbaixo = vh - alvo.bottom - FOLGA - MARGEM;
    const espacoAcima = alvo.top - FOLGA - MARGEM;
    // A altura NATURAL do conteúdo, não a que ele tem agora: assim que um
    // `maxHeight` é aplicado, `offsetHeight` passa a devolver o valor cortado
    // e a decisão «cabe por baixo?» ficaria a medir-se a si própria.
    // (Sem corte, `scrollHeight + bordas === offsetHeight`.)
    const altura = painel.scrollHeight + (painel.offsetHeight - painel.clientHeight);
    const cabeAbaixo = altura <= espacoAbaixo;
    const acima = !cabeAbaixo && espacoAcima > espacoAbaixo && espacoAcima >= ALTURA_MINIMA;
    const alturaMax = Math.max(ALTURA_MINIMA, acima ? espacoAcima : espacoAbaixo);
    const alturaFinal = Math.min(altura, alturaMax);

    const centro = alvo.left + alvo.width / 2;
    const left = Math.min(Math.max(MARGEM, centro - largura / 2), Math.max(MARGEM, vw - MARGEM - largura));
    const top = acima ? alvo.top - FOLGA - alturaFinal : alvo.bottom + FOLGA;

    setPos({
      left,
      top,
      largura,
      alturaMax,
      bicoLeft: left + Math.min(Math.max(14, centro - left), largura - 14) - 5,
      bicoTop: (acima ? top + alturaFinal : top) - 5,
      acima,
    });
  }, []);

  // Mede e coloca antes da pintura, para o painel nunca chegar a aparecer na
  // posição por medir.
  useLayoutEffectIsomorfico(() => {
    if (!open) {
      setPos(null);
      aInteragir.current = false;
      jaEsteveVisivel.current = false;
      return;
    }
    colocar();
  }, [open, colocar]);

  useEffect(() => {
    if (!open) return;
    const recolocar = () => colocar();
    // `capture` para apanhar também o scroll de contentores internos.
    window.addEventListener("scroll", recolocar, true);
    window.addEventListener("resize", recolocar);
    const foraDaquiFecha = (evento: PointerEvent) => {
      const alvo = evento.target as Node | null;
      if (!alvo) return;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", foraDaquiFecha, true);
    return () => {
      window.removeEventListener("scroll", recolocar, true);
      window.removeEventListener("resize", recolocar);
      document.removeEventListener("pointerdown", foraDaquiFecha, true);
    };
  }, [open, colocar]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        // ┌──────────────────────────────────────────────────────────────┐
        // │ NO TELEMÓVEL, ABRIR TEM DE SER UM TOQUE — NÃO DOIS.           │
        // │                                                              │
        // │ Um toque despacha `mouseenter` antes do `click`. Com o hover  │
        // │ a abrir e o clique a alternar, o primeiro toque abria e       │
        // │ fechava no mesmo gesto: medido, TODOS os painéis desta app    │
        // │ exigiam dois toques. Filtrar por `pointerType` devolve o      │
        // │ hover ao rato e deixa o toque ser só clique.                  │
        // └──────────────────────────────────────────────────────────────┘
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
        // ┌──────────────────────────────────────────────────────────────┐
        // │ SÓ O FOCO DE TECLADO ABRE.                                    │
        // │                                                              │
        // │ Um toque também dá foco ao botão. Se o foco abrisse sempre, o │
        // │ `click` que vem logo a seguir voltava a fechar — o mesmo      │
        // │ defeito dos dois toques, por outro caminho.                   │
        // │                                                              │
        // │ A modalidade é registada no `pointerdown` em vez de se ler    │
        // │ `:focus-visible` no próprio evento: durante o `focus`, o      │
        // │ Chrome ainda não marcou o elemento como visualmente focado —  │
        // │ medido, `matches(":focus-visible")` dá `false` no evento e    │
        // │ `true` logo a seguir. Testar aí fechava o painel a quem       │
        // │ navega por teclado, que é exatamente quem precisa dele.       │
        // └──────────────────────────────────────────────────────────────┘
        onPointerDown={() => {
          focoDePonteiro.current = true;
        }}
        onFocus={() => {
          if (!focoDePonteiro.current) setOpen(true);
        }}
        onBlur={() => {
          // Um `pointerdown` sem `click` (arrastar para fora antes de largar)
          // deixaria a modalidade presa em «ponteiro» para sempre.
          focoDePonteiro.current = false;
          if (!aInteragir.current) setOpen(false);
        }}
        onClick={() => {
          focoDePonteiro.current = false;
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            // Não deixar o Escape subir: dentro de um modal fecharia o modal
            // inteiro em vez de só este painel.
            e.stopPropagation();
            setOpen(false);
          }
        }}
        // `inline-flex` + `align-middle`: o botão passou a ser ele próprio o
        // elemento que assenta no texto (já não há `span` à volta), e um
        // `flex` de nível de bloco atirava-o para uma linha só sua.
        className="relative inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border border-stone-300 align-middle text-[10px] font-bold text-stone-400 transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-500"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 7.2v4M8 4.8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
        {pos && (
          <span
            aria-hidden
            onPointerDown={() => {
              aInteragir.current = true;
            }}
            style={{ left: pos.bicoLeft, top: pos.bicoTop }}
            className={`fixed z-[9500] block h-2.5 w-2.5 rotate-45 border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800 ${pos.acima ? "border-b border-r" : "border-l border-t"}`}
          />
        )}
        <span
          role="tooltip"
          id={id}
          ref={painelRef}
          onPointerDown={() => {
            aInteragir.current = true;
          }}
          style={{
            left: pos?.left ?? 0,
            top: pos?.top ?? 0,
            width: pos?.largura ?? "min(20rem, calc(100vw - 24px))",
            maxHeight: pos?.alturaMax,
            visibility: pos ? "visible" : "hidden",
          }}
          // `normal-case tracking-normal text-left`: o painel é filho de
          // rótulos `uppercase tracking-wide` — sem isto herdava-os e a
          // explicação do «Mês» saía inteira em maiúsculas espaçadas.
          // O `z` fica acima da barra de navegação móvel (z-50) e de todos os
          // diálogos que podem conter um InfoTip (máx. z-[9200]), e abaixo da
          // camada de avisos (z-[9600]).
          className="fixed z-[9500] block overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-stone-600 shadow-lift dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
        >
          {children}
        </span>
        </>,
        document.body,
      )}
    </>
  );
}
