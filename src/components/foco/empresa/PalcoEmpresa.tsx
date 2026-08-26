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
      resumo="Recibos verdes e sociedade traçados sobre o mesmo eixo de faturação, com o custo de ter empresa contado, para se ver onde é que os dois caminhos se cruzam."
      narracao={[
        `O eixo mostra faturação anual de ${mil(dados.pontos[0]?.faturacao ?? 0)} a ${mil(dados.pontos[dados.pontos.length - 1]?.faturacao ?? 0)} euros. O exemplo está marcado em ${eur0(dados.exemplo)}.`,
        "Os dois caminhos são traçados lado a lado: o líquido a recibos verdes e o líquido através de uma sociedade.",
        `Ter empresa custa cerca de ${eur0(dados.custoFixo)} por ano em contabilidade, antes de qualquer imposto. É por isso que a linha da empresa arranca abaixo.`,
        dados.cruzamento
          ? `Os dois caminhos cruzam-se por volta dos ${eur0(dados.cruzamento)} de faturação anual. Abaixo disso compensam os recibos verdes; acima, a sociedade. No exemplo de ${eur0(dados.exemplo)}, compensa ${melhor}.`
          : `Dentro deste intervalo de faturação, os dois caminhos não se cruzam: compensam sempre os recibos verdes.`,
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

  const xs = dados.pontos.map((p) => p.faturacao);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const todosY = dados.pontos.flatMap((p) => [p.freelancer, p.empresa, p.empresaSemCustos]);
  const maxY = Math.max(...todosY);

  const px = (f: number) => M.esq + ((f - minX) / (maxX - minX || 1)) * (L - M.esq - M.dir);
  const py = (v: number) => A - M.base - (v / (maxY || 1)) * (A - M.topo - M.base);

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

  const linhaFree = visiveis.map((p) => `${px(p.faturacao)},${py(p.freelancer)}`).join(" ");
  // Antes do ato 3 a linha da empresa está no seu valor SEM custos. O ato
  // 3 interpola-a até ao valor real — é o custo fixo a afundá-la, e o
  // mergulho vê-se porque a linha vem de cima.
  const linhaEmp = visiveis
    .map((p) => `${px(p.faturacao)},${py(entre(p.empresaSemCustos, p.empresa, mergulho))}`)
    .join(" ");

  const xCruz = dados.cruzamento ? px(dados.cruzamento) : null;
  const yCruz = (() => {
    if (!dados.cruzamento) return null;
    const p = dados.pontos.reduce((a, b) =>
      Math.abs(b.faturacao - dados.cruzamento!) < Math.abs(a.faturacao - dados.cruzamento!) ? b : a,
    );
    return py(p.empresa);
  })();

  const MARCAS = [minX, minX + (maxX - minX) / 2, maxX];

  return (
    <div aria-hidden className="relative grid gap-3 lg:grid-cols-[1.6fr_.85fr]">
      {/* ── O gráfico ───────────────────────────────────────────── */}
      <div className="rounded-3xl border border-white/10 bg-black/15 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[.17em] text-white/35">
              Os dois caminhos · 01
            </div>
            <div className="mt-1 text-xs font-semibold text-white/80">
              Líquido anual, por faturação
            </div>
          </div>
          <m.div
            initial={false}
            animate={{ opacity: rotulos ? 1 : 0 }}
            transition={t}
            className="flex flex-wrap items-center gap-3 text-[9px] font-semibold"
          >
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <span className="h-[3px] w-4 rounded-full bg-brand-mint" /> Recibos verdes
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <span className="h-[3px] w-4 rounded-full bg-[#e7c98e]" /> Empresa
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
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1={M.esq}
                x2={L - M.dir}
                y1={py(maxY * f)}
                y2={py(maxY * f)}
                stroke="rgba(255,255,255,.07)"
                strokeWidth="1"
              />
            ))}
            <line
              x1={M.esq}
              x2={L - M.dir}
              y1={A - M.base}
              y2={A - M.base}
              stroke="rgba(255,255,255,.22)"
              strokeWidth="1"
            />
          </m.g>

          {MARCAS.map((f, i) => (
            <m.text
              key={f}
              x={px(f)}
              y={A - M.base + 14}
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

          {/* O fosso: a área entre a linha sem custos e a linha real. É o
              que ter empresa custa antes de render, e vê-se. */}
          {fossoVisivel && visiveis.length > 1 ? (
            <polygon
              points={`${visiveis.map((p) => `${px(p.faturacao)},${py(p.empresaSemCustos)}`).join(" ")} ${[...visiveis].reverse().map((p) => `${px(p.faturacao)},${py(p.empresa)}`).join(" ")}`}
              fill="rgba(231,201,142,.12)"
            />
          ) : null}

          {visiveis.length > 1 ? (
            <>
              <polyline
                points={linhaFree}
                fill="none"
                stroke="#9FE1CB"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={linhaEmp}
                fill="none"
                stroke="#e7c98e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
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
          Faturação anual · a tracejado, o exemplo de {eur0(dados.exemplo)}
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
