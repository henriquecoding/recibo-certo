"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O COORDENADOR DE OVERLAYS GLOBAIS
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ISTO EXISTE PARA TORNAR IMPOSSÍVEL (P0-05)             │
//  │                                                                     │
//  │ Na primeira visita, «Novidades & Atualizações» aparecia POR CIMA das │
//  │ preferências de cookies — e o foco ficava no diálogo de baixo. Havia │
//  │ dois conjuntos de controlos com `aria-modal="true"` no mesmo         │
//  │ documento: a pessoa via uma superfície e o teclado estava noutra. É  │
//  │ dos poucos defeitos que bloqueia o produto por inteiro, e nenhum dos │
//  │ dois componentes tinha como o evitar sozinho — cada um estava certo  │
//  │ e nenhum sabia do outro.                                             │
//  │                                                                     │
//  │ A invariante, escrita uma vez e para todos:                          │
//  │                                                                     │
//  │      NUNCA EXISTE MAIS DO QUE UM `aria-modal="true"` ACTIVO.         │
//  │                                                                     │
//  │ Não é uma convenção: é o que este ficheiro entrega. Um overlay sem   │
//  │ permissão não RENDERIZA — não é escondido com CSS nem empurrado para │
//  │ trás com `z-index`, que é como estes conflitos costumam ser          │
//  │ «resolvidos» e como voltam sempre a aparecer.                        │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  NÃO É UMA MÁQUINA DE ESTADOS. É uma vaga, uma prioridade e uma regra
//  de cedência. Quem quer abrir pede em cada render enquanto quiser abrir;
//  quando a vaga liberta, o contexto muda de identidade e todos os que
//  ainda querem voltam a pedir sozinhos. Sem fila para manter em dia.
// ═══════════════════════════════════════════════════════════════════════

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { registar } from "@/lib/analytics/cliente";
import { CONSENT_CHANGED_EVENT, lerConsentimento } from "@/lib/cookie-consent";

export type NomeOverlay = "cookies" | "busca" | "menu" | "auth" | "feedback" | "novidades";

/**
 * A ordem por que o produto cede a atenção.
 *
 * O consentimento manda porque é a única superfície que a lei obriga a
 * resolver antes de tudo o resto. A seguir vem o que a PESSOA pediu — se
 * carregou em «Pesquisar», é isso que tem de aparecer. As novidades ficam
 * em último: são a única coisa aqui que ninguém pediu.
 */
export const PRIORIDADE: Record<NomeOverlay, number> = {
  cookies: 100,
  busca: 80,
  menu: 80,
  feedback: 75,
  auth: 70,
  novidades: 10,
};

export interface PedidoOverlay {
  /** `true` quando a superfície é `aria-modal`. */
  modal: boolean;
  /** `true` quando a abertura vem de um gesto; `false` quando é automática. */
  iniciadoPeloUtilizador: boolean;
}

interface Coordenador {
  ativo: NomeOverlay | null;
  pedir: (nome: NomeOverlay, pedido: PedidoOverlay) => void;
  libertar: (nome: NomeOverlay) => void;
}

const ContextoOverlays = createContext<Coordenador | null>(null);

export function CoordenadorOverlays({ children }: { children: React.ReactNode }) {
  const [ativo, setAtivo] = useState<NomeOverlay | null>(null);

  /**
   * Os automáticos esperam pelo consentimento resolvido.
   *
   * Não se interrompe uma decisão legal com um anúncio de funcionalidades
   * — e é exactamente essa a colisão que a auditoria encontrou na primeira
   * visita. Quem já decidiu (visitas seguintes) não espera por nada.
   */
  const [livreParaAutomaticos, setLivre] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let id: number | undefined;

    // Depois do consentimento, ainda se espera por um momento livre: montar
    // um diálogo com conteúdo a meio da primeira pintura é trocar tempo de
    // ecrã por uma coisa que ninguém pediu.
    const quandoLivre = (cb: () => void) => {
      const ric = (window as typeof window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      id = ric ? ric(cb, { timeout: 2000 }) : window.setTimeout(cb, 900);
    };

    const verificar = () => {
      if (cancelado || !lerConsentimento()) return;
      quandoLivre(() => {
        if (!cancelado) setLivre(true);
      });
    };

    verificar();
    window.addEventListener(CONSENT_CHANGED_EVENT, verificar);
    return () => {
      cancelado = true;
      window.removeEventListener(CONSENT_CHANGED_EVENT, verificar);
      if (id !== undefined) {
        const cic = (window as typeof window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cic) cic(id);
        else clearTimeout(id);
      }
    };
  }, []);

  const pedir = useCallback(
    (nome: NomeOverlay, pedido: PedidoOverlay) => {
      if (!pedido.iniciadoPeloUtilizador && !livreParaAutomaticos) return;

      setAtivo((atual) => {
        if (atual === null || atual === nome) return nome;

        // Um gesto do utilizador ganha a um automático: quem carregou em
        // «Pesquisar» quer a pesquisa, não o que apareceu sozinho. O
        // automático volta a pedir quando esta vaga libertar.
        if (pedido.iniciadoPeloUtilizador && PRIORIDADE[atual] < PRIORIDADE[nome]) return nome;

        // Recusa. Fica registada porque o SLO desta invariante é ZERO
        // colisões: um número que nunca se mede é um número que sobe.
        registar("header_overlay_conflict", { requested: nome, active: atual });
        return atual;
      });
    },
    [livreParaAutomaticos],
  );

  const libertar = useCallback((nome: NomeOverlay) => {
    setAtivo((atual) => (atual === nome ? null : atual));
  }, []);

  const valor = useMemo<Coordenador>(() => ({ ativo, pedir, libertar }), [ativo, pedir, libertar]);

  return <ContextoOverlays.Provider value={valor}>{children}</ContextoOverlays.Provider>;
}

