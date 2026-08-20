"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  OPPORTUNITY_TEMPLATES,
  rankOpportunityTemplates,
  templateHasLiveEvidence,
  type BusinessDiscoveryProfile,
  type BusinessStrength,
  type MarketObservationSummary,
  type MarketPilotEvidence,
  type MarketRegion,
  type OpportunityTemplate,
} from "@/lib/negocio/market/opportunities";
import type { MarketEvidenceGateResult } from "@/lib/negocio/market/tipos";
import { MARKET_REGIONS, splitObservationsByRegion } from "@/lib/negocio/market/geografia";
import { evaluateLocalMarketEvidence } from "@/lib/negocio/market/gate-local";
import {
  addProof,
  newHypothesis,
  PROOF_LABELS,
  PROOF_VALIDITY_DAYS,
  removeProof,
  summarizeProofs,
  type MarketHypothesis,
  type MarketProofKind,
} from "@/lib/negocio/market/hipoteses";
import { guardarHipotese, lerHipoteses } from "@/lib/store/hipoteses-mercado";
import { ArrowRight, Check, ChevronDown, ExternalLink, Lightbulb, Plus, Spinner, Target, Trash } from "@/components/ui/Icons";

const DEFAULT_PROFILE: BusinessDiscoveryProfile = {
  structure: "por-decidir",
  delivery: "hibrido",
  capital: "ate-500",
  recurrence: "indiferente",
  strengths: ["operacoes"],
  region: "portugal",
};

const STRENGTHS: readonly { value: BusinessStrength; label: string }[] = [
  { value: "comercial", label: "Vender e criar relações" },
  { value: "digital", label: "Ferramentas digitais" },
  { value: "operacoes", label: "Organizar e executar" },
  { value: "cuidado", label: "Acompanhar pessoas" },
  { value: "tecnico", label: "Resolver problemas técnicos" },
];

