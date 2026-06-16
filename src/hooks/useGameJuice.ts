"use client";

import { useCallback } from "react";

type PadraoVibrar = "acerto" | "erro" | "toque";

export function useGameJuice() {
  const vibrar = useCallback((padrao: PadraoVibrar) => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    if (padrao === "acerto") navigator.vibrate([40, 20, 40]);
    else if (padrao === "erro") navigator.vibrate(180);
    else navigator.vibrate(15);
  }, []);

  const tom = useCallback((freq: number, dur: number, tipo: OscillatorType = "sine") => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC() as AudioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 10, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // política de autoplay do browser — falha silenciosa
    }
  }, []);

  const soarAcerto = useCallback(() => {
    vibrar("acerto");
    tom(523, 0.12);                         // C5
    setTimeout(() => tom(659, 0.12), 90);   // E5
    setTimeout(() => tom(784, 0.18), 180);  // G5
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
