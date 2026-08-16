"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O BLOCO DO PRÓXIMO PASSO
//  ---------------------------------------------------------------------
//  A primeira coisa que se lê ao abrir a sala, e por isso a única que tem
//  direito a ocupar a largura toda.
//
//  O tom não é decoração: é a diferença entre «tens de fazer isto» e «está
//  do lado dele, podes descansar». Pintar as duas coisas da mesma cor era
//  deixar a pessoa a decidir qual era qual — que é exatamente o trabalho
//  que este bloco existe para lhe poupar.
//
//  Nada aqui pisca, salta nem chama a atenção com movimento. Uma pendência
//  fiscal já produz ansiedade suficiente sem a interface a ajudar.
// ═══════════════════════════════════════════════════════════════════════

import type { ProximoPasso, TomDoPasso } from "@/lib/contabilistas/sala/proximo-passo";
import Button from "@/components/ui/Button";
import { ArrowRight, Check, Clock, Warning } from "@/components/ui/Icons";

const MOLDURA: Record<TomDoPasso, string> = {
  acao: "border-brand/30 bg-brand-light/50",
  atraso: "border-alert-border bg-alert-bg",
  espera: "border-stone-200 bg-white",
  calma: "border-stone-200 bg-white",
};

const ROTULO: Record<TomDoPasso, string> = {
  acao: "Próximo passo",
  atraso: "Passou do prazo",
  espera: "Em curso",
  calma: "Tudo em dia",
};

const COR_ROTULO: Record<TomDoPasso, string> = {
  acao: "text-brand-dark",
  atraso: "text-alert-text",
  espera: "text-stone-400",
  calma: "text-stone-400",
};

function Icone({ tom }: { tom: TomDoPasso }) {
  const props = { size: 16, "aria-hidden": true } as const;
  if (tom === "atraso") return <Warning {...props} className="text-alert-text" />;
  if (tom === "espera") return <Clock {...props} className="text-stone-400" />;
  if (tom === "calma") return <Check {...props} className="text-brand" />;
  return <ArrowRight {...props} className="text-brand-dark" />;
}

export default function BlocoProximoPasso({
  passo,
  ocupado = false,
  aoAgir,
}: {
  passo: ProximoPasso;
  ocupado?: boolean;
  /** Recebe `passo.destino`. A página é que sabe o que fazer com ele. */
  aoAgir?: (destino: string) => void;
}) {
  return (
    <section
      aria-labelledby="proximo-passo-titulo"
      // `aria-live` porque isto muda sozinho quando uma mensagem chega ou
      // um pedido é respondido — e mudar em silêncio é mudar às escondidas
      // para quem usa leitor de ecrã.
      aria-live="polite"
      className={`rounded-4xl border p-5 shadow-card sm:p-6 ${MOLDURA[passo.tom]}`}
    >
      <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${COR_ROTULO[passo.tom]}`}>
        <Icone tom={passo.tom} />
        {ROTULO[passo.tom]}
      </p>

      <div className="mt-2.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="proximo-passo-titulo" className="font-display text-xl leading-snug text-ink sm:text-2xl">
            {passo.titulo}
          </h2>
          {passo.detalhe && (
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{passo.detalhe}</p>
          )}
          {passo.outras > 0 && (
            <p className="mt-2 text-sm text-stone-500">
              {passo.outras === 1
                ? "Há mais uma coisa por tratar, em baixo."
                : `Há mais ${passo.outras} coisas por tratar, em baixo.`}
            </p>
          )}
        </div>

        {passo.cta && passo.destino && (
          <Button
            className="w-full shrink-0 sm:w-auto"
            disabled={ocupado}
            onClick={() => aoAgir?.(passo.destino!)}
          >
            {passo.cta}
          </Button>
        )}
      </div>
    </section>
  );
}
