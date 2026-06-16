"use client";

import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { User, ShieldCheck } from "@/components/ui/Icons";
import { useEffect, useState } from "react";
import { verificarAdmin } from "@/lib/supabase/admin";

function PlanoBadge() {
  const { plano } = useSubscricao();
  if (plano === "pro") {
    return (
      <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[9px] font-semibold text-white">
        Pro
      </span>
    );
  }
  return (
    <Link
      href="/dashboard/upgrade"
      className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold text-stone-500 transition-colors hover:bg-brand-light hover:text-brand-dark"
    >
      Grátis
    </Link>
  );
}

export default function AccountBox() {
  const { user, carregado, disponivel, sair } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    verificarAdmin(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user]);

  if (disponivel && carregado && user) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <User size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-600">Conta</span>
              <PlanoBadge />
            </div>
            <p className="truncate text-[10px] text-stone-400" title={user.email ?? undefined}>
              {user.email}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-[10px]">
            <Link href="/dashboard/conta" className="font-medium text-brand-dark transition-colors hover:underline">
              Gerir
            </Link>
            <button
              type="button"
              onClick={sair}
              className="font-medium text-stone-400 transition-colors hover:text-stone-600"
            >
              Sair
            </button>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/20 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark transition-all hover:bg-brand hover:text-white hover:shadow-glow"
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
