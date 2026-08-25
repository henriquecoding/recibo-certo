"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  Lightbulb,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkle,
} from "@/components/ui/Icons";
import { EASE } from "@/lib/motion";
import { useRelogioDePalco } from "@/components/simulador/palco";

export interface ExemploDescoberta {
  competencia: string;
  problema: string;
  modelo: string;
  primeiroTeste: string;
  testeDeFalsificacao: string;
}

const ATOS = [
  { id: "contexto", rotulo: "O que trazes", legenda: "Ler capacidades e disponibilidade" },
  { id: "fronteiras", rotulo: "O que limita", legenda: "Aplicar restrições reais" },
  { id: "evidencia", rotulo: "O que se sabe", legenda: "Separar sinais de mercado de lacunas" },
  { id: "hipotese", rotulo: "O que testar", legenda: "Compor uma hipótese falsificável" },
] as const;

const DURACAO_ATO = [2600, 2400, 2800, 3600] as const;

function intensidade(indice: number, ativo: number) {
  if (indice < ativo) return "concluido" as const;
  if (indice === ativo) return "ativo" as const;
  return "futuro" as const;
}

function MarcaDaEtapa({ estado }: { estado: ReturnType<typeof intensidade> }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-500 ${
        estado === "concluido"
          ? "border-brand-mint bg-brand text-white"
          : estado === "ativo"
            ? "border-brand-mint bg-brand-mint text-brand-deep shadow-[0_0_0_6px_rgba(159,225,203,.12)]"
            : "border-white/15 bg-white/[.04] text-white/35"
      }`}
    >
      {estado === "concluido" ? <Check size={13} /> : <span aria-hidden>·</span>}
    </span>
  );
}

export default function HeroDescobrir({ exemplo }: { exemplo: ExemploDescoberta }) {
  const reduz = useReducedMotion();
  const [montado, setMontado] = useState(false);
  const [ato, setAto] = useState(0);
  const [parado, setParado] = useState(false);
  const [ciclo, setCiclo] = useState(0);

  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (!reduz) return;
    setAto(ATOS.length - 1);
    setParado(true);
  }, [reduz]);

  const estatico = montado && Boolean(reduz);
  const barraRef = useRelogioDePalco({
    duracaoMs: DURACAO_ATO[ato] ?? DURACAO_ATO[0],
    chave: `${ciclo}-${ato}`,
    parado: parado || Boolean(reduz),
    aoTerminar: () => {
      if (ato < ATOS.length - 1) {
        setAto((atual) => atual + 1);
        return;
      }
      setAto(0);
      setCiclo((atual) => atual + 1);
    },
  });

  const progresso = ((ato + 1) / ATOS.length) * 100;

  const irPara = (indice: number) => {
    setParado(true);
    setAto(indice);
  };

  const recomecar = () => {
    setParado(false);
    setAto(0);
    setCiclo((atual) => atual + 1);
  };

  const transicao = estatico ? { duration: 0 } : { duration: 0.6, ease: EASE };

  return (
    <section data-hero className="grain relative overflow-hidden px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-48 top-16 h-[28rem] w-[28rem] rounded-full bg-brand-mint/20 blur-3xl" />
        <div className="absolute -right-56 -top-44 h-[34rem] w-[34rem] rounded-full bg-categoria-areia-bg/60 blur-3xl dark:bg-brand/10" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-3.5 py-2 text-xs font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
            <Lightbulb size={14} />
            Descobrir um negócio
            <span aria-hidden className="h-1 w-1 rounded-full bg-brand/50" />
            Portugal
          </div>
          <h1 className="text-balance font-display text-[clamp(2.45rem,6.7vw,5.65rem)] font-semibold leading-[.98] tracking-[-.035em] text-ink">
            Uma ideia só interessa depois de resistir à realidade.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Cruzamos o que sabes fazer com as tuas restrições e sinais oficiais de Portugal.
            O resultado não é uma lista inspiradora: é uma hipótese que sabes como tentar destruir.
          </p>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-brand-deep/15 bg-[#10231d] p-4 shadow-lift sm:mt-12 sm:rounded-[2.5rem] sm:p-6 lg:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
            <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-[#8b7148]/15 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
          </div>

          <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5 text-white">
              <span className="relative flex h-2.5 w-2.5">
                {!estatico && !parado && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-50 motion-reduce:animate-none" />
                )}
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-mint" />
              </span>
              <span className="text-xs font-bold uppercase tracking-[.16em]">Motor em demonstração</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-white/45 sm:inline">Exemplo estrutural, sem pontuação inventada</span>
              {!estatico && (
                <button
                  type="button"
                  onClick={() => setParado((valor) => !valor)}
                  aria-label={parado ? "Retomar a demonstração" : "Pausar a demonstração"}
                  className="focus-marca flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-brand-mint/60 hover:text-white"
                >
                  {parado ? <Play size={13} /> : <Pause size={13} />}
                </button>
              )}
              {!estatico ? (
                <button
                  type="button"
                  onClick={recomecar}
                  aria-label="Recomeçar a demonstração"
                  className="focus-marca flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-brand-mint/60 hover:text-white"
                >
                  <RotateCcw size={13} />
                </button>
              ) : null}
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            Passo {ato + 1} de {ATOS.length}: {ATOS[ato]?.legenda}.
          </p>

          <div className="relative mt-6">
            <div aria-hidden className="absolute left-4 top-4 hidden h-px w-[calc(100%-2rem)] bg-white/10 lg:block">
              <m.span
                className="block h-px bg-gradient-to-r from-brand via-brand-mint to-white"
                animate={{ width: `${Math.max(4, progresso - 12)}%` }}
                transition={transicao}
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-4 lg:gap-4">
              <m.article
                animate={{ opacity: 1, y: 0 }}
                transition={transicao}
                className={`relative min-h-[15.5rem] rounded-3xl border border-white/10 bg-white/[.055] p-5 pl-14 text-white backdrop-blur-sm lg:block lg:pl-5 lg:pt-14 ${ato === 0 ? "block" : "hidden"}`}
              >
                <div className="absolute left-4 top-4 lg:left-5">
                  <MarcaDaEtapa estado={intensidade(0, ato)} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-brand-mint">Contexto</div>
                <h2 className="mt-2 font-display text-xl font-semibold leading-tight">Começa em ti.</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[exemplo.competencia, "Trabalhar com dados", "Part-time"].map((item, indice) => (
                    <m.span
                      key={item}
                      initial={false}
                      animate={{
                        opacity: ato >= 0 ? 1 : 0,
                        y: ato >= 0 ? 0 : 8,
                        borderColor: ato === 0 ? "rgba(159,225,203,.55)" : "rgba(255,255,255,.12)",
                      }}
                      transition={{ ...transicao, delay: estatico ? 0 : indice * 0.08 }}
                      className="rounded-full border bg-white/[.06] px-3 py-1.5 text-xs text-white/80"
                    >
                      {item}
                    </m.span>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-white/50">
                  Competências, experiência e tempo são contexto — não uma identidade exclusiva.
                </p>
              </m.article>

              <m.article
                initial={false}
                animate={{ opacity: ato >= 1 ? 1 : 0.36, y: ato === 1 ? -4 : 0 }}
                transition={transicao}
                className={`relative min-h-[15.5rem] rounded-3xl border border-white/10 bg-white/[.035] p-5 pl-14 text-white lg:block lg:pl-5 lg:pt-14 ${ato === 1 ? "block" : "hidden"}`}
              >
                <div className="absolute left-4 top-4 lg:left-5">
                  <MarcaDaEtapa estado={intensidade(1, ato)} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e7c98e]">Fronteiras</div>
                <h2 className="mt-2 font-display text-xl font-semibold leading-tight">O “não” também decide.</h2>
                <ul className="mt-5 space-y-2.5 text-xs text-white/75">
                  {[
                    "Sem loja nem stock inicial",
                    "Sem disponibilidade permanente",
                    "Operação compatível com equipa de uma pessoa",
                  ].map((item, indice) => (
                    <m.li
                      key={item}
                      initial={false}
                      animate={{ opacity: ato >= 1 ? 1 : 0, x: ato >= 1 ? 0 : -8 }}
                      transition={{ ...transicao, delay: estatico ? 0 : indice * 0.08 }}
                      className="flex items-start gap-2"
                    >
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#e7c98e]" />
                      {item}
                    </m.li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-white/50">
                  O motor elimina o que não cabe antes de ordenar o que sobra.
                </p>
              </m.article>

              <m.article
                initial={false}
                animate={{ opacity: ato >= 2 ? 1 : 0.28, y: ato === 2 ? -4 : 0 }}
                transition={transicao}
                className={`relative min-h-[15.5rem] rounded-3xl border border-white/10 bg-white/[.035] p-5 pl-14 text-white lg:block lg:pl-5 lg:pt-14 ${ato === 2 ? "block" : "hidden"}`}
              >
                <div className="absolute left-4 top-4 lg:left-5">
                  <MarcaDaEtapa estado={intensidade(2, ato)} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-categoria-azul-border">Evidência</div>
                <h2 className="mt-2 font-display text-xl font-semibold leading-tight">Saber não é supor.</h2>
                <p className="mt-3 line-clamp-3 text-[11px] leading-relaxed text-white/55">
                  {exemplo.problema}
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    ["Contexto público", "INE · Eurostat", "ok"],
                    ["Oferta na tua zona", "por medir", "aberto"],
                    ["Vontade de pagar", "só com piloto", "aberto"],
                  ].map(([label, valor, estado]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/60">{label}</span>
                        <span className={`text-[10px] font-semibold ${estado === "ok" ? "text-brand-mint" : "text-[#e7c98e]"}`}>
                          {valor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
                  <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-brand-mint" />
                  Uma lacuna visível vale mais do que um número plausível sem fonte.
                </p>
              </m.article>

              <m.article
                initial={false}
                animate={{
                  opacity: ato >= 3 ? 1 : 0.22,
                  y: ato === 3 ? -6 : 0,
                  borderColor: ato === 3 ? "rgba(159,225,203,.55)" : "rgba(255,255,255,.1)",
                }}
                transition={transicao}
                className={`relative min-h-[15.5rem] overflow-hidden rounded-3xl border bg-white p-5 pl-14 text-stone-800 shadow-card lg:block lg:pl-5 lg:pt-14 ${ato === 3 ? "block" : "hidden"}`}
              >
                <div aria-hidden className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-light blur-2xl" />
                <div className="absolute left-4 top-4 lg:left-5">
                  <MarcaDaEtapa estado={intensidade(3, ato)} />
                </div>
                <div className="relative text-[10px] font-bold uppercase tracking-[.18em] text-brand">Hipótese composta</div>
                <h2 className="relative mt-2 font-display text-xl font-semibold leading-tight text-ink">
                  Organização operacional para microempresas
                </h2>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-semibold text-brand-dark">
                    {exemplo.modelo}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-600">B2B</span>
                </div>
                <div className="relative mt-4 border-t border-stone-100 pt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Primeiro teste</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{exemplo.primeiroTeste}</p>
                </div>
                <div className="relative mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-clay-text">
                  <Search size={12} /> Hipótese, não garantia
                </div>
              </m.article>
            </div>
          </div>

          <ol className="relative mt-5 grid grid-cols-4 gap-1.5" aria-label="Etapas da demonstração">
            {ATOS.map((item, indice) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => irPara(indice)}
                  aria-current={indice === ato ? "step" : undefined}
                  aria-label={`Passo ${indice + 1} de ${ATOS.length}: ${item.legenda}`}
                  className="focus-marca block w-full py-1 text-left"
                >
                  <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      ref={indice === ato ? barraRef : undefined}
                      className="block h-full w-full origin-left rounded-full bg-brand-mint"
                      style={{ transform: `scaleX(${indice < ato || (indice === ato && estatico) ? 1 : 0})` }}
                    />
                  </span>
                  <span className={`mt-1.5 block truncate text-[9px] font-bold uppercase tracking-wide ${indice === ato ? "text-white" : "text-white/35"}`}>
                    {item.rotulo}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ferramentas/descobrir-negocio"
            className="btn-shine focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-float sm:w-auto"
          >
            Descobrir o que posso testar <ArrowRight size={15} />
          </Link>
          <a
            href="#como-decide"
            className="focus-marca inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 no-underline transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:w-auto"
          >
            Ver como decide <Sparkle size={14} />
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-stone-500">
          <span className="inline-flex items-center gap-1.5"><Lock size={12} className="text-brand" /> O teu contexto fica neste dispositivo</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} className="text-brand" /> Lacunas ficam visíveis</span>
        </div>
      </div>
    </section>
  );
}
