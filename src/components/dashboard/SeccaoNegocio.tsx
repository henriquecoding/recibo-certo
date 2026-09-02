"use client";

// ─────────────────────────────────────────────────────────────────────────
//  «O TEU NEGÓCIO» — as quatro etapas, com estado real.
//
//  Descobrir → Preço → Projeto → Contratar. A ordem é a do arco da decisão
//  e não a do inventário de páginas: o que vender, a que preço, se as
//  contas fecham e — quando já não cabe numa pessoa — quem entra.
//
//  A mesma secção serve a visão geral (secretária) e o hub do telemóvel
//  (`/dashboard/construir`), para as duas nunca poderem contar histórias
//  diferentes sobre onde a pessoa ficou.
// ─────────────────────────────────────────────────────────────────────────

import CartaoEtapa from "@/components/dashboard/CartaoEtapa";
import { ETAPAS } from "@/lib/dashboard/etapas";
import { ETAPAS_NEGOCIO } from "@/lib/dashboard/navegacao";
import { itemDaEtapa } from "@/lib/dashboard/work-items/agregar";
import type { ItemTrabalho } from "@/lib/dashboard/work-items/tipos";

export default function SeccaoNegocio({
  itens,
  titulo = "O teu negócio",
  descricao,
}: {
  itens: readonly ItemTrabalho[];
  titulo?: string;
  descricao?: string;
}) {
  return (
    <section aria-labelledby="painel-negocio">
      <div className="mb-3">
        <h2 id="painel-negocio" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          {titulo}
        </h2>
        {descricao && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{descricao}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ETAPAS_NEGOCIO.map((destino) => {
          const etapa = ETAPAS.find((e) => e.navId === destino.id);
          if (!etapa) return null;
          return (
            <CartaoEtapa
              key={destino.id}
              destino={destino}
              etapa={etapa}
              item={itemDaEtapa(itens, etapa.tipo)}
            />
          );
        })}
      </div>
    </section>
  );
}
