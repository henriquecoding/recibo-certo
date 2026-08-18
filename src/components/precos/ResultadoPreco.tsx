"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O RESULTADO COMO OBJETO VISUAL
//  ---------------------------------------------------------------------
//  Princípio 1 do design system: mostrar o dinheiro antes do imposto. O
//  número que a pessoa veio buscar domina o ecrã; tudo o resto é contexto
//  que se abre quando ela quiser.
//
//  A hierarquia é deliberada e responde por ordem às quatro perguntas:
//    1. quanto devo cobrar     → o número grande
//    2. quanto me custa        → a barra «a cada venda»
//    3. quanto vou ganhar      → o lucro por venda e por mês
//    4. quanto preciso vender  → o ponto de equilíbrio
//
//  A faixa aparece imediatamente a seguir porque um número sozinho é falsa
//  precisão: os dados que o alimentam têm incerteza, e escondê-la seria
//  prometer uma exatidão que a aritmética não tem.
// ═══════════════════════════════════════════════════════════════════════

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { fmt, pct } from "@/lib/format";
import type { ResultadoPreco as Resultado } from "@/lib/pricing";
import { Warning, Info, CheckTrend } from "@/components/ui/Icons";

const CORES_ANCORA: Record<string, string> = {
  piso: "bg-red-400",
  minimo: "bg-alert-border",
  recomendado: "bg-brand",
  confortavel: "bg-brand-mint",
};

