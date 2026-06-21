"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { gerarPrazos, META_CATEGORIA, type CategoriaPrazo } from "@/lib/prazos";
import { ArrowRight } from "@/components/ui/Icons";

const DIAS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg → Dom

export default function MiniCalendario() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dados = useMemo(() => {
    if (!mounted) return null;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const prazos = gerarPrazos(ano).filter((p) => {
      const d = new Date(p.data + "T00:00:00");
      return d.getFullYear() === ano && d.getMonth() === mes;
    });
    const porDia = new Map<number, Set<CategoriaPrazo>>();
    prazos.forEach((p) => {
      const dia = new Date(p.data + "T00:00:00").getDate();
      const set = porDia.get(dia) ?? new Set<CategoriaPrazo>();
      set.add(p.categoria);
      porDia.set(dia, set);
    });
    const offset = (new Date(ano, mes, 1).getDay() + 6) % 7; // segunda = 0
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const celulas: (number | null)[] = [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
    ];
    const titulo = new Date(ano, mes, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    return { celulas, porDia, hojeDia: hoje.getDate(), titulo };
  }, [mounted]);

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize text-stone-700 dark:text-stone-200">{dados?.titulo ?? "Calendário"}</h2>
        <Link href="/dashboard/prazos" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark">
          Prazos <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold uppercase text-stone-300 dark:text-stone-600">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {(dados?.celulas ?? []).map((dia, i) => {
          if (dia === null) return <div key={`v-${i}`} className="aspect-square" />;
          const cats = dados!.porDia.get(dia);
          const ehHoje = dia === dados!.hojeDia;
          return (
            <div
              key={dia}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${
                ehHoje ? "bg-brand font-semibold text-white" : "text-stone-600 dark:text-stone-300"
              }`}
            >
              {dia}
              {cats && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {[...cats].slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="h-1 w-1 rounded-full"
                      style={{ background: ehHoje ? "rgba(255,255,255,0.9)" : META_CATEGORIA[c].cor }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-stone-100 dark:border-stone-800 pt-3">
        {Object.values(META_CATEGORIA).map((m) => (
          <span key={m.label} className="flex items-center gap-1 text-[10px] text-stone-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.cor }} /> {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
