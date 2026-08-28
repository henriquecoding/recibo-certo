"use client";

// ═══════════════════════════════════════════════════════════════════════
//  CONFIRMAR — a pergunta antes do que não se desfaz
//  ---------------------------------------------------------------------
//  A plataforma tem ações que fecham portas: terminar um acompanhamento,
//  revogar uma partilha, recusar um cliente, marcar uma consulta como
//  realizada (que CARIMBA o cartão e não se descarimba). Nenhuma delas
//  perguntava nada — um toque numa lista, num telemóvel, e estava feito.
//
//  O que isto entrega, e que um `window.confirm` não entrega:
//
//   · a CONSEQUÊNCIA escrita antes do gesto, na língua do produto;
//   · o foco a começar em «Cancelar», nunca no botão que destrói;
//   · o teclado preso dentro do diálogo enquanto ele estiver aberto;
//   · uma folha inferior no telemóvel, onde o polegar já está.
//
//  Coordena-se com os outros overlays: é `aria-modal`, e a invariante do
//  produto é que nunca há dois. Ver `overlays/CoordenadorOverlays.tsx`.
// ═══════════════════════════════════════════════════════════════════════

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { useOverlay, useOverlayAtivo } from "@/components/overlays/CoordenadorOverlays";
import { Warning } from "@/components/ui/Icons";

export interface PedidoConfirmacao {
  titulo: string;
  /** O que acontece se a pessoa continuar. Uma ou duas frases. */
  descricao?: string;
  /** Consequências concretas, uma por linha. Só as que são verdade. */
  consequencias?: string[];
  /** Texto do botão que continua. Diz o VERBO, não «OK». */
  confirmar?: string;
  cancelar?: string;
  /** `perigo` para o que fecha portas; `normal` para o resto. */
  tom?: "perigo" | "normal";
}

type Responder = (resposta: boolean) => void;

const ContextoConfirmar = createContext<((p: PedidoConfirmacao) => Promise<boolean>) | null>(null);

export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const responderRef = useRef<Responder | null>(null);

  const responder = useCallback((resposta: boolean) => {
    responderRef.current?.(resposta);
    responderRef.current = null;
    setPedido(null);
  }, []);

  const confirmar = useCallback((p: PedidoConfirmacao) => {
    // Um pedido novo com outro por responder seria um diálogo a substituir
    // outro sem ninguém ter respondido ao primeiro. O anterior cancela —
    // «não fiz nada» é a resposta segura.
    responderRef.current?.(false);
    setPedido(p);
    return new Promise<boolean>((resolve) => { responderRef.current = resolve; });
  }, []);

  const permitido = useOverlay("confirmacao", pedido !== null, {
    modal: true,
    iniciadoPeloUtilizador: true,
  });
  const ativo = useOverlayAtivo();

  // Se a vaga for de outro overlay (só o consentimento de cookies tem
  // prioridade acima desta), o diálogo não abre — e uma promessa que
  // ninguém resolve deixava a ação destrutiva em suspenso para sempre.
  // `ativo === null` não é recusa: é a vaga ainda por conceder, um render
  // depois do pedido.
  useEffect(() => {
    if (!pedido || permitido) return;
    if (ativo !== null && ativo !== "confirmacao") responder(false);
  }, [pedido, permitido, ativo, responder]);

  return (
    <ContextoConfirmar.Provider value={confirmar}>
      {children}
      {pedido && permitido && <Dialogo pedido={pedido} onResponder={responder} />}
    </ContextoConfirmar.Provider>
  );
}

/**
 * Fora de um `ConfirmacaoProvider` a resposta é «sim».
 *
 * A alternativa — devolver «não» — parecia mais segura e é pior: um ecrã
 * montado isoladamente ficava com todos os botões inertes, sem erro nenhum
 * a dizer porquê. O provider vive na raiz da app; quem está fora dele está
 * num teste ou numa página solta, onde o comportamento a preservar é o da
 * ação, não o da pergunta.
 */
export function useConfirmar(): (p: PedidoConfirmacao) => Promise<boolean> {
  const ctx = useContext(ContextoConfirmar);
  return useMemo(() => ctx ?? (() => Promise.resolve(true)), [ctx]);
}

// ── Desenho ────────────────────────────────────────────────────────────

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Dialogo({
  pedido, onResponder,
}: { pedido: PedidoConfirmacao; onResponder: Responder }) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const perigo = pedido.tom === "perigo";

  // O foco começa em «Cancelar» e volta a quem o tinha. Um diálogo que
  // abre com o foco no botão destrutivo transforma um «Enter» distraído
  // numa ação irreversível.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => cancelarRef.current?.focus(), 60);
    return () => {
      clearTimeout(t);
      if (anterior && typeof anterior.focus === "function") anterior.focus();
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onResponder(false); return; }
      if (e.key !== "Tab" || !caixaRef.current) return;

      // Enquanto isto está aberto, o Tab não sai daqui.
      const focaveis = Array.from(caixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (e.shiftKey && (atual === primeiro || !caixaRef.current.contains(atual))) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onResponder]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      aria-describedby={pedido.descricao ? "confirmar-descricao" : undefined}
      className="fixed inset-0 z-[9200]"
    >
      <div
        onClick={() => onResponder(false)}
        className="rc-overlay-entrada absolute inset-0 bg-ink/45 backdrop-blur-sm"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div
          ref={caixaRef}
          className="rc-dialogo-entrada pointer-events-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-4xl border border-stone-200/80 bg-white shadow-float sm:rounded-4xl"
        >
          {/* Puxador da folha inferior — só telemóvel. */}
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 sm:hidden" aria-hidden />

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 pt-4 sm:pt-6">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  perigo ? "bg-clay-bg text-clay-text" : "bg-brand-light text-brand-dark"
                }`}
              >
                <Warning size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="confirmar-titulo" className="font-display text-xl leading-snug text-ink">
                  {pedido.titulo}
                </h2>
                {pedido.descricao && (
                  <p id="confirmar-descricao" className="mt-1.5 text-sm leading-relaxed text-stone-600">
                    {pedido.descricao}
                  </p>
                )}
              </div>
            </div>

            {pedido.consequencias && pedido.consequencias.length > 0 && (
              <ul className="mt-4 space-y-2 rounded-2xl bg-cream px-4 py-3.5">
                {pedido.consequencias.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-600">
                    <span className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${perigo ? "bg-clay" : "bg-brand"}`} aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2.5 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-end">
            <button
              ref={cancelarRef}
              type="button"
              onClick={() => onResponder(false)}
              className="min-h-[2.75rem] rounded-2xl border border-stone-200 px-5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50"
            >
              {pedido.cancelar ?? "Cancelar"}
            </button>
            <button
              type="button"
              onClick={() => onResponder(true)}
              className={`min-h-[2.75rem] rounded-2xl px-5 text-sm font-semibold text-white transition-all active:scale-[0.98] ${
                perigo ? "bg-clay hover:bg-clay-text" : "btn-shine bg-brand shadow-glow hover:bg-brand-dark"
              }`}
            >
              {pedido.confirmar ?? "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
