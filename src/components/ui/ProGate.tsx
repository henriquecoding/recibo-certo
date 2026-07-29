"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkle } from "@/components/ui/Icons";
import { useSubscricao } from "@/lib/stripe/subscription";
import type { Entitlement } from "@/lib/entitlements";

// Bloqueio Pro contextual (abordagem mista): o conteúdo avançado continua
// presente, mas desfocado e inerte para quem não tem Pro, com uma camada de
// desbloqueio por cima. A camada fica EM FLUXO (define a altura do contentor) e
// a pré-visualização desfocada fica atrás, em absoluto — assim o texto nunca é
// cortado, em qualquer ecrã. As calculadoras base NÃO usam este gate.
export default function ProGate({
  title,
  description,
  children,
  cta = "Desbloquear com o Plus",
  href = "/precos",
  className = "",
  requer = "export.bundle",
}: {
  title: string;
  description: string;
  children: ReactNode;
  cta?: string;
  href?: string;
  className?: string;
  /** Permissão exigida. O valor por omissão cobre as exportações, que são
      o caso mais comum; funcionalidades específicas passam a sua. */
  requer?: Entitlement;
}) {
  const { pode, carregado } = useSubscricao();

  // O estado da subscrição vive num provider acima e é preenchido de forma
  // assíncrona. Como esta página tem ilhas `next/dynamic({ ssr:false })`, o
  // React pode hidratar esta subárvore DEPOIS de o provider já ter carregado —
  // e então o primeiro render do cliente (gate fechado) não coincidia com o
  // HTML do servidor (gate aberto), partindo a hidratação da página inteira.
  // Este `montado` é local: o seu efeito só corre depois de este componente
  // hidratar, pelo que o primeiro render é sempre igual ao do servidor.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Enquanto o estado não carrega (ou a permissão existe), mostra o conteúdo real.
  if (!montado || !carregado || pode(requer)) return <>{children}</>;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 ${className}`}>
      {/* Pré-visualização real, desfocada e inerte — atrás da camada. */}
      <div inert aria-hidden className="pointer-events-none absolute inset-0 select-none blur-[5px] opacity-40">
        {children}
      </div>

      {/* Camada de desbloqueio — em fluxo, define a altura (não corta o texto). */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2 bg-white/55 px-5 py-7 text-center dark:bg-stone-900/55">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand">
          <Lock size={18} />
        </span>
        <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</h4>
        <p className="max-w-xs text-xs leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
        <Link
          href={href}
          className="btn-shine mt-1 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow transition-all hover:shadow-float"
        >
          <Sparkle size={13} />
          {cta}
        </Link>
      </div>
    </div>
  );
}
