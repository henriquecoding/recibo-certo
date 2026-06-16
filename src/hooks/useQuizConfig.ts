"use client";

import { useState, useCallback } from "react";

export interface QuizConfig {
  dificuldade: "facil" | "normal" | "dificil";
  tempoPorPergunta: number; // 0 = sem limite; 30 | 60 | 90
  perguntasPorSessao: number; // 5 | 10 | 15 | 20
  somAtivo: boolean;
  animacoesAtivas: boolean;
  explicacoesAutomaticas: boolean;
  atalhosTeclado: boolean;
  vibracaoAtiva: boolean;
}

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  dificuldade: "normal",
  tempoPorPergunta: 60,
  perguntasPorSessao: 10,
  somAtivo: true,
  animacoesAtivas: true,
  explicacoesAutomaticas: true,
  atalhosTeclado: true,
  vibracaoAtiva: true,
};

const STORAGE_KEY = "quiz-fiscal-config-v1";

export function useQuizConfig() {
  const [config, setConfig] = useState<QuizConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_QUIZ_CONFIG;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_QUIZ_CONFIG, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return DEFAULT_QUIZ_CONFIG;
  });

  const updateConfig = useCallback((updates: Partial<QuizConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_QUIZ_CONFIG);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { config, updateConfig, resetConfig };
}
