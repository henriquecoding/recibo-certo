import { Check, ShieldCheck, Lock, Flag } from "@/components/ui/Icons";
import Reveal from "@/components/ui/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion/Stagger";

const LINHAS: { label: string; excel: string; rc: string }[] = [
  { label: "Cálculo de IRS, SS e IVA", excel: "Manual, fácil de errar", rc: "Automático e verificado" },
  { label: "Taxas atualizadas de 2026", excel: "Atualizas à mão", rc: "Sempre atuais, com fonte" },
  { label: "Separar o teu dinheiro do Estado", excel: "Não faz", rc: "Automático" },
  { label: "Alertas de prazos fiscais", excel: "Não tem", rc: "Avisa-te a tempo" },
  { label: "Simulação de IRS anual", excel: "Quase impossível", rc: "Incluída" },
  { label: "Em qualquer dispositivo", excel: "Preso a um ficheiro", rc: "Na web, em qualquer lado" },
];

const CONFIANCA = [
  { icon: <ShieldCheck />, texto: "Taxas de 2026 com fonte oficial" },
  { icon: <Lock />, texto: "Os teus dados ficam contigo" },
  { icon: <Flag />, texto: "Feito para a lei portuguesa" },
];

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Comparacao() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mb-10 text-center">
          <div className="eyebrow mb-3 text-brand">Excel vs ReciboCerto</div>
          <h2 className="font-display display-2 text-balance font-semibold text-ink">
            A folha de cálculo que ninguém abre desde setembro.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-stone-500">
            O ReciboCerto faz o que o Excel nunca fez: dá-te tranquilidade.
          </p>
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-stone-100 bg-cream px-5 py-3 sm:gap-8 sm:px-7">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">O que precisas</span>
              <span className="w-20 text-center text-xs font-semibold uppercase tracking-wider text-stone-400 sm:w-28">Excel</span>
              <span className="w-20 text-center text-xs font-semibold uppercase tracking-wider text-brand sm:w-28">ReciboCerto</span>
            </div>
            <StaggerGroup>
              {LINHAS.map((l) => (
                <StaggerItem key={l.label}>
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-stone-50 px-5 py-4 last:border-0 sm:gap-8 sm:px-7">
                    <span className="text-sm font-medium text-stone-700">{l.label}</span>
                    <div className="flex w-20 flex-col items-center gap-1 sm:w-28">
                      <span className="text-stone-300"><XIcon /></span>
                      <span className="hidden text-center text-[11px] leading-tight text-stone-400 sm:block">{l.excel}</span>
                    </div>
                    <div className="flex w-20 flex-col items-center gap-1 sm:w-28">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"><Check size={14} /></span>
                      <span className="hidden text-center text-[11px] font-medium leading-tight text-brand-dark sm:block">{l.rc}</span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </Reveal>

        <Reveal className="mt-8">
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
