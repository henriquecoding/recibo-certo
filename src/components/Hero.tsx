"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { ArrowRight, ShieldCheck, Bank, FileSign, Warning, Calendar } from "@/components/ui/Icons";
import { scrollToId } from "@/lib/scroll";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";
import { usePerfil, type Perfil } from "@/lib/perfil";
import SeletorModo from "@/components/SeletorModo";
import { compararCategorias } from "@/lib/fiscal-dependente";

const TRUST = [
  { icon: <ShieldCheck size={14} />, text: "Taxas de 2026 verificadas" },
  { icon: <Bank size={14} />, text: "Fontes oficiais: AT e Segurança Social" },
  { icon: <FileSign size={14} />, text: "Base legal em cada cálculo" },
];

const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;

// Números reais dos motores (não inventados) para os cartões de "Abrir Empresa"
// e "Comparar Cenários" — mesma faturação de referência (30 000 €/ano) usada
// na ferramenta de comparação, via compararCategorias.
const HERO_FAT = 30_000;
const CMP = compararCategorias({ brutoAnual: HERO_FAT, dependentes: 0 });
const EMP = {
  liquido: Math.round(CMP.empresa.liquido),
  impostos: Math.round(CMP.empresa.irc + CMP.empresa.derrama + CMP.empresa.dividendos),
  custos: Math.round(CMP.empresa.custosEmpresa),
};
const CMP_LIQ = {
  dependente: Math.round(CMP.dependente.liquido),
  freelancer: Math.round(CMP.freelancer.liquido),
  empresa: Math.round(CMP.empresa.liquido),
};
const CMP_BEST = Math.max(CMP_LIQ.dependente, CMP_LIQ.freelancer, CMP_LIQ.empresa);

// Exemplos ilustrativos com números reais dos motores (não inventados).
// Independente: recibo-tipo 2.000 € (Art. 151.º). Dependente: salário 1.500 €,
// 0 dependentes, sem subsídio de refeição — Tabela I, Despacho 233-A/2026.
const EXEMPLO: Record<
  Perfil,
  {
    h1: ReactNode;
    sub: string;
    primary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    secondary: { label: string; href?: string; scrollTo?: string; setModo?: Perfil };
    card: {
      etiqueta: string;
      heroLabel: string;
      bruto: number;
      teu: number;
      irs: number;
      ss: number;
      pctSufixo: string;
      linhas: { l: string; v: string; strong?: boolean }[];
      box: { tom: "alerta" | "info"; titulo: string; sub: string };
      nota: string;
    };
  }
