import type { Metadata } from "next";
import Link from "next/link";
import GuiasIndex from "@/components/guias/GuiasIndex";
import {
  Calculator, Receipt, Scale, FileSign, Wallet, Building, ShieldCheck, ChevronRight, ArrowRight,
} from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Guias fiscais e laborais 2026 | ReciboCerto",
  description:
    "Guias práticos sobre IRS, Segurança Social, IVA, IRC e direitos laborais para trabalhadores independentes, por conta de outrem e empresas em Portugal — com base legal e taxas oficiais de 2026.",
  keywords: [
    "guias fiscais", "recibos verdes", "IRS 2026", "regime simplificado",
    "segurança social independentes", "IVA recibos verdes", "IRC PME",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/guias" },
  openGraph: {
    title: "Guias fiscais e laborais 2026 | ReciboCerto",
    description: "Independentes, conta de outrem e empresas — tudo explicado em português simples, com base legal.",
    url: "https://www.recibocerto.pt/guias",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

const FERRAMENTAS = [
  { label: "Calculadora de recibos verdes", desc: "Líquido real: IRS, SS e IVA.", href: "/ferramentas/regime-simplificado", icon: Calculator },
  { label: "Simulador de recibo de vencimento", desc: "Do bruto ao líquido em segundos.", href: "/ferramentas/recibo-vencimento", icon: Receipt },
  { label: "Ato isolado ou abrir atividade?", desc: "Decisor em poucas perguntas.", href: "/ferramentas/ato-isolado", icon: Scale },
  { label: "Classificar a tua atividade", desc: "Código (Art. 151.º) e coeficiente.", href: "/ferramentas/classificar-atividade", icon: FileSign },
  { label: "Recibo para Merchant of Record", desc: "Paddle / Lemon Squeezy: 1 recibo/mês.", href: "/ferramentas/payout-mor", icon: Wallet },
  { label: "Simulador de empresa (IRC)", desc: "Sociedade vs. recibos verdes.", href: "/ferramentas/simulador-empresa", icon: Building },
  { label: "Auditoria de recibo", desc: "Confere se o teu recibo está certo.", href: "/ferramentas/auditoria-recibo", icon: ShieldCheck },
];

export default function GuiasPage() {
  return (
    <>
      <GuiasIndex />

      {/* Funil para os simuladores */}
      <section className="mt-12 rounded-4xl border border-stone-200/70 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow text-brand">Simuladores e ferramentas</div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Da teoria às tuas contas</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Os guias explicam; os simuladores fazem as contas por ti. Gratuitos e com as taxas
              oficiais de 2026.
            </p>
          </div>
          <Link href="/ferramentas/regime-simplificado" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-dark">
            Abrir calculadora <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className="group flex items-start gap-3 rounded-2xl border border-stone-200/80 bg-cream/40 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:bg-white hover:shadow-lift dark:border-stone-700 dark:bg-stone-800/40 dark:hover:bg-stone-800"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/15">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{f.label}</p>
                    <ChevronRight size={15} className="flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{f.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
