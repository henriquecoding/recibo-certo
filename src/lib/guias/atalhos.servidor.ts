import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  OS ATALHOS DE GUIAS DA HOMEPAGE — resolvidos no servidor
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ 550 KB PARA MOSTRAR TRÊS LIGAÇÕES                                   │
//  │                                                                     │
//  │ `ExplorarSecao` é `"use client"` e mostra três guias por perfil.    │
//  │ Para os obter chamava `guiasPorPerfil()`, e essa chamada trazia:    │
//  │                                                                     │
//  │   ExplorarSecao → guias-config → guias/manifests                    │
//  │                → guias/expansao/derivar                             │
//  │                → catalogo (142 KB) + conteudo (127 KB)              │
//  │                  + dados-motor (115 KB) + fontes (52 KB)            │
//  │                                                                     │
//  │ Meio megabyte de prosa e de tabelas de guias — no primeiro ecrã da  │
//  │ homepage, para desenhar três `<a>` com um título e um ícone.        │
//  │                                                                     │
//  │ Ninguém escreveu isto de propósito. É o que acontece quando um      │
//  │ componente de cliente importa uma FUNÇÃO de um módulo de dados: o   │
//  │ empacotador não sabe que só três campos de três registos vão ser    │
//  │ usados, e leva o módulo inteiro.                                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  A regra que fica: **um componente de cliente recebe DADOS, não
//  importa CATÁLOGOS.** Quem sabe filtrar é o servidor, que já tem o
//  catálogo em memória e não paga rede por isso.
//
//  O ícone atravessa a fronteira como CHAVE e não como componente — a
//  mesma convenção que `icon-map.tsx` documenta para as ferramentas, e
//  pela mesma razão: uma chave não arrasta a árvore atrás de si.
// ═══════════════════════════════════════════════════════════════════════

import { guiasPorPerfil } from "@/lib/guias-config";
import { chaveDoIcone } from "@/components/ferramentas/icon-map";
import type { Perfil } from "@/lib/perfil";

/** O que o cliente precisa de saber sobre um guia. Nada mais. */
export interface AtalhoGuia {
  href: string;
  titulo: string;
  /** A chave de `ICONES_FERRAMENTAS`, resolvida por `iconeDe`. */
  icone: string;
  /** Minutos de leitura — a única meta que o cartão mostra. */
  tempo: number;
}

/** Quantos a homepage mostra. */
const QUANTOS = 3;

/**
 * Os atalhos dos quatro perfis, já filtrados.
 *
 * Os quatro, e não só o atual: o perfil vive em `localStorage` e só é
 * conhecido depois da hidratação. Mandar os quatro custa doze objetos
 * pequenos; mandar o catálogo para o cliente poder filtrar custava meio
 * megabyte.
 */
export function atalhosDeGuias(): Record<Perfil, AtalhoGuia[]> {
  const perfis: Perfil[] = ["independente", "dependente", "empresa", "comparar"];
  const saida = {} as Record<Perfil, AtalhoGuia[]>;
  for (const perfil of perfis) {
    saida[perfil] = guiasPorPerfil(perfil)
      .slice(0, QUANTOS)
      .map((guia) => ({
        href: guia.href,
        titulo: guia.titulo,
        // `BookOpen` quando o ícone do manifesto não está no mapa de
        // chaves. Não é silencioso: `guias.test.ts` exige que todos os
        // guias de atalho resolvam, para isto nunca degradar sem aviso.
        icone: chaveDoIcone(guia.icon) ?? "BookOpen",
        tempo: guia.tempo,
      }));
  }
  return saida;
}
