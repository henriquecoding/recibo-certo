"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 3 — «Quantas consegues vender?»
//  ---------------------------------------------------------------------
//  A outra metade da conta. O preço diz quanto vale uma venda; sem o
//  volume, não há negócio nenhum — há uma tabela de preços.
//
//  ── TRÊS NÚMEROS, NÃO UM ───────────────────────────────────────────
//  A mesma disciplina da faixa de preço: nunca devolver um número sem
//  faixa. «12 clientes por mês» é falsa precisão sobre um palpite; um mau
//  mês, um provável e um bom mês são honestos sobre o que se sabe — e são
//  eles que dizem se o negócio sobrevive a um trimestre fraco.
//
//  ── A CAPACIDADE APARECE AQUI, NÃO NO FIM ──────────────────────────
//  Descobrir na conclusão que o plano pedia 2 000 horas por mês é tarde:
//  a pessoa já construiu tudo por cima. O aviso vive ao lado do campo que
//  o provoca, e não corrige nada — só diz que não cabe.
// ═══════════════════════════════════════════════════════════════════════

import { useId } from "react";
import { fmt } from "@/lib/format";
import { CampoNumero } from "@/components/precos/atomos";
import { Warning } from "@/components/ui/Icons";
import { capacidadeDe, cenariosDeVolume } from "@/lib/negocio/ofertas";
import type { OfertaNegocio, ResultadoOfertaNegocio, VolumeOferta } from "@/lib/negocio/tipos";
import { Barra, BotaoTexto } from "./atomos";

const ROTULO_UNIDADE: Record<string, string> = {
  unidades: "unidades",
  clientes: "clientes",
  horas: "horas",
  projetos: "projetos",
};

export default function EditorVolumeOferta({
  oferta,
  resultado,
  aoMudarVolume,
  aoMudarCapacidade,
}: {
  oferta: OfertaNegocio;
  resultado: ResultadoOfertaNegocio;
  aoMudarVolume: (v: VolumeOferta) => void;
  aoMudarCapacidade: (maximoMes: number | null) => void;
}) {
  const base = useId();
  const cenarios = cenariosDeVolume(oferta.volume);
  const cap = capacidadeDe(oferta);
  const unidade = ROTULO_UNIDADE[cap?.unidade ?? "unidades"] ?? "unidades";

  const precoLiquido = resultado.preco.precoLiquido;
  const utilizacao = cap && cap.maximoMes > 0 ? cenarios.esperado / cap.maximoMes : null;
  const excedida = utilizacao !== null && utilizacao > 1;

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
        Já sabemos quanto esta oferta precisa de cobrar. Agora falta a outra metade: quantas consegues vender?
      </p>

      {/* Três campos, três cenários. Em telemóvel empilham. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CampoNumero
          id={`${base}-conservador`}
          rotulo="Mau mês"
          descricao="O pior que te parece plausível"
          valor={cenarios.conservador}
          aoMudar={(v) => aoMudarVolume({ ...oferta.volume, conservadorMes: v })}
          sufixo={unidade}
          max={100000}
        />
        <CampoNumero
          id={`volume-${oferta.id}`}
          rotulo="Mês provável"
          descricao="É este que forma o resultado"
          valor={cenarios.esperado}
          aoMudar={(v) => aoMudarVolume({ ...oferta.volume, esperadoMes: v })}
          sufixo={unidade}
          max={100000}
        />
        <CampoNumero
          id={`${base}-ambicioso`}
          rotulo="Bom mês"
          descricao="Se tudo correr bem"
          valor={cenarios.ambicioso}
          aoMudar={(v) => aoMudarVolume({ ...oferta.volume, ambiciosoMes: v })}
          sufixo={unidade}
          max={100000}
        />
      </div>

      {/* O que cada cenário gera, em euros. Sem isto os três números são
          abstratos — e é a receita que os torna uma decisão. */}
      <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50">
        {(
          [
            ["Mau mês", cenarios.conservador],
            ["Provável", cenarios.esperado],
            ["Bom mês", cenarios.ambicioso],
          ] as const
        ).map(([rotulo, n]) => (
          <div key={rotulo} className="min-w-0 text-center">
            <dt className="text-[11px] text-stone-500 dark:text-stone-400">{rotulo}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              {fmt(precoLiquido * n)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">
        Receita mensal sem IVA, ao preço calculado de {fmt(precoLiquido)} por {unidade.replace(/s$/, "")}.
      </p>

      {/* ── Capacidade ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-100 p-3 dark:border-stone-800" id={`capacidade-${oferta.id}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-100">Quantas cabem mesmo no mês?</h4>
          {cap?.derivada ? (
            <BotaoTexto onClick={() => aoMudarCapacidade(cap.maximoMes)}>Definir eu o limite</BotaoTexto>
          ) : cap ? (
            <BotaoTexto onClick={() => aoMudarCapacidade(null)}>Voltar ao limite calculado</BotaoTexto>
          ) : null}
        </div>

        {cap ? (
          <div className="mt-2 space-y-2">
            {cap.derivada ? (
              <p className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                Calculado a partir das horas que declaraste: cabem <strong>{cap.maximoMes}</strong> por mês
                {cap.motivo ? ` — ${cap.motivo}` : ""}.
              </p>
            ) : (
              <CampoNumero
                id={`${base}-capacidade`}
                rotulo="Limite por mês"
                descricao="Stock, lote, agenda — o que te trava primeiro"
                valor={cap.maximoMes}
                aoMudar={(v) => aoMudarCapacidade(v)}
                sufixo={unidade}
                max={100000}
              />
            )}

            <Barra
              fracao={utilizacao ?? 0}
              tom={excedida ? "perigo" : (utilizacao ?? 0) >= 0.85 ? "aviso" : "brand"}
              rotuloAcessivel={`Ocupação: ${cenarios.esperado} de ${cap.maximoMes} ${unidade} por mês`}
            />
            <p className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">
              {cenarios.esperado} de {cap.maximoMes} {unidade} — {Math.round((utilizacao ?? 0) * 100)}% da capacidade.
            </p>

            {excedida ? (
              <p className="flex items-start gap-2 rounded-xl bg-alert-bg px-3 py-2 text-[11px] leading-relaxed text-alert-text">
                <Warning size={14} className="mt-px flex-shrink-0" />
                <span>
                  O mês provável pede {cenarios.esperado} e só cabem {cap.maximoMes}. Não corrigimos nada — mas este
                  cenário não acontece sem mais horas, menos tempo por cada, ou alguém que ajude.
                </span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">
              Esta oferta não declara tempo por unidade, por isso não conseguimos calcular um limite. Se tens um — stock,
              lote de produção, agenda — vale a pena escrevê-lo: é o que impede um plano que não cabe no mês.
            </p>
            <BotaoTexto tom="marca" onClick={() => aoMudarCapacidade(cenarios.ambicioso)}>
              Declarar um limite
            </BotaoTexto>
          </div>
        )}
      </div>
    </div>
  );
}
