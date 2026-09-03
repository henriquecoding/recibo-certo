// ═══════════════════════════════════════════════════════════════════════
//  AS FONTES FISCAIS DEIXAM DE VIVER NUMA ÂNCORA DA HOMEPAGE
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ESTA PÁGINA EXISTE PARA REPARAR                        │
//  │                                                                     │
//  │ O rodapé apontava para `/#fontes` em TRÊS sítios — a lista «Recibo   │
//  │ Certo», o cartão «Dados oficiais» e a barra legal. A secção que      │
//  │ respondia a essa âncora saiu da homepage quando ela foi reescrita à  │
//  │ volta dos cinco focos, e o componente que a desenhava ficou órfão.   │
//  │ Uma âncora para um id que ninguém renderiza não dá 404: entrega o    │
//  │ TOPO da homepage, em silêncio — a promessa mais cara do produto      │
//  │ («cada taxa tem fonte») a falhar sem deixar rasto.                    │
//  │                                                                     │
//  │ Passa a ser uma rota. É o que uma promessa de transparência precisa  │
//  │ de ser: um endereço estável que se pode citar, indexar e enviar a    │
//  │ alguém — não um sítio dentro de uma página que muda de forma.        │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE ESTA PÁGINA ADMITE FONTES QUE NÃO SÃO OFICIAIS          │
//  │                                                                     │
//  │ Porque existem, e escondê-las era o oposto do que a página promete.  │
//  │ Das 166 fontes registadas, a maioria esmagadora é o Estado a         │
//  │ publicar — Autoridade Tributária, Segurança Social, Diário da        │
//  │ República. Mas há regras cujo texto consolidado não é legível numa   │
//  │ fonte oficial (o Código do Trabalho vive na base da PGDL) e valores  │
//  │ que só aparecem redigidos em doutrina profissional.                   │
//  │                                                                     │
//  │ Em vez de as chamar «oficiais» a todas, a página separa-as e conta,  │
//  │ para CADA uma, quantos parâmetros publicados assentam nela. O número │
//  │ é derivado de `PARAMETROS_AUDITADOS` no momento da compilação: não   │
//  │ há como o deixar envelhecer, e não há como uma dependência crescer   │
//  │ sem aparecer aqui.                                                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Não duplica `/estado-dos-dados`: essa conta a COBERTURA (quantos
//  parâmetros, com que frescura, o que falta); esta dá a LISTA e o
//  endereço de cada fonte. Cruzam-se, não se repetem.
// ═══════════════════════════════════════════════════════════════════════

import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Section, Nota } from "@/components/LegalPage";
import {
  SOURCES,
  PARAMETROS_AUDITADOS,
  DATA_LAST_REVIEW,
  RETENCAO,
  IVA_ISENCAO_LIMITE,
  IVA_TAXAS,
  SS_TAXA,
  IAS,
  IRS_JOVEM,
} from "@/lib/fiscal-data";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { pct } from "@/lib/format";
import { generateBreadcrumbSchema } from "@/lib/seo";
import { ArrowRight, ExternalLink } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: `Fontes fiscais ${FISCAL_YEAR} — cada taxa com base legal e endereço | Recibo Certo`,
  description:
    "A lista completa das fontes oficiais que sustentam os cálculos do Recibo Certo: Autoridade Tributária, Segurança Social, Diário da República e Orçamento do Estado. Cada parâmetro com artigo, endereço e data de verificação.",
  keywords: [
    "fontes fiscais oficiais portugal",
    "base legal irs 2026",
    "taxas segurança social fonte oficial",
    "artigo 151 retenção na fonte",
    "transparência calculadora fiscal",
  ],
  alternates: { canonical: "/fontes-fiscais" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Fontes fiscais — Recibo Certo",
    description:
      "Cada taxa usada nos cálculos tem artigo, endereço oficial e data de verificação. A lista completa, contada a partir do código.",
    url: "https://www.recibocerto.pt/fontes-fiscais",
    type: "article",
    locale: "pt_PT",
  },
};

const TOC = [
  { id: "parametros", label: "Parâmetros principais" },
  { id: "primarias", label: "Fontes primárias" },
  { id: "apoio", label: "Consolidação e apoio" },
  { id: "verificacao", label: "Como é verificado" },
];

/**
 * A que instituição pertence um endereço.
 *
 * Derivado do HOSTNAME e não de uma etiqueta escrita à mão: o rótulo de
 * uma fonte é prosa (muda quando alguém melhora a redação), o domínio é
 * um facto. `primaria` distingue quem PUBLICA a regra de quem a
 * consolida ou comenta — e essa distinção é a razão de ser da página.
 */