> = {
  independente: {
    h1: (
      <>
        Sabe quanto é <span className="text-brand">teu</span>, quanto reservar e quando pagar.
      </>
    ),
    sub: "O copiloto financeiro para trabalhadores independentes em Portugal — sem surpresas no fim do ano.",
    primary: { label: "Calcular o meu recibo", scrollTo: "calculadora" },
    secondary: { label: "Como funciona", scrollTo: "features" },
    card: {
      etiqueta: "Recibo de 2 000 € · Art. 151.º",
      heroLabel: "O que é mesmo teu",
      bruto: 2000,
      teu: 1241,
      irs: 460,
      ss: 299,
      pctSufixo: "deste recibo é mesmo teu",
      linhas: [
        { l: "Retenção IRS (23%)", v: "− 460 €" },
        { l: "Segurança Social", v: "− 299 €" },
        { l: "Disponível para gastar", v: "1 241 €", strong: true },
      ],
      box: { tom: "alerta", titulo: "Prazo SS — 20 julho", sub: "Reserva 299 € · avisamos a tempo" },
      nota: "Atividade estabelecida (2.º ano ou seguinte). No 1.º ano de atividade, a Segurança Social é isenta e a retenção na fonte pode ser dispensada.",
    },
  },
  dependente: {
    h1: (
      <>
        Do salário bruto,
        <br />
        sabe o teu <span className="text-brand">líquido real.</span>
      </>
    ),
    sub: "Vê o que devias receber ao fim do mês — com a retenção de IRS de 2026, a Segurança Social e os subsídios de férias e de Natal. Depois compara com o teu recibo de vencimento.",
    primary: { label: "Simular o meu salário", scrollTo: "calculadora" },
    secondary: { label: "Comparar caminhos", setModo: "comparar" },
    card: {
      etiqueta: "Salário de 1 500 € · Continente",
      heroLabel: "O teu líquido",
      bruto: 1500,
      teu: 1167,
      irs: 168,
      ss: 165,
      pctSufixo: "do bruto chega ao bolso",
      linhas: [
        { l: "Retenção IRS", v: "− 168 €" },
        { l: "Segurança Social (11%)", v: "− 165 €" },
        { l: "Vencimento líquido", v: "1 167 €", strong: true },
      ],
      box: { tom: "info", titulo: "14 meses por ano", sub: "Subsídios de férias e de Natal incluídos" },
      nota: "Líquido de um mês normal, sem subsídio de refeição. Tabela I (não casado, sem dependentes), Continente.",
    },
  },
  empresa: {
    h1: (
      <>
        Vale a pena <span className="text-brand">abrir empresa?</span> Vê o líquido real.
      </>
    ),
    sub: "Simula a tua sociedade — IRC PME, derrama, tributação autónoma e distribuição de dividendos. Descobre quanto te fica no bolso e quando compensa face aos recibos verdes.",
    primary: { label: "Simular a minha empresa", scrollTo: "calculadora" },
    secondary: { label: "Comparar caminhos", setModo: "comparar" },
    card: {
      etiqueta: "Faturação 30 000 €/ano · via empresa",
      heroLabel: "Líquido pela empresa",
      bruto: HERO_FAT,
      teu: EMP.liquido,
      irs: EMP.impostos,
      ss: EMP.custos,
      pctSufixo: "fica contigo via empresa",
      linhas: [
        { l: "IRC, derrama e dividendos", v: `− ${eur0(EMP.impostos)}` },
        { l: "Custos de estrutura", v: `− ${eur0(EMP.custos)}` },
        { l: "Líquido anual estimado", v: eur0(EMP.liquido), strong: true },
      ],
      box: { tom: "info", titulo: "IRC PME a 15%", sub: "Sobre os primeiros 50 000 € de lucro tributável" },
      nota: "Estimativa para 30 000 €/ano de faturação. Modela IRC PME, derrama e dividendos a 28% — não substitui um contabilista certificado.",
    },
  },
  comparar: {
    h1: (
      <>
        Qual o <span className="text-brand">melhor caminho</span> para o teu rendimento?
      </>
    ),
    sub: "Para o mesmo rendimento anual, compara o líquido como por conta de outrem, recibos verdes ou empresa — com o ponto de viragem e o calendário fiscal de cada cenário.",
    primary: { label: "Comparar cenários", scrollTo: "calculadora" },
    secondary: { label: "Como funciona", scrollTo: "features" },
    card: {
      etiqueta: "Mesmo rendimento · 30 000 €/ano",
      heroLabel: "Mais líquido",
      bruto: HERO_FAT,
      teu: CMP_BEST,
      irs: CMP_LIQ.freelancer,
      ss: CMP_LIQ.dependente,
      pctSufixo: "no melhor cenário",
      linhas: [
        { l: "Por conta de outrem", v: eur0(CMP_LIQ.dependente), strong: CMP.melhor === "dependente" },
        { l: "Recibos verdes", v: eur0(CMP_LIQ.freelancer), strong: CMP.melhor === "freelancer" },
        { l: "Empresa (Lda)", v: eur0(CMP_LIQ.empresa), strong: CMP.melhor === "empresa" },
      ],
      box: { tom: "info", titulo: "Uma base, três caminhos", sub: "Vê o ponto de viragem e o calendário fiscal" },
      nota: "Estimativa para 30 000 €/ano. Ajusta o rendimento e os pressupostos na ferramenta de comparação.",
    },
  },
};

