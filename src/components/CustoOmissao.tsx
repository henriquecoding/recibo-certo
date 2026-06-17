import { ArrowRight, RotateCcw, Calculator, BellAlert, ShieldCheck, Lock, Flag } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";
import {
  FISCAL_YEAR,
  ATIVIDADES,
  RETENCAO_DEP_CONTINENTE_T1,
  RETENCAO_DEP_TABELAS,
} from "@/lib/fiscal-data";

// "Custo de Omissão" — substitui a antiga comparação defensiva com o Excel.
// Reposiciona o ReciboCerto: o problema não é uma folha de cálculo, é o custo
// de fazer (ou esquecer) tudo isto à mão. Cada número vem de `fiscal-data.ts`
// (fonte de verdade) — não há métricas inventadas. Server Component (SSR/SEO).

const N_ESCALOES = RETENCAO_DEP_CONTINENTE_T1.value.length;
const N_TABELAS = Object.keys(RETENCAO_DEP_TABELAS.value).length;
const N_ATIVIDADES = ATIVIDADES.length;

const CUSTOS = [
  {
    icon: <RotateCcw size={18} />,
    metric: `${N_ESCALOES} + ${N_TABELAS}`,
    titulo: "Tabelas que mudam todos os anos",
    risco: `As tabelas de retenção de ${FISCAL_YEAR} têm ${N_ESCALOES} escalões e ${N_TABELAS} variantes consoante a tua situação familiar — e mudam a cada Orçamento do Estado.`,
    resposta: "Aplicámos as tabelas oficiais de 2026 por ti, cada valor com base legal, fonte e data de verificação.",
  },
  {
    icon: <Calculator size={18} />,
    metric: `${N_ATIVIDADES}`,
    titulo: "Erro de cálculo manual",
    risco: `Entre ${N_ATIVIDADES} atividades, coeficientes e deduções, uma fórmula errada numa folha de cálculo propaga-se a todos os meses sem dares conta.`,
    resposta: "Cálculo automático e verificado — IRS, Segurança Social, IVA e retenção do vencimento.",
  },
  {
    icon: <BellAlert size={18} />,
    metric: "7 500 €",
    titulo: "Prazos e coimas",
    risco: "Falhar uma declaração trimestral pode custar de 50 € a 7 500 € em coimas, conforme a infração.",
    resposta: "Avisamos-te de cada prazo com a antecedência certa para nunca pagares de mais.",
  },
] as const;

const CONFIANCA = [
  { icon: <ShieldCheck />, texto: "Taxas de 2026 com fonte oficial" },
  { icon: <Lock />, texto: "Os teus dados ficam contigo" },
  { icon: <Flag />, texto: "Feito para a lei portuguesa" },
];

export default function CustoOmissao() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mb-12 text-center">
          <div className="eyebrow mb-3 text-brand">O custo de fazer à mão</div>
          <h2 className="font-display display-2 text-balance font-semibold text-ink">
            O que te custa não ter ajuda.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-stone-500">
            Sejas trabalhador independente ou por conta de outrem, manter as contas
            certas sozinho tem um custo silencioso — em tempo, em erros e em coimas.
            O ReciboCerto tira-te esse peso.
          </p>
        </Reveal>

        <StaggerGroup className="grid gap-4 sm:grid-cols-3">
          {CUSTOS.map((c) => (
            <StaggerItem key={c.titulo}>
              <article className="flex h-full flex-col rounded-4xl border border-stone-100 bg-white p-6 shadow-card transition-shadow hover:shadow-lift">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  {c.icon}
                </div>
                <div className="font-display text-3xl font-semibold tabular-nums leading-none text-ink">
                  {c.metric}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-stone-800">{c.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{c.risco}</p>
                <div className="mt-auto flex items-start gap-2 border-t border-stone-100 pt-4 text-sm font-medium text-brand-dark">
                  <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-brand text-white">
                    <ArrowRight size={10} />
                  </span>
                  <span>{c.resposta}</span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="mt-12 flex flex-col items-center gap-6">
          <a
            href="#calculadora"
            className="btn-shine inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all duration-200 hover:shadow-float active:scale-[0.97]"
          >
            Calcular o meu líquido
            <ArrowRight size={14} />
          </a>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {CONFIANCA.map((c) => (
              <li key={c.texto} className="flex items-center gap-2 text-sm text-stone-500">
                <span className="text-brand">{c.icon}</span>
                {c.texto}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
