"use client";

import { m } from "motion/react";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { faturadoNoAno, type Recibo } from "@/lib/recibos-contrato";
import { avaliarIVA, type VeredictoIVA } from "@/lib/fiscal-iva-guardiao";
import { type PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { EASE } from "@/lib/motion";

// A decisão vive em `fiscal-iva-guardiao.ts`, derivada dos Art. 53.º/58.º do
// CIVA. Aqui só se desenha — a ordem dos estados e a matemática do excesso
// deixaram de estar espalhadas pelo JSX (RC-P0-07).
export { projetarDataLimite } from "@/lib/fiscal-iva-guardiao";

const TOM: Record<VeredictoIVA["severidade"], { borda: string; texto: string; barra: string; badge: string | null }> = {
  neutro:  { borda: "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900", texto: "text-stone-500 dark:text-stone-400", barra: "bg-brand", badge: null },
  aviso:   { borda: "border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20", texto: "text-amber-700 dark:text-amber-400", barra: "bg-amber-400", badge: "Aviso" },
  alerta:  { borda: "border-alert-text/30 bg-alert-bg dark:bg-amber-950/20", texto: "text-alert-text", barra: "bg-alert-text", badge: "Alerta" },
  urgente: { borda: "border-clay-text/30 bg-clay-bg dark:bg-red-950/20", texto: "text-clay-text", barra: "bg-clay-text", badge: "Urgente" },
};

export default function IvaProgresso({
  recibos,
  ano,
  prefs,
}: {
  recibos: Recibo[];
  ano: number;
  prefs: PreferenciasFiscais;
}) {
  const v = avaliarIVA({
    faturadoNoAno: faturadoNoAno(recibos, ano),
    // A isenção do Art. 53.º afere-se pelo volume do ano ANTERIOR. Se o
    // utilizador não o indicou, usamos o que está registado — e se também não
    // houver nada registado desse ano, fica desconhecido em vez de zero.
    faturadoAnoAnterior:
      prefs.faturacaoAnoAnterior ??
      (recibos.some((r) => r.data.startsWith(String(ano - 1))) ? faturadoNoAno(recibos, ano - 1) : null),
    regime: prefs.regimeIVA === "desconhecido" ? null : prefs.regimeIVA,
  });

  const tom = TOM[v.severidade];
  const pctBarra = Math.min(100, v.percentagem);

  return (
    <div className={`rounded-4xl border p-6 shadow-card ${tom.borda}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{v.titulo}</h2>
        {tom.badge && (
          <span className={`text-xs font-bold uppercase tracking-wide ${tom.texto}`}>{tom.badge}</span>
        )}
      </div>

      <p className={`mb-4 text-xs font-medium leading-relaxed ${tom.texto}`}>{v.mensagem}</p>

      {v.acao && (
        <p className="mb-3 rounded-xl bg-white/60 px-3 py-2 text-xs font-semibold leading-relaxed text-stone-700 dark:bg-stone-800/60 dark:text-stone-200">
          {v.acao}
        </p>
      )}

      {v.projecao && (
        <p className="mb-3 text-xs text-stone-400">
          Ao ritmo atual, ultrapassas o limite em{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {v.projecao.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
          </span>
        </p>
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">{fmt(v.faturado)}</span>
        <span className="text-xs text-stone-400">de {fmt(v.limite)}</span>
      </div>

      {/* Barra de progresso com marcadores de limiar */}
      <div className="relative">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
          role="progressbar"
          aria-valuenow={Math.round(v.percentagem)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Faturação: ${Math.round(v.percentagem)}% do limite de isenção de IVA`}
        >
          <m.div
            initial={{ width: "0%" }}
            whileInView={{ width: `${pctBarra}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className={`h-full rounded-full ${tom.barra}`}
          />
        </div>
        {[80, 90].map((p) => (
          <div key={p} className="absolute top-0 h-2.5 w-px bg-stone-300 dark:bg-stone-600" style={{ left: `${p}%` }} />
        ))}
      </div>

      <div className="relative mt-1 text-[10px] text-stone-400">
        {[80, 90].map((p) => (
          <span key={p} className="absolute" style={{ left: `${p}%`, transform: "translateX(-50%)" }}>{p}%</span>
        ))}
        <span className="block text-right">{v.percentagem.toFixed(0)}%</span>
      </div>

      {/* Restante e excesso são grandezas distintas e nunca partilham o número:
          o cartão anterior reutilizava o restante truncado a zero como
          "Excedido em" e mostrava 0 € de excesso a quem tinha excedido. */}
      {(v.excesso > 0 || v.restante > 0) && (
        <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
          <span className="text-xs text-stone-400">
            {v.excesso > 0 ? "Excedido em" : "Faltam"}{" "}
            <strong className="text-stone-600 dark:text-stone-300">{fmt(v.excesso > 0 ? v.excesso : v.restante)}</strong>
          </span>
          <Link href="/guias/iva-recibos-verdes" className="text-xs font-semibold text-brand hover:underline">
            Ver guia →
          </Link>
        </div>
      )}

      <p className="mt-3 text-[10px] text-stone-400">Base legal: {v.base}</p>
    </div>
  );
}
