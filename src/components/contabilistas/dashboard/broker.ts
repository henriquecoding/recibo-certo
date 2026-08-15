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
  meusClientes, obterProgressao,
} from "@/lib/contabilistas/fonte/dados";
import { listarTarefas } from "@/lib/contabilistas/fonte/trabalho";
import { listarCasos } from "@/lib/contabilistas/fonte/casos";
import { listarNotificacoes } from "@/lib/contabilistas/fonte/conversa";
import { proximosPrazos } from "@/lib/prazos";
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
  | { estado: "pronto"; dados: DadosDoDominio[K] }
  | { estado: "erro"; mensagem: string };

export class Broker {
  private readonly emCurso = new Map<DominioDados, Promise<unknown>>();
  private readonly resultado = new Map<DominioDados, EstadoDominio>();
  private readonly ouvintes = new Set<() => void>();
  private readonly ler: ReturnType<typeof leitores>;

  constructor(contabilistaId: string) {
    this.ler = leitores(contabilistaId);
  }

  subscrever(fn: () => void): () => void {
    this.ouvintes.add(fn);
    return () => { this.ouvintes.delete(fn); };
  }

  private avisar() {
    for (const fn of this.ouvintes) fn();
  }

  estado<K extends DominioDados>(dominio: K): EstadoDominio<K> {
    return (this.resultado.get(dominio) as EstadoDominio<K>) ?? { estado: "a-carregar" };
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
        this.resultado.set(dominio, { estado: "pronto", dados } as EstadoDominio);
        this.avisar();
        return dados as unknown;
      })
      .catch((e: unknown) => {
        // Um domínio que falha não pode deixar o painel em branco: o frame
        // fica, com a mensagem dentro. É a mesma regra do ErrorBoundary.
        this.resultado.set(dominio, {
          estado: "erro",
          mensagem: e instanceof Error ? e.message : "Não foi possível carregar.",
        });
        this.avisar();
        return undefined;
      });

    this.emCurso.set(dominio, p);
    return p;
  }

  pedirVarios(dominios: readonly DominioDados[]): Promise<unknown[]> {
    return Promise.all(dominios.map((d) => this.pedir(d)));
  }
}
