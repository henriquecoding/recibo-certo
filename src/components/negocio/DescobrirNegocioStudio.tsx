"use client";

// ═══════════════════════════════════════════════════════════════════════
//  MOTOR DE DESCOBERTA — três colunas, uma escada, nenhum score mágico
//  ---------------------------------------------------------------------
//  O ecrã anterior era uma lista vertical de acordeões precedida por um
//  formulário. Funcionava com cinco hipóteses; com vinte e quatro passou a
//  ser uma parede. E escondia a coisa mais importante que a ferramenta
//  tem para dizer — que a percentagem é afinidade e o estado é evidência,
//  e que as duas nunca se somam — no meio do texto.
//
//  A gramática nova tem três zonas, e cada uma responde a uma pergunta:
//
//   · «O teu contexto»        — o que sabemos de ti (e fica no browser);
//   · «Sugestões para começar» — o que isso ordena, com o empate à vista;
//   · «Hipótese em foco»      — porque encaixa, o que o mercado mostra,
//                                e qual é o próximo teste.
//
//  Por cima, a escada de quatro passos que a medição já conhecia e o ecrã
//  nunca mostrou: perfil → mercado → preço → teste real.
//
//  ── O QUE NÃO SE MEXE ──────────────────────────────────────────────
//   · O rótulo do estado vem de `gate.label`, uma só vez, do domínio.
//     Este ficheiro escolhe cores, nunca palavras.
//   · A hierarquia dos CTA pertence a `escolherRota()`.
//   · Nada do perfil sai do dispositivo.
//   · O conteúdo essencial existe no HTML servido, sem JavaScript.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  CAPITAL_LABEL,
  CAPITAL_SYMBOL,
  DELIVERY_CHIP,
  FIT_DIMENSIONS,
  OPPORTUNITY_CATALOGUE_REVIEWED_AT,
  OPPORTUNITY_SECTORS,
  RECURRENCE_CHIP,
  STRENGTH_CHIP,
  breakTiesWithEvidence,
  fitDimensionIsInert,
  rankOpportunityTemplates,
  strengthsUsedInCatalogue,
  templateHasLiveEvidence,
  type BusinessDiscoveryProfile,
  type BusinessStrength,
  type FitDimension,
  type MarketObservationSummary,
  type MarketPilotEvidence,
  type MarketRegion,
  type OpportunityIconName,
  type OpportunitySector,
  type OpportunityTemplate,
  type RankedOpportunity,
} from "@/lib/negocio/market/opportunities";
import type { MarketEvidenceGateResult, MarketOpportunityState } from "@/lib/negocio/market/tipos";
import { MARKET_REGIONS, marketRegionLabel, splitObservationsByRegion } from "@/lib/negocio/market/geografia";
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
import { sinaisDaHipotese } from "@/lib/negocio/market/routing-adapter";
import { escolherRota } from "@/lib/routing";
import { guardarHipotese, lerHipoteses } from "@/lib/store/hipoteses-mercado";
import { registarProvaGuardada, useMedicaoDescoberta } from "./medicao-descoberta";
import {
  ArrowRight,
  BookOpen,
  Building,
  Check,
  ChefHat,
  ChevronDown,
  Cloud,
  ExternalLink,
  FileSign,
  Gauge,
  Globe,
  Handshake,
  Heart,
  Home,
  Laptop,
  Lightbulb,
  Lock,
  MapPin,
  Move,
  PawPrint,
  PenLine,
  Plane,
  Plug,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Spinner,
  Star,
  Target,
  Trash,
  Wrench,
  Leaf,
} from "@/components/ui/Icons";

const DEFAULT_PROFILE: BusinessDiscoveryProfile = {
  structure: "por-decidir",
  delivery: "hibrido",
  capital: "ate-500",
  recurrence: "indiferente",
  strengths: ["operacoes"],
  region: "portugal",
};

/** Quantas hipóteses abrem à vista antes de «ver mais». */
const VISIVEIS_POR_OMISSAO = 6;

// ── Ícones do catálogo ────────────────────────────────────────────────
//  O nome vem dos dados; a resolução para componente vive aqui, que é
//  onde o React existe. Um `Record` completo em vez de um `any`: um nome
//  novo no catálogo sem entrada aqui falha na compilação, em vez de
//  desenhar um espaço vazio no cartão.
const ICONES: Readonly<Record<OpportunityIconName, ComponentType<{ size?: number; className?: string }>>> = {
  Home,
  Plane,
  Leaf,
  Laptop,
  FileSign,
  Search,
  ShoppingBag,
  Handshake,
  Heart,
  Star,
  PawPrint,
  BookOpen,
  Move,
  Smartphone,
  Building,
  Gauge,
  Wrench,
  Plug,
  Settings,
  PenLine,
  Cloud,
  Globe,
  MapPin,
  ChefHat,
};

// ── A cor de cada estado. A PALAVRA vem do gate. ──────────────────────
//  Havia aqui um segundo dicionário de rótulos, escrito à mão, que
//  discordava do domínio em sete dos oito estados — e era este que as
//  pessoas liam. `gate.label` era calculado em todas as avaliações e
//  nunca chegava a um ecrã.
const ESTILO_ESTADO: Readonly<Record<MarketOpportunityState, string>> = {
  template: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  signal_detected: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  candidate: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  evidence_qualified: "bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint",
  user_validated: "bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint",
  operating: "bg-brand text-white",
  stale: "bg-alert-bg text-alert-text",
  contradicted: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200",
};

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

