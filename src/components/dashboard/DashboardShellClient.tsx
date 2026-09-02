"use client";

// ─────────────────────────────────────────────────────────────────────────
//  A ILHA INTERATIVA DO PAINEL.
//
//  O `layout.tsx` era inteiro um Client Component: a moldura, a lista de
//  navegação e a `metadata` dependiam todas de um único componente
//  hidratado. Consequências práticas: o painel não conseguia declarar
//  `noindex` de forma estática (estava `index,follow` e a canonicalizar
//  para a homepage, ver §4.7 do relatório), e a lista de destinos só
//  existia depois de o JavaScript correr.
//
//  Passam a ser duas coisas:
//    · `app/dashboard/layout.tsx` — servidor: metadata, `<main>`, skip link;
//    · este ficheiro — o que precisa mesmo de estado: rota ativa, grupos
//      recolhíveis, menu do telemóvel e sessão.
//
//  O objetivo não é eliminar JavaScript. É que a moldura e os metadados
//  deixem de depender dele.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Logo, ShieldCheck, User as IconeUser } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { BuscaTrigger } from "@/components/busca/BuscaTrigger";
import { useAuth } from "@/lib/supabase/auth";
import { verificarAdmin } from "@/lib/supabase/admin";
import { obterPerfil } from "@/lib/supabase/profile";
import MotionProvider from "@/components/ui/motion/MotionProvider";
import { PerfilProvider } from "@/lib/perfil";
import Sidebar from "@/components/dashboard/Sidebar";
import NavMovelDashboard from "@/components/dashboard/NavMovelDashboard";

function LigacaoAdmin() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setAdmin(false);
      return;
    }
    verificarAdmin(user.id)
      .then(setAdmin)
      .catch((erro) => {
        console.error("[painel] verificarAdmin falhou", erro);
        setAdmin(false);
      });
  }, [user]);

  if (!admin) return null;
  return (
    <Link
      href="/admin"
      aria-label="Painel de administração"
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
    >
      <ShieldCheck size={16} />
    </Link>
  );
}

export default function DashboardShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/dashboard";
  const [menuAberto, setMenuAberto] = useState(false);
  const { user, sair } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!user) {
      setAvatarUrl("");
      return;
    }
    // Mostra já a foto do OAuth, se existir, e prefere a do perfil quando
    // esta chegar.
    const meta = (user.user_metadata?.avatar_url || user.user_metadata?.picture || "") as string;
    if (meta) setAvatarUrl(meta);
    obterPerfil(user.id)
      .then((p) => {
        if (p.avatarUrl) setAvatarUrl(p.avatarUrl);
      })
      .catch((erro) => console.error("[painel] obterPerfil falhou", erro));
  }, [user]);

  // Fecha o menu ao mudar de rota.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  const fecharMenu = useCallback(() => setMenuAberto(false), []);
  const abrirMenu = useCallback(() => setMenuAberto(true), []);

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[272px_1fr]">
      <Sidebar pathname={pathname} />

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-100 bg-cream/85 px-5 py-3.5 backdrop-blur-xl lg:hidden dark:border-stone-800">
        <Link href="/" aria-label="Recibo Certo — início">
          <Logo small />
        </Link>
        <div className="flex items-center gap-2">
          <BuscaTrigger compacto />
          <LigacaoAdmin />
          <ThemeToggle />
          <Link
            href="/dashboard/perfil"
            aria-label="Perfil"
            className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-brand transition-colors hover:bg-brand hover:text-white"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Perfil" fill className="rounded-xl object-cover" sizes="36px" unoptimized />
            ) : (
              <IconeUser size={16} />
            )}
          </Link>
        </div>
      </header>

      <main id="conteudo-painel" className="min-h-screen p-5 pb-24 sm:p-6 lg:p-10 lg:pb-10">
        <PerfilProvider>
          <MotionProvider>{children}</MotionProvider>
        </PerfilProvider>
      </main>

      <NavMovelDashboard
        pathname={pathname}
        menuAberto={menuAberto}
        abrirMenu={abrirMenu}
        fecharMenu={fecharMenu}
        user={user}
        avatarUrl={avatarUrl}
        sair={sair}
      />
    </div>
  );
}
