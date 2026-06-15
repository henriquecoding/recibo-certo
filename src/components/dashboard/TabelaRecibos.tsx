"use client";

import Link from "next/link";
import { calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { fmt } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";
import { META_TIPO } from "@/lib/fiscal-data";

export default function TabelaRecibos({ recibos }: { recibos: Recibo[] }) {
  const recentes = recibos.slice(0, 6);

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card" style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">Recibos recentes</h2>
        <Link href="/dashboard/recibos" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {recentes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-stone-500">Ainda sem recibos.</p>
          <Link href="/dashboard/recibos" className="mt-2 text-sm font-semibold text-brand hover:text-brand-dark">
            Registar o primeiro →
          </Link>
        </div>
      ) : (
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              <th className="px-2 pb-2 font-semibold">Cliente</th>
              <th className="hidden px-2 pb-2 font-semibold sm:table-cell">Data</th>
              <th className="hidden px-2 pb-2 font-semibold md:table-cell">Tipo</th>
              <th className="px-2 pb-2 text-right font-semibold">Valor</th>
              <th className="px-2 pb-2 text-right font-semibold">Líquido</th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((r) => {
              const c = calcularRecibo(r);
              return (
                <tr key={r.id} className="border-t border-stone-50">
                  <td className="px-2 py-2.5">
                    <span className="text-sm font-medium text-stone-800">{r.cliente || "Sem nome"}</span>
                    <span className="block text-[11px] text-stone-400 sm:hidden">{r.data}</span>
                  </td>
                  <td className="hidden px-2 py-2.5 text-sm text-stone-500 sm:table-cell">{r.data}</td>
                  <td className="hidden px-2 py-2.5 md:table-cell">
                    <Badge tone="neutral">{META_TIPO[r.tipo].label}</Badge>
                  </td>
                  <td className="px-2 py-2.5 text-right text-sm font-medium tabular-nums text-stone-700">{fmt(r.valor)}</td>
                  <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-brand">{fmt(c.liquido)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
