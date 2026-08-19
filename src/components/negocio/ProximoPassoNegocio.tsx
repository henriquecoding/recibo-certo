"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATOS 12 e 13 — contabilista, execução e o que fazer a seguir
//  ---------------------------------------------------------------------
//  Nada de CTA inventado. `escolherRota()` decide, com hierarquia
//  auditável e motivo legível, e este componente desenha a rota que ela
//  devolveu — nem mais uma.
//
//  ── A GUARDA QUE VEM DE GRAÇA ──────────────────────────────────────
//  Um resultado `exploratorio` chega ao routing como `fora_de_escopo`, e
//  a primeira regra de `escolherRota` fecha todas as rotas comerciais.
//  Ou seja: um negócio construído com os valores de exemplo não gera
//  sugestão comercial nenhuma, sem ser preciso um `if` aqui.
//
//  ── O DIAGNÓSTICO NÃO REPETE PERGUNTAS ─────────────────────────────
//  `diagnosticoContabilista` precisa de cinco coisas e o negócio sabe as
//  cinco. Voltar a pedi-las seria dar à pessoa a oportunidade de
//  responder diferente e obter outro diagnóstico para o mesmo caso.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { diagnosticoContabilista } from "@/lib/contabilista";
import { escolherRota } from "@/lib/routing";
import { ArrowRight, MapPin, Scale, ShieldCheck } from "@/components/ui/Icons";
import { paraDiagnosticoContabilista } from "@/lib/negocio/adapters/contabilista";
import { sinaisDoNegocio } from "@/lib/negocio/adapters/routing";
import { passosAntesDaFiz } from "@/lib/negocio/adapters/fiz";
import type { ContextoNegocio, ResultadoNegocio } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

export default function ProximoPassoNegocio({
  negocio,
  contexto,
  aoPartilhar,
}: {
  negocio: ResultadoNegocio;
  contexto: ContextoNegocio;
  aoPartilhar?: () => void;
}) {
  const diagnostico = useMemo(
    () => (negocio.receitaSemIVAAno > 0 ? diagnosticoContabilista(paraDiagnosticoContabilista(negocio, contexto)) : null),
    [negocio, contexto],
  );
  const rota = useMemo(() => escolherRota(sinaisDoNegocio(negocio, contexto)), [negocio, contexto]);
  const passos = useMemo(() => passosAntesDaFiz(negocio, contexto), [negocio, contexto]);

  return (
    <div className="space-y-3" id="proximo-passo">
      {/* ── O que falta fazer aqui, antes de sair ─────────────────── */}
      <Cartao titulo="O que falta antes de executar" descricao="Deste lado compreende-se e compara-se; executar é o passo seguinte">
        <ol className="space-y-2">
          {passos.map((p, i) => (
            <li key={p} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-light text-[11px] font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand"
              >
                {i + 1}
              </span>
              <span className="min-w-0 text-xs leading-relaxed text-stone-600 dark:text-stone-300">{p}</span>
            </li>
          ))}
        </ol>
      </Cartao>

      {/* ── Contabilista ──────────────────────────────────────────── */}
      {diagnostico ? (
        <Cartao titulo="Precisas de contabilista?" id="contabilista">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                diagnostico.nivel === "obrigatorio"
                  ? "bg-alert-bg text-alert-text"
                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {diagnostico.rotulo}
            </span>
            <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400">
              {diagnostico.pontual
                ? `${fmt(diagnostico.avencaMin)}–${fmt(diagnostico.avencaMax)} pontual`
                : `${fmt(diagnostico.avencaMin)}–${fmt(diagnostico.avencaMax)}/mês`}
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-stone-800 dark:text-stone-100">{diagnostico.titulo}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">{diagnostico.mensagem}</p>

          {diagnostico.motivos.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {diagnostico.motivos.map((mo) => (
                <li key={mo} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                  <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-stone-400" />
                  {mo}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Este diagnóstico usa a faturação, os custos, os clientes e os trabalhadores que já declaraste — não voltámos
            a perguntar nada.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/contabilistas"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-brand dark:hover:text-brand-mint"
            >
              <Scale size={14} />
              Encontrar contabilista
            </Link>
            {aoPartilhar ? (
              <button
                type="button"
                onClick={aoPartilhar}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-brand dark:hover:text-brand-mint"
              >
                <ShieldCheck size={14} />
                Ver o que posso partilhar
              </button>
            ) : null}
          </div>
        </Cartao>
      ) : null}

      {/* ── Onde operar ───────────────────────────────────────────── */}
      <Link
        href="/ferramentas/mapa-contabilistas"
        className="group flex items-start justify-between gap-3 rounded-4xl border border-stone-100 bg-white p-4 shadow-card transition-all hover:border-brand hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
            <MapPin size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">Onde instalar</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Benefícios fiscais por região, e contabilistas, notários e advogados no mesmo mapa
            </span>
          </span>
        </span>
        <ArrowRight size={15} className="mt-0.5 flex-shrink-0 text-stone-300 group-hover:text-brand" />
      </Link>

      {/* ── Porque é que esta rota, e não outra ────────────────────
          O próximo passo em si vive na conclusão (`ConclusaoNegocio`),
          onde `ResultadoExplicado` impõe a hierarquia. Aqui fica só o
          MOTIVO — o §13.2 exige que o código de elegibilidade seja
          visível, e uma sugestão sem motivo é publicidade. ────────── */}
      <p className="px-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        {rota.rota === "sem_parceiro"
          ? "Ainda não te sugerimos nada, e é de propósito: enquanto o cenário for exploratório, qualquer recomendação comercial apoiar-se-ia em números que ninguém confirmou."
          : rota.dados}{" "}
        Código de elegibilidade: <code className="font-mono">{rota.motivo}</code>.
      </p>

      {/* ── O guia, para quem quer aprender em vez de fazer ──────── */}
      <p className="px-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Queres perceber as formas jurídicas, os documentos e as obrigações antes de decidir?{" "}
        <Link
          href="/guias/abrir-empresa"
          className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
        >
          O guia de abrir empresa
        </Link>{" "}
        explica tudo isso com calma. Aqui faz-se; lá aprende-se.
      </p>
    </div>
  );
}
