"use client";

// ═══════════════════════════════════════════════════════════════════════
//  RESUMO DA RELAÇÃO
//  ---------------------------------------------------------------------
//  Três factos, e nada mais: quando é a próxima consulta, quanto está por
//  pagar, e onde vai o cartão.
//
//  A tentação era pôr aqui os números que o painel do contabilista tem —
//  consultas realizadas, envios, tempo médio de resposta. Nenhum deles
//  responde a uma pergunta que o cliente esteja a fazer. Estes três
//  respondem, e cada um deles é acionável: uma data para onde ir, um valor
//  para liquidar, um progresso que explica o desconto da próxima.
//
//  «0,00 €» é um resultado, não um vazio. Escrever «—» quando não há nada
//  a pagar obriga a pessoa a decidir se isso quer dizer «nada» ou «ainda
//  não sabemos», e é exatamente a dúvida que este produto vende resolver.
// ═══════════════════════════════════════════════════════════════════════

import { eurosDeCents } from "@/lib/contabilistas/fidelidade";

export interface ResumoRelacaoProps {
  proximaConsulta: string | null;
  porPagarCents: number;
  fidelidade: { carimbos: number; meta: number } | null;
}

/** «20 ago · 16:30» — curto porque vive numa coluna estreita. */
function quandoCurto(iso: string): string {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" })
    .format(d)
    .replace(".", "");
  const hora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${data} · ${hora}`;
}

export default function ResumoRelacao({
  proximaConsulta,
  porPagarCents,
  fidelidade,
}: ResumoRelacaoProps) {
  return (
    <section
      aria-labelledby="resumo-relacao-titulo"
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card"
    >
      <h2 id="resumo-relacao-titulo" className="font-display text-lg text-ink">
        Resumo da relação
      </h2>

      <dl className="mt-3.5 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <dt className="text-xs text-stone-500">Próxima consulta</dt>
          <dd className="mt-0.5 truncate font-semibold tabular-nums text-stone-800">
            {proximaConsulta ? quandoCurto(proximaConsulta) : "Por marcar"}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-xs text-stone-500">Por pagar</dt>
          <dd
            className={`mt-0.5 truncate font-semibold tabular-nums ${
              porPagarCents > 0 ? "text-alert-text" : "text-stone-800"
            }`}
          >
            {eurosDeCents(porPagarCents)}
          </dd>
        </div>
      </dl>

      {fidelidade && fidelidade.meta > 0 && (
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-stone-100 pt-3.5">
          <dt className="text-xs text-stone-500">Fidelidade</dt>
          <dd className="font-semibold tabular-nums text-brand-dark">
            {fidelidade.carimbos} de {fidelidade.meta}{" "}
            {fidelidade.meta === 1 ? "consulta" : "consultas"}
          </dd>
        </div>
      )}
    </section>
  );
}
