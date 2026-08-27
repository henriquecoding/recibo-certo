"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «O PONTO DE VIRAGEM» — o palco do foco da empresa
//  ---------------------------------------------------------------------
//  Três peças, e nenhuma delas é nova nesta casa:
//
//   1. A **régua de faturação** — o mesmo controlo do comparador de
//      cenários: um `role="slider"` próprio com captura de ponteiro,
//      atalhos de teclado, marcador de viragem e atalhos de valor. Era um
//      `<input type="range">` com uma cadeia de pseudo-elementos por
//      estilar; o nativo não sabe desenhar marcadores dentro da calha, e
//      era por isso que a viragem vivia numa legenda por baixo em vez de
//      estar onde acontece.
//   2. As **duas colunas repartidas** — «para onde vai cada euro», o
//      mesmo desenho que o comparador usa para os três regimes. Mesma
//      altura porque partem da mesma faturação; o que se compara é o
//      tamanho da fatia que fica.
//   3. A **faixa do domínio** — a fronteira, desenhada como o que é: uma
//      barra com dois lados e um corte. Substituiu uma `polyline` que
//      tinha um defeito de FORMA, não de custo: a pergunta é um limiar
//      («a partir de quanto?»), e um limiar tem duas zonas e uma
//      fronteira. Uma curva a subir tem infinitos valores intermédios
//      que ninguém precisa de ler, e precisa de espaço DEPOIS do
//      cruzamento para se ler como cruzamento — o que obrigava a
//      escolher o teto do eixo pela estética em vez de pelo domínio.
//
//  ── O que era «travado», medido em vez de suposto ────────────────────
//
//  A suspeita óbvia era o custo de render: o palco anterior crescia por
//  `useProgresso`, que é `setState` a 60 Hz, e voltava a renderizar a cena
//  inteira — quarenta pontos de `polyline`, o seletor e dois contadores —
//  a cada frame. **Medido lado a lado, não era isso.** Com a cena a correr
//  e com um arrasto lento de ponta a ponta, a 1×, 4× e 6× de estrangulamento
//  de CPU, as duas versões perdem a mesma proporção de frames (0,3% a 12%,
//  conforme o estrangulamento) — e a 6× o que se perde é da PÁGINA, não do
//  palco.
//
//  O que estava mesmo avariado era a INTERAÇÃO, e vê-se num toque:
//
//   · **O `<input type="range">` não respondia a dedo nenhum.** Toque
//     simples e arrasto de dedo sobre a calha, a 390 px: o valor ficava em
//     25 e não se mexia. Num telemóvel, o único controlo do palco era
//     inerte — que é exatamente a palavra «travada».
//   · **`setPointerCapture` derrubava a árvore.** Ver o quadro em
//     `aoDescer`, mais abaixo: uma exceção por tratar fazia o palco
//     desaparecer do ecrã a meio de um gesto.
//
//  O crescimento passou na mesma para transições de CSS sobre `height`,
//  `opacity` e `transform` — não porque a alternativa fosse lenta, mas
//  porque uma pausa a meio deixa a transição onde está sem nada continuar
//  a mexer, e porque durante um arrasto a transição se desliga por
//  completo: o dedo é a autoridade.
//
//  **Não usa `bg-cmp-imposto` nem `dark:`.** O palco escuro é escuro nos
//  DOIS temas (`#0c251e`, ver `MolduraPalco`), e as classes de tema
//  trocariam de valor com a preferência do sistema para um fundo que não
//  muda — que é meio caminho para o modo claro mostrar dois verdes quase
//  pretos um ao lado do outro. A paleta está fixada em `TINTA`, escolhida
//  contra `#0c251e` e não contra o papel da página.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useRef, useState } from "react";
import { m, type Transition } from "motion/react";
import { Building, Check, GripHorizontal, Receipt, Scale, Warning } from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador } from "@/components/palco/atores";
import { ATOS_EMPRESA, DUR, ENTRADA, ASSENTA } from "./coreografia";

/**
 * Euros sem cêntimos, com o separador de milhares SEMPRE.
 *
 * `toLocaleString("pt-PT")` sozinho usa `useGrouping: "auto"`, que suprime o
 * separador em inteiros de quatro dígitos. O palco ficava a dizer
 * «1920 €», «4678 €» e «180 500 €» na mesma vista — três números da mesma
 * grandeza escritos de duas maneiras, e a lê-los depressa os de quatro
 * dígitos parecem ter mais casas do que têm.
 */
const eur0 = (n: number) =>
  `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0, useGrouping: true }).format(
    Math.round(n),
  )} €`;
const mil = (n: number) => `${Math.round(n / 1000)}k€`;

