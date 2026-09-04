// ═══════════════════════════════════════════════════════════════════════
//  O QUE OS QUATRO FORMATOS TÊM EM COMUM
//  ---------------------------------------------------------------------
//  Cabeçalho e rodapé são obrigatórios em todas as saídas (§6.4), e é aqui
//  que vivem — uma vez. Escritos em cada formato, seriam quatro frases
//  quase iguais e quatro oportunidades de alguém corrigir três.
//
//  O rodapé não é uma nota legal defensiva: é a fronteira do §10.5 no
//  único sítio onde o destinatário a lê. `dossie:copy` verifica que os
//  quatro formatos o levam.
// ═══════════════════════════════════════════════════════════════════════

import { impressaoCurta } from "../impressao";
import { RODAPE_DOSSIE, type DossieDeGuia, type ItemDossie, type SeccaoDossie, type Selecao } from "../tipos";

/** `2026-09-04` → `04/09/2026`. Sem `Intl`: a saída tem de ser estável. */
export function data(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

/**
 * As secções, filtradas pela seleção da consola.
 *
 * Sem seleção devolve tudo — é o caso de quem exporta o dossiê inteiro do
 * lado do cliente, antes de haver consola nenhuma. Com seleção, uma secção
 * de que nada foi escolhido não aparece: exportar um cabeçalho vazio é
 * ruído, e o §6.5 é explícito — «não permite exportar o que não está
 * selecionado».
 */
export function seccoesSelecionadas(
  dossie: DossieDeGuia,
  selecao?: Selecao,
): SeccaoDossie[] {
  if (!selecao) return dossie.seccoes;
  return dossie.seccoes
    .map((s) => ({ ...s, itens: s.itens.filter((i) => selecao.itens.has(i.id)) }))
    .filter((s) => s.itens.length > 0);
}

/** Todos os itens selecionados, achatados e por ordem de secção. */
export function itensSelecionados(
  dossie: DossieDeGuia,
  selecao?: Selecao,
): { seccao: SeccaoDossie; item: ItemDossie }[] {
  return seccoesSelecionadas(dossie, selecao).flatMap((seccao) =>
    seccao.itens.map((item) => ({ seccao, item })),
  );
}

/** A frase única que identifica a versão sobre que se está a falar. */
export function referencia(d: DossieDeGuia): string {
  return `guia «${d.guia.titulo}», versão de ${data(d.fixado.revistoEm)} (impressão ${impressaoCurta(d.fixado.impressao)})`;
}

/** O rodapé obrigatório, em texto corrido. */
export function rodape(d: DossieDeGuia): string {
  return `Gerado pelo Recibo Certo a partir do ${referencia(d)}. ${RODAPE_DOSSIE}`;
}
