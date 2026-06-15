import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPerguntasAleatorias,
  embaralharOpcoes,
  embaralhar,
  type QuizCategoria,
  type QuizOpcao,
  type QuizPergunta,
} from "@/lib/quiz-fiscal";

export type QuizModo = "normal" | "guiado";
export type QuizStatus = "selecao" | "jogando" | "resultado";

export interface QuizFiscalConfig {
  modo: QuizModo;
  categoria?: QuizCategoria;
  quantidade?: number;
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
}

export interface VantagensEstado {
  eliminar2: boolean;
  dica: boolean;
  tempoExtra: boolean;
  explicacao: boolean;
}

const TIMER_NORMAL_SEGUNDOS = 20;
const PAUSA_FEEDBACK_MS = 1600;
const QUANTIDADE_DEFAULT = 10;
const TEMPO_EXTRA_BONUS = 10;

const VANTAGENS_INICIAL: VantagensEstado = {
  eliminar2: false,
  dica: false,
  tempoExtra: false,
  explicacao: false,
};

function classificar(percentagem: number): ClassificacaoQuiz {
  if (percentagem >= 90) {
    return {
      titulo: "Mestre Fiscal",
      icone: "trophy",
      mensagem: "Domínio sólido das regras fiscais para trabalhadores independentes em Portugal.",
    };
  }
  if (percentagem >= 70) {
    return {
      titulo: "Conhecedor Avançado",
      icone: "chart",
      mensagem: "Já conheces bem o sistema — falta afinar alguns detalhes.",
    };
  }
  if (percentagem >= 50) {
    return {
      titulo: "Em Progresso",
      icone: "book",
      mensagem: "Estás a meio caminho. Revê as explicações para consolidar os conceitos.",
    };
  }
  return {
    titulo: "A Começar",
    icone: "seedling",
    mensagem: "Bom ponto de partida — usa o Modo Guiado para aprender com cada resposta.",
  };
}

function calcularResultado(modo: QuizModo, sessao: SessaoPergunta[], respostas: RespostaRegistada[]): ResultadoQuiz {
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

  return {
    modo,
    totalPerguntas: total,
    acertos,
    percentagem,
    porCategoria: Array.from(porCategoriaMap.values()),
    respostas,
    classificacao: classificar(percentagem),
  };
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

  iniciar: (cfg: QuizFiscalConfig) => void;
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

  const inicioPerguntaRef = useRef<number>(Date.now());

  const construirSessao = useCallback((cfg: QuizFiscalConfig): SessaoPergunta[] => {
    const perguntas = getPerguntasAleatorias({
      quantidade: cfg.quantidade ?? QUANTIDADE_DEFAULT,
      categoria: cfg.categoria,
    });
    return perguntas.map((pergunta) => {
      const { opcoes, correta } = embaralharOpcoes(pergunta);
      return { pergunta, opcoes, correta };
    });
  }, []);

  const iniciar = useCallback(
    (cfg: QuizFiscalConfig) => {
      const novaSessao = construirSessao(cfg);
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
      setStatus("jogando");
      inicioPerguntaRef.current = Date.now();
    },
    [construirSessao]
  );

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
  }, []);

  const irParaProxima = useCallback(
    (respostasAtualizadas: RespostaRegistada[]) => {
      const proximoIndice = indice + 1;
      if (proximoIndice >= sessao.length) {
        setResultado(calcularResultado(config?.modo ?? "normal", sessao, respostasAtualizadas));
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
      inicioPerguntaRef.current = Date.now();
    },
    [indice, sessao, config]
  );

  const responderNormal = useCallback(
    (opcaoIdx: number | null) => {
      if (respondida) return;
      const item = sessao[indice];
      if (!item) return;

      const tempoGasto = Math.round((Date.now() - inicioPerguntaRef.current) / 1000);
      const acertou = opcaoIdx !== null && opcaoIdx === item.correta;

      const registo: RespostaRegistada = {
        perguntaId: item.pergunta.id,
        categoria: item.pergunta.categoria,
        opcaoSelecionada: opcaoIdx,
        acertou,
        tempoGastoSeg: tempoGasto,
      };

      setSelecionada(opcaoIdx);
      setRespondida(true);

      const novasRespostas = [...respostas, registo];
      setRespostas(novasRespostas);

      if (verExplicacaoAtiva) {
        setMostrarExplicacao(true);
      } else {
        setTimeout(() => irParaProxima(novasRespostas), PAUSA_FEEDBACK_MS);
      }
    },
    [respondida, sessao, indice, respostas, irParaProxima, verExplicacaoAtiva]
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

    const tempoGasto = Math.round((Date.now() - inicioPerguntaRef.current) / 1000);
    const acertou = selecionada === item.correta;

    const registo: RespostaRegistada = {
      perguntaId: item.pergunta.id,
      categoria: item.pergunta.categoria,
      opcaoSelecionada: selecionada,
      acertou,
      tempoGastoSeg: tempoGasto,
    };

    setRespostas((prev) => [...prev, registo]);
    setRespondida(true);
    setMostrarExplicacao(true);
  }, [respondida, selecionada, sessao, indice]);

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

  // Timer (normal mode only)
  useEffect(() => {
    if (config?.modo !== "normal" || status !== "jogando" || respondida) return;
    if (tempoRestante <= 0) {
      responderNormal(null);
      return;
    }
    const t = setTimeout(() => setTempoRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [config, status, tempoRestante, respondida, responderNormal]);

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
  };
}

export { TIMER_NORMAL_SEGUNDOS, QUANTIDADE_DEFAULT };
