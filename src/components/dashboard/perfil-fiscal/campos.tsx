"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Campos do perfil fiscal
//  ---------------------------------------------------------------------
//  O formulário anterior era uma parede de dezoito campos com o mesmo peso,
//  quase todos `<select>` cinzentos e `<input type="number">` a mostrar «0».
//  Um «0» num campo de despesas é indistinguível de «não respondi», e a
//  seta de incremento não serve para nada num valor que se escreve.
//
//  Aqui a diferença é semântica, não decorativa:
//   · uma escolha de três estados é um grupo de rádio visível, não um menu
//     onde a resposta fica escondida até se clicar;
//   · um valor em euros mostra o símbolo e aceita vazio como «não sei»,
//     que é uma resposta diferente de zero;
//   · uma contagem tem botões de −/+ com alvos de toque a sério.
// ═══════════════════════════════════════════════════════════════════════

import { useId, useState, type ReactNode } from "react";
import { Check, Minus, Plus } from "@/components/ui/Icons";
import InfoTip from "@/components/ui/InfoTip";
import type { TresEstados } from "@/lib/store/preferencias-fiscais";

export const CAMPO_BASE =
  "w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-[15px] text-stone-800 transition-colors " +
  "placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 " +
  "dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

/** Rótulo + ajuda + erro, partilhado por todos os campos. */
export function Rotulo({
  htmlFor, label, ajuda, children,
}: { htmlFor?: string; label: string; ajuda?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-stone-700 dark:text-stone-300"
      >
        {label}
        {ajuda ? <InfoTip>{ajuda}</InfoTip> : null}
      </label>
      {children}
    </div>
  );
}

const OPCOES: Array<{ valor: TresEstados; label: string }> = [
  { valor: "sim", label: "Sim" },
  { valor: "nao", label: "Não" },
  { valor: "nao-sei", label: "Não sei" },
];

/**
 * Sim / Não / Não sei como grupo de rádio.
 *
 * «Não sei» é uma resposta legítima e continua a ser o valor por omissão —
 * o que muda é deixar de estar escondida atrás de um menu fechado, e ficar
 * visualmente distinta das outras duas (é a ausência de resposta, não uma
 * terceira opção equivalente).
 */
export function EscolhaTresEstados({
  label, ajuda, valor, onChange,
}: {
  label: string;
  ajuda?: string;
  valor: TresEstados;
  onChange: (v: TresEstados) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <span id={id} className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-stone-700 dark:text-stone-300">
        {label}
        {ajuda ? <InfoTip>{ajuda}</InfoTip> : null}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="inline-flex w-full gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-700 dark:bg-stone-800/60"
      >
        {OPCOES.map((o) => {
          const ativo = valor === o.valor;
          const indefinido = o.valor === "nao-sei";
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.valor)}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ${
                ativo
                  ? indefinido
                    ? "bg-white text-stone-500 shadow-card dark:bg-stone-700 dark:text-stone-300"
                    : "bg-brand text-white shadow-card"
                  : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              {ativo && !indefinido ? <Check size={12} /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Valor em euros. Aceita vazio — e vazio quer dizer «não sei», que não é
 * zero. Grava no `blur` para não escrever a cada tecla.
 */
export function CampoMoeda({
  label, ajuda, valor, onGravar, placeholder = "Não sei",
}: {
  label: string;
  ajuda?: string;
  valor: number | null;
  onGravar: (v: number | null) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [rascunho, setRascunho] = useState(valor === null ? "" : String(valor));

  return (
    <Rotulo htmlFor={id} label={label} ajuda={ajuda}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-stone-400"
        >
          €
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={rascunho}
          placeholder={placeholder}
          onChange={(e) => setRascunho(e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={() => {
            const limpo = rascunho.trim().replace(",", ".");
            if (limpo === "") return onGravar(null);
            const n = Number(limpo);
            onGravar(Number.isFinite(n) && n >= 0 ? n : null);
          }}
          className={`${CAMPO_BASE} pl-8 tabular-nums`}
        />
      </div>
    </Rotulo>
  );
}

/** Contagem pequena (dependentes, ano do IRS Jovem) com alvos de toque. */
export function CampoContagem({
  label, ajuda, valor, onChange, max = 30, sufixo,
}: {
  label: string;
  ajuda?: string;
  valor: number;
  onChange: (v: number) => void;
  max?: number;
  sufixo?: string;
}) {
  const id = useId();
  const limitar = (n: number) => Math.max(0, Math.min(max, n));
  const botao =
    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-600 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-300";

  return (
    <Rotulo htmlFor={id} label={label} ajuda={ajuda}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(limitar(valor - 1))}
          disabled={valor <= 0}
          aria-label={`Diminuir ${label.toLowerCase()}`}
          className={botao}
        >
          <Minus size={15} />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={valor}
          onChange={(e) => onChange(limitar(Number(e.target.value.replace(/\D/g, "")) || 0))}
          className={`${CAMPO_BASE} h-10 py-0 text-center tabular-nums`}
        />
        <button
          type="button"
          onClick={() => onChange(limitar(valor + 1))}
          disabled={valor >= max}
          aria-label={`Aumentar ${label.toLowerCase()}`}
          className={botao}
        >
          <Plus size={15} />
        </button>
      </div>
      {sufixo ? <p className="mt-1 text-[11px] text-stone-400">{sufixo}</p> : null}
    </Rotulo>
  );
}

/** Interruptor com explicação — para os booleanos que abrem novas perguntas. */
export function Interruptor({
  label, descricao, ativo, onChange,
}: {
  label: string;
  descricao?: string;
  ativo: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={() => onChange(!ativo)}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        ativo
          ? "border-brand/40 bg-brand-light dark:bg-brand/10"
          : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/50"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          ativo ? "border-brand bg-brand text-white" : "border-stone-300 dark:border-stone-600"
        }`}
      >
        {ativo ? <Check size={12} /> : null}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${ativo ? "text-brand-dark dark:text-brand" : "text-stone-700 dark:text-stone-300"}`}>
          {label}
        </span>
        {descricao ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</span>
        ) : null}
      </span>
    </button>
  );
}
