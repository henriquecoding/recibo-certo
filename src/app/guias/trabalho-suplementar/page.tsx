import type { Metadata } from "next";
import Link from "next/link";
import { GuiaHero } from "@/components/guias/GuiaHero";
import { FontesGuia } from "@/components/guias/FontesGuia";
import { NotaDisclaimer } from "@/components/guias/NotaDisclaimer";
import InfoTip from "@/components/ui/InfoTip";
import {
  TRABALHO_SUPLEMENTAR,
  RETENCAO_SUPLEMENTAR_FATOR,
  HORARIO_SEMANAL_COMPLETO,
  AJUDAS_CUSTO,
} from "@/lib/fiscal-data";
import { pct, fmt } from "@/lib/format";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Trabalho suplementar (horas extra) 2026 | ReciboCerto",
  description: "Acréscimos do trabalho suplementar em 2026: dia útil, descanso e feriado. Retenção na fonte autónoma e limites legais.",
  keywords: ["trabalho suplementar 2026", "horas extra 2026", "acréscimos horas extra", "retenção horas extra"],
  alternates: { canonical: "https://www.recibocerto.pt/guias/trabalho-suplementar" },
  openGraph: {
    title: "Trabalho suplementar (horas extra) 2026 | ReciboCerto",
    description: "Acréscimos, retenção e limites do trabalho suplementar explicados.",
    url: "https://www.recibocerto.pt/guias/trabalho-suplementar",
    siteName: "ReciboCerto",
    locale: "pt_PT",
    type: "article",
  },
};

const FONTES = [
  { titulo: "Art. 268.º Código do Trabalho — Pagamento de trabalho suplementar", url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0268&nid=1047&tabela=leis", tipo: "oficial" as const },
  { titulo: "Art. 271.º CT — Cálculo da retribuição horária", url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0271&nid=1047&tabela=leis", tipo: "oficial" as const },
  { titulo: "Art. 228.º CT — Limites do trabalho suplementar", url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0228&nid=1047&tabela=leis", tipo: "oficial" as const },
  { titulo: "Doutor Finanças — Retenção sobre trabalho suplementar 2026", url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/rendimentos/retencao-na-fonte-sobre-trabalho-suplementar-alteracoes-e-beneficios-fiscais/", tipo: "referencia" as const },
  { titulo: "CRN Contabilidade — Horas extra 2026", url: "https://crncontabilidade.pt/blog/trabalho-suplementar-como-calcular-em-2026/", tipo: "referencia" as const },
];

const acrescimos = TRABALHO_SUPLEMENTAR.acrescimos.value;

const TABELA_ACRESCIMOS = [
  { situacao: "Dia útil, 1.ª hora (até 100h/ano)", acrescimo: acrescimos[0] },
  { situacao: "Dia útil, horas seguintes (até 100h/ano)", acrescimo: acrescimos[1] },
  { situacao: "Dia de descanso ou feriado / dia útil acima de 100h", acrescimo: acrescimos[2] },
  { situacao: "Dia de descanso ou feriado, acima de 100h/ano", acrescimo: acrescimos[3] },
];

export default function TrabalhoSuplementarPage() {
  return (
    <>
      <GuiaHero
        eyebrow="Guia · Conta de outrem"
        titulo="Trabalho suplementar: acréscimos e retenção em 2026"
        descricao="As horas extra são pagas com acréscimo sobre a retribuição horária. Desde 2026, a retenção na fonte é calculada de forma autónoma."
        tempoLeitura={5}
      />

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Fórmula da retribuição horária
          <InfoTip label="Art. 271.º CT">{HORARIO_SEMANAL_COMPLETO.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-3xl border border-brand bg-brand-light dark:bg-brand/10 p-5">
          <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
            (Salário mensal x 12) / (52 x {HORARIO_SEMANAL_COMPLETO.value}) = Retribuição horária
          </p>
          <p className="text-xs text-stone-500 mt-2">
            Horário semanal normal: {HORARIO_SEMANAL_COMPLETO.value} horas (Art. 203.º CT).
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Tabela de acréscimos
          <InfoTip label="Art. 268.º CT">{TRABALHO_SUPLEMENTAR.acrescimos.legalBasis}</InfoTip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="pb-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Situação</th>
                <th className="pb-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wide">Acréscimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {TABELA_ACRESCIMOS.map((row) => (
                <tr key={row.situacao}>
                  <td className="py-3 text-stone-600 dark:text-stone-400 pr-4">{row.situacao}</td>
                  <td className="py-3 text-right font-semibold text-brand">{pct(row.acrescimo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Redação da Lei 13/2023 (Agenda do Trabalho Digno), em vigor desde 2023.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Retenção na fonte autónoma (2026)
          <InfoTip label="Retenção suplementar">{RETENCAO_SUPLEMENTAR_FATOR.legalBasis}</InfoTip>
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
            Desde 2026, a retenção na fonte sobre o trabalho suplementar é calculada de forma autónoma:
          </p>
          <div className="rounded-xl bg-brand-light dark:bg-brand/10 px-4 py-3 mb-3">
            <p className="font-mono text-sm text-stone-700 dark:text-stone-300">
              Taxa de retenção = {pct(RETENCAO_SUPLEMENTAR_FATOR.value)} x taxa efetiva mensal de IRS
            </p>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Isto significa que as horas extra são retidas a metade da taxa normal, tornando a tributação mais favorável do que o regime anterior.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Limites legais
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Limite anual</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">150 horas/ano</p>
            <p className="text-xs text-stone-500 mt-1">Art. 228.º CT (microempresa: 175h)</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs font-semibold text-brand mb-1">Limite diário</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">2 horas/dia</p>
            <p className="text-xs text-stone-500 mt-1">Em dia normal de trabalho (Art. 228.º CT)</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Ajudas de custo: limites isentos 2026
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Nacional (por dia)</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(AJUDAS_CUSTO.nacionalDia.value)}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <p className="text-xs text-stone-400 mb-1">Estrangeiro (por dia)</p>
            <p className="font-display text-xl font-semibold text-brand">{fmt(AJUDAS_CUSTO.estrangeiroDia.value)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Valores isentos de IRS e SS se pagos nos termos legais. Excedente é tributado.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Segurança Social sobre horas extra
        </h2>
        <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            O trabalho suplementar está sujeito a contribuições para a Segurança Social (11% trabalhador + 23,75% entidade empregadora), tal como o salário base.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100 mb-4">
          Próximos passos
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/guias/recibo-vencimento" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Como ler o recibo de vencimento <ArrowRight size={13} />
          </Link>
          <Link href="/ferramentas/recibo-vencimento" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-brand hover:text-brand transition-all">
            Simular recibo de vencimento <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <FontesGuia fontes={FONTES} />
      <NotaDisclaimer />
    </>
  );
}
