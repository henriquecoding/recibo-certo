"use client";

import { pct } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";
import { Check, Warning, Info } from "@/components/ui/Icons";
import type { SituacaoIVA as Situacao } from "@/lib/fiscal-iva";
import type { RegimeIVA } from "@/lib/fiscal";
import type { Regiao } from "@/lib/fiscal-data";

// ─────────────────────────────────────────────────────────────────────────
//  SITUAÇÃO DE IVA — um só desenho, alimentado pelo motor
//  ---------------------------------------------------------------------
//  Havia três versões disto no repositório e as diferenças não eram de
//  estilo, eram de CONTEÚDO: a do simulador completo explicava o que
//  acontece, quando acontece e o que fazer, dizia a região no título e dava
//  exemplos por taxa; a do guiado dizia uma linha e mostrava três botões.
//  A mesma pessoa, com os mesmos números, era tratada de maneiras
//  diferentes consoante o modo em que estivesse.
//
//  Agora a decisão toda vive em `src/lib/fiscal-iva.ts` e aqui só se
//  desenha. Acrescentar uma zona nova é acrescentá-la ao motor — a
//  interface acompanha sozinha, em todos os simuladores.
// ─────────────────────────────────────────────────────────────────────────

const META_REGIAO: Record<Regiao, string> = {
  continente: "Continente",
  madeira: "Madeira",
  acores: "Açores",
};

/** Estilos por nível. O `critico` é o que a `CartaoSituacao` não tem. */
const NIVEL = {
  brand: {
    caixa: "border-brand/25 bg-brand-light/60",
    titulo: "text-brand-dark",
    corpo: "text-brand-dark/80",
    icone: <Check size={15} className="text-brand" />,
  },
  aviso: {
    caixa: "border-alert-border bg-alert-bg",
    titulo: "text-alert-text",
    corpo: "text-alert-text/90",
    icone: <Warning size={15} className="text-alert-text" />,
  },
  info: {
    caixa: "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50",
    titulo: "text-stone-700 dark:text-stone-200",
    corpo: "text-stone-600 dark:text-stone-400",
    icone: <Info size={15} className="text-stone-400" />,
  },
  critico: {
    caixa: "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
    titulo: "text-red-700 dark:text-red-300",
    corpo: "text-red-700/90 dark:text-red-300/90",
    icone: <Warning size={15} className="text-red-600 dark:text-red-400" />,
  },
} as const;

export default function SituacaoIVA({
  situacao,
  regiao,
  regimeEscolhido,
  onRegimeChange,
  className = "",
}: {
  situacao: Situacao;
  regiao: Regiao;
  regimeEscolhido: RegimeIVA;
  /** Sem isto o painel é só informativo (ex.: simulador de empresa). */
  onRegimeChange?: (r: RegimeIVA) => void;
  className?: string;
}) {
  const estilo = NIVEL[situacao.nivel];
  // A isenção do Art. 9.º não é uma escolha do utilizador: é a natureza da
  // operação. Oferecer um seletor aí seria sugerir que se pode optar.
  const podeEscolher = Boolean(onRegimeChange) && situacao.zona !== "isento_natureza";
  const isentoDisponivel = situacao.zona !== "ato_isolado";

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Situação de IVA · {META_REGIAO[regiao]}
        </span>
        <InfoTip label="Base legal desta situação">
          {situacao.baseLegal.join(" · ")}
        </InfoTip>
      </div>

      {/* Seletor de regime — inclui a isenção, que é uma situação e não a
          ausência de uma. Estava em falta no modo guiado. */}
      {podeEscolher && (
        <div className="mb-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {isentoDisponivel && (
            <button
              type="button"
              aria-pressed={regimeEscolhido === "isento"}
              onClick={() => onRegimeChange?.("isento")}
              className={`min-h-[52px] rounded-xl border px-2 py-2 text-center transition-all ${
                regimeEscolhido === "isento"
                  ? "border-brand bg-brand-light shadow-sm"
                  : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              <span className={`block text-xs font-bold ${regimeEscolhido === "isento" ? "text-brand-dark" : "text-stone-600 dark:text-stone-300"}`}>
                Isento
              </span>
              <span className="mt-0.5 block text-[10px] text-stone-400">Art. 53.º</span>
            </button>
          )}
          {situacao.opcoes.map((o) => {
            const ativo = regimeEscolhido === o.escalao;
            return (
              <button
                key={o.escalao}
                type="button"
                aria-pressed={ativo}
                onClick={() => onRegimeChange?.(o.escalao)}
                className={`min-h-[52px] rounded-xl border px-2 py-2 text-center transition-all ${
                  ativo
                    ? "border-brand bg-brand-light shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900"
                }`}
              >
                <span className={`block text-xs font-bold tabular-nums ${ativo ? "text-brand-dark" : "text-stone-600 dark:text-stone-300"}`}>
                  {pct(o.taxa)}
                </span>
                <span className="mt-0.5 block text-[10px] text-stone-400">{o.rotulo}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={`rounded-2xl border p-4 ${estilo.caixa}`}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex-shrink-0">{estilo.icone}</span>
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-bold ${estilo.titulo}`}>{situacao.titulo}</div>

            {/* A explicação em três tempos. É isto que faltava ao guiado, e
                é o que transforma um aviso numa instrução acionável. */}
            <dl className={`mt-2 space-y-1.5 text-xs leading-relaxed ${estilo.corpo}`}>
              <div>
                <dt className="inline font-semibold">O que acontece: </dt>
                <dd className="inline">{situacao.oQueAcontece}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">Quando acontece: </dt>
                <dd className="inline">{situacao.quandoAcontece}</dd>
              </div>
              <div>
                <dt className="inline font-semibold">O que tens de fazer: </dt>
                <dd className="inline">{situacao.oQueTensDeFazer}</dd>
              </div>
            </dl>

            {/* Cartões de taxa com exemplos: escolher sem ter de conhecer as
                Listas I e II anexas ao CIVA. */}
            {podeEscolher && situacao.zona !== "isento_limiar" && (
              <div className="mt-3">
                <p className={`mb-1.5 text-xs font-semibold ${estilo.titulo}`}>
                  Que taxa de IVA se aplica?
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {situacao.opcoes.map((o) => (
                    <button
                      key={o.escalao}
                      type="button"
                      aria-pressed={regimeEscolhido === o.escalao}
                      onClick={() => onRegimeChange?.(o.escalao)}
                      className={`rounded-xl border bg-white p-2.5 text-left transition-all dark:bg-stone-900 ${
                        regimeEscolhido === o.escalao
                          ? "border-brand shadow-sm"
                          : "border-stone-200 hover:border-stone-300 dark:border-stone-700"
                      }`}
                    >
                      <span className="block text-xs font-bold text-stone-700 dark:text-stone-200">
                        {o.rotulo} {pct(o.taxa)}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-stone-400">
                        {o.exemplos}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {situacao.periodicidade && (
              <p className={`mt-2.5 text-xs ${estilo.corpo}`}>
                Declaração periódica <strong>{situacao.periodicidade}</strong>, até ao dia 20 do
                2.º mês seguinte.
              </p>
            )}
          </div>
        </div>
      </div>

      {situacao.incoerencia && (
        <p className="mt-2 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
          {situacao.incoerencia.texto}
        </p>
      )}
    </div>
  );
}
