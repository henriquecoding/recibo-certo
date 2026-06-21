import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { ArrowRight, FileSign, Calculator, ShieldCheck, Calendar, Receipt, Building, Flag, ChevronRight, Wallet, Briefcase, Scale } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Guias fiscais e laborais 2026 | ReciboCerto",
  description: "Guias práticos sobre IRS, Segurança Social, IVA, IRC e direitos laborais para trabalhadores independentes, por conta de outrem e empresas em Portugal.",
  alternates: { canonical: "https://www.recibocerto.pt/guias" },
  openGraph: {
    title: "Guias fiscais e laborais 2026 | ReciboCerto",
    description: "Independentes, conta de outrem e empresas — tudo explicado em português simples.",
    url: "https://www.recibocerto.pt/guias",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "website",
  },
};

type GuiaEntry = {
  href: string;
  titulo: string;
  descricao: string;
  tempo: number;
  icon: React.ComponentType<{ size?: number }>;
};

const INDEPENDENTES: GuiaEntry[] = [
  { href: "/guias/abrir-atividade", titulo: "Como abrir atividade nas Finanças", descricao: "Passo a passo online, gratuito e imediato.", tempo: 5, icon: FileSign },
  { href: "/guias/ato-isolado", titulo: "Ato isolado ou recibos verdes?", descricao: "Decisor interativo para a tua situação.", tempo: 4, icon: Receipt },
  { href: "/guias/regime-simplificado", titulo: "Regime simplificado e coeficientes", descricao: "O que realmente pagas em IRS.", tempo: 6, icon: Calculator },
  { href: "/guias/retencao-na-fonte", titulo: "Retenção na fonte", descricao: "Quando aplicar e quando dispensar.", tempo: 4, icon: ShieldCheck },
  { href: "/guias/iva-recibos-verdes", titulo: "IVA nos recibos verdes", descricao: "A isenção de 15 000 € explicada.", tempo: 5, icon: Building },
  { href: "/guias/seguranca-social", titulo: "Segurança Social", descricao: "Fórmula, prazos e isenção do 1.º ano.", tempo: 5, icon: ShieldCheck },
  { href: "/guias/acumulacao-emprego", titulo: "Acumulação com emprego", descricao: "Tens emprego e passas recibos verdes?", tempo: 4, icon: Building },
  { href: "/guias/clientes-estrangeiros", titulo: "Clientes estrangeiros", descricao: "IVA e retenção para fora de Portugal.", tempo: 5, icon: Flag },
  { href: "/guias/cessar-atividade", titulo: "Cessar atividade", descricao: "Como fechar e o que acontece se não fechares.", tempo: 3, icon: FileSign },
  { href: "/guias/fatura-vs-recibo", titulo: "Fatura, recibo e fatura-recibo", descricao: "As diferenças e onde entram os recibos verdes.", tempo: 4, icon: Receipt },
  { href: "/guias/merchant-of-record", titulo: "Merchant of Record (MoR)", descricao: "Paddle, Lemon Squeezy e como emitir 1 recibo/mês.", tempo: 6, icon: Wallet },
];

const CONTA_OUTREM: GuiaEntry[] = [
  { href: "/guias/recibo-vencimento", titulo: "Como ler o recibo de vencimento", descricao: "Bruto, SS, IRS e líquido explicados.", tempo: 5, icon: Receipt },
  { href: "/guias/subsidios-ferias-natal", titulo: "Subsídio de férias e de Natal", descricao: "Cálculo, descontos e duodécimos.", tempo: 5, icon: Calendar },
  { href: "/guias/trabalho-suplementar", titulo: "Trabalho suplementar (horas extra)", descricao: "Acréscimos, retenção autónoma e limites.", tempo: 5, icon: Briefcase },
];

const EMPRESAS: GuiaEntry[] = [
  { href: "/guias/abrir-empresa", titulo: "Como abrir uma empresa", descricao: "Formas jurídicas, Empresa na Hora e custos.", tempo: 7, icon: Building },
  { href: "/guias/irc", titulo: "IRC para PME", descricao: "Taxas, derrama, pagamentos por conta.", tempo: 7, icon: Calculator },
  { href: "/guias/tributacao-autonoma", titulo: "Tributação autónoma", descricao: "Viaturas, representação e agravamento.", tempo: 7, icon: Scale },
];

const TRANSVERSAL: GuiaEntry[] = [
  { href: "/guias/escaloes-irs", titulo: "Escalões de IRS 2026", descricao: "Tabela e mitos sobre subir de escalão.", tempo: 5, icon: Calculator },
  { href: "/guias/irs-jovem", titulo: "IRS Jovem 2026", descricao: "Isenção, anos e como pedir.", tempo: 4, icon: Flag },
  { href: "/guias/deducoes-coleta", titulo: "Deduções à coleta", descricao: "Saúde, educação e despesas gerais no IRS.", tempo: 5, icon: Calculator },
];

const CATEGORIAS = [
  { label: "Independentes", sublabel: "Recibos verdes e regime simplificado", guias: INDEPENDENTES },
  { label: "Conta de outrem", sublabel: "Salário, recibo de vencimento e direitos", guias: CONTA_OUTREM },
  { label: "Empresas", sublabel: "Sociedades, IRC e tributação autónoma", guias: EMPRESAS },
  { label: "Transversal", sublabel: "Aplicável a todos os regimes", guias: TRANSVERSAL },
];

export default function GuiasPage() {
  return (
    <>
      <Reveal className="mb-10">
        <div className="eyebrow mb-3 text-brand">Guias</div>
        <h1 className="font-display display-2 font-semibold text-ink mb-4">
          Guias fiscais e laborais para 2026
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
          Para trabalhadores independentes, por conta de outrem e empresas. Sem jargão, com dados verificados e base legal.
        </p>
      </Reveal>

      {CATEGORIAS.map((cat) => (
        <section key={cat.label} className="mb-10">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{cat.label}</h2>
            <p className="text-xs text-stone-400 mt-0.5">{cat.sublabel}</p>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {cat.guias.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="group flex items-center justify-between py-3.5 hover:text-brand transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-stone-300 dark:text-stone-600 group-hover:text-brand transition-colors">
                    <g.icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 group-hover:text-brand transition-colors">
                      {g.titulo}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">{g.descricao} · {g.tempo} min</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-stone-300 group-hover:text-brand transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">Ferramentas interativas</h2>
        <div className="space-y-2">
          {[
            { label: "Ato isolado ou abrir atividade?", href: "/ferramentas/ato-isolado", desc: "Decisor em 4 perguntas" },
            { label: "Calculadora de regime simplificado", href: "/ferramentas/regime-simplificado", desc: "IRS estimado e taxa efetiva" },
            { label: "Classificar atividade fiscal", href: "/ferramentas/classificar-atividade", desc: "Art. 151.º vs Categoria B" },
            { label: "Wizard recibo MoR", href: "/ferramentas/payout-mor", desc: "Recibo ao Paddle/Lemon Squeezy" },
            { label: "Simulador de recibo de vencimento", href: "/ferramentas/recibo-vencimento", desc: "Bruto para líquido em segundos" },
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
