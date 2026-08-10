"use client";

// Botão "voltar ao topo" — global, em todas as páginas públicas do site
// (desktop e telemóvel). Fica escondido enquanto se está no primeiro ecrã e
// aparece assim que se sai dele; um toque devolve a página ao princípio.
//
// ── Onde NÃO aparece ───────────────────────────────────────────────────────
// `/dashboard` e `/admin` têm chrome próprio (barra lateral, cabeçalho e
// scroll interno) e são áreas de trabalho, não de leitura — o mesmo critério
// que já exclui o `ChromeMobile` destas rotas.
//
// ── Porque não colide com nada ─────────────────────────────────────────────
// No telemóvel o cabeçalho vive EM BAIXO (`ChromeMobile`: barra de pesquisa +
// navegação, ~124px + safe area). O botão sobe acima disso; a partir de `lg:`,
// onde esse chrome desaparece, volta ao canto inferior direito normal.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { m, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronUp } from "@/components/ui/Icons";

/** Onde há um hero declarado (`data-hero`), a régua é o próprio hero: o botão
 *  entra quando ele acaba de sair do ecrã. Nas páginas sem hero — guias,
 *  ferramentas, legais — vale esta fração da altura da janela, que é o mesmo
 *  gesto ("saí do primeiro ecrã") sem depender do conteúdo. */
const FRACAO_ECRA = 0.75;

function passouOPrimeiroEcra(): boolean {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (hero) return hero.getBoundingClientRect().bottom <= 0;
  return window.scrollY > window.innerHeight * FRACAO_ECRA;
}

export default function BotaoTopo() {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(false);
  const reduz = useReducedMotion();

  useEffect(() => {
    const avaliar = () => setVisivel(passouOPrimeiroEcra());
    avaliar();
    window.addEventListener("scroll", avaliar, { passive: true });
    window.addEventListener("resize", avaliar, { passive: true });
    return () => {
      window.removeEventListener("scroll", avaliar);
      window.removeEventListener("resize", avaliar);
    };
  }, []);

  // Ao mudar de página o browser volta ao topo, mas o evento de scroll pode não
  // chegar a disparar — sem isto o botão ficava visível numa página já no topo.
  useEffect(() => {
    setVisivel(passouOPrimeiroEcra());
  }, [pathname]);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  function subir() {
    // `html { scroll-behavior: smooth }` já é neutralizado por
    // `prefers-reduced-motion` no globals.css, mas um `behavior: "smooth"`
    // explícito passaria à frente dessa regra — daí decidir aqui também.
    window.scrollTo({ top: 0, behavior: reduz ? "auto" : "smooth" });
  }

  return (
    <AnimatePresence>
      {visivel && (
        <m.button
          type="button"
          onClick={subir}
          aria-label="Voltar ao topo da página"
          title="Voltar ao topo"
          initial={reduz ? false : { opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduz ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="group fixed right-3 bottom-[calc(124px_+_env(safe-area-inset-bottom)_+_0.5rem)] z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-200/80 bg-white/90 text-stone-500 shadow-lift backdrop-blur-md transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-700 dark:text-stone-400 dark:hover:text-brand lg:right-6 lg:bottom-6 lg:h-12 lg:w-12"
        >
          <ChevronUp size={20} className="transition-transform group-hover:-translate-y-0.5" />
        </m.button>
      )}
    </AnimatePresence>
  );
}
