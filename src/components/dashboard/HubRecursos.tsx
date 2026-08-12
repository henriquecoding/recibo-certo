// ═══════════════════════════════════════════════════════════════════════
//  O hub do painel — agora DERIVADO do catálogo (P0-04)
//  ---------------------------------------------------------------------
//  Este ficheiro era o terceiro registo paralelo de ferramentas, e o pior
//  dos três: `FERRAMENTAS` e `FERRAMENTA_SLUGS` tinham pelo menos um teste
//  a provar que coincidiam entre si; o `BLOCOS` daqui não participava em
//  garantia nenhuma. Omitia, em silêncio, o simulador de IRS, o comparador
//  público, as heranças e as duas calculadoras escondidas em guias.
//
//  Deixou de haver lista. Os blocos são os objetivos do catálogo, e uma
//  ferramenta nova aparece aqui no dia em que entra no catálogo — sem
//  ninguém se lembrar deste ficheiro.
//
//  A rota preferida é a do painel quando existe (mantém o contexto e os
//  cenários guardados); caso contrário, a pública. Não há segunda
//  implementação: é o mesmo componente de domínio dos dois lados.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { BookOpen, Trophy, ArrowRight } from "@/components/ui/Icons";
import { agruparPorObjetivo, ROTULO_INTENT } from "@/lib/ferramentas";
import { iconeDe } from "@/components/ferramentas/icon-map";

/** Aprender fica visualmente separado: não são ferramentas (§2.2). */
const APRENDER = [
  { href: "/guias", titulo: "Guias fiscais", desc: "IRS, IVA, Segurança Social e mais", icon: BookOpen },
  { href: "/quiz-fiscal", titulo: "Quiz Fiscal", desc: "Testa-te com base legal e fontes", icon: Trophy },
];

const CARTAO =
  "group flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900";
const ICONE =
  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white";

export default function HubRecursos() {
  const grupos = agruparPorObjetivo();

  return (
    <section aria-labelledby="hub-recursos" className="mt-10">
      <div className="mb-4">
        <h2 id="hub-recursos" className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
          Explorar tudo o que tens
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Para além dos recibos verdes: todas as ferramentas, organizadas pelo que queres resolver.
        </p>
      </div>

      <div className="space-y-6">
        {grupos.map((grupo) => (
          <div key={grupo.objetivo}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {ROTULO_INTENT[grupo.objetivo]}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.ferramentas.map((f) => {
                const Icon = iconeDe(f.icon);
                return (
                  <Link key={f.id} href={f.dashboardHref ?? f.canonicalHref} className={CARTAO}>
                    <span className={ICONE}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {f.title}
                        <ArrowRight size={13} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                        {f.shortOutcome}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Aprender</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {APRENDER.map((r) => {
              const Icon = r.icon;
              return (
                <Link key={r.href} href={r.href} className={CARTAO}>
                  <span className={ICONE}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {r.titulo}
                      <ArrowRight size={13} className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{r.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
