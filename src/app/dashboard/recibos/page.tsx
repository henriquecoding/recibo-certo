"use client";

import { useState } from "react";
import Link from "next/link";
import { useRecibos, calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { downloadCSV, printRecibosPDF } from "@/lib/export";
import { fmt, pct } from "@/lib/format";
import { Trash, Pencil, Receipt, Export, ArrowRight, BarChart2, Calendar, Wallet, Sparkle, Filter } from "@/components/ui/Icons";
import ProGate from "@/components/ui/ProGate";
import ProHint from "@/components/ui/ProHint";
import { META_TIPO } from "@/lib/fiscal-data";

export default function RecibosPage() {
  const { recibos, carregado, remover } = useRecibos();
  const [query, setQuery] = useState("");
  const [filtroMes, setFiltroMes] = useState<string>("todos");

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

  const totalBruto = recibos.reduce((s, r) => s + r.valor, 0);
  const totalLiquido = recibos.reduce((s, r) => s + calcularRecibo(r).liquido, 0);
  const totalIva = recibos.reduce((s, r) => s + calcularRecibo(r).iva, 0);
  const mediaRecibo = recibos.length > 0 ? totalLiquido / recibos.length : 0;
  const taxaEfetiva = totalBruto > 0 ? 1 - totalLiquido / totalBruto : 0;

  const clientesUnicos = new Set(recibos.map((r) => r.cliente.trim().toLowerCase())).size;

  const campo = "w-full px-3.5 py-2.5 text-[16px] text-stone-800 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100 dark:placeholder-stone-500";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Gestão · Recibos verdes</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Recibos</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Os recibos registados na calculadora aparecem aqui com o cálculo detalhado.</p>
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
        <div className="p-10 text-center text-sm text-stone-400">A carregar…</div>
      ) : recibos.length === 0 ? (
        /* ── Estado vazio — guiar para a calculadora ──────────────────── */
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
          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard icon={<Wallet size={16} />} label="Total faturado" value={fmt(totalBruto)} />
            <KpiCard icon={<Receipt size={16} />} label="Total líquido" value={fmt(totalLiquido)} accent />
            <KpiCard icon={<BarChart2 size={16} />} label="Taxa efetiva" value={pct(taxaEfetiva)} />
            <KpiCard icon={<Calendar size={16} />} label="Recibos" value={String(recibos.length)} sub={`${clientesUnicos} cliente${clientesUnicos !== 1 ? "s" : ""}`} />
          </div>

          {/* ── Filtros ──────────────────────────────────────────────────── */}
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
          </div>

          {/* ── Média por recibo ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-4 py-3 dark:bg-stone-900 dark:border-stone-800">
            <span className="text-xs text-stone-400 dark:text-stone-500">Média por recibo:</span>
            <span className="text-sm font-semibold tabular-nums text-brand">{fmt(mediaRecibo)}</span>
            {totalIva > 0 && (
              <>
                <span className="text-xs text-stone-300 dark:text-stone-600">|</span>
                <span className="text-xs text-stone-400 dark:text-stone-500">IVA total:</span>
                <span className="text-sm font-semibold tabular-nums text-stone-600 dark:text-stone-300">{fmt(totalIva)}</span>
              </>
            )}
          </div>

          {/* ── Lista de recibos ─────────────────────────────────────────── */}
          {meses.length === 0 && <p className="text-sm text-stone-400">Sem recibos para &ldquo;{query}&rdquo;.</p>}
          {meses.map((mesKey) => {
            const doMes = grupos[mesKey];
            const subtotal = doMes.reduce((s, r) => s + calcularRecibo(r).liquido, 0);
            return (
              <div key={mesKey}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 capitalize">{nomeMes(mesKey)}</h3>
                  <span className="text-xs text-stone-400">
                    líquido <span className="font-semibold text-brand">{fmt(subtotal)}</span>
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {doMes.map((r) => {
                    const c = calcularRecibo(r);
                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 rounded-3xl border border-stone-100 bg-white p-4 transition-all hover:border-stone-200 hover:shadow-card dark:bg-stone-900 dark:border-stone-800 dark:hover:border-stone-700"
                      >
                        <span className="hidden h-2 w-2 flex-shrink-0 rounded-full bg-brand sm:block" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{r.cliente || "Sem nome"}</span>
                            <span className="flex-shrink-0 text-xs text-stone-400">{r.data}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-stone-400">
                            {r.atividade ?? META_TIPO[r.tipo].label} · {fmt(r.valor)}
                            {c.iva > 0 && ` · IVA ${fmt(c.iva)}`}
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
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-stone-300 transition-all hover:bg-clay-bg hover:text-clay-text"
                        >
                          <Trash size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* ── CTA calculadora ──────────────────────────────────────────── */}
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
