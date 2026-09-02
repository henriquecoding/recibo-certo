"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «O QUE CABE» — o orçamento entra inteiro e sai repartido
//  ---------------------------------------------------------------------
//  ── O que estava aqui antes, e porque é que não era uma animação ──────
//
//  Quatro atos com `beats: []`. Um relógio a andar sem nada ligado a ele:
//  a régua do rodapé enchia-se, a legenda do cabeçalho mudava, e no palco
//  o que acontecia era uma borda a acender com `transition-all`. Nenhum
//  número mudava, nada ia de lado nenhum para lado nenhum, e os quatro
//  painéis estavam todos visíveis desde o primeiro frame — a cena servida
//  e a cena «animada» eram a mesma imagem com bordas diferentes.
//
//  A regra que os outros quatro palcos cumprem está escrita em
//  `palco/atores.tsx`: «nada muda de valor sozinho; um número só muda
//  porque alguma coisa lhe chegou». Era exatamente essa a regra que este
//  palco não cumpria.
//
//  ── O que a cena diz agora ────────────────────────────────────────────
//
//  A pergunta do lado patronal é «quanto posso pagar para contratar?», e
//  a resposta errada — a que quase toda a gente dá — é dividir o
//  orçamento por doze. A cena existe para mostrar porque não:
//
//    · o orçamento não é todo gastável (ato 1: a margem é retirada);
//    · o que resta não é salário (ato 2: três parcelas SAEM antes dele);
//    · o vencimento é o RESTO, e é por isso que ele aparece por último;
//    · e o resto ainda tem de ser ganho (ato 4: a linha de equilíbrio).
//
//  ── Porque é que o tom passou a claro ─────────────────────────────────
//
//  `focos.ts` declara `tom: "claro"` para o foco do salário, e o palco
//  irmão — `PalcoSalario`, que vive no MESMO lugar, trocado por um
//  radiogroup — honra-o. Este dizia `escuro`, e o resultado era um
//  radiogroup que trocava um cartão branco por uma laje quase preta: dois
//  produtos, não dois caminhos do mesmo. Pior, `escuro` é `#0c251e` FIXO
//  nos dois temas — todo o interior estava escrito em `text-white` e
//  `bg-white/[.035]`, cores que só existem contra um fundo escuro. Em modo
//  claro nada aqui participava no tema. Era esse o «problema no modo
//  claro» que se via sem se conseguir apontar.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { m, type Transition } from "@/components/palco/motion-lite";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Anel, Contador, Ficha, type FichaEmCena } from "@/components/palco/atores";
import { medir } from "@/components/palco/medida";
import {
  ArrowRight,
  Briefcase,
  Building,
  Calendar,
  Clock,
  Coin,
  ShieldCheck,
  Target,
  User,
} from "@/components/ui/Icons";
import { ATOS_CONTRATACAO, ASSENTA, DUR, ENTRADA } from "./coreografia";

export type ProntidaoContratacao = "incomplete" | "estimated" | "personalized" | "validated";

export interface DadosContratacao {
  orcamentoAnual: number;
  margemSegurancaPercentagem: number;
  orcamentoUtilizavel: number;
  vencimentoBaseMensal: number;
  refeicaoDia: number;
  refeicaoDiasElegiveis: number;
  seguroAnual: number;
  sstAnual: number;
  prontidao: ProntidaoContratacao;
  veredicto: string;
  custoAnual: number;
  custoPrimeiroAno: number;
  picoTesouraria: { mes: number; valor: number } | null;
  liquidoMensalMinimo: number;
  liquidoMensalMaximo: number;
  encargosPublicosMinimos: number;
  encargosPublicosMaximos: number;
  custoHoraProdutiva: number | null;
  receitaAnualNecessaria: number | null;
  horasProdutivasAno: number | null;
  /**
   * A repartição anual do custo, tal como o motor a devolve.
   *
   * As quatro parcelas somam `custoAnual` — é a mesma soma que o motor usa
   * para o produzir. O ato do pacote conta com essa identidade, e o teste
   * `foco-salario-dados` reprova se ela deixar de se verificar.
   */
  parcelas: {
    /** Vencimentos, férias e Natal — o que é dinheiro do trabalhador. */
    salarioEsubsidios: number;
    refeicao: number;
    /** A contribuição do lado da empresa. */
    tsuPatronal: number;
    /** Seguro de acidentes, SST e o resto do que o posto obriga. */
    posto: number;
  };
}

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Quantos pagamentos repartem o anual — doze meses, férias e Natal. */
const PAGAMENTOS_ANO = 14;

/**
 * O rótulo da decisão vem do motor. Enquanto era texto fixo, o palco anunciava
 * um veredicto positivo mesmo com o seguro obrigatório fora da conta.
 */