/**
 * A licença para abrir.
 *
 * `queroAbrir` é a intenção do componente («eu abriria agora»); o valor
 * devolvido é a permissão. Um componente sem permissão devolve `null` e
 * espera — não guarda estado paralelo nem tenta forçar.
 *
 * Fora de um `CoordenadorOverlays` devolve sempre a intenção: os testes de
 * componente e as páginas isoladas não têm de montar a árvore toda para
 * conseguirem ver um diálogo.
 */
export function useOverlay(nome: NomeOverlay, queroAbrir: boolean, pedido: PedidoOverlay): boolean {
  const ctx = useContext(ContextoOverlays);
  const pedidoRef = useRef(pedido);
  pedidoRef.current = pedido;

  const libertar = ctx?.libertar;

  /**
   * As DUAS condições, e nunca só uma.
   *
   * A vaga responde «quem é o dono do nome»; `queroAbrir` responde «e esta
   * instância quer abrir?». Derivar a permissão só da vaga dava um caso
   * absurdo e real: o painel do cabeçalho ganhava a vaga «busca», e o
   * diálogo do telemóvel — que partilha o nome e está sempre montado à
   * espera do evento — lia `ativo === "busca"` e abria-se também, por cima
   * do painel, roubando-lhe o foco.
   */
  const permitido = queroAbrir && (ctx ? ctx.ativo === nome : true);

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ SÓ LIBERTA QUEM CHEGOU A TER — E ISTO NÃO É ZELO EXCESSIVO         │
   * │                                                                   │
   * │ Duas superfícies partilham o nome «busca»: o painel do cabeçalho   │
   * │ e o diálogo do telemóvel. Nunca coexistem (é por isso que          │
   * │ partilham o nome), mas coexistem MONTADAS: o diálogo está sempre   │
   * │ na árvore, à espera do evento, com `queroAbrir` a falso.           │
   * │                                                                   │
   * │ Sem este registo de posse, a montagem do diálogo — que acontece    │
   * │ em diferido, à primeira interação, ou seja, exactamente no clique  │
   * │ que abre a pesquisa — corria o efeito «não quero, logo liberto» e  │
   * │ tirava a vaga ao painel que a tinha acabado de ganhar. O painel    │
   * │ abria e fechava-se a si próprio no mesmo gesto, sem erro nenhum e  │
   * │ sem nada no ecrã.                                                  │
   * │                                                                   │
   * │ Uma ref e não estado: isto não muda o que se desenha, só quem tem  │
   * │ o direito de devolver a chave.                                     │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const teve = useRef(false);
  if (permitido) teve.current = true;

  // Enquanto quiser abrir, pede. O `ctx` muda de identidade sempre que a
  // vaga muda de dono — e é isso que faz um pedido recusado voltar a
  // tentar, sem fila e sem temporizador.
  useEffect(() => {
    if (!ctx || !queroAbrir) return;
    ctx.pedir(nome, pedidoRef.current);
  }, [ctx, nome, queroAbrir]);

  // Deixar de querer liberta a vaga — se a tivermos. Separado do efeito
  // anterior porque aquele corre também quando o `ctx` muda, e libertar aí
  // tirava o lugar a quem o tinha ganho no mesmo instante.
  useEffect(() => {
    if (queroAbrir || !libertar || !teve.current) return;
    teve.current = false;
    libertar(nome);
  }, [queroAbrir, libertar, nome]);

  useEffect(() => {
    if (!libertar) return;
    // Desmontar sem avisar deixava a vaga presa e o produto sem overlays.
    return () => {
      if (teve.current) libertar(nome);
    };
  }, [libertar, nome]);

  return permitido;
}

/** Qual overlay está activo — para quem precisa de saber, não de abrir. */
export function useOverlayAtivo(): NomeOverlay | null {
  return useContext(ContextoOverlays)?.ativo ?? null;
}
