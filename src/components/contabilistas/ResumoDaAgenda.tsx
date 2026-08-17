"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O TOPO DA AGENDA — o que exige alguma coisa de ti, e quando
//  ---------------------------------------------------------------------
//  A grelha da semana responde bem a «o que tenho na quinta às três?» e mal
//  a «tenho alguma coisa por fazer?». Isso lê-se contando cartões cor de
//  areia com os olhos, semana a semana — e um pedido marcado para daqui a
//  três semanas nunca aparece, porque a grelha só mostra sete dias.
//
//  Este bloco é a resposta a essa segunda pergunta, e vem antes da grelha
//  por isso mesmo: primeiro o que está à espera de ti, depois o mapa do
//  tempo. As duas contas que aqui aparecem são as duas únicas que mudam o
//  que se faz a seguir — o que falta confirmar, e o que é já a seguir.
//
//  A fila só existe quando há fila. Um painel que reserva espaço para
//  «0 por confirmar» ensina a pessoa a ignorar aquele espaço.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { Agendamento } from "@/lib/contabilistas/tipos";
import { diaLocal, horaLocal, rotularDia, tempoAte } from "@/lib/contabilistas/agenda";
import { lerLocal, nomeDoCanal } from "@/lib/contabilistas/local-consulta";
import {
  ArrowRight, Calendar, Check, Clock, Laptop, MapPin, Warning,
} from "@/components/ui/Icons";

export interface ResumoAgenda {
  porConfirmar: Agendamento[];
  proxima: Agendamento | null;
  confirmadasNaSemana: number;
  /** Confirmadas que ainda não dizem ao cliente onde é. */
  semLocal: Agendamento[];
}

/**
 * As contas do topo, a partir da mesma lista que alimenta a grelha.
 *
 * Puro e exportado para ser testável sem montar o ecrã: as regras de «o que
 * conta como por confirmar» e «qual é a próxima» são as que decidem o que a
 * pessoa vê primeiro, e não podem depender de um render.
 */
export function resumirAgenda(agendamentos: Agendamento[], agora: Date = new Date()): ResumoAgenda {
  const t = agora.getTime();
  const fimDaSemana = t + 7 * 86400_000;

  // Um pedido que já passou não é trabalho: é história. Pedir para o
  // confirmar seria mandar alguém confirmar uma consulta de ontem.
  const porConfirmar = agendamentos
    .filter((a) => a.estado === "pedido" && Date.parse(a.inicio) > t)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const futurasVivas = agendamentos
    .filter((a) => (a.estado === "confirmado" || a.estado === "pedido") && Date.parse(a.fim) > t)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const confirmadasNaSemana = agendamentos.filter(
    (a) => a.estado === "confirmado" && Date.parse(a.inicio) > t && Date.parse(a.inicio) <= fimDaSemana
  ).length;

  const semLocal = agendamentos
    .filter(
      (a) =>
        a.estado === "confirmado" &&
        Date.parse(a.inicio) > t &&
        !(a.localOuLigacao ?? "").trim()
    )
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  return {
    porConfirmar,
    proxima: futurasVivas[0] ?? null,
    confirmadasNaSemana,
    semLocal,
  };
}

