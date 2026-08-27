"use client";

// «O PONTO DE VIRAGEM» — a régua boa, o gráfico que faltava.
//
// A curva de diferença regressa, mas já não cresce através de `setState` a
// 60 Hz. O caminho inteiro é calculado uma vez e o browser anima apenas
// `pathLength` e opacidade. Ao arrastar a régua movem-se uma guia e um ponto;
// o dedo continua a ser a autoridade.

import { useCallback, useMemo, useRef, useState } from "react";
import { m, type Transition } from "motion/react";
import {
  Building,
  Check,
  GripHorizontal,
  Receipt,
  Scale,
  Warning,
} from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador } from "@/components/palco/atores";
import { ATOS_EMPRESA, DUR, ENTRADA, ASSENTA } from "./coreografia";

const eur0 = (n: number) =>
  `${new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.round(n))} €`;
const mil = (n: number) => `${Math.round(n / 1000)}k€`;

export interface PontoComparacao {
  faturacao: number;
  freelancer: number;
  /** Líquido pela empresa, já com o custo de a ter. */
  empresa: number;
  /** Contrafactual calculado pelo motor sem custo de contabilidade. */
  empresaSemCustos: number;
  rv: { irs: number; ss: number };
  soc: { irc: number; dividendos: number; contabilidade: number };
}

export interface DadosEmpresa {
  cenarios: readonly PontoComparacao[];
  cruzamento: number | null;
  /** Referência do Art. 28.º, n.º 2, do CIRS usada como teto editorial. */
  limiteSimplificado: number;
  custoFixo: number;
  exemplo: number;
  exemploFreelancer: number;
  exemploEmpresa: number;
}

const TINTA = {
  rv: "#4FD1A3",
  empresa: "#E7C98E",
} as const;

const CURVA_CSS = `cubic-bezier(${ENTRADA.join(",")})`;

export default function PalcoEmpresa({ dados }: { dados: DadosEmpresa }) {
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
      resumo="A diferença entre o líquido de uma sociedade e o de recibos verdes ao longo da faturação anual. A régua escolhe o cenário; onde a curva cruza o zero está a viragem."
      narracao={[
        `A régua vai de ${eur0(dados.cenarios[0]?.faturacao ?? 0)} a ${eur0(dados.limiteSimplificado)} de faturação anual. Os ${eur0(dados.limiteSimplificado)} são a referência do Art. 28.º, n.º 2, do CIRS; a cessação do regime segue regras próprias. Abre em ${eur0(ponto.faturacao)} e pode ser ajustada por toque, arrasto ou teclado.`,
        `A curva mostra empresa menos recibos verdes. Abaixo do zero deixam mais líquido os recibos verdes; acima, a sociedade. No cenário de ${eur0(ponto.faturacao)}, ficam ${eur0(ponto.freelancer)} por recibos verdes e ${eur0(ponto.empresa)} pela sociedade.`,
        `A linha tracejada mostra o contrafactual sem contabilidade; a linha sólida inclui ${eur0(dados.custoFixo)} por ano de contabilidade certificada. O contrafactual é recalculado pelo motor, porque esse custo também altera o lucro tributável.`,
        dados.cruzamento
          ? `Neste cenário simplificado, sem remuneração de gerência e com os lucros todos distribuídos, a conta inverte-se aos ${eur0(dados.cruzamento)}. No ponto escolhido compensam ${vence}, por ${eur0(Math.abs(diferenca))} por ano.`
          : `Nesta escala e com estes pressupostos, a curva não cruza o zero: compensam sempre os recibos verdes.`,
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

  const regua = noAto(0, "regua");
  const valorAberto = noAto(0, "valor");
  const escala = noAto(0, "escala");
  const dominio = noAto(0, "dominio");

  const grafico = noAto(1, "grafico");
  const traca = noAto(1, "traca");
  const pinta = noAto(1, "pinta");
  const leitura = noAto(1, "leitura");

  const contrafactual = noAto(2, "contrafactual");
  const fosso = noAto(2, "fosso");
  const fichaCusto = noAto(2, "ficha");
  const explicaCusto = noAto(2, "explica");

  const parte = noAto(3, "parte");
  const marca = noAto(3, "marca");
  const valorViragem = noAto(3, "valor");
  const veredicto = noAto(3, "veredicto");
  const resolve = estatico || (ato === 3 && emCena("resolve"));

  return (
    <div className="relative space-y-3">
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

      <GraficoVantagem
        dados={dados}
        ponto={ponto}
        arrastando={arrastando}
        estatico={estatico}
        visivel={grafico}
        tracado={traca}
        pintado={pinta}
        leituraVisivel={leitura}
        contrafactualVisivel={contrafactual}
        fossoVisivel={fosso}
        viragemVisivel={marca}
        veredictoVisivel={veredicto}
        transicao={t}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <m.div
          initial={false}
          animate={{ opacity: fichaCusto ? 1 : 0.2, y: fichaCusto ? 0 : 6 }}
          transition={t}
          className="rounded-3xl border border-[#e7c98e]/25 bg-[#e7c98e]/[.07] p-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#e7c98e]">
            <Warning size={12} /> O custo que afasta as curvas
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-2xl font-semibold tabular-nums text-white">
              {eur0(dados.custoFixo)}
            </span>
            <span className="text-[11px] font-semibold text-white/45">por ano</span>
          </div>
          <m.p
            initial={false}
            animate={{ opacity: explicaCusto ? 1 : 0 }}
            transition={t}
            className="mt-2 text-[11px] leading-relaxed text-white/55"
          >
            A linha tracejada é o contrafactual sem contabilidade. A distância até à linha real não
            é uma soma direta: o custo é dedutível e também altera IRC, derrama e dividendos.
          </m.p>
        </m.div>

        <m.div
          initial={false}
          animate={{ opacity: valorViragem ? 1 : 0.2, y: valorViragem ? 0 : 6 }}
          transition={t}
          className="rounded-3xl border border-brand-mint/25 bg-brand-mint/[.06] p-4"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-brand-mint">
            <Scale size={12} /> A viragem deste cenário
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
                Sem remuneração de gerência e com todo o lucro distribuído. Não é um limiar
                universal: despesas, salário de gerente e lucros retidos mudam a curva.
              </m.p>
            </>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-white/55">
              A curva não cruza o zero nesta escala e com estes pressupostos.
            </p>
          )}
        </m.div>
      </div>
    </div>
  );
}

