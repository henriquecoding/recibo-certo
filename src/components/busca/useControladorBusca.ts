"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CONTROLADOR — um só, para as duas superfícies
//  ---------------------------------------------------------------------
//  A pesquisa tem duas caras: no telemóvel é um diálogo modal (em 360 px
//  não há «ao lado», e o teclado virtual come metade do ecrã); no
//  computador é uma região ancorada ao cabeçalho, sem véu e sem prender o
//  foco. São COMPOSIÇÕES diferentes do mesmo controlador — consulta,
//  intenção, carregamento, resultados e recentes vivem aqui.
//
//  Se cada superfície tivesse a sua cópia, a primeira regra que alguém
//  afinasse ficava a valer só de um lado, e o defeito só apareceria no
//  tamanho de ecrã que quem afinou não estava a usar.
//
//  O QUE ESTE FICHEIRO NÃO SABE: como se desenha um resultado, se há véu,
//  se é modal. Nada aqui conhece markup — é essa a fronteira que permite
//  ao telemóvel ser um diálogo e à secretária não ser.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { DocumentoBusca, FiltroIntencao, TipoDoc } from "@/lib/busca/esquema";
import { intencaoPorContexto } from "@/lib/busca/esquema";
import { carregarIndice } from "@/lib/busca/indice";
import { agruparPorTipo, melhorResposta, pesquisar, type ResultadoBusca } from "@/lib/busca/pontuar";
import { MIN_CARACTERES } from "@/lib/busca/pontuar";
import { guardarRecente, limparRecentes, lerRecentes, type Recente } from "@/lib/busca/recentes";
import { consultaParaRanking, reconhecer } from "@/lib/busca/reconhecer";
import {
  aplicarResposta,
  camposDoHandoff,
  compilarPlano,
  type PlanoBusca,
  type RespostaClarificacao,
} from "@/lib/busca/plano";
import { guardarHandoff, hrefComHandoff } from "@/lib/busca/handoff";
import { sugestoesPorContexto, type Sugestao } from "@/lib/busca/sugestoes";
import {
  classeDeViewport,
  medirAbandono,
  medirAbertura,
  medirClique,
  medirConsulta,
  type ContextoMedicao,
} from "@/lib/busca/medicao";

export type EstadoIndice = "a-carregar" | "pronto" | "erro";

export interface ControladorBusca {
  consulta: string;
  setConsulta: (v: string) => void;
  limparConsulta: () => void;
  intencao: FiltroIntencao;
  setIntencao: (i: FiltroIntencao) => void;
  estado: EstadoIndice;
  tentarDeNovo: () => void;
  /** Já limitados ao tecto da superfície. */
  resultados: ResultadoBusca[];
  /** No máximo um, e só quando ganha por margem clara. */
  destaque: ResultadoBusca | null;
  /** Os restantes, agrupados por tipo na ordem de utilidade. */
  grupos: [TipoDoc, ResultadoBusca[]][];
  total: number;
  /** Total sem tecto — o que o «ver todos» promete. */
  totalSemTeto: number;
  temConsulta: boolean;
  recentes: Recente[];
  apagarRecentes: () => void;
  sugestoes: Sugestao[];
  /** Frase curta para o `role="status"`. */
  mensagemEstado: string;
  hrefTodos: string;
  aoEscolher: (doc: DocumentoBusca, posicao: number) => void;
  /** O mesmo, para uma ação da moldura (que não é um documento). */
  aoEscolherAcao: (acao: { id: string; tipo: string }, posicao: number) => void;

  /* ── A moldura canónica ───────────────────────────────────────── */

