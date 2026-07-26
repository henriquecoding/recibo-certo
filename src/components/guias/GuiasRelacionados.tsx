import Link from "next/link";
import { ArrowRight, Clock } from "@/components/ui/Icons";
import { guiasRelacionados, href } from "@/lib/guias/manifests";

// ─────────────────────────────────────────────────────────────────────────
//  Ligações internas contextuais.
//  Ponto 4.6 da auditoria: onze Guias não tinham nenhuma. Agora todos têm,
//  vindas do manifesto e validadas em CI (um relacionado inexistente falha
//  o build).
// ─────────────────────────────────────────────────────────────────────────

export default function GuiasRelacionados({ slug }: { slug: string }) {
  const relacionados = guiasRelacionados(slug);
  if (relacionados.length === 0) return null;

  return (
    <section aria-labelledby={`relacionados-${slug}`} className="mt-10">
      <h2 id={`relacionados-${slug}`} className="mb-3 font-display text-lg font-semibold text-ink">
        Continuar a ler
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {relacionados.map((g) => {
          const Icon = g.icon;
          return (
            <Link
              key={g.slug}
              href={href(g)}
              className="group flex min-h-[44px] items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 transition-colors hover:border-brand/40 dark:border-stone-700 dark:bg-stone-900"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand-dark dark:bg-stone-800">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-800 group-hover:text-brand dark:text-stone-100">
                  {g.navLabel}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-400">
                  <Clock size={11} /> {g.tempo} min
                </span>
              </span>
              <ArrowRight size={15} className="flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