const GRAFICO = {
  largura: 720,
  altura: 284,
  margem: { esq: 20, dir: 14, topo: 24, base: 30 },
} as const;

const diferencaReal = (ponto: PontoComparacao) => ponto.empresa - ponto.freelancer;
const diferencaSemCustos = (ponto: PontoComparacao) =>
  ponto.empresaSemCustos - ponto.freelancer;

function GraficoVantagem({
  dados,
  ponto,
  arrastando,
  estatico,
  visivel,
  tracado,
  pintado,
  leituraVisivel,
  contrafactualVisivel,
  fossoVisivel,
  viragemVisivel,
  veredictoVisivel,
  transicao,
}: {
  dados: DadosEmpresa;
  ponto: PontoComparacao;
  arrastando: boolean;
  estatico: boolean;
  visivel: boolean;
  tracado: boolean;
  pintado: boolean;
  leituraVisivel: boolean;
  contrafactualVisivel: boolean;
  fossoVisivel: boolean;
  viragemVisivel: boolean;
  veredictoVisivel: boolean;
  transicao: Transition;
}) {
  const geometria = useMemo(() => {
    const { largura, altura, margem } = GRAFICO;
    const faturacoes = dados.cenarios.map((item) => item.faturacao);
    const minX = Math.min(...faturacoes);
    const maxX = Math.max(...faturacoes);
    const valores = dados.cenarios.flatMap((item) => [
      0,
      diferencaReal(item),
      diferencaSemCustos(item),
    ]);
    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const folga = Math.max(700, (maximo - minimo) * 0.12);
    const minY = minimo - folga;
    const maxY = maximo + folga;
    const px = (faturacao: number) =>
      margem.esq +
      ((faturacao - minX) / Math.max(1, maxX - minX)) * (largura - margem.esq - margem.dir);
    const py = (valor: number) =>
      altura -
      margem.base -
      ((valor - minY) / Math.max(1, maxY - minY)) * (altura - margem.topo - margem.base);
    const pontosReais = dados.cenarios.map((item) => [px(item.faturacao), py(diferencaReal(item))]);
    const pontosSemCusto = dados.cenarios.map((item) => [
      px(item.faturacao),
      py(diferencaSemCustos(item)),
    ]);
    const caminho = (pontos: number[][]) =>
      pontos.map(([x, y], indice) => `${indice === 0 ? "M" : "L"}${x},${y}`).join(" ");
    const yZero = py(0);
    const linhaReal = caminho(pontosReais);
    const linhaSemCusto = caminho(pontosSemCusto);
    const area = `${linhaReal} L${pontosReais.at(-1)?.[0] ?? 0},${yZero} L${pontosReais[0]?.[0] ?? 0},${yZero} Z`;
    const faixaCusto = `${caminho(pontosSemCusto)} ${[...pontosReais]
      .reverse()
      .map(([x, y]) => `L${x},${y}`)
      .join(" ")} Z`;
    return { minX, maxX, px, py, yZero, linhaReal, linhaSemCusto, area, faixaCusto };
  }, [dados.cenarios]);

  const xAtual = geometria.px(ponto.faturacao);
  const yAtual = geometria.py(diferencaReal(ponto));
  const xViragem = dados.cruzamento === null ? null : geometria.px(dados.cruzamento);
  const diferenca = diferencaReal(ponto);
  const empresaVence = diferenca > 0;
  const empate = Math.abs(diferenca) < 1;
  const marcas = [
    geometria.minX,
    geometria.minX + (geometria.maxX - geometria.minX) / 2,
    geometria.maxX,
  ];

  return (
    <m.div
      initial={false}
      animate={{ opacity: visivel ? 1 : 0, y: visivel ? 0 : 10 }}
      transition={transicao}
      className="overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[.17em] text-white/35">
            A diferença · empresa menos recibos verdes
          </div>
          <h3 className="mt-1 text-xs font-semibold text-white/85">
            Quem deixa mais líquido — e por quanto
          </h3>
        </div>
        <m.div
          initial={false}
          animate={{ opacity: leituraVisivel ? 1 : 0 }}
          transition={transicao}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-semibold text-white/60"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full bg-[#e7c98e]" /> conta real
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t border-dashed border-white/55" /> sem contabilidade
          </span>
        </m.div>
      </div>

      <svg
        viewBox={`0 0 ${GRAFICO.largura} ${GRAFICO.altura}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Curva da diferença de líquido anual. Em ${eur0(ponto.faturacao)}, ${
          empate
            ? "os dois caminhos deixam praticamente o mesmo"
            : empresaVence
              ? `a empresa deixa ${eur0(Math.abs(diferenca))} a mais`
              : `os recibos verdes deixam ${eur0(Math.abs(diferenca))} a mais`
        }.`}
      >
        <defs>
          <linearGradient id="empresa-area-acima" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E7C98E" stopOpacity=".3" />
            <stop offset="1" stopColor="#E7C98E" stopOpacity=".03" />
          </linearGradient>
          <linearGradient id="empresa-area-abaixo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4FD1A3" stopOpacity=".03" />
            <stop offset="1" stopColor="#4FD1A3" stopOpacity=".25" />
          </linearGradient>
          <clipPath id="empresa-acima-zero">
            <rect x="0" y="0" width={GRAFICO.largura} height={Math.max(0, geometria.yZero)} />
          </clipPath>
          <clipPath id="empresa-abaixo-zero">
            <rect
              x="0"
              y={geometria.yZero}
              width={GRAFICO.largura}
              height={Math.max(0, GRAFICO.altura - geometria.yZero)}
            />
          </clipPath>
        </defs>

        {[0.2, 0.4, 0.6, 0.8].map((fracao) => {
          const y =
            GRAFICO.margem.topo +
            (GRAFICO.altura - GRAFICO.margem.topo - GRAFICO.margem.base) * fracao;
          return (
            <line
              key={fracao}
              x1={GRAFICO.margem.esq}
              x2={GRAFICO.largura - GRAFICO.margem.dir}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,.055)"
              strokeWidth="1"
            />
          );
        })}

        <line
          x1={GRAFICO.margem.esq}
          x2={GRAFICO.largura - GRAFICO.margem.dir}
          y1={geometria.yZero}
          y2={geometria.yZero}
          stroke="rgba(255,255,255,.46)"
          strokeWidth="1.5"
        />
        <text x={GRAFICO.margem.esq + 4} y={geometria.yZero - 7} fill="rgba(255,255,255,.48)" fontSize="9" fontWeight="700">
          valem o mesmo
        </text>
        <text x={GRAFICO.margem.esq + 4} y={16} fill="rgba(231,201,142,.58)" fontSize="8" fontWeight="700">
          EMPRESA À FRENTE
        </text>
        <text x={GRAFICO.margem.esq + 4} y={GRAFICO.altura - GRAFICO.margem.base - 5} fill="rgba(79,209,163,.58)" fontSize="8" fontWeight="700">
          RECIBOS VERDES À FRENTE
        </text>

        <m.path
          d={geometria.faixaCusto}
          fill="rgba(231,201,142,.12)"
          initial={false}
          animate={{ opacity: fossoVisivel ? 1 : 0 }}
          transition={transicao}
        />
        <m.path
          d={geometria.area}
          fill="url(#empresa-area-acima)"
          clipPath="url(#empresa-acima-zero)"
          initial={false}
          animate={{ opacity: pintado ? 1 : 0 }}
          transition={transicao}
        />
        <m.path
          d={geometria.area}
          fill="url(#empresa-area-abaixo)"
          clipPath="url(#empresa-abaixo-zero)"
          initial={false}
          animate={{ opacity: pintado ? 1 : 0 }}
          transition={transicao}
        />

        <m.path
          d={geometria.linhaSemCusto}
          fill="none"
          stroke="rgba(255,255,255,.5)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: contrafactualVisivel ? 1 : 0, opacity: contrafactualVisivel ? 1 : 0 }}
          transition={estatico ? { duration: 0 } : { duration: 0.9, ease: ENTRADA }}
        />
        <m.path
          data-empresa-curva="real"
          d={geometria.linhaReal}
          fill="none"
          stroke={TINTA.empresa}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: tracado ? 1 : 0, opacity: tracado ? 1 : 0 }}
          transition={estatico ? { duration: 0 } : { duration: 1.35, ease: ENTRADA }}
        />

        {xViragem !== null ? (
          <m.g
            initial={false}
            animate={{ opacity: viragemVisivel ? 1 : 0, scale: viragemVisivel ? 1 : 0.6 }}
            style={{ transformOrigin: `${xViragem}px ${geometria.yZero}px` }}
            transition={estatico ? { duration: 0 } : { duration: DUR.assenta / 1000, ease: ASSENTA }}
          >
            <line x1={xViragem} x2={xViragem} y1={GRAFICO.margem.topo} y2={GRAFICO.altura - GRAFICO.margem.base} stroke="rgba(159,225,203,.42)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx={xViragem} cy={geometria.yZero} r="11" fill="rgba(159,225,203,.14)" />
            <circle cx={xViragem} cy={geometria.yZero} r="4.5" fill="#0c251e" stroke="#9FE1CB" strokeWidth="2.5" />
          </m.g>
        ) : null}

        <m.line
          data-empresa-guia="atual"
          x1={xAtual}
          x2={xAtual}
          y1={GRAFICO.margem.topo}
          y2={GRAFICO.altura - GRAFICO.margem.base}
          stroke="rgba(255,255,255,.24)"
          strokeWidth="1"
          initial={false}
          animate={{ x1: xAtual, x2: xAtual, opacity: leituraVisivel ? 1 : 0 }}
          transition={arrastando ? { duration: 0 } : { duration: 0.22, ease: ENTRADA }}
        />
        <m.circle
          data-empresa-ponto="atual"
          r="5.5"
          fill="#0c251e"
          stroke={empresaVence ? TINTA.empresa : TINTA.rv}
          strokeWidth="3"
          initial={false}
          animate={{ cx: xAtual, cy: yAtual, opacity: leituraVisivel ? 1 : 0 }}
          transition={arrastando ? { duration: 0 } : { duration: 0.22, ease: ENTRADA }}
        />

        {marcas.map((faturacao, indice) => (
          <text
            key={faturacao}
            x={geometria.px(faturacao)}
            y={GRAFICO.altura - 8}
            textAnchor={indice === 0 ? "start" : indice === marcas.length - 1 ? "end" : "middle"}
            fill="rgba(255,255,255,.38)"
            fontSize="9"
            fontWeight="600"
          >
            {mil(faturacao)}
          </text>
        ))}
      </svg>

      <m.div
        initial={false}
        animate={{ opacity: leituraVisivel ? 1 : 0, y: leituraVisivel ? 0 : 5 }}
        transition={transicao}
        className="mt-1 grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(9rem,.65fr)_minmax(0,1fr)]"
      >
        <CartaoLiquido titulo="Recibos verdes" curto="Recibos" Icone={Receipt} valor={ponto.freelancer} vence={!empresaVence && !empate} cor={TINTA.rv} />
        <div className="order-3 col-span-2 flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] px-3 text-center lg:order-none lg:col-span-1">
          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/35">diferença anual</span>
          <span className="mt-1 font-display text-lg font-semibold tabular-nums" style={{ color: empate ? "rgba(255,255,255,.75)" : empresaVence ? TINTA.empresa : TINTA.rv }}>
            {empate ? "≈ 0 €" : `+${eur0(Math.abs(diferenca))}`}
          </span>
          <m.span initial={false} animate={{ opacity: veredictoVisivel ? 1 : 0 }} transition={transicao} className="mt-0.5 text-[9px] text-white/45">
            {empate ? "ponto de viragem" : empresaVence ? "para a empresa" : "para recibos verdes"}
          </m.span>
        </div>
        <CartaoLiquido titulo="Sociedade" Icone={Building} valor={ponto.empresa} vence={empresaVence && !empate} cor={TINTA.empresa} />
      </m.div>
    </m.div>
  );
}

