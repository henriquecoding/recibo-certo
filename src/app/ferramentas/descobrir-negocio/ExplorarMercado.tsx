// ═══════════════════════════════════════════════════════════════════════
//  EXPLORAR MERCADO — o que existe no HTML, sem JavaScript nenhum
//  ---------------------------------------------------------------------
//  Ponto 28 do pedido separa «recomendado para ti» de «explorar mercado».
//  A primeira é, por natureza, dinâmica: depende de um contexto que só
//  existe no browser de quem responde. A segunda não — e é ela que
//  resolve dois problemas ao mesmo tempo:
//
//   · a checklist editorial exige conteúdo essencial renderizado no
//     servidor, legível sem JavaScript e por um motor de busca;
//   · os dossiers curados continuam a ter valor como leitura, mesmo
//     para quem não quer responder a um formulário.
//
//  Server Component. Sem estado, sem browser, sem `use client`.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import {
  OPPORTUNITY_SECTORS,
  OPPORTUNITY_TEMPLATES,
  templateHasLiveEvidence,
  type OpportunityTemplate,
} from "@/lib/negocio/market/opportunities";

function PorSetor({ setor, rotulo }: { setor: string; rotulo: string }) {
  const dossiers = OPPORTUNITY_TEMPLATES.filter((template) => template.sector === setor);
  if (dossiers.length === 0) return null;

  return (
    <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <h3 className="font-display text-lg font-semibold text-ink">{rotulo}</h3>
      <ul className="mt-3 space-y-4">
        {dossiers.map((template) => (
          <li key={template.id}>
            <Dossier template={template} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dossier({ template }: { template: OpportunityTemplate }) {
  const comEvidencia = templateHasLiveEvidence(template);
  return (
    <article>
      <h4 className="text-[15px] font-semibold leading-snug text-stone-800 dark:text-stone-100">
        {template.title}
      </h4>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">{template.promise}</p>
      <dl className="mt-2 space-y-1 text-[13px] leading-relaxed">
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Problema: </dt>
          <dd className="inline text-stone-500">{template.problem}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Quem compra: </dt>
          <dd className="inline text-stone-500">{template.customer}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Como ganha dinheiro: </dt>
          <dd className="inline text-stone-500">{template.revenueModel}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Requisitos críticos: </dt>
          <dd className="inline text-stone-500">{template.criticalRequirements.join("; ")}.</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Primeiro teste comercial: </dt>
          <dd className="inline text-stone-500">{template.firstCustomerPath.join(" ")}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Teste que pode matar a ideia: </dt>
          <dd className="inline text-stone-500">{template.falsificationTest}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-stone-700 dark:text-stone-200">Evidência: </dt>
          <dd className="inline text-stone-500">{template.evidenceNote}</dd>
        </div>
      </dl>
      <p className="mt-2">
        <Link
          href={`/ferramentas/recibos-verdes?modo=preco&cenario=${template.pricingScenario}&h=${encodeURIComponent(template.id)}`}
          className="text-[13px] font-semibold text-brand-dark underline-offset-4 hover:underline dark:text-brand-mint"
        >
          Formar o preço desta hipótese
        </Link>
        {comEvidencia ? (
          <span className="ml-2 text-[12px] text-stone-400">
            Fontes oficiais ligadas:{" "}
            {template.evidencePlan
              .filter((entrada) => entrada.status === "live")
              .map((entrada) => entrada.source)
              .join("; ")}
            .
          </span>
        ) : null}
      </p>
    </article>
  );
}

export default function ExplorarMercado() {
  const comIngestao = OPPORTUNITY_TEMPLATES.filter(templateHasLiveEvidence).length;

  return (
    <section aria-labelledby="explorar-mercado" className="space-y-5">
      <div>
        <h2 id="explorar-mercado" className="font-display text-2xl font-semibold text-ink">
          Explorar mercado
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-500">
          Os {OPPORTUNITY_TEMPLATES.length} dossiers curados que servem de referência ao motor —{" "}
          {comIngestao} deles com fontes oficiais ligadas. Não são o universo de respostas: o motor compõe
          hipóteses a partir do que sabes fazer, e a maior parte do que devolve não está escrita aqui. Estes
          existem porque foram revistos por uma pessoa, e é por isso que valem como padrão de comparação.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {OPPORTUNITY_SECTORS.map((setor) => (
          <PorSetor key={setor.id} setor={setor.id} rotulo={setor.label} />
        ))}
      </div>
    </section>
  );
}
