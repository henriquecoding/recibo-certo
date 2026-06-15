"use client";

import { useState } from "react";
import { Copy, Check, Link as LinkIcon } from "@/components/ui/Icons";

interface AfiliadoCardProps {
  codigoAfiliado?: string;
  totalReferidos?: number;
  comissaoPendente?: number;
}

export default function AfiliadoCard({
  codigoAfiliado = "RC-DEMO",
  totalReferidos = 0,
  comissaoPendente = 0,
}: AfiliadoCardProps) {
  const [copiado, setCopiado] = useState(false);

  const linkAfiliado = `https://recibocerto.pt/?ref=${codigoAfiliado}`;

  function copiar() {
    navigator.clipboard.writeText(linkAfiliado).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Programa de afiliados
        </h2>
        <p className="mt-0.5 text-xs text-stone-400">
          Partilha o ReciboCerto e ganha comissao por cada referido.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50">
        <LinkIcon size={16} className="flex-shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-600 dark:text-stone-300">
          {linkAfiliado}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="flex-shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700"
          aria-label={copiado ? "Link copiado" : "Copiar link de afiliado"}
        >
          {copiado ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
          <p className="text-[11px] text-stone-400">Referidos</p>
          <p className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
            {totalReferidos}
          </p>
        </div>
        <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
          <p className="text-[11px] text-stone-400">Comissao pendente</p>
          <p className="font-display text-lg font-semibold text-brand">
            {comissaoPendente.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </p>
        </div>
      </div>
    </div>
  );
}
