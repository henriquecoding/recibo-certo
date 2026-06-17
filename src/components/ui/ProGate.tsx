"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkle } from "@/components/ui/Icons";
import { useSubscricao } from "@/lib/stripe/subscription";

// Bloqueio Pro contextual (abordagem mista): o conteúdo avançado continua
// presente, mas desfocado e inerte para quem não tem Pro, com uma camada de
// desbloqueio por cima. Mostra que a funcionalidade existe sem a esconder.
// As calculadoras base NÃO usam este gate — só extras claramente Pro.
export default function ProGate({
  title,
  description,
  children,
  cta = "Desbloquear com Pro",
  href = "/precos",
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  cta?: string;
  href?: string;
  className?: string;
}) {
  const { plano, carregado } = useSubscricao();

  // Enquanto o estado não carrega (ou já é Pro), mostra o conteúdo real.
  if (!carregado || plano === "pro") return <>{children}</>;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Pré-visualização real do que o Pro desbloqueia — desfocada e inerte
          (não recebe foco nem cliques; oculta de leitores de ecrã). */}
      <div inert aria-hidden className="pointer-events-none select-none blur-[5px] opacity-50">
        {children}
      </div>

      {/* Camada de desbloqueio */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/55 dark:bg-stone-900/60 p-6 text-center">
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
