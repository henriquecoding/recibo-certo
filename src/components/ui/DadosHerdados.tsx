"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «O QUE JÁ SABEMOS» — o componente da continuidade entre ferramentas
//  ---------------------------------------------------------------------
//  §66 do relatório. O Recibo Certo tem cinco pontes possíveis entre
//  ferramentas — recibo de vencimento → IRS, empresa → IRS, negócio →
//  empresa, preço → negócio — e cada uma que nascesse com o seu próprio
//  cartão daria cinco vocabulários diferentes para a mesma ideia.
//
//  ── AS DUAS COLUNAS QUE NÃO SE PODEM MISTURAR (§67) ────────────────
//  «Vamos levar» é o que a pessoa respondeu ou o que derivámos do que ela
//  respondeu. «Falta decidir» é o que nenhuma conta pode inventar. Pôr as
//  duas na mesma lista, com a mesma tipografia, é o preenchimento mágico:
//  o ecrã seguinte fica cheio de números e a pessoa não sabe quais são
//  dela.
//
//  ── ACESSIBILIDADE (§75) ───────────────────────────────────────────
//  · listas semânticas, não `div`s empilhadas;
//  · o estado NUNCA depende só da cor — cada linha tem marca própria e
//    texto que a nomeia;
//  · os ícones são decorativos e ficam fora da árvore de acessibilidade;
//  · a origem de cada valor é texto, não um `title`.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { Check, Warning } from "@/components/ui/Icons";

export interface LinhaHerdada {
  rotulo: string;
  /** Já formatado para leitura. Omisso quando é um facto, não um número. */
  valor?: string;
  /** De onde veio. É o antídoto para o preenchimento mágico. */
  origem: string;
}

export interface LinhaPendente {
  rotulo: string;
  /** Porque é que isto não podia ser deduzido. */
  porque?: string;
}

export default function DadosHerdados({
  levamos,
  faltaDecidir,
  tituloLevamos = "Vamos levar",
  tituloFalta = "Ainda vais decidir",
  rodape,
}: {
  levamos: readonly LinhaHerdada[];
  faltaDecidir?: readonly LinhaPendente[];
  tituloLevamos?: string;
  tituloFalta?: string;
  rodape?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {levamos.length > 0 ? (
        <section aria-labelledby="herdados-levamos">
          <h4
            id="herdados-levamos"
            className="eyebrow mb-2 text-brand-dark dark:text-brand-mint"
          >
            {tituloLevamos}
          </h4>
          <ul className="space-y-2">
            {levamos.map((l) => (
              <li key={l.rotulo} className="flex items-start gap-2">
                <span
                  className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                  aria-hidden
                >
                  <Check size={10} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                      {l.rotulo}
                    </span>
                    {l.valor ? (
                      <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                        {l.valor}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {l.origem}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {faltaDecidir && faltaDecidir.length > 0 ? (
        <section aria-labelledby="herdados-falta">
          <h4 id="herdados-falta" className="eyebrow mb-2 text-stone-500 dark:text-stone-400">
            {tituloFalta}
          </h4>
          <ul className="space-y-2">
            {faltaDecidir.map((p) => (
              <li key={p.rotulo} className="flex items-start gap-2">
                {/* Um círculo vazio, não uma cor diferente: quem não
                    distingue as duas cores continua a distinguir as duas
                    formas. */}
                <span
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-[1.5px] border-stone-300 dark:border-stone-600"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                    {p.rotulo}
                  </span>
                  {p.porque ? (
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                      {p.porque}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rodape}
    </div>
  );
}

/** Uma marca compacta para um campo que veio de outra ferramenta (§20). */
export function SeloHerdado({
  texto = "Do teu projeto",
  detalhe,
}: {
  texto?: string;
  detalhe?: string;
}) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-light/70 px-2 py-0.5 text-[10px] font-semibold text-brand-deep dark:bg-brand/15 dark:text-brand-mint">
        <Check size={9} aria-hidden />
        {texto}
      </span>
      {detalhe ? (
        <span className="text-[10px] leading-snug text-stone-500 dark:text-stone-400">{detalhe}</span>
      ) : null}
    </span>
  );
}

/** Um pressuposto que a importação não conseguiu fechar (§116). */
export function AvisoPressuposto({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-alert-border bg-alert-bg p-3">
      <p className="flex items-start gap-2 text-xs font-semibold text-alert-text">
        <Warning size={13} className="mt-px flex-shrink-0" aria-hidden />
        {titulo}
      </p>
      <p className="mt-1 pl-[21px] text-[11px] leading-relaxed text-alert-text/90">{texto}</p>
      {acao ? <div className="mt-2 pl-[21px]">{acao}</div> : null}
    </div>
  );
}
