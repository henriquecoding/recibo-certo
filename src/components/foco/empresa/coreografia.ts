// «O PONTO DE VIRAGEM» — verbo: VIRAR.
//
// A régua situa um cenário. A curva responde à pergunta em todo o domínio.
// O custo não deforma a linha por relógio React: surge como a distância
// entre a conta real e um contrafactual recalculado sem contabilidade.

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

export const ATOS_EMPRESA: Ato[] = [
  {
    id: "situar",
    rotulo: "O cenário",
    legenda: "Escolher a faturação anual na régua",
    duracao: 2300,
    beats: [
      { id: "regua", em: 0 },
      { id: "valor", em: 320 },
      { id: "escala", em: 560 },
      { id: "dominio", em: 1350 },
    ],
  },
  {
    id: "tracar",
    rotulo: "A curva",
    legenda: "Traçar quanto a sociedade deixa a mais ou a menos",
    duracao: 3100,
    beats: [
      { id: "grafico", em: 0 },
      { id: "traca", em: 280 },
      { id: "pinta", em: 1250 },
      { id: "leitura", em: 1850 },
    ],
  },
  {
    id: "custar",
    rotulo: "O custo",
    legenda: "Mostrar o efeito real da contabilidade",
    duracao: 2800,
    beats: [
      { id: "contrafactual", em: 0 },
      { id: "fosso", em: 700 },
      { id: "ficha", em: 1150 },
      { id: "explica", em: 1750 },
    ],
  },
  {
    id: "virar",
    rotulo: "A viragem",
    legenda: "Marcar onde a curva cruza o zero",
    duracao: 3200,
    beats: [
      { id: "parte", em: 0 },
      { id: "marca", em: 620 },
      { id: "valor", em: 1050 },
      { id: "veredicto", em: 1750 },
      { id: "resolve", em: 2450 },
    ],
  },
];

export const ULTIMO_ATO_EMPRESA = ATOS_EMPRESA.length - 1;
