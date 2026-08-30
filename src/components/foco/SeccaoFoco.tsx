// ═══════════════════════════════════════════════════════════════════════
//  UM COMPARTIMENTO DA HOMEPAGE DE UM FOCO
//  ---------------------------------------------------------------------
//  O ritmo `grain/branco/grain/branco` estava a acontecer por eu ter
//  escrito as mesmas classes à mão em cada secção de cada foco. Ao quinto
//  foco isso são quarenta oportunidades para uma delas ficar diferente.
//
//  Aqui é uma escolha entre dois valores e mais nada.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";

export default function SeccaoFoco({
  id,
  fundo,
  titulo,
  sobrancelha,
  intro,
  larguraTitulo = "max-w-3xl",
  children,
}: {
  id: string;
  fundo: "areia" | "branco";
  titulo: ReactNode;
  sobrancelha: string;
  intro?: ReactNode;
  larguraTitulo?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`rc-home-deferred rc-home-deferred--large scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 ${
        fundo === "areia" ? "grain bg-sand" : ""
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div className={larguraTitulo}>
          <div className="eyebrow mb-3 text-brand">{sobrancelha}</div>
          <h2
            id={`${id}-titulo`}
            className="text-balance font-display display-2 font-semibold text-ink"
          >
            {titulo}
          </h2>
          {intro ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">{intro}</p>
          ) : null}
        </div>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

/** Um cartão de método: número, ícone, título, texto. */
export function CartaoMetodo({
  indice,
  Icon,
  titulo,
  texto,
}: {
  indice: number;
  Icon: (props: { size?: number; className?: string }) => ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <article className="h-full rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand dark:bg-brand/15">
          <Icon size={18} />
        </span>
        <span className="font-mono texto-mini font-semibold text-stone-500 dark:text-stone-400">
          {String(indice + 1).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-ink">{titulo}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">{texto}</p>
    </article>
  );
}

/** As perguntas que o foco NÃO responde — sempre o penúltimo compartimento. */
export function FaqFoco({
  id,
  sobrancelha,
  titulo,
  intro,
  perguntas,
  cta,
}: {
  id: string;
  sobrancelha: string;
  titulo: string;
  intro: string;
  perguntas: readonly { pergunta: string; resposta: string }[];
  cta: { href: string; rotulo: string };
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="rc-home-deferred rc-home-deferred--medium scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="eyebrow mb-3 text-brand">{sobrancelha}</div>
          <h2 id={`${id}-titulo`} className="font-display display-2 font-semibold text-ink">
            {titulo}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">{intro}</p>
        </div>
        <div className="mt-9 space-y-3">
          {perguntas.map((faq) => (
            <details
              key={faq.pergunta}
              className="group rounded-3xl border border-stone-200 bg-white shadow-card open:border-brand dark:border-stone-700 dark:bg-stone-900"
            >
              <summary className="focus-marca flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-4 text-sm font-semibold text-stone-800 dark:text-stone-100">
                {faq.pergunta}
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform group-open:rotate-45 group-open:bg-brand group-open:text-white dark:bg-stone-800">
                  <span aria-hidden className="text-base leading-none">
                    +
                  </span>
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-stone-500">{faq.resposta}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a
            href={cta.href}
            className="focus-marca inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float"
          >
            {cta.rotulo}
          </a>
        </div>
      </div>
    </section>
  );
}
