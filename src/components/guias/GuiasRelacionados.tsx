import Link from "next/link";
import { ArrowRight, Clock } from "@/components/ui/Icons";
import { guiasRelacionados, href, HUB_GRUPOS } from "@/lib/guias/manifests";

// ─────────────────────────────────────────────────────────────────────────
//  Ligações internas contextuais.
//
//  A primeira versão mostrava só o título e os minutos de leitura. Um título
//  sozinho — "IVA", "Segurança Social" — não é um convite: quem não sabe o
//  que lá está dentro não tem razão nenhuma para clicar, e quem sabe também
//  não. O cartão passa a dizer O QUE SE GANHA em cada guia, que é a única
//  informação que faz alguém abrir mais um separador.
//
//  Três acrescentos, por ordem de importância:
//    · a descrição do manifesto — a promessa concreta do guia;
//    · o grupo do hub — situa o guia ("Direitos e cobranças", "Faturar"),
//      para o leitor perceber que está a mudar de assunto ou a aprofundar;
//    · um título de secção que enquadra, em vez de "Continuar a ler" seco.
//
//  Tudo vem do manifesto: um relacionado inexistente falha o build.
// ─────────────────────────────────────────────────────────────────────────

const ROTULO_HUB = new Map(HUB_GRUPOS.map((h) => [h.id, h.titulo]));

export default function GuiasRelacionados({ slug }: { slug: string }) {
  const relacionados = guiasRelacionados(slug);
  if (relacionados.length === 0) return null;

  return (
    <section aria-labelledby={`relacionados-${slug}`} className="mt-10">
      <h2
        id={`relacionados-${slug}`}
        className="font-display text-lg font-semibold text-ink"
      >
        A seguir a este
      </h2>
      <p className="mb-4 mt-1 text-sm text-stone-500 dark:text-stone-400">
        As perguntas que costumam vir logo a seguir a esta.
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {relacionados.map((g) => {
          const Icon = g.icon;
          const hub = ROTULO_HUB.get(g.hub);
          return (
            <Link
              key={g.slug}
              href={href(g)}
              className="group flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand-dark dark:bg-stone-800 dark:group-hover:bg-brand/15 dark:group-hover:text-brand">
                <Icon size={16} />
              </span>

              <span className="min-w-0 flex-1">
                {hub && (
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {hub}
                  </span>
                )}
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-stone-800 group-hover:text-brand-dark dark:text-stone-100 dark:group-hover:text-brand">
                    {g.navLabel}
                  </span>
                  <ArrowRight
                    size={15}
                    className="mt-0.5 flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </span>

                {/* A razão para clicar. Duas linhas chegam e mantêm os
                    cartões da grelha com a mesma altura. */}
                <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                  {g.descricao}
                </span>

                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
                  <Clock size={11} /> {g.tempo} min de leitura
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
