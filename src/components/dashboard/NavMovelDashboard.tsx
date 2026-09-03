"use client";

// ─────────────────────────────────────────────────────────────────────────
//  A NAVEGAÇÃO DO TELEMÓVEL — cinco lugares, e o terceiro é o negócio.
//
//  A barra anterior era Início · Cenários · Prazos · IRS · Menu: quatro
//  destinos de gestão fiscal e nenhum caminho para Descobrir, Preços,
//  Projeto ou Contratação. Quem chegasse ao painel vindo de uma dessas
//  ferramentas não tinha, no telemóvel, como voltar ao que tinha começado.
//
//  Passa a haver um lugar para as quatro etapas: `/dashboard/construir`.
//  É uma ROTA e não uma folha porque uma rota é ligável, tem botão
//  «voltar», tem estado vazio e mede-se — uma folha não tem nada disso.
//
//  O que aqui não muda, porque já estava certo: o menu completo é um
//  diálogo modal a sério, com foco preso, `Escape` a fechar e o foco
//  devolvido a quem o abriu.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Close, Menu, LogOut } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BotaoNovidades from "@/components/novidades/BotaoNovidades";
import LinkNav from "@/components/dashboard/LinkNav";
import {
  GRUPOS_DASHBOARD,
  ITENS_CONTA,
  ITENS_EXPLORAR,
  SLOTS_MOVEL_DASHBOARD,
  itemAtivoDashboard,
} from "@/lib/dashboard/navegacao";

export default function NavMovelDashboard({
  pathname,
  menuAberto,
  abrirMenu,
  fecharMenu,
  user,
  avatarUrl,
  sair,
}: {
  pathname: string;
  menuAberto: boolean;
  abrirMenu: () => void;
  fecharMenu: () => void;
  user: User | null;
  avatarUrl: string;
  sair: () => void;
}) {
  const ativo = itemAtivoDashboard(pathname);
  const painelRef = useRef<HTMLDivElement | null>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!menuAberto) return;

    focoAnteriorRef.current = document.activeElement as HTMLElement | null;
    const painel = painelRef.current;

    const focaveis = () =>
      Array.from(
        painel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    focaveis()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        fecharMenu();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = focaveis();
      if (lista.length === 0) return;
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const foco = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (foco === primeiro || !painel?.contains(foco))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (foco === ultimo || !painel?.contains(foco))) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = anterior;
      focoAnteriorRef.current?.focus?.();
    };
  }, [menuAberto, fecharMenu]);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-stone-800 dark:bg-stone-900/95"
        aria-label="Navegação principal"
      >
        {SLOTS_MOVEL_DASHBOARD.map((item) => {
          const aceso = ativo?.id === item.id || (item.id === "construir" && pathname.startsWith("/dashboard/construir"));
          const Icone = iconeDe(item.icone);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={aceso ? "page" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 py-2 texto-mini font-medium transition-colors motion-reduce:transition-none ${
                aceso ? "text-brand" : "text-stone-500 hover:text-stone-700 dark:text-stone-400"
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${aceso ? "bg-brand/10" : ""}`}>
                <Icone size={19} />
              </span>
              {item.curto}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={abrirMenu}
          aria-haspopup="dialog"
          aria-expanded={menuAberto}
          aria-label="Abrir menu completo"
          className={`flex min-h-11 flex-col items-center justify-center gap-1 py-2 texto-mini font-medium transition-colors motion-reduce:transition-none ${
            menuAberto ? "text-brand" : "text-stone-500 hover:text-stone-700 dark:text-stone-400"
          }`}
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${menuAberto ? "bg-brand/10" : ""}`}>
            <Menu size={19} />
          </span>
          Menu
        </button>
      </nav>

      {menuAberto && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fecharMenu} aria-hidden />
          <div
            ref={painelRef}
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-4xl bg-cream shadow-float dark:bg-stone-950"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <Menu size={16} />
                </span>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Tudo o que tens</p>
              </div>
              <button
                type="button"
                onClick={fecharMenu}
                aria-label="Fechar menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                <Close size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {/* Na folha os grupos estão TODOS abertos: aqui não há coluna
                  permanente a defender, e quem a abriu já pediu para ver
                  tudo. O recolhimento é da sidebar, não da navegação. */}
              {GRUPOS_DASHBOARD.map((grupo) => (
                <div key={grupo.id}>
                  <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {grupo.titulo}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {grupo.itens.map((item) => (
                      <li key={item.id}>
                        <LinkNav
                          item={item}
                          ativo={ativo?.id === item.id}
                          aoNavegar={fecharMenu}
                          variante={grupo.recolhivel ? "secundario" : "principal"}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div>
                <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Explorar
                </p>
                <ul className="flex flex-col gap-0.5">
                  {ITENS_EXPLORAR.map((item) => (
                    <li key={item.id}>
                      <LinkNav item={item} ativo={false} aoNavegar={fecharMenu} variante="secundario" />
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Conta
                </p>
                <ul className="flex flex-col gap-0.5">
                  {ITENS_CONTA.map((item) => (
                    <li key={item.id}>
                      <LinkNav item={item} ativo={ativo?.id === item.id} aoNavegar={fecharMenu} variante="secundario" />
                    </li>
                  ))}
                </ul>
              </div>

              {user && (
                <div className="rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                  <div className="mb-2.5 flex items-center gap-3">
                    <div className="relative h-10 w-10 flex-shrink-0">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="Perfil" fill className="rounded-xl object-cover" sizes="40px" unoptimized />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark">
                          <span className="text-sm font-semibold text-white">
                            {(user.email || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-700 dark:text-stone-200">
                        {user.email?.split("@")[0] || "Utilizador"}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      fecharMenu();
                      sair();
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-stone-700 dark:text-stone-400"
                  >
                    <LogOut size={14} />
                    Terminar sessão
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
                <Link
                  href="/"
                  onClick={fecharMenu}
                  className="flex min-h-9 items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400"
                >
                  <ArrowLeft size={13} /> Voltar ao site
                </Link>
                <div className="flex items-center gap-1.5">
                  {/* Ao lado do tema, como em todo o resto do produto — e a
                      folha fecha antes de pedir, porque o painel é modal. */}
                  <BotaoNovidades aoAbrir={fecharMenu} />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
