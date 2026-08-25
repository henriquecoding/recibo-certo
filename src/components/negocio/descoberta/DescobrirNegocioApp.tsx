"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O ESTADO DAS DUAS FASES
//  ---------------------------------------------------------------------
//  Fase A constrói o contexto. Fase B mostra o que o motor fez com ele.
//  Nunca as duas ao mesmo tempo, que era o defeito do ponto 1: a
//  configuração desaparecia por baixo dos resultados e era preciso
//  navegar por cima de cartões para acabar de responder.
//
//  ── O QUE ESTE COMPONENTE DECIDE, E O QUE NÃO DECIDE ───────────────
//  Decide: em que fase estamos, quando correr o motor, o que guardar.
//  Não decide: que hipóteses aparecem, por que ordem, nem porquê. Isso é
//  do pipeline, que é puro e testável sem montar React nenhum.
//
//  O pack de evidência é pedido uma vez e reaproveitado entre análises —
//  não faz sentido voltar a consultar o INE porque a pessoa mudou uma
//  resposta sobre si própria (ponto 36).
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketPilotEvidence } from "@/lib/negocio/market/opportunities";
import type { PackOferta } from "@/lib/negocio/market/oferta";
import { CONTEXTO_INICIAL, type AtivoId, type OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";
import { descobrir, type ResultadoDescoberta } from "@/lib/negocio/descoberta/motor/pipeline";
import { CENARIOS_WHATIF, compararCenario, type EfeitoWhatIf } from "@/lib/negocio/descoberta/motor/whatif";
import {
  comoInstantaneo,
  compararAnalises,
  type DiferencaAnalise,
} from "@/lib/negocio/descoberta/historico/instantaneos";
import type { OpportunityCandidate } from "@/lib/negocio/descoberta/motor/tipos";
import {
  SESSAO_INICIAL,
  comFeedback,
  comVistos,
  type AcaoFeedback,
  type EscopoFeedback,
  type MotivoFeedback,
  type ModoSessao,
  type SessaoDescoberta,
} from "@/lib/negocio/descoberta/sessao/tipos";
import { assinaturaDe } from "@/lib/negocio/descoberta/sessao/aprendizagem";
import { newHypothesis, type MarketHypothesis } from "@/lib/negocio/market/hipoteses";
import { guardarHipotese, lerHipoteses } from "@/lib/store/hipoteses-mercado";
import { guardarInstantaneo, guardarPerfil, lerInstantaneos, lerPerfilGuardado } from "@/lib/store/perfil-descoberta";
import { registarProvaGuardada, useMedicaoDescoberta } from "../medicao-descoberta";
import Configurador from "./Configurador";
import Resultados from "./Resultados";
import { Spinner } from "@/components/ui/Icons";

type Fase = "contexto" | "resultados";

export default function DescobrirNegocioApp() {
  const [fase, setFase] = useState<Fase>("contexto");
  const [contexto, setContexto] = useState<OpportunityContext>(CONTEXTO_INICIAL);
  const [resultado, setResultado] = useState<ResultadoDescoberta | null>(null);
  const [evidencia, setEvidencia] = useState<readonly MarketPilotEvidence[]>([]);
  const [oferta, setOferta] = useState<PackOferta | undefined>(undefined);
  const [aConsultarEvidencia, setAConsultarEvidencia] = useState(true);
  const [aConsultarOferta, setAConsultarOferta] = useState(true);
  const [erroEvidencia, setErroEvidencia] = useState(false);
  const [erroOferta, setErroOferta] = useState(false);
  const [recalcularAposFontes, setRecalcularAposFontes] = useState(false);
  const [aAnalisar, setAAnalisar] = useState(false);
  const [hipoteses, setHipoteses] = useState<readonly MarketHypothesis[]>([]);
  const [perfilGuardado, setPerfilGuardado] = useState(false);
  const [diferenca, setDiferenca] = useState<DiferencaAnalise | null>(null);
  const [montado, setMontado] = useState(false);
  const [sessao, setSessao] = useState<SessaoDescoberta>(SESSAO_INICIAL);
  const [aExplorarMudancas, setAExplorarMudancas] = useState(false);
  const [focarMeios, setFocarMeios] = useState(0);
  const aConsultar = aConsultarEvidencia || aConsultarOferta;

  useEffect(() => setMontado(true), []);

  const consultarEvidencia = useCallback(async (signal?: AbortSignal) => {
    setAConsultarEvidencia(true);
    try {
      const resposta = await fetch("/api/market/pilots", {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const payload = (await resposta.json()) as { pilots: MarketPilotEvidence[] };
      if (!Array.isArray(payload?.pilots)) throw new Error("Resposta de procura inválida");
      setEvidencia(payload.pilots);
      setErroEvidencia(false);
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      // Falha de transporte não é ausência de mercado e fica visível.
      setEvidencia([]);
      setErroEvidencia(true);
    } finally {
      if (!signal?.aborted) setAConsultarEvidencia(false);
    }
  }, []);

  // ── O pack público, uma vez por sessão ────────────────────────────
  useEffect(() => {
    const controlador = new AbortController();
    void consultarEvidencia(controlador.signal);
    return () => controlador.abort();
  }, [consultarEvidencia]);

  // ── O pack de OFERTA, também uma vez por sessão ───────────────────
  //  Independente do de pilotos de propósito: são eixos diferentes e
  //  falham de maneiras diferentes. Se a oferta não vier, o motor corre
  //  na mesma e volta a dizer «lacuna por apurar» — que é o que dizia
  //  antes de esta fonte existir.
  const consultarOferta = useCallback(async (signal?: AbortSignal) => {
    setAConsultarOferta(true);
    try {
      const resposta = await fetch("/api/market/oferta", {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const payload = (await resposta.json()) as PackOferta;
      // Um pack serve se trouxer QUALQUER das duas leituras. A matriz
      // ao concelho vem de um instantâneo commitado e sobrevive a uma
      // falha do INE — exigir as duas fazia a leitura ao concelho ser
      // deitada fora por causa da outra.
      const temRegioes = Array.isArray(payload?.divisoes) && payload.divisoes.length > 0;
      const temConcelhos = Array.isArray(payload?.concelhos?.ordem) && payload.concelhos.ordem.length > 0;
      if (!temRegioes && !temConcelhos) throw new Error("Resposta de oferta inválida");
      setOferta(temRegioes || temConcelhos ? payload : undefined);
      setErroOferta(false);
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      setOferta(undefined);
      setErroOferta(true);
    } finally {
      if (!signal?.aborted) setAConsultarOferta(false);
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    void consultarOferta(controlador.signal);
    return () => controlador.abort();
  }, [consultarOferta]);

  // ── O que já está guardado, lido depois da montagem ───────────────
  useEffect(() => {
    const guardado = lerPerfilGuardado();
    if (guardado) {
      setContexto(guardado.contexto);
      setPerfilGuardado(true);
    }
    setHipoteses(lerHipoteses());
  }, []);

  const correr = useCallback(
    (paraContexto: OpportunityContext, memoria?: SessaoDescoberta, incluirForaDoPerfil = false) =>
      descobrir(paraContexto, {
        evidencia,
        oferta,
        limite: incluirForaDoPerfil ? 12 : 10,
        sessao: memoria,
        incluirForaDePerfil: incluirForaDoPerfil,
      }),
    [evidencia, oferta],
  );

  useEffect(() => {
    if (!recalcularAposFontes || aConsultar) return;
    setResultado(correr(contexto, sessao, aExplorarMudancas));
    setRecalcularAposFontes(false);
  }, [aConsultar, aExplorarMudancas, contexto, correr, recalcularAposFontes, sessao]);

  const repetirFontes = () => {
    setRecalcularAposFontes(true);
    void Promise.all([consultarEvidencia(), consultarOferta()]);
  };

  const analisar = useCallback(
    (proximoContexto: OpportunityContext) => {
      setAAnalisar(true);
      const memoria = SESSAO_INICIAL;
      setSessao(memoria);
      setAExplorarMudancas(false);
      const novo = correr(proximoContexto, memoria, false);
      // Se a pessoa chegou antes das fontes, este primeiro resultado é
      // deliberadamente conservador. Assim que ambas terminarem (com
      // sucesso ou erro visível), recalcula-se sem criar novo histórico.
      if (aConsultar) setRecalcularAposFontes(true);

      // A comparação com a análise anterior é feita ANTES de guardar a
      // nova — senão comparava-se consigo própria.
      const anteriores = lerInstantaneos();
      setDiferenca(anteriores.length > 0 ? compararAnalises(anteriores[0]!, comoInstantaneo(novo)) : null);
      guardarInstantaneo(comoInstantaneo(novo));

      setResultado(novo);
      setFase("resultados");
      setAAnalisar(false);
      // O topo da página: a fase mudou, e ficar a meio do formulário
      // antigo seria perder a pessoa.
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() =>
          document.querySelector("#ferramenta")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      }
    },
    [aConsultar, correr],
  );

  // ── E se? Corre o motor sobre o contexto alterado ─────────────────
  //  ┌──────────────────────────────────────────────────────────────┐
  //  │ DOIS DEFEITOS NUMA LINHA SÓ                                   │
  //  │                                                              │
  //  │ `.slice(0, 4)` cortava ANTES de correr, e portanto os quatro  │
  //  │ cenários mostrados eram os quatro primeiros da lista — não os │
  //  │ quatro que mais mudam alguma coisa. Uma pessoa podia ver      │
  //  │ quatro cenários que não desbloqueiam nada enquanto o quinto,  │
  //  │ escondido, abria sete hipóteses.                              │
  //  │                                                              │
  //  │ E 13,6 % dos perfis saíam de mãos vazias sem ver escada       │
  //  │ nenhuma. O cálculo que responde a «se aceitasses B2B,         │
  //  │ apareceriam 4» já existia — só corria quando já havia         │
  //  │ resultados, que é precisamente quando é menos preciso.        │
  //  │                                                              │
  //  │ Corre-se tudo (o pipeline é síncrono e leva milissegundos),   │
  //  │ ordena-se pelo que abre, e mostram-se os quatro melhores.     │
  //  └──────────────────────────────────────────────────────────────┘
  const efeitosWhatIf: readonly EfeitoWhatIf[] = useMemo(() => {
    // O modo condicional inclui deliberadamente hipóteses fora do perfil.
    // Compará-lo com cenários compatíveis misturaria universos e faria a
    // contagem parecer maior ou menor por causa do modo, não da mudança.
    if (!resultado || aExplorarMudancas) return [];
    return CENARIOS_WHATIF.filter((cenario) => cenario.aplicavel(contexto))
      .map((cenario) => compararCenario(cenario, resultado, correr(cenario.aplicar(contexto))))
      .sort(
        (esquerda, direita) =>
          direita.novas.length - esquerda.novas.length ||
          direita.desbloqueadas - esquerda.desbloqueadas ||
          direita.subiram.length - esquerda.subiram.length ||
          esquerda.cenario.id.localeCompare(direita.cenario.id),
      )
      .slice(0, 4);
  }, [aExplorarMudancas, resultado, contexto, correr]);

  const aplicarWhatIf = (cenarioId: string) => {
    const cenario = CENARIOS_WHATIF.find((item) => item.id === cenarioId);
    if (!cenario) return;
    const proximo = cenario.aplicar(contexto);
    setContexto(proximo);
    setPerfilGuardado(false);
    analisar(proximo);
  };

  // Aceitar um compromisso medido a partir de um resultado vazio. O
  // contexto já vem calculado pelo motor com a mudança feita — aplicar
  // aqui uma segunda vez daria a mesma coisa com mais uma oportunidade de
  // divergir do número que foi prometido no ecrã.
  const aplicarRelaxamento = (proximo: OpportunityContext) => {
    setContexto(proximo);
    setPerfilGuardado(false);
    analisar(proximo);
  };

  // Nunca transformar «tenho isto» em «serve para o trabalho». O atalho
  // volta à secção certa, onde presença, estado e limites são confirmados.
  const reverMeios = (_ativos: readonly AtivoId[]) => {
    setFase("contexto");
    setFocarMeios((valor) => valor + 1);
  };

  const reapresentar = (proximaSessao: SessaoDescoberta) => {
    setSessao(proximaSessao);
    setResultado(correr(contexto, proximaSessao, aExplorarMudancas));
  };

  const alternarExploracaoDeMudancas = () => {
    const proximoModo = !aExplorarMudancas;
    // Mantém recusas e preferências, mas uma nova coleção começa na
    // primeira página. Reaproveitar `vistos` esconderia precisamente as
    // hipóteses compatíveis que servem de referência neste modo.
    const proximaSessao: SessaoDescoberta = {
      ...sessao,
      vistos: [],
      modo: "normal",
      ancora: undefined,
    };
    setAExplorarMudancas(proximoModo);
    setSessao(proximaSessao);
    setResultado(correr(contexto, proximaSessao, proximoModo));
  };

  const darFeedback = (
    candidato: OpportunityCandidate,
    acao: AcaoFeedback,
    motivo: MotivoFeedback | undefined,
    escopo: EscopoFeedback,
  ) => {
    const comPaginaVista = comVistos(sessao, resultado?.candidatos.map((item) => item.id) ?? []);
    const atualizado = comFeedback(comPaginaVista, {
      acao,
      motivo,
      escopo,
      assinatura: assinaturaDe(candidato),
    });
    reapresentar({
      ...atualizado,
      modo: acao === "mais-como-isto" ? "mais-como-isto" : acao === "interessa" ? "normal" : "continuar",
      ancora: acao === "mais-como-isto" ? assinaturaDe(candidato) : atualizado.ancora,
    });
  };

  const pedirOutras = (modo: Exclude<ModoSessao, "normal" | "mais-como-isto">) => {
    const vistos = comVistos(sessao, resultado?.candidatos.map((item) => item.id) ?? []);
    reapresentar({
      ...vistos,
      modo,
      ancora: resultado?.candidatos[0] ? assinaturaDe(resultado.candidatos[0]) : vistos.ancora,
    });
  };

  const reporAprendizagem = () => reapresentar(SESSAO_INICIAL);
  const desfazerUltimaEscolha = () =>
    reapresentar({
      ...sessao,
      feedback: sessao.feedback.slice(0, -1),
      modo: "normal",
      ancora: undefined,
    });

  const hipotesesGuardadas = useMemo(() => new Set(hipoteses.map((item) => item.templateId)), [hipoteses]);
  const hipotesePorId = useMemo(() => new Map(hipoteses.map((item) => [item.templateId, item])), [hipoteses]);

  const guardarComoHipotese = (candidato: OpportunityCandidate) => {
    // As hipóteses locais são indexadas pelo dossier curado quando existe;
    // uma composição gerada guarda-se pelo seu próprio id determinístico.
    // É isso que permite provar no mercado uma hipótese que ninguém
    // escreveu — que é precisamente o objetivo do motor.
    const id = candidato.seedTemplateId ?? candidato.id;
    if (hipotesesGuardadas.has(id)) return;
    setHipoteses(guardarHipotese(newHypothesis(id, contexto.localizacao.regiao)));
    registarProvaGuardada();
  };

  const registarProva = (proxima: MarketHypothesis) => {
    setHipoteses(guardarHipotese({ ...proxima, region: contexto.localizacao.regiao }));
    registarProvaGuardada();
  };

  // ── Medição: o vocabulário existente, sem eventos novos ───────────
  useMedicaoDescoberta({
    ativo: montado && !aConsultar,
    dossierAberto: fase === "resultados",
    estados: useMemo(
      () =>
        (resultado?.candidatos ?? []).map((candidato) =>
          candidato.evidencias.length > 0 ? "signal_detected" : "template",
        ),
      [resultado],
    ),
    hipotesesComProva: hipoteses.filter((item) => item.proofs.length > 0).length,
    hipotesesComProvaPaga: hipoteses.filter((item) => item.proofs.some((prova) => prova.kind !== "interview")).length,
    temPrecoConcluido: hipoteses.some((item) => item.pricing !== undefined),
    temRequisitosRevistos: hipoteses.some((item) => item.requirementsReviewed),
  });

  if (fase === "resultados" && resultado) {
    return (
      <Resultados
        resultado={resultado}
        onVoltar={() => setFase("contexto")}
        onGuardarHipotese={guardarComoHipotese}
        hipotesesGuardadas={hipotesesGuardadas}
        hipotesePorId={hipotesePorId}
        onProva={registarProva}
        onGuardarPerfil={() => {
          const resultadoGravacao = guardarPerfil(contexto);
          if (resultadoGravacao.ok) setPerfilGuardado(true);
        }}
        perfilGuardado={perfilGuardado}
        efeitosWhatIf={efeitosWhatIf}
        onAplicarWhatIf={aplicarWhatIf}
        diferenca={diferenca}
        onReverMeios={reverMeios}
        onAplicarRelaxamento={aplicarRelaxamento}
        onFeedback={darFeedback}
        onPedirOutras={pedirOutras}
        onReporAprendizagem={reporAprendizagem}
        onDesfazerUltimaEscolha={desfazerUltimaEscolha}
        aExplorarMudancas={aExplorarMudancas}
        onAlternarExploracaoDeMudancas={alternarExploracaoDeMudancas}
        fontes={{
          evidencia: aConsultarEvidencia ? "a-consultar" : erroEvidencia ? "indisponivel" : "ligada",
          oferta: aConsultarOferta ? "a-consultar" : erroOferta ? "indisponivel" : "ligada",
        }}
        onRepetirFontes={repetirFontes}
      />
    );
  }

  return (
    <div className="space-y-4">
      {aAnalisar ? (
        <p className="flex items-center gap-2 rounded-4xl border border-stone-100 bg-white p-4 text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900">
          <Spinner size={14} className="animate-spin text-brand" /> A correr o motor…
        </p>
      ) : null}
      <Configurador
        evidencia={evidencia}
        oferta={oferta}
        contexto={contexto}
        onChange={(proximo) => {
          setContexto(proximo);
          setPerfilGuardado(false);
        }}
        onDescobrir={() => analisar(contexto)}
        onRepor={() => {
          setContexto(CONTEXTO_INICIAL);
          setSessao(SESSAO_INICIAL);
          setAExplorarMudancas(false);
          setPerfilGuardado(false);
          setResultado(null);
        }}
        jaAnalisou={resultado !== null}
        focarMeios={focarMeios}
      />
    </div>
  );
}
