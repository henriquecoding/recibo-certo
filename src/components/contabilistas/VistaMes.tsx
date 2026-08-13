"use client";

// ═══════════════════════════════════════════════════════════════════════
//  VISTA DE MÊS — a carga do mês num ecrã
//  ---------------------------------------------------------------------
//  A grelha da semana responde a «o que tenho na quinta às três?». Esta
//  responde a outra pergunta: «como está o mês?». Não é a mesma vista com
//  mais dias — é a vista que se abre quando se quer decidir onde encaixar
//  alguma coisa, ou perceber se a semana que vem está cheia.
//
//  Os pontos por dia mostram carga sem mostrar detalhe. Três pontos e um
//  «+2» dizem «este dia está cheio» sem obrigar a ler cinco linhas de texto
//  numa célula de 40px.
//
//  Teclado: as setas andam de dia em dia, PageUp/PageDown de mês em mês.
//  Um calendário que só funciona com rato exclui quem navega por teclado
//  de toda a agenda, e a agenda é o ecrã mais usado do painel.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";
import { diaLocal, horaLocal, rotularDia } from "@/lib/contabilistas/agenda";
import type { Agendamento, EstadoAgendamento } from "@/lib/contabilistas/tipos";
import { ChevronLeft, ChevronRight } from "@/components/ui/Icons";

const DIAS_CURTOS = ["S", "T", "Q", "Q", "S", "S", "D"] as const;
const DIAS_LONGOS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;

/** A cor do ponto diz o estado sem precisar de legenda em cada célula. */
const COR: Record<EstadoAgendamento, string> = {
  pedido: "bg-alert",
  confirmado: "bg-brand",
  realizada: "bg-stone-400",
  cancelado_cliente: "bg-stone-300",
  cancelado_contabilista: "bg-stone-300",
  nao_compareceu: "bg-clay-text",
};

