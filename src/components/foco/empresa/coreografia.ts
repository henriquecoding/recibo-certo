// ═══════════════════════════════════════════════════════════════════════
//  «O PONTO DE VIRAGEM» — a coreografia do foco da empresa
//  ---------------------------------------------------------------------
//  Verbo: VIRAR. A resposta à pergunta «compensa abrir empresa?» é
//  «depende», e o «de quê» é um número — que dá para mostrar.
//
//  ── Duas linhas a crescerem ao mesmo tempo, e é deliberado ───────────
//
//  A regra geral da casa é que dois acontecimentos importantes não se
//  sobrepõem. Aqui as duas linhas movem-se em simultâneo, à mesma
//  velocidade, na mesma direção — destino comum na sua forma mais pura —
//  porque são a MESMA pergunta com duas respostas. E o acontecimento não é
//  nenhuma das duas chegar: é o CRUZAMENTO. Separá-las no tempo destruiria
//  a única coisa que este palco tem para dizer.
//
//  ── O ato 3 é o que impede a leitura fácil ──────────────────────────
//
//  Sem ele, «empresa» parece sempre melhor acima de um limiar qualquer.
//  Com ele — o contabilista, o IRC, a tributação dos dividendos a
//  afundarem a linha antes de ela subir — vê-se que há um fosso a
//  recuperar primeiro. É a diferença entre uma demonstração e um anúncio.
// ═══════════════════════════════════════════════════════════════════════

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
    rotulo: "O eixo",
    legenda: "Situar a faturação de que se está a falar",
    duracao: 2400,
    beats: [
      { id: "eixo", em: 0 },
      // As marcas acendem ao longo do desenrolar do eixo, não em bloco —
      // a mesma regra de congruência que as zonas da régua do preço
      // seguem: o eixo pinta-se a si próprio.
      { id: "marcas", em: 420 },
      { id: "marcador", em: 1200 },
      { id: "legenda", em: 1700 },
    ],
  },
  {
    id: "tracar",
    rotulo: "Os caminhos",
    legenda: "Traçar os dois caminhos lado a lado",
    duracao: 3200,
    beats: [
      { id: "abreLinhas", em: 0 },
      // `PASSO.uno`: as duas linhas não são dois acontecimentos. São a
      // mesma pergunta a receber duas respostas.
      { id: "linhaRV", em: 340 },
      { id: "linhaEmpresa", em: 430 },
      { id: "rotulos", em: 2000 },
      { id: "semCustos", em: 2500 },
    ],
  },
  {
    id: "custar",
    rotulo: "O custo",
    legenda: "Contar o que ter empresa custa antes de render",
    duracao: 2800,
    beats: [
      { id: "fichaCusto", em: 0 },
      { id: "afunda", em: 780 },
      { id: "detalhe", em: 1420 },
      { id: "fosso", em: 2100 },
    ],
  },
  {
    id: "virar",
    rotulo: "A viragem",
    legenda: "Encontrar o ponto em que os dois caminhos se cruzam",
    duracao: 3600,
    beats: [
      { id: "aproxima", em: 0 },
      { id: "cruza", em: 900 },
      { id: "acendeCruz", em: 1500 },
      { id: "valor", em: 1800 },
      { id: "ondeEstas", em: 2500 },
      { id: "resolve", em: 3100 },
    ],
  },
];

export const ULTIMO_ATO_EMPRESA = ATOS_EMPRESA.length - 1;
