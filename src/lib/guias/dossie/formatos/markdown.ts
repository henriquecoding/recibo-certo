// ═══════════════════════════════════════════════════════════════════════
//  MARKDOWN — para colar no processo do escritório
//  ---------------------------------------------------------------------
//  É o formato que um contabilista usa mesmo: cola no dossier do cliente,
//  no email, no software de gestão. Por isso não leva tabelas largas nem
//  artifícios — leva títulos, listas e a base legal com o URL à vista.
// ═══════════════════════════════════════════════════════════════════════

import {
  ROTULO_ESTADO_ELEMENTO, ROTULO_RESPOSTA,
  type DossieDeGuia, type ItemDossie, type SeccaoDossie, type Selecao,
} from "../tipos";
import { data, referencia, rodape, seccoesSelecionadas } from "./comum";

export function paraMarkdown(dossie: DossieDeGuia, selecao?: Selecao): string {
  const l: string[] = [];

  l.push(`# ${dossie.guia.titulo}`);
  l.push("");
  l.push(
    `**Enquadramento:** ${dossie.guia.categoria} · área **${dossie.guia.area}** · ` +
      `versão de ${data(dossie.fixado.revistoEm)} · composto a ${data(dossie.fixado.compostoEm)}`,
  );
  l.push("");

  for (const seccao of seccoesSelecionadas(dossie, selecao)) {
    l.push(`## ${seccao.titulo}`);
    l.push("");
    for (const item of seccao.itens) l.push(linhaDe(seccao, item));
    l.push("");
  }

  l.push("---");
  l.push("");
  l.push(rodape(dossie));

  return l.join("\n");
}

/** O mesmo, em texto corrido — para quem cola num email sem markdown. */
export function paraTexto(dossie: DossieDeGuia, selecao?: Selecao): string {
  return paraMarkdown(dossie, selecao)
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^- /gm, "· ");
}

function linhaDe(seccao: SeccaoDossie, item: ItemDossie): string {
  if (seccao.id === "resumo") return `${item.texto}`;

  if (seccao.id === "elementos") {
    const marca = item.estado === "tenho" ? "x" : " ";
    const estado = item.estado ? ` — _${ROTULO_ESTADO_ELEMENTO[item.estado]}_` : "";
    return `${item.numero ?? "-"}. [${marca}] ${item.texto}${estado}`;
  }

  if (seccao.id === "aplicabilidade") {
    const sentido = item.sentido === "exclui" ? "não se aplica se" : "aplica-se se";
    const resposta = item.resposta ? ` → **${ROTULO_RESPOSTA[item.resposta]}**` : "";
    return `- (${sentido}) ${item.texto}${resposta}`;
  }

  if (seccao.id === "julgamento") {
    const peso = item.peso === "critical" ? "**crítico**" : item.peso === "high" ? "elevado" : "normal";
    const fontes =
      item.proveniencia.origem === "afirmacao" && item.proveniencia.fonteIds.length > 0
        ? ` — base legal: ${item.proveniencia.fonteIds.join(", ")}`
        : "";
    return `- [${peso}] ${item.texto}${fontes}`;
  }

  if (seccao.id === "base_legal" && item.fonte) {
    const artigo = item.fonte.artigo ? `, ${item.fonte.artigo}` : "";
    return `- **${item.fonte.autoridade}** · ${item.fonte.titulo}${artigo} — ${item.fonte.url} (verificada em ${data(item.fonte.verificadaEm)})`;
  }

  if (seccao.id === "prazos" && item.quando) {
    const ate = item.quando.ate ? ` até ${data(item.quando.ate)}` : "";
    return `- ${item.texto} — de ${data(item.quando.de)}${ate}`;
  }

  if (seccao.id === "historico" && item.data) {
    return `- ${data(item.data)} — ${item.texto}`;
  }

  return `- ${item.texto}`;
}

/** O cabeçalho que qualquer saída pode reutilizar. Exportado para teste. */
export const cabecalhoDe = referencia;