const stateStyle: Record<string, { label: string; className: string }> = {
  template: { label: "Ideia por investigar", className: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300" },
  signal_detected: { label: "Sinal oficial encontrado", className: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200" },
  candidate: { label: "Candidata a teste", className: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" },
  evidence_qualified: { label: "Evidência qualificada", className: "bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint" },
  user_validated: { label: "Validada contigo", className: "bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint" },
  operating: { label: "Em operação", className: "bg-brand text-white" },
  stale: { label: "Dados a atualizar", className: "bg-alert-bg text-alert-text" },
  contradicted: { label: "Hipótese contrariada", className: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200" },
};

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-[40px] rounded-full border px-3.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              value === option.value
                ? "border-brand bg-brand text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const HEALTH_LABEL: Readonly<Record<string, string>> = {
  healthy: "a responder",
  delayed: "sem resposta",
  stale: "fora de validade",
  schema_changed: "mudou de formato",
  license_review: "licença por rever",
  quarantined: "em quarentena",
  disabled: "desligada",
};

const KIND_LABEL: Readonly<Record<string, string>> = {
  demand: "procura",
  transactional: "transação",
  structural: "estrutura",
  supply: "oferta",
  competition: "concorrência",
  cost: "custo",
  negative: "sinal contrário",
};

function Leitura({ observation, contexto }: { observation: MarketObservationSummary; contexto?: boolean }) {
  return (
    <div
      className={`rounded-2xl px-3 py-2.5 ${
        contexto
          ? "border border-dashed border-stone-200 bg-transparent dark:border-stone-700"
          : "bg-white dark:bg-stone-900"
      }`}
    >
      <p className="text-lg font-semibold tabular-nums text-ink">
        {typeof observation.value === "number"
          ? observation.value.toLocaleString("pt-PT")
          : String(observation.value)}
        <span className="ml-1 text-xs font-medium text-stone-500">{observation.unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
        {contexto ? "Portugal" : observation.geography.name} ·{" "}
        {observation.referencePeriod.label ?? observation.referencePeriod.end}
        {contexto ? " · contexto nacional" : ""}
      </p>
    </div>
  );
}

interface GrupoSerie {
  seriesId: string;
  seriesLabel: string;
  reading: string;
  kind: string;
  local: MarketObservationSummary[];
  nacional: MarketObservationSummary[];
}

/**
 * Uma leitura por SÉRIE, com o texto dessa série.
 *
 * Enquanto cada piloto tinha uma série só, mostrar `leituras[0].reading`
 * dizia a verdade por acaso. Com quatro séries — duas classes de empresa,
 * duas faixas etárias — passava a rotular todos os números com a
 * explicação do primeiro, que é a maneira mais silenciosa de mentir com
 * dados corretos.
 */
function agruparPorSerie(
  local: readonly MarketObservationSummary[],
  nacional: readonly MarketObservationSummary[],
): GrupoSerie[] {
  const grupos = new Map<string, GrupoSerie>();
  const registar = (observation: MarketObservationSummary, onde: "local" | "nacional") => {
    const grupo = grupos.get(observation.seriesId) ?? {
      seriesId: observation.seriesId,
      seriesLabel: observation.seriesLabel,
      reading: observation.reading,
      kind: observation.kind,
      local: [],
      nacional: [],
    };
    grupo[onde].push(observation);
    grupos.set(observation.seriesId, grupo);
  };
  for (const observation of local) registar(observation, "local");
  for (const observation of nacional) registar(observation, "nacional");
  return [...grupos.values()];
}

function EvidenceBlock({
  template,
  evidence,
  gate,
  loading,
  region,
}: {
  template: OpportunityTemplate;
  evidence?: MarketPilotEvidence;
  /** O gate recalculado no browser, com zona, preço e provas locais. */
  gate: MarketEvidenceGateResult;
  loading: boolean;
  region: MarketRegion;
}) {
  // A repartição por zona é uma regra de domínio, testada, e não um filtro
  // de igualdade dentro do componente. Foi por ser um filtro que a leitura
  // NACIONAL — publicável e válida para o país inteiro — desaparecia para
  // quem não escolhesse uma das duas zonas mapeadas.
  const { local, nacional } = splitObservationsByRegion(evidence?.observations ?? [], region);
  const aConsultar = loading && templateHasLiveEvidence(template);
  const semSinalLocal = local.length === 0 && nacional.length === 0 && (evidence?.observations.length ?? 0) > 0;
  const state = gate.state;
  const badge = semSinalLocal && state !== "user_validated" && state !== "operating"
    ? { label: "Sem sinal para esta zona", className: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" }
    : stateStyle[state] ?? stateStyle.template;
  const grupos = agruparPorSerie(local, nacional);
  const operacoes = new Set(
    [...local, ...nacional].map((observation) => observation.independenceKey),
  );

  return (
    <div className="rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Evidência de mercado</p>
        {aConsultar ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500"><Spinner size={13} className="animate-spin" /> A consultar</span>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
        )}
      </div>

      {grupos.length ? (
        <div className="mt-3">
          <div className="grid gap-4 md:grid-cols-2">
            {grupos.map((grupo) => (
              <div key={grupo.seriesId} className="rounded-2xl bg-white/60 p-3 dark:bg-stone-900/40">
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                  {grupo.seriesLabel}
                  <span className="rounded-full bg-stone-200/70 px-1.5 py-px text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                    {KIND_LABEL[grupo.kind] ?? grupo.kind}
                  </span>
                </p>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {grupo.local.map((observation) => (
                    <Leitura key={observation.id} observation={observation} />
                  ))}
                  {grupo.nacional.map((observation) => (
                    <Leitura
                      key={observation.id}
                      observation={observation}
                      contexto={grupo.local.length > 0}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">{grupo.reading}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
            {operacoes.size > 1
              ? `${operacoes.size} operações estatísticas independentes por trás destes números.`
              : "Uma só operação estatística por trás destes números: ainda não é triangulação."}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          {aConsultar
            ? "A verificar a fonte oficial. Nenhum número provisório é mostrado durante a consulta."
            : semSinalLocal
              ? "A fonte respondeu para outras zonas. Esse sinal não se transfere para a que escolheste, e não vamos fingir que sim."
              : evidence?.note ?? "O manifesto de fontes existe, mas ainda não há observação publicável para este piloto."}
        </p>
      )}

      <div className="mt-3 space-y-1.5 border-t border-stone-200/70 pt-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800">
        {gate.reasons.slice(0, 1).map((reason) => (
          <p key={reason} className="font-medium text-stone-600 dark:text-stone-300">{reason}</p>
        ))}
        {gate.missing.slice(0, 3).map((missing) => <p key={missing}>Falta: {missing}</p>)}
      </div>

      {evidence ? (
        <div className="mt-3 space-y-1.5 border-t border-stone-200/70 pt-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800">
          <p>
            Consultado em {new Date(evidence.checkedAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
          {evidence.sourceHealth.map((health) => (
            <p key={health.sourceId}>
              Fonte {health.sourceId.toUpperCase()}: {HEALTH_LABEL[health.state] ?? health.state}
              {health.latestReferencePeriodEnd ? ` · dados até ${health.latestReferencePeriodEnd}` : ""}
              {health.message ? ` — ${health.message}` : ""}
            </p>
          ))}
          {evidence.datasetUrl ? (
            <a href={evidence.datasetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-dark hover:underline dark:text-brand-mint">
              Ver dataset e licença <ExternalLink size={11} />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const PROOF_ORDER: readonly MarketProofKind[] = [
  "interview",
  "accepted_quote",
  "pre_sale",
  "paid_pilot",
  "sale",
];

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `prova_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * O painel onde a hipótese deixa de ser leitura e passa a ser trabalho.
 *
 * A ordem dos botões é a escada de evidência do relatório, e a entrevista
 * está lá em primeiro precisamente para se poder dizer, ao lado, que não
 * chega. Sem isto, `user_validated` e `operating` eram estados que o motor
 * sabia calcular e ninguém conseguia atingir.
 */
function ProvaLocal({
  template,
  hypothesis,
  asOf,
  onChange,
}: {
  template: OpportunityTemplate;
  hypothesis?: MarketHypothesis;
  asOf: string;
  onChange: (proximo: MarketHypothesis) => void;
}) {
  const [dia, setDia] = useState(() => asOf.slice(0, 10));
  const [tipo, setTipo] = useState<MarketProofKind>("interview");
  const [recebido, setRecebido] = useState(false);
  const [margem, setMargem] = useState(false);

  const resumo = hypothesis ? summarizeProofs(hypothesis, asOf) : null;
  const paga = tipo === "paid_pilot" || tipo === "sale" || tipo === "pre_sale";

  const registar = () => {
    const base = hypothesis ?? newHypothesis(template.id, "portugal");
    onChange(
      addProof(base, {
        id: novoId(),
        kind: tipo,
        occurredAt: dia,
        ...(paga ? { paymentReceived: recebido, positiveContribution: margem } : {}),
      }),
    );
    setRecebido(false);
    setMargem(false);
  };

  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Provar no teu mercado</p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
        Fica tudo neste dispositivo. Uma entrevista conta-se, mas não promove a hipótese — só orçamento
        aceite, pré-venda, piloto pago ou venda o fazem. As provas valem {PROOF_VALIDITY_DAYS} dias.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PROOF_ORDER.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={tipo === kind}
            onClick={() => setTipo(kind)}
            className={`min-h-[36px] rounded-full border px-3 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              tipo === kind
                ? "border-brand bg-brand text-white"
                : "border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300"
            }`}
          >
            {PROOF_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-[9rem] flex-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 sm:max-w-[14rem]">
          Quando aconteceu
          <input
            type="date"
            value={dia}
            max={asOf.slice(0, 10)}
            onChange={(event) => setDia(event.target.value)}
            className="mt-1 block h-9 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs text-ink focus:border-brand focus:outline-none dark:border-stone-700 dark:bg-stone-950"
          />
        </label>
        <button
          type="button"
          onClick={registar}
          disabled={!dia}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-brand-deep px-3.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          <Plus size={12} /> Registar
        </button>
      </div>

      {paga ? (
        <div className="mt-2 space-y-1.5">
          {[
            { on: recebido, set: setRecebido, label: "O dinheiro entrou mesmo" },
            { on: margem, set: setMargem, label: "A margem observada foi positiva depois dos custos reais" },
          ].map((item) => (
            <label key={item.label} className="flex items-start gap-2 text-[11px] leading-snug text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                checked={item.on}
                onChange={(event) => item.set(event.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-brand"
              />
              {item.label}
            </label>
          ))}
        </div>
      ) : null}

      {hypothesis?.proofs.length ? (
        <ul className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
          {hypothesis.proofs.slice(0, 6).map((proof) => (
            <li key={proof.id} className="flex items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-300">
              <span>
                {PROOF_LABELS[proof.kind]} · {proof.occurredAt}
                {proof.paymentReceived ? " · recebido" : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange(removeProof(hypothesis, proof.id))}
                aria-label={`Apagar ${PROOF_LABELS[proof.kind]} de ${proof.occurredAt}`}
                className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-stone-400 hover:text-red-600"
              >
                <Trash size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {resumo ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          {resumo.currentInterviews} {resumo.currentInterviews === 1 ? "entrevista" : "entrevistas"} ·{" "}
          {resumo.currentMarketProofs} {resumo.currentMarketProofs === 1 ? "prova de mercado" : "provas de mercado"} válidas
          {resumo.expired > 0 ? ` · ${resumo.expired} fora de validade` : ""}.
        </p>
      ) : null}

      <label className="mt-3 flex items-start gap-2 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-600 dark:border-stone-800 dark:text-stone-300">
        <input
          type="checkbox"
          checked={hypothesis?.requirementsReviewed ?? false}
          onChange={(event) =>
            onChange({
              ...(hypothesis ?? newHypothesis(template.id, "portugal")),
              requirementsReviewed: event.target.checked,
              updatedAt: asOf,
            })
          }
          className="mt-0.5 h-4 w-4 flex-none accent-brand"
        />
        Já verifiquei os requisitos críticos: {template.criticalRequirements.join("; ")}.
      </label>

      {hypothesis?.pricing ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          Cenário de preço concluído em {hypothesis.pricing.concludedAt.slice(0, 10)}:{" "}
          {hypothesis.pricing.viable
            ? "o motor canónico encontrou preço, contribuição e ponto de equilíbrio."
            : "o motor canónico não fechou as contas com estes pressupostos."}
        </p>
      ) : null}
    </div>
  );
}

export default function DescobrirNegocioStudio() {
  const [profile, setProfile] = useState<BusinessDiscoveryProfile>(DEFAULT_PROFILE);
  const [expanded, setExpanded] = useState<string>(OPPORTUNITY_TEMPLATES[0]?.id ?? "");
  const [evidence, setEvidence] = useState<readonly MarketPilotEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [hipoteses, setHipoteses] = useState<readonly MarketHypothesis[]>([]);
  // Um instante fixo por sessão. Recalcular `Date.now()` a cada render fazia
  // a frescura e a validade das provas mudarem por baixo do ecrã.
  const [asOf] = useState(() => new Date().toISOString());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/market/pilots", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ pilots: MarketPilotEvidence[] }>;
      })
      .then((payload) => setEvidence(Array.isArray(payload.pilots) ? payload.pilots : []))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setEvidence([]);
      })
      .finally(() => setLoadingEvidence(false));
    return () => controller.abort();
  }, []);

  // As hipóteses são lidas depois da montagem, nunca durante o render: o
  // cofre depende do browser e o componente tem de abrir na mesma antes de
  // saber se há alguma coisa guardada.
  useEffect(() => setHipoteses(lerHipoteses()), []);

  const ranked = useMemo(() => rankOpportunityTemplates(profile), [profile]);
  const evidenceByTemplate = useMemo(() => new Map(evidence.map((item) => [item.templateId, item])), [evidence]);
  const hipotesePorTemplate = useMemo(
    () => new Map(hipoteses.map((item) => [item.templateId, item])),
    [hipoteses],
  );

  const guardar = (proxima: MarketHypothesis) => {
    setHipoteses(guardarHipotese({ ...proxima, region: profile.region }));
  };

  const toggleStrength = (strength: BusinessStrength) =>
    setProfile((current) => ({
      ...current,
      strengths: current.strengths.includes(strength)
        ? current.strengths.filter((item) => item !== strength)
        : [...current.strengths, strength],
    }));

  return (
    <div className="space-y-6">
      <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"><Target size={18} /></span>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Primeiro: o que cabe na tua vida?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
              Estas respostas calculam compatibilidade pessoal, não procura de mercado. Nada do que escolhes sai do teu browser.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChoiceGroup
            label="Como queres trabalhar"
            value={profile.delivery}
            options={[{ value: "local", label: "Presencial/local" }, { value: "remoto", label: "Remoto" }, { value: "hibrido", label: "Híbrido" }]}
            onChange={(delivery) => setProfile((current) => ({ ...current, delivery }))}
          />
          <ChoiceGroup
            label="Onde queres testar"
            value={profile.region}
            options={MARKET_REGIONS.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(region) => setProfile((current) => ({ ...current, region }))}
          />
          <ChoiceGroup
            label="Capital disponível para testar"
            value={profile.capital}
            options={[{ value: "ate-500", label: "Até 500 €" }, { value: "500-3000", label: "500–3 000 €" }, { value: "mais-3000", label: "Mais de 3 000 €" }]}
            onChange={(capital) => setProfile((current) => ({ ...current, capital }))}
          />
          <ChoiceGroup
            label="Receita que preferes"
            value={profile.recurrence}
            options={[{ value: "pontual", label: "Projetos pontuais" }, { value: "recorrente", label: "Recorrente" }, { value: "indiferente", label: "Tanto faz" }]}
            onChange={(recurrence) => setProfile((current) => ({ ...current, recurrence }))}
          />
          <ChoiceGroup
            label="Estrutura em que estás a pensar"
            value={profile.structure}
            options={[{ value: "recibos-verdes", label: "Recibos verdes" }, { value: "empresa", label: "Empresa" }, { value: "por-decidir", label: "Quero comparar" }]}
            onChange={(structure) => setProfile((current) => ({ ...current, structure }))}
          />
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Em que és forte?</legend>
          <div className="flex flex-wrap gap-2">
            {STRENGTHS.map((item) => {
              const active = profile.strengths.includes(item.value);
              return (
                <button key={item.value} type="button" aria-pressed={active} onClick={() => toggleStrength(item.value)} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint" : "border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300"}`}>
                  {active ? <Check size={12} /> : null}{item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="resultado-descoberta">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-brand">Pilotos de investigação</p>
            <h2 id="resultado-descoberta" className="font-display mt-1 text-2xl font-semibold text-ink">Melhor encaixe primeiro</h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-stone-500">A percentagem é afinidade contigo. O estado colorido é a evidência externa. Nunca são somados num “score mágico”.</p>
        </div>

        <div className="space-y-3">
          {ranked.map(({ template, fit }, position) => {
            const open = expanded === template.id;
            const pilotEvidence = evidenceByTemplate.get(template.id);
            const hipotese = hipotesePorTemplate.get(template.id);
            // O gate volta a correr aqui — o mesmo motor, agora com a zona,
            // o preço e as provas que só existem neste dispositivo.
            const gate = evaluateLocalMarketEvidence({
              template,
              evidence: pilotEvidence,
              hypothesis: hipotese,
              region: profile.region,
              asOf,
            });
            return (
              <article key={template.id} className="overflow-hidden rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900">
                <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? "" : template.id)} className="flex w-full items-start gap-4 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:p-6">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-brand-light font-display text-lg font-semibold text-brand-deep dark:bg-brand/15 dark:text-brand-mint">{position + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-lg text-ink">{template.title}</strong>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">Compatibilidade {fit.score}%</span>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-stone-500">{template.promise}</span>
                  </span>
                  <ChevronDown size={17} className={`mt-2 flex-none text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open ? (
                  <div className="border-t border-stone-100 px-5 pb-6 pt-5 dark:border-stone-800 sm:px-6">
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div><p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Cliente</p><p className="mt-1 text-sm leading-relaxed text-stone-500">{template.customer}</p></div>
                          <div><p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Como ganha dinheiro</p><p className="mt-1 text-sm leading-relaxed text-stone-500">{template.revenueModel}</p></div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Primeiro teste comercial</p>
                          <ol className="mt-2 space-y-2">
                            {template.firstCustomerPath.map((step, index) => <li key={step} className="flex gap-2 text-sm leading-relaxed text-stone-500"><span className="font-semibold text-brand">{index + 1}.</span>{step}</li>)}
                          </ol>
                        </div>
                        <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Teste que pode matar a ideia</p>
                          <p className="mt-1 text-sm leading-relaxed text-amber-900/75 dark:text-amber-100/70">{template.falsificationTest}</p>
                        </div>
                      </div>

                      <div className="self-start rounded-3xl border border-brand-light bg-brand-light/30 p-4 dark:border-brand/20 dark:bg-brand/10">
                        <p className="text-xs font-semibold text-brand-deep dark:text-brand-mint">Porque apareceu aqui</p>
                        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                          {fit.reasons.slice(0, 4).map((reason) => <li key={reason} className="flex gap-2"><Check size={12} className="mt-0.5 flex-none text-brand" />{reason}</li>)}
                        </ul>
                        {fit.tensions.length ? <p className="mt-3 text-[11px] leading-relaxed text-stone-500">Atenção: {fit.tensions[0]}</p> : null}
                      </div>
                    </div>

                    {/* ── Largura toda para o que cresceu ────────────────
                        A evidência era uma nota na coluna estreita quando
                        cada piloto tinha uma série. Com quatro séries, cada
                        uma com a sua leitura e o seu contexto nacional, essa
                        coluna passou a ter o triplo da altura da outra — e o
                        ecrã ficava com metade vazia ao lado do que interessa
                        ler. */}
                    <div className="mt-5 space-y-5">
                      <EvidenceBlock
                        template={template}
                        evidence={pilotEvidence}
                        gate={gate}
                        loading={loadingEvidence}
                        region={profile.region}
                      />
                      <ProvaLocal
                        template={template}
                        hypothesis={hipotese}
                        asOf={asOf}
                        onChange={guardar}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-stone-100 pt-5 dark:border-stone-800">
                      <Link
                        href={`/ferramentas/recibos-verdes?modo=preco&cenario=${template.pricingScenario}&h=${encodeURIComponent(template.id)}`}
                        className="btn-shine inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card hover:shadow-lift"
                      >
                        Testar preço como recibos verdes <ArrowRight size={14} />
                      </Link>
                      <Link href={`/dashboard/negocio?o=${encodeURIComponent(template.id)}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-stone-200 px-5 text-sm font-semibold text-stone-700 hover:border-brand hover:text-brand-dark dark:border-stone-700 dark:text-stone-200">
                        Construir no motor de empresa
                      </Link>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="flex gap-3 rounded-4xl border border-stone-100 bg-stone-50 p-5 text-sm leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300">
        <Lightbulb size={18} className="mt-0.5 flex-none text-brand" />
        <p><strong className="text-stone-800 dark:text-stone-100">Uma ideia só vira oportunidade depois do teu mercado.</strong> Fontes oficiais detetam contexto; preço sustentável, requisitos, entrevistas e um piloto pago confirmam se há negócio na tua geografia e para a tua execução.</p>
      </aside>
    </div>
  );
}
