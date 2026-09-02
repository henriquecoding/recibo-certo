"use client";

// ─────────────────────────────────────────────────────────────────────────
//  O cartão de uma etapa do negócio — ESTADO, não anúncio.
//
//  A diferença é toda: um anúncio diz o que a ferramenta faz e é igual
//  para toda a gente; um cartão de estado diz onde é que ESTA pessoa
//  ficou. O primeiro pertence às páginas públicas, que existem para captar
//  intenção. O segundo é a razão de haver painel.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import DataRelativa from "@/components/dashboard/DataRelativa";
import type { EtapaNegocio } from "@/lib/dashboard/etapas";
import type { ItemNavDashboard } from "@/lib/dashboard/navegacao";
import { ROTULO_ESTADO, type ItemTrabalho } from "@/lib/dashboard/work-items/tipos";

export default function CartaoEtapa({
  destino,
  etapa,
  item,
}: {
  destino: ItemNavDashboard;
  etapa: EtapaNegocio;
  item: ItemTrabalho | null;
}) {
  const Icone = iconeDe(destino.icone);
  const accao = item ? item.proximaAccao : { label: etapa.vazio.label, href: destino.href };

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">{destino.label}</h3>
          {item ? (
            <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{item.titulo}</p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{etapa.resultado}</p>
          )}
        </div>
      </div>

      <div className="mt-3 min-h-[2.25rem]">
        {item ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* O estado tem SEMPRE rótulo em texto: uma cor sozinha não é
                informação para quem não a distingue (WCAG 1.4.1). */}
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {ROTULO_ESTADO[item.estado]}
            </span>
            <DataRelativa iso={item.atualizadoEm} />
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {item.fonte === "conta" ? "Na tua conta" : "Neste dispositivo"}
            </span>
          </div>
        ) : (
          <p className="text-xs text-stone-400 dark:text-stone-500">{etapa.vazio.descricao}</p>
        )}
      </div>

      <Link
        href={accao.href}
        className="mt-4 inline-flex min-h-9 items-center gap-1.5 self-start rounded-xl bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand hover:text-white dark:bg-brand/10 dark:text-brand"
      >
        {accao.label}
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
