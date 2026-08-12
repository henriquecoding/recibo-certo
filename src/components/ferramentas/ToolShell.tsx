// ═══════════════════════════════════════════════════════════════════════
//  ToolShell — a gramática comum de todas as ferramentas (§9.1)
//  ---------------------------------------------------------------------
//  Cinco zonas previsíveis: Start, Input, Progress, Result e Actions. Este
//  componente é a moldura das três de fora (Start e o rodapé de contexto);
//  as de dentro pertencem a cada ferramenta.
//
//  A LARGURA VEM DO CATÁLOGO, NÃO DE UM `if` (§P1-01). O layout antigo
//  aplicava `max-w-3xl` a tudo com uma exceção codificada por pathname
//  (`pathname === "/ferramentas/simulador-irs"`) — e espremia a 768px o
//  mapa, o comparador, as heranças e a empresa. Agora cada ferramenta
//  declara `layout` e a moldura obedece.
//
//  Server Component: nada aqui precisa de estado.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "@/components/ui/Icons";
import type { ToolDefinition, ToolLayout } from "@/lib/ferramentas";
import { relacionadas, percursosCom, resolverPercurso } from "@/lib/ferramentas";
import { iconeDe } from "./icon-map";
import ToolStart from "./ToolStart";

/** A largura que cada tarefa pede. `map` e `wide` saem da coluna de leitura. */
export const LARGURA_POR_LAYOUT: Record<ToolLayout, string> = {
  compact: "max-w-3xl",
  split: "max-w-5xl",
  wide: "max-w-6xl",
  map: "max-w-7xl",
};

interface ToolShellProps {
  tool: ToolDefinition;
  /** A ferramenta em si — as zonas Input, Progress, Result e Actions. */
  children: ReactNode;
  /** Conteúdo editorial abaixo da ferramenta (como funciona, FAQ, fontes). */
  contexto?: ReactNode;
  /** Substitui o subtítulo por omissão (`shortOutcome`) quando é preciso mais. */
  subtitulo?: ReactNode;
}

export default function ToolShell({ tool, children, contexto, subtitulo }: ToolShellProps) {
  const Icone = iconeDe(tool.icon);
  const relacionadasResolvidas = relacionadas(tool);
  const percursos = percursosCom(tool.id);

  return (
    <>
      {/* ── Cabeçalho: que problema resolve e o que a pessoa recebe ──── */}
      <header className="mb-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Icone size={18} />
          </span>
          <span className="eyebrow text-brand">
            {tool.intents.includes("calcular") ? "Calcular" : null}
            {!tool.intents.includes("calcular") && tool.intents.includes("comparar") ? "Comparar e decidir" : null}
            {!tool.intents.includes("calcular") && !tool.intents.includes("comparar") && tool.intents.includes("verificar") ? "Verificar" : null}
            {tool.intents.length === 1 && tool.intents[0] === "cumprir" ? "Preparar uma obrigação" : null}
          </span>
        </div>
        <h1 className="font-display display-2 mb-3 font-semibold text-ink text-balance">
          {tool.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-stone-500 dark:text-stone-400">
          {subtitulo ?? tool.shortOutcome}
        </p>
      </header>

      {/* ── Zona 1: Start ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <ToolStart tool={tool} />
      </div>

      {/* ── Zonas 2–5: a ferramenta ───────────────────────────────────── */}
      <div id="ferramenta" className="scroll-mt-24">{children}</div>

      {contexto ? <div className="mt-12">{contexto}</div> : null}

      {/* ── Percursos: a próxima ação coerente (§P1-05) ───────────────── */}
      {percursos.length > 0 && (
        <section aria-labelledby="percursos-ferramenta" className="mt-12">
          <h2
            id="percursos-ferramenta"
            className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100"
          >
            Esta ferramenta faz parte de
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {percursos.map((p) => {
              const passos = resolverPercurso(p);
              return (
                <div
                  key={p.id}
                  className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
                >
                  <h3 className="text-[15px] font-semibold text-stone-800 dark:text-stone-100">{p.title}</h3>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{p.outcome}</p>
                  <ol className="mt-3 space-y-1.5">
                    {passos.map(({ ferramenta }, i) => (
                      <li key={ferramenta.id} className="flex items-center gap-2 text-sm">
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                            ferramenta.id === tool.id
                              ? "bg-brand text-white"
                              : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                        {ferramenta.id === tool.id ? (
                          <span className="font-semibold text-stone-700 dark:text-stone-200">
                            {ferramenta.title} <span className="text-brand">(estás aqui)</span>
                          </span>
                        ) : (
                          <Link
                            href={ferramenta.canonicalHref}
                            className="text-stone-600 underline-offset-2 hover:text-brand hover:underline dark:text-stone-300"
                          >
                            {ferramenta.title}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Relacionados e guias ──────────────────────────────────────── */}
      {relacionadasResolvidas.length > 0 && (
        <section aria-labelledby="relacionadas-ferramenta" className="mt-12">
          <h2
            id="relacionadas-ferramenta"
            className="font-display mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100"
          >
            A seguir, talvez precises de
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relacionadasResolvidas.map((r) => {
              const IconeRel = iconeDe(r.icon);
              return (
                <Link
                  key={r.id}
                  href={r.canonicalHref}
                  className="group flex items-start gap-3 rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:border-brand hover:shadow-lift dark:border-stone-800 dark:bg-stone-900"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                    <IconeRel size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {r.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                      {r.shortOutcome}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="mt-1 flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {tool.relatedGuideSlugs.length > 0 && (
        <section className="mt-8 rounded-4xl border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900/50">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-brand" />
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Compreender melhor
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {tool.relatedGuideSlugs.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/guias/${slug}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  {slug.replace(/-/g, " ")}
                  <ArrowRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
