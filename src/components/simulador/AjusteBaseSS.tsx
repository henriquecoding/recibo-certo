"use client";

// ═══════════════════════════════════════════════════════════════════════
//  AJUSTE DO RENDIMENTO RELEVANTE (Art. 163.º do Código Contributivo)
//
//  A única alavanca que um trabalhador independente tem sobre a própria
//  contribuição: na declaração trimestral pode fixar um rendimento relevante
//  até 25% acima ou abaixo do apurado, em intervalos de 5%.
//
//  Não é um botão de "pagar menos". Descer a base desce a contribuição AGORA
//  e desce a base de cálculo da reforma e do subsídio de doença; e, porque as
//  contribuições pagas entram na regra dos 15% do Art. 31.º n.º 13 al. a) do
//  CIRS, descer a base SOBE o IRS. O componente mostra os dois lados — é essa
//  a diferença entre uma escolha informada e um deslizador.
//
//  Componente PARTILHADO: o modo guiado e o modo completo usam este mesmo
//  controlo, para não haver duas versões da mesma regra.
// ═══════════════════════════════════════════════════════════════════════

import { useId } from "react";
import { fmt } from "@/lib/format";
import { SS_AJUSTE_BASE } from "@/lib/fiscal-data";
import InfoTip from "@/components/ui/InfoTip";

const { limite, passo } = SS_AJUSTE_BASE.value;

/** −0,25 · −0,20 · … · 0 · … · +0,25 */
export const PASSOS_AJUSTE: number[] = (() => {
  const n = Math.round(limite / passo);
  const out: number[] = [];
  for (let i = -n; i <= n; i++) out.push(Math.round(i * passo * 100) / 100);
  return out;
})();

const rotulo = (v: number) =>
  v === 0 ? "Normal" : `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`;

interface Props {
  valor: number;
  onChange: (v: number) => void;
  /** Contribuição anual com o ajuste aplicado. */
  ssAnual: number;
  /** Contribuição anual sem ajuste, para mostrar a diferença. */
  ssAnualSemAjuste: number;
  /**
   * IRS anual com e sem ajuste. Descer a base sobe o IRS (regra dos 15%);
   * sem este par o controlo contava metade da história.
   */
  irsAnual?: number;
  irsAnualSemAjuste?: number;
  /** Sem contribuições não há nada para ajustar. */
  desativado?: boolean;
  motivoDesativado?: string;
  className?: string;
}

export default function AjusteBaseSS({
  valor,
  onChange,
  ssAnual,
  ssAnualSemAjuste,
  irsAnual,
  irsAnualSemAjuste,
  desativado = false,
  motivoDesativado,
  className = "",
}: Props) {
  const id = useId();
  const deltaSS = ssAnual - ssAnualSemAjuste;
  const deltaIRS =
    irsAnual !== undefined && irsAnualSemAjuste !== undefined
      ? irsAnual - irsAnualSemAjuste
      : 0;
  const deltaTotal = deltaSS + deltaIRS;

  return (
    <div className={className}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400"
        >
          Ajustar a base da Segurança Social
          <InfoTip label="Ajuste do rendimento relevante (Art. 163.º CRC)">
            Ao entregar a declaração trimestral podes fixar um rendimento relevante
            até <strong>{Math.round(limite * 100)}% acima ou abaixo</strong> do
            apurado, em intervalos de {Math.round(passo * 100)}%. Descer paga menos
            agora, mas reduz a base da reforma e dos subsídios — e, como as
            contribuições pagas abatem pela regra dos 15% (Art. 31.º n.º 13 CIRS),
            sobe um pouco o IRS. O teto de 12 × IAS e o mínimo de 20 €/mês
            continuam a valer depois do ajuste.
          </InfoTip>
        </label>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
            valor === 0
              ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
              : "bg-brand text-white"
          }`}
        >
          {rotulo(valor)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Descer a base em 5 pontos percentuais"
          disabled={desativado || valor <= -limite}
          onClick={() => onChange(Math.max(-limite, Math.round((valor - passo) * 100) / 100))}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-semibold leading-none text-stone-600 transition-colors hover:border-stone-300 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          −
        </button>
        <input
          id={id}
          type="range"
          min={-limite}
          max={limite}
          step={passo}
          value={valor}
          disabled={desativado}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={rotulo(valor)}
          className="h-9 min-w-0 flex-1 accent-[color:var(--brand,#1D9E75)] disabled:opacity-40"
        />
        <button
          type="button"
          aria-label="Subir a base em 5 pontos percentuais"
          disabled={desativado || valor >= limite}
          onClick={() => onChange(Math.min(limite, Math.round((valor + passo) * 100) / 100))}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-lg font-semibold leading-none text-stone-600 transition-colors hover:border-stone-300 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          +
        </button>
      </div>

      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
        <span>−{Math.round(limite * 100)}%</span>
        <span>Normal</span>
        <span>+{Math.round(limite * 100)}%</span>
      </div>

      {desativado ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
          {motivoDesativado ?? "Sem contribuições a ajustar nesta situação."}
        </p>
      ) : valor !== 0 ? (
        <div className="mt-2 space-y-1 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
          <p className="flex items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span>Segurança Social no ano</span>
            <span className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">
              {deltaSS >= 0 ? "+" : "−"}
              {fmt(Math.abs(deltaSS))}
            </span>
          </p>
          {irsAnual !== undefined && irsAnualSemAjuste !== undefined && (
            <p className="flex items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
              <span>IRS no ano (regra dos 15%)</span>
              <span className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                {deltaIRS >= 0 ? "+" : "−"}
                {fmt(Math.abs(deltaIRS))}
              </span>
            </p>
          )}
          <p className="flex items-center justify-between gap-2 border-t border-stone-200 pt-1 text-[11px] font-semibold dark:border-stone-700">
            <span className="text-stone-600 dark:text-stone-300">Efeito no ano</span>
            <span
              className={`tabular-nums ${
                deltaTotal > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {deltaTotal >= 0 ? "+" : "−"}
              {fmt(Math.abs(deltaTotal))}
            </span>
          </p>
          <p className="pt-0.5 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
            {valor < 0
              ? "Pagas menos agora, mas desces a base da reforma e dos subsídios de doença e parentalidade."
              : "Pagas mais agora e sobes a base da reforma e dos subsídios."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
