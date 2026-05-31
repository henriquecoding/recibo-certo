"use client";

import { useMemo, useState } from "react";
import { diasAte, META_CATEGORIA, type Prazo } from "@/lib/prazos";
import { ArrowLeft, ArrowRight } from "@/components/ui/Icons";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const isoOf = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const hojeIso = () => {
  const d = new Date();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
};

export default function CalendarioPrazos({ prazos }: { prazos: Prazo[] }) {
  const inicio = new Date();
  const [ano, setAno] = useState(inicio.getFullYear());
  const [mes, setMes] = useState(inicio.getMonth());
  const [selecionado, setSelecionado] = useState<string>(hojeIso());

  // Mapa data → prazos para lookup rápido.
  const porData = useMemo(() => {
    const m = new Map<string, Prazo[]>();
    prazos.forEach((p) => {
      const arr = m.get(p.data) ?? [];
      arr.push(p);
      m.set(p.data, arr);
    });
    return m;
  }, [prazos]);

  const primeiroDiaSemana = (new Date(ano, mes, 1).getDay() + 6) % 7; // segunda = 0
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  const navegar = (delta: number) => {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  };

  const tituloMes = new Date(ano, mes, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const hoje = hojeIso();
  const prazosSelecionados = porData.get(selecionado) ?? [];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      {/* Grelha do mês */}
      <div className="p-5 rounded-2xl bg-white border border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-stone-800 capitalize">{tituloMes}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navegar(-1)}
              aria-label="Mês anterior"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setAno(inicio.getFullYear()); setMes(inicio.getMonth()); setSelecionado(hoje); }}
              className="px-3 h-9 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => navegar(1)}
              aria-label="Mês seguinte"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-stone-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid">
          {celulas.map((dia, i) => {
            if (dia === null) return <div key={`v-${i}`} className="aspect-square" />;
            const iso = isoOf(ano, mes, dia);
            const doDia = porData.get(iso) ?? [];
            const ehHoje = iso === hoje;
            const ativo = iso === selecionado;
            const categorias = [...new Set(doDia.map((p) => p.categoria))];
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelecionado(iso)}
                aria-pressed={ativo}
                aria-label={`${dia} — ${doDia.length} ${doDia.length === 1 ? "prazo" : "prazos"}`}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-all relative ${
                  ativo
                    ? "bg-brand text-white"
                    : ehHoje
                      ? "bg-brand-light text-brand-dark font-semibold"
                      : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span>{dia}</span>
                {categorias.length > 0 && (
                  <span className="flex gap-0.5">
                    {categorias.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: ativo ? "rgba(255,255,255,0.9)" : META_CATEGORIA[c].cor }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-stone-100">
          {Object.values(META_CATEGORIA).map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: m.cor }} />
              <span className="text-xs text-stone-500">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe do dia selecionado */}
      <div className="p-5 rounded-2xl bg-white border border-stone-100 lg:sticky lg:top-6">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-1">
          {new Date(selecionado + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
        </div>
        <h3 className="font-display text-lg font-semibold text-stone-800 mb-4">
          {prazosSelecionados.length === 0
            ? "Sem prazos"
            : `${prazosSelecionados.length} ${prazosSelecionados.length === 1 ? "prazo" : "prazos"}`}
        </h3>

        {prazosSelecionados.length === 0 ? (
          <p className="text-sm text-stone-400">Dia livre de obrigações fiscais.</p>
        ) : (
          <ul className="space-y-3">
            {prazosSelecionados.map((p) => {
              const dias = diasAte(p.data);
              const meta = META_CATEGORIA[p.categoria];
              return (
                <li key={p.id} className="pl-3 border-l-2" style={{ borderColor: meta.cor }}>
                  <div className="text-xs font-medium" style={{ color: meta.cor }}>{meta.label}</div>
                  <div className="text-sm font-semibold text-stone-800">{p.titulo}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{p.descricao}</div>
                  <div className="text-xs text-stone-400 mt-1">
                    {dias === 0 ? "Hoje" : dias > 0 ? `Daqui a ${dias} dias` : `Há ${Math.abs(dias)} dias`}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
