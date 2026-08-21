"use client";

/**
 * O broker de dados do painel modular.
 *
 * Resolve dois problemas que o Relatório Mestre §12.3–12.5 descreve:
 *
 *  1. TRÊS widgets podem querer a mesma fonte. Sem coordenação, «Partilhas
 *     recebidas» e «Simulações recebidas» fazem a mesma leitura duas vezes
 *     na mesma abertura do painel. Aqui, quem pede um domínio que já está
 *     a ser carregado recebe a MESMA Promise.
 *
 *  2. Só se carrega o que a vista realmente usa. Um `Promise.all` com os
 *     treze domínios quando a vista tem três módulos é trabalho e custo
 *     por nada — e módulos ocultos ou removidos não disparam leitura
 *     nenhuma, porque `dominiosNecessarios` não os inclui.
 *
 * ⚠️ FRONTEIRA DE PRIVACIDADE. Nenhum domínio aqui lê `recibos`,
 * `cenarios`, `recibos_vencimento` ou `preferencias_fiscais`. As
 * simulações vêm de `partilhas` — snapshots que o cliente enviou de
 * propósito. É a garantia da migração 038 e da §2.2, e é a razão de este
 * ficheiro listar as fontes uma a uma em vez de aceitar um loader
 * arbitrário.
 */

import {
  cartoesAbertos, contagensDoPainel, listarAgendamentos, listarPartilhas,
  meusClientes, obterProgressao, resumoDeClientes,
} from "@/lib/contabilistas/fonte/dados";
import { listarTarefas } from "@/lib/contabilistas/fonte/trabalho";
import { listarCasos } from "@/lib/contabilistas/fonte/casos";
import { listarNotificacoes } from "@/lib/contabilistas/fonte/conversa";
import { proximosPrazos } from "@/lib/prazos";
import { useCallback, useSyncExternalStore } from "react";
import type { DominioDados } from "@/lib/contabilistas/dashboard/modulos";

export interface DadosDoDominio {
  agenda: Awaited<ReturnType<typeof listarAgendamentos>>;
  atencao: Awaited<ReturnType<typeof contagensDoPainel>>;
  prazos: ReturnType<typeof proximosPrazos>;
  partilhas: Awaited<ReturnType<typeof listarPartilhas>>;
  documentos: Awaited<ReturnType<typeof listarCasos>>;
  atividade: { tarefas: Awaited<ReturnType<typeof listarTarefas>>; casos: Awaited<ReturnType<typeof listarCasos>> };
  avisos: Awaited<ReturnType<typeof listarNotificacoes>>;
  trabalho: Awaited<ReturnType<typeof listarTarefas>>;
  clientes: Awaited<ReturnType<typeof meusClientes>>;
  resumo_clientes: Awaited<ReturnType<typeof resumoDeClientes>>;
  casos: Awaited<ReturnType<typeof listarCasos>>;
  fidelidade: Awaited<ReturnType<typeof cartoesAbertos>>;
  progressao: Awaited<ReturnType<typeof obterProgressao>>;
  mensagens: Awaited<ReturnType<typeof listarNotificacoes>>;
}

/** Uma leitura por domínio. As assinaturas ficam num sítio só. */
function leitores(contabilistaId: string): {
  [K in DominioDados]: () => Promise<DadosDoDominio[K]>;
} {
  return {
    agenda: () => listarAgendamentos({ contabilistaId, desde: inicioDoDia() }),
    atencao: () => contagensDoPainel(contabilistaId),
    prazos: async () => proximosPrazos(new Date(), 8),
    partilhas: () => listarPartilhas({ contabilistaId }),
    documentos: () => listarCasos(),
    atividade: async () => ({
      tarefas: await listarTarefas(contabilistaId),
      casos: await listarCasos(),
    }),
    avisos: () => listarNotificacoes(),
    trabalho: () => listarTarefas(contabilistaId),
    clientes: () => meusClientes(contabilistaId),
    resumo_clientes: () => resumoDeClientes(contabilistaId),
    casos: () => listarCasos(),
    fidelidade: () => cartoesAbertos(contabilistaId),
    progressao: () => obterProgressao(contabilistaId),
    mensagens: () => listarNotificacoes(),
  };
}

