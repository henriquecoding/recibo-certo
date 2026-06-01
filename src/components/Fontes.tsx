import { ShieldCheck } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { pct } from "@/lib/format";
import {
  SOURCES,
  DATA_LAST_REVIEW,
  FISCAL_YEAR,
  RETENCAO,
  IVA_ISENCAO_LIMITE,
  IVA_TAXAS,
  SS_TAXA,
  IAS,
  IRS_JOVEM,
} from "@/lib/fiscal-data";

const dataRevisao = new Date(DATA_LAST_REVIEW).toLocaleDateString("pt-PT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const cont = IVA_TAXAS.continente.value;

const PARAMETROS: { label: string; valor: string; base: string }[] = [
  { label: "Retenção Art. 151.º", valor: pct(RETENCAO.art151.value), base: RETENCAO.art151.legalBasis },
  { label: "Isenção de IVA", valor: `${IVA_ISENCAO_LIMITE.value.toLocaleString("pt-PT")} €`, base: IVA_ISENCAO_LIMITE.legalBasis },
  { label: "IVA continente", valor: `${pct(cont.reduzida)} · ${pct(cont.intermedia)} · ${pct(cont.normal)}`, base: IVA_TAXAS.continente.legalBasis },
  { label: "Segurança Social", valor: pct(SS_TAXA.value), base: SS_TAXA.legalBasis },
  { label: "IAS " + FISCAL_YEAR, valor: `${IAS.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €`, base: IAS.legalBasis },
  { label: "IRS Jovem (teto)", valor: `${IRS_JOVEM.tetoIAS.value} × IAS`, base: IRS_JOVEM.tetoIAS.legalBasis },
];

export default function Fontes() {
  return (
    <section id="fontes" className="grain scroll-mt-24 bg-sand px-6 py-24">
      <div className="max-w-4xl mx-auto">
        <Reveal className="mb-10 text-center">
          <div className="eyebrow mb-3 text-brand">Dados verificados</div>
          <h2 className="font-display display-2 font-semibold text-ink">Transparência fiscal total</h2>
          <p className="mx-auto mt-3 max-w-xl text-stone-500">
            Cada taxa usada nos cálculos tem base legal e fonte verificável. Os dados são revistos e datados — sem números
            inventados nem desatualizados.
          </p>
        </Reveal>

        {/* Selo de última revisão */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-brand bg-brand-light">
            <span className="text-brand">
              <ShieldCheck size={16} />
            </span>
            <span className="text-sm font-semibold text-brand-dark">
              Taxas de {FISCAL_YEAR} · última verificação: {dataRevisao}
            </span>
          </div>
        </div>

        {/* Parâmetros principais */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {PARAMETROS.map((p) => (
            <div
              key={p.label}
              className="rounded-3xl border border-stone-100 bg-white p-5 shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-stone-700">{p.label}</span>
                <span className="font-display text-base font-semibold text-brand tabular-nums">{p.valor}</span>
              </div>
              <p className="text-[11px] leading-snug text-stone-400">{p.base}</p>
            </div>
          ))}
        </div>

        {/* Lista de fontes */}
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Fontes consultadas</h3>
          <ul className="space-y-2">
            {Object.entries(SOURCES).map(([sourceKey, s]) => (
              <li key={sourceKey}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 text-sm text-stone-500 hover:text-brand-dark transition-colors"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                  <span className="underline decoration-stone-200 group-hover:decoration-brand underline-offset-2">
                    {s.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-stone-400 mt-8 leading-relaxed">
          As taxas e os limites fiscais são alterados anualmente pelo Orçamento do Estado e por diplomas regionais. Esta
          ferramenta é informativa e não substitui o aconselhamento de um contabilista certificado. Em caso de dúvida,
          confirma sempre junto da Autoridade Tributária e da Segurança Social.
        </p>
      </div>
    </section>
  );
}
