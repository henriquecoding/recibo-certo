import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight, FileSign, Calculator, ShieldCheck, Calendar, Receipt, Building, Flag, ChevronRight, Wallet } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Guias para trabalhadores independentes 2026 | ReciboCerto",
  description: "Guias práticos sobre recibos verdes, IRS, Segurança Social, IVA e tudo o que precisas de saber como trabalhador independente em Portugal em 2026.",
  alternates: { canonical: "https://www.recibocerto.pt/guias" },
  openGraph: {
    title: "Guias para trabalhadores independentes 2026 | ReciboCerto",
    description: "Recibos verdes, IRS, Segurança Social e IVA — em português simples.",
    url: "https://www.recibocerto.pt/guias",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

const GUIAS = [
  {
    href: "/guias/abrir-atividade",
    titulo: "Como abrir atividade nas Finanças",
    descricao: "Passo a passo online, gratuito e imediato.",
    tempo: 5,
    icon: FileSign,
    prioridade: true,
  },
  {
    href: "/guias/ato-isolado",
    titulo: "Ato isolado ou recibos verdes?",
    descricao: "Decisor interativo para a tua situação.",
    tempo: 4,
    icon: Receipt,
    prioridade: true,
  },
  {
    href: "/guias/regime-simplificado",
    titulo: "Regime simplificado e coeficientes",
    descricao: "O que realmente pagas em IRS.",
    tempo: 6,
    icon: Calculator,
    prioridade: true,
  },
  {
    href: "/guias/retencao-na-fonte",
    titulo: "Retenção na fonte",
    descricao: "Quando aplicar e quando dispensar.",
    tempo: 4,
    icon: ShieldCheck,
    prioridade: false,
  },
  {
    href: "/guias/iva-recibos-verdes",
    titulo: "IVA nos recibos verdes",
    descricao: "A isenção de 15 000 € explicada.",
    tempo: 5,
    icon: Building,
    prioridade: false,
  },
  {
    href: "/guias/seguranca-social",
    titulo: "Segurança Social",
    descricao: "Fórmula, prazos e isenção do 1.º ano.",
    tempo: 5,
    icon: ShieldCheck,
    prioridade: false,
  },
  {
    href: "/guias/irs-jovem",
    titulo: "IRS Jovem 2026",
    descricao: "Isenção, anos e como pedir.",
    tempo: 4,
    icon: Flag,
    prioridade: false,
  },
  {
    href: "/guias/escaloes-irs",
    titulo: "Escalões de IRS 2026",
    descricao: "Tabela e mitos sobre subir de escalão.",
    tempo: 5,
    icon: Calculator,
    prioridade: false,
  },
  {
    href: "/guias/acumulacao-emprego",
    titulo: "Acumulação com emprego",
    descricao: "Tens emprego e passas recibos verdes?",
    tempo: 4,
    icon: Building,
    prioridade: false,
  },
  {
    href: "/guias/clientes-estrangeiros",
    titulo: "Clientes estrangeiros",
    descricao: "IVA e retenção para fora de Portugal.",
    tempo: 5,
    icon: Flag,
    prioridade: false,
  },
  {
    href: "/guias/cessar-atividade",
    titulo: "Cessar atividade",
    descricao: "Como fechar e o que acontece se não fechares.",
    tempo: 3,
    icon: FileSign,
    prioridade: false,
  },
  {
    href: "/guias/deducoes-coleta",
    titulo: "Deduções à coleta",
    descricao: "Saúde, educação e despesas gerais no IRS.",
    tempo: 5,
    icon: Calculator,
    prioridade: false,
  },
  {
    href: "/guias/fatura-vs-recibo",
    titulo: "Fatura, recibo e fatura-recibo",
    descricao: "As diferenças e onde entram os recibos verdes.",
    tempo: 4,
    icon: Receipt,
    prioridade: false,
  },
  {
    href: "/guias/merchant-of-record",
    titulo: "Merchant of Record (MoR)",
    descricao: "Paddle, Lemon Squeezy e como emitir 1 recibo/mês.",
    tempo: 6,
    icon: Wallet,
    prioridade: false,
  },
];

export default function GuiasPage() {
  const destacados = GUIAS.filter((g) => g.prioridade);
  const restantes = GUIAS.filter((g) => !g.prioridade);

  return (
    <>
      <Reveal className="mb-10">
        <div className="eyebrow mb-3 text-brand">Guias</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4">
          Tudo sobre recibos verdes em 2026
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
          Guias práticos escritos para trabalhadores independentes portugueses. Sem jargão, com dados verificados e base legal.
        </p>
      </Reveal>

      <section className="mb-10">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Por onde começar</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {destacados.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.href}
                href={g.href}
                className="group rounded-3xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-card hover:shadow-lift transition-shadow"
              >
                <div className="mb-3 text-brand">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-1 text-sm group-hover:text-brand transition-colors">
                  {g.titulo}
                </h3>
                <p className="text-xs text-stone-500">{g.descricao}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-brand font-semibold">
                  Ler guia <ArrowRight size={12} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Todos os guias</h2>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {restantes.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group flex items-center justify-between py-3.5 hover:text-brand transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">
                  {g.titulo}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">{g.descricao} · {g.tempo} min</p>
              </div>
              <ChevronRight size={16} className="text-stone-300 group-hover:text-brand transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Ferramentas interativas</h2>
        <div className="space-y-2">
          {[
            { label: "Ato isolado ou abrir atividade?", href: "/ferramentas/ato-isolado", desc: "Decisor em 4 perguntas" },
            { label: "Calculadora de regime simplificado", href: "/ferramentas/regime-simplificado", desc: "IRS estimado e taxa efetiva" },
            { label: "Classificar atividade fiscal", href: "/ferramentas/classificar-atividade", desc: "Art. 151.º vs Categoria B" },
            { label: "Wizard recibo MoR", href: "/ferramentas/payout-mor", desc: "Recibo ao Paddle/Lemon Squeezy" },
          ].map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex items-center justify-between rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 px-4 py-3 hover:border-brand/40 transition-all"
            >
              <div>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">{f.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{f.desc}</p>
              </div>
              <ChevronRight size={15} className="text-stone-300 group-hover:text-brand transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
