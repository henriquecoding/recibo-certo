// ═══════════════════════════════════════════════════════════════════════
//  RESULTADO EXPLICADO — a experiência de resultado do §14.3
//  ---------------------------------------------------------------------
//  O relatório é específico sobre o que um resultado tem de mostrar, e por
//  que ordem. Este componente é essa especificação, tornada obrigatória:
//
//   1. Cabeçalho — resultado ou intervalo, ano fiscal, perfil, confiança.
//   2. Como chegámos aqui — premissas, fórmula, arredondamento, versão.
//   3. O que reservar ou fazer — ação temporal concreta, nunca apresentada
//      como obrigação já cumprida.
//   4. Cenários — mudar uma variável e comparar, com a diferença explicada.
//   5. Fontes e limites — data de revisão, fonte primária, casos excluídos.
//   6. Próximo passo — «guardar/Plus; executar/FIZ; especialista; NUNCA os
//      três com igual peso».
//
//  Server Component: renderiza no servidor, sem JavaScript. Uma das
//  lacunas do §3.4 é precisamente prova e resultados que só existem depois
//  de o JavaScript correr, e um resultado fiscal é a última coisa que deve
//  depender disso.
//
//  ── Porque é que a hierarquia dos CTAs é imposta pelo tipo ────────────
//  O componente não aceita uma lista de ações; aceita SINAIS, e é
//  `escolherRota` que decide qual é a ação principal. É deliberado: se
//  cada página pudesse escolher os seus botões, a regra «nunca os três com
//  igual peso» duraria até à primeira semana em que a receita estivesse
//  abaixo do esperado. Aqui a hierarquia é uma consequência do cenário da
//  pessoa, e mudá-la obriga a mudar a regra — que está escrita, num sítio,
//  e é testável.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, Bank, Calendar, Check, Info, ShieldCheck, Warning,
} from "@/components/ui/Icons";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";
import { escolherRota, type SinaisDoUtilizador } from "@/lib/routing";
import type { EstadoConfianca } from "@/lib/analytics/eventos";

export interface Premissa {
  rotulo: string;
  valor: string;
  /** Porque é que este valor é o que é — quando não for óbvio. */
  nota?: string;
}

export interface FonteResultado {
  rotulo: string;
  url: string;
}

export interface AcaoTemporal {
  /** «Reservar 412 € até 20 de outubro», por exemplo. */
  texto: string;
  prazo?: string;
}

export interface CenarioComparado {
  rotulo: string;
  valor: string;
  /** A diferença face ao cenário principal, já explicada. */
  diferenca: string;
}

export interface ResultadoExplicadoProps {
  /** O que a pessoa quis saber. Vira o cabeçalho. */
  titulo: string;
  /** O número principal, já formatado. */
  valor: string;
  /** Quando o resultado é um intervalo, o seu limite superior. */
  valorMaximo?: string;
  /** «Trabalhador independente», «Rendimento misto»… */
  perfil: string;
  confianca: EstadoConfianca;
  /** Porque é que a confiança é a que é. Obrigatório se não for completa. */
  notaConfianca?: string;

  premissas: readonly Premissa[];
  formula: string;
  arredondamento?: string;
  /** Versão do motor que produziu o número. */
  versaoMotor: string;

  acao?: AcaoTemporal;
  cenarios?: readonly CenarioComparado[];

  fontes: readonly FonteResultado[];
  limites: readonly string[];

  /** Sinais para escolher o próximo passo. Ver `lib/routing.ts`. */
  sinais: SinaisDoUtilizador;
  /** Conteúdo extra, entre os cenários e as fontes. */
  children?: ReactNode;
}

const ROTULO_CONFIANCA: Record<EstadoConfianca, { texto: string; classe: string }> = {
  completo: {
    texto: "Cálculo completo",
    classe: "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint",
  },
  estimado: {
    texto: "Estimativa",
    classe: "bg-alert-bg text-alert-text",
  },
  fora_de_escopo: {
    texto: "Fora do que conseguimos calcular",
    classe: "bg-clay-bg text-clay-text",
  },
};

