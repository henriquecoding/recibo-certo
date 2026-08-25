// ═══════════════════════════════════════════════════════════════════════
//  RELAXAMENTO CONTROLADO — zero resultados é um princípio, não um beco
//  ---------------------------------------------------------------------
//  O `diagnosticoVazio` já diz POR QUE É QUE está vazio, e isso foi um
//  salto: antes dizia «nada passou os critérios», que é verdade e não é
//  resposta. Mas continuava a terminar a conversa. A pessoa fica a saber
//  que as suas recusas apagaram tudo, e não fica a saber QUAL delas, nem
//  quanto custaria mudar de ideias sobre ela.
//
//  Este módulo responde a isso com a mesma disciplina do painel de
//  bloqueios: cada saída é MEDIDA, não estimada. Muda-se uma coisa de
//  cada vez, corre-se o motor outra vez, e conta-se quantas hipóteses
//  aparecem. «Se aceitares atendimento remoto, abrem 4» é uma contagem,
//  não uma promessa.
//
//  ── AS QUATRO REGRAS ───────────────────────────────────────────────
//   1. **Uma mudança de cada vez, enquanto uma chegar.** Combinar
//      relaxações daria um número maior e uma escolha impossível de
//      avaliar: a pessoa tem de poder dizer «esta sim, essa não». Só
//      quando NENHUMA mudança isolada abre alguma coisa é que se tentam
//      pares — e nunca mais do que dois. Ver a nota em
//      `calcularRelaxamentos` para a medição que obrigou a isso.
//   2. **Só o que a pessoa escolheu.** Relaxa-se o que ela declarou —
//      uma recusa, um teto de capital, um prazo. Nunca se relaxa uma
//      competência que ela não tem nem um meio estrutural que lhe falta:
//      isso não é um compromisso, é ficção.
//   3. **Efeito zero não se mostra.** Uma sugestão que não abre nada é
//      pior do que nenhuma — gasta uma decisão e devolve o mesmo ecrã.
//   4. **Não inventa alternativas.** Se nenhuma relaxação abrir nada, a
//      lista sai vazia e a interface diz isso. Encher com opções que não
//      funcionam seria a versão educada de mentir.
// ═══════════════════════════════════════════════════════════════════════

import { RESTRICOES } from "../contexto/perguntas";
import type { OpportunityContext } from "../contexto/tipos";

/** O que muda, porquê, e quanto abre. */
export interface Relaxamento {
  id: string;
  /** O que a pessoa passa a aceitar, em pt-PT e na primeira pessoa. */
  rotulo: string;
  /** Porque é que esta escolha estava a fechar o espaço. */
  porque: string;
  /**
   * Hipóteses que passam a aparecer. CONTADO a correr o motor com a
   * mudança aplicada — nunca estimado a partir do grafo.
   */
  hipotesesQueAbriria: number;
  /** O contexto com a mudança feita, pronto a aplicar se a pessoa quiser. */
  contexto: OpportunityContext;
}

interface Candidata {
  id: string;
  rotulo: string;
  porque: string;
  aplicar: (contexto: OpportunityContext) => OpportunityContext | null;
}

/**
 * Os degraus de capital que o configurador oferece.
 *
 * Relaxar capital é subir UM degrau, não abrir o teto: «e se tivesses 50
 * mil?» não é um compromisso que alguém possa fazer, e a resposta certa a
 * quem tem 200 € é o que abre com 1 000, não o que abre com uma fortuna.
 */
const DEGRAUS_CAPITAL: readonly number[] = Object.freeze([200, 1000, 5000, 20000, 50000]);

/** O mesmo, para o prazo até à primeira receita. */
const DEGRAUS_PRAZO: readonly number[] = Object.freeze([1, 3, 6, 12]);

function proximoDegrau(degraus: readonly number[], atual: number): number | null {
  const seguinte = degraus.find((valor) => valor > atual);
  return seguinte ?? null;
}

