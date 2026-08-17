"use client";

// ═══════════════════════════════════════════════════════════════════════
//  As peças do hub do cliente
//  ---------------------------------------------------------------------
//  Vivem à parte da página por uma razão prática: a página está fechada
//  por sessão e por vínculo, e uma coisa que só se consegue ver depois de
//  entrar, de ser aceite e de ter histórico é uma coisa que ninguém revê.
//  Aqui são funções puras de props — desenháveis, verificáveis e reusáveis
//  sem inventar uma sessão.
//
//  A página ao lado trata dos dados e das perguntas; estas peças só
//  desenham o que recebem.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import type { Agendamento, Contabilista, Partilha, Vinculo } from "@/lib/contabilistas/tipos";
import type { CupaoLido } from "@/lib/contabilistas/dados";
import { ROTULO_PARTILHA, ROTULO_VINCULO } from "@/lib/contabilistas/vinculo";
import { diaLocal, horaLocal, rotularDia, tempoAte } from "@/lib/contabilistas/agenda";
import { lerLocal } from "@/lib/contabilistas/local-consulta";
import { eurosDeCents, valorComDesconto } from "@/lib/contabilistas/fidelidade";
import CartaoDoLocal from "@/components/contabilistas/local/CartaoDoLocal";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Briefcase, Calendar, Check, ChevronDown, ChevronUp, Clock, Copy, Gift, Invoice,
  Laptop, Lock, MapPin, PaperClip, ShieldCheck,
} from "@/components/ui/Icons";

export const ESTADO_CONSULTA: Record<string, { texto: string; tom: "brand" | "alert" | "neutral" | "danger" }> = {
  pedido: { texto: "Por confirmar", tom: "alert" },
  confirmado: { texto: "Confirmada", tom: "brand" },
  realizada: { texto: "Realizada", tom: "neutral" },
  cancelado_cliente: { texto: "Cancelada por ti", tom: "neutral" },
  cancelado_contabilista: { texto: "Cancelada", tom: "neutral" },
  nao_compareceu: { texto: "Não compareceste", tom: "danger" },
};

// ─── Ficha do contabilista ─────────────────────────────────────────────

export function Ficha({
  cc, vinculo, ativo,
}: { cc: Contabilista; vinculo: Vinculo; ativo: boolean }) {
  const local = [cc.concelho, cc.distrito].filter(Boolean).join(", ");
  const desde = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" })
    .format(new Date(vinculo.criadoEm));

  return (
    <section aria-labelledby="ficha-titulo" className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
      {/* Faixa de identidade. É o único sítio da página com fundo de marca:
          é a pessoa com quem se trabalha, não mais um cartão de dados. */}
      <div className="border-b border-stone-100 bg-brand-light/40 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand font-display text-xl font-semibold text-white shadow-glow sm:h-16 sm:w-16 sm:text-2xl"
          >
            {iniciais(cc.nome)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <h2 id="ficha-titulo" className="min-w-0 font-display text-2xl leading-tight text-ink sm:text-3xl">
                {cc.nome}
              </h2>
              <Badge tone={ativo ? "brand" : "alert"}>{ROTULO_VINCULO[vinculo.estado]}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
              {local && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-stone-400" aria-hidden /> {local}
                </span>
              )}
              {cc.occ && (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand" aria-hidden /> OCC n.º {cc.occ}
                </span>
              )}
              {ativo && <span className="text-stone-500">Cliente desde {desde}</span>}
            </div>
          </div>
        </div>

        {!ativo && (
          <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-stone-600 dark:bg-white/10">
            {vinculo.estado === "pendente" || vinculo.estado === "convidado"
              ? "O pedido ainda não foi aceite. Assim que for, podes marcar consultas e enviar-lhe simulações."
              : "O acompanhamento está em pausa. Não podes marcar consultas novas enquanto assim for."}
          </p>
        )}
      </div>

      {/* As ações que valem a pena, e só essas. Terminar não vive aqui. */}
      <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-7">
        {ativo ? (
          <>
            <Link href={`/contabilistas/${cc.slug}`}>
              <Button size="sm"><Calendar size={15} aria-hidden /> Marcar consulta</Button>
            </Link>
            <Link href="/ferramentas">
              <Button size="sm" variant="secondary"><PaperClip size={15} aria-hidden /> Enviar uma simulação</Button>
            </Link>
          </>
        ) : (
          <Link href={`/contabilistas/${cc.slug}`}>
            <Button size="sm" variant="secondary">Ver o perfil</Button>
          </Link>
        )}
      </div>
    </section>
  );
}

