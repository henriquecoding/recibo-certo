"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SIMULADOR DE PREÇO — a composição
//  ---------------------------------------------------------------------
//  Este componente não calcula nada. Guarda o `ContextoPreco`, entrega-o ao
//  motor e desenha o que vem de volta. Toda a matemática vive em
//  `lib/pricing` e é testada lá — a mesma separação que salvou os
//  simuladores de IRS quando os motores foram extraídos dos `.tsx`.
//
//  DUAS DECISÕES DE UX QUE VALEM POR TODAS AS OUTRAS:
//
//  ① Primeiro pergunta-se O QUE a pessoa quer definir, não quanto custa.
//    «Um bolo por encomenda» e «um produto para revender no Amazon» são
//    problemas diferentes; perguntar o custo antes de saber qual deles é
//    obriga a pessoa a traduzir a sua vida para o vocabulário da
//    ferramenta. Aqui é a ferramenta que se adapta.
//
//  ② O resultado aparece SEMPRE, desde o primeiro segundo, e vai-se
//    afinando. Não há botão «calcular»: há um número que reage. É o que
//    transforma o preenchimento de um formulário numa conversa.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import {
  cenarioDeQuery,
  cenarioPorChave,
  precificar,
  type CenarioInicial,
  type ContextoPreco,
} from "@/lib/pricing";
import { registar } from "@/lib/analytics/cliente";
import { gravarContextoPreco, lerContextoPreco } from "@/lib/store/preco";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { ArrowLeft, ArrowRight } from "@/components/ui/Icons";
import CamposPreco from "./CamposPreco";
import ResultadoPreco from "./ResultadoPreco";
import { Avisos, MemoriaCalculo } from "./MemoriaCalculo";
import { Cenarios, SliderPreco } from "./EQueSe";
import { CENARIOS_INICIAIS_DEF } from "@/lib/pricing";

export default function SimuladorPreco({ cenarioInicial }: { cenarioInicial?: string | null }) {
  const [cenario, setCenario] = useState<CenarioInicial | null>(() => cenarioDeQuery(cenarioInicial));
  const [contexto, setContexto] = useState<ContextoPreco | null>(null);
  const iniciado = useRef(false);

  // ── Retomar o que ficou por acabar ─────────────────────────────────
  // No cofre local, nunca no servidor: `privacy: "local-only"` no catálogo
  // não é uma etiqueta, é uma promessa que o código tem de cumprir. E é o
  // cofre, não uma chave global — a estrutura de custos de alguém não pode
  // ficar à vista de quem usar o browser a seguir.
  useEffect(() => {
    if (cenario) return;
    const lido = lerContextoPreco<ContextoPreco>(1);
    if (lido?.cenario) {
      setCenario(lido.cenario);
      setContexto(lido);
    }
  }, [cenario]);

  useEffect(() => {
    if (!cenario) return;
    setContexto((atual) => (atual && atual.cenario === cenario ? atual : cenarioPorChave(cenario).contexto()));
  }, [cenario]);

  useEffect(() => {
    // Sem armazenamento a ferramenta continua a funcionar; só não retoma.
    if (contexto) gravarContextoPreco(contexto);
  }, [contexto]);

  useEffect(() => {
    if (!cenario || iniciado.current) return;
    iniciado.current = true;
    registar("simulator_start", {
      tool_id: "calcular-preco",
      scenario_type: cenario,
      entry_page: typeof window === "undefined" ? "" : window.location.pathname,
      user_state: "anonimo",
    });
  }, [cenario]);

  const atualizar = (patch: (c: ContextoPreco) => void) => {
    setContexto((atual) => {
      if (!atual) return atual;
      const copia = structuredClone(atual);
      patch(copia);
      return copia;
    });
  };

  const resultado = useMemo(() => (contexto ? precificar(contexto) : null), [contexto]);

  // ── Passo 1: escolher o cenário ────────────────────────────────────
  if (!cenario || !contexto || !resultado) {
    return <SeletorCenario aoEscolher={setCenario} />;
  }

  const definicao = cenarioPorChave(cenario);
  const temFiscalidade = resultado.fiscal.aplicavel;

  return (
    <div className="space-y-4">
      {/* ── Cenário escolhido ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
        <p className="min-w-0 text-sm">
          <span className="text-stone-500 dark:text-stone-400">Estás a calcular: </span>
          <strong className="text-stone-800 dark:text-stone-100">{definicao.rotulo.toLowerCase()}</strong>
        </p>
        <button
          type="button"
          onClick={() => {
            setCenario(null);
            setContexto(null);
          }}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-dark underline-offset-2 dark:text-brand-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft size={13} />
          Mudar
        </button>
      </div>

      {/* ── Resultado primeiro, em mobile ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="order-2 space-y-4 lg:order-1">
          <CamposPreco contexto={contexto} definicao={definicao} atualizar={atualizar} />
        </div>

        <div className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6">
          <ResultadoPreco resultado={resultado} temFiscalidade={temFiscalidade} />
          <MemoriaCalculo linhas={resultado.explicacao} />
        </div>
      </div>

      {resultado.ok ? (
        <>
          <SliderPreco contexto={contexto} resultado={resultado} />
          <Cenarios contexto={contexto} />
        </>
      ) : null}

      <Avisos avisos={resultado.avisos} />

      <p className="px-1 pt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
        Estimativa com base no que introduziste. Não substitui a análise de um contabilista certificado, e a decisão de
        preço é sempre tua — a ferramenta mostra o que as contas aguentam, não o que o mercado aceita.
      </p>
    </div>
  );
}

// ─── Passo 1 ───────────────────────────────────────────────────────────

function SeletorCenario({ aoEscolher }: { aoEscolher: (c: CenarioInicial) => void }) {
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Escolher o que queres definir"
    >
      <h2 className="font-display mb-1 text-xl font-semibold text-stone-800 dark:text-stone-100">
        O que queres definir?
      </h2>
      <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
        Escolhe o que se parece mais com o teu caso. As perguntas seguintes adaptam-se — não vais preencher campos que
        não te dizem respeito.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {CENARIOS_INICIAIS_DEF.map((c) => {
          const Icone = iconeDe(c.icone);
          return (
            <li key={c.chave}>
              <button
                type="button"
                onClick={() => aoEscolher(c.chave)}
                className="group flex w-full items-start gap-3 rounded-4xl border border-stone-100 bg-white p-4 text-left shadow-card transition-all hover:border-brand hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                  <Icone size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{c.rotulo}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                    {c.exemplo}
                  </span>
                </span>
                <ArrowRight
                  size={15}
                  className="mt-1 flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </m.section>
  );
}
