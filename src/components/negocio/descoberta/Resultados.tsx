"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FASE B — os resultados, com o trabalho do motor à vista
//  ---------------------------------------------------------------------
//  Ponto 47: começar por dizer o que foi feito, com números REAIS. Todos
//  os que aparecem aqui vêm da telemetria do pipeline — nenhum é escrito
//  à mão para impressionar, e quando não há nada de honesto a dizer a
//  frase não aparece.
//
//  Ponto 21: fit, mercado e confiança viajam lado a lado e nunca se
//  fundem num número mágico.
//
//  Ponto 48: «o que descartámos» é uma funcionalidade, não uma nota de
//  rodapé — é o que demonstra que o motor raciocinou sobre as restrições.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import {
  EXPLICACAO_ANGULO,
  ROTULO_ANGULO,
  type AnguloDeLeitura,
} from "@/lib/negocio/descoberta/motor/diversidade";
import {
  descreverZona,
  ROTULO_ENTREGA,
} from "@/lib/negocio/descoberta/motor/gerador";
import {
  forcaDaConfianca,
  ROTULO_CONFIANCA,
} from "@/lib/negocio/descoberta/motor/confianca";
import {
  ROTULO_ETAPA,
  resumoDoTrabalho,
  type BloqueioPorMeio,
  type ContagemEtapa,
  type DiagnosticoVazio,
  type ResultadoDescoberta,
} from "@/lib/negocio/descoberta/motor/pipeline";
import { formatarIntervalo } from "@/lib/negocio/descoberta/proveniencia";
import type { OpportunityCandidate } from "@/lib/negocio/descoberta/motor/tipos";
import type { AtivoId } from "@/lib/negocio/descoberta/contexto/tipos";
import type {
  AcaoFeedback,
  EscopoFeedback,
  MotivoFeedback,
} from "@/lib/negocio/descoberta/sessao/tipos";
import type { MarketHypothesis } from "@/lib/negocio/market/hipoteses";
import type { EfeitoWhatIf } from "@/lib/negocio/descoberta/motor/whatif";
import type { DiferencaAnalise } from "@/lib/negocio/descoberta/historico/instantaneos";
import { resumoDaDiferenca } from "@/lib/negocio/descoberta/historico/instantaneos";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Check,
  ChevronDown,
  Filter,
  History,
  Heart,
  Lightbulb,
  Plus,
  RotateCcw,
  Sparkle,
  Swap,
  Target,
  Trash,
  Zap,
} from "@/components/ui/Icons";
import { BarraDeIntervalo, Chip } from "./atomos";
import Dossier from "./Dossier";
import ContabilistasNoResultado from "@/components/diretorio/ContabilistasNoResultado";
import type { Relaxamento } from "@/lib/negocio/descoberta/motor/relaxamento";
import type { OpportunityContext } from "@/lib/negocio/descoberta/contexto/tipos";

/**
 * Uma etapa contada na unidade em que ela conta.
 *
 * A seta só se usa entre dois números da mesma espécie e onde há
 * mesmo um filtro. A etapa da evidência não elimina hipóteses — anexa
 * leituras — e escrevê-la como «17 → 3» dizia que catorze tinham sido
 * eliminadas. Nenhuma tinha.
 */
function descreverEtapa(etapa: ContagemEtapa): string {
  const nome = (
    quantidade: number,
    unidade: ContagemEtapa["unidadeEntrada"],
  ) =>
    unidade === "observacoes"
      ? `${quantidade} ${quantidade === 1 ? "leitura oficial" : "leituras oficiais"}`
      : `${quantidade} ${quantidade === 1 ? "hipótese" : "hipóteses"}`;

  if (etapa.unidadeEntrada !== etapa.unidadeSaida) {
    return `${nome(etapa.sairam, etapa.unidadeSaida)} em ${nome(etapa.entraram, etapa.unidadeEntrada)}`;
  }
  if (etapa.naoFiltra || etapa.entraram === etapa.sairam)
    return nome(etapa.sairam, etapa.unidadeSaida);
  return `${etapa.entraram} → ${nome(etapa.sairam, etapa.unidadeSaida)}`;
}

const MOTIVO_ROTULO: Readonly<Record<string, string>> = {
  restricao: "Restrição que declaraste",
  capital: "Capital",
  prazo: "Prazo",
  equipa: "Equipa",
  regulacao: "Regulação",
  geografia: "Geografia",
  preferencia: "Preferência",
  risco: "Risco",
  duplicado: "Variante do mesmo",
  stress: "Não sobreviveu ao stress test",
};

const RAZOES_FEEDBACK: readonly {
  rotulo: string;
  acao: AcaoFeedback;
  motivo: MotivoFeedback;
  escopo: EscopoFeedback;
}[] = [
  {
    rotulo: "Não gosto deste trabalho",
    acao: "nao-e-para-mim",
    motivo: "tipo-de-trabalho",
    escopo: "capacidade",
  },
  {
    rotulo: "Não quero este setor",
    acao: "nao-e-para-mim",
    motivo: "setor",
    escopo: "setor",
  },
  {
    rotulo: "Não me identifico com estes clientes",
    acao: "nao-e-para-mim",
    motivo: "clientes",
    escopo: "problema",
  },
  {
    rotulo: "Não quero este modelo de receita",
    acao: "nao-e-para-mim",
    motivo: "modelo-de-receita",
    escopo: "modelo",
  },
  {
    rotulo: "Investimento demasiado alto",
    acao: "nao-viavel-agora",
    motivo: "investimento",
    escopo: "candidato",
  },
  {
    rotulo: "Não cabe no meu tempo",
    acao: "nao-viavel-agora",
    motivo: "tempo",
    escopo: "candidato",
  },
  {
    rotulo: "Esforço físico incompatível",
    acao: "nao-e-para-mim",
    motivo: "esforco-fisico",
    escopo: "capacidade",
  },
  {
    rotulo: "Risco ou regulação excessivos",
    acao: "nao-viavel-agora",
    motivo: "risco-regulacao",
    escopo: "candidato",
  },
  {
    rotulo: "Não funciona na minha localização",
    acao: "nao-viavel-agora",
    motivo: "localizacao",
    escopo: "candidato",
  },
];

const ROTULO_ACAO_FEEDBACK: Readonly<Record<AcaoFeedback, string>> = {
  interessa: "Interessa-me",
  "mais-como-isto": "Mais deste género",
  "nao-e-para-mim": "Não é para mim",
  "nao-viavel-agora": "Não é viável agora",
};

const listarAlternativas = (grupos: readonly (readonly string[])[]) =>
  grupos
    .map((grupo) =>
      grupo.length === 1
        ? `«${grupo[0]}»`
        : `uma de ${grupo.map((item) => `«${item}»`).join(" ou ")}`,
    )
    .join(" e ");