function CartaoLiquido({
  titulo,
  curto,
  Icone,
  valor,
  vence,
  cor,
}: {
  titulo: string;
  /**
   * O nome a 320 px, onde o inteiro não cabe.
   *
   * Dois rótulos e não um cortado: mesmo sem `tracking`, «Recibos verdes»
   * transbordava 20 px e saía como «Recibos verd…». Reticências num nome
   * não são um nome — a mesma regra que a tabela do palco do Salário já
   * segue, e que a auditoria aplica em todo o site.
   */
  curto?: string;
  Icone: (props: { size?: number; className?: string }) => React.ReactNode;
  valor: number;
  vence: boolean;
  cor: string;
}) {
  return (
    <div
      className="min-w-0 rounded-2xl border bg-white/[.035] p-3 transition-[border-color,box-shadow] duration-300"
      style={{ borderColor: vence ? `${cor}77` : "rgba(255,255,255,.1)", boxShadow: vence ? `0 0 0 1px ${cor}22` : "none" }}
    >
      {/* `tracking` só a partir de `sm`: a 320 px os 0,1em espalhados por
          catorze letras valem ~12 px, e eram eles que faziam «Recibos
          verdes» sair como «Recibos verd…». Reticências num nome não são
          um nome — a mesma regra que a auditoria aplica em todo o site. */}
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-normal text-white/45 sm:tracking-[.1em]">
        <Icone size={11} className="flex-shrink-0" />{" "}
        <span className="truncate">
          <span className="sm:hidden">{curto ?? titulo}</span>
          <span className="hidden sm:inline">{titulo}</span>
        </span>
        {vence ? <Check size={10} className="ml-auto flex-shrink-0" /> : null}
      </div>
      <div className="mt-1.5 truncate font-display text-[clamp(1rem,3vw,1.45rem)] font-semibold tabular-nums text-white">{eur0(valor)}</div>
    </div>
  );
}

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

  const posicao = useCallback(
    (faturacao: number) =>
      fim > primeiro ? Math.min(100, Math.max(0, ((faturacao - primeiro) / (fim - primeiro)) * 100)) : 0,
    [primeiro, fim],
  );
  const pctAtual = posicao(ponto.faturacao);
  const pctViragem = dados.cruzamento !== null ? posicao(dados.cruzamento) : null;
  const fixar = useCallback((novo: number) => aoMudar(Math.max(0, Math.min(ultimo, novo))), [aoMudar, ultimo]);

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

  const aoDescer = useCallback(
    (evento: React.PointerEvent) => {
      aoArrastar(true);
      fixar(maisProximo(evento.clientX));
      try {
        evento.currentTarget.setPointerCapture(evento.pointerId);
      } catch {
        // A captura é um conforto; o toque não pode depender dela.
      }
    },
    [aoArrastar, fixar, maisProximo],
  );
  const aoMover = useCallback((evento: React.PointerEvent) => {
    if (arrastando) fixar(maisProximo(evento.clientX));
  }, [arrastando, fixar, maisProximo]);
  const aoSubir = useCallback(() => aoArrastar(false), [aoArrastar]);

  const aoTeclar = useCallback(
    (evento: React.KeyboardEvent) => {
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

  const diferencaAqui = Math.abs(ponto.empresa - ponto.freelancer);
  const frase = diferencaAqui < 1
    ? "Neste cenário, os dois caminhos deixam praticamente o mesmo líquido."
    : `${ponto.empresa > ponto.freelancer ? "A empresa deixa" : "Os recibos verdes deixam"} ${eur0(diferencaAqui)} a mais por ano.`;

  return (
    <m.div
      initial={false}
      animate={{ opacity: visivel ? 1 : 0, y: visivel ? 0 : -8 }}
      transition={transicao}
      className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/[.05] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07)] sm:px-5"
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-brand/25 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <span id="empresa-regua-rotulo" className="block text-[10px] font-bold uppercase tracking-[.16em] text-brand-mint">Faturação anual do cenário</span>
          <m.output initial={false} animate={{ opacity: valorAberto ? 1 : 0 }} transition={transicao} className="mt-0.5 block font-display text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-none tabular-nums text-white">{eur0(ponto.faturacao)}</m.output>
        </div>
        <m.p initial={false} animate={{ opacity: valorAberto ? 1 : 0 }} transition={transicao} className="min-w-0 max-w-[17rem] text-[11px] font-semibold leading-relaxed text-white/70">{frase}</m.p>
      </div>

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
        className={`focus-marca relative mt-4 h-10 select-none rounded-full ${arrastando ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/12">
          <span className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-mint" style={{ width: `${pctAtual}%`, transition: estatico || arrastando ? "none" : `width 240ms ${CURVA_CSS}` }} />
        </span>
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
        <div aria-hidden className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pctAtual}%`, transition: estatico || arrastando ? "none" : `left 240ms ${CURVA_CSS}` }}>
          <m.div initial={false} animate={{ scale: arrastando ? 1.16 : 1 }} transition={{ duration: 0.1 }}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[#0c251e] transition-shadow duration-100 ${arrastando ? "border-brand-mint shadow-[0_0_0_5px_rgba(159,225,203,.22)]" : "border-brand-mint/80 shadow-[0_2px_12px_rgba(0,0,0,.45)]"}`}>
              <GripHorizontal size={13} className="text-brand-mint" />
            </span>
          </m.div>
        </div>
      </div>

      <m.div initial={false} animate={{ opacity: escalaAberta ? 1 : 0 }} transition={transicao} className="mt-0.5 flex items-center justify-between text-[9px] font-semibold tabular-nums text-white/35">
        <span>{mil(primeiro)}</span><span className="text-white/45">arrasta, toca ou usa as setas</span><span>{mil(fim)}</span>
      </m.div>

      <m.div initial={false} animate={{ opacity: dominioAberto ? 1 : 0 }} transition={transicao} className="mt-3">
        <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
          <span className="absolute inset-y-0 left-0 bg-brand/45" style={{ width: `${partido && pctViragem !== null ? pctViragem : 100}%`, transition: estatico ? "none" : `width 620ms ${CURVA_CSS}` }} />
          {pctViragem !== null ? <span className="absolute inset-y-0 right-0 bg-[#e7c98e]/45" style={{ width: `${partido ? 100 - pctViragem : 0}%`, transition: estatico ? "none" : `width 620ms ${CURVA_CSS}` }} /> : null}
        </div>
        <m.div initial={false} animate={{ opacity: partido ? 1 : 0 }} transition={transicao} className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[9px] font-semibold">
          {pctViragem !== null && dados.cruzamento !== null ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Recibos verdes até {eur0(dados.cruzamento)}</span>
              <span className="inline-flex items-center gap-1.5 text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-[#e7c98e]" />Empresa acima disso, neste cenário</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Recibos verdes em toda a escala testada</span>
          )}
        </m.div>
      </m.div>
    </m.div>
  );
}
