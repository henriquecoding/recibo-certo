// ═══════════════════════════════════════════════════════════════════════
//  CSV — os elementos, para folha de cálculo
//  ---------------------------------------------------------------------
//  Uma linha por item, com o número. É a forma da lista PBC, e é a razão
//  pela qual a numeração existe: o cliente responde «o 3 já tenho» e o
//  nome do ficheiro que envia leva o mesmo número.
//
//  BOM à cabeça. Sem ele, o Excel em português abre «Retenção» como
//  «RetenÃ§Ã£o» — e ninguém corrige a codificação, corrige-se o texto à
//  mão ou desiste-se do ficheiro.
// ═══════════════════════════════════════════════════════════════════════

import { ROTULO_ESTADO_ELEMENTO, ROTULO_ORIGEM, ROTULO_RESPOSTA, type DossieDeGuia, type Selecao } from "../tipos";
import { data, itensSelecionados, rodape } from "./comum";

export const BOM = "﻿";

const CABECALHO = [
  "n", "seccao", "item", "estado", "origem", "referencia", "prazo",
] as const;

/** Escapa um campo. Aspas duplicadas e o campo entre aspas, sempre. */
export function celula(v: string | number | undefined): string {
  const s = v === undefined || v === null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function paraCsv(dossie: DossieDeGuia, selecao?: Selecao): string {
  const linhas: string[] = [CABECALHO.map(celula).join(",")];

  let n = 0;
  for (const { seccao, item } of itensSelecionados(dossie, selecao)) {
    n += 1;
    const estado =
      item.estado ? ROTULO_ESTADO_ELEMENTO[item.estado]
      : item.resposta ? ROTULO_RESPOSTA[item.resposta]
      : item.peso ? item.peso
      : "";
    const referencia =
      item.fonte ? `${item.fonte.titulo}${item.fonte.artigo ? `, ${item.fonte.artigo}` : ""} — ${item.fonte.url}`
      : item.proveniencia.origem === "afirmacao" ? item.proveniencia.fonteIds.join(" ")
      : item.proveniencia.origem === "motor" ? item.proveniencia.ruleKey
      : "";
    linhas.push(
      [
        celula(item.numero ?? n),
        celula(seccao.titulo),
        celula(item.texto),
        celula(estado),
        celula(ROTULO_ORIGEM[item.proveniencia.origem]),
        celula(referencia),
        celula(item.quando?.ate ? data(item.quando.ate) : ""),
      ].join(","),
    );
  }

  // O rodapé obrigatório entra como linha de comentário do próprio CSV: um
  // ficheiro que sai da plataforma sem ele seria o único dos quatro
  // formatos a poder ser lido como parecer.
  linhas.push("");
  linhas.push(celula(rodape(dossie)));

  return BOM + linhas.join("\r\n") + "\r\n";
}
