"use client";

// ─────────────────────────────────────────────────────────────────────────────
// #explorar — launchpad ÚNICO da homepage, moldado ao perfil. Funde num só sítio
// (compacto, mobile-first) o que antes eram quatro secções altas (Features +
// Ferramentas + Simulador de IRS + Aprender). Por perfil mostra SÓ o essencial:
//   · um DESTAQUE — a demo do IRS ao vivo onde o IRS anual é protagonista
//     (independente/comparar), ou o cartão da ferramenta-chave (dependente/empresa);
//   · uma fila compacta de ferramentas relevantes;
//   · uma fila compacta de guias + o Quiz.
// Curadoria vem da fonte única (ferramentas-config/guias-config). A DemoIRS entra
// em chunk próprio (fiscal-data fora do arranque) e só é montada nos perfis que a
// mostram — "só o necessário conforme a seleção".
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "motion/react";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { usePerto } from "@/lib/use-perto";
import { ferramentasPorPerfil, type FerramentaMeta } from "@/lib/ferramentas-config";
import { guiasPorPerfil } from "@/lib/guias-config";
import { FERRAMENTA_SLUGS } from "@/lib/seo";
import { TOTAL_PERGUNTAS_META } from "@/lib/quiz-fiscal/quiz-meta";
import Reveal from "@/components/ui/Reveal";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ArrowRight, Check, Clock, Trophy } from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";

// ── DemoIRS lazy (arrasta fiscal-data → chunk async; nunca no arranque) ──────
function DemoSkeleton() {
  return (
    <div
      className="w-full max-w-md animate-pulse rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900"
      style={{ minHeight: 520 }}
      aria-hidden
    >
      <div className="h-6 w-32 rounded-full bg-stone-100 dark:bg-stone-800" />
      <div className="mt-6 h-10 w-40 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-6 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="mt-4 h-32 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <span className="sr-only">A carregar a demonstração…</span>
    </div>
  );
}
const DemoIRS = dynamic(() => import("@/components/simulador/DemoIRS"), {
  ssr: false,
  loading: () => <DemoSkeleton />,
});

// Perfis onde o IRS anual é a maior ansiedade → merece a demo ao vivo.
const PERFIL_COM_DEMO_IRS: Perfil[] = ["independente", "comparar"];

const COPY: Record<Perfil, { eyebrow: string; h2: string }> = {
  independente: { eyebrow: "Feito para recibos verdes", h2: "Tudo o que precisas, num só sítio." },
  dependente: { eyebrow: "Feito para quem recebe salário", h2: "Do bruto ao líquido, sem letras pequenas." },
  empresa: { eyebrow: "Feito para a tua sociedade", h2: "Montar e gerir a empresa, com números." },
  comparar: { eyebrow: "Feito para decidir", h2: "O teu melhor caminho, lado a lado." },
};

// Copy do destaque com a demo do IRS (curto — 1 frase + 2 provas).
const DEMO_COPY: Record<Perfil, string> = {
  independente:
    "Retenções, pagamentos por conta e o acerto final — vê o teu IRS anual antes de a AT o fazer por ti.",
  comparar:
    "O mesmo motor que compara os teus cenários, agora ao detalhe: anexo a anexo, escalão a escalão.",
  dependente: "",
  empresa: "",
};
const DEMO_PROVAS = ["Todas as categorias e anexos (A–J)", "Tributação conjunta e memória de cálculo"];

const entrada = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
};

// ── Cartão compacto (linha) — partilhado por ferramentas e guias ─────────────
function CartaoCompacto({
  href,
  Icon,
  titulo,
  descricao,
  badge,
  meta,
}: {
  href: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  descricao?: string;
  badge?: string;
  meta?: string;
}) {
  return (
    <m.div variants={entrada} className="h-full">
      <Link
        href={href}
        className="group flex h-full items-start gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-stone-800 dark:bg-stone-900"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/10">
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-stone-800 transition-colors group-hover:text-brand-dark dark:text-stone-100 dark:group-hover:text-brand">
              {titulo}
            </span>
            {badge && (
              <span className="flex-shrink-0 rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {badge}
              </span>
            )}
          </span>
          {descricao && (
            <span className="mt-0.5 line-clamp-1 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              {descricao}
            </span>
          )}
          {meta && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-stone-400">
              <Clock size={11} /> {meta}
            </span>
          )}
        </span>
        <ArrowRight
          size={14}
          className="mt-0.5 flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
        />
      </Link>
    </m.div>
  );
}

// ── Destaque com cartão (perfis sem demo) ────────────────────────────────────
function DestaqueCartao({ f, chip }: { f: FerramentaMeta; chip: string }) {
  return (
    <Link
      href={f.href}
      className="group relative grid gap-5 rounded-4xl border border-brand/25 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-float focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-stone-900 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center"
    >
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
            <f.Icon size={19} />
          </span>
          <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark dark:bg-brand/10 dark:text-brand">
            Começa por aqui
          </span>
        </div>
        <div className="font-display text-2xl font-semibold leading-tight text-ink sm:text-[1.7rem]">{f.titulo}</div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">{f.descricao}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <Check size={11} className="text-brand" /> {chip}
        </div>
      </div>
      <span className="btn-shine inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all group-hover:-translate-y-0.5 group-hover:bg-brand-dark lg:self-center">
        Experimentar <ArrowRight size={14} />
      </span>
    </Link>
  );
}

