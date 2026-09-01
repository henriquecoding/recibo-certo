"use client";

import { useState } from "react";
import { Search } from "@/components/ui/Icons";
import { MIN_CARACTERES } from "@/lib/busca/pontuar";
import type { FiltroIntencao } from "@/lib/busca/esquema";

/**
 * O campo da página de resultados.
 *
 * É um formulário GET normal: sem JavaScript submete e recarrega a página
 * com `?q=`; com JavaScript é só o campo controlado que permite limpar sem
 * ir ao servidor. A intenção viaja num campo escondido para o filtro
 * escolhido sobreviver a uma nova consulta.
 */
export function FormularioPagina({ consulta, intencao }: { consulta: string; intencao: FiltroIntencao }) {
  const [valor, setValor] = useState(consulta);

  return (
    <form
      role="search"
      action="/pesquisar"
      method="get"
      className="mb-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900"
    >
      <Search size={18} className="flex-shrink-0 text-brand" aria-hidden />
      <label htmlFor="pesquisa-pagina" className="sr-only">
        Pesquisar no Recibo Certo
      </label>
      <input
        id="pesquisa-pagina"
        name="q"
        type="search"
        defaultValue={consulta}
        onChange={(e) => setValor(e.target.value)}
        placeholder="O que precisas de resolver?"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
        aria-describedby="pesquisa-pagina-ajuda"
        className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-stone-800 placeholder-stone-400 placeholder:font-normal focus:outline-none dark:text-stone-100"
      />
      {intencao !== "tudo" && <input type="hidden" name="i" value={intencao} />}
      <p id="pesquisa-pagina-ajuda" className="sr-only">
        Escreve pelo menos {MIN_CARACTERES} caracteres e carrega em Enter.
      </p>
      <button
        type="submit"
        disabled={valor.trim().length < MIN_CARACTERES}
        className="focus-marca min-h-9 flex-shrink-0 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      >
        Procurar
      </button>
    </form>
  );
}