const INSTITUICOES: { teste: RegExp; nome: string; primaria: boolean }[] = [
  { teste: /(^|\.)portaldasfinancas\.gov\.pt$/, nome: "Autoridade Tributária e Aduaneira", primaria: true },
  { teste: /(^|\.)diariodarepublica\.pt$/, nome: "Diário da República", primaria: true },
  { teste: /(^|\.)seg-social\.pt$/, nome: "Segurança Social", primaria: true },
  { teste: /(^|\.)madeira\.gov\.pt$/, nome: "Jornal Oficial da Região Autónoma da Madeira", primaria: true },
  { teste: /(^|\.)europa\.eu$/, nome: "União Europeia", primaria: true },
  { teste: /(^|\.)iefp\.pt$/, nome: "IEFP — Instituto do Emprego e Formação Profissional", primaria: true },
  { teste: /(^|\.)gov\.pt$/, nome: "Administração Pública portuguesa", primaria: true },
  { teste: /(^|\.)pgdlisboa\.pt$/, nome: "PGDL — bases jurídicas consolidadas", primaria: false },
  { teste: /(^|\.)occ\.pt$/, nome: "Ordem dos Contabilistas Certificados", primaria: false },
];

function instituicaoDe(url: string): { nome: string; primaria: boolean } {
  const host = new URL(url).hostname;
  const conhecida = INSTITUICOES.find((i) => i.teste.test(host));
  return conhecida ?? { nome: host.replace(/^www\d?\./, ""), primaria: false };
}

interface Grupo {
  nome: string;
  primaria: boolean;
  fontes: { label: string; url: string; parametros: number }[];
}

/** Os grupos, montados uma vez na compilação. */
function agrupar(): Grupo[] {
  const usoPorFonte = new Map<string, number>();
  for (const p of PARAMETROS_AUDITADOS) {
    usoPorFonte.set(p.source, (usoPorFonte.get(p.source) ?? 0) + 1);
  }

  const porNome = new Map<string, Grupo>();
  for (const [chave, fonte] of Object.entries(SOURCES)) {
    const { nome, primaria } = instituicaoDe(fonte.url);
    if (!porNome.has(nome)) porNome.set(nome, { nome, primaria, fontes: [] });
    porNome.get(nome)!.fontes.push({
      label: fonte.label,
      url: fonte.url,
      parametros: usoPorFonte.get(chave) ?? 0,
    });
  }

  for (const grupo of porNome.values()) {
    grupo.fontes.sort((a, b) => b.parametros - a.parametros || a.label.localeCompare(b.label, "pt-PT"));
  }
  return [...porNome.values()].sort((a, b) => b.fontes.length - a.fontes.length);
}

