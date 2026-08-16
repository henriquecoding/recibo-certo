"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O FINDER — a barra que passa a ser o assunto da página
//  ---------------------------------------------------------------------
//  A página antiga explicava primeiro e deixava escolher depois. Quem
//  chega ao diretório já sabe o que quer: quer saber QUEM. Por isso a
//  procura fica acima dos resultados, com peso visual próprio, e o
//  material explicativo desce para depois da lista (§16, §55).
//
//  O campo de texto tem estado local e só escreve no endereço 300 ms
//  depois da última tecla — senão cada letra criava uma consulta e uma
//  entrada de histórico. Os controlos estruturados (distrito, atendimento,
//  áreas) escrevem logo: são uma decisão por clique, não vinte.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import type { FiltroDiretorio, ModalidadeFiltro } from "@/lib/contabilistas/diretorio";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import { Search } from "@/components/ui/Icons";

const OPCOES_DISTRITO: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Todos os distritos" },
  ...DISTRITOS.map((d) => ({ value: d, label: d })),
];

const OPCOES_ATENDIMENTO: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Todos" },
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "ambos", label: "Online e presencial" },
];

/** As áreas que aparecem como atalho. As dez cabem em duas linhas. */
const AREAS_EM_ATALHO = ESPECIALIDADES;

const ATRASO_MS = 300;

export default function DiretorioFinder({
  filtro,
  onMudar,
}: {
  filtro: FiltroDiretorio;
  onMudar: (mudanca: Partial<FiltroDiretorio>) => void;
}) {
  const [texto, setTexto] = useState(filtro.procura);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O endereço também muda sem ser por aqui — recuar no browser, limpar
  // filtros, clicar num atalho. Quando isso acontece, o campo acompanha.
  useEffect(() => { setTexto(filtro.procura); }, [filtro.procura]);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function escrever(valor: string) {
    setTexto(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => onMudar({ procura: valor }), ATRASO_MS);
  }

  function submeter(evento: React.FormEvent) {
    evento.preventDefault();
    if (temporizador.current) clearTimeout(temporizador.current);
    onMudar({ procura: texto });
  }

  return (
    <form
      onSubmit={submeter}
      role="search"
      aria-label="Procurar contabilistas"
      className="rounded-4xl border border-stone-200 bg-white/85 p-3 shadow-card backdrop-blur dark:border-stone-800 dark:bg-stone-900/75"
    >
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_auto]">
        <div className="relative">
          <label htmlFor="diretorio-procura" className="sr-only">
            Nome, concelho ou área fiscal
          </label>
          <Search
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand"
            aria-hidden
          />
          <input
            id="diretorio-procura"
            type="search"
            value={texto}
            onChange={(e) => escrever(e.target.value)}
            placeholder="Nome, concelho ou área fiscal"
            autoComplete="off"
            className="focus-marca min-h-[3rem] w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-11 pr-3.5 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 lg:contents">
          <SelectMenu
            id="diretorio-distrito"
            value={filtro.distrito}
            options={OPCOES_DISTRITO}
            onChange={(v) => onMudar({ distrito: v })}
            ariaLabel="Filtrar por distrito"
            className="[&>button]:min-h-[3rem] [&>button]:rounded-2xl"
          />
          <SelectMenu
            id="diretorio-atendimento"
            value={filtro.modalidade}
            options={OPCOES_ATENDIMENTO}
            onChange={(v) => onMudar({ modalidade: v as ModalidadeFiltro })}
            ariaLabel="Filtrar por forma de atendimento"
            className="[&>button]:min-h-[3rem] [&>button]:rounded-2xl"
          />
        </div>

        <button
          type="submit"
          className="btn-shine focus-marca min-h-[3rem] rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float lg:px-7"
        >
          Encontrar
        </button>
      </div>

      {/* Atalhos, não filtros escondidos: clicar duas vezes na mesma área
          desliga-a, e o estado fica no `aria-pressed` (§66). */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        <span className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Áreas
        </span>
        {AREAS_EM_ATALHO.map((area) => {
          const ativa = filtro.especialidade === area;
          return (
            <button
              key={area}
              type="button"
              aria-pressed={ativa}
              onClick={() => onMudar({ especialidade: ativa ? "" : area })}
              className={`focus-marca min-h-[2.25rem] shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                ativa
                  ? "border-brand/30 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/20 dark:text-brand-mint"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {area}
            </button>
          );
        })}
      </div>
    </form>
  );
}
