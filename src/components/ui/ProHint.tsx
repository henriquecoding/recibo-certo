"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import { useSubscricao } from "@/lib/stripe/subscription";
import type { Entitlement } from "@/lib/entitlements";

const KEY = (id: string) => `recibocerto:prohint:${id}`;

export default function ProHint({
  id,
  icon,
  children,
  cta = "Conhecer o Plus",
  href = "/dashboard/upgrade",
  className = "",
  requer = "export.bundle",
}: {
  id: string;
  icon?: ReactNode;
  children: ReactNode;
  cta?: string;
  href?: string;
  className?: string;
  /** Permissão que, quando existe, dispensa a dica. */
  requer?: Entitlement;
}) {
  const { pode } = useSubscricao();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (pode(requer)) return;
    try {
      setVisivel(localStorage.getItem(KEY(id)) !== "1");
    } catch {
      setVisivel(true);
    }
  }, [id, pode, requer]);

  if (!visivel) return null;

  const dispensar = () => {
    try {
      localStorage.setItem(KEY(id), "1");
    } catch {
      /* localStorage indisponível — apenas esconde nesta sessão */
    }
    setVisivel(false);
  };

  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-light px-4 py-3 dark:bg-brand/10 dark:border-brand/20 ${className}`}>
      {icon && <span className="mt-0.5 flex-shrink-0 text-brand">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-brand-dark dark:text-brand">{children}</p>
        <Link href={href} className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-dark hover:gap-1.5 transition-all dark:text-brand">
          {cta}
          <ArrowRight size={13} />
        </Link>
      </div>
      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar sugestão"
        className="flex-shrink-0 rounded-lg p-1 text-brand-dark/60 transition-colors hover:bg-white/40 hover:text-brand-dark dark:text-brand/60 dark:hover:bg-stone-800/50 dark:hover:text-brand"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
