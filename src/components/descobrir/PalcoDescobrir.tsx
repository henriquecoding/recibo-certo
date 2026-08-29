"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "@/components/palco/motion-lite";
import {
  ArrowRight,
  Check,
  Close,
  Filter,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkle,
  Target,
} from "@/components/ui/Icons";
import {
  AnelImpactoDescobrir,
  EstadoPalcoDescobrir,
  FichaDescobrir,
  type FichaDescobrirEmCena,
  type TomFichaDescobrir,
} from "./atores";
import {
  ASSENTA,
  ATOS_DESCOBRIR,
  DUR,
  ENTRADA,
  ULTIMO_ATO_DESCOBRIR,
  medir,
  useCoreografiaDescobrir,
  type Ponto,
} from "./coreografia";
import type { ExemploDescoberta } from "./tipos";
import { useRelogioDeCena } from "@/components/palco/frame";

const CONTEXTO = [
  { id: "competencia", beat: "enviaCompetencia", curto: "Organizar e executar" },
  { id: "dados", beat: "enviaDados", curto: "Trabalhar com dados" },
  { id: "tempo", beat: "enviaTempo", curto: "Part-time" },
] as const;

const FRONTEIRAS = [
  {
    id: "stock",
    beat: "enviaStock",
    curto: "Sem stock",
    alvo: "Operação com stock e espaço",
  },
  {
    id: "disponibilidade",
    beat: "enviaDisponibilidade",
    curto: "Sem presença contínua",
    alvo: "Disponibilidade permanente",
  },
  {
    id: "equipa",
    beat: "enviaEquipa",
    curto: "Operação a solo",
    alvo: "Equipa obrigatória no arranque",
  },
] as const;

interface Impacto {
  id: string;
  em: Ponto;
  tom: TomFichaDescobrir;
}

function marcaDeEstado(pronto: boolean) {
  return pronto
    ? "border-brand-mint/60 bg-brand/20 text-brand-mint"
    : "border-white/10 bg-white/[.035] text-white/35";
}


// ═══════════════════════════════════════════════════════════════════════
//  O PAPEL — o cartão da hipótese, e porque nenhuma cor dele tem `dark:`
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ 1,09:1 — O TÍTULO ERA INVISÍVEL NO MODO ESCURO                      │
//  │                                                                     │
//  │ O cartão tinha `bg-[#f8fbf8]`: um LITERAL, que nenhuma camada de    │
//  │ tema remapeia. Mas o texto lá dentro usava `text-ink` e             │
//  │ `text-stone-600`, que o `.dark` de `globals.css` inverte para tons  │
//  │ CLAROS — porque assume que uma superfície escura está por baixo.    │
//  │                                                                     │
//  │ As duas metades discordavam: fundo branco fixo, texto a ficar       │
//  │ branco. Medido no browser, no escuro:                               │
//  │                                                                     │
//  │   título .................. 1,09:1   ← ilegível                     │
//  │   «Mapear o processo…» .... 1,53:1                                  │
//  │   «O que a faria falhar» .. 1,63:1                                  │
//  │   «Hipótese composta» ..... 2,00:1                                  │
//  │                                                                     │
//  │ Os únicos elementos que sobreviviam eram os dois chips — porque     │
//  │ têm fundo PRÓPRIO (`bg-brand-light`, `bg-stone-100`), que a mesma   │
//  │ camada remapeia, e por isso fundo e texto viravam juntos.           │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  A regra que fica, e que vale para todo o palco: **este palco é escuro
//  nos DOIS temas** (`bg-[#0c251e]`, ver a moldura). Uma superfície que
//  não muda com o tema não pode levar cores que mudam. Ou tudo literal,
//  ou tudo do tema — misturar é o defeito.
//
//  É a mesma disciplina do `TINTA` no palco da Empresa, pela mesma razão.
//  No modo claro nada muda: os valores são exatamente os que o tema já
//  resolvia (medido, 5,46:1 a 16,7:1, tudo acima de AA).
const PAPEL = {
  fundo: "bg-[#F8FBF8]",
  halo: "bg-[#E1F5EE]",
  /** `ink` — 16,7:1 sobre o papel. */
  titulo: "text-[#1A1A17]",
  /** `stone-600` — 7,3:1. */
  corpo: "text-[#57534E]",
  /** O verde da marca — 5,5:1. */
  marca: "text-[#177E5E]",
  risco: "border-[#E7E5DE]",
  chipMarca: "bg-[#E1F5EE] text-[#0F6E56]",
  chipNeutro: "bg-[#F1EFE7] text-[#57534E]",
  aviso: "border-[#E6C5B7] bg-[#F6E7E0]",
  avisoTitulo: "text-[#97553C]",
  avisoCorpo: "text-[#5F5650]",
} as const;

