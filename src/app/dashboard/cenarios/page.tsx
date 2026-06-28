"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCenarios,
  marcarReabertura,
  META_TIPO_CENARIO,
  type Cenario,
  type TipoCenario,
} from "@/lib/store/cenarios";
import { fmt, pct } from "@/lib/format";
import {
  Invoice, Wallet, Building, Calculator, Trash, Export, ArrowRight, Sparkle, Lock,
} from "@/components/ui/Icons";
import type { ReactNode } from "react";

const ICONES: Record<string, (p: { size?: number; className?: string }) => ReactNode> = {
  Invoice, Wallet, Building, Calculator,
};

const SIMULADORES: { tipo: TipoCenario; rota: string }[] = [
  { tipo: "recibos", rota: META_TIPO_CENARIO.recibos.rota },
  { tipo: "vencimento", rota: META_TIPO_CENARIO.vencimento.rota },
  { tipo: "empresa", rota: META_TIPO_CENARIO.empresa.rota },
  { tipo: "irs", rota: META_TIPO_CENARIO.irs.rota },
];

const fmtValor = (v: number, f?: "eur" | "pct") => (f === "pct" ? pct(v) : fmt(v));
const dataPt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Exportação refinada (CSV) — preserva todos os dados (snapshot completo) ──
function exportarCenariosCSV(cenarios: Cenario[]): void {
  if (typeof window === "undefined") return;
  const cell = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
  const num = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
  const linhas: string[] = [
    "ReciboCerto — Cenários guardados;;;;",
    `Exportado em;${new Date().toLocaleString("pt-PT")};;;`,
    "",
    "Tipo;Nome;Criado em;Destaque;Valor;Dados (instantâneo completo, JSON)",
  ];
  for (const c of cenarios) {
    linhas.push(
      [
        cell(META_TIPO_CENARIO[c.tipo].label),
        cell(c.nome),
        cell(dataPt(c.criadoEm)),
        cell(c.resumo.destaqueLabel),
        c.resumo.destaqueFmt === "pct" ? cell(pct(c.resumo.destaque)) : num(c.resumo.destaque),
        cell(JSON.stringify(c.dados)),
      ].join(";")
    );
  }
  const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cenarios-recibocerto.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CenariosPage() {
  const router = useRouter();
  const { cenarios, carregado, naNuvem, plano, limite, limiteAtingido, remover } = useCenarios();

  const porTipo = useMemo(() => {
    const grupos: Record<TipoCenario, Cenario[]> = { recibos: [], vencimento: [], empresa: [], irs: [] };
    for (const c of cenarios) grupos[c.tipo]?.push(c);
    return grupos;
  }, [cenarios]);

  const abrir = (c: Cenario) => {
    marcarReabertura(c);
    router.push(META_TIPO_CENARIO[c.tipo].rota);
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="eyebrow mb-2 text-brand">Gestão</div>
          <h1 className="display-2 font-display font-semibold text-stone-800 dark:text-stone-100">Os meus cenários</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
            Tudo o que simulaste num só lugar — recibos verdes, salário, empresa e IRS. Cada cenário guarda todos os
            dados que preencheste, para reabrires e continuares de onde ficaste.
          </p>
        </div>
        {cenarios.length > 0 && (
          <button
            type="button"
            onClick={() => exportarCenariosCSV(cenarios)}
            className="group inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 shadow-card transition-all hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300"
          >
            <Export size={16} /> Exportar CSV
          </button>
        )}
      </header>

      {/* Estado do plano / limite */}
      <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${limiteAtingido ? "border-alert-border bg-alert-bg" : "border-stone-100 bg-white shadow-card dark:border-stone-700 dark:bg-stone-900"}`}>
        <span className={`mt-0.5 flex-shrink-0 ${limiteAtingido ? "text-alert-text" : "text-brand"}`}>
          {naNuvem ? <Sparkle size={16} /> : <Lock size={16} />}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {naNuvem ? (
            <p className="text-stone-600 dark:text-stone-300">
              <span className="font-semibold text-brand-dark dark:text-brand">Pro</span> — cenários ilimitados, sincronizados na nuvem entre dispositivos.
            </p>
          ) : (
            <p className={limiteAtingido ? "text-alert-text" : "text-stone-600 dark:text-stone-300"}>
              {cenarios.length}/{limite} cenário guardado no plano grátis.{" "}
              <Link href="/dashboard/upgrade" className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand">
                Passa a Pro
              </Link>{" "}
              para guardares todos e sincronizares na nuvem.
            </p>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {!carregado ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900" />
          ))}
        </div>
      ) : cenarios.length === 0 ? (
        <EstadoVazio />
      ) : (
        <div className="space-y-8">
          {SIMULADORES.map(({ tipo }) => {
            const lista = porTipo[tipo];
            if (lista.length === 0) return null;
            const meta = META_TIPO_CENARIO[tipo];
            const Icon = ICONES[meta.icone] ?? Calculator;
            return (
              <section key={tipo}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                    <Icon size={17} />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">{meta.label}</h2>
                    <p className="text-[11px] text-stone-400">{meta.sub}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">{lista.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {lista.map((c) => (
                    <CartaoCenario key={c.id} cenario={c} onAbrir={() => abrir(c)} onRemover={() => remover(c.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CartaoCenario({ cenario, onAbrir, onRemover }: { cenario: Cenario; onAbrir: () => void; onRemover: () => void }) {
  const { resumo } = cenario;
  return (
    <div className="flex flex-col rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{cenario.nome || "Cenário sem nome"}</div>
          <div className="text-[11px] text-stone-400">{dataPt(cenario.criadoEm)}</div>
        </div>
        <button type="button" onClick={onRemover} aria-label="Apagar cenário" className="flex-shrink-0 rounded-lg p-1 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-stone-600 dark:hover:bg-red-950/30">
          <Trash size={15} />
        </button>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{resumo.destaqueLabel}</div>
        <div className="font-display text-2xl font-semibold tabular-nums text-brand">{fmtValor(resumo.destaque, resumo.destaqueFmt)}</div>
      </div>

      {resumo.linhas.length > 0 && (
        <div className="mt-3 space-y-1">
          {resumo.linhas.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">{l.label}</span>
              <span className="font-medium tabular-nums text-stone-700 dark:text-stone-300">{fmtValor(l.valor, l.fmt)}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAbrir}
        className="group mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:border-brand"
      >
        Abrir e continuar <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function EstadoVazio() {
  return (
    <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-8 text-center shadow-card dark:border-stone-700 dark:bg-stone-900">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
        <Calculator size={22} />
      </span>
      <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Ainda não guardaste cenários</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Em qualquer simulador, no fim, toca em «Guardar cenário» — aparece aqui com todos os dados, pronto a reabrir.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SIMULADORES.map(({ tipo, rota }) => {
          const meta = META_TIPO_CENARIO[tipo];
          const Icon = ICONES[meta.icone] ?? Calculator;
          return (
            <Link key={tipo} href={rota} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300">
              <Icon size={15} /> {meta.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
