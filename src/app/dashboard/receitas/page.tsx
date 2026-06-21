"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRecibos, calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { fmt, pct } from "@/lib/format";
import { Receipt } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";
import { META_TIPO, type TipoAtividade } from "@/lib/fiscal-data";

type Periodo = "ano" | "tudo";

function nomeMes(k: string) {
  const [ano, mes] = k.split("-");
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

export default function ReceitasPage() {
  const { recibos, carregado } = useRecibos();
  const [periodo, setPeriodo] = useState<Periodo>("ano");

  const filtrados = useMemo(() => {
    if (periodo === "tudo") return recibos;
    const ano = new Date().getFullYear();
    return recibos.filter((r) => new Date(r.data + "T00:00:00").getFullYear() === ano);
  }, [recibos, periodo]);

  const kpis = useMemo(() => {
    const bruto = filtrados.reduce((s, r) => s + r.valor, 0);
    const liquido = filtrados.reduce((s, r) => s + calcularRecibo(r).liquido, 0);
    const total = filtrados.length;
    return { bruto, liquido, total, ticket: total ? bruto / total : 0 };
  }, [filtrados]);

  const categorias = useMemo(() => {
    const m = new Map<TipoAtividade, number>();
    filtrados.forEach((r) => m.set(r.tipo, (m.get(r.tipo) ?? 0) + r.valor));
    const arr = [...m.entries()].map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);
    const max = arr[0]?.valor ?? 1;
    return { arr, max, total: kpis.bruto };
  }, [filtrados, kpis.bruto]);

  const clientes = useMemo(() => {
    const m = new Map<string, number>();
    filtrados.forEach((r) => m.set(r.cliente || "Sem nome", (m.get(r.cliente || "Sem nome") ?? 0) + r.valor));
    return [...m.entries()].map(([cliente, valor]) => ({ cliente, valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);
  }, [filtrados]);

  const grupos = useMemo(() => {
    const g = filtrados.reduce<Record<string, Recibo[]>>((acc, r) => {
      (acc[r.data.slice(0, 7)] ??= []).push(r);
      return acc;
    }, {});
    return Object.keys(g).sort((a, b) => b.localeCompare(a)).map((k) => ({ k, recibos: g[k] }));
  }, [filtrados]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">Análise · {new Date().getFullYear()}</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Receitas</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">A evolução do teu rendimento, por mês e por categoria.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 dark:bg-stone-900 dark:border-stone-700">
          {([
            { id: "ano", label: `${new Date().getFullYear()}` },
            { id: "tudo", label: "Tudo" },
          ] as const).map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={periodo === o.id}
              onClick={() => setPeriodo(o.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${periodo === o.id ? "bg-brand text-white" : "text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </header>

      {!carregado ? (
        <div className="p-10 text-center text-sm text-stone-400">A carregar…</div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-4xl border border-stone-100 bg-white p-10 text-center shadow-card dark:bg-stone-900 dark:border-stone-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-brand/15">
            <Receipt size={22} />
          </div>
          <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">Sem receitas neste período</h2>
          <p className="mx-auto mb-6 mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">Regista recibos para veres aqui a tua timeline e categorias.</p>
          <Link href="/dashboard/recibos" className="btn-shine inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float">
            <Receipt size={16} /> Registar recibo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── KPIs: hero líquido + 3 satélites ── */}
          <div className="grid grid-cols-12 gap-4">
            {/* Métrica principal */}
            <div className="col-span-12 lg:col-span-8">
              <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-7 text-white shadow-glow">
                <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
                <div className="relative">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">
                    Líquido para ti · {periodo === "ano" ? new Date().getFullYear() : "todo o período"}
                  </div>
                  <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums sm:text-6xl lg:text-7xl">
                    {fmt(kpis.liquido)}
                  </div>
                  {kpis.bruto > 0 && (
                    <div className="mt-4">
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="rounded-full bg-white/70"
                          style={{ width: `${Math.round((kpis.liquido / kpis.bruto) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-[11px] text-green-100/50">
                        {Math.round((kpis.liquido / kpis.bruto) * 100)}% do faturado fica para ti
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3 satélites */}
            <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
              {[
                { l: "Faturado", v: fmt(kpis.bruto) },
                { l: "Recibos emitidos", v: String(kpis.total) },
                { l: "Ticket médio", v: fmt(kpis.ticket) },
              ].map((k) => (
                <div key={k.l} className="flex-1 rounded-3xl border border-stone-100 bg-white px-4 py-4 shadow-card dark:bg-stone-900 dark:border-stone-800">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{k.l}</div>
                  <div className="mt-1 font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">{k.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Categorias por tipo */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
              <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Por categoria</h2>
              <div className="space-y-3">
                {categorias.arr.map((c) => (
                  <div key={c.tipo}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-stone-600 dark:text-stone-300">{META_TIPO[c.tipo].label}</span>
                      <span className="font-semibold tabular-nums text-stone-700 dark:text-stone-300">
                        {fmt(c.valor)} <span className="text-xs font-normal text-stone-400">· {pct(c.valor / (categorias.total || 1))}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(c.valor / categorias.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top clientes */}
            <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
              <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Principais clientes</h2>
              <ul className="space-y-2.5">
                {clientes.map((c, i) => (
                  <li key={c.cliente} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-xs font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-700 dark:text-stone-300">{c.cliente}</span>
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-300">{fmt(c.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:bg-stone-900 dark:border-stone-800">
            <h2 className="mb-5 text-sm font-semibold text-stone-700 dark:text-stone-200">Timeline</h2>
            <div className="space-y-6">
              {grupos.map((g) => {
                const subtotal = g.recibos.reduce((s, r) => s + r.valor, 0);
                return (
                  <div key={g.k}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 capitalize">{nomeMes(g.k)}</h3>
                      <span className="text-xs text-stone-400">{fmt(subtotal)}</span>
                    </div>
                    <ul className="relative space-y-3 border-l-2 border-stone-100 dark:border-stone-800 pl-5">
                      {g.recibos.map((r) => {
                        const c = calcularRecibo(r);
                        return (
                          <li key={r.id} className="relative">
                            <span className="absolute -left-[1.5rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-stone-900 bg-brand" />
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{r.cliente || "Sem nome"}</span>
                                  <span className="flex-shrink-0 text-xs text-stone-400">{r.data}</span>
                                </div>
                                <div className="mt-0.5">
                                  <Badge tone="neutral">{META_TIPO[r.tipo].label}</Badge>
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <div className="font-display text-sm font-semibold text-stone-800 dark:text-stone-100">{fmt(r.valor)}</div>
                                <div className="text-[11px] text-brand">{fmt(c.liquido)} líquido</div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