export default function Hero() {
  const { perfil, definir } = usePerfil();
  const dados = EXEMPLO[perfil];
  const c = dados.card;
  const pctTeu = Math.round((c.teu / c.bruto) * 100);
  // Escala de verdes da marca: teu = verde da marca, IRS = mint, SS = verde
  // profundo (currentColor + text-brand-deep, adapta ao modo escuro).
  const seg: { v: number; color?: string; cls?: string }[] = [
    { v: c.teu, color: "#1D9E75" },
    { v: c.irs, color: "#9FE1CB" },
    { v: c.ss, cls: "text-brand-deep" },
  ];
  const total = seg.reduce((s, p) => s + p.v, 0) || 1;

  const btnPrimario = "btn-shine inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float";
  const btnSecundario = "inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50";

  return (
    <section className="grain relative overflow-hidden px-6 pt-20 pb-16">
      {/* Atmosfera: brilhos orgânicos da marca (não gradientes aleatórios). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute top-40 -left-32 h-[24rem] w-[24rem] rounded-full bg-brand-mint/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Texto */}
        <m.div initial="hidden" animate="visible" variants={staggerContainer}>
          {/* Seletor de modo — dupla entrada que ramifica toda a experiência */}
          <m.div variants={staggerItem} className="mb-6">
            <SeletorModo />
          </m.div>

          <m.h1 variants={staggerItem} className="font-display display-1 text-balance font-semibold text-ink">
            {dados.h1}
          </m.h1>

          <m.p variants={staggerItem} className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">
            {dados.sub}
          </m.p>

          <m.div variants={staggerItem} className="mt-9 flex flex-wrap gap-3">
            {dados.primary.setModo ? (
              <button
                type="button"
                onClick={() => {
                  definir(dados.primary.setModo!);
                  scrollToId("calculadora");
                }}
                className={btnPrimario}
              >
                {dados.primary.label}
                <ArrowRight />
              </button>
            ) : dados.primary.href ? (
              <Link href={dados.primary.href} className={btnPrimario}>
                {dados.primary.label}
                <ArrowRight />
              </Link>
            ) : (
              <button type="button" onClick={() => scrollToId(dados.primary.scrollTo!)} className={btnPrimario}>
                {dados.primary.label}
                <ArrowRight />
              </button>
            )}
            {dados.secondary.setModo ? (
              <button
                type="button"
                onClick={() => {
                  definir(dados.secondary.setModo!);
                  scrollToId("calculadora");
                }}
                className={btnSecundario}
              >
                {dados.secondary.label}
              </button>
            ) : dados.secondary.href ? (
              <Link href={dados.secondary.href} className={btnSecundario}>
                {dados.secondary.label}
              </Link>
            ) : (
              <button type="button" onClick={() => scrollToId(dados.secondary.scrollTo!)} className={btnSecundario}>
                {dados.secondary.label}
              </button>
            )}
          </m.div>

          <m.ul variants={staggerItem} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {TRUST.map((b) => (
              <li key={b.text} className="flex items-center gap-2">
                <span className="text-brand">{b.icon}</span>
                <span className="text-xs font-medium text-stone-500">{b.text}</span>
              </li>
            ))}
          </m.ul>
        </m.div>

        {/* Cartão-resposta: a pergunta nº1 do perfil, respondida em concreto. */}
        <m.div
          key={perfil}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          className="relative"
        >
          <div className="rounded-4xl border border-stone-200/80 bg-white p-6 shadow-float sm:p-7">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-400">{c.etiqueta}</span>
              <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
                Exemplo
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium uppercase tracking-wider text-stone-400">{c.heroLabel}</div>
              <div className="mt-1 font-display text-5xl font-semibold leading-none text-brand tabular-nums">
                {eur0(c.teu)}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-cream px-3 py-1.5 text-xs text-stone-500">
                <span className="font-semibold text-stone-700 tabular-nums">{pctTeu}% {c.pctSufixo}</span>
                <span className="text-stone-300">·</span>
                <span>o resto é do Estado</span>
              </div>
            </div>

            {/* Barra: o teu dinheiro vs. o do Estado */}
            <div className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full">
              {seg.map((p, i) => (
                <div
                  key={i}
                  className={`${i === 0 ? "rounded-l-full" : i === seg.length - 1 ? "rounded-r-full" : ""} ${p.cls ?? ""}`}
                  style={{ background: p.cls ? "currentColor" : p.color, width: `${(p.v / total) * 100}%` }}
                />
              ))}
            </div>

            <div className="mt-4 space-y-1.5">
              {c.linhas.map((r) => (
                <div
                  key={r.l}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    r.strong ? "bg-brand-light" : "bg-stone-50"
                  }`}
                >
                  <span className={`text-xs ${r.strong ? "font-semibold text-brand-dark" : "text-stone-500"}`}>{r.l}</span>
                  <span className={`text-xs font-semibold tabular-nums ${r.strong ? "text-brand-dark" : "text-stone-700"}`}>
                    {r.v}
                  </span>
                </div>
              ))}
            </div>

            {c.box.tom === "alerta" ? (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-alert text-alert-text">
                  <Warning size={12} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-alert-text">{c.box.titulo}</div>
                  <div className="text-xs text-alert-text/80">{c.box.sub}</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-brand/20 bg-brand-light p-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                  <Calendar size={12} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-brand-dark">{c.box.titulo}</div>
                  <div className="text-xs text-brand-dark/80">{c.box.sub}</div>
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-stone-400">{c.nota}</p>
          </div>
        </m.div>
      </div>
    </section>
  );
}