export interface PontoComparacao {
  faturacao: number;
  freelancer: number;
  /** Líquido pela empresa, já com o custo de a ter. */
  empresa: number;
  /** Para onde vai o resto em recibos verdes. Com `freelancer`, soma a faturação. */
  rv: { irs: number; ss: number };
  /** Para onde vai o resto pela sociedade. Com `empresa`, soma a faturação. */
  soc: { irc: number; dividendos: number; contabilidade: number };
}

export interface DadosEmpresa {
  /** Cenários calculados no servidor que alimentam a régua. */
  cenarios: readonly PontoComparacao[];
  /** A faturação em que a empresa passa à frente. `null` se nunca passa. */
  cruzamento: number | null;
  /** O teto da escala: o limite do regime simplificado (Art. 28.º CIRS). */
  limiteSimplificado: number;
  /** O custo anual de ter empresa (contabilidade). */
  custoFixo: number;
  /** A faturação do exemplo editorial usado nas secções abaixo do palco. */
  exemplo: number;
  exemploFreelancer: number;
  exemploEmpresa: number;
}

// ── A paleta, contra `#0c251e` ────────────────────────────────────────
//
//  Quatro tintas e uma regra: o VERDE VIVO é sempre o que fica contigo,
//  em qualquer coluna. Se a fatia verde de uma coluna for maior, é essa a
//  que compensa — e isso tem de se poder ler sem legenda nenhuma.
const TINTA = {
  /** O que fica. */
  fica: "#4FD1A3",
  /** IRS, ou o imposto sobre os dividendos ao retirar o lucro. */
  imposto: "#3E93AE",
  /** Segurança Social, ou o IRC com a derrama. */
  impostoFundo: "#1F5A6B",
  /** O custo fixo de ter empresa. Areia — o tom que o palco já usa para «custo». */
  custo: "#E7C98E",
} as const;

/** A curva de tudo o que cresce, escrita para CSS. */
const CURVA_CSS = `cubic-bezier(${ENTRADA.join(",")})`;

interface Fatia {
  id: string;
  rotulo: string;
  valor: number;
  cor: string;
  /** Só a fatia que fica leva rótulo por dentro. */
  destaque?: boolean;
}

export default function PalcoEmpresa({ dados }: { dados: DadosEmpresa }) {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ NÃO ABRE NO PONTO DE VIRAGEM, E ISSO É O CONTRÁRIO DO ÓBVIO       │
  // │                                                                   │
  // │ A primeira versão abria lá — «é a resposta que o palco tem para   │
  // │ dar». Posto a correr, a cena inteira resolvia-se em «a empresa    │
  // │ passa à frente, +2 €»: no cruzamento os dois caminhos valem, por  │
  // │ definição, o MESMO. As duas colunas ficavam idênticas, a fatia    │
  // │ da contabilidade valia 1% da faturação e não se via, e o          │
  // │ veredicto anunciava uma vitória de dois euros.                     │
  // │                                                                   │
  // │ O cruzamento é o sítio onde a comparação é MENOS legível. Ele já  │
  // │ está dito três vezes — no marcador da calha, no corte da faixa e  │
  // │ no número grande da ficha da viragem. A régua abre no exemplo     │
  // │ editorial, uma faturação onde a diferença se vê e onde o custo    │
  // │ fixo ainda pesa o suficiente para ter uma fatia.                  │
  // └───────────────────────────────────────────────────────────────────┘
  const indiceInicial = useMemo(() => {
    const encontrado = dados.cenarios.findIndex((ponto) => ponto.faturacao === dados.exemplo);
    return encontrado >= 0 ? encontrado : 0;
  }, [dados.cenarios, dados.exemplo]);

  const [indice, setIndice] = useState(indiceInicial);
  const [arrastando, setArrastando] = useState(false);
  const ponto = dados.cenarios[indice] ?? dados.cenarios[0]!;
  const diferenca = ponto.empresa - ponto.freelancer;
  const vence = diferenca > 0 ? "a empresa" : "os recibos verdes";

  return (
    <MolduraPalco
      id="palco-empresa"
      tom="escuro"
      nome="O ponto de viragem"
      resumo={`A mesma faturação anual repartida pelos dois caminhos — recibos verdes e sociedade —, com o custo fixo de ter empresa contado, e a faturação a partir da qual a conta se inverte.`}
      narracao={[
        `A régua vai de ${eur0(dados.cenarios[0]?.faturacao ?? 0)} a ${eur0(dados.limiteSimplificado)} de faturação anual — o limite do regime simplificado, Art. 28.º do CIRS. Abre em ${eur0(ponto.faturacao)} e pode ser ajustada por toque, arrasto ou teclado.`,
        `Com ${eur0(ponto.faturacao)} de faturação: por recibos verdes ficam ${eur0(ponto.freelancer)}, sendo ${eur0(ponto.rv.irs)} de IRS e ${eur0(ponto.rv.ss)} de Segurança Social. Por uma sociedade ficam ${eur0(ponto.empresa)}, sendo ${eur0(ponto.soc.irc)} de IRC com derrama, ${eur0(ponto.soc.dividendos)} de imposto sobre os dividendos e ${eur0(ponto.soc.contabilidade)} de contabilidade.`,
        `Ter empresa custa ${eur0(dados.custoFixo)} por ano em contabilidade certificada, antes de qualquer imposto e mesmo num mês sem faturar. É esse custo fixo que a faturação tem de recuperar antes de a sociedade compensar seja o que for.`,
        dados.cruzamento
          ? `A conta inverte-se aos ${eur0(dados.cruzamento)} de faturação anual: abaixo disso compensam os recibos verdes, acima compensa a sociedade. No cenário escolhido de ${eur0(ponto.faturacao)}, compensam ${vence}, com uma diferença de ${eur0(Math.abs(diferenca))} por ano.`
          : `Até ao limite do regime simplificado a conta nunca se inverte: com estes pressupostos, compensam sempre os recibos verdes.`,
      ]}
      atos={ATOS_EMPRESA}
    >
      {(cena) => (
        <Cena
          cena={cena}
          dados={dados}
          ponto={ponto}
          indice={indice}
          arrastando={arrastando}
          aoMudar={setIndice}
          aoArrastar={setArrastando}
        />
      )}
    </MolduraPalco>
  );
}