function candidatas(contexto: OpportunityContext): readonly Candidata[] {
  const lista: Candidata[] = [];

  // ── Recusas declaradas, uma a uma ─────────────────────────────────
  //  É a relaxação mais informativa das todas, porque é a única em que a
  //  pessoa não perde nada de material: só descobre qual das suas
  //  recusas é que estava a custar mais.
  for (const id of contexto.restricoes) {
    const meta = RESTRICOES.find((item) => item.id === id);
    lista.push({
      id: `restricao:${id}`,
      rotulo: `Deixar de excluir: ${(meta?.rotulo ?? id).toLocaleLowerCase("pt-PT")}`,
      porque: meta?.nota ?? "Esta recusa está a eliminar hipóteses.",
      aplicar: (base) => ({
        ...base,
        restricoes: base.restricoes.filter((item) => item !== id),
      }),
    });
  }

  // ── Capital, um degrau acima ──────────────────────────────────────
  const capitalAtual = contexto.capital.maximo ?? contexto.capital.disponivelAgora;
  if (capitalAtual !== undefined) {
    const seguinte = proximoDegrau(DEGRAUS_CAPITAL, capitalAtual);
    if (seguinte !== null) {
      lista.push({
        id: "capital",
        rotulo: `Aceitar arriscar até ${seguinte.toLocaleString("pt-PT")} €`,
        porque:
          "O teto de capital que declaraste elimina qualquer hipótese cujo arranque não caiba nele, mesmo no melhor caso.",
        aplicar: (base) => ({ ...base, capital: { ...base.capital, maximo: seguinte } }),
      });
    }
  }

  // ── Prazo até à primeira receita ──────────────────────────────────
  const prazo = contexto.tempo.prazoMaxPrimeiraReceitaMeses;
  if (prazo !== undefined) {
    const seguinte = proximoDegrau(DEGRAUS_PRAZO, prazo);
    if (seguinte !== null) {
      lista.push({
        id: "prazo",
        rotulo: `Aguentar até ${seguinte} ${seguinte === 1 ? "mês" : "meses"} sem receita`,
        porque:
          "Modelos que demoram mais a dar a primeira venda ficam de fora do prazo que declaraste aguentar.",
        aplicar: (base) => ({
          ...base,
          tempo: { ...base.tempo, prazoMaxPrimeiraReceitaMeses: seguinte },
        }),
      });
    }
  }

  // ── Alcance ───────────────────────────────────────────────────────
  if (contexto.localizacao.alcance === "bairro" || contexto.localizacao.alcance === "concelho") {
    lista.push({
      id: "alcance",
      rotulo: "Servir toda a região, não só o concelho",
      porque: "Há problemas que existem na tua região e não têm massa crítica no teu concelho.",
      aplicar: (base) => ({
        ...base,
        localizacao: { ...base.localizacao, alcance: "regiao" },
      }),
    });
  }

  // ── Deslocação ────────────────────────────────────────────────────
  if (contexto.localizacao.disponibilidadeDeslocacao === false) {
    lista.push({
      id: "deslocacao",
      rotulo: "Aceitar deslocar-me com regularidade",
      porque: "Trabalho presencial no espaço do cliente depende de te poderes deslocar.",
      aplicar: (base) => ({
        ...base,
        localizacao: { ...base.localizacao, disponibilidadeDeslocacao: true },
      }),
    });
  }

  return lista;
}

/**
 * As relaxações que abrem alguma coisa, ordenadas pelo que abrem.
 *
 * `correr` é injetado em vez de importado para o módulo continuar puro e
 * para o pipeline poder passar a sua própria travagem de recursão — sem
 * isso, medir o efeito de uma relaxação dispararia outro cálculo de
 * relaxações, e esse outro, e assim por diante.
 *
 * ── PORQUE HÁ UM SEGUNDO PASSO ──────────────────────────────────────
 *  «Uma mudança de cada vez» é a regra certa e é insuficiente sozinha.
 *  Medido: um perfil com oito recusas empilhadas devolve efeito ZERO
 *  para cada uma delas isolada — não porque nenhuma esteja a custar, mas
 *  porque cada uma é suficiente para fechar o espaço por si. A pessoa
 *  que mais precisa desta lista era exatamente a que a via vazia.
 *
 *  Quando nenhuma mudança isolada abre nada, tentam-se PARES. Continua
 *  a ser um compromisso avaliável — duas coisas nomeadas, não «relaxa aí
 *  qualquer coisa» — e continua a ser medido. Só se chega aos pares
 *  depois de os singulares falharem todos, e nunca se vai a três: a
 *  partir daí deixa de ser uma decisão e passa a ser um formulário novo.
 */
export function calcularRelaxamentos(
  contexto: OpportunityContext,
  correr: (contexto: OpportunityContext) => number,
  { maximo = 4 }: { maximo?: number } = {},
): readonly Relaxamento[] {
  const lista = candidatas(contexto);
  const aplicadas = lista
    .map((candidata) => ({ candidata, proximo: candidata.aplicar(contexto) }))
    .filter(
      (item): item is { candidata: Candidata; proximo: OpportunityContext } =>
        item.proximo !== null,
    );

  const singulares: Relaxamento[] = [];
  for (const { candidata, proximo } of aplicadas) {
    const abre = correr(proximo);
    // Regra 3: efeito zero não se mostra.
    if (abre <= 0) continue;
    singulares.push({
      id: candidata.id,
      rotulo: candidata.rotulo,
      porque: candidata.porque,
      hipotesesQueAbriria: abre,
      contexto: proximo,
    });
  }

  const ordenar = (itens: Relaxamento[]) =>
    itens
      .sort(
        (esquerda, direita) =>
          direita.hipotesesQueAbriria - esquerda.hipotesesQueAbriria ||
          esquerda.id.localeCompare(direita.id),
      )
      .slice(0, maximo);

  if (singulares.length > 0) return ordenar(singulares);

  // ── Pares, só quando nenhum singular abriu ────────────────────────
  const pares: Relaxamento[] = [];
  for (let i = 0; i < aplicadas.length; i += 1) {
    for (let j = i + 1; j < aplicadas.length; j += 1) {
      const primeira = aplicadas[i]!;
      const segunda = aplicadas[j]!;
      // Aplicar a segunda SOBRE o resultado da primeira, não sobre o
      // contexto original: senão a segunda desfazia a primeira.
      const combinado = segunda.candidata.aplicar(primeira.proximo);
      if (combinado === null) continue;
      const abre = correr(combinado);
      if (abre <= 0) continue;
      pares.push({
        id: `${primeira.candidata.id}+${segunda.candidata.id}`,
        rotulo: `${primeira.candidata.rotulo} — e também: ${segunda.candidata.rotulo.toLocaleLowerCase("pt-PT")}`,
        porque:
          "Nenhuma destas mudanças sozinha chega para abrir alguma coisa; as duas juntas chegam.",
        hipotesesQueAbriria: abre,
        contexto: combinado,
      });
    }
  }

  return ordenar(pares);
}
