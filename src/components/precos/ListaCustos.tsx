"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Lista editável de custos — rótulo + valor + remover.
//  ---------------------------------------------------------------------
//  Vivia dentro do `CamposPreco.tsx` e fazia parsing numérico à mão
//  (`replace(/[^\d,.]/g, "")` e `Number()`), ao contrário de todos os
//  outros campos numéricos da aplicação. Consequência prática: quem
//  colasse «1.234,50» — que é como o Excel português escreve mil duzentos
//  e trinta e quatro euros e meio — obtinha 1,23450, e o preço saía errado
//  por três ordens de grandeza sem um único aviso.
//
//  `LocalizedNumberInput` já resolve isto para o resto da aplicação, com
//  rascunho enquanto se escreve e normalização ao sair do campo. Usar
//  outra coisa aqui era ter duas gramáticas de número no mesmo formulário.
//
//  A segunda correção é mais pequena e igualmente real: «+ Outro» criava
//  uma linha sem rótulo, e o botão de remover ficava com
//  `aria-label="Remover "` — um nome acessível vazio numa lista onde todos
//  os botões são iguais.
// ═══════════════════════════════════════════════════════════════════════

import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import { Plus, Close } from "@/components/ui/Icons";

export interface ItemCusto {
  id: string;
  rotulo: string;
  valor: number;
}

export default function ListaCustos({
  itens,
  sufixo,
  sugestoes,
  aoMudar,
  nomeLista,
}: {
  itens: ItemCusto[];
  /** «/mês» ou «/un.» — entra no rótulo acessível de cada valor. */
  sufixo: string;
  sugestoes: string[];
  aoMudar: (itens: ItemCusto[]) => void;
  /** Para os rótulos acessíveis: «Renda» vs. «custo fixo 2 sem nome». */
  nomeLista: string;
}) {
  const adicionar = (rotulo: string) =>
    aoMudar([...itens, { id: `c${Date.now()}${itens.length}`, rotulo, valor: 0 }]);

  const trocar = (i: number, patch: Partial<ItemCusto>) => {
    const copia = [...itens];
    copia[i] = { ...copia[i], ...patch };
    aoMudar(copia);
  };

  return (
    <div>
      {itens.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {itens.map((item, i) => {
            const nome = item.rotulo.trim() || `${nomeLista} ${i + 1} sem nome`;
            return (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.rotulo}
                  onChange={(e) => trocar(i, { rotulo: e.target.value })}
                  aria-label={`Nome do ${nomeLista.toLowerCase()} ${i + 1}`}
                  placeholder="Nome"
                  className="min-h-[38px] min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
                <div className="relative w-28 flex-shrink-0">
                  <LocalizedNumberInput
                    value={item.valor}
                    onValueChange={(v) => trocar(i, { valor: v })}
                    min={0}
                    max={1_000_000}
                    inputMode="decimal"
                    aria-label={`${nome} — valor em euros ${sufixo}`}
                    className="min-h-[38px] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 pr-12 text-sm tabular-nums text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 dark:text-stone-400"
                  >
                    €{sufixo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => aoMudar(itens.filter((_, j) => j !== i))}
                  aria-label={`Remover ${nome}`}
                  className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-red-300 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
                >
                  <Close size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {sugestoes
          .filter((s) => !itens.some((i) => i.rotulo === s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-400"
            >
              <Plus size={11} />
              {s}
            </button>
          ))}
        <button
          type="button"
          onClick={() => adicionar("")}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 transition-colors hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-600 dark:text-stone-400"
        >
          <Plus size={11} />
          Outro
        </button>
      </div>
    </div>
  );
}
