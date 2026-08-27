"use client";

import { useState } from "react";
import { m } from "motion/react";
import { Building, Check, Receipt, Scale, Warning } from "@/components/ui/Icons";
import MolduraPalco, { type CenaDoPalco } from "@/components/palco/MolduraPalco";
import { Contador, useProgresso } from "@/components/palco/atores";
import { ATOS_EMPRESA, DUR, ENTRADA, ASSENTA, entre } from "./coreografia";

const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;
const mil = (n: number) => `${Math.round(n / 1000)}k`;

export interface PontoComparacao {
  faturacao: number;
  freelancer: number;
  /** Líquido pela empresa, já com o custo de a ter. */
  empresa: number;
  /** Líquido pela empresa se ela não custasse nada a manter. */
  empresaSemCustos: number;
}

export interface DadosEmpresa {
  pontos: readonly PontoComparacao[];
  /** Cenários calculados no servidor que alimentam a régua interativa. */
  cenarios: readonly PontoComparacao[];
  /** A faturação em que a empresa passa à frente. `null` se nunca passa. */
  cruzamento: number | null;
  /** O custo anual de ter empresa (contabilidade). */
  custoFixo: number;
  /** A faturação do exemplo editorial usado nas secções abaixo do palco. */
  exemplo: number;
  exemploFreelancer: number;
  exemploEmpresa: number;
}

// ── A caixa do desenho, em unidades do `viewBox` ───────────────────────
const L = 420;
const A = 210;
const M = { esq: 8, dir: 12, topo: 16, base: 30 };

export default function PalcoEmpresa({ dados }: { dados: DadosEmpresa }) {
  const [indice, setIndice] = useState(() =>
    Math.max(
      0,
      dados.cenarios.findIndex((ponto) =>
        dados.cruzamento
          ? ponto.faturacao === dados.cruzamento
          : ponto.faturacao === dados.exemplo,
      ),
    ),
  );
  const pontoAtivo = dados.cenarios[indice] ?? dados.cenarios[0] ?? dados.pontos[0]!;
  const melhorEscolhido =
    pontoAtivo.empresa > pontoAtivo.freelancer ? "empresa" : "recibos verdes";

  return (
    <MolduraPalco
      id="palco-empresa"
      tom="escuro"
      nome="O ponto de viragem"
      resumo="A diferença entre o líquido de uma sociedade e o de recibos verdes, traçada ao longo da faturação anual, com o custo de ter empresa contado. Onde a linha cruza o zero é o ponto de viragem."
      narracao={[
        `O eixo mostra faturação anual de ${mil(dados.pontos[0]?.faturacao ?? 0)} a ${mil(dados.pontos[dados.pontos.length - 1]?.faturacao ?? 0)} euros. O seletor abre em ${eur0(pontoAtivo.faturacao)} e pode ser ajustado por toque, arrasto ou teclado.`,
        "A linha mostra quanto a sociedade deixa a mais ou a menos do que recibos verdes. Abaixo do zero, compensam os recibos verdes; acima, compensa a sociedade.",
        `Ter empresa custa cerca de ${eur0(dados.custoFixo)} por ano em contabilidade, antes de qualquer imposto. É esse custo que afunda a linha e empurra o ponto de viragem para a direita.`,
        dados.cruzamento
          ? `A linha cruza o zero por volta dos ${eur0(dados.cruzamento)} de faturação anual. Abaixo disso compensam os recibos verdes; acima, a sociedade. No cenário escolhido de ${eur0(pontoAtivo.faturacao)}, compensa ${melhorEscolhido}.`
          : `Dentro deste intervalo de faturação a linha nunca chega ao zero: compensam sempre os recibos verdes.`,
      ]}
      atos={ATOS_EMPRESA}
    >
      {(cena) => (
        <Cena
          cena={cena}
          dados={dados}
          pontoAtivo={pontoAtivo}
          indice={indice}
          aoMudar={setIndice}
        />
      )}
    </MolduraPalco>
  );
}

