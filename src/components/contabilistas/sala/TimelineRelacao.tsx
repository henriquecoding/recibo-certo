"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A LINHA DO TEMPO DA RELAÇÃO
//  ---------------------------------------------------------------------
//  Sete tipos de acontecimento numa lista só. A alternativa — sete
//  separadores — obriga quem pergunta «como vai isto?» a abrir os sete e a
//  cruzá-los de cabeça, que é trabalho que o produto devia estar a fazer.
//
//  Cada evento tem um ponto colorido e uma linha que os liga. A linha é
//  `aria-hidden`: para quem lê com os olhos é o que transforma sete
//  cartões numa história; para um leitor de ecrã é uma lista ordenada, que
//  é o que ela é.
// ═══════════════════════════════════════════════════════════════════════

import type { EventoTimeline, TipoEvento } from "@/lib/contabilistas/sala/tipos";
import { ROTULO_ESTADO_PEDIDO, type EstadoPedido } from "@/lib/contabilistas/sala/tipos";
import Button from "@/components/ui/Button";
import { Calendar, Check, Clock, Gift, PaperClip, Receipt, Wallet } from "@/components/ui/Icons";

const PONTO: Record<TipoEvento, string> = {
  mensagem: "bg-stone-300",
  pedido: "bg-brand",
  partilha: "bg-brand-dark",
  consulta: "bg-stone-400",
  fidelidade: "bg-alert",
  pagamento: "bg-clay",
  vinculo: "bg-stone-300",
};

function Icone({ tipo }: { tipo: TipoEvento }) {
  const p = { size: 14, "aria-hidden": true, className: "text-stone-400" } as const;
  switch (tipo) {
    case "consulta": return <Calendar {...p} />;
    case "pedido": return <Check {...p} />;
    case "partilha": return <PaperClip {...p} />;
    case "fidelidade": return <Gift {...p} />;
    case "pagamento": return <Wallet {...p} />;
    case "vinculo": return <Receipt {...p} />;
    default: return <Clock {...p} />;
  }
}

/**
 * O título de cada linha, do ponto de vista de quem lê.
 *
 * «Enviaste» e «A Inês enviou» são o mesmo facto contado de dois lados, e
 * contar sempre do mesmo lado obrigava metade das pessoas a traduzir.
 */
function titular(e: EventoTimeline, meuId: string, nomeDoOutro: string): string {
  const meu = e.autorId === meuId;
  const quem = meu ? "Tu" : nomeDoOutro;

  switch (e.tipo) {
    case "mensagem":
      return `${quem} ${meu ? "escreveste" : "escreveu"}`;
    case "pedido":
      return `${quem} ${meu ? "pediste" : "pediu"} uma coisa`;
    case "partilha":
      return `${quem} ${meu ? "partilhaste" : "partilhou"} uma simulação`;
    case "consulta":
      return "Consulta";
    case "fidelidade":
      return "Cupão de fidelidade";
    case "pagamento":
      return "Pagamento";
    case "vinculo":
      return "O acompanhamento começou";
  }
}

const ESTADO_CONSULTA: Record<string, string> = {
  pedido: "Por confirmar",
  confirmado: "Confirmada",
  realizada: "Realizada",
  cancelado_cliente: "Cancelada pelo cliente",
  cancelado_contabilista: "Cancelada",
  nao_compareceu: "Não compareceu",
};

const ESTADO_PAGAMENTO: Record<string, string> = {
  pendente: "Por pagar",
  pago: "Pago",
  falhado: "Falhou",
  reembolsado: "Reembolsado",
  cancelado: "Cancelado",
  expirado: "Expirou",
};

function legenda(e: EventoTimeline): string | null {
  if (e.tipo === "consulta" && e.estado) {
    const quando = e.meta.inicio as string | undefined;
    const estado = ESTADO_CONSULTA[e.estado] ?? e.estado;
    if (!quando) return estado;
    const d = new Intl.DateTimeFormat("pt-PT", {
      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    }).format(new Date(quando));
    return `${estado} · ${d}`;
  }
  if (e.tipo === "pedido" && e.estado) {
    return ROTULO_ESTADO_PEDIDO[e.estado as EstadoPedido] ?? e.estado;
  }
  if (e.tipo === "pagamento" && e.estado) {
    const cents = e.meta.liquidoCents as number | undefined;
    const estado = ESTADO_PAGAMENTO[e.estado] ?? e.estado;
    if (typeof cents !== "number") return estado;
    return `${estado} · ${(cents / 100).toFixed(2).replace(".", ",")} €`;
  }
  if (e.tipo === "fidelidade") {
    const pct = e.meta.percentagem as number | undefined;
    return pct ? `${pct}% de desconto` : null;
  }
  if (e.tipo === "mensagem") {
    const n = e.meta.anexos as number | undefined;
    if (n && n > 0) return n === 1 ? "com 1 ficheiro" : `com ${n} ficheiros`;
  }
  return null;
}

function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(d);
  if (mesmoDia) return `Hoje · ${hora}`;

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return `Ontem · ${hora}`;

  const data = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(d);
  return `${data} · ${hora}`;
}

export default function TimelineRelacao({
  eventos,
  meuId,
  nomeDoOutro,
  haMais = false,
  aCarregar = false,
  aoCarregarMais,
}: {
  eventos: EventoTimeline[];
  meuId: string;
  nomeDoOutro: string;
  haMais?: boolean;
  aCarregar?: boolean;
  aoCarregarMais?: () => void;
}) {
  if (eventos.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm leading-relaxed text-stone-500">
        Ainda não aconteceu nada nesta relação.
        <span className="mt-1 block text-stone-400">
          O que fizerem os dois aparece aqui, por ordem.
        </span>
      </p>
    );
  }

  return (
    <div>
      <ol className="relative space-y-4">
        {/* O fio que liga os pontos. Decorativo — a ordem já está na lista. */}
        <span
          aria-hidden
          className="absolute bottom-3 left-[5px] top-3 w-px bg-stone-200"
        />

        {eventos.map((e) => {
          const nota = legenda(e);
          return (
            <li key={`${e.tipo}-${e.referenciaId}`} className="relative pl-6">
              <span
                aria-hidden
                className={`absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full ring-4 ring-cream ${PONTO[e.tipo]}`}
              />

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                  <Icone tipo={e.tipo} />
                  {titular(e, meuId, nomeDoOutro)}
                </p>
                <time dateTime={e.quando} className="text-xs tabular-nums text-stone-400">
                  {quando(e.quando)}
                </time>
              </div>

              {e.titulo && e.tipo !== "consulta" && (
                <p className="mt-0.5 text-sm font-medium text-stone-700">{e.titulo}</p>
              )}

              {e.corpo && (
                <p className="mt-1 line-clamp-3 rounded-2xl bg-white px-3.5 py-2 text-sm leading-relaxed text-stone-600">
                  {e.corpo}
                </p>
              )}

              {nota && <p className="mt-1 text-xs text-stone-500">{nota}</p>}
            </li>
          );
        })}
      </ol>

      {haMais && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" size="sm" disabled={aCarregar} onClick={aoCarregarMais}>
            {aCarregar ? "A carregar…" : "Ver o que veio antes"}
          </Button>
        </div>
      )}
    </div>
  );
}
