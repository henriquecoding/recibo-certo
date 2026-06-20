"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarReportesQuiz,
  atualizarEstadoReporte,
  eliminarReporte,
  type ReporteQuizRow,
  type EstadoReporte,
} from "@/lib/supabase/quiz-reportes";
import { META_CATEGORIA_QUIZ, type QuizCategoria } from "@/lib/quiz-fiscal";
import { Trash, Flag, Check, Close, Zap } from "@/components/ui/Icons";

const ESTADO_META: Record<EstadoReporte, { label: string; cor: string; texto: string }> = {
  novo: { label: "Novo", cor: "bg-amber-100 border-amber-200", texto: "text-amber-700" },
  em_analise: { label: "Em análise", cor: "bg-blue-100 border-blue-200", texto: "text-blue-700" },
  resolvido: { label: "Resolvido", cor: "bg-emerald-100 border-emerald-200", texto: "text-emerald-700" },
  rejeitado: { label: "Rejeitado", cor: "bg-stone-100 border-stone-200", texto: "text-stone-500" },
};

const FILTROS: { valor: EstadoReporte | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "novo", label: "Novos" },
  { valor: "em_analise", label: "Em análise" },
  { valor: "resolvido", label: "Resolvidos" },
  { valor: "rejeitado", label: "Rejeitados" },
];

function catLabel(c: string | null): string {
  if (!c) return "—";
  return META_CATEGORIA_QUIZ[c as QuizCategoria]?.label ?? c;
}

export default function AdminReportes() {
  const [lista, setLista] = useState<ReporteQuizRow[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<EstadoReporte | "todos">("todos");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const carregar = () =>
    listarReportesQuiz()
      .then(setLista)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregado(true));

  useEffect(() => { carregar(); }, []);

  const filtrada = useMemo(
    () => (filtro === "todos" ? lista : lista.filter((r) => r.estado === filtro)),
    [lista, filtro]
  );

  const contagem = useMemo(() => {
    const base = { novo: 0, em_analise: 0, resolvido: 0, rejeitado: 0 } as Record<EstadoReporte, number>;
    for (const r of lista) base[r.estado]++;
    return base;
  }, [lista]);

  const mudarEstado = async (id: string, estado: EstadoReporte) => {
    const { erro: e } = await atualizarEstadoReporte(id, estado);
    if (e) { setErro(e); return; }
    setLista((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, estado, resolvido_em: estado === "resolvido" || estado === "rejeitado" ? new Date().toISOString() : null }
          : r
      )
    );
  };

  const apagar = async (id: string) => {
    const { erro: e } = await eliminarReporte(id);
    if (e) { setErro(e); return; }
    setLista((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="eyebrow mb-1 text-brand">Administração</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800">Reportes do quiz</h1>
        <p className="mt-1 text-sm text-stone-500">
          {carregado
            ? `${lista.length} reporte${lista.length !== 1 ? "s" : ""} · ${contagem.novo} por rever`
            : "A carregar…"}
        </p>
      </header>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.valor;
          const n = f.valor === "todos" ? lista.length : contagem[f.valor];
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                ativo ? "bg-brand text-white" : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[11px] ${ativo ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>
                {carregado ? n : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {erro && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {!carregado ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-stone-100 bg-white" />
          ))}
        </div>
      ) : filtrada.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 bg-white py-16 text-center">
          <Flag size={20} className="mx-auto mb-2 text-stone-300" />
          <p className="text-sm text-stone-400">Sem reportes nesta vista.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtrada.map((r) => {
            const em = ESTADO_META[r.estado];
            return (
              <li key={r.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${em.cor} ${em.texto}`}>
                    {em.label}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                    {catLabel(r.categoria)}
                  </span>
                  <code className="rounded bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-400">{r.question_id}</code>
                  {r.xp_atribuido > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Zap size={10} /> +{r.xp_atribuido} XP
                    </span>
                  )}
                  <span className="ml-auto text-[11px] tabular-nums text-stone-400">
                    {new Date(r.criado_em).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>

                {r.pergunta_texto && (
                  <p className="mt-2 text-sm font-medium text-stone-800">{r.pergunta_texto}</p>
                )}
                {r.descricao ? (
                  <p className="mt-1.5 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
                    {r.descricao}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs italic text-stone-400">Sem descrição (reporte rápido).</p>
                )}

                {/* Ações */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {r.estado !== "em_analise" && r.estado !== "resolvido" && (
                    <AcaoBtn onClick={() => mudarEstado(r.id, "em_analise")} label="Em análise" />
                  )}
                  {r.estado !== "resolvido" && (
                    <AcaoBtn onClick={() => mudarEstado(r.id, "resolvido")} label="Resolver" icon={<Check size={12} />} cor="emerald" />
                  )}
                  {r.estado !== "rejeitado" && (
                    <AcaoBtn onClick={() => mudarEstado(r.id, "rejeitado")} label="Rejeitar" icon={<Close size={12} />} />
                  )}
                  {r.estado !== "novo" && (
                    <AcaoBtn onClick={() => mudarEstado(r.id, "novo")} label="Reabrir" />
                  )}
                  <div className="ml-auto">
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => apagar(r.id)} className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600">Apagar</button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1 text-xs text-stone-400 hover:text-stone-600">Não</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="Eliminar reporte"
                        onClick={() => setConfirmDelete(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AcaoBtn({
  onClick, label, icon, cor,
}: { onClick: () => void; label: string; icon?: React.ReactNode; cor?: "emerald" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
        cor === "emerald"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
