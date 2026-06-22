"use client";

import { m } from "motion/react";
import { IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { type Recibo } from "@/lib/store/recibos";
import { EASE } from "@/lib/motion";
import Link from "next/link";

// ── Função pura exportável para testes ───────────────────────────────────────
export function projetarDataLimite(
  faturado: number,
  limite: number,
  mesAtual: number, // 0-indexed (Date.getMonth())
): Date | null {
  if (faturado >= limite) return null;
  const mesesDecorridos = mesAtual + 1;
  if (mesesDecorridos <= 0) return null;
  const mediaMensal = faturado / mesesDecorridos;
  if (mediaMensal <= 0) return null;
  const mesesRestantes = Math.ceil((limite - faturado) / mediaMensal);
  if (mesesRestantes <= 0) return null;
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + mesesRestantes, 1);
}

// ── 6 níveis de alerta (ordem de precedência) ────────────────────────────────
type Nivel = "urgente" | "critico" | "alerta" | "preparacao" | "aviso" | "ok";

function calcularNivel(faturado: number, limite: number, limiteExcesso: number): Nivel {
  if (faturado >= limiteExcesso)         return "urgente";
  if (faturado >= limite * 0.95)         return "critico";
  if (faturado >= limite)                return "alerta";
  if (faturado >= limite * 0.90)         return "preparacao";
  if (faturado >= limite * 0.80)         return "aviso";
  return "ok";
}

const MENSAGENS: Record<Nivel, string> = {
  urgente:    "Faturação muito acima do limite — risco de auditoria fiscal. Age já.",
  critico:    "Atingiste 95 % do limite — altera o regime de IVA no Portal das Finanças este mês.",
  alerta:     "Ultrapassaste o limite. Altera o regime imediatamente para evitar coimas.",
  preparacao: "Atingiste 90 % — prepara a alteração de regime. A isenção termina no mês seguinte à ultrapassagem.",
  aviso:      "Atingiste 80 % do limite de isenção de IVA. Monitoriza de perto.",
  ok:         "",
};

const BADGE: Partial<Record<Nivel, { label: string; cls: string }>> = {
  urgente:    { label: "Urgente",     cls: "text-clay-text" },
  critico:    { label: "Crítico",     cls: "text-clay-text" },
  alerta:     { label: "Alerta",      cls: "text-alert-text" },
  preparacao: { label: "Preparação",  cls: "text-alert-text" },
  aviso:      { label: "Aviso",       cls: "text-amber-600 dark:text-amber-400" },
};

export default function IvaProgresso({ recibos }: { recibos: Recibo[] }) {
  const ano = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  const faturado = recibos
    .filter((r) => new Date(r.data + "T00:00:00").getFullYear() === ano)
    .reduce((a, r) => a + r.valor, 0);

  const limite       = IVA_ISENCAO_LIMITE.value;
  const limiteExcesso = IVA_ISENCAO_EXCESSO.value;
  const nivel        = calcularNivel(faturado, limite, limiteExcesso);
  const restante     = Math.max(0, limite - faturado);
  const pctv         = Math.min(100, (faturado / limite) * 100);

  // Data projetada — só para aviso e preparacao
  const dataProjetada =
    nivel === "aviso" || nivel === "preparacao"
      ? projetarDataLimite(faturado, limite, mesAtual)
      : null;

  // ── Tokens de cor por nível ─────────────────────────────────────────────
  const barColor =
    nivel === "urgente" || nivel === "critico" ? "bg-clay-text" :
    nivel === "alerta"                         ? "bg-alert-text" :
    nivel === "preparacao"                     ? "bg-alert-text" :
    nivel === "aviso"                          ? "bg-amber-400"  :
    "bg-brand";

  const borderBg =
    nivel === "urgente" || nivel === "critico"
      ? "border-clay-text/30 bg-clay-bg dark:bg-red-950/20"
      : nivel === "alerta" || nivel === "preparacao" || nivel === "aviso"
      ? "border-alert-text/30 bg-alert-bg dark:bg-amber-950/20"
      : "border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900";

  const badge = BADGE[nivel];
  const mensagem = MENSAGENS[nivel];

  return (
    <div className={`rounded-4xl border p-6 shadow-card ${borderBg}`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Limite de isenção de IVA
        </h2>
        {badge && (
          <span className={`text-xs font-bold uppercase tracking-wide ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      {mensagem && (
        <p className={`mb-4 text-xs font-medium leading-relaxed ${
          nivel === "urgente" || nivel === "critico" ? "text-clay-text" :
          nivel === "alerta"  || nivel === "preparacao" ? "text-alert-text" :
          "text-amber-600 dark:text-amber-400"
        }`}>
          {mensagem}
        </p>
      )}

      {/* Data projetada de ultrapassagem */}
      {dataProjetada && (
        <p className="mb-3 text-xs text-stone-400">
          Ao ritmo atual, ultrapassas o limite em{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {dataProjetada.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
          </span>
        </p>
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          {fmt(faturado)}
        </span>
        <span className="text-xs text-stone-400">de {fmt(limite)}</span>
      </div>

      {/* Barra de progresso com marcadores de limiar */}
      <div className="relative">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
          role="progressbar"
          aria-valuenow={Math.round(pctv)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Faturação: ${Math.round(pctv)}% do limite de isenção de IVA`}
        >
          <m.div
            initial={{ width: "0%" }}
            whileInView={{ width: `${pctv}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className={`h-full rounded-full ${barColor}`}
          />
        </div>
        {[80, 90, 95].map((p) => (
          <div
            key={p}
            className="absolute top-0 h-2.5 w-px bg-stone-300 dark:bg-stone-600"
            style={{ left: `${p}%` }}
          />
        ))}
      </div>

      <div className="relative mt-1 text-[10px] text-stone-400">
        {[80, 90, 95].map((p) => (
          <span key={p} className="absolute" style={{ left: `${p}%`, transform: "translateX(-50%)" }}>{p}%</span>
        ))}
        <span className="block text-right">{pctv.toFixed(0)}%</span>
      </div>

      {nivel !== "ok" && (
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {nivel === "urgente" || nivel === "alerta" ? "Excedido em" : "Faltam"}{" "}
            <strong className="text-stone-600 dark:text-stone-300">{fmt(restante)}</strong>
          </span>
          <Link href="/guias/iva-recibos-verdes" className="text-xs font-semibold text-brand hover:underline">
            Ver guia →
          </Link>
        </div>
      )}
    </div>
  );
}
