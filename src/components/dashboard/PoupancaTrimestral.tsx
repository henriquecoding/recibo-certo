"use client";

import { resumoDoTrimestre, type Recibo } from "@/lib/recibos-contrato";
import { fmt } from "@/lib/format";
import InfoTip from "@/components/ui/InfoTip";

const TRIMESTRES = ["1.º trimestre", "2.º trimestre", "3.º trimestre", "4.º trimestre"];

export default function PoupancaTrimestral({ recibos, ano }: { recibos: Recibo[]; ano: number }) {
  const agora = new Date();
  const tri = Math.floor(agora.getMonth() / 3);

  const resumo = resumoDoTrimestre(recibos, ano, tri);
  const reserva = { iva: resumo.ivaCobrado, ss: resumo.segurancaSocialEstimada };
  const total = reserva.iva + reserva.ss;

  return (
    <div className="flex flex-col rounded-4xl border-2 border-alert-border bg-alert-bg p-6">
      <h2 className="text-sm font-semibold text-alert-text">Reservar este trimestre</h2>
      <p className="mb-3 text-xs text-alert-text/70">{TRIMESTRES[tri]} de {ano}</p>
      <div className="font-display text-3xl font-semibold text-alert-text">{fmt(total)}</div>
      <div className="mt-4 space-y-1.5 text-sm">
        {/* «IVA cobrado», não «IVA a entregar»: o que se entrega é o cobrado
            menos o dedutível, e o produto ainda não regista despesas. Prometer
            o apuramento com metade dos dados era afirmar o que não se sabe
            (RC-P1-08). */}
        <div className="flex justify-between">
          <span className="inline-flex items-center gap-1 text-alert-text/80">
            IVA cobrado
            <InfoTip>
              É o IVA que liquidaste aos clientes — a reserva bruta. O valor a entregar ao Estado só se
              conhece depois de deduzir o IVA das tuas despesas e eventuais regularizações.
            </InfoTip>
          </span>
          <span className="font-semibold text-alert-text">{fmt(reserva.iva)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-alert-text/80">Segurança Social</span>
          <span className="font-semibold text-alert-text">{fmt(reserva.ss)}</span>
        </div>
      </div>
    </div>
  );
}
