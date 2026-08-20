// ═══════════════════════════════════════════════════════════════════════
//  A PRECEDÊNCIA — quem ganha quando há duas respostas para a mesma coisa
//  ---------------------------------------------------------------------
//  §22 do relatório. O simulador de empresa passa a poder receber estado
//  de três sítios ao mesmo tempo:
//
//    · um cenário que a pessoa carregou para reabrir;
//    · um handoff acabado de sair do Estúdio;
//    · defaults do próprio simulador.
//
//  Sem uma regra escrita, a ordem passa a ser a ordem por que os `useEffect`
//  correm — que é uma coisa que ninguém decidiu e que muda com um refactor.
//
//  ── A REGRA ────────────────────────────────────────────────────────
//  ① Um cenário REABERTO ganha sempre. A pessoa carregou num botão que
//     diz «reabrir este cenário»; sobrepor-lhe um handoff de há uma hora
//     fazia o botão parecer que não funcionava — exatamente o defeito que
//     o estúdio já tinha corrigido para os seus próprios rascunhos.
//  ② O handoff ganha aos defaults. É informação da pessoa; um default é
//     um palpite nosso.
//  ③ Os defaults só preenchem o que ninguém respondeu.
//
//  ── E OS DEFAULTS DEIXAM DE SER FACTOS (§81-82) ────────────────────
//  Esta é a parte que mais custa esquecer. O simulador soma, por omissão,
//  uma estimativa de contabilidade e software aos custos de estrutura.
//  Quando o projeto JÁ TRAZ estrutura declarada, somar a estimativa por
//  cima conta a contabilidade duas vezes: a real e a nossa. O valor
//  importado SUBSTITUI o default equivalente — não se acrescenta a ele.
// ═══════════════════════════════════════════════════════════════════════

import type { HandoffNegocioEmpresaV1 } from "@/lib/negocio/adapters/empresa-handoff";
import {
  normalizarSnapshotEmpresa,
  primeiroPassoPendente,
  type PassoEmpresa,
  type SnapshotEmpresaGuiada,
} from "./snapshot";

/** De onde veio o estado com que o simulador abriu. */
export type FonteEstadoEmpresa = "cenario" | "handoff" | "defaults";

export interface EstadoEmpresaResolvido {
  /** O snapshot a aplicar. Só contém o que alguma fonte respondeu. */
  snapshot: SnapshotEmpresaGuiada;
  fonte: FonteEstadoEmpresa;
  /** Em que passo abrir (§21). */
  passo: PassoEmpresa;
  /** O handoff a mostrar no banner, quando foi ele a ganhar. */
  handoff: HandoffNegocioEmpresaV1 | null;
  /**
   * `true` quando havia um handoff E um cenário reaberto. A pessoa fica a
   * saber que existe um projeto mais recente, e decide — §69: não abrir um
   * modal de conflito em cada carregamento.
   */
  handoffPreterido: boolean;
}

export interface EntradasEstadoEmpresa {
  /** O instantâneo de um cenário que a pessoa mandou reabrir. */
  cenario?: unknown;
  handoff?: HandoffNegocioEmpresaV1 | null;
}

/**
 * Resolve com que estado o simulador abre.
 *
 * Função pura. Não lê armazenamento — recebe o que já foi lido, para que
 * a regra de precedência possa ser testada sem browser nenhum.
 */
export function resolverEstadoEmpresa(
  entradas: EntradasEstadoEmpresa = {},
): EstadoEmpresaResolvido {
  const doCenario = entradas.cenario ? normalizarSnapshotEmpresa(entradas.cenario) : null;
  const handoff = entradas.handoff ?? null;

  // ① O cenário reaberto ganha sempre.
  if (doCenario && Object.keys(doCenario).length > 0) {
    return {
      snapshot: doCenario,
      fonte: "cenario",
      // Um cenário reaberto mostra logo o resultado guardado: a pessoa
      // veio ver o que tinha, não voltar a responder.
      passo: "resultado",
      handoff: null,
      handoffPreterido: handoff !== null,
    };
  }

  // ② O handoff ganha aos defaults.
  if (handoff && handoff.estado !== "bloqueado") {
    const snapshot = normalizarSnapshotEmpresa(handoff.prefill);
    return {
      snapshot,
      fonte: "handoff",
      passo: primeiroPassoPendente(snapshot),
      handoff,
      handoffPreterido: false,
    };
  }

  // ③ Defaults.
  return {
    snapshot: {},
    fonte: "defaults",
    passo: 0,
    handoff: null,
    handoffPreterido: false,
  };
}

// ─── Os defaults que deixam de se somar (§81-82) ───────────────────────

/**
 * Os custos de estrutura com que o simulador abre.
 *
 * Quando o projeto traz estrutura declarada, é ELA — e as estimativas
 * padrão de contabilidade e software ficam de fora. O contrário somava a
 * contabilidade duas vezes, e o erro não dava sinal nenhum: 2 400 € ou
 * 4 200 € são ambos plausíveis para uma empresa nova.
 *
 * Devolve também a frase que a interface deve dizer, porque um número que
 * muda sem explicação é indistinguível de um erro.
 */
export function custosEstruturaIniciais(
  snapshot: SnapshotEmpresaGuiada,
  defaults: number,
): { valor: number; substituiuDefaults: boolean; nota?: string } {
  const importado = snapshot.custosEstrutura;
  if (importado === undefined || importado <= 0) {
    return { valor: defaults, substituiuDefaults: false };
  }
  return {
    valor: importado,
    substituiuDefaults: true,
    nota:
      "O teu projeto já inclui estrutura. Não adicionámos as estimativas padrão de contabilidade e software por cima.",
  };
}

/**
 * As chaves do snapshot que estão mesmo preenchidas.
 *
 * A contagem do banner («importámos 6 respostas») sai daqui e não de um
 * número escrito à mão — senão diverge do que foi aplicado assim que
 * alguém acrescentar um campo.
 */
export function camposImportados(s: SnapshotEmpresaGuiada): string[] {
  return Object.entries(s)
    .filter(([chave, valor]) => {
      if (chave === "versao") return false;
      if (valor === undefined || valor === null) return false;
      if (typeof valor === "number") return valor > 0;
      if (typeof valor === "string") return valor.length > 0;
      return true;
    })
    .map(([chave]) => chave);
}
