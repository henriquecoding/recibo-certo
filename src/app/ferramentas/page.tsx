import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight } from "@/components/ui/Icons";
import { FERRAMENTAS } from "@/lib/ferramentas-config";

export const metadata: Metadata = {
  title: "Ferramentas fiscais 2026 — independentes e por conta de outrem | ReciboCerto",
  description: "Calculadoras e decisores interativos para recibos verdes e para quem trabalha por conta de outrem: salário líquido, regime simplificado, ato isolado vs atividade e classificação de atividade fiscal.",
  keywords: [
    "calcular salário líquido 2026",
    "simulador recibos verdes 2026",
    "ferramentas fiscais Portugal",
    "regime simplificado calculadora",
    "por conta de outrem simulador",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas" },
  openGraph: {
    title: "Ferramentas fiscais 2026 — independentes e por conta de outrem | ReciboCerto",
    description: "Decisores interativos e calculadoras para simplificar a vida fiscal — quer passes recibos verdes, quer recebas salário por conta de outrem.",
    url: "https://www.recibocerto.pt/ferramentas",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

// Cartões derivados da fonte única (ferramentas-config.ts) — inclui TODAS as
// ferramentas oficiais (o simulador de IRS anual em primeiro) mais os cartões
// só-de-hub (comparador da homepage e Quiz Fiscal, com contagem real).

export default function FerramentasPage() {
  return (
    <>
      <Reveal className="mb-12">
        <div className="eyebrow mb-3 text-brand">Ferramentas</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Calculadoras e decisores fiscais
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Ferramentas interativas para clarificar a tua situação fiscal sem precisar de decorar artigos
          de lei — quer trabalhes por conta própria (recibos verdes), quer por conta de outrem.
        </p>
      </Reveal>

      <div className="space-y-4">
        {FERRAMENTAS.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group flex items-start gap-5 rounded-3xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 hover:border-brand/40 hover:shadow-float transition-all duration-300"
          >
            <div className="flex-shrink-0 rounded-2xl bg-brand/8 p-3">
              <f.Icon size={22} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-brand bg-brand/8 px-2 py-0.5 rounded-full">
                  {f.badge}
                </span>
              </div>
              <h2 className="font-semibold text-stone-800 dark:text-stone-100 mb-1.5 group-hover:text-brand transition-colors">
                {f.titulo}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                {f.descricao}
              </p>
            </div>
            <ArrowRight
              size={18}
              className="flex-shrink-0 mt-1 text-stone-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-5 text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
          Precisas de contexto antes de usar as ferramentas?
        </p>
        <Link
          href="/guias"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition-colors"
        >
          Ver guias explicativos
          <ArrowRight size={14} />
        </Link>
      </div>
    </>
  );
}
