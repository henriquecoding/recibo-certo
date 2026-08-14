"use client";

// A folha de uma consulta: o que é, e o que se lhe pode fazer.
//
// Existe porque a grelha semanal mostra um cartão de 56 pixéis de altura —
// espaço para a hora e pouco mais. As ações não cabem lá, e enfiá-las num
// menu de três pontos dentro de um cartão desse tamanho seria um alvo de
// toque impossível num telemóvel.
//
// As perguntas antes do irreversível continuam a ser as do ecrã da agenda:
// esta folha só pede a ação, não decide nada sozinha.

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import type { Agendamento, EstadoAgendamento } from "@/lib/contabilistas/tipos";
import { diaLocal, horaLocal, rotularDia } from "@/lib/contabilistas/agenda";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Check, Close, Gift, Laptop, MapPin } from "@/components/ui/Icons";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ROTULO: Record<EstadoAgendamento, { texto: string; tom: "brand" | "alert" | "neutral" | "danger" }> = {
  pedido: { texto: "Por confirmar", tom: "alert" },
  confirmado: { texto: "Confirmada", tom: "brand" },
  realizada: { texto: "Realizada", tom: "neutral" },
  cancelado_cliente: { texto: "Cancelada pelo cliente", tom: "neutral" },
  cancelado_contabilista: { texto: "Cancelada por ti", tom: "neutral" },
  nao_compareceu: { texto: "Não compareceu", tom: "danger" },
};

export default function DetalheConsulta({
  consulta, ocupado, fidelidadeAtiva, nomeCliente, onEstado, onFechar,
}: {
  consulta: Agendamento;
  ocupado: boolean;
  fidelidadeAtiva: boolean;
  /** Como tratar o cliente. Ver `tratamentoDoCliente` em `tipos.ts`. */
  nomeCliente?: string;
  /**
   * O terceiro argumento é a morada ou o link da chamada. Vai junto com a
   * mudança de estado de propósito: confirmar uma consulta presencial sem
   * dizer onde é deixa o cliente exatamente onde estava.
   */
  onEstado: (a: Agendamento, estado: EstadoAgendamento, localOuLigacao?: string) => void;
  onFechar: () => void;
}) {
  const [local, setLocal] = useState(consulta.localOuLigacao ?? "");
  const caixaRef = useRef<HTMLDivElement>(null);
  const inicio = new Date(consulta.inicio);
  const jaComecou = inicio.getTime() <= Date.now();
  const fechada =
    consulta.estado.startsWith("cancelado") ||
    consulta.estado === "realizada" ||
    consulta.estado === "nao_compareceu";
  const meta = ROTULO[consulta.estado];

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => caixaRef.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus(), 60);
    return () => {
      clearTimeout(t);
      if (anterior && typeof anterior.focus === "function") anterior.focus();
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onFechar(); return; }
      if (e.key !== "Tab" || !caixaRef.current) return;
      const focaveis = Array.from(caixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && (document.activeElement === primeiro || !caixaRef.current.contains(document.activeElement))) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalhe-consulta-titulo"
      className="fixed inset-0 z-[9100]"
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onFechar} aria-hidden />

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <m.div
          ref={caixaRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="pointer-events-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-4xl border border-stone-200/80 bg-white shadow-float sm:rounded-4xl"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 sm:hidden" aria-hidden />

          <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <p className="eyebrow">Consulta</p>
              <h2 id="detalhe-consulta-titulo" className="mt-1 font-display text-xl leading-tight text-ink first-letter:uppercase">
                {rotularDia(diaLocal(inicio))}
              </h2>
              {nomeCliente && (
                <p className="mt-1 truncate text-sm font-semibold text-stone-700">{nomeCliente}</p>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-stone-600">
                <span className="font-semibold">{horaLocal(inicio)} — {horaLocal(new Date(consulta.fim))}</span>
                <span className="text-stone-300" aria-hidden>·</span>
                <span className="flex items-center gap-1.5">
                  {consulta.modalidade === "online"
                    ? <><Laptop size={14} className="text-stone-400" aria-hidden /> Online</>
                    : <><MapPin size={14} className="text-stone-400" aria-hidden /> Presencial</>}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            >
              <Close size={18} aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
            <Badge tone={meta.tom}>{meta.texto}</Badge>

            {consulta.assunto && (
              <p className="mt-3.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-700">
                {consulta.assunto}
              </p>
            )}

            {!consulta.assunto && (
              <p className="mt-3.5 text-sm text-stone-400">O cliente não escreveu um assunto.</p>
            )}

            {/* Onde é.
                A coluna existia desde a migração 042 e nenhum ecrã a lia:
                quem marcava presencial nunca soube a morada, e quem marcava
                online nunca recebeu o link. */}
            {fechada ? (
              consulta.localOuLigacao && (
                <p className="mt-3.5 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-700">
                  {consulta.modalidade === "online"
                    ? <Laptop size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
                    : <MapPin size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />}
                  <span className="min-w-0 break-words">{consulta.localOuLigacao}</span>
                </p>
              )
            ) : (
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-stone-700">
                  {consulta.modalidade === "online" ? "Link da chamada" : "Morada"}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-stone-400">
                  O cliente vê isto na área dele assim que confirmares.
                </span>
                <input
                  value={local}
                  onChange={(e) => setLocal(e.target.value.slice(0, 500))}
                  placeholder={
                    consulta.modalidade === "online"
                      ? "https://…"
                      : "Rua, número, andar e sala"
                  }
                  inputMode={consulta.modalidade === "online" ? "url" : "text"}
                  className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
            )}
          </div>

          {!fechada && (
            <footer className="flex shrink-0 flex-wrap gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
              {consulta.estado === "pedido" && (
                <Button size="sm" disabled={ocupado} onClick={() => onEstado(consulta, "confirmado", local)}>
                  <Check size={15} aria-hidden /> Confirmar
                </Button>
              )}
              {jaComecou && (
                <Button
                  size="sm"
                  variant={consulta.estado === "confirmado" ? "primary" : "secondary"}
                  disabled={ocupado}
                  onClick={() => onEstado(consulta, "realizada", local)}
                  title={fidelidadeAtiva ? "Carimba o cartão de fidelidade" : undefined}
                >
                  <Gift size={15} aria-hidden /> Marcar realizada
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => onEstado(consulta, "cancelado_contabilista")}>
                Cancelar
              </Button>
              {jaComecou && (
                <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => onEstado(consulta, "nao_compareceu")}>
                  Não compareceu
                </Button>
              )}
            </footer>
          )}
        </m.div>
      </div>
    </div>
  );
}
