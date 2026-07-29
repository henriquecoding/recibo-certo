import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPerguntasComDiagnostico,
  embaralharOpcoes,
  embaralhar,
  type QuizCategoria,
  type QuizOpcao,
  type QuizPergunta,
  type SelecaoDiagnostico,
} from "@/lib/quiz-fiscal";
import { lerVistas, registarVistas } from "@/lib/quiz-fiscal/vistas";
import { calcularPontosPergunta } from "@/lib/quiz-fiscal/progresso";
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
  /**
   * Segundos por pergunta no modo normal. `0` = sem limite («Livre»).
   * O painel de definições oferece Livre/30/60/90 e o valor escolhido nunca
   * chegava aqui: o jogo dava sempre 20 segundos cravados.
   */
  tempoPorPergunta?: number;
  /**
   * Abrir o painel de explicação automaticamente ao responder, sem gastar o
   * power-up «Ver explicação». Era a quinta definição do painel sem qualquer
   * ligação ao jogo.
   */
  explicacoesAutomaticas?: boolean;
}

export interface SessaoPergunta {
  pergunta: QuizPergunta;
  opcoes: QuizOpcao[];
  correta: number;
  /** Posição embaralhada → índice original no banco (ver `embaralharOpcoes`). */
  indicesOriginais: number[];
}

export interface RespostaRegistada {
  perguntaId: string;
  categoria: QuizCategoria;
  opcaoSelecionada: number | null;
  acertou: boolean;
  tempoGastoSeg: number;
  pontos: number;            // pontos ganhos nesta resposta (0 se errada)
  streakAoResponder: number; // streak activo APÓS esta resposta
  /** True quando a pergunta foi pulada em vez de respondida. */
  pulada?: boolean;
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

/**
 * Tempo por pergunta quando a configuração não diz nada. Continua a ser o
 * default histórico do modo normal; o painel de definições pode substituí-lo
 * por Livre (0), 30, 60 ou 90 segundos.
 */
export const TIMER_NORMAL_SEGUNDOS = 20;

/** Segundos efetivos desta sessão. `0` significa sem cronómetro. */
function tempoLimiteDe(cfg: QuizFiscalConfig | null): number {
  const t = cfg?.tempoPorPergunta;
  return typeof t === "number" ? Math.max(0, t) : TIMER_NORMAL_SEGUNDOS;
}
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
  const streakMaximo = streakMaximoDe(respostas);
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
/**
 * Sequência ativa neste momento.
 *
 * Lê `streakAoResponder`, que é onde o efeito do Escudo fica registado. A
 * versão anterior recomputava a sequência a partir de `acertou` e ignorava o
 * escudo por completo: o utilizador gastava o power-up, via a animação, e a
 * sequência quebrava na mesma. `streakAoResponder` era escrito em três
 * sítios e não era lido em lado nenhum do repositório.
 */
function streakActualDe(respostas: RespostaRegistada[]): number {
  const ultima = respostas[respostas.length - 1];
  return ultima ? ultima.streakAoResponder : 0;
}

/**
 * Maior sequência da sessão, também a partir de `streakAoResponder` — para
 * que um erro protegido pelo Escudo não parta a sequência máxima mostrada no
 * resultado.
 */
function streakMaximoDe(respostas: RespostaRegistada[]): number {
  return respostas.reduce((max, r) => Math.max(max, r.streakAoResponder), 0);
}

export interface UseQuizFiscalReturn {
  status: QuizStatus;
  /** Identificador único da sessão em curso (ver QZ-14). */
  sessaoId: string;
  /** O que a seleção teve de ceder para encher a sessão (null = nada). */
  diagnosticoSelecao: SelecaoDiagnostico | null;
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
  /**
   * Instante em que o tempo desta pergunta se esgota. O cronómetro anterior
   * decrementava 1 em 1 segundo com `setTimeout` encadeado: derivava do
   * relógio real e, como os browsers estrangulam timers em separadores em
   * segundo plano, mudar de tab dava tempo extra — e o tempo pontuado
   * (medido com `Date.now()`) divergia do mostrado.
   */
  const deadlineRef = useRef<number>(0);

  /** Arma o cronómetro desta pergunta. `0` segundos = sem limite. */
  const armarCronometro = useCallback((segundos: number) => {
    deadlineRef.current = segundos > 0 ? Date.now() + segundos * 1000 : 0;
    setTempoRestante(segundos);
  }, []);

