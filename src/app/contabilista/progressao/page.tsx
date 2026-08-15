"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PROGRESSÃO E COMISSÃO — o ecrã
//  ---------------------------------------------------------------------
//  Terceira frente do pacote de redesign, e a única que fala do dinheiro
//  de quem está a ler. Isso muda o que o ecrã tem de fazer: além de
//  mostrar o estado, tem de dizer, sem se ter de procurar, SOBRE O QUE a
//  taxa incide e QUEM a fatura a quem. Um número de comissão sozinho num
//  cartão bonito é a parte fácil e a parte inútil.
//
//  Três decisões de desenho que valem a pena explicar:
//
//   · O cartão do topo é escuro nos dois temas, como a barra lateral. É a
//     única superfície do painel que mostra um número que muda a fatura de
//     quem o lê.
//
//   · «Duas formas de subir» põe o mérito e o pagamento LADO A LADO, com o
//     mérito primeiro e com o mesmo peso visual. Pôr o pagamento em
//     destaque num ecrã que mede trabalho feito seria transformar a escada
//     numa tabela de preços — e o `MONETIZACAO_PROIBIDA` não proíbe só
//     ordenar por dinheiro, proíbe o dark pattern que o sugere.
//
//   · Nenhum botão que não faça nada. A referência mostra «Ver histórico»
//     e «Exportar» no topo; nenhuma das duas existe, e um botão que aceita
//     o clique e não responde é pior do que a sua ausência. O registo de
//     XP em baixo É o histórico que há.
//
//  A cobrança do desbloqueio NÃO está ligada (ver `DESBLOQUEIO_PAGO_ATIVO`).
//  O preço é real e o desconto é real; o que falta é o Stripe. O ecrã
//  di-lo no sítio onde a pessoa ia clicar, e não num aviso no fim.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import { TituloDoPainel } from "@/components/contabilistas/AcoesDoPainel";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import {
  listarEventosXP, meusClientes, obterProgressao, type EventoXPLido,
} from "@/lib/contabilistas/fonte/dados";
import { tratamentoDoCliente, type Vinculo } from "@/lib/contabilistas/tipos";
import { eurosDeCents } from "@/lib/contabilistas/fidelidade";
import {
  COMISSAO_PISO_PCT,
  COPY_BASE_DA_COMISSAO,
  COPY_DESBLOQUEIO_INDISPONIVEL,
  COPY_DESCONTO_UNICO,
  COPY_ELEGIBILIDADE,
  COPY_QUEM_FATURA,
  DESBLOQUEIO_NAO_COMPRA,
  DESBLOQUEIO_PAGO_ATIVO,
  ESCALA_FIDELIDADE,
  ESTADO_PROGRESSAO_INICIAL,
  PATAMARES,
  PATAMAR_MAX,
  ROTULO_DO_EVENTO,
  calcularProgressao,
  comissaoLegivel,
  descontoDeFidelidadePct,
  precoDeDesbloqueio,
  proximoBonusDeFidelidade,
  type EstadoProgressao,
  type Progressao,
} from "@/lib/contabilistas/progressao";
import Badge from "@/components/ui/Badge";
import {
  Award, Check, Gift, Info, Lock, Star, Target, Trophy,
} from "@/components/ui/Icons";
import styles from "../painel.module.css";