export default function ResultadoPreco({
  resultado,
  temFiscalidade,
}: {
  resultado: Resultado;
  temFiscalidade: boolean;
}) {
  if (!resultado.ok) {
    return (
      <div className="rounded-4xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="mb-2 flex items-center gap-2">
          <Warning size={18} className="flex-shrink-0 text-red-600" />
          <h2 className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
            Não há preço possível com estes números
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">{resultado.motivoTexto}</p>
      </div>
    );
  }

  const { faixa, margem, breakEven, custo } = resultado;
  const recomendado = faixa.ancoras.find((a) => a.chave === "recomendado");
  const ancorasOrdenadas = [...faixa.ancoras].sort((a, b) => a.pvp - b.pvp);
  const maximo = ancorasOrdenadas.length > 0 ? ancorasOrdenadas[ancorasOrdenadas.length - 1].pvp : 1;

  const decomposicao = [
    { rotulo: "Custo", valor: custo.direto, cor: "bg-stone-400" },
    {
      rotulo: "Custos de venda",
      valor: Math.max(0, custo.variaveisTotais - custo.direto - impostosDoVendedor(resultado)),
      cor: "bg-stone-300",
    },
    ...(temFiscalidade
      ? [{ rotulo: "Impostos teus", valor: impostosDoVendedor(resultado), cor: "bg-alert-border" }]
      : []),
    { rotulo: "Contas fixas", valor: custo.fixosPorUnidade, cor: "bg-stone-200" },
    { rotulo: temFiscalidade ? "Fica para ti" : "Margem", valor: Math.max(0, margem.lucroUnidade), cor: "bg-brand" },
  ].filter((d) => d.valor > 0.004);

  const totalBarra = decomposicao.reduce((s, d) => s + d.valor, 0) || 1;

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Resultado"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7"
    >
      {/* ── O número ─────────────────────────────────────────────── */}
      <p className="eyebrow mb-2 text-brand-dark dark:text-brand-mint">Quanto deves cobrar</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-4xl font-semibold tabular-nums text-ink dark:text-stone-50 sm:text-5xl">
          {fmt(resultado.pvp)}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {resultado.taxaIVA > 0 ? (
            <>
              com IVA · <span className="tabular-nums">{fmt(resultado.precoLiquido)}</span> sem IVA
            </>
          ) : (
            "sem IVA — estás isento"
          )}
        </span>
      </div>

      {/* ── Faixa ────────────────────────────────────────────────── */}
      {ancorasOrdenadas.length > 1 && (
        <div className="mt-5">
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            aria-hidden="true"
          >
            {ancorasOrdenadas.map((a, i) => {
              const anterior = i === 0 ? 0 : ancorasOrdenadas[i - 1].pvp;
              const largura = ((a.pvp - anterior) / maximo) * 100;
              return (
                <span
                  key={a.chave}
                  className={`${CORES_ANCORA[a.chave] ?? "bg-stone-300"} h-full`}
                  style={{ width: `${Math.max(2, largura)}%` }}
                />
              );
            })}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ancorasOrdenadas.map((a) => (
              <li key={a.chave} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${CORES_ANCORA[a.chave] ?? "bg-stone-300"}`}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                      {fmt(a.pvp)}
                    </span>
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{a.rotulo}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {a.explicacao}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── A cada venda ─────────────────────────────────────────── */}
      <div className="mt-7 border-t border-stone-100 pt-5 dark:border-stone-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">A cada venda</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
          {decomposicao.map((d) => (
            <span key={d.rotulo} className={`${d.cor} h-full`} style={{ width: `${(d.valor / totalBarra) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {decomposicao.map((d) => (
            <li key={d.rotulo} className="flex items-center gap-2.5 text-sm">
              <span aria-hidden="true" className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${d.cor}`} />
              <span className="min-w-0 flex-1 truncate text-stone-600 dark:text-stone-400">{d.rotulo}</span>
              <span className="flex-shrink-0 font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(d.valor)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Números-chave ────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica
          rotulo="Margem"
          valor={pct(margem.margem)}
          nota="sobre o preço sem IVA"
          alerta={margem.margem < 0}
        />
        <Metrica
          rotulo="Markup"
          valor={pct(margem.markup)}
          nota="acrescentado ao custo"
        />
        <Metrica
          rotulo="Lucro por mês"
          valor={fmt(margem.lucroMensal)}
          nota="ao volume que esperas"
          alerta={margem.lucroMensal < 0}
        />
        <Metrica
          rotulo="Equilíbrio"
          valor={breakEven.possivel ? `${breakEven.unidades}` : "—"}
          nota={
            breakEven.possivel
              ? breakEven.unidades === 0
                ? "sem custos fixos"
                : "vendas por mês"
              : "não existe"
          }
          alerta={!breakEven.possivel}
        />
      </div>

      {breakEven.nota ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
          {breakEven.nota}
        </p>
      ) : null}

      {/* ── Veredicto sobre o preço pensado ──────────────────────── */}
      {resultado.veredicto ? (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            resultado.veredicto.classificacao === "abaixo_do_piso"
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
              : resultado.veredicto.classificacao === "abaixo_do_minimo"
                ? "border-alert-border bg-alert-bg dark:border-alert-border/40 dark:bg-alert-text/10"
                : "border-brand-light bg-brand-light/40 dark:border-brand/30 dark:bg-brand/10"
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
            {resultado.veredicto.classificacao === "alinhado" ||
            resultado.veredicto.classificacao === "acima_do_recomendado" ? (
              <CheckTrend size={16} className="flex-shrink-0 text-brand" />
            ) : (
              <Warning size={16} className="flex-shrink-0 text-alert-text dark:text-alert" />
            )}
            {resultado.veredicto.titulo}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {resultado.veredicto.texto}
          </p>
        </div>
      ) : null}

      {/* ── Preços psicológicos ──────────────────────────────────── */}
      {faixa.psicologicos.length > 0 && recomendado ? (
        <div className="mt-6 border-t border-stone-100 pt-5 dark:border-stone-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Se preferires um preço redondo
          </p>
          <p className="mb-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Sugestões comerciais. Não substituem o preço recomendado — mostram o que cada terminação custa em margem.
          </p>
          <div className="flex flex-wrap gap-2">
            {faixa.psicologicos.map((p) => (
              <span
                key={p.pvp}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-800"
              >
                <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">{fmt(p.pvp)}</span>
                <span className="ml-2 tabular-nums text-stone-500 dark:text-stone-400">{pct(p.margem)} margem</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </m.section>
  );
}

function Metrica({
  rotulo,
  valor,
  nota,
  alerta,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{rotulo}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          alerta ? "text-red-600 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">{nota}</p>
    </div>
  );
}

/** Segurança Social + IRS marginal por unidade. Zero para quem não é TI. */
function impostosDoVendedor(r: Resultado): number {
  return r.fiscal.aplicavel ? r.fiscal.ssPorUnidade + r.fiscal.irsPorUnidade : 0;
}
