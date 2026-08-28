"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FOCOS_HOMEPAGE,
  ROTA_POR_FOCO,
  focoDaRotaHomepage,
  type FocoHomepage,
} from "@/lib/foco-homepage";
import { registar } from "@/lib/analytics/cliente";

type OrigemPrefetch = "intencao" | "idle";
type OrigemEntrada = "pointer" | "teclado";

interface ContextoFocos {
  pendente: FocoHomepage | null;
  preparar: (foco: FocoHomepage, origem?: OrigemPrefetch) => void;
  iniciar: (foco: FocoHomepage, origem: OrigemEntrada) => void;
}

const NULO: ContextoFocos = {
  pendente: null,
  preparar: () => {},
  iniciar: () => {},
};

const Contexto = createContext<ContextoFocos>(NULO);
const preparados = new Set<FocoHomepage>();
const intencaoAte = new Map<FocoHomepage, number>();
const CHAVE_ESPECULACAO = "rc:focos:especulacao:v1";
const MAX_ESPECULATIVOS = 2;
const JANELA_INTENCAO_MS = 10_000;
const RESERVA_CONCORRENCIA_MS = 2_500;

interface NavegacaoPendente {
  origem: OrigemEntrada;
  partida: FocoHomepage;
  destino: FocoHomepage;
  inicio: number;
  preparado: boolean;
  ackRegistado: boolean;
  rscRegistado: boolean;
}

let navegacaoPendente: NavegacaoPendente | null = null;

const baldeInteracao = (ms: number) => {
  if (ms <= 50) return "0-50ms";
  if (ms <= 100) return "51-100ms";
  if (ms <= 200) return "101-200ms";
  if (ms <= 600) return "201-600ms";
  return "600ms+";
};

const marcar = (nome: string, detalhe: Record<string, unknown>) => {
  try {
    performance.mark(nome, { detail: detalhe });
  } catch {
    performance.mark(nome);
  }
  window.dispatchEvent(new CustomEvent(nome, { detail: detalhe }));
};

const ROTULO_FOCO: Record<FocoHomepage, string> = {
  descobrir: "Descobrir",
  preco: "Preço",
  recibos: "Recibos verdes",
  empresa: "Empresa",
  salario: "Salário",
};

type Ligacao = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};

function pouparDados() {
  const ligacao = (navigator as Ligacao).connection;
  return Boolean(
    ligacao?.saveData || ligacao?.effectiveType === "slow-2g" || ligacao?.effectiveType === "2g",
  );
}

function lerEspeculativos() {
  try {
    return Number(sessionStorage.getItem(CHAVE_ESPECULACAO) ?? "0") || 0;
  } catch {
    return MAX_ESPECULATIVOS;
  }
}

function contarEspeculativo() {
  try {
    sessionStorage.setItem(CHAVE_ESPECULACAO, String(lerEspeculativos() + 1));
  } catch {
    /* Sem storage, o chamador já limitou a especulação a zero. */
  }
}

export function useIntencaoFocos() {
  return useContext(Contexto);
}

/**
 * Uma fila para as cinco rotas: deduplica, dá prioridade à intenção explícita
 * e despacha no máximo um prefetch de cada vez. Como `router.prefetch()` não
 * expõe uma Promise, a vaga fica reservada por 2,5 s — acima do p95 esperado
 * para estes payloads estáticos e sem especulação nas ligações lentas.
 */
