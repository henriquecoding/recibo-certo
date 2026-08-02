// Cenário do mapa: seis recibos de 2026, três clientes, dois com IVA e um
// isento — o suficiente para exercitar as bases todas e a concentração.
//
// Como no relatório de vencimento, todos os números saem do motor
// (`calcularRecibo`), nunca escritos à mão.

import { criarProveniencia } from "../src/lib/export/referencia";
import type { DocumentoRecibos } from "../src/lib/export/documento-recibos";
import type { Recibo } from "../src/lib/store/recibos";

export const JSON_EXEMPLO_RECIBOS = "src/documentos/recibos-exemplo.json";

const base = {
  tipo: "art151" as const,
  regiao: "continente" as const,
  regimeIVA: "normal" as const,
  baseSS: "servicos" as const,
  dispensaRetencao: false,
};

export const RECIBOS_EXEMPLO: Recibo[] = [
  { id: "r1", data: "2026-01-15", cliente: "Câmara Municipal de Aveiro", valor: 4_200, ...base },
  { id: "r2", data: "2026-02-12", cliente: "Nortada Studio", valor: 1_850, ...base },
  { id: "r3", data: "2026-03-03", cliente: "Câmara Municipal de Aveiro", valor: 4_200, ...base },
  { id: "r4", data: "2026-04-21", cliente: "Fundação Rio Vivo", valor: 950, ...base, regimeIVA: "isento" },
  { id: "r5", data: "2026-05-09", cliente: "Nortada Studio", valor: 2_300, ...base },
  { id: "r6", data: "2026-06-30", cliente: "Câmara Municipal de Aveiro", valor: 3_600, ...base },
];

export async function construirMapaExemplo(): Promise<DocumentoRecibos> {
  return {
    periodo: "Janeiro a Junho de 2026",
    proveniencia: await criarProveniencia("recibos", { RECIBOS_EXEMPLO }, new Date("2026-08-01T12:00:00Z")),
    recibos: RECIBOS_EXEMPLO,
    filtros: [
      { rotulo: "Período", valor: "1 de janeiro a 30 de junho de 2026" },
      { rotulo: "Estado", valor: "Todos os recibos guardados" },
      { rotulo: "Região fiscal", valor: "Continente" },
    ],
    ambito: [
      "Lista os recibos guardados na aplicação, não os comunicados ao Portal das Finanças.",
      "A retenção na fonte indicada é a do recibo; o IRS final apura-se na declaração anual.",
      "A Segurança Social mostrada é a contribuição estimada sobre a base declarada.",
      "Não substitui a fatura-recibo emitida no Portal das Finanças.",
    ],
  };
}
