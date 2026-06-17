import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight, Calculator, Receipt, Search, Wallet, Sparkle, User } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Ferramentas para trabalhadores independentes 2026 | ReciboCerto",
  description: "Calculadoras e decisores interativos para recibos verdes: regime simplificado, ato isolado vs atividade, e classificação de atividade fiscal.",
  alternates: { canonical: "https://recibocerto.pt/ferramentas" },
  openGraph: {
    title: "Ferramentas fiscais para independentes 2026 | ReciboCerto",
    description: "Decisores interativos e calculadoras para simplificar a vida fiscal de trabalhadores independentes.",
    url: "https://recibocerto.pt/ferramentas",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

const FERRAMENTAS = [
  {
    href: "/ferramentas/recibo-vencimento",
    titulo: "Simulador de recibo de vencimento",
    descricao: "Por conta de outrem? Do salário bruto ao líquido — IRS retido, Segurança Social e subsídio de refeição, com as tabelas oficiais de 2026.",
    icon: User,
    badge: "Simulador",
  },
  {
    href: "/ferramentas/ato-isolado",
    titulo: "Ato isolado ou atividade?",
    descricao: "Responde a 4 perguntas simples e fica a saber se deves emitir um ato isolado ou abrir atividade nas Finanças.",
    icon: Receipt,
    badge: "Decisor",
  },
  {
    href: "/ferramentas/regime-simplificado",
    titulo: "Calculadora de regime simplificado",
    descricao: "Insere a tua faturação e atividade. Calcula coeficiente, rendimento tributável, IRS estimado e taxa efetiva.",
    icon: Calculator,
    badge: "Calculadora",
  },
  {
    href: "/ferramentas/classificar-atividade",
    titulo: "Classificar atividade fiscal",
    descricao: "Pesquisa a tua profissão e descobre a retenção na fonte, o coeficiente e a base de Segurança Social aplicável.",
    icon: Search,
    badge: "Comparador",
  },
  {
    href: "/ferramentas/payout-mor",
    titulo: "Wizard recibo Merchant of Record",
    descricao: "Configura o recibo verde para payout do Paddle ou Lemon Squeezy em 5 passos. IVA, retenção e NIF preenchidos.",
    icon: Wallet,
    badge: "Wizard",
  },
  {
    href: "/quiz-fiscal",
    titulo: "Quiz Fiscal",
    descricao: "60 perguntas sobre IRS, IVA, Segurança Social e mais — com base legal e fontes oficiais. Testa os teus conhecimentos.",
    icon: Sparkle,
    badge: "Quiz",
  },
];

export default function FerramentasPage() {
  return (
    <>
      <Reveal className="mb-12">
        <div className="eyebrow mb-3 text-brand">Ferramentas</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4 text-balance">
          Calculadoras e decisores fiscais
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Ferramentas interativas para clarificar a tua situação fiscal sem precisar de decorar artigos de lei.
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
              <f.icon size={22} className="text-brand" />
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
