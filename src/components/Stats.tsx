import Link from "next/link";
import { Calculator, BookOpen, Trophy, Search, ArrowRight, Bank } from "@/components/ui/Icons";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import CountUp from "@/components/ui/CountUp";
import { FERRAMENTA_SLUGS, GUIA_SLUGS } from "@/lib/seo";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import { ATIVIDADES, SOURCES } from "@/lib/fiscal-data";

// ─────────────────────────────────────────────────────────────────────────────
// "O ReciboCerto em números" — social proof honesto: TODAS as contagens são
// derivadas dos arrays reais do código (sitemap, catálogo de atividades, banco
// do quiz, registo de fontes). Nada inventado, nada hardcoded — se o site
// crescer, os números acompanham. Server Component: fiscal-data fica no build.
// Cada cartão é uma porta de entrada real (link) para essa parte do site.
// ─────────────────────────────────────────────────────────────────────────────

const NUMEROS = [
  {
    icon: <Calculator size={16} />,
    valor: FERRAMENTA_SLUGS.length,
    label: "Ferramentas e simuladores",
    sub: "Cada uma com página própria e dados de 2026",
    href: "/ferramentas",
  },
  {
    icon: <BookOpen size={16} />,
    valor: GUIA_SLUGS.length,
    label: "Guias fiscais",
    sub: "Passo a passo, com base legal citada",
    href: "/guias",
  },
  {
    icon: <Trophy size={16} />,
    valor: TOTAL_PERGUNTAS_META,
    label: "Perguntas no Quiz Fiscal",
    sub: "Com fonte oficial em cada resposta",
    href: "/quiz-fiscal",
  },
  {
    icon: <Search size={16} />,
    valor: ATIVIDADES.length,
    label: "Atividades classificadas",
    sub: "Tabela completa do Art. 151.º CIRS",
    href: "/ferramentas/classificar-atividade",
  },
] as const;

const N_FONTES = Object.keys(SOURCES).length;

export default function Stats() {
  return (
    <section className="px-6 py-10" aria-label="O ReciboCerto em números">
      <StaggerGroup className="mx-auto grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
        {NUMEROS.map((p) => (
          <StaggerItem key={p.label}>
            <Link
              href={p.href}
              className="group flex h-full flex-col rounded-3xl border border-stone-100 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand">
                  {p.icon}
                </div>
                {/* Cor final em vez de `text-stone-200 dark:text-stone-700`: a base
                    `text-stone-200` é remapeada às cegas pelo `.dark` global (para
                    #2e3329, quase invisível) e ganha sempre ao `dark:` explícito —
                    a seta desaparecia em repouso. Evita a colisão por completo. */}
                <ArrowRight
                  size={13}
                  className="text-[#e7e5e4] transition-all group-hover:translate-x-0.5 group-hover:text-brand dark:text-[#57534e]"
                />
              </div>
              <div className="font-display text-3xl font-semibold tabular-nums leading-none text-ink">
                <CountUp value={p.valor} />
              </div>
              <div className="mt-2 text-xs font-semibold text-stone-700">{p.label}</div>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{p.sub}</p>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
      <div className="mx-auto mt-4 max-w-5xl text-center">
        <Link
          href="/#fontes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 transition-colors hover:text-brand-dark dark:hover:text-brand"
        >
          <Bank size={12} className="text-brand" />
          Tudo verificado em {N_FONTES} fontes oficiais — AT, Segurança Social e Diário da República
          <ArrowRight size={11} />
        </Link>
      </div>
    </section>
  );
}
