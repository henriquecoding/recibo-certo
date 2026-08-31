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

const TOM: Record<
  ResultProvenance["releaseStatus"],
  { rotulo: string; frase: string; classe: string }
> = {
  approved: {
    rotulo: "Release aprovado",
    frase: "Calculado com um release aprovado, para os factos que indicaste.",
    classe: "border-brand/30 bg-brand/5 text-brand-dark dark:text-brand-mint",
  },
  reviewed: {
    rotulo: "Release em revisão",
    frase:
      "Revisão técnica feita e fontes datadas; falta a revisão profissional independente. Serve para preparar a decisão, não para a fechar.",
    classe: "border-alert-border bg-alert-bg text-alert-text",
  },
  draft: {
    rotulo: "Release em rascunho",
    frase: "Rascunho: não deve sustentar nenhuma decisão.",
    classe: "border-alert-border bg-alert-bg text-alert-text",
  },
  retired: {
    rotulo: "Release retirado",
    frase: "Este release foi substituído e não deve ser usado.",
    classe: "border-alert-border bg-alert-bg text-alert-text",
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
      <h3 id="cobertura-release" className="flex items-center gap-2 text-sm font-semibold">
        {provenance.releaseStatus === "approved" ? (
          <ShieldCheck size={16} className="flex-none" />
        ) : (
          <Warning size={16} className="flex-none" />
        )}
        {tom.rotulo}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed">{tom.frase}</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <div className="flex gap-1.5">
          <dt className="font-semibold">Release</dt>
          <dd className="min-w-0 break-all">{provenance.releaseId}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-semibold">Conhecimento até</dt>
          <dd>{provenance.knowledgeAsOf}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-semibold">Vigência</dt>
          <dd>
            {provenance.effective.from} a {provenance.effective.to}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-semibold">Jurisdição</dt>
          <dd>{provenance.jurisdiction}</dd>
        </div>
      </dl>

      {naoCobertos.length > 0 ? (
        <p className="mt-3 text-xs leading-relaxed">
          <strong>Fora da cobertura deste release:</strong>{" "}
          {naoCobertos
            .map(([dominio, estado]) =>
              `${EMPLOYER_DOMAIN_LABELS[dominio]} (${COBERTURA_ROTULO[estado] ?? estado})`)
            .join(", ")}
          . Nestes temas o resultado não avança um número — nem sequer um aproximado.
        </p>
      ) : null}

      <ul className="mt-3 space-y-1 text-xs">
        <li className="flex items-start gap-1.5">
          {provenance.userReviewedInputs ? (
            <Check size={13} className="mt-0.5 flex-none" />
          ) : (
            <Warning size={13} className="mt-0.5 flex-none" />
          )}
          Dados revistos por ti: {provenance.userReviewedInputs ? "sim" : "ainda não"}
        </li>
        <li className="flex items-start gap-1.5">
          {provenance.policyApproved ? (
            <Check size={13} className="mt-0.5 flex-none" />
          ) : (
            <Warning size={13} className="mt-0.5 flex-none" />
          )}
          Política aprovada por revisão independente:{" "}
          {provenance.policyApproved ? "sim" : "não"}
        </li>
        <li className="flex items-start gap-1.5">
          <Check size={13} className="mt-0.5 flex-none" />
          Cálculo reproduzível a partir do input e deste release
        </li>
      </ul>
    </section>
  );
}
