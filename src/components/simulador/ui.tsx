"use client";

import { useState, type ReactNode } from "react";
import InfoTip from "@/components/ui/InfoTip";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { Check, Warning, ArrowRight, ChevronDown, Info } from "@/components/ui/Icons";
import type { NivelValidacao } from "@/lib/irs-guiado";

// Classes partilhadas (coerentes com o resto do painel).
export const campoCls =
  "w-full px-3.5 py-2.5 text-[16px] text-stone-800 bg-stone-50 rounded-xl border border-stone-200 " +
  "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all " +
  "dark:bg-stone-800/50 dark:text-stone-100 dark:border-stone-700";

export const rotuloCls =
  "text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400";

// ─── Cabeçalho de secção (editorial: eyebrow + título + descrição) ──────────
export function SeccaoTitulo({
  eyebrow,
  titulo,
  descricao,
  acao,
}: {
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1 text-brand">{eyebrow}</div>}
        <h2 className="font-display text-xl font-semibold leading-tight text-stone-800 dark:text-stone-100">{titulo}</h2>
        {descricao && <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</p>}
      </div>
      {acao && <div className="flex-shrink-0">{acao}</div>}
    </div>
  );
}

// ─── Campo numérico (com adorno de moeda) ───────────────────────────────────
export function Campo({
  id,
  label,
  value,
  onChange,
  step = 100,
  placeholder = "0",
  tooltip,
  moeda = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  placeholder?: string;
  tooltip?: ReactNode;
  moeda?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={id} className={rotuloCls}>
          {label}
        </label>
        {tooltip && <InfoTip>{tooltip}</InfoTip>}
      </div>
      <div className="relative">
        {moeda && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-stone-400" aria-hidden>
            €
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${campoCls} tabular-nums ${moeda ? "pl-8" : ""}`}
        />
      </div>
    </div>
  );
}

// ─── Cartões de opção (seleção única) com painel explicativo reativo ────────
export interface OpcaoSeletor<T> {
  id: T;
  label: string;
  sub?: string;
  /** Descrição mostrada no painel quando a opção está selecionada. */
  descricao?: string;
  /** Pontos (checklist) mostrados no painel da opção selecionada. */
  pontos?: string[];
}

export function SeletorCartoes<T extends string | boolean>({
  label,
  tooltip,
  opcoes,
  valor,
  onChange,
  colunas,
}: {
  label?: string;
  tooltip?: ReactNode;
  opcoes: OpcaoSeletor<T>[];
  valor: T;
  onChange: (v: T) => void;
  colunas?: number;
}) {
  const cols = colunas ?? opcoes.length;
  const gridCls =
    cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2";
  const selecionada = opcoes.find((o) => o.id === valor);
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={rotuloCls}>{label}</span>
          {tooltip && <InfoTip>{tooltip}</InfoTip>}
        </div>
      )}
      <div className={`grid gap-2 ${gridCls}`}>
        {opcoes.map((o) => {
          const active = valor === o.id;
          return (
            <button
              key={String(o.id)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.id)}
              className={`rounded-2xl border p-3 text-center transition-all ${
                active
                  ? "border-brand bg-brand-light shadow-[0_0_0_1px_rgba(29,158,117,0.25)]"
                  : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white dark:border-stone-700 dark:bg-stone-800/40"
              }`}
            >
              <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>
                {o.label}
              </div>
              {o.sub && <div className={`mt-0.5 text-xs ${active ? "text-brand" : "text-stone-400"}`}>{o.sub}</div>}
            </button>
          );
        })}
      </div>
      {selecionada && (selecionada.descricao || selecionada.pontos?.length) && (
        <PainelDetalhe titulo={selecionada.label} descricao={selecionada.descricao} pontos={selecionada.pontos} />
      )}
    </div>
  );
}

// ─── Painel de detalhe da opção selecionada (estilo "TAXA NORMAL") ──────────
export function PainelDetalhe({ titulo, descricao, pontos }: { titulo: string; descricao?: string; pontos?: string[] }) {
  return (
    <div className="mt-2 rounded-2xl border border-stone-100 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-800/40">
      <div className="eyebrow mb-1.5 text-stone-400">{titulo}</div>
      {descricao && <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{descricao}</p>}
      {pontos && pontos.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {pontos.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              <Check size={12} className="mt-0.5 flex-shrink-0 text-brand" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Cartão de situação contextual (estilo "SITUAÇÃO DE IVA") ────────────────
export function CartaoSituacao({
  eyebrow,
  nivel = "info",
  titulo,
  info,
  children,
}: {
  eyebrow?: string;
  nivel?: "info" | "aviso" | "brand";
  titulo: ReactNode;
  info?: ReactNode;
  children?: ReactNode;
}) {
  const estilos = {
    info: { box: "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50", icon: <Info size={15} className="text-stone-400" />, titulo: "text-stone-700 dark:text-stone-200" },
    aviso: { box: "border-alert-border bg-alert-bg", icon: <Warning size={15} className="text-alert-text" />, titulo: "text-alert-text" },
    brand: { box: "border-brand/25 bg-brand-light/60", icon: <Check size={15} className="text-brand" />, titulo: "text-brand-dark" },
  }[nivel];
  return (
    <div>
      {eyebrow && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className={rotuloCls}>{eyebrow}</span>
          {info && <InfoTip>{info}</InfoTip>}
        </div>
      )}
      <div className={`rounded-2xl border p-4 ${estilos.box}`}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex-shrink-0">{estilos.icon}</span>
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-semibold ${estilos.titulo}`}>{titulo}</div>
            <div className="mt-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Caixa de verificação grande ────────────────────────────────────────────
export function Checkbox({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
        checked ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white dark:border-stone-700 dark:bg-stone-800/40"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          checked ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent dark:border-stone-600"
        }`}
      >
        <Check size={12} />
      </span>
      <div>
        <div className={`text-sm font-semibold ${checked ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{label}</div>
        {sub && <div className={`mt-0.5 text-xs leading-relaxed ${checked ? "text-brand" : "text-stone-400 dark:text-stone-500"}`}>{sub}</div>}
      </div>
    </button>
  );
}

// ─── Interruptor (toggle) com rótulo ────────────────────────────────────────
export function Interruptor({
  on,
  onChange,
  label,
  tooltip,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  tooltip?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-2.5 rounded-2xl border p-3 text-left transition-all ${
        on ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
      }`}
    >
      <span className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
      </span>
      <span className={`text-sm font-medium ${on ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{label}</span>
      {tooltip && <span onClick={(e) => e.stopPropagation()}><InfoTip>{tooltip}</InfoTip></span>}
    </button>
  );
}

// ─── Chip de correspondência fiscal (anexo) ─────────────────────────────────
export function AnexoChip({ anexo, nome, explicacao }: { anexo: string; nome: string; explicacao: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      <span className="font-semibold text-brand-dark dark:text-brand">{anexo}</span>
      <span aria-hidden>·</span>
      <span>{nome}</span>
      <InfoTip label={`O que é o ${anexo}`}>{explicacao}</InfoTip>
    </span>
  );
}

// ─── Painel educativo expansível ("Saber mais") ─────────────────────────────
export function Explicador({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100 bg-stone-50/70 dark:border-stone-700 dark:bg-stone-800/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Info size={15} className="flex-shrink-0 text-brand" />
        <span className="flex-1 text-xs font-semibold text-stone-600 dark:text-stone-300">{titulo}</span>
        <ChevronDown size={15} className={`flex-shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-3.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{children}</div>}
    </div>
  );
}

// ─── Linha de resultado (rótulo / valor) ────────────────────────────────────
export function Linha({
  label,
  value,
  note,
  sinal,
  forte = false,
}: {
  label: string;
  value: number;
  note?: string;
  sinal?: "+" | "−";
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200/60 py-1.5 last:border-0 dark:border-stone-700/60">
      <div>
        <span className={`text-sm ${forte ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-600 dark:text-stone-400"}`}>{label}</span>
        {note && <div className="text-[11px] text-stone-400">{note}</div>}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${forte ? "text-brand" : "text-stone-700 dark:text-stone-300"}`}>
        {sinal && `${sinal} `}
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}

// ─── Cartão de validação (erro / aviso / oportunidade) ──────────────────────
export function CartaoValidacao({
  nivel,
  titulo,
  detalhe,
  anexo,
}: {
  nivel: NivelValidacao;
  titulo: string;
  detalhe: string;
  anexo?: string;
}) {
  const estilos: Record<NivelValidacao, { wrapper: string; icon: ReactNode; cor: string }> = {
    erro: {
      wrapper: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
      icon: <Warning size={13} className="text-red-600 dark:text-red-400" />,
      cor: "text-red-700 dark:text-red-300",
    },
    aviso: {
      wrapper: "border-alert-border bg-alert-bg",
      icon: <Warning size={13} className="text-alert-text" />,
      cor: "text-alert-text",
    },
    oportunidade: {
      wrapper: "border-brand/20 bg-brand-light/50",
      icon: <ArrowRight size={13} className="text-brand" />,
      cor: "text-brand-dark",
    },
  };
  const { wrapper, icon, cor } = estilos[nivel];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${wrapper}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className={`text-xs font-semibold ${cor}`}>
          {titulo}
          {anexo && <span className="ml-2 font-normal opacity-70">{anexo}</span>}
        </p>
        <p className={`mt-0.5 text-xs leading-relaxed ${cor} opacity-80`}>{detalhe}</p>
      </div>
    </div>
  );
}

// ─── Cabeçalho de módulo (ícone + título + anexo + descrição) ───────────────
export function CabecalhoModulo({
  titulo,
  anexo,
  anexoNome,
  explicacao,
  descricao,
  icon,
}: {
  titulo: string;
  anexo: string;
  anexoNome: string;
  explicacao: string;
  descricao?: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-2.5">
          {icon && <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">{icon}</span>}
          <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">{titulo}</h3>
        </div>
        <AnexoChip anexo={anexo} nome={anexoNome} explicacao={explicacao} />
      </div>
      {descricao && <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</p>}
    </div>
  );
}
