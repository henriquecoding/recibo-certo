"use client";

import type { ComponentType } from "react";
import { ArrowRight, ShieldCheck, Bank, Building, FileSign, Heart, Invoice } from "@/components/ui/Icons";
import type { Partner } from "@/lib/partners";

const ICON_MAP: Record<Partner["icone"], ComponentType<{ size?: number; className?: string }>> = {
  bank: Bank,
  building: Building,
  "file-sign": FileSign,
  heart: Heart,
  invoice: Invoice,
};

export default function PartnerCard({
  partner,
  onDismiss,
}: {
  partner: Partner;
  onDismiss: () => void;
}) {
  const Icon = ICON_MAP[partner.icone];

  return (
    <div
      role="complementary"
      aria-label={`Parceiro recomendado: ${partner.nome}`}
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-500">
            <Icon size={19} />
          </span>
          <div>
            <div className="text-sm font-semibold text-stone-800">{partner.nome}</div>
            <div className="mt-0.5 flex items-center gap-1">
              <ShieldCheck size={11} className="text-brand" />
              <span className="text-[11px] text-stone-400">Parceiro verificado</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-medium uppercase tracking-widest text-stone-300">
            Parceiro
          </span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dispensar recomendação de parceiro"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-500"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden focusable={false}>
              <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-stone-500">{partner.descricao}</p>

      <a
        href={partner.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-stone-600 transition-all hover:gap-1.5 hover:text-stone-800"
      >
        {partner.cta}
        <ArrowRight size={11} />
      </a>
    </div>
  );
}
