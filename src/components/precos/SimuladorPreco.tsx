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
  avaliarPreenchimento,
  cenarioDeQuery,
  cenarioPorChave,
  precificar,
  type CenarioInicial,
  type ContextoPreco,
} from "@/lib/pricing";
import { registar } from "@/lib/analytics/cliente";
import { gravarContextoPreco, lerEnvelopePreco, limparContextoPreco } from "@/lib/store/preco";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { ArrowLeft, ArrowRight, RotateCcw } from "@/components/ui/Icons";
import CamposPreco from "./CamposPreco";
import ResultadoPreco from "./ResultadoPreco";
import AnuncioResultado from "./AnuncioResultado";
import Pressupostos from "./Pressupostos";
import { Avisos, MemoriaCalculo } from "./MemoriaCalculo";
import { Cenarios, SliderPreco } from "./EQueSe";
import { CENARIOS_INICIAIS_DEF } from "@/lib/pricing";
import type { SeveridadeAviso } from "@/lib/pricing";

/** O que sobe para junto do número e o que fica em baixo como contexto. */
const GRAVES: readonly SeveridadeAviso[] = ["perigo", "atencao"];
const INFORMATIVOS: readonly SeveridadeAviso[] = ["info"];

export default function SimuladorPreco({ cenarioInicial }: { cenarioInicial?: string | null }) {
  const [cenario, setCenario] = useState<CenarioInicial | null>(() => cenarioDeQuery(cenarioInicial));
  const [contexto, setContexto] = useState<ContextoPreco | null>(null);

  // ── O que a pessoa respondeu MESMO ────────────────────────────────
  //  Não é o mesmo que «o campo tem um valor»: todos têm, desde o
  //  primeiro segundo. Só isto distingue «o custo é 0 porque é um
  //  ficheiro» de «o custo é 0 porque ainda não disse», e é dessa
  //  distinção que sai a confiança do resultado. Ver
  //  `lib/pricing/preenchimento.ts`.
  const [respondidos, setRespondidos] = useState<Set<string>>(() => new Set());
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
    const lido = lerEnvelopePreco<ContextoPreco>(1);
    if (lido?.contexto.cenario) {
      setCenario(lido.contexto.cenario);
      setContexto(lido.contexto);
      // O que vem do cofre é trabalho já feito por esta pessoa, não um
      // exemplo nosso. Um cofre da v1 não sabe QUAIS campos foram
      // respondidos — só que houve trabalho —, por isso o resultado
      // apresenta-se como estimativa até a pessoa voltar a tocar neles.
      setRespondidos(new Set(lido.respondidos));
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
    setRespondidos(new Set());
    limparContextoPreco();
    irPara(null, true);
  };

  /**
   * Recomeçar SEM sair do cenário.
   *
   * «Mudar» e «recomeçar» eram a mesma coisa, e não são: quem quer voltar
   * a zero com o mesmo tipo de produto não quer escolher o cenário outra
   * vez — quer o formulário limpo. Ter só o primeiro obrigava a passar
   * pelo seletor para desfazer um engano num campo.
   */
  const recomecar = () => {
    if (!cenario) return;
    setContexto(cenarioPorChave(cenario).contexto());
    setRespondidos(new Set());
  };

  useEffect(() => {
    if (!cenario) return;
    setContexto((atual) => (atual && atual.cenario === cenario ? atual : cenarioPorChave(cenario).contexto()));
  }, [cenario]);

  useEffect(() => {
    // Sem armazenamento a ferramenta continua a funcionar; só não retoma.
    if (contexto) gravarContextoPreco(contexto, [...respondidos]);
  }, [contexto, respondidos]);

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

  // ── A pessoa já personalizou alguma coisa? ─────────────────────────
  //  Sem isto, a ferramenta anunciava «QUANTO DEVES COBRAR 1,09 €» a quem
  //  acabara de escolher «um produto digital» e mais nada. O número saía
  //  inteiro dos valores por omissão do cenário — custo 0 €, margem 70%,
  //  volume 20 — e era apresentado como recomendação.
  //
  //  É o oposto do que este projeto promete («um vazio honesto vale mais do
  //  que um número plausível»): não é uma estimativa com pouca informação, é
  //  um número que a pessoa nunca introduziu, com a autoridade de um
  //  conselho. Enquanto ninguém tocar em nada, o resultado assume-se como
  //  exemplo — e diz-lo.
  //
  //  ⚠️ ISTO JÁ FOI UM BOOLEANO, e um booleano vira-se com uma tecla:
  //  bastava escrever um dígito no volume para o cartão passar de «Um
  //  exemplo, por enquanto» a «QUANTO DEVES COBRAR», por cima de vinte e
  //  cinco pressupostos por confirmar. Agora regista-se QUAL campo foi
  //  respondido, e a confiança sai da lista do que ainda falta.
  const atualizar = (campo: string, patch: (c: ContextoPreco) => void) => {
    setRespondidos((a) => (a.has(campo) ? a : new Set(a).add(campo)));
    setContexto((atual) => {
      if (!atual) return atual;
      const copia = structuredClone(atual);
      patch(copia);
      return copia;
    });
  };

  const resultado = useMemo(() => (contexto ? precificar(contexto) : null), [contexto]);
  const preenchimento = useMemo(
    () => (contexto ? avaliarPreenchimento(contexto, respondidos) : null),
    [contexto, respondidos],
  );

  // ── Passo 1: escolher o cenário ────────────────────────────────────
  if (!cenario || !contexto || !resultado) {
    return <SeletorCenario aoEscolher={escolherCenario} />;
  }

  const definicao = cenarioPorChave(cenario);
  const temFiscalidade = resultado.fiscal.aplicavel;
  const estadoPreenchimento = preenchimento?.estado ?? "exemplo";

  return (
    <div className="space-y-4">
      {/* ── Cenário escolhido ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
        <p className="min-w-0 text-sm">
          <span className="text-stone-500 dark:text-stone-400">Estás a calcular: </span>
          <strong className="text-stone-800 dark:text-stone-100">{definicao.rotulo.toLowerCase()}</strong>
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          {/* «Recomeçar» e «mudar de cenário» eram a mesma coisa, e não
              são: quem se enganou num campo não quer voltar ao seletor —
              quer o formulário limpo, no mesmo cenário. */}
          {respondidos.size > 0 ? (
            <button
              type="button"
              onClick={recomecar}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-stone-500 underline-offset-2 hover:text-brand-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-400 dark:hover:text-brand-mint"
            >
              <RotateCcw size={12} />
              Recomeçar
            </button>
          ) : null}
          <button
            type="button"
            onClick={voltarAoSeletor}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand-dark underline-offset-2 dark:text-brand-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ArrowLeft size={13} />
            Mudar
          </button>
        </div>
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
      {/* PRIMEIRO PERSONALIZA-SE, DEPOIS VÊ-SE O NÚMERO.
          O resultado já esteve à frente de tudo, e isso punha uma
          recomendação por cima de campos que ninguém tinha preenchido. Agora
          a ordem é a da conversa: dizes o essencial, aparece o preço com o
          cursor para o afinar, e só quem quiser mais precisão desce aos
          blocos avançados. */}
      <CamposPreco
        contexto={contexto}
        definicao={definicao}
        atualizar={atualizar}
        resultado={resultado}
        parte="essencial"
      />

      {/* Sem `sticky`, de propósito. O cartão de resultado tem ~830 px de
          altura; com o cursor por baixo, a coluna passa dos 1 200 px e não
          cabe em portátil nenhum. Uma coluna pegajosa mais alta do que a
          janela fica presa com o fundo cortado — e dar-lhe scroll próprio
          transformava metade do ecrã num painel que rouba a roda do rato. */}
      <div className="space-y-4">
        <ResultadoPreco
          resultado={resultado}
          temFiscalidade={temFiscalidade}
          estado={estadoPreenchimento}
          faltam={preenchimento?.faltam.length ?? 0}
        />
        <AnuncioResultado resultado={resultado} exemplo={estadoPreenchimento === "exemplo"} />

        {/* Os valores por omissão, ditos em voz alta e com o caminho para
            os corrigir. `perguntas.ts` promete isto desde o primeiro dia;
            até aqui a promessa não existia no ecrã. */}
        {preenchimento ? <Pressupostos preenchimento={preenchimento} /> : null}

        {/* ── Os avisos graves ficam COLADOS ao número ────────────────
            Estavam todos numa secção única, depois dos campos avançados e
            depois da memória de cálculo: um aviso `perigo` («a este preço
            cada venda tira-te dinheiro») nascia quatro ecrãs abaixo do
            preço a que se refere. Os informativos continuam lá em baixo —
            são contexto, não urgência. ─────────────────────────────── */}
        <Avisos avisos={resultado.avisos} apenas={GRAVES} rotulo="Avisos importantes" />

        {resultado.ok ? <SliderPreco contexto={contexto} resultado={resultado} estado={estadoPreenchimento} /> : null}
      </div>

      <CamposPreco
        contexto={contexto}
        definicao={definicao}
        atualizar={atualizar}
        resultado={resultado}
        parte="avancado"
      />

      <MemoriaCalculo linhas={resultado.explicacao} />

      <Avisos avisos={resultado.avisos} apenas={INFORMATIVOS} rotulo="Notas" />

      {resultado.ok ? <Cenarios contexto={contexto} estado={estadoPreenchimento} /> : null}

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
