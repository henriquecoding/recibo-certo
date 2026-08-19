"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ÁTOMOS DO ESTÚDIO — as peças que se repetem, num sítio só
//  ---------------------------------------------------------------------
//  Nenhum destes é uma primitiva nova do design system: são composições
//  finas de `Button`, `Badge` e das classes de `globals.css`. Vivem aqui
//  porque aparecem em cinco componentes do estúdio e, escritos cinco
//  vezes, divergiriam ao terceiro ajuste de espaçamento.
//
//  Regras que estes átomos existem para não deixar esquecer:
//   · números com `tabular-nums` — sem isso as colunas dançam ao atualizar;
//   · todo o gráfico tem equivalente textual (§26);
//   · barras horizontais precisam de `role="img"` + `aria-label`, porque
//     uma largura em percentagem não diz nada a quem não vê.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { fmt } from "@/lib/format";

/** Um número-chave com rótulo. A unidade de leitura do cockpit. */
export function Metrica({
  rotulo,
  valor,
  sub,
  tom = "neutro",
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  sub?: string;
  tom?: "neutro" | "bom" | "mau" | "aviso";
  destaque?: boolean;
}) {
  const cor =
    tom === "bom"
      ? "text-brand-dark dark:text-brand-mint"
      : tom === "mau"
        ? "text-red-700 dark:text-red-400"
        : tom === "aviso"
          ? "text-alert-text"
          : "text-ink";

  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{rotulo}</dt>
      {/* ⚠️ O `sub` vive DENTRO do `<dd>`, e não como um `<p>` irmão.
          Um `<dl>` só pode conter grupos `<dt>`/`<dd>` — um terceiro
          elemento dentro do agrupador parte a lista de definições e é
          uma violação `serious` do axe (apanhada na auditoria do estúdio,
          em todos os estados com resultado). Visualmente é idêntico. */}
      <dd
        className={`mt-0.5 font-display font-semibold tabular-nums ${cor} ${
          destaque ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
        }`}
      >
        {valor}
        {sub ? (
          <span className="mt-0.5 block font-sans text-[11px] font-normal leading-snug text-stone-500 dark:text-stone-400">
            {sub}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * Uma barra proporcional com equivalente textual obrigatório.
 *
 * `aria-label` não é opcional: uma barra sem ele é um `div` com uma
 * largura, e quem usa leitor de ecrã não recebe informação nenhuma.
 */
export function Barra({
  fracao,
  rotuloAcessivel,
  tom = "brand",
  altura = "h-2",
}: {
  fracao: number;
  rotuloAcessivel: string;
  tom?: "brand" | "aviso" | "perigo" | "neutro";
  altura?: string;
}) {
  const largura = Math.max(0, Math.min(1, Number.isFinite(fracao) ? fracao : 0)) * 100;
  const cor =
    tom === "perigo"
      ? "bg-red-500"
      : tom === "aviso"
        ? "bg-alert"
        : tom === "neutro"
          ? "bg-stone-300 dark:bg-stone-600"
          : "bg-brand";

  return (
    <div
      role="img"
      aria-label={rotuloAcessivel}
      className={`w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 ${altura}`}
    >
      <div className={`${altura} rounded-full ${cor}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

/** Linha de uma cascata: rótulo à esquerda, euros à direita. */
export function LinhaValor({
  rotulo,
  valor,
  nota,
  forte = false,
  negativoEhMau = true,
}: {
  rotulo: string;
  valor: number;
  nota?: string;
  forte?: boolean;
  negativoEhMau?: boolean;
}) {
  const mau = negativoEhMau && valor < 0;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0 text-sm text-stone-600 dark:text-stone-300">
        {rotulo}
        {nota ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-stone-500 dark:text-stone-400">{nota}</span>
        ) : null}
      </span>
      <span
        className={`flex-shrink-0 tabular-nums ${forte ? "text-base font-semibold" : "text-sm"} ${
          mau ? "text-red-700 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {fmt(valor)}
      </span>
    </div>
  );
}

/** O cartão base do estúdio. Uma moldura, um título, conteúdo. */
export function Cartao({
  titulo,
  descricao,
  acao,
  children,
  id,
}: {
  titulo?: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={titulo ? `${id ?? titulo.replace(/\s+/g, "-")}-t` : undefined}
      className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5"
    >
      {titulo ? (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              id={`${id ?? titulo.replace(/\s+/g, "-")}-t`}
              className="font-display text-base font-semibold text-stone-800 dark:text-stone-100"
            >
              {titulo}
            </h3>
            {descricao ? (
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{descricao}</p>
            ) : null}
          </div>
          {acao ? <div className="flex-shrink-0">{acao}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Estado vazio: ícone, frase e uma ação. Nunca uma caixa em branco. */
export function Vazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center dark:border-stone-700">
      <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
        {icone}
      </span>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-500 dark:text-stone-400">{texto}</p>
      {acao ? <div className="mt-4 flex justify-center">{acao}</div> : null}
    </div>
  );
}

/** Botão primário do estúdio. */
export function BotaoPrincipal({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-shine inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card transition-shadow hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Botão secundário: contorno, mesma altura de alvo. */
export function BotaoSecundario({
  children,
  onClick,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-brand dark:hover:text-brand-mint ${className}`}
    >
      {children}
    </button>
  );
}

/** Ação discreta em texto — remover, editar, repor. */
export function BotaoTexto({
  children,
  onClick,
  tom = "neutro",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  tom?: "neutro" | "perigo" | "marca";
  ariaLabel?: string;
}) {
  const cor =
    tom === "perigo"
      ? "text-stone-500 hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400"
      : tom === "marca"
        ? "text-brand-dark hover:text-brand-deep dark:text-brand-mint"
        : "text-stone-500 hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand-mint";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold underline-offset-2 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${cor}`}
    >
      {children}
    </button>
  );
}
