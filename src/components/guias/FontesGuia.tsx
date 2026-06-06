import { ExternalLink } from "@/components/ui/Icons";

interface FonteItem {
  titulo: string;
  url: string;
  tipo: "oficial" | "referencia";
}

interface FontesGuiaProps {
  fontes: FonteItem[];
}

export function FontesGuia({ fontes }: FontesGuiaProps) {
  const oficiais = fontes.filter((f) => f.tipo === "oficial");
  const referencias = fontes.filter((f) => f.tipo === "referencia");

  return (
    <div className="mt-12 rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-4">
        Fontes e base legal
      </h3>
      {oficiais.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Fontes oficiais
          </p>
          <ul className="space-y-2">
            {oficiais.map((f) => (
              <li key={f.url}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-brand transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                  <span className="underline decoration-stone-200 group-hover:decoration-brand underline-offset-2">
                    {f.titulo}
                  </span>
                  <ExternalLink size={11} className="opacity-50 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {referencias.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
            Referências
          </p>
          <ul className="space-y-2">
            {referencias.map((f) => (
              <li key={f.url}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-500 hover:text-brand transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                  <span className="underline decoration-stone-200 group-hover:decoration-brand underline-offset-2">
                    {f.titulo}
                  </span>
                  <ExternalLink size={11} className="opacity-50 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