function ListaDeFontes({ grupos }: { grupos: Grupo[] }) {
  return (
    <div className="mt-4 space-y-6">
      {grupos.map((grupo) => (
        <div key={grupo.nome}>
          <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-bold text-stone-700 dark:text-stone-300">
            {grupo.nome}
            <span className="texto-mini font-medium text-stone-400 dark:text-stone-500">
              {grupo.fontes.length} {grupo.fontes.length === 1 ? "fonte" : "fontes"}
            </span>
          </h3>
          <ul className="space-y-0.5">
            {grupo.fontes.map((f) => (
              <li key={f.url + f.label}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[36px] items-start gap-2 py-1 text-[13px] leading-relaxed text-stone-500 transition-colors hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand-mint"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                  {/* `min-w-0` + `break-words`: os rótulos legais são longos e
                      não têm por onde quebrar num telemóvel a 360px. */}
                  <span className="min-w-0 break-words">
                    <span className="underline decoration-stone-300 underline-offset-2 group-hover:decoration-brand dark:decoration-stone-600">
                      {f.label}
                    </span>
                    {f.parametros > 0 && (
                      <span className="ml-1.5 whitespace-nowrap texto-mini font-semibold text-stone-400 dark:text-stone-500">
                        · {f.parametros} {f.parametros === 1 ? "parâmetro" : "parâmetros"}
                      </span>
                    )}
                    <ExternalLink size={10} className="ml-1 inline-block shrink-0 align-baseline text-stone-300 dark:text-stone-600" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function FontesFiscaisPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Início", url: "/" },
    { name: "Fontes fiscais", url: "/fontes-fiscais" },
  ]);

  const grupos = agrupar();
  const primarias = grupos.filter((g) => g.primaria);
  const apoio = grupos.filter((g) => !g.primaria);
  const nFontes = Object.keys(SOURCES).length;
  const nPrimarias = primarias.reduce((n, g) => n + g.fontes.length, 0);

  const fmtData = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const continente = IVA_TAXAS.continente;
  const DESTAQUES = [
    { label: "Retenção na fonte (Art. 151.º)", valor: pct(RETENCAO.art151.value), p: RETENCAO.art151 },
    { label: "Isenção de IVA", valor: `${IVA_ISENCAO_LIMITE.value.toLocaleString("pt-PT")} €`, p: IVA_ISENCAO_LIMITE },
    {
      label: "IVA no continente",
      valor: `${pct(continente.value.reduzida)} · ${pct(continente.value.intermedia)} · ${pct(continente.value.normal)}`,
      p: continente,
    },
    { label: "Segurança Social (independentes)", valor: pct(SS_TAXA.value), p: SS_TAXA },
    { label: `IAS ${FISCAL_YEAR}`, valor: `${IAS.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} €`, p: IAS },
    { label: "IRS Jovem (teto anual)", valor: `${IRS_JOVEM.tetoIAS.value} × IAS`, p: IRS_JOVEM.tetoIAS },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <LegalPage
        title="Fontes fiscais"
        subtitle={`Cada taxa que o Recibo Certo usa tem um artigo que a fundamenta, um endereço onde a podes conferir e a data em que foi verificada. São ${nFontes} fontes registadas — esta é a lista, contada a partir do código.`}
        lastUpdated={fmtData(DATA_LAST_REVIEW)}
        toc={TOC}
        eyebrow="Programa de autoridade"
        selo={`${nFontes} fontes registadas`}
        ctaTitulo="Um valor parece-te errado?"
        ctaTexto="Diz-nos qual e com que fonte. Verificamos e corrigimos publicamente."
      >
        <Section id="parametros" title="Parâmetros principais">
          <p>
            Os seis valores que aparecem em mais cálculos. Cada um mostra a base legal, a data
            em que foi conferido e o endereço da fonte — a lista completa dos{" "}
            {PARAMETROS_AUDITADOS.length} parâmetros auditados está por trás das ferramentas que
            os usam.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {DESTAQUES.map((d) => {
              const fonte = SOURCES[d.p.source];
              return (
                <div
                  key={d.label}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-200">
                      {d.label}
                    </span>
                    <span className="font-display text-base font-semibold tabular-nums text-brand">
                      {d.valor}
                    </span>
                  </div>
                  <p className="mt-1 texto-mini leading-snug text-stone-400 break-words dark:text-stone-500">
                    {d.p.legalBasis}
                  </p>
                  <a
                    href={fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 texto-mini font-semibold text-brand transition-colors hover:text-brand-dark dark:hover:text-brand-mint"
                  >
                    Verificado em {fmtData(d.p.lastVerified)}
                    <ExternalLink size={10} />
                  </a>
                </div>
              );
            })}
          </div>
        </Section>

        <Section id="primarias" title="Fontes primárias">
          <p>
            {nPrimarias} das {nFontes} fontes são o Estado a publicar a regra: códigos
            tributários, ofícios circulados, tabelas de retenção, guias práticos da Segurança
            Social e diplomas do Diário da República. É daqui que vem a esmagadora maioria dos
            valores.
          </p>
          <ListaDeFontes grupos={primarias} />
        </Section>

        <Section id="apoio" title="Consolidação e apoio">
          <p>
            As restantes {nFontes - nPrimarias} não são publicação oficial, e a página diz isso
            em vez de as arrumar no mesmo saco. Existem por duas razões: há texto legal cuja
            versão consolidada não é legível numa fonte oficial — o Código do Trabalho é o caso
            maior — e há valores cuja redação praticável só aparece em doutrina profissional.
          </p>
          <p>
            O número ao lado de cada uma diz quantos parâmetros publicados assentam nela. É
            derivado do código na compilação: uma dependência não pode crescer sem aparecer
            aqui.
          </p>
          <ListaDeFontes grupos={apoio} />
        </Section>

        <Section id="verificacao" title="Como é verificado">
          <p>
            A compilação do site falha se qualquer parâmetro perder a fonte, tiver data
            inválida ou for verificado depois da data de revisão global
            ({fmtData(DATA_LAST_REVIEW)}). Não é uma promessa editorial: é uma asserção que
            impede a publicação.
          </p>
          <p>
            Além disso, um monitor automático confere periodicamente os endereços e assinala
            alterações; os valores só mudam depois de uma revisão humana, e a mudança fica
            registada.
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              { href: "/estado-dos-dados", titulo: "Estado dos dados", desc: "Cobertura, frescura e o que ainda falta." },
              { href: "/changelog-fiscal", titulo: "Alterações fiscais", desc: "O que mudou na lei e o que mudámos por causa disso." },
              { href: "/metodologia", titulo: "Metodologia", desc: "Como calculamos — e o que nunca fazemos." },
              { href: "/perguntas-frequentes", titulo: "Perguntas frequentes", desc: "As dúvidas mais comuns, com estes mesmos valores." },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group flex min-h-[44px] flex-col justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 transition-all hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-800/50"
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-700 group-hover:text-brand-dark dark:text-stone-200 dark:group-hover:text-brand-mint">
                    {l.titulo}
                    <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                  <span className="mt-0.5 texto-mini leading-snug text-stone-400 dark:text-stone-500">
                    {l.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Nota>
            As taxas e os limites fiscais mudam com o Orçamento do Estado e com diplomas
            regionais. O Recibo Certo é informativo e não substitui o aconselhamento de um
            contabilista certificado — em caso de dúvida, confirma junto da Autoridade
            Tributária e da Segurança Social.
          </Nota>
        </Section>
      </LegalPage>
    </>
  );
}
