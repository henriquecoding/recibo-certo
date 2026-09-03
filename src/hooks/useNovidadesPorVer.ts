"use client";

import { useEffect, useState } from "react";
import { EVENTO_NOVIDADES_VISTAS, haNovidadesPorVer } from "@/components/novidades/abrir";

/**
 * `true` enquanto houver uma versão que esta pessoa ainda não abriu.
 *
 * Começa SEMPRE em `false` e só muda depois de montar. Não é timidez: o
 * servidor não sabe o que está no `localStorage` deste dispositivo, e pintar
 * o ponto no HTML servido dava um mismatch de hidratação em toda a gente que
 * já o tinha visto. Um ponto que aparece um fotograma depois é melhor do que
 * um ponto que o React tem de desmanchar.
 *
 * O evento é o que mantém as várias instâncias de acordo: o botão do
 * cabeçalho, o da folha e o do painel podem estar montados ao mesmo tempo.
 */
export function useNovidadesPorVer(): boolean {
  const [porVer, setPorVer] = useState(false);

  useEffect(() => {
    const ler = () => setPorVer(haNovidadesPorVer());
    ler();
    window.addEventListener(EVENTO_NOVIDADES_VISTAS, ler);
    // Outro separador do mesmo browser a abrir o painel também apaga o ponto.
    window.addEventListener("storage", ler);
    return () => {
      window.removeEventListener(EVENTO_NOVIDADES_VISTAS, ler);
      window.removeEventListener("storage", ler);
    };
  }, []);

  return porVer;
}
