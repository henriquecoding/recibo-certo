import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import InfoTip from "@/components/ui/InfoTip";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = metadataDoGuia("clientes-estrangeiros");

export default function ClientesEstrangeirosPage() {
  return (
    <GuiaLayout slug="clientes-estrangeiros">

      <section className="mb-10">
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-stone-400 mb-1">NÃO muda</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">Continuas a ter obrigações fiscais e de SS em Portugal (se aqui resides). Rendimentos de fonte <strong>portuguesa</strong> declaras no Anexo B; rendimentos de fonte <strong>estrangeira</strong> declaras no <strong>Anexo J</strong> do IRS.</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">MUDA</p>
            <p className="text-sm text-stone-600 dark:text-stone-400">As regras de IVA dependem do país e do tipo de cliente. Não há retenção na fonte pelo cliente estrangeiro.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Retenção na fonte → Zero
        </h2>
        <div className="rounded-2xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Clientes estrangeiros não têm obrigação de reter IRS português. <strong>Recebes o valor total do recibo.</strong> Declararás esses rendimentos normalmente no IRS português na declaração anual.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          IVA consoante o tipo de cliente
          <InfoTip label="Art. 6.º CIVA">Art. 6.º CIVA — localização das prestações de serviços</InfoTip>
        </h2>
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="brand">Empresa UE com NIF VIES válido (B2B)</Badge>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              IVA = 0 € — aplica autoliquidação. Menção obrigatória na fatura: <span className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">M40 — autoliquidação pelo adquirente</span>
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="neutral">Empresa fora da UE</Badge>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              IVA = 0 € — serviço fora do território nacional. Menção: <span className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">M06 — fora do território nacional</span>
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="neutral">Particular UE sem NIF (B2C)</Badge>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              IVA português normal (23%/13%/6%). Sem autoliquidação — cobras o IVA e entregas à AT.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Validar o NIF VIES do cliente
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Valida o NIF europeu em{" "}
            <a href="https://ec.europa.eu/taxation_customs/vies" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              ec.europa.eu/taxation_customs/vies
            </a>{" "}
            e guarda o resultado como prova de boa-fé. Se o NIF for inválido na data da fatura, não podes aplicar autoliquidação.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Declaração Recapitulativa
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Obrigatória ao prestares serviços B2B a clientes UE. Entrega trimestral (ou mensal se volume {">"} 50 000 €) no Portal das Finanças → Declarações → Declaração Recapitulativa.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          O limite de {fmt(IVA_ISENCAO_LIMITE.value)} inclui faturação estrangeira
          <InfoTip label="Art. 53.º CIVA">{IVA_ISENCAO_LIMITE.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-2xl border border-clay-text/30 bg-clay-bg dark:bg-red-950/30 px-5 py-4">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Exemplo: 10 000 € faturados a clientes alemães + 6 000 € a clientes portugueses = 16 000 € total. Ultrapassaste o limite de isenção de IVA, mesmo que a faturação nacional esteja abaixo de {fmt(IVA_ISENCAO_LIMITE.value)}.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Anular recibos a clientes estrangeiros
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Não é possível anular diretamente no Portal das Finanças se o NIF for estrangeiro. Contacta a AT para regularização.
          </p>
        </div>
      </section>

    </GuiaLayout>
  );
}
