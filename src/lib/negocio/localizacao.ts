// ═══════════════════════════════════════════════════════════════════════
//  ONDE É QUE O NEGÓCIO ACONTECE — um acessor, não seis leituras
//  ---------------------------------------------------------------------
//  §59 do relatório. A região estava enterrada em `fiscal.regiao` e cada
//  motor voltava a pedi-la: o simulador de empresa pergunta a
//  localização, o de IVA a região, o comparador a residência fiscal. É a
//  mesma resposta três vezes, e três oportunidades de divergirem — sem
//  ninguém dar por isso, porque cada ecrã continua coerente consigo
//  próprio.
//
//  Este ficheiro é o único sítio onde se decide QUAL região vale. Todo o
//  resto do domínio chama `regiaoDoNegocio()`.
// ═══════════════════════════════════════════════════════════════════════

import { META_REGIAO, type Regiao } from "@/lib/fiscal-data";
import {
  parametrosFiscaisPorRegiao,
  TODAS_LOCALIZACOES,
  type ParametrosFiscaisRegiao,
} from "@/lib/incentivos-regioes";
import type { ContextoNegocio, LocalizacaoNegocio } from "./tipos";

/**
 * A região que vale para este negócio.
 *
 * A ordem é: a localização declarada, depois o campo legado, depois o
 * continente. O legado fica no meio de propósito — um projeto guardado
 * antes de `localizacao` existir tem lá a resposta da pessoa, e
 * ignorá-la para usar o valor por omissão seria perder trabalho dela.
 */
export function regiaoDoNegocio(contexto: ContextoNegocio | undefined): Regiao {
  return contexto?.localizacao?.regiao ?? contexto?.fiscal?.regiao ?? "continente";
}

/** A região foi DECLARADA, ou está a ser assumida? */
export function regiaoDeclarada(contexto: ContextoNegocio | undefined): boolean {
  if (contexto?.localizacao) return contexto.localizacao.origem === "utilizador";
  return contexto?.fiscal?.regiao !== undefined;
}

/** O município declarado, ou `undefined`. Nunca derivado da região. */
export function municipioDoNegocio(contexto: ContextoNegocio | undefined): string | undefined {
  return contexto?.localizacao?.municipio;
}

/**
 * Os parâmetros fiscais da localização, quando ela chega para os
 * determinar.
 *
 * ⚠️ `undefined` para «continente» sem município. §111: «localização
 * incompleta não vira município inventado» — e `parametrosFiscaisPorRegiao`
 * devolve os da Área Metropolitana de Lisboa quando não reconhece o id,
 * que é exatamente o município que não se pode inventar.
 */
export function parametrosDaLocalizacao(
  contexto: ContextoNegocio | undefined,
): ParametrosFiscaisRegiao | undefined {
  const loc = contexto?.localizacao;

  if (loc?.regiaoIncentivoId) {
    const params = TODAS_LOCALIZACOES.find((p) => p.regiaoId === loc.regiaoIncentivoId);
    if (params) return params;
  }

  // As autónomas têm parâmetros próprios e conhecidos: são regiões, não
  // municípios, e por isso podem ser resolvidas só com a região.
  const regiao = regiaoDoNegocio(contexto);
  if (regiao === "madeira" || regiao === "acores") return parametrosFiscaisPorRegiao(regiao);

  return undefined;
}

/** Uma localização nova, sempre com proveniência declarada. */
export function localizacaoDeclarada(
  regiao: Regiao,
  opcoes: { municipio?: string; regiaoIncentivoId?: string } = {},
): LocalizacaoNegocio {
  return {
    regiao,
    municipio: opcoes.municipio,
    regiaoIncentivoId: opcoes.regiaoIncentivoId,
    origem: "utilizador",
  };
}

/** O nome legível da localização, para a interface e para o handoff. */
export function nomeDaLocalizacao(contexto: ContextoNegocio | undefined): string {
  const loc = contexto?.localizacao;
  if (loc?.municipio) return loc.municipio;
  const params = parametrosDaLocalizacao(contexto);
  if (params) return params.nome;
  return META_REGIAO[regiaoDoNegocio(contexto)];
}

/** As localizações municipais que o catálogo de incentivos conhece. */
export const LOCALIZACOES_CONHECIDAS = TODAS_LOCALIZACOES;
