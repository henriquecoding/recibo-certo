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
  | { estado: "pronto"; dados: DadosDoDominio[K] }
  /** `mensagem` é para se ler; `detalhe` é o texto cru, para a consola. */
  | { estado: "erro"; mensagem: string; detalhe?: string };

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
  private readonly ouvintes = new Set<() => void>();
  private readonly ler: ReturnType<typeof leitores>;

  /**
   * Quantas vezes o estado mudou desde que este broker nasceu.
   *
   * Existe por causa do `memo` em `GrelhaEdicao`: os widgets leem o broker
   * imperativamente, e por isso NENHUMA prop muda quando os dados chegam.
   * Sem este número, `memo(CorpoDoModulo)` corta o único render que os
   * mostraria, e um módulo acabado de acrescentar à vista ficava vazio até
   * se sair da edição. É a prop que carrega a mudança para dentro do memo.
   */
  versao = 0;

  constructor(contabilistaId: string) {
    this.ler = leitores(contabilistaId);
  }

  subscrever(fn: () => void): () => void {
    this.ouvintes.add(fn);
    return () => { this.ouvintes.delete(fn); };
  }

  private avisar() {
    this.versao += 1;
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
        this.avisar();
        return undefined;
      });

    this.emCurso.set(dominio, p);
    return p;
  }

  pedirVarios(dominios: readonly DominioDados[]): Promise<unknown[]> {
    return Promise.all(dominios.map((d) => this.pedir(d)));
  }

  /**
   * Deita fora o que está em cache e volta a ler.
   *
   * É o que faz o botão «Tentar outra vez» dentro de um módulo em erro, e
   * é o que uma escrita noutro ecrã do painel precisa de chamar para o
   * módulo deixar de mostrar o número antigo.
   */
  revalidar(dominios: readonly DominioDados[]): Promise<unknown[]> {
    for (const d of dominios) {
      this.emCurso.delete(d);
      this.resultado.delete(d);
    }
    this.avisar();
    return this.pedirVarios(dominios);
  }
}
