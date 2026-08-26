"use client";

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
  /** A faturação em que a empresa passa à frente. `null` se nunca passa. */
  cruzamento: number | null;
  /** O custo anual de ter empresa (contabilidade). */
  custoFixo: number;
  /** A faturação do exemplo marcado no eixo. */
  exemplo: number;
  exemploFreelancer: number;
  exemploEmpresa: number;
}

// ── A caixa do desenho, em unidades do `viewBox` ───────────────────────
const L = 420;
const A = 210;
const M = { esq: 8, dir: 12, topo: 16, base: 30 };

export default function PalcoEmpresa({ dados }: { dados: DadosEmpresa }) {
  const melhor = dados.exemploEmpresa > dados.exemploFreelancer ? "empresa" : "recibos verdes";

  return (
    <MolduraPalco
      id="palco-empresa"
      tom="escuro"
      nome="O ponto de viragem"
      resumo="A diferença entre o líquido de uma sociedade e o de recibos verdes, traçada ao longo da faturação anual, com o custo de ter empresa contado. Onde a linha cruza o zero é o ponto de viragem."
      narracao={[
        `O eixo mostra faturação anual de ${mil(dados.pontos[0]?.faturacao ?? 0)} a ${mil(dados.pontos[dados.pontos.length - 1]?.faturacao ?? 0)} euros. O exemplo está marcado em ${eur0(dados.exemplo)}.`,
        "A linha mostra quanto a sociedade deixa a mais ou a menos do que recibos verdes. Abaixo do zero, compensam os recibos verdes; acima, compensa a sociedade.",
        `Ter empresa custa cerca de ${eur0(dados.custoFixo)} por ano em contabilidade, antes de qualquer imposto. É esse custo que afunda a linha e empurra o ponto de viragem para a direita.`,
        dados.cruzamento
          ? `A linha cruza o zero por volta dos ${eur0(dados.cruzamento)} de faturação anual. Abaixo disso compensam os recibos verdes; acima, a sociedade. No exemplo de ${eur0(dados.exemplo)}, compensa ${melhor}.`
          : `Dentro deste intervalo de faturação a linha nunca chega ao zero: compensam sempre os recibos verdes.`,
      ]}
      atos={ATOS_EMPRESA}
    >
      {(cena) => <Cena cena={cena} dados={dados} />}
    </MolduraPalco>
  );
}

