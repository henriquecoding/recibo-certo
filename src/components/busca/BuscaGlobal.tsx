"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { CONSULTA_MOVEL, anunciarEstadoBusca, useAtalhoBusca, useMotorBusca } from "./motor";
import { AbasCategorias, CampoBusca, ChipsFiltro, CorpoResultados } from "./partes";

// O botão de pesquisa vive em `./BuscaTrigger` (ficheiro leve) para não arrastar
// este overlay nem o índice de pesquisa para o bundle inicial de quem só mostra
// o botão. Reexportado aqui por retrocompatibilidade.
export { BuscaTrigger } from "./BuscaTrigger";

/**
 * A pesquisa no TELEMÓVEL — uma folha modal, e é a decisão certa.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE AQUI CONTINUA A SER UM MODAL, E NO COMPUTADOR DEIXOU DE SER       │
 * │                                                                         │
 * │ Em 360 px não há «ao lado»: um painel ancorado a uma barra ocuparia o    │
 * │ ecrã todo na mesma, mas sem o dizer, e o teclado virtual — que come      │
 * │ metade da altura — deixaria os resultados fora de vista.                 │
 * │                                                                         │
 * │ Por isso o campo vive em BAIXO, na zona do polegar e imediatamente       │
 * │ acima do teclado, e os resultados crescem para CIMA. A ordem visual é    │
 * │ invertida com `order-*`; o conteúdo é exactamente o mesmo do painel de   │
 * │ secretária, vindo dos mesmos componentes.                                │
 * │                                                                         │
 * │ Só uma das duas superfícies responde ao `⌘K` e ao evento global — ver o  │
 * │ quadro em `motor.ts`. Sem esse acordo, um portátil com janela estreita   │
 * │ abriria as duas ao mesmo tempo, com dois campos a disputar o foco.       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export default function BuscaOverlay() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Fechar devolve o foco à barra fixa — a mesma regra do painel de
   * secretária, e pela mesma razão: sem isto, Escape deixa o foco no `<body>`
   * e a tabulação recomeça no topo do documento. Ver o quadro em
   * `DockPesquisa.tsx`.
   *
   * Aqui a folha é modal e cobre tudo, portanto não há o caso «cliquei noutro
   * sítio e já disse para onde ia»: fechar é sempre voltar de onde se veio.
   */
  const devolverFoco = useRef(false);

  const fechar = useCallback(() => {
    devolverFoco.current = true;
    setAberto(false);
  }, []);
  const abrir = useCallback(() => setAberto(true), []);

  useEffect(() => {
    if (aberto || !devolverFoco.current) return;
    devolverFoco.current = false;
    document.querySelector<HTMLElement>('[data-busca-gatilho="movel"]')?.focus();
  }, [aberto]);

  useAtalhoBusca({ ativaQuando: CONSULTA_MOVEL, aberto, abrir, fechar });

  const motor = useMotorBusca({ aoFechar: fechar });
  const { reiniciar } = motor;

  useEffect(() => {
    if (aberto) reiniciar();
  }, [aberto, reiniciar]);

  // Avisa a barra fixa do telemóvel para se tornar inerte enquanto a folha
  // está por cima dela — ver o quadro em `motor.ts`.
  useEffect(() => {
    anunciarEstadoBusca(aberto);
  }, [aberto]);

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  /**
   * O teclado virtual muda a altura útil, e a folha tem de o acompanhar.
   *
   * `window.innerHeight` não muda quando o teclado abre no iOS — só o
   * `visualViewport` sabe. Sem isto, o campo fica POR BAIXO do teclado, que é
   * a falha clássica de uma pesquisa em folha inferior.
   */
  const [tecladoInset, setTecladoInset] = useState(0);
  const [alturaVisivel, setAlturaVisivel] = useState(0);

  useEffect(() => {
    if (!aberto) return;
    const vv = window.visualViewport;
    const update = () => {
      if (!vv) {
        setTecladoInset(0);
        setAlturaVisivel(window.innerHeight);
        return;
      }
      setTecladoInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      setAlturaVisivel(vv.height);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = anterior;
      clearTimeout(t);
    };
  }, [aberto]);

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label="Pesquisa">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
            onClick={fechar}
            aria-hidden
          />

          <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-start sm:p-4 sm:pt-[6vh]">
            <m.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              style={{
                marginBottom: tecladoInset,
                maxHeight: alturaVisivel ? alturaVisivel - 12 : undefined,
                transition: "margin-bottom 0.22s cubic-bezier(0.16,1,0.3,1)",
              }}
              data-busca-painel="movel"
              className="pointer-events-auto flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-stone-200/80 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-800 dark:bg-stone-900 dark:ring-white/5 sm:max-h-[82dvh] sm:rounded-2xl"
            >
              {/* Campo — em baixo no telemóvel (zona do polegar, acima do
                  teclado); em cima a partir de `sm`. */}
              <div className="order-4 shrink-0 border-stone-100 dark:border-stone-800 sm:order-1 sm:border-b">
                <CampoBusca motor={motor} inputRef={inputRef} id="rc-busca-movel" aoFechar={fechar} />
              </div>

              <div className="order-3 shrink-0 border-b border-stone-100 dark:border-stone-800 sm:order-2">
                <AbasCategorias motor={motor} inputRef={inputRef} />
              </div>

              <div className="order-2 shrink-0 sm:order-3">
                <ChipsFiltro motor={motor} inputRef={inputRef} />
              </div>

              {/* `min-h-0` é o que permite ao filho rolar dentro de um flex
                  column: sem isso o conteúdo empurra a caixa e a folha cresce
                  para lá do ecrã. */}
              <div className="order-1 min-h-0 flex-1 overflow-y-auto overscroll-contain sm:order-4">
                <CorpoResultados motor={motor} colunas={6} />
              </div>

              {/* Área segura — recolhe quando o teclado está aberto, senão
                  ficaria uma faixa vazia entre o campo e o teclado. */}
              <div
                aria-hidden
                className="order-5 shrink-0 sm:hidden"
                style={{ height: tecladoInset > 0 ? 0 : "env(safe-area-inset-bottom)" }}
              />
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
