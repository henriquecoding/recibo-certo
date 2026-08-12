"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CHROME INFERIOR — telemóvel e tablet (< lg)
//  ---------------------------------------------------------------------
//  É o ÚNICO cabeçalho abaixo de `lg`: o `Nav.tsx` é só de secretária. Por
//  isso tudo o que existe no cabeçalho normal tem de estar alcançável
//  daqui. Não aparece no /dashboard nem no /admin (que têm chrome próprio).
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ CINCO ÍCONES SEM RÓTULO, E UM DELES MUDAVA DE SIGNIFICADO (P1-05)    │
//  │                                                                     │
//  │ Era: marca · corneta · menu · tema · conta-ou-começar. Cinco alvos   │
//  │ sem uma única palavra, num sítio onde a pessoa tem de acertar à      │
//  │ primeira com o polegar. O último mudava de destino conforme houvesse │
//  │ sessão — o mesmo lugar levava a sítios diferentes em dias            │
//  │ diferentes. O feedback aparecia duas vezes (aqui e dentro do menu) e │
//  │ o tema ocupava um dos cinco lugares mais valiosos do produto.        │
//  │                                                                     │
//  │ Passa a haver cinco DESTINOS estáveis, com rótulo visível:            │
//  │                                                                     │
//  │      Início · Pesquisar · Guias · Quiz · Conta                       │
//  │                                                                     │
//  │ Cada um significa sempre a mesma coisa. O tema e o feedback vivem    │
//  │ dentro de «Conta», que é onde se procuram acções de conta e suporte. │
//  │                                                                     │
//  │ A barra de pesquisa separada que existia por cima desaparece: a      │
//  │ pesquisa é agora um dos cinco lugares, sempre no mesmo sítio, em vez │
//  │ de uma segunda superfície com uma pastilha de âmbito por baixo.      │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import {
  LogoMark, Home, Search, BookOpen, Trophy, User, Close, LayoutGrid, ArrowRight, Coin, Megaphone, ChevronRight,
  Briefcase,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";
import { NAV_FERRAMENTAS, NAV_APRENDER, type NavItem } from "@/components/nav-config";
import { abrirFeedback } from "@/components/feedback/abrir";
import { EVENTO_BUSCA_ABRIR, useBuscaAberta } from "@/components/busca/motor";
import { SuperficieModal } from "@/components/overlays/SuperficieModal";
import { useOverlay } from "@/components/overlays/CoordenadorOverlays";
import { medirNavegacao } from "@/lib/busca/medicao";

const PLANOS: NavItem = {
  href: "/precos", label: "Planos", desc: "Subscrições e benefícios", Icon: Coin,
};

// Está na barra do desktop ao lado de «Planos»; no telemóvel os cinco lugares
// do fundo são fixos, por isso entra no menu — mas na mesma secção, para o
// menu continuar a ter exactamente o que a barra tem.
const CONTABILISTAS: NavItem = {
  href: "/contabilistas",
  label: "Contabilistas",
  desc: "Ligar-te, marcar consulta e enviar simulações",
  Icon: Briefcase,
};

type Slot =
  | { tipo: "link"; id: string; label: string; href: string; Icon: NavItem["Icon"] }
  | { tipo: "acao"; id: string; label: string; Icon: NavItem["Icon"] };

/**
 * Os cinco lugares. A ordem é fixa e o significado nunca muda com o estado
 * da sessão: mudar o destino de um lugar por baixo do dedo de quem já
 * aprendeu onde ele está é a forma mais rápida de desfazer essa memória.
 */
const SLOTS: Slot[] = [
  { tipo: "link", id: "inicio", label: "Início", href: "/", Icon: Home },
  { tipo: "acao", id: "pesquisar", label: "Pesquisar", Icon: Search },
  { tipo: "link", id: "guias", label: "Guias", href: "/guias", Icon: BookOpen },
  { tipo: "link", id: "quiz", label: "Quiz", href: "/quiz-fiscal", Icon: Trophy },
  { tipo: "acao", id: "conta", label: "Conta", Icon: User },
];

