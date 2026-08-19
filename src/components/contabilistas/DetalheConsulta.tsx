"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A FOLHA DE UMA CONSULTA — o que é, e o que se lhe pode fazer
//  ---------------------------------------------------------------------
//  Existe porque a grelha semanal mostra um cartão de 56 pixéis de altura —
//  espaço para a hora e pouco mais. As ações não cabem lá, e enfiá-las num
//  menu de três pontos dentro de um cartão desse tamanho seria um alvo de
//  toque impossível num telemóvel.
//
//  A folha está organizada por ordem de pergunta, e não por ordem de campo:
//
//    quando é · com quem · o que é · onde é · o que faço agora
//
//  «Onde é» deixou de ser um `<input>` de texto e passou a ser um canal
//  composto (ver `local/CanalDaConsulta`), porque uma morada escrita à mão
//  não leva ninguém a lado nenhum. E o canal deixou de se poder escrever só
//  no instante da confirmação: uma consulta já confirmada mostra o local
//  que tem, com um botão para o corrigir — salas mudam, links expiram, e
//  antes disto não havia por onde o dizer.
//
//  As perguntas antes do irreversível continuam a ser as do ecrã da agenda:
//  esta folha só pede a ação, não decide nada sozinha.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import type { Agendamento, EstadoAgendamento } from "@/lib/contabilistas/tipos";
import { diaLocal, horaLocal, rotularDia, tempoAte } from "@/lib/contabilistas/agenda";
import { lerLocal, pontoValido } from "@/lib/contabilistas/local-consulta";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Check, Clock, Close, Gift, Laptop, MapPin, Pencil, User, Warning,
} from "@/components/ui/Icons";
import CanalDaConsulta, { type CanalEscolhido } from "./local/CanalDaConsulta";
import CartaoDoLocal from "./local/CartaoDoLocal";
import AdicionarAoCalendario from "@/components/calendario/AdicionarAoCalendario";

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
  consulta, ocupado, fidelidadeAtiva, nomeCliente, sugestaoLigacao, onEstado, onGuardarLocal, onFechar,
}: {
  consulta: Agendamento;
  ocupado: boolean;
  fidelidadeAtiva: boolean;
  /** Como tratar o cliente. Ver `tratamentoDoCliente` em `tipos.ts`. */
  nomeCliente?: string;
  /** O link da última consulta online confirmada — a sala de sempre. */
  sugestaoLigacao?: string | null;
  /**
   * O terceiro argumento é o canal (morada com ponto, link ou telefone).
   * Vai junto com a mudança de estado de propósito: confirmar uma consulta
   * presencial sem dizer onde é deixa o cliente exatamente onde estava.
   */
  onEstado: (a: Agendamento, estado: EstadoAgendamento, canal?: CanalEscolhido) => void;
  /** Corrigir o local sem mexer no estado. */
  onGuardarLocal: (a: Agendamento, canal: CanalEscolhido) => Promise<boolean>;
  onFechar: () => void;
}) {
  const pontoGuardado = useMemo(
    () =>
      pontoValido(consulta.localLat, consulta.localLng)
        ? { lat: consulta.localLat as number, lng: consulta.localLng as number }
        : null,
    [consulta.localLat, consulta.localLng]
  );

  const [canal, setCanal] = useState<CanalEscolhido>({
    texto: consulta.localOuLigacao ?? "",
    lat: pontoGuardado?.lat ?? null,
    lng: pontoGuardado?.lng ?? null,
  });
  const [aEditarLocal, setAEditarLocal] = useState(false);
  const [aGuardarLocal, setAGuardarLocal] = useState(false);

  const caixaRef = useRef<HTMLDivElement>(null);
  const inicio = new Date(consulta.inicio);
  const jaComecou = inicio.getTime() <= Date.now();
  const fechada =
    consulta.estado.startsWith("cancelado") ||
    consulta.estado === "realizada" ||
    consulta.estado === "nao_compareceu";
  const meta = ROTULO[consulta.estado];

  const localGuardado = lerLocal(
    consulta.modalidade,
    consulta.localOuLigacao,
    consulta.localLat,
    consulta.localLng
  );

  /** Confirmar uma presencial sem dizer onde é é o engano a evitar. */
  const faltaLocal = consulta.estado === "pedido" && !canal.texto.trim();

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

  async function guardarLocal() {
    if (!canal.texto.trim()) return;
    setAGuardarLocal(true);
    const ok = await onGuardarLocal(consulta, canal);
    setAGuardarLocal(false);
    if (ok) setAEditarLocal(false);
  }

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

          {/* ── Quando é, com quem ─────────────────────────────────── */}
          <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={meta.tom}>{meta.texto}</Badge>
                {!fechada && !jaComecou && (
                  <span className="text-xs font-medium text-stone-500">{tempoAte(consulta.inicio)}</span>
                )}
              </div>
              <h2 id="detalhe-consulta-titulo" className="mt-2 font-display text-xl leading-tight text-ink first-letter:uppercase">
                {rotularDia(diaLocal(inicio))}
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tabular-nums text-stone-600">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Clock size={14} className="text-stone-400" aria-hidden />
                  {horaLocal(inicio)} — {horaLocal(new Date(consulta.fim))}
                </span>
                <span className="text-stone-300" aria-hidden>·</span>
                <span className="flex items-center gap-1.5">
                  {consulta.modalidade === "online"
                    ? <><Laptop size={14} className="text-stone-400" aria-hidden /> Online</>
                    : <><MapPin size={14} className="text-stone-400" aria-hidden /> Presencial</>}
                </span>
              </p>
              {nomeCliente && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-stone-700">
                  <User size={14} className="text-stone-400" aria-hidden />
                  <span className="truncate">{nomeCliente}</span>
                </p>
              )}
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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-stone-100 px-5 py-4 sm:px-6">
            {/* ── O que é ──────────────────────────────────────────── */}
            <section aria-labelledby="assunto-titulo">
              <h3 id="assunto-titulo" className="text-[0.6875rem] font-bold uppercase tracking-wide text-stone-400">
                Assunto
              </h3>
              {consulta.assunto ? (
                <p className="mt-1.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-700">
                  {consulta.assunto}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-stone-400">O cliente não escreveu um assunto.</p>
              )}
            </section>

            {/* ── Onde é ───────────────────────────────────────────── */}
            {fechada ? (
              localGuardado && (
                <section aria-labelledby="local-fechado-titulo">
                  <h3 id="local-fechado-titulo" className="text-[0.6875rem] font-bold uppercase tracking-wide text-stone-400">
                    Onde foi
                  </h3>
                  <div className="mt-1.5">
                    <CartaoDoLocal local={localGuardado} comMapa={false} />
                  </div>
                </section>
              )
            ) : consulta.estado === "confirmado" && !aEditarLocal ? (
              // Já confirmada: mostra-se o que está, e dá-se por onde mudar.
              <section aria-labelledby="local-atual-titulo" className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="local-atual-titulo" className="text-[0.6875rem] font-bold uppercase tracking-wide text-stone-400">
                    Como se encontram
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setAEditarLocal(true)}>
                    <Pencil size={13} aria-hidden /> Mudar
                  </Button>
                </div>
                {localGuardado ? (
                  <CartaoDoLocal local={localGuardado} />
                ) : (
                  <p className="flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-sm leading-relaxed text-alert-text">
                    <Warning size={15} className="mt-0.5 shrink-0" aria-hidden />
                    Esta consulta está confirmada e o cliente ainda não sabe onde é.
                  </p>
                )}
              </section>
            ) : (
              <>
                <CanalDaConsulta
                  modalidade={consulta.modalidade}
                  valorInicial={consulta.localOuLigacao ?? ""}
                  pontoInicial={pontoGuardado}
                  sugestaoLigacao={sugestaoLigacao}
                  onMudar={setCanal}
                />
                {consulta.estado === "confirmado" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" disabled={aGuardarLocal || !canal.texto.trim()} onClick={guardarLocal}>
                      <Check size={15} aria-hidden />
                      {aGuardarLocal ? "A guardar…" : "Guardar o local"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={aGuardarLocal} onClick={() => setAEditarLocal(false)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── O que faço agora ───────────────────────────────────── */}
          {!fechada && (
            <footer className="shrink-0 border-t border-stone-100 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-6">
              {faltaLocal && (
                <p className="mb-2.5 flex items-start gap-2 text-xs leading-relaxed text-alert-text">
                  <Warning size={13} className="mt-0.5 shrink-0" aria-hidden />
                  {consulta.modalidade === "online"
                    ? "Sem link, o cliente fica sem saber por onde entrar."
                    : "Sem morada, o cliente fica sem saber onde é."}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {consulta.estado === "pedido" && (
                  <Button size="sm" disabled={ocupado} onClick={() => onEstado(consulta, "confirmado", canal)}>
                    <Check size={15} aria-hidden /> Confirmar
                  </Button>
                )}
                {jaComecou && (
                  <Button
                    size="sm"
                    variant={consulta.estado === "confirmado" ? "primary" : "secondary"}
                    disabled={ocupado}
                    onClick={() => onEstado(consulta, "realizada", canal)}
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
                {!jaComecou && (
                  <AdicionarAoCalendario
                    id={consulta.id}
                    inicio={consulta.inicio}
                    fim={consulta.fim}
                    titulo={nomeCliente ? `Consulta · ${nomeCliente}` : "Consulta"}
                    descricao={consulta.assunto ?? undefined}
                    local={consulta.localOuLigacao}
                  />
                )}
              </div>
            </footer>
          )}
        </m.div>
      </div>
    </div>
  );
}
