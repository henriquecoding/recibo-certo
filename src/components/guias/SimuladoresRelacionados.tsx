import Link from "next/link";
import { Calculator, Briefcase, ArrowRight } from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────
//  Simuladores relacionados — converte leitores de guias em utilizadores das
//  ferramentas. Em todos os guias encaminhamos para os dois destinos centrais:
//  a página de Simuladores e o Simulador de IRS.
// ─────────────────────────────────────────────────────────────────────────

const DESTINOS = [
  {
    titulo: "Simuladores",
    desc: "Recibos verdes, vencimento e empresa — o teu líquido real com as taxas oficiais de 2026.",
    href: "/dashboard/simulador",
    icon: Briefcase,
  },
  {
    titulo: "Simulador de IRS",
    desc: "A tua declaração anual, do bruto ao reembolso, com memória de cálculo passo a passo.",
    href: "/ferramentas/simulador-irs",
    icon: Calculator,
  },
];

export default function SimuladoresRelacionados({ slug = "" }: { slug?: string }) {
  // slug mantido para futura contextualização; os destinos são transversais.
  void slug;
  return (
    <section
      aria-label="Simuladores relacionados"
      className="mt-12 rounded-4xl border border-brand/20 bg-gradient-to-br from-brand-light/60 to-cream p-6 shadow-card dark:border-brand/15 dark:from-brand/10 dark:to-stone-900 sm:p-8"
    >
      <div className="mb-1.5">
        <span className="eyebrow text-brand">Põe em prática</span>
      </div>
      <h2 className="font-display text-2xl font-semibold text-ink">Já que estás aqui, faz as contas</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Aplica este guia à tua situação real com os nossos simuladores — gratuitos, com as taxas
        oficiais de 2026 e a memória de cálculo passo a passo.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DESTINOS.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              className="group flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/15">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{d.titulo}</p>
                  <ArrowRight size={15} className="flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{d.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
