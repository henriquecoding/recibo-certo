"use client";

import type { ReactNode } from "react";
import { ArrowRight, Spinner } from "@/components/ui/Icons";
import FizLogo from "./FizLogo";

// ─────────────────────────────────────────────────────────────────────────
//  Botão de ação FIZ.
//  Usa o amarelo da marca FIZ como preenchimento com tinta escura por cima
//  (o amarelo #FAC72B não tem contraste suficiente para texto branco). O
//  verde da marca ReciboCerto fica reservado às ações próprias — o
//  utilizador distingue sempre quem executa o quê.
// ─────────────────────────────────────────────────────────────────────────

interface FizActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  ocupado?: boolean;
  desativado?: boolean;
  variante?: "primaria" | "secundaria";
  className?: string;
}

export default function FizActionButton({
  children,
  onClick,
  href,
  ocupado = false,
  desativado = false,
  variante = "primaria",
  className = "",
}: FizActionButtonProps) {
  const base =
    "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-fiz-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

  const estilo =
    variante === "primaria"
      ? "bg-fiz text-fiz-ink shadow-card hover:brightness-95 active:brightness-90"
      : "border border-fiz-300 bg-white text-fiz-900 hover:bg-fiz-50 dark:bg-stone-900";

  const conteudo = (
    <>
      {ocupado ? (
        <Spinner size={16} className="animate-spin" />
      ) : (
        <FizLogo size={16} className="rounded-[0.25em]" decorativo />
      )}
      <span>{children}</span>
      {!ocupado && <ArrowRight size={15} className="flex-shrink-0" />}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className={`${base} ${estilo} ${className}`}
      >
        {conteudo}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={desativado || ocupado} className={`${base} ${estilo} ${className}`}>
      {conteudo}
    </button>
  );
}
