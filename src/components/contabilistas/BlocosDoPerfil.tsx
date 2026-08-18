// ═══════════════════════════════════════════════════════════════════════
//  BLOCOS NO PERFIL PÚBLICO — o que a pessoa compôs, como ela compôs
//  ---------------------------------------------------------------------
//  Componente de servidor: não tem estado, não tem eventos, e o que
//  renderiza é texto. Nenhum bloco é interpretado como HTML — o React
//  escapa tudo, e a base de dados já recusa marcação por trigger. São
//  duas defesas para o mesmo risco, e é para ser: uma delas vai falhar
//  algum dia.
//
//  A filtragem é `blocosPublicaveis`, a mesma função que o editor usa
//  para dizer «isto não aparece ainda». Um segundo critério aqui faria a
//  pré-visualização mentir.
// ═══════════════════════════════════════════════════════════════════════

import {
  blocosPublicaveis, lerBlocos, type Bloco,
} from "@/lib/contabilistas/personalizacao/blocos";

export default function BlocosDoPerfil({ bruto }: { bruto: unknown }) {
  const blocos = blocosPublicaveis(lerBlocos(bruto));
  if (blocos.length === 0) return null;

  return (
    <div className="mt-6 space-y-5">
      {blocos.map((b) => (
        <section
          key={b.id}
          className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-7"
        >
          <h2 className="font-display text-xl leading-tight text-ink">
            {b.titulo}
          </h2>
          <Corpo bloco={b} />
        </section>
      ))}
    </div>
  );
}

function Corpo({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case "texto":
      return (
        <div className="mt-3 space-y-3">
          {bloco.itens.map((i, k) => (
            <p
              key={k}
              className="whitespace-pre-line text-base leading-relaxed text-stone-700"
            >
              {i.principal}
            </p>
          ))}
        </div>
      );

    case "faq":
      return (
        <dl className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
          {bloco.itens.map((i, k) => (
            <div key={k} className="py-3 first:pt-0 last:pb-0">
              <dt className="text-sm font-semibold text-ink">{i.principal}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">
                {i.secundario}
              </dd>
            </div>
          ))}
        </dl>
      );

    case "percurso":
      // Numerada porque a ordem É a informação: o percurso responde a «o
      // que acontece a seguir», e uma lista sem números não responde.
      return (
        <ol className="mt-3 space-y-3">
          {bloco.itens.map((i, k) => (
            <li key={k} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold tabular-nums text-brand-dark dark:bg-brand/15 dark:text-brand"
              >
                {k + 1}
              </span>
              <span className="text-sm leading-relaxed text-stone-700">
                {i.principal}
              </span>
            </li>
          ))}
        </ol>
      );

    case "lista":
    case "publico":
    default:
      return (
        <ul className="mt-3 space-y-2">
          {bloco.itens.map((i, k) => (
            <li key={k} className="flex gap-2.5 text-sm leading-relaxed text-stone-700">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {i.principal}
            </li>
          ))}
        </ul>
      );
  }
}