// ─── A seguir ──────────────────────────────────────────────────────────

export function ProximaConsulta({
  consulta, slug, ocupado, onCancelar,
}: {
  consulta: Agendamento | null;
  slug: string;
  ocupado: string | null;
  onCancelar: (a: Agendamento) => void;
}) {
  if (!consulta) {
    return (
      <section
        aria-labelledby="sem-consulta-titulo"
        className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-dashed border-stone-300 px-5 py-4 sm:px-6"
      >
        <div className="min-w-0">
          <h2 id="sem-consulta-titulo" className="font-semibold text-stone-800">
            Não tens nenhuma consulta marcada
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Escolhes o dia e a hora nos horários que ele publicou.
          </p>
        </div>
        <Link href={`/contabilistas/${slug}`}>
          <Button size="sm" variant="secondary">Ver horários</Button>
        </Link>
      </section>
    );
  }

  const inicio = new Date(consulta.inicio);
  const meta = ESTADO_CONSULTA[consulta.estado];
  const local = lerLocal(
    consulta.modalidade,
    consulta.localOuLigacao,
    consulta.localLat,
    consulta.localLng
  );

  return (
    <section aria-labelledby="proxima-titulo" className="rounded-4xl border border-brand/25 bg-brand-light/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">A seguir</p>
          <h2 id="proxima-titulo" className="mt-1 font-display text-2xl leading-tight text-ink first-letter:uppercase sm:text-3xl">
            {rotularDia(diaLocal(inicio))}
          </h2>
        </div>
        <Badge tone={meta.tom}>{meta.texto}</Badge>
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-stone-700">
        <span className="flex items-center gap-1.5 font-semibold tabular-nums">
          <Clock size={15} className="text-brand-dark" aria-hidden />
          {horaLocal(inicio)} — {horaLocal(new Date(consulta.fim))}
        </span>
        <span className="text-stone-300" aria-hidden>·</span>
        <span className="flex items-center gap-1.5">
          {consulta.modalidade === "online"
            ? <><Laptop size={15} className="text-stone-400" aria-hidden /> Online</>
            : <><MapPin size={15} className="text-stone-400" aria-hidden /> Presencial</>}
        </span>
        <span className="text-stone-300" aria-hidden>·</span>
        <span className="font-medium text-stone-600">{tempoAte(consulta.inicio)}</span>
      </p>

      {consulta.assunto && (
        <p className="mt-3.5 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-stone-700 dark:bg-white/10">
          {consulta.assunto}
        </p>
      )}

      {/* Onde é.
          Era uma linha de texto: um link que se clicava, ou uma morada que
          não levava a lado nenhum. Passa a ser o mesmo cartão que o
          contabilista vê enquanto o escreve — com o mapa no ponto onde ele
          pôs mesmo o pino, e com as direções a abrir na aplicação que o
          cliente já usa. */}
      {local && (
        <div className="mt-3">
          <CartaoDoLocal local={local} tom="sobre-cor" />
        </div>
      )}

      {consulta.estado === "pedido" && (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Ainda está por confirmar. Avisamos-te aqui assim que ele responder.
        </p>
      )}

      <div className="mt-4">
        <Button size="sm" variant="ghost" disabled={ocupado === consulta.id} onClick={() => onCancelar(consulta)}>
          Cancelar consulta
        </Button>
      </div>
    </section>
  );
}

// ─── Três números que existem ──────────────────────────────────────────

