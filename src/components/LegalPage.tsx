import type { ReactNode } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import {
  ArrowLeft, Calendar, Mail, ChevronRight, Check,
  Warning, ShieldCheck, Lock,
} from "@/components/ui/Icons";
import { EMAIL_APOIO, mailtoApoio } from "@/lib/contacto";

// ── Tipos ─────────────────────────────────────────────────────

export interface TocItem {
  id: string;
  label: string;
}

interface LegalPageProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  toc: TocItem[];
  children: ReactNode;
  /** Sobrancelha do cabeçalho. As páginas de autoridade (§10.3 do
      relatório estratégico) usam este mesmo molde sem serem documentos
      legais — daí ser parametrizável em vez de estar escrito no layout. */
  eyebrow?: string;
  /** Segundo selo ao lado da data. */
  selo?: string;
  ctaTitulo?: string;
  ctaTexto?: string;
}

// ── Primitivas de conteúdo (exportadas para usar nas páginas) ─

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-28">
      <div className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-4 dark:border-stone-700">
        <div className="h-5 w-1 shrink-0 rounded-full bg-brand" />
        <h2 className="font-display text-xl font-bold text-stone-800 dark:text-stone-100">
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-[14px] leading-7 text-stone-600 dark:text-stone-400">
        {children}
      </div>
    </section>
  );
}