/** Destinos das rotas. O da FIZ passa pelo redirecionador `/ir/`, que
    gera o click_id e regista o clique DO NOSSO LADO — §8.2: «não depender
    apenas do cookie do parceiro». */
const DESTINO_ROTA: Record<string, { href: string; rotulo: string }> = {
  fiz: { href: "/ir/fiz?s=simulador.plano_acao&v=resultado", rotulo: "Continuar na FIZ" },
  contabilista: { href: "/ferramentas/mapa-contabilistas", rotulo: "Falar com um profissional" },
  plus: { href: "/precos", rotulo: "Guardar e acompanhar" },
  sem_parceiro: { href: "/metodologia", rotulo: "Ver como calculamos" },
};

function Bloco({
  id,
  titulo,
  icone,
  children,
}: {
  id: string;
  titulo: string;
  icone: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-t border-stone-200 px-5 py-5 first:border-t-0 sm:px-6 dark:border-stone-700"
    >
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stone-400">
        <span className="text-brand">{icone}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export default function ResultadoExplicado({
  titulo, valor, valorMaximo, perfil, confianca, notaConfianca,
  premissas, formula, arredondamento, versaoMotor,
  acao, cenarios, fontes, limites, sinais, children,
}: ResultadoExplicadoProps) {
  const rota = escolherRota(sinais);
  const destino = DESTINO_ROTA[rota.rota] ?? DESTINO_ROTA.sem_parceiro;
  const selo = ROTULO_CONFIANCA[confianca];

  return (
    <article
      className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-card dark:border-stone-700 dark:bg-stone-800/50"
      aria-label={titulo}
    >
      {/* 1 · Cabeçalho ─────────────────────────────────────────────── */}
      <header className="px-5 pb-5 pt-6 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${selo.classe}`}>
            {selo.texto}
          </span>
          <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {perfil}
          </span>
          <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            Ano fiscal {FISCAL_YEAR}
          </span>
        </div>

        <h2 className="text-[13px] font-medium text-stone-500 dark:text-stone-400">{titulo}</h2>
        <p className="mt-1 font-display text-4xl font-semibold tabular-nums leading-none text-ink">
          {valor}
          {valorMaximo ? (
            <span className="text-stone-400"> a {valorMaximo}</span>
          ) : null}
        </p>

        {notaConfianca ? (
          <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-stone-500 dark:text-stone-400">
            <Info size={13} className="mt-0.5 shrink-0 text-stone-400" />
            {notaConfianca}
          </p>
        ) : null}
      </header>

      {/* 2 · Como chegámos aqui ────────────────────────────────────── */}
      <Bloco id="como-chegamos" titulo="Como chegámos aqui" icone={<Calculo />}>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {premissas.map((p) => (
            <div key={p.rotulo} className="flex items-baseline justify-between gap-3 border-b border-dashed border-stone-200 pb-1.5 dark:border-stone-700">
              <dt className="text-[12.5px] text-stone-500 dark:text-stone-400">
                {p.rotulo}
                {p.nota ? (
                  <span className="block text-[11px] leading-snug text-stone-400">{p.nota}</span>
                ) : null}
              </dt>
              <dd className="shrink-0 text-[12.5px] font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                {p.valor}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 overflow-x-auto rounded-xl bg-stone-50 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-stone-600 dark:bg-stone-900/60 dark:text-stone-300">
          {formula}
        </p>

        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
          {arredondamento ? `${arredondamento} · ` : ""}
          Motor {versaoMotor} · parâmetros revistos a {DATA_LAST_REVIEW}
        </p>
      </Bloco>

      {/* 3 · O que fazer ───────────────────────────────────────────── */}
      {acao ? (
        <Bloco id="o-que-fazer" titulo="O que fazer a seguir" icone={<Calendar size={13} />}>
          <div className="flex items-start gap-2.5 rounded-xl border border-brand-mint/30 bg-brand-light px-4 py-3 dark:border-brand/30 dark:bg-brand/10">
            <Check size={13} className="mt-0.5 shrink-0 text-brand-dark dark:text-brand-mint" />
            <div>
              <p className="text-[13px] font-semibold leading-relaxed text-brand-dark dark:text-brand-mint">
                {acao.texto}
              </p>
              {acao.prazo ? (
                <p className="mt-0.5 text-[11.5px] text-brand-dark/70 dark:text-brand-mint/70">
                  {acao.prazo}
                </p>
              ) : null}
            </div>
          </div>
          {/* A frase que impede o mal-entendido mais caro possível. */}
          <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
            Isto é uma simulação. Nada foi submetido nem comunicado à Autoridade
            Tributária ou à Segurança Social em teu nome.
          </p>
        </Bloco>
      ) : null}

      {/* 4 · Cenários ──────────────────────────────────────────────── */}
      {cenarios && cenarios.length > 0 ? (
        <Bloco id="cenarios" titulo="E se mudasses uma coisa" icone={<ArrowRight size={13} />}>
          <ul className="space-y-2">
            {cenarios.map((c) => (
              <li
                key={c.rotulo}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl bg-stone-50 px-3.5 py-2.5 dark:bg-stone-900/40"
              >
                <span className="text-[12.5px] font-medium text-stone-600 dark:text-stone-300">
                  {c.rotulo}
                </span>
                <span className="text-[12.5px] font-semibold tabular-nums text-ink">{c.valor}</span>
                <span className="w-full text-[11.5px] leading-snug text-stone-400">
                  {c.diferenca}
                </span>
              </li>
            ))}
          </ul>
        </Bloco>
      ) : null}

      {children ? <div className="border-t border-stone-200 dark:border-stone-700">{children}</div> : null}

      {/* 5 · Fontes e limites ──────────────────────────────────────── */}
      <Bloco id="fontes-e-limites" titulo="Fontes e limites" icone={<Bank size={13} />}>
        <ul className="space-y-1.5">
          {fontes.map((f) => (
            <li key={f.url}>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1.5 text-[12.5px] leading-relaxed text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand-mint"
              >
                <ShieldCheck size={12} className="mt-1 shrink-0 text-brand" />
                {f.rotulo}
              </a>
            </li>
          ))}
        </ul>

        {limites.length > 0 ? (
          <div className="mt-3 rounded-xl border border-alert-border bg-alert-bg px-3.5 py-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-alert-text">
              <Warning size={11} />
              O que este cálculo não cobre
            </p>
            <ul className="space-y-1">
              {limites.map((l) => (
                <li key={l} className="text-[12px] leading-relaxed text-alert-text">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-2.5 text-[11px] text-stone-400">
          Achas que está errado?{" "}
          <a
            href="mailto:recibocerto.pt@gmail.com"
            className="font-medium text-brand hover:underline"
          >
            Diz-nos
          </a>{" "}
          — as correções fiscais passam à frente de tudo.{" "}
          <Link href="/metodologia" className="font-medium text-brand hover:underline">
            Ver metodologia
          </Link>
          .
        </p>
      </Bloco>

      {/* 6 · Próximo passo ─────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-stone-50 px-5 py-5 sm:px-6 dark:border-stone-700 dark:bg-stone-900/40">
        <p className="mb-3 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
          {rota.mensagem}
        </p>

        <Link
          href={destino.href}
          data-rota={rota.rota}
          data-motivo={rota.motivo}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          {...(rota.rota === "fiz" ? { rel: "sponsored nofollow" } : {})}
        >
          {destino.rotulo}
          <ArrowRight size={13} />
        </Link>

        <p className="mt-2.5 text-[11px] leading-relaxed text-stone-400">
          {rota.dados}
          {rota.exigeConsentimento
            ? " Nada é enviado sem que confirmes, e podes retirar o consentimento depois."
            : ""}
        </p>
      </footer>
    </article>
  );
}

/** Ícone de cálculo em linha — evita mais uma entrada no ficheiro de ícones. */
function Calculo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 11h2M12 11h.01M16 11h.01M8 15h2M12 15h.01M16 15h.01M8 19h8" />
    </svg>
  );
}
