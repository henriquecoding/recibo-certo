/**
 * O que RECUSA um layout, e o que a validação corrige antes de gravar.
 *
 * A distinção que este ficheiro existe para fixar não é «o servidor aceita
 * sobreposições» — NÃO aceita. `dashboard_layout_invalido()` na migração
 * `20260815220000` devolve `modulos_sobrepostos` e a gravação falha.
 *
 * A distinção é outra: `validarLayout` recebe um layout e devolve DUAS
 * coisas — uma lista de erros sobre o que ENTROU, e um layout normalizado
 * (compactado, sem sobreposições) que é o que deve SAIR. Sobreposição no
 * input é normal a meio de uma edição e resolve-se por compactação; o que
 * nunca pode acontecer é enviar o input em vez do output.
 *
 * O bug real que isto corrige: a loja de demonstração recusava gravar
 * sempre que `validarLayout` sinalizava sobreposição no input, e o
 * «Concluir edição» não fazia nada visível — apesar de o layout
 * normalizado ser perfeitamente gravável.
 *
 * Portanto:
 *   · sobreposição no INPUT  → corrige-se, não impede;
 *   · sobreposição no OUTPUT → é um bug nosso, e impede (o servidor
 *     recusaria de qualquer maneira, e é melhor descobri-lo aqui).
 */

import { colide, validarLayout } from "./layout";
import type {
  CodigoErroLayout, ResultadoValidacao, WorkspaceLayoutV2,
} from "./tipos";

/**
 * Os códigos que impedem gravar mesmo depois da normalização. Espelham os
 * `RETURN` de `dashboard_layout_invalido()`, tirando o de sobreposição —
 * esse é resolvido pela compactação antes de o payload sair.
 */
export const CODIGOS_FATAIS: readonly CodigoErroLayout[] = [
  "layout_nao_e_objeto",
  "versao_nao_suportada",
  "items_nao_e_lista",
  "demasiados_modulos",
  "instanceId_invalido",
  "instanceId_repetido",
  "tipo_desconhecido",
  "tag_invalida",
  "tag_nao_corresponde_ao_tipo",
  "tag_repetida",
  "config_com_chave_nao_permitida",
  "col_invalida",
  "row_invalida",
  "colSpan_invalido",
  "rowSpan_invalido",
  "modulo_transborda_a_grelha",
  "colSpan_fora_do_registry",
  "rowSpan_fora_do_registry",
];

/** Corrigido pela normalização — não impede gravar o layout normalizado. */
export const CODIGOS_NORMALIZAVEIS: readonly CodigoErroLayout[] = ["modulos_sobrepostos"];

export function eFatal(codigo: CodigoErroLayout): boolean {
  return CODIGOS_FATAIS.includes(codigo);
}

/** O primeiro erro do input que a normalização não resolve. */
export function erroQueImpedeGravar(r: ResultadoValidacao): CodigoErroLayout | null {
  return r.erros.find((e) => eFatal(e.codigo))?.codigo ?? null;
}

export function podeGravar(r: ResultadoValidacao): boolean {
  return erroQueImpedeGravar(r) === null;
}

/** Dois módulos visíveis a ocupar a mesma célula? O servidor recusaria. */
export function temSobreposicao(layout: WorkspaceLayoutV2): boolean {
  const visiveis = layout.items.filter((i) => !i.hidden).map((i) => i.desktop);
  return visiveis.some((p, i) => colide(p, visiveis.slice(i + 1)));
}

export type ResultadoParaGravar =
  | { ok: true; layout: WorkspaceLayoutV2 }
  | { ok: false; motivo: CodigoErroLayout };

/**
 * Prepara um layout para gravação: normaliza, e confirma que o que sai é
 * aceitável para o servidor.
 *
 * A segunda verificação não é redundante. `compactarVertical` devia deixar
 * o layout sem sobreposições; se algum dia não deixar, o servidor recusa
 * com `modulos_sobrepostos` e a mensagem que a pessoa vê não explica nada.
 * Falhar aqui transforma isso num bug detetável em vez de um erro de rede
 * inexplicável.
 */
export function prepararParaGravar(entrada: unknown): ResultadoParaGravar {
  const r = validarLayout(entrada);
  const impedimento = erroQueImpedeGravar(r);
  if (impedimento) return { ok: false, motivo: impedimento };
  if (temSobreposicao(r.layout)) return { ok: false, motivo: "modulos_sobrepostos" };
  return { ok: true, layout: r.layout };
}