export function Sub({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-bold text-stone-700 dark:text-stone-300">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Nota({
  tipo = "aviso",
  children,
}: {
  tipo?: "aviso" | "info";
  children: ReactNode;
}) {
  if (tipo === "aviso") {
    return (
      <div className="flex gap-3 rounded-xl border border-alert-border bg-alert-bg px-4 py-3 dark:border-yellow-800/40 dark:bg-yellow-900/20">
        <Warning size={14} className="mt-0.5 shrink-0 text-alert-text dark:text-yellow-400" />
        <div className="text-[13px] leading-relaxed text-alert-text dark:text-yellow-300/80">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-xl border border-brand-mint/30 bg-brand-light px-4 py-3 dark:border-brand/30 dark:bg-brand/10">
      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-dark dark:text-brand-mint" />
      <div className="text-[13px] leading-relaxed text-brand-dark dark:text-brand-mint">
        {children}
      </div>
    </div>
  );
}

export function Lista({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ListaCheck({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <Check size={13} className="mt-0.5 shrink-0 text-brand" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Tabela({
  colunas,
  linhas,
  rotulo,
}: {
  colunas: string[];
  linhas: string[][];
  /** O que a tabela mostra. Vira o nome da região rolável. */
  rotulo?: string;
}) {
  return (
    // ┌───────────────────────────────────────────────────────────────┐
    // │ UMA CAIXA QUE ROLA TEM DE SE ALCANÇAR PELO TECLADO             │
    // │                                                               │
    // │ A 360px estas tabelas rolam de lado. Sem nada focável lá       │
    // │ dentro — e não há: são células de texto — quem navega só com   │
    // │ teclado nunca chega às colunas da direita. É WCAG 2.1.1, e o   │
    // │ axe apanha-o como `scrollable-region-focusable`.               │
    // │                                                               │
    // │ `tabIndex={0}` põe a caixa na ordem de tabulação; `role`       │
    // │ + `aria-label` dizem ao leitor de ecrã o que é aquilo, para    │
    // │ não anunciar «grupo» e mais nada.                              │
    // └───────────────────────────────────────────────────────────────┘
    <div
      tabIndex={0}
      role="region"
      aria-label={rotulo ?? "Tabela — rola na horizontal"}
      className="focus-marca mt-3 overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-700">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
            {colunas.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-left font-semibold text-stone-600 dark:text-stone-300"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr
              key={i}
              className={`border-b border-stone-100 last:border-0 dark:border-stone-800 ${
                i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-stone-50/50 dark:bg-stone-800/20"
              }`}
            >
              {linha.map((cel, j) => (
                <td key={j} className="px-4 py-3 text-stone-600 dark:text-stone-400">
                  {cel}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Layout principal ──────────────────────────────────────────

export default function LegalPage({
  title,
  subtitle,
  lastUpdated,
  toc,
  children,
  eyebrow = "Documentação legal",
  selo = "Conformidade RGPD",
  ctaTitulo = "Dúvidas sobre esta política?",
  ctaTexto = "Envia-nos um email e respondemos no prazo de 30 dias úteis.",
}: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-cream dark:bg-stone-900">
      <Nav />

      {/* Hero */}
      <div className="relative overflow-hidden bg-ink">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 140% at 10% 110%, rgba(29,158,117,0.15) 0%, transparent 60%), radial-gradient(ellipse 40% 80% at 90% -20%, rgba(29,158,117,0.07) 0%, transparent 55%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(29,158,117,0.5) 30%, rgba(159,225,203,0.65) 50%, rgba(29,158,117,0.5) 70%, transparent)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-12">
          {/* ┌──────────────────────────────────────────────────────────┐
              │ ESTE CABEÇALHO VIVIA ABAIXO DO PISO DO TELEMÓVEL          │
              │                                                          │
              │ A sobrancelha e o rótulo do índice estavam a 10px fixos e │
              │ as pastilhas do índice a 11px — abaixo dos 12px que a     │
              │ regra 5b exige a 360px. O caminho de volta media 92×16,   │
              │ menos de metade do alvo mínimo de 36px.                    │
              │                                                          │
              │ Nada disto foi apanhado porque `movel:e2e` mede as CINCO  │
              │ rotas da homepage, e este molde não é nenhuma delas — mas │
              │ é o de oito páginas (metodologia, estado dos dados,       │
              │ fontes, perguntas frequentes, changelog, privacidade,     │
              │ termos, cookies).                                         │
              │                                                          │
              │ A cura é a que o design system prescreve: uma CLASSE de   │
              │ piso (`.texto-micro` / `.texto-mini` — 12px no telemóvel, │
              │ 10/11px a partir de `sm:`), e não um tamanho afinado à    │
              │ mão. O aspeto em ecrã largo fica igual ao que era.         │
              └──────────────────────────────────────────────────────────┘ */}
          <Link
            href="/"
            className="mb-6 inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-brand-mint"
          >
            <ArrowLeft size={12} />
            Recibo Certo
          </Link>

          <div className="mb-1 texto-micro font-bold uppercase tracking-widest text-brand-mint/60">
            {eyebrow}
          </div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-400">{subtitle}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Calendar size={12} />
              Atualizado em {lastUpdated}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Lock size={12} />
              {selo}
            </div>
          </div>

          {/* ┌───────────────────────────────────────────────────────────┐
              │ ÍNDICE DO TELEMÓVEL — TINHA A PALETA ESCURA ESCRITA À MÃO   │
              │                                                           │
              │ `border-stone-800 bg-stone-900/60`, e as pastilhas         │
              │ `border-stone-700 bg-stone-800 text-stone-400`, sem uma    │
              │ única variante `dark:`. Em modo CLARO isto desenhava uma   │
              │ caixa preta no meio de uma página creme, com o texto a     │
              │ 2,60:1 — abaixo do mínimo AA a 11px, e a partir a regra    │
              │ de ouro que diz que o claro não parte.                     │
              │                                                           │
              │ Passava despercebido por duas razões que se somam: é       │
              │ `lg:hidden`, portanto não existe no ecrã onde se           │
              │ desenvolve, e vive em seis páginas que ninguém revisita —  │
              │ termos, privacidade, cookies, metodologia, estado dos      │
              │ dados e changelog fiscal.                                  │
              │                                                           │
              │ O piso tipográfico (`texto-micro`/`texto-mini`) e o alvo   │
              │ de 36px vêm da main e ficam: são a regra 5b, e as duas     │
              │ correções são ortogonais — uma trata da COR, a outra do    │
              │ TAMANHO.                                                   │
              └───────────────────────────────────────────────────────────┘ */}
          <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/60 lg:hidden">
            <p className="mb-3 texto-micro font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Neste documento
            </p>
            <div className="flex flex-wrap gap-2">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="inline-flex min-h-[36px] items-center rounded-lg border border-stone-300 bg-white px-2.5 py-1 texto-mini font-medium text-stone-700 transition-colors hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-brand-mint sm:min-h-0"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 bg-cream dark:bg-stone-900">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
                  <p className="eyebrow mb-4 text-stone-400">Índice</p>
                  <nav aria-label="Índice do documento">
                    <ul className="space-y-0.5">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-stone-500 transition-all hover:bg-brand-light hover:text-brand-dark dark:hover:bg-brand/10 dark:hover:text-brand-mint"
                          >
                            <ChevronRight size={10} className="shrink-0 text-stone-300" />
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Contacto */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
                  <p className="mb-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Questões ou pedidos RGPD?
                  </p>
                  <p className="mb-3 text-[11px] leading-relaxed text-stone-400">
                    Responderemos no prazo máximo de 30 dias úteis.
                  </p>
                  <a
                    href={mailtoApoio()}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-brand transition-colors hover:text-brand-dark dark:hover:text-brand-mint"
                  >
                    <Mail size={12} />
                    {EMAIL_APOIO}
                  </a>
                </div>
              </div>
            </aside>

            {/* Artigo */}
            <article>{children}</article>
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="border-t border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800/40">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                {ctaTitulo}
              </p>
              <p className="mt-0.5 text-xs text-stone-400">
                {ctaTexto}
              </p>
            </div>
            <a
              href={mailtoApoio()}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark"
            >
              <Mail size={14} />
              {EMAIL_APOIO}
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
