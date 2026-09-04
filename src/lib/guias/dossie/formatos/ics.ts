// ═══════════════════════════════════════════════════════════════════════
//  ICS — os prazos do dossiê, na agenda de quem o recebe
//  ---------------------------------------------------------------------
//  Reaproveita `lib/calendario/ics.ts` inteiro. As regras chatas do RFC
//  5545 — CRLF, dobra a 75 octetos, escape, tudo em UTC — já estão
//  resolvidas ali, e reescrevê-las aqui era garantir que uma delas ficava
//  por resolver.
//
//  Um prazo do dossiê é um DIA, não uma hora: a data-limite de uma
//  obrigação não tem hora de parede. Emite-se como um bloco de manhã em
//  UTC e não como evento de dia inteiro porque `construirCalendario` fala
//  em instantes — e um evento de dia inteiro mal escrito aparece no dia
//  anterior a metade dos leitores.
// ═══════════════════════════════════════════════════════════════════════

import { construirCalendario, type EventoICS } from "@/lib/calendario/ics";
import type { DossieDeGuia, Selecao } from "../tipos";
import { referencia, seccoesSelecionadas } from "./comum";

/** A hora a que um prazo aparece na agenda. 9h UTC, por convenção. */
const HORA_UTC = 9;

/** Quanto dura o bloco. Uma hora chega para «trata disto hoje». */
const DURACAO_MIN = 60;

export function prazosParaIcs(
  dossie: DossieDeGuia,
  selecao?: Selecao,
  agora: Date = new Date(),
): string {
  const prazos = seccoesSelecionadas(dossie, selecao).find((s) => s.id === "prazos");
  const eventos: EventoICS[] = [];

  for (const item of prazos?.itens ?? []) {
    const dia = item.quando?.ate ?? item.quando?.de;
    if (!dia) continue;
    const inicio = new Date(`${dia.slice(0, 10)}T${String(HORA_UTC).padStart(2, "0")}:00:00Z`);
    if (Number.isNaN(inicio.getTime())) continue;
    eventos.push({
      // Estável e único: o mesmo prazo do mesmo dossiê traz sempre o mesmo
      // UID, e reimportar o ficheiro atualiza em vez de duplicar.
      uid: `dossie-${dossie.fixado.impressao.slice(0, 16)}-${item.id}@recibocerto.pt`,
      inicio,
      fim: new Date(inicio.getTime() + DURACAO_MIN * 60_000),
      titulo: `${dossie.guia.titulo} — prazo`,
      descricao: `${item.texto}\n\nDo ${referencia(dossie)}.`,
      estado: "confirmado",
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  return construirCalendario(
    eventos,
    {
      nome: `Prazos — ${dossie.guia.titulo}`,
      descricao: `Prazos do dossiê do ${referencia(dossie)}.`,
    },
    agora,
  );
}
