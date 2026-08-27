// «A CONFERÊNCIA» — verbo: CONFERIR.
//
// Um bruto comum abre em dois recibos. A varredura confirma primeiro a
// Segurança Social e só depois isola o IRS; a projeção anual nasce da linha
// divergente e é apresentada como hipótese, não como facto consumado.

export {
  ENTRADA,
  SAIDA,
  VIAGEM,
  ASSENTA,
  DUR,
  PASSO,
  bezier,
  dwell,
  entre,
  type Curva,
} from "@/components/palco/curvas";
export { medir, arco, type Ponto } from "@/components/palco/medida";
export { useRelogioDeAtos, type Ato, type Beat } from "@/components/palco/relogio";

import type { Ato } from "@/components/palco/relogio";

export const ATOS_SALARIO: Ato[] = [
  {
    id: "receber",
    rotulo: "O recibo",
    legenda: "Ler a conta que foi processada",
    duracao: 2500,
    beats: [
      { id: "origem", em: 0 },
      { id: "recibo", em: 300 },
      { id: "linhaSS", em: 720 },
      { id: "linhaIRS", em: 900 },
      { id: "liquidoRecibo", em: 1550 },
    ],
  },
  {
    id: "refazer",
    rotulo: "A conta",
    legenda: "Refazer o recibo com o dependente declarado",
    duracao: 2800,
    beats: [
      { id: "recalculo", em: 0 },
      { id: "calcSS", em: 420 },
      { id: "calcIRS", em: 650 },
      { id: "liquidoCerto", em: 1450 },
    ],
  },
  {
    id: "inspecionar",
    rotulo: "A inspeção",
    legenda: "Percorrer as linhas e isolar a divergência",
    duracao: 2800,
    beats: [
      { id: "varre", em: 0 },
      { id: "ssBate", em: 850 },
      { id: "irsFalha", em: 1450 },
      { id: "delta", em: 2050 },
    ],
  },
  {
    id: "explicar",
    rotulo: "O impacto",
    legenda: "Explicar a tabela e projetar a repetição do erro",
    duracao: 3300,
    beats: [
      { id: "causa", em: 0 },
      { id: "motivo", em: 480 },
      { id: "pagamentos", em: 1050 },
      { id: "total", em: 1850 },
      { id: "resolve", em: 2550 },
    ],
  },
];

export const ULTIMO_ATO_SALARIO = ATOS_SALARIO.length - 1;
