import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator, Scale, FileSign, Export, Sparkle, Check, ArrowRight,
  ChartProjection, ShieldCheck, BookOpen, Receipt, Building,
} from "@/components/ui/Icons";
import { generateFAQSchema } from "@/lib/seo";
import SimuladorIRS from "@/components/simulador/SimuladorIRS";
import DemoIRS from "@/components/simulador/DemoIRS";

export const metadata: Metadata = {
  title: "Simulador de IRS 2026 — calcula o teu IRS anual passo a passo | ReciboCerto",
  description:
    "Simula o IRS anual de 2026 em Portugal: trabalho dependente, recibos verdes, pensões, capitais, rendas, mais-valias e estrangeiro. Deduções à coleta, tributação conjunta, escalões e memória de cálculo — guiado, gratuito e com as taxas oficiais.",
  keywords: [
    "simulador IRS 2026",
    "calcular IRS anual",
    "simulador IRS Portugal",
    "reembolso ou pagar IRS",
    "escalões IRS 2026",
    "deduções à coleta",
    "tributação conjunta IRS",
    "Modelo 3 simulação",
  ],
  alternates: { canonical: "https://www.recibocerto.pt/ferramentas/simulador-irs" },
  openGraph: {
    title: "Simulador de IRS 2026 — o teu IRS anual, explicado | ReciboCerto",
    description:
      "Do rendimento bruto ao reembolso (ou valor a pagar): simula o IRS anual com todas as categorias, deduções e tributação conjunta, com memória de cálculo passo a passo.",
    url: "https://www.recibocerto.pt/ferramentas/simulador-irs",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Quando se entrega a declaração de IRS em 2026?",
    a: "A declaração anual de IRS (Modelo 3) entrega-se, em regra, entre 1 de abril e 30 de junho do ano seguinte ao dos rendimentos, independentemente da categoria. O simulador ajuda-te a antecipar o resultado muito antes do prazo, para te organizares com calma.",
  },
  {
    q: "O simulador serve para recibos verdes e para trabalho dependente?",
    a: "Sim. Podes somar várias categorias na mesma declaração: trabalho dependente (Anexo A), trabalho independente / recibos verdes (Anexo B), pensões, capitais (Anexo E), rendas (Anexo F), mais-valias (Anexo G), benefícios e deduções (Anexo H) e rendimentos do estrangeiro (Anexo J).",
  },
  {
    q: "Os valores são oficiais e atualizados?",
    a: "O motor usa as taxas, escalões, coeficientes e deduções em vigor para 2026, com base legal identificada. É uma estimativa de planeamento e não substitui a declaração oficial nem o aconselhamento de um contabilista certificado.",
  },
  {
    q: "Posso simular a tributação conjunta de um casal?",
    a: "Sim. Em tributação conjunta preenches os rendimentos próprios do sujeito passivo B (cônjuge ou unido de facto) — salários, trabalho independente e pensões — e o rendimento coletável é apurado por pessoa e agregado antes do quociente conjugal. O comparador mostra-te se compensa mais a tributação individual ou conjunta.",
  },
  {
    q: "O simulador é gratuito?",
    a: "Sim, simular o teu IRS é gratuito e sem registo. Exportar a simulação em PDF/CSV e guardar cenários fazem parte do plano Pro: com sessão iniciada podes guardar 1 cenário neste dispositivo, para experimentares como funciona; sincronizar na nuvem e guardar sem limites, entre dispositivos, é uma funcionalidade Pro.",
  },
];

const FEATURES: { Icon: typeof Calculator; titulo: string; desc: string }[] = [
  {
    Icon: Calculator,
    titulo: "Todas as categorias e anexos",
    desc: "Trabalho dependente, recibos verdes, pensões, capitais, rendas, mais-valias e rendimentos do estrangeiro — tudo na mesma declaração.",
  },
  {
    Icon: Scale,
    titulo: "Tributação conjunta a sério",
    desc: "Inclui os rendimentos do sujeito passivo B e aplica o quociente conjugal, com apuramento por titular.",
  },
  {
    Icon: ChartProjection,
    titulo: "Comparador de cenários",
    desc: "Individual vs conjunta e englobamento vs taxas autónomas, lado a lado, para escolheres o caminho que te fica melhor.",
  },
  {
    Icon: BookOpen,
    titulo: "Memória de cálculo",
    desc: "Cada passo explicado — do rendimento global ao coletável, escalões, coleta, deduções e imposto final.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Deduções e benefícios",
    desc: "Saúde, educação, despesas gerais, rendas, PPR, donativos, ascendentes e pensões de alimentos, com os limites legais.",
  },
  {
    Icon: Export,
    titulo: "Exporta e guarda",
    desc: "Descarrega em PDF ou CSV e guarda o cenário completo para reabrires e continuares quando quiseres.",
  },
];

