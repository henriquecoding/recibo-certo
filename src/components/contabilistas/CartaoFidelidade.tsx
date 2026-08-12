"use client";

// Cartão de fidelidade — a peça visual partilhada pelas duas superfícies.
// Mobile-first: os carimbos empilham em grelha fluida e nunca transbordam a
// ~360px, porque a meta pode ir até 12.

import { Check, Gift } from "@/components/ui/Icons";
import { eurosDeCents, progresso, valorComDesconto } from "@/lib/contabilistas/fidelidade";

interface Props {
  carimbos: number;
  meta: number;
  descontoPct: number;
  precoBaseCents: number;
  /** Nome a mostrar no cabeçalho (o contabilista, ou o cliente). */
  titulo?: string;
  /** Na área do contabilista o texto muda de dono. */
  perspetiva?: "cliente" | "contabilista";
}

export default function CartaoFidelidade({
  carimbos, meta, descontoPct, precoBaseCents, titulo, perspetiva = "cliente",
}: Props) {
  const p = progresso(carimbos, meta);
  const valores = valorComDesconto(precoBaseCents, descontoPct);

  return (
    <section
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6"
      aria-labelledby="cartao-fidelidade-titulo"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Cartão de fidelidade</p>
          <h2 id="cartao-fidelidade-titulo" className="mt-1 font-display text-xl text-ink">
            {titulo ?? "As tuas consultas"}
          </h2>
        </div>
        <span className="shrink-0 rounded-xl bg-brand-light px-3 py-1.5 text-sm font-semibold tabular-nums text-brand-dark">
          {p.carimbos} / {p.meta}
        </span>
      </div>

      {/* Os carimbos. `grid` com colunas automáticas: 3 a ~360px, mais à
          medida que há espaço, sem nunca provocar scroll horizontal. */}
      <ul
        className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2.5"
        aria-label={`${p.carimbos} de ${p.meta} consultas`}
      >
        {Array.from({ length: p.meta }, (_, i) => {
          const feito = i < p.carimbos;
          return (
            <li
              key={i}
              className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors ${
                feito
                  ? "border-brand bg-brand text-white"
                  : "border-dashed border-stone-200 text-stone-300"
              }`}
            >
              {feito ? <Check size={18} aria-hidden /> : i + 1}
              <span className="sr-only">
                {feito ? `Consulta ${i + 1} realizada` : `Consulta ${i + 1} por realizar`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-2xl bg-cream p-4">
        {p.completo ? (
          <p className="flex items-start gap-2.5 text-sm text-stone-700">
            <Gift size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
            <span>
              Cartão completo. O desconto de <strong>{descontoPct}%</strong> já foi emitido
              {perspetiva === "cliente" ? " para ti" : " para este cliente"}.
            </span>
          </p>
        ) : (
          <p className="text-sm text-stone-600">
            {p.faltam === 1 ? "Falta 1 consulta" : `Faltam ${p.faltam} consultas`} para
            um desconto de <strong className="text-stone-800">{descontoPct}%</strong>
            {precoBaseCents > 0 && (
              <>
                {" "}— {eurosDeCents(valores.baseCents)} passam a{" "}
                <strong className="text-stone-800">{eurosDeCents(valores.finalCents)}</strong>
              </>
            )}
            .
          </p>
        )}
        {/* Dizer o que isto NÃO é. O ReciboCerto não cobra a consulta nem
            garante o desconto — afirmá-lo seria uma promessa sobre dinheiro
            de terceiros. */}
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          O desconto é acordado com o contabilista e aplicado por ele. O ReciboCerto
          regista o cartão; não cobra a consulta nem processa pagamentos.
        </p>
      </div>
    </section>
  );
}
