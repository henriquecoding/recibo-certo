"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 7 — «E se as coisas não correrem como esperas?»
//  ---------------------------------------------------------------------
//  P1 #5. Um plano com um só cenário é uma previsão; com choques, é uma
//  decisão informada — passa a saber-se QUAL premissa é que, se estiver
//  errada, estraga tudo. É essa a que se confirma primeiro.
//
//  ── O TORNADO EM 360 px ────────────────────────────────────────────
//  Barras HORIZONTAIS com o rótulo por cima, não ao lado: em telemóvel,
//  um rótulo lateral rouba metade da largura à barra e o gráfico deixa de
//  se ler. E cada barra leva `aria-label` com o número — uma largura em
//  percentagem não diz nada a quem usa leitor de ecrã.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import { Warning } from "@/components/ui/Icons";
import type { ResultadoSensibilidade } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

const sinal = (n: number): string => (n > 0 ? `+${Math.round(n * 100)}%` : `${Math.round(n * 100)}%`);

export default function SensibilidadeNegocio({ s }: { s: ResultadoSensibilidade }) {
  if (s.tornado.length === 0) return null;

  const maior = Math.max(...s.tornado.map((t) => t.amplitude), 1);
  const quebras = s.impactos.filter((i) => i.quebra);

  return (
    <Cartao
      titulo="O que mais mexe no resultado"
      descricao="Cada barra é a diferença entre o melhor e o pior caso desse fator"
      id="sensibilidade"
    >
      <ul className="space-y-3">
        {s.tornado.map((t) => (
          <li key={t.eixo}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-xs font-medium text-stone-700 dark:text-stone-200">
                {t.rotulo}
              </span>
              <span className="flex-shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">
                {fmt(t.amplitude)}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${t.rotulo}: entre ${fmt(t.pior)} e ${fmt(t.melhor)} por mês — uma amplitude de ${fmt(
                t.amplitude,
              )}`}
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            >
              <div
                className={`h-2 rounded-full ${t.eixo === s.critico?.eixo ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}
                style={{ width: `${(t.amplitude / maior) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {s.critico ? (
        <p className="mt-3 rounded-2xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/50 dark:text-stone-300">
          O que mais mexe é <strong>{s.critico.rotulo.toLowerCase()}</strong>. É o pressuposto a confirmar primeiro —
          entre o pior e o melhor caso vão {fmt(s.critico.amplitude)} por mês.
        </p>
      ) : null}

      {quebras.length > 0 ? (
        <div className="mt-3 rounded-2xl bg-alert-bg px-3 py-2">
          <p className="flex items-start gap-2 text-xs font-semibold text-alert-text">
            <Warning size={14} className="mt-px flex-shrink-0" />
            Onde as contas deixam de fechar
          </p>
          <ul className="mt-1.5 space-y-1">
            {quebras.map((q) => (
              <li key={`${q.eixo}-${q.choque}`} className="text-[11px] leading-relaxed text-alert-text/90">
                {q.rotulo} a {sinal(q.choque)} → resultado de {fmt(q.resultadoOperacionalMes)} por mês.
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-brand-dark dark:text-brand-mint">
          Nenhum destes choques leva o resultado a negativo. O cenário aguenta as variações testadas.
        </p>
      )}

      {/* O equivalente textual completo, para leitor de ecrã e para quem
          quer os números em vez das barras. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-stone-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300">
          Ver todos os cenários testados em tabela
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-xs">
            <caption className="sr-only">
              Resultado operacional mensal em cada cenário testado. O cenário base é {fmt(s.base)}.
            </caption>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700">
                <th scope="col" className="py-1.5 pr-2 font-semibold text-stone-600 dark:text-stone-300">
                  Fator
                </th>
                <th scope="col" className="py-1.5 pr-2 font-semibold text-stone-600 dark:text-stone-300">
                  Choque
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold text-stone-600 dark:text-stone-300">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody>
              {s.impactos.map((i) => (
                <tr key={`${i.eixo}-${i.choque}`} className="border-b border-stone-100 dark:border-stone-800">
                  <td className="py-1.5 pr-2 text-stone-600 dark:text-stone-300">{i.rotulo}</td>
                  <td className="py-1.5 pr-2 tabular-nums text-stone-600 dark:text-stone-300">{sinal(i.choque)}</td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      i.resultadoOperacionalMes < 0
                        ? "text-red-700 dark:text-red-400"
                        : "text-stone-800 dark:text-stone-100"
                    }`}
                  >
                    {fmt(i.resultadoOperacionalMes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Cartao>
  );
}
