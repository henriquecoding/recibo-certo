"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MOLDURA DA ADMINISTRAÇÃO
//  ---------------------------------------------------------------------
//  Três superfícies leem a MESMA arrumação (`components/admin/navegacao`):
//
//      barra lateral   as seis secções, com os destinos à vista (≥lg)
//      linha de secção os destinos da secção aberta (<lg, só quando há >1)
//      doca            as seis secções (<lg, fixa no fundo)
//
//  ┌───────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTAVA PARTIDO NO TELEMÓVEL                                  │
//  │                                                                   │
//  │ A doca declarava `grid-cols-6` e recebia DEZ destinos. Seis        │
//  │ colunas com dez itens dão duas linhas: a barra subia para ~130 px  │
//  │ e o conteúdo reservava 96 px (`pb-24`). O fim de cada página       │
//  │ ficava por baixo da navegação — não desalinhado, inalcançável.     │
//  │                                                                   │
//  │ Faltava também `env(safe-area-inset-bottom)`, que as outras duas   │
//  │ molduras já tinham: num telemóvel com barra de gestos, a última    │
//  │ linha de destinos ficava por baixo do indicador.                   │
//  └───────────────────────────────────────────────────────────────────┘
//
//  A guarda abaixo é conveniência, não segurança: quem autoriza é a RLS.
//  O que ela evita é mostrar um painel a quem não devia estar cá.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/supabase/auth";
import { verificarAdmin } from "@/lib/supabase/admin";
import { eDemonstracao } from "@/lib/contabilistas/demonstracao/rotas";
import {
  DESTINOS_ADMIN, SECCOES_ADMIN, destinoAtivoAdmin,
  hrefDaSeccaoAdmin, seccaoDoCaminhoAdmin,
  type SeccaoAdmin,
} from "@/components/admin/navegacao";
import { LogoMark, ArrowLeft, LogOut } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";

