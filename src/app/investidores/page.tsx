"use client";

import Link from "next/link";
import { m, useMotionValue, useTransform, useSpring } from "motion/react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import {
  staggerContainer,
  staggerItem as staggerItemVariant,
  fadeUp,
  inViewOnce,
  EASE,
} from "@/lib/motion";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Flag,
  Globe,
  Building,
  Wallet,
  Receipt,
  Zap,
  Target,
  Rocket,
  ChartProjection,
  Bank,
  Mail,
  Calculator,
  BellAlert,
  CheckTrend,
  LogoMark,
  Check,
} from "@/components/ui/Icons";

/* ── Cartão 3D com efeito tilt ao hover ────────────────────────── */

function Card3D({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  function handleMouse(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 800, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
    >
      {children}
    </m.div>
  );
}

/* ── Dados ─────────────────────────────────────────────────────── */

const PRODUTO = [
  {
    icon: <Calculator size={20} />,
    titulo: "Calculadora de recibos verdes",
    desc: "IRS, Segurança Social e IVA automáticos com as taxas de 2026.",
  },
  {
    icon: <Receipt size={20} />,
    titulo: "Simulador de vencimento",
    desc: "Bruto para líquido com retenção e subsídios de férias e Natal.",
  },
  {
    icon: <Building size={20} />,
    titulo: "Simulador de empresa",
    desc: "IRC PME, derrama, dividendos e tributação autónoma modelados.",
  },
  {
    icon: <ChartProjection size={20} />,
    titulo: "Comparador de regimes",
    desc: "Dependente vs. recibos verdes vs. empresa — ponto de viragem incluído.",
  },
  {
    icon: <BellAlert size={20} />,
    titulo: "Alertas de prazos fiscais",
    desc: "Notificação antes de cada entrega e prazo de pagamento.",
  },
  {
    icon: <Wallet size={20} />,
    titulo: "Mealheiro fiscal",
    desc: "Quanto reservar este mês para impostos, calculado automaticamente.",
  },
];

const VISAO = [
  {
    fase: "Agora",
    titulo: "Copiloto fiscal",
    desc: "Calculadoras, simuladores e alertas para trabalhadores independentes, dependentes e empresas. Plano freemium com Pro.",
    ativo: true,
  },
  {
    fase: "Próximo",
    titulo: "Pagamentos integrados",
    desc: "Links de cobrança diretos nas faturas — Multibanco, MB WAY, cartão e SEPA. Take rate transacional sobre cada pagamento.",
    ativo: false,
  },
  {
    fase: "Futuro",
    titulo: "Infraestrutura financeira",
    desc: "Reconciliação bancária via Open Banking, adiantamento de faturas e crédito integrado. De utilidade fiscal a fintech SaaS.",
    ativo: false,
  },
];

const METRICAS_MODELO = [
  { label: "Modelo", valor: "Freemium + Pro", sub: "SaaS recorrente" },
  { label: "Expansão", valor: "Take rate", sub: "Sobre pagamentos processados" },
  { label: "Retenção", valor: "Alta", sub: "Ferramenta operacional diária" },
  { label: "Distribuição", valor: "PLG + parcerias", sub: "Cada fatura = marketing" },
];

const VANTAGENS = [
  {
    icon: <Lock size={18} />,
    titulo: "Fosso regulatório",
    desc: "Certificação pela AT e conformidade fiscal portuguesa protegem contra entrantes internacionais.",
  },
  {
    icon: <Globe size={18} />,
    titulo: "Expansão europeia",
    desc: "Arquitetura preparada para regimes de faturação eletrónica semelhantes na UE e América Latina.",
  },
  {
    icon: <Zap size={18} />,
    titulo: "Product-Led Growth",
    desc: "Cada fatura e link de pagamento emitido é marketing para o recetor — CAC orgânico decrescente.",
  },
  {
    icon: <Target size={18} />,
    titulo: "1,3M de empresas",
    desc: "97% do tecido empresarial português são micro e pequenas empresas — o nosso mercado.",
  },
];

const CONFIANCA = [
  { icon: <ShieldCheck size={14} />, texto: "Taxas de 2026 verificadas com fonte AT" },
  { icon: <Flag size={14} />, texto: "Dados em servidores na UE · RGPD" },
  { icon: <Lock size={14} />, texto: "Código auditado · sem dados fiscais inventados" },
];

/* ── Componente ────────────────────────────────────────────────── */

export default function InvestidoresPage() {
  return (
    <>
      <div id="top">
        <Nav />
        <main>
          {/* ═══════════════════════════════════════════════════════
              HERO — Impacto imediato com perspetiva 3D
              ═══════════════════════════════════════════════════════ */}
          <section className="grain relative overflow-hidden px-6 pt-20 pb-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
              <div className="absolute top-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-brand-mint/20 blur-3xl" />
            </div>

            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <m.div initial="hidden" animate="visible" variants={staggerContainer}>
                <m.div variants={staggerItemVariant} className="eyebrow mb-4 text-brand">
                  Para investidores
                </m.div>

                <m.h1
                  variants={staggerItemVariant}
                  className="font-display display-1 text-balance font-semibold text-ink"
                >
                  O copiloto financeiro de{" "}
                  <span className="text-brand">1,3 milhões</span> de empresas portuguesas.
                </m.h1>

                <m.p variants={staggerItemVariant} className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
                  Recibos verdes, vencimentos e empresas — tudo o que o Estado obriga, simplificado numa plataforma que os portugueses já usam.
                </m.p>

                <m.div variants={staggerItemVariant} className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20reuni%C3%A3o%20%E2%80%94%20ReciboCerto"
                    className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
                  >
                    Agendar reunião
                    <ArrowRight />
                  </a>
                  <a
                    href="#visao"
                    className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                  >
                    Ver a visão
                  </a>
                </m.div>

                <m.ul variants={staggerItemVariant} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  {CONFIANCA.map((b) => (
                    <li key={b.texto} className="flex items-center gap-2">
                      <span className="text-brand">{b.icon}</span>
                      <span className="text-xs font-medium text-stone-500">{b.texto}</span>
                    </li>
                  ))}
                </m.ul>
              </m.div>

              {/* Cartão 3D flutuante — mostra o produto real */}
              <m.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              >
                <Card3D>
                  <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-6 text-white shadow-glow sm:p-7">
                    <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <LogoMark size={24} />
                        <span className="text-sm font-semibold">ReciboCerto</span>
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">
                        Oportunidade de mercado
                      </div>
                      <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums">
                        1,3 M
                      </div>
                      <div className="mt-1 text-xs text-green-100/70">
                        empresas em Portugal — 97% micro e pequenas
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-1.5">
                        <div className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                          <div className="text-[10px] leading-tight text-green-100/70">TAM</div>
                          <div className="mt-0.5 text-xs font-semibold tabular-nums">1,3 M</div>
                        </div>
                        <div className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                          <div className="text-[10px] leading-tight text-green-100/70">SAM</div>
                          <div className="mt-0.5 text-xs font-semibold tabular-nums">~400 K</div>
                        </div>
                        <div className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                          <div className="text-[10px] leading-tight text-green-100/70">SOM</div>
                          <div className="mt-0.5 text-xs font-semibold tabular-nums">~50 K</div>
                        </div>
                      </div>
                      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div className="rounded-full bg-white/70" style={{ width: "4%" }} />
                      </div>
                      <div className="mt-1 text-[11px] text-green-100/50">
                        Penetração atual — espaço massivo de crescimento
                      </div>
                    </div>
                  </div>
                </Card3D>
              </m.div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              O QUE JÁ EXISTE — Produto real, não promessas
              ═══════════════════════════════════════════════════════ */}
          <section className="border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">O produto</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Já funciona. Já tem utilizadores. Já gera receita.
                </h2>
                <p className="mt-3 text-stone-500">
                  Não é uma ideia — é uma plataforma viva com motor fiscal verificado, base legal em cada cálculo e utilizadores reais em Portugal.
                </p>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PRODUTO.map((p) => (
                  <StaggerItem key={p.titulo}>
                    <Card3D className="h-full">
                      <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-cream p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-950">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand">
                          {p.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{p.titulo}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-stone-400 dark:text-stone-500">{p.desc}</p>
                      </div>
                    </Card3D>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              A DOR — Porquê isto existe
              ═══════════════════════════════════════════════════════ */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-5xl">
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <Reveal>
                  <div className="eyebrow mb-3 text-stone-400">O problema</div>
                  <h2 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">
                    Os portugueses pagam impostos sem perceber o que pagam.
                  </h2>
                  <p className="mt-3 text-stone-500 dark:text-stone-400">
                    Recibos verdes com fórmulas que mudam todos os anos. Recibos de vencimento com linhas que ninguém explica. Prazos que, se esquecidos, custam entre 50 e 7 500 euros em coimas.
                  </p>
                  <p className="mt-3 text-stone-500 dark:text-stone-400">
                    As ferramentas existentes limitam-se a gerar faturas. Nenhuma responde à pergunta que importa:
                    <span className="font-semibold text-stone-700 dark:text-stone-200"> quanto é meu, quanto reservar e quando pagar?</span>
                  </p>
                </Reveal>

                <Reveal delay={0.1}>
                  <Card3D>
                    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Custo da omissão</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { l: "Tabelas de retenção", v: "Mudam todos os anos", icone: <Calculator size={14} /> },
                          { l: "Atividades Art. 151.º", v: "Centenas de coeficientes", icone: <Receipt size={14} /> },
                          { l: "Coimas por atraso", v: "Até 7 500 €", icone: <BellAlert size={14} /> },
                          { l: "Tempo perdido/mês", v: "~15 horas", icone: <ChartProjection size={14} /> },
                        ].map((r) => (
                          <div key={r.l} className="flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/70">
                            <span className="text-brand">{r.icone}</span>
                            <span className="flex-1 text-xs text-stone-500 dark:text-stone-400">{r.l}</span>
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card3D>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              VISÃO — Roadmap em três fases
              ═══════════════════════════════════════════════════════ */}
          <section id="visao" className="scroll-mt-20 border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">Visão</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  De copiloto fiscal a infraestrutura financeira.
                </h2>
                <p className="mt-3 text-stone-500">
                  Três fases. Cada uma constrói sobre a anterior — utilizadores, dados e confiança.
                </p>
              </Reveal>

              <div className="grid gap-4 lg:grid-cols-3">
                {VISAO.map((v, i) => (
                  <Reveal key={v.fase} delay={i * 0.08}>
                    <Card3D className="h-full">
                      <div
                        className={`flex h-full flex-col rounded-4xl p-6 shadow-card transition-shadow hover:shadow-lift ${
                          v.ativo
                            ? "border border-brand bg-brand text-white shadow-glow"
                            : "border border-stone-100 bg-cream dark:border-stone-800 dark:bg-stone-950"
                        }`}
                      >
                        <div className={`inline-flex self-start rounded-full px-3 py-1 text-[11px] font-semibold ${
                          v.ativo
                            ? "bg-white/20 text-white"
                            : "bg-brand-light text-brand-dark"
                        }`}>
                          {v.fase}
                        </div>
                        <h3 className={`mt-4 font-display text-xl font-semibold ${
                          v.ativo ? "text-white" : "text-stone-800 dark:text-stone-100"
                        }`}>
                          {v.titulo}
                        </h3>
                        <p className={`mt-2 flex-1 text-sm leading-relaxed ${
                          v.ativo ? "text-green-100/80" : "text-stone-400"
                        }`}>
                          {v.desc}
                        </p>
                        {v.ativo && (
                          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/15">
                            <m.div
                              className="rounded-full bg-white/70"
                              initial={{ width: 0 }}
                              whileInView={{ width: "100%" }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                            />
                          </div>
                        )}
                      </div>
                    </Card3D>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              MODELO DE NEGÓCIO — Cards com 3D
              ═══════════════════════════════════════════════════════ */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">Modelo de negócio</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  SaaS recorrente + take rate transacional.
                </h2>
                <p className="mt-3 text-stone-500">
                  Receita previsível de subscrições, multiplicada por uma taxa sobre cada pagamento processado na plataforma.
                </p>
              </Reveal>

              <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {METRICAS_MODELO.map((m) => (
                  <StaggerItem key={m.label}>
                    <Card3D className="h-full">
                      <div className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift dark:border-stone-800 dark:bg-stone-900">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{m.label}</div>
                        <div className="mt-2 font-display text-2xl font-semibold text-brand">{m.valor}</div>
                        <p className="mt-1 text-xs text-stone-400">{m.sub}</p>
                      </div>
                    </Card3D>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              VANTAGENS COMPETITIVAS
              ═══════════════════════════════════════════════════════ */}
          <section className="border-y border-stone-100 bg-white px-6 py-24 dark:border-stone-800">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-14 max-w-2xl">
                <div className="eyebrow mb-3 text-brand">Porquê nós</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Regulação como vantagem, não como custo.
                </h2>
              </Reveal>

              <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
                {VANTAGENS.map((v, i) => (
                  <Reveal key={v.titulo} delay={i * 0.06}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                        {v.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{v.titulo}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-stone-400">{v.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              EQUIPA — Breve + link para mais
              ═══════════════════════════════════════════════════════ */}
          <section className="px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <div className="eyebrow mb-3 text-brand">Equipa</div>
                <h2 className="font-display display-2 text-balance font-semibold text-ink">
                  Execução comprovada.
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-stone-500">
                  Experiência em engenharia de software financeiro, conformidade fiscal e crescimento de startups. Perfis completos disponíveis na sala de due diligence.
                </p>
              </Reveal>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              CTA FINAL — Mesma linguagem do hero do site
              ═══════════════════════════════════════════════════════ */}
          <section className="grain relative overflow-hidden px-6 py-24">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-24 -right-32 h-[24rem] w-[24rem] rounded-full bg-brand/20 blur-3xl" />
              <div className="absolute -bottom-16 -left-24 h-[20rem] w-[20rem] rounded-full bg-brand-mint/15 blur-3xl" />
            </div>

            <m.div
              className="mx-auto max-w-2xl text-center"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={inViewOnce}
            >
              <m.div variants={fadeUp} className="eyebrow mb-3 text-brand">
                Próximo passo
              </m.div>

              <m.h2 variants={fadeUp} className="font-display display-2 text-balance font-semibold text-ink">
                Vamos <span className="text-brand">conversar?</span>
              </m.h2>

              <m.p variants={fadeUp} className="mx-auto mt-3 max-w-md text-stone-500">
                Capital destinado a integrar pagamentos, expandir a equipa e acelerar a adoção. Projeções e documentação disponíveis sob NDA.
              </m.p>

              <m.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20reuni%C3%A3o%20%E2%80%94%20ReciboCerto"
                  className="btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float"
                >
                  <Mail size={15} />
                  Agendar reunião
                </a>
                <a
                  href="mailto:investidores@recibocerto.pt?subject=Pedido%20de%20acesso%20Data%20Room%20%E2%80%94%20ReciboCerto"
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                >
                  <Lock size={14} />
                  Solicitar Data Room
                </a>
              </m.div>

              <m.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {CONFIANCA.map((c) => (
                  <span key={c.texto} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <span className="text-brand">{c.icon}</span>
                    {c.texto}
                  </span>
                ))}
              </m.div>
            </m.div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
