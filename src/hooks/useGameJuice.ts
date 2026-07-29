"use client";

import { useCallback, useEffect, useRef } from "react";

type PadraoVibrar = "acerto" | "erro" | "toque";

export interface GameJuiceOpcoes {
  /** Respeita a definição «Efeitos sonoros» do painel. */
  somAtivo?: boolean;
  /** Respeita a definição «Vibração» do painel. */
  vibracaoAtiva?: boolean;
}

/**
 * Som e vibração do quiz.
 *
 * Duas correções face à versão anterior:
 *
 *  · **Respeita as definições.** Tocava e vibrava SEMPRE, sem consultar
 *    `somAtivo` nem `vibracaoAtiva`. O utilizador desligava o som no painel,
 *    o som continuava, e deixava de confiar no resto do produto.
 *
 *  · **Um único `AudioContext`.** Criava um contexto novo em cada tom e nunca
 *    o fechava; `soarAcerto()` toca três tons, ou seja três contextos por
 *    resposta certa. O Chrome limita a ~6 contextos por página — o som morria
 *    ao fim de duas respostas certas. Agora há um só, criado no primeiro
 *    gesto do utilizador (política de autoplay) e fechado ao desmontar.
 */
export function useGameJuice(opcoes: GameJuiceOpcoes = {}) {
  const { somAtivo = true, vibracaoAtiva = true } = opcoes;
  const ctxRef = useRef<AudioContext | null>(null);

  // Fecha o contexto ao desmontar, para não deixar recursos de áudio presos.
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== "closed") void ctx.close().catch(() => { /* ignore */ });
    };
  }, []);

  /** Contexto partilhado, criado à primeira utilização e reutilizado sempre. */
  const obterContexto = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        ctxRef.current = new AC();
      }
      // A política de autoplay suspende o contexto até haver um gesto; como
      // estes sons nascem sempre de um clique ou de uma tecla, retomar aqui é
      // seguro e resolve o silêncio no primeiro toque.
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume().catch(() => { /* ignore */ });
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const vibrar = useCallback(
    (padrao: PadraoVibrar) => {
      if (!vibracaoAtiva) return;
      if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
      if (padrao === "acerto") navigator.vibrate([40, 20, 40]);
      else if (padrao === "erro") navigator.vibrate(180);
      else navigator.vibrate(15);
    },
    [vibracaoAtiva],
  );

  const tom = useCallback(
    (freq: number, dur: number, tipo: OscillatorType = "sine", atrasoSeg = 0) => {
      if (!somAtivo) return;
      const ctx = obterContexto();
      if (!ctx) return;
      try {
        const inicio = ctx.currentTime + atrasoSeg;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 10, inicio);
        gain.gain.setValueAtTime(0.08, inicio);
        gain.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(inicio);
        osc.stop(inicio + dur);
      } catch {
        // política de autoplay do browser — falha silenciosa
      }
    },
    [somAtivo, obterContexto],
  );

  const soarAcerto = useCallback(() => {
    vibrar("acerto");
    // Agendado no próprio relógio do contexto, em vez de `setTimeout`: o
    // arpejo mantém-se afinado mesmo com a página ocupada.
    tom(523, 0.12);            // C5
    tom(659, 0.12, "sine", 0.09); // E5
    tom(784, 0.18, "sine", 0.18); // G5
  }, [vibrar, tom]);

  const soarErro = useCallback(() => {
    vibrar("erro");
    tom(200, 0.28, "sawtooth");
  }, [vibrar, tom]);

  const soarToque = useCallback(() => {
    vibrar("toque");
    tom(440, 0.06);
  }, [vibrar, tom]);

  return { soarAcerto, soarErro, soarToque };
}
