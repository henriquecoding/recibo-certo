"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PROGRESSÃO E COMISSÃO — o ecrã (REFERÊNCIA C)
//  ---------------------------------------------------------------------
//  Os VALORES são os do Relatório Mestre §164, não os da imagem. Onde a
//  referência C mostra outro número, o relatório ganha:
//
//    patamares   10% · 9% · 8% · 7% · 6% · 5%
//    XP          0 · 200 · 500 · 900 · 1500 · 2300
//    preços      grátis · 14,99 · 24,99 · 39,99 · 64,99 · 99,99
//    XP/evento   +10 serviço · +25 primeiro serviço de cliente novo
//                +100 ciclo de fidelidade concluído
//
//  A imagem escreve «Faltam 60 XP» com a barra em 540/600. Com os
//  thresholds oficiais, 540 XP é patamar 3 e faltam 360 para o 4 — e a
//  barra mede DENTRO do intervalo 500→900, não sobre o total.
//
//  A HIERARQUIA é a da imagem, e essa segue-se à letra:
//   1. a comissão atual é o herói dominante;
//   2. o próximo patamar é a segunda prioridade;
//   3. duas rotas lado a lado com o «OU» ao meio — mérito primeiro, e o
//      pagamento NUNCA visualmente superior (§77.3). O verde da marca fica
//      do lado do mérito; a compra usa lilás;
//   4. a jornada 10→5 é um progress indicator com quatro estados, não seis
//      cartões com o mesmo peso;
//   5. XP, créditos e atividade em terceiro nível.
//
//  Duas correções de copy que a §164 exige pelo nome:
//   · «Cada patamar REDUZ a comissão do Recibo Certo» — nunca «aumenta a
//     tua comissão», que diz o contrário do que acontece num ecrã onde o
//     número desce de 10% para 5%;
//   · os marcos são de CRÉDITOS DISPONÍVEIS, não de cartões concluídos. Os
//     créditos gastam-se ao comprar: quem concluiu 10 cartões e já gastou 5
//     tem direito a 15%, não a 20%.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import {
  listarEventosXP, obterProgressao, type EventoXPLido, type TipoEventoXP,
} from "@/lib/contabilistas/fonte/dados";
import {
  MARCOS_CREDITO, PATAMARES, XP_POR_EVENTO, copyEmFalta, copyJornadaProgressao,
  descontoPorCreditos, descricaoDescontoFidelidade, formatarComissao, formatarEuros,
  vistaProgressao, type EstadoProgressao, type VistaProgressao,
} from "@/lib/contabilistas/progressao/catalogo";
import {
  COPY_BASE_DA_COMISSAO, COPY_DESBLOQUEIO_INDISPONIVEL, COPY_ELEGIBILIDADE,
  COPY_QUEM_FATURA, DESBLOQUEIO_NAO_COMPRA, DESBLOQUEIO_PAGO_ATIVO,
} from "@/lib/contabilistas/progressao/fronteiras";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { abrirDesbloqueio } from "@/lib/contabilistas/fonte/pagamentos";
import { Award, Check, Gift, Info, Lock, Star, Target, Trophy, Warning } from "@/components/ui/Icons";
import ProgramaFundador from "@/components/contabilistas/ProgramaFundador";
import styles from "../painel.module.css";

