import type { ToolDefinition } from "@/lib/ferramentas";
import {
  ArrowRight,
  Briefcase,
  Clock,
  Gauge,
  Lock,
  ShieldCheck,
  User,
  Wallet,
} from "@/components/ui/Icons";

const dataPT = (iso: string): string => {
  const data = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
};

const SAIDAS = [
  {
    label: "Quanto sai da empresa",
    detail: "Custo patronal, parcelas do posto e calendário.",
    Icon: Wallet,
  },
  {
    label: "Quanto pode chegar à pessoa",
    detail: "Pacote e líquido provável, sem fingir certezas.",
    Icon: User,
  },
  {
    label: "O que o posto precisa de gerar",
    detail: "Horas, receita e margem para pagar a contratação.",
    Icon: Gauge,
  },
] as const;

export default function EntradaPlaneador({ tool }: { tool: ToolDefinition }) {
  return (
    // `superficie-fixa`: este herói é verde-profundo nos dois temas, por isso
    // os neutros lá de dentro (o CTA branco) não podem ser remapeados pela
    // camada `.dark`. Ver a nota ②b em `globals.css`.
    <header className="superficie-fixa relative mb-6 overflow-hidden rounded-[2rem] border border-brand-deep bg-brand-deep text-white shadow-lift sm:rounded-[2.25rem]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-brand/30 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-[28%] h-72 w-72 rounded-full bg-brand-mint/10 blur-3xl"
      />

      <div className="relative grid lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,.75fr)]">
        <div className="px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 texto-micro font-bold uppercase tracking-[.14em] text-brand-mint">
              <Briefcase size={13} /> Estúdio de contratação
            </span>
            <span className="texto-micro font-semibold uppercase tracking-[.12em] text-white/70">
              Portugal · {tool.fiscalYear}
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-balance font-display text-[2.35rem] font-semibold leading-[.98] tracking-[-.025em] text-white sm:text-5xl lg:text-[3.35rem]">
            {tool.h1 ?? tool.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-brand-light sm:text-base">
            Parte de uma verba, de um líquido pretendido ou de uma proposta. O planeador separa salário,
            encargos, custos do posto e capacidade até a decisão ficar pronta para comparar.
          </p>

          <div className="mt-6 flex flex-col gap-x-4 gap-y-3 sm:flex-row sm:items-center">
            <a
              href="#ferramenta"
              className="btn-shine inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-brand-deep shadow-card transition hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-brand-deep"
            >
              Começar pelo objetivo <ArrowRight size={15} />
            </a>
            {/* Metadado, não botão. Era uma pastilha com borda e altura de
                alvo ao lado do CTA — lia-se como uma segunda ação e não
                clicava em lado nenhum. */}
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white/75 sm:justify-start">
              <Gauge size={15} className="flex-none text-brand-mint" /> 6 decisões guiadas
            </p>
          </div>
        </div>

        {/* A coluna da direita separava-se por `border-l border-white/10` sobre
            um fundo a 5,5% de branco: no ecrã lia-se como um artefacto de
            renderização e não como uma divisão. O degrau é agora explícito
            (fundo mais fundo, borda mais firme) e a coluna encosta-se ao topo
            e ao fundo do cartão. */}
        <aside
          aria-labelledby="saida-planeador"
          className="relative border-t border-white/15 bg-black/15 px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-7 lg:py-8"
        >
          <p className="texto-micro font-bold uppercase tracking-[.15em] text-brand-mint">Quando terminares</p>
          <h2 id="saida-planeador" className="mt-2 font-display text-2xl font-semibold leading-tight text-white">
            A decisão em três respostas.
          </h2>
          <ol className="mt-5 space-y-3">
            {SAIDAS.map(({ label, detail, Icon }, index) => (
              <li key={label} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.07] p-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-mint/10 text-brand-mint">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    <span className="sr-only">Resposta {index + 1}: </span>{label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/70">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-brand-light/80">
            <ShieldCheck size={14} className="mt-0.5 flex-none text-brand-mint" />
            Um valor desconhecido nunca entra na conta como se fosse zero.
          </p>
        </aside>
      </div>

      <ul className="relative grid border-t border-white/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
        <li className="flex min-h-[58px] items-center gap-2.5 border-b border-white/10 px-5 py-3 sm:border-r lg:border-b-0 lg:px-6">
          <Clock size={15} className="flex-none text-brand-mint" />
          <span className="text-xs text-white/75"><strong className="block text-white">Cerca de {tool.estimatedMinutes} min</strong>ao teu ritmo</span>
        </li>
        <li className="flex min-h-[58px] items-center gap-2.5 border-b border-white/10 px-5 py-3 lg:border-b-0 lg:border-r lg:px-6">
          <ShieldCheck size={15} className="flex-none text-brand-mint" />
          <span className="text-xs text-white/75"><strong className="block text-white">Grátis e sem conta</strong>simular não guarda</span>
        </li>
        <li className="flex min-h-[58px] items-center gap-2.5 border-b border-white/10 px-5 py-3 sm:border-b-0 sm:border-r lg:px-6">
          <Lock size={15} className="flex-none text-brand-mint" />
          <span className="text-xs text-white/75"><strong className="block text-white">Cálculo no dispositivo</strong>dados ficam contigo</span>
        </li>
        <li className="flex min-h-[58px] items-center gap-2.5 px-5 py-3 lg:px-6">
          <Briefcase size={15} className="flex-none text-brand-mint" />
          <span className="text-xs text-white/75"><strong className="block text-white">Referência fiscal de {tool.fiscalYear}</strong>revista a {dataPT(tool.reviewedAt)}</span>
        </li>
      </ul>
    </header>
  );
}
