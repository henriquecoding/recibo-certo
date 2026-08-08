"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PAINEL SEMANAL — §8.3 do relatório estratégico
//  ---------------------------------------------------------------------
//  «Um painel único semanal», pedido para o dia 14. Seis blocos, cada um
//  com a pergunta de decisão a que responde, porque um número sem pergunta
//  não muda comportamento nenhum.
//
//  A regra que governa a interface: quando não há dados, diz-se que não há
//  dados. Nada de zeros, nada de barras vazias que parecem resultados. O
//  §2.2 do relatório lista tudo o que não estava disponível na auditoria —
//  MAU, sessões, conclusão, retenção, churn — e o primeiro objetivo do
//  plano é «transformar estas incógnitas em dados de decisão». Fingir que
//  já estão transformadas seria o oposto.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { BLOCOS_PAINEL, KPIS, ALVOS, ROTINA_SEMANAL, ROTINA_PERIODICA, kpi } from "@/lib/analytics/painel";
import { DEFINICAO_DVM } from "@/lib/analytics/dvm";
import { CATALOGO, type NomeEvento } from "@/lib/analytics/eventos";
import { Check, Clock, Info, Warning } from "@/components/ui/Icons";

interface Resposta {
  janela: { dias: number; desde: string };
  temDados: boolean;
  truncado: boolean;
  eventos: { total: number; porEvento: Record<string, number>; porOrigem: Record<string, number> };
  cobertura: { esperados: number; recebidos: number; emFalta: NomeEvento[] };
  dvm: {
    utilizadores: number;
    decisoes: number;
    porFerramenta: Record<string, number>;
    decisoesPorUtilizador: number | null;
  } | null;
  ativacao: number | null;
  starts: number;
}

const JANELAS = [7, 30, 90];

