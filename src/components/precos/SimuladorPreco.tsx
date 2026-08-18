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
import { gravarContextoPreco, lerContextoPreco, limparContextoPreco } from "@/lib/store/preco";
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
  const retomou = useRef(false);

  // ── Retomar o que ficou por acabar ─────────────────────────────────
  // No cofre local, nunca no servidor: `privacy: "local-only"` no catálogo
  // não é uma etiqueta, é uma promessa que o código tem de cumprir. E é o
  // cofre, não uma chave global — a estrutura de custos de alguém não pode
  // ficar à vista de quem usar o browser a seguir.
  //
  // ⚠️ RETOMA-SE UMA VEZ, À ENTRADA — e nunca mais.
  // Isto já esteve preso a `[cenario]` sem guarda, e o efeito era este: ao
  // carregar em «Mudar», o cenário passava a `null`, o efeito voltava a
  // correr, lia do cofre o contexto que acabara de ser gravado e repunha
  // tudo no mesmo sítio. Para quem lá estava, o botão simplesmente não
  // fazia nada. Retomar é uma decisão de ENTRADA, não uma reação a ficar
  // sem cenário: quem sai de um cenário está a sair dele de propósito.
  useEffect(() => {
    if (retomou.current) return;
    retomou.current = true;
    if (cenario) return;
    const lido = lerContextoPreco<ContextoPreco>(1);
    if (lido?.cenario) {
      setCenario(lido.cenario);
      setContexto(lido);
    }
  }, [cenario]);

  // ── O cenário vive na URL ──────────────────────────────────────────
  // Sem isto, escolher um cenário não mexia no histórico — e o «voltar» do
  // telemóvel (botão ou gesto) SAÍA da ferramenta em vez de recuar um
  // passo. A página já aceita `?c=`; passa a escrevê-lo também.
  const irPara = (destino: CenarioInicial | null, empurrar: boolean) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (destino) url.searchParams.set("c", destino);
    else url.searchParams.delete("c");
    const alvo = `${url.pathname}${url.search}${url.hash}`;
    if (empurrar) window.history.pushState({ c: destino }, "", alvo);
    else window.history.replaceState({ c: destino }, "", alvo);
  };

  // O «voltar» do browser passa a recuar dentro da ferramenta.
  useEffect(() => {
    const aoVoltar = () => {
      const daUrl = cenarioDeQuery(new URLSearchParams(window.location.search).get("c"));
      setCenario(daUrl);
      if (!daUrl) setContexto(null);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  /** Escolher um cenário: avança um passo no histórico. */
  const escolherCenario = (c: CenarioInicial) => {
    setCenario(c);
    irPara(c, true);
  };

  /**
   * Voltar ao seletor. Limpa o cofre de propósito: quem carrega em «Mudar»
   * está a abandonar aquele cenário, e reabrir a página não lho pode
   * ressuscitar por baixo.
   */
  const voltarAoSeletor = () => {
    setCenario(null);
    setContexto(null);
    limparContextoPreco();
    irPara(null, true);
  };

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
    return <SeletorCenario aoEscolher={escolherCenario} />;
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
          onClick={voltarAoSeletor}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-dark underline-offset-2 dark:text-brand-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft size={13} />
          Mudar
        </button>
      </div>

      {/* ── O preço, e a maneira de lhe mexer, ficam juntos e em cima ──
          O slider já esteve depois de TODOS os campos: em mobile nascia a
          3 415 px do topo, quatro ecrãs abaixo do número que ele serve
          para afinar. Quem queria experimentar outro preço tinha de passar
          por onze secções de formulário para lá chegar.

          Passa a viver ao lado do resultado, porque é o mesmo gesto: ver
          quanto dá e experimentar outra coisa. A memória de cálculo desce
          para debaixo dos campos — é para conferir depois, não para
          atravessar antes. ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="order-2 space-y-4 lg:order-1">
          <CamposPreco contexto={contexto} definicao={definicao} atualizar={atualizar} />
          <MemoriaCalculo linhas={resultado.explicacao} />
        </div>

        {/* Sem `sticky`, de propósito. O cartão de resultado tem ~830 px de
            altura; com o slider por baixo, a coluna passa dos 1 200 px e não
            cabe em portátil nenhum. Uma coluna pegajosa mais alta do que a
            janela fica presa com o fundo cortado — e a alternativa (dar-lhe
            scroll próprio) transforma metade do ecrã num painel que rouba a
            roda do rato. Aqui a coluna corre com a página: o preço e o
            cursor estão no topo dela, que é o que se pediu, e nada fica
            fora de alcance. */}
        <div className="order-1 space-y-4 lg:order-2">
          <ResultadoPreco resultado={resultado} temFiscalidade={temFiscalidade} />
          {resultado.ok ? <SliderPreco contexto={contexto} resultado={resultado} /> : null}
        </div>
      </div>

      <Avisos avisos={resultado.avisos} />

      {resultado.ok ? <Cenarios contexto={contexto} /> : null}

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
