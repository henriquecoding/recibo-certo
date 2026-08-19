"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CARTÃO DE UM PEDIDO
//  ---------------------------------------------------------------------
//  O mesmo componente para os dois lados da relação, com `papel` a decidir
//  quem vê que botões. Ter dois componentes era garantir que um deles
//  ficava para trás na primeira alteração — e o pedido é a peça onde as
//  duas pessoas TÊM de estar a ver a mesma coisa, senão o produto mente a
//  uma delas.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import type { Papel } from "@/lib/contabilistas/sala/proximo-passo";
import { descreverPrazo } from "@/lib/contabilistas/sala/proximo-passo";
import {
  ACCAO_DO_PEDIDO, diasAtePrazo, ROTULO_ESTADO_PEDIDO, ROTULO_PEDIDO,
  type PedidoCliente,
} from "@/lib/contabilistas/sala/tipos";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Check, Clock, PaperClip, Warning } from "@/components/ui/Icons";

export default function CartaoPedido({
  id,
  pedido,
  papel,
  ocupado = false,
  agora = new Date(),
  aoResponder,
  aoDecidir,
  aoJuntarFicheiro,
}: {
  id?: string;
  pedido: PedidoCliente;
  papel: Papel;
  ocupado?: boolean;
  agora?: Date;
  aoResponder?: (texto: string) => void;
  aoDecidir?: (decisao: "concluir" | "analisar" | "reabrir" | "cancelar") => void;
  aoJuntarFicheiro?: () => void;
}) {
  const [aResponder, setAResponder] = useState(false);
  const [texto, setTexto] = useState("");

  const dias = pedido.prazo ? diasAtePrazo(pedido.prazo, agora) : null;
  const atrasado = dias !== null && dias < 0 && pedido.estado === "aberto";
  const fechado = pedido.estado === "concluido" || pedido.estado === "cancelado";

  // O aviso aparece enquanto se escreve, e não ao submeter. A recusa a
  // chegar do servidor depois de carregar em enviar é uma parede; a mesma
  // regra dita a tempo é uma explicação.

  return (
    <li
      id={id}
      className={`rounded-3xl border p-4 transition-colors sm:p-5 ${
        atrasado
          ? "border-alert-border bg-alert-bg"
          : fechado
            ? "border-stone-200 bg-cream"
            : "border-stone-200 bg-white shadow-card"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            {ROTULO_PEDIDO[pedido.tipo]}
            {!pedido.obrigatorio && <span className="normal-case font-normal">· opcional</span>}
          </p>
          <h3 className={`mt-1 font-semibold leading-snug ${fechado ? "text-stone-500" : "text-stone-800"}`}>
            {pedido.titulo}
          </h3>
          {pedido.descricao && (
            <p className="mt-1 text-sm leading-relaxed text-stone-600">{pedido.descricao}</p>
          )}
        </div>

        <Badge
          tone={
            pedido.estado === "concluido" ? "brand"
              : atrasado ? "alert"
              : pedido.estado === "cancelado" ? "neutral"
              : pedido.estado === "respondido" ? "brand" : "neutral"
          }
        >
          {ROTULO_ESTADO_PEDIDO[pedido.estado]}
        </Badge>
      </div>

      {pedido.prazo && !fechado && (
        <p
          className={`mt-2.5 flex items-center gap-1.5 text-sm ${
            atrasado ? "font-semibold text-alert-text" : "text-stone-500"
          }`}
        >
          {atrasado ? <Warning size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
          {descreverPrazo(dias, pedido.obrigatorio)}
        </p>
      )}

      {pedido.respostaTexto && (
        <p className="mt-3 rounded-2xl bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-stone-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
            Resposta
          </span>
          {pedido.respostaTexto}
        </p>
      )}

      {/* ── O lado do cliente: responder ─────────────────────────── */}
      {papel === "cliente" && !fechado && (
        <div className="mt-3.5">
          {aResponder ? (
            <div className="space-y-2.5">
              <label className="block">
                <span className="sr-only">A tua resposta a «{pedido.titulo}»</span>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value.slice(0, 2000))}
                  rows={3}
                  autoFocus
                  placeholder="Escreve a tua resposta."
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={ocupado || !texto.trim()}
                  onClick={() => { aoResponder?.(texto); setTexto(""); setAResponder(false); }}
                >
                  Enviar resposta
                </Button>
                {aoJuntarFicheiro && (
                  <Button size="sm" variant="secondary" disabled={ocupado} onClick={aoJuntarFicheiro}>
                    <PaperClip size={14} aria-hidden /> Juntar ficheiro
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => setAResponder(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" disabled={ocupado} onClick={() => setAResponder(true)}>
              {pedido.estado === "aberto"
                ? ACCAO_DO_PEDIDO[pedido.tipo]
                : "Acrescentar à resposta"}
            </Button>
          )}
        </div>
      )}

      {/* ── O lado do contabilista: fechar ───────────────────────── */}
      {papel === "contabilista" && !fechado && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button size="sm" disabled={ocupado} onClick={() => aoDecidir?.("concluir")}>
            <Check size={14} aria-hidden /> Dar por tratado
          </Button>
          {pedido.estado === "respondido" && (
            <Button size="sm" variant="secondary" disabled={ocupado} onClick={() => aoDecidir?.("analisar")}>
              Estou a ver
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => aoDecidir?.("cancelar")}>
            Já não é preciso
          </Button>
        </div>
      )}

      {papel === "contabilista" && pedido.estado === "concluido" && (
        <div className="mt-3.5">
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => aoDecidir?.("reabrir")}>
            Reabrir
          </Button>
        </div>
      )}
    </li>
  );
}