function Cena({
  cena,
  dados,
  pontoAtivo,
  indice,
  aoMudar,
}: {
  cena: CenaDoPalco;
  dados: DadosEmpresa;
  pontoAtivo: PontoComparacao;
  indice: number;
  aoMudar: (indice: number) => void;
}) {
  const { ato, emCena, estatico } = cena;
  const t = estatico ? { duration: 0 } : { duration: DUR.entrada / 1000, ease: ENTRADA };
  const noAto = (indice: number, beat: string) =>
    estatico || ato > indice || (ato === indice && emCena(beat));

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ O QUE SE DESENHA É A DIFERENÇA, E NÃO DOIS ABSOLUTOS              │
  // │                                                                   │
  // │ A primeira versão traçava os dois líquidos por cima do mesmo      │
  // │ eixo. Era honesta e era ilegível: com o zero em baixo e 130 mil   │
  // │ em cima, uma diferença de três mil euros são dois pixéis. As      │
  // │ duas linhas corriam coladas e o «cruzamento» não se via cruzar.   │
  // │                                                                   │
  // │ Cortar o eixo em baixo resolveria — e é a mentira clássica de um  │
  // │ gráfico. A resposta certa é outra: a pergunta deste palco não é   │
  // │ «quanto rende cada um», é «qual deles rende MAIS, e a partir de   │
  // │ quando». Essa pergunta tem uma resposta de uma dimensão só.       │
  // │                                                                   │
  // │ Aqui a linha é `empresa − recibos verdes`. Começa em baixo do     │
  // │ zero, sobe, e CRUZA O ZERO no ponto de viragem. O zero é o eixo   │
  // │ verdadeiro — nada é truncado —, e o cruzamento passa a ser        │
  // │ impossível de não ver, porque é o momento em que a linha muda de  │
  // │ lado. É o princípio da congruência: a forma do gráfico passou a   │
  // │ ser a forma da pergunta.                                          │
  // └───────────────────────────────────────────────────────────────────┘
  const xs = dados.pontos.map((p) => p.faturacao);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  /** A vantagem da empresa, já com o custo de a ter. */
  const dif = (p: PontoComparacao) => p.empresa - p.freelancer;
  /** A mesma vantagem se a sociedade não custasse nada a manter. */
  const difSemCustos = (p: PontoComparacao) => p.empresaSemCustos - p.freelancer;

  const todosY = dados.pontos.flatMap((p) => [dif(p), difSemCustos(p), 0]);
  const minY = Math.min(...todosY);
  const maxY = Math.max(...todosY);
  const folga = (maxY - minY) * 0.12 || 1;

  const px = (f: number) => M.esq + ((f - minX) / (maxX - minX || 1)) * (L - M.esq - M.dir);
  const py = (v: number) =>
    A -
    M.base -
    ((v - (minY - folga)) / (maxY + folga - (minY - folga) || 1)) * (A - M.topo - M.base);
  const yZero = py(0);

  // ── Ato 1 · o eixo ─────────────────────────────────────────────────
  const eixo = noAto(0, "eixo");
  const marcas = noAto(0, "marcas");
  const marcador = noAto(0, "marcador");
  const legendaAberta = noAto(0, "legenda");

  // ── Ato 2 · as duas linhas ─────────────────────────────────────────
  // Crescem AO MESMO TEMPO, à mesma velocidade, na mesma direção. É a
  // única sobreposição deliberada de toda a casa: são a mesma pergunta a
  // receber duas respostas, e o acontecimento não é nenhuma delas chegar
  // — é o cruzamento. Separá-las no tempo destruiria isso.
  const traca = estatico || ato > 1 || (ato === 1 && emCena("linhaRV"));
  const cresce = useProgresso(traca, 1600, estatico);
  const rotulos = noAto(1, "rotulos");

  // ── Ato 3 · o custo afunda a linha da empresa ──────────────────────
  const afunda = estatico || ato > 2 || (ato === 2 && emCena("afunda"));
  const mergulho = useProgresso(afunda, 900, estatico);
  const fossoVisivel = noAto(2, "fosso");
  const fichaCusto = estatico || ato > 2 || (ato === 2 && emCena("fichaCusto"));

  // ── Ato 4 · a viragem ──────────────────────────────────────────────
  const cruzaVisivel = estatico || (ato === 3 && emCena("cruza"));
  const acende = estatico || (ato === 3 && emCena("acendeCruz"));
  const valorVisivel = estatico || (ato === 3 && emCena("valor"));
  const ondeEstas = estatico || (ato === 3 && emCena("ondeEstas"));
  const resolvido = estatico || (ato === 3 && emCena("resolve"));

  // Quantos pontos da linha já foram traçados.
  const ate = Math.max(1, Math.round(cresce * (dados.pontos.length - 1)));
  const visiveis = dados.pontos.slice(0, ate + 1);

  /** A linha da vantagem: sem custos no ato 2, com custos a partir do 3. */
  const valorEm = (p: PontoComparacao) => entre(difSemCustos(p), dif(p), mergulho);
  const linhaDif = visiveis.map((p) => `${px(p.faturacao)},${py(valorEm(p))}`).join(" ");
  /** A área entre a linha e o zero — é ela que dá lado ao sinal. */
  const areaDif =
    visiveis.length > 1
      ? `${px(visiveis[0].faturacao)},${yZero} ${linhaDif} ${px(visiveis[visiveis.length - 1].faturacao)},${yZero}`
      : "";

  const xCruz = dados.cruzamento ? px(dados.cruzamento) : null;
  // O cruzamento acontece EM cima do zero, por construção: é a definição
  // do ponto de viragem. Não há nada para interpolar.
  const yCruz = dados.cruzamento ? yZero : null;
  const xAtivo = px(pontoAtivo.faturacao);
  const yAtivo = py(valorEm(pontoAtivo));
  const empresaVence = pontoAtivo.empresa > pontoAtivo.freelancer;
  const diferencaAtiva = Math.abs(pontoAtivo.empresa - pontoAtivo.freelancer);

  const MARCAS = [minX, minX + (maxX - minX) / 2, maxX];

  return (
    <div className="relative">
      <div className="grid overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_24px_65px_rgba(0,0,0,.22)] lg:grid-cols-[1.55fr_.72fr]">
        {/* ── O gráfico ─────────────────────────────────────────── */}
        <div className="min-w-0 bg-black/15 p-3 sm:p-4">
        <SeletorCenario
          dados={dados}
          ponto={pontoAtivo}
          indice={indice}
          aoMudar={aoMudar}
        />
        <div aria-hidden className="mt-3 rounded-3xl border border-white/10 bg-black/15 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[.17em] text-white/35">
              A diferença · 01
            </div>
            <div className="mt-1 text-xs font-semibold text-white/80">
              Quanto a empresa deixa a mais (ou a menos)
            </div>
          </div>
          <m.div
            initial={false}
            animate={{ opacity: rotulos ? 1 : 0 }}
            transition={t}
            className="flex flex-wrap items-center gap-3 text-[9px] font-semibold"
          >
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <span className="h-2.5 w-4 rounded-sm bg-brand-mint/25" /> Compensam recibos verdes
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <span className="h-2.5 w-4 rounded-sm bg-[#e7c98e]/35" /> Compensa a empresa
            </span>
          </m.div>
        </div>

        <svg
          viewBox={`0 0 ${L} ${A}`}
          className="mt-2 w-full"
          style={{ aspectRatio: `${L} / ${A}` }}
          role="presentation"
        >
          {/* A grelha entra COM o eixo — uma peça não se mostra meio
              carregada, e uma grelha sem eixo é uma escala pendurada. */}
          <m.g
            initial={false}
            animate={{ opacity: eixo ? 1 : 0 }}
            transition={t}
          >
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={M.esq}
                x2={L - M.dir}
                y1={M.topo + (A - M.base - M.topo) * f}
                y2={M.topo + (A - M.base - M.topo) * f}
                stroke="rgba(255,255,255,.05)"
                strokeWidth="1"
              />
            ))}
            {/* O ZERO é o eixo. É onde as duas opções valem o mesmo, e é
                a única linha do desenho que precisa de peso. */}
            <line
              x1={M.esq}
              x2={L - M.dir}
              y1={yZero}
              y2={yZero}
              stroke="rgba(255,255,255,.4)"
              strokeWidth="1.5"
            />
            {/* «0» e não «valem o mesmo»: o texto transbordava 28 px da
                sua caixa SVG, e o que ele dizia já está dito no rótulo
                por baixo do gráfico e na legenda das duas zonas. Uma
                etiqueta que sai do desenho não é legenda. */}
            <text x={M.esq + 2} y={yZero - 5} fill="rgba(255,255,255,.5)" fontSize="9" fontWeight="700">
              0
            </text>
            {/* Duas referências de escala. Sem elas a linha diz «sobe» e
                não diz «quanto» — e «quanto» é a única coisa que
                distingue um argumento de uma seta para cima. */}
            <text x={L - M.dir - 2} y={py(maxY) + 3} textAnchor="end" fill="rgba(231,201,142,.6)" fontSize="8" fontWeight="600">
              + {eur0(maxY)}
            </text>
            <text x={L - M.dir - 2} y={py(minY) + 3} textAnchor="end" fill="rgba(159,225,203,.55)" fontSize="8" fontWeight="600">
              − {eur0(Math.abs(minY))}
            </text>
          </m.g>

          {MARCAS.map((f, i) => (
            <m.text
              key={f}
              x={px(f)}
              y={A - 8}
              textAnchor={i === 0 ? "start" : i === MARCAS.length - 1 ? "end" : "middle"}
              fill="rgba(255,255,255,.4)"
              fontSize="9"
              fontWeight="600"
              initial={false}
              animate={{ opacity: marcas ? 1 : 0 }}
              transition={estatico ? { duration: 0 } : { ...t, delay: i * 0.08 }}
            >
              {mil(f)}
            </m.text>
          ))}

          {/* O FOSSO — a área entre a vantagem sem custos e a real.
              É o que ter empresa custa antes de render, e aqui vê-se
              como uma faixa a separar duas alturas da mesma linha. */}
          {fossoVisivel && visiveis.length > 1 ? (
            <polygon
              points={`${visiveis.map((p) => `${px(p.faturacao)},${py(difSemCustos(p))}`).join(" ")} ${[...visiveis].reverse().map((p) => `${px(p.faturacao)},${py(dif(p))}`).join(" ")}`}
              fill="rgba(231,201,142,.14)"
            />
          ) : null}

          {/* A área entre a linha e o zero: verde quando a empresa está a
              perder (a vantagem é negativa) e areia quando está a ganhar.
              O sinal deixa de ser uma coisa que se lê no eixo e passa a
              ser o LADO em que a mancha está. */}
          {areaDif ? (
            <>
              <defs>
                <clipPath id="acimaDoZero">
                  <rect x={0} y={M.topo - 4} width={L} height={Math.max(0, yZero - M.topo + 4)} />
                </clipPath>
                <clipPath id="abaixoDoZero">
                  <rect x={0} y={yZero} width={L} height={Math.max(0, A - M.base - yZero + 4)} />
                </clipPath>
              </defs>
              <polygon points={areaDif} fill="rgba(231,201,142,.2)" clipPath="url(#acimaDoZero)" />
              <polygon points={areaDif} fill="rgba(159,225,203,.16)" clipPath="url(#abaixoDoZero)" />
            </>
          ) : null}

          {visiveis.length > 1 ? (
            <polyline
              points={linhaDif}
              fill="none"
              stroke="#e7c98e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* O marcador segue o cenário escolhido. É a causa visível das
              duas barras e do veredicto que mudam ao mesmo gesto. */}
          <m.g initial={false} animate={{ opacity: marcador ? 1 : 0 }} transition={t}>
            <line
              x1={xAtivo}
              x2={xAtivo}
              y1={M.topo}
              y2={A - M.base}
              stroke="rgba(255,255,255,.3)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={xAtivo}
              y={M.topo - 5}
              textAnchor={
                pontoAtivo.faturacao === minX
                  ? "start"
                  : pontoAtivo.faturacao === maxX
                    ? "end"
                    : "middle"
              }
              fill="rgba(255,255,255,.55)"
              fontSize="9"
              fontWeight="700"
            >
              {mil(pontoAtivo.faturacao)}
            </text>
            <circle cx={xAtivo} cy={yAtivo} r="4" fill="#e7c98e" stroke="#0c251e" strokeWidth="2" />
          </m.g>

          {/* O cruzamento: o acontecimento deste palco. */}
          {xCruz !== null && yCruz !== null ? (
            <m.g
              initial={false}
              animate={{ opacity: cruzaVisivel ? 1 : 0, scale: acende ? 1 : 0.6 }}
              style={{ transformOrigin: `${xCruz}px ${yCruz}px` }}
              transition={estatico ? { duration: 0 } : { duration: DUR.assenta / 1000, ease: ASSENTA }}
            >
              <circle cx={xCruz} cy={yCruz} r="10" fill="rgba(159,225,203,.18)" />
              <circle cx={xCruz} cy={yCruz} r="4.5" fill="#0c251e" stroke="#9FE1CB" strokeWidth="2.5" />
            </m.g>
          ) : null}
        </svg>

        <m.div
          initial={false}
          animate={{ opacity: legendaAberta ? 1 : 0 }}
          transition={t}
          className="mt-1 text-center text-[9px] text-white/35"
        >
          Faturação anual · no zero as duas valem o mesmo · a tracejado, o cenário escolhido
        </m.div>
        </div>
      </div>

        {/* ── A decisão ───────────────────────────────────────────── */}
        <m.div
          aria-hidden
          initial={false}
          animate={{ opacity: valorVisivel ? 1 : 0.35 }}
          transition={t}
          className="relative flex min-h-full flex-col bg-[linear-gradient(145deg,#fbf8f1_0%,#f0e9dc_100%)] p-5 text-stone-900 sm:p-6"
        >
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/15 bg-brand-light px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-brand-dark">
            <Check size={10} /> Exemplo calculado
          </div>

          <div className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-brand-dark">
            Ponto de viragem
          </div>
          {dados.cruzamento ? (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                <span className="font-display text-[clamp(2.35rem,4.2vw,4rem)] font-semibold leading-none tabular-nums text-stone-950">
                  {estatico || !valorVisivel ? (
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
                <span className="text-sm font-semibold text-stone-500">/ ano</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                É onde a empresa começa a superar os recibos verdes neste cenário, já com o custo
                de a manter contado.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Neste intervalo, os caminhos não se cruzam: os recibos verdes deixam sempre mais
              líquido.
            </p>
          )}

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] overflow-hidden rounded-2xl border border-stone-300/80 bg-white/55">
            <div className="px-3 py-3">
              <div className="text-[9px] font-bold uppercase tracking-wide text-clay">Até cruzar</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-stone-700">
                <Receipt size={12} className="text-brand" /> Recibos verdes
              </div>
            </div>
            <div className="flex items-center border-x border-stone-300/80 px-2 text-stone-400">→</div>
            <div className="px-3 py-3 text-right">
              <div className="text-[9px] font-bold uppercase tracking-wide text-brand-dark">Depois</div>
              <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-stone-700">
                <Building size={12} className="text-brand" /> Empresa
              </div>
            </div>
          </div>

          <m.div
            initial={false}
            animate={{ opacity: fichaCusto && afunda ? 1 : 0.25, y: fichaCusto ? 0 : -4 }}
            transition={t}
            className="mt-5 space-y-2 border-y border-stone-300/70 py-4 text-[11px] text-stone-600"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2"><Scale size={13} className="text-brand" /> Continente · 2026</span>
              <span className="font-semibold text-stone-800">Cenário fiscal</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2"><Warning size={13} className="text-clay" /> Contabilidade incluída</span>
              <span className="font-semibold tabular-nums text-stone-800">{eur0(dados.custoFixo)}/ano</span>
            </div>
          </m.div>

          <m.div
            initial={false}
            animate={{ opacity: ondeEstas ? 1 : 0, y: ondeEstas ? 0 : 6 }}
            transition={t}
            className="mt-auto pt-5"
          >
            <div className="text-[9px] font-bold uppercase tracking-[.14em] text-stone-500">
              No cenário escolhido · {eur0(pontoAtivo.faturacao)}
            </div>
            <div className="mt-2 rounded-2xl bg-brand px-4 py-3 text-white shadow-[0_12px_30px_rgba(15,107,82,.2)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold">
                  {empresaVence ? "A empresa passa à frente" : "Os recibos verdes ainda vencem"}
                </span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  +{eur0(diferencaAtiva)}
                </span>
              </div>
              <m.p
                initial={false}
                animate={{ opacity: resolvido ? 1 : 0 }}
                transition={t}
                className="mt-1 text-[10px] leading-relaxed text-white/70"
              >
                Diferença líquida anual com os mesmos pressupostos.
              </m.p>
            </div>
          </m.div>
        </m.div>
      </div>
    </div>
  );
}

