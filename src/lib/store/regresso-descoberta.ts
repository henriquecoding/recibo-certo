"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O BILHETE DE REGRESSO — SIMULADOR → DESCOBERTA → SIMULADOR
//  ---------------------------------------------------------------------
//  ┌──────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTAVA PARTIDO                                              │
//  │                                                                  │
//  │ A terceira porta do simulador de empresa («ainda não sei que     │
//  │ negócio vou ter») era uma viagem só de ida. A pessoa saía para o  │
//  │ motor de descoberta, encontrava lá uma hipótese — e o caminho de  │
//  │ volta ao simulador que a mandou embora não existia em lado        │
//  │ nenhum. Tinha de se lembrar de onde tinha vindo.                  │
//  │                                                                  │
//  │ Mandar alguém embora é fácil; o valor está em recebê-lo de volta  │
//  │ com a resposta que lhe faltava.                                  │
//  └──────────────────────────────────────────────────────────────────┘
//
//  ── O QUE ESTE BILHETE LEVA ────────────────────────────────────────
//  Um id de ferramenta. Nada mais: nem faturação, nem competências, nem
//  zona, nem sequer o passo em que a pessoa ia. É uma DIREÇÃO, não um
//  estado — e é por isso que ele pode existir ao lado das duas pontes com
//  dados (`handoff-negocio-empresa`, `handoff-descoberta-negocio`) sem as
//  duplicar. Quem quiser levar números leva-os por lá, com o ecrã de
//  revisão que essas pontes têm.
//
//  ── E NÃO VAI NO URL (§10) ─────────────────────────────────────────
//  Um `?voltar=simulador-empresa` sobreviveria no histórico, nos logs de
//  quem servir a página e no `document.referrer` — e diria a terceiros que
//  esta pessoa foi ao motor de descoberta porque não sabia o que ia
//  vender. É pouca informação, mas é informação sobre ela, e a régua deste
//  produto não muda com o tamanho do dado.
//
//  ── AS QUATRO PROPRIEDADES DE SEMPRE ───────────────────────────────
//  · SCOPED — vive no cofre de quem está com sessão;
//  · VERSIONED — um envelope de outro esquema é recusado inteiro;
//  · TTL — ver a nota de `REGRESSO_TTL_MS`;
//  · CONSUME-ONCE — mas só no fim. Ao contrário das pontes com dados,
//    este bilhete é ESPREITADO enquanto a pessoa trabalha na descoberta
//    (que dura, e que se recarrega), e só é consumido quando ela volta ou
//    quando o dispensa. Consumi-lo à entrada fazia o convite desaparecer
//    ao primeiro F5 — que é precisamente quando ele ainda era preciso.
// ═══════════════════════════════════════════════════════════════════════

import { ehSimuladorDeOrigem, type SimuladorDeOrigem } from "@/lib/simuladores/porta-descoberta";
import { chaveAtiva } from "./cofre";
import { gravarChave, lerChave, removerChave } from "./persistencia";

const CHAVE = () => chaveAtiva("regresso-descoberta");

/** A versão do envelope. Sobe quando a forma mudar. */
export const REGRESSO_VERSAO = 1;

/**
 * Doze horas — muito mais do que as duas da ponte com dados, e de
 * propósito.
 *
 * As pontes com dados são curtas porque o que lá está ENVELHECE: uma
 * estrutura de custos de há duas horas já não descreve o projeto, e
 * pré-preencher com ela é pior do que pedir. Este bilhete não tem nada
 * para envelhecer — só uma direção — e o trabalho que ele atravessa é de
 * outra ordem de grandeza: escolher um negócio não se faz no tempo de ir
 * buscar um café. Expirar ao fim de duas horas fechava a porta de volta a
 * meio da tarefa que a justificou.
 *
 * O limite existe na mesma: passado um dia de trabalho, um convite a
 * voltar a um simulador que já ninguém tem em mente é ruído.
 */
export const REGRESSO_TTL_MS = 12 * 60 * 60 * 1000;

interface EnvelopeRegresso {
  versao: typeof REGRESSO_VERSAO;
  gravadoEm: number;
  origem: SimuladorDeOrigem;
}

// ─── Escrever ──────────────────────────────────────────────────────────

/**
 * Marca de onde a pessoa saiu.
 *
 * Silencioso por desenho, como as outras pontes: sem armazenamento (modo
 * privado, quota cheia) o motor de descoberta abre na mesma — só não
 * oferece o caminho de volta. Uma ferramenta que se recusa a abrir porque
 * não guardou uma conveniência é pior do que a conveniência que perdeu.
 */
export function guardarRegressoAoSimulador(origem: SimuladorDeOrigem): boolean {
  if (!ehSimuladorDeOrigem(origem)) return false;
  const envelope: EnvelopeRegresso = {
    versao: REGRESSO_VERSAO,
    gravadoEm: Date.now(),
    origem,
  };
  return gravarChave(CHAVE(), JSON.stringify(envelope)).ok;
}

// ─── Ler ───────────────────────────────────────────────────────────────

/**
 * Espreita sem consumir. É o que o convite usa para decidir se aparece.
 *
 * Devolve `null` a qualquer sinal de estranheza — versão errada, JSON
 * ilegível, fora do prazo, ferramenta que este contrato não conhece. Um
 * estado que não se percebe nunca pode impedir a descoberta de abrir.
 */
export function espreitarRegressoAoSimulador(): SimuladorDeOrigem | null {
  const bruto = lerChave(CHAVE());
  if (!bruto) return null;

  try {
    const lido: unknown = JSON.parse(bruto);
    if (!lido || typeof lido !== "object") return null;

    const env = lido as Partial<EnvelopeRegresso>;
    if (env.versao !== REGRESSO_VERSAO) return null;
    if (typeof env.gravadoEm !== "number" || !Number.isFinite(env.gravadoEm)) return null;
    // Um `gravadoEm` no futuro é relógio trocado, não um bilhete válido.
    const idade = Date.now() - env.gravadoEm;
    if (idade < 0 || idade > REGRESSO_TTL_MS) return null;

    return ehSimuladorDeOrigem(env.origem) ? env.origem : null;
  } catch {
    return null;
  }
}

/**
 * Lê E APAGA. É o que se chama quando a pessoa volta — ou quando dispensa
 * o convite.
 *
 * Apagar mesmo quando a validação falha é deliberado: um envelope que não
 * passa hoje também não passa amanhã, e deixá-lo lá garantia que voltava a
 * falhar em cada abertura.
 */
export function consumirRegressoAoSimulador(): SimuladorDeOrigem | null {
  const origem = espreitarRegressoAoSimulador();
  limparRegressoAoSimulador();
  return origem;
}

export function limparRegressoAoSimulador(): void {
  removerChave(CHAVE());
}