/**
 * O que cada resposta do formulário faz, quando não faz nada à ordem.
 *
 * Uma dimensão inerte — que no catálogo atual não consegue separar
 * hipótese nenhuma — continua a ser perguntada, porque a resposta é usada
 * noutro sítio. O que não pode é ser perguntada com o mesmo peso visual
 * das outras sem nada a dizer para que serve. O texto só aparece quando
 * `fitDimensionIsInert` o justificar: acrescentar uma hipótese que
 * dependa mesmo da zona liga a dimensão sozinha e a nota desaparece.
 */
const NOTA_INERTE: Readonly<Record<FitDimension, string>> = {
  delivery: "Não altera a ordem no catálogo atual.",
  capital: "Não altera a ordem no catálogo atual.",
  recurrence: "Não altera a ordem no catálogo atual.",
  strengths: "Não altera a ordem no catálogo atual.",
  structure:
    "Não altera a ordem das hipóteses. Serve para te levar ao percurso fiscal certo depois de escolheres.",
  region:
    "Não altera a compatibilidade. Decide que leituras oficiais são da tua zona e quais são contexto nacional.",
};

type EstadoDoPack = "a-consultar" | "ok" | "degradado" | "erro";

// ═══════════════════════════════════════════════════════════════════════
//  PEÇAS PEQUENAS
// ═══════════════════════════════════════════════════════════════════════

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
      {children}
    </span>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  nota,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  nota?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-[38px] flex-1 rounded-xl border px-2.5 text-[11px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              value === option.value
                ? "border-brand bg-brand text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-brand/60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {nota ? <p className="mt-1.5 text-[11px] leading-snug text-stone-500">{nota}</p> : null}
    </fieldset>
  );
}

/**
 * A escada de decisão, finalmente à vista.
 *
 * Existia só na medição (`medicao-descoberta.ts`), onde ninguém a lê: a
 * pessoa via cinco cartões e nada que dissesse que abrir um dossier é o
 * primeiro de quatro passos, nem que o último é alguém pagar.
 */