export default function ResumoDaAgenda({
  agendamentos, nomeDoCliente, ocupado, onAbrir, onConfirmar,
}: {
  agendamentos: Agendamento[];
  nomeDoCliente: (clienteId: string) => string;
  ocupado: string | null;
  onAbrir: (a: Agendamento) => void;
  onConfirmar: (a: Agendamento) => void;
}) {
  const resumo = useMemo(() => resumirAgenda(agendamentos), [agendamentos]);

  if (!resumo.proxima && resumo.porConfirmar.length === 0 && resumo.semLocal.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* ── A próxima, e a carga da semana ─────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {resumo.proxima && (
          <ProximaConsulta
            consulta={resumo.proxima}
            nome={nomeDoCliente(resumo.proxima.clienteId)}
            onAbrir={onAbrir}
          />
        )}

        <div className="flex flex-col justify-center gap-1 rounded-4xl border border-stone-200 bg-white px-5 py-4 shadow-card">
          <p className="eyebrow">Os próximos sete dias</p>
          <p className="font-display text-3xl leading-none tabular-nums text-ink">
            {resumo.confirmadasNaSemana}
          </p>
          <p className="text-sm text-stone-500">
            {resumo.confirmadasNaSemana === 1 ? "consulta confirmada" : "consultas confirmadas"}
            {resumo.porConfirmar.length > 0 && (
              <> · {resumo.porConfirmar.length} por confirmar</>
            )}
          </p>
        </div>
      </div>

      {/* ── Confirmadas sem local: o engano silencioso ─────────────── */}
      {resumo.semLocal.length > 0 && (
        <div className="rounded-4xl border border-alert-border bg-alert-bg px-4 py-3.5 sm:px-5">
          <p className="flex items-start gap-2 text-sm font-semibold leading-snug text-alert-text">
            <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
            {resumo.semLocal.length === 1
              ? "Há uma consulta confirmada sem local."
              : `Há ${resumo.semLocal.length} consultas confirmadas sem local.`}
          </p>
          <p className="mt-1 pl-6 text-xs leading-relaxed text-alert-text/80">
            O cliente já sabe a hora e ainda não sabe onde é nem por onde entra.
          </p>
          <ul className="mt-2.5 space-y-1.5 pl-6">
            {resumo.semLocal.slice(0, 3).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(a)}
                  className="inline-flex min-h-[2rem] items-center gap-1.5 text-xs font-semibold text-alert-text underline underline-offset-2 hover:no-underline"
                >
                  {rotularDia(diaLocal(new Date(a.inicio)))}, {horaLocal(new Date(a.inicio))} · {nomeDoCliente(a.clienteId)}
                  <ArrowRight size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── A fila do que espera por ti ────────────────────────────── */}
      {resumo.porConfirmar.length > 0 && (
        <section
          aria-labelledby="fila-titulo"
          className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card"
        >
          <header className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 sm:px-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-alert-bg text-alert-text">
              <Clock size={15} aria-hidden />
            </span>
            <h2 id="fila-titulo" className="font-semibold text-stone-800">
              À espera de ti
            </h2>
            <span className="ml-auto text-xs font-semibold tabular-nums text-stone-400">
              {resumo.porConfirmar.length}
            </span>
          </header>

          <ul className="divide-y divide-stone-100">
            {resumo.porConfirmar.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => onAbrir(a)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold tabular-nums text-stone-800 first-letter:uppercase">
                      {rotularDia(diaLocal(new Date(a.inicio)))}, {horaLocal(new Date(a.inicio))}
                    </span>
                    <span className="text-xs text-stone-400">{tempoAte(a.inicio)}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500">
                    <span className="font-medium">{nomeDoCliente(a.clienteId)}</span>
                    <span className="text-stone-300" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      {a.modalidade === "online"
                        ? <><Laptop size={11} className="text-stone-400" aria-hidden /> Online</>
                        : <><MapPin size={11} className="text-stone-400" aria-hidden /> Presencial</>}
                    </span>
                  </span>
                  {a.assunto && (
                    <span className="mt-0.5 block truncate text-xs text-stone-500">{a.assunto}</span>
                  )}
                </button>

                {/*
                  Confirmar daqui abre a folha em vez de gravar já. Não é um
                  atalho por cortar: confirmar sem dizer onde é deixa o
                  cliente com hora e sem sítio, e é a folha que recolhe o
                  canal. O botão leva lá — não salta a pergunta.
                */}
                <button
                  type="button"
                  disabled={ocupado === a.id}
                  onClick={() => onConfirmar(a)}
                  className="inline-flex min-h-[2.25rem] shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                  <Check size={13} aria-hidden /> Confirmar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProximaConsulta({
  consulta, nome, onAbrir,
}: {
  consulta: Agendamento;
  nome: string;
  onAbrir: (a: Agendamento) => void;
}) {
  const inicio = new Date(consulta.inicio);
  const local = lerLocal(
    consulta.modalidade,
    consulta.localOuLigacao,
    consulta.localLat,
    consulta.localLng
  );

  return (
    <button
      type="button"
      onClick={() => onAbrir(consulta)}
      className="rounded-4xl border border-brand/25 bg-brand-light/40 px-5 py-4 text-left transition-shadow hover:shadow-lift"
    >
      <p className="eyebrow flex items-center gap-1.5">
        <Calendar size={12} aria-hidden /> A seguir
      </p>
      <p className="mt-1 font-display text-xl leading-tight text-ink first-letter:uppercase">
        {rotularDia(diaLocal(inicio))}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-stone-700">
        <span className="font-semibold">{horaLocal(inicio)}</span>
        <span className="text-stone-300" aria-hidden>·</span>
        <span className="truncate font-medium">{nome}</span>
        <span className="text-stone-300" aria-hidden>·</span>
        <span className="text-stone-500">{tempoAte(consulta.inicio)}</span>
      </p>
      {/* Numa presencial interessa a morada; numa chamada interessa POR ONDE
          — «Google Meet» diz mais do que trinta caracteres de URL cortada. */}
      <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-stone-500">
        {consulta.modalidade === "online"
          ? <Laptop size={12} className="shrink-0 text-stone-400" aria-hidden />
          : <MapPin size={12} className="shrink-0 text-stone-400" aria-hidden />}
        <span className="truncate">
          {local
            ? local.tipo === "presencial"
              ? local.texto
              : nomeDoCanal(local)
            : consulta.modalidade === "online"
              ? "Sem link ainda"
              : "Sem morada ainda"}
        </span>
      </p>
    </button>
  );
}
