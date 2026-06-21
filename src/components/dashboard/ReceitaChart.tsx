"use client";

import { calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { fmt } from "@/lib/format";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function ReceitaChart({ recibos }: { recibos: Recibo[] }) {
  const ano = new Date().getFullYear();
  const porMes = Array.from({ length: 12 }, () => 0);
  recibos.forEach((r) => {
    const d = new Date(r.data + "T00:00:00");
    if (d.getFullYear() === ano) porMes[d.getMonth()] += calcularRecibo(r).bruto;
  });
  const max = Math.max(...porMes, 1);
  const total = porMes.reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Receita de {ano}</h2>
        <span className="font-display text-lg font-semibold text-brand">{fmt(total)}</span>
      </div>
      {/* Sem items-end na linha: as colunas esticam à altura (h-40) e as barras
          ganham uma área não-nula para a sua % de altura. */}
      <div className="flex h-40 gap-1.5">
        {porMes.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition-[height] duration-700 ease-out ${
                  v > 0 ? "bg-brand/85 hover:bg-brand" : "bg-stone-100 dark:bg-stone-800"
                }`}
                style={{ height: `${Math.max((v / max) * 100, v > 0 ? 8 : 2)}%` }}
                title={`${MESES[i]}: ${fmt(v)}`}
              />
            </div>
            <span className="text-[10px] text-stone-400">{MESES[i][0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
