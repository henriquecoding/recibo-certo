"use client";

import { useEffect, useMemo, useState } from "react";
import { gerarPrazos, diasAte, META_CATEGORIA, type Prazo, type CategoriaPrazo } from "@/lib/prazos";
import CalendarioPrazos from "@/components/dashboard/CalendarioPrazos";
import { Calendar, LayoutGrid, BellAlert } from "@/components/ui/Icons";
import ProHint from "@/components/ui/ProHint";
import PartnerSpot from "@/components/dashboard/PartnerSpot";

const FILTROS: { id: CategoriaPrazo | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ss", label: "Segurança Social" },
  { id: "iva", label: "IVA" },
  { id: "irs", label: "IRS" },
];

type Vista = "calendario" | "lista";

export default function PrazosPage() {
  const [mounted, setMounted] = useState(false);
  const [filtro, setFiltro] = useState<CategoriaPrazo | "todos">("todos");
  const [vista, setVista] = useState<Vista>("calendario");

  useEffect(() => setMounted(true), []);

  const todos = useMemo<Prazo[]>(() => {
    if (!mounted) return [];
    const ano = new Date().getFullYear();
    return [...gerarPrazos(ano), ...gerarPrazos(ano + 1)];
  }, [mounted]);

  const filtrados = useMemo(
    () => todos.filter((p) => filtro === "todos" || p.categoria === filtro),
    [todos, filtro]
  );
  const proximos = useMemo(() => filtrados.filter((p) => diasAte(p.data) >= 0), [filtrados]);

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Calendário fiscal · {new Date().getFullYear()}</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Prazos fiscais</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">As obrigações que aí vêm. Nunca mais uma coima por esquecimento.</p>
        </div>
        {/* Alternar vista */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-700">
          {([
            { id: "calendario", label: "Calendário", Icon: Calendar },
            { id: "lista", label: "Lista", Icon: LayoutGrid },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={vista === id}
              onClick={() => setVista(id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                vista === id ? "bg-brand text-white" : "text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              filtro === f.id ? "bg-brand text-white" : "bg-white border border-stone-200 text-stone-500 hover:border-stone-300 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ProHint id="alertas-prazos" icon={<BellAlert size={18} />} cta="Ativar alertas (Pro)" className="mb-6">
        Vês os prazos aqui, mas é fácil esquecer. Queres que te avisemos por email alguns dias antes de cada um?
      </ProHint>

      {!mounted ? (
        <div className="p-10 text-center text-sm text-stone-400">A carregar…</div>
      ) : vista === "calendario" ? (
        <CalendarioPrazos prazos={filtrados} />
      ) : (
        <ul className="space-y-2.5">
          {proximos.map((p) => {
            const dias = diasAte(p.data);
            const meta = META_CATEGORIA[p.categoria];
            const urgente = dias <= 7;
            return (
              <li
                key={p.id}
                className={`p-4 rounded-2xl border flex items-center gap-4 transition-all hover:shadow-soft ${urgente ? "bg-alert-bg border-alert-border" : "bg-white border-stone-100 dark:bg-stone-900 dark:border-stone-800"}`}
              >
                <div className="flex flex-col items-center justify-center w-14 flex-shrink-0">
                  <span className={`font-display text-xl font-semibold ${urgente ? "text-alert-text" : "text-brand"}`}>{dias}</span>
                  <span className={`text-[10px] uppercase tracking-wide ${urgente ? "text-alert-text/70" : "text-stone-400"}`}>
                    {dias === 1 ? "dia" : "dias"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.cor }} />
                    <span className="text-xs font-medium text-stone-400">{meta.label}</span>
                  </div>
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{p.titulo}</div>
                  <div className="text-xs text-stone-500 mt-0.5 dark:text-stone-400">{p.descricao}</div>
                </div>
                <div className="text-xs text-stone-400 flex-shrink-0 text-right">
                  {new Date(p.data + "T00:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 max-w-sm">
        <PartnerSpot context="prazos" />
      </div>

      <p className="text-xs text-stone-400 mt-6 leading-relaxed">
        Datas com base nas regras gerais para trabalhadores independentes. Alguns prazos podem variar consoante o teu
        enquadramento (regime de IVA, retenção, etc.). Confirma sempre no Portal das Finanças e na Segurança Social Direta.
      </p>
    </div>
  );
}
