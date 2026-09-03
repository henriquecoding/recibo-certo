"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O MENU DE CONTA E AJUDA — onde vão as acções secundárias
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE O TEMA E O FEEDBACK SAÍRAM DA LINHA PRINCIPAL (P2-04)         │
//  │                                                                     │
//  │ O grupo da direita tinha cinco coisas em linha: uma corneta sem      │
//  │ rótulo, um separador, o tema, «Entrar» e «Começar Grátis». Cinco     │
//  │ alvos a disputar atenção com a ACÇÃO do produto, em todas as         │
//  │ páginas, ao lado da barra de pesquisa que é o elemento central.      │
//  │                                                                     │
//  │ Nenhuma das duas desaparece — mudam de sítio para onde as pessoas    │
//  │ já procuram acções de conta e de suporte. Fica uma entrada e uma     │
//  │ CTA: «o que sou eu aqui» e «o que faço a seguir».                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Não é modal: é um menu ancorado ao botão. Escape fecha e devolve o
//  foco, clicar fora fecha, e o `Tab` sai naturalmente — que é o que se
//  espera de um menu e o que um diálogo modal impediria.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, Megaphone, Sparkle, User } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { abrirNovidades } from "@/components/novidades/abrir";
import { useNovidadesPorVer } from "@/hooks/useNovidadesPorVer";
import { abrirFeedback } from "@/components/feedback/abrir";
import { useAuth } from "@/lib/supabase/auth";

export function MenuConta({ avatarUrl }: { avatarUrl: string }) {
  const { abrirModal, disponivel, user } = useAuth();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const novidadesPorVer = useNovidadesPorVer();
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onTecla);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onTecla);
    };
  }, [aberto]);

  useEffect(() => setAberto(false), [pathname]);

  return (
    <div ref={caixa} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={id}
        className="focus-marca flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-lg object-cover" unoptimized />
          ) : (
            <User size={14} />
          )}
        </span>
        {/* Um rótulo, e não uma corneta sem texto: o significado de um ícone
            isolado tem de ser adivinhado, e este agrupa coisas diferentes. */}
        Conta
        <ChevronDown size={12} className={`transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {aberto && (
        <div
          id={id}
          className="absolute right-0 top-[calc(100%+6px)] z-[70] w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-float dark:border-stone-700 dark:bg-stone-900"
        >
          {user ? (
            <Link
              href="/dashboard"
              className="focus-marca flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-stone-800 no-underline transition-colors hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              <LayoutGrid size={16} className="text-brand" aria-hidden /> Ir para o painel
            </Link>
          ) : (
            disponivel && (
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  abrirModal("entrar");
                }}
                className="focus-marca flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                <User size={16} className="text-brand" aria-hidden /> Entrar
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => {
              setAberto(false);
              abrirFeedback({ area: pathname ?? "/" });
            }}
            className="focus-marca flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Megaphone size={16} className="text-stone-400" aria-hidden /> Sugestões e suporte
          </button>

          {/* ┌───────────────────────────────────────────────────────────┐
              │ «NOVIDADES» É UMA LINHA, E NÃO UM POPUP (regra 10)          │
              │                                                            │
              │ O painel aparecia sozinho a cada versão nova — a única      │
              │ superfície do produto que interrompia quem tinha vindo      │
              │ fazer outra coisa. Passa a estar aqui, encostado ao tema,   │
              │ com um ponto quando há versão por ver. O menu não é modal,  │
              │ por isso não há vaga a libertar: basta fechá-lo.            │
              └───────────────────────────────────────────────────────────┘ */}
          <button
            type="button"
            data-novidades-gatilho
            aria-haspopup="dialog"
            onClick={() => {
              setAberto(false);
              abrirNovidades();
            }}
            className="focus-marca flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Sparkle size={16} className="text-stone-400" aria-hidden /> Novidades e atualizações
            {novidadesPorVer && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-brand-dark dark:text-brand">
                <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                Novo
              </span>
            )}
          </button>

          <div className="mt-1 flex items-center justify-between gap-2 border-t border-stone-100 px-3 pt-2 dark:border-stone-800">
            <span className="text-sm text-stone-700 dark:text-stone-300">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
