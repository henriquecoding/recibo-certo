// Esqueleto de um workspace do painel.
//
// Reproduz a GEOMETRIA dos módulos — cabeçalho, faixa de estado, corpo —
// para a página não saltar quando o conteúdo real chega. Não mostra
// números nem rótulos: um valor fictício num esqueleto é indistinguível de
// um valor a sério durante o meio segundo em que está no ecrã.
//
// `motion-reduce:animate-none`: quem pediu menos movimento não leva uma
// pulsação a atravessar-lhe a página inteira.
export default function EsqueletoWorkspace({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="mx-auto max-w-5xl" role="status" aria-label={`A carregar ${etiqueta}`}>
      <div className="mb-6 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded-xl bg-stone-200 motion-reduce:animate-none dark:bg-stone-800" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-lg bg-stone-100 motion-reduce:animate-none dark:bg-stone-800/60" />
      </div>
      <div className="mb-4 h-28 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card motion-reduce:animate-none dark:border-stone-800 dark:bg-stone-900" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card motion-reduce:animate-none dark:border-stone-800 dark:bg-stone-900"
          />
        ))}
      </div>
    </div>
  );
}
