"use client";

// ═══════════════════════════════════════════════════════════════════════
//  §24 — GUARDAR É EXPLÍCITO
//  ---------------------------------------------------------------------
//  O rascunho grava-se sozinho no cofre local — isso é não perder
//  trabalho. Guardar o projeto é outra coisa: é uma decisão, e no Plus
//  significa que os dados saem do aparelho.
//
//  ── A COPY MUDA COM O DESTINO ──────────────────────────────────────
//  «Guardado» é a mesma palavra para duas coisas muito diferentes. Se
//  `useCenarios` escolher a nuvem, o botão diz que o projeto ficará
//  disponível nos outros dispositivos — porque é isso que acontece, e
//  porque um plano de negócio contém a estrutura de custos de alguém.
//
//  Transformar o autosave local em consentimento para a nuvem seria
//  exatamente o que o §24 proíbe.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { useCenarios } from "@/lib/store/cenarios";
import { Check, Cloud, Lock } from "@/components/ui/Icons";
import { ROTULO_CONFIANCA } from "@/lib/negocio/viabilidade";
import type { ContextoNegocio, ResultadoNegocio } from "@/lib/negocio/tipos";
import { BotaoPrincipal, Cartao } from "./atomos";
import { registarProjetoGuardado } from "./medicao";

export default function GuardarProjeto({
  contexto,
  negocio,
}: {
  contexto: ContextoNegocio;
  negocio: ResultadoNegocio;
}) {
  const { guardar, naNuvem, carregado, limiteAtingido } = useCenarios();
  const [estado, setEstado] = useState<"parado" | "a_guardar" | "guardado">("parado");
  const [erro, setErro] = useState<string | null>(null);

  const nome = contexto.nome?.trim() || "Projeto de negócio";

  async function aoGuardar() {
    setEstado("a_guardar");
    setErro(null);

    const r = await guardar({
      tipo: "negocio",
      nome,
      resumo: {
        destaque: negocio.resultadoOperacionalMes,
        destaqueLabel: "Resultado operacional / mês",
        linhas: [
          { label: "Receita mensal", valor: negocio.receitaSemIVAMes },
          { label: "Estrutura", valor: negocio.overheadMes + negocio.custoTrabalhadoresMes },
          { label: "Equilíbrio", valor: negocio.breakEven.vendasMes, fmt: "eur" },
        ],
      },
      // O instantâneo COMPLETO — é o que permite reabrir e continuar, e é
      // a mesma decisão que os outros simuladores tomaram. Vai para o
      // destino que `useCenarios` escolher, que é o que a copy diz.
      dados: { contexto: contexto as unknown as Record<string, unknown> },
    });

    if (!r.ok) {
      setEstado("parado");
      setErro(r.erro.mensagem);
      return;
    }
    registarProjetoGuardado(naNuvem);
    setEstado("guardado");
  }

  return (
    <Cartao id="guardar">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Guardar este projeto</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {naNuvem ? <Cloud size={13} className="mt-0.5 flex-shrink-0" /> : <Lock size={13} className="mt-0.5 flex-shrink-0" />}
            <span>
              {naNuvem
                ? "Este projeto ficará disponível nos teus dispositivos, na tua conta."
                : "Fica só neste aparelho. Enquanto editas, nada sai daqui — nem os custos, nem as margens, nem os volumes."}
            </span>
          </p>
        </div>

        <div className="flex-shrink-0">
          {estado === "guardado" ? (
            <p className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-dark dark:text-brand-mint">
              <Check size={15} />
              Guardado
            </p>
          ) : (
            <BotaoPrincipal onClick={aoGuardar} disabled={!carregado || estado === "a_guardar"}>
              {estado === "a_guardar" ? "A guardar…" : "Guardar este projeto"}
            </BotaoPrincipal>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 dark:border-stone-800 sm:grid-cols-4">
        <Resumo rotulo="Ofertas" valor={`${negocio.ofertas.length}`} />
        <Resumo rotulo="Receita anual" valor={fmt(negocio.receitaSemIVAAno)} />
        <Resumo rotulo="Resultado anual" valor={fmt(negocio.resultadoOperacionalAno)} />
        <Resumo rotulo="Confiança" valor={ROTULO_CONFIANCA[negocio.confianca]} />
      </dl>

      {erro ? (
        <p className="mt-3 rounded-2xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text" role="alert">
          {erro}
        </p>
      ) : null}

      {limiteAtingido && estado !== "guardado" ? (
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          O plano grátis guarda um projeto. O que estás a construir continua neste aparelho de qualquer forma — o Plus
          serve para o teres em todos, com histórico.{" "}
          <Link href="/precos" className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint">
            Ver o Plus
          </Link>
        </p>
      ) : null}

      {estado === "guardado" ? (
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          Podes reabri-lo em{" "}
          <Link
            href="/dashboard/cenarios"
            className="font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-mint"
          >
            Cenários guardados
          </Link>
          .
        </p>
      ) : null}
    </Cartao>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-stone-500 dark:text-stone-400">{rotulo}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">{valor}</dd>
    </div>
  );
}
