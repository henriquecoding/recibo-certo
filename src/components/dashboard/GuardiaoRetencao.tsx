"use client";

import Link from "next/link";
import { fmt, pct } from "@/lib/format";
import { type Recibo } from "@/lib/recibos-contrato";
import { avaliarRetencao, type VeredictoRetencao } from "@/lib/fiscal-retencao-guardiao";
import { type PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { ShieldCheck, Warning, ArrowRight } from "@/components/ui/Icons";

// A decisão vive em `fiscal-retencao-guardiao.ts`. O cartão distingue quatro
// situações que antes eram uma só escala: poder pedir a dispensa, tê-la
// exercido, ter de reter, e o pagador que nunca retém (RC-P1-03).
const TOM: Record<VeredictoRetencao["severidade"], { borda: string; fundo: string; badge: string; icone: React.ReactNode }> = {
  neutro: {
    borda: "border-stone-100 dark:border-stone-800",
    fundo: "bg-white dark:bg-stone-900",
    badge: "bg-brand/10 text-brand-dark dark:text-brand-mint",
    icone: <ShieldCheck size={16} className="text-brand" />,
  },
  aviso: {
    borda: "border-amber-200 dark:border-amber-800/40",
    fundo: "bg-amber-50 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    icone: <Warning size={16} className="text-amber-600" />,
  },
  alerta: {
    borda: "border-alert-text/30",
    fundo: "bg-alert-bg dark:bg-amber-950/20",
    badge: "bg-alert-text/10 text-alert-text",
    icone: <Warning size={16} className="text-alert-text" />,
  },
};

const ETIQUETA: Record<VeredictoRetencao["estado"], string> = {
  "sem-informacao": "Por confirmar",
  "pode-dispensar": "Podes dispensar",
  "optou-dispensa": "Dispensa exercida",
  aviso: "Atenção",
  "deve-reter": "Retenção obrigatória",
};

export default function GuardiaoRetencao({
  recibos,
  ano,
  prefs,
}: {
  recibos: Recibo[];
  ano: number;
  prefs: PreferenciasFiscais;
}) {
  const v = avaliarRetencao({
    recibos,
    ano,
    optouDispensa: prefs.optouDispensaRetencao === "nao-sei" ? null : prefs.optouDispensaRetencao === "sim",
    faturadoAnoAnterior: prefs.faturacaoAnoAnterior,
  });

  const tom = TOM[v.severidade];
  const ratio = v.limite > 0 ? Math.min(1, v.faturado / v.limite) : 0;

  return (
    <div className={`rounded-4xl border p-6 shadow-card ${tom.borda} ${tom.fundo}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Retenção na fonte</h2>
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ${tom.badge}`}>
          {tom.icone}
          {ETIQUETA[v.estado]}
        </span>
      </div>

      <p className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-100">{v.titulo}</p>
      <p className="mb-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{v.mensagem}</p>

      {/* Progresso visual */}
      <div className="mb-3 space-y-1.5">
        <div className="flex justify-between text-xs text-stone-400">
          <span>{fmt(v.faturado)} faturado</span>
          <span>limite {fmt(v.limite)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              v.severidade === "alerta" ? "bg-alert-text" : v.severidade === "aviso" ? "bg-amber-400" : "bg-brand"
            }`}
            style={{ width: `${(ratio * 100).toFixed(1)}%` }}
          />
        </div>
        <p className="text-[11px] text-stone-400">
          Previsão para o ano inteiro, ao ritmo atual: <strong className="text-stone-600 dark:text-stone-300">{fmt(v.previsaoAnual)}</strong>
        </p>
      </div>

      {/* Detalhe fiscal */}
      <div className="space-y-1 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50">
        {/* Taxas ponderadas por VALOR faturado, não por número de recibos: dez
            faturas de 50 € não descrevem melhor o ano do que uma de 40 000 €. */}
        {v.taxas.length === 0 ? (
          <p className="text-xs text-stone-500">Sem recibos em {ano} — a taxa aplicável depende da atividade.</p>
        ) : v.taxas.length === 1 ? (
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Taxa de retenção aplicável</span>
            <span className="font-semibold text-stone-700 dark:text-stone-300">{pct(v.taxas[0].taxa)}</span>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">Taxas em uso, por peso na faturação</p>
            {v.taxas.map((t) => (
              <div key={`${t.tipo}-${t.taxa}`} className="flex justify-between text-xs">
                <span className="text-stone-500">{pct(t.taxa)} · {fmt(t.base)}</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{pct(t.peso)} do faturado</span>
              </div>
            ))}
          </>
        )}
        {v.cessaEm && (
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Dispensa cessa em</span>
            <span className="font-medium text-alert-text">{v.cessaEm}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Base legal</span>
          <span className="font-medium text-stone-600 dark:text-stone-400">{v.base}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Imposto inferior a 25 €</span>
          <span className="font-medium text-stone-600 dark:text-stone-400">Sempre dispensado</span>
        </div>
        <p className="pt-1 text-[10px] leading-relaxed text-stone-400">
          Particulares, clientes estrangeiros e entidades sem contabilidade organizada não retêm — qualquer que seja
          o teu volume de faturação.
        </p>
      </div>

      {/* O que falta saber para o veredicto deixar de ser condicional. */}
      {v.emFalta.length > 0 && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white/60 p-3 dark:border-stone-700 dark:bg-stone-800/40">
          <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Para te dizermos ao certo, falta saber:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {v.emFalta.map((f) => (
              <li key={f} className="text-[11px] text-stone-500 dark:text-stone-400">{f}</li>
            ))}
          </ul>
          <Link href="/dashboard/perfil" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
            Completar no perfil fiscal <ArrowRight size={10} />
          </Link>
        </div>
      )}
    </div>
  );
}