const ROTULO_DECISAO: Record<ProntidaoContratacao, string> = {
  incomplete: "Custo ainda incompleto",
  estimated: "Cabe na estimativa",
  personalized: "Cabe nesta projeção",
  validated: "Cenário validado",
};

const eur = (value: number, digits = 0) => value.toLocaleString("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

// ── O vocabulário de cor deste palco ───────────────────────────────────
//  Cada palco tem o seu, e é de propósito (ver `palco/atores.tsx`). Aqui:
//
//   · brand — o dinheiro que acaba no trabalhador: o orçamento no início,
//     o vencimento no fim. É o fio que a cena segue.
//   · clay  — o que segue para o Estado. A mesma tinta que o palco do
//     salário usa para a retenção, e pela mesma razão: não é teu.
//   · areia — o que o posto obriga a pagar e não é nem salário nem
//     imposto: refeição, seguro, SST.
//
//  Os três têm camada `.dark` em `globals.css`. NENHUM leva `dark:` ao
//  lado: a utilidade `dark:` ganha ao remapeamento e repõe o pastel do
//  modo claro — a armadilha que `verificar-palcos.mjs` existe para apanhar.
const TOM_FICHA = {
  areia: "border-categoria-areia-border bg-categoria-areia-bg text-categoria-areia-text",
  clay: "border-clay-border bg-clay-bg text-clay-text",
} as const;

const ANEL = {
  areia: "border-categoria-areia-text",
  clay: "border-clay-text",
} as const;

type Tinta = keyof typeof TOM_FICHA;

/** As três parcelas que SAEM do orçamento, pela ordem em que partem. */
interface Parcela {
  id: "refeicao" | "tsu" | "posto";
  rotulo: string;
  /** O que fica por baixo do valor: a regra que o produz. */
  nota: (dados: DadosContratacao) => string;
  valor: (dados: DadosContratacao) => number;
  tinta: Tinta;
  Icone: typeof Coin;
}

const PARCELAS: readonly Parcela[] = [
  {
    id: "refeicao",
    rotulo: "Refeição",
    nota: (d) => `${eur(d.refeicaoDia, 2)} × ${d.refeicaoDiasElegiveis} dias`,
    valor: (d) => d.parcelas.refeicao,
    tinta: "areia",
    Icone: Coin,
  },
  {
    id: "tsu",
    rotulo: "Contribuição da empresa",
    nota: () => "sobre o que é remuneração",
    valor: (d) => d.parcelas.tsuPatronal,
    tinta: "clay",
    Icone: ShieldCheck,
  },
  {
    id: "posto",
    rotulo: "Seguro + SST",
    nota: () => "obrigatórios, estimados",
    valor: (d) => d.parcelas.posto,
    tinta: "areia",
    Icone: Briefcase,
  },
];

export default function PalcoContratacao({ dados }: { dados: DadosContratacao }) {
  const mensalDoResto = dados.parcelas.salarioEsubsidios / PAGAMENTOS_ANO;

  return (
    <MolduraPalco
      id="palco-contratacao"
      tom="claro"
      nome="O que cabe"
      resumo="Um orçamento anual entra inteiro e sai repartido: a margem é reservada, três parcelas saem para o posto, e o vencimento é o que fica. No fim, a receita que o posto tem de gerar para se pagar."
      narracao={[
        `A empresa parte de ${eur(dados.orcamentoAnual)} por ano e reserva ${dados.margemSegurancaPercentagem} por cento como margem de segurança, o que deixa ${eur(dados.orcamentoUtilizavel)} para o posto.`,
        `Desses ${eur(dados.orcamentoUtilizavel)} saem ${eur(dados.parcelas.refeicao)} de subsídio de refeição, ${eur(dados.parcelas.tsuPatronal)} de contribuição do lado da empresa e ${eur(dados.parcelas.posto)} de seguro de acidentes e saúde e segurança no trabalho. Ficam ${eur(dados.parcelas.salarioEsubsidios)} para salário e subsídios, que em ${PAGAMENTOS_ANO} pagamentos dão ${eur(mensalDoResto, 2)} de vencimento base mensal. O vencimento não é escolhido: é o que sobra depois de o posto estar pago.`,
        `O custo anual estabilizado é ${eur(dados.custoAnual)}. Desse total, o líquido mensal provável do trabalhador fica entre ${eur(dados.liquidoMensalMinimo)} e ${eur(dados.liquidoMensalMaximo)}, e para o Estado seguem entre ${eur(dados.encargosPublicosMinimos)} e ${eur(dados.encargosPublicosMaximos)} por ano. É um intervalo e não um número exato porque a demonstração corre sem dados pessoais do trabalhador.`,
        dados.custoHoraProdutiva && dados.receitaAnualNecessaria
          ? `Cada hora produtiva custa ${eur(dados.custoHoraProdutiva, 2)} e o posto precisa de suportar ${eur(dados.receitaAnualNecessaria)} de receita anual à margem indicada. ${dados.veredicto}`
          : `A proposta só avança depois de a empresa confirmar a capacidade necessária para pagar o posto. ${dados.veredicto}`,
      ]}
      atos={ATOS_CONTRATACAO}
    >
      {(cena) => <Cena cena={cena} dados={dados} mensalDoResto={mensalDoResto} />}
    </MolduraPalco>
  );
}

function Cena({
  cena,
  dados,
  mensalDoResto,
}: {
  cena: CenaDoPalco;
  dados: DadosContratacao;
  mensalDoResto: number;
}) {
  const { ato, feito, emCena, estatico, ciclo, palcoRef } = cena;

  const t: Transition = estatico
    ? { duration: 0 }
    : { duration: DUR.entrada / 1000, ease: ENTRADA };
  const pousa: Transition = estatico
    ? { duration: 0 }
    : { duration: DUR.assenta / 1000, ease: ASSENTA };
  const desenrola: Transition = estatico
    ? { duration: 0 }
    : { duration: DUR.desenrolar / 1000, ease: ENTRADA };

  /** O que se DESENHA lê isto. Ver o comentário de `CenaDoPalco`. */
  const noAto = (indice: number, beat: string) =>
    estatico || ato > indice || (ato === indice && emCena(beat));

  // ── Ato 1 · o orçamento ──────────────────────────────────────────────
  const envelope = noAto(0, "envelope");
  const enche = noAto(0, "enche");
  const protege = noAto(0, "protege");
  const sobra = noAto(0, "sobra");
  const pergunta = estatico || (ato === 0 && emCena("pergunta")) || ato > 0;

  // ── Ato 2 · o pacote ─────────────────────────────────────────────────
  const abre = noAto(1, "abre");
  const resto = noAto(1, "resto");
  const salario = noAto(1, "salario");
  const licao = noAto(1, "licao");

  // ── Ato 3 · os três dinheiros ────────────────────────────────────────
  const sai = noAto(2, "sai");
  const divide = noAto(2, "divide");
  const paraTrabalhador = noAto(2, "trabalhador");
  const paraEstado = noAto(2, "estado");
  const intervalo = noAto(2, "intervalo");

  // ── Ato 4 · a decisão ────────────────────────────────────────────────
  const equilibrio = noAto(3, "equilibrio");
  const receita = noAto(3, "receita");
  const hora = noAto(3, "hora");
  const pico = noAto(3, "pico");
  const veredicto = noAto(3, "veredicto");
  const resolve = estatico || (ato === 3 && emCena("resolve"));

  // ── As fichas: o que sai do orçamento e vai para as caixas ───────────
  const origemRef = useRef<HTMLDivElement>(null);
  const destinoRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [fichas, setFichas] = useState<FichaEmCena[]>([]);
  const [aneis, setAneis] = useState<{ id: string; em: { x: number; y: number }; tinta: Tinta }[]>([]);
  const [aterradas, setAterradas] = useState<ReadonlySet<string>>(new Set());
  const lancadas = useRef<Set<string>>(new Set());

  // Cada ato/ciclo novo limpa a cena: uma ficha no ar de um ato anterior
  // aterraria num destino que já não significa o mesmo. Sempre, e não
  // `if (ato < 1)` — saltar para o ato do pacote pela régua tem de o pôr a
  // CORRER, e um ato que abre com a subtração já feita não a mostra.
  useEffect(() => {
    lancadas.current = new Set();
    destinosLancados.current = {};
    setFichas([]);
    setAneis([]);
    setAterradas(new Set());
  }, [ciclo, ato]);

  /**
   * Onde cada ficha vai aterrar, guardado no instante do lançamento.
   *
   * O anel de impacto precisa do destino, e a forma óbvia de o obter é
   * procurá-lo na lista de fichas — mas isso obriga a chamar `setAneis`
   * DENTRO do updater de `setFichas`, e um updater tem de ser puro: o
   * React pode executá-lo duas vezes e o anel nasce a dobrar. Um ref
   * resolve-o sem estado nenhum pelo meio.
   */
  const destinosLancados = useRef<Record<string, { x: number; y: number }>>({});

  const chegar = useCallback((id: string) => {
    const em = destinosLancados.current[id];
    const parcela = PARCELAS.find((p) => p.id === id);
    if (em && parcela) {
      setAneis((anteriores) =>
        anteriores.some((a) => a.id === id)
          ? anteriores
          : [...anteriores, { id, em, tinta: parcela.tinta }],
      );
    }
    setAterradas((atuais) => new Set([...atuais, id]));
    window.setTimeout(
      () => setAneis((anteriores) => anteriores.filter((a) => a.id !== id)),
      DUR.impacto + 60,
    );
  }, []);

  const sair = useCallback(
    (id: string) => setFichas((atuais) => atuais.filter((f) => f.id !== id)),
    [],
  );

  // `feito` (o relógio cru) para LANÇAR; `emCena` só para desenhar.
  const partiuRefeicao = feito("refeicao");
  const partiuTsu = feito("tsu");
  const partiuPosto = feito("posto");
  useEffect(() => {
    if (ato !== 1 || estatico) return;
    for (const parcela of PARCELAS) {
      if (!feito(parcela.id) || lancadas.current.has(parcela.id)) continue;
      lancadas.current.add(parcela.id);
      const palco = palcoRef.current;
      const origem = medir(origemRef.current, palco);
      const destino = medir(destinoRefs.current[parcela.id] ?? null, palco);
      // Sem medida não há trajetória, e uma ficha a partir de (0,0) é pior
      // do que ficha nenhuma: parece intencional. O destino conta na mesma.
      if (!origem || !destino) {
        setAterradas((atuais) => new Set([...atuais, parcela.id]));
        continue;
      }
      destinosLancados.current[parcela.id] = destino;
      setFichas((atuais) => [
        ...atuais,
        {
          id: parcela.id,
          origem,
          destino,
          rotulo: `− ${eur(parcela.valor(dados))}`,
          tom: TOM_FICHA[parcela.tinta],
        },
      ]);
    }
    // As dependências são os beats: é a chegada de cada um que lança.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ato, estatico, partiuRefeicao, partiuTsu, partiuPosto, palcoRef, dados]);

  /** Com movimento reduzido ou sem JavaScript, tudo já aterrou. */
  const pousou = (id: string) => estatico || ato > 1 || aterradas.has(id);

  // ── As proporções, calculadas uma vez ────────────────────────────────
  const g = useMemo(() => {
    const total = Math.max(1, dados.orcamentoAnual);
    const pct = (valor: number) => (valor / total) * 100;
    const doUtilizavel = (valor: number) =>
      (valor / Math.max(1, dados.orcamentoUtilizavel)) * 100;
    const publicoMedio = (dados.encargosPublicosMinimos + dados.encargosPublicosMaximos) / 2;
    const percentagemEstado =
      dados.custoAnual > 0 ? Math.min(100, (publicoMedio / dados.custoAnual) * 100) : 0;
    return {
      utilizavel: pct(dados.orcamentoUtilizavel),
      protegido: 100 - pct(dados.orcamentoUtilizavel),
      salario: doUtilizavel(dados.parcelas.salarioEsubsidios),
      refeicao: doUtilizavel(dados.parcelas.refeicao),
      tsu: doUtilizavel(dados.parcelas.tsuPatronal),
      posto: doUtilizavel(dados.parcelas.posto),
      estado: percentagemEstado,
      empresa: 100 - percentagemEstado,
    };
  }, [dados]);

  const margemAnual = dados.orcamentoAnual - dados.orcamentoUtilizavel;

  return (
    <>
      <div aria-hidden className="relative space-y-2.5 sm:space-y-3">
        <Cabecalho aparece={envelope} transicao={t} />

        {/* ═══ ATO 1 · o orçamento ═══════════════════════════════════ */}
        <m.section
          initial={false}
          animate={{ opacity: envelope ? 1 : 0, y: envelope ? 0 : -8 }}
          transition={t}
          className={`rounded-3xl border p-3 transition-colors duration-500 sm:p-4 ${
            !estatico && ato === 0
              ? "border-brand/45 bg-brand-light/45"
              : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/45"
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1.5">
            <div className="min-w-0">
              <p className="texto-micro font-bold uppercase tracking-[.14em] text-stone-600 dark:text-stone-300">
                Régua do orçamento anual
              </p>
              <p className="mt-0.5 font-display text-[clamp(1.6rem,6vw,2.4rem)] font-semibold leading-none tabular-nums text-ink">
                {estatico || !enche ? (
                  eur(dados.orcamentoAnual)
                ) : (
                  <Contador
                    valor={dados.orcamentoAnual}
                    formato={(n) => eur(n)}
                    inicial={0}
                    duracao={DUR.contaResultado}
                  />
                )}
              </p>
            </div>
            <m.p
              initial={false}
              animate={{ opacity: sobra ? 1 : 0, y: sobra ? 0 : 4 }}
              transition={pousa}
              className="min-w-0 text-right texto-mini leading-snug text-stone-600 dark:text-stone-300"
            >
              <strong className="block font-display text-base font-semibold tabular-nums text-brand dark:text-brand-mint">
                {eur(dados.orcamentoUtilizavel)}
              </strong>
              pode ser usado
            </m.p>
          </div>

          {/* A barra: enche até ao topo e só depois RECUA os 5%. É o recuo
              que se lê como uma decisão — encher já a 95% não mostra nada. */}
          <div
            ref={origemRef}
            className="relative mt-3 h-3.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
          >
            <m.span
              initial={false}
              animate={{ width: enche ? (protege ? `${g.utilizavel}%` : "100%") : "0%" }}
              transition={desenrola}
              data-contratacao="barra-orcamento"
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand to-brand-mint"
            />
            <m.span
              initial={false}
              animate={{ opacity: protege ? 1 : 0 }}
              transition={t}
              className="absolute inset-y-0 right-0 rounded-r-full bg-categoria-areia-bg [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgba(122,82,48,.22)_3px_6px)]"
              style={{ width: `${g.protegido}%` }}
            />
          </div>
          <m.div
            initial={false}
            animate={{ opacity: protege ? 1 : 0 }}
            transition={t}
            className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 texto-micro font-semibold"
          >
            <span className="text-stone-600 dark:text-stone-300">
              {eur(dados.orcamentoUtilizavel)} para o posto
            </span>
            <span className="text-categoria-areia-text">
              {eur(margemAnual)} · {dados.margemSegurancaPercentagem}% protegido
            </span>
          </m.div>

          <m.p
            initial={false}
            animate={{ opacity: pergunta ? 1 : 0 }}
            transition={t}
            className="mt-2 texto-mini font-semibold leading-relaxed text-stone-600 dark:text-stone-300"
          >
            Quanto disto pode ser salário?
          </m.p>
        </m.section>

        {/* ═══ ATO 2 · o pacote ══════════════════════════════════════ */}
        <m.section
          initial={false}
          animate={{ opacity: abre ? 1 : 0.25, y: abre ? 0 : 8 }}
          transition={t}
          className={`rounded-3xl border p-3 transition-colors duration-500 sm:p-4 ${
            !estatico && ato === 1
              ? "border-brand/45 bg-brand-light/45"
              : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/45"
          }`}
        >
          <p className="flex items-center gap-2 texto-micro font-bold uppercase tracking-[.14em] text-stone-600 dark:text-stone-300">
            <Target size={12} className="flex-none text-brand dark:text-brand-mint" />
            O que sai antes do salário
          </p>

          <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
            {PARCELAS.map((parcela) => (
              <CaixaParcela
                key={parcela.id}
                ref={(no) => {
                  destinoRefs.current[parcela.id] = no;
                }}
                parcela={parcela}
                dados={dados}
                pousou={pousou(parcela.id)}
                estatico={estatico}
                transicao={t}
                pousa={pousa}
              />
            ))}
          </div>

          {/* ┌───────────────────────────────────────────────────────────┐
              │ O QUE FICA — presente desde o início, vazio até haver     │
              │                                                           │
              │ Este bloco estava a `opacity: 0` até ao beat do resto.    │
              │ Guardava o lugar (que é o que evita o salto de layout) e  │
              │ deixava, durante 1,6 s, um buraco branco de ~250 px por   │
              │ baixo das parcelas — a 360 px ocupava quase um terço do   │
              │ palco. Visto nos instantâneos do ato 2; nenhuma medição   │
              │ o apanha, porque um vazio não transborda, não é texto     │
              │ pequeno e não é alvo nenhum.                              │
              │                                                           │
              │ Agora nasce com o rótulo à vista e o valor por preencher, │
              │ como as caixas das parcelas — a mesma gramática: a caixa  │
              │ existe, o número é que ainda não chegou.                  │
              └───────────────────────────────────────────────────────────┘ */}
          <m.div
            initial={false}
            animate={{ opacity: resto ? 1 : 0.5, y: resto ? 0 : 4 }}
            transition={t}
            className={`mt-2.5 rounded-2xl border p-3 ${
              resto ? "border-brand/30 bg-brand-light/70" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
            }`}
          >
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <p className="texto-micro font-bold uppercase tracking-[.12em] text-brand dark:text-brand-mint">
                  Fica para salário e subsídios
                </p>
                <p
                  data-contratacao="resto"
                  className="mt-0.5 font-display text-[clamp(1.35rem,5vw,1.9rem)] font-semibold leading-none tabular-nums text-ink"
                >
                  {/* Com a caixa agora visível desde o início, mostrar já o
                      valor final seria dar a resposta antes de a conta a
                      produzir — o oposto do que a cena existe para fazer.
                      Fica por preencher, como as parcelas, e conta a partir
                      do orçamento utilizável quando a subtração termina. */}
                  {estatico ? (
                    eur(dados.parcelas.salarioEsubsidios)
                  ) : resto ? (
                    <Contador
                      valor={dados.parcelas.salarioEsubsidios}
                      formato={(n) => eur(n)}
                      inicial={dados.orcamentoUtilizavel}
                      duracao={DUR.contaResultado}
                    />
                  ) : (
                    <span className="text-stone-600 dark:text-stone-300">—</span>
                  )}
                </p>
              </div>
              <m.div
                initial={false}
                animate={{ opacity: salario ? 1 : 0, scale: salario ? 1 : 0.82 }}
                transition={pousa}
                className="min-w-0 rounded-xl border border-brand/30 bg-white px-2.5 py-1.5 text-right dark:bg-stone-900"
              >
                <span className="block texto-micro font-semibold text-stone-600 dark:text-stone-300">
                  ÷ {PAGAMENTOS_ANO} pagamentos
                </span>
                <span className="block font-display text-base font-semibold tabular-nums text-brand dark:text-brand-mint">
                  {eur(mensalDoResto, 2)}
                  <span className="texto-micro font-semibold text-stone-600 dark:text-stone-300"> /mês</span>
                </span>
              </m.div>
            </div>

            {/* A barra composta: as quatro parcelas do utilizável. Cada
                troço só ganha largura quando a sua ficha aterra. */}
            <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <m.span
                initial={false}
                animate={{ width: resto ? `${g.salario}%` : "0%" }}
                transition={desenrola}
                className="h-full bg-brand"
              />
              <m.span
                initial={false}
                animate={{ width: pousou("tsu") ? `${g.tsu}%` : "0%" }}
                transition={desenrola}
                className="h-full bg-clay"
              />
              <m.span
                initial={false}
                animate={{ width: pousou("refeicao") ? `${g.refeicao}%` : "0%" }}
                transition={desenrola}
                className="h-full bg-categoria-areia-text"
              />
              <m.span
                initial={false}
                animate={{ width: pousou("posto") ? `${g.posto}%` : "0%" }}
                transition={desenrola}
                className="h-full bg-categoria-areia-border"
              />
            </div>
          </m.div>

          <m.p
            initial={false}
            animate={{ opacity: licao ? 1 : 0 }}
            transition={t}
            className="mt-2 texto-mini font-semibold leading-relaxed text-stone-600 dark:text-stone-300"
          >
            O vencimento não se escolhe — é o que fica depois de o posto estar pago.
          </m.p>
        </m.section>

        {/* ═══ ATO 3 · os três dinheiros ═════════════════════════════ */}
        <m.section
          initial={false}
          animate={{ opacity: sai ? 1 : 0.25, y: sai ? 0 : 8 }}
          transition={t}
          className={`rounded-3xl border p-3 transition-colors duration-500 sm:p-4 ${
            !estatico && ato === 2
              ? "border-brand/45 bg-brand-light/45"
              : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/45"
          }`}
        >
          <p className="texto-micro font-bold uppercase tracking-[.14em] text-stone-600 dark:text-stone-300">
            Os três dinheiros
          </p>

          {/* ┌───────────────────────────────────────────────────────────┐
              │ OS RÓTULOS ESTÃO FORA DA BARRA, E NÃO É ESTÉTICA          │
              │                                                           │
              │ Estavam dentro, em `text-white` sobre `bg-clay/80`.       │
              │ `clay` é #C2745A: branco por cima dá **3,53:1**, abaixo   │
              │ dos 4,5 da AA — e a barra do Estado ocupa ~35%, o que a   │
              │ 320 px são 90 px para «Estado» com `tracking` largo.      │
              │ Duas falhas com a mesma correção: a barra mostra a        │
              │ PROPORÇÃO, a legenda diz o nome.                          │
              └───────────────────────────────────────────────────────────┘ */}
          <div className="mt-2.5 flex h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <m.span
              initial={false}
              animate={{ width: divide ? `${g.empresa}%` : "100%" }}
              transition={desenrola}
              className="h-full bg-brand"
            />
            <m.span
              initial={false}
              animate={{ width: divide ? `${g.estado}%` : "0%" }}
              transition={desenrola}
              className="h-full bg-clay"
            />
          </div>
          <m.div
            initial={false}
            animate={{ opacity: divide ? 1 : 0 }}
            transition={t}
            className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 texto-micro font-semibold text-stone-600 dark:text-stone-300"
          >
            {/* ┌─────────────────────────────────────────────────────────┐
                │ O VERDE NÃO É «O TRABALHADOR»                           │
                │                                                         │
                │ A barra divide o custo em duas: o que é imposto e       │
                │ contribuição, e o resto. Esse resto inclui os 700 € de  │
                │ seguro e SST, que não chegam ao trabalhador — vão para  │
                │ uma seguradora e para um serviço externo. São 1,75% do  │
                │ total, e é pouco; mas o rótulo diria uma coisa que a    │
                │ barra não mede, e nesse caso o tamanho do erro não      │
                │ interessa. Os três cartões por baixo é que separam os   │
                │ destinos com precisão.                                  │
                │                                                         │
                │ E a fatia do Estado é o PONTO MÉDIO de um intervalo,    │
                │ porque a cena corre sem dados pessoais. Uma proporção   │
                │ desenhada a partir de um intervalo tem de dizer que o   │
                │ é — desenhá-la calada seria publicar uma precisão que   │
                │ o motor não deu.                                        │
                └─────────────────────────────────────────────────────────┘ */}
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-brand" />
              Chega ao trabalhador e ao posto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-clay" />
              Segue para o Estado · ponto médio
            </span>
          </m.div>

          <div className="mt-2.5 grid gap-2 lg:grid-cols-3">
            <LinhaDinheiro
              Icone={Building}
              rotulo="Sai da empresa"
              valor={eur(dados.custoAnual)}
              unidade="por ano"
              visivel={sai}
              transicao={t}
            />
            <LinhaDinheiro
              Icone={User}
              rotulo="Chega ao trabalhador"
              valor={`${eur(dados.liquidoMensalMinimo)}–${eur(dados.liquidoMensalMaximo)}`}
              unidade="por mês, líquido"
              visivel={paraTrabalhador}
              destaque
              transicao={t}
            />
            <LinhaDinheiro
              Icone={ShieldCheck}
              rotulo="Segue para o Estado"
              valor={`${eur(dados.encargosPublicosMinimos)}–${eur(dados.encargosPublicosMaximos)}`}
              unidade="por ano"
              visivel={paraEstado}
              transicao={t}
            />
          </div>

          <m.p
            initial={false}
            animate={{ opacity: intervalo ? 1 : 0 }}
            transition={t}
            className="mt-2 texto-mini leading-relaxed text-stone-600 dark:text-stone-300"
          >
            É um intervalo, e não um número exato, porque a demonstração corre sem dados
            pessoais do trabalhador: o IRS retido depende do agregado que ele declarar.
          </m.p>
        </m.section>

        {/* ═══ ATO 4 · a decisão ═════════════════════════════════════ */}
        <m.section
          initial={false}
          animate={{ opacity: equilibrio ? 1 : 0.25, y: equilibrio ? 0 : 8 }}
          transition={t}
          className={`grid gap-3 rounded-3xl border p-3 transition-colors duration-500 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4 ${
            !estatico && ato === 3
              ? "border-brand/45 bg-brand-light/45"
              : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/45"
          }`}
        >
          <div className="min-w-0">
            <p className="texto-micro font-bold uppercase tracking-[.14em] text-brand dark:text-brand-mint">
              Linha de equilíbrio
            </p>
            <p className="mt-0.5 font-display text-[clamp(1.25rem,4.6vw,1.7rem)] font-semibold leading-tight tabular-nums text-ink">
              {dados.receitaAnualNecessaria ? (
                <>
                  {estatico || !receita ? (
                    eur(dados.receitaAnualNecessaria)
                  ) : (
                    <Contador
                      valor={dados.receitaAnualNecessaria}
                      formato={(n) => eur(n)}
                      inicial={0}
                      duracao={DUR.contaResultado}
                    />
                  )}
                  <span className="font-sans text-sm font-semibold text-stone-600 dark:text-stone-300">
                    {" "}
                    de receita/ano
                  </span>
                </>
              ) : (
                "Capacidade por validar"
              )}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 texto-micro font-semibold text-stone-600 dark:text-stone-300">
              <m.span
                initial={false}
                animate={{ opacity: hora ? 1 : 0 }}
                transition={t}
                className="inline-flex items-center gap-1.5"
              >
                <Clock size={11} className="flex-none" />
                {dados.custoHoraProdutiva
                  ? `${eur(dados.custoHoraProdutiva, 2)} por hora produtiva · ${Math.round(
                      dados.horasProdutivasAno ?? 0,
                    ).toLocaleString("pt-PT")} h/ano`
                  : "Indica margem e produtividade na ferramenta completa."}
              </m.span>
              {dados.picoTesouraria ? (
                <m.span
                  initial={false}
                  animate={{ opacity: pico ? 1 : 0 }}
                  transition={t}
                  className="inline-flex items-center gap-1.5"
                >
                  <Calendar size={11} className="flex-none" />
                  Mês mais pesado: {MESES_CURTOS[dados.picoTesouraria.mes - 1]},{" "}
                  {eur(dados.picoTesouraria.valor)}
                </m.span>
              ) : null}
            </div>

            <m.p
              initial={false}
              animate={{ opacity: resolve ? 1 : 0 }}
              transition={t}
              className="mt-1.5 texto-micro leading-relaxed text-stone-600 dark:text-stone-300"
            >
              {dados.veredicto}
            </m.p>
          </div>

          <m.div
            initial={false}
            animate={{ opacity: veredicto ? 1 : 0.3, scale: veredicto ? 1 : 0.88 }}
            transition={pousa}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-4 texto-mini font-bold ${
              dados.prontidao === "incomplete"
                ? "bg-alert-bg text-alert-text"
                : "bg-brand text-white"
            }`}
          >
            {ROTULO_DECISAO[dados.prontidao]} <ArrowRight size={13} className="flex-none" />
          </m.div>
        </m.section>
      </div>

      {fichas.map((ficha) => (
        <Ficha key={`${ciclo}-${ficha.id}`} ficha={ficha} aoChegar={chegar} aoSair={sair} />
      ))}
      {aneis.map((anel) => (
        <Anel key={`${ciclo}-${anel.id}`} em={anel.em} cor={ANEL[anel.tinta]} />
      ))}
    </>
  );
}

function Cabecalho({ aparece, transicao }: { aparece: boolean; transicao: Transition }) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: aparece ? 1 : 0.3 }}
      transition={transicao}
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-stone-200 pb-2.5 dark:border-stone-700"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 texto-micro font-bold uppercase tracking-[.14em] text-brand dark:text-brand-mint">
          <Briefcase size={12} className="flex-none" /> Contratação em estudo
        </p>
        <p className="mt-0.5 texto-micro text-stone-600 dark:text-stone-300">
          Continente · 40 h/semana · sem dados pessoais
        </p>
      </div>
      <span className="rounded-full border border-brand/25 bg-brand-light px-2.5 py-1 texto-micro font-semibold text-brand dark:text-brand-mint">
        Motor fiscal 2026
      </span>
    </m.div>
  );
}