export default function VistaMes({
  agendamentos, onAbrir,
}: {
  agendamentos: Agendamento[];
  onAbrir: (a: Agendamento) => void;
}) {
  const hoje = diaLocal(new Date());
  const [mes, setMes] = useState(() => hoje.slice(0, 7));
  const [escolhido, setEscolhido] = useState(hoje);
  const grelha = useRef<HTMLDivElement>(null);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const a of agendamentos) {
      const d = diaLocal(new Date(a.inicio));
      mapa.set(d, [...(mapa.get(d) ?? []), a]);
    }
    for (const lista of mapa.values()) lista.sort((x, y) => x.inicio.localeCompare(y.inicio));
    return mapa;
  }, [agendamentos]);

  const celulas = useMemo(() => grelhaDoMes(mes), [mes]);
  const doDia = porDia.get(escolhido) ?? [];

  // Mudar de mês pelo teclado não pode deixar o dia escolhido fora da vista.
  useEffect(() => {
    if (!escolhido.startsWith(mes)) setEscolhido(`${mes}-01`);
  }, [mes, escolhido]);

  function andar(dias: number) {
    const [a, m, d] = escolhido.split("-").map(Number);
    const novo = new Date(Date.UTC(a, m - 1, d + dias));
    const iso = novo.toISOString().slice(0, 10);
    setEscolhido(iso);
    setMes(iso.slice(0, 7));
    // O foco segue o dia: sem isto, o leitor de ecrã anuncia a mudança e
    // o foco fica na célula antiga.
    requestAnimationFrame(() => {
      grelha.current?.querySelector<HTMLElement>(`[data-dia="${iso}"]`)?.focus();
    });
  }

  function mudarMes(delta: number) {
    const [a, m] = mes.split("-").map(Number);
    const novo = new Date(Date.UTC(a, m - 1 + delta, 1));
    setMes(novo.toISOString().slice(0, 7));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="mes-titulo" className="rounded-4xl border border-stone-200 bg-white p-4 shadow-card sm:p-5">
        <header className="flex items-center justify-between gap-2 pb-3">
          <h2 id="mes-titulo" className="font-display text-lg capitalize text-ink">
            {nomeDoMes(mes)}
          </h2>
          <div className="flex gap-1">
            <BotaoMes rotulo="Mês anterior" onClick={() => mudarMes(-1)}><ChevronLeft size={16} aria-hidden /></BotaoMes>
            <button
              type="button"
              onClick={() => { setMes(hoje.slice(0, 7)); setEscolhido(hoje); }}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
            >
              Hoje
            </button>
            <BotaoMes rotulo="Mês seguinte" onClick={() => mudarMes(1)}><ChevronRight size={16} aria-hidden /></BotaoMes>
          </div>
        </header>

        <div
          ref={grelha}
          role="grid"
          aria-label={`Consultas de ${nomeDoMes(mes)}`}
          onKeyDown={(e) => {
            const passos: Record<string, number> = {
              ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
            };
            if (e.key in passos) { e.preventDefault(); andar(passos[e.key]); }
            else if (e.key === "PageUp") { e.preventDefault(); mudarMes(-1); }
            else if (e.key === "PageDown") { e.preventDefault(); mudarMes(1); }
          }}
        >
          <div role="row" className="grid grid-cols-7 pb-1.5">
            {DIAS_CURTOS.map((d, i) => (
              <div key={i} role="columnheader" className="text-center text-[0.6875rem] font-bold uppercase tracking-wider text-stone-400">
                <span aria-hidden>{d}</span>
                <span className="sr-only">{DIAS_LONGOS[i]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia) => {
              const doMes = dia.startsWith(mes);
              const consultas = porDia.get(dia) ?? [];
              const vivas = consultas.filter((c) => !c.estado.startsWith("cancelado"));
              const eHoje = dia === hoje;
              const eEscolhido = dia === escolhido;

              return (
                <button
                  key={dia}
                  role="gridcell"
                  data-dia={dia}
                  type="button"
                  tabIndex={eEscolhido ? 0 : -1}
                  aria-selected={eEscolhido}
                  aria-label={`${rotularDia(dia)}${vivas.length ? `, ${vivas.length} consulta${vivas.length > 1 ? "s" : ""}` : ", sem consultas"}`}
                  onClick={() => { setEscolhido(dia); if (!doMes) setMes(dia.slice(0, 7)); }}
                  className={`flex aspect-square min-h-[2.5rem] flex-col items-center justify-center gap-1 rounded-xl text-sm tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    eEscolhido
                      ? "bg-brand text-white"
                      : eHoje
                        ? "bg-brand-light font-semibold text-brand-dark"
                        : doMes
                          ? "text-stone-700 hover:bg-stone-100"
                          : "text-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <span>{Number(dia.slice(8))}</span>
                  {/* Carga sem detalhe: até três pontos, e o resto num «+n». */}
                  <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                    {consultas.slice(0, 3).map((c) => (
                      <span
                        key={c.id}
                        className={`h-1.5 w-1.5 rounded-full ${eEscolhido ? "bg-white/80" : COR[c.estado]}`}
                      />
                    ))}
                    {consultas.length > 3 && (
                      <span className={`text-[0.5625rem] font-bold leading-none ${eEscolhido ? "text-white/80" : "text-stone-400"}`}>
                        +{consultas.length - 3}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="dia-titulo" className="rounded-4xl border border-stone-200 bg-white p-4 shadow-card sm:p-5">
        <h2 id="dia-titulo" className="font-display text-lg capitalize text-ink">
          {rotularDia(escolhido)}
        </h2>

        <AnimatePresence mode="wait">
          <m.div
            key={escolhido}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {doDia.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">Nada marcado neste dia.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {doDia.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onAbrir(a)}
                      className="flex w-full items-center gap-2.5 rounded-xl bg-cream px-3 py-2.5 text-left transition-colors hover:bg-stone-100"
                    >
                      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${COR[a.estado]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold tabular-nums text-stone-800">
                          {horaLocal(new Date(a.inicio))} — {horaLocal(new Date(a.fim))}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          {a.modalidade === "online" ? "Online" : "Presencial"}
                          {a.assunto ? ` · ${a.assunto}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function BotaoMes({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
    >
      {children}
    </button>
  );
}

/**
 * As 42 células de um mês, de segunda a domingo.
 *
 * Sempre seis semanas, mesmo quando cinco chegariam: uma grelha que muda de
 * altura ao mudar de mês faz saltar tudo o que está por baixo.
 */
function grelhaDoMes(mes: string): string[] {
  const [ano, m] = mes.split("-").map(Number);
  const primeiro = new Date(Date.UTC(ano, m - 1, 1));
  // `getUTCDay()` dá 0 = domingo; a semana portuguesa começa à segunda.
  const desvio = (primeiro.getUTCDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, i) =>
    new Date(Date.UTC(ano, m - 1, 1 - desvio + i)).toISOString().slice(0, 10)
  );
}

function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(ano, m - 1, 1)));
}