function SeletorCenario({
  dados,
  ponto,
  indice,
  aoMudar,
}: {
  dados: DadosEmpresa;
  ponto: PontoComparacao;
  indice: number;
  aoMudar: (indice: number) => void;
}) {
  const ultimo = Math.max(0, dados.cenarios.length - 1);
  const progresso = ultimo === 0 ? 0 : (indice / ultimo) * 100;
  const diferenca = ponto.empresa - ponto.freelancer;
  const vencedor = diferenca > 0 ? "Empresa" : diferenca < 0 ? "Recibos verdes" : "As duas opções";
  const frase =
    diferenca === 0
      ? "Neste cenário, as duas opções deixam o mesmo líquido."
      : `${vencedor} deixa ${eur0(Math.abs(diferenca))} a mais por ano neste cenário.`;
  const primeiro = dados.cenarios[0]?.faturacao ?? 0;
  const fim = dados.cenarios[ultimo]?.faturacao ?? primeiro;
  const posicaoViragem =
    dados.cruzamento && fim > primeiro
      ? ((dados.cruzamento - primeiro) / (fim - primeiro)) * 100
      : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[.065] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:px-5">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,.7fr)] sm:items-end">
        <div>
          <label
            htmlFor="empresa-faturacao"
            className="block text-[10px] font-bold uppercase tracking-[.16em] text-brand-mint"
          >
            Faturação anual do cenário
          </label>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <output className="font-display text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none tabular-nums text-white">
              {eur0(ponto.faturacao)}
            </output>
            <span className="text-[10px] font-semibold text-white/45">arrasta ou usa as setas</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
          <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/35">
            Leitura imediata
          </div>
          <p aria-live="polite" className="mt-1 text-xs font-semibold leading-relaxed text-white/80">
            {frase}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-mint"
          style={{ width: `${progresso}%` }}
        />
        {posicaoViragem !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 z-0 h-5 w-px -translate-y-1/2 bg-brand-mint/50"
            style={{ left: `${posicaoViragem}%` }}
          />
        ) : null}
        <input
          id="empresa-faturacao"
          type="range"
          min={0}
          max={ultimo}
          step={1}
          value={indice}
          onChange={(evento) => aoMudar(Number(evento.currentTarget.value))}
          aria-describedby="empresa-faturacao-ajuda"
          aria-valuetext={`${eur0(ponto.faturacao)}. ${frase}`}
          className="focus-marca relative z-10 h-10 w-full cursor-ew-resize appearance-none bg-transparent accent-brand-mint [&::-moz-range-progress]:bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-[#0c251e] [&::-moz-range-thumb]:bg-brand-mint [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[9px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-[#0c251e] [&::-webkit-slider-thumb]:bg-brand-mint [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(159,225,203,.55)]"
        />
      </div>
      <div
        id="empresa-faturacao-ajuda"
        className="relative flex items-center justify-between gap-3 text-[9px] font-semibold text-white/40"
      >
        <span>{eur0(primeiro)}</span>
        {dados.cruzamento ? (
          <span className="text-center text-brand-mint/70">
            viragem calculada · {eur0(dados.cruzamento)}
          </span>
        ) : null}
        <span>{eur0(fim)}</span>
      </div>
    </div>
  );
}
