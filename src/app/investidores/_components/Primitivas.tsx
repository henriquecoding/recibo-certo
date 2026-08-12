// Primitivas da página de investidores — todas SERVER COMPONENTS.
//
// Nenhuma tem estado, nenhuma anima e nenhuma precisa de JavaScript para
// mostrar o que mostra. É deliberado: a página anterior renderizava "0,0
// milhões" no HTML e só corrigia depois de o IntersectionObserver disparar,
// o que dava números errados a quem tem JavaScript bloqueado, a crawlers, a
// pré-visualizações sociais e a ferramentas de diligência — e uma primeira
// imagem de "mercado zero" a toda a gente.

import type { ReactNode } from "react";
import { ROTULO_ESTADO, type EstadoEvidencia, type MetricaInvestidor } from "../_lib/evidence";

/* ── Secção ─────────────────────────────────────────────────────────────── */

export function Seccao({
  id,
  eyebrow,
  titulo,
  descricao,
  children,
  tom = "cream",
}: {
  id: string;
  eyebrow?: string;
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  tom?: "cream" | "branco";
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 px-5 py-14 sm:px-6 sm:py-20 ${
        tom === "branco" ? "border-y border-stone-100 bg-white dark:border-stone-800" : ""
      }`}
    >
      <div className="mx-auto max-w-5xl">
        {eyebrow && <p className="eyebrow mb-3 text-brand-dark dark:text-brand-mint">{eyebrow}</p>}
        <h2 className="font-display display-2 max-w-3xl text-balance font-semibold text-ink">{titulo}</h2>
        {descricao && (
          <div className="mt-4 max-w-2xl text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
            {descricao}
          </div>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/* ── Selo de estado ─────────────────────────────────────────────────────── */

const ESTILO_ESTADO: Record<EstadoEvidencia, string> = {
  // Cores distintas por estado — a regra é que o presente e o futuro NUNCA
  // partilham o mesmo estilo. Era assim que a página anterior conseguia
  // apresentar crédito, take rate e pagamentos ao lado do que já existe.
  live: "border-brand-dark/25 bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
  pilot: "border-alert-border bg-alert-bg text-alert-text",
  planned: "border-blue-300/60 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300",
  hypothesis: "border-purple-300/60 bg-purple-50 text-purple-800 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-300",
};

export function SeloEstado({ estado }: { estado: EstadoEvidencia }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wider ${ESTILO_ESTADO[estado]}`}
    >
      {ROTULO_ESTADO[estado]}
    </span>
  );
}

/* ── Métrica com evidência ──────────────────────────────────────────────── */

/**
 * Um número com a sua prova. `<data value>` leva o valor legível por máquina;
 * o texto visível é o formatado. Não há contagem animada: se a animação é a
 * única forma de o número chegar ao ecrã, o número não está no HTML.
 */
export function MetricaComEvidencia({ m }: { m: MetricaInvestidor }) {
  return (
    <article className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900">
      {m.valor !== undefined && m.formatado ? (
        <data
          value={String(m.valor)}
          className="font-display text-3xl font-semibold tabular-nums text-ink sm:text-4xl"
        >
          {m.formatado}
        </data>
      ) : (
        <span className="font-display text-2xl font-semibold text-stone-400 dark:text-stone-500">
          Por divulgar
        </span>
      )}
      <p className="mt-1.5 text-[13px] font-semibold text-stone-700 dark:text-stone-300">{m.rotulo}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">{m.definicao}</p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-400 dark:text-stone-500">
        <span>Fonte: {m.sistemaFonte}</span>
        <span aria-hidden>·</span>
        <span>
          referência <time dateTime={m.asOf}>{formatarData(m.asOf)}</time>
        </span>
        {m.urlFonte && (
          <>
            <span aria-hidden>·</span>
            <a href={m.urlFonte} className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint">
              verificar
            </a>
          </>
        )}
      </p>
    </article>
  );
}

/* ── Nota de metodologia ────────────────────────────────────────────────── */

export function Nota({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 border-l-2 border-stone-200 pl-4 text-[12px] leading-relaxed text-stone-500 dark:border-stone-700 dark:text-stone-400">
      {children}
    </p>
  );
}

/* ── Botões ─────────────────────────────────────────────────────────────────
   `bg-brand` com texto branco dá 3,39:1 — abaixo dos 4,5:1 que a WCAG AA pede
   para texto normal. O `brand-dark` (#0F6E56) dá ~6,2:1. O verde claro fica
   para elementos gráficos e texto grande, onde a regra é outra. */

export const BOTAO_PRIMARIO =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2 sm:w-auto";

export const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark focus-visible:ring-offset-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 sm:w-auto";

/* ── Utilitários ────────────────────────────────────────────────────────── */

export function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function eur(valor: number): string {
  return `${Math.round(valor).toLocaleString("pt-PT")} €`;
}

export function milhoesEur(valor: number): string {
  return `${(valor / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} M€`;
}
