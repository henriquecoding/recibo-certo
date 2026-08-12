"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Painel de gestão do contabilista — a fronteira de entrada
//  ---------------------------------------------------------------------
//  Este guarda é conveniência, não segurança. Quem autoriza é a RLS da
//  migração 042: conhecer o URL não dá acesso a dados nenhuns, porque cada
//  consulta à base de dados é filtrada pela identidade de quem a faz.
//  O que isto evita é mostrar um painel vazio a quem não devia estar cá.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { obterMinhaFicha } from "@/lib/contabilistas/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import {
  Logo, LayoutGrid, Calendar, User, PaperClip, Gift, Settings, ArrowLeft, Warning,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Button from "@/components/ui/Button";

interface Item {
  href: string;
  label: string;
  curto: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

const NAV: Item[] = [
  { href: "/contabilista", label: "Hoje", curto: "Hoje", Icon: LayoutGrid },
  { href: "/contabilista/agenda", label: "Agenda", curto: "Agenda", Icon: Calendar },
  { href: "/contabilista/clientes", label: "Clientes", curto: "Clientes", Icon: User },
  { href: "/contabilista/partilhas", label: "Partilhas", curto: "Partilhas", Icon: PaperClip },
  { href: "/contabilista/fidelidade", label: "Fidelidade", curto: "Fidelidade", Icon: Gift },
  { href: "/contabilista/perfil", label: "Perfil público", curto: "Perfil", Icon: Settings },
];

export default function ContabilistaLayout({ children }: { children: ReactNode }) {
  const { user, carregado, disponivel, abrirModal } = useAuth();
  const pathname = usePathname();
  const [ficha, setFicha] = useState<Contabilista | null>(null);
  const [aVerificar, setAVerificar] = useState(true);

  useEffect(() => {
    if (!carregado) return;
    if (!user || !disponivel) { setAVerificar(false); return; }
    let vivo = true;
    obterMinhaFicha(user.id)
      .then((f) => { if (vivo) setFicha(f); })
      .catch(() => { if (vivo) setFicha(null); })
      .finally(() => { if (vivo) setAVerificar(false); });
    return () => { vivo = false; };
  }, [carregado, user, disponivel]);

  if (!carregado || aVerificar) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand-light" />
      </div>
    );
  }

  if (!user) return <Portao titulo="Entra na tua conta" texto="O painel de gestão precisa de sessão iniciada." acao={<Button onClick={() => abrirModal("entrar")}>Entrar</Button>} />;

  if (!ficha) {
    return (
      <Portao
        titulo="Ainda não tens conta de contabilista"
        texto="Qualquer pessoa se pode candidatar. A administração analisa e responde — podes anexar comprovativos ou tratar disso por email."
        acao={<Link href="/contabilistas/candidatura"><Button>Pedir acesso</Button></Link>}
      />
    );
  }

  if (ficha.estado !== "aprovado") {
    const texto =
      ficha.estado === "suspenso"
        ? "A tua conta está suspensa. Vê o email de contacto ou fala com a administração para perceber porquê."
        : "A tua candidatura ainda está a ser analisada. Avisamos-te assim que houver decisão.";
    return <Portao titulo="Acesso em espera" texto={texto} acao={<Link href="/dashboard"><Button variant="secondary">Voltar ao painel</Button></Link>} />;
  }

  return (
    <div className="min-h-[100dvh] bg-cream">
      {/* Cabeçalho. No telemóvel só a marca e o tema; a navegação vive em baixo. */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/contabilista" className="flex min-w-0 items-center gap-2.5">
            <Logo small />
            <span className="truncate text-sm font-semibold text-ink">{ficha.nome}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/dashboard"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 sm:inline-flex sm:items-center sm:gap-1.5"
            >
              <ArrowLeft size={15} aria-hidden /> A minha conta
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <nav aria-label="Painel de contabilista" className="hidden border-t border-stone-100 lg:block">
          <ul className="mx-auto flex max-w-6xl gap-1 px-4">
            {NAV.map(({ href, label, Icon }) => {
              const ativo = href === "/contabilista" ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                      ativo
                        ? "border-brand text-brand-dark"
                        : "border-transparent text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-16">{children}</main>

      {/* Navegação de telemóvel: barra inferior, alvos ≥ 44px, safe-area. */}
      <nav
        aria-label="Painel de contabilista"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-6">
          {NAV.map(({ href, curto, Icon }) => {
            const ativo = href === "/contabilista" ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[0.625rem] font-medium leading-tight transition-colors ${
                    ativo ? "text-brand-dark" : "text-stone-400"
                  }`}
                >
                  <Icon size={19} aria-hidden />
                  <span className="truncate">{curto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Portao({ titulo, texto, acao }: { titulo: string; texto: string; acao: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card sm:p-8">
        <Warning size={26} className="mx-auto text-stone-300" aria-hidden />
        <h1 className="mt-4 font-display text-2xl text-ink">{titulo}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-500">{texto}</p>
        <div className="mt-6 flex justify-center">{acao}</div>
      </div>
    </div>
  );
}