function inicioDoDia(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export type EstadoDominio<K extends DominioDados = DominioDados> =
  | { estado: "a-carregar" }
  | {
      estado: "pronto";
      dados: DadosDoDominio[K];
      /** Quando estes dados chegaram. É o que permite dizer «há 12 min». */
      atualizadoEm: number;
      /** Está a ser relido agora, com o resultado anterior ainda no ecrã. */
      aRevalidar?: boolean;
    }
  /** `mensagem` é para se ler; `detalhe` é o texto cru, para a consola. */
  | { estado: "erro"; mensagem: string; detalhe?: string };

/**
 * O estado inicial, como uma constante partilhada.
 *
 * ⚠️ Não pode ser um literal criado a cada chamada de `estado()`.
 * `useSyncExternalStore` compara snapshots por identidade: um objeto novo
 * a cada leitura é uma mudança a cada leitura, e o React entra em ciclo
 * infinito com «The result of getSnapshot should be cached».
 */
const A_CARREGAR: EstadoDominio = Object.freeze({ estado: "a-carregar" as const });

/**
 * Quanto tempo um domínio se considera fresco, em milissegundos.
 *
 * Não é um número só, e a razão é o que cada domínio significa: uma
 * consulta marcada para daqui a meia hora é urgente e muda a toda a hora;
 * o calendário fiscal do trimestre não muda nada durante um dia inteiro.
 * Um TTL único ou revalidava demais ou mentia demais.
 */
const TTL_MS: Record<DominioDados, number> = {
  agenda: 60_000,
  atencao: 60_000,
  mensagens: 60_000,
  avisos: 60_000,
  casos: 2 * 60_000,
  documentos: 2 * 60_000,
  partilhas: 2 * 60_000,
  trabalho: 2 * 60_000,
  atividade: 5 * 60_000,
  clientes: 5 * 60_000,
  resumo_clientes: 5 * 60_000,
  fidelidade: 10 * 60_000,
  progressao: 10 * 60_000,
  // O calendário fiscal é calculado, não lido: não há nada a revalidar.
  prazos: Number.POSITIVE_INFINITY,
};

/**
 * O que a pessoa lê quando um domínio falha.
 *
 * A mensagem crua do Postgres («new row violates row-level security policy
 * for table…») não diz nada a quem está a trabalhar e diz demasiado sobre o
 * schema a quem não está. O detalhe técnico continua a existir em
 * `detalhe`, para quem abrir a consola.
 */
function mensagemLegivel(e: unknown): string {
  const cru = e instanceof Error ? e.message : "";
  if (/fetch|network|Failed to fetch/i.test(cru)) {
    return "Sem ligação. Tenta outra vez.";
  }
  if (/JWT|token|session|not authenticated/i.test(cru)) {
    return "A sessão expirou. Entra outra vez.";
  }
  if (/row-level security|permission denied|policy/i.test(cru)) {
    return "Sem autorização para ler isto.";
  }
  return "Não foi possível carregar.";
}

export class Broker {
  private readonly emCurso = new Map<DominioDados, Promise<unknown>>();
  private readonly resultado = new Map<DominioDados, EstadoDominio>();
  /**
   * ⚠️ Ouvintes POR DOMÍNIO, e não uma lista só.
   *
   * A `Workspace` subscrevia a raiz e incrementava um contador sempre que
   * QUALQUER domínio mudava. Com treze domínios a chegar em sequência e
   * até 24 módulos por vista, acabar de ler «fidelidade» voltava a
   * renderizar a agenda, os clientes, o trabalho e todas as molduras —
   * treze vezes por abertura do painel, num telemóvel.
   *
   * Cada widget passa a reagir só ao que consome.
   */
  private readonly ouvintes = new Map<DominioDados, Set<() => void>>();
  /**
   * Quantas vezes cada domínio mudou.
   *
   * Serve os módulos que consomem MAIS do que um domínio: a soma das
   * revisões deles é um número — estável entre mudanças, diferente depois
   * de uma — e por isso serve de snapshot a `useSyncExternalStore` sem
   * criar um objeto novo a cada render.
   */
  private readonly revisoes = new Map<DominioDados, number>();
  private readonly ler: ReturnType<typeof leitores>;

  constructor(contabilistaId: string) {
    this.ler = leitores(contabilistaId);
  }

  /** Subscreve UM domínio. Devolve a função que cancela. */
  subscrever(dominio: DominioDados, fn: () => void): () => void {
    let conjunto = this.ouvintes.get(dominio);
    if (!conjunto) {
      conjunto = new Set();
      this.ouvintes.set(dominio, conjunto);
    }
    conjunto.add(fn);
    return () => { conjunto.delete(fn); };
  }

  private avisar(dominio: DominioDados) {
    this.revisoes.set(dominio, (this.revisoes.get(dominio) ?? 0) + 1);
    const conjunto = this.ouvintes.get(dominio);
    if (!conjunto) return;
    for (const fn of conjunto) fn();
  }

  /** A soma das revisões destes domínios. Muda quando um deles muda. */
  revisaoDe(dominios: readonly DominioDados[]): number {
    let n = 0;
    for (const d of dominios) n += this.revisoes.get(d) ?? 0;
    return n;
  }

  /**
   * O estado de um domínio.
   *
   * ⚠️ O retorno tem de ser ESTÁVEL entre mudanças: é o snapshot de
   * `useSyncExternalStore`, e um objeto novo a cada leitura põe o React em
   * ciclo. Daí a constante `A_CARREGAR` em vez de um literal.
   */
  estado<K extends DominioDados>(dominio: K): EstadoDominio<K> {
    return (this.resultado.get(dominio) as EstadoDominio<K>) ?? (A_CARREGAR as EstadoDominio<K>);
  }

  /** Está velho o suficiente para valer a pena reler? */
  velho(dominio: DominioDados, agora = Date.now()): boolean {
    const e = this.resultado.get(dominio);
    if (!e || e.estado !== "pronto") return false;
    return agora - e.atualizadoEm > TTL_MS[dominio];
  }

  /**
   * Pede um domínio. Chamar duas vezes durante o mesmo carregamento
   * devolve a mesma Promise — é aqui que a deduplicação acontece.
   */
  pedir(dominio: DominioDados): Promise<unknown> {
    const existente = this.emCurso.get(dominio);
    if (existente) return existente;

    const p = this.ler[dominio]()
      .then((dados) => {
        this.resultado.set(dominio, {
          estado: "pronto", dados, atualizadoEm: Date.now(),
        } as EstadoDominio);
        this.emCurso.delete(dominio);
        this.avisar(dominio);
        return dados as unknown;
      })
      .catch((e: unknown) => {
        // Um domínio que falha não pode deixar o painel em branco: o frame
        // fica, com a mensagem dentro. É a mesma regra do ErrorBoundary.
        //
        // A promessa sai de `emCurso` para que `revalidar` possa tentar
        // outra vez: enquanto lá ficasse, um domínio que falhou uma vez
        // ficava em erro até o painel desmontar.
        this.emCurso.delete(dominio);
        this.resultado.set(dominio, {
          estado: "erro",
          mensagem: mensagemLegivel(e),
          detalhe: e instanceof Error ? e.message : undefined,
        });
        this.avisar(dominio);
        return undefined;
      });

    this.emCurso.set(dominio, p);
    return p;
  }

  pedirVarios(dominios: readonly DominioDados[]): Promise<unknown[]> {
    return Promise.all(dominios.map((d) => this.pedir(d)));
  }

  /**
   * Volta a ler, MANTENDO no ecrã o que já lá está.
   *
   * A versão anterior apagava o resultado antes de pedir, e o módulo
   * voltava ao esqueleto a cada revalidação. Numa política de frescura que
   * revalida ao recuperar o foco, isso significa o painel a piscar de cada
   * vez que a pessoa volta ao separador — pior do que o número estar um
   * minuto atrasado.
   *
   * Um domínio em ERRO não tem nada para manter, e aí volta mesmo ao
   * princípio.
   */
  revalidar(dominios: readonly DominioDados[]): Promise<unknown[]> {
    for (const d of dominios) {
      this.emCurso.delete(d);
      const anterior = this.resultado.get(d);
      if (anterior?.estado === "pronto") {
        this.resultado.set(d, { ...anterior, aRevalidar: true });
      } else {
        this.resultado.delete(d);
      }
      this.avisar(d);
    }
    return this.pedirVarios(dominios);
  }

  /** Revalida só os que passaram do prazo. Não faz nada aos frescos. */
  revalidarSeVelho(dominios: readonly DominioDados[]): Promise<unknown[]> {
    const velhos = dominios.filter((d) => this.velho(d));
    return velhos.length > 0 ? this.revalidar(velhos) : Promise.resolve([]);
  }
}

/**
 * O estado de um domínio, como estado de React.
 *
 * ⚠️ É UM HOOK, e substitui uma leitura imperativa. Antes disto, os
 * widgets liam `broker.estado(...)` durante o render e dependiam de a raiz
 * do painel os voltar a renderizar — o que a raiz fazia sempre que
 * QUALQUER domínio mudava.
 *
 * `useSyncExternalStore` inverte a relação: cada widget diz o que consome
 * e o React acorda só quem consome esse domínio.
 *
 * O terceiro argumento é o snapshot do servidor. O painel é `"use client"`
 * e não chega a renderizar no servidor, mas o hook exige-o e omiti-lo
 * rebenta com um erro que só aparece em produção.
 */
export function usarEstadoDominio<K extends DominioDados>(
  broker: Broker, dominio: K,
): EstadoDominio<K> {
  return useSyncExternalStore(
    useCallback((fn) => broker.subscrever(dominio, fn), [broker, dominio]),
    () => broker.estado(dominio),
    () => broker.estado(dominio),
  );
}

/**
 * Subscreve VÁRIOS domínios de uma vez.
 *
 * Para quem precisa de reagir a um conjunto sem os ler todos aqui — a
 * moldura de um módulo, por exemplo, que só quer saber se algum deles está
 * a carregar ou em erro. Um hook por domínio dentro de um ciclo seria
 * frágil; isto é um hook só.
 */
export function usarDominios(broker: Broker, dominios: readonly DominioDados[]): number {
  // A lista é estável por tipo de módulo, mas a identidade do array não é.
  // A chave textual é o que impede uma re-subscrição a cada render.
  const chave = dominios.join(",");
  return useSyncExternalStore(
    useCallback(
      (fn) => {
        const cancelar = dominios.map((d) => broker.subscrever(d, fn));
        return () => { for (const c of cancelar) c(); };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [broker, chave],
    ),
    () => broker.revisaoDe(dominios),
    () => broker.revisaoDe(dominios),
  );
}

/** Os dados de um domínio, ou `null` se ainda não chegaram ou falharam. */
export function usarDominio<K extends DominioDados>(
  broker: Broker, dominio: K,
): DadosDoDominio[K] | null {
  const e = usarEstadoDominio(broker, dominio);
  return e.estado === "pronto" ? e.dados : null;
}