export default function ProgressaoPage() {
  const { ficha, userId, aCarregar } = usarFicha();
  const painel = usarPainel();
  const [estado, setEstado] = useState<EstadoProgressao | null>(null);
  const [eventos, setEventos] = useState<EventoXPLido[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [tique, setTique] = useState(0);

  const quem = userId ?? ficha?.userId ?? "";

  useEffect(() => {
    if (!ficha) return;
    let vivo = true;
    setErro(null);
    Promise.all([obterProgressao(quem), listarEventosXP(quem, 6)])
      .then(([p, e]) => { if (vivo) { setEstado(p); setEventos(e); } })
      // ⚠️ NÃO substituir por um estado inicial fabricado. Isto apresentava
      // «patamar Base · 10% · 0 XP» quando a leitura falhava, sem distinção
      // nenhuma face ao valor verdadeiro — um número inventado sobre a
      // comissão da própria pessoa. Uma lista vazia é uma coisa; um número
      // errado sobre dinheiro é outra.
      .catch((e: unknown) => {
        if (vivo) setErro(e instanceof Error ? e.message : "Não foi possível ler a tua progressão.");
      });
    return () => { vivo = false; };
  }, [ficha, quem, tique]);

  if (aCarregar || !ficha) return <EsqueletoPainel forma="duasColunas" />;

  if (erro) {
    return (
      <div className="space-y-6">
        <CabecalhoPainel titulo="Progressão e comissão" />
        <div role="alert" className="rounded-4xl border border-clay-border bg-clay-bg/40 px-5 py-10 text-center">
          <Warning size={24} className="mx-auto text-clay-text" aria-hidden />
          <p className="mt-3 font-semibold text-clay-text">
            Não foi possível ler a tua progressão
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-600">
            Não mostramos um patamar por adivinhação — seria um número errado sobre a
            tua comissão. {erro}
          </p>
          <button
            type="button"
            onClick={() => setTique((t) => t + 1)}
            className="focus-marca mt-5 inline-flex min-h-10 items-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-brand/35"
          >
            Tentar outra vez
          </button>
        </div>
      </div>
    );
  }

  if (!estado) return <EsqueletoPainel forma="duasColunas" />;

  const v = vistaProgressao(estado);

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Progressão e comissão"
        descricao="A taxa que o Recibo Certo cobra desce com o trabalho feito. Aqui vês em que patamar estás, o que falta para o próximo, e o que cada via custa."
      />

      <Hero v={v} estado={estado} />

      {/* Antes das duas rotas de propósito: o programa fundador MUDA o
          número que o herói acabou de mostrar, e a negociação é uma
          terceira via. Pô-lo depois deixava a pessoa a ler duas opções
          como se fossem todas. */}
      <ProgramaFundador
        eFundador={estado.eFundador}
        precoCatalogoCents={v.proximo?.precoDesbloqueioCents ?? null}
        patamarAlvo={v.proximo?.ordem ?? null}
        aoMudar={() => setTique((t) => t + 1)}
      />

      <BaseDaComissao />
      <DuasRotas v={v} estado={estado} />
      <Jornada v={v} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CreditosDeFidelidade estado={estado} />
        <AtividadeElegivel eventos={eventos} painel={painel} />
      </div>
    </div>
  );
}

// ─── 1. O herói: a comissão atual ──────────────────────────────────────

