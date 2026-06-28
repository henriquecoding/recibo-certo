"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarFeedback,
  atualizarEstadoFeedback,
  guardarNotaFeedback,
  validarFeedbackComXP,
  eliminarFeedback,
  type FeedbackRow,
  type EstadoFeedback,
  type TipoFeedback,
} from "@/lib/supabase/feedback";
import {
  listarReportesQuiz,
  atualizarEstadoReporte,
  eliminarReporte,
  type ReporteQuizRow,
  type EstadoReporte,
} from "@/lib/supabase/quiz-reportes";
import { META_CATEGORIA_QUIZ, type QuizCategoria } from "@/lib/quiz-fiscal";
import { Trash, Flag, Check, Close, Zap, Lightbulb, Warning, Info, Heart, User, Mail } from "@/components/ui/Icons";

// ── Metadados de apresentação ────────────────────────────────────────────────

const ESTADO_FB: Record<EstadoFeedback, { label: string; cls: string }> = {
  novo: { label: "Novo", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  em_analise: { label: "Em análise", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  valido: { label: "Validado", cls: "border-brand/30 bg-brand-light text-brand-dark" },
  resolvido: { label: "Resolvido", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejeitado: { label: "Rejeitado", cls: "border-stone-200 bg-stone-100 text-stone-500" },
};

const TIPO_FB: Record<TipoFeedback, { label: string; Icon: typeof Lightbulb; cls: string }> = {
  sugestao: { label: "Sugestão", Icon: Lightbulb, cls: "bg-amber-50 text-amber-700" },
  erro: { label: "Erro", Icon: Warning, cls: "bg-red-50 text-red-600" },
  duvida: { label: "Dúvida", Icon: Info, cls: "bg-blue-50 text-blue-700" },
  mensagem: { label: "Mensagem", Icon: Heart, cls: "bg-pink-50 text-pink-600" },
};

const ESTADO_QUIZ: Record<EstadoReporte, { label: string; cls: string }> = {
  novo: { label: "Novo", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  em_analise: { label: "Em análise", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  resolvido: { label: "Resolvido", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejeitado: { label: "Rejeitado", cls: "border-stone-200 bg-stone-100 text-stone-500" },
};

const XP_PRESETS = [10, 25, 50, 100];

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

function catLabel(c: string | null): string {
  if (!c) return "—";
  return META_CATEGORIA_QUIZ[c as QuizCategoria]?.label ?? c;
}

// ═════════════════════════════════════════════════════════════════════════════

export default function AdminCentralReportes() {
  const [aba, setAba] = useState<"site" | "quiz">("site");
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [quiz, setQuiz] = useState<ReporteQuizRow[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = () =>
    Promise.all([listarFeedback(), listarReportesQuiz()])
      .then(([f, q]) => { setFeedback(f); setQuiz(q); })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregado(true));

  useEffect(() => { carregar(); }, []);

  const novosFb = useMemo(() => feedback.filter((f) => f.estado === "novo").length, [feedback]);
  const novosQuiz = useMemo(() => quiz.filter((q) => q.estado === "novo").length, [quiz]);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="eyebrow mb-1 text-brand">Administração</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800">Central de reportes</h1>
        <p className="mt-1 text-sm text-stone-500">
          {carregado
            ? `${feedback.length + quiz.length} mensagens · ${novosFb + novosQuiz} por rever`
            : "A carregar…"}
        </p>
      </header>

      {/* Abas */}
      <div className="mb-5 inline-flex rounded-2xl border border-stone-200 bg-white p-1">
        <AbaBtn ativo={aba === "site"} onClick={() => setAba("site")} label="Feedback do site" n={carregado ? novosFb : undefined} />
        <AbaBtn ativo={aba === "quiz"} onClick={() => setAba("quiz")} label="Quiz" n={carregado ? novosQuiz : undefined} />
      </div>

      {erro && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {!carregado ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-stone-100 bg-white" />
          ))}
        </div>
      ) : aba === "site" ? (
        <SeccaoFeedback lista={feedback} setLista={setFeedback} setErro={setErro} />
      ) : (
        <SeccaoQuiz lista={quiz} setLista={setQuiz} setErro={setErro} />
      )}
    </div>
  );
}

function AbaBtn({ ativo, onClick, label, n }: { ativo: boolean; onClick: () => void; label: string; n?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
        ativo ? "bg-brand text-white" : "text-stone-500 hover:text-stone-800"
      }`}
    >
      {label}
      {n !== undefined && n > 0 && (
        <span className={`rounded-full px-1.5 text-[11px] ${ativo ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>{n}</span>
      )}
    </button>
  );
}

// ── Secção: Feedback do site ─────────────────────────────────────────────────

