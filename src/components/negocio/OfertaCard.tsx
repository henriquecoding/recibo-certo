"use client";

// ═══════════════════════════════════════════════════════════════════════
//  UMA OFERTA NO PORTEFÓLIO
//  ---------------------------------------------------------------------
//  O cartão diz o essencial sem ser preciso abrir nada: preço, volume,
//  receita e peso. O resto — o volume, a capacidade — abre a pedido, como
//  a calculadora já faz com a profundidade.
//
//  ── O QUE ESTE CARTÃO NUNCA ESCONDE ────────────────────────────────
//  Um prejuízo. Uma oferta com contribuição negativa aparece marcada,
//  sempre, mesmo recolhida: «nunca calar um prejuízo» é regra da engine
//  de preço e não deixa de o ser por a oferta estar dentro de um negócio.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { fmt, pct } from "@/lib/format";
import { ChevronDown, Pencil, Trash, Warning } from "@/components/ui/Icons";
import type { OfertaNegocio, ResultadoOfertaNegocio, VolumeOferta } from "@/lib/negocio/tipos";
import { Barra, BotaoTexto } from "./atomos";
import EditorVolumeOferta from "./EditorVolumeOferta";

export default function OfertaCard({
  resultado,
  aoEditarPreco,
  aoRemover,
  aoMudarVolume,
  aoMudarCapacidade,
  aoRenomear,
}: {
  resultado: ResultadoOfertaNegocio;
  aoEditarPreco: () => void;
  aoRemover: () => void;
  aoMudarVolume: (v: VolumeOferta) => void;
  aoMudarCapacidade: (maximoMes: number | null) => void;
  aoRenomear: (nome: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const oferta: OfertaNegocio = resultado.oferta;

  const prejuizo = resultado.ok && resultado.contribuicaoMes < 0;
  const semPreco = !resultado.ok;
  const exemplo = oferta.respondidos.length === 0;

  return (
    <article
      className={`rounded-4xl border bg-white p-4 shadow-card transition-shadow dark:bg-stone-900 ${
        semPreco || prejuizo
          ? "border-red-200 dark:border-red-900/60"
          : "border-stone-100 dark:border-stone-800"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* O nome é editável no sítio: renomear não vale uma navegação. */}
          <label className="sr-only" htmlFor={`nome-${oferta.id}`}>
            Nome desta oferta
          </label>
          <input
            id={`nome-${oferta.id}`}
            value={oferta.nome}
            onChange={(e) => aoRenomear(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 font-display text-base font-semibold text-stone-800 hover:border-stone-200 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-100 dark:hover:border-stone-700"
          />
          <p className="mt-0.5 px-1 text-[11px] text-stone-500 dark:text-stone-400">
            {exemplo ? "Valores de exemplo — ainda não respondeste a nada nesta oferta" : "O teu preço"}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <BotaoTexto onClick={aoEditarPreco} tom="marca" ariaLabel={`Editar o preço de ${oferta.nome}`}>
            <Pencil size={12} />
            Preço
          </BotaoTexto>
          <BotaoTexto onClick={aoRemover} tom="perigo" ariaLabel={`Remover ${oferta.nome} do negócio`}>
            <Trash size={12} />
            Remover
          </BotaoTexto>
        </div>
      </div>

      {semPreco ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <Warning size={14} className="mt-px flex-shrink-0" />
          <span>
            Com estes números não há preço possível — entre comissões, impostos e a margem pedida não sobra nada de cada
            euro. Esta oferta não entra nas contas até ser ajustada.
          </span>
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-[11px] text-stone-500 dark:text-stone-400">Preço</dt>
              <dd className="truncate text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(resultado.preco.pvp)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-stone-500 dark:text-stone-400">Por mês</dt>
              <dd className="truncate text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {resultado.unidadesMes}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-stone-500 dark:text-stone-400">Receita</dt>
              <dd className="truncate text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(resultado.mensal.receitaSemIVA)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-stone-500 dark:text-stone-400">Contribuição</dt>
              <dd
                className={`truncate text-sm font-semibold tabular-nums ${
                  prejuizo ? "text-red-700 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
                }`}
              >
                {fmt(resultado.contribuicaoMes)}
              </dd>
            </div>
          </dl>

          {prejuizo ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800 dark:bg-red-950/40 dark:text-red-300">
              <Warning size={14} className="mt-px flex-shrink-0" />
              <span>
                Cada venda custa mais do que rende: são {fmt(Math.abs(resultado.contribuicaoMes))} por mês a sair.
                Vender mais piora — o problema está no preço ou no custo, não no volume.
              </span>
            </p>
          ) : (
            <div className="mt-3">
              <Barra
                fracao={resultado.peso}
                rotuloAcessivel={`${oferta.nome} representa ${pct(resultado.peso)} da receita do negócio`}
              />
              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                {pct(resultado.peso)} da receita · margem de contribuição de {pct(resultado.contribuicaoPercentagem)}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Volume e capacidade, a pedido ─────────────────────────── */}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls={`volume-painel-${oferta.id}`}
        className="mt-3 flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 text-left text-xs font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:text-stone-200 dark:hover:border-stone-700 dark:hover:bg-stone-800/50"
      >
        <span>{aberto ? "Fechar volume e capacidade" : "Ajustar volume e capacidade"}</span>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto ? (
        <div id={`volume-painel-${oferta.id}`} className="mt-3">
          <EditorVolumeOferta
            oferta={oferta}
            resultado={resultado}
            aoMudarVolume={aoMudarVolume}
            aoMudarCapacidade={aoMudarCapacidade}
          />
        </div>
      ) : null}
    </article>
  );
}