function Cena({
  cena,
  dados,
  ponto,
  indice,
  arrastando,
  aoMudar,
  aoArrastar,
}: {
  cena: CenaDoPalco;
  dados: DadosEmpresa;
  ponto: PontoComparacao;
  indice: number;
  arrastando: boolean;
  aoMudar: (indice: number) => void;
  aoArrastar: (arrastando: boolean) => void;
}) {
  const { ato, emCena, estatico } = cena;
  const t = estatico ? { duration: 0 } : { duration: DUR.entrada / 1000, ease: ENTRADA };
  const noAto = (indiceAto: number, beat: string) =>
    estatico || ato > indiceAto || (ato === indiceAto && emCena(beat));

  // ── Ato 1 · o cenário ─────────────────────────────────────────────
  const regua = noAto(0, "regua");
  const valorAberto = noAto(0, "valor");
  const escala = noAto(0, "escala");
  const dominio = noAto(0, "dominio");

  // ── Ato 2 · para onde vai cada euro ───────────────────────────────
  const colunas = noAto(1, "colunas");
  const sobe = noAto(1, "sobe");
  const rotulos = noAto(1, "rotulos");
  const liquidos = noAto(1, "liquidos");

  // ── Ato 3 · o custo ───────────────────────────────────────────────
  // `isola` é o único beat do site que BAIXA coisas em vez de as trazer.
  // Toda a coluna recua para 35% e só a contabilidade fica — o custo
  // vê-se por ser a única coisa acesa, não por ter chegado agora.
  const isola = ato === 2 && !estatico;
  const acende = ato === 2 && emCena("acende");
  const fichaCusto = noAto(2, "ficha");
  const fosso = noAto(2, "fosso");

  // ── Ato 4 · a viragem ─────────────────────────────────────────────
  const parte = noAto(3, "parte");
  const marca = noAto(3, "marca");
  const valorViragem = noAto(3, "valor");
  const veredicto = noAto(3, "veredicto");
  const resolve = estatico || (ato === 3 && emCena("resolve"));

  const diferenca = ponto.empresa - ponto.freelancer;
  const empresaVence = diferenca > 0;

  const fatiasRV: Fatia[] = [
    { id: "fica", rotulo: "Fica contigo", valor: ponto.freelancer, cor: TINTA.fica, destaque: true },
    { id: "irs", rotulo: "IRS", valor: ponto.rv.irs, cor: TINTA.imposto },
    { id: "ss", rotulo: "Segurança Social", valor: ponto.rv.ss, cor: TINTA.impostoFundo },
  ];
  const fatiasSoc: Fatia[] = [
    { id: "fica", rotulo: "Fica contigo", valor: ponto.empresa, cor: TINTA.fica, destaque: true },
    { id: "div", rotulo: "Imposto sobre dividendos", valor: ponto.soc.dividendos, cor: TINTA.imposto },
    { id: "irc", rotulo: "IRC e derrama", valor: ponto.soc.irc, cor: TINTA.impostoFundo },
    { id: "cont", rotulo: "Contabilidade", valor: ponto.soc.contabilidade, cor: TINTA.custo },
  ];

  return (
    <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,.62fr)] lg:items-start">
      <div className="min-w-0 space-y-3">
        <ReguaFaturacao
          dados={dados}
          ponto={ponto}
          indice={indice}
          arrastando={arrastando}
          aoMudar={aoMudar}
          aoArrastar={aoArrastar}
          estatico={estatico}
          visivel={regua}
          valorAberto={valorAberto}
          escalaAberta={escala}
          dominioAberto={dominio}
          partido={parte}
          marcado={marca}
          transicao={t}
        />

        <m.div
          initial={false}
          animate={{ opacity: colunas ? 1 : 0, y: colunas ? 0 : 10 }}
          transition={t}
          className="rounded-3xl border border-white/10 bg-black/20 p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
              Para onde vai cada euro
            </h3>
            <p className="text-[10px] text-white/40">
              Mesma altura porque parte da mesma faturação
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-4">
            <ColunaRepartida
              titulo="Recibos verdes"
              Icone={Receipt}
              fatias={fatiasRV}
              total={ponto.faturacao}
              liquido={ponto.freelancer}
              cresceu={sobe}
              mostraLiquido={liquidos}
              mostraRotulo={rotulos}
              vence={!empresaVence}
              recuada={isola}
              estatico={estatico}
              arrastando={arrastando}
            />
            <ColunaRepartida
              titulo="Empresa"
              Icone={Building}
              fatias={fatiasSoc}
              total={ponto.faturacao}
              liquido={ponto.empresa}
              cresceu={sobe}
              mostraLiquido={liquidos}
              mostraRotulo={rotulos}
              vence={empresaVence}
              recuada={isola}
              acesa={acende ? "cont" : undefined}
              estatico={estatico}
              arrastando={arrastando}
            />
          </div>

          <Legenda visivel={rotulos} transicao={t} />
        </m.div>
      </div>

      {/* ── A leitura ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-3">
        <m.div
          initial={false}
          animate={{ opacity: fichaCusto ? 1 : 0.25, y: fichaCusto ? 0 : -6 }}
          transition={t}
          className="rounded-3xl border border-[#e7c98e]/25 bg-[#e7c98e]/[.07] p-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#e7c98e]">
            <Warning size={12} /> O custo de ter
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-2xl font-semibold tabular-nums text-white">
              {eur0(dados.custoFixo)}
            </span>
            <span className="text-[11px] font-semibold text-white/45">por ano</span>
          </div>
          <m.p
            initial={false}
            animate={{ opacity: fosso ? 1 : 0 }}
            transition={t}
            className="mt-2 text-[11px] leading-relaxed text-white/55"
          >
            Contabilidade certificada, obrigatória e mensal — mesmo num mês sem faturar. Sai antes
            de qualquer imposto, e é o fosso que a faturação tem de recuperar primeiro.
          </m.p>
        </m.div>

        <m.div
          initial={false}
          animate={{ opacity: valorViragem ? 1 : 0.2, y: valorViragem ? 0 : 8 }}
          transition={t}
          className="rounded-3xl border border-brand-mint/25 bg-brand-mint/[.06] p-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-brand-mint">
            <Scale size={12} /> A viragem
          </div>
          {dados.cruzamento ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-[clamp(1.9rem,4.4vw,2.9rem)] font-semibold leading-none tabular-nums text-white">
                  {estatico || !valorViragem ? (
                    eur0(dados.cruzamento)
                  ) : (
                    <Contador
                      valor={dados.cruzamento}
                      formato={eur0}
                      inicial={0}
                      duracao={DUR.contaResultado}
                    />
                  )}
                </span>
                <span className="text-xs font-semibold text-white/45">/ ano</span>
              </div>
              <m.p
                initial={false}
                animate={{ opacity: resolve ? 1 : 0 }}
                transition={t}
                className="mt-2 text-[11px] leading-relaxed text-white/55"
              >
                Abaixo compensam os recibos verdes; acima, a sociedade. Com os lucros todos
                retirados, a viragem só acontece perto do teto do regime simplificado — e acima
                desse teto a pergunta deixa de ser esta.
              </m.p>
            </>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-white/55">
              Até ao limite do regime simplificado a conta nunca se inverte: com estes pressupostos,
              compensam sempre os recibos verdes.
            </p>
          )}
        </m.div>

        <m.div
          initial={false}
          animate={{ opacity: veredicto ? 1 : 0, y: veredicto ? 0 : 8 }}
          transition={t}
          className="mt-auto rounded-3xl bg-brand p-4 text-white shadow-[0_14px_34px_rgba(10,74,57,.35)]"
        >
          <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/60">
            No cenário escolhido · {eur0(ponto.faturacao)}
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-xs font-semibold">
              {/* Menos de um euro é um empate, e chamar-lhe vitória seria
                  transformar ruído de arredondamento numa recomendação. */}
              {Math.abs(diferenca) < 1
                ? "Aqui as duas valem o mesmo"
                : empresaVence
                  ? "A empresa passa à frente"
                  : "Compensam os recibos verdes"}
            </span>
            {Math.abs(diferenca) >= 1 ? (
              <span className="font-display text-xl font-semibold tabular-nums">
                +{eur0(Math.abs(diferenca))}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-white/65">
            {Math.abs(diferenca) < 1
              ? "É este o ponto de viragem: a faturação em que a conta se inverte."
              : "Diferença de líquido anual, com os mesmos pressupostos nos dois lados."}
          </p>
        </m.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  A COLUNA REPARTIDA
//  ---------------------------------------------------------------------
//  Uma coluna de altura fixa, `flex-col-reverse`, com as fatias em
//  percentagem da faturação. Cresce porque as percentagens vão de 0 à sua
//  quota e o CSS interpola — não há relógio, não há `setState`, e uma
//  pausa a meio deixa a transição onde está sem nada continuar a mexer.
//
//  ⚠️ Durante um arrasto a transição é DESLIGADA. O dedo é a autoridade:
//  interpolar 720 ms entre o que o dedo faz e o que a coluna mostra
//  lê-se como atraso, não como suavidade — a mesma regra que o `Contador`
//  já cumpre com `imediato`.
// ═══════════════════════════════════════════════════════════════════════
const ALTURA = 172;

function ColunaRepartida({
  titulo,
  Icone,
  fatias,
  total,
  liquido,
  cresceu,
  mostraLiquido,
  mostraRotulo,
  vence,
  recuada,
  acesa,
  estatico,
  arrastando,
}: {
  titulo: string;
  Icone: (props: { size?: number; className?: string }) => React.ReactNode;
  fatias: readonly Fatia[];
  total: number;
  liquido: number;
  cresceu: boolean;
  mostraLiquido: boolean;
  mostraRotulo: boolean;
  vence: boolean;
  /** O ato do custo baixa tudo o que não é o custo. */
  recuada: boolean;
  /** A fatia que fica acesa enquanto o resto recua. */
  acesa?: string;
  estatico: boolean;
  arrastando: boolean;
}) {
  const quota = (valor: number) => (total > 0 ? (Math.max(0, valor) / total) * 100 : 0);
  const pctFica = quota(liquido);
  const duracao = estatico || arrastando ? "0ms" : "720ms";

  return (
    <div className="flex min-w-0 flex-col">
      {/* O visto encosta ao VALOR e não à margem da coluna: empurrado para
          a direita por `justify-between`, ficava a meio caminho entre as
          duas colunas e parecia pertencer à do lado. */}
      <div
        className="flex min-h-[1.15rem] items-center gap-1 transition-opacity duration-300"
        style={{ opacity: mostraLiquido ? 1 : 0 }}
      >
        <span
          className="truncate text-[11px] font-bold tabular-nums"
          style={{ color: TINTA.fica }}
        >
          {eur0(liquido)}
        </span>
        {/* O ícone herda a cor: `Icons.tsx` não aceita `style`, e envolvê-lo
            num `span` que a define é a forma que o resto da casa já usa. */}
        {vence ? (
          <span className="flex flex-shrink-0 items-center" style={{ color: TINTA.fica }}>
            <Check size={10} />
          </span>
        ) : null}
      </div>

      <div
        role="img"
        aria-label={`${titulo}: de ${eur0(total)} ficam ${eur0(liquido)}, ${Math.round(pctFica)} por cento.`}
        className={`mt-1 flex w-full flex-col-reverse overflow-hidden rounded-2xl transition-[box-shadow,opacity] duration-500 ${
          vence ? "ring-2 ring-[#4FD1A3]/55" : "ring-1 ring-white/10"
        }`}
        style={{ height: ALTURA }}
      >
        {fatias.map((fatia) => {
          const pct = cresceu ? quota(fatia.valor) : 0;
          // Recuar é baixar a opacidade, nunca a altura: uma fatia que
          // encolhe é uma fatia que vale menos, e neste ato nada mudou de
          // valor. Ver o cabeçalho da coreografia.
          const recuo = recuada && acesa !== undefined && fatia.id !== acesa ? 0.22 : 1;
          return (
            <div
              key={fatia.id}
              title={`${fatia.rotulo}: ${eur0(fatia.valor)}`}
              className="relative w-full"
              style={{
                height: `${pct}%`,
                backgroundColor: fatia.cor,
                opacity: recuada && acesa === undefined ? 0.35 : recuo,
                transitionProperty: "height, opacity",
                transitionDuration: duracao === "0ms" ? "0ms, 0ms" : `${duracao}, 420ms`,
                transitionTimingFunction: `${CURVA_CSS}, ${CURVA_CSS}`,
              }}
            >
              {fatia.destaque && pct >= 20 ? (
                <span
                  className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-bold tabular-nums transition-opacity duration-300"
                  style={{ color: "#08201A", opacity: mostraRotulo ? 1 : 0 }}
                >
                  {Math.round(pct)}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold transition-opacity duration-300"
        style={{ opacity: mostraRotulo ? 1 : 0.35, color: vence ? "#FFFFFF" : "rgba(255,255,255,.55)" }}
      >
        <Icone size={11} />
        <span className="truncate">{titulo}</span>
      </div>
    </div>
  );
}

function Legenda({
  visivel,
  transicao,
}: {
  visivel: boolean;
  transicao: Transition;
}) {
  const ITENS = [
    { cor: TINTA.fica, texto: "Fica contigo" },
    { cor: TINTA.imposto, texto: "IRS / dividendos" },
    { cor: TINTA.impostoFundo, texto: "Seg. Social / IRC" },
    { cor: TINTA.custo, texto: "Contabilidade" },
  ];
  return (
    <m.ul
      initial={false}
      animate={{ opacity: visivel ? 1 : 0 }}
      transition={transicao}
      className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-white/10 pt-2.5 text-[9px] font-medium text-white/50"
    >
      {ITENS.map((item) => (
        <li key={item.texto} className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.cor }}
          />
          {item.texto}
        </li>
      ))}
    </m.ul>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  A RÉGUA DE FATURAÇÃO
//  ---------------------------------------------------------------------
//  O mesmo controlo do comparador de cenários, com a pele do palco
//  escuro. Um `div` com `role="slider"` e não um `<input type="range">`,
//  por três razões que só aparecem quando se tenta:
//
//   · O nativo não deixa desenhar NADA dentro da calha. O marcador da
//     viragem — que é a resposta do palco — tinha de viver numa legenda
//     por baixo, longe do sítio onde acontece.
//   · Estilar o puxador exige uma cadeia de `::-webkit-slider-thumb`,
//     `::-moz-range-thumb` e `::-moz-range-track` que diverge entre
//     motores e não aceita animação de escala ao premir.
//   · `setPointerCapture` dá arrasto que continua fora do elemento, que é
//     o que um dedo faz.
//
//  O que o nativo dava de graça — teclado e semântica — está aqui
//  explícito: `aria-valuemin/max/now/text`, setas com `Shift` para saltos
//  largos, `Home`/`End`, e `touch-action: none` para o arrasto não virar
//  scroll da página.
// ═══════════════════════════════════════════════════════════════════════
function ReguaFaturacao({
  dados,
  ponto,
  indice,
  arrastando,
  aoMudar,
  aoArrastar,
  estatico,
  visivel,
  valorAberto,
  escalaAberta,
  dominioAberto,
  partido,
  marcado,
  transicao,
}: {
  dados: DadosEmpresa;
  ponto: PontoComparacao;
  indice: number;
  arrastando: boolean;
  aoMudar: (indice: number) => void;
  aoArrastar: (arrastando: boolean) => void;
  estatico: boolean;
  visivel: boolean;
  valorAberto: boolean;
  escalaAberta: boolean;
  dominioAberto: boolean;
  partido: boolean;
  marcado: boolean;
  transicao: Transition;
}) {
  const calhaRef = useRef<HTMLDivElement>(null);
  const ultimo = dados.cenarios.length - 1;
  const primeiro = dados.cenarios[0]?.faturacao ?? 0;
  const fim = dados.cenarios[ultimo]?.faturacao ?? primeiro;

  /** Onde, em percentagem da calha, cai uma faturação. */
  const posicao = useCallback(
    (faturacao: number) =>
      fim > primeiro
        ? Math.min(100, Math.max(0, ((faturacao - primeiro) / (fim - primeiro)) * 100))
        : 0,
    [primeiro, fim],
  );

  const pctAtual = posicao(ponto.faturacao);
  const pctViragem = dados.cruzamento !== null ? posicao(dados.cruzamento) : null;

  const fixar = useCallback(
    (novo: number) => aoMudar(Math.max(0, Math.min(ultimo, novo))),
    [aoMudar, ultimo],
  );

  /**
   * O cenário mais próximo de um `clientX`.
   *
   * Procura pela FATURAÇÃO e não pelo índice: a grelha tem um degrau extra
   * — o ponto exato da viragem —, e por isso os índices não estão
   * igualmente espaçados. Escolher por índice fazia o puxador saltar por
   * cima da própria resposta que o palco existe para mostrar.
   */
  const maisProximo = useCallback(
    (clientX: number) => {
      const el = calhaRef.current;
      if (!el) return indice;
      const { left, width } = el.getBoundingClientRect();
      const fracao = Math.max(0, Math.min(1, (clientX - left) / Math.max(1, width)));
      const alvo = primeiro + fracao * (fim - primeiro);
      let melhor = 0;
      let menorDistancia = Infinity;
      for (let i = 0; i < dados.cenarios.length; i += 1) {
        const distancia = Math.abs(dados.cenarios[i].faturacao - alvo);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          melhor = i;
        }
      }
      return melhor;
    },
    [dados.cenarios, indice, primeiro, fim],
  );

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ `setPointerCapture` ATIRA, E ATIRAR AQUI DESMONTA O PALCO         │
  // │                                                                   │
  // │ Lança `NotFoundError` quando o `pointerId` já não está ativo — um │
  // │ toque que acabou entre o evento e o tratador, um ponteiro         │
  // │ sintético, um gesto cancelado pelo sistema. E uma exceção por     │
  // │ tratar dentro de um tratador de eventos do React derruba a árvore │
  // │ inteira: o palco DESAPARECE do ecrã.                              │
  // │                                                                   │
  // │ Apanhado a medir, não a ler: um arrasto de dedo sintetizado por   │
  // │ CDP fazia `document.querySelector('[role=slider]')` devolver      │
  // │ `null` a seguir. E como a captura era a PRIMEIRA linha, um toque  │
  // │ simples também não movia nada — a exceção acontecia antes de o    │
  // │ valor ser atualizado.                                             │
  // │                                                                   │
  // │ Ordem certa: primeiro o que a pessoa pediu, depois o conforto de  │
  // │ o arrasto continuar fora do elemento. A captura é uma comodidade; │
  // │ o valor não é.                                                    │
  // └───────────────────────────────────────────────────────────────────┘
  const aoDescer = useCallback(
    (evento: React.PointerEvent) => {
      aoArrastar(true);
      fixar(maisProximo(evento.clientX));
      try {
        evento.currentTarget.setPointerCapture(evento.pointerId);
      } catch {
        /* sem captura: o arrasto pára ao sair do elemento, e mais nada. */
      }
    },
    [aoArrastar, fixar, maisProximo],
  );

  const aoMover = useCallback(
    (evento: React.PointerEvent) => {
      if (arrastando) fixar(maisProximo(evento.clientX));
    },
    [arrastando, fixar, maisProximo],
  );

  const aoSubir = useCallback(() => aoArrastar(false), [aoArrastar]);

  const aoTeclar = useCallback(
    (evento: React.KeyboardEvent) => {
      // `Shift` salta cinco degraus — 25 000 € — para atravessar a escala
      // sem trinta e nove toques na seta.
      const passo = evento.shiftKey ? 5 : 1;
      const teclas: Record<string, number | undefined> = {
        ArrowRight: indice + passo,
        ArrowUp: indice + passo,
        ArrowLeft: indice - passo,
        ArrowDown: indice - passo,
        Home: 0,
        End: ultimo,
      };
      const destino = teclas[evento.key];
      if (destino === undefined) return;
      evento.preventDefault();
      fixar(destino);
    },
    [indice, ultimo, fixar],
  );

  // Concordância: «a empresa DEIXA», «os recibos verdes DEIXAM». O sujeito
  // e o verbo viajam juntos para não voltar a haver um a mudar sem o outro.
  const diferencaAqui = Math.abs(ponto.empresa - ponto.freelancer);
  const frase =
    diferencaAqui < 1
      ? "Neste cenário, os dois caminhos deixam praticamente o mesmo líquido."
      : `${
          ponto.empresa > ponto.freelancer ? "A empresa deixa" : "Os recibos verdes deixam"
        } ${eur0(diferencaAqui)} a mais por ano.`;

  return (
    <m.div
      initial={false}
      animate={{ opacity: visivel ? 1 : 0, y: visivel ? 0 : -8 }}
      transition={transicao}
      className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/[.05] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07)] sm:px-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-brand/25 blur-3xl"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <span
            id="empresa-regua-rotulo"
            className="block text-[10px] font-bold uppercase tracking-[.16em] text-brand-mint"
          >
            Faturação anual do cenário
          </span>
          <m.output
            initial={false}
            animate={{ opacity: valorAberto ? 1 : 0 }}
            transition={transicao}
            className="mt-0.5 block font-display text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-none tabular-nums text-white"
          >
            {eur0(ponto.faturacao)}
          </m.output>
        </div>
        {/* ⚠️ SEM `aria-live`, e é deliberado.
            `MolduraPalco` já garante «uma região viva por palco», e esta
            era a segunda: a auditoria contava duas em `empresa` e mais
            nenhum palco tinha isso. Pior do que a contagem é o efeito —
            o `role="slider"` anuncia esta mesma frase em `aria-valuetext`
            a cada mudança, portanto quem usa leitor de ecrã ouvia-a duas
            vezes por cada passo da seta. O texto fica; o anúncio é do
            controlo, que é quem sabe quando mudou. */}
        <m.p
          initial={false}
          animate={{ opacity: valorAberto ? 1 : 0 }}
          transition={transicao}
          className="min-w-0 max-w-[15rem] text-[11px] font-semibold leading-relaxed text-white/70"
        >
          {frase}
        </m.p>
      </div>

      {/* A calha: alvo de 40 px de altura, barra visual de 10 px. */}
      <div
        ref={calhaRef}
        role="slider"
        tabIndex={0}
        aria-labelledby="empresa-regua-rotulo"
        aria-valuemin={primeiro}
        aria-valuemax={fim}
        aria-valuenow={ponto.faturacao}
        aria-valuetext={`${eur0(ponto.faturacao)} por ano. ${frase}`}
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoSubir}
        onPointerCancel={aoSubir}
        onKeyDown={aoTeclar}
        style={{ touchAction: "none" }}
        className={`focus-marca relative mt-4 h-10 select-none rounded-full ${
          arrastando ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/12"
        >
          <span
            className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-mint"
            style={{
              width: `${pctAtual}%`,
              transition: estatico || arrastando ? "none" : `width 240ms ${CURVA_CSS}`,
            }}
          />
        </span>

        {/* O marcador da viragem, DENTRO da calha. É a razão de este
            controlo não poder ser um `<input type="range">`. */}
        {pctViragem !== null ? (
          <m.span
            aria-hidden
            initial={false}
            animate={{ opacity: marcado ? 1 : 0, scaleY: marcado ? 1 : 0.3 }}
            transition={estatico ? { duration: 0 } : { duration: DUR.assenta / 1000, ease: ASSENTA }}
            className="pointer-events-none absolute top-1/2 z-10 h-6 w-[2px] -translate-y-1/2 rounded-full bg-brand-mint"
            style={{ left: `${pctViragem}%` }}
          />
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${pctAtual}%`,
            transition: estatico || arrastando ? "none" : `left 240ms ${CURVA_CSS}`,
          }}
        >
          {/* Envolvente posiciona, interior anima — separar as duas coisas
              é o que impede a escala de premir arrastar a posição com ela. */}
          <m.div
            initial={false}
            animate={{ scale: arrastando ? 1.16 : 1 }}
            transition={{ duration: 0.1 }}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[#0c251e] transition-shadow duration-100 ${
                arrastando
                  ? "border-brand-mint shadow-[0_0_0_5px_rgba(159,225,203,.22)]"
                  : "border-brand-mint/80 shadow-[0_2px_12px_rgba(0,0,0,.45)]"
              }`}
            >
              <GripHorizontal size={13} className="text-brand-mint" />
            </span>
          </m.div>
        </div>
      </div>

      <m.div
        initial={false}
        animate={{ opacity: escalaAberta ? 1 : 0 }}
        transition={transicao}
        className="mt-0.5 flex items-center justify-between text-[9px] font-semibold tabular-nums text-white/35"
      >
        <span>{mil(primeiro)}</span>
        <span className="text-white/45">arrasta, toca ou usa as setas</span>
        <span>{mil(fim)}</span>
      </m.div>

      {/* ── A FAIXA DO DOMÍNIO ───────────────────────────────────────
          A pergunta é um LIMIAR, e um limiar tem duas zonas e um corte.
          Entra neutra no ato 1 — ainda não há resposta — e PARTE-SE no
          ato 4, que é o acontecimento que dá nome ao palco. Uma barra
          com um corte diz «a partir daqui» de uma vez; uma curva a subir
          obriga a procurar onde é que ela passa o zero. */}
      <m.div
        initial={false}
        animate={{ opacity: dominioAberto ? 1 : 0 }}
        transition={transicao}
        className="mt-3"
      >
        <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
          <span
            className="absolute inset-y-0 left-0 bg-brand/45"
            style={{
              width: `${partido && pctViragem !== null ? pctViragem : 100}%`,
              transition: estatico ? "none" : `width 620ms ${CURVA_CSS}`,
            }}
          />
          {pctViragem !== null ? (
            <span
              className="absolute inset-y-0 right-0 bg-[#e7c98e]/45"
              style={{
                width: `${partido ? 100 - pctViragem : 0}%`,
                transition: estatico ? "none" : `width 620ms ${CURVA_CSS}`,
              }}
            />
          ) : null}
        </div>
        <m.div
          initial={false}
          animate={{ opacity: partido ? 1 : 0 }}
          transition={transicao}
          className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[9px] font-semibold"
        >
          {pctViragem !== null && dados.cruzamento !== null ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Recibos verdes até {eur0(dados.cruzamento)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e7c98e]" />
                Empresa acima disso
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Recibos verdes em toda a escala testada
            </span>
          )}
        </m.div>
      </m.div>
    </m.div>
  );
}
