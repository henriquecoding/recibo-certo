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
import {
  CONTEXTO_INICIAL,
  type AtivoId,
  type OpportunityContext,
} from "@/lib/negocio/descoberta/contexto/tipos";
import { descobrir, type ResultadoDescoberta } from "@/lib/negocio/descoberta/motor/pipeline";
import {
  CENARIOS_WHATIF,
  compararCenario,
  type EfeitoWhatIf,
} from "@/lib/negocio/descoberta/motor/whatif";
import {
  comoInstantaneo,
  compararAnalises,
  type DiferencaAnalise,
} from "@/lib/negocio/descoberta/historico/instantaneos";
import type { OpportunityCandidate } from "@/lib/negocio/descoberta/motor/tipos";
import { newHypothesis, type MarketHypothesis } from "@/lib/negocio/market/hipoteses";
import { guardarHipotese, lerHipoteses } from "@/lib/store/hipoteses-mercado";
import {
  guardarInstantaneo,
  guardarPerfil,
  lerInstantaneos,
  lerPerfilGuardado,
} from "@/lib/store/perfil-descoberta";
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
  const [aConsultar, setAConsultar] = useState(true);
  const [aAnalisar, setAAnalisar] = useState(false);
  const [hipoteses, setHipoteses] = useState<readonly MarketHypothesis[]>([]);
  const [perfilGuardado, setPerfilGuardado] = useState(false);
  const [diferenca, setDiferenca] = useState<DiferencaAnalise | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // ── O pack público, uma vez por sessão ────────────────────────────
  useEffect(() => {
    const controlador = new AbortController();
    fetch("/api/market/pilots", { signal: controlador.signal, headers: { Accept: "application/json" } })
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        return resposta.json() as Promise<{ pilots: MarketPilotEvidence[] }>;
      })
      .then((payload) => setEvidencia(Array.isArray(payload.pilots) ? payload.pilots : []))
      .catch((erro) => {
        // Uma falha de transporte NÃO é ausência de mercado. O motor corre
        // na mesma e cada dossier diz que não tem leitura ligada.
        if (!(erro instanceof DOMException && erro.name === "AbortError")) setEvidencia([]);
      })
      .finally(() => setAConsultar(false));
    return () => controlador.abort();
  }, []);

  // ── O pack de OFERTA, também uma vez por sessão ───────────────────
  //  Independente do de pilotos de propósito: são eixos diferentes e
  //  falham de maneiras diferentes. Se a oferta não vier, o motor corre
  //  na mesma e volta a dizer «lacuna por apurar» — que é o que dizia
  //  antes de esta fonte existir.
  useEffect(() => {
    const controlador = new AbortController();
    fetch("/api/market/oferta", { signal: controlador.signal, headers: { Accept: "application/json" } })
      .then((resposta) => {
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        return resposta.json() as Promise<PackOferta>;
      })
      .then((payload) => {
        setOferta(Array.isArray(payload?.divisoes) && payload.divisoes.length > 0 ? payload : undefined);
      })
      .catch(() => setOferta(undefined));
    return () => controlador.abort();
  }, []);

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
    (paraContexto: OpportunityContext) => descobrir(paraContexto, { evidencia, oferta, limite: 10 }),
    [evidencia, oferta],
  );

  const analisar = useCallback(
    (proximoContexto: OpportunityContext) => {
      setAAnalisar(true);
      const novo = correr(proximoContexto);

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
    [correr],
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
    if (!resultado) return [];
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
  }, [resultado, contexto, correr]);

  const aplicarWhatIf = (cenarioId: string) => {
    const cenario = CENARIOS_WHATIF.find((item) => item.id === cenarioId);
    if (!cenario) return;
    const proximo = cenario.aplicar(contexto);
    setContexto(proximo);
    setPerfilGuardado(false);
    analisar(proximo);
  };

  // ── Declarar um meio a partir do resultado vazio ──────────────────
  //  O motor diz «declara "Computador de trabalho" e abres 1 hipótese».
  //  A pessoa não devia ter de voltar atrás, encontrar a secção certa e
  //  procurar a pastilha: carrega, o meio entra no contexto e o motor
  //  corre outra vez. O perfil deixa de estar guardado, como em qualquer
  //  outra alteração ao contexto.
  const declararMeios = (ativos: readonly AtivoId[]) => {
    const novos = ativos.filter((id) => !contexto.ativos.includes(id));
    if (novos.length === 0) return;
    const proximo = { ...contexto, ativos: [...contexto.ativos, ...novos] };
    setContexto(proximo);
    setPerfilGuardado(false);
    analisar(proximo);
  };

  const hipotesesGuardadas = useMemo(
    () => new Set(hipoteses.map((item) => item.templateId)),
    [hipoteses],
  );
  const hipotesePorId = useMemo(
    () => new Map(hipoteses.map((item) => [item.templateId, item])),
    [hipoteses],
  );

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
    hipotesesComProvaPaga: hipoteses.filter((item) =>
      item.proofs.some((prova) => prova.kind !== "interview"),
    ).length,
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
        onDeclararMeios={declararMeios}
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
        contexto={contexto}
        onChange={(proximo) => {
          setContexto(proximo);
          setPerfilGuardado(false);
        }}
        onDescobrir={() => analisar(contexto)}
        onRepor={() => {
          setContexto(CONTEXTO_INICIAL);
          setPerfilGuardado(false);
          setResultado(null);
        }}
        jaAnalisou={resultado !== null}
      />
    </div>
  );
}
