import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPerguntasAleatorias,
  embaralharOpcoes,
  embaralhar,
  type QuizCategoria,
  type QuizOpcao,
  type QuizPergunta,
} from "@/lib/quiz-fiscal";
import { calcularPontosPergunta, calcularStreakMaximo } from "@/lib/quiz-fiscal/progresso";
import type { Atividade } from "@/lib/fiscal-data";

export type QuizModo = "normal" | "guiado";
export type QuizStatus = "selecao" | "jogando" | "resultado";

export interface QuizFiscalConfig {
  modo: QuizModo;
  categoria?: QuizCategoria;
  atividade?: Atividade;
  quantidade?: number;
  /** Nível de dificuldade das perguntas (1=fácil, 2=médio, 3=difícil). */
  dificuldade?: 1 | 2 | 3;
}

export interface SessaoPergunta {
  pergunta: QuizPergunta;
  opcoes: QuizOpcao[];
  correta: number;
}

export interface RespostaRegistada {
  perguntaId: string;
  categoria: QuizCategoria;
  opcaoSelecionada: number | null;
  acertou: boolean;
  tempoGastoSeg: number;
  pontos: number;            // pontos ganhos nesta resposta (0 se errada)
  streakAoResponder: number; // streak activo APÓS esta resposta
}

export interface ResultadoCategoria {
  categoria: QuizCategoria;
  acertos: number;
  total: number;
}

export interface ClassificacaoQuiz {
  titulo: string;
  icone: "trophy" | "chart" | "book" | "seedling";
  mensagem: string;
}

export interface ResultadoQuiz {
  modo: QuizModo;
  totalPerguntas: number;
  acertos: number;
  percentagem: number;
  porCategoria: ResultadoCategoria[];
  respostas: RespostaRegistada[];
  classificacao: ClassificacaoQuiz;
  pontos: number;         // pontos totais da sessão
  streakMaximo: number;   // sequência mais longa de acertos
  tempoTotalSeg: number;  // tempo total gasto em segundos
}

export interface VantagensEstado {
  eliminar2: boolean;
  dica: boolean;
  tempoExtra: boolean;
  explicacao: boolean;
  pular: boolean;
  dobrar: boolean;
  segundaChance: boolean;
  escudo: boolean;
}

export const TIMER_NORMAL_SEGUNDOS = 20;
export const QUANTIDADE_DEFAULT = 10;

const PAUSA_FEEDBACK_MS = 1600;
const TEMPO_EXTRA_BONUS = 10;

const VANTAGENS_INICIAL: VantagensEstado = {
  eliminar2: false,
  dica: false,
  tempoExtra: false,
  explicacao: false,
  pular: false,
  dobrar: false,
  segundaChance: false,
  escudo: false,
};

const DOBRAR_MULTIPLICADOR = 2;

function classificar(percentagem: number): ClassificacaoQuiz {
  if (percentagem >= 90) return {
    titulo: "Mestre Fiscal",
    icone: "trophy",
    mensagem: "Domínio sólido das regras fiscais para trabalhadores independentes em Portugal.",
  };
  if (percentagem >= 70) return {
    titulo: "Conhecedor Avançado",
    icone: "chart",
    mensagem: "Já conheces bem o sistema — falta afinar alguns detalhes.",
  };
  if (percentagem >= 50) return {
    titulo: "Em Progresso",
    icone: "book",
    mensagem: "Estás a meio caminho. Revê as explicações para consolidar os conceitos.",
  };
  return {
    titulo: "A Começar",
    icone: "seedling",
    mensagem: "Bom ponto de partida — usa o Modo Guiado para aprender com cada resposta.",
  };
}

