"use client";

// Carregamento diferido do mapa de «onde vais operar» — `ssr:false` mais
// `ErrorBoundary`, pela regra mobile-first 5b: um mapa que falha (tiles,
// fronteiras, geocodificação) não pode deixar em branco o meio de um
// formulário. A lista de concelhos vive DENTRO do mapa, pelo que a
// alternativa em caso de falha tem de continuar a permitir responder —
// é o que o `fallback` abaixo faz, e é por isso que ele recebe as mesmas
// props em vez de ser um cartão de erro mudo.

import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { CONCELHO_POR_CODIGO, concelhosDaRegiao } from "@/lib/negocio/market/concelhos";
import type { MapaOndeOperarProps } from "./MapaOndeOperar";

const MapaOndeOperar = dynamic(() => import("./MapaOndeOperar"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[320px] w-full animate-pulse rounded-3xl border border-stone-100 bg-stone-50 sm:h-[400px] dark:border-stone-800 dark:bg-stone-900/50"
      aria-hidden
    />
  ),
});

/** A mesma pergunta sem mapa nenhum. Nunca deixa a secção sem resposta. */
function ListaSimples({ regiao, concelho, onEscolher }: MapaOndeOperarProps) {
  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <label
        htmlFor="ode-concelho-simples"
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500"
      >
        Concelho
      </label>
      <select
        id="ode-concelho-simples"
        value={concelho ?? ""}
        onChange={(evento) => {
          const encontrado = CONCELHO_POR_CODIGO.get(evento.target.value);
          if (encontrado) onEscolher({ regiao: encontrado.regiao, concelho: encontrado.codigo });
        }}
        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
      >
        <option value="">Toda a região</option>
        {(regiao === "portugal"
          ? [...CONCELHO_POR_CODIGO.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"))
          : concelhosDaRegiao(regiao)
        ).map((item) => (
          <option key={item.codigo} value={item.codigo}>
            {item.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function MapaOndeOperarLazy(props: MapaOndeOperarProps) {
  return (
    <ErrorBoundary etiqueta="o mapa de onde vais operar" fallback={<ListaSimples {...props} />}>
      <MapaOndeOperar {...props} />
    </ErrorBoundary>
  );
}
