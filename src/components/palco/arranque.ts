"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O ARRANQUE — quando é que uma cena tem licença para começar
//  ---------------------------------------------------------------------
//  Um palco começava a andar no instante em que montava. Isso quer dizer:
//  ao mesmo tempo que o React hidrata a página inteira, que o browser
//  ainda está a avaliar quase um megabyte de JavaScript, e que a pessoa
//  ainda não viu nada.
//
//  Medido a 6× de estrangulamento de CPU — um telemóvel médio: a maior
//  tarefa do arranque são ~690 ms, e a cena punha os seus primeiros
//  frames exatamente lá dentro. Daí a sensação, nas palavras de quem a
//  viu, de que «ao entrar na aba a animação carrega toda de uma vez».
//
//  ── As duas licenças ─────────────────────────────────────────────────
//
//  Uma cena só arranca quando as DUAS forem verdade:
//
//   1. **Está no ecrã** (`IntersectionObserver`). Uma demonstração que
//      corre fora de vista gasta bateria e não demonstra nada — e quando
//      a pessoa chega lá, já acabou.
//   2. **O browser teve um momento livre** (`requestIdleCallback`). É o
//      que separa os frames da cena do pico de hidratação em vez de os
//      pôr a competir com ele.
//
//  ── O que isto NÃO pode fazer, e não faz ────────────────────────────
//
//  Não muda o que o servidor manda. O HTML servido continua a conter a
//  cena RESOLVIDA — é a regra de que tudo depende (ver `usePalco`), e é
//  também o que faz este adiamento ser invisível: quem chega vê o
//  resultado final desde o primeiro pixel, e a cena rebobina para o
//  princípio quando tiver licença para correr.
//
//  Não se aplica com `prefers-reduced-motion`: aí não há cena para
//  arrancar, e esperar por uma licença que não vai servir para nada
//  seria só atrasar o estado final.
//
//  ── Porque é que o `IntersectionObserver` é partilhado ───────────────
//
//  Um por palco criava um observador por cada cena da página. São
//  poucos, mas o padrão espalha-se: `Reveal` está em toda a parte e um
//  dia alguém liga isto a ele. Um observador só, com um registo de
//  callbacks, custa o mesmo para um ou para cinquenta.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState, type RefObject } from "react";

/**
 * Margem de antecipação: a cena ganha licença um pouco antes de entrar
 * no ecrã, para o primeiro beat não acontecer já a meio da vista.
 *
 * 120 px e não 800: a margem larga é o defeito que `docs/desempenho.md`
 * documenta na secção 2.5 — numa janela de 900 px, 800 px de margem
 * querem dizer «no instante em que a página abre», que é precisamente o
 * que este ficheiro existe para evitar.
 */
const MARGEM = "120px";

let observador: IntersectionObserver | null = null;
const inscritos = new WeakMap<Element, () => void>();

function observar(alvo: Element, aoEntrar: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    // Sem suporte, a licença é imediata. Degradar para «nunca arranca»
    // seria trocar um problema de desempenho por uma cena morta.
    aoEntrar();
    return () => {};
  }
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const avisar = inscritos.get(entrada.target);
        // Desinscrever ANTES de avisar: a licença é dada uma vez, e um
        // segundo aviso rebobinaria uma cena que já está a correr.
        observador?.unobserve(entrada.target);
        inscritos.delete(entrada.target);
        avisar?.();
      }
    },
    { rootMargin: MARGEM },
  );
  inscritos.set(alvo, aoEntrar);
  observador.observe(alvo);
  return () => {
    observador?.unobserve(alvo);
    inscritos.delete(alvo);
  };
}

/** `requestIdleCallback` onde existe; um timeout curto onde não existe. */
function quandoLivre(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  }).requestIdleCallback;
  if (ric) {
    // ⚠️ O `timeout` não é decorativo. Sem ele, uma thread que nunca
    // fica livre — um telemóvel fraco a hidratar — adiava a cena para
    // sempre, e o palco ficava eternamente no seu estado final. Com
    // 1 200 ms há um limite: mais vale competir um pouco do que nunca
    // chegar a correr.
    const id = ric(fn, { timeout: 1200 });
    return () => (window as unknown as { cancelIdleCallback?: (i: number) => void })
      .cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 200);
  return () => window.clearTimeout(id);
}

/**
 * A licença para uma cena começar.
 *
 * Devolve `false` até o elemento entrar no ecrã E o browser ter tido um
 * momento livre; `true` a partir daí, e para sempre — a licença não se
 * retira, porque uma cena que parasse ao sair do ecrã perderia o sítio.
 *
 * @param alvo    o elemento a vigiar (a moldura do palco)
 * @param ativo   `false` desliga a espera e dá licença já. É o que o
 *                movimento reduzido usa: não há cena, não há o que
 *                esperar.
 */
export function useArranque(alvo: RefObject<Element | null>, ativo = true): boolean {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!ativo) return;
    const no = alvo.current;
    if (!no) return;

    let cancelarLivre: (() => void) | undefined;
    let vivo = true;

    const pararDeObservar = observar(no, () => {
      if (!vivo) return;
      cancelarLivre = quandoLivre(() => {
        if (vivo) setPronto(true);
      });
    });

    return () => {
      vivo = false;
      pararDeObservar();
      cancelarLivre?.();
    };
  }, [alvo, ativo]);

  return pronto;
}
