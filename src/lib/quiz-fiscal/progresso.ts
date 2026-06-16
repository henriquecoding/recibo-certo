// Funções puras para sistema de pontuação, XP e progressão do Quiz Fiscal.
// Sem side effects — importar livremente em hook e componentes.

export interface NivelInfo {
  nivel: number;
  titulo: string;
  xpMinimo: number;
  xpProximo: number | null; // null = nível máximo
}

export const NIVEIS: NivelInfo[] = [
  { nivel: 1,  titulo: "Contribuinte Curioso",  xpMinimo: 0,     xpProximo: 200   },
  { nivel: 2,  titulo: "Aprendiz Fiscal",       xpMinimo: 200,   xpProximo: 500   },
  { nivel: 3,  titulo: "Emitente Ativo",        xpMinimo: 500,   xpProximo: 1000  },
  { nivel: 4,  titulo: "Recibo Certo",          xpMinimo: 1000,  xpProximo: 2000  },
  { nivel: 5,  titulo: "Conhecedor Avançado",   xpMinimo: 2000,  xpProximo: 3500  },
  { nivel: 6,  titulo: "Consultor Júnior",      xpMinimo: 3500,  xpProximo: 5500  },
  { nivel: 7,  titulo: "Especialista IRS",      xpMinimo: 5500,  xpProximo: 8000  },
  { nivel: 8,  titulo: "Mestre da AT",          xpMinimo: 8000,  xpProximo: 12000 },
  { nivel: 9,  titulo: "Perito Fiscal",         xpMinimo: 12000, xpProximo: 20000 },
  { nivel: 10, titulo: "Guru do IRS",           xpMinimo: 20000, xpProximo: null  },
];

export const ENERGIA_DIARIA = 5;
const PONTOS_POR_XP = 10;
const BONUS_CONCLUSAO = 20;
const BONUS_PERFEITO = 50;

// Pontos para uma resposta correta numa pergunta específica.
export function calcularPontosPergunta(params: {
  dificuldade: 1 | 2 | 3;
  streakAntes: number;    // acertos consecutivos antes desta resposta
  modo: "normal" | "guiado";
  tempoGastoSeg: number;  // segundos gastos na pergunta
}): number {
  const { dificuldade, streakAntes, modo, tempoGastoSeg } = params;

  const BASE = dificuldade === 3 ? 80 : dificuldade === 2 ? 50 : 30;

  // Bónus de velocidade apenas no modo normal (timer = 20s)
  const speedBonus = modo === "normal"
    ? Math.max(0, Math.round((1 - Math.min(tempoGastoSeg, 20) / 20) * 20))
    : 0;

  // Multiplicador de streak (caps em 10)
  const streak = Math.min(streakAntes, 10);
  const mult =
    streak >= 8 ? 2.0 :
    streak >= 5 ? 1.5 :
    streak >= 3 ? 1.2 :
    streak >= 1 ? 1.1 :
    1.0;

  return Math.round((BASE + speedBonus) * mult);
}

// XP ganho na sessão completa.
export function calcularXPSessao(params: {
  pontos: number;
  acertos: number;
  total: number;
}): number {
  const { pontos, acertos, total } = params;
  const base = Math.floor(pontos / PONTOS_POR_XP);
  const perfeito = acertos === total ? BONUS_PERFEITO : 0;
  return base + BONUS_CONCLUSAO + perfeito;
}

// Streak máximo de uma sessão (sequência mais longa de acertos consecutivos).
export function calcularStreakMaximo(acertaram: boolean[]): number {
  let max = 0;
  let atual = 0;
  for (const acertou of acertaram) {
    if (acertou) { atual++; max = Math.max(max, atual); }
    else atual = 0;
  }
  return max;
}

// Nível correspondente a um total de XP.
export function nivelParaXP(xp: number): NivelInfo {
  let info = NIVEIS[0];
  for (const n of NIVEIS) {
    if (xp >= n.xpMinimo) info = n;
    else break;
  }
  return info;
}

// Percentagem de progresso dentro do nível atual (0–100).
export function xpProgressoPct(xp: number): number {
  const nivel = nivelParaXP(xp);
  if (!nivel.xpProximo) return 100;
  const xpNoNivel = xp - nivel.xpMinimo;
  const xpRange = nivel.xpProximo - nivel.xpMinimo;
  return Math.min(100, Math.round((xpNoNivel / xpRange) * 100));
}

// Verifica/repõe energia diária (reset à meia-noite local).
export function calcularEnergiaAtual(
  energiaRestante: number,
  resetAt: string | null
): { energia: number; resetAt: string } {
  const agora = new Date();
  if (resetAt && agora < new Date(resetAt)) {
    return { energia: Math.max(0, energiaRestante), resetAt };
  }
  // Passou a meia-noite → repõe energia. Próximo reset = meia-noite seguinte.
  const proximo = new Date(agora);
  proximo.setDate(proximo.getDate() + 1);
  proximo.setHours(0, 0, 0, 0);
  return { energia: ENERGIA_DIARIA, resetAt: proximo.toISOString() };
}
