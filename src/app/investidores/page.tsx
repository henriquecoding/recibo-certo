"use client";

import Link from "next/link";
import { m } from "motion/react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import {
  staggerContainer,
  staggerItem,
  fadeUp,
  inViewOnce,
} from "@/lib/motion";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Flag,
  Globe,
  Building,
  CheckTrend,
  Wallet,
  Receipt,
  Zap,
  Target,
  Rocket,
  ChartProjection,
  Bank,
  Mail,
  Briefcase,
  Calculator,
  Clock,
  BellAlert,
  Export,
} from "@/components/ui/Icons";

/* ── Dados das secções ─────────────────────────────────────────── */

const DOR_MERCADO = [
  {
    metric: "1,3 M",
    label: "empresas em Portugal",
    sub: "97% são micro e pequenas — o nosso mercado principal.",
  },
  {
    metric: "15 h/mês",
    label: "em tarefas administrativas",
    sub: "Tempo médio perdido por PME com faturação e tesouraria manual.",
  },
  {
    metric: "25%",
    label: "de insucesso por iliquidez",
    sub: "Falhas de cobrança e tesouraria fragmentada afetam 1 em 4 PMEs.",
  },
];

const SOLUCAO = [
  {
    icon: <Receipt size={20} />,
    titulo: "Faturação regulada",
    desc: "Emissão certificada pela AT com ATCUD, QR Code e SAF-T automático.",
  },
  {
    icon: <Wallet size={20} />,
    titulo: "Pagamentos integrados",
    desc: "Links de pagamento diretos — Multibanco, MB WAY, cartão e SEPA.",
  },
  {
    icon: <Bank size={20} />,
    titulo: "Reconciliação bancária",
    desc: "Ligação em tempo real via Open Banking para conciliar automaticamente.",
  },
  {
    icon: <BellAlert size={20} />,
    titulo: "Alertas e automação",
    desc: "Lembretes de prazos fiscais, cobranças inteligentes e mealheiro fiscal.",
  },
];

const METRICAS = [
  { sigla: "ARR", titulo: "Annual Recurring Revenue", desc: "Projeção anual de receita recorrente das subscrições ativas." },
  { sigla: "LTV:CAC", titulo: "Eficiência de aquisição", desc: "Rácio entre valor de vida do cliente e custo de aquisição ≥ 3:1." },
  { sigla: "NDR", titulo: "Net Revenue Retention", desc: "Receita retida da base existente, incluindo expansão e upgrades." },
  { sigla: "MoM", titulo: "Crescimento mensal", desc: "Taxa de crescimento mês a mês da receita recorrente mensal (MRR)." },
];

const GTM = [
  {
    icon: <Calculator size={18} />,
    titulo: "Parcerias com contabilistas",
    desc: "Canal de distribuição indireta: gabinetes de contabilidade certificados recomendam a ferramenta aos seus clientes.",
  },
  {
    icon: <Zap size={18} />,
    titulo: "Product-Led Growth",
    desc: "Cada fatura emitida e cada link de pagamento enviado funciona como marketing viral — o recetor conhece a plataforma.",
  },
  {
    icon: <Globe size={18} />,
    titulo: "Integrações e-commerce",
    desc: "Plugins prontos para plataformas de comércio eletrónico: faturação integrada e pagamentos locais automatizados.",
  },
];

const CONFORMIDADE = [
  { icon: <ShieldCheck size={16} />, texto: "Software certificado pela AT" },
  { icon: <Flag size={16} />, texto: "Conformidade RGPD e PSD2" },
  { icon: <Lock size={16} />, texto: "Encriptação bancária SSL/TLS" },
  { icon: <Globe size={16} />, texto: "Dados em servidores na UE" },
];

const VANTAGENS_COMPETITIVAS = [
  {
    titulo: "Barreira regulatória local",
    desc: "Certificação pela AT e conformidade com o regime fiscal português criam um fosso competitivo difícil de replicar por entrantes internacionais.",
  },
  {
    titulo: "Escalabilidade europeia",
    desc: "A arquitetura da plataforma está preparada para adaptar-se a regimes de faturação eletrónica semelhantes na Europa e América Latina.",
  },
  {
    titulo: "Modelo de receita híbrido",
    desc: "Subscrição SaaS de alta margem combinada com take rate transacional — receita cresce com o volume de negócios dos clientes.",
  },
  {
    titulo: "Moat de dados",
    desc: "Fluxos de caixa em tempo real geram insights proprietários que aumentam a retenção e abrem oportunidades de serviços financeiros.",
  },
];