export interface ResultadosProps {
  resultado: ResultadoDescoberta;
  onVoltar: () => void;
  onGuardarHipotese: (candidato: OpportunityCandidate) => void;
  hipotesesGuardadas: ReadonlySet<string>;
  hipotesePorId: ReadonlyMap<string, MarketHypothesis>;
  onProva: (proxima: MarketHypothesis) => void;
  onGuardarPerfil: () => void;
  perfilGuardado: boolean;
  efeitosWhatIf: readonly EfeitoWhatIf[];
  onAplicarWhatIf: (cenarioId: string) => void;
  diferenca: DiferencaAnalise | null;
  /** Aceitar um compromisso medido a partir de um resultado vazio. */
  onAplicarRelaxamento: (contexto: OpportunityContext) => void;
  /** Declarar meios em falta e voltar a correr. Ver `SaidaDoVazio`. */
  onReverMeios: (ativos: readonly AtivoId[]) => void;
  onFeedback: (
    candidato: OpportunityCandidate,
    acao: AcaoFeedback,
    motivo: MotivoFeedback | undefined,
    escopo: EscopoFeedback,
  ) => void;
  onPedirOutras: (modo: "continuar" | "diferente") => void;
  onReporAprendizagem: () => void;
  onDesfazerUltimaEscolha: () => void;
  aExplorarMudancas: boolean;
  onAlternarExploracaoDeMudancas: () => void;
  fontes: {
    evidencia: "a-consultar" | "ligada" | "indisponivel";
    oferta: "a-consultar" | "ligada" | "indisponivel";
  };
  onRepetirFontes: () => void;
}

