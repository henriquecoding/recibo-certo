"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Uma linha de navegação do painel — partilhada pela sidebar e pela folha
//  do telemóvel, para as duas nunca poderem divergir na aparência nem no
//  que anunciam.
//
//  O alvo tem 44 px de altura na navegação principal (§8.3 do relatório;
//  WCAG 2.5.5 AAA e o mínimo do iOS), acima dos 36 px que valem para o
//  resto do produto. O rótulo não trunca sem alternativa: o `title` leva o
//  nome inteiro quando a largura não chegar.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowLeft } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import type { ItemNavDashboard } from "@/lib/dashboard/navegacao";

export default function LinkNav({
  item,
  ativo,
  aoNavegar,
  variante = "principal",
}: {
  item: ItemNavDashboard;
  ativo: boolean;
  aoNavegar?: () => void;
  variante?: "principal" | "secundario";
}) {
  const Icone = iconeDe(item.icone);
  return (
    <Link
      href={item.href}
      onClick={aoNavegar}
      aria-current={ativo ? "page" : undefined}
      title={item.label}
      className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-150 motion-reduce:transition-none ${
        ativo
          ? "bg-brand font-semibold text-white shadow-sm"
          : variante === "secundario"
            ? "text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200"
            : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-stone-100"
      }`}
    >
      <Icone size={18} className="flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.externo && !ativo && (
        <ArrowLeft size={13} className="flex-shrink-0 -rotate-[135deg] text-stone-300 dark:text-stone-600" aria-hidden />
      )}
    </Link>
  );
}