export default function ProgressaoPage() {
  const { ficha, userId, aCarregar } = usarFicha();
  const painel = usarPainel();
  const [estado, setEstado] = useState<EstadoProgressao | null>(null);
  const [eventos, setEventos] = useState<EventoXPLido[]>([]);
  const [clientes, setClientes] = useState<Vinculo[]>([]);

  const quemPergunta = userId ?? "";

  useEffect(() => {
    if (!ficha) return;
    let vivo = true;
    // Os clientes vêm para resolver o NOME de cada evento de XP. É uma
    // leitura que o painel já faz noutros ecrãs, e reutilizá-la evita uma
    // coluna de nome no registo de XP — que seria uma segunda cópia de um
    // nome que o cliente pode mudar ou retirar.
    Promise.all([
      obterProgressao(quemPergunta),
      listarEventosXP(quemPergunta, 6),
      meusClientes(quemPergunta),
    ])
      .then(([p, e, c]) => {
        if (!vivo) return;
        setEstado(p);
        setEventos(e);
        setClientes(c);
      })
      .catch(() => {
        if (vivo) setEstado({ ...ESTADO_PROGRESSAO_INICIAL });
      });
    return () => { vivo = false; };
  }, [ficha, quemPergunta]);

  if (aCarregar || !ficha || !estado) return <EsqueletoPainel forma="duasColunas" />;

  const p = calcularProgressao(estado);
  const nomePorVinculo = new Map(
    clientes.map((v) => [v.id, tratamentoDoCliente(v)])
  );

  return (
    <div className="space-y-6">
      <TituloDoPainel>Progressão e comissão</TituloDoPainel>

      <CabecalhoPainel
        titulo="Progressão e comissão"
        descricao="A taxa que o ReciboCerto cobra desce com o trabalho feito. Aqui vês em que patamar estás, o que falta para o próximo, e o que cada via custa."
      />

      <Hero p={p} />

      {/* O que a taxa é, antes de qualquer forma de a baixar. Uma pessoa
          que ainda não sabe sobre o que incide não pode decidir nada. */}
      <BaseDaComissao />

      <DuasFormasDeSubir p={p} estado={estado} />

      <Jornada p={p} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DescontoDeFidelidade estado={estado} />
        <AtividadeElegivel
          eventos={eventos}
          nomePorVinculo={nomePorVinculo}
          painel={painel}
        />
      </div>
    </div>
  );
}

// ─── O cartão do topo ──────────────────────────────────────────────────

