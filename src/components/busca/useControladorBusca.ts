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

  /* ── Resultados ─────────────────────────────────────────────────── */

  const todos = useMemo(
    () => (documentos ? pesquisar(adiada, documentos, { intencao }) : []),
    [adiada, documentos, intencao],
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

  const apagarRecentes = useCallback(() => {
    limparRecentes();
    setRecentes([]);
  }, []);

  /* ── Estado acessível ───────────────────────────────────────────── */

  const mensagemEstado = useMemo(() => {
    if (estado === "erro") return "Não foi possível carregar a pesquisa. Usa as ligações em baixo.";
    if (estado === "a-carregar" && temConsulta) return "A carregar a pesquisa…";
    if (!temConsulta) return "";
    if (todos.length === 0) return "Sem resultados.";
    const mostrados = resultados.length;
    return todos.length > mostrados
      ? `${mostrados} de ${todos.length} resultados.`
      : `${mostrados} resultado${mostrados === 1 ? "" : "s"}.`;
  }, [estado, temConsulta, todos.length, resultados.length]);

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
  };
}
