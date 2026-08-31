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

export type NomeOverlay =
  | "cookies" | "confirmacao" | "busca" | "menu" | "auth" | "feedback" | "novidades";

/**
 * A ordem por que o produto cede a atenção.
 *
 * O consentimento manda porque é a única superfície que a lei obriga a
 * resolver antes de tudo o resto. Logo a seguir vem a confirmação de uma
 * ação destrutiva: é a única pergunta do produto cuja resposta não se
 * desfaz, e tapá-la com o que quer que seja seria pedir uma decisão sobre
 * uma frase que a pessoa deixou de ver. Depois vem o que a PESSOA pediu —
 * se carregou em «Pesquisar», é isso que tem de aparecer. As novidades
 * ficam em último: são a única coisa aqui que ninguém pediu.
 */
export const PRIORIDADE: Record<NomeOverlay, number> = {
  cookies: 100,
  confirmacao: 95,
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

interface PedidoInterno extends PedidoOverlay {
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ «QUERO ABRIR AGORA» E «CONTINUO À ESPERA» SÃO PEDIDOS DIFERENTES   │
   * │                                                                   │
   * │ Quem quer abrir volta a pedir sempre que a vaga muda de dono — é   │
   * │ assim que um pedido recusado consegue uma segunda oportunidade sem │
   * │ fila nem temporizador. Mas então a maioria dos pedidos que chegam  │
   * │ aqui não são gestos novos: são a mesma intenção a reinscrever-se.  │
   * │                                                                   │
   * │ A distinção existe por causa do desempate. Sem ela, dois overlays  │
   * │ de IGUAL prioridade (menu e busca valem os dois 80) roubavam-se a  │
   * │ vaga um ao outro em cadeia: cada roubo muda o dono, cada mudança   │
   * │ faz o outro reinscrever-se, e o produto entra em ciclo. Só o       │
   * │ PRIMEIRO pedido de cada episódio desempata; as reinscrições        │
   * │ esperam pela sua vez, como sempre esperaram.                       │
   * └───────────────────────────────────────────────────────────────────┘
   */
  novoPedido: boolean;
}

interface Coordenador {
  ativo: NomeOverlay | null;
  pedir: (nome: NomeOverlay, pedido: PedidoInterno) => void;
  libertar: (nome: NomeOverlay) => void;
}

const ContextoOverlays = createContext<Coordenador | null>(null);

/**
 * A regra de cedência, isolada e PURA — devolve quem fica com a vaga.
 *
 * Estava dentro do `setAtivo`, misturada com o `registar` da colisão. Um
 * `updater` pode ser chamado mais do que uma vez (StrictMode, um render
 * começado e deitado fora), e a mesma colisão era contada duas vezes — num
 * número cujo SLO é zero, isso é a diferença entre um alarme e ruído.
 */
export function decidirVaga(
  atual: NomeOverlay | null,
  nome: NomeOverlay,
  pedido: PedidoInterno,
): NomeOverlay {
  if (atual === null || atual === nome) return nome;
  if (!pedido.iniciadoPeloUtilizador) return atual;
  if (PRIORIDADE[atual] < PRIORIDADE[nome]) return nome;
  if (PRIORIDADE[atual] === PRIORIDADE[nome] && pedido.novoPedido) return nome;
  return atual;
}

export function CoordenadorOverlays({ children }: { children: React.ReactNode }) {
  const [ativo, setAtivo] = useState<NomeOverlay | null>(null);

  /**
   * A vaga também vive numa ref, e a ref é que manda DENTRO de um lote.
   *
   * `pedir` e `libertar` são chamados de efeitos, e num único lote de React
   * podem chegar vários — o painel a pedir e a folha a libertar no mesmo
   * commit. Ler `ativo` (o valor do render) daria a cada um a fotografia
   * anterior. A ref é a verdade corrente; o estado é o que se desenha.
   */
  const vaga = useRef<NomeOverlay | null>(null);

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
    (nome: NomeOverlay, pedido: PedidoInterno) => {
      if (!pedido.iniciadoPeloUtilizador && !livreParaAutomaticos) return;

      /**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ UM GESTO GANHA A QUEM VALE O MESMO — E O `<` DEIXAVA-O PERDER  │
       * │                                                               │
       * │ Um gesto do utilizador ganha a um automático: quem carregou em │
       * │ «Pesquisar» quer a pesquisa, não o que apareceu sozinho. O     │
       * │ automático volta a pedir quando esta vaga libertar.            │
       * │                                                               │
       * │ A comparação era estritamente MENOR, e `menu` e `busca` valem  │
       * │ os dois 80 — de propósito, porque nenhum manda no outro. Com   │
       * │ `<`, «nenhum manda no outro» virava «o primeiro manda para     │
       * │ sempre»: com a folha do menu na vaga, o `⌘K` e a barra de      │
       * │ pesquisa não faziam NADA, sem erro e sem nada no ecrã que o    │
       * │ explicasse. E ao contrário também.                             │
       * │                                                               │
       * │ Entre dois pedidos de IGUAL prioridade feitos por gesto decide │
       * │ o mais RECENTE — mas só se for mesmo um pedido novo, e não uma │
       * │ reinscrição (ver `PedidoInterno.novoPedido`, que é o que       │
       * │ impede os dois de se roubarem a vaga em ciclo). A ordem entre  │
       * │ níveis diferentes não muda: o consentimento (100) e a          │
       * │ confirmação (95) continuam a não poder ser empurrados pela     │
       * │ pesquisa (80).                                                 │
       * └───────────────────────────────────────────────────────────────┘
       *
       * A decisão é calculada FORA do `setAtivo`. Um `updater` pode ser
       * chamado mais do que uma vez (StrictMode, render descartado), e com
       * o `registar` lá dentro a mesma colisão era contada duas vezes — num
       * número cujo SLO é zero, isso é a diferença entre um alarme e um
       * ruído.
       */
      const atual = vaga.current;
      const proximo = decidirVaga(atual, nome, pedido);
      if (proximo !== nome && atual !== null) {
        // Recusa. Fica registada porque o SLO desta invariante é ZERO
        // colisões: um número que nunca se mede é um número que sobe.
        registar("header_overlay_conflict", { requested: nome, active: atual });
      }
      if (proximo === atual) return;
      vaga.current = proximo;
      setAtivo(proximo);
    },
    [livreParaAutomaticos],
  );

  const libertar = useCallback((nome: NomeOverlay) => {
    if (vaga.current !== nome) return;
    vaga.current = null;
    setAtivo(null);
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
export function useOverlay(
  nome: NomeOverlay,
  queroAbrir: boolean,
  pedido: PedidoOverlay,
  /**
   * Chamado quando a vaga é PERDIDA sem se ter deixado de a querer.
   *
   * Sem isto, quem perdia a vaga desaparecia do ecrã e continuava a querer
   * abrir — e voltava a aparecer sozinho no instante em que ela libertasse.
   * Uma folha de menu que a pessoa julgava fechada a reaparecer depois de
   * fechar a pesquisa não é uma animação: é o produto a fazer uma coisa que
   * ninguém pediu. Quem perde, arruma-se.
   */
  aoPerderVaga?: () => void,
): boolean {
  const ctx = useContext(ContextoOverlays);
  const pedidoRef = useRef(pedido);
  pedidoRef.current = pedido;
  const aoPerderRef = useRef(aoPerderVaga);
  aoPerderRef.current = aoPerderVaga;

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

  /**
   * O primeiro pedido de cada episódio é um GESTO; os seguintes são a mesma
   * intenção a reinscrever-se enquanto espera. Só o primeiro desempata entre
   * prioridades iguais — ver `PedidoInterno.novoPedido`.
   */
  const jaPediu = useRef(false);

  // Enquanto quiser abrir, pede. O `ctx` muda de identidade sempre que a
  // vaga muda de dono — e é isso que faz um pedido recusado voltar a
  // tentar, sem fila e sem temporizador.
  useEffect(() => {
    if (!ctx || !queroAbrir) return;
    const novoPedido = !jaPediu.current;
    jaPediu.current = true;
    ctx.pedir(nome, { ...pedidoRef.current, novoPedido });
  }, [ctx, nome, queroAbrir]);

  // Deixar de querer liberta a vaga — se a tivermos. Separado do efeito
  // anterior porque aquele corre também quando o `ctx` muda, e libertar aí
  // tirava o lugar a quem o tinha ganho no mesmo instante.
  useEffect(() => {
    if (queroAbrir) return;
    // O episódio acabou: o próximo pedido volta a ser um gesto novo.
    jaPediu.current = false;
    if (!libertar || !teve.current) return;
    teve.current = false;
    libertar(nome);
  }, [queroAbrir, libertar, nome]);

  /**
   * Perder a vaga sem deixar de a querer é um sinal, não um silêncio.
   *
   * Quem a tinha e a perdeu (alguém com mais prioridade, ou um gesto mais
   * recente de igual prioridade) fica com `queroAbrir` a verdade e sem nada
   * no ecrã — um estado invisível que reaparece sozinho mais tarde. Aqui
   * avisa-se, e cada superfície arruma-se como lhe compete.
   */
  useEffect(() => {
    if (permitido || !queroAbrir || !teve.current) return;
    teve.current = false;
    aoPerderRef.current?.();
  }, [permitido, queroAbrir]);

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
