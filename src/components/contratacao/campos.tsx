"use client";

import LocalizedNumberInput from "@/components/ui/LocalizedNumberInput";
import InfoTip from "@/components/ui/InfoTip";
import { Check, ChevronDown, ExternalLink, Warning } from "@/components/ui/Icons";
import { resolveCitation } from "../../../ReciboCerto-Fiscal-Engine/src";
import {
  ROTULOS_ESTADO_CUSTO,
  type CampoCusto,
  type EstadoCusto,
  type MetaCusto,
} from "./estado";

export const fieldClass =
  "mt-2 min-h-[46px] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base font-medium tabular-nums text-stone-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100";

export function SectionTitle({
  step,
  title,
  description,
  acao,
}: {
  step: string;
  title: string;
  description: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow text-brand-dark dark:text-brand-mint">Etapa {step}</p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
      </div>
      {acao}
    </div>
  );
}

/**
 * Um campo do formulário.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DUAS COISAS QUE SÓ SE VÊEM QUANDO OS CAMPOS ESTÃO LADO A LADO         │
 * │                                                                      │
 * │ 1. O rótulo era `inline-flex items-center`. Com uma linha corria bem; │
 * │    com duas («Enquadramento contributivo da entidade»), o texto       │
 * │    tornava-se um item de flex e o InfoTip outro — e o InfoTip ia      │
 * │    centrar-se verticalmente ao lado do bloco todo, a flutuar longe da │
 * │    última palavra. Agora o rótulo é texto corrido e o InfoTip flui    │
 * │    logo a seguir, como uma nota de rodapé faria.                      │
 * │                                                                      │
 * │ 2. Numa grelha de três colunas, um rótulo de duas linhas empurrava o  │
 * │    seu `<input>` 19px abaixo dos vizinhos: a linha de campos ficava   │
 * │    em degraus. Reservar sempre duas linhas a partir de `sm:` (onde a  │
 * │    grelha deixa de ser uma coluna só) alinha a linha inteira sem      │
 * │    depender de ninguém escolher rótulos curtos.                       │
 * └──────────────────────────────────────────────────────────────────────┘
 */
/**
 * Secção que se abre.
 *
 * O `<details>` cru mostrava o triângulo preto do navegador — a única peça
 * da página desenhada pelo user-agent, encostada a um design system inteiro.
 * Aqui o afordance é uma pastilha com chevron que roda ao abrir, o alvo tem
 * 48px de altura e o foco de teclado tem anel próprio.
 */
export function Divulgacao({
  titulo,
  nota,
  aberto,
  className = "",
  children,
}: {
  titulo: string;
  nota?: string;
  aberto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={aberto}
      className={`group overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50 ${className}`}
    >
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand dark:text-stone-100 dark:hover:bg-stone-800 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-white text-stone-500 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)] transition-transform duration-200 group-open:rotate-180 dark:bg-stone-900 dark:text-stone-400 dark:shadow-none"
        >
          <ChevronDown size={14} />
        </span>
        <span className="min-w-0 flex-1 leading-snug">{titulo}</span>
        {nota ? (
          <span className="texto-mini flex-none font-semibold text-stone-500 dark:text-stone-400">{nota}</span>
        ) : null}
      </summary>
      <div className="border-t border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        {children}
      </div>
    </details>
  );
}

