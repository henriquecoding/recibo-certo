"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRecibos, calcularRecibo, resumir, type Recibo } from "@/lib/store/recibos";
import { downloadCSV, printRecibosPDF } from "@/lib/export";
import { fmt, pct } from "@/lib/format";
import {
  Trash, Receipt, Export, ArrowRight, BarChart2, Calendar,
  Wallet, Sparkle, Filter, ChevronDown, ChevronUp, User,
} from "@/components/ui/Icons";
import ProGate from "@/components/ui/ProGate";
import ProHint from "@/components/ui/ProHint";
import InfoTip from "@/components/ui/InfoTip";
import { META_TIPO } from "@/lib/fiscal-data";
import Badge from "@/components/ui/Badge";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const ReceitaChart = dynamic(() => import("@/components/dashboard/ReceitaChart"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />,
});

// ─── Vista ────────────────────────────────────────────────────────────────────
type Vista = "lista" | "tabela";

export default function RecibosPage() {
  const { recibos, carregado, remover } = useRecibos();
  const [query, setQuery] = useState("");
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [vista, setVista] = useState<Vista>("lista");
  const [mesAberto, setMesAberto] = useState<string | null>(null);

  const filtrados = recibos.filter((r) => {
    if (query.trim() && !r.cliente.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (filtroMes !== "todos" && r.data.slice(0, 7) !== filtroMes) return false;
    return true;
  });

  const grupos = filtrados.reduce<Record<string, Recibo[]>>((acc, r) => {
    const k = r.data.slice(0, 7);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
  const meses = Object.keys(grupos).sort((a, b) => b.localeCompare(a));
  const mesesDisponiveis = [...new Set(recibos.map((r) => r.data.slice(0, 7)))].sort((a, b) => b.localeCompare(a));

  const nomeMes = (k: string) => {
    const [ano, mes] = k.split("-");
    return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  };

  const resumoTotal = useMemo(() => resumir(recibos), [recibos]);
  const mediaRecibo = recibos.length > 0 ? resumoTotal.liquido / recibos.length : 0;
  const taxaEfetiva = resumoTotal.bruto > 0 ? 1 - resumoTotal.liquido / resumoTotal.bruto : 0;
  const clientesUnicos = new Set(recibos.map((r) => r.cliente.trim().toLowerCase())).size;

  // ── Dados por cliente ────────────────────────────────────────────────────
  const porCliente = useMemo(() => {
    const mapa: Record<string, { nome: string; bruto: number; liquido: number; count: number }> = {};
    recibos.forEach((r) => {
      const chave = r.cliente.trim().toLowerCase() || "(sem nome)";
      const c = calcularRecibo(r);
      if (!mapa[chave]) mapa[chave] = { nome: r.cliente.trim() || "Sem nome", bruto: 0, liquido: 0, count: 0 };
      mapa[chave].bruto += c.bruto;
      mapa[chave].liquido += c.liquido;
      mapa[chave].count += 1;
    });
    return Object.values(mapa).sort((a, b) => b.bruto - a.bruto);
  }, [recibos]);

  const maxClienteBruto = porCliente.length > 0 ? porCliente[0].bruto : 1;

  const campo = "w-full px-3.5 py-2.5 text-[16px] text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100 dark:placeholder-stone-500";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Gestão · Recibos verdes</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Recibos</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Os recibos registados na calculadora aparecem aqui com o cálculo detalhado.
          </p>
        </div>
        {recibos.length > 0 && (
          <ProGate title="Exportação Pro" description="Exporta os teus recibos em CSV ou PDF para enviar ao contabilista.">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadCSV(recibos)}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
              >
                <Export size={16} /> CSV
              </button>
              <button
                type="button"
                onClick={() => printRecibosPDF(recibos)}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:border-stone-300 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
              >
                <Export size={16} /> PDF
              </button>
            </div>
          </ProGate>
        )}
      </header>

      {recibos.length > 0 && (
        <ProHint id="export-contabilista" icon={<Export size={18} />} cta="Ver o que o Pro faz" className="mb-6">
          Vais entregar isto ao teu contabilista? No Pro, a exportação vira um relatório anual completo, pronto a
          enviar num clique.
        </ProHint>
      )}

      {!carregado ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-4xl border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900" />
        </div>
      ) : recibos.length === 0 ? (
        /* ── Estado vazio ───────────────────────────────────────────── */
        <div className="rounded-4xl border border-stone-100 bg-white p-8 shadow-card sm:p-10 dark:bg-stone-900 dark:border-stone-800">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-brand/15">
              <Receipt size={26} />
            </div>
            <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
              Ainda sem recibos
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Usa a calculadora para simular os teus recibos verdes e guarda-os aqui para acompanhar a tua faturação, impostos e líquido ao longo do ano.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#calculadora"
                className="btn-shine inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-dark hover:shadow-float"
              >
                <Sparkle size={14} />
                Ir para a calculadora
                <ArrowRight size={14} />
              </Link>
            </div>
            <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
              No final da simulação, clica em «Guardar no painel» para o recibo aparecer aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── KPIs ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard icon={<Wallet size={16} />} label="Total faturado" value={fmt(resumoTotal.bruto)} />
            <KpiCard icon={<Receipt size={16} />} label="Total líquido" value={fmt(resumoTotal.liquido)} accent />
            <KpiCard icon={<BarChart2 size={16} />} label="Taxa efetiva" value={pct(taxaEfetiva)} />
            <KpiCard icon={<Calendar size={16} />} label="Recibos" value={String(recibos.length)} sub={`${clientesUnicos} cliente${clientesUnicos !== 1 ? "s" : ""}`} />
          </div>

          {/* ── Gráficos: receita anual + distribuição ──────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ErrorBoundary fallback={null}>
              <ReceitaChart recibos={recibos} />
            </ErrorBoundary>
            <DistribuicaoCard resumo={resumoTotal} />
          </div>

          {/* ── Resumo impostos ──────────────────────────────────────── */}
          <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card sm:p-6 dark:bg-stone-900 dark:border-stone-800">
            <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
              Resumo de impostos
              <InfoTip>Valores acumulados de todos os recibos registados. A retenção na fonte e Seg. Social são adiantamentos — o valor final depende da declaração de IRS.</InfoTip>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ImpostoMini label="Retenção IRS" valor={resumoTotal.retencao} />
              <ImpostoMini label="Seg. Social" valor={resumoTotal.segSocial} />
              <ImpostoMini label="IVA cobrado" valor={resumoTotal.iva} />
              <ImpostoMini label="Média/recibo" valor={mediaRecibo} accent />
            </div>
          </div>

          {/* ── Distribuição por cliente ─────────────────────────────── */}
          {porCliente.length > 1 && (
            <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card sm:p-6 dark:bg-stone-900 dark:border-stone-800">
              <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
                Faturação por cliente
              </h2>
              <ul className="space-y-3">
                {porCliente.slice(0, 8).map((cl) => (
                  <li key={cl.nome}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-brand dark:bg-brand/15">
                          <User size={12} />
                        </span>
                        <span className="truncate text-sm font-medium text-stone-700 dark:text-stone-200">{cl.nome}</span>
                        <span className="flex-shrink-0 text-[11px] text-stone-400">{cl.count} {cl.count === 1 ? "recibo" : "recibos"}</span>
                      </div>
                      <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200">{fmt(cl.bruto)}</span>
                    </div>
                    <div className="ml-8 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className="h-full rounded-full bg-brand/70 transition-all duration-500"
                        style={{ width: `${(cl.bruto / maxClienteBruto) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Filtros + toggle vista ───────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar por cliente…"
                aria-label="Procurar recibos por cliente"
                className={campo}
              />
            </div>
            {mesesDisponiveis.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-stone-400" />
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  aria-label="Filtrar por mês"
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300"
                >
                  <option value="todos">Todos os meses</option>
                  {mesesDisponiveis.map((m) => (
                    <option key={m} value={m}>{nomeMes(m)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex rounded-xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setVista("lista")}
                aria-pressed={vista === "lista"}
                className={`px-3 py-2 text-xs font-semibold transition-colors rounded-l-xl ${vista === "lista" ? "bg-brand text-white" : "bg-white text-stone-500 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"}`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setVista("tabela")}
                aria-pressed={vista === "tabela"}
                className={`px-3 py-2 text-xs font-semibold transition-colors rounded-r-xl ${vista === "tabela" ? "bg-brand text-white" : "bg-white text-stone-500 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"}`}
              >
                Tabela
              </button>
            </div>
          </div>

          {/* ── Vista tabela ─────────────────────────────────────────── */}
          {vista === "tabela" ? (
            <div className="rounded-4xl border border-stone-100 bg-white shadow-card dark:bg-stone-900 dark:border-stone-800">
              <div className="-mx-px overflow-x-auto rounded-4xl">
                <table className="w-full min-w-[640px] border-collapse">
                  <caption className="sr-only">Tabela detalhada de recibos</caption>
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      <th scope="col" className="px-5 py-3 font-semibold">Cliente</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Data</th>
                      <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">Tipo</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">Bruto</th>
                      <th scope="col" className="hidden px-3 py-3 text-right font-semibold md:table-cell">IVA</th>
                      <th scope="col" className="hidden px-3 py-3 text-right font-semibold md:table-cell">Retenção</th>
                      <th scope="col" className="hidden px-3 py-3 text-right font-semibold lg:table-cell">Seg. Social</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">Líquido</th>
                      <th scope="col" className="px-3 py-3"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((r) => {
                      const c = calcularRecibo(r);
                      return (
                        <tr key={r.id} className="border-t border-stone-50 transition-colors hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/40">
                          <td className="px-5 py-3">
                            <span className="text-sm font-medium text-stone-800 dark:text-stone-100">{r.cliente || "Sem nome"}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-stone-500 dark:text-stone-400">{r.data}</td>
                          <td className="hidden px-3 py-3 sm:table-cell">
                            <Badge tone="neutral">{r.atividade ? r.atividade.split("·").pop()?.trim().slice(0, 20) ?? META_TIPO[r.tipo].label : META_TIPO[r.tipo].label}</Badge>
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-stone-700 dark:text-stone-300">{fmt(c.bruto)}</td>
                          <td className="hidden px-3 py-3 text-right text-sm tabular-nums text-stone-500 dark:text-stone-400 md:table-cell">{fmt(c.iva)}</td>
                          <td className="hidden px-3 py-3 text-right text-sm tabular-nums text-stone-500 dark:text-stone-400 md:table-cell">{fmt(c.retencaoIRS)}</td>
                          <td className="hidden px-3 py-3 text-right text-sm tabular-nums text-stone-500 dark:text-stone-400 lg:table-cell">{fmt(c.segSocial)}</td>
                          <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-brand">{fmt(c.liquido)}</td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => { if (window.confirm(`Remover o recibo de ${r.cliente || "sem nome"} (${fmt(r.valor)})?`)) remover(r.id); }}
                              aria-label={`Remover recibo de ${r.cliente}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filtrados.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-stone-200 dark:border-stone-700">
                        <td colSpan={3} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Total</td>
                        <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200">{fmt(filtrados.reduce((s, r) => s + calcularRecibo(r).bruto, 0))}</td>
                        <td className="hidden px-3 py-3 text-right text-sm font-semibold tabular-nums text-stone-500 dark:text-stone-400 md:table-cell">{fmt(filtrados.reduce((s, r) => s + calcularRecibo(r).iva, 0))}</td>
                        <td className="hidden px-3 py-3 text-right text-sm font-semibold tabular-nums text-stone-500 dark:text-stone-400 md:table-cell">{fmt(filtrados.reduce((s, r) => s + calcularRecibo(r).retencaoIRS, 0))}</td>
                        <td className="hidden px-3 py-3 text-right text-sm font-semibold tabular-nums text-stone-500 dark:text-stone-400 lg:table-cell">{fmt(filtrados.reduce((s, r) => s + calcularRecibo(r).segSocial, 0))}</td>
                        <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-brand">{fmt(filtrados.reduce((s, r) => s + calcularRecibo(r).liquido, 0))}</td>
                        <td className="px-3 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {filtrados.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-stone-400">Sem recibos para &ldquo;{query}&rdquo;.</p>
              )}
            </div>
          ) : (
            /* ── Vista lista (com agrupamento mensal) ──────────────── */
            <>
              {meses.length === 0 && <p className="text-sm text-stone-400">Sem recibos para &ldquo;{query}&rdquo;.</p>}
              {meses.map((mesKey) => {
                const doMes = grupos[mesKey];
                const resumoMes = resumir(doMes);
                const aberto = mesAberto === null || mesAberto === mesKey;
                return (
                  <div key={mesKey} className="rounded-4xl border border-stone-100 bg-white shadow-card dark:bg-stone-900 dark:border-stone-800">
                    {/* Cabeçalho do mês */}
                    <button
                      type="button"
                      onClick={() => setMesAberto(mesAberto === mesKey ? null : mesKey)}
                      aria-expanded={aberto}
                      className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-stone-700 capitalize dark:text-stone-200">{nomeMes(mesKey)}</h3>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {doMes.length} {doMes.length === 1 ? "recibo" : "recibos"} · Faturado {fmt(resumoMes.bruto)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-stone-400">líquido</div>
                          <div className="font-display text-base font-semibold tabular-nums text-brand">{fmt(resumoMes.liquido)}</div>
                        </div>
                        {aberto ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                      </div>
                    </button>

                    {aberto && (
                      <div className="border-t border-stone-50 px-5 pb-5 sm:px-6 dark:border-stone-800">
                        {/* Mini resumo mensal */}
                        <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-4">
                          <MesMini label="Retenção IRS" valor={resumoMes.retencao} />
                          <MesMini label="Seg. Social" valor={resumoMes.segSocial} />
                          <MesMini label="IVA cobrado" valor={resumoMes.iva} />
                          <MesMini label="Líquido" valor={resumoMes.liquido} accent />
                        </div>

                        {/* Lista de recibos do mês */}
                        <ul className="space-y-2">
                          {doMes.map((r) => {
                            const c = calcularRecibo(r);
                            return (
                              <li
                                key={r.id}
                                className="flex items-center gap-3 rounded-2xl border border-stone-50 bg-stone-50/50 p-3 transition-all hover:border-stone-200 sm:p-4 dark:bg-stone-800/30 dark:border-stone-800 dark:hover:border-stone-700"
                              >
                                <span className="hidden h-2 w-2 flex-shrink-0 rounded-full bg-brand sm:block" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{r.cliente || "Sem nome"}</span>
                                    <span className="flex-shrink-0 text-xs text-stone-400">{r.data}</span>
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-stone-400">
                                    <span>{r.atividade ? r.atividade.split("·").pop()?.trim().slice(0, 25) ?? META_TIPO[r.tipo].label : META_TIPO[r.tipo].label}</span>
                                    <span>·</span>
                                    <span>Bruto {fmt(c.bruto)}</span>
                                    {c.iva > 0 && <><span>·</span><span>IVA {fmt(c.iva)}</span></>}
                                    {c.retencaoIRS > 0 && <><span>·</span><span>Ret. {fmt(c.retencaoIRS)}</span></>}
                                    {c.segSocial > 0 && <><span>·</span><span>SS {fmt(c.segSocial)}</span></>}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <div className="font-display text-base font-semibold text-brand">{fmt(c.liquido)}</div>
                                  <div className="text-[11px] text-stone-400">líquido</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => { if (window.confirm(`Remover o recibo de ${r.cliente || "sem nome"} (${fmt(r.valor)})?`)) remover(r.id); }}
                                  aria-label={`Remover recibo de ${r.cliente}`}
                                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-red-50 hover:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  <Trash size={14} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── CTA calculadora ──────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-5 py-4 dark:border-stone-700 dark:bg-stone-800/30">
            <p className="text-sm text-stone-500 dark:text-stone-400">Adiciona mais recibos a partir da calculadora</p>
            <Link
              href="/#calculadora"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              Ir para a calculadora <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 dark:bg-stone-900 dark:border-stone-800">
      <div className="mb-2 flex items-center gap-1.5 text-stone-400 dark:text-stone-500">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-display text-lg font-semibold tabular-nums ${accent ? "text-brand" : "text-stone-800 dark:text-stone-100"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>}
    </div>
  );
}

function ImpostoMini({ label, valor, accent }: { label: string; valor: number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
      <div className="text-[11px] font-medium text-stone-400 dark:text-stone-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${accent ? "text-brand" : "text-stone-700 dark:text-stone-200"}`}>
        {fmt(valor)}
      </div>
    </div>
  );
}

function MesMini({ label, valor, accent }: { label: string; valor: number; accent?: boolean }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] font-medium text-stone-400 dark:text-stone-500">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${accent ? "text-brand" : "text-stone-600 dark:text-stone-300"}`}>
        {fmt(valor)}
      </div>
    </div>
  );
}

const SEG: { key: "liquido" | "retencao" | "segSocial"; label: string; color?: string; cls?: string }[] = [
  { key: "liquido", label: "Para ti", cls: "text-brand" },
  { key: "retencao", label: "Retenção IRS", color: "#9FE1CB" },
  { key: "segSocial", label: "Seg. Social", cls: "text-brand-deep" },
];

function DistribuicaoCard({ resumo }: { resumo: { liquido: number; retencao: number; segSocial: number; iva: number } }) {
  const real = resumo.liquido + resumo.retencao + resumo.segSocial;
  const vazio = real <= 0;
  const base = real || 1;
  const r = 52;
  const C = 2 * Math.PI * r;

  let acc = 0;
  const arcs = SEG.map((s) => {
    const v = resumo[s.key];
    const len = (v / base) * C;
    const arc = { ...s, value: v, len, offset: -acc };
    acc += len;
    return arc;
  });
  const teuPct = resumo.liquido / base;

  return (
    <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
      <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Distribuição total</h2>
      <div className="flex flex-1 items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden>
            <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" className="text-stone-100 dark:text-stone-800" strokeWidth="16" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="66"
                cy="66"
                r={r}
                fill="none"
                className={a.cls}
                stroke={a.cls ? "currentColor" : a.color}
                strokeWidth="16"
                strokeLinecap="butt"
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={a.offset}
                transform="rotate(-90 66 66)"
                style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold text-brand tabular-nums">{vazio ? "—" : pct(teuPct)}</span>
            <span className="text-[11px] text-stone-400">{vazio ? "sem dados" : "é teu"}</span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2.5">
          {arcs.map((a) => (
            <li key={a.key} className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${a.cls ?? ""}`}
                style={{ background: a.cls ? "currentColor" : a.color }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-stone-500 dark:text-stone-400">{a.label}</span>
              <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-300">{fmt(a.value)}</span>
            </li>
          ))}
          {resumo.iva > 0 && (
            <li className="flex items-center gap-2 border-t border-stone-100 pt-2 dark:border-stone-800">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
              <span className="min-w-0 flex-1 truncate text-xs text-stone-500 dark:text-stone-400">IVA cobrado</span>
              <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-300">{fmt(resumo.iva)}</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
