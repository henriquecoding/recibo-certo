"use client";

import { Calendar, Clock, Check, Warning, ArrowRight } from "@/components/ui/Icons";
import { FizMarca } from "./FizLogo";

// ─────────────────────────────────────────────────────────────────────────
//  Cartão de obrigação/prazo vindo da FIZ.
//
//  Ponto 9.2 da arquitetura — a linguagem tem de distinguir:
//    · estimativa do Recibo Certo;
//    · estado RECEBIDO da FIZ  ← é este cartão;
//    · confirmação oficial;
//    · ação ainda necessária pelo utilizador.
//
//  Por isso o cartão declara sempre a origem e o momento da sincronização:
//  um estado desatualizado apresentado como atual é pior do que nenhum.
// ─────────────────────────────────────────────────────────────────────────

export type EstadoObrigacao =
  | "NOT_APPLICABLE" | "UPCOMING" | "DATA_REQUIRED" | "READY_FOR_REVIEW" | "ACTION_REQUIRED"
  | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "PAYMENT_DUE" | "COMPLETED" | "UNKNOWN";

const ROTULO: Record<EstadoObrigacao, string> = {
  NOT_APPLICABLE: "Não se aplica",
  UPCOMING: "A aproximar-se",
  DATA_REQUIRED: "Faltam dados",
  READY_FOR_REVIEW: "Pronta para revisão",
  ACTION_REQUIRED: "Precisa de ação tua",
  SUBMITTED: "Submetida",
  ACCEPTED: "Aceite",
  REJECTED: "Rejeitada",
  PAYMENT_DUE: "Pagamento pendente",
  COMPLETED: "Concluída",
  UNKNOWN: "Estado desconhecido",
};

const TOM: Record<EstadoObrigacao, string> = {
  NOT_APPLICABLE: "bg-stone-100 text-stone-500 dark:bg-stone-800",
  UPCOMING: "bg-fiz-100 text-fiz-800",
  DATA_REQUIRED: "bg-alert-bg text-alert-text",
  READY_FOR_REVIEW: "bg-fiz-100 text-fiz-800",
  ACTION_REQUIRED: "bg-clay-bg text-clay-text",
  SUBMITTED: "bg-brand-light text-brand-dark",
  ACCEPTED: "bg-brand-light text-brand-dark",
  REJECTED: "bg-clay-bg text-clay-text",
  PAYMENT_DUE: "bg-alert-bg text-alert-text",
  COMPLETED: "bg-brand-light text-brand-dark",
  UNKNOWN: "bg-stone-100 text-stone-500 dark:bg-stone-800",
};

function IconeEstado({ estado }: { estado: EstadoObrigacao }) {
  if (estado === "ACCEPTED" || estado === "COMPLETED" || estado === "SUBMITTED") return <Check size={12} />;
  if (estado === "ACTION_REQUIRED" || estado === "REJECTED" || estado === "PAYMENT_DUE") return <Warning size={12} />;
  return <Clock size={12} />;
}

interface FizObligationCardProps {
  titulo: string;
  periodo: string;
  estado: EstadoObrigacao;
  resumo?: string;
  prazo?: string | null;
  atualizadoEm: string;
  podeAbrirNaFiz?: boolean;
  aAbrir?: boolean;
  aoAbrir?: () => void;
}

export default function FizObligationCard({
  titulo,
  periodo,
  estado,
  resumo,
  prazo,
  atualizadoEm,
  podeAbrirNaFiz = false,
  aAbrir = false,
  aoAbrir,
}: FizObligationCardProps) {
  const dataPrazo = prazo
    ? new Date(prazo).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  const sincronizado = new Date(atualizadoEm).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="rounded-3xl border border-fiz-200 bg-white p-4 shadow-card dark:bg-stone-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{periodo}</p>
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${TOM[estado]}`}>
          <IconeEstado estado={estado} />
          {ROTULO[estado]}
        </span>
      </div>

      {resumo && <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{resumo}</p>}

      {dataPrazo && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
          <Calendar size={13} className="text-fiz-700" />
          Prazo: {dataPrazo}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <p className="text-[11px] text-stone-400">
          Estado recebido da <FizMarca size={11} className="align-baseline" /> · atualizado em {sincronizado}
        </p>
        {podeAbrirNaFiz && (
          <button
            type="button"
            onClick={aoAbrir}
            disabled={aAbrir}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-fiz px-3 py-1.5 text-xs font-semibold text-fiz-ink transition-all hover:brightness-95 disabled:opacity-60"
          >
            {aAbrir ? "A abrir…" : "Concluir na FIZ"}
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </article>
  );
}