function Cena({ cena, dados }: { cena: CenaDoPalco; dados: DadosEmpresa }) {
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
  const detalhe = noAto(2, "detalhe");
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

  const MARCAS = [minX, minX + (maxX - minX) / 2, maxX];

  return (
    <div aria-hidden className="relative grid gap-3 lg:grid-cols-[1.6fr_.85fr]">
      {/* ── O gráfico ───────────────────────────────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-black/15 p-3 sm:p-4">
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
            <text x={M.esq + 2} y={yZero - 5} fill="rgba(255,255,255,.45)" fontSize="8" fontWeight="700">
              valem o mesmo
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

          {/* O marcador do exemplo fica onde está, para se ver de que lado
              a pessoa está quando o cruzamento aparecer. */}
          <m.g initial={false} animate={{ opacity: marcador ? 1 : 0 }} transition={t}>
            <line
              x1={px(dados.exemplo)}
              x2={px(dados.exemplo)}
              y1={M.topo}
              y2={A - M.base}
              stroke="rgba(255,255,255,.3)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Só o valor. «30k · o exemplo» transbordava 25 px da caixa
                do texto — o que a legenda diz, di-lo o rótulo por baixo do
                gráfico, e uma etiqueta que sai do desenho não é legenda. */}
            <text
              x={px(dados.exemplo)}
              y={M.topo - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,.55)"
              fontSize="9"
              fontWeight="700"
            >
              {mil(dados.exemplo)}
            </text>
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
          Faturação anual · a tracejado, o exemplo de {eur0(dados.exemplo)} · acima da linha, a sociedade ganha
        </m.div>
      </div>

      {/* ── A leitura ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* O custo fixo, que é o que impede a leitura fácil. */}
        <m.div
          initial={false}
          animate={{
            opacity: fichaCusto ? 1 : 0.2,
            y: fichaCusto && afunda ? 0 : -4,
            borderColor: afunda ? "rgba(231,201,142,.45)" : "rgba(255,255,255,.1)",
          }}
          transition={t}
          className="rounded-3xl border bg-[#e7c98e]/[.07] p-3.5"
        >
          <div className="flex items-center gap-2">
            <Warning size={12} className="flex-shrink-0 text-[#e7c98e]" />
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#e7c98e]">
              Antes de render, custa
            </span>
          </div>
          <div className="mt-1.5 font-display text-xl font-semibold tabular-nums text-white">
            {estatico || !afunda ? (
              eur0(dados.custoFixo)
            ) : (
              <Contador valor={dados.custoFixo} formato={eur0} inicial={0} duracao={DUR.contaResultado} />
            )}
            <span className="ml-1 text-[10px] font-normal text-white/45">/ ano</span>
          </div>
          <m.p
            initial={false}
            animate={{ opacity: detalhe ? 1 : 0 }}
            transition={t}
            className="mt-1.5 text-[10px] leading-relaxed text-white/55"
          >
            Contabilidade obrigatória, todos os meses, mesmo num mês sem faturar. É o fosso que a
            sociedade tem de recuperar antes de compensar.
          </m.p>
        </m.div>

        {/* O veredicto. */}
        <m.div
          initial={false}
          animate={{
            opacity: valorVisivel ? 1 : 0.15,
            borderColor: acende ? "rgba(159,225,203,.5)" : "rgba(255,255,255,.1)",
          }}
          transition={t}
          className="rounded-3xl border bg-brand/[.09] p-3.5"
        >
          <div className="flex items-center gap-2">
            <Scale size={12} className="flex-shrink-0 text-brand-mint" />
            <span className="text-[9px] font-bold uppercase tracking-wide text-brand-mint">
              A viragem
            </span>
          </div>
          {dados.cruzamento ? (
            <>
              <div className="mt-1.5 font-display text-2xl font-semibold leading-none tabular-nums text-white">
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
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/60">
                Abaixo disto compensam os recibos verdes. Acima, a sociedade começa a compensar —
                se a faturação se mantiver.
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">
              Neste intervalo de faturação, os dois caminhos não se cruzam: compensam sempre os
              recibos verdes.
            </p>
          )}
        </m.div>

        {/* Onde a pessoa está — a leitura que fecha a cena. */}
        <m.div
          initial={false}
          animate={{ opacity: ondeEstas ? 1 : 0, y: ondeEstas ? 0 : 6 }}
          transition={t}
          className="rounded-3xl border border-white/10 bg-white/[.04] p-3.5"
        >
          <span className="block text-[9px] font-bold uppercase tracking-wide text-white/40">
            No exemplo · {eur0(dados.exemplo)} por ano
          </span>
          <div className="mt-2 space-y-1.5">
            <Barra
              Icon={Receipt}
              rotulo="Recibos verdes"
              valor={dados.exemploFreelancer}
              maximo={Math.max(dados.exemploFreelancer, dados.exemploEmpresa)}
              cor="bg-brand-mint"
              vence={dados.exemploFreelancer >= dados.exemploEmpresa}
              visivel={ondeEstas}
            />
            <Barra
              Icon={Building}
              rotulo="Empresa"
              valor={dados.exemploEmpresa}
              maximo={Math.max(dados.exemploFreelancer, dados.exemploEmpresa)}
              cor="bg-[#e7c98e]"
              vence={dados.exemploEmpresa > dados.exemploFreelancer}
              visivel={ondeEstas}
            />
          </div>
          <m.p
            initial={false}
            animate={{ opacity: resolvido ? 1 : 0 }}
            transition={t}
            className="mt-2.5 text-[10px] leading-relaxed text-white/50"
          >
            Um número não decide sozinho: a sociedade traz obrigações, contabilidade e
            responsabilidade limitada. O ponto de viragem diz quando vale a pena discuti-la.
          </m.p>
        </m.div>
      </div>
    </div>
  );
}

function Barra({
  Icon,
  rotulo,
  valor,
  maximo,
  cor,
  vence,
  visivel,
}: {
  Icon: (props: { size?: number; className?: string }) => React.ReactNode;
  rotulo: string;
  valor: number;
  maximo: number;
  cor: string;
  vence: boolean;
  visivel: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="flex-shrink-0 text-white/45" />
      <span className="w-[5.5rem] flex-shrink-0 truncate text-[10px] text-white/65">{rotulo}</span>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full rounded-full transition-[width] duration-700 ${cor}`}
          style={{ width: visivel ? `${(valor / (maximo || 1)) * 100}%` : "0%" }}
        />
      </span>
      <span className="flex-shrink-0 text-[10px] font-semibold tabular-nums text-white">
        {eur0(valor)}
      </span>
      {vence ? <Check size={11} className="flex-shrink-0 text-brand-mint" /> : <span className="w-[11px]" />}
    </div>
  );
}
