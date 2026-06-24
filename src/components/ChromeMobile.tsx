"use client";

// Chrome inferior para telemóvel e tablet (< lg): o header vive em baixo (zona do
// polegar) e a barra de pesquisa fica logo por cima. É o ÚNICO header no
// telemóvel — o Nav.tsx (header de topo) é desktop-only, por isso aqui tem de
// existir tudo o que há no header normal: simuladores, ferramentas, aprender,
// planos, conta (com foto) e a Central de Feedback. Logo→home é regra fixa.
// Não aparece no /dashboard nem no /admin (que têm o seu próprio chrome).

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import {
  LogoMark, Search, Menu, Close, Calculator, LayoutGrid, ArrowRight, Coin, Megaphone, ChevronRight,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";
import { NAV_FERRAMENTAS, NAV_APRENDER, type NavItem } from "@/components/nav-config";
import { abrirFeedback } from "@/components/feedback/abrir";

const EVENTO_ABRIR = "recibocerto:busca:abrir";

const PRINCIPAL: NavItem = {
  href: "/#calculadora", label: "Simuladores", desc: "Calcula o teu líquido real", Icon: Calculator,
};
const PLANOS: NavItem = {
  href: "/precos", label: "Planos", desc: "Subscrições e benefícios", Icon: Coin,
};

export default function ChromeMobile() {
  const pathname = usePathname();
  const { user, abrirModal, disponivel } = useAuth();
  const [menu, setMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => { setMenu(false); }, [pathname]);

  // Foto de perfil (só quando há sessão) — mesmo padrão do header de desktop.
  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    let ativo = true;
    import("@/lib/supabase/profile").then(({ obterPerfil }) =>
      obterPerfil(user.id).then((p) => { if (ativo) setAvatarUrl(p.avatarUrl); })
    );
    return () => { ativo = false; };
  }, [user]);

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

          {/* Sugestões e suporte (Central de Feedback) */}
          <button
            type="button"
            onClick={() => abrirFeedback({ area: pathname })}
            aria-label="Sugestões e suporte"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <Megaphone size={20} />
          </button>

          <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-expanded={menu} aria-label="Abrir menu" className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800">
            <Menu size={22} />
          </button>

          <ThemeToggle />

          {user ? (
            <Link href="/dashboard" aria-label="Painel" className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white">
              <AvatarConta url={avatarUrl} size={28} fallback={<LayoutGrid size={20} />} />
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

      {/* Menu (folha inferior) — espelha o header de desktop, organizado por secções */}
      <AnimatePresence>
        {menu && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0 bg-stone-900/45 backdrop-blur-md" onClick={() => setMenu(false)} aria-hidden />
            <m.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
                <Link href="/" aria-label="ReciboCerto — início" className="flex items-center gap-2 text-brand">
                  <LogoMark size={26} />
                  <span className="font-display text-sm font-semibold text-stone-800 dark:text-stone-100">Recibo<span className="text-brand">Certo</span></span>
                </Link>
                <button type="button" onClick={() => setMenu(false)} aria-label="Fechar menu" className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                  <Close size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {/* Destaque: Simuladores */}
                <LinhaMenu item={PRINCIPAL} ativo={pathname === "/"} destaque />

                <SeccaoMenu titulo="Ferramentas">
                  {NAV_FERRAMENTAS.map((l) => (
                    <LinhaMenu key={l.href} item={l} ativo={ativo(l.href)} />
                  ))}
                </SeccaoMenu>

                <SeccaoMenu titulo="Aprender">
                  {NAV_APRENDER.map((l) => (
                    <LinhaMenu key={l.href} item={l} ativo={ativo(l.href)} />
                  ))}
                </SeccaoMenu>

                <SeccaoMenu titulo="Mais">
                  <LinhaMenu item={PLANOS} ativo={ativo(PLANOS.href)} />
                  {/* Central de Feedback */}
                  <button
                    type="button"
                    onClick={() => { setMenu(false); abrirFeedback({ area: pathname }); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                      <Megaphone size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">Sugestões e reportes</span>
                      <span className="block truncate text-xs text-stone-500 dark:text-stone-400">Ideias, erros, dúvidas ou uma mensagem</span>
                    </span>
                    <ChevronRight size={14} className="flex-shrink-0 text-stone-300" />
                  </button>
                </SeccaoMenu>

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

// Avatar redondo da conta — foto de perfil se houver, senão o ícone de origem.
function AvatarConta({ url, size, fallback }: { url: string; size: number; fallback: React.ReactNode }) {
  if (!url) return <>{fallback}</>;
  return (
    <span className="relative block overflow-hidden rounded-lg" style={{ height: size, width: size }}>
      <Image src={url} alt="" fill className="object-cover" sizes={`${size}px`} unoptimized />
    </span>
  );
}

function SeccaoMenu({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">{titulo}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function LinhaMenu({ item, ativo, destaque }: { item: NavItem; ativo: boolean; destaque?: boolean }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
        ativo ? "bg-brand-light" : destaque ? "bg-stone-50 dark:bg-stone-800/60" : "hover:bg-stone-50 dark:hover:bg-stone-800"
      }`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${ativo ? "bg-brand text-white" : "bg-brand-light text-brand"}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${ativo ? "text-brand-dark dark:text-brand" : "text-stone-800 dark:text-stone-100"}`}>{item.label}</span>
        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{item.desc}</span>
      </span>
      <ChevronRight size={14} className="flex-shrink-0 text-stone-300" />
    </Link>
  );
}
