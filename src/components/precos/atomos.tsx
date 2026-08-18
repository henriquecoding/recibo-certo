"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Átomos do simulador de preço.
//  ---------------------------------------------------------------------
//  Não são componentes novos do design system — são composições dos que já
//  existem, com os rótulos e os alvos de toque que esta ferramenta precisa
//  de repetir dezenas de vezes. Viverem aqui evita que a mesma marcação
//  seja copiada em seis sítios e depois divirja em três.
//
//  Regras herdadas do `CLAUDE.md` e do `DESIGN.md` e que estes átomos
//  garantem por construção: alvos ≥ 36 px, foco visível, `tabular-nums`
//  nos números, e nenhuma cor que só exista no modo claro.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import InfoTip from "@/components/ui/InfoTip";

export function Campo({
  rotulo,
  ajuda,
  sufixo,
  children,
  htmlFor,
}: {
  rotulo: string;
  ajuda?: ReactNode;
  sufixo?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400"
      >
        {rotulo}
        {ajuda ? <InfoTip>{ajuda}</InfoTip> : null}
        {sufixo ? <span className="ml-auto text-[11px] font-normal text-stone-500 dark:text-stone-400">{sufixo}</span> : null}
      </label>
      {children}
    </div>
  );
}

const CLASSE_INPUT =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium tabular-nums text-stone-800 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

export function CampoEuros({
  id,
  rotulo,
  ajuda,
  valor,
  aoMudar,
  max = 1_000_000,
  passo,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  valor: number;
  aoMudar: (v: number) => void;
  max?: number;
  passo?: number;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
      <div className="relative">
        <LocalizedNumberInput
          id={id}
          value={valor}
          onValueChange={aoMudar}
          min={0}
          max={max}
          step={passo}
          inputMode="decimal"
          className={`${CLASSE_INPUT} pr-8`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
        >
          €
        </span>
      </div>
    </Campo>
  );
}

export function CampoPercentagem({
  id,
  rotulo,
  ajuda,
  /** Fração (0,35), não percentagem. A conversão vive aqui e só aqui. */
  valor,
  aoMudar,
  max = 95,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  valor: number;
  aoMudar: (fracao: number) => void;
  max?: number;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
      <div className="relative">
        <LocalizedNumberInput
          id={id}
          value={Math.round(valor * 1000) / 10}
          onValueChange={(v) => aoMudar(v / 100)}
          min={0}
          max={max}
          maxDecimals={1}
          inputMode="decimal"
          className={`${CLASSE_INPUT} pr-8`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
        >
          %
        </span>
      </div>
    </Campo>
  );
}

export function CampoNumero({
  id,
  rotulo,
  ajuda,
  valor,
  aoMudar,
  sufixo,
  max = 100_000,
  decimais = 0,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  valor: number;
  aoMudar: (v: number) => void;
  sufixo?: string;
  max?: number;
  decimais?: number;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
      <div className="relative">
        <LocalizedNumberInput
          id={id}
          value={valor}
          onValueChange={aoMudar}
          min={0}
          max={max}
          maxDecimals={decimais}
          inputMode="numeric"
          className={`${CLASSE_INPUT} ${sufixo ? "pr-12" : ""}`}
        />
        {sufixo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
          >
            {sufixo}
          </span>
        ) : null}
      </div>
    </Campo>
  );
}

/**
 * Grupo de opções mutuamente exclusivas. É um `radiogroup` a sério — com
 * setas do teclado — e não uma fila de botões que só parece um.
 */
export function Segmentado<T extends string>({
  rotulo,
  ajuda,
  opcoes,
  valor,
  aoMudar,
  colunas,
}: {
  rotulo?: string;
  ajuda?: ReactNode;
  opcoes: { valor: T; rotulo: string; sub?: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  colunas?: number;
}) {
  // Mapa explícito, não interpolação: o Tailwind analisa o ficheiro em
  // texto e `grid-cols-${n}` nunca chega ao CSS produzido.
  const GRELHAS: Record<number, string> = {
    2: "grid grid-cols-2 gap-2",
    3: "grid grid-cols-3 gap-2",
    4: "grid grid-cols-2 gap-2 sm:grid-cols-4",
  };
  const grelha = (colunas && GRELHAS[colunas]) || "flex flex-wrap gap-2";

  return (
    <div className="min-w-0">
      {rotulo ? (
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400">
          {rotulo}
          {ajuda ? <InfoTip>{ajuda}</InfoTip> : null}
        </span>
      ) : null}
      <div role="radiogroup" aria-label={rotulo} className={grelha}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(o.valor)}
              className={`min-h-[38px] flex-1 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                ativo
                  ? "border-brand-dark bg-brand-dark text-white shadow-glow"
                  : "border-stone-200 bg-white text-stone-600 hover:border-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
              }`}
            >
              <span className="block">{o.rotulo}</span>
              {o.sub ? (
                <span className={`mt-0.5 block text-[10px] font-normal ${ativo ? "text-brand-light" : "text-stone-500 dark:text-stone-400"}`}>
                  {o.sub}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Seletor<T extends string>({
  id,
  rotulo,
  ajuda,
  opcoes,
  valor,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value as T)}
        className={`${CLASSE_INPUT} cursor-pointer appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a8a29e' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
        }}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/** Secção dobrável do modo preciso. */
export function Bloco({
  titulo,
  descricao,
  aberto,
  alternar,
  children,
}: {
  titulo: string;
  descricao?: string;
  aberto: boolean;
  alternar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-stone-800/50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</span>
          {descricao ? (
            <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{descricao}</span>
          ) : null}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`flex-shrink-0 text-stone-500 dark:text-stone-400 transition-transform ${aberto ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {aberto ? <div className="border-t border-stone-100 p-4 dark:border-stone-800">{children}</div> : null}
    </div>
  );
}
