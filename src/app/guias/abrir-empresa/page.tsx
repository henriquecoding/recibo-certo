import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Link from "next/link";
import InfoTip from "@/components/ui/InfoTip";
import { IRC_TAXA_GERAL, IRC_TAXA_PME, IRC_LIMITE_PME, DIVIDENDOS_TAXA } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import { ArrowRight, Check } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("abrir-empresa");

const FORMAS_JURIDICAS = [
  {
    forma: "Sociedade Unipessoal por Quotas (Lda.)",
    socios: "1 sócio",
    capital: "1 € (mínimo legal)",
    responsabilidade: "Limitada ao capital social",
    ideal: "Freelancers que querem separar património pessoal do profissional",
  },
  {
    forma: "Sociedade por Quotas (Lda.)",
    socios: "2+ sócios",
    capital: "1 € por sócio (mínimo legal)",
    responsabilidade: "Limitada ao capital social",
    ideal: "Parcerias e projetos com múltiplos fundadores",
  },
  {
    forma: "Sociedade Anónima (S.A.)",
    socios: "5+ acionistas",
    capital: "50 000 €",
    responsabilidade: "Limitada ao valor das ações",
    ideal: "Projetos de grande escala com captação de investimento",
  },
];

export default function AbrirEmpresaPage() {
  return (
    <GuiaLayout slug="abrir-empresa">

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Formas jurídicas
        </h2>
        <div className="space-y-3">
          {FORMAS_JURIDICAS.map((f) => (
            <div key={f.forma} className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2">{f.forma}</p>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-stone-500">
                <p><span className="font-semibold text-stone-600 dark:text-stone-400">Sócios:</span> {f.socios}</p>
                <p><span className="font-semibold text-stone-600 dark:text-stone-400">Capital mínimo:</span> {f.capital}</p>
                <p><span className="font-semibold text-stone-600 dark:text-stone-400">Responsabilidade:</span> {f.responsabilidade}</p>
                <p><span className="font-semibold text-stone-600 dark:text-stone-400">Ideal para:</span> {f.ideal}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Art. 270.º-A e seguintes do Código das Sociedades Comerciais (DL 262/86) — Sociedade Unipessoal por Quotas.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Empresa na Hora vs. Empresa Online
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
            <p className="text-xs font-semibold text-brand mb-2">Empresa na Hora</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">Presencial numa Conservatória do Registo Comercial ou Loja do Cidadão.</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Constituição no próprio dia</p>
            <p className="text-xs text-stone-400 mt-1">Custo: ~360 € (com pacto pré-aprovado)</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
            <p className="text-xs font-semibold text-brand mb-2">Empresa Online</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">Totalmente digital, em empresanahora.mj.pt.</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">1–2 dias úteis</p>
            <p className="text-xs text-stone-400 mt-1">Custo: ~220 € (com pacto pré-aprovado)</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O que precisas
        </h2>
        <div className="space-y-2">
          {[
            "Cartão de Cidadão (ou NIF + documento de identificação)",
            "Certificado de Admissibilidade da firma (ou usar firma pré-aprovada)",
            "Definir objeto social, sede, capital social e gerência",
            "IBAN para o depósito do capital social",
            "Contabilista certificado (obrigatório para empresas sujeitas a IRC)",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <span className="mt-0.5 text-brand flex-shrink-0"><Check size={14} /></span>
              <p className="text-sm text-stone-600 dark:text-stone-400">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Fiscalidade da empresa vs. recibos verdes
        </h2>
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5 mb-4">
          <p className="text-sm font-semibold text-brand-dark dark:text-brand mb-2">IRC vs. IRS</p>
          <p className="text-sm text-stone-700 dark:text-stone-300">
            A empresa paga IRC sobre o lucro tributável. Os dividendos distribuídos ao sócio pagam adicionalmente IRS a taxa liberatória.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">IRC — Taxa PME</p>
            <p className="font-display text-xl font-semibold text-brand">
              {pct(IRC_TAXA_PME.value)}
              <InfoTip label="Art. 87.º CIRC">{IRC_TAXA_PME.legalBasis}</InfoTip>
            </p>
            <p className="text-xs text-stone-500 mt-1">Primeiros {fmt(IRC_LIMITE_PME.value)}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">IRC — Taxa geral</p>
            <p className="font-display text-xl font-semibold text-stone-700 dark:text-stone-300">
              {pct(IRC_TAXA_GERAL.value)}
              <InfoTip label="Art. 87.º CIRC">{IRC_TAXA_GERAL.legalBasis}</InfoTip>
            </p>
            <p className="text-xs text-stone-500 mt-1">Excedente acima de {fmt(IRC_LIMITE_PME.value)}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Dividendos (IRS)</p>
            <p className="font-display text-xl font-semibold text-stone-700 dark:text-stone-300">
              {pct(DIVIDENDOS_TAXA.value)}
              <InfoTip label="Art. 71.º CIRS">{DIVIDENDOS_TAXA.legalBasis}</InfoTip>
            </p>
            <p className="text-xs text-stone-500 mt-1">Taxa liberatória</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Obrigações declarativas
        </h2>
        <div className="space-y-2">
          {[
            { obrigacao: "Modelo 22 (declaração de IRC)", prazo: "Até 31 de maio do ano seguinte" },
            { obrigacao: "IES (Informação Empresarial Simplificada)", prazo: "Até 15 de julho do ano seguinte" },
            { obrigacao: "Declaração periódica de IVA", prazo: "Mensal (até dia 10) ou trimestral (até dia 20)" },
            { obrigacao: "SAF-T (ficheiro de faturação)", prazo: "Mensal, até ao dia 5 do mês seguinte" },
            { obrigacao: "Contabilidade organizada", prazo: "Obrigatória (gerida pelo contabilista certificado)" },
          ].map((o) => (
            <div key={o.obrigacao} className="flex items-center justify-between rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{o.obrigacao}</p>
              <p className="text-xs text-stone-400 text-right">{o.prazo}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando compensa ter empresa
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            A regra geral: quando os lucros são elevados o suficiente para que a taxa combinada de IRC + dividendos seja inferior à taxa marginal de IRS pessoal. Tipicamente a partir de lucros anuais de 40 000-60 000 €.
          </p>
          <Link href="/dashboard/empresa" className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand-dark">
            Simular no Comparador de Regimes <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/irc" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Guia de IRC para PME <ArrowRight size={13} />
          </Link>
          <Link href="/guias/tributacao-autonoma" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Tributação autónoma <ArrowRight size={13} />
          </Link>
        </div>
      </section>

    </GuiaLayout>
  );
}
