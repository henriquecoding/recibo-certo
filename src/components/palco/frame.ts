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

// ┌─────────────────────────────────────────────────────────────────────┐
// │ O PALCO QUE SAI PÁRA JÁ — e sem pagar um render por isso            │
// │                                                                     │
// │ Só o `usePalco` ouvia `rc:foco:navigation-start`, e respondia com   │
// │ `setParado(true)`. Duas consequências medidas:                      │
// │                                                                     │
// │  · `PalcoDescobrir` e `HeroPreco` têm máquina de estados própria e  │
// │    NÃO passavam por lá — ou seja, os dois palcos de onde mais se    │
// │    sai (`/` e `/inicio/preco`) continuavam a animar durante a troca │
// │    inteira, a competir com a montagem do destino;                   │
// │  · onde havia listener, parar custava um render completo do palco   │
// │    que está a desaparecer — trabalho novo dentro da janela em que   │
// │    o orçamento é de 100 ms.                                         │
// │                                                                     │
// │ Aqui a paragem é imperativa: cancela o `requestAnimationFrame` na   │
// │ mesma tarefa do evento, sem tocar em estado.                        │
// │                                                                     │
// │ Uma cena volta a ter direito a andar quando a troca CONFIRMA — se   │
// │ este palco ainda estiver montado nessa altura, a navegação não o    │
// │ levou e ele não pode ficar congelado com um botão a dizer «Pausar». │
// │ Também a retomam os sinais explícitos de vida: a pessoa a carregar  │
// │ em «Retomar» (mudança de `parado`) e uma cena a reinscrever-se no   │
// │ relógio («Rever», régua de atos).                                   │
// └─────────────────────────────────────────────────────────────────────┘
interface OuvinteDeNavegacao {
  aoSair: () => void;
  aoConfirmar: () => void;
}

const ouvintesDeNavegacao = new Set<OuvinteDeNavegacao>();
let listenerDeNavegacaoInstalado = false;

const avisarSaida = () => {
  for (const ouvinte of ouvintesDeNavegacao) ouvinte.aoSair();
};
const avisarConfirmacao = () => {
  for (const ouvinte of ouvintesDeNavegacao) ouvinte.aoConfirmar();
};

function subscreverNavegacao(ouvinte: OuvinteDeNavegacao) {
  ouvintesDeNavegacao.add(ouvinte);
  if (!listenerDeNavegacaoInstalado) {
    window.addEventListener("rc:foco:navigation-start", avisarSaida);
    window.addEventListener("rc:foco:content-commit", avisarConfirmacao);
    listenerDeNavegacaoInstalado = true;
  }
  return () => {
    ouvintesDeNavegacao.delete(ouvinte);
    if (ouvintesDeNavegacao.size === 0 && listenerDeNavegacaoInstalado) {
      window.removeEventListener("rc:foco:navigation-start", avisarSaida);
      window.removeEventListener("rc:foco:content-commit", avisarConfirmacao);
      listenerDeNavegacaoInstalado = false;
    }
  };
}

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
  const abandonado = useRef(false);

  // Uma mudança de `parado` ou de `estatico` é sempre um sinal explícito:
  // alguém carregou em «Retomar», ou a preferência de movimento mudou. Nos
  // dois casos, a cena volta a ter direito a andar.
  if (paradoRef.current !== parado || estaticoRef.current !== estatico) {
    abandonado.current = false;
  }
  paradoRef.current = parado;
  estaticoRef.current = estatico;

  const podeCorrer = useCallback(
    () =>
      !paradoRef.current &&
      !estaticoRef.current &&
      !abandonado.current &&
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
      // Uma inscrição nova é a outra forma de dizer «esta cena vai andar»:
      // é o que «Rever» e a régua de atos fazem, por via do `ciclo`.
      abandonado.current = false;
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
    return subscreverNavegacao({
      aoSair: () => {
        abandonado.current = true;
        cancelar();
      },
      aoConfirmar: () => {
        abandonado.current = false;
        // `agendar` respeita `podeCorrer`: no palco de destino, que ainda
        // não teve licença de arranque, isto não faz nada.
        agendar();
      },
    });
  }, [agendar, cancelar]);

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
