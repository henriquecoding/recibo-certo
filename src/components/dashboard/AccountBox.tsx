"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { User, ShieldCheck, ChevronRight, LogOut } from "@/components/ui/Icons";
import { useEffect, useState } from "react";
import { verificarAdmin } from "@/lib/supabase/admin";
import { obterPerfil, type DadosPerfil } from "@/lib/supabase/profile";

function PlanoBadge() {
  const { plano } = useSubscricao();
  if (plano === "pro") {
    return (
      <span className="inline-flex items-center rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
        Pro
      </span>
    );
  }
  return (
    <Link
      href="/dashboard/upgrade"
      className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-500 transition-colors hover:bg-brand-light hover:text-brand-dark"
    >
      Grátis
    </Link>
  );
}

export default function AccountBox() {
  const { user, carregado, disponivel, sair } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfil, setPerfil] = useState<DadosPerfil | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setPerfil(null); return; }
    verificarAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
    obterPerfil(user.id).then(setPerfil);
  }, [user]);

  if (disponivel && carregado && user) {
    const nomeDisplay = perfil?.nome || user.email?.split("@")[0] || "Utilizador";
    const inicial = (perfil?.nome || user.email || "U").charAt(0).toUpperCase();

    return (
      <div className="space-y-2.5">
        {/* Profile card */}
        <Link
          href="/dashboard/perfil"
          className="group flex items-center gap-3 rounded-2xl bg-stone-50 px-3.5 py-3 transition-colors hover:bg-stone-100 dark:bg-stone-800/50 dark:hover:bg-stone-800"
        >
          {/* Avatar */}
          <div className="relative h-10 w-10 flex-shrink-0">
            {perfil?.avatarUrl ? (
              <Image
                src={perfil.avatarUrl}
                alt="Foto de perfil"
                fill
                className="rounded-xl object-cover"
                sizes="40px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark">
                <span className="text-sm font-semibold text-white">{inicial}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-stone-700 dark:text-stone-200">
                {nomeDisplay}
              </span>
              <PlanoBadge />
            </div>
            <p className="truncate text-xs text-stone-400" title={user.email ?? undefined}>
              {user.email}
            </p>
          </div>

          <ChevronRight size={14} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 px-1">
          <Link
            href="/dashboard/perfil"
            className="flex-1 rounded-xl bg-brand/10 px-3 py-2 text-center text-xs font-semibold text-brand-dark transition-colors hover:bg-brand/20 dark:text-brand"
          >
            Gerir perfil
          </Link>
          <button
            type="button"
            onClick={sair}
            aria-label="Sair da conta"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <LogOut size={15} />
          </button>
        </div>

        {isAdmin && (
          <Link
            href="/admin"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/20 bg-brand-light px-3.5 py-2.5 text-xs font-semibold text-brand-dark transition-all hover:bg-brand hover:text-white hover:shadow-glow"
          >
            <ShieldCheck size={14} />
            Painel de administração
          </Link>
        )}
      </div>
    );
  }

  const { abrirModal } = useAuth();

  return (
    <div className="space-y-2">
      {disponivel && (
        <button
          type="button"
          onClick={() => abrirModal("entrar")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <User size={15} />
          Entrar ou criar conta
        </button>
      )}
      <p className="px-1 text-[11px] leading-snug text-stone-400">
        {disponivel
          ? "Sem conta, os dados ficam só neste dispositivo."
          : "Modo local — dados só neste dispositivo."}
      </p>
    </div>
  );
}
