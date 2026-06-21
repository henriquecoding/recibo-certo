"use client";

// Chrome inferior para telemóvel e tablet (< lg): o header vive em baixo (zona do
// polegar) e a barra de pesquisa fica logo por cima. Logo→home é regra fixa; o
// resto adapta-se. Não aparece no /dashboard (que tem o seu próprio chrome).

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import {
  LogoMark, Search, Menu, Close, Calculator, Scale, BookOpen, Trophy, Briefcase, Coin, LayoutGrid, ArrowRight,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";

const EVENTO_ABRIR = "recibocerto:busca:abrir";

const LINKS: { href: string; label: string; desc: string; icon: typeof Calculator }[] = [
  { href: "/#calculadora", label: "Simulador", desc: "Calcula o teu líquido", icon: Calculator },
  { href: "/dashboard/comparar", label: "Comparar cenários", desc: "Recibos verdes vs empresa", icon: Scale },
  { href: "/ferramentas", label: "Ferramentas", desc: "Simuladores e decisores", icon: Briefcase },
  { href: "/guias", label: "Guias fiscais", desc: "IRS, IVA, Segurança Social", icon: BookOpen },
  { href: "/quiz-fiscal", label: "Quiz Fiscal", desc: "Testa os teus conhecimentos", icon: Trophy },
  { href: "/precos", label: "Planos", desc: "Subscrições e benefícios", icon: Coin },
];

export default function ChromeMobile() {
  const pathname = usePathname();
  const { user, abrirModal, disponivel } = useAuth();
  const [menu, setMenu] = useState(false);

  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [menu]);

  const [quizPlaying, setQuizPlaying] = useState(false);
  useEffect(() => {
    if (!pathname.startsWith("/quiz-fiscal")) { setQuizPlaying(false); return; }
    const obs = new MutationObserver(() => {
      setQuizPlaying(document.body.classList.contains("quiz-playing"));
    });
    setQuizPlaying(document.body.classList.contains("quiz-playing"));
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [pathname]);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || quizPlaying) return null;

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0].split("#")[0]) && href !== "/#calculadora");

  return (
    <>
      {/* Espaço para o conteúdo não ficar tapado pelo chrome inferior */}
      <div className="h-[124px] lg:hidden" aria-hidden />

      {/* Chrome inferior (telemóvel + tablet) */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        {/* Barra de pesquisa — destaque, por cima do header */}
        <div className="px-3 pb-2.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))}
            aria-label="Pesquisar no ReciboCerto"
            className="flex w-full items-center gap-3 rounded-xl border-2 border-brand/30 bg-white py-2 pl-2 pr-3 text-sm font-medium text-stone-500 shadow-lift transition-colors active:border-brand dark:border-brand/40 dark:bg-stone-900"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-white">
              <Search size={18} />
            </span>
            <span className="flex-1 truncate text-left">Pesquisar ferramentas, guias…</span>
            <span className="flex-shrink-0 rounded-md bg-brand-light px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-dark">Tudo</span>
          </button>
        </div>

        {/* Header inferior */}
        <nav
          aria-label="Navegação"
          className="flex items-center justify-between gap-1 border-t border-stone-100 bg-cream/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95"
        >
          {/* Logo → home (é o botão de início; regra fixa) */}
          <Link href="/" aria-label="Início — ReciboCerto" aria-current={pathname === "/" ? "page" : undefined} className={`flex h-11 items-center gap-1.5 rounded-lg pl-1.5 pr-2.5 transition-colors ${pathname === "/" ? "bg-brand-light text-brand" : "text-brand hover:bg-brand/10"}`}>
            <LogoMark size={26} />
          </Link>

          {/* Atalho rápido: comparar cenários */}
          <Link href="/dashboard/comparar" aria-label="Comparar cenários" className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800">
            <Scale size={20} />
          </Link>

          <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} aria-label="Abrir menu" className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800">
            <Menu size={22} />
          </button>

          <ThemeToggle />

          {user ? (
            <Link href="/dashboard" aria-label="Painel" className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white">
              <LayoutGrid size={20} />
            </Link>
          ) : disponivel ? (
            <button type="button" onClick={() => abrirModal("criar")} className="flex h-11 items-center justify-center rounded-lg bg-brand px-3.5 text-xs font-bold text-white shadow-glow">
              Começar
            </button>
          ) : (
            <Link href="/dashboard" className="flex h-11 items-center justify-center rounded-lg bg-brand px-3.5 text-xs font-bold text-white shadow-glow">
              Começar
            </Link>
          )}
        </nav>
      </div>

      {/* Menu (folha inferior) */}
      <AnimatePresence>
        {menu && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0 bg-stone-900/45 backdrop-blur-md" onClick={() => setMenu(false)} aria-hidden />
            <m.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
                <Link href="/" aria-label="ReciboCerto — início" className="text-brand"><LogoMark size={28} /></Link>
                <button type="button" onClick={() => setMenu(false)} aria-label="Fechar menu" className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                  <Close size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {LINKS.map((l) => {
                  const Icon = l.icon;
                  const at = ativo(l.href);
                  return (
                    <Link key={l.href} href={l.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${at ? "bg-brand-light" : "hover:bg-stone-50 dark:hover:bg-stone-800"}`}>
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${at ? "bg-brand text-white" : "bg-brand-light text-brand"}`}><Icon size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${at ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>{l.label}</span>
                        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{l.desc}</span>
                      </span>
                      <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
                    </Link>
                  );
                })}
                <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
                  {user ? (
                    <Link href="/dashboard" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow">
                      <LayoutGrid size={16} /> Ir para o painel
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {disponivel && (
                        <button type="button" onClick={() => { setMenu(false); abrirModal("entrar"); }} className="flex w-full items-center justify-center rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 dark:border-stone-700 dark:text-stone-300">
                          Entrar
                        </button>
                      )}
                      <Link href={disponivel ? "#" : "/dashboard"} onClick={(e) => { if (disponivel) { e.preventDefault(); setMenu(false); abrirModal("criar"); } }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow">
                        Começar grátis <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