function Etapas({ atual }: { atual: number }) {
  const passos = [
    { titulo: "Perfil", nota: "O teu contexto" },
    { titulo: "Mercado", nota: "Sinais e procura" },
    { titulo: "Preço", nota: "Quanto faz sentido" },
    { titulo: "Teste real", nota: "Validar na prática" },
  ];
  return (
    <ol className="flex items-stretch gap-1.5 sm:gap-2" aria-label="Passos da descoberta">
      {passos.map((passo, indice) => {
        const numero = indice + 1;
        const feito = numero < atual;
        const ativo = numero === atual;
        return (
          <li key={passo.titulo} className="min-w-0 flex-1">
            <div
              aria-current={ativo ? "step" : undefined}
              className={`flex h-full min-w-0 flex-col gap-1 rounded-2xl border px-2.5 py-2.5 sm:px-3 ${
                ativo
                  ? "border-brand bg-brand-light/60 dark:border-brand/40 dark:bg-brand/10"
                  : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                  feito || ativo
                    ? "bg-brand text-white"
                    : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                }`}
              >
                {feito ? <Check size={12} /> : numero}
              </span>
              {/* A 360 px cada passo tem ~58 px úteis. `truncate` dava
                  «Merca…» e «Teste …» — um rótulo cortado não é um rótulo.
                  Deixa-se quebrar em duas linhas, que cabem. */}
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold leading-tight text-ink">{passo.titulo}</span>
                <span className="mt-0.5 hidden text-[11px] leading-tight text-stone-500 sm:block">
                  {passo.nota}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Selo({ icone: Icone, children }: { icone: ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
      <Icone size={13} className="flex-none text-brand" />
      {children}
    </span>
  );
}

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

/** O rótulo e a cor do estado — a palavra sempre do gate. */
function distintivo(
  gate: MarketEvidenceGateResult,
  semSinalLocal: boolean,
): { label: string; className: string } {
  if (semSinalLocal && gate.state !== "user_validated" && gate.state !== "operating") {
    return {
      label: "Sem sinal para esta zona",
      className: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    };
  }
  return { label: gate.label, className: ESTILO_ESTADO[gate.state] };
}

function EvidenceBlock({
  template,
  evidence,
  gate,
  loading,
  montado,
  region,
  packState,
  onRepetir,
}: {
  template: OpportunityTemplate;
  evidence?: MarketPilotEvidence;
  /** O gate recalculado no browser, com zona, preço e provas locais. */
  gate: MarketEvidenceGateResult;
  loading: boolean;
  /**
   * O browser já assumiu o comando?
   *
   * No HTML servido não há consulta nenhuma a decorrer, por isso dizer «a
   * consultar» seria falso — e ficaria assim para sempre para quem navega
   * sem JavaScript. Antes da montagem diz-se o que é verdade: os sinais
   * são consultados no dispositivo de quem lê.
   */
  montado: boolean;
  region: MarketRegion;
  packState: EstadoDoPack;
  onRepetir: () => void;
}) {
  // A repartição por zona é uma regra de domínio, testada, e não um filtro
  // de igualdade dentro do componente. Foi por ser um filtro que a leitura
  // NACIONAL — publicável e válida para o país inteiro — desaparecia para
  // quem não escolhesse uma das duas zonas mapeadas.
  const { local, nacional } = splitObservationsByRegion(evidence?.observations ?? [], region);
  const aConsultar = montado && loading && templateHasLiveEvidence(template);
  const semSinalLocal = local.length === 0 && nacional.length === 0 && (evidence?.observations.length ?? 0) > 0;
  const badge = distintivo(gate, semSinalLocal);
  const grupos = agruparPorSerie(local, nacional);
  const operacoes = new Set([...local, ...nacional].map((observation) => observation.independenceKey));
  const transporteFalhou = montado && !loading && packState !== "ok";

  return (
    <div className="rounded-3xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Evidência de mercado</p>
        {aConsultar ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
            <Spinner size={13} className="animate-spin" /> A consultar
          </span>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* ── Falha de transporte ≠ ausência de evidência ────────────────
          O `catch` do estúdio fazia `setEvidence([])` e o ecrã passava a
          dizer «não há observação publicável para este piloto» — uma frase
          falsa, e falsa na direção que desacredita as fontes. A rota já
          distinguia as duas coisas e devolvia `degraded`; o cliente é que
          deitava essa distinção fora. */}
      {transporteFalhou ? (
        <div className="mt-3 rounded-2xl border border-alert-border bg-alert-bg p-3">
          <p className="text-[11px] leading-relaxed text-alert-text">
            {packState === "erro"
              ? "Não foi possível consultar os sinais oficiais agora. Isto não é o mesmo que não haver procura — é a nossa consulta que não chegou lá."
              : "As fontes responderam em parte. O que falta em baixo pode ser nosso, não do mercado."}
          </p>
          <button
            type="button"
            onClick={onRepetir}
            className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-alert-border px-3 text-[11px] font-semibold text-alert-text"
          >
            <RotateCcw size={12} /> Tentar de novo
          </button>
        </div>
      ) : null}

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
                    <Leitura key={observation.id} observation={observation} contexto={grupo.local.length > 0} />
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
          {!montado && templateHasLiveEvidence(template)
            ? `Os sinais oficiais desta hipótese são consultados no teu dispositivo, não estão neste HTML. Fontes: ${template.evidencePlan
                .filter((entry) => entry.status === "live")
                .map((entry) => entry.source)
                .join("; ")}.`
            : aConsultar
              ? "A verificar a fonte oficial. Nenhum valor provisório é mostrado durante a consulta."
              : semSinalLocal
                ? "A fonte respondeu para outras zonas. Esse sinal não se transfere para a que escolheste, e não vamos fingir que sim."
                : transporteFalhou
                  ? "Sem resposta das fontes nesta consulta."
                  : (evidence?.note ?? template.evidenceNote)}
        </p>
      )}

      <div className="mt-3 space-y-1.5 border-t border-stone-200/70 pt-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800">
        {gate.reasons.slice(0, 1).map((reason) => (
          <p key={reason} className="font-medium text-stone-600 dark:text-stone-300">
            {reason}
          </p>
        ))}
        {gate.missing.slice(0, 3).map((missing) => (
          <p key={missing}>Falta: {missing}</p>
        ))}
      </div>

      {evidence ? (
        <div className="mt-3 space-y-1.5 border-t border-stone-200/70 pt-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800">
          <p>
            Consultado em{" "}
            {new Date(evidence.checkedAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
          {evidence.sourceHealth.map((health) => (
            <p key={health.sourceId}>
              Fonte {health.sourceId.toUpperCase()}: {HEALTH_LABEL[health.state] ?? health.state}
              {health.latestReferencePeriodEnd ? ` · dados até ${health.latestReferencePeriodEnd}` : ""}
              {health.message ? ` — ${health.message}` : ""}
            </p>
          ))}
          {evidence.datasetUrl ? (
            <a
              href={evidence.datasetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-dark hover:underline dark:text-brand-mint"
            >
              Ver dataset e licença <ExternalLink size={11} />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A rota comercial — decidida pelo motor, nunca por este ecrã.
 *
 * `sem_parceiro` não é uma rota a desenhar: é a ausência de uma. Uma
 * hipótese que ainda é `template`, ou que foi contrariada, cai aí sozinha
 * pela primeira regra de `escolherRota` e não vê nada. É a guarda contra
 * monetizar uma ideia que a própria ferramenta acabou de não sustentar.
 */
function ProximoPassoComercial({
  gate,
  profile,
  hypothesis,
}: {
  gate: MarketEvidenceGateResult;
  profile: BusinessDiscoveryProfile;
  hypothesis?: MarketHypothesis;
}) {
  const rota = useMemo(
    () => escolherRota(sinaisDaHipotese(gate, profile, hypothesis)),
    [gate, profile, hypothesis],
  );
  if (rota.rota === "sem_parceiro") return null;

  return (
    <p className="mt-3 text-xs leading-relaxed text-stone-500">
      <span className="font-semibold text-stone-700 dark:text-stone-200">A seguir: </span>
      {rota.mensagem} <span className="text-stone-400">({rota.dados})</span>
    </p>
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
  region,
  onChange,
}: {
  template: OpportunityTemplate;
  hypothesis?: MarketHypothesis;
  asOf: string;
  region: MarketRegion;
  onChange: (proximo: MarketHypothesis) => void;
}) {
  // O dia começa vazio e só é preenchido quando o instante de referência
  // existir — no servidor ainda não existe, e um `defaultValue` diferente
  // entre servidor e cliente quebrava a hidratação do campo.
  const [dia, setDia] = useState("");
  useEffect(() => {
    setDia((atual) => atual || asOf.slice(0, 10));
  }, [asOf]);
  const [tipo, setTipo] = useState<MarketProofKind>("interview");
  const [recebido, setRecebido] = useState(false);
  const [margem, setMargem] = useState(false);

  const resumo = hypothesis ? summarizeProofs(hypothesis, asOf) : null;
  const paga = tipo === "paid_pilot" || tipo === "sale" || tipo === "pre_sale";

  const registar = () => {
    const base = hypothesis ?? newHypothesis(template.id, region);
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
            max={asOf ? asOf.slice(0, 10) : undefined}
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
            <label
              key={item.label}
              className="flex items-start gap-2 text-[11px] leading-snug text-stone-600 dark:text-stone-300"
            >
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
            <li
              key={proof.id}
              className="flex items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-300"
            >
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
          {resumo.currentMarketProofs}{" "}
          {resumo.currentMarketProofs === 1 ? "prova de mercado" : "provas de mercado"} válidas
          {resumo.expired > 0 ? ` · ${resumo.expired} fora de validade` : ""}.
        </p>
      ) : null}

      <label className="mt-3 flex items-start gap-2 border-t border-stone-100 pt-3 text-[11px] leading-snug text-stone-600 dark:border-stone-800 dark:text-stone-300">
        <input
          type="checkbox"
          checked={hypothesis?.requirementsReviewed ?? false}
          onChange={(event) =>
            onChange({
              ...(hypothesis ?? newHypothesis(template.id, region)),
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

// ═══════════════════════════════════════════════════════════════════════
//  O ESTÚDIO
// ═══════════════════════════════════════════════════════════════════════

export default function DescobrirNegocioStudio() {
  const [profile, setProfile] = useState<BusinessDiscoveryProfile>(DEFAULT_PROFILE);
  // `null` significa «segue o topo do ranking»; a string vazia significa
  // «a pessoa fechou tudo, e é para ficar fechado». Sem esta distinção,
  // fechar o cartão reabria o primeiro no render seguinte — e o cartão que
  // abria sozinho era `OPPORTUNITY_TEMPLATES[0]`, a ordem do FICHEIRO, que
  // no perfil por omissão estava classificada em terceiro. A página abria
  // o número 3 e numerava-o «3».
  const [aberto, setAberto] = useState<string | null>(null);
  const [verTudo, setVerTudo] = useState(false);
  const [setor, setSetor] = useState<OpportunitySector | "todos">("todos");
  const [evidence, setEvidence] = useState<readonly MarketPilotEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [packState, setPackState] = useState<EstadoDoPack>("a-consultar");
  const [tentativa, setTentativa] = useState(0);
  const [hipoteses, setHipoteses] = useState<readonly MarketHypothesis[]>([]);
  // ── O instante de referência ────────────────────────────────────
  //  Fixo por sessão: recalcular `Date.now()` a cada render fazia a
  //  frescura e a validade das provas mudarem por baixo do ecrã.
  //
  //  Começa VAZIO de propósito. O servidor e o cliente não podem
  //  discordar sobre que horas são, e uma string vazia é a única resposta
  //  em que concordam.
  const [asOf, setAsOf] = useState("");
  useEffect(() => setAsOf(new Date().toISOString()), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingEvidence(true);
    fetch("/api/market/pilots", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ pilots: MarketPilotEvidence[]; degraded?: string }>;
      })
      .then((payload) => {
        setEvidence(Array.isArray(payload.pilots) ? payload.pilots : []);
        // A rota já distingue «montei o pack e está vazio» de «não consegui
        // montar o pack». Deitar essa distinção fora aqui era desperdiçar
        // trabalho que o servidor já tinha feito — e transformar dois
        // segundos de rede numa afirmação sobre o mercado.
        setPackState(payload.degraded ? "degradado" : "ok");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEvidence([]);
        setPackState("erro");
      })
      .finally(() => setLoadingEvidence(false));
    return () => controller.abort();
  }, [tentativa]);

  // As hipóteses são lidas depois da montagem, nunca durante o render: o
  // cofre depende do browser e o componente tem de abrir na mesma antes de
  // saber se há alguma coisa guardada.
  useEffect(() => setHipoteses(lerHipoteses()), []);

  const ranked = useMemo(() => rankOpportunityTemplates(profile), [profile]);
  const evidenceByTemplate = useMemo(
    () => new Map(evidence.map((item) => [item.templateId, item])),
    [evidence],
  );
  const hipotesePorTemplate = useMemo(
    () => new Map(hipoteses.map((item) => [item.templateId, item])),
    [hipoteses],
  );

  // O gate de cada hipótese, recalculado com zona, preço e provas locais.
  // Vive aqui — e não dentro do cartão aberto — porque a medição precisa
  // de ver TODAS as hipóteses, não só a que está expandida.
  const gates = useMemo(
    () =>
      new Map(
        ranked.map(({ template }) => [
          template.id,
          evaluateLocalMarketEvidence({
            template,
            evidence: evidenceByTemplate.get(template.id),
            hypothesis: hipotesePorTemplate.get(template.id),
            region: profile.region,
            asOf,
          }),
        ]),
      ),
    [ranked, evidenceByTemplate, hipotesePorTemplate, profile.region, asOf],
  );

  // A ordem é a compatibilidade. A evidência entra só a desfazer empates —
  // ver `breakTiesWithEvidence`: pô-la em primeiro fixaria no topo, para
  // toda a gente, as cinco hipóteses que hoje têm séries ligadas.
  const ordenadas = useMemo(
    () => breakTiesWithEvidence(ranked, (id) => gates.get(id)?.state),
    [ranked, gates],
  );

  const doSetor = useMemo(
    () => (setor === "todos" ? ordenadas : ordenadas.filter((item) => item.template.sector === setor)),
    [ordenadas, setor],
  );

  const dossierAberto = aberto ?? doSetor[0]?.template.id ?? "";
  const emFoco: RankedOpportunity | undefined =
    doSetor.find((item) => item.template.id === (aberto || doSetor[0]?.template.id)) ?? doSetor[0];

  const visiveis = verTudo
    ? doSetor
    : doSetor.filter((item, indice) => indice < VISIVEIS_POR_OMISSAO || item.template.id === dossierAberto);

  const temProva = hipoteses.some((item) => item.proofs.length > 0);
  const temPreco = hipoteses.some((item) => item.pricing !== undefined);
  // O passo é o que a pessoa FEZ, não o que está no ecrã. O primeiro
  // dossier abre sozinho — marcá-lo como «mercado visto» à entrada era dar
  // por concluído um passo que ninguém deu.
  const passoAtual = temProva ? 4 : temPreco ? 3 : aberto ? 2 : 1;

  useMedicaoDescoberta({
    ativo: !loadingEvidence,
    dossierAberto: dossierAberto !== "",
    estados: useMemo(() => [...gates.values()].map((gate) => gate.state), [gates]),
    hipotesesComProva: hipoteses.filter((item) => item.proofs.length > 0).length,
    hipotesesComProvaPaga: hipoteses.filter((item) =>
      item.proofs.some((proof) => proof.kind !== "interview"),
    ).length,
    temPrecoConcluido: temPreco,
    temRequisitosRevistos: hipoteses.some((item) => item.requirementsReviewed),
  });

  const guardar = (proxima: MarketHypothesis) => {
    setHipoteses(guardarHipotese({ ...proxima, region: profile.region }));
    registarProvaGuardada();
  };

  /**
   * Fixa a hipótese ANTES de sair da página.
   *
   * Quem escolhia «Algarve» e clicava em formar o preço sem ter registado
   * nada criava a hipótese, do outro lado, com `region: "portugal"` fixo —
   * e era essa a zona que sobrevivia ao recarregamento.
   */
  const fixarHipotese = (templateId: string) => {
    if (hipotesePorTemplate.has(templateId)) return;
    setHipoteses(guardarHipotese(newHypothesis(templateId, profile.region)));
  };

  const alternarForca = (strength: BusinessStrength) =>
    setProfile((current) => ({
      ...current,
      strengths: current.strengths.includes(strength)
        ? current.strengths.filter((item) => item !== strength)
        : [...current.strengths, strength],
    }));

  // A interface só oferece competências que alguma hipótese reconhece.
  // «Resolver problemas técnicos» era um botão morto: não existia em
  // template nenhum e selecioná-lo não mudava rigorosamente nada.
  const forcasOferecidas = useMemo(() => {
    const usadas = strengthsUsedInCatalogue();
    return (Object.keys(STRENGTH_CHIP) as BusinessStrength[]).filter((item) => usadas.has(item));
  }, []);

  const notaDe = (dimension: FitDimension) =>
    fitDimensionIsInert(dimension) ? NOTA_INERTE[dimension] : undefined;

  return (
    <div className="space-y-5">
      {/* ══ Cabeçalho: a escada e o que a ferramenta promete ══════════ */}
      <section className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
        <Etapas atual={passoAtual} />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          <Selo icone={ShieldCheck}>Dados oficiais, com fonte e data</Selo>
          <Selo icone={Lock}>Perfil privado no dispositivo</Selo>
          <Selo icone={Target}>Sem conta</Selo>
          <Selo icone={BookOpen}>
            Catálogo revisto em{" "}
            {new Date(`${OPPORTUNITY_CATALOGUE_REVIEWED_AT}T00:00:00Z`).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </Selo>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* ══ COLUNA 1 — o teu contexto ═════════════════════════════ */}
        <section
          aria-labelledby="contexto-descoberta"
          className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start"
        >
          <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
            <h2
              id="contexto-descoberta"
              className="font-display flex items-center gap-2 text-lg font-semibold text-ink"
            >
              <Lock size={15} className="flex-none text-brand" />O teu contexto
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              Estas respostas calculam compatibilidade pessoal, não procura de mercado. Nada do que
              escolhes sai do teu browser.
            </p>

            <div className="mt-4 space-y-4">
              <ChoiceGroup
                label="Estrutura"
                value={profile.structure}
                nota={notaDe("structure")}
                options={[
                  { value: "recibos-verdes", label: "Recibos verdes" },
                  { value: "empresa", label: "Empresa" },
                  { value: "por-decidir", label: "A decidir" },
                ]}
                onChange={(structure) => setProfile((current) => ({ ...current, structure }))}
              />
              <ChoiceGroup
                label="Entrega"
                value={profile.delivery}
                nota={notaDe("delivery")}
                options={[
                  { value: "local", label: "Presencial" },
                  { value: "hibrido", label: "Híbrido" },
                  { value: "remoto", label: "Remoto" },
                ]}
                onChange={(delivery) => setProfile((current) => ({ ...current, delivery }))}
              />

              <div>
                <label
                  htmlFor="zona-descoberta"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500"
                >
                  Zona
                </label>
                <select
                  id="zona-descoberta"
                  value={profile.region}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, region: event.target.value as MarketRegion }))
                  }
                  className="h-10 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  {MARKET_REGIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                  {notaDe("region") ??
                    "Decide que leituras oficiais são da tua zona e quais entram como contexto nacional."}
                </p>
              </div>

              <ChoiceGroup
                label="Capital inicial"
                value={profile.capital}
                nota={notaDe("capital")}
                options={[
                  { value: "ate-500", label: "Até 500 €" },
                  { value: "500-3000", label: "500–3 000 €" },
                  { value: "mais-3000", label: "3 000 €+" },
                ]}
                onChange={(capital) => setProfile((current) => ({ ...current, capital }))}
              />
              <ChoiceGroup
                label="Recorrência"
                value={profile.recurrence}
                nota={notaDe("recurrence")}
                options={[
                  { value: "pontual", label: "Pontual" },
                  { value: "recorrente", label: "Recorrente" },
                  { value: "indiferente", label: "Tanto faz" },
                ]}
                onChange={(recurrence) => setProfile((current) => ({ ...current, recurrence }))}
              />

              <fieldset>
                <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Pontos fortes
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {forcasOferecidas.map((item) => {
                    const ativo = profile.strengths.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => alternarForca(item)}
                        className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          ativo
                            ? "border-brand bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                            : "border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300"
                        }`}
                      >
                        {ativo ? <Check size={11} className="flex-none" /> : <Plus size={11} className="flex-none" />}
                        {STRENGTH_CHIP[item]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-stone-500">
                  {notaDe("strengths") ??
                    "Cada hipótese diz de que competências precisa, por ordem. A primeira pesa mais."}
                </p>
              </fieldset>

              <button
                type="button"
                onClick={() => {
                  setProfile(DEFAULT_PROFILE);
                  setAberto(null);
                  setSetor("todos");
                }}
                className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 text-[11px] font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
              >
                <RotateCcw size={12} /> Repor contexto
              </button>
            </div>
          </div>
        </section>

        {/* ══ COLUNA 2 — sugestões para começar ═════════════════════ */}
        <section aria-labelledby="resultado-descoberta" className="lg:col-span-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="eyebrow text-brand">Sugestões para começar</p>
              <h2 id="resultado-descoberta" className="font-display mt-0.5 text-xl font-semibold text-ink">
                Melhor encaixe primeiro
              </h2>
            </div>
            <div>
              <label htmlFor="setor-descoberta" className="sr-only">
                Filtrar por área
              </label>
              <select
                id="setor-descoberta"
                value={setor}
                onChange={(event) => {
                  setSetor(event.target.value as OpportunitySector | "todos");
                  setAberto(null);
                  setVerTudo(false);
                }}
                className="h-10 rounded-xl border border-stone-200 bg-white px-2.5 text-[11px] font-semibold text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              >
                <option value="todos">Todas as áreas ({ordenadas.length})</option>
                {OPPORTUNITY_SECTORS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({ordenadas.filter((linha) => linha.template.sector === item.id).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mb-3 text-[11px] leading-relaxed text-stone-500">
            A percentagem é afinidade contigo. O estado colorido é a evidência externa. Nunca são somados
            num “score mágico” — quando duas hipóteses empatam, é isso que o cartão diz.
          </p>

          <div className="space-y-2.5">
            {visiveis.map(({ template, fit, rank, tiedWith }) => {
              const open = dossierAberto === template.id;
              const pilotEvidence = evidenceByTemplate.get(template.id);
              const hipotese = hipotesePorTemplate.get(template.id);
              const gate = gates.get(template.id)!;
              const Icone = ICONES[template.icon];
              const { local, nacional } = splitObservationsByRegion(
                pilotEvidence?.observations ?? [],
                profile.region,
              );
              const badge = distintivo(
                gate,
                local.length === 0 && nacional.length === 0 && (pilotEvidence?.observations.length ?? 0) > 0,
              );

              return (
                <article
                  key={template.id}
                  className={`overflow-hidden rounded-4xl border bg-white shadow-card transition-colors dark:bg-stone-900 ${
                    open ? "border-brand/60" : "border-stone-100 dark:border-stone-800"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => {
                      setAberto(open ? "" : template.id);
                    }}
                    className="flex w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:p-5"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint">
                      <Icone size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong className="font-display text-base leading-snug text-ink">{template.title}</strong>
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-stone-500">
                        {template.promise}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                        <Chip>{template.delivery.map((item) => DELIVERY_CHIP[item]).join(" · ")}</Chip>
                        <Chip>{RECURRENCE_CHIP[template.recurrence]}</Chip>
                        <Chip>
                          <span aria-hidden="true">{CAPITAL_SYMBOL[template.capital]}</span>
                          <span className="sr-only">Capital {CAPITAL_LABEL[template.capital]}</span>
                        </Chip>
                      </span>
                      <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                          {rank}.ª · Compatibilidade {fit.score}%
                        </span>
                        {tiedWith > 1 ? (
                          <span className="text-[11px] text-stone-500">
                            empatada com mais {tiedWith - 1}{" "}
                            {tiedWith === 2 ? "hipótese" : "hipóteses"} — entre elas, decide a evidência
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <ChevronDown
                      size={17}
                      className={`mt-1 flex-none text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open ? (
                    <div className="border-t border-stone-100 px-4 pb-5 pt-4 dark:border-stone-800 sm:px-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Cliente</p>
                          <p className="mt-1 text-sm leading-relaxed text-stone-500">{template.customer}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                            Como ganha dinheiro
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-stone-500">{template.revenueModel}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                            Problema que resolve
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-stone-500">{template.problem}</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                          Primeiro teste comercial
                        </p>
                        <ol className="mt-2 space-y-2">
                          {template.firstCustomerPath.map((step, index) => (
                            <li key={step} className="flex gap-2 text-sm leading-relaxed text-stone-500">
                              <span className="font-semibold text-brand">{index + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Teste que pode matar a ideia
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-amber-900/75 dark:text-amber-100/70">
                          {template.falsificationTest}
                        </p>
                      </div>

                      <div className="mt-4 space-y-4">
                        <EvidenceBlock
                          template={template}
                          evidence={pilotEvidence}
                          gate={gate}
                          loading={loadingEvidence}
                          montado={asOf !== ""}
                          region={profile.region}
                          packState={packState}
                          onRepetir={() => setTentativa((valor) => valor + 1)}
                        />
                        <ProvaLocal
                          template={template}
                          hypothesis={hipotese}
                          asOf={asOf}
                          region={profile.region}
                          onChange={guardar}
                        />
                      </div>

                      {/* ── Uma ação principal, uma alternativa, e a rota
                          comercial que o motor decidir ────────────────────
                          A hierarquia não pertence a este ecrã: o passo
                          seguinte da jornada é sempre formar o preço — sem
                          ele o gate nunca sai de «candidata» — e o que for
                          comercial vem de `escolherRota()`. */}
                      <div className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/ferramentas/recibos-verdes?modo=preco&cenario=${template.pricingScenario}&h=${encodeURIComponent(template.id)}`}
                            onClick={() => fixarHipotese(template.id)}
                            className="btn-shine inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card hover:shadow-lift"
                          >
                            Formar o preço desta hipótese <ArrowRight size={14} />
                          </Link>
                          <Link
                            href={`/dashboard/negocio?o=${encodeURIComponent(template.id)}`}
                            onClick={() => fixarHipotese(template.id)}
                            className="inline-flex min-h-[44px] items-center text-sm font-medium text-stone-500 underline-offset-4 hover:text-brand-dark hover:underline dark:text-stone-400 dark:hover:text-brand-mint"
                          >
                            ou construir no estúdio de empresa
                          </Link>
                        </div>
                        <ProximoPassoComercial gate={gate} profile={profile} hypothesis={hipotese} />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {doSetor.length === 0 ? (
            <p className="rounded-4xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500 dark:border-stone-700">
              Não há hipóteses curadas nesta área. Escolhe outra — ou volta a «Todas as áreas».
            </p>
          ) : null}

          {!verTudo && doSetor.length > visiveis.length ? (
            <button
              type="button"
              onClick={() => setVerTudo(true)}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-4xl border border-stone-200 text-sm font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300"
            >
              Ver mais {doSetor.length - visiveis.length} hipóteses <ChevronDown size={14} />
            </button>
          ) : null}
        </section>

        {/* ══ COLUNA 3 — hipótese em foco ═══════════════════════════ */}
        <aside
          aria-labelledby="foco-descoberta"
          className="hidden lg:col-span-4 lg:sticky lg:top-24 lg:block lg:self-start"
        >
          {emFoco ? (
            <FocoHipotese
              linha={emFoco}
              gate={gates.get(emFoco.template.id)!}
              evidence={evidenceByTemplate.get(emFoco.template.id)}
              hypothesis={hipotesePorTemplate.get(emFoco.template.id)}
              region={profile.region}
              montado={asOf !== ""}
              aberto={dossierAberto === emFoco.template.id}
              onAbrir={() => setAberto(emFoco.template.id)}
              onGuardar={() => fixarHipotese(emFoco.template.id)}
            />
          ) : null}
        </aside>
      </div>

      <aside className="flex gap-3 rounded-4xl border border-stone-100 bg-stone-50 p-5 text-sm leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300">
        <Lightbulb size={18} className="mt-0.5 flex-none text-brand" />
        <p>
          <strong className="text-stone-800 dark:text-stone-100">
            Uma ideia só vira oportunidade depois do teu mercado.
          </strong>{" "}
          Fontes oficiais detetam contexto; preço sustentável, requisitos, entrevistas e um piloto pago
          confirmam se há negócio na tua geografia e para a tua execução.
        </p>
      </aside>
    </div>
  );
}

/**
 * A coluna da direita: porque encaixa, o que o mercado mostra, e qual é o
 * próximo teste.
 *
 * Separar «porque encaixa» de «o que o mercado mostra» não é arrumação
 * visual — é a doutrina do produto desenhada. A primeira secção vem só do
 * que a pessoa respondeu; a segunda só do que uma fonte oficial publicou.
 * Ficam em caixas diferentes porque são coisas diferentes.
 */
function FocoHipotese({
  linha,
  gate,
  evidence,
  hypothesis,
  region,
  montado,
  aberto,
  onAbrir,
  onGuardar,
}: {
  linha: RankedOpportunity;
  gate: MarketEvidenceGateResult;
  evidence?: MarketPilotEvidence;
  hypothesis?: MarketHypothesis;
  region: MarketRegion;
  montado: boolean;
  aberto: boolean;
  onAbrir: () => void;
  onGuardar: () => void;
}) {
  const { template, fit } = linha;
  const Icone = ICONES[template.icon];
  const { local, nacional } = splitObservationsByRegion(evidence?.observations ?? [], region);
  const badge = distintivo(
    gate,
    local.length === 0 && nacional.length === 0 && (evidence?.observations.length ?? 0) > 0,
  );
  const leituras = [...local, ...nacional].slice(0, 3);

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <h2 id="foco-descoberta" className="eyebrow text-brand">
        Hipótese em foco
      </h2>

      <div className="mt-3 flex items-start gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-brand-light text-brand-deep dark:bg-brand/15 dark:text-brand-mint">
          <Icone size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight text-ink">{template.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Chip>{template.delivery.map((item) => DELIVERY_CHIP[item]).join(" · ")}</Chip>
            <Chip>{RECURRENCE_CHIP[template.recurrence]}</Chip>
            <Chip>
              <span aria-hidden="true">{CAPITAL_SYMBOL[template.capital]}</span>
              <span className="sr-only">Capital {CAPITAL_LABEL[template.capital]}</span>
            </Chip>
          </div>
        </div>
      </div>

      {/* ── Porque encaixa: só o que a pessoa respondeu ─────────────── */}
      <section className="mt-4">
        <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-200">
          Porque encaixa contigo — {fit.score}%
        </h3>
        <ul className="mt-2 space-y-1.5">
          {fit.breakdown.map((item) => (
            <li key={item.dimension} className="flex items-start gap-2 text-[12px] leading-snug">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full ${
                  item.earned === item.max
                    ? "bg-brand-light text-brand-deep dark:bg-brand/20 dark:text-brand-mint"
                    : item.earned > 0
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                      : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                }`}
              >
                {item.earned === item.max ? <Check size={9} /> : null}
              </span>
              <span className="min-w-0 text-stone-600 dark:text-stone-300">
                {item.note}{" "}
                <span className="tabular-nums text-stone-400">
                  {item.earned}/{item.max}
                </span>
                {item.inert ? <span className="text-stone-400"> · não distingue</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── O que o mercado mostra: só o que uma fonte publicou ─────── */}
      <section className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-200">O que o mercado mostra</h3>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {leituras.length ? (
          <ul className="mt-2 space-y-1.5">
            {leituras.map((observation) => (
              <li key={observation.id} className="flex items-baseline gap-2 text-[12px] leading-snug">
                <span className="font-semibold tabular-nums text-ink">
                  {typeof observation.value === "number"
                    ? observation.value.toLocaleString("pt-PT")
                    : String(observation.value)}
                  <span className="ml-0.5 text-[10px] font-medium text-stone-500">{observation.unit}</span>
                </span>
                <span className="min-w-0 text-stone-600 dark:text-stone-300">
                  {observation.seriesLabel}
                  <span className="text-stone-400">
                    {" "}
                    · {observation.geography.level === "country" ? "Portugal" : marketRegionLabel(region)} ·{" "}
                    {observation.referencePeriod.label ?? observation.referencePeriod.end}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
            {montado ? template.evidenceNote : "Os sinais oficiais são consultados no teu dispositivo."}
          </p>
        )}
        {gate.missing.length ? (
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">Falta: {gate.missing[0]}</p>
        ) : null}
      </section>

      {/* ── Próximo teste ──────────────────────────────────────────── */}
      <section className="mt-4 border-t border-stone-100 pt-4 dark:border-stone-800">
        <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-200">Próximo teste</h3>
        <ol className="mt-2 space-y-1.5">
          {template.firstCustomerPath.slice(0, 2).map((passo, indice) => (
            <li key={passo} className="flex gap-2 text-[12px] leading-snug text-stone-600 dark:text-stone-300">
              <span className="font-semibold text-brand">{indice + 1}.</span>
              {passo}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 space-y-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        {aberto ? null : (
          <button
            type="button"
            onClick={onAbrir}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-card hover:shadow-lift"
          >
            Abrir dossier completo <ArrowRight size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onGuardar}
          disabled={Boolean(hypothesis)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-stone-200 text-sm font-semibold text-stone-600 hover:border-brand/60 hover:text-brand-dark disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
        >
          {hypothesis ? (
            <>
              <Check size={14} /> Guardada neste dispositivo
            </>
          ) : (
            <>
              <Plus size={14} /> Guardar hipótese
            </>
          )}
        </button>
      </div>
    </div>
  );
}