  const [vantagens, setVantagens] = useState<VantagensEstado>(VANTAGENS_INICIAL);
  const [eliminadas, setEliminadas] = useState<number[]>([]);
  const [dicaVisivel, setDicaVisivel] = useState(false);
  const [verExplicacaoAtiva, setVerExplicacaoAtiva] = useState(false);

  const [dobrarAtivo, setDobrarAtivo] = useState(false);
  const [segundaChanceAtiva, setSegundaChanceAtiva] = useState(false);
  const [escudoAtivo, setEscudoAtivo] = useState(false);
  const [emSegundaTentativa, setEmSegundaTentativa] = useState(false);

  /**
   * Timeout da pausa de feedback. Sem referência não havia como o cancelar:
   * se o utilizador saísse durante os 1,6 s, o timeout disparava na mesma e
   * repunha o quiz em «jogando» já depois de ter voltado à seleção.
   */
  const pausaFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inicioPerguntaRef = useRef<number>(Date.now());
  const inicioSessaoRef = useRef<number>(Date.now());
  /**
   * Identificador único desta sessão. A deduplicação de XP usava a chave
   * `modo-acertos-total-pontos`, que só era limpa ao voltar à seleção — e
   * `jogarNovamente()` vai de «resultado» a «jogando» sem passar por lá.
   * Dois 8/10 seguidos com a mesma pontuação e a segunda sessão não contava.
   */
  const [sessaoId, setSessaoId] = useState<string>("");
  /**
   * O que a seleção teve de ceder para encher a sessão. Pedir «Difícil» e
   * receber perguntas fáceis — ou pedir uma categoria e receber outra — nunca
   * era comunicado ao utilizador.
   */
  const [diagnosticoSelecao, setDiagnosticoSelecao] = useState<SelecaoDiagnostico | null>(null);

  const construirSessao = useCallback(async (cfg: QuizFiscalConfig): Promise<{
    sessao: SessaoPergunta[];
    diagnostico: SelecaoDiagnostico | null;
  }> => {
    const quantidade = cfg.quantidade ?? QUANTIDADE_DEFAULT;
    let perguntas: QuizPergunta[];
    let diagnostico: SelecaoDiagnostico | null = null;

    if (cfg.atividade) {
      // Gerador de atividade (pesado) carregado sob procura — só neste modo.
      const { gerarPerguntasAtividade } = await import("@/lib/quiz-fiscal/gerador-atividade");
      perguntas = gerarPerguntasAtividade(cfg.atividade, quantidade);
    } else {
      // Banco de perguntas carregado sob procura (já pré-aquecido no hover).
      // `excluirIds` existia e nunca era passado: a repetição chegava à
      // terceira sessão numa categoria média.
      const r = await getPerguntasComDiagnostico({
        quantidade,
        categoria: cfg.categoria,
        dificuldade: cfg.dificuldade,
        excluirIds: lerVistas(),
      });
      perguntas = r.perguntas;
      diagnostico = r.diagnostico;
    }

    registarVistas(perguntas.map((p) => p.id));

    return {
      sessao: perguntas.map((pergunta) => {
        const { opcoes, correta, indicesOriginais } = embaralharOpcoes(pergunta);
        return { pergunta, opcoes, correta, indicesOriginais };
      }),
      diagnostico,
    };
  }, []);

