"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O HERO DE `/` — a bússola, encenada
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ QUATRO VERSÕES ATÉ AQUI, E O QUE CADA UMA ERROU                     │
//  │                                                                     │
//  │ 1 · O cartão «Sou trabalhador independente / por conta de outrem»   │
//  │     perguntava QUEM ÉS. A NN/g tem cinco razões documentadas        │
//  │     contra navegação por audiência, e três batem em cheio aqui:     │
//  │     metade do público tem salário E recibos verdes; auto-           │
//  │     identificar-se «cria um passo adicional e tira as pessoas do    │
//  │     modo-tarefa»; e quem escolhe um lado fica sem saber o que       │
//  │     havia do outro.                                                 │
//  │                                                                     │
//  │ 2 · Tirá-lo e não pôr nada no lugar foi pior. O cartão estava NA    │
//  │     PÁGINA, no ponto onde a pessoa decide, e ramificava ali. Uma    │
//  │     cápsula de navegação no cabeçalho serve quem já sabe para onde  │
//  │     vai; quem chega a `/` não sabe.                                 │
//  │                                                                     │
//  │ 3 · A bússola, posta por baixo de um hero que falava só de recibos  │
//  │     verdes, era uma lista de cinco perguntas SEM RESPOSTA — cinco   │
//  │     cliques às cegas debaixo de uma promessa que só servia um dos   │
//  │     cinco caminhos.                                                 │
//  │                                                                     │
//  │ 4 · A bússola COMO hero resolveu a leitura e deixou a interação por │
//  │     resolver: o roteiro roubava o painel de volta ao afastar o      │
//  │     rato, o teclado gastava cinco paragens de tabulação sem setas,  │
//  │     quem usa ecrã tátil não conseguia apontar de todo, e a resposta │
//  │     trocava de um fotograma para o outro. É o que esta versão faz.  │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── O que este hero é ────────────────────────────────────────────────
//
//  Cinco perguntas, e a resposta de cada uma ao lado — com o número
//  verdadeiro, antes de qualquer clique. Jakob Nielsen mede em ~10 s o
//  tempo que uma página tem para comunicar a sua proposta de valor; cinco
//  perguntas sozinhas gastavam-nos a prometer que existe uma resposta.
//
//  ── As quatro regras da interação ────────────────────────────────────
//
//   1. **A primeira interação ENTREGA o palco.** Não suspende: entrega.
//      Ver `usePalco.entregar` — uma demonstração que retoma o comando
//      depois de alguém lhe tocar está a discutir com quem a usa.
//   2. **A escolha fica.** Afastar o rato não desfaz nada. O painel só
//      muda quando a pessoa aponta outra coisa.
//   3. **Uma paragem de tabulação, e setas lá dentro.** É o que a APG do
//      W3C manda para um widget composto — e a bússola é um: a seleção
//      comanda um painel de detalhe.
//   4. **No ecrã tátil, o primeiro toque abre e o segundo entra.** É o
//      comportamento nativo do iOS para ligações que dependem de
//      sobrevoo; aqui é explícito, porque o painel nunca está escondido e
//      por isso o Safari não o faria sozinho.
//
//  ── O que continua a funcionar sem nada disto ────────────────────────
//
//  Cinco `<a href>` reais no HTML servido, com o painel da resposta de
//  «Recibos verdes» já resolvido, e a resposta de cada foco em texto para
//  o leitor de ecrã. Sem JavaScript, com movimento reduzido, ou depois de
//  a cena acabar: a mesma página.
// ═══════════════════════════════════════════════════════════════════════

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  FileSign,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import ComoFuncionaModal from "@/components/ComoFuncionaModal";
import { PalcoContexto } from "@/components/palco/atores";
import { Ponteiro, Toque, type LeituraPonteiro } from "@/components/palco/ponteiro";
import { usePalco, type Palco } from "@/components/palco/usePalco";
import type { Ponto } from "@/components/palco/medida";
import { usePerfil, type Perfil } from "@/lib/perfil";
import { scrollToId } from "@/lib/scroll";
import type { RespostaDoFoco } from "@/lib/foco/respostas-servidor";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { ATOS_BUSSOLA, PERCURSO } from "./coreografia-bussola";
import { FOCOS, FOCO_POR_ID, PERFIL_DO_FOCO, hrefDoFoco } from "./focos";

/** `ENTRADA` de `palco/curvas.ts`, na forma que o CSS quer. */
const EASE_ENTRADA = "cubic-bezier(.16,1,.3,1)";

