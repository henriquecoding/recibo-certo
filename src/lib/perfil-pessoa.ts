// ═══════════════════════════════════════════════════════════════════════
//  A SITUAÇÃO PESSOAL — um contrato, não cinco
//  ---------------------------------------------------------------------
//  §43 do relatório. O Recibo Certo tem quatro sítios que descrevem a
//  mesma coisa — a situação pessoal de quem é tributado — e cada um
//  descrevia-a à sua maneira:
//
//   · `SituacaoRetencao` (fiscal-dependente) — a mais completa;
//   · `PerfilGerente` (fiscal-empresa) — quatro campos;
//   · `PreferenciasFiscais` (store) — a versão persistida;
//   · o simulador de IRS, com os seus próprios estados.
//
//  «Não criar uma quinta versão de perfil fiscal.» Este ficheiro não cria
//  uma: ESTENDE a que já é canónica (`SituacaoRetencao`, a que as tabelas
//  de retenção usam) com as duas coisas que ela não tem — o IRS Jovem e as
//  opções anuais de declaração.
//
//  ── A CONFUSÃO QUE ISTO EXISTE PARA DESFAZER ───────────────────────
//  `PerfilGerente` tinha um booleano `conjunta` e mapeava-o assim:
//
//      maritalStatus: perfil.conjunta ? "casadoUnico" : "naoCasado"
//
//  São conceitos DIFERENTES, e a confusão custa dinheiro:
//
//   · «tributação conjunta» é uma opção da declaração anual de IRS
//     (Art. 13.º, n.º 2 do CIRS). Diz respeito ao apuramento do imposto;
//   · «casado, único titular» é uma TABELA DE RETENÇÃO (Despacho anual).
//     Só se aplica quando um dos cônjuges não aufere rendimentos.
//
//  Um casal em que ambos trabalham e que opta pela tributação conjunta
//  retém pela tabela de DOIS titulares — e o mapeamento antigo dava-lhe a
//  tabela de único titular, que retém menos. O erro aparecia como um
//  líquido mais alto do que o real, no lado da empresa e só nesse lado,
//  o que enviesava a comparação inteira.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoCivilRet, Regiao } from "@/lib/fiscal-data";
import type { SituacaoRetencao } from "@/lib/fiscal-dependente";

/**
 * Tudo o que se sabe sobre a situação pessoal de quem é tributado.
 *
 * Todos os campos são opcionais: um perfil é sempre PARCIAL, e a
 * diferença entre «respondeu que não» e «ainda não respondeu» é o que
 * separa uma estimativa personalizada de uma que finge sê-lo.
 */
export interface PerfilFiscalPessoa extends SituacaoRetencao {
  /** Ano de benefício do IRS Jovem (1 a 10). 0/omisso = não aplicável. */
  irsJovemAno?: number;
  /**
   * IFICI (Art. 58.º-A EBF): taxa de 20% sobre rendimentos elegíveis das
   * categorias A e B. Não é situação familiar — é um estatuto — mas
   * acompanha sempre a pessoa nos mesmos ecrãs.
   */
  ifici?: boolean;
  /**
   * Opção pela tributação CONJUNTA na declaração anual (Art. 13.º, n.º 2
   * do CIRS).
   *
   * ⚠️ NÃO é `estadoCivil`. Ver o cabeçalho: um casal com dois
   * rendimentos pode optar pela conjunta e retém à tabela de dois
   * titulares. Guardar as duas coisas no mesmo booleano foi o defeito que
   * este ficheiro veio corrigir.
   */
  conjunta?: boolean;
}

export const PERFIL_PESSOA_VAZIO: PerfilFiscalPessoa = {};

/**
 * A tabela de retenção que corresponde a esta situação.
 *
 * Explícita, e nunca derivada de `conjunta`. Quando o estado civil não é
 * conhecido, devolve `naoCasado` — que é o valor por omissão das próprias
 * tabelas e o único que não presume um cônjuge que ninguém declarou.
 */
export function tabelaDeRetencao(p: PerfilFiscalPessoa): EstadoCivilRet {
  return p.estadoCivil ?? "naoCasado";
}

/** A situação pessoal foi mesmo declarada, ou está toda por preencher? */
export function perfilDeclarado(p: PerfilFiscalPessoa | undefined): boolean {
  if (!p) return false;
  return (
    p.estadoCivil !== undefined ||
    (p.dependentes ?? 0) > 0 ||
    p.regiao !== undefined ||
    p.deficiencia === true ||
    (p.irsJovemAno ?? 0) > 0 ||
    p.ifici === true ||
    p.conjunta === true
  );
}

/**
 * Quantos campos deste perfil estão respondidos.
 *
 * A interface usa-o para dizer «personalizado com 3 respostas tuas» em
 * vez de apresentar uma estimativa genérica como se fosse pessoal.
 */
export function camposRespondidos(p: PerfilFiscalPessoa | undefined): string[] {
  if (!p) return [];
  const campos: string[] = [];
  if (p.estadoCivil !== undefined) campos.push("estadoCivil");
  if ((p.dependentes ?? 0) > 0) campos.push("dependentes");
  if (p.regiao !== undefined) campos.push("regiao");
  if (p.deficiencia !== undefined) campos.push("deficiencia");
  if ((p.irsJovemAno ?? 0) > 0) campos.push("irsJovemAno");
  if (p.ifici !== undefined) campos.push("ifici");
  if (p.conjunta !== undefined) campos.push("conjunta");
  return campos;
}

/** Rótulos para a interface, sem repetir strings em três componentes. */
export const ROTULO_ESTADO_CIVIL: Record<EstadoCivilRet, string> = {
  naoCasado: "Não casado",
  casadoUnico: "Casado, único titular",
  casadoDois: "Casado, dois titulares",
};

export const EXPLICACAO_ESTADO_CIVIL: Record<EstadoCivilRet, string> = {
  naoCasado: "Solteiro, divorciado, viúvo — ou casado a declarar em separado.",
  casadoUnico: "Casado e só um dos dois aufere rendimentos.",
  casadoDois: "Casados e ambos auferem rendimentos.",
};

export const ESTADOS_CIVIS: readonly EstadoCivilRet[] = [
  "naoCasado",
  "casadoUnico",
  "casadoDois",
];

/** A região do perfil, com o valor por omissão explícito. */
export const regiaoDoPerfil = (p: PerfilFiscalPessoa | undefined): Regiao =>
  p?.regiao ?? "continente";