const PASSOS: { n: string; titulo: string; desc: string }[] = [
  {
    n: "01",
    titulo: "Identifica o agregado",
    desc: "Estado civil, dependentes, ascendentes e, se for o caso, o sujeito passivo B para tributação conjunta.",
  },
  {
    n: "02",
    titulo: "Adiciona os rendimentos",
    desc: "Ativas só as categorias que te dizem respeito e preenches os valores — o simulador trata dos coeficientes e regras.",
  },
  {
    n: "03",
    titulo: "Vê o resultado e a memória",
    desc: "Obténs o reembolso ou valor a pagar, a taxa efetiva e a memória de cálculo, com avisos e oportunidades de poupança.",
  },
];

const ANEXOS = [
  { cod: "A", label: "Trabalho dependente e pensões" },
  { cod: "B", label: "Trabalho independente (recibos verdes)" },
  { cod: "E", label: "Rendimentos de capitais" },
  { cod: "F", label: "Rendimentos prediais (rendas)" },
  { cod: "G", label: "Mais-valias" },
  { cod: "H", label: "Deduções e benefícios fiscais" },
  { cod: "J", label: "Rendimentos obtidos no estrangeiro" },
];

export default function SimuladorIRSLandingPage() {
  const faqSchema = generateFAQSchema(FAQS);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="mb-10 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="eyebrow mb-3 text-brand">Simulador de IRS 2026</div>
          <h1 className="font-display display-2 mb-4 font-semibold text-ink text-balance">
            O teu IRS anual, do bruto ao reembolso.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-stone-500 dark:text-stone-400">
            Simula o IRS de todas as tuas fontes de rendimento num só lugar — com deduções, tributação
            conjunta, comparador de cenários e a memória de cálculo passo a passo. Guiado, gratuito e
            com as taxas oficiais de 2026.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#simulador"
              className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float"
            >
              <Calculator size={17} /> Começar a simular
            </a>
            <Link
              href="/guias/escaloes-irs"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-semibold text-stone-600 shadow-card transition-all hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            >
              Ver escalões de IRS <ArrowRight size={15} />
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500 dark:text-stone-400">
            {["Sem registo para simular", "Taxas oficiais de 2026", "Memória de cálculo passo a passo"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check size={15} className="text-brand" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center lg:justify-end">
          <DemoIRS />
        </div>
      </section>

      {/* ── Simulador real (o mesmo do painel) ─────────────────── */}
      <section id="simulador" className="mb-14 scroll-mt-24">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Calculator size={18} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">Simula aqui o teu IRS</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">O mesmo simulador do teu painel — o que preencheres fica guardado e sincronizado.</p>
          </div>
        </div>
        <div className="rounded-4xl border border-stone-100 bg-white/60 p-3 shadow-card dark:border-stone-800 dark:bg-stone-900/40 sm:p-5">
          <SimuladorIRS semCabecalho />
        </div>
      </section>

      {/* ── Funcionalidades ────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="font-display mb-5 text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Tudo o que precisas para simular bem
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map(({ Icon, titulo, desc }) => (
            <div
              key={titulo}
              className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                <Icon size={19} />
              </span>
              <h3 className="text-[15px] font-semibold text-stone-800 dark:text-stone-100">{titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="font-display mb-5 text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Como funciona, em três passos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PASSOS.map((p) => (
            <div key={p.n} className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <div className="font-display text-3xl font-semibold text-brand/30">{p.n}</div>
              <h3 className="mt-2 text-[15px] font-semibold text-stone-800 dark:text-stone-100">{p.titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Anexos cobertos ────────────────────────────────────── */}
      <section className="mb-12 rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <FileSign size={18} />
          </span>
          <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">Cobre todos os anexos do Modelo 3</h2>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ANEXOS.map((a) => (
            <li key={a.cod} className="flex items-center gap-3 rounded-2xl border border-stone-100 px-3.5 py-2.5 dark:border-stone-800">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">{a.cod}</span>
              <span className="text-sm text-stone-600 dark:text-stone-300">{a.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Outros simuladores ─────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="font-display mb-5 text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Vê também
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { Icon: Receipt, label: "Recibos verdes", href: "/dashboard/recibos-verdes" },
            { Icon: Calculator, label: "Recibo de vencimento", href: "/ferramentas/recibo-vencimento" },
            { Icon: Building, label: "Abrir empresa (Lda)", href: "/ferramentas/simulador-empresa" },
          ].map(({ Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:border-brand hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                <Icon size={17} />
              </span>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{label}</span>
              <ArrowRight size={15} className="ml-auto text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="font-display mb-5 text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Perguntas frequentes
        </h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-stone-800 dark:text-stone-100">
                {f.q}
                <ArrowRight size={16} className="flex-shrink-0 text-stone-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-4xl border border-brand bg-brand p-7 text-white shadow-glow sm:p-9">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-green-50 backdrop-blur">
            <Sparkle size={12} /> Pronto em minutos
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold sm:text-3xl">Descobre já o teu IRS de 2026</h2>
          <p className="mt-2 max-w-xl text-green-50/80">
            Simula, compara cenários e percebe exatamente para onde vai cada euro — antes de entregares a declaração.
          </p>
          <a
            href="#simulador"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-dark transition-all hover:bg-green-50"
          >
            <Calculator size={17} /> Simular agora
          </a>
        </div>
      </section>
    </>
  );
}
