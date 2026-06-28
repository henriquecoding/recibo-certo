import Link from "next/link";
import {
  Calculator, Receipt, Scale, FileSign, Wallet, Building, ShieldCheck, ArrowRight,
} from "@/components/ui/Icons";

// ─────────────────────────────────────────────────────────────────────────
//  Simuladores relacionados — converte leitores de guias em utilizadores das
//  ferramentas. Cada guia mostra os simuladores condizentes com o seu tema.
//  As rotas e descrições têm de corresponder a ferramentas reais do site.
// ─────────────────────────────────────────────────────────────────────────

type SimId =
  | "recibos-verdes" | "vencimento" | "ato-isolado" | "classificar"
  | "mor" | "empresa" | "auditoria" | "irs" | "comparar";

type Sim = {
  titulo: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const SIMULADORES: Record<SimId, Sim> = {
  "recibos-verdes": {
    titulo: "Calculadora de recibos verdes",
    desc: "O teu líquido real: IRS, Segurança Social e IVA em segundos.",
    href: "/ferramentas/regime-simplificado",
    icon: Calculator,
  },
  vencimento: {
    titulo: "Simulador de recibo de vencimento",
    desc: "Do bruto ao líquido, com subsídios e duodécimos.",
    href: "/ferramentas/recibo-vencimento",
    icon: Receipt,
  },
  "ato-isolado": {
    titulo: "Ato isolado ou abrir atividade?",
    desc: "Decisor interativo para a tua situação concreta.",
    href: "/ferramentas/ato-isolado",
    icon: Scale,
  },
  classificar: {
    titulo: "Classificar a tua atividade",
    desc: "Descobre o código (Art. 151.º) e o coeficiente aplicável.",
    href: "/ferramentas/classificar-atividade",
    icon: FileSign,
  },
  mor: {
    titulo: "Recibo para Merchant of Record",
    desc: "Paddle, Lemon Squeezy e afins: emite 1 recibo por mês.",
    href: "/ferramentas/payout-mor",
    icon: Wallet,
  },
  empresa: {
    titulo: "Simulador de empresa (IRC)",
    desc: "Sociedade vs. recibos verdes — qual compensa.",
    href: "/ferramentas/simulador-empresa",
    icon: Building,
  },
  auditoria: {
    titulo: "Auditoria de recibo",
    desc: "Confere se as retenções e o IVA do teu recibo estão certos.",
    href: "/ferramentas/auditoria-recibo",
    icon: ShieldCheck,
  },
  irs: {
    titulo: "Simulador de IRS guiado",
    desc: "A tua declaração anual, passo a passo e com memória de cálculo.",
    href: "/dashboard/simulador",
    icon: Calculator,
  },
  comparar: {
    titulo: "Comparador de regimes",
    desc: "Independente, empresa ou conta de outrem — lado a lado.",
    href: "/dashboard/comparar",
    icon: Scale,
  },
};

// Mapa guia → simuladores condizentes (slug = última parte da rota /guias/*).
const POR_GUIA: Record<string, SimId[]> = {
  "abrir-atividade": ["classificar", "recibos-verdes", "ato-isolado"],
  "ato-isolado": ["ato-isolado", "recibos-verdes"],
  "regime-simplificado": ["recibos-verdes", "irs", "classificar"],
  "retencao-na-fonte": ["recibos-verdes", "vencimento"],
  "iva-recibos-verdes": ["recibos-verdes", "mor"],
  "seguranca-social": ["recibos-verdes", "irs"],
  "acumulacao-emprego": ["recibos-verdes", "vencimento", "comparar"],
  "clientes-estrangeiros": ["mor", "recibos-verdes"],
  "cessar-atividade": ["recibos-verdes"],
  "fatura-vs-recibo": ["recibos-verdes", "auditoria"],
  "merchant-of-record": ["mor", "recibos-verdes"],
  "recibo-vencimento": ["vencimento", "irs"],
  "subsidios-ferias-natal": ["vencimento"],
  "trabalho-suplementar": ["vencimento"],
  "abrir-empresa": ["empresa", "comparar"],
  "irc": ["empresa", "comparar"],
  "tributacao-autonoma": ["empresa"],
  "escaloes-irs": ["irs", "recibos-verdes"],
  "irs-jovem": ["recibos-verdes", "irs"],
  "deducoes-coleta": ["irs", "recibos-verdes"],
};

export function simuladoresDoGuia(slug: string): boolean {
  return !!POR_GUIA[slug]?.length;
}

export default function SimuladoresRelacionados({ slug }: { slug: string }) {
  const ids = POR_GUIA[slug];
  if (!ids || ids.length === 0) return null;

  return (
    <section
      aria-label="Simuladores relacionados"
      className="mt-12 rounded-4xl border border-brand/20 bg-gradient-to-br from-brand-light/60 to-cream p-6 shadow-card dark:border-brand/15 dark:from-brand/10 dark:to-stone-900 sm:p-8"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="eyebrow text-brand">Põe em prática</span>
      </div>
      <h2 className="font-display text-2xl font-semibold text-ink">
        Já que estás aqui, faz as contas
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Aplica este guia à tua situação real com os nossos simuladores — gratuitos, com as taxas
        oficiais de 2026 e a memória de cálculo passo a passo.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ids.map((id) => {
          const s = SIMULADORES[id];
          const Icon = s.icon;
          return (
            <Link
              key={id}
              href={s.href}
              className="group flex items-start gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/15">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{s.titulo}</p>
                  <ArrowRight size={15} className="flex-shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{s.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