function calcularResultado(
  modo: QuizModo,
  sessao: SessaoPergunta[],
  respostas: RespostaRegistada[],
  inicioSessaoMs: number
): ResultadoQuiz {
  const acertos = respostas.filter((r) => r.acertou).length;
  const total = sessao.length;
  const percentagem = total > 0 ? Math.round((acertos / total) * 100) : 0;

  const porCategoriaMap = new Map<QuizCategoria, ResultadoCategoria>();
  for (const r of respostas) {
    const existente = porCategoriaMap.get(r.categoria) ?? { categoria: r.categoria, acertos: 0, total: 0 };
    existente.total++;
    if (r.acertou) existente.acertos++;
    porCategoriaMap.set(r.categoria, existente);
  }

  const pontos = respostas.reduce((sum, r) => sum + r.pontos, 0);
  const streakMaximo = calcularStreakMaximo(respostas.map((r) => r.acertou));
  const tempoTotalSeg = Math.round((Date.now() - inicioSessaoMs) / 1000);

  return {
    modo,
    totalPerguntas: total,
    acertos,
    percentagem,
    porCategoria: Array.from(porCategoriaMap.values()),
    respostas,
    classificacao: classificar(percentagem),
    pontos,
    streakMaximo,
    tempoTotalSeg,
  };
}

// Streak actual: acertos consecutivos no fim do array de respostas
function streakActualDe(respostas: RespostaRegistada[]): number {
  let s = 0;
  for (let i = respostas.length - 1; i >= 0; i--) {
    if (respostas[i].acertou) s++;
    else break;
  }
  return s;
}

export interface UseQuizFiscalReturn {
  status: QuizStatus;
  config: QuizFiscalConfig | null;
  sessao: SessaoPergunta[];
  indice: number;
  atual: SessaoPergunta | null;
  resultado: ResultadoQuiz | null;

  selecionada: number | null;
  respondida: boolean;
  tempoRestante: number;
  mostrarExplicacao: boolean;

  respostas: RespostaRegistada[];
  vantagens: VantagensEstado;
  eliminadas: number[];
  dicaVisivel: boolean;
  verExplicacaoAtiva: boolean;

  // Métricas derivadas da sessão corrente
  pontosAtuais: number;
  streakAtual: number;

  // Flags de vantagens ativas
  dobrarAtivo: boolean;
  segundaChanceAtiva: boolean;
  escudoAtivo: boolean;

  iniciar: (cfg: QuizFiscalConfig) => Promise<void>;
  responderNormal: (opcaoIdx: number | null) => void;
  selecionarOpcao: (opcaoIdx: number) => void;
  confirmarResposta: () => void;
  seguinte: () => void;
  reiniciar: () => void;
  jogarNovamente: () => void;

  usarEliminar2: () => void;
  usarDica: () => void;
  usarTempoExtra: () => void;
  usarExplicacao: () => void;
  usarPular: () => void;
  usarDobrar: () => void;
  usarSegundaChance: () => void;
  usarEscudo: () => void;
}