const ID_PAINEL = "bussola-resposta";

/**
 * O tom de uma linha do painel É informação.
 *
 * Escrito à mão e não com as classes `clay-*`/`areia-*`: o painel é
 * sempre escuro, nos dois temas, e essas classes são pares claro/escuro
 * que aqui davam dois resultados diferentes para o mesmo painel.
 */
const TOM_LINHA = {
  sai: "text-[#f0b49b]",
  fica: "text-brand-mint",
  data: "text-[#e7c98e]",
  neutro: "text-white/75",
} as const;

/** De onde veio a mudança — decide se o leitor de ecrã é avisado. */
type Origem = "roteiro" | "pessoa";

export default function HeroBussola({
  respostas,
}: {
  respostas: Record<FocoHomepage, RespostaDoFoco>;
}) {
  const palco = usePalco(ATOS_BUSSOLA);
  const { ato, feito, emCena, estatico, ciclo, entregar } = palco;
  const { definir } = usePerfil();

  // ── Quem manda no painel ───────────────────────────────────────────
  //  Duas fontes, e a segunda vence assim que existir: o roteiro enquanto
  //  ninguém mexeu, e a escolha da pessoa para sempre a partir daí.
  const [escolhido, setEscolhido] = useState<FocoHomepage | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [comoFunciona, setComoFunciona] = useState(false);

  const palcoRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLElement>(null);
  const linhasRef = useRef<Partial<Record<FocoHomepage, HTMLLIElement | null>>>({});
  const realceRef = useRef<HTMLSpanElement>(null);

  // ── O apontador grosseiro ──────────────────────────────────────────
  //  `(hover: hover) and (pointer: fine)` é a pergunta certa, e não «é um
  //  telemóvel?»: um portátil com ecrã tátil tem os dois, um tablet com
  //  rato passa a ter sobrevoo. A pergunta é sobre o APONTADOR, não sobre
  //  a classe de aparelho.
  const [grosseiro, setGrosseiro] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(hover: hover) and (pointer: fine)");
    const aplicar = () => setGrosseiro(!consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  // ── Qual pergunta está aberta ──────────────────────────────────────
  //  Derivado, e não em estado: um `useState` sincronizado por efeito
  //  divergiria do HTML servido no primeiro render, e é exatamente o
  //  tipo de divergência que rebenta a hidratação sem dizer porquê.
  const indiceDoRoteiro = (() => {
    if (estatico) return PERCURSO.length - 1;
    for (let i = ato; i >= 0; i -= 1) {
      // Os atos anteriores já abriram, por definição.
      if (i < ato) return i;
      if (feito("abre")) return i;
    }
    return -1;
  })();
  const focoDoRoteiro = indiceDoRoteiro >= 0 ? PERCURSO[indiceDoRoteiro] : null;
  const aberto = escolhido ?? focoDoRoteiro;
  const resposta = aberto ? respostas[aberto] : null;
  const focoAberto = aberto ? FOCO_POR_ID.get(aberto) : undefined;
  const perfilDoAberto = aberto ? (PERFIL_DO_FOCO[aberto] as Perfil | undefined) : undefined;

  /**
   * Abrir uma pergunta.
   *
   * `entregar()` é a primeira coisa que acontece, e é o que separa esta
   * versão da anterior: o roteiro para AQUI e não volta a mexer no painel.
   */
  const escolher = useCallback(
    (id: FocoHomepage, origem: Origem) => {
      setEscolhido(id);
      entregar();
      if (origem === "pessoa") {
        const r = respostas[id];
        const f = FOCO_POR_ID.get(id);
        // Anunciado só quando foi a pessoa a mexer. Um `aria-live` que
        // dispara com o roteiro fala por cima de tudo durante nove
        // segundos a alguém que nem sequer chegou ao hero.
        setAnuncio(`${f?.label}: ${r.destaque}. ${r.legenda}.`);
      }
    },
    [entregar, respostas],
  );

  // ── O realce que desliza ───────────────────────────────────────────
  //  Um só elemento a mudar de sítio, e não cinco a acender e a apagar.
  //  A diferença é o que separa um indicador de um conjunto de estados:
  //  um indicador que se move diz que há UM sítio de cada vez.
  //
  //  Medido e escrito por `ref`. Uma animação de layout do `motion` faria
  //  o mesmo e está fora de causa — o `LazyMotion` desta aplicação é
  //  `strict` e não carrega `domMax`.
  useEffect(() => {
    const no = realceRef.current;
    if (!no) return;
    const alvo = aberto ? linhasRef.current[aberto] : null;
    if (!alvo) {
      no.style.opacity = "0";
      return;
    }
    const mover = () => {
      no.style.opacity = "1";
      no.style.height = `${alvo.offsetHeight}px`;
      no.style.transform = `translateY(${alvo.offsetTop}px)`;
    };
    mover();
    // A lista muda de altura entre o telemóvel e o desktop, e as linhas
    // reflowem quando as fontes carregam. Sem isto o realce ficava onde
    // a linha estava, e não onde está.
    const observador = new ResizeObserver(mover);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [aberto, ciclo, ato]);

  // ── A mão ──────────────────────────────────────────────────────────
  //  O ponteiro não recebe destinos: recebe uma função que lhe diz, a
  //  cada frame, onde quer estar. Ver o cabeçalho de `palco/ponteiro.tsx`
  //  e `docs/design/roteiro-animacao-ponteiro.md`.
  const feitoRef = useRef(feito);
  feitoRef.current = feito;
  const atoRef = useRef(ato);
  atoRef.current = ato;
  const estaticoRef = useRef(estatico);
  estaticoRef.current = estatico;
  const escolhidoRef = useRef(escolhido);
  escolhidoRef.current = escolhido;

  const lerPonteiro = useCallback((): LeituraPonteiro => {
    const raiz = palcoRef.current;
    if (estaticoRef.current || !raiz) return { ponto: null, premido: false };
    // Entregue o palco, a mão encenada sai. Duas mãos ao mesmo tempo no
    // mesmo sítio não é uma demonstração — é uma disputa.
    if (escolhidoRef.current) return { ponto: null, premido: false };

    const f = feitoRef.current;
    const a = atoRef.current;
    if (a === 2 && f("ponteiroSai")) return { ponto: null, premido: false };

    /** O ponto sobre a seta de uma linha, medido AGORA. */
    const sobre = (id: FocoHomepage | undefined) => {
      const linha = id ? linhasRef.current[id] : null;
      if (!linha) return null;
      const r = linha.getBoundingClientRect();
      const b = raiz.getBoundingClientRect();
      if (r.width === 0) return null;
      // 0,88 da largura: em cima da seta, e não em cima das palavras. Um
      // cursor por cima do texto tapa aquilo que veio mostrar.
      return { x: r.left - b.left + r.width * 0.88, y: r.top - b.top + r.height * 0.5 };
    };

    if (a === 0) {
      if (!f("ponteiroEntra")) return { ponto: null, premido: false };
      if (!f("vaiA")) {
        // Entra em cena PARADO, à direita e a meia altura — `imediato`
        // porque uma entrada não é um percurso. Aparecer já a viajar do
        // canto lê-se como um erro a acontecer devagar.
        const b = raiz.getBoundingClientRect();
        return {
          ponto: { x: b.width * 0.58, y: b.height * 0.22 },
          premido: false,
          imediato: true,
        };
      }
      return { ponto: sobre(PERCURSO[0]), premido: false };
    }

    // Nos atos seguintes a mão espera no alvo anterior até `vaiA`: é o
    // que faz o movimento ler-se como uma decisão, e não como um corte.
    if (!f("vaiA")) return { ponto: sobre(PERCURSO[a - 1]), premido: false };
    return {
      ponto: sobre(PERCURSO[a]),
      premido: a === 2 && f("preme") && !f("solta"),
    };
  }, []);

  // O anel do clique, uma vez só, no ato que clica.
  const [toque, setToque] = useState<Ponto | null>(null);
  useEffect(() => {
    if (estatico || escolhido || ato !== 2 || !feito("preme")) {
      setToque(null);
      return;
    }
    const raiz = palcoRef.current;
    const linha = linhasRef.current[PERCURSO[2]];
    if (!raiz || !linha) return;
    const r = linha.getBoundingClientRect();
    const b = raiz.getBoundingClientRect();
    setToque(
      (atual) => atual ?? { x: r.left - b.left + r.width * 0.88, y: r.top - b.top + r.height * 0.5 },
    );
  }, [ato, ciclo, estatico, escolhido, feito]);

  const acendeu = estatico || Boolean(escolhido) || (ato === 2 && emCena("acende"));

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ UM BEAT SÓ EXISTE DENTRO DO SEU ATO                               │
  // │                                                                   │
  // │ `emCena("p0")` e `emCena("painel")` são beats do PRIMEIRO ato. O  │
  // │ relógio repõe-se a cada ato — é o que faz «ir para o passo 3»     │
  // │ funcionar — e a partir do segundo ato os dois passavam a `false`. │
  // │                                                                   │
  // │ Resultado: as cinco perguntas e o painel inteiro DESAPARECIAM aos │
  // │ 3 s, e o hero ficava uma moldura vazia com uma régua por baixo.   │
  // │ Só se via a olho, e só depois do primeiro ato — que é precisamente│
  // │ o momento em que já ninguém está a olhar para o código.           │
  // └───────────────────────────────────────────────────────────────────┘
  const jaChegou = useCallback(
    (beat: string) => estatico || ato > 0 || emCena(beat),
    [ato, emCena, estatico],
  );

  // ── Teclado: uma paragem de tabulação, setas lá dentro ─────────────
  //  A APG do W3C é explícita — «Tab e Shift+Tab movem-se ENTRE widgets;
  //  as setas tratam da navegação interna». A bússola é um widget: a
  //  seleção comanda um painel de detalhe.
  //
  //  Antes eram cinco paragens sem setas: para passar do hero ao resto
  //  da página gastavam-se cinco Tabs, e a resposta trocava em todas.
  const idComTab = aberto ?? FOCOS[0].id;
  const aoTeclar = useCallback(
    (evento: React.KeyboardEvent, indice: number) => {
      const passo =
        evento.key === "ArrowDown" || evento.key === "ArrowRight"
          ? 1
          : evento.key === "ArrowUp" || evento.key === "ArrowLeft"
            ? -1
            : 0;
      let destino = -1;
      if (passo !== 0) destino = (indice + passo + FOCOS.length) % FOCOS.length;
      else if (evento.key === "Home") destino = 0;
      else if (evento.key === "End") destino = FOCOS.length - 1;
      if (destino < 0) return;
      evento.preventDefault();
      const id = FOCOS[destino].id;
      escolher(id, "pessoa");
      linhasRef.current[id]?.querySelector("a")?.focus();
    },
    [escolher],
  );

  // ── Ecrã tátil: o primeiro toque abre, o segundo entra ─────────────
  const aoClicar = useCallback(
    (evento: React.MouseEvent, id: FocoHomepage) => {
      if (!grosseiro || escolhido === id) return;
      evento.preventDefault();
      escolher(id, "pessoa");
      // A resposta está por baixo da lista neste tamanho de ecrã. Abrir
      // sem a mostrar é abrir para lado nenhum.
      painelRef.current?.scrollIntoView({
        behavior: estatico ? "auto" : "smooth",
        block: "nearest",
      });
    },
    [escolher, escolhido, estatico, grosseiro],
  );

  const aoApontar = useCallback(
    (id: FocoHomepage) => {
      // Num apontador grosseiro, `mouseenter`/`focus` disparam junto com o
      // toque e roubariam o primeiro toque ao `aoClicar`.
      if (grosseiro) return;
      escolher(id, "pessoa");
    },
    [escolher, grosseiro],
  );

  const registar = useCallback(
    (id: FocoHomepage) => (no: HTMLLIElement | null) => {
      linhasRef.current[id] = no;
    },
    [],
  );

  // ── Devolver o palco ───────────────────────────────────────────────
  //  «Rever» e os passos da régua têm de LARGAR a escolha, não só repor
  //  o relógio. Sem isto o roteiro voltava a correr por baixo de um
  //  painel que ficava preso na pergunta escolhida, e a mão encenada
  //  nunca reaparecia — a demonstração andava e não se via.
  const aoRever = useCallback(() => {
    setEscolhido(null);
    setAnuncio("");
    palco.rever();
  }, [palco]);

  const aoIrPara = useCallback(
    (indice: number) => {
      setEscolhido(null);
      setAnuncio("");
      palco.irPara(indice);
    },
    [palco],
  );

  const linhas = useMemo(
    () =>
      FOCOS.map((foco, i) => (
        <Linha
          key={foco.id}
          foco={foco}
          indice={i}
          resposta={respostas[foco.id]}
          entrou={jaChegou(`p${i}`)}
          ativo={aberto === foco.id}
          comTab={idComTab === foco.id}
          grosseiro={grosseiro}
          estatico={estatico}
          registar={registar}
          aoApontar={aoApontar}
          aoClicar={aoClicar}
          aoTeclar={aoTeclar}
        />
      )),
    [
      aberto,
      aoApontar,
      aoClicar,
      aoTeclar,
      estatico,
      grosseiro,
      idComTab,
      jaChegou,
      registar,
      respostas,
    ],
  );

  return (
    <PalcoContexto.Provider value={palco.estadoPalco}>
      <section
        data-hero
        className="grain relative overflow-hidden px-6 pt-6 pb-14 sm:pt-8 lg:pt-10 lg:pb-20"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-brand/12 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-brand-mint/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl">
          {/* ── A promessa ───────────────────────────────────────────
              Oito palavras no título e a proposta de valor por baixo: é
              a forma que a NN/g recomenda, e a mesma do hero anterior,
              que era a melhor coisa que a homepage antiga tinha.

              O que MUDA é o alcance. «Sabe quanto é teu, quanto reservar
              e quando pagar» prometia uma coisa só — a de um dos cinco
              focos — por cima de uma página que agora responde a cinco
              perguntas diferentes. */}
          <div className="max-w-[34rem]">
            <h1 className="font-display display-hero text-balance font-semibold text-ink">
              Sabe <span className="text-brand">o número certo</span> — e porque é que é esse.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-stone-500 sm:text-lg dark:text-stone-400">
              Cinco perguntas de quem trabalha em Portugal. Escolhe a tua — a resposta traz os
              valores de 2026, o artigo que a manda e o dia em que o dinheiro sai da conta.
            </p>
          </div>

          {/* ── O instrumento ────────────────────────────────────────
              As perguntas à esquerda, a resposta à direita. No telemóvel
              empilham-se pela mesma ordem: pergunta, depois resposta. */}
          <div
            ref={palcoRef}
            className="relative mt-8 grid gap-4 sm:mt-10 lg:grid-cols-[1fr_1fr] lg:gap-5"
          >
            <div>
              <h2
                id="bussola-hero-titulo"
                className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400"
              >
                As cinco perguntas
              </h2>

              <ol
                aria-labelledby="bussola-hero-titulo"
                aria-controls={ID_PAINEL}
                className="relative mt-2 overflow-hidden rounded-3xl border border-stone-200/80 bg-white/80 backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-900/70"
              >
                {/* O realce que desliza entre linhas. `aria-hidden`: o
                    estado que ele mostra já está no painel, em texto. */}
                <span
                  ref={realceRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 z-0 border-l-[3px] border-brand bg-brand-light/70 opacity-0 transition-[transform,height,opacity] duration-[380ms] ease-out dark:bg-brand/15"
                />
                {linhas}
              </ol>
            </div>

            {/* ── O painel da resposta ──────────────────────────────
                Escuro nos dois temas, de propósito: é a única superfície
                da página que responde, e uma resposta que se parece com
                a lista que a pediu não se lê como resposta. */}
            <aside
              id={ID_PAINEL}
              ref={painelRef}
              className="relative overflow-hidden rounded-3xl border border-brand-deep/25 bg-[#0c251e] text-white shadow-lift"
              style={{
                opacity: jaChegou("painel") ? 1 : 0,
                transition: estatico ? "none" : `opacity 420ms ${EASE_ENTRADA}`,
              }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="absolute -right-20 -top-16 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
                <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#8b7148]/10 blur-3xl" />
              </div>

              <div className="relative flex h-full flex-col p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {resposta ? `A resposta · ${focoAberto?.label}` : "A resposta"}
                </p>

                {resposta && focoAberto ? (
                  // `key`: remontar é o que faz a animação de chegada
                  // voltar a correr. Sem ela, o conteúdo trocava de um
                  // fotograma para o outro — e um número que substitui
                  // outro sem chegar lê-se como uma falha de desenho.
                  <Resposta
                    key={focoAberto.id}
                    resposta={resposta}
                    ferramenta={focoAberto.ferramenta}
                    ctaPrimario={focoAberto.ctaPrimario}
                    acendeu={acendeu}
                    perfil={perfilDoAberto}
                    aoExperimentar={(p) => {
                      definir(p);
                      scrollToId("calculadora");
                    }}
                  />
                ) : (
                  // O repouso do primeiro ato, antes de a mão apontar.
                  // Não é um estado vazio: é a instrução, e dura 2,4 s.
                  <p className="mt-3 max-w-[24ch] text-balance font-display text-lg font-semibold leading-snug text-white/70">
                    Aponta uma pergunta e a resposta aparece aqui.
                  </p>
                )}
              </div>
            </aside>

            {toque && !estatico ? <Toque key={`${ciclo}-toque`} em={toque} /> : null}
            <Ponteiro ler={lerPonteiro} />
          </div>

          {/* Fora da grelha, e não dentro da coluna das perguntas: ali, no
              telemóvel, a régua da demonstração ficava ENTRE a pergunta e a
              resposta — a interromper a única ideia que este hero tem. */}
          <Controlos
            palco={palco}
            entregue={Boolean(escolhido)}
            aoRever={aoRever}
            aoIrPara={aoIrPara}
          />

          <p className="sr-only" aria-live="polite">
            {anuncio || palco.anuncio}
          </p>

          {/* Os selos, e o «Como funciona» que o hero antigo tinha.
              Aquele hero desapareceu inteiro, e com ele a única porta para
              esta explicação em toda a homepage — tirar a promessa antiga
              era o objetivo; tirar a explicação por arrasto não era. */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-8">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                { Icon: ShieldCheck, texto: "Taxas de 2026 verificadas" },
                { Icon: FileSign, texto: "Base legal em cada cálculo" },
              ].map((selo) => (
                <li key={selo.texto} className="flex items-center gap-2">
                  <selo.Icon size={14} className="flex-shrink-0 text-brand" />
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    {selo.texto}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setComoFunciona(true)}
              aria-haspopup="dialog"
              className="focus-marca inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/70 px-3 text-xs font-semibold text-stone-600 transition-colors hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-800/70 dark:text-stone-300 dark:hover:text-brand"
            >
              Como funciona
            </button>
          </div>

          <ComoFuncionaModal aberto={comoFunciona} onFechar={() => setComoFunciona(false)} />
        </div>
      </section>
    </PalcoContexto.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  UMA LINHA DA BÚSSOLA
//  ---------------------------------------------------------------------
//  `memo` não é otimização prematura: o relógio dos atos muda de estado a
//  cada beat, e há dezenas por ato. Sem isto, as cinco linhas voltavam a
//  desenhar-se dezenas de vezes por segundo durante os nove segundos do
//  roteiro — para nada, porque só uma delas muda de estado de cada vez.
// ═══════════════════════════════════════════════════════════════════════

interface LinhaProps {
  foco: (typeof FOCOS)[number];
  indice: number;
  resposta: RespostaDoFoco;
  entrou: boolean;
  ativo: boolean;
  comTab: boolean;
  grosseiro: boolean;
  estatico: boolean;
  registar: (id: FocoHomepage) => (no: HTMLLIElement | null) => void;
  aoApontar: (id: FocoHomepage) => void;
  aoClicar: (evento: React.MouseEvent, id: FocoHomepage) => void;
  aoTeclar: (evento: React.KeyboardEvent, indice: number) => void;
}

const Linha = memo(function Linha({
  foco,
  indice,
  resposta,
  entrou,
  ativo,
  comTab,
  grosseiro,
  estatico,
  registar,
  aoApontar,
  aoClicar,
  aoTeclar,
}: LinhaProps) {
  const Icon = iconeDe(foco.icone);
  return (
    <li
      ref={registar(foco.id)}
      className="relative z-10 border-b border-stone-200/70 last:border-b-0 dark:border-stone-700/60"
      style={{
        opacity: entrou ? 1 : 0,
        transform: entrou ? "none" : "translateY(10px)",
        // ── Não se aponta para o que ainda está a chegar ──────────────
        //  As cinco linhas entram deslocadas 10 px e sobem durante
        //  420 ms. Enquanto sobem continuavam a receber o rato: apontar
        //  para uma delas a meio da entrada punha o cursor sobre uma
        //  linha e, 100 ms depois, sobre a de baixo — a resposta que
        //  abria não era a da pergunta para onde a pessoa tinha
        //  apontado. Apanhado por uma verificação automática, que é
        //  precisamente onde este tipo de erro de 10 px se apanha.
        pointerEvents: entrou ? undefined : "none",
        transition: estatico
          ? "none"
          : `opacity 420ms ${EASE_ENTRADA}, transform 420ms ${EASE_ENTRADA}`,
      }}
    >
      <Link
        href={hrefDoFoco(foco.id)}
        tabIndex={comTab ? 0 : -1}
        aria-current={ativo ? "true" : undefined}
        onMouseEnter={() => aoApontar(foco.id)}
        onFocus={() => aoApontar(foco.id)}
        onClick={(e) => aoClicar(e, foco.id)}
        onKeyDown={(e) => aoTeclar(e, indice)}
        className="focus-marca group flex min-h-[60px] items-center gap-3 px-3 py-3 no-underline sm:px-4"
      >
        <span
          aria-hidden
          className={`w-6 flex-shrink-0 text-right font-display text-[11px] font-semibold tabular-nums transition-colors ${
            ativo ? "text-brand" : "text-stone-300 dark:text-stone-600"
          }`}
        >
          {String(indice + 1).padStart(2, "0")}
        </span>
        <span
          aria-hidden
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
            ativo
              ? "bg-brand text-white"
              : "bg-stone-100 text-stone-400 group-hover:bg-brand-light group-hover:text-brand dark:bg-stone-800 dark:text-stone-500"
          }`}
        >
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[13px] font-semibold leading-snug transition-colors sm:text-sm ${
              ativo ? "text-brand-dark dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
            }`}
          >
            {foco.pergunta}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            {/* No ecrã tátil, o que o PRÓXIMO toque faz — porque muda. Um
                primeiro toque que não navega, sem nada a dizê-lo, lê-se
                como uma ligação avariada. */}
            {grosseiro && ativo ? "Toca outra vez para abrir" : foco.label}
          </span>
        </span>
        {/* A resposta em texto, para quem não vê o painel. A animação é a
            FORMA de dizer isto — nunca o único sítio onde está dito. */}
        <span className="sr-only">
          {resposta.destaque} — {resposta.legenda}.
        </span>
        {grosseiro && ativo ? (
          <ChevronDown size={14} aria-hidden className="flex-shrink-0 text-brand" />
        ) : (
          <ArrowRight
            size={14}
            aria-hidden
            className={`flex-shrink-0 transition-all group-hover:translate-x-0.5 ${
              ativo ? "text-brand" : "text-stone-300 dark:text-stone-600"
            }`}
          />
        )}
      </Link>
    </li>
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  O CORPO DA RESPOSTA
//  ---------------------------------------------------------------------
//  Componente próprio para que a `key` do pai o remonte a cada troca — é
//  isso que faz a animação de chegada correr outra vez (`.resposta-entra`
//  em `globals.css`, com o desfasamento de `PASSO.uno`).
// ═══════════════════════════════════════════════════════════════════════

function Resposta({
  resposta,
  ferramenta,
  ctaPrimario,
  acendeu,
  perfil,
  aoExperimentar,
}: {
  resposta: RespostaDoFoco;
  ferramenta: string;
  ctaPrimario: string;
  acendeu: boolean;
  perfil?: Perfil;
  aoExperimentar: (p: Perfil) => void;
}) {
  return (
    <div className="resposta-entra flex min-h-0 flex-1 flex-col">
      <p
        // Uma hipótese de negócio tem trinta caracteres de título; um
        // limiar em euros tem nove. O mesmo corpo para os dois deixava
        // um minúsculo e o outro a partir-se em quatro linhas.
        className={`mt-2.5 text-balance font-display font-semibold leading-[1.1] tracking-tight ${
          resposta.destaque.length <= 16
            ? "text-[clamp(1.9rem,5vw,2.6rem)] tabular-nums"
            : "text-[clamp(1.25rem,3vw,1.6rem)]"
        }`}
      >
        {resposta.destaque}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-white/55">{resposta.legenda}</p>

      <ul className="mt-4 space-y-1.5">
        {resposta.linhas.map((linha) => {
          // ── Uma linha com uma FRASE não é uma linha com um montante,
          //    e não pode ser desenhada como tal.
          //
          //  Rótulo à esquerda e valor à direita é o desenho certo para
          //  «Segurança Social · − 299,60 €». Com «Primeiro teste ·
          //  Mapear o processo de cinco empresas sem propor software
          //  nenhum», o valor não encolhe (é `flex-shrink-0`, para os
          //  números nunca se partirem) e passava POR CIMA do rótulo.
          //
          //  Uma frase empilha-se; um montante alinha-se.
          const frase = linha.valor.length > 22;
          return (
            <li
              key={linha.rotulo}
              className={`rounded-xl bg-white/[0.045] px-3 py-2 ${
                frase ? "" : "flex items-baseline justify-between gap-3"
              }`}
            >
              <span className="min-w-0 text-[11px] leading-snug text-white/55">{linha.rotulo}</span>
              <span
                className={`text-[12px] font-semibold ${
                  frase ? "mt-1 block leading-snug" : "flex-shrink-0 text-right tabular-nums"
                } ${TOM_LINHA[linha.tom ?? "neutro"]}`}
              >
                {linha.valor}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-white/40">
        <FileSign size={11} className="mt-px flex-shrink-0" />
        <span className="min-w-0">{resposta.base}</span>
      </p>

      {/* ── As duas saídas ────────────────────────────────────────────
          A ferramenta completa, e — quando existe — a experiência já
          aqui na página.

          A segunda é o que voltou a ligar as duas metades de `/`. O hero
          fala `foco` (no URL); a calculadora, o «Explorar» e o FAQ falam
          `Perfil` (em `localStorage`). Enquanto o hero antigo existiu era
          ele que escrevia o `Perfil` — ao substituí-lo, os dois eixos
          deixaram de se falar, e escolher uma pergunta em cima não mexia
          em nada por baixo.

          Escreve-se no gesto DELIBERADO, e nunca no sobrevoo: passar o
          rato por uma pergunta é ler, não é decidir, e não pode
          reconfigurar uma página inteira duas dobras abaixo. */}
      <div className="mt-4 flex flex-col gap-2 sm:mt-auto">
        <Link
          href={ferramenta}
          className={`focus-marca inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold no-underline transition-all ${
            acendeu
              ? "bg-brand text-white shadow-glow hover:-translate-y-0.5"
              : "bg-white/10 text-white/80 hover:bg-white/15"
          }`}
        >
          <span className="min-w-0 text-center leading-snug">{ctaPrimario}</span>
          <ArrowRight size={14} className="flex-shrink-0" />
        </Link>
        {perfil ? (
          <button
            type="button"
            onClick={() => aoExperimentar(perfil)}
            className="focus-marca inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl border border-white/15 px-4 text-[13px] font-semibold text-white/75 transition-colors hover:border-white/30 hover:text-white"
          >
            <span className="min-w-0 text-center leading-snug">Experimentar já, aqui</span>
            <ChevronDown size={13} className="flex-shrink-0" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  A RÉGUA E OS CONTROLOS
//  ---------------------------------------------------------------------
//  Ao nível do módulo, e não dentro de `HeroBussola`.
//
//  Declarado lá dentro, era um TIPO DE COMPONENTE NOVO a cada render do
//  hero — e o hero renderiza dezenas de vezes por ato. O React
//  desmontava-o e voltava a montá-lo a cada um: a `barraRef` do relógio
//  perdia o elemento a meio (a barra de progresso congelava) e o foco do
//  teclado saltava do botão para o corpo da página a cada beat.
// ═══════════════════════════════════════════════════════════════════════

const Controlos = memo(function Controlos({
  palco: p,
  entregue,
  aoRever,
  aoIrPara,
}: {
  palco: Palco;
  entregue: boolean;
  aoRever: () => void;
  aoIrPara: (indice: number) => void;
}) {
  if (p.estatico) return null;
  return (
    <div className="mt-2.5 flex items-center gap-3 px-1">
      <ol
        className="grid flex-1 gap-1.5"
        style={{ gridTemplateColumns: `repeat(${ATOS_BUSSOLA.length}, minmax(0,1fr))` }}
        aria-label="Etapas da demonstração"
      >
        {ATOS_BUSSOLA.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => aoIrPara(i)}
              aria-current={i === p.ato && !entregue ? "step" : undefined}
              aria-label={`Passo ${i + 1} de ${ATOS_BUSSOLA.length}: ${item.legenda}`}
              className="focus-marca group block min-h-[36px] w-full py-1 text-left"
            >
              <span className="block h-1 overflow-hidden rounded-full bg-stone-200 group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2 dark:bg-stone-700">
                <span
                  ref={i === p.ato ? p.barraRef : undefined}
                  className="block h-full w-full origin-left rounded-full bg-brand"
                  style={{
                    transform: `scaleX(${i < p.ato || (i === p.ato && p.finalizado) ? 1 : 0})`,
                  }}
                />
              </span>
              <span
                className={`mt-1 block truncate text-[9px] font-bold uppercase tracking-wide transition-colors ${
                  i === p.ato && !entregue
                    ? "text-stone-700 dark:text-stone-200"
                    : i < p.ato
                      ? "text-brand"
                      : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {item.rotulo}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {/* Entregue o palco, não há nada para pausar — só para rever. Um
            botão «Pausar» sobre uma cena que já não anda é um controlo
            que mente. */}
        {!p.finalizado && !entregue && (
          <button
            type="button"
            onClick={p.alternarPausa}
            aria-pressed={p.parado}
            aria-label={p.parado ? "Retomar a demonstração" : "Pausar a demonstração"}
            className="focus-marca inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-brand/50 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
          >
            {p.parado ? <Play size={12} /> : <Pause size={12} />}
          </button>
        )}
        <button
          type="button"
          onClick={aoRever}
          aria-label={p.finalizado || entregue ? "Rever a demonstração" : "Recomeçar a demonstração"}
          className="focus-marca inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-brand/50 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
});
