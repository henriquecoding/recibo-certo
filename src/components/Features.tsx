"use client";

// Secção de valor da homepage — adapta-se ao modo selecionado no seletor.
// Cada modo (independente, dependente, empresa, comparar) tem o seu próprio
// título, três blocos com visual e os "extras". Os números dos cenários de
// empresa/comparação vêm do motor verificado (compararCategorias); os
// exemplos de recibo/salário são ilustrativos, coerentes com o hero.

import { useMemo, type ReactNode } from "react";
import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import { usePerfil, type Perfil } from "@/lib/perfil";
import type { ComparacaoCategoriasResult } from "@/lib/fiscal-dependente";
import { fmt } from "@/lib/format";
import {
  Wallet,
  ChartProjection,
  BellAlert,
  History,
  Export,
  Calculator,
  Warning,
  Building,
  Receipt,
  Scale,
  Coin,
  ShieldCheck,
  Calendar,
  FileSign,
  Check,
} from "@/components/ui/Icons";

// Pontos de viragem reais (motor verificado): onde os recibos verdes passam a
// bater o salário, e onde a empresa passa a bater os recibos verdes. Calculados
// no SERVIDOR (page.tsx) e recebidos por props — assim o motor fiscal fica fora
// do bundle inicial do cliente. Valores idênticos.
export interface Breakeven {
  bRV: number | null;
  bEmp: number | null;
}

/* ── Primitivas de visual reutilizáveis ─────────────────────────────── */