function AdminGuard({ children }: { children: ReactNode }) {
  const { user, carregado, sair } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  const [adminVerificado, setAdminVerificado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (isLoginPage) { setVerificando(false); return; }
    if (!carregado) return;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    verificarAdmin(user.id).then((ok) => {
      if (!ok) {
        sair();
        router.replace("/admin/login");
      } else {
        setAdminVerificado(true);
      }
      setVerificando(false);
    });
  }, [carregado, user, isLoginPage, router, sair]);

  if (isLoginPage) return <>{children}</>;

  if (verificando || !adminVerificado) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand-light" />
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AdminLayout({ children }: { children: ReactNode }) {
  const { user, sair } = useAuth();
  const pathname = usePathname();

  // O painel de contabilista em demonstração traz a moldura DELE — barra
  // no topo, calha de separadores, doca no fundo. Envolvê-lo na moldura da
  // administração punha duas barras no topo e duas navegações fixas no
  // fundo do telemóvel, e deixava de mostrar o que se quer validar: o
  // painel como o contabilista o vê. A guarda acima já correu.
  if (eDemonstracao(pathname)) return <>{children}</>;

  const seccaoAberta = seccaoDoCaminhoAdmin(pathname);

  return (
    <div className="min-h-[100dvh] bg-cream lg:grid lg:grid-cols-[248px_1fr]">
      {/* ── Barra lateral (≥lg) ─────────────────────────────────────────
          As secções de um só destino são um link e mais nada: pôr-lhes um
          cabeçalho de grupo por cima seria escrever o mesmo nome duas
          vezes, uma linha acima da outra. */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="shrink-0 border-b border-stone-100 px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2.5" aria-label="Administração — visão geral">
            <LogoMark size={32} />
            <span>
              <span className="block font-display text-sm font-semibold text-stone-800">
                Recibo<span className="text-brand">Certo</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Admin
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Secções da administração" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {SECCOES_ADMIN.map((seccao) =>
              seccao.destinos.length === 1 ? (
                <li key={seccao.id}>
                  <LinkDaSidebar destino={seccao.destinos[0]} pathname={pathname} />
                </li>
              ) : (
                <li key={seccao.id} className="pt-3 first:pt-0">
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-300">
                    {seccao.label}
                  </p>
                  <ul className="space-y-0.5">
                    {seccao.destinos.map((d) => (
                      <li key={d.href}>
                        <LinkDaSidebar destino={d} pathname={pathname} />
                      </li>
                    ))}
                  </ul>
                </li>
              ),
            )}
          </ul>
        </nav>

        {/* Conta e utilitários no fundo, separados da navegação: são dois
            conjuntos de controlos diferentes e não devem disputar a mesma
            atenção. */}
        <div className="shrink-0 space-y-1 border-t border-stone-100 p-3">
          {user && (
            <p className="truncate px-3 py-1 text-[11px] text-stone-400" title={user.email ?? ""}>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={sair}
            className="focus-marca flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800"
          >
            <LogOut size={16} aria-hidden />
            Terminar sessão
          </button>
          <div className="flex items-center justify-between px-3">
            <Link
              href="/"
              className="focus-marca flex items-center gap-1.5 text-xs text-stone-400 transition-colors hover:text-stone-600"
            >
              <ArrowLeft size={12} aria-hidden />
              Ver site público
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Coluna do conteúdo ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-stone-100 bg-cream/85 px-4 py-2.5 backdrop-blur-xl sm:px-5 lg:gap-4 lg:px-8">
          {/* A identidade só no telemóvel: no desktop está na barra lateral,
              e repeti-la punha a mesma informação duas vezes no mesmo ecrã. */}
          <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-2 lg:hidden" aria-label="Administração — visão geral">
            <LogoMark size={26} />
            <span className="truncate font-display text-sm font-semibold text-stone-800">
              Recibo<span className="text-brand">Certo</span> <span className="text-stone-400">Admin</span>
            </span>
          </Link>
          {/* No desktop o topo é do ECRÃ: a barra lateral já diz a secção,
              e esta linha diz a página. Preenchido por `CabecalhoAdmin`. */}
          <div id="admin-titulo" className="hidden min-w-0 flex-1 lg:block" />
          <div className="flex shrink-0 items-center gap-1.5">
            {/* As ações de cada ecrã montam-se aqui por portal (≥lg). */}
            <div id="admin-acoes" className="flex items-center gap-1.5" />
            <ThemeToggle />
            <button
              type="button"
              onClick={sair}
              className="focus-marca rounded-xl px-2 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 lg:hidden"
            >
              Sair
            </button>
          </div>
        </header>

        {/* `pb-28` reserva os ~4,4 rem da doca mais a área segura. Era
            `pb-24` para uma barra que crescera para duas linhas. */}
        <main className="min-w-0 flex-1 p-5 pb-28 sm:p-6 lg:p-8 lg:pb-8">
          <LinhaDaSeccao seccao={seccaoAberta} pathname={pathname} />
          {children}
        </main>
      </div>

      {/* ── Doca (<lg) — seis secções, uma linha ────────────────────────
          Seis lugares cabem em 320 px com alvo ≥44 px. Eram dez destinos
          em seis colunas: duas linhas, e o fundo das páginas por baixo. */}
      <nav
        aria-label="Secções da administração"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-stone-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {SECCOES_ADMIN.map((seccao) => {
          const ativa = seccao.id === seccaoAberta?.id;
          const { Icon } = seccao;
          return (
            <Link
              key={seccao.id}
              href={hrefDaSeccaoAdmin(seccao)}
              /* Uma secção com vários destinos NÃO é a página atual — é a
                 secção onde ela vive, e quem diz «page» é a linha de secção
                 logo acima do conteúdo. Com `page` nos dois, um leitor de
                 ecrã ouvia duas respostas à mesma pergunta. */
              aria-current={ativa ? (seccao.destinos.length === 1 ? "page" : true) : undefined}
              className={`focus-marca flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] font-medium transition-colors ${
                ativa ? "text-brand" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${ativa ? "bg-brand/10" : ""}`}>
                <Icon size={18} aria-hidden />
              </span>
              <span className="max-w-full truncate">{seccao.curto}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}

/** Um destino na barra lateral. */
function LinkDaSidebar({
  destino, pathname,
}: {
  destino: (typeof DESTINOS_ADMIN)[number];
  pathname: string;
}) {
  const ativo = destinoAtivoAdmin(destino.href, pathname);
  const { Icon } = destino;
  return (
    <Link
      href={destino.href}
      title={destino.descricao}
      aria-current={ativo ? "page" : undefined}
      className={`focus-marca flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        ativo
          ? "bg-brand-light font-semibold text-brand-dark"
          : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
      }`}
    >
      <Icon size={17} className="shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{destino.label}</span>
    </Link>
  );
}

/**
 * A linha da secção, no telemóvel.
 *
 * São LIGAÇÕES e não separadores, e a diferença não é de estilo: cada uma
 * leva a um endereço próprio, com histórico e com «abrir noutro separador».
 * Um `role="tab"` prometeria um painel que muda no mesmo sítio, e não é
 * isso que acontece.
 *
 * Só aparece onde tem trabalho: numa secção de um só destino não há nada
 * para escolher, e a linha seria uma barra a repetir o nome do ecrã.
 */
function LinhaDaSeccao({
  seccao, pathname,
}: {
  seccao: SeccaoAdmin | undefined;
  pathname: string;
}) {
  if (!seccao || seccao.destinos.length === 1) return null;

  return (
    <nav aria-label={`Secção ${seccao.label}`} className="-mx-1 mb-5 lg:hidden">
      <ul className="flex gap-1.5 overflow-x-auto px-1 pb-1">
        {seccao.destinos.map((d) => {
          const ativo = destinoAtivoAdmin(d.href, pathname);
          const { Icon } = d;
          return (
            <li key={d.href}>
              <Link
                href={d.href}
                aria-current={ativo ? "page" : undefined}
                className={`focus-marca inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  ativo ? "bg-brand text-white" : "bg-white text-stone-600 hover:bg-stone-100"
                }`}
              >
                <Icon size={14} aria-hidden />
                {d.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AuthProvider>
  );
}
