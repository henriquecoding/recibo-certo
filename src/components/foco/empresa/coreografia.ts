// ═══════════════════════════════════════════════════════════════════════
//  «O PONTO DE VIRAGEM» — a coreografia do foco da empresa
//  ---------------------------------------------------------------------
//  Verbo: VIRAR. A resposta à pergunta «compensa abrir empresa?» é
//  «depende», e o «de quê» é um número — que dá para mostrar.
//
//  ── O que esta coreografia substituiu, e porquê ──────────────────────
//
//  A anterior traçava uma linha de diferença (`empresa − recibos verdes`)
//  a cruzar o zero, ponto a ponto, dentro de um `<svg>`. Era uma boa ideia
//  com três defeitos que só se veem a correr:
//
//   1. **A INTERAÇÃO estava avariada** — e era isso, e não o custo de
//      desenho, o que se sentia. O `<input type="range">` do seletor não
//      respondia a toque nenhum num telemóvel (medido: o valor não se
//      mexia nem com um toque nem com um arrasto de dedo), e uma exceção
//      de `setPointerCapture` chegava a desmontar o palco a meio de um
//      gesto. O custo de render foi medido lado a lado, a 1×, 4× e 6× de
//      estrangulamento de CPU: as duas versões perdem a mesma proporção
//      de frames. A suspeita óbvia estava errada.
//   2. **A forma não era a forma da pergunta.** A pergunta é um LIMIAR —
//      «a partir de quanto?» —, e um limiar tem duas zonas e uma
//      fronteira. Uma curva a subir tem infinitos valores intermédios que
//      ninguém precisa de ler.
//   3. **Precisava de espaço DEPOIS do cruzamento** para se ler como
//      cruzamento, e isso obrigava a escolher o teto do eixo pela estética
//      em vez de pelo domínio da pergunta. Uma barra com um corte não tem
//      esse problema: lê-se encostada à margem tal como no meio.
//
//  Fica o que a pergunta é: uma RÉGUA com uma fronteira marcada, e duas
//  COLUNAS repartidas que dizem para onde vai cada euro em cada caminho.
//  Ambas as peças existem e estão provadas no comparador de cenários — as
//  colunas de «para onde vai cada euro» e a régua com marcadores de
//  viragem. Reaproveitá-las não é poupança: é o mesmo gesto a responder à
//  mesma pergunta em dois sítios do site.
//
//  ── As duas colunas crescem ao mesmo tempo, e é deliberado ───────────
//
//  A regra geral da casa é que dois acontecimentos importantes não se
//  sobrepõem. Aqui as duas colunas crescem em simultâneo, à mesma
//  velocidade, na mesma direção — destino comum na sua forma mais pura —
//  porque são a MESMA faturação a ser repartida de duas maneiras. O
//  acontecimento não é nenhuma delas chegar: é a DIFERENÇA entre as duas
//  fatias verdes. Separá-las no tempo destruiria a comparação.
//
//  ── O ato 3 é o que impede a leitura fácil ──────────────────────────
//
//  Sem ele, «empresa» parece só uma coluna com mais impostos. Com ele — a
//  contabilidade isolada, acesa sozinha enquanto tudo o resto baixa — vê-se
//  que há um custo fixo que existe antes do primeiro euro de imposto e que
//  a faturação tem de recuperar primeiro. É a diferença entre uma
//  demonstração e um anúncio.
//
//  Isolar em vez de acrescentar também tem uma razão de exatidão: a fatia
//  já lá está desde o ato 2, porque a conta que a produziu já a descontou.
//  Fazê-la «entrar» mais tarde obrigaria a desenhar antes uma sociedade
//  sem contabilista — um cenário que não existe e que o palco passaria a
//  afirmar durante três segundos.
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
    rotulo: "O cenário",
    legenda: "Situar a faturação de que se está a falar",
    duracao: 2400,
    beats: [
      { id: "regua", em: 0 },
      { id: "valor", em: 340 },
      // `PASSO.irmao`: a escala é parte da régua, não um segundo aviso.
      { id: "escala", em: 500 },
      // A faixa do domínio entra NEUTRA. Ainda não tem lados — os lados
      // são a resposta, e a resposta é o ato 4.
      { id: "dominio", em: 1500 },
    ],
  },
  {
    id: "repartir",
    rotulo: "Cada euro",
    legenda: "Repartir a mesma faturação pelos dois caminhos",
    duracao: 3000,
    beats: [
      { id: "colunas", em: 0 },
      // Uma transição de CSS, não um relógio: as fatias vão de 0% à sua
      // quota e o browser trata do resto. Ver o cabeçalho acima.
      { id: "sobe", em: 220 },
      { id: "rotulos", em: 1800 },
      { id: "liquidos", em: 2200 },
    ],
  },
  {
    id: "custar",
    rotulo: "O custo",
    legenda: "Isolar o que ter empresa custa antes de render",
    duracao: 2600,
    beats: [
      { id: "isola", em: 0 },
      { id: "acende", em: 420 },
      { id: "ficha", em: 900 },
      { id: "fosso", em: 1700 },
    ],
  },
  {
    id: "virar",
    rotulo: "A viragem",
    legenda: "Encontrar a faturação a partir da qual a conta se inverte",
    duracao: 3200,
    beats: [
      // A faixa PARTE-SE: a mesma barra que era uma passa a ser duas. É o
      // único momento em que o desenho muda de estrutura, e é o momento
      // que dá nome ao palco.
      { id: "parte", em: 0 },
      { id: "marca", em: 760 },
      { id: "valor", em: 1200 },
      { id: "veredicto", em: 2100 },
      { id: "resolve", em: 2800 },
    ],
  },
];

export const ULTIMO_ATO_EMPRESA = ATOS_EMPRESA.length - 1;