function SeccaoFeedback({
  lista, setLista, setErro,
}: {
  lista: FeedbackRow[];
  setLista: React.Dispatch<React.SetStateAction<FeedbackRow[]>>;
  setErro: (s: string) => void;
}) {
  const [estadoF, setEstadoF] = useState<EstadoFeedback | "todos">("todos");
  const [tipoF, setTipoF] = useState<TipoFeedback | "todos">("todos");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [validar, setValidar] = useState<string | null>(null);
  const [notaAberta, setNotaAberta] = useState<string | null>(null);

  const filtrada = useMemo(
    () => lista.filter((r) => (estadoF === "todos" || r.estado === estadoF) && (tipoF === "todos" || r.tipo === tipoF)),
    [lista, estadoF, tipoF]
  );

  const contagem = useMemo(() => {
    const base = { novo: 0, em_analise: 0, valido: 0, resolvido: 0, rejeitado: 0 } as Record<EstadoFeedback, number>;
    for (const r of lista) base[r.estado]++;
    return base;
  }, [lista]);

  const mudar = async (id: string, estado: EstadoFeedback) => {
    const { erro } = await atualizarEstadoFeedback(id, estado);
    if (erro) return setErro(erro);
    setLista((prev) => prev.map((r) => (r.id === id ? { ...r, estado } : r)));
  };

  const validarXP = async (id: string, xp: number) => {
    const { erro } = await validarFeedbackComXP(id, xp);
    if (erro) return setErro(erro);
    setLista((prev) => prev.map((r) => (r.id === id ? { ...r, estado: "valido", xp_atribuido: xp, resolvido_em: new Date().toISOString() } : r)));
    setValidar(null);
  };

  const apagar = async (id: string) => {
    const { erro } = await eliminarFeedback(id);
    if (erro) return setErro(erro);
    setLista((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const FILTROS_ESTADO: { v: EstadoFeedback | "todos"; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "novo", label: "Novos" },
    { v: "em_analise", label: "Em análise" },
    { v: "valido", label: "Validados" },
    { v: "resolvido", label: "Resolvidos" },
    { v: "rejeitado", label: "Rejeitados" },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTROS_ESTADO.map((f) => {
          const ativo = estadoF === f.v;
          const n = f.v === "todos" ? lista.length : contagem[f.v];
          return (
            <button
              key={f.v}
              type="button"
              onClick={() => setEstadoF(f.v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                ativo ? "bg-brand text-white" : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[11px] ${ativo ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {(["todos", "sugestao", "erro", "duvida", "mensagem"] as const).map((t) => {
          const ativo = tipoF === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipoF(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                ativo ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {t === "todos" ? "Todos os tipos" : TIPO_FB[t].label}
            </button>
          );
        })}
      </div>

      {filtrada.length === 0 ? (
        <Vazio texto="Sem mensagens nesta vista." />
      ) : (
        <ul className="space-y-3">
          {filtrada.map((r) => {
            const tm = TIPO_FB[r.tipo];
            const em = ESTADO_FB[r.estado];
            return (
              <li key={r.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tm.cls}`}>
                    <tm.Icon size={11} /> {tm.label}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${em.cls}`}>{em.label}</span>
                  {r.user_id ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                      <User size={10} /> Autenticado
                    </span>
                  ) : null}
                  {r.xp_atribuido > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Zap size={10} /> +{r.xp_atribuido} XP
                    </span>
                  )}
                  <span className="ml-auto text-[11px] tabular-nums text-stone-400">{dataCurta(r.criado_em)}</span>
                </div>

                {r.assunto && <p className="mt-2 text-sm font-semibold text-stone-800">{r.assunto}</p>}
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">{r.mensagem}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
                  {r.area && <span>Origem: <code className="rounded bg-stone-50 px-1 text-stone-500">{r.area}</code></span>}
                  {r.nome && <span>De: {r.nome}</span>}
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-brand hover:underline">
                      <Mail size={10} /> {r.email}
                    </a>
                  )}
                </div>

                {/* Ações */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {r.estado !== "em_analise" && r.estado !== "resolvido" && r.estado !== "valido" && (
                    <AcaoBtn onClick={() => mudar(r.id, "em_analise")} label="Em análise" />
                  )}
                  {r.estado !== "valido" && (
                    validar === r.id ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-light px-1.5 py-1">
                        <span className="px-1 text-[11px] font-semibold text-brand-dark">XP:</span>
                        {XP_PRESETS.map((xp) => (
                          <button key={xp} type="button" onClick={() => validarXP(r.id, xp)} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-brand-dark hover:bg-brand hover:text-white">
                            +{xp}
                          </button>
                        ))}
                        <button type="button" onClick={() => validarXP(r.id, 0)} className="rounded-md px-1.5 py-0.5 text-[11px] text-stone-500 hover:text-stone-700">sem XP</button>
                        <button type="button" onClick={() => setValidar(null)} className="rounded-md px-1 text-[11px] text-stone-400" aria-label="Cancelar"><Close size={11} /></button>
                      </span>
                    ) : (
                      <AcaoBtn onClick={() => setValidar(r.id)} label="Validar (+XP)" icon={<Zap size={12} />} cor="brand" />
                    )
                  )}
                  {r.estado !== "resolvido" && (
                    <AcaoBtn onClick={() => mudar(r.id, "resolvido")} label="Resolver" icon={<Check size={12} />} cor="emerald" />
                  )}
                  {r.estado !== "rejeitado" && (
                    <AcaoBtn onClick={() => mudar(r.id, "rejeitado")} label="Rejeitar" icon={<Close size={12} />} />
                  )}
                  {r.estado !== "novo" && <AcaoBtn onClick={() => mudar(r.id, "novo")} label="Reabrir" />}
                  <button
                    type="button"
                    onClick={() => setNotaAberta(notaAberta === r.id ? null : r.id)}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Nota
                  </button>
                  <div className="ml-auto">
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => apagar(r.id)} className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600">Apagar</button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1 text-xs text-stone-400 hover:text-stone-600">Não</button>
                      </div>
                    ) : (
                      <button type="button" aria-label="Eliminar" onClick={() => setConfirmDelete(r.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400">
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {notaAberta === r.id && (
                  <NotaAdmin
                    inicial={r.nota_admin ?? ""}
                    onGuardar={async (nota) => {
                      const { erro } = await guardarNotaFeedback(r.id, nota);
                      if (erro) return setErro(erro);
                      setLista((prev) => prev.map((x) => (x.id === r.id ? { ...x, nota_admin: nota || null } : x)));
                      setNotaAberta(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function NotaAdmin({ inicial, onGuardar }: { inicial: string; onGuardar: (nota: string) => void }) {
  const [nota, setNota] = useState(inicial);
  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={2}
        placeholder="Nota interna da equipa (não visível para quem enviou)…"
        className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <div className="mt-1.5 flex justify-end">
        <button type="button" onClick={() => onGuardar(nota)} className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700">
          Guardar nota
        </button>
      </div>
    </div>
  );
}

// ── Secção: Reportes do quiz (existente) ─────────────────────────────────────

function SeccaoQuiz({
  lista, setLista, setErro,
}: {
  lista: ReporteQuizRow[];
  setLista: React.Dispatch<React.SetStateAction<ReporteQuizRow[]>>;
  setErro: (s: string) => void;
}) {
  const [filtro, setFiltro] = useState<EstadoReporte | "todos">("todos");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    const { erro } = await atualizarEstadoReporte(id, estado);
    if (erro) return setErro(erro);
    setLista((prev) => prev.map((r) => (r.id === id ? { ...r, estado, resolvido_em: estado === "resolvido" || estado === "rejeitado" ? new Date().toISOString() : null } : r)));
  };
  const apagar = async (id: string) => {
    const { erro } = await eliminarReporte(id);
    if (erro) return setErro(erro);
    setLista((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const FILTROS: { v: EstadoReporte | "todos"; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "novo", label: "Novos" },
    { v: "em_analise", label: "Em análise" },
    { v: "resolvido", label: "Resolvidos" },
    { v: "rejeitado", label: "Rejeitados" },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.v;
          const n = f.v === "todos" ? lista.length : contagem[f.v];
          return (
            <button
              key={f.v}
              type="button"
              onClick={() => setFiltro(f.v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                ativo ? "bg-brand text-white" : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[11px] ${ativo ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {filtrada.length === 0 ? (
        <Vazio texto="Sem reportes nesta vista." />
      ) : (
        <ul className="space-y-3">
          {filtrada.map((r) => {
            const em = ESTADO_QUIZ[r.estado];
            return (
              <li key={r.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${em.cls}`}>{em.label}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">{catLabel(r.categoria)}</span>
                  <code className="rounded bg-stone-50 px-1.5 py-0.5 text-[11px] text-stone-400">{r.question_id}</code>
                  {r.xp_atribuido > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Zap size={10} /> +{r.xp_atribuido} XP
                    </span>
                  )}
                  <span className="ml-auto text-[11px] tabular-nums text-stone-400">{dataCurta(r.criado_em)}</span>
                </div>

                {r.pergunta_texto && <p className="mt-2 text-sm font-medium text-stone-800">{r.pergunta_texto}</p>}
                {r.descricao ? (
                  <p className="mt-1.5 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">{r.descricao}</p>
                ) : (
                  <p className="mt-1.5 text-xs italic text-stone-400">Sem descrição (reporte rápido).</p>
                )}

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
                  {r.estado !== "novo" && <AcaoBtn onClick={() => mudarEstado(r.id, "novo")} label="Reabrir" />}
                  <div className="ml-auto">
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => apagar(r.id)} className="rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600">Apagar</button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1 text-xs text-stone-400 hover:text-stone-600">Não</button>
                      </div>
                    ) : (
                      <button type="button" aria-label="Eliminar reporte" onClick={() => setConfirmDelete(r.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400">
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
    </>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-4xl border border-dashed border-stone-200 bg-white py-16 text-center">
      <Flag size={20} className="mx-auto mb-2 text-stone-300" />
      <p className="text-sm text-stone-400">{texto}</p>
    </div>
  );
}

function AcaoBtn({
  onClick, label, icon, cor,
}: { onClick: () => void; label: string; icon?: React.ReactNode; cor?: "emerald" | "brand" }) {
  const cls =
    cor === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : cor === "brand"
      ? "border-brand/30 bg-brand-light text-brand-dark hover:bg-brand hover:text-white"
      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50";
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${cls}`}>
      {icon}
      {label}
    </button>
  );
}