function Hero({ v, estado }: { v: VistaProgressao; estado: EstadoProgressao }) {
  const comprado = estado.patamarComprado > estado.patamarConquistado;
  const falta = copyEmFalta(v);

  return (
    <section className={`${styles.heroProgressao} p-5 sm:p-7`}>
      <span className={styles.heroBrilho} aria-hidden />
      <div className="relative">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white/55">
          A tua progressão profissional
        </p>

        {/* ⚠️ O NÚMERO GRANDE É O QUE VAI À FATURA, e não o do patamar.
            São diferentes sempre que o benefício de fundador estiver a
            valer, e mostrar aqui o do patamar punha «10%» em cima e «5%»
            no cartão de fundador, no mesmo ecrã. Duas verdades sobre
            dinheiro na mesma página é pior do que uma errada. */}
        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
          <p className="flex items-baseline gap-1">
            <span className="font-display text-5xl leading-none text-white tabular-nums sm:text-6xl">
              {formatarComissao(v.comissaoEfetivaBps).replace("%", "")}
            </span>
            <span className="font-display text-2xl leading-none text-white/85">%</span>
          </p>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-white">
                {v.atual.titulo} · patamar {v.efetivo} de {PATAMARES.length}
              </span>
              {comprado && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-white/90">
                  <Lock size={11} aria-hidden /> Desbloqueado
                </span>
              )}
              {estado.eFundador && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-white/90">
                  <Award size={11} aria-hidden /> Fundador
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-white/65">
              de comissão atual
              {estado.eFundador && v.comissaoEfetivaBps < v.atual.comissaoBps && (
                <>
                  {" "}— o patamar {v.efetivo} daria{" "}
                  {formatarComissao(v.atual.comissaoBps)}, e o programa fundador
                  baixa-o
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/12 bg-black/15 p-4">
          {v.noTopo ? (
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
              <Trophy size={16} className="mt-0.5 shrink-0 text-brand-mint" aria-hidden />
              <span>
                Estás no patamar mais alto. {formatarComissao(v.comissaoEfetivaBps)} é a
                comissão mais baixa que existe — não há mais degraus a subir.
              </span>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
                  <Target size={16} className="mt-0.5 shrink-0 text-brand-mint" aria-hidden />
                  <span>{falta}</span>
                </p>
                <p className="shrink-0 text-xs font-semibold text-white/70 tabular-nums">
                  {v.xp} / {v.proximo!.xpMinimo} XP
                </p>
              </div>
              <div
                className={`${styles.barraEscura} mt-3`}
                role="progressbar"
                aria-valuenow={v.xp}
                aria-valuemin={v.atual.xpMinimo}
                aria-valuemax={v.proximo!.xpMinimo}
                aria-label={`Progresso para o patamar ${v.proximo!.titulo}`}
              >
                <div
                  className={styles.barraEscuraProgresso}
                  style={{ width: `${Math.round(v.progressoNoIntervalo * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        <p className="mt-3.5 flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Os patamares podem ser alcançados por mérito ou, opcionalmente,
            desbloqueados com pagamento.
          </span>
        </p>
      </div>
    </section>
  );
}

// ─── Sobre o que a taxa incide ─────────────────────────────────────────

function BaseDaComissao() {
  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Award size={17} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        Sobre o que incide a comissão
      </h2>
      <dl className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-cream/70 p-3.5 dark:bg-white/[0.03]">
          <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">A base</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {COPY_BASE_DA_COMISSAO}
          </dd>
        </div>
        <div className="rounded-2xl bg-cream/70 p-3.5 dark:bg-white/[0.03]">
          <dt className="text-xs font-bold uppercase tracking-wider text-stone-400">Quem fatura</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {COPY_QUEM_FATURA}
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ─── 2/3. As duas rotas, com o «OU» ao meio ────────────────────────────

/**
 * A imagem põe o «OU» VERTICAL, entre os dois cartões, discreto mas
 * inevitável. É o que a §77.3 pede, e é o que impede a leitura de que
 * pagar é o caminho e o mérito é a nota de rodapé.
 *
 * O verde da marca fica do lado do MÉRITO. A compra usa lilás — não é
 * decoração: no design system o verde significa ação e marca, e pôr o
 * botão de pagar em verde gigante ao lado de texto secundário era
 * exatamente o dark pattern que a §77.3 nomeia.
 */
function DuasRotas({ v, estado }: { v: VistaProgressao; estado: EstadoProgressao }) {
  if (v.noTopo || !v.proximo) return null;
  const proximo = v.proximo;
  const sim = v.simulacaoMelhorDesconto;

  return (
    <section>
      {/* Eram duas. Com a negociação — que vive no bloco acima, e só
          aparece a quem não é fundador — passaram a ser três, e um título
          a contá-las mal é a primeira coisa que alguém nota. */}
      <h2 className="font-display text-xl text-ink">
        Como subir para {formatarComissao(proximo.comissaoBps)}
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Estas duas chegam ao mesmo patamar, e a primeira é a que a plataforma quer
        premiar. Se nenhuma servir, podes propor outro valor mais acima nesta página.
      </p>

      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* ── Mérito (verde da marca) ── */}
        <div className="flex flex-col rounded-4xl border border-brand/30 bg-white p-5 shadow-card dark:border-brand/25">
          <p className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-brand-dark dark:text-brand-mint">
            <Star size={13} aria-hidden /> Conquistar por mérito
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Cada serviço concluído e cada cliente novo aproximam-te do próximo patamar.
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <Barra rotulo="XP" feito={v.xp} alvo={proximo.xpMinimo} fracao={v.progressoNoIntervalo} />
            {proximo.clientesMinimo > 0 && (
              <Barra
                rotulo="Clientes elegíveis"
                feito={estado.clientesElegiveis}
                alvo={proximo.clientesMinimo}
                fracao={estado.clientesElegiveis / Math.max(1, proximo.clientesMinimo)}
              />
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-stone-100 pt-3">
              <dt className="font-semibold text-ink">Comissão ao atingir</dt>
              <dd className="font-display text-xl tabular-nums text-brand-dark dark:text-brand-mint">
                {formatarComissao(proximo.comissaoBps)}
              </dd>
            </div>
          </dl>

          <ul className="mt-4 space-y-1 border-t border-stone-100 pt-3.5 text-xs text-stone-500">
            <li>Serviço concluído — <strong className="tabular-nums">+{XP_POR_EVENTO.servicoElegivel} XP</strong></li>
            <li>Primeiro serviço de um cliente novo — <strong className="tabular-nums">+{XP_POR_EVENTO.primeiroServicoDeNovoCliente} XP</strong></li>
            <li>Ciclo de fidelidade concluído — <strong className="tabular-nums">+{XP_POR_EVENTO.cartaoElegivelConcluido} XP</strong> e 1 crédito</li>
          </ul>

          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
            {COPY_ELEGIBILIDADE}
          </p>
        </div>

        {/* ── O «OU», vertical e ao meio ── */}
        <div className="flex items-center justify-center lg:flex-col">
          <span aria-hidden className="hidden h-full w-px bg-stone-200 lg:block" />
          <span className="my-2 rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-stone-400">
            ou
          </span>
          <span aria-hidden className="hidden h-full w-px bg-stone-200 lg:block" />
        </div>

        {/* ── Desbloqueio (lilás, nunca verde) ── */}
        <div className="flex flex-col rounded-4xl border border-categoria-lilas-border bg-white p-5 shadow-card dark:border-violet-500/25">
          <p className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-categoria-lilas-text dark:text-violet-300">
            <Lock size={13} aria-hidden /> Desbloquear agora
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Passa ao patamar {proximo.ordem} de imediato, com{" "}
            {formatarComissao(proximo.comissaoBps)} de comissão.
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-stone-500">Preço base</dt>
              <dd className="tabular-nums text-stone-700">
                {formatarEuros(sim?.baseCents ?? proximo.precoDesbloqueioCents ?? 0)}
              </dd>
            </div>
            {sim && sim.descontoPct > 0 && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-stone-500">
                  Créditos de fidelidade ({sim.creditosUsados} · {sim.descontoPct}%)
                </dt>
                <dd className="tabular-nums font-medium text-categoria-lilas-text dark:text-violet-300">
                  −{formatarEuros(sim.baseCents - sim.finalCents)}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-stone-100 pt-2">
              <dt className="font-semibold text-ink">Preço final</dt>
              <dd className="font-display text-xl tabular-nums text-ink">
                {formatarEuros(sim?.finalCents ?? proximo.precoDesbloqueioCents ?? 0)}
              </dd>
            </div>
          </dl>

          {DESBLOQUEIO_PAGO_ATIVO ? (
            <div className="mt-4">
              <BotaoDesbloquear creditos={estado.creditosDisponiveis} />
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-stone-400">
                Pagamento único, sem subscrição. O patamar fica teu — não desce se
                deixares de faturar.
              </p>
            </div>
          ) : (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-2xl border border-alert-border bg-alert-bg px-3.5 py-3 text-xs leading-relaxed text-alert-text"
            >
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              {COPY_DESBLOQUEIO_INDISPONIVEL}
            </p>
          )}

          <div className="mt-4 border-t border-stone-100 pt-3.5">
            <p className="text-xs font-semibold text-stone-600">
              O que o desbloqueio não compra
            </p>
            <ul className="mt-2 space-y-1.5">
              {DESBLOQUEIO_NAO_COMPRA.map((l) => (
                <li key={l} className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * O botão que abre o checkout.
 *
 * Manda quantos créditos quer gastar e mais nada — não o patamar, não o
 * preço. Quem escolhe o alvo é `criar_intencao_desbloqueio` (§68: só o
 * PRÓXIMO patamar) e quem calcula o preço é o mesmo SQL. É a §72, e é o
 * que impede um browser de comprar o patamar 6 pelo preço do 2.
 */
function BotaoDesbloquear({ creditos }: { creditos: number }) {
  const avisos = useAvisos();
  const [ocupado, setOcupado] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        const r = await abrirDesbloqueio(creditos);
        setOcupado(false);
        if (r.erro) {
          avisos.erro("Não foi possível abrir o pagamento.", { detalhe: r.erro });
          return;
        }
        if (r.url) window.location.href = r.url;
      }}
    >
      <Lock size={14} aria-hidden />
      {ocupado ? "A abrir…" : "Desbloquear agora"}
    </Button>
  );
}

function Barra({
  rotulo, feito, alvo, fracao,
}: { rotulo: string; feito: number; alvo: number; fracao: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(fracao * 100)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-stone-500">{rotulo}</dt>
        <dd className="tabular-nums font-semibold text-stone-700">
          {feito} / {alvo}
        </dd>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"
        role="progressbar" aria-valuenow={feito} aria-valuemin={0} aria-valuemax={alvo}
        aria-label={rotulo}
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── 4. A jornada: quatro estados, não seis cartões iguais ─────────────

function Jornada({ v }: { v: VistaProgressao }) {
  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-display text-xl text-ink">A tua jornada de progressão</h2>
      {/* §164: a comissão DESCE. «Cada patamar aumenta a tua comissão» está
          proibido pelo nome — diria o contrário do que o ecrã mostra. */}
      <p className="mt-1 text-sm text-stone-500">
        {copyJornadaProgressao("reducao")} O preço é o do desbloqueio imediato, se o quiseres usar.
      </p>

      <ol className={`${styles.escada} mt-4`}>
        {PATAMARES.map((p) => {
          const conquistado = p.ordem < v.efetivo;
          const atual = p.ordem === v.efetivo;
          const proximo = p.ordem === v.efetivo + 1;
          return (
            <li
              key={p.ordem}
              aria-current={atual ? "step" : undefined}
              className={`${styles.degrau} ${atual ? styles.degrauAtual : ""} ${proximo ? styles.degrauProximo : ""}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  conquistado
                    ? "bg-brand text-white"
                    : atual
                      ? "bg-brand-deep text-white"
                      : proximo
                        ? "border-2 border-alert-text/45 text-alert-text dark:border-amber-400/40 dark:text-amber-300"
                        : "bg-stone-100 text-stone-400"
                }`}
              >
                {conquistado ? <Check size={13} aria-hidden /> : p.ordem}
              </span>
              <span className="font-display text-lg leading-none text-ink tabular-nums">
                {formatarComissao(p.comissaoBps)}
              </span>
              <span className="text-[0.6875rem] font-medium text-stone-500">{p.titulo}</span>
              {atual ? (
                <Badge tone="brand">Atual</Badge>
              ) : (
                <span className="text-[0.6875rem] tabular-nums text-stone-400">
                  {p.precoDesbloqueioCents === null ? "Grátis" : formatarEuros(p.precoDesbloqueioCents)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── 5. Créditos de fidelidade (não «cartões concluídos») ──────────────

function CreditosDeFidelidade({ estado }: { estado: EstadoProgressao }) {
  const atual = descontoPorCreditos(estado.creditosDisponiveis);
  const seguinte = MARCOS_CREDITO.find((m) => m.creditos > estado.creditosDisponiveis);

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Gift size={17} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        Créditos de fidelidade
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        Cada ciclo de fidelidade concluído dá um crédito. Os créditos descontam o
        desbloqueio de patamares.
      </p>

      <ul className="mt-4 space-y-1.5">
        {descricaoDescontoFidelidade().map((m, i) => {
          const marco = MARCOS_CREDITO.filter((x) => x.creditos > 0)[i]!;
          const ativo = estado.creditosDisponiveis >= marco.creditos;
          return (
            <li
              key={m.rotulo}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-sm ${
                ativo ? "bg-brand-light/60 dark:bg-brand/10" : "bg-cream/70 dark:bg-white/[0.03]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2 text-stone-600">
                {ativo ? (
                  <Check size={14} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
                ) : (
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                )}
                <span className="truncate">{m.rotulo}</span>
              </span>
              <span className={`shrink-0 tabular-nums font-semibold ${ativo ? "text-brand-dark dark:text-brand-mint" : "text-stone-400"}`}>
                {m.desconto}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-stone-100 pt-3.5">
        <p className="text-sm text-stone-600">
          Tens{" "}
          <strong className="font-semibold text-ink tabular-nums">{estado.creditosDisponiveis}</strong>{" "}
          {estado.creditosDisponiveis === 1 ? "crédito disponível" : "créditos disponíveis"}
          {atual > 0 ? (
            <> — dão{" "}
              <strong className="font-semibold text-brand-dark dark:text-brand-mint tabular-nums">{atual}%</strong>{" "}
              de desconto.
            </>
          ) : (
            <> — ainda sem desconto.</>
          )}
        </p>
        {estado.creditosReservados > 0 && (
          <p className="mt-1.5 text-sm text-stone-500">
            <strong className="tabular-nums">{estado.creditosReservados}</strong> reservados
            num pagamento a decorrer.
          </p>
        )}
        {seguinte && (
          <p className="mt-1.5 text-sm text-stone-500">
            {seguinte.creditos - estado.creditosDisponiveis === 1
              ? "Falta 1 crédito"
              : `Faltam ${seguinte.creditos - estado.creditosDisponiveis} créditos`}{" "}
            para o desconto subir para {seguinte.descontoPct}%.
          </p>
        )}
        <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-stone-500">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          Os marcos não somam entre si, e os créditos são consumidos quando desbloqueias
          um patamar. Podes guardá-los para um patamar mais alto.
        </p>
      </div>
    </section>
  );
}

// ─── Atividade elegível ────────────────────────────────────────────────

const ROTULO_DO_EVENTO: Record<TipoEventoXP, string> = {
  service_completed: "Serviço concluído",
  new_client_first_service: "Primeiro serviço de um cliente novo",
  loyalty_cycle_completed: "Ciclo de fidelidade concluído",
  admin_adjustment: "Ajuste da administração",
  reversal: "Reversão",
};

function AtividadeElegivel({
  eventos, painel,
}: {
  eventos: EventoXPLido[];
  painel: { href: (d: string) => string };
}) {
  // Eventos de sombra medem sem contar (rollout §116). Mostrá-los ao lado
  // dos que contam daria um total que não bate com o XP em vigor.
  const reais = eventos.filter((e) => !e.shadow);

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Target size={17} className="shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        Atividade elegível recente
      </h2>

      {reais.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-cream/70 p-4 text-center dark:bg-white/[0.03]">
          <p className="text-sm text-stone-500">
            Ainda não há atividade elegível. O XP aparece aqui quando concluis um serviço
            ou quando um cliente novo chega pelo Recibo Certo.
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
          {reais.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-700">
                  {ROTULO_DO_EVENTO[e.tipo] ?? "Atividade elegível"}
                </p>
                <p className="mt-0.5 truncate text-xs text-stone-400">{quando(e.criadoEm)}</p>
              </div>
              <span
                className={`shrink-0 tabular-nums text-sm font-semibold ${
                  e.xp < 0 ? "text-clay-text" : "text-brand-dark dark:text-brand-mint"
                }`}
              >
                {e.xp > 0 ? "+" : ""}{e.xp} XP
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3.5 flex items-start gap-2 border-t border-stone-100 pt-3.5 text-xs leading-relaxed text-stone-500">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
        {COPY_ELEGIBILIDADE}
      </p>
    </section>
  );
}

function quando(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const hoje = new Date();
  const dias = Math.floor(
    (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000,
  );
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}