export function useQuizFiscal(): UseQuizFiscalReturn {
  const [status, setStatus] = useState<QuizStatus>("selecao");
  const [config, setConfig] = useState<QuizFiscalConfig | null>(null);
  const [sessao, setSessao] = useState<SessaoPergunta[]>([]);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<RespostaRegistada[]>([]);
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);

  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(TIMER_NORMAL_SEGUNDOS);

  const [vantagens, setVantagens] = useState<VantagensEstado>(VANTAGENS_INICIAL);
  const [eliminadas, setEliminadas] = useState<number[]>([]);
  const [dicaVisivel, setDicaVisivel] = useState(false);
  const [verExplicacaoAtiva, setVerExplicacaoAtiva] = useState(false);

  const [dobrarAtivo, setDobrarAtivo] = useState(false);
  const [segundaChanceAtiva, setSegundaChanceAtiva] = useState(false);
  const [escudoAtivo, setEscudoAtivo] = useState(false);
  const [emSegundaTentativa, setEmSegundaTentativa] = useState(false);

  const inicioPerguntaRef = useRef<number>(Date.now());
  const inicioSessaoRef = useRef<number>(Date.now());

  const construirSessao = useCallback(async (cfg: QuizFiscalConfig): Promise<SessaoPergunta[]> => {
    const quantidade = cfg.quantidade ?? QUANTIDADE_DEFAULT;
    let perguntas: QuizPergunta[];

    if (cfg.atividade) {
      // Gerador de atividade (pesado) carregado sob procura — só neste modo.
      const { gerarPerguntasAtividade } = await import("@/lib/quiz-fiscal/gerador-atividade");
      perguntas = gerarPerguntasAtividade(cfg.atividade, quantidade);
    } else {
      // Banco de perguntas carregado sob procura (já pré-aquecido no hover).
      perguntas = await getPerguntasAleatorias({
        quantidade,
        categoria: cfg.categoria,
        dificuldade: cfg.dificuldade,
      });
    }

    return perguntas.map((pergunta) => {
      const { opcoes, correta } = embaralharOpcoes(pergunta);
      return { pergunta, opcoes, correta };
    });
  }, []);

  const iniciar = useCallback(async (cfg: QuizFiscalConfig) => {
    const novaSessao = await construirSessao(cfg);
    const agora = Date.now();
    setConfig(cfg);
    setSessao(novaSessao);
    setIndice(0);
    setRespostas([]);
    setSelecionada(null);
    setRespondida(false);
    setMostrarExplicacao(false);
    setTempoRestante(TIMER_NORMAL_SEGUNDOS);
    setResultado(null);
    setVantagens(VANTAGENS_INICIAL);
    setEliminadas([]);
    setDicaVisivel(false);
    setVerExplicacaoAtiva(false);
    setDobrarAtivo(false);
    setSegundaChanceAtiva(false);
    setEscudoAtivo(false);
    setEmSegundaTentativa(false);
    setStatus("jogando");
    inicioPerguntaRef.current = agora;
    inicioSessaoRef.current = agora;
  }, [construirSessao]);

  const jogarNovamente = useCallback(() => {
    if (!config) return;
    iniciar(config);
  }, [config, iniciar]);

  const reiniciar = useCallback(() => {
    setStatus("selecao");
    setConfig(null);
    setSessao([]);
    setIndice(0);
    setRespostas([]);
    setResultado(null);
    setSelecionada(null);
    setRespondida(false);
    setMostrarExplicacao(false);
    setTempoRestante(TIMER_NORMAL_SEGUNDOS);
    setVantagens(VANTAGENS_INICIAL);
    setEliminadas([]);
    setDicaVisivel(false);
    setVerExplicacaoAtiva(false);
    setDobrarAtivo(false);
    setSegundaChanceAtiva(false);
    setEscudoAtivo(false);
    setEmSegundaTentativa(false);
  }, []);

  const irParaProxima = useCallback(
    (respostasAtualizadas: RespostaRegistada[]) => {
      const proximoIndice = indice + 1;
      if (proximoIndice >= sessao.length) {
        setResultado(calcularResultado(config?.modo ?? "normal", sessao, respostasAtualizadas, inicioSessaoRef.current));
        setStatus("resultado");
        return;
      }
      setIndice(proximoIndice);
      setSelecionada(null);
      setRespondida(false);
      setMostrarExplicacao(false);
      setTempoRestante(TIMER_NORMAL_SEGUNDOS);
      setEliminadas([]);
      setDicaVisivel(false);
      setVerExplicacaoAtiva(false);
      setDobrarAtivo(false);
      setSegundaChanceAtiva(false);
      setEscudoAtivo(false);
      setEmSegundaTentativa(false);
      inicioPerguntaRef.current = Date.now();
    },
    [indice, sessao, config]
  );

  const responderNormal = useCallback(
    (opcaoIdx: number | null) => {
      if (respondida) return;
      const item = sessao[indice];
      if (!item) return;

      const tempoGastoSeg = Math.round((Date.now() - inicioPerguntaRef.current) / 1000);
      const acertou = opcaoIdx !== null && opcaoIdx === item.correta;
      const streakAntes = streakActualDe(respostas);

      // Segunda Chance: if wrong and active, allow a second try instead of finalizing
      if (!acertou && segundaChanceAtiva && !emSegundaTentativa && opcaoIdx !== null) {
        setSelecionada(opcaoIdx);
        setEliminadas((prev) => [...prev, opcaoIdx]);
        setEmSegundaTentativa(true);
        setSegundaChanceAtiva(false);
        return;
      }

      let pontos = acertou
        ? calcularPontosPergunta({
            dificuldade: item.pergunta.dificuldade,
            streakAntes,
            modo: config?.modo ?? "normal",
            tempoGastoSeg,
          })
        : 0;

      if (acertou && dobrarAtivo) pontos *= DOBRAR_MULTIPLICADOR;

      // Escudo: protect streak if wrong
      const streakFinal = acertou
        ? streakAntes + 1
        : escudoAtivo ? streakAntes : 0;

      const registo: RespostaRegistada = {
        perguntaId: item.pergunta.id,
        categoria: item.pergunta.categoria,
        opcaoSelecionada: opcaoIdx,
        acertou,
        tempoGastoSeg,
        pontos,
        streakAoResponder: streakFinal,
      };

      setSelecionada(opcaoIdx);
      setRespondida(true);
      if (escudoAtivo && !acertou) setEscudoAtivo(false);

      const novasRespostas = [...respostas, registo];
      setRespostas(novasRespostas);

      if (verExplicacaoAtiva) {
        setMostrarExplicacao(true);
      } else {
        setTimeout(() => irParaProxima(novasRespostas), PAUSA_FEEDBACK_MS);
      }
    },
    [respondida, sessao, indice, respostas, irParaProxima, verExplicacaoAtiva, config, dobrarAtivo, segundaChanceAtiva, emSegundaTentativa, escudoAtivo]
  );

  const selecionarOpcao = useCallback(
    (opcaoIdx: number) => {
      if (respondida) return;
      if (eliminadas.includes(opcaoIdx)) return;
      setSelecionada(opcaoIdx);
    },
    [respondida, eliminadas]
  );

  const confirmarResposta = useCallback(() => {
    if (respondida || selecionada === null) return;
    const item = sessao[indice];
    if (!item) return;

    const tempoGastoSeg = Math.round((Date.now() - inicioPerguntaRef.current) / 1000);
    const acertou = selecionada === item.correta;
    const streakAntes = streakActualDe(respostas);

    // Segunda Chance in guiado mode
    if (!acertou && segundaChanceAtiva && !emSegundaTentativa) {
      setEliminadas((prev) => [...prev, selecionada]);
      setSelecionada(null);
      setEmSegundaTentativa(true);
      setSegundaChanceAtiva(false);
      return;
    }

    let pontos = acertou
      ? calcularPontosPergunta({
          dificuldade: item.pergunta.dificuldade,
          streakAntes,
          modo: "guiado",
          tempoGastoSeg,
        })
      : 0;

    if (acertou && dobrarAtivo) pontos *= DOBRAR_MULTIPLICADOR;

    const streakFinal = acertou
      ? streakAntes + 1
      : escudoAtivo ? streakAntes : 0;

    const registo: RespostaRegistada = {
      perguntaId: item.pergunta.id,
      categoria: item.pergunta.categoria,
      opcaoSelecionada: selecionada,
      acertou,
      tempoGastoSeg,
      pontos,
      streakAoResponder: streakFinal,
    };

    setRespostas((prev) => [...prev, registo]);
    setRespondida(true);
    setMostrarExplicacao(true);
    if (escudoAtivo && !acertou) setEscudoAtivo(false);
  }, [respondida, selecionada, sessao, indice, respostas, dobrarAtivo, segundaChanceAtiva, emSegundaTentativa, escudoAtivo]);

  const seguinte = useCallback(() => {
    if (!respondida) return;
    irParaProxima(respostas);
  }, [respondida, respostas, irParaProxima]);

  // Vantagens

  const usarEliminar2 = useCallback(() => {
    if (vantagens.eliminar2 || respondida) return;
    const item = sessao[indice];
    if (!item) return;
    const wrongIndices = item.opcoes.map((_, i) => i).filter((i) => i !== item.correta);
    const shuffled = embaralhar(wrongIndices);
    setEliminadas(shuffled.slice(0, 2));
    setVantagens((v) => ({ ...v, eliminar2: true }));
  }, [vantagens.eliminar2, respondida, sessao, indice]);

  const usarDica = useCallback(() => {
    if (vantagens.dica || respondida) return;
    setDicaVisivel(true);
    setVantagens((v) => ({ ...v, dica: true }));
  }, [vantagens.dica, respondida]);

  const usarTempoExtra = useCallback(() => {
    if (vantagens.tempoExtra || respondida || config?.modo !== "normal") return;
    setTempoRestante((t) => t + TEMPO_EXTRA_BONUS);
    setVantagens((v) => ({ ...v, tempoExtra: true }));
  }, [vantagens.tempoExtra, respondida, config?.modo]);

  const usarExplicacao = useCallback(() => {
    if (vantagens.explicacao || respondida || config?.modo !== "normal") return;
    setVerExplicacaoAtiva(true);
    setVantagens((v) => ({ ...v, explicacao: true }));
  }, [vantagens.explicacao, respondida, config?.modo]);

  const usarPular = useCallback(() => {
    if (vantagens.pular || respondida) return;
    setVantagens((v) => ({ ...v, pular: true }));
    irParaProxima(respostas);
  }, [vantagens.pular, respondida, irParaProxima, respostas]);

  const usarDobrar = useCallback(() => {
    if (vantagens.dobrar || respondida) return;
    setDobrarAtivo(true);
    setVantagens((v) => ({ ...v, dobrar: true }));
  }, [vantagens.dobrar, respondida]);

  const usarSegundaChance = useCallback(() => {
    if (vantagens.segundaChance || respondida) return;
    setSegundaChanceAtiva(true);
    setVantagens((v) => ({ ...v, segundaChance: true }));
  }, [vantagens.segundaChance, respondida]);

  const usarEscudo = useCallback(() => {
    if (vantagens.escudo || respondida) return;
    setEscudoAtivo(true);
    setVantagens((v) => ({ ...v, escudo: true }));
  }, [vantagens.escudo, respondida]);

  // Timer (modo normal)
  useEffect(() => {
    if (config?.modo !== "normal" || status !== "jogando" || respondida) return;
    if (tempoRestante <= 0) {
      responderNormal(null);
      return;
    }
    const t = setTimeout(() => setTempoRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [config, status, tempoRestante, respondida, responderNormal]);

  // Métricas derivadas (sem estado extra)
  const pontosAtuais = respostas.reduce((sum, r) => sum + r.pontos, 0);
  const streakAtual = streakActualDe(respostas);

  return {
    status,
    config,
    sessao,
    indice,
    atual: sessao[indice] ?? null,
    resultado,
    selecionada,
    respondida,
    tempoRestante,
    mostrarExplicacao,
    respostas,
    vantagens,
    eliminadas,
    dicaVisivel,
    verExplicacaoAtiva,
    pontosAtuais,
    streakAtual,
    dobrarAtivo,
    segundaChanceAtiva,
    escudoAtivo,
    iniciar,
    responderNormal,
    selecionarOpcao,
    confirmarResposta,
    seguinte,
    reiniciar,
    jogarNovamente,
    usarEliminar2,
    usarDica,
    usarTempoExtra,
    usarExplicacao,
    usarPular,
    usarDobrar,
    usarSegundaChance,
    usarEscudo,
  };
}
