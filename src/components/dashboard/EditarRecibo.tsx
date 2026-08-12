"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Editar um recibo já registado.
//
//  O repositório tinha `atualizar` desde sempre, mas não havia por onde lhe
//  chamar (RC-P0-09): quem lançasse um recibo com a data errada — e a data
//  ERA sempre a de hoje, porque o formulário não a pedia — não tinha como a
//  corrigir. Um recibo no mês errado arrasta consigo o gráfico, o acumulado,
//  o IVA, a retenção, a SS e a estimativa de IRS.
//
//  A data efetiva e o cliente são o que se corrige; o valor e o enquadramento
//  fiscal vêm do simulador e mudá-los aqui seria refazer a simulação a meio.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { anoDoRecibo, type Recibo, type NovoRecibo } from "@/lib/recibos-contrato";
import type { Resultado } from "@/lib/store/persistencia";
import { fmt } from "@/lib/format";
import { Warning } from "@/components/ui/Icons";
import DatePicker from "@/components/ui/DatePicker";

export default function EditarRecibo({
  recibo,
  onGuardar,
  onFechar,
}: {
  recibo: Recibo;
  onGuardar: (id: string, patch: NovoRecibo) => Promise<Resultado<Recibo>>;
  onFechar: () => void;
}) {
  const [data, setData] = useState(recibo.data);
  const [cliente, setCliente] = useState(recibo.cliente);
  const [estado, setEstado] = useState<"inativo" | "a-guardar">("inativo");
  const [erro, setErro] = useState<string | null>(null);

  const mudaDeAno = anoDoRecibo({ data }) !== anoDoRecibo(recibo);

  const campo =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 " +
    "focus:outline-none focus:ring-2 focus:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editar-recibo-titulo"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div
        className="flex w-full max-w-sm flex-col rounded-t-4xl bg-white p-6 shadow-float sm:rounded-4xl dark:bg-stone-900"
        style={{ maxHeight: "90dvh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <h2 id="editar-recibo-titulo" className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          Editar recibo
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {fmt(recibo.valor)} · {recibo.atividade ?? "sem atividade indicada"}
        </p>

        <div className="mt-5 min-h-0 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="editar-data" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
              Data do recibo
            </label>
            <DatePicker id="editar-data" value={data} onChange={setData} ariaLabel="Data do recibo" />
            <p className="mt-1 text-[11px] text-stone-400">
              A data do documento define o mês, o trimestre e o ano fiscal deste recibo.
            </p>
          </div>

          <div>
            <label htmlFor="editar-cliente" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
              Cliente
            </label>
            <input
              id="editar-cliente"
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: Empresa X"
              className={campo}
            />
          </div>

          {/* Mudar de ano civil move o recibo de acumulado — vale um aviso. */}
          {mudaDeAno && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
              <span className="mt-0.5 flex-shrink-0"><Warning size={13} /></span>
              Ao mudares para {anoDoRecibo({ data })}, este recibo sai do acumulado de {anoDoRecibo(recibo)} e entra no
              de {anoDoRecibo({ data })}.
            </p>
          )}

          {erro && <p role="alert" className="text-xs font-medium text-alert-text">{erro}</p>}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={estado === "a-guardar" || !data}
            onClick={async () => {
              setEstado("a-guardar");
              setErro(null);
              const { id: _id, ...resto } = recibo;
              void _id;
              const r = await onGuardar(recibo.id, { ...resto, data, cliente });
              if (r.ok) onFechar();
              else { setEstado("inativo"); setErro(r.erro.mensagem); }
            }}
            className="min-h-10 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {estado === "a-guardar" ? "A guardar…" : "Guardar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
