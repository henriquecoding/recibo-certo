"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PEDIR UMA COISA AO CLIENTE
//  ---------------------------------------------------------------------
//  Três campos e um botão. A tentação era um formulário completo — anexos
//  de exemplo, lembretes automáticos, modelos guardados — e teria o efeito
//  contrário do pretendido: quem tem trinta segundos entre consultas volta
//  a escrever a frase no chat, e o pedido estruturado morre por ser mais
//  trabalhoso do que a coisa que veio substituir.
//
//  Só o título é obrigatório. O prazo é uma sugestão de datas próximas,
//  porque escolher «21 de agosto» num seletor de calendário demora mais do
//  que carregar em «uma semana».
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  ROTULO_PEDIDO, type TipoPedido,
} from "@/lib/contabilistas/sala/tipos";
import Button from "@/components/ui/Button";
import { Plus } from "@/components/ui/Icons";

const TIPOS: TipoPedido[] = ["documento", "resposta", "confirmacao", "dados", "agendamento"];

/** Prazos como uma pessoa os diz, não como um calendário os pede. */
const PRAZOS: { rotulo: string; dias: number | null }[] = [
  { rotulo: "Sem prazo", dias: null },
  { rotulo: "3 dias", dias: 3 },
  { rotulo: "1 semana", dias: 7 },
  { rotulo: "2 semanas", dias: 14 },
];

function dataDaqui(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const numero = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${numero}`;
}

export default function NovoPedido({
  ocupado = false,
  aoCriar,
}: {
  ocupado?: boolean;
  aoCriar: (p: {
    tipo: TipoPedido;
    titulo: string;
    descricao: string | null;
    prazo: string | null;
  }) => void | Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoPedido>("documento");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dias, setDias] = useState<number | null>(7);

  const valido = titulo.trim().length >= 3;

  function limpar() {
    setTitulo(""); setDescricao(""); setTipo("documento"); setDias(7); setAberto(false);
  }

  if (!aberto) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setAberto(true)} disabled={ocupado}>
        <Plus size={14} aria-hidden /> Pedir uma coisa
      </Button>
    );
  }

  return (
    <form
      className="space-y-3.5 rounded-3xl border border-stone-200 bg-white p-4 shadow-card sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valido || ocupado) return;
        void aoCriar({
          tipo,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          prazo: dias === null ? null : dataDaqui(dias),
        });
        limpar();
      }}
    >
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          O que precisas
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => setTipo(t)}
              className={`min-h-[36px] rounded-xl px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                tipo === t
                  ? "bg-brand text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {ROTULO_PEDIDO[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold text-stone-700">Título</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value.slice(0, 120))}
          placeholder="Comprovativo de retenções de julho"
          autoFocus
          className="mt-1.5 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-stone-700">
          Detalhe <span className="font-normal text-stone-400">(opcional)</span>
        </span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value.slice(0, 1000))}
          rows={2}
          placeholder="Onde encontrar, ou o que serve."
          className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Para quando
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRAZOS.map((p) => (
            <button
              key={p.rotulo}
              type="button"
              aria-pressed={dias === p.dias}
              onClick={() => setDias(p.dias)}
              className={`min-h-[36px] rounded-xl px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                dias === p.dias
                  ? "bg-brand text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!valido || ocupado}>
          Enviar pedido
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={limpar} disabled={ocupado}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
