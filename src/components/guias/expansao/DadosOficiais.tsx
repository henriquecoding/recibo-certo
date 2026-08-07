import { Scale, Warning } from "@/components/ui/Icons";
import { dadosDoGuia } from "@/lib/guias/expansao/dados";
import { FISCAL_YEAR } from "@/lib/fiscal-year";

// ─────────────────────────────────────────────────────────────────────────
//  DADOS OFICIAIS DO ANO — os valores que o guia cita
//
//  Uma lista de definições e não uma tabela: em 360 px uma tabela de três
//  colunas ou rebenta a linha ou obriga a arrastar na horizontal, e estes
//  valores são exatamente o que alguém consulta no telemóvel a meio de um
//  formulário. Cada entrada empilha em ecrã estreito e alinha em três
//  colunas a partir de `sm:`.
//
//  O QUE NÃO APARECE AQUI é tão importante como o que aparece: as entradas
//  que o pacote marcou «confirmar» são pontos de partida não verificados e
//  ficam de fora. Em vez de as esconder em silêncio, o bloco diz quantas
//  são — quem lê fica a saber que há matéria por fechar, e não fica com a
//  impressão de que a lista é exaustiva.
// ─────────────────────────────────────────────────────────────────────────

export default function DadosOficiais({ slug }: { slug: string }) {
  const { publicaveis, retidos } = dadosDoGuia(slug);
  const porConfirmar = retidos.length;
  if (publicaveis.length === 0 && porConfirmar === 0) return null;

  return (
    <section aria-labelledby={`dados-${slug}`} className="mb-10">
      <h2
        id={`dados-${slug}`}
        className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-stone-800 dark:text-stone-100"
      >
        <Scale size={17} className="flex-shrink-0 text-brand" />
        Dados oficiais de {FISCAL_YEAR}
      </h2>

      {publicaveis.length > 0 && (
        <dl className="overflow-hidden rounded-3xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
          {publicaveis.map((d, i) => (
            <div
              key={d.label}
              className={`flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-4 ${
                i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""
              }`}
            >
              <dt className="text-sm text-stone-500 dark:text-stone-400 sm:w-2/5 sm:flex-shrink-0">
                {d.label}
              </dt>
              <dd className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {d.valor}
                </span>
                {d.nota && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-400">
                    {d.nota}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {porConfirmar > 0 && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <Warning size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <span>
            {porConfirmar === 1
              ? "Há mais um valor associado a este tema que não está aqui: continua por confirmar na redação em vigor."
              : `Há mais ${porConfirmar} valores associados a este tema que não estão aqui: continuam por confirmar na redação em vigor.`}{" "}
            Preferimos não os mostrar a mostrá-los sem confirmação.
          </span>
        </p>
      )}
    </section>
  );
}
