"use client";

// Editor de operações de mais-valias (detalhe por ativo): para ações/ETF/fundos
// e para criptoativos. Cada operação tem compra, venda, comissões e datas; o
// componente mostra o resultado (mais/menos-valia), o período de detenção e a
// classificação curto/longo prazo (relevante para a tributação).

import { diasDetencao, operacaoVazia, type OperacaoAtivo } from "@/lib/irs-guiado";
import { MAIS_VALIAS_DETENCAO_DIAS } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { Plus, Trash, ArrowRight } from "@/components/ui/Icons";
import { campoCls } from "@/components/simulador/ui";

const LIMITE = MAIS_VALIAS_DETENCAO_DIAS.value;

export default function EditorOperacoes({
  ops,
  setOps,
  tipo,
}: {
  ops: OperacaoAtivo[];
  setOps: (ops: OperacaoAtivo[]) => void;
  tipo: "mobiliario" | "cripto";
}) {
  const atualizar = (id: string, campo: keyof OperacaoAtivo, valor: string) =>
    setOps(
      ops.map((o) =>
        o.id === id
          ? { ...o, [campo]: campo === "descricao" || campo === "dataAquisicao" || campo === "dataVenda" ? valor : parseFloat(valor.replace(",", ".")) || 0 }
          : o
      )
    );
  const remover = (id: string) => setOps(ops.filter((o) => o.id !== id));
  const adicionar = () => setOps([...ops, operacaoVazia()]);

  return (
    <div className="space-y-3">
      {ops.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-xs text-stone-400 dark:border-stone-700 dark:bg-stone-800/40">
          Sem operações. Adiciona cada {tipo === "cripto" ? "venda de criptoativos" : "venda de ações, ETF ou fundos"} para calcularmos o saldo e o período de detenção.
        </p>
      )}

      {ops.map((o, i) => {
        const resultado = (o.valorVenda || 0) - (o.valorAquisicao || 0) - (o.comissoes || 0);
        const dias = diasDetencao(o.dataAquisicao, o.dataVenda);
        const longo = dias !== null && dias >= LIMITE;
        const isento = tipo === "cripto" && longo;
        return (
          <div key={o.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/40">
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                value={o.descricao}
                onChange={(e) => atualizar(o.id, "descricao", e.target.value)}
                placeholder={`Operação ${i + 1}${tipo === "cripto" ? " (ex.: BTC)" : " (ex.: ações XPTO)"}`}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none dark:text-stone-200"
              />
              <button type="button" onClick={() => remover(o.id)} aria-label="Remover operação" className="flex-shrink-0 text-stone-400 transition-colors hover:text-red-500">
                <Trash size={15} />
              </button>
            </div>

            <div className={`grid grid-cols-2 gap-2 ${tipo === "cripto" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              <CampoOp label="Valor de compra (€)" value={o.valorAquisicao} onChange={(v) => atualizar(o.id, "valorAquisicao", v)} />
              <CampoOp label="Valor de venda (€)" value={o.valorVenda} onChange={(v) => atualizar(o.id, "valorVenda", v)} />
              {tipo === "mobiliario" && <CampoOp label="Comissões (€)" value={o.comissoes} onChange={(v) => atualizar(o.id, "comissoes", v)} />}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <CampoData label="Data de aquisição" value={o.dataAquisicao} onChange={(v) => atualizar(o.id, "dataAquisicao", v)} />
              <CampoData label="Data de venda" value={o.dataVenda} onChange={(v) => atualizar(o.id, "dataVenda", v)} />
            </div>

            {/* Linha temporal + resultado */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className={`font-semibold tabular-nums ${resultado >= 0 ? "text-brand-dark dark:text-brand" : "text-alert-text"}`}>
                {resultado >= 0 ? "Mais-valia" : "Menos-valia"}: {fmt(Math.abs(resultado))}
              </span>
              {dias !== null && (
                <span className="inline-flex items-center gap-1 text-stone-400">
                  <ArrowRight size={11} />
                  {dias} dias
                  <span className={`ml-1 rounded px-1.5 py-0.5 font-medium ${isento ? "bg-brand-light text-brand-dark" : longo ? "bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-300" : "bg-alert-bg text-alert-text"}`}>
                    {isento ? "isento (≥ 365 d)" : longo ? "longo prazo" : "curto prazo (< 365 d)"}
                  </span>
                </span>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={adicionar}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-600 dark:text-stone-400"
      >
        <Plus size={13} /> Adicionar operação
      </button>
    </div>
  );
}

function CampoOp({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</label>
      <input type="number" inputMode="decimal" min={0} step={50} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="0" className={campoCls} />
    </div>
  );
}

function CampoData({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={campoCls} />
    </div>
  );
}
