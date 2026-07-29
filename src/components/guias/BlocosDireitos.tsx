import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Warning, Check, Info } from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────
//  Blocos partilhados pelos guias de «Direitos e cobranças».
//
//  Sete guias com a mesma anatomia (uma sequência de passos, um aviso de
//  prazo, uma tabela de prazos) não devem repetir sete vezes o mesmo JSX.
//  Aqui não há um único número fiscal: os valores concretos vivem nas
//  páginas, ligados às afirmações registadas em `claims.ts`.
// ─────────────────────────────────────────────────────────────────────────

export function Seccao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function Paragrafo({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{children}</p>
  );
}

/** Aviso de prazo que não se recupera. Vermelho porque a consequência é
 *  perder um direito, não pagar um acréscimo. */
export function AvisoPrazo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
      <Warning size={16} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-red-800 dark:text-red-300">{titulo}</div>
        <div className="mt-1 text-sm leading-relaxed text-red-800/85 dark:text-red-300/85">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Nota({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
      <Info size={16} className="mt-0.5 flex-shrink-0 text-stone-400" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">{titulo}</div>
        <div className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Sequência numerada de passos — a "escada" que estes guias descrevem. */
export function Passos({
  passos,
}: {
  passos: { titulo: string; texto: ReactNode; base?: string }[];
}) {
  return (
    <ol className="space-y-3">
      {passos.map((p, i) => (
        <li
          key={p.titulo}
          className="flex gap-3.5 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-dark dark:bg-brand/15 dark:text-brand">
            {i + 1}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">{p.titulo}</div>
            <div className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {p.texto}
            </div>
            {p.base && (
              <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                {p.base}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Tabela de prazos. Mobile-first: rola dentro do próprio contentor em vez
 *  de empurrar a página para o lado. */
export function TabelaPrazos({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: (string | ReactNode)[][];
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[30rem] text-sm">
        <thead>
          <tr className="border-b border-stone-100 dark:border-stone-800">
            {colunas.map((c) => (
              <th
                key={c}
                className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {linhas.map((l, i) => (
            <tr key={i}>
              {l.map((celula, j) => (
                <td
                  key={j}
                  className={`py-3 pr-3 align-top ${
                    j === 0
                      ? "text-xs font-semibold text-stone-500 dark:text-stone-400"
                      : "text-stone-700 dark:text-stone-300"
                  }`}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ligação interna destacada para outro guia. Sempre um `href` real — os
 *  destinos são validados em `guias:routes`. */
export function VaiPara({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group mb-4 flex items-center gap-2.5 rounded-2xl border border-brand/25 bg-brand-light/50 p-3.5 transition-colors hover:border-brand/50 dark:bg-brand/10"
    >
      <Check size={13} className="flex-shrink-0 text-brand" />
      <span className="min-w-0 flex-1 text-sm font-medium text-brand-dark dark:text-brand">
        {children}
      </span>
      <ArrowRight
        size={14}
        className="flex-shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
