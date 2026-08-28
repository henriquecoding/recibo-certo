"use client";

import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";

// Um palco pode ter dezenas de peças, mas só uma fonte de tempo. Cada peça
// acumula o seu próprio progresso a partir deste `delta`; nenhuma abre um
// segundo `requestAnimationFrame`.
export interface FrameDoPalco {
  agora: number;
  /** Milissegundos úteis desde o frame anterior. É zero ao retomar. */
  delta: number;
}

export type OuvinteDoPalco = (frame: FrameDoPalco) => boolean | void;

export interface RelogioDeCena {
  /**
   * `false` devolvido pelo ouvinte desinscreve-o no fim do frame. Isto evita
   * deixar o relógio acordado depois de uma interpolação terminar.
   */
  inscrever: (ouvinte: OuvinteDoPalco) => () => void;
}

export const RELOGIO_DE_CENA_NULO: RelogioDeCena = {
  inscrever: () => () => {},
};

// Todas as cenas partilham um único listener global. Cada relógio conserva o
// seu próprio estado de execução, mas não multiplica trabalho no `document`.
const ouvintesDeVisibilidade = new Set<() => void>();
let listenerDeVisibilidadeInstalado = false;

const avisarVisibilidade = () => {
  for (const ouvinte of ouvintesDeVisibilidade) ouvinte();
};

function subscreverVisibilidade(ouvinte: () => void) {
  ouvintesDeVisibilidade.add(ouvinte);
  if (!listenerDeVisibilidadeInstalado) {
    document.addEventListener("visibilitychange", avisarVisibilidade);
    listenerDeVisibilidadeInstalado = true;
  }
  ouvinte();
  return () => {
    ouvintesDeVisibilidade.delete(ouvinte);
    if (ouvintesDeVisibilidade.size === 0 && listenerDeVisibilidadeInstalado) {
      document.removeEventListener("visibilitychange", avisarVisibilidade);
      listenerDeVisibilidadeInstalado = false;
    }
  };
}

/**
 * O único agendador JavaScript de uma cena.
 *
 * Além da pausa explícita, suspende quando o documento fica escondido ou a
 * moldura sai do viewport. Ao retomar, o primeiro `delta` é zero: o tempo em
 * segundo plano nunca entra na coreografia e não há saltos.
 */
export function useRelogioDeCena({
  parado,
  estatico,
  alvo,
}: {
  parado: boolean;
  estatico: boolean;
  alvo?: RefObject<Element | null>;
}): RelogioDeCena {
  const ouvintes = useRef(new Set<OuvinteDoPalco>());
  const raf = useRef<number | null>(null);
  const ultimo = useRef<number | null>(null);
  const paradoRef = useRef(parado);
  const estaticoRef = useRef(estatico);
  const documentoVisivel = useRef(true);
  const emVista = useRef(alvo == null);
  const passoRef = useRef<(agora: number) => void>(() => {});
  const marcouPrimeiroFrame = useRef(false);

  paradoRef.current = parado;
  estaticoRef.current = estatico;

  const podeCorrer = useCallback(
    () =>
      !paradoRef.current &&
      !estaticoRef.current &&
      documentoVisivel.current &&
      emVista.current &&
      ouvintes.current.size > 0,
    [],
  );

  const cancelar = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    ultimo.current = null;
  }, []);

  const agendar = useCallback(() => {
    if (raf.current !== null || !podeCorrer()) return;
    raf.current = requestAnimationFrame((agora) => passoRef.current(agora));
  }, [podeCorrer]);

  passoRef.current = (agora) => {
    raf.current = null;
    if (!podeCorrer()) {
      ultimo.current = null;
      return;
    }

    const delta = ultimo.current === null ? 0 : Math.max(0, agora - ultimo.current);
    ultimo.current = agora;

    if (!marcouPrimeiroFrame.current) {
      marcouPrimeiroFrame.current = true;
      const detalhe = {
        palco: alvo?.current?.getAttribute("data-palco") ?? "homepage",
        rota: window.location.pathname,
      };
      try {
        performance.mark("rc:foco:first-animation-frame", { detail: detalhe });
      } catch {
        performance.mark("rc:foco:first-animation-frame");
      }
      window.dispatchEvent(
        new CustomEvent("rc:foco:first-animation-frame", { detail: detalhe }),
      );
    }

    for (const ouvinte of [...ouvintes.current]) {
      if (ouvinte({ agora, delta }) === false) ouvintes.current.delete(ouvinte);
    }
    agendar();
  };

  const inscrever = useCallback(
    (ouvinte: OuvinteDoPalco) => {
      ouvintes.current.add(ouvinte);
      agendar();
      return () => {
        ouvintes.current.delete(ouvinte);
        if (ouvintes.current.size === 0) cancelar();
      };
    },
    [agendar, cancelar],
  );

  useEffect(() => {
    if (podeCorrer()) agendar();
    else cancelar();
  }, [agendar, cancelar, estatico, parado, podeCorrer]);

  useEffect(() => {
    const aoMudarVisibilidade = () => {
      documentoVisivel.current = document.visibilityState !== "hidden";
      if (documentoVisivel.current) agendar();
      else cancelar();
    };
    return subscreverVisibilidade(aoMudarVisibilidade);
  }, [agendar, cancelar]);

  useEffect(() => {
    const no = alvo?.current;
    if (!no || typeof IntersectionObserver === "undefined") {
      emVista.current = true;
      agendar();
      return;
    }

    const aplicar = (visivel: boolean) => {
      emVista.current = visivel;
      no.toggleAttribute("data-palco-suspenso", !visivel);
      if (visivel) agendar();
      else cancelar();
    };
    const observador = new IntersectionObserver(
      ([entrada]) => aplicar(Boolean(entrada?.isIntersecting)),
      { threshold: 0.01 },
    );
    observador.observe(no);
    return () => {
      observador.disconnect();
      no.removeAttribute("data-palco-suspenso");
    };
  }, [agendar, alvo, cancelar]);

  useEffect(
    () => () => {
      cancelar();
      ouvintes.current.clear();
    },
    [cancelar],
  );

  return useMemo(() => ({ inscrever }), [inscrever]);
}
