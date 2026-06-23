"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Painel adaptativo da Visão Geral para os tipos de cenário que NÃO são
//  recibos verdes (por conta de outrem / empresa). Lê o repositório unificado
//  de cenários e mostra os números-chave + uma leitura visual do cenário mais
//  recente do tipo escolhido, com atalhos para reabrir e gerir.
//  Quando ainda não há cenários, mostra um estado vazio com CTA para o
//  simulador correspondente.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCenarios,
  marcarReabertura,
  META_TIPO_CENARIO,
  type Cenario,
  type TipoCenario,
} from "@/lib/store/cenarios";
import { fmt, pct } from "@/lib/format";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Wallet, Building, ArrowRight, Calculator, Sparkle } from "@/components/ui/Icons";

const fmtValor = (v: number, f?: "eur" | "pct") => (f === "pct" ? pct(v) : fmt(v));

const COPY: Record<"vencimento" | "empresa", { Icon: typeof Wallet; heroLabel: string; vazioTitulo: string; vazioTexto: string }> = {
  vencimento: {
    Icon: Wallet,
    heroLabel: "Líquido mensal estimado",
    vazioTitulo: "Ainda não simulaste o teu vencimento",
    vazioTexto: "Calcula o teu salário líquido — IRS retido, Segurança Social e subsídios — e guarda o cenário para o veres aqui.",
  },
  empresa: {
    Icon: Building,
    heroLabel: "Líquido do dono / ano",
    vazioTitulo: "Ainda não simulaste a tua empresa",
    vazioTexto: "Estima o líquido via sociedade — IRC, derrama, dividendos e benefícios — e guarda o cenário para o veres aqui.",
  },
};

export default function PainelCenarioTipo({ tipo }: { tipo: "vencimento" | "empresa" }) {
  const router = useRouter();
  const { cenarios, carregado, naNuvem } = useCenarios();
  const meta = META_TIPO_CENARIO[tipo as TipoCenario];
  const copy = COPY[tipo];

  const lista = useMemo(() => cenarios.filter((c) => c.tipo === tipo), [cenarios, tipo]);
  const atual = lista[0];

  const abrir = (c: Cenario) => {
    marcarReabertura(c);
    router.push(meta.rota);
  };

  if (!carregado) {
    return (
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 h-56 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900 lg:col-span-8" />
        <div className="col-span-12 h-56 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900 lg:col-span-4" />
      </div>
    );
  }

  if (!atual) {
    const Icon = copy.Icon;
    return (
      <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-8 text-center shadow-card dark:border-stone-700 dark:bg-stone-900">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
          <Icon size={22} />
        </span>
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">{copy.vazioTitulo}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">{copy.vazioTexto}</p>
        <Link
          href={meta.rota}
          className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float"
        >
          <Calculator size={16} /> Abrir o simulador
        </Link>
      </div>
    );
  }

  const { resumo } = atual;
  // Leitura visual: proporção do destaque (líquido) face ao maior valor das linhas
  // em euros (tipicamente a faturação/bruto), para uma barra de "quanto fica".
  const baseEur = Math.max(
    resumo.destaqueFmt === "pct" ? 0 : resumo.destaque,
    ...resumo.linhas.filter((l) => l.fmt !== "pct").map((l) => l.valor),
    1
  );
  const proporcao = Math.min(100, Math.round((resumo.destaque / baseEur) * 100));

  return (
    <div className="grid grid-cols-12 items-start gap-4">
      {/* Hero do cenário escolhido */}
      <div className="col-span-12 lg:col-span-8">
        <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-7 text-white shadow-glow sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">{meta.label}</div>
              <div className="mt-0.5 truncate text-sm font-medium text-green-100/80">{atual.nome || "Cenário guardado"}</div>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-green-100 backdrop-blur">
              {naNuvem ? "Na nuvem" : "Neste dispositivo"}
            </span>
          </div>

          <div className="relative mt-4">
            <div className="text-xs font-medium uppercase tracking-wider text-green-100/60">{copy.heroLabel}</div>
            <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums sm:text-5xl lg:text-6xl">
              <AnimatedNumber value={resumo.destaque} />
            </div>
          </div>

          {resumo.destaqueFmt !== "pct" && (
            <div className="relative mt-5">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="rounded-full bg-white/70 transition-all duration-700" style={{ width: `${proporcao}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-green-100/50">{proporcao}% do total fica para ti</div>
            </div>
          )}

          <div className="relative mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => abrir(atual)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              Abrir e continuar <ArrowRight size={14} />
            </button>
            <Link
              href="/dashboard/cenarios"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/25 px-4 py-2.5 text-sm font-semibold text-green-50 transition-colors hover:bg-white/10"
            >
              Os meus cenários
            </Link>
          </div>
        </div>
      </div>

      {/* Números-chave */}
      <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
        <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Resumo do cenário</h2>
          {resumo.linhas.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-stone-500 dark:text-stone-400">{l.label}</span>
              <span className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-300">{fmtValor(l.valor, l.fmt)}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{resumo.destaqueLabel}</span>
              <span className="text-sm font-semibold tabular-nums text-brand">{fmtValor(resumo.destaque, resumo.destaqueFmt)}</span>
            </div>
          </div>
        </div>

        {lista.length > 1 && (
          <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
              <Sparkle size={14} className="text-brand" /> Outros cenários
            </div>
            <ul className="space-y-1.5">
              {lista.slice(1, 4).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => abrir(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <span className="min-w-0 truncate text-xs text-stone-500 dark:text-stone-400">{c.nome || "Cenário"}</span>
                    <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-brand">{fmtValor(c.resumo.destaque, c.resumo.destaqueFmt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