export default function ControladorPrefetchFocos({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const focoAtivo = focoDaRotaHomepage(pathname);
  const [pendente, setPendente] = useState<FocoHomepage | null>(null);
  const [anunciar, setAnunciar] = useState(false);
  const fila = useRef<Array<{ foco: FocoHomepage; origem: OrigemPrefetch }>>([]);
  const emCurso = useRef(false);
  const itemEmCurso = useRef<{
    foco: FocoHomepage;
    reserva: ReturnType<typeof setTimeout>;
  } | null>(null);
  const inicioPrefetch = useRef(new Map<FocoHomepage, { tempo: number; origem: OrigemPrefetch }>());
  const temporizadores = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const drenarRef = useRef<() => void>(() => {});
  const prepararRef = useRef<ContextoFocos["preparar"]>(() => {});
  const concluirRef = useRef<(foco: FocoHomepage) => void>(() => {});

  // Contrato de hidratação observável. O benchmark não pode assumir que o
  // evento `load` significa que os handlers do App Router já estão ligados,
  // sobretudo com CPU/rede reduzidas. A marca também torna esse intervalo
  // auditável sem criar estado, listeners ou trabalho por frame.
  useEffect(() => {
    if (focoAtivo) marcar("rc:foco:controller-ready", { foco: focoAtivo });
  }, [focoAtivo]);

  const agendar = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      temporizadores.current.delete(id);
      fn();
    }, ms);
    temporizadores.current.add(id);
    return id;
  }, []);

  const cancelarAgendado = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    temporizadores.current.delete(id);
  }, []);

  const concluir = useCallback((foco: FocoHomepage) => {
    preparados.add(foco);
    if (itemEmCurso.current?.foco !== foco) return;
    cancelarAgendado(itemEmCurso.current.reserva);
    itemEmCurso.current = null;
    emCurso.current = false;
    drenarRef.current();
  }, [cancelarAgendado]);
  concluirRef.current = concluir;

  const drenar = useCallback(() => {
    if (emCurso.current || document.visibilityState === "hidden") return;
    const item = fila.current.shift();
    if (!item) return;

    emCurso.current = true;
    if (item.origem === "idle") contarEspeculativo();
    const href = ROTA_POR_FOCO[item.foco];
    inicioPrefetch.current.set(item.foco, { tempo: performance.now(), origem: item.origem });
    marcar("rc:foco:prefetch-start", { foco: item.foco, origem: item.origem });
    const reserva = agendar(() => concluirRef.current(item.foco), RESERVA_CONCORRENCIA_MS);
    itemEmCurso.current = { foco: item.foco, reserva };
    const opcoes = {
      onInvalidate: () => {
        preparados.delete(item.foco);
        if ((intencaoAte.get(item.foco) ?? 0) > Date.now()) {
          prepararRef.current(item.foco, "intencao");
        }
      },
    } as Parameters<typeof router.prefetch>[1];
    router.prefetch(href, opcoes);
  }, [agendar, router]);
  drenarRef.current = drenar;

  const preparar = useCallback<ContextoFocos["preparar"]>(
    (foco, origem = "intencao") => {
      if (foco === focoAtivo || preparados.has(foco)) return;
      if (origem === "idle") {
        if (document.visibilityState !== "visible" || pouparDados()) return;
        if (lerEspeculativos() >= MAX_ESPECULATIVOS) return;
      } else {
        intencaoAte.set(foco, Date.now() + JANELA_INTENCAO_MS);
      }
      const existente = fila.current.find((item) => item.foco === foco);
      if (existente) {
        if (origem === "intencao" && existente.origem === "idle") {
          existente.origem = "intencao";
          fila.current.sort((a) => (a.origem === "intencao" ? -1 : 1));
        }
        return;
      }
      const item = { foco, origem };
      if (origem === "intencao") fila.current.unshift(item);
      else fila.current.push(item);
      drenarRef.current();
    },
    [focoAtivo],
  );
  prepararRef.current = preparar;

  const iniciar = useCallback<ContextoFocos["iniciar"]>(
    (destino, origem) => {
      if (!focoAtivo || destino === focoAtivo) return;
      const jaPreparado = preparados.has(destino);
      preparar(destino, "intencao");
      const inicio = performance.now();
      navegacaoPendente = {
        origem,
        partida: focoAtivo,
        destino,
        inicio,
        preparado: jaPreparado,
        ackRegistado: false,
        rscRegistado: false,
      };
      setPendente(destino);
      setAnunciar(false);
      marcar("rc:foco:pointerdown", { foco: destino, origem });
      marcar("rc:foco:navigation-start", { foco: destino, origem, preparado: jaPreparado });

      requestAnimationFrame(() => {
        const atual = navegacaoPendente;
        if (!atual || atual.destino !== destino || atual.ackRegistado) return;
        atual.ackRegistado = true;
        const duracao = performance.now() - atual.inicio;
        marcar("rc:foco:ack-painted", { foco: destino, duracao });
        registar("focus_switch_ack", {
          from_focus: atual.partida,
          to_focus: destino,
          input: atual.origem,
          prepared: atual.preparado,
          latency_bucket: baldeInteracao(duracao),
        });
      });

      agendar(() => setAnunciar(true), 120);
      agendar(() => {
        if (navegacaoPendente?.destino === destino) navegacaoPendente = null;
        setPendente((atual) => (atual === destino ? null : atual));
        setAnunciar(false);
      }, 10_000);
    },
    [agendar, focoAtivo, preparar],
  );

  // `router.prefetch` não expõe Promise. O Resource Timing dá-nos o fim
  // verdadeiro quando houve rede; cache hits ficam deliberadamente sem um
  // `prefetch-end` inventado. Ao terminar a resposta, a vaga da fila pode
  // ser libertada antes dos 2,5 s de segurança.
  useEffect(() => {
    if (!("PerformanceObserver" in window)) return;
    const observador = new PerformanceObserver((lista) => {
      for (const entrada of lista.getEntries() as PerformanceResourceTiming[]) {
        if (entrada.initiatorType !== "fetch") continue;
        let pathnameRecurso = "";
        try {
          pathnameRecurso = new URL(entrada.name, window.location.href).pathname;
        } catch {
          continue;
        }

        const focoRecurso = FOCOS_HOMEPAGE.find(
          (foco) => ROTA_POR_FOCO[foco] === pathnameRecurso,
        );
        if (!focoRecurso) continue;

        const prefetch = inicioPrefetch.current.get(focoRecurso);
        if (prefetch && entrada.startTime >= prefetch.tempo) {
          const duracao = Math.max(0, entrada.responseEnd - prefetch.tempo);
          marcar("rc:foco:prefetch-end", {
            foco: focoRecurso,
            origem: prefetch.origem,
            duracao,
            transferido: entrada.transferSize,
            comprimido: entrada.encodedBodySize,
          });
          inicioPrefetch.current.delete(focoRecurso);
          concluirRef.current(focoRecurso);
        }

        const navegacao = navegacaoPendente;
        if (
          navegacao &&
          !navegacao.rscRegistado &&
          navegacao.destino === focoRecurso &&
          entrada.startTime >= navegacao.inicio
        ) {
          navegacao.rscRegistado = true;
          marcar("rc:foco:rsc-end", {
            foco: focoRecurso,
            duracao: Math.max(0, entrada.responseEnd - navegacao.inicio),
            transferido: entrada.transferSize,
            comprimido: entrada.encodedBodySize,
          });
        }
      }
    });
    observador.observe({ type: "resource", buffered: true });
    return () => observador.disconnect();
  }, []);

  // O novo conteúdo confirma a navegação depois de duas frames: a primeira
  // faz o commit; a segunda prova que houve uma oportunidade de pintura.
  useEffect(() => {
    const atual = navegacaoPendente;
    if (!focoAtivo || !atual || atual.destino !== focoAtivo) return;
    let frame2: number | null = null;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        const duracao = performance.now() - atual.inicio;
        marcar("rc:foco:content-commit", { foco: focoAtivo, duracao });
        registar("focus_switch_ready", {
          from_focus: atual.partida,
          to_focus: focoAtivo,
          input: atual.origem,
          prepared: atual.preparado,
          latency_bucket: baldeInteracao(duracao),
        });
        navegacaoPendente = null;
        setPendente(null);
        setAnunciar(false);
      });
    });
    return () => {
      cancelAnimationFrame(frame1);
      if (frame2 !== null) cancelAnimationFrame(frame2);
    };
  }, [focoAtivo]);

  // Um único vizinho, apenas quando a página assentou e a ligação o permite.
  useEffect(() => {
    if (!focoAtivo) return;
    let idleId: number | null = null;
    const timeout = agendar(() => {
      const indice = FOCOS_HOMEPAGE.indexOf(focoAtivo);
      const adjacente = FOCOS_HOMEPAGE[(indice + 1) % FOCOS_HOMEPAGE.length];
      const janela = window as Window & {
        requestIdleCallback?: (cb: () => void, opcoes?: { timeout: number }) => number;
      };
      if (janela.requestIdleCallback) {
        idleId = janela.requestIdleCallback(() => preparar(adjacente, "idle"), { timeout: 2_000 });
      } else {
        preparar(adjacente, "idle");
      }
    }, 1_000);

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        fila.current = fila.current.filter((item) => item.origem !== "idle");
      }
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      clearTimeout(timeout);
      if (idleId !== null) {
        const janela = window as Window & { cancelIdleCallback?: (id: number) => void };
        janela.cancelIdleCallback?.(idleId);
      }
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [agendar, focoAtivo, preparar]);

  useEffect(
    () => () => {
      for (const id of temporizadores.current) clearTimeout(id);
      temporizadores.current.clear();
    },
    [],
  );

  const valor = useMemo(() => ({ pendente, preparar, iniciar }), [iniciar, pendente, preparar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <p className="sr-only" aria-live="polite">
        {anunciar && pendente ? `A abrir ${ROTULO_FOCO[pendente]}.` : ""}
      </p>
    </Contexto.Provider>
  );
}
