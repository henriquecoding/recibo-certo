"use client";

import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";

// Caixa de estado de conta na barra lateral. Ciente da sessão: mostra o modo
// local (sem conta) ou a conta iniciada, sempre com acesso ao ecrã /dashboard/conta.
export default function AccountBox() {
  const { user, carregado, disponivel, sair } = useAuth();

  if (disponivel && carregado && user) {
    return (
      <div className="rounded-xl bg-cream px-3.5 py-2.5">
        <div className="mb-0.5 text-xs font-semibold text-stone-600">Conta na nuvem</div>
        <p className="truncate text-[11px] text-stone-400" title={user.email ?? undefined}>{user.email}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
          <Link href="/dashboard/conta" className="font-medium text-brand-dark hover:underline">Gerir</Link>
          <span className="text-stone-300">·</span>
          <button type="button" onClick={sair} className="font-medium text-stone-400 transition-colors hover:text-stone-600">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-cream px-3.5 py-2.5">
      <div className="mb-0.5 text-xs font-semibold text-stone-600">Modo local</div>
      <p className="text-[11px] leading-snug text-stone-400">Os dados ficam só neste dispositivo.</p>
      {disponivel && (
        <Link href="/dashboard/conta" className="mt-1.5 inline-block text-[11px] font-medium text-brand-dark hover:underline">
          Entrar na nuvem
        </Link>
      )}
    </div>
  );
}