export default function PalcoDescobrir({ exemplo }: { exemplo: ExemploDescoberta }) {
  const reduz = useReducedMotion();
  const [montado, setMontado] = useState(false);
  // O HTML servido contém o resultado completo. Só depois da montagem a cena
  // rebobina — sem JavaScript e com movimento reduzido não se perde conteúdo.
  const [ato, setAto] = useState(ULTIMO_ATO_DESCOBRIR);
  const [parado, setParado] = useState(true);
  const [finalizado, setFinalizado] = useState(true);
  const [ciclo, setCiclo] = useState(0);
  const [anuncioManual, setAnuncioManual] = useState("");
  const [fichas, setFichas] = useState<FichaDescobrirEmCena[]>([]);
  const [chegadas, setChegadas] = useState<ReadonlySet<string>>(new Set());
  const [impactos, setImpactos] = useState<Impacto[]>([]);

  const palcoRef = useRef<HTMLDivElement>(null);
  const origemCompetenciaRef = useRef<HTMLSpanElement>(null);
  const origemDadosRef = useRef<HTMLSpanElement>(null);
  const origemTempoRef = useRef<HTMLSpanElement>(null);
  const alvoCompetenciaRef = useRef<HTMLSpanElement>(null);
  const alvoDadosRef = useRef<HTMLSpanElement>(null);
  const alvoTempoRef = useRef<HTMLSpanElement>(null);
  const origemStockRef = useRef<HTMLSpanElement>(null);
  const origemDisponibilidadeRef = useRef<HTMLSpanElement>(null);
  const origemEquipaRef = useRef<HTMLSpanElement>(null);
  const alvoStockRef = useRef<HTMLDivElement>(null);
  const alvoDisponibilidadeRef = useRef<HTMLDivElement>(null);
  const alvoEquipaRef = useRef<HTMLDivElement>(null);
  const origemFonteRef = useRef<HTMLSpanElement>(null);
  const origemProvaRef = useRef<HTMLSpanElement>(null);
  const alvoFonteRef = useRef<HTMLDivElement>(null);
  const alvoProvaRef = useRef<HTMLDivElement>(null);
  const sobreviventeRef = useRef<HTMLDivElement>(null);
  const saidaRef = useRef<HTMLDivElement>(null);
  const lancadasRef = useRef(new Set<string>());

  useEffect(() => {
    const reduzAgora = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMontado(true);
    if (reduzAgora) {
      setAto(ULTIMO_ATO_DESCOBRIR);
      setParado(true);
      setFinalizado(true);
      return;
    }
    setAto(0);
    setParado(false);
    setFinalizado(false);
    setCiclo((atual) => atual + 1);
  }, []);

  useEffect(() => {
    if (!reduz) return;
    setAto(ULTIMO_ATO_DESCOBRIR);
    setParado(true);
    setFinalizado(true);
  }, [reduz]);

  const estatico = !montado || Boolean(reduz);
  const relogioDeCena = useRelogioDeCena({ parado, estatico, alvo: palcoRef });

  const terminarAto = useCallback(() => {
    if (ato < ULTIMO_ATO_DESCOBRIR) {
      setAto(ato + 1);
      return;
    }
    setFinalizado(true);
    setParado(true);
  }, [ato]);

  const { feito, barraRef } = useCoreografiaDescobrir({
    atos: ATOS_DESCOBRIR,
    ato,
    ciclo,
    estatico,
    relogioDeCena,
    aoTerminarAto: terminarAto,
  });

  useEffect(() => {
    lancadasRef.current.clear();
    setFichas([]);
    setChegadas(new Set());
    setImpactos([]);
  }, [ato, ciclo]);

  const aoChegar = useCallback((ficha: FichaDescobrirEmCena) => {
    setChegadas((atuais) => new Set([...atuais, ficha.id]));
    setImpactos((atuais) => [
      ...atuais,
      { id: ficha.id, em: ficha.destino, tom: ficha.tom },
    ]);
  }, []);

  const aoSair = useCallback((id: string) => {
    setFichas((atuais) => atuais.filter((ficha) => ficha.id !== id));
  }, []);

  useEffect(() => {
    if (estatico) return;

    const lancar = ({
      id,
      beat,
      origem,
      destino,
      rotulo,
      tom,
      duracao,
    }: {
      id: string;
      beat: string;
      origem: Element | null;
      destino: Element | null;
      rotulo: string;
      tom: TomFichaDescobrir;
      duracao?: number;
    }) => {
      if (!feito(beat) || lancadasRef.current.has(id)) return;
      const pontoOrigem = medir(origem, palcoRef.current);
      const pontoDestino = medir(destino, palcoRef.current);
      if (!pontoOrigem || !pontoDestino) return;
      lancadasRef.current.add(id);
      setFichas((atuais) => [
        ...atuais,
        {
          id,
          origem: pontoOrigem,
          destino: pontoDestino,
          rotulo,
          tom,
          // A mesa é larga e as fichas atravessam zonas inteiras: a
          // distância pede o degrau AMPLO da escala, não o curto. A mesma
          // duração numa distância maior lê-se como mais depressa, e é a
          // velocidade que o olho compara — não o número de milissegundos.
          duracao: duracao ?? DUR.viagemAmpla,
        },
      ]);
    };

    if (ato === 0) {
      lancar({
        id: "contexto-competencia",
        beat: "enviaCompetencia",
        origem: origemCompetenciaRef.current,
        destino: alvoCompetenciaRef.current,
        rotulo: exemplo.competencia,
        tom: "contexto",
      });
      lancar({
        id: "contexto-dados",
        beat: "enviaDados",
        origem: origemDadosRef.current,
        destino: alvoDadosRef.current,
        rotulo: "Trabalhar com dados",
        tom: "contexto",
      });
      lancar({
        id: "contexto-tempo",
        beat: "enviaTempo",
        origem: origemTempoRef.current,
        destino: alvoTempoRef.current,
        rotulo: "Part-time",
        tom: "contexto",
      });
    }

    if (ato === 1) {
      lancar({
        id: "fronteira-stock",
        beat: "enviaStock",
        origem: origemStockRef.current,
        destino: alvoStockRef.current,
        rotulo: "Sem stock",
        tom: "fronteira",
      });
      lancar({
        id: "fronteira-disponibilidade",
        beat: "enviaDisponibilidade",
        origem: origemDisponibilidadeRef.current,
        destino: alvoDisponibilidadeRef.current,
        rotulo: "Sem presença contínua",
        tom: "fronteira",
      });
      lancar({
        id: "fronteira-equipa",
        beat: "enviaEquipa",
        origem: origemEquipaRef.current,
        destino: alvoEquipaRef.current,
        rotulo: "Operação a solo",
        tom: "fronteira",
      });
    }

    if (ato === 2) {
      lancar({
        id: "evidencia-fonte",
        beat: "enviaFonte",
        origem: origemFonteRef.current,
        destino: alvoFonteRef.current,
        rotulo: "INE · Eurostat",
        tom: "fonte",
      });
      lancar({
        id: "evidencia-prova",
        beat: "enviaProva",
        origem: origemProvaRef.current,
        destino: alvoProvaRef.current,
        rotulo: "Piloto local",
        tom: "prova",
      });
    }

    if (ato === 3) {
      lancar({
        id: "hipotese-final",
        beat: "enviaHipotese",
        origem: sobreviventeRef.current,
        destino: saidaRef.current,
        rotulo: "Hipótese testável",
        tom: "hipotese",
        duracao: DUR.viagemLonga,
      });
    }
  }, [ato, estatico, exemplo.competencia, feito]);

  const chegou = (id: string, atoConcluido: number) =>
    estatico || ato > atoConcluido || chegadas.has(id);

  const contextoPronto = CONTEXTO.every((item) =>
    chegou(`contexto-${item.id}`, 0),
  );
  const stockFora = chegou("fronteira-stock", 1);
  const disponibilidadeFora = chegou("fronteira-disponibilidade", 1);
  const equipaFora = chegou("fronteira-equipa", 1);
  const fronteirasProntas = stockFora && disponibilidadeFora && equipaFora;
  const fonteChegou = chegou("evidencia-fonte", 2);
  const provaChegou = chegou("evidencia-prova", 2);
  const evidenciaPronta = fonteChegou && provaChegou;
  const hipoteseChegou = estatico || chegadas.has("hipotese-final");
  // `preparaHipotese` era um beat morto: disparava aos 0 ms do quarto acto e
  // nada no ecrã reagia. Passa a ser o que o nome já dizia — a antecipação.
  // O cartão levanta-se 360 ms antes de a ficha partir, e é por isso que a
  // partida se lê como consequência e não como aparição.
  const preparaEntrega = !estatico && ato === 3 && feito("preparaHipotese");
  const mostraModelo = estatico || (ato === 3 && feito("mostraModelo"));
  const mostraTeste = estatico || (ato === 3 && feito("mostraTeste"));
  const mostraCriterio = estatico || (ato === 3 && feito("mostraCriterio"));
  const concluiu = estatico || (ato === 3 && feito("conclui"));

  const irPara = (indice: number) => {
    setAnuncioManual(
      `Passo ${indice + 1} de ${ATOS_DESCOBRIR.length}: ${ATOS_DESCOBRIR[indice]?.legenda}.`,
    );
    setAto(indice);
    setParado(false);
    setFinalizado(false);
    setCiclo((atual) => atual + 1);
  };

  const rever = () => {
    setAnuncioManual("Demonstração reiniciada no primeiro passo: ler o contexto.");
    setAto(0);
    setParado(false);
    setFinalizado(false);
    setCiclo((atual) => atual + 1);
  };

  const transicao = estatico
    ? { duration: 0 }
    : { duration: DUR.entrada / 1000, ease: ENTRADA };

  const estadoPalco = useMemo(
    // `imediato` é do contexto partilhado e serve os contadores durante um
    // arrasto. Esta cena não tem nada arrastável, por isso é sempre falso —
    // mas o contexto é um só, e o campo existe.
    () => ({
      parado: parado || estatico,
      imediato: false,
      estatico,
      relogioDeCena,
    }),
    [estatico, parado, relogioDeCena],
  );

  const tituloEntrada = [
    "O que trazes",
    "O que não pode acontecer",
    "O que se sabe",
    // O último ato deixou de resumir e passou a acumular: a coluna guarda
    // tudo o que entrou, e o título tem de dizer isso. «O que segue para
    // teste» descrevia o cartão-resumo que aqui estava.
    "Tudo o que entrou",
  ][ato];

  return (
    <EstadoPalcoDescobrir.Provider value={estadoPalco}>
      <section
        data-palco="descobrir"
        aria-labelledby="palco-descobrir-titulo"
        aria-describedby="palco-descobrir-resumo"
        className="relative overflow-hidden rounded-[2rem] border border-brand-deep/20 bg-[#0c251e] text-white shadow-lift sm:rounded-[2.5rem]"
      >
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 flex-shrink-0 rounded-full transition-colors ${
                finalizado || estatico ? "bg-brand-mint" : parado ? "bg-[#e7c98e]" : "bg-brand-mint"
              }`}
            />
            <div className="min-w-0">
              <h2 id="palco-descobrir-titulo" className="truncate text-[11px] font-bold uppercase tracking-[.16em] text-white">
                Mesa de decisão
              </h2>
              {/* Sem `truncate` — a legenda do ato quebra em vez de ser
                  cortada. A 320 px «Eliminar padrões incompatíveis a…»
                  transbordava 50 px, e uma legenda com reticências não
                  diz o que o ato faz. */}
              <p className="mt-0.5 text-[10px] leading-snug text-white/45">
                {finalizado || estatico
                  ? "Demonstração concluída"
                  : parado
                    ? "Demonstração em pausa"
                    : ATOS_DESCOBRIR[ato]?.legenda}
              </p>
            </div>
          </div>

          {!estatico && (
            <div className="flex items-center gap-2">
              {!finalizado && (
                <button
                  type="button"
                  onClick={() => setParado((valor) => !valor)}
                  aria-pressed={parado}
                  className="focus-marca inline-flex min-h-[36px] items-center gap-2 rounded-full border border-white/15 px-3 text-[10px] font-semibold text-white/75 transition-colors hover:border-brand-mint/60 hover:text-white"
                >
                  {parado ? <Play size={12} /> : <Pause size={12} />}
                  {parado ? "Retomar" : "Pausar"}
                </button>
              )}
              <button
                type="button"
                onClick={rever}
                className="focus-marca inline-flex min-h-[36px] items-center gap-2 rounded-full border border-white/15 px-3 text-[10px] font-semibold text-white/75 transition-colors hover:border-brand-mint/60 hover:text-white"
              >
                <RotateCcw size={12} />
                {finalizado ? "Rever" : "Recomeçar"}
              </button>
            </div>
          )}
        </div>

        <p id="palco-descobrir-resumo" className="sr-only">
          O motor lê o contexto, aplica fronteiras, separa evidência de lacunas e só depois compõe uma hipótese com um teste que a pode refutar.
        </p>
        <ol className="sr-only">
          <li>Contexto: competências, trabalho com dados e disponibilidade parcial entram sem definir uma identidade exclusiva.</li>
          <li>Fronteiras: operações com stock, presença contínua ou equipa obrigatória são retiradas quando não cabem.</li>
          <li>Evidência: INE e Eurostat descrevem contexto; oferta local e vontade de pagar continuam por confirmar através de prova local.</li>
          <li>
            Hipótese: {exemplo.titulo}. Modelo: {exemplo.modelo}.
            Primeiro teste: {exemplo.primeiroTeste} Critério de rejeição: {exemplo.testeDeFalsificacao}
          </li>
        </ol>
        <p className="sr-only" aria-live="polite">{anuncioManual}</p>

        <div ref={palcoRef} className="relative px-3 py-3 sm:px-5 sm:py-5">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="absolute -left-28 top-12 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-60 w-60 rounded-full bg-[#8b7148]/10 blur-3xl" />
          </div>

          <div aria-hidden className="relative grid gap-3 md:grid-cols-[.82fr_1.18fr] lg:grid-cols-[.82fr_1.3fr_.95fr]">
            {/* Entrada: o conteúdo muda, mas a bandeja e a sua posição ficam. */}
            {/* `flex flex-col` para o último acto ter onde se distribuir: a
                grelha estica esta coluna à altura da mais alta, e o conteúdo
                acabava 75 px acima do fundo — medido, não estimado. Isso não
                se resolve com enchimento, resolve-se deixando o que já lá
                está ocupar o espaço que a grelha lhe deu. */}
            <div className="relative flex min-h-[178px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[.045] p-4 backdrop-blur-sm md:min-h-[360px] lg:min-h-[410px]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[.17em] text-white/35">Entrada · 01</div>
                  <div className="mt-1 text-xs font-semibold text-white/80">{tituloEntrada}</div>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/10 text-brand-mint">
                  {ato === 0 ? <Target size={14} /> : ato === 1 ? <Filter size={14} /> : ato === 2 ? <Search size={14} /> : <Sparkle size={14} />}
                </span>
              </div>

              {/* A entrada nova monta logo no início do acto. Em `wait`, o
                  cartão anterior demorava 420 ms a sair e a primeira ficha
                  tentava medir uma origem que ainda não existia. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {ato === 0 && (
                  <m.div key="contexto" initial={estatico ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={transicao} className="mt-4 space-y-2">
                    <span ref={origemCompetenciaRef} className="flex min-h-[40px] items-center justify-between gap-2 rounded-2xl border border-brand-mint/25 bg-brand/10 px-3 text-[11px] text-white/80">
                      <span className="truncate">{exemplo.competencia}</span><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-mint" />
                    </span>
                    <span ref={origemDadosRef} className="flex min-h-[40px] items-center justify-between gap-2 rounded-2xl border border-brand-mint/25 bg-brand/10 px-3 text-[11px] text-white/80">
                      <span>Trabalhar com dados</span><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-mint" />
                    </span>
                    <span ref={origemTempoRef} className="flex min-h-[40px] items-center justify-between gap-2 rounded-2xl border border-brand-mint/25 bg-brand/10 px-3 text-[11px] text-white/80">
                      <span>Part-time</span><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-mint" />
                    </span>
                    <p className="pt-1 text-[10px] leading-relaxed text-white/40">Contexto, não destino. Nenhuma resposta isolada escolhe um negócio.</p>
                  </m.div>
                )}

                {ato === 1 && (
                  <m.div key="fronteiras" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={transicao} className="mt-4 space-y-2">
                    <span ref={origemStockRef} className="flex min-h-[42px] items-center justify-between gap-2 rounded-2xl border border-[#e7c98e]/25 bg-[#e7c98e]/10 px-3 text-[11px] text-white/80"><span>Sem stock nem espaço</span><Filter size={12} className="text-[#e7c98e]" /></span>
                    <span ref={origemDisponibilidadeRef} className="flex min-h-[42px] items-center justify-between gap-2 rounded-2xl border border-[#e7c98e]/25 bg-[#e7c98e]/10 px-3 text-[11px] text-white/80"><span>Só algumas horas</span><Filter size={12} className="text-[#e7c98e]" /></span>
                    <span ref={origemEquipaRef} className="flex min-h-[42px] items-center justify-between gap-2 rounded-2xl border border-[#e7c98e]/25 bg-[#e7c98e]/10 px-3 text-[11px] text-white/80"><span>Operação a solo</span><Filter size={12} className="text-[#e7c98e]" /></span>
                    <p className="pt-1 text-[10px] leading-relaxed text-white/40">Uma fronteira elimina; uma preferência apenas reordena.</p>
                  </m.div>
                )}

                {ato === 2 && (
                  <m.div key="evidencia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={transicao} className="mt-4 space-y-3">
                    <span ref={origemFonteRef} className="block rounded-2xl border border-[#9fc8e7]/25 bg-[#9fc8e7]/10 p-3">
                      <span className="block text-[9px] font-bold uppercase tracking-wide text-[#a9d5f3]">Fonte pública</span>
                      <span className="mt-1.5 flex items-center justify-between text-[11px] text-white/80">INE · Eurostat <ShieldCheck size={12} className="text-[#a9d5f3]" /></span>
                    </span>
                    <span ref={origemProvaRef} className="block rounded-2xl border border-clay-border/35 bg-clay-bg/10 p-3">
                      <span className="block text-[9px] font-bold uppercase tracking-wide text-[#e7b59f]">Prova ainda necessária</span>
                      <span className="mt-1.5 flex items-center justify-between text-[11px] text-white/80">Piloto local <Target size={12} className="text-[#e7b59f]" /></span>
                    </span>
                    <p className="text-[10px] leading-relaxed text-white/40">Uma fonte descreve o contexto. Um piloto testa a compra.</p>
                  </m.div>
                )}

                {/* ┌───────────────────────────────────────────────────┐
                     │ NO ÚLTIMO ATO A ENTRADA ACUMULA, NÃO RESUME        │
                     │                                                   │
                     │ Aqui estava um cartão de três linhas — «contexto  │
                     │ compatível / fronteiras respeitadas / lacunas     │
                     │ convertidas» — e tinha dois defeitos ao mesmo     │
                     │ tempo. Repetia, palavra por palavra, os três      │
                     │ selos que a coluna da SAÍDA já mostra: a mesma    │
                     │ informação duas vezes, a 40 cm de distância. E    │
                     │ deixava a coluna a 44% de densidade, com 269 px   │
                     │ de vazio — medido, não estimado.                  │
                     │                                                   │
                     │ Pior do que o vazio: ao fim da demonstração já    │
                     │ não se via NADA do que tinha entrado. A hipótese  │
                     │ ficava sem proveniência visível.                  │
                     │                                                   │
                     │ Agora a coluna guarda o que passou por ela, com  │
                     │ a cor de cada natureza. A coluna enche-se porque │
                     │ a demonstração a encheu — não porque se lá pôs   │
                     │ enchimento.                                       │
                     └───────────────────────────────────────────────────┘ */}
                {ato === 3 && (
                  <m.div key="compor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={transicao} className="mt-4 flex flex-1 flex-col gap-3">
                    {[
                      {
                        rotulo: "Contexto",
                        cor: "border-brand-mint/25 bg-brand/10",
                        ponto: "bg-brand-mint",
                        itens: [exemplo.competencia, "Trabalhar com dados", "Part-time"],
                      },
                      {
                        rotulo: "Fronteiras",
                        cor: "border-[#e7c98e]/25 bg-[#e7c98e]/10",
                        ponto: "bg-[#e7c98e]",
                        itens: ["Sem stock nem espaço", "Só algumas horas", "Operação a solo"],
                      },
                      {
                        rotulo: "Evidência",
                        cor: "border-[#9fc8e7]/25 bg-[#9fc8e7]/10",
                        ponto: "bg-[#9fc8e7]",
                        itens: ["INE · Eurostat", "Piloto local por fazer"],
                      },
                    ].map((grupo, indice) => (
                      <m.div
                        key={grupo.rotulo}
                        initial={estatico ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={estatico ? { duration: 0 } : { ...transicao, delay: 0.06 + indice * 0.08 }}
                        className={`flex flex-1 flex-col justify-center rounded-2xl border px-3 py-2.5 ${grupo.cor}`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">{grupo.rotulo}</div>
                        <ul className="mt-1.5 space-y-1">
                          {grupo.itens.map((item) => (
                            <li key={item} className="flex items-center gap-2 text-[11px] leading-snug text-white/75">
                              <span className={`h-1 w-1 flex-shrink-0 rounded-full ${grupo.ponto}`} />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </m.div>
                    ))}
                    <p className="pt-0.5 text-[10px] leading-relaxed text-white/40">Tudo o que a hipótese teve de respeitar. A saída recebe uma hipótese — nunca uma promessa.</p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* Motor: a mesma mesa persiste durante os quatro atos. */}
            <div className="relative min-h-[360px] rounded-3xl border border-white/10 bg-black/15 p-4 md:min-h-[410px]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[.17em] text-white/35">Motor · 02</div>
                  <div className="mt-1 text-xs font-semibold text-white/85">Raciocínio à vista</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${marcaDeEstado(contextoPronto)}`}>
                  {contextoPronto ? "Contexto lido" : "A receber"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  ["contexto-competencia", alvoCompetenciaRef, exemplo.competencia],
                  ["contexto-dados", alvoDadosRef, "Dados"],
                  ["contexto-tempo", alvoTempoRef, "Part-time"],
                ].map(([id, ref, rotulo]) => {
                  const pronto = chegou(id as string, 0);
                  return (
                    <span key={id as string} ref={ref as React.RefObject<HTMLSpanElement>} className={`flex min-h-[38px] min-w-0 items-center justify-center rounded-xl border px-1.5 text-center text-[9px] font-semibold leading-tight transition-colors ${marcaDeEstado(pronto)}`}>
                      {pronto ? (rotulo as string) : "—"}
                    </span>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.035] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-white/40">Compatibilidade estrutural</span>
                  <span className="text-[9px] text-white/30">sem score opaco</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {[
                    ["stock", alvoStockRef, FRONTEIRAS[0].alvo, stockFora],
                    ["disponibilidade", alvoDisponibilidadeRef, FRONTEIRAS[1].alvo, disponibilidadeFora],
                    ["equipa", alvoEquipaRef, FRONTEIRAS[2].alvo, equipaFora],
                  ].map(([id, ref, rotulo, fora]) => (
                    <m.div key={id as string} ref={ref as React.RefObject<HTMLDivElement>} initial={false} animate={fora ? { opacity: 0.34, x: -7, scale: 0.985 } : { opacity: contextoPronto ? 1 : 0.28, x: 0, scale: 1 }} transition={transicao} className="flex min-h-[34px] items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-2.5">
                      <span className={`truncate text-[9px] ${fora ? "text-white/45 line-through" : "text-white/65"}`}>{rotulo as string}</span>
                      {fora ? <Close size={11} className="flex-shrink-0 text-[#e7c98e]" /> : <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/20" />}
                    </m.div>
                  ))}
                </div>

                {/*
                  Este cartão dizia o título da hipótese — o MESMO título que a
                  coluna da Saída diz, a 40 cm de distância. Duas colunas a
                  afirmar a mesma frase não são ênfase: são uma a desperdiçar o
                  seu turno. Cada coluna tem um trabalho, e o do Motor é dizer
                  PORQUE sobreviveu, não O QUE é.

                  Por isso o título vive aqui só enquanto a Saída está vazia.
                  No instante em que a ficha lá chega, o Motor entrega-o e passa
                  a mostrar a aritmética do que entrou — que é o número que mais
                  nenhuma coluna tem.
                */}
                <m.div ref={sobreviventeRef} initial={false} animate={{ opacity: contextoPronto ? 1 : 0.24, y: hipoteseChegou ? 0 : preparaEntrega ? -6 : fronteirasProntas && (feito("sobrevivente") || ato > 1 || estatico) ? -2 : 0, borderColor: hipoteseChegou ? "rgba(255,255,255,.12)" : preparaEntrega || fronteirasProntas ? "rgba(159,225,203,.52)" : "rgba(255,255,255,.1)" }} transition={transicao} className={`mt-2 rounded-2xl border p-3 transition-colors ${hipoteseChegou ? "bg-white/[.03]" : "bg-brand/[.07]"}`}>
                  <div className="flex min-h-[42px] items-start justify-between gap-2">
                    {hipoteseChegou ? (
                      <>
                        <div className="min-w-0">
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-white/40">Entregue à saída</span>
                          <span className="mt-1 block text-[10px] leading-relaxed text-white/60">
                            Composta a partir de {CONTEXTO.length} capacidades, {FRONTEIRAS.length} eliminações e 1 fonte observada.
                          </span>
                        </div>
                        <ArrowRight size={13} className="mt-0.5 flex-shrink-0 text-white/30" />
                      </>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <span className="block text-[8px] font-bold uppercase tracking-wide text-brand-mint/75">Candidato que permanece</span>
                          <span className="mt-1 block font-display text-sm font-semibold leading-tight text-white">{exemplo.titulo}</span>
                        </div>
                        <Lightbulb size={14} className="mt-0.5 flex-shrink-0 text-brand-mint" />
                      </>
                    )}
                  </div>
                </m.div>
              </div>

              <m.div initial={false} animate={{ opacity: ato >= 2 || estatico ? 1 : 0.24 }} transition={transicao} className="mt-3 grid grid-cols-2 gap-2">
                <div ref={alvoFonteRef} className={`min-h-[58px] rounded-2xl border p-2.5 transition-colors ${fonteChegou ? "border-[#9fc8e7]/45 bg-[#9fc8e7]/10" : "border-white/10 bg-white/[.025]"}`}>
                  <span className="block text-[8px] font-bold uppercase tracking-wide text-[#a9d5f3]">Observado</span>
                  <span className="mt-1 block text-[9px] leading-tight text-white/65">{fonteChegou ? "Contexto público · INE / Eurostat" : "À espera da fonte"}</span>
                </div>
                <div ref={alvoProvaRef} className={`min-h-[58px] rounded-2xl border p-2.5 transition-colors ${provaChegou ? "border-clay-border/45 bg-clay-bg/10" : "border-white/10 bg-white/[.025]"}`}>
                  <span className="block text-[8px] font-bold uppercase tracking-wide text-[#e7b59f]">Plano de prova</span>
                  <span className="mt-1 block text-[9px] leading-tight text-white/65">{provaChegou ? "Mapear 5 empresas · piloto local" : "Por definir"}</span>
                </div>
              </m.div>

              <m.div initial={false} animate={{ opacity: estatico || (ato === 2 && feito("abreLacunas")) || ato > 2 ? 1 : 0 }} transition={transicao} className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-semibold uppercase tracking-wide text-[#e7c98e]">
                <span className="rounded-full border border-[#e7c98e]/25 bg-[#e7c98e]/10 px-2 py-1">Oferta local · em aberto</span>
                <span className="rounded-full border border-[#e7c98e]/25 bg-[#e7c98e]/10 px-2 py-1">Vontade de pagar · em aberto</span>
              </m.div>
            </div>

            {/* Saída: permanece vazia até a ficha da hipótese chegar. */}
            <div className="relative min-h-[210px] overflow-hidden rounded-3xl border border-white/10 bg-white/[.045] p-4 md:col-span-2 md:min-h-[220px] lg:col-span-1 lg:min-h-[410px]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[.17em] text-white/35">Saída · 03</div>
                  <div className="mt-1 text-xs font-semibold text-white/80">Hipótese testável</div>
                </div>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${marcaDeEstado(hipoteseChegou)}`}><Lightbulb size={14} /></span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 lg:grid-cols-1">
                {[
                  ["Contexto", contextoPronto],
                  ["Fronteiras", fronteirasProntas],
                  ["Evidência", evidenciaPronta],
                ].map(([rotulo, pronto]) => (
                  <div key={rotulo as string} className={`flex min-h-[32px] items-center justify-center gap-1.5 rounded-xl border px-2 text-[8px] font-bold uppercase tracking-wide ${marcaDeEstado(Boolean(pronto))}`}>
                    {pronto ? <Check size={10} /> : <span className="h-1 w-1 rounded-full bg-current" />}{rotulo as string}
                  </div>
                ))}
              </div>

              <div ref={saidaRef} className="relative mt-3 min-h-[258px] sm:min-h-[230px] lg:min-h-[278px]">
                <AnimatePresence mode="wait" initial={false}>
                  {!hipoteseChegou ? (
                    <m.div key="vazio" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={transicao} className="flex min-h-[258px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/10 px-4 text-center sm:min-h-[230px] lg:min-h-[278px]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-white/35"><Sparkle size={16} /></span>
                      <span className="mt-3 text-[10px] font-semibold text-white/55">A hipótese ainda não existe.</span>
                      <span className="mt-1 text-[9px] leading-relaxed text-white/30">Só aparece depois de sobreviver ao contexto, às fronteiras e às lacunas.</span>
                    </m.div>
                  ) : (
                    <m.article key="hipotese" initial={estatico ? false : { opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={estatico ? { duration: 0 } : { duration: DUR.assenta / 1000, ease: ASSENTA }} className={`relative min-h-[258px] overflow-hidden rounded-3xl border border-brand-mint/45 p-4 shadow-[0_16px_46px_rgba(2,24,18,.28)] sm:min-h-[230px] lg:min-h-[278px] ${PAPEL.fundo} ${PAPEL.corpo}`}>
                      <div aria-hidden className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl ${PAPEL.halo}`} />
                      <div className={`relative text-[8px] font-bold uppercase tracking-[.16em] ${PAPEL.marca}`}>Hipótese composta</div>
                      <m.span
                        aria-hidden
                        initial={false}
                        animate={{ opacity: concluiu ? 1 : 0, scale: concluiu ? 1 : 0.72 }}
                        transition={transicao}
                        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"
                      >
                        <Check size={12} />
                      </m.span>
                      <h3 className={`relative mt-1.5 font-display text-lg font-semibold leading-[1.08] ${PAPEL.titulo}`}>{exemplo.titulo}</h3>

                      <m.div initial={false} animate={{ opacity: mostraModelo ? 1 : 0, y: mostraModelo ? 0 : 5 }} transition={transicao} className="relative mt-3 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${PAPEL.chipMarca}`}>{exemplo.modelo}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${PAPEL.chipNeutro}`}>B2B</span>
                      </m.div>

                      <m.div initial={false} animate={{ opacity: mostraTeste ? 1 : 0, y: mostraTeste ? 0 : 6 }} transition={transicao} className={`relative mt-3 border-t pt-2.5 ${PAPEL.risco}`}>
                        <div className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wide ${PAPEL.marca}`}><Target size={10} /> Primeiro teste</div>
                        <p className={`mt-1 text-[9px] leading-relaxed ${PAPEL.corpo}`}>{exemplo.primeiroTeste}</p>
                      </m.div>

                      <m.div initial={false} animate={{ opacity: mostraCriterio ? 1 : 0, y: mostraCriterio ? 0 : 6 }} transition={transicao} className={`relative mt-2 rounded-2xl border px-2.5 py-2 ${PAPEL.aviso}`}>
                        <div className={`text-[8px] font-bold uppercase tracking-wide ${PAPEL.avisoTitulo}`}>O que a faria falhar</div>
                        <p className={`mt-1 text-[8px] leading-relaxed ${PAPEL.avisoCorpo}`}>{exemplo.testeDeFalsificacao}</p>
                      </m.div>
                    </m.article>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {fichas.map((ficha) => (
            <FichaDescobrir key={ficha.id} ficha={ficha} aoChegar={aoChegar} aoSair={aoSair} />
          ))}
          {impactos.map((impacto) => (
            <AnelImpactoDescobrir key={`${ciclo}-${impacto.id}`} em={impacto.em} tom={impacto.tom} />
          ))}
        </div>

        <ol className="relative grid grid-cols-4 gap-1.5 border-t border-white/10 px-3 py-3 sm:px-5" aria-label="Etapas da demonstração">
          {ATOS_DESCOBRIR.map((item, indice) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => irPara(indice)}
                aria-current={indice === ato ? "step" : undefined}
                aria-label={`Passo ${indice + 1} de ${ATOS_DESCOBRIR.length}: ${item.legenda}`}
                className="focus-marca group block min-h-[42px] w-full py-1 text-left"
              >
                <span className="block h-1 overflow-hidden rounded-full bg-white/10 group-focus-visible:ring-2 group-focus-visible:ring-brand-mint group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#0c251e]">
                  <span
                    ref={indice === ato ? barraRef : undefined}
                    className="block h-full w-full origin-left rounded-full bg-brand-mint"
                    style={{ transform: `scaleX(${indice < ato || (indice === ato && (estatico || finalizado)) ? 1 : 0})` }}
                  />
                </span>
                <span className={`mt-1.5 block truncate text-[8px] font-bold uppercase tracking-wide transition-colors sm:text-[9px] ${indice === ato ? "text-white" : indice < ato ? "text-brand-mint/65" : "text-white/30"}`}>
                  {item.rotulo}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </EstadoPalcoDescobrir.Provider>
  );
}
