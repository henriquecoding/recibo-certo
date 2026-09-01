import {
  EMPLOYER_DOMAIN_LABELS,
  type EmployerDomain,
  type ResultProvenance,
} from "../../../ReciboCerto-Fiscal-Engine/src";
import { Check, ShieldCheck, Warning } from "@/components/ui/Icons";

/**
 * Estado dos dados por domínio.
 *
 * O relatório é direto sobre o que estava errado (MOT-P0-002, MOT-P0-019): a
 * interface escrevia «política verificada» e a homepage «taxas de 2026
 * verificadas» enquanto o manifesto do próprio motor se declarava rascunho.
 * Um selo global escondia áreas incompletas.
 *
 * Aqui não há selo. Cada frase deriva do release que produziu o resultado, e
 * a cobertura é dita domínio a domínio — incluindo os que não são cobertos.
 */

// `chip` é um token explícito por estado, e não `border-current/20`: a cor da
// borda de uma pastilha tem uma régua diferente da do texto que a habita, e
// este projeto não deixa uma cor nascer de uma opacidade sobre `currentColor`.
const TOM: Record<
  ResultProvenance["releaseStatus"],
  { rotulo: string; frase: string; classe: string; chip: string }
> = {
  approved: {
    rotulo: "Release aprovado",
    frase: "Calculado com um release aprovado, para os factos que indicaste.",
    classe: "border-brand/30 bg-brand/5 text-brand-dark dark:text-brand-mint",
    chip: "border-brand/25 bg-white/70 dark:bg-stone-900/50",
  },
  reviewed: {
    rotulo: "Release em revisão",
    frase:
      "Revisão técnica feita e fontes datadas; falta a revisão profissional independente. Serve para preparar a decisão, não para a fechar.",
    classe: "border-alert-border bg-alert-bg text-alert-text",
    chip: "border-alert-border bg-white/70 dark:bg-stone-900/50",
  },
  draft: {
    rotulo: "Release em rascunho",
    frase: "Rascunho: não deve sustentar nenhuma decisão.",
    classe: "border-alert-border bg-alert-bg text-alert-text",
    chip: "border-alert-border bg-white/70 dark:bg-stone-900/50",
  },
  retired: {
    rotulo: "Release retirado",
    frase: "Este release foi substituído e não deve ser usado.",
    classe: "border-alert-border bg-alert-bg text-alert-text",
    chip: "border-alert-border bg-white/70 dark:bg-stone-900/50",
  },
};

const COBERTURA_ROTULO: Record<string, string> = {
  approved: "aprovado",
  reviewed: "em revisão",
  draft: "em rascunho",
  unsupported: "não coberto",
};

export default function CoberturaDoRelease({
  provenance,
}: {
  provenance: ResultProvenance;
}) {
  const tom = TOM[provenance.releaseStatus];
  const dominios = Object.entries(provenance.coverage) as [EmployerDomain, string][];
  const naoCobertos = dominios.filter(([, estado]) => estado === "unsupported" || estado === "draft");

  return (
    <section
      className={`mb-5 rounded-2xl border p-4 ${tom.classe}`}
      aria-labelledby="cobertura-release"
    >
      {/* ┌──────────────────────────────────────────────────────────────┐
          │ MESMA INFORMAÇÃO, METADE DA ALTURA                            │
          │                                                              │
          │ Este painel repete-se por cima dos SETE separadores do        │
          │ resultado. Em quatro linhas de `dl` soltas e três de lista,   │
          │ custava ~200px de cada vez e empurrava o conteúdo do          │
          │ separador para fora do ecrã. Nada saiu: os metadados passam a │
          │ pastilhas numa linha que corre, e as três garantias a         │
          │ pastilhas com ícone. Continua tudo visível — é a regra da     │
          │ proveniência, não uma preferência de desenho.                 │
          └──────────────────────────────────────────────────────────────┘ */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="cobertura-release" className="flex items-center gap-2 text-sm font-semibold">
          {provenance.releaseStatus === "approved" ? (
            <ShieldCheck size={16} className="flex-none" />
          ) : (
            <Warning size={16} className="flex-none" />
          )}
          {tom.rotulo}
        </h3>
        {/* Sem `opacity-*`: sobre o amarelo do alerta, diluir a tinta leva o
            contraste com ela — a lição que custou nove textos entre 3,5 e 4,3. */}
        <p className="texto-mini min-w-0 break-all font-semibold">{provenance.releaseId}</p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed">{tom.frase}</p>

      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt className="font-semibold">Conhecimento até</dt>
          <dd className="tabular-nums">{provenance.knowledgeAsOf}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-semibold">Vigência</dt>
          <dd className="tabular-nums">
            {provenance.effective.from} a {provenance.effective.to}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-semibold">Jurisdição</dt>
          <dd>{provenance.jurisdiction}</dd>
        </div>
      </dl>

      {naoCobertos.length > 0 ? (
        <p className="mt-2.5 text-xs leading-relaxed">
          <strong>Fora da cobertura deste release:</strong>{" "}
          {naoCobertos
            .map(([dominio, estado]) =>
              `${EMPLOYER_DOMAIN_LABELS[dominio]} (${COBERTURA_ROTULO[estado] ?? estado})`)
            .join(", ")}
          . Nestes temas o resultado não avança um número — nem sequer um aproximado.
        </p>
      ) : null}

      <ul className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
        <li className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 leading-tight ${tom.chip}`}>
          {provenance.userReviewedInputs ? (
            <Check size={13} className="flex-none" />
          ) : (
            <Warning size={13} className="flex-none" />
          )}
          Dados revistos por ti: {provenance.userReviewedInputs ? "sim" : "ainda não"}
        </li>
        <li className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 leading-tight ${tom.chip}`}>
          {provenance.policyApproved ? (
            <Check size={13} className="flex-none" />
          ) : (
            <Warning size={13} className="flex-none" />
          )}
          Política aprovada por revisão independente: {provenance.policyApproved ? "sim" : "não"}
        </li>
        <li className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 leading-tight ${tom.chip}`}>
          <Check size={13} className="flex-none" />
          Cálculo reproduzível a partir do input e deste release
        </li>
      </ul>
    </section>
  );
}
