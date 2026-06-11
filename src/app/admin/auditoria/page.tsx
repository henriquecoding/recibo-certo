"use client";

import { useState } from "react";
import { ShieldCheck, Check, Warning, Clock } from "@/components/ui/Icons";

type Severidade = "ok" | "info" | "aviso" | "erro";

interface ResultadoTeste {
  id: string;
  grupo: string;
  nome: string;
  severidade: Severidade;
  esperado: string;
  obtido: string;
  detalhes?: string;
}

interface RespostaAuditoria {
  agente: string;
  descricao: string;
  executadoEm: string;
  anoFiscal: number;
  ultimaRevisao?: string;
  resultados: ResultadoTeste[];
}

const AGENTES = [
  {
    id: "dados",
    titulo: "Auditor de Dados Fiscais",
    descricao: "Verifica todos os parâmetros fiscais (taxas, limites, coeficientes, escalões IRS) contra os valores oficiais de 2026.",
  },
  {
    id: "motor",
    titulo: "Auditor do Motor de Cálculo",
    descricao: "Executa cenários de teste contra o motor de cálculo (retenção, IVA, SS, IRS anual, categoria F) para verificar que as fórmulas produzem resultados corretos.",
  },
] as const;

function BadgeSeveridade({ severidade }: { severidade: Severidade }) {
  const styles: Record<Severidade, string> = {
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    aviso: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    erro: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const labels: Record<Severidade, string> = {
    ok: "OK",
    info: "Info",
    aviso: "Aviso",
    erro: "Erro",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[severidade]}`}>
      {labels[severidade]}
    </span>
  );
}

function Resumo({ resultados }: { resultados: ResultadoTeste[] }) {
  const ok = resultados.filter((r) => r.severidade === "ok").length;
  const avisos = resultados.filter((r) => r.severidade === "aviso").length;
  const erros = resultados.filter((r) => r.severidade === "erro").length;
  const total = resultados.length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Total</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{total}</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">OK</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{ok}</p>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Avisos</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{avisos}</p>
      </div>
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Erros</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-red-700 dark:text-red-300">{erros}</p>
      </div>
    </div>
  );
}

function TabelaResultados({ resultados }: { resultados: ResultadoTeste[] }) {
  const grupos = [...new Set(resultados.map((r) => r.grupo))];

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => {
        const testes = resultados.filter((r) => r.grupo === grupo);
        return (
          <div key={grupo} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-card dark:border-stone-700 dark:bg-stone-800">
            <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-3 dark:border-stone-700 dark:bg-stone-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{grupo}</h3>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-stone-700">
              {testes.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-stone-50/40 dark:hover:bg-stone-700/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{t.nome}</p>
                    {t.detalhes && <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">{t.detalhes}</p>}
                  </div>
                  <div className="hidden text-right text-xs tabular-nums text-stone-400 sm:block dark:text-stone-500">
                    <span className="text-stone-300 dark:text-stone-600">Esperado:</span> {t.esperado}
                  </div>
                  <div className="hidden text-right text-xs tabular-nums text-stone-400 sm:block dark:text-stone-500">
                    <span className="text-stone-300 dark:text-stone-600">Obtido:</span> {t.obtido}
                  </div>
                  <BadgeSeveridade severidade={t.severidade} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAuditoria() {
  const [resultados, setResultados] = useState<Record<string, RespostaAuditoria | null>>({});
  const [carregando, setCarregando] = useState<Record<string, boolean>>({});
  const [erros, setErros] = useState<Record<string, string>>({});

  const executar = async (agenteId: string) => {
    setCarregando((p) => ({ ...p, [agenteId]: true }));
    setErros((p) => ({ ...p, [agenteId]: "" }));
    try {
      const res = await fetch(`/api/admin/auditoria?agente=${agenteId}`);
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      const data: RespostaAuditoria = await res.json();
      setResultados((p) => ({ ...p, [agenteId]: data }));
    } catch (e) {
      setErros((p) => ({ ...p, [agenteId]: e instanceof Error ? e.message : "Erro desconhecido" }));
    } finally {
      setCarregando((p) => ({ ...p, [agenteId]: false }));
    }
  };

  const executarTodos = () => {
    for (const a of AGENTES) executar(a.id);
  };

  const temResultados = AGENTES.some((a) => resultados[a.id]);
  const todosOk = AGENTES.every((a) => {
    const r = resultados[a.id];
    return r && r.resultados.every((t) => t.severidade === "ok" || t.severidade === "info");
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1 text-brand">Administração</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
            Auditoria fiscal
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Agentes de verificação que validam os dados e cálculos fiscais contra as normas de Portugal.
          </p>
        </div>
        <button
          type="button"
          onClick={executarTodos}
          disabled={AGENTES.some((a) => carregando[a.id])}
          className="inline-flex items-center gap-2 rounded-xl border border-brand bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:bg-brand-dark hover:shadow-lift disabled:opacity-50"
        >
          <ShieldCheck size={16} />
          Executar todos
        </button>
      </header>

      {temResultados && todosOk && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <Check size={18} className="text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Todos os testes passaram. Os dados e o motor de cálculo estão alinhados com o sistema fiscal de Portugal 2026.
          </p>
        </div>
      )}

      {temResultados && !todosOk && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-900/20">
          <Warning size={18} className="text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Foram detetados avisos ou erros. Reveja os resultados abaixo.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {AGENTES.map((agente) => {
          const dados = resultados[agente.id];
          const aCarregar = carregando[agente.id];
          const erro = erros[agente.id];

          return (
            <section key={agente.id} className="rounded-3xl border border-stone-100 bg-white/60 p-5 shadow-card sm:p-6 dark:border-stone-700 dark:bg-stone-800/60">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
                    <ShieldCheck size={18} className="text-brand" />
                    {agente.titulo}
                  </h2>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{agente.descricao}</p>
                </div>
                <button
                  type="button"
                  onClick={() => executar(agente.id)}
                  disabled={aCarregar}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-card transition-all hover:border-stone-300 hover:shadow-lift disabled:opacity-50 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-200 dark:hover:border-stone-500"
                >
                  {aCarregar ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand" />
                      A executar…
                    </>
                  ) : (
                    <>Executar</>
                  )}
                </button>
              </div>

              {erro && (
                <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{erro}</div>
              )}

              {aCarregar && !dados && (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-700" />
                  ))}
                </div>
              )}

              {dados && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 dark:text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(dados.executadoEm).toLocaleString("pt-PT")}
                    </span>
                    <span>Ano fiscal: {dados.anoFiscal}</span>
                    {dados.ultimaRevisao && <span>Última revisão: {dados.ultimaRevisao}</span>}
                  </div>
                  <Resumo resultados={dados.resultados} />
                  <TabelaResultados resultados={dados.resultados} />
                </div>
              )}

              {!dados && !aCarregar && !erro && (
                <div className="rounded-2xl border border-dashed border-stone-200 py-10 text-center dark:border-stone-600">
                  <p className="text-sm text-stone-400 dark:text-stone-500">
                    Clique em &ldquo;Executar&rdquo; para iniciar a auditoria.
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
