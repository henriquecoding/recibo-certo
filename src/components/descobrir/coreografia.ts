// A mecânica — curvas, avaliador de Bézier, escalas de duração e medição —
// vive em `components/palco/`, partilhada com o palco do preço. Estava
// duplicada byte a byte nos dois sítios, e já tinha começado a divergir:
// `ASSENTA` tinha 1,42 aqui e 1,56 lá. A reconciliação ficou em 1,42.
export {
  ENTRADA,
  SAIDA,
  VIAGEM,
  ASSENTA,
  DUR,
  bezier,
  entre,
  type Curva,
} from "@/components/palco/curvas";
export { medir, arco, type Ponto } from "@/components/palco/medida";

export interface BeatDescobrir {
  id: string;
  em: number;
}

export interface AtoDescobrir {
  id: string;
  rotulo: string;
  legenda: string;
  duracao: number;
  beats: BeatDescobrir[];
}

/**
 * A linha temporal corresponde, beat por beat, ao roteiro em
 * `docs/design/roteiro-animacao-descobrir.md`.
 */
export const ATOS_DESCOBRIR: AtoDescobrir[] = [
  {
    id: "contexto",
    rotulo: "Contexto",
    legenda: "Ler capacidades e disponibilidade sem as transformar numa identidade",
    duracao: 3000,
    beats: [
      { id: "abreEntrada", em: 0 },
      { id: "enviaCompetencia", em: 220 },
      { id: "enviaDados", em: 520 },
      { id: "enviaTempo", em: 820 },
      { id: "contextoLido", em: 2300 },
    ],
  },
  {
    id: "fronteiras",
    rotulo: "Fronteiras",
    legenda: "Eliminar padrões incompatíveis antes de ordenar o que sobra",
    duracao: 3200,
    beats: [
      { id: "abreFronteiras", em: 0 },
      { id: "enviaStock", em: 280 },
      { id: "enviaDisponibilidade", em: 680 },
      { id: "enviaEquipa", em: 1080 },
      { id: "sobrevivente", em: 2200 },
    ],
  },
  {
    id: "evidencia",
    rotulo: "Evidência",
    legenda: "Separar o que uma fonte observou do que ainda exige prova local",
    duracao: 3500,
    beats: [
      { id: "abreEvidencia", em: 0 },
      { id: "enviaFonte", em: 260 },
      { id: "abreLacunas", em: 1260 },
      { id: "enviaProva", em: 1900 },
    ],
  },
  {
    id: "hipotese",
    rotulo: "Hipótese",
    legenda: "Compor uma hipótese com primeiro teste e critério para a rejeitar",
    duracao: 4100,
    beats: [
      { id: "preparaHipotese", em: 0 },
      { id: "enviaHipotese", em: 360 },
      { id: "mostraModelo", em: 1720 },
      { id: "mostraTeste", em: 2160 },
      { id: "mostraCriterio", em: 2780 },
      { id: "conclui", em: 3500 },
    ],
  },
];

export const ULTIMO_ATO_DESCOBRIR = ATOS_DESCOBRIR.length - 1;

/**
 * O relógio dos atos vive em `components/palco/relogio.ts`. Este alias
 * mantém o nome que o palco de «Descobrir» já usa.
 */
export { useRelogioDeAtos as useCoreografiaDescobrir } from "@/components/palco/relogio";
export type { Relogio as CoreografiaDescobrir } from "@/components/palco/relogio";