  const iniciar = useCallback(async (cfg: QuizFiscalConfig) => {
    const { sessao: novaSessao, diagnostico } = await construirSessao(cfg);
    const agora = Date.now();
    setConfig(cfg);
    setSessao(novaSessao);
    setDiagnosticoSelecao(diagnostico);
    setIndice(0);
    setRespostas([]);
    setSelecionada(null);
    setRespondida(false);
    setMostrarExplicacao(false);
    armarCronometro(tempoLimiteDe(cfg));
    setResultado(null);
    setVantagens(VANTAGENS_INICIAL);
    setEliminadas([]);
    setDicaVisivel(false);
    setVerExplicacaoAtiva(false);
    setDobrarAtivo(false);
    setSegundaChanceAtiva(false);
    setEscudoAtivo(false);
    setEmSegundaTentativa(false);
    setSessaoId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${agora}-${Math.random().toString(36).slice(2)}`,
    );
    setStatus("jogando");
    inicioPerguntaRef.current = agora;
    inicioSessaoRef.current = agora;
  }, [construirSessao]);

  const jogarNovamente = useCallback(() => {
    if (!config) return;
    iniciar(config);
  }, [config, iniciar]);

  const reiniciar = useCallback(() => {
    if (pausaFeedbackRef.current) {
      clearTimeout(pausaFeedbackRef.current);
      pausaFeedbackRef.current = null;
    }
    setStatus("selecao");
    setConfig(null);
    setSessao([]);
    setIndice(0);
    setRespostas([]);
    setResultado(null);
    setSelecionada(null);
    setRespondida(false);
    setMostrarExplicacao(false);
    armarCronometro(tempoLimiteDe(null));
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
      armarCronometro(tempoLimiteDe(config));
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
            tempoLimiteSeg: tempoLimiteDe(config),
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

      // O power-up abre a explicação; a definição «Explicações automáticas»
      // abre-a sempre, que é o que o painel promete.
      if (verExplicacaoAtiva || config?.explicacoesAutomaticas) {
        setMostrarExplicacao(true);
      } else {
        pausaFeedbackRef.current = setTimeout(() => irParaProxima(novasRespostas), PAUSA_FEEDBACK_MS);
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
    // Acumular, não substituir: `setEliminadas(novas)` deitava fora a opção
    // que a Segunda Chance já tinha eliminado, reactivando-a no ecrã.
    setEliminadas((prev) => {
      const disponiveis = embaralhar(wrongIndices.filter((i) => !prev.includes(i)));
      return [...new Set([...prev, ...disponiveis.slice(0, 2)])];
    });
    setVantagens((v) => ({ ...v, eliminar2: true }));
  }, [vantagens.eliminar2, respondida, sessao, indice]);

  const usarDica = useCallback(() => {
    if (vantagens.dica || respondida) return;
    setDicaVisivel(true);
    setVantagens((v) => ({ ...v, dica: true }));
  }, [vantagens.dica, respondida]);

  const usarTempoExtra = useCallback(() => {
    if (vantagens.tempoExtra || respondida || config?.modo !== "normal") return;
    // O bónus tem de mexer no DEADLINE, senão o cronómetro voltava a
    // sincronizar-se no tick seguinte e o tempo extra desaparecia.
    if (deadlineRef.current > 0) deadlineRef.current += TEMPO_EXTRA_BONUS * 1000;
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
    const item = sessao[indice];
    if (!item) return;
    // Pular avançava sem registar resposta: `calcularResultado` usava
    // `sessao.length` como total mas `respostas` tinha menos entradas — o
    // ecrã mostrava «8/10» e o detalhe por categoria somava 9. A pergunta
    // pulada conta como não acertada e fica visível no detalhe.
    const registo: RespostaRegistada = {
      perguntaId: item.pergunta.id,
      categoria: item.pergunta.categoria,
      opcaoSelecionada: null,
      acertou: false,
      tempoGastoSeg: Math.round((Date.now() - inicioPerguntaRef.current) / 1000),
      pontos: 0,
      // Pular não quebra a sequência: o utilizador gastou um power-up para
      // não responder, não errou.
      streakAoResponder: streakActualDe(respostas),
      pulada: true,
    };
    const novasRespostas = [...respostas, registo];
    setRespostas(novasRespostas);
    setVantagens((v) => ({ ...v, pular: true }));
    irParaProxima(novasRespostas);
  }, [vantagens.pular, respondida, irParaProxima, respostas, sessao, indice]);

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

  // Cronómetro (modo normal), calculado a partir do deadline.
  //
  // «Livre» (`tempoPorPergunta: 0`) desliga-o de facto: `deadlineRef` fica a
  // zero e não há intervalo nenhum a correr.
  useEffect(() => {
    if (config?.modo !== "normal" || status !== "jogando" || respondida) return;
    if (deadlineRef.current <= 0) return; // modo livre
    const restanteAgora = () => Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
    if (restanteAgora() <= 0) {
      responderNormal(null);
      return;
    }
    const id = setInterval(() => {
      const s = restanteAgora();
      setTempoRestante(s);
      if (s <= 0) {
        clearInterval(id);
        responderNormal(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [config, status, respondida, responderNormal]);

  // Métricas derivadas (sem estado extra)
  const pontosAtuais = respostas.reduce((sum, r) => sum + r.pontos, 0);
  const streakAtual = streakActualDe(respostas);

  return {
    status,
    sessaoId,
    diagnosticoSelecao,
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
