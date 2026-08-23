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

import { useMemo, useState } from "react";
import {
  EXPLICACAO_ANGULO,
  ROTULO_ANGULO,
  type AnguloDeLeitura,
} from "@/lib/negocio/descoberta/motor/diversidade";
import { descreverZona, ROTULO_ENTREGA } from "@/lib/negocio/descoberta/motor/gerador";
import { ROTULO_CONFIANCA } from "@/lib/negocio/descoberta/motor/confianca";
import {
  ROTULO_ETAPA,
  resumoDoTrabalho,
  type BloqueioPorMeio,
  type DiagnosticoVazio,
  type ResultadoDescoberta,
} from "@/lib/negocio/descoberta/motor/pipeline";
import { formatarIntervalo } from "@/lib/negocio/descoberta/proveniencia";
import type { OpportunityCandidate } from "@/lib/negocio/descoberta/motor/tipos";
import type { AtivoId } from "@/lib/negocio/descoberta/contexto/tipos";
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
  Lightbulb,
  Swap,
  Target,
  Trash,
  Zap,
} from "@/components/ui/Icons";
import { Chip } from "./atomos";
import Dossier from "./Dossier";

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
  /** Declarar meios em falta e voltar a correr. Ver `SaidaDoVazio`. */
  onDeclararMeios: (ativos: readonly AtivoId[]) => void;
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
  onDeclararMeios,
}: ResultadosProps) {
  const [aberto, setAberto] = useState<string>(resultado.candidatos[0]?.id ?? "");
  const [verDescartadas, setVerDescartadas] = useState(false);
  const [comparar, setComparar] = useState<readonly string[]>([]);
  const [anguloAtivo, setAnguloAtivo] = useState<AnguloDeLeitura | "todos">("todos");

  const resumo = resumoDoTrabalho(resultado.telemetria);
  const resumoHistorico = diferenca ? resumoDaDiferenca(diferenca) : null;

  const porAngulo = useMemo(
    () => new Map(resultado.destaques.map((item) => [item.angulo, item.candidato.id])),
    [resultado.destaques],
  );

  const visiveis = useMemo(() => {
    if (anguloAtivo === "todos") return resultado.candidatos;
    const id = porAngulo.get(anguloAtivo);
    return resultado.candidatos.filter((item) => item.id === id);
  }, [anguloAtivo, porAngulo, resultado.candidatos]);

  const paraComparar = resultado.candidatos.filter((item) => comparar.includes(item.id));

  const alternarComparar = (id: string) =>
    setComparar((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : atual.length >= 4 ? atual : [...atual, id],
    );

  return (
    <div className="space-y-4">
      {/* ══ O que o motor fez ═══════════════════════════════════ */}
      <section className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-brand">Recomendado para ti</p>
            <h2 id="resultado-descoberta" className="font-display mt-0.5 text-xl font-semibold text-ink">
              {resultado.candidatos.length}{" "}
              {resultado.candidatos.length === 1 ? "hipótese passou os critérios" : "hipóteses passaram os critérios"}
            </h2>
            {resumo ? <p className="mt-1 text-[12px] leading-relaxed text-stone-500">{resumo}.</p> : null}
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
        <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-stone-100 pt-3 dark:border-stone-800">
          {resultado.telemetria.etapas.map((etapa) => (
            <li key={etapa.etapa} className="text-[11px] text-stone-500">
              <span className="font-medium text-stone-600 dark:text-stone-300">{ROTULO_ETAPA[etapa.etapa]}</span>{" "}
              <span className="tabular-nums">
                {etapa.entraram} → {etapa.sairam}
              </span>
            </li>
          ))}
        </ol>

        {resultado.telemetria.observacoesUsadas === 0 ? (
          <p className="mt-2 text-[11px] leading-snug text-stone-500">
            Nenhuma leitura oficial ficou ligada a estas composições. As hipóteses aparecem porque encaixam
            no teu contexto — o mercado ainda está por provar, e o dossier de cada uma diz o que falta
            consultar.
          </p>
        ) : null}

        {resumoHistorico ? (
          <p className="mt-2 flex items-start gap-1.5 border-t border-stone-100 pt-2.5 text-[11px] leading-snug text-stone-500 dark:border-stone-800">
            <History size={12} className="mt-0.5 flex-none text-brand" />
            <span>
              Face à análise de {new Date(diferenca!.anterior).toLocaleDateString("pt-PT", { dateStyle: "medium" })}:{" "}
              {resumoHistorico}. Uma pontuação que muda pode ser o mercado ou podes ter sido tu a mudar de
              resposta — e daqui não dá para distinguir.
            </span>
          </p>
        ) : null}
      </section>

      {/* ══ Ângulos de leitura ══════════════════════════════════ */}
      {resultado.destaques.length > 0 ? (
        <section aria-label="Ângulos de leitura" className="rounded-4xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/50 sm:p-4">
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
              Todas ({resultado.candidatos.length})
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
            <p className="mt-2 text-[11px] leading-snug text-stone-500">{EXPLICACAO_ANGULO[anguloAtivo]}</p>
          ) : null}
        </section>
      ) : null}

      {/* ══ A lista ═════════════════════════════════════════════ */}
      <section aria-label="Oportunidades" className="space-y-2.5">
        {visiveis.map((candidato, posicao) => {
          const open = aberto === candidato.id;
          return (
            <article
              key={candidato.id}
              className={`overflow-hidden rounded-4xl border bg-white shadow-card dark:bg-stone-900 ${
                open ? "border-brand/60" : "border-stone-100 dark:border-stone-800"
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
                  <strong className="font-display block text-base leading-snug text-ink">{candidato.titulo}</strong>
                  <span className="mt-1 block text-[13px] leading-relaxed text-stone-500">{candidato.promessa}</span>

                  {/* Fit · mercado · confiança — três coisas, nunca somadas */}
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Chip tom="marca">Encaixa contigo {candidato.fit}%</Chip>
                    <Chip tom={candidato.confianca.nivel === "insuficiente" ? "aviso" : "neutro"}>
                      {ROTULO_CONFIANCA[candidato.confianca.nivel]}
                    </Chip>
                    <Chip>{ROTULO_ENTREGA[candidato.entrega]}</Chip>
                    <Chip>{descreverZona(candidato.regiao)}</Chip>
                    {candidato.viabilidade.investimentoInicial ? (
                      <Chip>{formatarIntervalo(candidato.viabilidade.investimentoInicial)}</Chip>
                    ) : null}
                    {candidato.seedTemplateId ? <Chip tom="marca">Dossier curado</Chip> : null}
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
                  <Swap size={12} /> {comparar.includes(candidato.id) ? "A comparar" : "Comparar"}
                </button>
                <span className="text-[11px] text-stone-400">
                  Pontuação global {candidato.pontuacaoGlobal} · {candidato.problema.setor}
                </span>
              </div>

              {open ? (
                <Dossier
                  candidato={candidato}
                  plano={resultado.planos.get(candidato.id)}
                  onGuardar={() => onGuardarHipotese(candidato)}
                  guardada={hipotesesGuardadas.has(candidato.seedTemplateId ?? candidato.id)}
                  hipotese={hipotesePorId.get(candidato.seedTemplateId ?? candidato.id)}
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
              diagnostico={resultado.diagnosticoVazio}
              descartadas={resultado.descartados.length}
              onDeclararMeios={onDeclararMeios}
              onVerDescartadas={() => setVerDescartadas(true)}
              onVoltar={onVoltar}
            />
          ) : (
            <p className="rounded-4xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500 dark:border-stone-700">
              Nenhuma hipótese corresponde a este ângulo de leitura. Volta a «Todos» para as ver.
            </p>
          )
        ) : null}
      </section>

      {/* ══ Comparador ══════════════════════════════════════════ */}
      {paraComparar.length >= 2 ? (
        <Comparador candidatos={paraComparar} onLimpar={() => setComparar([])} />
      ) : null}

      {/* ══ E se? ═══════════════════════════════════════════════ */}
      {efeitosWhatIf.length > 0 ? (
        <section
          aria-labelledby="whatif-descoberta"
          className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5"
        >
          <h3 id="whatif-descoberta" className="font-display flex items-center gap-2 text-base font-semibold text-ink">
            <Zap size={15} className="text-brand" /> E se alguma coisa mudasse?
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
            Cada cenário volta a correr o motor inteiro com uma variável alterada. O que mostramos é a
            diferença, não uma lista nova.
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
                  {efeito.desbloqueadas > 0 ? ` · ${efeito.desbloqueadas} deixam de ser descartadas` : ""}
                  {efeito.subiram.length > 0 ? ` · ${efeito.subiram.length} sobem de pontuação` : ""}
                  {efeito.perdidas.length > 0 ? ` · ${efeito.perdidas.length} deixam de aparecer` : ""}
                </p>
                {efeito.novas.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5">
                    {efeito.novas.slice(0, 3).map((nova) => (
                      <li key={nova.id} className="text-[11px] leading-snug text-stone-500">
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
                {resultado.descartados.length} hipóteses que o motor recusou — e a razão de cada uma.
              </span>
            </span>
            <ChevronDown size={17} className={`flex-none text-stone-400 transition-transform ${verDescartadas ? "rotate-180" : ""}`} />
          </button>

          {verDescartadas ? (
            <ul className="space-y-1.5 border-t border-stone-100 p-4 dark:border-stone-800 sm:p-5">
              {resultado.descartados.slice(0, 40).map((descartado) => (
                <li key={descartado.id} className="text-[12px] leading-snug">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-stone-700 dark:text-stone-200">{descartado.titulo}</span>
                    <Chip>{MOTIVO_ROTULO[descartado.motivo] ?? descartado.motivo}</Chip>
                  </span>
                  <span className="mt-0.5 block text-stone-500">{descartado.explicacao}</span>
                  {descartado.oQueMudaria ? (
                    <span className="mt-0.5 block text-[11px] text-stone-400">
                      Deixaria de ser descartada se: {descartado.oQueMudaria}
                    </span>
                  ) : null}
                </li>
              ))}
              {resultado.descartados.length > 40 ? (
                <li className="pt-1 text-[11px] text-stone-400">
                  … e mais {resultado.descartados.length - 40}, quase todas variantes das mesmas.
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* ══ Guardar o perfil ════════════════════════════════════ */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50 sm:p-5">
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
          <strong className="font-semibold text-stone-800 dark:text-stone-100">Guardar o teu perfil?</strong> Fica
          neste dispositivo e permite voltar depois para ver o que mudou. Não guardamos nada sem carregares
          aqui.
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
          <strong className="text-stone-800 dark:text-stone-100">Uma hipótese só vira oportunidade depois do teu mercado.</strong>{" "}
          Estas foram compostas a partir do que sabes fazer e do que já tens. Fontes oficiais detetam
          contexto; preço sustentável, requisitos, entrevistas e um piloto pago confirmam se há negócio na
          tua geografia e para a tua execução.
        </p>
      </aside>
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
  const criterios: readonly [string, (candidato: OpportunityCandidate) => string][] = [
    ["Encaixa contigo", (item) => `${item.fit}%`],
    ["Pontuação global", (item) => String(item.pontuacaoGlobal)],
    ["Confiança", (item) => ROTULO_CONFIANCA[item.confianca.nivel]],
    [
      "Investimento",
      (item) => (item.viabilidade.investimentoInicial ? formatarIntervalo(item.viabilidade.investimentoInicial) : "por estimar"),
    ],
    [
      "Até à receita",
      (item) => (item.viabilidade.tempoAteReceitaMeses ? formatarIntervalo(item.viabilidade.tempoAteReceitaMeses) : "por estimar"),
    ],
    ["Receita", (item) => item.modelo.rotulo],
    ["Riscos acima do que aceitas", (item) => String(item.riscos.filter((risco) => !risco.dentroDaTolerancia).length)],
    ["Requisitos a confirmar", (item) => String(item.regulacao.requisitos.length)],
    ["Leituras oficiais", (item) => String(item.evidencias.length)],
  ];

  return (
    <section
      aria-labelledby="comparador-descoberta"
      className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="comparador-descoberta" className="font-display flex items-center gap-2 text-base font-semibold text-ink">
          <BarChart2 size={15} className="text-brand" /> A comparar {candidatos.length}
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
          <div key={candidato.id} className="rounded-3xl border border-stone-100 p-3 dark:border-stone-800">
            <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">{candidato.titulo}</p>
            <dl className="mt-2 space-y-1">
              {criterios.map(([rotulo, valor]) => (
                <div key={rotulo} className="flex items-baseline justify-between gap-2 text-[11px]">
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
          <caption className="sr-only">Comparação de oportunidades pelos mesmos critérios</caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2 pr-3 font-semibold text-stone-500">
                Critério
              </th>
              {candidatos.map((candidato) => (
                <th key={candidato.id} scope="col" className="pb-2 pr-3 align-bottom font-semibold text-stone-700 dark:text-stone-200">
                  {candidato.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criterios.map(([rotulo, valor]) => (
              <tr key={rotulo} className="border-t border-stone-100 dark:border-stone-800">
                <th scope="row" className="py-1.5 pr-3 font-medium text-stone-500">
                  {rotulo}
                </th>
                {candidatos.map((candidato) => (
                  <td key={candidato.id} className="py-1.5 pr-3 text-stone-700 dark:text-stone-200">
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
  diagnostico,
  descartadas,
  onDeclararMeios,
  onVerDescartadas,
  onVoltar,
}: {
  bloqueios: readonly BloqueioPorMeio[];
  diagnostico: DiagnosticoVazio | null;
  descartadas: number;
  onDeclararMeios: (ativos: readonly AtivoId[]) => void;
  onVerDescartadas: () => void;
  onVoltar: () => void;
}) {
  const listar = (rotulos: readonly string[]) =>
    rotulos.length === 1
      ? `«${rotulos[0]}»`
      : `${rotulos.slice(0, -1).map((item) => `«${item}»`).join(", ")} e «${rotulos[rotulos.length - 1]}»`;

  return (
    <div className="rounded-4xl border border-dashed border-stone-200 p-5 dark:border-stone-700 sm:p-6">
      {bloqueios.length > 0 ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            Falta declarar o que usas para trabalhar
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            O motor sabe o que farias com o que sabes fazer — mas cada uma dessas coisas precisa de
            uma ferramenta, e o teu perfil não declara nenhuma. Não é uma pergunta de despiste: um
            computador ou uma caixa de ferramentas mudam mesmo o que é possível.
          </p>
          <ul className="mt-3 space-y-2">
            {bloqueios.slice(0, 3).map((bloqueio) => (
              <li
                key={bloqueio.ativos.join("+")}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-stone-600 dark:text-stone-300">
                  <strong className="font-semibold text-stone-700 dark:text-stone-200">
                    {listar(bloqueio.rotulos)}
                  </strong>{" "}
                  {bloqueio.rotulos.length === 1 ? "destranca" : "destrancam"}{" "}
                  {bloqueio.capacidades.join(", ").toLocaleLowerCase("pt-PT")} —{" "}
                  <strong className="font-semibold text-brand-dark dark:text-brand-mint">
                    {bloqueio.hipotesesQueAbriria}{" "}
                    {bloqueio.hipotesesQueAbriria === 1 ? "hipótese" : "hipóteses"}
                  </strong>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => onDeclararMeios(bloqueio.ativos)}
                  className="inline-flex min-h-[38px] flex-none items-center gap-1.5 rounded-full bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {bloqueio.ativos.length === 1 ? "Tenho isto" : "Tenho estes"} <ArrowRight size={13} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-snug text-stone-500">
            O número ao lado de cada meio é contado a correr o motor com ele — é o que vais ver,
            não uma estimativa.
          </p>
        </>
      ) : diagnostico?.tipo === "competencia-de-apoio" ? (
        <>
          <h3 className="font-display text-base font-semibold text-ink">
            {listar(diagnostico.competencias)} reforça, mas não sustenta sozinha
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
            No grafo do motor, isto aparece sempre como competência que <em>ajuda</em> noutra coisa —
            nunca como a competência de que um negócio precisa para existir. Falar línguas melhora
            um serviço a turistas; não é, por si, o serviço. Acrescenta o que farias por dinheiro
            amanhã e isto passa a pesar a favor.
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
            {diagnostico.quantas === 1 ? "a única" : `as ${diagnostico.quantas}`}. Isso é o que as
            recusas fazem — eliminam em vez de ordenar. Vê o que caiu e porquê antes de mexer nelas.
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
            E preferimos dizê-lo a devolver uma lista genérica. O grafo do motor não chegou a
            nenhum problema a partir do que declaraste — acrescenta uma competência, um meio ou
            alarga a zona{descartadas > 0 ? ", ou vê o que foi descartado" : ""}.
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
    </div>
  );
}
