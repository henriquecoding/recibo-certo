// ═══════════════════════════════════════════════════════════════════════
//  MIGRAÇÃO v1 → v2 — o trabalhador deixou de ser três campos
//  ---------------------------------------------------------------------
//  §70-71 do relatório. Um `ContextoNegocio` guardado antes desta versão
//  tem trabalhadores assim:
//
//      { salarioBrutoMensal, meses: 12 | 14, entraNoMes }
//
//  e a v2 espera `remuneracao`, `contrato` e o resto. Um `as
//  ContextoNegocio` sobre o objeto antigo compilava e rebentava na
//  primeira leitura de `t.remuneracao.salarioBaseMensal` — em produção, no
//  browser de quem tinha um rascunho por acabar.
//
//  ── A REGRA QUE MAIS CUSTA ESQUECER (§71) ──────────────────────────
//  «Não inventar semântica que o campo antigo não guardava.»
//
//  `meses: 14` diz que a conta antiga já incluía subsídios: é o
//  pagamento normal, e migra-se para `normal` sem perder nada.
//
//  `meses: 12` NÃO diz que não há direito a subsídios — os subsídios de
//  férias e de Natal são lei, não uma opção do empregador. Diz apenas que
//  a conta antiga não os continha. Migrar para `normal` mudaria o custo
//  daquela pessoa em dois salários por ano, sem ela ter tocado em nada;
//  migrar para «sem subsídios» afirmaria uma coisa que o campo nunca
//  guardou.
//
//  Por isso vai para `legado`: mantém a conta que ela tinha E levanta um
//  pressuposto para ela confirmar o calendário. Um número que muda
//  sozinho é indistinguível de um erro; um pressuposto declarado é uma
//  pergunta.
// ═══════════════════════════════════════════════════════════════════════

import { uid } from "../fabrica";
import type {
  ContextoNegocio,
  TrabalhadorPlaneado,
  TrabalhadorPlaneadoV1,
} from "../tipos";

/** A forma de um contexto guardado na v1. */
export interface ContextoNegocioV1 extends Omit<ContextoNegocio, "versao" | "estrutura"> {
  versao: 1;
  estrutura: Omit<ContextoNegocio["estrutura"], "trabalhadores"> & {
    trabalhadores?: TrabalhadorPlaneadoV1[];
  };
}

const numero = (v: unknown, omissao = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : omissao;

/** Um trabalhador da v1, no contrato novo. */
export function migrarTrabalhadorV1ParaV2(bruto: unknown): TrabalhadorPlaneado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const t = bruto as Partial<TrabalhadorPlaneadoV1> & Partial<TrabalhadorPlaneado>;

  // Já está na v2? Devolve-se como está — a migração é idempotente, e tem
  // de o ser: corre a cada leitura do rascunho.
  if (t.remuneracao && typeof t.remuneracao === "object") {
    return {
      id: typeof t.id === "string" && t.id ? t.id : uid("trb"),
      funcao: typeof t.funcao === "string" ? t.funcao : "",
      remuneracao: { salarioBaseMensal: numero(t.remuneracao.salarioBaseMensal) },
      contrato: {
        inicioMes: numero(t.contrato?.inicioMes),
        pagamentoSubsidios: t.contrato?.pagamentoSubsidios ?? "normal",
      },
      refeicao: t.refeicao,
      seguroAT: t.seguroAT,
      sst: t.sst,
      formacao: t.formacao,
      outrosAnual: t.outrosAnual,
      perfil: t.perfil,
      capacidade: t.capacidade,
    };
  }

  const bruto12ou14 = numero(t.salarioBrutoMensal);
  const meses = numero(t.meses, 14);

  return {
    id: typeof t.id === "string" && t.id ? t.id : uid("trb"),
    funcao: typeof t.funcao === "string" ? t.funcao : "",
    remuneracao: { salarioBaseMensal: bruto12ou14 },
    contrato: {
      inicioMes: numero(t.entraNoMes),
      // ⚠️ A decisão do §71, e a única que importa nesta migração.
      pagamentoSubsidios: meses === 14 ? "normal" : "legado",
    },
    // O resto não existia na v1 e fica por declarar. Preenchê-lo com
    // valores por omissão inventaria respostas: um subsídio de refeição
    // que ninguém disse existir, um seguro com um prémio que ninguém
    // orçamentou.
  };
}

/**
 * Um contexto da v1, na v2.
 *
 * Só toca no que mudou. Ofertas, estrutura, procura, caixa e preferências
 * fiscais atravessam intactos — uma migração que reescreve o que não
 * precisa de mudar é uma migração que pode perder alguma coisa.
 */
export function migrarNegocioV1ParaV2(bruto: unknown): ContextoNegocio | null {
  if (!bruto || typeof bruto !== "object") return null;
  const c = bruto as Omit<Partial<ContextoNegocio>, "versao"> & {
    versao?: number;
    estrutura?: Record<string, unknown>;
  };

  if (c.versao !== 1 && c.versao !== 2) return null;
  if (typeof c.id !== "string" || !c.id) return null;
  if (!Array.isArray(c.ofertas)) return null;
  if (!c.estrutura || typeof c.estrutura !== "object") return null;

  const antigos = Array.isArray(c.estrutura.trabalhadores) ? c.estrutura.trabalhadores : [];
  const trabalhadores = antigos
    .map(migrarTrabalhadorV1ParaV2)
    .filter((t): t is TrabalhadorPlaneado => t !== null);

  return {
    ...(c as ContextoNegocio),
    versao: 2,
    estrutura: {
      ...(c.estrutura as ContextoNegocio["estrutura"]),
      trabalhadores: trabalhadores.length > 0 ? trabalhadores : undefined,
    },
  };
}

/** Precisa de migração? Serve para a interface poder avisar. */
export function precisaMigrar(bruto: unknown): boolean {
  if (!bruto || typeof bruto !== "object") return false;
  return (bruto as { versao?: unknown }).versao === 1;
}