export default function Resultados({
  resultado,
  onVoltar,
  onGuardarHipotese,
  hipotesesGuardadas,
  hipotesePorId,
  onProva,
  onGuardarPerfil,
  perfilGuardado,
  efeitosWhatIf,
  onAplicarWhatIf,
  diferenca,
  onReverMeios,
  onAplicarRelaxamento,
  onFeedback,
  onPedirOutras,
  onReporAprendizagem,
  onDesfazerUltimaEscolha,
  aExplorarMudancas,
  onAlternarExploracaoDeMudancas,
  fontes,
  onRepetirFontes,
}: ResultadosProps) {
  const [aberto, setAberto] = useState<string>(
    resultado.candidatos[0]?.id ?? "",
  );
  const [verDescartadas, setVerDescartadas] = useState(false);
  const [comparar, setComparar] = useState<readonly string[]>([]);
  const [anguloAtivo, setAnguloAtivo] = useState<AnguloDeLeitura | "todos">(
    "todos",
  );
  const [aRecusar, setARecusar] = useState<string | null>(null);

  const resumo = resumoDoTrabalho(resultado.telemetria);
  const resumoHistorico = diferenca ? resumoDaDiferenca(diferenca) : null;

  // ── UMA OBJEÇÃO FATAL NÃO É «PASSOU OS CRITÉRIOS» ────────────────
  //  Um terço dos candidatos apresentados carregava uma objeção marcada
  //  `fatal` a proceder — falta um meio que a execução exige, ou quatro
  //  ou mais dimensões de risco fora da tolerância declarada. Eram
  //  despromovidos para o fim da lista e continuavam debaixo de um
  //  cabeçalho que dizia, literalmente, «hipóteses que passaram os
  //  critérios». Não passaram: sobreviveram à eliminação e falharam o
  //  stress test, que é outra coisa e merece outro sítio no ecrã.
  const temFatal = (candidato: OpportunityCandidate) =>
    candidato.objecoes.some((objecao) => objecao.fatal && objecao.procede);
  const passaram = useMemo(
    () => resultado.candidatos.filter((item) => !temFatal(item)),
    [resultado.candidatos],
  );
  const comObjecaoFatal = useMemo(
    () => resultado.candidatos.filter(temFatal),
    [resultado.candidatos],
  );

  // ── A ORDEM VISÍVEL CONTRA A PONTUAÇÃO VISÍVEL ───────────────────
  //  A lista é ordenada por MMR, que desconta semelhança para não pôr
  //  cinco variantes do mesmo problema no topo. A escolha é correta e
  //  defensável — mas o cartão mostra «Pontuação global N» e observou-se
  //  numa corrida real 89, 82, 80, 83, 82, 80. Quem lê com atenção vê um
  //  83 abaixo de um 80 e conclui, com razão, que um dos dois números
  //  está errado. Nenhum está: falta dizê-lo no ecrã, e é o que estas
  //  duas linhas fazem.
  //  A ordem de referência é a mesma que `diversificar()` usa antes do
  //  MMR — confiança, depois o piso do intervalo, e só então o ponto.
  //  Comparar com uma ordenação por `pontuacaoGlobal` marcaria como
  //  «diversificada» toda a linha em que as duas divergem, que passou a
  //  ser quase todas: o aviso deixaria de assinalar o MMR e passaria a
  //  assinalar a própria chave de ordenação.
  const ordemDefensavel = useMemo(() => {
    const ordenados = [...passaram].sort(
      (esquerda, direita) =>
        forcaDaConfianca(direita.confianca.nivel) -
          forcaDaConfianca(esquerda.confianca.nivel) ||
        direita.intervaloPontuacao.min - esquerda.intervaloPontuacao.min ||
        direita.pontuacaoGlobal - esquerda.pontuacaoGlobal ||
        esquerda.titulo.localeCompare(direita.titulo, "pt-PT"),
    );
    return new Map(ordenados.map((item, indice) => [item.id, indice]));
  }, [passaram]);
  const ordemFoiDiversificada = useMemo(
    () =>
      passaram.some((item, indice) => ordemDefensavel.get(item.id) !== indice),
    [passaram, ordemDefensavel],
  );

  const porAngulo = useMemo(
    () =>
      new Map(
        resultado.destaques.map((item) => [item.angulo, item.candidato.id]),
      ),
    [resultado.destaques],
  );

  const visiveis = useMemo(() => {
    if (anguloAtivo === "todos") return passaram;
    const id = porAngulo.get(anguloAtivo);
    return resultado.candidatos.filter((item) => item.id === id);
  }, [anguloAtivo, porAngulo, passaram, resultado.candidatos]);

  // Uma fonte de mercado pode chegar depois de o dossier abrir e transformar
  // a hipótese em bloqueada. Nesse caso ela sai da lista principal. O estado
  // tem de seguir o que está realmente visível; manter o ID antigo deixava o
  // ecrã sem nenhum dossier aberto a meio de uma interação.
  useEffect(() => {
    if (visiveis.some((item) => item.id === aberto)) return;
    setAberto(visiveis[0]?.id ?? "");
    setARecusar(null);
  }, [visiveis, aberto]);

  const paraComparar = resultado.candidatos.filter((item) =>
    comparar.includes(item.id),
  );

  const alternarComparar = (id: string) =>
    setComparar((atual) =>
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : atual.length >= 4
          ? atual
          : [...atual, id],
    );

  return (
    <div className="space-y-4">
      {/* ══ O que o motor fez ═══════════════════════════════════ */}
      <section className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-brand">Recomendado para ti</p>
            <h2
              id="resultado-descoberta"
              className="font-display mt-0.5 text-xl font-semibold text-ink"
            >
              {passaram.length}{" "}
              {passaram.length === 1
                ? "hipótese passou os critérios"
                : "hipóteses passaram os critérios"}
            </h2>
            {comObjecaoFatal.length > 0 ? (
              <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">
                Outras {comObjecaoFatal.length} sobreviveram à eliminação e
                falharam o stress test — estão em baixo, com a objeção que as
                trava.
              </p>
            ) : null}
            {resumo ? (
              <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
                {resumo}.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onVoltar}
            className="inline-flex min-h-[40px] flex-none items-center gap-1.5 rounded-full border border-stone-200 px-3.5 text-[12px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
          >
            <ArrowLeft size={13} /> Ajustar contexto
          </button>
        </div>

        {/* As etapas reais, com as contagens que produziram */}
        {/* As etapas reais, com as contagens que produziram — e com a
            UNIDADE de cada uma. A seta só aparece onde há mesmo um filtro
            entre dois números da mesma espécie: «17 → 3» com hipóteses de
            um lado e observações do outro lia-se como catorze hipóteses
            eliminadas, e nenhuma tinha sido. */}
        <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-stone-100 pt-3 dark:border-stone-800">
          {resultado.telemetria.etapas.map((etapa) => (
            <li key={etapa.etapa} className="text-[11px] text-stone-500">
              <span className="font-medium text-stone-600 dark:text-stone-300">
                {ROTULO_ETAPA[etapa.etapa]}
              </span>{" "}
              <span className="tabular-nums">{descreverEtapa(etapa)}</span>
            </li>
          ))}
        </ol>

        {resultado.telemetria.observacoesUsadas === 0 ? (
          <p className="mt-2 text-[11px] leading-snug text-stone-500">
            Nenhuma leitura oficial ficou ligada a estas composições. As
            hipóteses aparecem porque encaixam no teu contexto — o mercado ainda
            está por provar, e o dossier de cada uma diz o que falta consultar.
          </p>
        ) : null}

        {fontes.evidencia === "indisponivel" ||
        fontes.oferta === "indisponivel" ? (
          <div
            role="status"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/20"
          >
            <p className="min-w-0 flex-1 text-[11px] leading-snug text-amber-900 dark:text-amber-100">
              <strong className="font-semibold">
                Análise em modo degradado.
              </strong>{" "}
              Falhou a leitura de
              {fontes.evidencia === "indisponivel" &&
              fontes.oferta === "indisponivel"
                ? " procura e oferta"
                : fontes.evidencia === "indisponivel"
                  ? " procura"
                  : " oferta"}
              . O motor não confundiu a falha com ausência de mercado; esses
              eixos ficaram por apurar.
            </p>
            <button
              type="button"
              onClick={onRepetirFontes}
              className="min-h-[38px] rounded-full border border-amber-300 bg-white px-3 text-[11px] font-semibold text-amber-900 hover:border-amber-500 dark:bg-stone-900 dark:text-amber-100"
            >
              Voltar a consultar
            </button>
          </div>
        ) : fontes.evidencia === "a-consultar" ||
          fontes.oferta === "a-consultar" ? (
          <p
            className="mt-2 text-[11px] leading-snug text-stone-500"
            role="status"
          >
            A atualizar as fontes de mercado. Se terminares antes, a análise
            corre sem inventar os dados que ainda não chegaram.
          </p>
        ) : null}

        {resumoHistorico ? (
          <p className="mt-2 flex items-start gap-1.5 border-t border-stone-100 pt-2.5 text-[11px] leading-snug text-stone-500 dark:border-stone-800">
            <History size={12} className="mt-0.5 flex-none text-brand" />
            <span>
              Face à análise de{" "}
              {new Date(diferenca!.anterior).toLocaleDateString("pt-PT", {
                dateStyle: "medium",
              })}
              : {resumoHistorico}. Uma pontuação que muda pode ser o mercado ou
              podes ter sido tu a mudar de resposta — e daqui não dá para
              distinguir.
            </span>
          </p>
        ) : null}
      </section>

      {/* Feedback explícito: local a esta visita e separado dos scores. */}
      {resultado.candidatos.length > 0 ||
      resultado.aprendizagem.feedbackAplicado > 0 ? (
        <section
          aria-label="Ajustar recomendações"
          className="rounded-4xl border border-brand/20 bg-brand-light/35 p-4 dark:border-brand/20 dark:bg-brand/5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-stone-700 dark:text-stone-200">
                <Sparkle size={13} className="text-brand" /> Faz o resultado
                aprender contigo
              </p>
              <p className="mt-1 text-[11px] leading-snug text-stone-500">
                {resultado.aprendizagem.feedbackAplicado > 0
                  ? `Já respeitámos ${resultado.aprendizagem.feedbackAplicado} ${resultado.aprendizagem.feedbackAplicado === 1 ? "escolha" : "escolhas"} nesta visita${resultado.aprendizagem.rejeitadosPelasEscolhas > 0 ? ` e afastámos ${resultado.aprendizagem.rejeitadosPelasEscolhas} ${resultado.aprendizagem.rejeitadosPelasEscolhas === 1 ? "hipótese incompatível" : "hipóteses incompatíveis"}` : ""}.`
                  : "Diz o que te interessa, o que não é para ti e porquê. A próxima seleção muda sem alterar os factos ou a pontuação de mercado."}{" "}
                Nada deste feedback é guardado ao recarregar a página.
              </p>
              {resultado.aprendizagem.decisoes.length > 0 ? (
                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  aria-label="O que o motor aprendeu nesta visita"
                >
                  {resultado.aprendizagem.decisoes.slice(-6).map((decisao) => (
                    <span
                      key={decisao.id}
                      className="rounded-full border border-brand/15 bg-white px-2.5 py-1 text-[10px] font-medium text-stone-600 dark:bg-stone-900 dark:text-stone-300"
                    >
                      {decisao.motivo
                        ? (RAZOES_FEEDBACK.find(
                            (item) => item.motivo === decisao.motivo,
                          )?.rotulo ?? ROTULO_ACAO_FEEDBACK[decisao.acao])
                        : ROTULO_ACAO_FEEDBACK[decisao.acao]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {resultado.aprendizagem.feedbackAplicado > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onDesfazerUltimaEscolha}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 text-[11px] font-semibold text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  <ArrowLeft size={12} /> Desfazer última
                </button>
                <button
                  type="button"
                  onClick={onReporAprendizagem}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 text-[11px] font-semibold text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                >
                  <RotateCcw size={12} /> Repor escolhas
                </button>
              </div>
            ) : null}
          </div>
          {resultado.candidatos.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-brand/10 pt-3">
              <button
                type="button"
                onClick={() => onPedirOutras("continuar")}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-brand px-4 text-[12px] font-semibold text-white hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Mostrar outras <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => onPedirOutras("diferente")}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-brand/30 bg-white px-4 text-[12px] font-semibold text-brand-dark hover:border-brand dark:bg-stone-900 dark:text-brand-mint"
              >
                Quero algo diferente
              </button>
              <span className="self-center text-[10px] text-stone-500">
                {resultado.aprendizagem.haMais
                  ? `${resultado.aprendizagem.totalElegiveis - resultado.candidatos.length} combinações ainda por mostrar nesta seleção`
                  : aExplorarMudancas
                    ? "O motor avisará quando esgotar as possibilidades condicionais"
                    : "O motor avisará quando esgotar as combinações compatíveis"}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {resultado.candidatos.length > 0 &&
      resultado.bloqueiosPorMeio.length > 0 ? (
        <section className="rounded-4xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:p-5">
          <div className="flex items-start gap-2">
            <Plus size={14} className="mt-0.5 flex-none text-brand" />
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                Há mais famílias que o teu perfil ainda não abre
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-stone-500">
                A base não terminou nestes resultados. Estes meios desbloqueiam
                combinações adicionais, mas só contam depois de confirmares que
                existem e servem mesmo para a operação. Os números são medidos a
                voltar a correr o motor, não estimados.
              </p>
            </div>
          </div>
          <ul className="mt-3 grid gap-2 lg:grid-cols-3">
            {resultado.bloqueiosPorMeio.slice(0, 3).map((bloqueio) => (
              <li
                key={bloqueio.gruposAlternativos
                  .map((grupo) => grupo.join("|"))
                  .join("+")}
                className="flex min-w-0 flex-col rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/40"
              >
                <p className="text-[11px] leading-snug text-stone-600 dark:text-stone-300">
                  <strong className="font-semibold text-stone-700 dark:text-stone-200">
                    {listarAlternativas(bloqueio.rotulosAlternativos)}
                  </strong>{" "}
                  pode abrir{" "}
                  <span className="font-semibold text-brand-dark dark:text-brand-mint">
                    {bloqueio.hipotesesQueAbriria}{" "}
                    {bloqueio.hipotesesQueAbriria === 1
                      ? "hipótese"
                      : "hipóteses"}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => onReverMeios(bloqueio.ativos)}
                  className="mt-2 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full border border-brand/30 bg-white px-3 text-[11px] font-semibold text-brand-dark hover:border-brand dark:bg-stone-900 dark:text-brand-mint"
                >
                  Rever se tenho e se serve <ArrowRight size={12} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onAlternarExploracaoDeMudancas}
            className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-stone-900 px-4 text-[11px] font-semibold text-white hover:bg-brand-dark dark:bg-stone-100 dark:text-stone-900"
          >
            Explorar possibilidades que exigem mudança <ArrowRight size={12} />
          </button>
        </section>
      ) : null}

      {aExplorarMudancas ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="min-w-0 flex-1">
            <h3 className="text-[12px] font-semibold text-amber-950 dark:text-amber-100">
              A explorar possibilidades condicionais
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-amber-900/80 dark:text-amber-100/80">
              O motor abriu hipóteses que aproveitam as tuas competências mas
              exigem um meio em falta ou inadequado. Não são recomendações:
              ficam separadas em “não passaram o stress test”, com a mudança
              concreta que falta.
            </p>
          </div>
          <button
            type="button"
            onClick={onAlternarExploracaoDeMudancas}
            className="min-h-[38px] rounded-full border border-amber-300 bg-white px-3 text-[11px] font-semibold text-amber-900 hover:border-amber-500 dark:bg-stone-900 dark:text-amber-100"
          >
            Voltar só às compatíveis
          </button>
        </section>
      ) : null}

      {/* ══ Ângulos de leitura ══════════════════════════════════ */}
      {resultado.destaques.length > 0 ? (
        <section
          aria-label="Ângulos de leitura"
          className="rounded-4xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/50 sm:p-4"
        >
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            <Filter size={12} /> Ler por outro critério
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={anguloAtivo === "todos"}
              onClick={() => setAnguloAtivo("todos")}
              className={`min-h-[36px] rounded-full border px-3 text-[11px] font-semibold ${
                anguloAtivo === "todos"
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              }`}
            >
              Todas ({passaram.length})
            </button>
            {resultado.destaques.map((destaque) => (
              <button
                key={destaque.angulo}
                type="button"
                aria-pressed={anguloAtivo === destaque.angulo}
                onClick={() => {
                  setAnguloAtivo(destaque.angulo);
                  setAberto(destaque.candidato.id);
                }}
                title={EXPLICACAO_ANGULO[destaque.angulo]}
                className={`min-h-[36px] rounded-full border px-3 text-[11px] font-semibold ${
                  anguloAtivo === destaque.angulo
                    ? "border-brand bg-brand text-white"
                    : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                }`}
              >
                {ROTULO_ANGULO[destaque.angulo]}
              </button>
            ))}
          </div>
          {anguloAtivo !== "todos" ? (
            <p className="mt-2 text-[11px] leading-snug text-stone-500">
              {EXPLICACAO_ANGULO[anguloAtivo]}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ══ Porque a ordem não é só a pontuação ═════════════════ */}
      {ordemFoiDiversificada && anguloAtivo === "todos" ? (
        <p
          data-fora-da-ficha
          className="flex items-start gap-1.5 rounded-3xl border border-stone-100 bg-stone-50 px-4 py-2.5 text-[11px] leading-snug text-stone-500 dark:border-stone-800 dark:bg-stone-900/50"
        >
          <BarChart2 size={12} className="mt-0.5 flex-none text-brand" />
          <span>
            <strong className="font-semibold text-stone-700 dark:text-stone-200">
              Ordenadas pelo que se prova, não pelo que se estima.
            </strong>{" "}
            Primeiro a confiança, depois o mínimo garantido do intervalo — entre
            «77, entre 41 e 92» e «75, entre 70 e 80», a segunda é a melhor
            recomendação porque está provada. Por cima disso, o motor desconta
            semelhança para que cada linha seja uma decisão diferente e não
            cinco variantes do mesmo problema. As marcadas com «diversificada»
            são essas.
          </span>
        </p>
      ) : null}

      {/* ══ A lista ═════════════════════════════════════════════ */}
      <section aria-label="Oportunidades" className="space-y-2.5">
        {visiveis.map((candidato, posicao) => {
          const open = aberto === candidato.id;
          const aprendido = resultado.aprendizagem.ajustes.get(candidato.id);
          const painelFeedbackAberto = aRecusar === candidato.id;
          return (
            <article
              key={candidato.id}
              className={`overflow-hidden rounded-4xl border bg-white shadow-card dark:bg-stone-900 ${
                open
                  ? "border-brand/60"
                  : "border-stone-100 dark:border-stone-800"
              }`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setAberto(open ? "" : candidato.id)}
                className="flex w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-2xl bg-brand-light font-display text-sm font-semibold text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                >
                  {anguloAtivo === "todos" ? posicao + 1 : <Target size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="font-display block text-base leading-snug text-ink">
                    {candidato.titulo}
                  </strong>
                  <span className="mt-1 block text-[13px] leading-relaxed text-stone-500">
                    {candidato.promessa}
                  </span>

                  {/* Fit · mercado · confiança — três coisas, nunca somadas */}
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Chip tom="marca">Encaixa contigo {candidato.fit}%</Chip>
                    <Chip
                      tom={
                        candidato.confianca.nivel === "insuficiente"
                          ? "aviso"
                          : "neutro"
                      }
                    >
                      {ROTULO_CONFIANCA[candidato.confianca.nivel]}
                    </Chip>
                    <Chip>{ROTULO_ENTREGA[candidato.entrega]}</Chip>
                    <Chip>{descreverZona(candidato.regiao)}</Chip>
                    {candidato.viabilidade.investimentoInicial ? (
                      <Chip>
                        {formatarIntervalo(
                          candidato.viabilidade.investimentoInicial,
                        )}
                      </Chip>
                    ) : null}
                    {candidato.seedTemplateId ? (
                      <Chip tom="marca">Dossier curado</Chip>
                    ) : null}
                    {(aprendido?.ajuste ?? 0) > 0 ? (
                      <Chip tom="marca">Afinada pelas tuas escolhas</Chip>
                    ) : null}
                  </span>
                </span>
                <ChevronDown
                  size={17}
                  className={`mt-1 flex-none text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-2 dark:border-stone-800 sm:px-5">
                <button
                  type="button"
                  aria-pressed={comparar.includes(candidato.id)}
                  onClick={() => alternarComparar(candidato.id)}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold ${
                    comparar.includes(candidato.id)
                      ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                      : "border-stone-200 text-stone-500 dark:border-stone-700 dark:text-stone-400"
                  }`}
                >
                  <Swap size={12} />{" "}
                  {comparar.includes(candidato.id) ? "A comparar" : "Comparar"}
                </button>
                {/* O INTERVALO é o número principal e o ponto o
                    secundário: o ponto é o centro de uma coisa que o
                    motor declara desconhecer com ±20, e mostrá-lo
                    sozinho dá-lhe uma autoridade que ele não tem.
                    Quando a cobertura é total o intervalo colapsa e
                    passa a haver um número só — que é a recompensa por
                    ter respondido a tudo. */}
                {/* A barra antes do texto: a orientação do ONS é que a
                    forma visual comunica a incerteza melhor do que a
                    descrição, e que as duas juntas são o que a torna
                    acessível. Largura fixa para não empurrar o texto em
                    ecrã estreito. */}
                <span className="w-14 flex-none sm:w-20">
                  <BarraDeIntervalo
                    min={candidato.intervaloPontuacao.min}
                    ponto={candidato.intervaloPontuacao.ponto}
                    max={candidato.intervaloPontuacao.max}
                    fechado={candidato.intervaloPontuacao.fechado}
                  />
                </span>
                <span className="text-[11px] text-stone-400">
                  {candidato.intervaloPontuacao.fechado ? (
                    <>
                      Pontuação{" "}
                      <span className="tabular-nums font-semibold text-stone-500 dark:text-stone-400">
                        {candidato.pontuacaoGlobal}
                      </span>
                      <span className="text-stone-400">
                        {" "}
                        · sem margem por apurar
                      </span>
                    </>
                  ) : (
                    <>
                      Entre{" "}
                      <span className="tabular-nums font-semibold text-stone-500 dark:text-stone-400">
                        {candidato.intervaloPontuacao.min}
                      </span>{" "}
                      e{" "}
                      <span className="tabular-nums font-semibold text-stone-500 dark:text-stone-400">
                        {candidato.intervaloPontuacao.max}
                      </span>
                      <span className="text-stone-400">
                        {" "}
                        · melhor estimativa {candidato.pontuacaoGlobal}
                      </span>
                    </>
                  )}{" "}
                  · {candidato.problema.setor}
                  {anguloAtivo === "todos" &&
                  ordemDefensavel.get(candidato.id) !== posicao ? (
                    <span className="text-stone-400"> · diversificada</span>
                  ) : null}
                </span>
              </div>

              <div className="border-t border-stone-100 px-4 py-2.5 dark:border-stone-800 sm:px-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Isto representa-te?
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onFeedback(candidato, "interessa", undefined, "candidato")
                    }
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-200 px-3 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
                  >
                    <Heart size={12} /> Interessa-me
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onFeedback(
                        candidato,
                        "mais-como-isto",
                        undefined,
                        "problema",
                      )
                    }
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand/30 px-3 text-[11px] font-semibold text-brand-dark hover:bg-brand-light dark:text-brand-mint"
                  >
                    <Sparkle size={12} /> Mais deste género
                  </button>
                  <button
                    type="button"
                    aria-expanded={painelFeedbackAberto}
                    onClick={() =>
                      setARecusar(painelFeedbackAberto ? null : candidato.id)
                    }
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-stone-200 px-3 text-[11px] font-semibold text-stone-600 hover:border-amber-300 hover:bg-amber-50 dark:border-stone-700 dark:text-stone-300 dark:hover:border-amber-700 dark:hover:bg-amber-950/20"
                  >
                    Não é para mim{" "}
                    <ChevronDown
                      size={12}
                      className={painelFeedbackAberto ? "rotate-180" : ""}
                    />
                  </button>
                </div>
                {aprendido?.razoes.length ? (
                  <p className="mt-1.5 text-[10px] leading-snug text-brand-dark dark:text-brand-mint">
                    {aprendido.razoes.join(" ")}
                  </p>
                ) : null}
                {painelFeedbackAberto ? (
                  <div className="mt-2 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/15">
                    <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                      O que falhou? Esta resposta decide o alcance do ajuste.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {RAZOES_FEEDBACK.map((razao) => (
                        <button
                          key={razao.motivo}
                          type="button"
                          onClick={() =>
                            onFeedback(
                              candidato,
                              razao.acao,
                              razao.motivo,
                              razao.escopo,
                            )
                          }
                          className="min-h-[36px] rounded-full border border-amber-200 bg-white px-3 text-[10px] font-semibold text-stone-600 hover:border-amber-400 hover:text-stone-800 dark:border-amber-900/50 dark:bg-stone-900 dark:text-stone-300"
                        >
                          {razao.rotulo}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] leading-snug text-stone-500">
                      Uma recusa de setor ou tipo de trabalho afasta hipóteses
                      semelhantes; tempo, investimento e localização afastam
                      apenas esta composição.
                    </p>
                  </div>
                ) : null}
              </div>

              {open ? (
                <Dossier
                  candidato={candidato}
                  plano={resultado.planos.get(candidato.id)}
                  onGuardar={() => onGuardarHipotese(candidato)}
                  guardada={hipotesesGuardadas.has(
                    candidato.seedTemplateId ?? candidato.id,
                  )}
                  hipotese={hipotesePorId.get(
                    candidato.seedTemplateId ?? candidato.id,
                  )}
                  onProva={onProva}
                />
              ) : null}
            </article>
          );
        })}

        {visiveis.length === 0 ? (
          resultado.candidatos.length === 0 ? (
            <SaidaDoVazio
              bloqueios={resultado.bloqueiosPorMeio}
              relaxamentos={resultado.relaxamentos}
              onAplicarRelaxamento={onAplicarRelaxamento}
              diagnostico={resultado.diagnosticoVazio}
              descartadas={
                resultado.descartados.filter(
                  (item) => item.motivo !== "duplicado",
                ).length
              }
              onReverMeios={onReverMeios}
              onVerDescartadas={() => setVerDescartadas(true)}
              onVoltar={onVoltar}
              onExplorarMudancas={onAlternarExploracaoDeMudancas}
            />
          ) : anguloAtivo === "todos" ? (
            <p className="rounded-4xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500 dark:border-stone-700">
              Compusemos {resultado.candidatos.length}{" "}
              {resultado.candidatos.length === 1 ? "hipótese" : "hipóteses"} e
              nenhuma sobreviveu ao stress test. Estão listadas em baixo com a
              objeção concreta que as trava
              {aExplorarMudancas
                ? "."
                : " — e os cenários «e se» dizem o que mudaria isso."}
            </p>
          ) : (
            <p className="rounded-4xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500 dark:border-stone-700">
              Nenhuma hipótese corresponde a este ângulo de leitura. Volta a
              «Todos» para as ver.
            </p>
          )
        ) : null}
      </section>

      {/* ══ Falharam o stress test ══════════════════════════════ */}
      {comObjecaoFatal.length > 0 && anguloAtivo === "todos" ? (
        <section
          aria-labelledby="fatais-descoberta"
          className="rounded-4xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 sm:p-5"
        >
          <h3
            id="fatais-descoberta"
            className="font-display text-base font-semibold text-ink"
          >
            {comObjecaoFatal.length}{" "}
            {comObjecaoFatal.length === 1
              ? "hipótese não passou"
              : "hipóteses não passaram"}{" "}
            o stress test
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
            Partem das tuas competências e sobreviveram às tuas recusas, mas o
            motor tentou destruí-las e conseguiu. Não são recomendações. Ficam
            aqui porque a objeção é acionável — e porque escondê-las seria
            decidir por ti.
          </p>
          <ul className="mt-3 space-y-2">
            {comObjecaoFatal.map((candidato) => {
              const objecao = candidato.objecoes.find(
                (item) => item.fatal && item.procede,
              );
              return (
                <li
                  key={candidato.id}
                  className="rounded-3xl border border-amber-200/60 bg-white p-3 dark:border-amber-900/30 dark:bg-stone-900"
                >
                  <p className="text-[13px] font-semibold leading-snug text-ink">
                    {candidato.titulo}
                  </p>
                  {objecao ? (
                    <p className="mt-1 text-[12px] leading-snug text-stone-600 dark:text-stone-300">
                      <strong className="font-semibold">
                        {objecao.pergunta}
                      </strong>{" "}
                      {objecao.resposta}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-stone-400">
                    Encaixa contigo {candidato.fit}% · pontuação{" "}
                    {candidato.pontuacaoGlobal}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      objecao?.id === "entrada" ? onReverMeios([]) : onVoltar()
                    }
                    className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-amber-300 px-3 text-[11px] font-semibold text-amber-900 hover:border-amber-500 dark:text-amber-100"
                  >
                    {objecao?.id === "entrada"
                      ? "Rever meios e adequação"
                      : "Ajustar o contexto"}{" "}
                    <ArrowRight size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ══ Comparador ══════════════════════════════════════════ */}
      {paraComparar.length >= 2 ? (
        <Comparador
          candidatos={paraComparar}
          onLimpar={() => setComparar([])}
        />
      ) : null}

      {/* ══ E se? ═══════════════════════════════════════════════ */}
      {efeitosWhatIf.length > 0 ? (
        <section
          aria-labelledby="whatif-descoberta"
          className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5"
        >
          <h3
            id="whatif-descoberta"
            className="font-display flex items-center gap-2 text-base font-semibold text-ink"
          >
            <Zap size={15} className="text-brand" /> E se alguma coisa mudasse?
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Cada cenário volta a correr o motor inteiro com uma variável
            alterada. O que mostramos é a diferença, não uma lista nova.
          </p>
          <ul className="mt-3 space-y-2">
            {efeitosWhatIf.map((efeito) => (
              <li
                key={efeito.cenario.id}
                className="rounded-3xl border border-stone-100 p-3 dark:border-stone-800"
              >
                <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">
                  {efeito.cenario.pergunta}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-stone-500">
                  {efeito.novas.length > 0
                    ? `${efeito.novas.length} ${efeito.novas.length === 1 ? "hipótese nova" : "hipóteses novas"}`
                    : "Nenhuma hipótese nova"}
                  {efeito.desbloqueadas > 0
                    ? ` · ${efeito.desbloqueadas} deixam de ser descartadas`
                    : ""}
                  {efeito.subiram.length > 0
                    ? ` · ${efeito.subiram.length} sobem de pontuação`
                    : ""}
                  {efeito.perdidas.length > 0
                    ? ` · ${efeito.perdidas.length} deixam de aparecer`
                    : ""}
                </p>
                {efeito.novas.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5">
                    {efeito.novas.slice(0, 3).map((nova) => (
                      <li
                        key={nova.id}
                        className="text-[11px] leading-snug text-stone-500"
                      >
                        · {nova.titulo}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  onClick={() => onAplicarWhatIf(efeito.cenario.id)}
                  className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[11px] font-semibold text-brand-dark hover:underline dark:text-brand-mint"
                >
                  Aplicar ao meu contexto <Check size={12} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ══ O que descartámos ═══════════════════════════════════ */}
      {resultado.descartados.length > 0 ? (
        <section className="rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            aria-expanded={verDescartadas}
            onClick={() => setVerDescartadas(!verDescartadas)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:p-5"
          >
            <span className="min-w-0">
              <span className="font-display flex items-center gap-2 text-base font-semibold text-ink">
                <Trash size={15} className="text-stone-400" /> O que descartámos
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-stone-500">
                {resultado.descartados.length} hipóteses que o motor recusou — e
                a razão de cada uma.
              </span>
            </span>
            <ChevronDown
              size={17}
              className={`flex-none text-stone-400 transition-transform ${verDescartadas ? "rotate-180" : ""}`}
            />
          </button>

          {verDescartadas ? (
            <ul className="space-y-1.5 border-t border-stone-100 p-4 dark:border-stone-800 sm:p-5">
              {resultado.descartados.slice(0, 40).map((descartado) => (
                <li key={descartado.id} className="text-[12px] leading-snug">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-stone-700 dark:text-stone-200">
                      {descartado.titulo}
                    </span>
                    <Chip>
                      {MOTIVO_ROTULO[descartado.motivo] ?? descartado.motivo}
                    </Chip>
                  </span>
                  <span className="mt-0.5 block text-stone-500">
                    {descartado.explicacao}
                  </span>
                  {descartado.oQueMudaria ? (
                    <span className="mt-0.5 block text-[11px] text-stone-400">
                      Deixaria de ser descartada se: {descartado.oQueMudaria}
                    </span>
                  ) : null}
                </li>
              ))}
              {resultado.descartados.length > 40 ? (
                <li className="pt-1 text-[11px] text-stone-400">
                  … e mais {resultado.descartados.length - 40}, quase todas
                  variantes das mesmas.
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* ══ Guardar o perfil ════════════════════════════════════ */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50 sm:p-5">
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
          <strong className="font-semibold text-stone-800 dark:text-stone-100">
            Guardar o teu perfil?
          </strong>{" "}
          Fica neste dispositivo e permite voltar depois para ver o que mudou.
          Não guardamos nada sem carregares aqui.
        </p>
        <button
          type="button"
          onClick={onGuardarPerfil}
          disabled={perfilGuardado}
          className="inline-flex min-h-[42px] flex-none items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-[12px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          {perfilGuardado ? <Check size={13} /> : null}
          {perfilGuardado ? "Perfil guardado" : "Guardar o meu perfil"}
        </button>
      </section>

      <aside className="flex gap-3 rounded-4xl border border-stone-100 bg-stone-50 p-4 text-[12px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300 sm:p-5">
        <Lightbulb size={16} className="mt-0.5 flex-none text-brand" />
        <p>
          <strong className="text-stone-800 dark:text-stone-100">
            Uma hipótese só vira oportunidade depois do teu mercado.
          </strong>{" "}
          Estas foram compostas a partir do que sabes fazer e do que já tens.
          Fontes oficiais detetam contexto; preço sustentável, requisitos,
          entrevistas e um piloto pago confirmam se há negócio na tua geografia
          e para a tua execução.
        </p>
      </aside>

      {/* O motor compõe hipóteses; a forma jurídica, o enquadramento e as
          obrigações de cada uma são conversa de contabilista. Aqui já há
          hipóteses no ecrã — é o momento em que a pergunta se faz. */}
      <ContabilistasNoResultado />
    </div>
  );
}

/**
 * O comparador. No telemóvel NÃO é uma tabela — é um cartão por
 * oportunidade com os mesmos critérios pela mesma ordem, que é o que
 * torna a comparação possível num ecrã estreito (ponto 30).
 */
function Comparador({
  candidatos,
  onLimpar,
}: {
  candidatos: readonly OpportunityCandidate[];
  onLimpar: () => void;
}) {
  const criterios: readonly [
    string,
    (candidato: OpportunityCandidate) => string,
  ][] = [
    ["Encaixa contigo", (item) => `${item.fit}%`],
    ["Pontuação global", (item) => String(item.pontuacaoGlobal)],
    ["Confiança", (item) => ROTULO_CONFIANCA[item.confianca.nivel]],
    [
      "Investimento",
      (item) =>
        item.viabilidade.investimentoInicial
          ? formatarIntervalo(item.viabilidade.investimentoInicial)
          : "por estimar",
    ],
    [
      "Até à receita",
      (item) =>
        item.viabilidade.tempoAteReceitaMeses
          ? formatarIntervalo(item.viabilidade.tempoAteReceitaMeses)
          : "por estimar",
    ],
    ["Receita", (item) => item.modelo.rotulo],
    [
      "Riscos acima do que aceitas",
      // Só os APURADOS. Com `!`, esta coluna contava riscos supostos e
      // comparava hipóteses por prudência nossa, não por medição.
      (item) =>
        String(
          item.riscos.filter((risco) => risco.dentroDaTolerancia === false)
            .length,
        ),
    ],
    [
      "Requisitos a confirmar",
      (item) => String(item.regulacao.requisitos.length),
    ],
    ["Leituras oficiais", (item) => String(item.evidencias.length)],
  ];

  return (
    <section
      data-fora-da-ficha
      aria-labelledby="comparador-descoberta"
      className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3
          id="comparador-descoberta"
          className="font-display flex items-center gap-2 text-base font-semibold text-ink"
        >
          <BarChart2 size={15} className="text-brand" /> A comparar{" "}
          {candidatos.length}
        </h3>
        <button
          type="button"
          onClick={onLimpar}
          className="inline-flex min-h-[36px] items-center text-[11px] font-semibold text-stone-500 underline-offset-4 hover:text-brand-dark hover:underline"
        >
          Limpar comparação
        </button>
      </div>

      {/* Telemóvel: um cartão por hipótese, critérios pela mesma ordem */}
      <div className="space-y-3 lg:hidden">
        {candidatos.map((candidato) => (
          <div
            key={candidato.id}
            className="rounded-3xl border border-stone-100 p-3 dark:border-stone-800"
          >
            <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">
              {candidato.titulo}
            </p>
            <dl className="mt-2 space-y-1">
              {criterios.map(([rotulo, valor]) => (
                <div
                  key={rotulo}
                  className="flex items-baseline justify-between gap-2 text-[11px]"
                >
                  <dt className="flex-none text-stone-500">{rotulo}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-stone-700 dark:text-stone-200">
                    {valor(candidato)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop: tabela, dentro do seu próprio scroll horizontal */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[36rem] text-left text-[12px]">
          <caption className="sr-only">
            Comparação de oportunidades pelos mesmos critérios
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="pb-2 pr-3 font-semibold text-stone-500"
              >
                Critério
              </th>
              {candidatos.map((candidato) => (
                <th
                  key={candidato.id}
                  scope="col"
                  className="pb-2 pr-3 align-bottom font-semibold text-stone-700 dark:text-stone-200"
                >
                  {candidato.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criterios.map(([rotulo, valor]) => (
              <tr
                key={rotulo}
                className="border-t border-stone-100 dark:border-stone-800"
              >
                <th
                  scope="row"
                  className="py-1.5 pr-3 font-medium text-stone-500"
                >
                  {rotulo}
                </th>
                {candidatos.map((candidato) => (
                  <td
                    key={candidato.id}
                    className="py-1.5 pr-3 text-stone-700 dark:text-stone-200"
                  >
                    {valor(candidato)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * A saída de um resultado vazio.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ O QUE ESTAVA AQUI, E PORQUE ERA PIOR DO QUE NADA                    │
 * │                                                                    │
 * │ «Nada passou os critérios com este contexto. Abre "o que           │
 * │ descartámos" — o motor diz o que recusou e o que teria de mudar.»  │
 * │                                                                    │
 * │ Três problemas de uma vez. Primeiro, na causa mais comum (um meio  │
 * │ por declarar) não houve descarte nenhum, portanto esse painel NÃO  │
 * │ EXISTE no ecrã — a frase mandava a pessoa a um sítio que não está  │
 * │ lá. Segundo, dava a mesma resposta a três causas diferentes.       │
 * │ Terceiro, e pior: o motor sabia exatamente o que faltava e ficava  │
 * │ calado.                                                            │
 * │                                                                    │
 * │ Agora cada causa tem a sua frase e a sua saída, e a saída é um     │
 * │ botão que resolve — não um conselho.                               │
 * └────────────────────────────────────────────────────────────────────┘
 */
function SaidaDoVazio({
  bloqueios,
  relaxamentos,
  onAplicarRelaxamento,
  diagnostico,
  descartadas,
  onReverMeios,
  onVerDescartadas,
  onVoltar,
  onExplorarMudancas,
}: {
  bloqueios: readonly BloqueioPorMeio[];
  relaxamentos: readonly Relaxamento[];
  onAplicarRelaxamento: (contexto: OpportunityContext) => void;
  diagnostico: DiagnosticoVazio | null;
  descartadas: number;
  onReverMeios: (ativos: readonly AtivoId[]) => void;
  onVerDescartadas: () => void;
  onVoltar: () => void;
  onExplorarMudancas: () => void;
}) {
  const listar = (rotulos: readonly string[]) =>
    rotulos.length === 1
      ? `«${rotulos[0]}»`
      : `${rotulos
          .slice(0, -1)
          .map((item) => `«${item}»`)
          .join(", ")} e «${rotulos[rotulos.length - 1]}»`;

  // ┌──────────────────────────────────────────────────────────────────┐
  // │ O QUE ABRE, CONTADO                                               │
  // │                                                                  │
  // │ Zero resultados dizia POR QUE É QUE estava vazio e terminava a   │
  // │ conversa. A pessoa ficava a saber que as suas recusas apagaram   │
  // │ tudo, e não ficava a saber QUAL delas nem quanto custava mudar   │
  // │ de ideias. Cada número aqui vem de correr o motor outra vez com  │
  // │ a mudança aplicada — nunca de uma estimativa sobre o grafo.      │
  // │                                                                  │
  // │ Lista vazia é uma resposta legítima e aparece como tal: encher   │
  // │ isto com opções que não abrem nada seria a versão educada de     │
  // │ mentir. Ver `motor/relaxamento.ts`.                              │
  // └──────────────────────────────────────────────────────────────────┘
  const painelDeRelaxamentos =
    relaxamentos.length === 0 ? null : (
      <section
        data-relaxamentos
        className="mt-5 rounded-3xl border border-brand/20 bg-brand-light/30 p-4 dark:border-brand/20 dark:bg-brand/5"
      >
        <h4 className="font-display text-sm font-semibold text-ink">
          O que abre, se mudares uma coisa
        </h4>
        <p className="mt-1 text-[11px] leading-snug text-stone-500">
          Cada número foi contado a correr o motor outra vez com a mudança
          feita. Não é uma promessa — é o que passa a aparecer.
        </p>
        <ul className="mt-3 space-y-2">
          {relaxamentos.map((relaxamento) => (
            <li
              key={relaxamento.id}
              className="rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">
                {relaxamento.rotulo}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                {relaxamento.porque}
              </p>
              <button
                type="button"
                onClick={() => onAplicarRelaxamento(relaxamento.contexto)}
                className="mt-2 inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-brand/30 bg-white px-3 text-[11px] font-semibold text-brand-dark hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-stone-900 dark:text-brand-mint"
              >
                Abre{" "}
                <span className="font-semibold">
                  {relaxamento.hipotesesQueAbriria}{" "}
                  {relaxamento.hipotesesQueAbriria === 1 ? "hipótese" : "hipóteses"}
                </span>
                <ArrowRight size={12} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="rounded-4xl border border-dashed border-stone-200 p-5 dark:border-stone-700 sm:p-6">
      {bloqueios.length > 0 ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            Falta declarar o que usas para trabalhar
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            O motor sabe o que farias com o que sabes fazer — mas cada uma
            dessas coisas precisa de uma ferramenta, e o teu perfil não declara
            nenhuma. Não é uma pergunta de despiste: um computador ou uma caixa
            de ferramentas mudam mesmo o que é possível.
          </p>
          <ul className="mt-3 space-y-2">
            {bloqueios.slice(0, 3).map((bloqueio) => (
              <li
                key={bloqueio.gruposAlternativos
                  .map((grupo) => grupo.join("|"))
                  .join("+")}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-stone-600 dark:text-stone-300">
                  <strong className="font-semibold text-stone-700 dark:text-stone-200">
                    {listarAlternativas(bloqueio.rotulosAlternativos)}
                  </strong>{" "}
                  {bloqueio.rotulosAlternativos.length === 1
                    ? "destranca"
                    : "destrancam"}{" "}
                  {bloqueio.capacidades.join(", ").toLocaleLowerCase("pt-PT")} —{" "}
                  <strong className="font-semibold text-brand-dark dark:text-brand-mint">
                    {bloqueio.hipotesesQueAbriria}{" "}
                    {bloqueio.hipotesesQueAbriria === 1
                      ? "hipótese"
                      : "hipóteses"}
                  </strong>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => onReverMeios(bloqueio.ativos)}
                  className="inline-flex min-h-[38px] flex-none items-center gap-1.5 rounded-full bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Confirmar adequação <ArrowRight size={13} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-snug text-stone-500">
            O número ao lado de cada meio é contado a correr o motor com ele — é
            o que vais ver, não uma estimativa.
          </p>
          <button
            type="button"
            onClick={onExplorarMudancas}
            className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-full border border-brand/30 px-4 text-[12px] font-semibold text-brand-dark hover:border-brand dark:text-brand-mint"
          >
            Ver possibilidades condicionais <ArrowRight size={13} />
          </button>
        </>
      ) : diagnostico?.tipo === "meios-inadequados" ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            Um meio declarado não serve esta operação como está
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            O motor encontrou a competência, mas o estado, a capacidade ou a
            utilização profissional que declaraste tornam a execução
            incompatível. Revê o detalhe do meio; não vamos tratá-lo como
            adequado só porque existe.
          </p>
          <button
            type="button"
            onClick={() => onReverMeios([])}
            className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Rever estado e limitações <ArrowRight size={14} />
          </button>
        </>
      ) : diagnostico?.tipo === "sessao-esgotada" ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            Já viste todas as combinações compatíveis
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            As escolhas desta visita afastaram ou já mostraram tudo o que o
            contexto atual consegue compor. Repõe as escolhas acima ou ajusta o
            contexto para abrir famílias novas — o motor não vai repetir
            resultados só para encher a lista.
          </p>
          <button
            type="button"
            onClick={onVoltar}
            className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Ajustar o meu contexto <ArrowRight size={14} />
          </button>
        </>
      ) : diagnostico?.tipo === "competencia-de-apoio" ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            {listar(diagnostico.competencias)} reforça, mas não sustenta sozinha
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            No grafo do motor, isto aparece sempre como competência que{" "}
            <em>ajuda</em> noutra coisa — nunca como a competência de que um
            negócio precisa para existir. Falar línguas melhora um serviço a
            turistas; não é, por si, o serviço. Acrescenta o que farias por
            dinheiro amanhã e isto passa a pesar a favor.
          </p>
          <button
            type="button"
            onClick={onVoltar}
            className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Acrescentar o que sabes fazer <ArrowRight size={14} />
          </button>
        </>
      ) : diagnostico?.tipo === "restricoes" ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            As tuas recusas eliminaram tudo o que havia
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            O motor compôs hipóteses e as recusas que declaraste apagaram{" "}
            {diagnostico.quantas === 1
              ? "a única"
              : `as ${diagnostico.quantas}`}
            . Isso é o que as recusas fazem — eliminam em vez de ordenar. Vê o
            que caiu e porquê antes de mexer nelas.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onVerDescartadas}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Ver o que foi descartado <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onVoltar}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-stone-200 px-4 text-[13px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
            >
              Rever as recusas
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            Não compusemos nada com este contexto
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            E preferimos dizê-lo a devolver uma lista genérica. O grafo do motor
            não chegou a nenhum problema a partir do que declaraste — acrescenta
            uma competência, um meio ou alarga a zona
            {descartadas > 0 ? ", ou vê o que foi descartado" : ""}.
          </p>
          <button
            type="button"
            onClick={onVoltar}
            className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Ajustar o contexto <ArrowRight size={14} />
          </button>
        </>
      )}
      {painelDeRelaxamentos}
    </div>
  );
}