export default function ChromeMobile() {
  const pathname = usePathname();
  const { user, abrirModal, disponivel } = useAuth();
  const [querMenu, setQuerMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const buscaAberta = useBuscaAberta();

  // A vaga do coordenador: o menu é modal, logo não pode coexistir com o
  // consentimento nem com a pesquisa. Ver `CoordenadorOverlays.tsx`.
  const menu = useOverlay("menu", querMenu, { modal: true, iniciadoPeloUtilizador: true });

  useEffect(() => { setQuerMenu(false); }, [pathname]);

  // Foto de perfil (só quando há sessão) — mesmo padrão do header de desktop.
  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    let ativo = true;
    import("@/lib/supabase/profile").then(({ obterPerfil }) =>
      obterPerfil(user.id).then((p) => { if (ativo) setAvatarUrl(p.avatarUrl); })
    );
    return () => { ativo = false; };
  }, [user]);

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

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const ativoMenu = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0].split("#")[0]) && href !== "/#calculadora";

  return (
    <>
      {/* Espaço para o conteúdo não ficar tapado pelo chrome inferior. A
          altura acompanha a barra: cinco alvos de 44 px com rótulo, mais a
          área segura do dispositivo. */}
      <div className="h-[76px] lg:hidden" aria-hidden />

      {/**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ O TABLET DEIXA DE HERDAR O TELEMÓVEL (P2-05)                   │
       * │                                                               │
       * │ De 360 a 1023 px era exactamente a mesma barra de extremo a    │
       * │ extremo. Num ecrã de 900 px isso põe «Início» e «Conta» a mais │
       * │ de meio palmo um do outro, com o olhar a atravessar o ecrã     │
       * │ inteiro entre dois alvos que se usam a seguir um ao outro.     │
       * │                                                               │
       * │ A partir de `md` a doca fica centrada, com 40 rem no máximo e  │
       * │ afastada do fundo: os cinco alvos ficam ao alcance do polegar  │
       * │ de quem segura o tablet, e o conteúdo respira por baixo.       │
       * └───────────────────────────────────────────────────────────────┘
       */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden md:px-6 md:pb-4">
        <nav
          aria-label="Navegação"
          className="mx-auto flex items-stretch justify-between gap-1 border-t border-stone-100 bg-cream/95 px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95 md:max-w-[40rem] md:rounded-2xl md:border md:px-2 md:pb-1.5 md:shadow-float"
        >
          {SLOTS.map((slot) => {
            const on = slot.tipo === "link" ? ativo(slot.href) : slot.id === "conta" ? menu : false;
            const classe = `focus-marca flex min-h-[44px] min-w-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 no-underline transition-colors ${
              on
                ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"
                : "text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            }`;
            const conteudo = (
              <>
                {slot.id === "conta" && avatarUrl ? (
                  <AvatarConta url={avatarUrl} size={20} fallback={<slot.Icon size={20} />} />
                ) : (
                  <slot.Icon size={20} />
                )}
                {/* O rótulo é o que torna o lugar aprendível. Um ícone
                    isolado obriga a adivinhar; cinco obrigam a adivinhar
                    cinco vezes. */}
                <span className="text-[10px] font-semibold leading-none">{slot.label}</span>
              </>
            );

            if (slot.tipo === "link") {
              return (
                <Link
                  key={slot.id}
                  href={slot.href}
                  aria-current={on ? "page" : undefined}
                  onClick={() => medirNavegacao(slot.id, window.innerWidth >= 768 ? "tablet" : "movel")}
                  className={classe}
                >
                  {conteudo}
                </Link>
              );
            }

            const ePesquisa = slot.id === "pesquisar";
            return (
              <button
                key={slot.id}
                type="button"
                data-busca-gatilho={ePesquisa ? "movel" : undefined}
                aria-haspopup={ePesquisa ? "dialog" : "dialog"}
                aria-expanded={ePesquisa ? buscaAberta : menu}
                onClick={() => {
                  if (ePesquisa) window.dispatchEvent(new Event(EVENTO_BUSCA_ABRIR));
                  else setQuerMenu(true);
                }}
                className={classe}
              >
                {conteudo}
              </button>
            );
          })}
        </nav>
      </div>

      {/* «Conta» — a folha inferior com conta, navegação, tema e suporte. */}
      <SuperficieModal
        aberto={menu}
        aoFechar={() => setQuerMenu(false)}
        rotulo="Conta e navegação"
        className="fixed inset-0 z-[80] lg:hidden"
      >
        <AnimatePresence>
          <m.div
            key="veu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
            onClick={() => setQuerMenu(false)}
            aria-hidden
          />
          <m.div
            key="folha"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-stone-200/80 bg-white shadow-float dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
              <Link href="/" aria-label="ReciboCerto — início" className="focus-marca flex items-center gap-2 text-brand no-underline">
                <LogoMark size={26} />
                <span className="font-display text-sm font-semibold text-stone-800 dark:text-stone-100">Recibo<span className="text-brand">Certo</span></span>
              </Link>
              <button type="button" onClick={() => setQuerMenu(false)} aria-label="Fechar" className="focus-marca flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                <Close size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="border-b border-stone-100 pb-3 dark:border-stone-800">
                {user ? (
                  <Link href="/dashboard" className="focus-marca flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white no-underline shadow-glow">
                    <LayoutGrid size={16} /> Ir para o painel
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2">
                    {disponivel && (
                      <button type="button" onClick={() => { setQuerMenu(false); abrirModal("entrar"); }} className="focus-marca flex w-full items-center justify-center rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 dark:border-stone-700 dark:text-stone-300">
                        Entrar
                      </button>
                    )}
                    <Link href={disponivel ? "#" : "/dashboard"} onClick={(e) => { if (disponivel) { e.preventDefault(); setQuerMenu(false); abrirModal("criar"); } }} className="focus-marca flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white no-underline shadow-glow">
                      Começar grátis <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>

              <SeccaoMenu titulo="Ferramentas">
                {NAV_FERRAMENTAS.map((l) => (
                  <LinhaMenu key={l.href} item={l} ativo={ativoMenu(l.href)} />
                ))}
              </SeccaoMenu>

              <SeccaoMenu titulo="Aprender">
                {NAV_APRENDER.map((l) => (
                  <LinhaMenu key={l.href} item={l} ativo={ativoMenu(l.href)} />
                ))}
              </SeccaoMenu>

              <SeccaoMenu titulo="Mais">
                <LinhaMenu item={CONTABILISTAS} ativo={ativoMenu(CONTABILISTAS.href)} />
                <LinhaMenu item={PLANOS} ativo={ativoMenu(PLANOS.href)} />
                <button
                  type="button"
                  onClick={() => { setQuerMenu(false); abrirFeedback({ area: pathname }); }}
                  className="focus-marca flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
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

                <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">Tema</span>
                  <ThemeToggle />
                </div>
              </SeccaoMenu>
            </div>
          </m.div>
        </AnimatePresence>
      </SuperficieModal>
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

function LinhaMenu({ item, ativo }: { item: NavItem; ativo: boolean }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      className={`focus-marca flex items-center gap-3 rounded-xl px-4 py-3 no-underline transition-colors ${
        ativo ? "bg-brand-light dark:bg-brand/15" : "hover:bg-stone-50 dark:hover:bg-stone-800"
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