  /** O plano da consulta actual, ou `null` enquanto não há consulta. */
  plano: PlanoBusca | null;
  /** A resposta dada à pergunta de clarificação, se houve uma. */
  resposta: RespostaClarificacao | null;
  responder: (opcao: string) => void;
  /** A linha de interpretação está aberta em modo «ver ou corrigir». */
  aCorrigir: boolean;
  alternarCorrecao: () => void;
  /**
   * Tira da consulta o que foi reconhecido como uma entidade.
   *
   * É esta a correcção que a linha de interpretação oferece: o texto da
   * pessoa menos o pedaço que percebemos mal, de volta ao campo, para ela
   * ver e continuar a escrever. Corrigir não pode ser preencher um
   * formulário sobre a nossa leitura da frase dela.
   */
  corrigir: (texto: string) => void;
  /**
   * O endereço da ação principal — já com o identificador opaco do
   * contexto, quando há contexto para transportar. Nunca com valores.
   */
  hrefPrincipal: string | null;
}

/**
 * Adia o valor sem adiar o que se ESCREVE.
 *
 * O campo é controlado pela consulta (responde a cada tecla, sem atraso
 * perceptível); é o CÁLCULO que espera. Ligar o campo ao valor adiado
 * faria o cursor saltar e o texto aparecer a 140 ms de distância do dedo.
 */
