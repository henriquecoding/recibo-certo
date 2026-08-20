"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  OPPORTUNITY_TEMPLATES,
  rankOpportunityTemplates,
  type BusinessDiscoveryProfile,
  type BusinessStrength,
  type MarketPilotEvidence,
  type MarketRegion,
  type OpportunityTemplate,
} from "@/lib/negocio/market/opportunities";
import { ArrowRight, Check, ChevronDown, ExternalLink, Lightbulb, Spinner, Target } from "@/components/ui/Icons";

const DEFAULT_PROFILE: BusinessDiscoveryProfile = {
  structure: "por-decidir",
  delivery: "hibrido",
  capital: "ate-500",
  recurrence: "indiferente",
  strengths: ["operacoes"],
  region: "grande-lisboa",
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

const REGION_CODE: Readonly<Record<MarketRegion, string | null>> = {
  "grande-lisboa": "1A",
  "peninsula-setubal": "1B",
  "outra-portugal": null,
};

function EvidenceBlock({
  template,
  evidence,
  loading,
  region,
}: {
  template: OpportunityTemplate;
  evidence?: MarketPilotEvidence;
  loading: boolean;
  region: MarketRegion;
}) {
  const regionCode = REGION_CODE[region];
  const observations = evidence?.observations.filter((observation) => observation.geography.code === regionCode) ?? [];
  const geographyMissing = Boolean(evidence?.observations.length && observations.length === 0);
  const state = geographyMissing ? "template" : evidence?.gate.state ?? "template";
  const badge = geographyMissing
    ? { label: "Falta sinal na tua zona", className: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" }
    : stateStyle[state] ?? stateStyle.template;
  return (
    <div className="rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Evidência de mercado</p>
        {loading && template.id === "tourism-guest-operations" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500"><Spinner size={13} className="animate-spin" /> A consultar</span>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
        )}
      </div>

      {observations.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {observations.map((observation) => (
            <div key={observation.id} className="rounded-2xl bg-white px-3 py-2.5 dark:bg-stone-900">
              <p className="text-lg font-semibold tabular-nums text-ink">
                {typeof observation.value === "number" ? observation.value.toLocaleString("pt-PT") : String(observation.value)}
                <span className="ml-1 text-xs font-medium text-stone-500">{observation.unit}</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                {observation.geography.name} · {observation.referencePeriod.label ?? observation.referencePeriod.end}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-stone-500">
          {loading
            ? "A verificar a fonte oficial. Nenhum número provisório é mostrado durante a consulta."
            : geographyMissing
              ? "A fonte respondeu noutras geografias, mas esse sinal não é transferido para a zona que escolheste."
              : evidence?.note ?? "O manifesto de fontes existe, mas ainda não há observação publicável para este piloto."}
        </p>
      )}

      {evidence ? (
        <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-stone-500">
          <p>Consultado em {new Date(evidence.checkedAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}.</p>
          {evidence.gate.missing.slice(0, 2).map((missing) => <p key={missing}>Falta: {missing}</p>)}
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

export default function DescobrirNegocioStudio() {
  const [profile, setProfile] = useState<BusinessDiscoveryProfile>(DEFAULT_PROFILE);
  const [expanded, setExpanded] = useState<string>(OPPORTUNITY_TEMPLATES[0]?.id ?? "");
  const [evidence, setEvidence] = useState<readonly MarketPilotEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/market/pilots", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ pilots: MarketPilotEvidence[] }>;
      })
      .then((payload) => setEvidence(payload.pilots))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setEvidence([]);
      })
      .finally(() => setLoadingEvidence(false));
    return () => controller.abort();
  }, []);

  const ranked = useMemo(() => rankOpportunityTemplates(profile), [profile]);
  const evidenceByTemplate = useMemo(() => new Map(evidence.map((item) => [item.templateId, item])), [evidence]);

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
            options={[
              { value: "grande-lisboa", label: "Grande Lisboa" },
              { value: "peninsula-setubal", label: "Península de Setúbal" },
              { value: "outra-portugal", label: "Outra zona de Portugal" },
            ]}
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

                      <div className="space-y-4">
                        <div className="rounded-3xl border border-brand-light bg-brand-light/30 p-4 dark:border-brand/20 dark:bg-brand/10">
                          <p className="text-xs font-semibold text-brand-deep dark:text-brand-mint">Porque apareceu aqui</p>
                          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                            {fit.reasons.slice(0, 4).map((reason) => <li key={reason} className="flex gap-2"><Check size={12} className="mt-0.5 flex-none text-brand" />{reason}</li>)}
                          </ul>
                          {fit.tensions.length ? <p className="mt-3 text-[11px] leading-relaxed text-stone-500">Atenção: {fit.tensions[0]}</p> : null}
                        </div>
                        <EvidenceBlock
                          template={template}
                          evidence={pilotEvidence}
                          loading={loadingEvidence}
                          region={profile.region}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 border-t border-stone-100 pt-5 dark:border-stone-800">
                      <Link href={`/ferramentas/recibos-verdes?modo=preco&cenario=${template.pricingScenario}`} className="btn-shine inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card hover:shadow-lift">
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
