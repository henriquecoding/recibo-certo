"use client";

// ─────────────────────────────────────────────────────────────────────────
//  «CONTINUAR DE ONDE FICASTE» — a secção que não existia.
//
//  Cada cartão diz seis coisas, e todas cabem numa linha de leitura:
//  o que é, o que a pessoa lhe chamou, quando mexeu, em que estado está,
//  ONDE está (dispositivo ou conta) e o que fazer a seguir.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ «NÃO CONSEGUIMOS LER» NÃO PODE PARECER «NÃO TENS NADA»               │
//  │                                                                     │
//  │ As stores devolvem vazio a qualquer estranheza — e para elas está    │
//  │ certo: um cofre ilegível não pode impedir a ferramenta de abrir.     │
//  │ Mas herdar esse silêncio aqui dizia à pessoa que o trabalho dela     │
//  │ tinha desaparecido, quando o que aconteceu foi outra coisa           │
//  │ completamente. O aviso fica em cima da lista, e diz onde os dados    │
//  │ ainda estão.                                                        │
//  └─────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight, Warning } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import DataRelativa from "@/components/dashboard/DataRelativa";
import { registar } from "@/lib/analytics/cliente";
import {
  ICONE_TIPO,
  ROTULO_ESTADO,
  ROTULO_TIPO,
  type ItemTrabalho,
  type LeituraTrabalho,
} from "@/lib/dashboard/work-items/tipos";

/** Três. Mais do que isto deixa de ser «onde ia» e volta a ser uma lista. */
const MAXIMO = 3;

export default function ContinuarTrabalho({
  itens,
  falhas,
}: {
  itens: readonly ItemTrabalho[];
  falhas: LeituraTrabalho["falhas"];
}) {
  const visiveis = itens.slice(0, MAXIMO);
  if (visiveis.length === 0 && falhas.length === 0) return null;

  return (
    <section aria-labelledby="painel-continuar">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="painel-continuar" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          Continuar de onde ficaste
        </h2>
        {itens.length > MAXIMO && (
          <Link href="/dashboard/cenarios" className="text-xs font-semibold text-brand hover:underline">
            Ver todo o meu trabalho ({itens.length})
          </Link>
        )}
      </div>

      {falhas.length > 0 && (
        <div role="status" className="mb-3 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-shrink-0 text-alert-text">
              <Warning size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-alert-text">
                {falhas.length === 1
                  ? "Há trabalho guardado que não conseguimos ler"
                  : `Há ${falhas.length} conjuntos de dados que não conseguimos ler`}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-alert-text/80">
                Nada foi apagado: continua no teu dispositivo, tal como estava. Podes exportar os dados em bruto a
                partir da tua conta antes de fazer qualquer outra coisa.
              </p>
              <Link href="/dashboard/conta" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-alert-text hover:underline">
                Exportar os meus dados <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((item, i) => {
          const Icone = iconeDe(ICONE_TIPO[item.tipo]);
          return (
            <li key={item.id}>
              <Link
                href={item.proximaAccao.href}
                onClick={() =>
                  registar("dashboard_continue_clicked", {
                    workspace: item.tipo,
                    state: item.estado,
                    source: item.fonte,
                    position: i + 1,
                  })
                }
                className="group flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift motion-reduce:transform-none motion-reduce:transition-none dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <Icone size={15} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {ROTULO_TIPO[item.tipo]}
                  </span>
                </div>

                <p className="mt-2.5 line-clamp-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {item.titulo}
                </p>
                {item.subtitulo && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">{item.subtitulo}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {ROTULO_ESTADO[item.estado]}
                  </span>
                  <DataRelativa iso={item.atualizadoEm} />
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {item.fonte === "conta" ? "Na tua conta" : "Neste dispositivo"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    {item.proximaAccao.label}
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