/**
 * Uma caixa de parcela. Nasce a `—` e só ganha o número quando a ficha lhe
 * chega — que é a regra de `palco/atores.tsx` aplicada ao pé da letra.
 */
function CaixaParcela({
  ref,
  parcela,
  dados,
  pousou,
  estatico,
  transicao,
  pousa,
}: {
  ref: (no: HTMLDivElement | null) => void;
  parcela: Parcela;
  dados: DadosContratacao;
  pousou: boolean;
  estatico: boolean;
  transicao: Transition;
  pousa: Transition;
}) {
  const valor = parcela.valor(dados);
  const { Icone } = parcela;
  return (
    <m.div
      ref={ref}
      initial={false}
      animate={{
        opacity: pousou ? 1 : 0.55,
        scale: pousou ? 1 : 0.97,
      }}
      transition={pousou ? pousa : transicao}
      className={`min-w-0 rounded-2xl border p-2.5 ${
        parcela.tinta === "clay"
          ? "border-clay-border bg-clay-bg/60"
          : "border-categoria-areia-border bg-categoria-areia-bg/60"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 texto-micro font-bold uppercase tracking-[.08em] ${
          parcela.tinta === "clay" ? "text-clay-text" : "text-categoria-areia-text"
        }`}
      >
        <Icone size={11} className="flex-none" />
        <span className="truncate">{parcela.rotulo}</span>
      </p>
      <p
        data-contratacao="parcela"
        data-parcela={parcela.id}
        className="mt-1 font-display text-base font-semibold tabular-nums text-ink"
      >
        {estatico ? (
          eur(valor)
        ) : pousou ? (
          <Contador valor={valor} formato={(n) => eur(n)} inicial={0} duracao={DUR.contaParcela} />
        ) : (
          <span className="text-stone-600 dark:text-stone-300">—</span>
        )}
      </p>
      <p className="mt-0.5 truncate texto-micro text-stone-600 dark:text-stone-300">
        {parcela.nota(dados)}
      </p>
    </m.div>
  );
}

function LinhaDinheiro({
  Icone,
  rotulo,
  valor,
  unidade,
  visivel,
  destaque,
  transicao,
}: {
  Icone: typeof Building;
  rotulo: string;
  valor: string;
  unidade: string;
  visivel: boolean;
  destaque?: boolean;
  transicao: Transition;
}) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: visivel ? 1 : 0.3, x: visivel ? 0 : -5 }}
      transition={transicao}
      className={`flex min-w-0 items-start gap-2 rounded-2xl border p-2.5 ${
        destaque
          ? "border-brand/30 bg-brand-light/70"
          : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <Icone
        size={13}
        className={`mt-0.5 flex-none ${destaque ? "text-brand dark:text-brand-mint" : "text-stone-400"}`}
      />
      <div className="min-w-0">
        <p className="texto-micro font-semibold text-stone-600 dark:text-stone-300">{rotulo}</p>
        <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-ink">{valor}</p>
        <p className="texto-micro text-stone-600 dark:text-stone-300">{unidade}</p>
      </div>
    </m.div>
  );
}