export default function PainelPage() {
  const [dias, setDias] = useState(7);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async (janela: number) => {
    setACarregar(true);
    setErro(null);
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      const { data: { session } } = await getSupabase().auth.getSession();
      const res = await fetch(`/api/admin/painel?dias=${janela}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!res.ok) {
        const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
        throw new Error(corpo.erro ?? "Não foi possível carregar o painel.");
      }
      setDados((await res.json()) as Resposta);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      setDados(null);
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    void carregar(dias);
  }, [dias, carregar]);

  const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")}%`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
          Sistema operativo de crescimento
        </p>
        <h1 className="font-display text-2xl font-bold text-stone-800 dark:text-stone-100">
          Painel semanal
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
          {DEFINICAO_DVM.frase}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {JANELAS.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => setDias(j)}
              aria-pressed={dias === j}
              className={`min-h-[36px] rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                dias === j
                  ? "bg-brand text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {j} dias
            </button>
          ))}
        </div>
      </header>

      {aCarregar ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-[13px] text-stone-400 dark:border-stone-700 dark:bg-stone-800/50">
          A carregar…
        </div>
      ) : erro ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-alert-border bg-alert-bg p-4">
          <Warning size={13} className="mt-0.5 shrink-0 text-alert-text" />
          <div className="text-[13px] text-alert-text">
            <p className="font-semibold">{erro}</p>
            <p className="mt-1 leading-relaxed">
              Se a medição ainda não está configurada em produção, isto é esperado: a
              camada de eventos existe, mas precisa das variáveis do Supabase para
              gravar.
            </p>
          </div>
        </div>
      ) : dados ? (
        <div className="space-y-5">
          {/* ── Números de topo ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cartao
              rotulo="DVM"
              valor={dados.dvm ? String(dados.dvm.utilizadores) : null}
              nota="Utilizadores únicos com decisão verificada"
            />
            <Cartao
              rotulo="Decisões"
              valor={dados.dvm ? String(dados.dvm.decisoes) : null}
              nota="Total, incluindo repetições"
            />
            <Cartao
              rotulo="Ativação"
              valor={dados.ativacao !== null ? pct(dados.ativacao) : null}
              nota={`DVM / ${dados.starts} inícios de simulador`}
            />
            <Cartao
              rotulo="Decisões por utilizador"
              valor={
                dados.dvm?.decisoesPorUtilizador
                  ? dados.dvm.decisoesPorUtilizador.toFixed(2).replace(".", ",")
                  : null
              }
              nota="Continuidade, não compulsão"
            />
          </div>

          {!dados.temDados ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800/50">
              <Info size={13} className="mt-0.5 shrink-0 text-stone-400" />
              <div className="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                <p className="font-semibold text-stone-700 dark:text-stone-200">
                  Ainda não há eventos nesta janela.
                </p>
                <p className="mt-1">
                  É o estado esperado até a medição correr em produção com consentimento
                  de estatística. Enquanto for assim, o painel diz que não sabe — em vez
                  de mostrar zeros que se leem como resultados.
                </p>
              </div>
            </div>
          ) : null}

          {/* ── Cobertura da instrumentação ──────────────────────── */}
          <Seccao
            titulo="Cobertura da instrumentação"
            pergunta="Os eventos que declarámos estão mesmo a chegar?"
          >
            <p className="mb-3 text-[13px] text-stone-500 dark:text-stone-400">
              {dados.cobertura.recebidos} de {dados.cobertura.esperados} eventos de cliente
              receberam pelo menos um registo nesta janela. O alvo do dia 14 é ≥ 95%.
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {(Object.keys(CATALOGO) as NomeEvento[])
                .filter((n) => CATALOGO[n].origem === "cliente")
                .map((n) => {
                  const contagem = dados.eventos.porEvento[n] ?? 0;
                  return (
                    <li
                      key={n}
                      className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-1.5 dark:bg-stone-900/40"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-stone-600 dark:text-stone-300">
                        {contagem > 0 ? (
                          <Check size={11} className="shrink-0 text-brand" />
                        ) : (
                          <Clock size={11} className="shrink-0 text-stone-300" />
                        )}
                        {n}
                      </span>
                      <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-stone-500">
                        {contagem}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </Seccao>

          {/* ── DVM por ferramenta ───────────────────────────────── */}
          {dados.dvm && Object.keys(dados.dvm.porFerramenta).length > 0 ? (
            <Seccao titulo="DVM por ferramenta" pergunta="Qual ativa e qual dilui?">
              <ul className="space-y-1.5">
                {Object.entries(dados.dvm.porFerramenta)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ferramenta, n]) => (
                    <li
                      key={ferramenta}
                      className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/40"
                    >
                      <span className="text-[12.5px] text-stone-600 dark:text-stone-300">
                        {ferramenta}
                      </span>
                      <span className="text-[12.5px] font-semibold tabular-nums text-ink">{n}</span>
                    </li>
                  ))}
              </ul>
            </Seccao>
          ) : null}

          {/* ── Origem ───────────────────────────────────────────── */}
          {dados.temDados ? (
            <Seccao titulo="Origem" pergunta="Que canal traz decisões, e não apenas visitas?">
              <ul className="space-y-1.5">
                {Object.entries(dados.eventos.porOrigem)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([fonte, n]) => (
                    <li
                      key={fonte}
                      className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/40"
                    >
                      <span className="text-[12.5px] text-stone-600 dark:text-stone-300">{fonte}</span>
                      <span className="text-[12.5px] font-semibold tabular-nums text-ink">{n}</span>
                    </li>
                  ))}
              </ul>
            </Seccao>
          ) : null}

          {/* ── Os seis blocos e as suas definições ──────────────── */}
          <Seccao
            titulo="Os seis blocos"
            pergunta="Cada número tem fórmula, dono e limite — ou não é um indicador."
          >
            <div className="space-y-4">
              {BLOCOS_PAINEL.map((b) => (
                <div key={b.id}>
                  <p className="text-[12.5px] font-bold text-stone-700 dark:text-stone-200">
                    {b.titulo}
                  </p>
                  <p className="mb-1.5 text-[11.5px] italic text-stone-400">{b.pergunta}</p>
                  <ul className="space-y-1">
                    {b.kpis.map((id) => {
                      const k = kpi(id);
                      if (!k) return null;
                      return (
                        <li key={id} className="text-[11.5px] leading-relaxed text-stone-500 dark:text-stone-400">
                          <span className="font-semibold text-stone-600 dark:text-stone-300">
                            {k.nome}
                          </span>{" "}
                          = {k.formula} · {k.dono} · {k.guardrail}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-stone-400">
              {KPIS.length} indicadores definidos. Nenhum é apurado a partir de valores
              fiscais pessoais.
            </p>
          </Seccao>

          {/* ── Alvos e rotinas ──────────────────────────────────── */}
          <Seccao titulo="Alvos de implementação" pergunta="Estamos no prazo?">
            <ul className="space-y-2">
              {ALVOS.map((a) => (
                <li key={a.prazo} className="flex gap-3">
                  <span className="w-16 shrink-0 text-[11.5px] font-bold text-brand">{a.prazo}</span>
                  <span className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {a.alvo}
                  </span>
                </li>
              ))}
            </ul>
          </Seccao>

          <Seccao titulo="Rotina" pergunta="O que é que hoje merece atenção?">
            <ul className="space-y-1.5">
              {ROTINA_SEMANAL.map((r) => (
                <li key={r.dia} className="flex gap-3">
                  <span className="w-16 shrink-0 text-[11.5px] font-bold text-stone-600 dark:text-stone-300">
                    {r.dia}
                  </span>
                  <span className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {r.foco}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-1.5 border-t border-stone-200 pt-3 dark:border-stone-700">
              {ROTINA_PERIODICA.map((r) => (
                <li key={r.periodo} className="flex gap-3">
                  <span className="w-16 shrink-0 text-[11.5px] font-bold text-stone-600 dark:text-stone-300">
                    {r.periodo}
                  </span>
                  <span className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {r.foco}
                  </span>
                </li>
              ))}
            </ul>
          </Seccao>
        </div>
      ) : null}
    </div>
  );
}

function Cartao({ rotulo, valor, nota }: { rotulo: string; valor: string | null; nota: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{rotulo}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums leading-none text-ink">
        {valor ?? <span className="text-base font-medium text-stone-300">sem dados</span>}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-stone-400">{nota}</p>
    </div>
  );
}

function Seccao({
  titulo,
  pergunta,
  children,
}: {
  titulo: string;
  pergunta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card sm:p-5 dark:border-stone-700 dark:bg-stone-800/50">
      <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">{titulo}</h2>
      <p className="mb-3 text-[11.5px] italic text-stone-400">{pergunta}</p>
      {children}
    </section>
  );
}