function CardMetrica({
  etiqueta,
  valor,
  sub,
  barPct,
  barNota,
  chips,
}: {
  etiqueta: string;
  valor: string;
  sub?: string;
  barPct?: number;
  barNota?: string;
  chips?: { l: string; v: string }[];
}) {
  return (
    <div className="relative overflow-hidden rounded-4xl border border-brand bg-brand p-6 text-white shadow-glow">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-green-100/60">{etiqueta}</div>
        <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums">{valor}</div>
        {sub && <div className="mt-1 text-xs text-green-100/70">{sub}</div>}
        {barPct != null && (
          <>
            <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="rounded-full bg-white/70" style={{ width: `${barPct}%` }} />
            </div>
            {barNota && <div className="mt-1 text-[11px] text-green-100/50">{barNota}</div>}
          </>
        )}
        {chips && (
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {chips.map((c) => (
              <div key={c.l} className="rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur-sm">
                <div className="text-[10px] leading-tight text-green-100/70">{c.l}</div>
                <div className="mt-0.5 text-xs font-semibold tabular-nums">{c.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardLista({
  titulo,
  badge,
  linhas,
  rodape,
}: {
  titulo: string;
  badge?: string;
  linhas: { l: string; v: string; strong?: boolean }[];
  rodape?: { l: string; v: string };
}) {
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">{titulo}</span>
        {badge && (
          <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">{badge}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {linhas.map((r) => (
          <div
            key={r.l}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
              r.strong ? "bg-brand-light" : "bg-stone-50 dark:bg-stone-800/70"
            }`}
          >
            <span className={`text-xs ${r.strong ? "font-semibold text-brand-dark" : "text-stone-500 dark:text-stone-400"}`}>
              {r.l}
            </span>
            <span
              className={`text-xs font-semibold tabular-nums ${
                r.strong ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"
              }`}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>
      {rodape && (
        <div className="mt-4 rounded-2xl bg-brand-light p-3 text-center">
          <div className="text-[11px] font-medium text-brand-dark">{rodape.l}</div>
          <div className="mt-0.5 font-display text-xl font-semibold text-brand tabular-nums">{rodape.v}</div>
        </div>
      )}
    </div>
  );
}

/* ── Visuais "independente" (originais) ─────────────────────────────── */

function VisualSaldo() {
  const items = [
    { l: "Retenção IRS", v: "460 €" },
    { l: "Seg. Social", v: "299 €" },
    { l: "IVA", v: "0 €" },
  ];
  return (
    <CardMetrica
      etiqueta="Recibo de 2.000 €"
      valor="1.241 €"
      sub="disponível para gastar"
      barPct={62}
      barNota="62% deste recibo é mesmo teu"
      chips={items}
    />
  );
}

function VisualReserva() {
  const itens = [
    { l: "Segurança Social", v: 299, total: 450, pct: 66 },
    { l: "Reserva para IRS", v: 138, total: 460, pct: 30 },
  ];
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Mealheiro fiscal</span>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">Este trimestre</span>
      </div>
      <div className="space-y-4">
        {itens.map((r) => (
          <div key={r.l}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="font-medium text-stone-600 dark:text-stone-300">{r.l}</span>
              <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {r.v} €<span className="font-normal text-stone-400"> / {r.total} €</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
              <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-brand-light p-3 text-center">
        <div className="text-[11px] font-medium text-brand-dark">Total reservado este mês</div>
        <div className="mt-0.5 font-display text-xl font-semibold text-brand tabular-nums">437 €</div>
      </div>
    </div>
  );
}

function VisualPrazos() {
  const prazos = [
    { t: "Declaração trimestral SS", d: "20 jul", dias: 12, urgente: true },
    { t: "Pagamento por conta IRS", d: "31 jul", dias: 23, urgente: false },
  ];
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Próximos prazos</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-alert-text">2</span>
      </div>
      <div className="space-y-2">
        {prazos.map((p) => (
          <div
            key={p.t}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
              p.urgente ? "border border-alert-border bg-alert-bg" : "border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-800/70"
            }`}
          >
            <div className={`flex w-10 flex-shrink-0 flex-col items-center ${p.urgente ? "text-alert-text" : "text-brand"}`}>
              <span className="font-display text-lg font-semibold leading-none tabular-nums">{p.dias}</span>
              <span className="text-[9px] uppercase tracking-wide opacity-70">dias</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-xs font-semibold ${p.urgente ? "text-alert-text" : "text-stone-700 dark:text-stone-200"}`}>
                {p.t}
              </div>
              <div className={`text-[10px] ${p.urgente ? "text-alert-text/70" : "text-stone-400"}`}>{p.d}</div>
            </div>
            {p.urgente && <Warning size={13} className="flex-shrink-0 text-alert-text" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Visual "comparar": três caminhos lado a lado ───────────────────── */

function VisualTresCaminhos({ cmp: CMP }: { cmp: ComparacaoCategoriasResult }) {
  const vias = [
    { l: "Por conta de outrem", v: CMP.dependente.liquido, chave: "dependente" },
    { l: "Recibos verdes", v: CMP.freelancer.liquido, chave: "freelancer" },
    { l: "Empresa (Lda)", v: CMP.empresa.liquido, chave: "empresa" },
  ];
  const max = Math.max(...vias.map((v) => v.v), 1);
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Mesmo rendimento · 30 000 €/ano</span>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">Líquido/ano</span>
      </div>
      <div className="space-y-3">
        {vias.map((v) => {
          const melhor = CMP.melhor === v.chave;
          return (
            <div key={v.l}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={`font-medium ${melhor ? "text-brand-dark" : "text-stone-600 dark:text-stone-300"}`}>{v.l}</span>
                <span className={`font-semibold tabular-nums ${melhor ? "text-brand" : "text-stone-800 dark:text-stone-100"}`}>{fmt(v.v)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${melhor ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}
                  style={{ width: `${(v.v / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Conteúdo por modo ──────────────────────────────────────────────── */

interface Bloco {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  desc: string;
  visual: ReactNode;
}
interface Conteudo {
  eyebrow: string;
  titulo: string;
  blocos: Bloco[];
  extras: { icon: ReactNode; label: string }[];
}

const eur = (n: number) => fmt(Math.round(n));

function criarConteudo(
  CMP: ComparacaoCategoriasResult,
  BREAKEVEN: Breakeven
): Record<Perfil, Conteudo> {
  return {
  independente: {
    eyebrow: "Porque precisas disto",
    titulo: "Não é uma calculadora. É tranquilidade financeira.",
    blocos: [
      {
        icon: <Wallet size={20} />,
        eyebrow: "O teu saldo real",
        title: "Vê o dinheiro, não os impostos.",
        desc: "Separamos automaticamente o que é teu do que é do Estado. O número grande que vês é, simplesmente, o que podes gastar — sem fazer contas, sem culpa.",
        visual: <VisualSaldo />,
      },
      {
        icon: <ChartProjection size={20} />,
        eyebrow: "Reserva automática",
        title: "Pôr de lado deixa de ser um susto.",
        desc: "Em cada recibo dizemos-te quanto reservar para a Segurança Social e para o IVA. Chega o trimestre e o dinheiro já lá está — nada de surpresas de última hora.",
        visual: <VisualReserva />,
      },
      {
        icon: <BellAlert size={20} />,
        eyebrow: "Alertas de prazos",
        title: "Nunca mais uma coima por esquecimento.",
        desc: "Declaração trimestral, pagamentos por conta, IRS anual — avisamos com semanas de antecedência. O detalhe que te poupa juros e dores de cabeça.",
        visual: <VisualPrazos />,
      },
    ],
    extras: [
      { icon: <Calculator size={16} />, label: "Simulador de IRS anual" },
      { icon: <History size={16} />, label: "Histórico de recibos" },
      { icon: <Export size={16} />, label: "Exportar para o contabilista" },
    ],
  },

  dependente: {
    eyebrow: "Do bruto ao líquido",
    titulo: "O teu salário, sem letras pequenas.",
    blocos: [
      {
        icon: <Wallet size={20} />,
        eyebrow: "O teu líquido real",
        title: "Vê o que devias receber.",
        desc: "Do salário bruto ao que chega ao bolso — retenção de IRS de 2026, Segurança Social e subsídio de refeição. O número que importa, sem suposições.",
        visual: (
          <CardMetrica
            etiqueta="Salário de 1.500 €"
            valor="1.167 €"
            sub="vencimento líquido"
            barPct={78}
            barNota="78% do bruto chega ao bolso"
            chips={[
              { l: "Retenção IRS", v: "168 €" },
              { l: "Seg. Social", v: "165 €" },
              { l: "Líquido", v: "1.167 €" },
            ]}
          />
        ),
      },
      {
        icon: <Calendar size={20} />,
        eyebrow: "14 meses por ano",
        title: "Os subsídios também contam.",
        desc: "Subsídios de férias e de Natal incluídos na visão anual, com a retenção certa. Vês o ano inteiro, não só o mês — e planeias em condições.",
        visual: (
          <CardLista
            titulo="Visão anual"
            badge="14 meses"
            linhas={[
              { l: "12 meses de vencimento", v: "14 004 €" },
              { l: "Subsídio de férias", v: "1 167 €" },
              { l: "Subsídio de Natal", v: "1 167 €" },
              { l: "Líquido anual", v: "16 338 €", strong: true },
            ]}
          />
        ),
      },
      {
        icon: <ShieldCheck size={20} />,
        eyebrow: "Auditoria do recibo",
        title: "O teu recibo está certo?",
        desc: "Arrasta o recibo em PDF e comparamos, lado a lado, o que tens face ao esperado em 2026 — IRS, Segurança Social e líquido. O ficheiro nunca sai do teu dispositivo.",
        visual: (
          <CardLista
            titulo="Recibo vs. esperado"
            badge="Auditoria"
            linhas={[
              { l: "IRS retido", v: "168 € ✓" },
              { l: "Segurança Social", v: "165 € ✓" },
              { l: "Líquido", v: "1 167 €", strong: true },
            ]}
          />
        ),
      },
    ],
    extras: [
      { icon: <FileSign size={16} />, label: "Importar recibo em PDF" },
      { icon: <ChartProjection size={16} />, label: "Mealheiro para o acerto de IRS" },
      { icon: <ShieldCheck size={16} />, label: "IRS Jovem aplicado" },
    ],
  },

  empresa: {
    eyebrow: "Abrir empresa",
    titulo: "Sociedade? Com os números à frente.",
    blocos: [
      {
        icon: <Building size={20} />,
        eyebrow: "Líquido via sociedade",
        title: "Quanto te fica, de facto.",
        desc: "Da faturação ao que recebes — IRC PME, derrama e distribuição de dividendos. Vês o líquido real da empresa, sem otimismo nem letras pequenas.",
        visual: (
          <CardMetrica
            etiqueta="Faturação 30 000 €/ano"
            valor={eur(CMP.empresa.liquido)}
            sub="líquido anual estimado"
            barPct={Math.round((CMP.empresa.liquido / 30000) * 100)}
            barNota={`${Math.round((CMP.empresa.liquido / 30000) * 100)}% fica contigo via empresa`}
            chips={[
              { l: "IRC + derrama", v: eur(CMP.empresa.irc + CMP.empresa.derrama) },
              { l: "Dividendos", v: eur(CMP.empresa.dividendos) },
              { l: "Custos", v: eur(CMP.empresa.custosEmpresa) },
            ]}
          />
        ),
      },
      {
        icon: <Coin size={20} />,
        eyebrow: "IRC, derrama e dividendos",
        title: "Cada euro de imposto, explicado.",
        desc: "Mostramos a decomposição completa: IRC PME a 15% sobre os primeiros 50 000 € de lucro, derrama municipal e o imposto sobre dividendos a 28%. Nada de caixas pretas.",
        visual: (
          <CardLista
            titulo="Decomposição · empresa"
            badge="IRC PME"
            linhas={[
              { l: "Lucro tributável", v: eur(CMP.empresa.lucroTributavel) },
              { l: "IRC (15%)", v: `− ${eur(CMP.empresa.irc)}` },
              { l: "Derrama municipal", v: `− ${eur(CMP.empresa.derrama)}` },
              { l: "IRS dividendos (28%)", v: `− ${eur(CMP.empresa.dividendos)}` },
              { l: "Líquido", v: eur(CMP.empresa.liquido), strong: true },
            ]}
          />
        ),
      },
      {
        icon: <ShieldCheck size={20} />,
        eyebrow: "Benefícios fiscais",
        title: "RFAI, DLRR e SIFIDE incluídos.",
        desc: "O simulador modela tributação autónoma de viaturas, custos de constituição e os principais benefícios (RFAI, DLRR, SIFIDE II, IMI/IMT) — para veres o impacto antes de decidir.",
        visual: (
          <CardLista
            titulo="Modelado pelo simulador"
            badge="2026"
            linhas={[
              { l: "Tributação autónoma (viaturas)", v: "Art. 88.º" },
              { l: "RFAI · DLRR · SIFIDE II", v: "CFI 22.º–42.º" },
              { l: "Custos de constituição", v: "Incluído" },
              { l: "Benefícios IMI/IMT", v: "Via RFAI" },
            ]}
          />
        ),
      },
    ],
    extras: [
      { icon: <Receipt size={16} />, label: "Tributação autónoma" },
      { icon: <Building size={16} />, label: "Custos de constituição" },
      { icon: <Scale size={16} />, label: "Comparar com recibos verdes" },
    ],
  },

  comparar: {
    eyebrow: "Uma base, três caminhos",
    titulo: "Compara e escolhe com confiança.",
    blocos: [
      {
        icon: <Scale size={20} />,
        eyebrow: "Lado a lado",
        title: "Os três caminhos, mesmo rendimento.",
        desc: "Por conta de outrem, recibos verdes ou empresa — para o mesmo rendimento anual, vês o que fica no bolso em cada um e qual é o mais líquido para ti.",
        visual: <VisualTresCaminhos cmp={CMP} />,
      },
      {
        icon: <ChartProjection size={20} />,
        eyebrow: "Ponto de viragem",
        title: "Sabe quando compensa mudar.",
        desc: "Arrasta o slider de rendimento e descobre a partir de que valor os recibos verdes batem o salário, e quando a empresa começa a compensar. A decisão deixa de ser um palpite.",
        visual: (
          <CardLista
            titulo="Pontos de viragem"
            badge="Estimativa"
            linhas={[
              { l: "Recibos verdes vs. salário", v: BREAKEVEN.bRV ? `≈ ${eur(BREAKEVEN.bRV)}` : "—" },
              { l: "Empresa vs. recibos verdes", v: BREAKEVEN.bEmp ? `≈ ${eur(BREAKEVEN.bEmp)}` : "—" },
              { l: "Melhor a 30 000 €/ano", v: CMP.melhor === "empresa" ? "Empresa" : CMP.melhor === "freelancer" ? "Recibos verdes" : "Salário", strong: true },
            ]}
          />
        ),
      },
      {
        icon: <Calendar size={20} />,
        eyebrow: "Calendário fiscal",
        title: "As obrigações de cada cenário.",
        desc: "Cada caminho tem o seu calendário — Segurança Social, IRS, IVA ou IRC. Mostramos quando e quanto, para não haveres surpresas seja qual for a tua escolha.",
        visual: (
          <CardLista
            titulo="Quando se paga"
            badge="Por cenário"
            linhas={[
              { l: "Salário · SS + IRS", v: "Mensal" },
              { l: "Recibos verdes · SS", v: "Mensal (dia 20)" },
              { l: "Recibos verdes · IRS", v: "Acerto em junho" },
              { l: "Empresa · IRC", v: "Anual" },
            ]}
          />
        ),
      },
    ],
    extras: [
      { icon: <Calculator size={16} />, label: "Ajusta o rendimento" },
      { icon: <Coin size={16} />, label: "Considera as despesas" },
      { icon: <Check size={16} />, label: "Decisão informada" },
    ],
  },
  };
}

export default function Features({
  cmp,
  breakeven,
}: {
  cmp: ComparacaoCategoriasResult;
  breakeven: Breakeven;
}) {
  const { perfil } = usePerfil();
  const CONTEUDO = useMemo(() => criarConteudo(cmp, breakeven), [cmp, breakeven]);
  const c = CONTEUDO[perfil] ?? CONTEUDO.independente;

  return (
    <section id="features" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal key={`${perfil}-head`} className="mb-14 max-w-2xl">
          <div className="eyebrow mb-3 text-brand">{c.eyebrow}</div>
          <h2 className="font-display display-2 text-balance font-semibold text-ink">{c.titulo}</h2>
        </Reveal>

        <div className="space-y-16 sm:space-y-20">
          {c.blocos.map((b, i) => (
            <Reveal key={`${perfil}-${b.title}`}>
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand">{b.icon}</div>
                  <div className="eyebrow mt-5 text-stone-400">{b.eyebrow}</div>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-stone-800 dark:text-stone-100 sm:text-3xl">{b.title}</h3>
                  <p className="mt-3 max-w-md text-stone-500 dark:text-stone-400">{b.desc}</p>
                </div>
                <div>{b.visual}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20">
          <StaggerGroup className="grid gap-4 sm:grid-cols-3">
            {c.extras.map((e) => (
              <StaggerItem
                key={e.label}
                className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-5 py-4 shadow-card dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">{e.icon}</span>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{e.label}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </Reveal>
      </div>
    </section>
  );
}