export function Numeros({
  realizadas, carimbos, meta, envios, mostraCartao,
}: {
  realizadas: number; carimbos: number; meta: number; envios: number; mostraCartao: boolean;
}) {
  // A cor identifica o assunto: consultas, cartão, envios. É a mesma
  // convenção do painel do contabilista, para quem passa dos dois lados.
  const tiles: { valor: string; rotulo: string; caixa: string; cor: string }[] = [
    {
      valor: String(realizadas),
      rotulo: realizadas === 1 ? "consulta feita" : "consultas feitas",
      caixa: "border-categoria-azul-border bg-categoria-azul-bg",
      cor: "text-categoria-azul-text",
    },
    ...(mostraCartao
      ? [{
          valor: `${carimbos}/${meta}`,
          rotulo: "no cartão",
          caixa: "border-brand/25 bg-brand-light",
          cor: "text-brand-dark",
        }]
      : []),
    {
      valor: String(envios),
      rotulo: envios === 1 ? "envio ativo" : "envios ativos",
      caixa: "border-categoria-lilas-border bg-categoria-lilas-bg",
      cor: "text-categoria-lilas-text",
    },
  ];

  return (
    <dl className={`grid gap-2.5 ${tiles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {tiles.map((t) => (
        <div key={t.rotulo} className={`rounded-2xl border px-3 py-3.5 text-center sm:px-4 ${t.caixa}`}>
          <dt className="sr-only">{t.rotulo}</dt>
          <dd>
            <span className={`block font-display text-2xl leading-none tabular-nums sm:text-3xl ${t.cor}`}>
              {t.valor}
            </span>
            <span className="mt-1.5 block text-xs leading-tight text-stone-600">{t.rotulo}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Cupões ────────────────────────────────────────────────────────────

export function Cupoes({
  lista, copiado, onCopiar,
}: { lista: CupaoLido[]; copiado: string | null; onCopiar: (codigo: string) => void }) {
  return (
    <section aria-labelledby="cupoes-titulo">
      <h2 id="cupoes-titulo" className="flex items-center gap-2 font-display text-xl text-ink">
        <Gift size={19} className="text-brand-dark" aria-hidden />
        {lista.length === 1 ? "Tens um desconto por usar" : `Tens ${lista.length} descontos por usar`}
      </h2>

      <ul className="mt-3 space-y-2.5">
        {lista.map((c) => {
          const v = valorComDesconto(c.valorBaseCents, c.percentagem);
          return (
            <li
              key={c.id}
              // Talão: o canhoto à esquerda com a percentagem, o corte a
              // tracejado, o código em monoespaçado. Um cupão tem de se
              // parecer com um cupão para se perceber num relance o que é.
              className="flex items-stretch overflow-hidden rounded-2xl border border-brand/25 bg-white"
            >
              <div className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center border-r border-dashed border-brand/40 bg-brand-light/50 px-1 py-4">
                <span className="font-display text-2xl leading-none tabular-nums text-brand-dark">
                  {c.percentagem}%
                </span>
                <span className="mt-1 text-[0.625rem] uppercase tracking-wide text-brand-dark/70">desconto</span>
              </div>

              <div className="min-w-0 flex-1 px-4 py-3.5">
                <p className="font-mono text-base font-semibold tracking-wider text-ink">{c.codigo}</p>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {eurosDeCents(v.baseCents)} passam a{" "}
                  <strong className="text-stone-800">{eurosDeCents(v.finalCents)}</strong>.
                </p>
                <p className="mt-0.5 text-xs text-stone-400">
                  Válido até {new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(new Date(c.expiraEm))}
                </p>
                <div className="mt-2.5">
                  <Button size="sm" variant="secondary" onClick={() => onCopiar(c.codigo)}>
                    {copiado === c.codigo
                      ? <><Check size={14} aria-hidden /> Copiado</>
                      : <><Copy size={14} aria-hidden /> Copiar código</>}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 text-xs leading-relaxed text-stone-500">
        Apresenta o código na consulta. O desconto é aplicado pelo contabilista; o
        ReciboCerto regista-o e mostra-to, não cobra a consulta nem processa pagamentos.
      </p>
    </section>
  );
}

// ─── Consultas por pagar ───────────────────────────────────────────────

/**
 * O que está por pagar, e a quem.
 *
 * Fica ACIMA do histórico e abaixo da próxima consulta: é uma dívida em
 * aberto, e uma dívida em aberto não se esconde num acordeão. A frase que
 * não pode faltar é a de quem recebe o dinheiro — o cliente está a pagar
 * ao contabilista, não ao Recibo Certo, e o extrato do cartão dele vai
 * dizer o nome do contabilista.
 */
export function PorPagar({
  lista, nome, ocupado, onPagar,
}: {
  lista: { agendamentoId: string; inicio: string; valorCents: number; descricao: string }[];
  nome: string;
  ocupado: string | null;
  onPagar: (agendamentoId: string) => void;
}) {
  if (lista.length === 0) return null;

  return (
    <section aria-labelledby="por-pagar-titulo" className="rounded-4xl border border-alert-border bg-alert-bg p-5 sm:p-6">
      <h2 id="por-pagar-titulo" className="flex items-center gap-2 font-display text-xl text-alert-text">
        <Invoice size={19} aria-hidden />
        {lista.length === 1 ? "Tens uma consulta por pagar" : `Tens ${lista.length} consultas por pagar`}
      </h2>

      <ul className="mt-3.5 space-y-2.5">
        {lista.map((c) => (
          <li
            key={c.agendamentoId}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 rounded-2xl bg-white/70 px-4 py-3.5 dark:bg-white/10"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-800">{c.descricao}</p>
              <p className="mt-0.5 text-xs text-stone-500 first-letter:uppercase">
                {rotularDia(diaLocal(new Date(c.inicio)))} · {horaLocal(new Date(c.inicio))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-display text-lg tabular-nums text-ink">
                {eurosDeCents(c.valorCents)}
              </span>
              <Button
                size="sm"
                disabled={ocupado === c.agendamentoId}
                onClick={() => onPagar(c.agendamentoId)}
              >
                {ocupado === c.agendamentoId ? "A abrir…" : "Pagar"}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-alert-text/85">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
        Pagas diretamente a {nome} — é o nome dele que aparece no extrato do teu cartão.
        O pagamento é processado pela Stripe e o Recibo Certo nunca fica com o teu dinheiro.
      </p>
    </section>
  );
}

// ─── Histórico ─────────────────────────────────────────────────────────

export function Historico({ lista }: { lista: Agendamento[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <section aria-labelledby="historico-titulo" className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
      >
        <span className="min-w-0">
          <span id="historico-titulo" className="block font-display text-xl text-ink">
            Histórico de consultas
          </span>
          <span className="mt-0.5 block text-sm text-stone-500">
            {lista.length} {lista.length === 1 ? "consulta" : "consultas"} até agora
          </span>
        </span>
        {aberto
          ? <ChevronUp size={18} className="shrink-0 text-stone-400" aria-hidden />
          : <ChevronDown size={18} className="shrink-0 text-stone-400" aria-hidden />}
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <m.div
            key="lista"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-stone-100 border-t border-stone-100">
              {lista.slice(0, 20).map((a) => {
                const meta = ESTADO_CONSULTA[a.estado] ?? { texto: "Cancelada", tom: "neutral" as const };
                return (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-6">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 first-letter:uppercase">
                        {rotularDia(diaLocal(new Date(a.inicio)))}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-stone-500">
                        <Clock size={13} aria-hidden />
                        {horaLocal(new Date(a.inicio))}
                        <span className="text-stone-300" aria-hidden>·</span>
                        {a.modalidade === "online" ? "Online" : "Presencial"}
                      </p>
                    </div>
                    <Badge tone={meta.tom}>{meta.texto}</Badge>
                  </li>
                );
              })}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Envios ────────────────────────────────────────────────────────────

export function Envios({
  lista, nome, ocupado, onRevogar,
}: {
  lista: Partilha[]; nome: string; ocupado: string | null; onRevogar: (p: Partilha) => void;
}) {
  return (
    <section aria-labelledby="envios-titulo" className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 id="envios-titulo" className="font-display text-xl text-ink">O que já enviaste</h2>
      <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-stone-500">
        <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        Cada envio é uma cópia do que estava no ecrã nesse dia. {nome} vê o que lhe
        enviaste e mais nada — e podes fechar-lhe a porta a qualquer momento.
      </p>

      {lista.length === 0 ? (
        <div className="mt-4">
          <EstadoVazio
            Icon={PaperClip}
            titulo="Ainda não enviaste nada"
            descricao="Nas ferramentas e nos simuladores aparece a opção de enviar o resultado ao teu contabilista."
            acao={<Link href="/ferramentas"><Button size="sm" variant="secondary">Ver ferramentas</Button></Link>}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {lista.map((p) => {
            const revogada = p.estado === "revogada";
            return (
              <li
                key={p.id}
                className={`rounded-2xl border px-4 py-3.5 ${
                  revogada ? "border-stone-200 bg-stone-50" : "border-stone-200 bg-cream"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${revogada ? "text-stone-500 line-through" : "text-stone-800"}`}>
                      {p.titulo}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500">
                      <span>{ROTULO_PARTILHA[p.tipo]}</span>
                      <span className="text-stone-300" aria-hidden>·</span>
                      <span>{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(p.criadoEm))}</span>
                      {p.estado === "vista" && (
                        <>
                          <span className="text-stone-300" aria-hidden>·</span>
                          <span className="flex items-center gap-1 text-brand-dark">
                            <Check size={12} aria-hidden /> já foi visto
                          </span>
                        </>
                      )}
                    </p>
                    {/* O recado que a pessoa escreveu ao enviar. É o que
                        torna a lista reconhecível meses depois. */}
                    {p.nota && !revogada && (
                      <p className="mt-1.5 line-clamp-2 border-l-2 border-stone-200 pl-2.5 text-xs italic leading-relaxed text-stone-500">
                        {p.nota}
                      </p>
                    )}
                  </div>

                  {revogada ? (
                    <Badge tone="neutral">Revogada</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={ocupado === p.id} onClick={() => onRevogar(p)}>
                      Revogar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Terminar ──────────────────────────────────────────────────────────

export function ZonaTerminar({
  nome, ocupado, onTerminar,
}: { nome: string; ocupado: boolean; onTerminar: () => void }) {
  return (
    <section
      aria-labelledby="terminar-titulo"
      // Em argila, separado do resto e no fim: é a única ação da página que
      // fecha portas, e não devia estar ao lado das que as abrem.
      className="rounded-4xl border border-clay-border bg-clay-bg/40 p-5 sm:p-6"
    >
      <h2 id="terminar-titulo" className="font-semibold text-clay-text">
        Terminar o acompanhamento
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600">
        {nome} deixa de conseguir abrir tudo o que lhe enviaste, e as consultas ainda
        por acontecer são canceladas. O teu histórico e os teus dados ficam contigo,
        intactos — e podes voltar a ligar-te mais tarde.
      </p>
      <button
        type="button"
        onClick={onTerminar}
        disabled={ocupado}
        className="mt-4 inline-flex min-h-[2.5rem] items-center rounded-xl border border-clay-border bg-white px-4 text-sm font-semibold text-clay-text transition-colors hover:bg-clay-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        Terminar acompanhamento
      </button>
    </section>
  );
}

// ─── Estados sem relação ───────────────────────────────────────────────

export function SemContabilista({ Envolvente }: { Envolvente: (p: { children: React.ReactNode }) => React.ReactElement }) {
  return (
    <Envolvente>
      <section className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
        <div className="border-b border-stone-100 bg-brand-light/40 px-5 py-8 text-center sm:px-8 sm:py-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand shadow-card">
            <Briefcase size={24} aria-hidden />
          </span>
          <h2 className="mt-4 font-display text-2xl leading-tight text-ink sm:text-3xl">
            Ainda não tens contabilista
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-stone-600">
            Liga-te a um contabilista certificado para lhe enviares as tuas simulações,
            marcares consultas e juntares carimbos.{" "}
            <strong className="text-stone-800">É gratuito</strong> e não exige nenhum plano.
          </p>
          <Link href="/contabilistas" className="mt-5 inline-block">
            <Button>Ver contabilistas</Button>
          </Link>
        </div>

        <ul className="divide-y divide-stone-100">
          {[
            { Icon: Calendar, texto: "Marcas consulta nos horários que ele publica, online ou presencial." },
            { Icon: PaperClip, texto: "Envias simulações com um clique, e vês campo a campo o que segue." },
            { Icon: Gift, texto: "Cada consulta que fizeres carimba o teu cartão — e o cartão cheio vale desconto." },
          ].map(({ Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3 px-5 py-3.5 sm:px-7">
              <Icon size={17} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              <span className="text-sm leading-relaxed text-stone-600">{texto}</span>
            </li>
          ))}
        </ul>
      </section>
    </Envolvente>
  );
}


/** «Ana Maria Costa» → «AC». Uma letra quando só há um nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}
