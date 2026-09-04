// ═══════════════════════════════════════════════════════════════════════
//  JSON — para quem integra
//  ---------------------------------------------------------------------
//  Com `impressao`, sem PII. É o dossiê tal como viaja, mais um envelope
//  que diz o que ele é — porque um JSON solto, sem `formato` nem `versao`,
//  é indistinguível de um despejo de base de dados no dia em que alguém o
//  encontrar numa pasta.
// ═══════════════════════════════════════════════════════════════════════

import { auditarFronteira } from "../fronteira";
import type { DossieDeGuia, Selecao } from "../tipos";
import { rodape, seccoesSelecionadas } from "./comum";

export const FORMATO_JSON = "recibocerto.dossie-de-guia";
export const VERSAO_JSON = 1;

export interface EnvelopeJson {
  formato: typeof FORMATO_JSON;
  versao: typeof VERSAO_JSON;
  emitidoEm: string;
  aviso: string;
  dossie: DossieDeGuia;
}

export function paraJson(
  dossie: DossieDeGuia,
  selecao?: Selecao,
  agora: Date = new Date(),
): string {
  const recortado: DossieDeGuia = { ...dossie, seccoes: seccoesSelecionadas(dossie, selecao) };

  // A última verificação antes de o objeto sair da casa. É barata e apanha
  // exatamente o caso que mais custa: um campo novo numa secção, escrito
  // por alguém que não conhecia a lista branca, a sair num ficheiro.
  const achados = auditarFronteira(recortado);
  if (achados.length > 0) {
    throw new Error(
      `Dossiê não exportável — fora da fronteira de dados:\n  · ${achados
        .map((a) => `${a.seccao}/${a.itemId}: ${a.problema}`)
        .join("\n  · ")}`,
    );
  }

  const envelope: EnvelopeJson = {
    formato: FORMATO_JSON,
    versao: VERSAO_JSON,
    emitidoEm: agora.toISOString(),
    aviso: rodape(dossie),
    dossie: recortado,
  };

  return JSON.stringify(envelope, null, 2);
}
