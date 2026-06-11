"use client";

import { useState } from "react";
import { ShieldCheck, Check, Warning, Clock, ExternalLink, ChevronDown, ChevronUp, Search } from "@/components/ui/Icons";

type Severidade = "ok" | "info" | "aviso" | "erro";
type Confianca = "alta" | "media" | "baixa" | "nenhuma";

interface ResultadoTeste {
  id: string;
  grupo: string;
  nome: string;
  severidade: Severidade;
  esperado: string;
  obtido: string;
  detalhes?: string;
  fonteUrl?: string;
  fonteNome?: string;
  confianca?: Confianca;
  citacao?: string;
}

interface FonteResumo {
  key: string;
  nome: string;
  url: string;
  acessivel: boolean;
  erro?: string;
}

interface RespostaAuditoria {
  agente: string;
  descricao: string;
  executadoEm: string;
  anoFiscal: number;
  ultimaRevisao?: string;
  fontes?: FonteResumo[];
  resultados: ResultadoTeste[];
}

const AGENTES = [
  {
    id: "fontes",
    titulo: "Auditor de Fontes Oficiais",
    descricao: "Consulta fontes oficiais portuguesas (Portal das Finanças, PwC, OCC, DECO, CGD) em tempo real e compara os valores encontrados com os dados do sistema.",
    lento: true,
  },
  {
    id: "dados",
    titulo: "Auditor de Dados Fiscais",
    descricao: "Verifica a consistência interna dos parâmetros fiscais (taxas, limites, coeficientes, escalões IRS) contra os valores esperados de 2026.",
    lento: false,
  },
  {
    id: "motor",
    titulo: "Auditor do Motor de Cálculo",
    descricao: "Executa cenários de teste contra o motor de cálculo (retenção, IVA, SS, IRS anual, categoria F) para verificar que as fórmulas produzem resultados corretos.",
    lento: false,
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

function BadgeConfianca({ confianca }: { confianca: Confianca }) {
  const styles: Record<Confianca, string> = {
    alta: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    media: "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400",
    baixa: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    nenhuma: "bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400",
  };
  const labels: Record<Confianca, string> = {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa",
    nenhuma: "N/D",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[confianca]}`}>
      {labels[confianca]}
    </span>
  );
}

function Resumo({ resultados }: { resultados: ResultadoTeste[] }) {
  const ok = resultados.filter((r) => r.severidade === "ok").length;
  const info = resultados.filter((r) => r.severidade === "info").length;
  const avisos = resultados.filter((r) => r.severidade === "aviso").length;
  const erros = resultados.filter((r) => r.severidade === "erro").length;
  const total = resultados.length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Total</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-stone-800 dark:text-stone-100">{total}</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Confirmados</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{ok}</p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Info</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{info}</p>
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

function FontesResumo({ fontes }: { fontes: FonteResumo[] }) {
  const acessiveis = fontes.filter((f) => f.acessivel);
  const inacessiveis = fontes.filter((f) => !f.acessivel);

  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Fontes consultadas ({acessiveis.length}/{fontes.length} acessíveis)
      </h3>
      <div className="space-y-1.5">
        {fontes.map((f) => (
          <div key={f.key} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${f.acessivel ? "bg-emerald-400" : "bg-red-400"}`} />
            <div className="min-w-0 flex-1">
              <span className="text-stone-600 dark:text-stone-300">{f.nome}</span>
              {!f.acessivel && f.erro && (
                <span className="ml-1 text-red-500 dark:text-red-400">({f.erro})</span>
              )}
            </div>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-brand hover:text-brand-dark"
              aria-label={`Abrir ${f.nome}`}
            >
              <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
      {inacessiveis.length > 0 && (
        <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500">
          {inacessiveis.length} fonte{inacessiveis.length > 1 ? "s" : ""} inacessível{inacessiveis.length > 1 ? "eis" : ""}.
          As verificações que dependiam exclusivamente destas fontes são apresentadas como &ldquo;Info&rdquo;.
        </p>
      )}
    </div>
  );
}

function CitacaoExpandivel({ citacao }: { citacao: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-1 text-[11px] font-medium text-brand hover:text-brand-dark"
      >
        {aberto ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        {aberto ? "Ocultar citação" : "Ver citação da fonte"}
      </button>
      {aberto && (
        <blockquote className="mt-1.5 rounded-lg border-l-2 border-brand/30 bg-brand/5 px-3 py-2 text-xs italic leading-relaxed text-stone-600 dark:border-brand/40 dark:bg-brand/10 dark:text-stone-300">
          &ldquo;…{citacao}…&rdquo;
        </blockquote>
      )}
    </div>
  );
}

function TabelaResultados({ resultados, temFontes }: { resultados: ResultadoTeste[]; temFontes: boolean }) {
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
                <div key={t.id} className="px-5 py-3 transition-colors hover:bg-stone-50/40 dark:hover:bg-stone-700/30">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{t.nome}</p>
                      {t.detalhes && (
                        <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">{t.detalhes}</p>
                      )}
                    </div>
                    <div className="hidden text-right text-xs tabular-nums text-stone-400 sm:block dark:text-stone-500">
                      <span className="text-stone-300 dark:text-stone-600">Local:</span> {t.esperado}
                    </div>
                    <div className="hidden text-right text-xs tabular-nums text-stone-400 sm:block dark:text-stone-500">
                      <span className="text-stone-300 dark:text-stone-600">Fonte:</span> {t.obtido}
                    </div>
                    {temFontes && t.confianca && <BadgeConfianca confianca={t.confianca} />}
                    <BadgeSeveridade severidade={t.severidade} />
                  </div>

                  {temFontes && (t.fonteUrl || t.citacao) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {t.fonteUrl && (
                        <a
                          href={t.fonteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-brand hover:text-brand-dark hover:underline"
                        >
                          <ExternalLink size={10} />
                          {t.fonteNome ? truncate(t.fonteNome, 60) : "Fonte"}
                        </a>
                      )}
                      {t.citacao && <CitacaoExpandivel citacao={t.citacao} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
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
          const isFontes = agente.id === "fontes";

          return (
            <section key={agente.id} className="rounded-3xl border border-stone-100 bg-white/60 p-5 shadow-card sm:p-6 dark:border-stone-700 dark:bg-stone-800/60">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
                    {isFontes ? <Search size={18} className="text-brand" /> : <ShieldCheck size={18} className="text-brand" />}
                    {agente.titulo}
                  </h2>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{agente.descricao}</p>
                  {isFontes && (
                    <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                      Consulta fontes externas em tempo real — pode demorar 10–15 segundos.
                    </p>
                  )}
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
                      {agente.lento ? "A consultar fontes…" : "A executar…"}
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

                  {isFontes && dados.fontes && <FontesResumo fontes={dados.fontes} />}

                  <Resumo resultados={dados.resultados} />
                  <TabelaResultados resultados={dados.resultados} temFontes={isFontes} />
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