/* ── Componente ────────────────────────────────────────────────── */

export default function InvestidoresPage() {
  return (
    <>
      <div id="top">
        <Nav />
        <main>
          {/* ── Hero ──────────────────────────────────────────── */}
          <section className="grain relative overflow-hidden px-6 py-20 sm:py-28" style={{ background: "linear-gradient(145deg, #0A1A14 0%, #0A4A39 40%, #0F6E56 100%)" }}>
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />

            <m.div
              className="relative mx-auto max-w-3xl text-center"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <m.div variants={fadeUp} className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-brand-mint">
                Oportunidade de investimento
              </m.div>

              <m.h1 variants={fadeUp} className="font-display mb-5 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl" style={{ letterSpacing: "-0.015em" }}>
                A infraestrutura de automação financeira para PMEs em Portugal
              </m.h1>

              <m.p variants={fadeUp} className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-green-100/80 sm:text-lg">
                Transformamos a obrigação legal da faturação numa plataforma de pagamentos integrados e otimização de tesouraria.
              </m.p>

              <m.div variants={fadeUp} className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20reuni%C3%A3o%20%E2%80%94%20ReciboCerto"
                  className="btn-shine inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-deep shadow-lift transition-colors hover:bg-green-50"
                >
                  Agendar reunião
                  <ArrowRight size={14} />
                </a>
                <a
                  href="#tese"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
                >
                  Ver a tese de investimento
                </a>
              </m.div>

              <m.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {CONFORMIDADE.map((c) => (
                  <span key={c.texto} className="inline-flex items-center gap-1.5 text-xs font-medium text-green-200/70">
                    <span className="text-brand-mint">{c.icon}</span>
                    {c.texto}
                  </span>
                ))}
              </m.div>
            </m.div>
          </section>

          {/* ── Dor do mercado ────────────────────────────────── */}
          <section id="tese" className="scroll-mt-20 px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">O problema</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  A tesouraria das PMEs está fragmentada
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  Sistemas de faturação isolados, cobranças manuais e burocracia fiscal criam um custo oculto que drena liquidez e tempo às pequenas empresas.
                </p>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-3">
                {DOR_MERCADO.map((d) => (
                  <StaggerItem key={d.label}>
                    <div className="h-full rounded-3xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <div className="font-display text-3xl font-semibold text-brand tabular-nums">{d.metric}</div>
                      <div className="mt-2 text-sm font-semibold text-stone-700 dark:text-stone-300">{d.label}</div>
                      <p className="mt-1 text-xs text-stone-400">{d.sub}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </section>

          {/* ── Solução ───────────────────────────────────────── */}
          <section className="border-y border-stone-100 bg-white px-6 py-20 dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">A solução</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Quote-to-Cash numa única plataforma
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  A ReciboCerto unifica faturação regulada, múltiplos métodos de pagamento locais e conciliação de tesouraria em tempo real.
                </p>
              </Reveal>

              {/* Fluxo visual */}
              <Reveal>
                <div className="mb-10 rounded-3xl border border-brand/20 bg-brand-light/50 p-6 dark:border-brand/10 dark:bg-brand/5 sm:p-8">
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                      <Receipt size={22} />
                    </div>
                    <ArrowRight size={18} className="hidden text-brand/40 sm:block" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Fatura emitida</p>
                      <p className="text-xs text-stone-400">Certificada AT, com ATCUD e QR</p>
                    </div>
                    <ArrowRight size={18} className="hidden text-brand/40 sm:block" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                      <Wallet size={22} />
                    </div>
                    <ArrowRight size={18} className="hidden text-brand/40 sm:block" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Pagamento recebido</p>
                      <p className="text-xs text-stone-400">Link direto MB WAY, Multibanco, SEPA</p>
                    </div>
                    <ArrowRight size={18} className="hidden text-brand/40 sm:block" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                      <Bank size={22} />
                    </div>
                    <ArrowRight size={18} className="hidden text-brand/40 sm:block" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Reconciliação automática</p>
                      <p className="text-xs text-stone-400">Open Banking API em tempo real</p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {SOLUCAO.map((s) => (
                  <StaggerItem key={s.titulo}>
                    <div className="h-full rounded-3xl border border-stone-100 bg-cream p-5 dark:border-stone-800 dark:bg-stone-950">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-brand/10">
                        {s.icon}
                      </div>
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{s.titulo}</p>
                      <p className="mt-1 text-xs text-stone-400">{s.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </section>

          {/* ── Oportunidade de mercado ───────────────────────── */}
          <section className="px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Oportunidade de mercado</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Regulação como rampa de adoção
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  A digitalização fiscal obrigatória impulsiona a adoção. Capturamos as transações do tecido empresarial mais dinâmico da economia.
                </p>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                {VANTAGENS_COMPETITIVAS.map((v) => (
                  <Reveal key={v.titulo}>
                    <div className="h-full rounded-3xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{v.titulo}</p>
                      <p className="mt-2 text-xs leading-relaxed text-stone-400">{v.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ── Modelo de negócio ─────────────────────────────── */}
          <section className="border-y border-stone-100 bg-white px-6 py-20 dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Modelo de receita</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Subscrição SaaS + take rate transacional
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  Receita recorrente previsível de subscrições, multiplicada por uma taxa sobre cada transação financeira processada na plataforma.
                </p>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                <Reveal>
                  <div className="h-full rounded-3xl border border-brand/20 bg-brand-light/30 p-6 dark:border-brand/10 dark:bg-brand/5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                      <Briefcase size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Subscrição recorrente</h3>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      Planos Grátis, Pro e Quiz Master com funcionalidades progressivas. Margem bruta elevada, previsibilidade de receita e expansão natural com upgrades.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.08}>
                  <div className="h-full rounded-3xl border border-brand/20 bg-brand-light/30 p-6 dark:border-brand/10 dark:bg-brand/5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                      <ChartProjection size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Take rate transacional</h3>
                    <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      Taxa sobre cada pagamento processado (Multibanco, MB WAY, cartão, SEPA). A receita cresce com o volume de negócios dos clientes, sem aumento proporcional do CAC.
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ── Métricas SaaS ─────────────────────────────────── */}
          <section className="px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Tração e métricas</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Crescimento eficiente e sustentável
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  Métricas de SaaS de nível institucional que comprovam a eficiência de capital e a velocidade de crescimento.
                </p>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {METRICAS.map((m) => (
                  <StaggerItem key={m.sigla}>
                    <div className="h-full rounded-3xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <div className="font-display text-2xl font-semibold text-brand">{m.sigla}</div>
                      <p className="mt-2 text-sm font-semibold text-stone-700 dark:text-stone-300">{m.titulo}</p>
                      <p className="mt-1 text-xs text-stone-400">{m.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>

              <Reveal className="mt-6">
                <div className="rounded-2xl border border-stone-100 bg-cream px-5 py-4 dark:border-stone-800 dark:bg-stone-950">
                  <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    <span className="font-semibold text-stone-600 dark:text-stone-300">Nota:</span> as métricas detalhadas de tração (ARR, MRR, churn, LTV:CAC e payback) estão disponíveis sob NDA na sala de due diligence para investidores qualificados.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── Go-to-Market ──────────────────────────────────── */}
          <section className="border-y border-stone-100 bg-white px-6 py-20 dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Estratégia</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Go-to-Market em três pilares
                </h2>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-3">
                {GTM.map((g) => (
                  <StaggerItem key={g.titulo}>
                    <div className="h-full rounded-3xl border border-stone-100 bg-cream p-6 dark:border-stone-800 dark:bg-stone-950">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand dark:bg-brand/10">
                        {g.icon}
                      </div>
                      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{g.titulo}</p>
                      <p className="mt-2 text-xs leading-relaxed text-stone-400">{g.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </section>

          {/* ── Conformidade e segurança ──────────────────────── */}
          <section className="px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-10 text-center">
                <div className="eyebrow mb-3 text-brand">Conformidade</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Regulação como ativo competitivo
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  No setor fintech, a conformidade regulatória não é um custo — é o principal fosso competitivo do negócio.
                </p>
              </Reveal>

              <div className="grid gap-3 sm:grid-cols-2">
                <Reveal>
                  <div className="h-full rounded-3xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Conformidade fiscal contínua com a AT</p>
                    <p className="mt-2 text-xs text-stone-400">
                      Motor de cálculo atualizado em tempo real para acompanhar todas as revisões legais da Autoridade Tributária. Software certificado e em conformidade absoluta.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.08}>
                  <div className="h-full rounded-3xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Arquitetura PSD2 e Open Banking</p>
                    <p className="mt-2 text-xs text-stone-400">
                      Gateways de pagamento regulados e parcerias com entidades financeiras autorizadas no espaço europeu. Todo o tráfego monetário respeita a regulação bancária europeia.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.12}>
                  <div className="h-full rounded-3xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Stack KYC/AML</p>
                    <p className="mt-2 text-xs text-stone-400">
                      Integração com fornecedores de validação de identidade e monitorização de transações para prevenir fraude e lavagem de capitais.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={0.16}>
                  <div className="h-full rounded-3xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Canais de pagamento locais e globais</p>
                    <p className="mt-2 text-xs text-stone-400">
                      Processadores de cartões globais, referências Multibanco, MB WAY, transferências bancárias instantâneas e débitos diretos SEPA.
                    </p>
                  </div>
                </Reveal>
              </div>

              <Reveal className="mt-6">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {CONFORMIDADE.map((c) => (
                    <span key={c.texto} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                      <span className="text-brand">{c.icon}</span>
                      {c.texto}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── Equipa ────────────────────────────────────────── */}
          <section className="border-y border-stone-100 bg-white px-6 py-20 dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <div className="eyebrow mb-3 text-brand">Equipa</div>
                <h2 className="font-display display-2 font-semibold text-ink dark:text-stone-100">
                  Execução comprovada
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500 dark:text-stone-400">
                  Combinamos experiência em engenharia de software financeiro, gestão de conformidade fiscal e histórico de crescimento em startups tecnológicas.
                </p>
                <div className="mt-8 rounded-2xl border border-stone-100 bg-cream px-5 py-4 dark:border-stone-800 dark:bg-stone-950">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Perfis detalhados, biografias e histórico profissional dos fundadores e conselheiros estão disponíveis na sala de due diligence.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── CTA Final — O pedido ──────────────────────────── */}
          <section className="grain relative overflow-hidden px-6 py-20 sm:py-28" style={{ background: "linear-gradient(145deg, #0A1A14 0%, #0A4A39 40%, #0F6E56 100%)" }}>
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />

            <m.div
              className="relative mx-auto max-w-2xl text-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={inViewOnce}
            >
              <m.div variants={fadeUp} className="eyebrow mb-3 text-brand-mint">
                Ronda de investimento
              </m.div>

              <m.h2 variants={fadeUp} className="font-display mb-4 text-3xl font-semibold text-white sm:text-4xl" style={{ letterSpacing: "-0.015em" }}>
                Estamos a captar capital para escalar
              </m.h2>

              <m.p variants={fadeUp} className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-green-100/80">
                Capital destinado a expandir a equipa comercial, integrar serviços financeiros de adiantamento de faturas e acelerar a adoção no mercado português.
              </m.p>

              <m.div variants={fadeUp} className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20reuni%C3%A3o%20%E2%80%94%20ReciboCerto"
                  className="btn-shine inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-brand-deep shadow-lift transition-colors hover:bg-green-50"
                >
                  <Mail size={15} />
                  Agendar reunião
                </a>
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20acesso%20Data%20Room%20%E2%80%94%20ReciboCerto"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
                >
                  <Lock size={14} />
                  Solicitar acesso ao Data Room
                </a>
              </m.div>

              <m.p variants={fadeUp} className="mt-6 text-xs text-green-200/60">
                Projeções financeiras, documentação legal e relatórios técnicos disponíveis sob NDA.
              </m.p>
            </m.div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
