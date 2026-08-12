"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Registar no painel um recibo JÁ EMITIDO.
//
//  Existia duas vezes, copiada — no `SimuladorIntegrado` e no `ModoGuiado` —
//  com o mesmo defeito nos dois sítios. Passa a ser uma só, e traz três
//  correções da auditoria:
//
//  · pede a DATA EFETIVA do documento (RC-P0-09). Carimbar a data de hoje
//    fazia um recibo de março inserido em agosto entrar no mês, trimestre e
//    ano errados, contaminando gráfico, acumulados, IVA, retenção, SS e IRS;
//  · só diz "registado" depois de a gravação confirmar (RC-P0-03);
//  · a copy não sugere emissão fiscal: o ReciboCerto regista, não emite
//    (RC-P2-02).
// ─────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Check, ArrowRight } from "@/components/ui/Icons";
import DatePicker from "@/components/ui/DatePicker";

/** O que a gravação responde a quem carregou no botão. */
export interface RespostaRegisto {
  ok: boolean;
  mensagem?: string;
}

export default function RegistarRecibo({
  onGuardar,
}: {
  onGuardar: (cliente: string, data: string) => Promise<RespostaRegisto>;
}) {
  const hojeIso = new Date().toISOString().slice(0, 10);
  const [aberto, setAberto] = useState(false);
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState(hojeIso);
  const [estado, setEstado] = useState<"inativo" | "a-guardar" | "guardado">("inativo");
  const [erro, setErro] = useState<string | null>(null);

  if (estado === "guardado") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand-light px-5 py-3 text-sm font-semibold text-brand-dark dark:border-brand/20 dark:bg-brand/10 dark:text-brand">
        <Check size={16} />
        Recibo registado no painel
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand bg-white px-5 py-3 text-sm font-semibold text-brand transition-all hover:bg-brand-light dark:bg-stone-900 dark:hover:bg-brand/10"
      >
        <ArrowRight size={14} />
        Registar recibo no painel
      </button>
    );
  }

  const campo =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 " +
    "focus:outline-none focus:ring-2 focus:ring-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

  return (
    <div className="space-y-3 rounded-2xl border border-brand/30 bg-brand-light/50 p-4 dark:border-brand/20 dark:bg-brand/5">
      <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        Guarda no painel um recibo que já emitiste no Portal das Finanças. O ReciboCerto organiza e calcula — não
        emite documentos fiscais nem submete declarações.
      </p>

      <div>
        <label htmlFor="registar-cliente" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
          Nome do cliente
        </label>
        <input
          id="registar-cliente"
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Ex: Empresa X"
          autoFocus
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="registar-data" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
          Data do recibo
        </label>
        <DatePicker
          id="registar-data"
          value={data}
          max={hojeIso}
          onChange={setData}
          ariaLabel="Data do recibo"
        />
        <p className="mt-1 text-[11px] text-stone-400">
          A data do documento, não a de hoje — é ela que define o mês, o trimestre e o ano fiscal.
        </p>
      </div>

      {erro && <p role="alert" className="text-xs font-medium text-alert-text">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!cliente.trim() || !data || estado === "a-guardar"}
          onClick={async () => {
            setEstado("a-guardar");
            setErro(null);
            const r = await onGuardar(cliente.trim(), data);
            if (r.ok) {
              setEstado("guardado");
            } else {
              setEstado("inativo");
              setErro(r.mensagem ?? "Não foi possível guardar.");
            }
          }}
          className="min-h-10 flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {estado === "a-guardar" ? "A guardar…" : "Registar"}
        </button>
        <button
          type="button"
          onClick={() => { setAberto(false); setCliente(""); setErro(null); }}
          className="min-h-10 rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-500 transition-all hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