function Hero({ p }: { p: Progressao }) {
  return (
    <section className={`${styles.heroProgressao} p-5 sm:p-7`}>
      <span className={styles.heroBrilho} aria-hidden />

      <div className="relative">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white/55">
          A tua progressão profissional
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
          <p className="flex items-baseline gap-1">
            <span className="font-display text-5xl leading-none text-white tabular-nums sm:text-6xl">
              {p.comissaoPct}
            </span>
            <span className="font-display text-2xl leading-none text-white/85">%</span>
          </p>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-white">
                Patamar {p.patamar.nivel} de {PATAMAR_MAX}
              </span>
              {p.porDesbloqueio && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-white/90">
                  <Lock size={11} aria-hidden /> Desbloqueado
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-white/65">
              de comissão atual
            </p>
          </div>
        </div>

        {/* O que falta, em números, e a barra do degrau atual. */}
        <div className="mt-5 rounded-2xl border border-white/12 bg-black/15 p-4">
          {p.noTopo ? (
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
              <Trophy size={16} className="mt-0.5 shrink-0 text-brand-mint" aria-hidden />
              <span>
                Estás no patamar mais alto. A comissão de {comissaoLegivel(COMISSAO_PISO_PCT)}{" "}
                é a mais baixa que existe — não há mais degraus a subir.
              </span>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
                  <Target size={16} className="mt-0.5 shrink-0 text-brand-mint" aria-hidden />
                  <span>
                    Faltam <strong className="font-semibold text-white tabular-nums">{p.xpEmFalta} XP</strong>
                    {p.clientesEmFalta > 0 && (
                      <>
                        {" e "}
                        <strong className="font-semibold text-white tabular-nums">
                          {p.clientesEmFalta} {p.clientesEmFalta === 1 ? "cliente elegível" : "clientes elegíveis"}
                        </strong>
                      </>
                    )}{" "}
                    para chegar a {comissaoLegivel(p.proximo!.comissaoPct)} de comissão.
                  </span>
                </p>
                <p className="shrink-0 text-xs font-semibold text-white/70 tabular-nums">
                  {p.xp} / {p.proximo!.xpNecessario} XP
                </p>
              </div>
              <div
                className={`${styles.barraEscura} mt-3`}
                role="progressbar"
                aria-valuenow={p.xp}
                aria-valuemin={p.xpDoDegrau.de}
                aria-valuemax={p.xpDoDegrau.ate}
                aria-label={`Progresso para o patamar ${p.proximo!.nivel}`}
              >
                <div
                  className={styles.barraEscuraProgresso}
                  style={{ width: `${Math.round(p.fracaoDoDegrau * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        <p className="mt-3.5 flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Os patamares sobem por trabalho feito. O desbloqueio pago é opcional
            e compra apenas a percentagem.
          </span>
        </p>
      </div>
    </section>
  );
}

// ─── Sobre o que a taxa incide ─────────────────────────────────────────

/**
 * As duas frases que não podem estar escondidas.
 *
 * Foi uma decisão deliberada não as pôr num `InfoTip`: um tooltip é o
 * sítio certo para um termo técnico e o sítio errado para o único facto
 * que determina quanto a pessoa vai pagar.
 */
function BaseDaComissao() {
  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Award size={17} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        Sobre o que incide a comissão
      </h2>
      <dl className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-cream/70 p-3.5 dark:bg-white/[0.03]">
          <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
            A base
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {COPY_BASE_DA_COMISSAO}
          </dd>
        </div>
        <div className="rounded-2xl bg-cream/70 p-3.5 dark:bg-white/[0.03]">
          <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Quem fatura
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {COPY_QUEM_FATURA}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ─── As duas vias ──────────────────────────────────────────────────────

function DuasFormasDeSubir({ p, estado }: { p: Progressao; estado: EstadoProgressao }) {
  if (p.noTopo) return null;
  const proximo = p.proximo!;
  const preco = precoDeDesbloqueio(proximo.nivel, estado.cartoesConcluidos);

  return (
    <section>
      <h2 className="font-display text-xl text-ink">
        Duas formas de subir para {comissaoLegivel(proximo.comissaoPct)}
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        As duas chegam ao mesmo patamar. A primeira é a que a plataforma quer premiar.
      </p>

      {/* No telemóvel empilham, com o mérito em cima. Não é só a ordem do
          DOM: é a ordem de leitura, e é deliberada. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── Por mérito ── */}
        <div className="flex flex-col rounded-4xl border border-brand/25 bg-white p-5 shadow-card dark:border-brand/25">
          <p className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-brand-dark dark:text-brand-mint">
            <Star size={13} aria-hidden /> Ganhar por mérito
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Cada cliente elegível e cada serviço concluído aproximam-te do próximo patamar.
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <ProgressoLinha
              rotulo="XP"
              feito={p.xp}
              alvo={proximo.xpNecessario}
              fracao={p.fracaoDoDegrau}
            />
            <ProgressoLinha
              rotulo="Clientes elegíveis"
              feito={p.clientesDoDegrau.feitos}
              alvo={p.clientesDoDegrau.precisos}
              fracao={
                p.clientesDoDegrau.precisos === 0
                  ? 1
                  : p.clientesDoDegrau.feitos / p.clientesDoDegrau.precisos
              }
            />

            {/* O mesmo resumo que a coluna do desbloqueio dá em euros: o
                que se recebe ao chegar lá. Sem ele, a via do mérito
                mostrava progresso e a via paga mostrava resultado — e a
                comparação que o ecrã pede ficava desequilibrada. */}
            <div className="flex items-baseline justify-between gap-3 border-t border-stone-100 pt-3 dark:border-stone-800">
              <dt className="font-semibold text-ink">Comissão ao atingir</dt>
              <dd className="font-display text-xl tabular-nums text-brand-dark dark:text-brand-mint">
                {comissaoLegivel(proximo.comissaoPct)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 flex items-start gap-2 border-t border-stone-100 pt-3.5 text-xs leading-relaxed text-stone-500 dark:border-stone-800">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
            {COPY_ELEGIBILIDADE}
          </p>
        </div>

        {/* ── Por desbloqueio ── */}
        <div className="flex flex-col rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800">
          <p className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-stone-400">
            <Lock size={13} aria-hidden /> Desbloquear
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Passa ao patamar {proximo.nivel} de imediato, com{" "}
            {comissaoLegivel(proximo.comissaoPct)} de comissão.
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-stone-500">Preço base</dt>
              <dd className="tabular-nums text-stone-700 dark:text-stone-200">
                {eurosDeCents(preco.baseCents)}
              </dd>
            </div>
            {preco.descontoPct > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-stone-500">
                  Desconto de fidelidade ({preco.descontoPct}%)
                </dt>
                <dd className="tabular-nums font-medium text-brand-dark dark:text-brand-mint">
                  −{eurosDeCents(preco.descontoCents)}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-stone-100 pt-2 dark:border-stone-800">
              <dt className="font-semibold text-ink">Preço final</dt>
              <dd className="font-display text-xl tabular-nums text-ink">
                {eurosDeCents(preco.finalCents)}
              </dd>
            </div>
          </dl>

          {/* A cobrança não está ligada, e é aqui que isso se diz — no
              sítio onde a pessoa ia clicar. Um botão desativado sem
              explicação lê-se como uma avaria. */}
          {DESBLOQUEIO_PAGO_ATIVO ? null : (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-2xl border border-alert-border bg-alert-bg px-3.5 py-3 text-xs leading-relaxed text-alert-text"
            >
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              {COPY_DESBLOQUEIO_INDISPONIVEL}
            </p>
          )}

          <div className="mt-4 border-t border-stone-100 pt-3.5 dark:border-stone-800">
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
              O que o desbloqueio não compra
            </p>
            <ul className="mt-2 space-y-1.5">
              {DESBLOQUEIO_NAO_COMPRA.map((linha) => (
                <li key={linha} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600"
                  />
                  {linha}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressoLinha({
  rotulo, feito, alvo, fracao,
}: {
  rotulo: string;
  feito: number;
  alvo: number;
  fracao: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(fracao * 100)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-stone-500">{rotulo}</dt>
        <dd className="tabular-nums font-semibold text-stone-700 dark:text-stone-200">
          {feito} / {alvo}
        </dd>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
        role="progressbar"
        aria-valuenow={feito}
        aria-valuemin={0}
        aria-valuemax={alvo}
        aria-label={rotulo}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── A escada ──────────────────────────────────────────────────────────

function Jornada({ p }: { p: Progressao }) {
  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="font-display text-xl text-ink">A tua jornada de progressão</h2>
      <p className="mt-1 text-sm text-stone-500">
        Cada patamar baixa a comissão em um ponto. O preço é o do desbloqueio imediato,
        se o quiseres usar.
      </p>

      <ol className={`${styles.escada} mt-4`}>
        {PATAMARES.map((patamar) => {
          const alcancado = patamar.nivel <= p.patamar.nivel;
          const atual = patamar.nivel === p.patamar.nivel;
          const proximo = patamar.nivel === (p.proximo?.nivel ?? -1);
          return (
            <li
              key={patamar.nivel}
              aria-current={atual ? "step" : undefined}
              className={`${styles.degrau} ${atual ? styles.degrauAtual : ""} ${
                proximo ? styles.degrauProximo : ""
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  alcancado
                    ? "bg-brand text-white"
                    : "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500"
                }`}
              >
                {alcancado && !atual ? <Check size={13} aria-hidden /> : patamar.nivel}
              </span>
              <span className="font-display text-lg leading-none text-ink tabular-nums">
                {patamar.comissaoPct}%
              </span>
              <span className="text-[0.6875rem] font-medium text-stone-500">
                Patamar {patamar.nivel}
              </span>
              {atual ? (
                <Badge tone="brand">Atual</Badge>
              ) : (
                <span className="text-[0.6875rem] tabular-nums text-stone-400">
                  {patamar.precoDesbloqueioCents === 0
                    ? "Grátis"
                    : eurosDeCents(patamar.precoDesbloqueioCents)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── Desconto de fidelidade ────────────────────────────────────────────

function DescontoDeFidelidade({ estado }: { estado: EstadoProgressao }) {
  const atual = descontoDeFidelidadePct(estado.cartoesConcluidos);
  const bonus = proximoBonusDeFidelidade(estado.cartoesConcluidos);

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Gift size={17} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        Desconto de fidelidade
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Quantos mais cartões de fidelidade os teus clientes concluírem, maior o desconto
        no desbloqueio de patamares.
      </p>

      <ul className="mt-4 space-y-1.5">
        {ESCALA_FIDELIDADE.map((degrau) => {
          const ativo = estado.cartoesConcluidos >= degrau.cartoes;
          return (
            <li
              key={degrau.cartoes}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-sm ${
                ativo
                  ? "bg-brand-light/60 dark:bg-brand/10"
                  : "bg-cream/70 dark:bg-white/[0.03]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 text-stone-600 dark:text-stone-300">
                {ativo ? (
                  <Check size={14} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
                ) : (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600"
                  />
                )}
                <span className="truncate">
                  {degrau.cartoes} {degrau.cartoes === 1 ? "cartão concluído" : "cartões concluídos"}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums font-semibold ${
                  ativo ? "text-brand-dark dark:text-brand-mint" : "text-stone-400"
                }`}
              >
                {degrau.descontoPct}%
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-stone-100 pt-3.5 dark:border-stone-800">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Tens{" "}
          <strong className="font-semibold text-ink tabular-nums">
            {estado.cartoesConcluidos}
          </strong>{" "}
          {estado.cartoesConcluidos === 1 ? "cartão concluído" : "cartões concluídos"}
          {atual > 0 ? (
            <>
              {" "}— o desconto em vigor é de{" "}
              <strong className="font-semibold text-brand-dark dark:text-brand-mint tabular-nums">
                {atual}%
              </strong>
              .
            </>
          ) : (
            <> — ainda sem desconto.</>
          )}
        </p>
        {bonus && (
          <p className="mt-1.5 text-sm text-stone-500">
            {bonus.cartoesEmFalta === 1
              ? "Falta 1 cartão"
              : `Faltam ${bonus.cartoesEmFalta} cartões`}{" "}
            para o desconto subir para {bonus.descontoPct}%.
          </p>
        )}
        <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          {COPY_DESCONTO_UNICO}
        </p>
      </div>
    </section>
  );
}

// ─── O registo de XP ───────────────────────────────────────────────────

function AtividadeElegivel({
  eventos, nomePorVinculo, painel,
}: {
  eventos: EventoXPLido[];
  nomePorVinculo: Map<string, string>;
  painel: { href: (destino: string) => string };
}) {
  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Target size={17} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        Atividade elegível recente
      </h2>

      {eventos.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-cream/70 p-4 text-center dark:bg-white/[0.03]">
          <p className="text-sm text-stone-500">
            Ainda não há atividade elegível. O XP aparece aqui quando um cliente chega
            pelo ReciboCerto ou quando concluis um serviço.
          </p>
          <Link
            href={painel.href("/contabilista/clientes")}
            className="focus-marca mt-3 inline-flex text-sm font-semibold text-brand-dark hover:underline dark:text-brand-mint"
          >
            Ver os meus clientes
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {eventos.map((e) => {
            const quem = nomePorVinculo.get(e.origemId);
            return (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-700 dark:text-stone-200">
                    {ROTULO_DO_EVENTO[e.evento] ?? "Atividade elegível"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-400">
                    {/* O nome só aparece quando o vínculo ainda existe. Um
                        acompanhamento terminado perde o nome por desenho
                        (migração 043), e inventar um seria contrariá-la. */}
                    {quem ? `${quem} · ${quando(e.criadoEm)}` : quando(e.criadoEm)}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-sm font-semibold text-brand-dark dark:text-brand-mint">
                  +{e.xp} XP
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3.5 flex items-start gap-2 border-t border-stone-100 pt-3.5 text-xs leading-relaxed text-stone-500 dark:border-stone-800">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
        {COPY_ELEGIBILIDADE}
      </p>
    </section>
  );
}

/** «Hoje», «Ontem», ou a data curta. O relógio é de quem está a ver. */
function quando(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const hoje = new Date();
  const dias = Math.floor(
    (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000
  );
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}