function useAdiado<T>(valor: T, ms = 140): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export function useControladorBusca({ teto }: { teto: number }): ControladorBusca {
  const pathname = usePathname() ?? "/";

  const [consulta, setConsulta] = useState("");
  const [intencao, setIntencao] = useState<FiltroIntencao>(() => intencaoPorContexto(pathname));
  const [documentos, setDocumentos] = useState<DocumentoBusca[] | null>(null);
  const [estado, setEstado] = useState<EstadoIndice>("a-carregar");
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const [tentativa, setTentativa] = useState(0);

  const adiada = useAdiado(consulta);

  const medicao = useRef<ContextoMedicao>({ viewport: "secretaria", pathname });
  medicao.current.pathname = pathname;

  /* ── Carregamento do índice ─────────────────────────────────────── */

  useEffect(() => {
    let vivo = true;
    setEstado("a-carregar");
    carregarIndice()
      .then((docs) => {
        if (!vivo) return;
        setDocumentos(docs);
        setEstado("pronto");
      })
      .catch(() => {
        if (vivo) setEstado("erro");
      });
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);

  /* ── Abertura: recentes, viewport e medição ─────────────────────── */

  const abertaEm = useRef(0);
  const houveClique = useRef(false);

  useEffect(() => {
    setRecentes(lerRecentes());
    abertaEm.current = Date.now();
    houveClique.current = false;
    medicao.current.viewport = classeDeViewport(window.innerWidth);
    // `documentos` no momento da abertura distingue a primeira pesquisa da
    // sessão (paga a rede) de todas as seguintes. É a diferença entre «a
    // pesquisa é lenta» e «a primeira pesquisa é lenta», que são problemas
    // diferentes com correcções diferentes.
    medirAbertura(medicao.current, documentos !== null);

    return () => {
      if (houveClique.current) return;
      medirAbandono(medicao.current, {
        tinhaConsulta: consultaRef.current.trim().length >= MIN_CARACTERES,
        resultados: totalRef.current,
        duracaoMs: Date.now() - abertaEm.current,
      });
    };
    // Só na montagem: a superfície é montada de novo a cada abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Reconhecimento ─────────────────────────────────────────────── */

  /**
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ O RECONHECIMENTO CORRE SOBRE A CONSULTA ADIADA, COMO O RANKING   │
   * │                                                                 │
   * │ Não é uma optimização: é a mesma consulta. Se o reconhecimento   │
   * │ corresse a cada tecla e o ranking só a cada 140 ms, a linha      │
   * │ «pedido reconhecido» descrevia uma frase e a lista respondia a   │
   * │ outra — durante frações de segundo, repetidamente, e sem nunca   │
   * │ dar erro.                                                        │
   * └─────────────────────────────────────────────────────────────────┘
   */
  const reconhecimento = useMemo(() => reconhecer(adiada), [adiada]);

  /** A resposta à pergunta — uma por consulta, e some quando ela muda. */
  const [resposta, setResposta] = useState<RespostaClarificacao | null>(null);
  const [aCorrigir, setACorrigir] = useState(false);
  useEffect(() => {
    setResposta(null);
    setACorrigir(false);
  }, [adiada]);

  const reconhecido = useMemo(() => aplicarResposta(reconhecimento, resposta), [reconhecimento, resposta]);

  /* ── Resultados ─────────────────────────────────────────────────── */

  const todos = useMemo(
    () =>
      documentos
        ? pesquisar(consultaParaRanking(adiada, reconhecido), documentos, {
            intencao,
            sinais: { dominio: reconhecido.dominio, intencao: reconhecido.intencao },
          })
        : [],
    [adiada, documentos, intencao, reconhecido],
  );

  const resultados = useMemo(() => todos.slice(0, teto), [todos, teto]);
  const destaque = useMemo(() => melhorResposta(resultados), [resultados]);
  const grupos = useMemo(
    () => agruparPorTipo(destaque ? resultados.filter((r) => r !== destaque) : resultados),
    [resultados, destaque],
  );

  const temConsulta = adiada.trim().length >= MIN_CARACTERES;

  const consultaRef = useRef(consulta);
  consultaRef.current = consulta;
  const totalRef = useRef(0);
  totalRef.current = todos.length;

  /* ── Medição da consulta, uma vez por consulta estabilizada ─────── */

  const medidas = useRef(new Set<string>());
  useEffect(() => {
    if (estado !== "pronto" || !temConsulta) return;
    const chave = `${adiada.trim().toLowerCase()}|${intencao}`;
    if (medidas.current.has(chave)) return;
    medidas.current.add(chave);
    medirConsulta(medicao.current, adiada, intencao, todos.length);
  }, [adiada, intencao, temConsulta, estado, todos.length]);

  /* ── Escolha de um resultado ────────────────────────────────────── */

  const aoEscolher = useCallback(
    (doc: DocumentoBusca, posicao: number) => {
      houveClique.current = true;
      guardarRecente(consultaRef.current);
      medirClique(medicao.current, { id: doc.id, tipo: doc.tipo, posicao, intencao });
    },
    [intencao],
  );

  /**
   * O mesmo registo, para uma ação da moldura.
   *
   * A moldura não tem `DocumentoBusca` — tem `AcaoPreparada`, que é o que
   * o plano produz. Ter dois caminhos de medição seria ter duas contagens
   * a divergir: o que se mede é sempre um id do índice e uma posição.
   */
  const aoEscolherAcao = useCallback(
    (acao: { id: string; tipo: string }, posicao: number) => {
      houveClique.current = true;
      guardarRecente(consultaRef.current);
      medirClique(medicao.current, { id: acao.id, tipo: acao.tipo, posicao, intencao });
    },
    [intencao],
  );

  const apagarRecentes = useCallback(() => {
    limparRecentes();
    setRecentes([]);
  }, []);

  /* ── Estado acessível ───────────────────────────────────────────── */

  /* ── O plano e o contexto que ele prepara ───────────────────────── */

  const plano = useMemo(
    () =>
      documentos && temConsulta
        ? compilarPlano({ consulta: adiada, reconhecimento: reconhecido, resultados, documentos })
        : null,
    [documentos, temConsulta, adiada, reconhecido, resultados],
  );

  /**
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ O CONTEXTO ESCREVE-SE ANTES DO CLIQUE — E SÓ QUANDO HÁ CONTEXTO  │
   * │                                                                 │
   * │ Um `<Link>` precisa do endereço no render, e escrever no         │
   * │ armazenamento durante o render é o que a documentação do React   │
   * │ desaconselha (um render pode ser deitado fora). Por isso a       │
   * │ escrita vive num efeito, e o endereço só ganha o `?ctx=` no      │
   * │ render seguinte — que acontece muito antes de alguém conseguir   │
   * │ clicar.                                                          │
   * │                                                                 │
   * │ E só se escreve quando o plano está PRONTO e há campos que o     │
   * │ destino aceita. Nas consultas sem valor — a esmagadora maioria — │
   * │ não se escreve nada, e o endereço fica limpo e partilhável.      │
   * └─────────────────────────────────────────────────────────────────┘
   */
  const [handoffId, setHandoffId] = useState<string | null>(null);
  useEffect(() => {
    const acao = plano?.principal;
    if (!plano || plano.estado !== "pronto" || !acao || acao.campos.length === 0) {
      setHandoffId(null);
      return;
    }
    setHandoffId(guardarHandoff(acao.id, camposDoHandoff(plano)));
  }, [plano]);

  const hrefPrincipal = useMemo(() => {
    const acao = plano?.principal;
    if (!acao) return null;
    return hrefComHandoff(acao.href, handoffId);
  }, [plano, handoffId]);

  const responder = useCallback(
    (opcao: string) => {
      const tipo = plano?.clarificacao?.tipo;
      if (!tipo) return;
      setResposta({ tipo, opcao });
    },
    [plano],
  );

  const corrigir = useCallback((texto: string) => {
    setConsulta((atual) => {
      const i = atual.toLocaleLowerCase("pt-PT").indexOf(texto.toLocaleLowerCase("pt-PT"));
      if (i === -1) return atual;
      return `${atual.slice(0, i)}${atual.slice(i + texto.length)}`.replace(/\s+/g, " ").trim();
    });
  }, []);

  /**
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ O QUE UM LEITOR DE ECRÃ OUVE TEM DE SER O QUE ESTÁ NO ECRÃ       │
   * │                                                                 │
   * │ A superfície deixou de ser uma lista: quando há caminho          │
   * │ preparado, o que está em cima é uma acção — e anunciar «8        │
   * │ resultados» a quem não vê o painel descrevia a versão antiga da  │
   * │ interface. Pior: quando há uma pergunta por responder, a lista   │
   * │ nem sequer é o assunto.                                          │
   * │                                                                 │
   * │ Curto, e uma frase por estado. Um `role="status"` que diz três   │
   * │ linhas a cada 140 ms é ruído, e ruído em `aria-live` é a forma   │
   * │ mais rápida de alguém desligar o leitor de ecrã.                 │
   * └─────────────────────────────────────────────────────────────────┘
   */
  const mensagemEstado = useMemo(() => {
    if (estado === "erro") return "Não foi possível carregar a pesquisa. Usa as ligações em baixo.";
    if (estado === "a-carregar" && temConsulta) return "A carregar a pesquisa…";
    if (!temConsulta) return "";
    if (todos.length === 0) return "Sem um caminho seguro. Há categorias e a pesquisa completa em baixo.";

    const mostrados = resultados.length;
    const contagem =
      todos.length > mostrados
        ? `${mostrados} de ${todos.length} resultados.`
        : `${mostrados} resultado${mostrados === 1 ? "" : "s"}.`;

    if (plano?.clarificacao) return `Falta uma confirmação: ${plano.clarificacao.pergunta}`;
    if (plano?.principal) return `Caminho preparado: ${plano.principal.titulo}. ${contagem}`;
    return contagem;
  }, [estado, temConsulta, todos.length, resultados.length, plano]);

  const hrefTodos = useMemo(() => {
    const params = new URLSearchParams();
    if (consulta.trim()) params.set("q", consulta.trim());
    if (intencao !== "tudo") params.set("i", intencao);
    const cauda = params.toString();
    return cauda ? `/pesquisar?${cauda}` : "/pesquisar";
  }, [consulta, intencao]);

  return {
    consulta,
    setConsulta,
    limparConsulta: useCallback(() => setConsulta(""), []),
    intencao,
    setIntencao,
    estado,
    tentarDeNovo,
    resultados,
    destaque,
    grupos,
    total: resultados.length,
    totalSemTeto: todos.length,
    temConsulta,
    recentes,
    apagarRecentes,
    sugestoes: useMemo(() => sugestoesPorContexto(pathname), [pathname]),
    mensagemEstado,
    hrefTodos,
    aoEscolher,
    aoEscolherAcao,
    plano,
    resposta,
    responder,
    aCorrigir,
    alternarCorrecao: useCallback(() => setACorrigir((v) => !v), []),
    corrigir,
    hrefPrincipal,
  };
}
