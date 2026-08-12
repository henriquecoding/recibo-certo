// Esqueletos com a FORMA do que vem a seguir.
//
// Um retângulo cinzento de 24rem diz «espera». Um esqueleto com a forma
// certa diz «espera, e o que vem é uma lista» — e, quando o conteúdo
// chega, não há salto: o que estava lá tinha o tamanho do que ficou.
//
// Três formas cobrem o painel inteiro. Mais do que isso seria desenhar
// duas vezes cada ecrã, e um esqueleto que precisa de manutenção é um
// esqueleto que fica desatualizado.

export type FormaEsqueleto = "lista" | "formulario" | "duasColunas";

export default function EsqueletoPainel({ forma = "lista" }: { forma?: FormaEsqueleto }) {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* Cabeçalho: rótulo, título e a linha de contexto. */}
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
        <div className="h-9 w-48 animate-pulse rounded-xl bg-stone-100" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-stone-100" />
      </div>

      {forma === "lista" && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-4xl bg-stone-100" />
          ))}
        </div>
      )}

      {forma === "formulario" && (
        <div className="space-y-4 rounded-4xl border border-stone-200 bg-white p-5 sm:p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-32 animate-pulse rounded bg-stone-100" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-stone-100" />
            </div>
          ))}
        </div>
      )}

      {forma === "duasColunas" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4 rounded-4xl border border-stone-200 bg-white p-5 sm:p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-stone-100" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
              </div>
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-4xl bg-stone-100" />
        </div>
      )}
    </div>
  );
}