export function Field({
  label,
  hint,
  info,
  children,
}: {
  label: string;
  hint?: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-full min-w-0 flex-col text-sm font-semibold text-stone-700 dark:text-stone-300">
      <span className="block leading-snug sm:min-h-[2.6em]">
        {label}
        {info ? (
          <span className="ml-1.5 inline-block align-middle">
            <InfoTip label={`Sobre ${label}`}>{info}</InfoTip>
          </span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs font-normal leading-relaxed text-stone-500 dark:text-stone-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  info,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  info?: string;
}) {
  return (
    <Field label={label} hint={hint} info={info}>
      <span className="relative block">
        <LocalizedNumberInput
          id={id}
          value={value}
          onValueChange={onChange}
          min={0}
          max={10_000_000}
          inputMode="decimal"
          className={`${fieldClass} pr-10`}
        />
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-stone-500">€</span>
      </span>
    </Field>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  max = 100_000,
  decimals = 0,
  hint,
  info,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  max?: number;
  decimals?: number;
  hint?: string;
  info?: string;
}) {
  return (
    <Field label={label} hint={hint} info={info}>
      <span className="relative block">
        <LocalizedNumberInput
          id={id}
          value={value}
          onValueChange={onChange}
          min={0}
          max={max}
          maxDecimals={decimals}
          inputMode="decimal"
          className={`${fieldClass} ${suffix ? "pr-16" : ""}`}
        />
        {suffix ? (
          <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-sm text-stone-500">
            {suffix}
          </span>
        ) : null}
      </span>
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  info,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  hint?: string;
  info?: string;
}) {
  return (
    <Field label={label} hint={hint} info={info}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={fieldClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function DateField({
  id,
  label,
  value,
  onChange,
  hint,
  info,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  info?: string;
}) {
  return (
    <Field label={label} hint={hint} info={info}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </Field>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-full min-h-[48px] w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${checked ? "border-brand bg-brand-light/70 dark:bg-brand/15" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"}`}
    >
      <span className={`relative h-6 w-11 flex-none rounded-full transition ${checked ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">{description}</span>
      </span>
    </button>
  );
}

/** Seletor de dias da semana contratados — comanda o calendário e a refeição. */
export function DiasSemanaField({
  dias,
  onChange,
  opcoes,
}: {
  dias: number[];
  onChange: (dias: number[]) => void;
  opcoes: ReadonlyArray<{ valor: number; label: string }>;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="block text-sm font-semibold leading-snug text-stone-700 dark:text-stone-300 sm:min-h-[2.6em]">
        Dias da semana contratados
      </legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {opcoes.map((opcao) => {
          const ativo = dias.includes(opcao.valor);
          return (
            <button
              key={opcao.valor}
              type="button"
              role="checkbox"
              aria-checked={ativo}
              onClick={() =>
                onChange(
                  ativo
                    ? dias.filter((dia) => dia !== opcao.valor)
                    : [...dias, opcao.valor].sort((a, b) => a - b),
                )
              }
              className={`min-h-[40px] min-w-[44px] rounded-xl border px-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${ativo ? "border-brand bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint" : "border-stone-200 bg-white text-stone-500 dark:border-stone-700 dark:bg-stone-800"}`}
            >
              {opcao.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Comandam os dias elegíveis a refeição, os feriados que caem em dia de trabalho e as horas disponíveis.
      </p>
    </fieldset>
  );
}

const TOM_ESTADO: Record<EstadoCusto, string> = {
  confirmado: "border-brand/40 bg-brand-light/60 dark:bg-brand/10",
  estimado: "border-alert-border bg-alert-bg/70",
  intervalo: "border-alert-border bg-alert-bg/70",
  nao_aplicavel: "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50",
  nao_sei: "border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-800/40",
};

/**
 * Um custo com ESTADO, não só com valor. É o campo que impede a interface de
 * transformar um campo vazio num zero confirmado (relatório, CON-P0-04).
 */
export function CampoCustoConhecido({
  meta,
  campo,
  onChange,
}: {
  meta: MetaCusto;
  campo: CampoCusto;
  onChange: (patch: Partial<CampoCusto>) => void;
}) {
  // A fonte legal deixou de ser um par label/URL escrito à mão no estado do
  // formulário: é uma citação resolvida no catálogo do motor, com artigo
  // (relatório, MOT-P0-012).
  const fonte = meta.citacao ? resolveCitation(meta.citacao) : undefined;
  const bloqueado = meta.obrigatorio === true
    && (campo.estado === "nao_sei"
      || campo.estado === "nao_aplicavel"
      || (campo.estado === "confirmado" && campo.valor <= 0));
  const opcoes: EstadoCusto[] = meta.obrigatorio
    ? ["confirmado", "estimado", "intervalo", "nao_sei"]
    : ["confirmado", "estimado", "intervalo", "nao_aplicavel", "nao_sei"];

  // Quantos controlos é que este estado abre. É isto que decide a grelha:
  // com um controlo só, uma grelha de duas colunas deixava metade do cartão
  // vazia ao lado de um `<select>` encolhido — o defeito mais visível da
  // etapa dos custos, repetido oito vezes na mesma página.
  const temValor = campo.estado === "confirmado" || campo.estado === "estimado";
  const temIntervalo = campo.estado === "intervalo";
  const doisControlos = temValor || temIntervalo;

  return (
    <div
      data-custo={meta.id}
      data-estado={campo.estado}
      className={`flex flex-col rounded-2xl border p-3.5 transition ${bloqueado ? "border-alert-border bg-alert-bg" : TOM_ESTADO[campo.estado]}`}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-stone-800 dark:text-stone-100">
          {meta.label}
        </p>
        {campo.estado === "confirmado" && !bloqueado ? (
          <Check size={15} className="mt-0.5 flex-none text-brand" aria-hidden />
        ) : null}
        {bloqueado ? <Warning size={15} className="mt-0.5 flex-none text-alert-text" aria-hidden /> : null}
      </div>

      {meta.obrigatorio || meta.unico ? (
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {meta.obrigatorio ? (
            // A borda não é decoração: no modo escuro `bg-alert` e `bg-alert-bg`
            // caem no mesmo #302b12, e sem ela o distintivo desaparecia dentro
            // do cartão bloqueado — ficava texto dourado solto.
            <span className="texto-mini inline-flex items-center rounded-full border border-alert-border bg-alert px-2 py-0.5 font-bold uppercase tracking-[.08em] text-alert-text">
              Obrigatório
            </span>
          ) : null}
          {meta.unico ? (
            <span className="texto-mini inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 font-bold uppercase tracking-[.08em] text-stone-600 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300">
              Só no arranque
            </span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{meta.hint}</p>

      <div className={`mt-3 grid gap-3 ${doisControlos ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        <label className="block min-w-0 text-xs font-semibold text-stone-600 dark:text-stone-400">
          O que sabes sobre este custo
          <select
            value={campo.estado}
            onChange={(event) => onChange({ estado: event.target.value as EstadoCusto })}
            className={`${fieldClass} mt-1.5 min-h-[42px] py-2 text-sm`}
          >
            {opcoes.map((estado) => (
              <option key={estado} value={estado}>{ROTULOS_ESTADO_CUSTO[estado]}</option>
            ))}
          </select>
        </label>

        {temValor ? (
          <label className="block min-w-0 text-xs font-semibold text-stone-600 dark:text-stone-400">
            Valor anual
            <span className="relative mt-1.5 block">
              <LocalizedNumberInput
                value={campo.valor}
                onValueChange={(valor) => onChange({ valor })}
                min={0}
                max={1_000_000}
                inputMode="decimal"
                aria-label={`${meta.label} — valor anual`}
                className={`${fieldClass} mt-0 min-h-[42px] py-2 pr-9 text-sm`}
              />
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">€</span>
            </span>
          </label>
        ) : null}

        {temIntervalo ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block min-w-0 text-xs font-semibold text-stone-600 dark:text-stone-400">
              Mínimo
              <LocalizedNumberInput
                value={campo.minimo}
                onValueChange={(minimo) => onChange({ minimo })}
                min={0}
                max={1_000_000}
                inputMode="decimal"
                aria-label={`${meta.label} — mínimo anual`}
                className={`${fieldClass} mt-1.5 min-h-[42px] py-2 text-sm`}
              />
            </label>
            <label className="block min-w-0 text-xs font-semibold text-stone-600 dark:text-stone-400">
              Máximo
              <LocalizedNumberInput
                value={campo.maximo}
                onValueChange={(maximo) => onChange({ maximo })}
                min={0}
                max={1_000_000}
                inputMode="decimal"
                aria-label={`${meta.label} — máximo anual`}
                className={`${fieldClass} mt-1.5 min-h-[42px] py-2 text-sm`}
              />
            </label>
          </div>
        ) : null}
      </div>

      {bloqueado ? (
        <p className="mt-2.5 text-xs leading-relaxed text-alert-text">
          Sem um valor positivo — confirmado, estimado ou em intervalo — o cenário fica incompleto e
          nenhuma conclusão pode dizer que a proposta cabe.
        </p>
      ) : null}

      {/* O rodapé com a fonte legal é empurrado para baixo (`mt-auto`): numa
          linha de dois cartões, o que tem citação deixa de esticar o vizinho e
          de lhe abrir um vazio de 200px. */}
      {fonte ? (
        <a
          href={fonte.source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex min-h-[36px] items-center pt-2.5 text-xs font-semibold leading-relaxed text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
        >
          {/* O ícone vive DENTRO do texto: como item de flex, num título de
              duas linhas ia centrar-se verticalmente lá ao fundo à direita,
              longe da última palavra a que pertence. */}
          <span className="min-w-0">
            {fonte.locator ? `${fonte.source.title}, ${fonte.locator.article}` : fonte.source.title}
            <ExternalLink size={12} className="ml-1 inline-block align-[-1px]" />
          </span>
        </a>
      ) : null}
    </div>
  );
}