// ── Destaque com a DemoIRS ao vivo (independente/comparar) ───────────────────
function DestaqueDemo({ perfil, perto }: { perfil: Perfil; perto: boolean }) {
  return (
    <div className="grid items-center gap-8 rounded-4xl border border-brand/20 bg-white p-6 shadow-card dark:border-brand/15 dark:bg-stone-900 sm:p-7 lg:grid-cols-2">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark dark:bg-brand/10 dark:text-brand">
          Simulador de IRS 2026
        </span>
        <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          O teu IRS anual, do rendimento ao reembolso.
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">{DEMO_COPY[perfil]}</p>
        <ul className="mt-4 space-y-2">
          {DEMO_PROVAS.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-brand dark:bg-brand/15">
                <Check size={10} />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <Link
          href="/ferramentas/simulador-irs"
          className="btn-shine mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Abrir o simulador completo <ArrowRight size={14} />
        </Link>
      </div>
      <div className="flex justify-center lg:justify-end">
        <ErrorBoundary etiqueta="demonstração do IRS">
          {perto ? <DemoIRS /> : <DemoSkeleton />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function MiniRotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
      {children}
    </div>
  );
}

export default function ExplorarSecao({ nAtividades }: { nAtividades: number }) {
  const { perfil } = usePerfil();
  const copy = COPY[perfil] ?? COPY.independente;
  const { destaque, restantes } = ferramentasPorPerfil(perfil);
  const comDemo = PERFIL_COM_DEMO_IRS.includes(perfil);
  const { ref, perto } = usePerto<HTMLDivElement>("600px 0px");

  // Fila de ferramentas: quando o destaque é a demo do IRS, a grelha inclui a
  // ferramenta-chave do perfil (e nunca duplica o próprio IRS).
  const ferramentasFila = (comDemo ? [destaque, ...restantes] : restantes)
    .filter((f) => f.slug !== "simulador-irs")
    .slice(0, 4);

  const guias = guiasPorPerfil(perfil).slice(0, 3);

  const chipDestaque =
    destaque.slug === "recibo-vencimento"
      ? "Tabelas oficiais de retenção 2026"
      : destaque.slug === "simulador-empresa"
        ? "IRC PME, derrama e dividendos"
        : destaque.slug === "classificar-atividade"
          ? `${nAtividades} atividades do Art. 151.º`
          : "Dados oficiais de 2026";

  return (
    <div ref={ref} className="mx-auto max-w-5xl">
      <Reveal className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="max-w-xl">
            <div className="eyebrow mb-2 text-brand">{copy.eyebrow}</div>
            <AnimatePresence mode="wait" initial={false}>
              <m.h2
                key={perfil}
                variants={entrada}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="font-display display-2 font-semibold text-ink"
              >
                {copy.h2}
              </m.h2>
            </AnimatePresence>
          </div>
          <Link
            href="/ferramentas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark dark:hover:text-brand-mint"
          >
            Ver as {FERRAMENTA_SLUGS.length} ferramentas <ArrowRight size={14} />
          </Link>
        </div>
      </Reveal>

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={perfil}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
            exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
          }}
        >
          {/* Destaque: demo ao vivo onde o IRS é protagonista, senão cartão-chave */}
          <m.div variants={entrada}>
            {comDemo ? (
              <DestaqueDemo perfil={perfil} perto={perto} />
            ) : (
              <DestaqueCartao f={destaque} chip={chipDestaque} />
            )}
          </m.div>

          {/* Ferramentas relevantes — fila compacta */}
          <MiniRotulo>Ferramentas para ti</MiniRotulo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ferramentasFila.map((f) => (
              <CartaoCompacto
                key={f.slug || f.href}
                href={f.href}
                Icon={f.Icon}
                titulo={f.titulo}
                descricao={f.descricao}
                badge={f.badge}
              />
            ))}
          </div>

          {/* Aprender — 3 guias + Quiz, tudo compacto */}
          <MiniRotulo>Aprender</MiniRotulo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {guias.map((g) => (
              <CartaoCompacto
                key={g.href}
                href={g.href}
                Icon={g.icon}
                titulo={g.titulo}
                meta={`${g.tempo} min de leitura`}
              />
            ))}
            {/* Quiz — cartão-linha de marca */}
            <m.div variants={entrada} className="h-full">
              <Link
                href="/quiz-fiscal"
                className="group flex h-full items-center gap-3 rounded-2xl bg-brand p-4 text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Trophy size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Quiz Fiscal</span>
                  <span className="block text-xs text-white/80">
                    {TOTAL_PERGUNTAS_META.toLocaleString("pt-PT")} perguntas com base legal
                  </span>
                </span>
                <ArrowRight size={14} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </m.div>
          </div>

          <div className="mt-6">
            <Link
              href="/guias"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 transition-colors hover:text-brand-dark dark:hover:text-brand"
            >
              Ver os guias todos <ArrowRight size={11} />
            </Link>
          </div>
        </m.div>
      </AnimatePresence>
    </div>
  );
}
