"use client";

import { calcularReciboDashboard, type Recibo } from "@/lib/store/recibos";
import { fmt } from "@/lib/format";

const TRIMESTRES = ["1.º trimestre", "2.º trimestre", "3.º trimestre", "4.º trimestre"];

export default function PoupancaTrimestral({ recibos }: { recibos: Recibo[] }) {
  const agora = new Date();
  const ano = agora.getFullYear();
  const tri = Math.floor(agora.getMonth() / 3);

  const doTrimestre = recibos.filter((r) => {
    const d = new Date(r.data + "T00:00:00");
    return d.getFullYear() === ano && Math.floor(d.getMonth() / 3) === tri;
  });

  const reserva = doTrimestre.reduce(
    (acc, r) => {
      const c = calcularReciboDashboard(r);
      acc.iva += c.iva;
      acc.ss += c.segSocial;
      return acc;
    },
    { iva: 0, ss: 0 }
  );
  const total = reserva.iva + reserva.ss;

  return (
    <div className="flex flex-col rounded-4xl border-2 border-alert-border bg-alert-bg p-6">
      <h2 className="text-sm font-semibold text-alert-text">Reservar este trimestre</h2>
      <p className="mb-3 text-xs text-alert-text/70">{TRIMESTRES[tri]} de {ano}</p>
      <div className="font-display text-3xl font-semibold text-alert-text">{fmt(total)}</div>
      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-alert-text/80">IVA a entregar</span>
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
