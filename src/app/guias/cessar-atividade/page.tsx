import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import Badge from "@/components/ui/Badge";
import { Close } from "@/components/ui/Icons";

export const metadata: Metadata = metadataDoGuia("cessar-atividade");

const PASSOS = [
  "Acede a portaldasfinancas.gov.pt e inicia sessão",
  "Cidadãos → Serviços → Atividade → Submeter declarações",
  "Seleciona \"Cessação de atividade\"",
  "Preenche a data de cessação e o motivo",
  "Valida, submete e guarda o comprovativo",
];

export default function CessarAtividadePage() {
  return (
    <GuiaLayout slug="cessar-atividade">

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Quando fechar
        </h2>
        <div className="space-y-3 text-sm text-stone-600 dark:text-stone-400">
          <p>Quando deixares definitivamente de passar recibos verdes. O prazo é de <strong className="text-stone-800 dark:text-stone-100">30 dias</strong> após o último dia de atividade.</p>
          <p>Não fechar equivale a continuar em atividade para todos os efeitos legais e fiscais.</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Consequências de NÃO fechar
        </h2>
        <div className="rounded-3xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 p-5">
          <ul className="space-y-3">
            {[
              "A AT considera-te ainda em atividade",
              "Obrigatório entregar Anexo B no IRS anual (mesmo sem rendimentos)",
              "Obrigatório manter declarações trimestrais à Segurança Social",
              "Coimas AT: 600 € a 7 500 € por incumprimento (Art. 33.º CIVA)",
              "Coimas SS: 50 € a 250 € por declaração em falta",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                <Close size={14} className="mt-0.5 shrink-0 text-clay-text" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Como fechar — passo a passo online
        </h2>
        <div className="space-y-3">
          {PASSOS.map((passo, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-stone-600 dark:text-stone-400 pt-1">{passo}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Impactos após a cessação
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Segurança Social</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">A AT comunica automaticamente à SS. As contribuições cessam no 1.º dia do mês seguinte à data de cessação.</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">IRS</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">No ano seguinte, declaras a cessação no Anexo B, Quadro 14 da declaração de IRS.</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">IVA (regime normal)</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">Tens de entregar a última declaração periódica de IVA.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Posso reabrir depois?
        </h2>
        <div className="rounded-2xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Sim, sem limite de vezes. Contudo, se reabrir dentro de 12 meses após a cessação, a isenção de SS do 1.º ano <strong>não se repete</strong>.
          </p>
        </div>
      </section>

    </GuiaLayout>
  );
}
