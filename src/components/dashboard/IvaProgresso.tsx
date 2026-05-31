"use client";

import { m } from "motion/react";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { type Recibo } from "@/lib/store/recibos";
import { EASE } from "@/lib/motion";

export default function IvaProgresso({ recibos }: { recibos: Recibo[] }) {
  const ano = new Date().getFullYear();
  const faturado = recibos
    .filter((r) => new Date(r.data + "T00:00:00").getFullYear() === ano)
    .reduce((a, r) => a + r.valor, 0);
  const limite = IVA_ISENCAO_LIMITE.value;
  const pctv = Math.min(100, (faturado / limite) * 100);
  const restante = Math.max(0, limite - faturado);
  const perto = pctv >= 80;
  const ultrapassou = faturado > limite;

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
      <h2 className="mb-1 text-sm font-semibold text-stone-700">Limite de isenção de IVA</h2>
      <p className="mb-4 text-xs text-stone-400">
        {ultrapassou
          ? "Ultrapassaste o limite — passas ao regime normal de IVA."
          : `Faltam ${fmt(restante)} para teres de cobrar IVA.`}
      </p>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-2xl font-semibold text-stone-800">{fmt(faturado)}</span>
        <span className="text-xs text-stone-400">de {fmt(limite)}</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
        <m.div
          initial={{ width: "0%" }}
          whileInView={{ width: `${pctv}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className={`h-full rounded-full ${ultrapassou || perto ? "bg-alert-text" : "bg-brand"}`}
        />
      </div>
      <div className={`mt-2 text-right text-xs font-semibold ${ultrapassou || perto ? "text-alert-text" : "text-brand"}`}>
        {pctv.toFixed(0).replace(".", ",")}%
      </div>
    </div>
  );
}
