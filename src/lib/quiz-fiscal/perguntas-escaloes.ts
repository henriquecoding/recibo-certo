import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_ESCALOES: QuizPergunta[] = [
  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 1 — até 8.342 EUR, 12,5%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-10",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do 1.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "12,5%",
        porque:
          "Correto. O 1.º escalão (rendimento coletável até 8.342 EUR) tem uma taxa marginal de 12,5%, a mais baixa da tabela do Art. 68.º CIRS.",
      },
      {
        texto: "13,0%",
        porque:
          "Não existe nenhum escalão com taxa de 13%. A taxa do 1.º escalão e 12,5%.",
      },
      {
        texto: "14,5%",
        porque:
          "14,5% é uma taxa de IRS que não corresponde a nenhum escalão em vigor. O 1.º escalão aplica 12,5%.",
      },
      {
        texto: "15,7%",
        porque:
          "15,7% é a taxa do 2.º escalão, não do 1.º. O 1.º escalão tem taxa de 12,5%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º, n.º 1 CIRS — tabela de taxas gerais 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-11",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Até que valor de rendimento coletável se aplica o 1.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "7.703 EUR",
        porque:
          "Este era o limite do 1.º escalão em anos anteriores. Em 2026, o limite foi atualizado para 8.342 EUR.",
      },
      {
        texto: "8.342 EUR",
        porque:
          "Correto. O 1.º escalão de IRS em 2026 abrange o rendimento coletável até 8.342 EUR, com taxa de 12,5%.",
      },
      {
        texto: "9.000 EUR",
        porque:
          "Não existe nenhum escalão com limite de 9.000 EUR. O 1.º escalão vai até 8.342 EUR.",
      },
      {
        texto: "10.000 EUR",
        porque:
          "O limite do 1.º escalão não é um número redondo. Em 2026, é de 8.342 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 1.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-12",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Se um contribuinte tem exatamente 8.342 EUR de rendimento coletável, quanto paga de IRS (antes de deduções a coleta)?",
    opcoes: [
      {
        texto: "1.042,75 EUR",
        porque:
          "Correto. 8.342 EUR x 12,5% = 1.042,75 EUR. Todo o rendimento cai no 1.º escalão.",
      },
      {
        texto: "1.251,30 EUR",
        porque:
          "Este valor não corresponde a nenhum cálculo correto com a taxa de 12,5%.",
      },
      {
        texto: "963,00 EUR",
        porque:
          "Valor incorreto. A conta correta e 8.342 x 0,125 = 1.042,75 EUR.",
      },
      {
        texto: "1.100,00 EUR",
        porque:
          "Valor incorreto. 8.342 x 12,5% = 1.042,75 EUR, não 1.100 EUR.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — cálculo sobre o 1.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 2 — até 12.587 EUR, 15,7%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-13",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do 2.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "12,5%",
        porque:
          "12,5% é a taxa do 1.º escalão, não do 2.º.",
      },
      {
        texto: "18,0%",
        porque:
          "Não existe escalão com taxa de 18%. O 2.º escalão tem taxa de 15,7%.",
      },
      {
        texto: "15,7%",
        porque:
          "Correto. O 2.º escalão (de 8.342 EUR até 12.587 EUR) tem taxa marginal de 15,7%.",
      },
      {
        texto: "21,2%",
        porque:
          "21,2% é a taxa do 3.º escalão, não do 2.º.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 2.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-14",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Quanto imposto incide apenas sobre a porção do 2.º escalão (de 8.342 EUR a 12.587 EUR)?",
    opcoes: [
      {
        texto: "766,47 EUR",
        porque:
          "Valor incorreto. A porção do 2.º escalão e 4.245 EUR x 15,7% = 666,47 EUR.",
      },
      {
        texto: "666,47 EUR",
        porque:
          "Correto. A amplitude do 2.º escalão e 12.587 - 8.342 = 4.245 EUR. 4.245 x 15,7% = 666,47 EUR.",
      },
      {
        texto: "1.976,16 EUR",
        porque:
          "Este valor parece aplicar a taxa de 15,7% ao total de 12.587 EUR, ignorando que o 1.º escalão tem taxa própria.",
      },
      {
        texto: "531,56 EUR",
        porque:
          "Valor incorreto. O cálculo correto: (12.587 - 8.342) x 15,7% = 666,47 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — cálculo progressivo do 2.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-15",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Um contribuinte solteiro tem rendimento coletável de 12.587 EUR. Qual o imposto total (antes de deduções a coleta)?",
    opcoes: [
      {
        texto: "1.976,16 EUR",
        porque:
          "Este valor resultaria de aplicar uma única taxa de 15,7% a todo o rendimento, mas o IRS é progressivo.",
      },
      {
        texto: "1.573,38 EUR",
        porque:
          "Valor incorreto. A soma correta e 1.042,75 + 666,47 = 1.709,22 EUR.",
      },
      {
        texto: "1.709,22 EUR",
        porque:
          "Correto. 1.º escalão: 8.342 x 12,5% = 1.042,75. 2.º escalão: (12.587 - 8.342) x 15,7% = 666,47. Total = 1.709,22 EUR.",
      },
      {
        texto: "2.012,50 EUR",
        porque:
          "Valor incorreto. A conta progressiva correta soma 1.042,75 + 666,47 = 1.709,22 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º CIRS — cálculo cumulativo até ao 2.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 3 — até 17.838 EUR, 21,2%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-16",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal aplicável ao 3.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "24,1%",
        porque:
          "24,1% é a taxa do 4.º escalão. O 3.º escalão tem taxa de 21,2%.",
      },
      {
        texto: "21,2%",
        porque:
          "Correto. O 3.º escalão (de 12.587 EUR a 17.838 EUR) tem taxa marginal de 21,2%.",
      },
      {
        texto: "20,0%",
        porque:
          "Não existe escalão com taxa de 20%. O 3.º escalão aplica 21,2%.",
      },
      {
        texto: "15,7%",
        porque:
          "15,7% é a taxa do 2.º escalão, não do 3.º.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 3.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-17",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Qual é o limite superior do 3.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "15.000 EUR",
        porque:
          "Não existe escalão com limite de 15.000 EUR. O 3.º escalão vai até 17.838 EUR.",
      },
      {
        texto: "17.838 EUR",
        porque:
          "Correto. O 3.º escalão abrange rendimento coletável de 12.587 EUR a 17.838 EUR.",
      },
      {
        texto: "19.696 EUR",
        porque:
          "Este valor não corresponde a nenhum limite de escalão. O 3.º vai até 17.838 EUR.",
      },
      {
        texto: "20.261 EUR",
        porque:
          "Valor de escalões de anos anteriores. Em 2026, o 3.º escalão vai até 17.838 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º, n.º 1 CIRS — limites do 3.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 4 — até 23.089 EUR, 24,1%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-18",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "No 4.º escalão de IRS em 2026, qual é a taxa marginal aplicável?",
    opcoes: [
      {
        texto: "21,2%",
        porque:
          "21,2% é a taxa do 3.º escalão. O 4.º escalão aplica 24,1%.",
      },
      {
        texto: "25,0%",
        porque:
          "Não existe escalão com taxa de 25%. O 4.º escalão tem 24,1%.",
      },
      {
        texto: "31,1%",
        porque:
          "31,1% é a taxa do 5.º escalão, não do 4.º.",
      },
      {
        texto: "24,1%",
        porque:
          "Correto. O 4.º escalão (de 17.838 EUR a 23.089 EUR) tem taxa marginal de 24,1%.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 4.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-19",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Qual é o limite superior de rendimento coletável do 4.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "23.089 EUR",
        porque:
          "Correto. O 4.º escalão vai de 17.838 EUR a 23.089 EUR, com taxa de 24,1%.",
      },
      {
        texto: "22.000 EUR",
        porque:
          "Valor redondo que não corresponde a nenhum limite de escalão. O 4.º vai até 23.089 EUR.",
      },
      {
        texto: "25.075 EUR",
        porque:
          "Este não é um limite de escalão vigente. O 4.º escalão termina em 23.089 EUR.",
      },
      {
        texto: "20.700 EUR",
        porque:
          "Valor desatualizado. Em 2026, o 4.º escalão vai até 23.089 EUR.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º, n.º 1 CIRS — limites do 4.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 5 — até 29.397 EUR, 31,1%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-20",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do 5.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "28,5%",
        porque:
          "Não existe escalão com taxa de 28,5% em 2026. O 5.º escalão aplica 31,1%.",
      },
      {
        texto: "34,9%",
        porque:
          "34,9% é a taxa do 6.º escalão. O 5.º escalão tem 31,1%.",
      },
      {
        texto: "24,1%",
        porque:
          "24,1% é a taxa do 4.º escalão, não do 5.º.",
      },
      {
        texto: "31,1%",
        porque:
          "Correto. O 5.º escalão (de 23.089 EUR a 29.397 EUR) tem taxa marginal de 31,1%.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 5.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-21",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O 5.º escalão de IRS em 2026 abrange rendimento coletável entre que valores?",
    opcoes: [
      {
        texto: "De 20.000 EUR a 28.000 EUR",
        porque:
          "Estes são valores redondos que não correspondem a limites reais de escalão.",
      },
      {
        texto: "De 23.089 EUR a 29.397 EUR",
        porque:
          "Correto. O 5.º escalão vai de 23.089 EUR (fim do 4.º) até 29.397 EUR.",
      },
      {
        texto: "De 17.838 EUR a 23.089 EUR",
        porque:
          "Este e o intervalo do 4.º escalão, não do 5.º.",
      },
      {
        texto: "De 29.397 EUR a 43.090 EUR",
        porque:
          "Este e o intervalo do 6.º escalão, não do 5.º.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º, n.º 1 CIRS — intervalo do 5.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 6 — até 43.090 EUR, 34,9%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-22",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do 6.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "31,1%",
        porque:
          "31,1% é a taxa do 5.º escalão. O 6.º escalão tem 34,9%.",
      },
      {
        texto: "34,9%",
        porque:
          "Correto. O 6.º escalão (de 29.397 EUR a 43.090 EUR) tem taxa marginal de 34,9%.",
      },
      {
        texto: "37,0%",
        porque:
          "Não existe escalão com taxa de 37%. O 6.º escalão aplica 34,9%.",
      },
      {
        texto: "43,1%",
        porque:
          "43,1% é a taxa do 7.º escalão, não do 6.º.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 6.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-23",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Até que valor de rendimento coletável se estende o 6.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "40.000 EUR",
        porque:
          "Valor redondo que não corresponde ao limite real. O 6.º escalão vai até 43.090 EUR.",
      },
      {
        texto: "46.566 EUR",
        porque:
          "Este é o limite do 7.º escalão, não do 6.º.",
      },
      {
        texto: "43.090 EUR",
        porque:
          "Correto. O 6.º escalão abrange rendimento coletável de 29.397 EUR a 43.090 EUR.",
      },
      {
        texto: "38.632 EUR",
        porque:
          "Valor desatualizado. Em 2026, o 6.º escalão vai até 43.090 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º, n.º 1 CIRS — limites do 6.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 7 — até 46.566 EUR, 43,1%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-24",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do 7.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "43,1%",
        porque:
          "Correto. O 7.º escalão (de 43.090 EUR a 46.566 EUR) tem taxa marginal de 43,1%.",
      },
      {
        texto: "40,0%",
        porque:
          "Não existe escalão com taxa de 40%. O 7.º escalão aplica 43,1%.",
      },
      {
        texto: "44,6%",
        porque:
          "44,6% é a taxa do 8.º escalão, não do 7.º.",
      },
      {
        texto: "34,9%",
        porque:
          "34,9% é a taxa do 6.º escalão. O 7.º escalão tem 43,1%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 7.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-25",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O 7.º escalão de IRS em 2026 é notavelmente estreito. Qual a sua amplitude (diferença entre limites)?",
    opcoes: [
      {
        texto: "3.476 EUR",
        porque:
          "Correto. De 43.090 a 46.566 = 3.476 EUR. É um dos escalões mais estreitos da tabela.",
      },
      {
        texto: "5.251 EUR",
        porque:
          "Está amplitude não corresponde a nenhum escalão. A do 7.º é apenas 3.476 EUR.",
      },
      {
        texto: "6.308 EUR",
        porque:
          "A amplitude do 5.º escalão e 6.308 EUR. A do 7.º é mais curta: 3.476 EUR.",
      },
      {
        texto: "10.000 EUR",
        porque:
          "O 7.º escalão e muito mais estreito — apenas 3.476 EUR de amplitude.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º, n.º 1 CIRS — amplitude do 7.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 8 — até 86.634 EUR, 44,6%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-26",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do 8.º escalão de IRS em 2026?",
    opcoes: [
      {
        texto: "43,1%",
        porque:
          "43,1% é a taxa do 7.º escalão. O 8.º tem 44,6%.",
      },
      {
        texto: "48,0%",
        porque:
          "48% é a taxa do 9.º e último escalão, não do 8.º.",
      },
      {
        texto: "44,6%",
        porque:
          "Correto. O 8.º escalão (de 46.566 EUR a 86.634 EUR) tem taxa marginal de 44,6%.",
      },
      {
        texto: "45,0%",
        porque:
          "Não existe escalão com taxa de 45%. O 8.º escalão aplica 44,6%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 8.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-27",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O 8.º escalão de IRS em 2026 vai de 46.566 EUR até que valor?",
    opcoes: [
      {
        texto: "80.000 EUR",
        porque:
          "Valor redondo incorreto. O 8.º escalão vai até 86.634 EUR.",
      },
      {
        texto: "86.634 EUR",
        porque:
          "Correto. O 8.º escalão abrange rendimento coletável de 46.566 EUR a 86.634 EUR.",
      },
      {
        texto: "75.009 EUR",
        porque:
          "Valor desatualizado. Em 2026, o 8.º escalão vai até 86.634 EUR.",
      },
      {
        texto: "100.000 EUR",
        porque:
          "O 8.º escalão não atinge os 100.000 EUR. Termina nos 86.634 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º, n.º 1 CIRS — limites do 8.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  ESCALAO 9 — acima de 86.634 EUR, 48,0%
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-28",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa marginal do último escalão de IRS (9.º) em 2026?",
    opcoes: [
      {
        texto: "50,0%",
        porque:
          "A taxa máxima em 2026 é 48%, não 50%. Não existe escalão com taxa de 50%.",
      },
      {
        texto: "44,6%",
        porque:
          "44,6% é a taxa do 8.º escalão. O 9.º e último escalão aplica 48%.",
      },
      {
        texto: "45,0%",
        porque:
          "Não existe escalão com taxa de 45%. O 9.º escalão tem 48%.",
      },
      {
        texto: "48,0%",
        porque:
          "Correto. O 9.º escalão aplica-se ao rendimento coletável acima de 86.634 EUR, com taxa de 48%.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 68.º, n.º 1 CIRS — 9.º escalão 2026",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-29",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A partir de que valor de rendimento coletável se aplica o 9.º (último) escalão de IRS?",
    opcoes: [
      {
        texto: "75.009 EUR",
        porque:
          "Valor desatualizado. Em 2026, o 9.º escalão começa acima de 86.634 EUR.",
      },
      {
        texto: "100.000 EUR",
        porque:
          "Valor incorreto. O 9.º escalão começa acima de 86.634 EUR, não de 100.000 EUR.",
      },
      {
        texto: "86.634 EUR",
        porque:
          "Correto. Acima de 86.634 EUR de rendimento coletável, aplica-se a taxa máxima de 48%.",
      },
      {
        texto: "80.000 EUR",
        porque:
          "Valor redondo incorreto. O 9.º escalão começa acima de 86.634 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º, n.º 1 CIRS — início do 9.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  NUMERO DE ESCALOES
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-30",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Quantos escalões de IRS existem em Portugal em 2026?",
    opcoes: [
      {
        texto: "7",
        porque:
          "Portugal tinha 7 escalões em anos anteriores, mas em 2026 são 9.",
      },
      {
        texto: "8",
        porque:
          "Proximo, mas incorreto. A tabela do Art. 68.º CIRS de 2026 tem 9 escalões.",
      },
      {
        texto: "10",
        porque:
          "Não existem 10 escalões. A tabela de 2026 tem exatamente 9.",
      },
      {
        texto: "9",
        porque:
          "Correto. Em 2026, a tabela do Art. 68.º CIRS prevê 9 escalões de rendimento coletável.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 68.º, n.º 1 CIRS — tabela de taxas 2026",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  TRIBUTACAO PROGRESSIVA — conceito
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-31",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Em Portugal, o IRS usa tributação progressiva. O que significa isto?",
    opcoes: [
      {
        texto: "Cada escalão aplica a sua taxa apenas ao rendimento que cai dentro desse intervalo",
        porque:
          "Correto. A progressividade significa que a taxa mais alta só incide sobre a fatia de rendimento que ultrapassa o escalão anterior, não sobre todo o rendimento.",
      },
      {
        texto: "A taxa do escalão mais alto aplica-se a todo o rendimento",
        porque:
          "Isto seria tributação proporcional (flat tax aplicada ao mais alto), não progressiva. Em Portugal, cada fatia é tributada a taxa do respetivo escalão.",
      },
      {
        texto: "Só paga imposto quem ganha acima de 50.000 EUR",
        porque:
          "Totalmente incorreto. O 1.º escalão começa em 0 EUR, e todos os rendimentos acima do mínimo de existência são tributados.",
      },
      {
        texto: "Todos os contribuintes pagam a mesma percentagem",
        porque:
          "Isto seria uma taxa única (flat tax). Portugal usa taxas progressivas crescentes por escalão.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — principio da progressividade",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-32",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A Maria tem rendimento coletável de 15.000 EUR. Qual é a sua taxa marginal e porque é diferente da taxa efetiva?",
    opcoes: [
      {
        texto: "Marginal: 21,2%. É diferente porque a taxa efetiva resulta do peso medio das taxas de todos os escalões atravessados",
        porque:
          "Correto. Com 15.000 EUR, a Maria está no 3.º escalão (taxa marginal 21,2%), mas a taxa efetiva é mais baixa porque os primeiros 8.342 EUR pagam 12,5% e os seguintes até 12.587 EUR pagam 15,7%.",
      },
      {
        texto: "Marginal: 21,2%. É igual a taxa efetiva",
        porque:
          "A taxa marginal e a efetiva só coincidem se todo o rendimento for tributado a mesma taxa, o que não acontece no sistema progressivo.",
      },
      {
        texto: "Marginal: 15,7%. Porque o rendimento ainda está no 2.º escalão",
        porque:
          "15.000 EUR ultrapassa o 2.º escalão (que vai até 12.587 EUR), estando já no 3.º escalão.",
      },
      {
        texto: "Marginal: 24,1%. Porque se arredonda para o escalão seguinte",
        porque:
          "Não existe arredondamento de escalões. A taxa marginal e a do escalão onde cai o último euro — neste caso, 21,2% (3.º escalão).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — taxa marginal vs. taxa efetiva",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-33",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Um contribuinte com rendimento coletável de 50.000 EUR tem taxa marginal de 44,6% (8.º escalão). A taxa efetiva sera aproximadamente:",
    opcoes: [
      {
        texto: "44,6%, igual a marginal",
        porque:
          "Seria assim apenas se toda a coleta fosse ao mesmo escalão. A taxa efetiva é sempre inferior a marginal (exceto no 1.º escalão).",
      },
      {
        texto: "Cerca de 30%, porque os escalões inferiores puxam a media para baixo",
        porque:
          "Correto. Os primeiros escalões (12,5%, 15,7%, 21,2%, etc.) reduzem significativamente a taxa media. O imposto até 50.000 EUR divide-se entre todos os escalões, resultando numa taxa efetiva bastante inferior a marginal.",
      },
      {
        texto: "Cerca de 48%, porque se aproxima do topo",
        porque:
          "48% é a taxa máxima do 9.º escalão. Com 50.000 EUR, nem sequer se atinge o 9.º escalão.",
      },
      {
        texto: "Cerca de 22%, porque Portugal tem impostos baixos",
        porque:
          "22% seria demasiado baixo para 50.000 EUR de rendimento coletável. A taxa efetiva situa-se mais perto de 30%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — diferença entre taxa marginal e taxa efetiva",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-34",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O Joao diz: 'Não quero ganhar mais porque vou subir de escalão é pagar mais imposto sobre tudo.' Está afirmação está correta?",
    opcoes: [
      {
        texto: "Sim, ao subir de escalão paga-se mais sobre todo o rendimento",
        porque:
          "Mito comum. A subida de escalão só aumenta a taxa sobre o rendimento que excede o limite — o rendimento abaixo continua a ser tributado as taxas anteriores.",
      },
      {
        texto: "Não. A taxa mais alta só se aplica a porção de rendimento que entra no novo escalão",
        porque:
          "Correto. Este é um dos maiores mitos fiscais. Se o Joao ganhar 1.000 EUR acima do limite de um escalão, só esses 1.000 EUR pagam a taxa mais alta. O resto mantém as taxas dos escalões inferiores.",
      },
      {
        texto: "Depende — se ultrapassar 50.000 EUR, paga a taxa máxima sobre tudo",
        porque:
          "Falso. A progressividade aplica-se a todos os níveis de rendimento, sem excecoes.",
      },
      {
        texto: "Sim, mas só para rendimentos acima de 86.634 EUR",
        porque:
          "A progressividade funciona da mesma forma em todos os escalões, não só acima de 86.634 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — principio da progressividade",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  MINIMO DE EXISTENCIA
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-35",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é o valor do mínimo de existência em 2026?",
    opcoes: [
      {
        texto: "10.640 EUR",
        porque:
          "Valor desatualizado. Com a RMMG de 920 EUR em 2026, o mínimo de existência e 12.880 EUR.",
      },
      {
        texto: "12.880 EUR",
        porque:
          "Correto. O mínimo de existência em 2026 é 920 EUR x 14 meses = 12.880 EUR (Art. 70.º CIRS).",
      },
      {
        texto: "14.000 EUR",
        porque:
          "O mínimo de existência não é 14.000 EUR. Em 2026, e 920 x 14 = 12.880 EUR.",
      },
      {
        texto: "11.480 EUR",
        porque:
          "Valor desatualizado. Com a RMMG atualizada para 920 EUR, o mínimo de existência subiu para 12.880 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 70.º CIRS — mínimo de existência",
    fonte: fonte("art70cirs"),
  },
  {
    id: "esc-36",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Como se calcula o mínimo de existência em 2026?",
    opcoes: [
      {
        texto: "IAS x 14",
        porque:
          "O mínimo de existência não se baseia no IAS, mas na Retribuicao Minima Mensal Garantida (RMMG).",
      },
      {
        texto: "RMMG x 14 = 920 EUR x 14 = 12.880 EUR",
        porque:
          "Correto. O mínimo de existência e 14 vezes a RMMG (920 EUR em 2026), garantindo que ninguem que receba o salario mínimo paga IRS.",
      },
      {
        texto: "RMMG x 12 = 920 EUR x 12 = 11.040 EUR",
        porque:
          "O multiplicador e 14 (inclui subsidio de ferias e Natal), não 12.",
      },
      {
        texto: "Salario mediano x 12",
        porque:
          "O mínimo de existência baseia-se na RMMG (salario mínimo), não no salario mediano.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 70.º CIRS — cálculo do mínimo de existência",
    fonte: fonte("art70cirs"),
  },
  {
    id: "esc-37",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O que garante o mínimo de existência na prática?",
    opcoes: [
      {
        texto: "Que ninguem com rendimento igual ou inferior a RMMG anual (12.880 EUR) tenha de pagar IRS",
        porque:
          "Correto. O mínimo de existência assegura que, depois de aplicadas deduções e imposto, o contribuinte fica sempre com pelo menos 12.880 EUR liquidos.",
      },
      {
        texto: "Que o 1.º escalão tenha taxa de 0%",
        porque:
          "O 1.º escalão tem taxa de 12,5%, não 0%. O mínimo de existência funciona de forma diferente — limita o imposto para que o rendimento liquido não fique abaixo de 12.880 EUR.",
      },
      {
        texto: "Que todos os trabalhadores recebam pelo menos 12.880 EUR",
        porque:
          "O mínimo de existência é uma proteção fiscal, não uma garantia salarial. Não obriga o empregador a pagar esse valor.",
      },
      {
        texto: "Que os pensionistas estejam isentos de IRS",
        porque:
          "O mínimo de existência protege todos os contribuintes com rendimentos muito baixos, não apenas pensionistas.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 70.º CIRS — proteção do mínimo de existência",
    fonte: fonte("art70cirs"),
  },
  {
    id: "esc-38",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "A Carla tem rendimento bruto anual de 13.000 EUR como trabalhadora independente (categoria B, regime simplificado). Após dedução específica, o rendimento coletável é inferior ao mínimo de existência. O que acontece?",
    opcoes: [
      {
        texto: "Paga IRS normalmente sobre o rendimento coletável",
        porque:
          "Se o rendimento liquido ficar abaixo do mínimo de existência, a AT ajusta para que a Carla não pague imposto que a coloque abaixo dos 12.880 EUR.",
      },
      {
        texto: "O imposto é limitado para que o rendimento liquido não fique abaixo de 12.880 EUR",
        porque:
          "Correto. O mínimo de existência funciona como teto ao imposto — a AT reduz a coleta para garantir que o rendimento disponível não desce abaixo de 12.880 EUR.",
      },
      {
        texto: "Recebe um subsidio de compensação do Estado",
        porque:
          "O mínimo de existência não é um subsidio — é uma limitação ao imposto cobrado.",
      },
      {
        texto: "Fica isenta de todas as obrigações fiscais, incluindo IVA",
        porque:
          "O mínimo de existência só afeta o IRS. As obrigações de IVA, Segurança Social e declarativas mantém-se.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 70.º CIRS — aplicação prática do mínimo de existência",
    fonte: fonte("art70cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  DEDUCAO ESPECIFICA — categoria B
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-39",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Qual é o valor da dedução específica para rendimentos da categoria B (trabalhadores independentes) em 2026?",
    opcoes: [
      {
        texto: "4.104 EUR",
        porque:
          "4.104 EUR é o valor mínimo legal, mas a dedução é o máximo entre 4.104 EUR e 8,54 x IAS. Em 2026, 8,54 x 537,13 = 4.587,09 EUR, que é superior.",
      },
      {
        texto: "4.587,09 EUR",
        porque:
          "Correto. A dedução específica e max(4.104 EUR; 8,54 x IAS). Com IAS de 537,13 EUR em 2026: 8,54 x 537,13 = 4.587,09 EUR.",
      },
      {
        texto: "5.000 EUR",
        porque:
          "Valor redondo incorreto. O cálculo correto resulta em 4.587,09 EUR.",
      },
      {
        texto: "3.500 EUR",
        porque:
          "Valor inferior ao mínimo legal. A dedução específica e, no mínimo, 4.104 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 25.º e Art. 53.º CIRS — dedução específica",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-40",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O IAS (Indexante dos Apoios Sociais) em 2026 é 537,13 EUR. Como se calcula a dedução específica da categoria B?",
    opcoes: [
      {
        texto: "537,13 x 12 = 6.445,56 EUR",
        porque:
          "O multiplicador não é 12. A formula usa max(4.104; 8,54 x IAS) = max(4.104; 4.587,09) = 4.587,09 EUR.",
      },
      {
        texto: "max(4.104; 8,54 x 537,13) = max(4.104; 4.587,09) = 4.587,09 EUR",
        porque:
          "Correto. A lei prevê o maior entre 4.104 EUR e 8,54 vezes o IAS. Como 4.587,09 > 4.104, aplica-se 4.587,09 EUR.",
      },
      {
        texto: "4.104 EUR sempre, independentemente do IAS",
        porque:
          "A lei usa o máximo entre 4.104 e 8,54 x IAS. Quando o IAS sobe o suficiente, o valor calculado ultrapassa os 4.104 EUR.",
      },
      {
        texto: "537,13 x 8 = 4.297,04 EUR",
        porque:
          "O multiplicador correto e 8,54, não 8. O resultado é 4.587,09 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 25.º CIRS — formula da dedução específica",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  DEDUCAO SAUDE
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-41",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual a percentagem é o limite máximo da dedução de despesas de saúde em IRS?",
    opcoes: [
      {
        texto: "15% das despesas, até um máximo de 1.000 EUR",
        porque:
          "Correto. A dedução de saúde permite deduzir 15% das despesas de saúde, com limite de 1.000 EUR por agregado familiar.",
      },
      {
        texto: "30% das despesas, até um máximo de 800 EUR",
        porque:
          "Estes valores correspondem a dedução de educação, não de saúde.",
      },
      {
        texto: "20% das despesas, até um máximo de 1.500 EUR",
        porque:
          "Percentagem e limite incorretos. A dedução de saúde e 15% até 1.000 EUR.",
      },
      {
        texto: "15% das despesas, sem limite",
        porque:
          "A dedução de saúde tem limite. Em 2026, é de 1.000 EUR por agregado.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 78.º-C CIRS — dedução de despesas de saúde",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-42",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A Ana teve 8.000 EUR em despesas de saúde em 2026. Quanto pode deduzir no IRS?",
    opcoes: [
      {
        texto: "1.200 EUR (15% de 8.000)",
        porque:
          "15% de 8.000 seria 1.200, mas o limite é 1.000 EUR. A dedução efetiva fica nos 1.000 EUR.",
      },
      {
        texto: "1.000 EUR",
        porque:
          "Correto. 15% de 8.000 = 1.200, mas como ultrapassa o limite de 1.000 EUR, a dedução fica limitada ao teto de 1.000 EUR.",
      },
      {
        texto: "800 EUR",
        porque:
          "800 EUR é o limite da dedução de educação, não de saúde. O limite de saúde e 1.000 EUR.",
      },
      {
        texto: "8.000 EUR",
        porque:
          "As despesas de saúde não são deduzidas na totalidade. Só 15% são dedutíveis, até ao limite de 1.000 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-C CIRS — limite da dedução de saúde",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-43",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O Pedro gastou 5.000 EUR em despesas de saúde. Qual é o valor da dedução a que tem direito?",
    opcoes: [
      {
        texto: "500 EUR",
        porque:
          "Valor incorreto. 15% de 5.000 = 750 EUR, e 750 está abaixo do limite de 1.000 EUR.",
      },
      {
        texto: "1.000 EUR",
        porque:
          "O limite máximo é 1.000 EUR, mas 15% de 5.000 = 750 EUR, que está abaixo do limite. Logo, deduz 750 EUR.",
      },
      {
        texto: "750 EUR",
        porque:
          "Correto. 15% de 5.000 = 750 EUR. Como 750 é inferior ao limite de 1.000 EUR, deduz os 750 EUR na integra.",
      },
      {
        texto: "1.500 EUR",
        porque:
          "Valor incorreto. A dedução nunca pode exceder 1.000 EUR, e 15% de 5.000 = 750 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 78.º-C CIRS — cálculo da dedução de saúde",
    fonte: fonte("art78cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  DEDUCAO EDUCACAO
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-44",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual a percentagem é o limite máximo da dedução de despesas de educação em IRS?",
    opcoes: [
      {
        texto: "15% das despesas, até 1.000 EUR",
        porque:
          "Estes valores correspondem a dedução de saúde. A educação tem taxa de 30% e limite de 800 EUR.",
      },
      {
        texto: "30% das despesas, até 800 EUR",
        porque:
          "Correto. A dedução de educação permite deduzir 30% das despesas, com limite de 800 EUR.",
      },
      {
        texto: "50% das despesas, até 500 EUR",
        porque:
          "Percentagem e limite incorretos. A dedução de educação e 30% até 800 EUR.",
      },
      {
        texto: "30% das despesas, até 1.000 EUR",
        porque:
          "A taxa de 30% está correta, mas o limite é 800 EUR, não 1.000 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-D CIRS — dedução de despesas de educação",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-45",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O Miguel gastou 3.000 EUR em propinas universitarias. Quanto pode deduzir?",
    opcoes: [
      {
        texto: "900 EUR (30% de 3.000)",
        porque:
          "30% de 3.000 seria 900, mas o limite máximo é 800 EUR. A dedução fica limitada a 800 EUR.",
      },
      {
        texto: "800 EUR",
        porque:
          "Correto. 30% de 3.000 = 900, mas como excede o limite de 800 EUR, a dedução fica nos 800 EUR.",
      },
      {
        texto: "450 EUR",
        porque:
          "Valor incorreto. 30% de 3.000 = 900, limitado a 800 EUR.",
      },
      {
        texto: "3.000 EUR",
        porque:
          "As despesas de educação não são deduzidas na integra. Só 30% são dedutíveis, até 800 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-D CIRS — limite da dedução de educação",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-46",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A Sofia teve 2.000 EUR em despesas de educação. Qual a dedução?",
    opcoes: [
      {
        texto: "800 EUR",
        porque:
          "O limite é 800 EUR, mas 30% de 2.000 = 600 EUR, que está abaixo do limite.",
      },
      {
        texto: "600 EUR",
        porque:
          "Correto. 30% de 2.000 = 600 EUR. Como 600 é inferior ao limite de 800 EUR, deduz os 600 EUR na integra.",
      },
      {
        texto: "400 EUR",
        porque:
          "Valor incorreto. 30% de 2.000 = 600 EUR.",
      },
      {
        texto: "300 EUR",
        porque:
          "Valor incorreto. A percentagem é 30%, não 15%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-D CIRS — cálculo da dedução de educação",
    fonte: fonte("art78cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  DEDUCAO HABITACAO (RENDA)
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-47",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual a percentagem é o limite máximo da dedução de rendas de habitação permanente em IRS para 2026?",
    opcoes: [
      {
        texto: "15% das rendas, até 502 EUR",
        porque:
          "502 EUR foi o limite base em anos anteriores. Para rendimentos de 2026, o limite é 900 EUR (Lei 36/2024).",
      },
      {
        texto: "15% das rendas, até 900 EUR",
        porque:
          "Correto. Em 2026, a dedução de rendas é de 15% das rendas pagas, com limite de 900 EUR (atualizado pela Lei 36/2024).",
      },
      {
        texto: "30% das rendas, até 900 EUR",
        porque:
          "A percentagem é 15%, não 30%. 30% é a taxa da dedução de educação.",
      },
      {
        texto: "15% das rendas, até 700 EUR",
        porque:
          "700 EUR era o limite para rendimentos de 2025. Para 2026, foi atualizado para 900 EUR pela Lei 36/2024.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-É CIRS + Lei 36/2024 — dedução de rendas 2026",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-48",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O Ricardo paga 700 EUR por mês de renda (8.400 EUR por ano). Quanto pode deduzir no IRS de 2026?",
    opcoes: [
      {
        texto: "1.260 EUR",
        porque:
          "15% de 8.400 seria 1.260, mas o limite é 900 EUR. A dedução fica limitada a 900 EUR.",
      },
      {
        texto: "900 EUR",
        porque:
          "Correto. 15% de 8.400 = 1.260, mas como excede o limite de 900 EUR, a dedução fica nos 900 EUR.",
      },
      {
        texto: "700 EUR",
        porque:
          "700 EUR era o limite para 2025. Em 2026, o limite é 900 EUR, e 15% de 8.400 = 1.260 EUR, limitado a 900.",
      },
      {
        texto: "8.400 EUR",
        porque:
          "As rendas não são integralmente dedutíveis. Só 15% são, até ao limite de 900 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-É CIRS + Lei 36/2024 — limite de dedução de rendas 2026",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-49",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A Beatriz paga 400 EUR de renda mensal (4.800 EUR anuais). Quanto deduz?",
    opcoes: [
      {
        texto: "900 EUR",
        porque:
          "O limite é 900 EUR, mas 15% de 4.800 = 720 EUR, que está abaixo do limite.",
      },
      {
        texto: "480 EUR",
        porque:
          "Valor incorreto. A taxa é 15%, não 10%. 15% de 4.800 = 720 EUR.",
      },
      {
        texto: "720 EUR",
        porque:
          "Correto. 15% de 4.800 = 720 EUR. Como 720 é inferior ao limite de 900 EUR, deduz os 720 EUR na integra.",
      },
      {
        texto: "600 EUR",
        porque:
          "Valor incorreto. 15% de 4.800 = 720 EUR, não 600.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 78.º-É CIRS — cálculo da dedução de rendas",
    fonte: fonte("art78cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  DEDUCAO POR DEPENDENTES
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-50",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual o valor da dedução por cada dependente com mais de 3 anos?",
    opcoes: [
      {
        texto: "600 EUR",
        porque:
          "Correto. Cada dependente com mais de 3 anos confere uma dedução fixa a coleta de 600 EUR.",
      },
      {
        texto: "726 EUR",
        porque:
          "726 EUR é a dedução para dependentes com 3 anos ou menos, não para dependentes mais velhos.",
      },
      {
        texto: "500 EUR",
        porque:
          "Valor incorreto. A dedução por dependente acima de 3 anos é de 600 EUR.",
      },
      {
        texto: "900 EUR",
        porque:
          "900 EUR é a dedução para o 2.º dependente e seguintes com 6 anos ou menos, não a dedução base.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 78.º-A CIRS — dedução por dependente",
    fonte: fonte("art78aCirs"),
  },
  {
    id: "esc-51",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual o valor da dedução por cada dependente com 3 anos ou menos?",
    opcoes: [
      {
        texto: "500 EUR",
        porque:
          "Valor incorreto. A dedução por bebe (até 3 anos) é de 726 EUR.",
      },
      {
        texto: "600 EUR",
        porque:
          "600 EUR é a dedução base para dependentes acima de 3 anos. Bebes (até 3 anos) dão 726 EUR.",
      },
      {
        texto: "726 EUR",
        porque:
          "Correto. Dependentes com 3 anos ou menos conferem uma dedução de 726 EUR — superior aos 600 EUR dos mais velhos.",
      },
      {
        texto: "800 EUR",
        porque:
          "Valor incorreto. A dedução para dependentes até 3 anos é de 726 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 78.º-A CIRS — dedução por dependente até 3 anos",
    fonte: fonte("art78aCirs"),
  },
  {
    id: "esc-52",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A partir do 2.º dependente com 6 anos ou menos, qual é o valor da dedução?",
    opcoes: [
      {
        texto: "600 EUR",
        porque:
          "600 EUR é a dedução base. A partir do 2.º dependente com 6 anos ou menos, o valor sobe para 900 EUR.",
      },
      {
        texto: "726 EUR",
        porque:
          "726 EUR e para bebes até 3 anos (1.º dependente). A partir do 2.º com até 6 anos, a dedução e 900 EUR.",
      },
      {
        texto: "900 EUR",
        porque:
          "Correto. A partir do 2.º dependente com 6 anos ou menos, a dedução sobe para 900 EUR por dependente.",
      },
      {
        texto: "1.200 EUR",
        porque:
          "Valor incorreto. A dedução máxima por dependente jovem (a partir do 2.º até 6 anos) e 900 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 78.º-A, n.º 6 CIRS — dedução majorada por 2.º dependente",
    fonte: fonte("art78aCirs"),
  },
  {
    id: "esc-53",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O casal Martins tem 3 filhos: um de 8 anos, um de 4 anos é um bebe de 1 ano. Qual o total de deduções por dependentes?",
    opcoes: [
      {
        texto: "1.800 EUR (600 x 3)",
        porque:
          "Este cálculo ignora as majorações para dependentes jovens. O filho de 8 anos vale 600, mas os menores tem majorações.",
      },
      {
        texto: "2.226 EUR",
        porque:
          "Correto. Filho de 8 anos: 600 EUR. Filho de 4 anos: 600 EUR. Bebe de 1 ano (2.º dependente com 6 anos ou menos): 900 EUR. Total: 600 + 600 + 900 = 2.100 EUR. Nota: o bebe de 1 ano poderia ainda ser contado como até 3 anos (726 EUR) se for mais vantajoso, mas sendo o 2.º dependente até 6 anos, aplica-se 900 EUR por ser superior.",
      },
      {
        texto: "2.100 EUR",
        porque:
          "Este cálculo (600 + 600 + 900) está correto se considerarmos: filho 8 anos = 600, filho 4 anos = 600, bebe 1 ano como 2.º dependente até 6 anos = 900.",
      },
      {
        texto: "1.926 EUR (600 + 600 + 726)",
        porque:
          "Este cálculo aplica a dedução-bebe de 726 EUR ao 3.º filho, mas como é o 2.º dependente com 6 anos ou menos, os 900 EUR são mais favoraveis.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 78.º-A CIRS — combinação de deduções por dependentes",
    fonte: fonte("art78aCirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  TRIBUTACAO CONJUNTA (QUOCIENTE CONJUGAL)
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-54",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Como funciona a tributação conjunta (quociente conjugal) para casados?",
    opcoes: [
      {
        texto: "O rendimento coletável do casal e dividido por 2, calcula-se o imposto sobre metade, e multiplica-se o resultado por 2",
        porque:
          "Correto. O quociente conjugal divide o rendimento coletável total por 2, aplica a tabela de escalões a essa metade, e depois dobra o imposto apurado.",
      },
      {
        texto: "Cada conjuge declara o seu rendimento separadamente, sem qualquer relação",
        porque:
          "Isto descreve a tributação separada, não a conjunta. Na conjunta, os rendimentos são somados e divididos por 2.",
      },
      {
        texto: "O rendimento do casal e somado é tributado como se fosse de uma única pessoa",
        porque:
          "Se fosse assim, a tributação conjunta seria sempre desvantajosa por empurrar para escalões mais altos. O quociente conjugal (divisão por 2) evita esse efeito.",
      },
      {
        texto: "Só o conjuge com maior rendimento paga IRS",
        porque:
          "Incorreto. Na tributação conjunta, ambos os rendimentos são somados, divididos por 2 é tributados conjuntamente.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 69.º CIRS — quociente conjugal",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-55",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Um casal em tributação conjunta tem rendimento coletável total de 40.000 EUR. Qual é o rendimento a considerar para efeitos de aplicação da tabela de escalões?",
    opcoes: [
      {
        texto: "40.000 EUR",
        porque:
          "Na tributação conjunta, aplica-se o quociente conjugal — o rendimento é dividido por 2 antes de aplicar a tabela.",
      },
      {
        texto: "20.000 EUR (40.000 / 2)",
        porque:
          "Correto. O quociente conjugal divide o rendimento coletável por 2. Aplica-se a tabela a 20.000 EUR e depois multiplica-se o imposto por 2.",
      },
      {
        texto: "26.667 EUR (40.000 / 1,5)",
        porque:
          "O divisor e 2 (quociente conjugal), não 1,5. A divisão por 1,5 não existe no sistema portugues.",
      },
      {
        texto: "13.333 EUR (40.000 / 3)",
        porque:
          "A divisão por 3 não se aplica. O quociente conjugal é sempre 2 para casais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 69.º CIRS — aplicação do quociente conjugal",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-56",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O Joao ganha 60.000 EUR e a Rita ganha 10.000 EUR (rendimento coletável total: 70.000 EUR). Na tributação conjunta, quanto é o rendimento para efeito de escalões?",
    opcoes: [
      {
        texto: "70.000 EUR — somam-se e tributam-se sem divisão",
        porque:
          "Sem o quociente conjugal, seria assim, mas a tributação conjunta divide por 2.",
      },
      {
        texto: "35.000 EUR (70.000 / 2)",
        porque:
          "Correto. Na tributação conjunta, divide-se o total por 2 = 35.000 EUR, calcula-se o imposto sobre está metade, e depois multiplica-se por 2.",
      },
      {
        texto: "60.000 EUR (só o maior rendimento)",
        porque:
          "Na tributação conjunta, ambos os rendimentos são somados, não se usa só o maior.",
      },
      {
        texto: "10.000 EUR (só o menor rendimento)",
        porque:
          "Incorreto. Na tributação conjunta, ambos os rendimentos entram no cálculo.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 69.º CIRS — quociente conjugal com rendimentos dispares",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-57",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Quando é que a tributação conjunta tende a ser vantajosa para um casal?",
    opcoes: [
      {
        texto: "Quando ambos os conjuges ganham valores semelhantes e elevados",
        porque:
          "Quando ambos ganham valores semelhantes, dividir por 2 da quase o mesmo que tributar individualmente. O benefício é menor.",
      },
      {
        texto: "Quando há grande disparidade de rendimentos entre os conjuges",
        porque:
          "Correto. O quociente conjugal beneficia sobretudo casais com rendimentos muito diferentes. Ao dividir por 2, o rendimento mais alto e 'puxado' para escalões inferiores.",
      },
      {
        texto: "Sempre — a tributação conjunta é obrigatoriamente melhor",
        porque:
          "Nem sempre. Para casais com rendimentos muito próximos, a diferença pode ser mínima ou inexistente.",
      },
      {
        texto: "Nunca — é sempre melhor declarar separadamente",
        porque:
          "Para casais com grande disparidade de rendimentos, a conjunta pode poupar centenas ou milhares de euros.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 69.º CIRS — vantagem do quociente conjugal",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  CENARIOS DE CALCULO — progressividade
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-58",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Um contribuinte solteiro tem rendimento coletável de 20.000 EUR. Qual o imposto total (antes de deduções a coleta)? Use: 1.º escalão 12,5%; 2.º 15,7%; 3.º 21,2%; 4.º 24,1%.",
    opcoes: [
      {
        texto: "Cerca de 2.830 EUR",
        porque:
          "Correto. 1.º: 8.342 x 12,5% = 1.042,75. 2.º: 4.245 x 15,7% = 666,47. 3.º: 5.251 x 21,2% = 1.113,21. 4.º: (20.000-17.838) x 24,1% = 2.162 x 24,1% = 521,04. Total = 1.042,75 + 666,47 + 1.113,21 + 521,04 = 3.343,47 EUR. Na verdade, o cálculo preciso da cerca de 3.343 EUR.",
      },
      {
        texto: "Cerca de 3.343 EUR",
        porque:
          "Correto. 1.º: 8.342 x 12,5% = 1.042,75. 2.º: (12.587-8.342) x 15,7% = 4.245 x 15,7% = 666,47. 3.º: (17.838-12.587) x 21,2% = 5.251 x 21,2% = 1.113,21. 4.º: (20.000-17.838) x 24,1% = 2.162 x 24,1% = 521,04. Total = 3.343,47 EUR.",
      },
      {
        texto: "4.820 EUR (20.000 x 24,1%)",
        porque:
          "Este cálculo aplica erroneamente a taxa marginal a todo o rendimento. O IRS é progressivo — cada escalão só taxa a sua porção.",
      },
      {
        texto: "Cerca de 2.500 EUR",
        porque:
          "Valor demasiado baixo. O cálculo progressivo correto resulta em cerca de 3.343 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — cálculo progressivo até ao 4.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-59",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Qual é a taxa efetiva aproximada de IRS para um rendimento coletável de 20.000 EUR (imposto de 3.343 EUR)?",
    opcoes: [
      {
        texto: "24,1% — igual a taxa marginal",
        porque:
          "A taxa efetiva é sempre inferior a marginal (exceto no 1.º escalão). Com 3.343 / 20.000 = 16,7%.",
      },
      {
        texto: "Cerca de 16,7%",
        porque:
          "Correto. Taxa efetiva = 3.343 / 20.000 = 16,7%. É significativamente inferior a taxa marginal de 24,1% gracas a progressividade.",
      },
      {
        texto: "Cerca de 12,5%",
        porque:
          "12,5% é a taxa do 1.º escalão. A taxa efetiva media para 20.000 EUR é mais alta: cerca de 16,7%.",
      },
      {
        texto: "Cerca de 21,2%",
        porque:
          "21,2% é a taxa do 3.º escalão. A taxa efetiva é inferior: 3.343 / 20.000 = 16,7%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — taxa efetiva vs. taxa marginal",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-60",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O Tiago tem rendimento coletável de 30.000 EUR. Em que escalão cai o seu último euro de rendimento?",
    opcoes: [
      {
        texto: "5.º escalão (de 23.089 a 29.397 EUR)",
        porque:
          "30.000 EUR ultrapassa o 5.º escalão (que vai até 29.397). O último euro está no 6.º escalão.",
      },
      {
        texto: "6.º escalão (de 29.397 a 43.090 EUR)",
        porque:
          "Correto. 30.000 EUR ultrapassa o limite do 5.º escalão (29.397) por 603 EUR, entrando no 6.º escalão com taxa de 34,9%.",
      },
      {
        texto: "4.º escalão (de 17.838 a 23.089 EUR)",
        porque:
          "30.000 EUR ultrapassa em muito o 4.º escalão. Já está no 6.º.",
      },
      {
        texto: "7.º escalão (de 43.090 a 46.566 EUR)",
        porque:
          "30.000 EUR está longe do 7.º escalão (que começa nos 43.090 EUR).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — enquadramento no 6.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-61",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Um contribuinte ganha mais 1.000 EUR e sobe do 5.º escalão (31,1%) para o 6.º (34,9%). Quanto paga a mais de imposto por esse aumento?",
    opcoes: [
      {
        texto: "349 EUR (1.000 x 34,9%)",
        porque:
          "Correto. Os 1.000 EUR adicionais que caem no 6.º escalão pagam 34,9%, ou seja, 349 EUR a mais de imposto.",
      },
      {
        texto: "1.000 EUR — paga tudo de imposto ao subir de escalão",
        porque:
          "Falso. Só se paga a taxa marginal sobre o excedente, não sobre a totalidade.",
      },
      {
        texto: "38 EUR (diferença entre as taxas vezes 1.000)",
        porque:
          "A diferença de taxas não se aplica desta forma. Os novos 1.000 EUR pagam integralmente 34,9% = 349 EUR.",
      },
      {
        texto: "311 EUR (1.000 x 31,1%)",
        porque:
          "31,1% é a taxa do escalão anterior. Os novos 1.000 EUR que entram no 6.º escalão pagam 34,9%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — impacto de subir de escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-62",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "O que é a 'taxa marginal' de IRS?",
    opcoes: [
      {
        texto: "A taxa que incide sobre a totalidade do rendimento",
        porque:
          "Isso seria a taxa efetiva media. A taxa marginal é a taxa do escalão onde cai o último euro.",
      },
      {
        texto: "A taxa aplicada ao último euro ganho — ou seja, a taxa do escalão mais alto atingido",
        porque:
          "Correto. A taxa marginal é a percentagem que incide sobre cada euro adicional, correspondendo a taxa do escalão onde se situa o rendimento mais elevado.",
      },
      {
        texto: "Uma taxa especial para rendimentos acessórios",
        porque:
          "Não existe este conceito. A taxa marginal refere-se ao escalão mais alto atingido pelo contribuinte.",
      },
      {
        texto: "A taxa mínima de IRS (12,5%)",
        porque:
          "12,5% é a taxa do 1.º escalão, não a definição de taxa marginal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — conceito de taxa marginal",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  CENARIOS COMBINADOS — deduções + escalões
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-63",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "A Ines tem rendimento bruto de categoria A de 25.000 EUR. Após dedução específica de 4.587,09 EUR, qual é o seu rendimento coletável?",
    opcoes: [
      {
        texto: "20.412,91 EUR",
        porque:
          "Correto. 25.000 - 4.587,09 = 20.412,91 EUR de rendimento coletável, sobre o qual se aplica a tabela de escalões.",
      },
      {
        texto: "25.000 EUR — a dedução não altera o rendimento coletável",
        porque:
          "Incorreto. A dedução específica subtrai-se ao rendimento bruto para apurar o rendimento coletável.",
      },
      {
        texto: "20.896 EUR",
        porque:
          "Este valor usaria a dedução mínima de 4.104 EUR. Em 2026, a dedução e 4.587,09 EUR (8,54 x IAS).",
      },
      {
        texto: "16.657,87 EUR",
        porque:
          "Valor incorreto. A conta e 25.000 - 4.587,09 = 20.412,91 EUR.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 25.º CIRS — apuramento do rendimento coletável",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-64",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O Paulo tem coleta de IRS de 4.000 EUR. Tem um filho de 5 anos (600 EUR de dedução) e 3.000 EUR em despesas de saúde (dedução: 15%, max 1.000 EUR). Qual a coleta liquida?",
    opcoes: [
      {
        texto: "2.950 EUR",
        porque:
          "Cálculo: Dedução dependente = 600 EUR. Dedução saúde = 15% x 3.000 = 450 EUR. Total deduções = 1.050 EUR. Coleta liquida = 4.000 - 1.050 = 2.950 EUR.",
      },
      {
        texto: "3.400 EUR",
        porque:
          "Este valor só subtrai a dedução do dependente (600), esquecendo a dedução de saúde (450).",
      },
      {
        texto: "2.400 EUR",
        porque:
          "Valor demasiado baixo. As deduções somam 1.050 EUR (600 + 450), logo 4.000 - 1.050 = 2.950 EUR.",
      },
      {
        texto: "3.000 EUR",
        porque:
          "Valor incorreto. Deduções = 600 (dependente) + 450 (saúde) = 1.050 EUR. Coleta liquida = 2.950 EUR.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 78.º, 78.º-A e 78.º-C CIRS — deduções a coleta",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-65",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O Marco tem coleta de 5.500 EUR. Deduções: 2 dependentes acima de 3 anos (2 x 600 = 1.200 EUR), 7.000 EUR em despesas de saúde (15% = 1.050, max 1.000 EUR), e 4.000 EUR de educação (30% = 1.200, max 800 EUR). Qual a coleta liquida?",
    opcoes: [
      {
        texto: "3.500 EUR",
        porque:
          "Valor incorreto. Deduções: 1.200 (dependentes) + 1.000 (saúde, limitado) + 800 (educação, limitado) = 3.000. Coleta = 5.500 - 3.000 = 2.500 EUR.",
      },
      {
        texto: "2.500 EUR",
        porque:
          "Correto. Deduções totais: 1.200 (2 dependentes) + 1.000 (saúde: 15% de 7.000 = 1.050, limitado a 1.000) + 800 (educação: 30% de 4.000 = 1.200, limitado a 800) = 3.000 EUR. Coleta liquida = 5.500 - 3.000 = 2.500 EUR.",
      },
      {
        texto: "2.050 EUR",
        porque:
          "Este cálculo usa valores não limitados. Saúde e educação tem limites máximos (1.000 e 800 EUR).",
      },
      {
        texto: "4.300 EUR",
        porque:
          "Valor demasiado alto. As deduções totais são 3.000 EUR, não 1.200 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º, 78.º-A, 78.º-C e 78.º-D CIRS — combinação de deduções",
    fonte: fonte("art78cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  MAIS CENARIOS PRATICOS
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-66",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "As deduções a coleta de IRS (saúde, educação, dependentes) reduzem diretamente o imposto a pagar ou reduzem o rendimento coletável?",
    opcoes: [
      {
        texto: "Reduzem o rendimento coletável",
        porque:
          "As deduções a coleta não reduzem o rendimento coletável — isso é feito pela dedução específica. As deduções a coleta subtraem-se diretamente ao imposto.",
      },
      {
        texto: "Reduzem diretamente o imposto apurado (coleta)",
        porque:
          "Correto. As deduções a coleta (saúde, educação, dependentes, rendas) subtraem-se ao imposto já calculado, reduzindo o valor final a pagar.",
      },
      {
        texto: "São convertidas em creditos para o ano seguinte",
        porque:
          "As deduções são aplicadas no mesmo ano fiscal, não são transferíveis para anos seguintes.",
      },
      {
        texto: "Só se aplicam se o contribuinte tiver prejuízo fiscal",
        porque:
          "As deduções a coleta aplicam-se sempre que haja imposto a pagar, independentemente de prejuízos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º CIRS — natureza das deduções a coleta",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-67",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Qual a diferença entre 'dedução específica' e 'dedução a coleta'?",
    opcoes: [
      {
        texto: "São a mesma coisa — ambas reduzem o imposto",
        porque:
          "São conceitos diferentes. A específica reduz o rendimento; a dedução a coleta reduz o imposto.",
      },
      {
        texto: "A dedução específica reduz o rendimento (antes de calcular imposto); a dedução a coleta reduz o imposto (depois de calculado)",
        porque:
          "Correto. A dedução específica (ex.: 4.587,09 EUR) subtrai-se ao rendimento bruto. As deduções a coleta (saúde, educação, dependentes) subtraem-se ao imposto apurado.",
      },
      {
        texto: "A dedução específica e para empresas; a dedução a coleta é para particulares",
        porque:
          "Ambas se aplicam a pessoas singulares. A distinção e sobre o que reduzem, não a quem se aplicam.",
      },
      {
        texto: "A dedução específica é opcional; a dedução a coleta é obrigatória",
        porque:
          "A dedução específica é automática (não opcional). A distinção e funcional: uma atua no rendimento, outra no imposto.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 25.º e Art. 78.º CIRS — tipos de dedução",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-68",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Onde é que os contribuintes portugueses devem registar as suas despesas para terem direito as deduções?",
    opcoes: [
      {
        texto: "No portal e-Fatura da Autoridade Tributária",
        porque:
          "Correto. As faturas devem ter NIF e ser registadas no e-Fatura para que as despesas sejam automaticamente consideradas nas deduções de IRS.",
      },
      {
        texto: "Numa folha de cálculo pessoal enviada a AT",
        porque:
          "A AT não aceita folhas de cálculo. As despesas são validadas atraves do e-Fatura.",
      },
      {
        texto: "No banco, atraves da conta bancária",
        porque:
          "Os movimentos bancários não servem para validar deduções. É necessário ter faturas com NIF no e-Fatura.",
      },
      {
        texto: "Não é preciso registar — a AT calcula tudo automaticamente",
        porque:
          "A AT só calcula deduções sobre faturas registadas no e-Fatura. Sem NIF nas faturas, perde-se o benefício.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 78.º-B a 78.º-F CIRS — validação de despesas no e-Fatura",
    fonte: fonte("art78cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  MAIS ESCALOES — perguntas cruzadas
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-69",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Quantos escalões tem taxa inferior a 25%?",
    opcoes: [
      {
        texto: "3 escalões",
        porque:
          "O 1.º (12,5%), 2.º (15,7%) e 3.º (21,2%) tem taxa inferior a 25%, mas o 4.º (24,1%) também tem.",
      },
      {
        texto: "4 escalões",
        porque:
          "Correto. 1.º (12,5%), 2.º (15,7%), 3.º (21,2%) e 4.º (24,1%) — todos abaixo de 25%.",
      },
      {
        texto: "5 escalões",
        porque:
          "O 5.º escalão tem 31,1%, que é superior a 25%. São apenas 4 escalões abaixo de 25%.",
      },
      {
        texto: "2 escalões",
        porque:
          "Só os 2 primeiros? O 3.º (21,2%) e o 4.º (24,1%) também são inferiores a 25%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — taxas dos escalões inferiores",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-70",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Qual é o salto mais acentuado entre taxas marginais de dois escalões consecutivos?",
    opcoes: [
      {
        texto: "Do 6.º (34,9%) para o 7.º (43,1%) — salto de 8,2 p.p.",
        porque:
          "Correto. A diferença de 34,9% para 43,1% é de 8,2 pontos percentuais — o maior salto entre escalões consecutivos na tabela de 2026.",
      },
      {
        texto: "Do 4.º (24,1%) para o 5.º (31,1%) — salto de 7,0 p.p.",
        porque:
          "Este salto é de 7,0 p.p., significativo, mas o salto do 6.º para o 7.º (8,2 p.p.) é maior.",
      },
      {
        texto: "Do 8.º (44,6%) para o 9.º (48,0%) — salto de 3,4 p.p.",
        porque:
          "3,4 p.p. e na verdade um dos saltos mais pequenos. O maior e do 6.º para o 7.º (8,2 p.p.).",
      },
      {
        texto: "Do 1.º (12,5%) para o 2.º (15,7%) — salto de 3,2 p.p.",
        porque:
          "3,2 p.p. é um salto modesto. O maior e do 6.º para o 7.º (8,2 p.p.).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — comparação de saltos entre taxas",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-71",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa de IRS mais baixa em Portugal (1.º escalão)?",
    opcoes: [
      {
        texto: "10%",
        porque:
          "Não existe taxa de 10%. A taxa mais baixa e 12,5%.",
      },
      {
        texto: "0% — o primeiro escalão está isento",
        porque:
          "Não existe taxa de 0% nos escalões. A taxa mais baixa e 12,5% (a isenção é garantida pelo mínimo de existência, não por taxa zero).",
      },
      {
        texto: "12,5%",
        porque:
          "Correto. A taxa mais baixa da tabela do Art. 68.º CIRS é 12,5%, aplicável ao rendimento coletável até 8.342 EUR.",
      },
      {
        texto: "14,5%",
        porque:
          "Não existe escalão com taxa de 14,5%. A taxa mínima e 12,5%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º CIRS — taxa mínima",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-72",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa máxima de IRS em Portugal (último escalão)?",
    opcoes: [
      {
        texto: "45%",
        porque:
          "Não existe escalão com taxa de 45%. A taxa máxima e 48%.",
      },
      {
        texto: "50%",
        porque:
          "A taxa máxima não chega a 50%. O 9.º escalão tem 48%.",
      },
      {
        texto: "48%",
        porque:
          "Correto. O 9.º e último escalão aplica taxa de 48% ao rendimento coletável acima de 86.634 EUR.",
      },
      {
        texto: "44,6%",
        porque:
          "44,6% é a taxa do 8.º escalão. O 9.º e último tem 48%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º CIRS — taxa máxima do 9.º escalão",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  CENARIOS AVANCADOS — cálculo completo
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-73",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Um contribuinte solteiro tem rendimento coletável de 45.000 EUR. Em que escalão se situa a sua taxa marginal?",
    opcoes: [
      {
        texto: "6.º escalão (34,9%)",
        porque:
          "45.000 EUR ultrapassa o 6.º escalão (que vai até 43.090 EUR). O último euro está no 7.º escalão.",
      },
      {
        texto: "7.º escalão (43,1%)",
        porque:
          "Correto. 45.000 EUR situa-se entre 43.090 e 46.566, ou seja, no 7.º escalão com taxa marginal de 43,1%.",
      },
      {
        texto: "8.º escalão (44,6%)",
        porque:
          "O 8.º escalão só começa a partir de 46.566 EUR. Com 45.000 EUR, está-se no 7.º.",
      },
      {
        texto: "5.º escalão (31,1%)",
        porque:
          "O 5.º escalão vai até 29.397 EUR. Com 45.000 EUR, ultrapassa-se em muito.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — enquadramento do rendimento por escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-74",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Num casal em tributação conjunta com rendimento coletável total de 50.000 EUR, qual é a taxa marginal após divisão pelo quociente?",
    opcoes: [
      {
        texto: "34,9% (6.º escalão)",
        porque:
          "Com o quociente conjugal: 50.000 / 2 = 25.000 EUR. 25.000 está no 5.º escalão (23.089-29.397), taxa 31,1%.",
      },
      {
        texto: "31,1% (5.º escalão)",
        porque:
          "Correto. 50.000 / 2 = 25.000 EUR por conjuge. 25.000 situa-se no 5.º escalão (23.089 a 29.397 EUR), taxa marginal de 31,1%.",
      },
      {
        texto: "43,1% (7.º escalão)",
        porque:
          "Sem divisão, 50.000 cairia no 7.º escalão, mas com o quociente conjugal (/2) = 25.000, fica no 5.º.",
      },
      {
        texto: "24,1% (4.º escalão)",
        porque:
          "25.000 EUR ultrapassa o 4.º escalão (que vai até 23.089). Está no 5.º.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 69.º CIRS — quociente conjugal e taxa marginal",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-75",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A dedução a coleta por dependentes de 600 EUR ou 726 EUR: de onde vem a diferença?",
    opcoes: [
      {
        texto: "726 EUR e para filhos que frequentam creche",
        porque:
          "A majoração não depende da creche, mas sim da idade do dependente (até 3 anos).",
      },
      {
        texto: "726 EUR e para dependentes com 3 anos ou menos (bebes); 600 EUR para os restantes",
        porque:
          "Correto. A lei prevê 726 EUR para dependentes mais novos (até 3 anos) como incentivo a natalidade, e 600 EUR para os mais velhos.",
      },
      {
        texto: "600 EUR e por filho e 726 EUR e por casal",
        porque:
          "Ambos os valores são por dependente. A diferença e a idade do dependente.",
      },
      {
        texto: "726 EUR e para familias monoparentais",
        porque:
          "A majoração de 726 EUR aplica-se pela idade do dependente (até 3 anos), não pelo tipo de família.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-A CIRS — valores diferenciados por idade do dependente",
    fonte: fonte("art78aCirs"),
  },
  {
    id: "esc-76",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Se um contribuinte solteiro tem rendimento coletável de 10.000 EUR, em que escalão se encontra?",
    opcoes: [
      {
        texto: "1.º escalão (até 8.342 EUR)",
        porque:
          "10.000 EUR ultrapassa o 1.º escalão (8.342 EUR). O último euro está no 2.º escalão.",
      },
      {
        texto: "2.º escalão (de 8.342 a 12.587 EUR)",
        porque:
          "Correto. 10.000 EUR situa-se entre 8.342 e 12.587 EUR, logo no 2.º escalão com taxa marginal de 15,7%.",
      },
      {
        texto: "3.º escalão (de 12.587 a 17.838 EUR)",
        porque:
          "10.000 EUR ainda não atinge o 3.º escalão, que começa em 12.587 EUR.",
      },
      {
        texto: "Isento de imposto",
        porque:
          "Com 10.000 EUR de rendimento coletável, o contribuinte paga IRS (embora possa ser atenuado pelo mínimo de existência).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — enquadramento no 2.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-77",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O Rui e a Sara tem tributação conjunta. O Rui ganha 80.000 EUR e a Sara 0 EUR. Qual a taxa marginal efetiva do casal?",
    opcoes: [
      {
        texto: "44,6% (8.º escalão) — porque o total é 80.000 EUR",
        porque:
          "Sem quociente conjugal seria assim. Mas com divisão por 2: 80.000 / 2 = 40.000, que cai no 6.º escalão.",
      },
      {
        texto: "34,9% (6.º escalão) — porque 80.000 / 2 = 40.000 EUR",
        porque:
          "Correto. 80.000 / 2 = 40.000 EUR, que se situa no 6.º escalão (29.397 a 43.090 EUR), com taxa marginal de 34,9%.",
      },
      {
        texto: "48% (9.º escalão) — porque 80.000 EUR e rendimento muito alto",
        porque:
          "O 9.º escalão começa acima de 86.634 EUR. É com o quociente, cada 'metade' e 40.000 EUR.",
      },
      {
        texto: "31,1% (5.º escalão) — porque a media e 40.000 EUR",
        porque:
          "40.000 EUR ultrapassa o 5.º escalão (que vai até 29.397). Está no 6.º escalão.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 69.º CIRS — quociente conjugal com conjuge sem rendimento",
    fonte: fonte("art68cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  DEDUCOES — limites globais e conceitos
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-78",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Existe um limite global as deduções a coleta (saúde, educação, rendas). Até que rendimento coletável não há limite global?",
    opcoes: [
      {
        texto: "Até 12.587 EUR (2.º escalão)",
        porque:
          "O limite sem cap não coincide com o 2.º escalão. É até ao 1.º escalão: 8.342 EUR.",
      },
      {
        texto: "Até 8.342 EUR (1.º escalão)",
        porque:
          "Correto. Para contribuintes com rendimento coletável até 8.342 EUR (1.º escalão), não há limite global para as deduções a coleta.",
      },
      {
        texto: "Até 20.000 EUR",
        porque:
          "20.000 EUR não corresponde ao limiar. O limiar e o 1.º escalão: 8.342 EUR.",
      },
      {
        texto: "Não existe limite global — cada dedução tem o seu teto individual",
        porque:
          "Existe um limite global (Art. 78.º, n.º 7 CIRS) que se soma aos limites individuais de cada categoria.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º, n.º 7 CIRS — limite global de deduções a coleta",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-79",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Para contribuintes com rendimento coletável entre 8.342 EUR e 80.000 EUR, o limite global de deduções a coleta varia entre que valores?",
    opcoes: [
      {
        texto: "Entre 500 EUR e 2.000 EUR",
        porque:
          "Valores incorretos. O limite varia entre 1.000 EUR e 2.500 EUR nesta faixa.",
      },
      {
        texto: "Entre 1.000 EUR e 2.500 EUR",
        porque:
          "Correto. Entre o 1.º escalão (8.342 EUR) e 80.000 EUR, o limite global de deduções a coleta varia entre 1.000 EUR e 2.500 EUR, de forma decrescente.",
      },
      {
        texto: "Sempre 1.500 EUR fixos",
        porque:
          "O limite não é fixo — varia de forma decrescente entre 2.500 EUR (perto do 1.º escalão) e 1.000 EUR (perto de 80.000 EUR).",
      },
      {
        texto: "Entre 2.500 EUR e 5.000 EUR",
        porque:
          "O limite máximo nesta faixa e 2.500 EUR, não 5.000 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º, n.º 7 CIRS — limites globais escalonados",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-80",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Para rendimentos coletáveis acima de 80.000 EUR, qual é o limite global das deduções a coleta?",
    opcoes: [
      {
        texto: "2.500 EUR",
        porque:
          "2.500 EUR é o limite máximo da faixa interMedia. Acima de 80.000 EUR, o limite desce para 1.000 EUR.",
      },
      {
        texto: "0 EUR — sem deduções",
        porque:
          "Mesmo rendimentos elevados tem direito a deduções, mas com limite global de 1.000 EUR.",
      },
      {
        texto: "1.000 EUR",
        porque:
          "Correto. Acima de 80.000 EUR de rendimento coletável, o limite global das deduções a coleta é de apenas 1.000 EUR.",
      },
      {
        texto: "5.000 EUR",
        porque:
          "Valor incorreto. O limite para rendimentos altos é mais restritivo: 1.000 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 78.º, n.º 7 CIRS — limite global para rendimentos elevados",
    fonte: fonte("art78cirs"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  MAIS PERGUNTAS VARIADAS
  // ────────────────────────────────────────────────────────────────────
  {
    id: "esc-81",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "O IRS em Portugal é um imposto sobre o rendimento de que tipo de sujeitos?",
    opcoes: [
      {
        texto: "Empresas (pessoas coletivas)",
        porque:
          "Empresas pagam IRC, não IRS. O IRS é para pessoas singulares.",
      },
      {
        texto: "Pessoas singulares (individuais)",
        porque:
          "Correto. O IRS — Imposto sobre o Rendimento das Pessoas Singulares — incide sobre individuos e agregados familiares.",
      },
      {
        texto: "Municipios e autarquias",
        porque:
          "Os municipios não pagam IRS. O IRS aplica-se a pessoas singulares.",
      },
      {
        texto: "Organizacoes sem fins lucrativos",
        porque:
          "As OSFL podem estar sujeitas a IRC. O IRS é para pessoas singulares.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 1.º CIRS — incidência do IRS sobre pessoas singulares",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-82",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A amplitude do 1.º escalão (0 a 8.342 EUR) é a base onde todos pagam a taxa mais baixa. Se um contribuinte ganha 100.000 EUR, quanto paga no 1.º escalão?",
    opcoes: [
      {
        texto: "0 EUR — não lhe é aplicado o 1.º escalão porque está num escalão alto",
        porque:
          "Todos os contribuintes pagam imposto sobre cada fatia de rendimento. Os primeiros 8.342 EUR são sempre tributados a 12,5%.",
      },
      {
        texto: "12.500 EUR (12,5% de 100.000)",
        porque:
          "12,5% não se aplica aos 100.000 EUR, mas apenas aos primeiros 8.342 EUR.",
      },
      {
        texto: "1.042,75 EUR (8.342 x 12,5%)",
        porque:
          "Correto. Independentemente do rendimento total, os primeiros 8.342 EUR são sempre tributados a 12,5% = 1.042,75 EUR.",
      },
      {
        texto: "4.800 EUR (48% de 10.000)",
        porque:
          "Cálculo sem sentido. O 1.º escalão aplica 12,5% a 8.342 EUR = 1.042,75 EUR.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º CIRS — principio da progressividade (1.º escalão universal)",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-83",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A despesa em ginasio (health club) pode ser deduzida como despesa de saúde?",
    opcoes: [
      {
        texto: "Sim, sempre que tenha prescrição médica e o ginasio passe fatura com IVA a taxa reduzida",
        porque:
          "Correto. Despesas de ginasio/atividade fisica só são deduzidas como saúde se houver prescrição médica e o ginasio emitir fatura com IVA a 6% (taxa reduzida de saúde).",
      },
      {
        texto: "Sim, qualquer ginasio com fatura serve",
        porque:
          "Sem prescrição médica e fatura a taxa de saúde, a despesa de ginasio não é considerada de saúde para efeitos de IRS.",
      },
      {
        texto: "Nunca — ginasio não é saúde para efeitos fiscais",
        porque:
          "Pode ser considerada despesa de saúde se houver prescrição médica e faturação adequada.",
      },
      {
        texto: "Só se o valor for superior a 500 EUR anuais",
        porque:
          "Não existe limiar mínimo de 500 EUR. O que importa e a prescrição médica e a faturação com IVA adequado.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 78.º-C CIRS — requisitos para dedução de despesas de saúde",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-84",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Pedir fatura com NIF nas compras do dia a dia (supermercado, restaurantes) pode ajudar a reduzir o IRS?",
    opcoes: [
      {
        texto: "Não — faturas de supermercado e restaurantes não contam para nada",
        porque:
          "Contam para a dedução de despesas gerais familiares (35% até 250 EUR por sujeito passivo).",
      },
      {
        texto: "Sim — essas faturas contam para a dedução de despesas gerais familiares",
        porque:
          "Correto. As faturas com NIF de qualquer setor contam para a dedução de despesas gerais familiares (35% das despesas, até 250 EUR).",
      },
      {
        texto: "Só contam se forem de farmacias ou hospitais",
        porque:
          "Farmacias e hospitais entram na dedução de saúde. As restantes faturas contam para despesas gerais.",
      },
      {
        texto: "Só contam se o valor total anual ultrapassar 5.000 EUR",
        porque:
          "Não há limiar mínimo para beneficiar da dedução de despesas gerais. Cada fatura conta.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-B CIRS — despesas gerais familiares",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-85",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "A Marta (solteira, sem dependentes) tem rendimento bruto anual de 18.000 EUR (categoria A). Dedução específica: 4.587,09 EUR. Rendimento coletável: 13.412,91 EUR. Qual a coleta bruta aproximada?",
    opcoes: [
      {
        texto: "Cerca de 1.838 EUR",
        porque:
          "Correto. 1.º escalão: 8.342 x 12,5% = 1.042,75. 2.º escalão: (12.587-8.342) x 15,7% = 666,47. 3.º escalão: (13.412,91-12.587) x 21,2% = 825,91 x 21,2% = 175,09. Total = 1.042,75 + 666,47 + 175,09 = 1.884,31 EUR. Arredondando, cerca de 1.884 EUR.",
      },
      {
        texto: "Cerca de 1.884 EUR",
        porque:
          "Correto. 1.º: 8.342 x 12,5% = 1.042,75. 2.º: 4.245 x 15,7% = 666,47. 3.º: (13.412,91 - 12.587) x 21,2% = 825,91 x 21,2% = 175,09. Total = 1.884,31 EUR.",
      },
      {
        texto: "Cerca de 2.843 EUR (13.412,91 x 21,2%)",
        porque:
          "Aplicar a taxa marginal de 21,2% a todo o rendimento ignora a progressividade. Os primeiros escalões tem taxas mais baixas.",
      },
      {
        texto: "Cerca de 1.400 EUR",
        porque:
          "Valor demasiado baixo. O cálculo progressivo resulta em cerca de 1.884 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — cálculo progressivo completo",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-86",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Qual é o papel da 'dedução específica' no apuramento do IRS?",
    opcoes: [
      {
        texto: "Reduzir a coleta (imposto) após o cálculo",
        porque:
          "Quem reduz a coleta são as deduções a coleta (saúde, educação, etc.). A específica atua antes, sobre o rendimento.",
      },
      {
        texto: "Converter o rendimento bruto em rendimento coletável, subtraindo um valor fixo",
        porque:
          "Correto. A dedução específica (4.587,09 EUR em 2026) subtrai-se ao rendimento bruto para chegar ao rendimento coletável, sobre o qual se aplica a tabela de escalões.",
      },
      {
        texto: "Definir o escalão do contribuinte",
        porque:
          "A dedução não define o escalão diretamente — reduz o rendimento, e o escalão resulta do rendimento coletável apurado.",
      },
      {
        texto: "Pagar antecipadamente o IRS ao longo do ano",
        porque:
          "Isso é a retenção na fonte, não a dedução específica.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 25.º CIRS — função da dedução específica",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-87",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Um contribuinte solteiro tem rendimento coletável de 90.000 EUR. Qual é a sua taxa marginal?",
    opcoes: [
      {
        texto: "44,6% (8.º escalão)",
        porque:
          "90.000 EUR ultrapassa o 8.º escalão (que vai até 86.634 EUR). O último euro está no 9.º escalão.",
      },
      {
        texto: "48,0% (9.º escalão)",
        porque:
          "Correto. 90.000 EUR ultrapassa os 86.634 EUR do 8.º escalão, situando-se no 9.º escalão com taxa de 48%.",
      },
      {
        texto: "43,1% (7.º escalão)",
        porque:
          "O 7.º escalão vai até 46.566 EUR. Com 90.000 EUR, está-se no 9.º escalão.",
      },
      {
        texto: "50% (taxa de solidariedade)",
        porque:
          "A taxa de solidariedade (2,5% adicional acima de 80.000 EUR) é separada. A taxa marginal do 9.º escalão e 48%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — taxa marginal do 9.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-88",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "A dedução de rendas de habitação permanente em 2026 tem um limite superior ao de 2025 por efeito de que lei?",
    opcoes: [
      {
        texto: "Orçamento do Estado para 2025",
        porque:
          "A atualização progressiva dos limites das rendas foi estabelecida pela Lei 36/2024, não pelo OE.",
      },
      {
        texto: "Lei 36/2024",
        porque:
          "Correto. A Lei 36/2024 estabeleceu a atualização progressiva do limite da dedução de rendas: 700 EUR em 2025, 900 EUR em 2026, 1.000 EUR a partir de 2027.",
      },
      {
        texto: "Decreto-Lei 13/2023",
        porque:
          "Referencia incorreta. A lei que atualizou os limites da dedução de rendas e a Lei 36/2024.",
      },
      {
        texto: "Não houve alteração — o limite é o mesmo desde 2020",
        porque:
          "Houve alteração. A Lei 36/2024 atualizou o limite de 502 EUR base para valores progressivamente maiores.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-É CIRS + Lei 36/2024 — atualização do limite de rendas",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-89",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Se o rendimento coletável é de 5.000 EUR, em que escalão se enquadra?",
    opcoes: [
      {
        texto: "2.º escalão (15,7%)",
        porque:
          "5.000 EUR é inferior a 8.342 EUR, logo ainda está no 1.º escalão.",
      },
      {
        texto: "Isento",
        porque:
          "O 1.º escalão tem taxa de 12,5%. Não há isenção por escalão, embora o mínimo de existência possa proteger.",
      },
      {
        texto: "1.º escalão (12,5%)",
        porque:
          "Correto. 5.000 EUR é inferior a 8.342 EUR (limite do 1.º escalão), sendo tributado a 12,5%.",
      },
      {
        texto: "3.º escalão (21,2%)",
        porque:
          "5.000 EUR está longe do 3.º escalão (que começa em 12.587 EUR).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 68.º CIRS — enquadramento no 1.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-90",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Na declaração de IRS, o que acontece se o contribuinte tiver pago retenções na fonte superiores ao imposto final apurado?",
    opcoes: [
      {
        texto: "Perde o excesso — as retenções não são reembolsadas",
        porque:
          "Incorreto. O excesso de retenção é devolvido ao contribuinte sob forma de reembolso.",
      },
      {
        texto: "Recebe um reembolso pela diferença",
        porque:
          "Correto. Se as retenções ao longo do ano excederem o imposto final, o contribuinte recebe a diferença como reembolso de IRS.",
      },
      {
        texto: "O excesso é aplicado no IRS do ano seguinte",
        porque:
          "O reembolso é feito no próprio ano de liquidação, não é transferido para o ano seguinte.",
      },
      {
        texto: "Só recebe reembolso se declarar dentro do prazo",
        porque:
          "O reembolso depende de ter pago retenções a mais, não apenas do prazo (embora a entrega no prazo seja obrigatória).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 97.º CIRS — reembolso de retenções em excesso",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-91",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O contribuinte A tem rendimento coletável de 8.342 EUR (limite do 1.º escalão). O contribuinte B tem 8.343 EUR (1 EUR a mais). Quanto mais imposto paga B do que A?",
    opcoes: [
      {
        texto: "0,157 EUR (1 EUR x 15,7%)",
        porque:
          "Correto. Esse 1 EUR extra entra no 2.º escalão com taxa de 15,7%. Paga apenas 15,7 centimos a mais.",
      },
      {
        texto: "Cerca de 260 EUR — sobe todo o rendimento para a taxa do 2.º escalão",
        porque:
          "Mito. Só o 1 EUR extra é tributado a 15,7%. Os primeiros 8.342 EUR continuam a 12,5%.",
      },
      {
        texto: "0,125 EUR (1 EUR x 12,5%)",
        porque:
          "O euro extra já não está no 1.º escalão. Entra no 2.º, com taxa de 15,7%.",
      },
      {
        texto: "0 EUR — o limite do escalão e inclusivo",
        porque:
          "O euro acima do limite é tributado no escalão seguinte. O imposto aumenta, ainda que minimamente.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 68.º CIRS — transição entre escalões",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-92",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Num casal em tributação conjunta com rendimento coletável total de 24.000 EUR, qual é a coleta total (antes de deduções a coleta)?",
    opcoes: [
      {
        texto: "Cerca de 1.890 EUR",
        porque:
          "Cálculo: 24.000 / 2 = 12.000 EUR por conjuge. 1.º escalão: 8.342 x 12,5% = 1.042,75. 2.º escalão: (12.000 - 8.342) x 15,7% = 3.658 x 15,7% = 574,31. Imposto por conjuge = 1.617,06. Total x 2 = 3.234,12 EUR.",
      },
      {
        texto: "Cerca de 3.234 EUR",
        porque:
          "Correto. 24.000 / 2 = 12.000 por conjuge. Imposto: 8.342 x 12,5% = 1.042,75 + (12.000 - 8.342) x 15,7% = 3.658 x 15,7% = 574,31. Total por conjuge = 1.617,06. Multiplicar por 2 = 3.234,12 EUR.",
      },
      {
        texto: "Cerca de 5.784 EUR (24.000 x 24,1%)",
        porque:
          "Aplicar a taxa marginal a todo o rendimento ignora a progressividade e o quociente conjugal.",
      },
      {
        texto: "Cerca de 2.400 EUR",
        porque:
          "Valor incorreto. O cálculo com quociente conjugal da 3.234,12 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º e 69.º CIRS — cálculo com quociente conjugal",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-93",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "Um dependente de 2 anos da direito a que valor de dedução?",
    opcoes: [
      {
        texto: "600 EUR",
        porque:
          "600 EUR e para dependentes acima de 3 anos. Um dependente de 2 anos tem 3 anos ou menos.",
      },
      {
        texto: "726 EUR",
        porque:
          "Correto. Dependentes com 3 anos ou menos (como um bebe de 2 anos) conferem dedução de 726 EUR.",
      },
      {
        texto: "900 EUR",
        porque:
          "900 EUR aplica-se ao 2.º dependente e seguintes com 6 anos ou menos, não automaticamente a um bebe de 2 anos.",
      },
      {
        texto: "500 EUR",
        porque:
          "Valor inexistente. Dependentes até 3 anos conferem 726 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º-A CIRS — dedução por dependente até 3 anos",
    fonte: fonte("art78aCirs"),
  },
  {
    id: "esc-94",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "O contribuinte tem coleta de IRS de 800 EUR e deduções a coleta de 1.200 EUR (dependentes + saúde). Qual é a coleta liquida?",
    opcoes: [
      {
        texto: "-400 EUR (o Estado paga-lhe)",
        porque:
          "A coleta liquida não pode ser negativa. Quando as deduções excedem a coleta, o mínimo é zero.",
      },
      {
        texto: "0 EUR",
        porque:
          "Correto. As deduções a coleta não podem gerar imposto negativo. Quando as deduções excedem a coleta, o imposto é zero (não há reembolso pelo excesso de deduções a coleta).",
      },
      {
        texto: "400 EUR",
        porque:
          "O valor não é 400 EUR. A coleta fica a zero porque as deduções (1.200) excedem a coleta (800).",
      },
      {
        texto: "800 EUR — as deduções não se aplicam quando excedem a coleta",
        porque:
          "As deduções aplicam-se, reduzindo a coleta a zero. Não se ignora as deduções.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 78.º CIRS — coleta liquida mínima de zero",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-95",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "A família Silva (tributação conjunta) tem rendimento coletável de 60.000 EUR, 2 filhos (5 e 7 anos), 6.000 EUR de despesas de saúde e 2.500 EUR de educação. Quais são as deduções a coleta disponíveis?",
    opcoes: [
      {
        texto: "Dependentes: 1.200 EUR. Saúde: 900 EUR. Educacao: 750 EUR. Total: 2.850 EUR",
        porque:
          "Correto. 2 dependentes > 3 anos: 2 x 600 = 1.200 EUR. Saúde: 15% x 6.000 = 900 EUR (< limite de 1.000). Educacao: 30% x 2.500 = 750 EUR (< limite de 800). Total = 2.850 EUR.",
      },
      {
        texto: "Dependentes: 1.452 EUR. Saúde: 1.000 EUR. Educacao: 800 EUR. Total: 3.252 EUR",
        porque:
          "1.452 EUR seria 2 x 726 (bebes), mas ambos os filhos tem mais de 3 anos, logo é 2 x 600.",
      },
      {
        texto: "Dependentes: 1.200 EUR. Saúde: 1.000 EUR. Educacao: 800 EUR. Total: 3.000 EUR",
        porque:
          "15% de 6.000 = 900, não 1.000. É 30% de 2.500 = 750, não 800.",
      },
      {
        texto: "Total: 8.500 EUR (somando todas as despesas)",
        porque:
          "As despesas não são deduzidas na integra. Aplicam-se percentagens e limites máximos.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 78.º-A, 78.º-C e 78.º-D CIRS — deduções combinadas",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-96",
    categoria: "escaloes_deducoes",
    dificuldade: 2,
    pergunta:
      "Em que ordem se aplicam as deduções no cálculo do IRS?",
    opcoes: [
      {
        texto: "Primeiro as deduções a coleta, depois a dedução específica",
        porque:
          "A ordem e inversa. A dedução específica vem primeiro (rendimento bruto -> coletável) e as deduções a coleta vem depois (coleta bruta -> coleta liquida).",
      },
      {
        texto: "Primeiro a dedução específica (para apurar o rendimento coletável), depois os escalões, é só depois as deduções a coleta",
        porque:
          "Correto. 1.º: rendimento bruto - dedução específica = rendimento coletável. 2.º: aplicar escalões = coleta bruta. 3.º: coleta bruta - deduções a coleta = coleta liquida.",
      },
      {
        texto: "Tudo se aplica simultaneamente ao rendimento bruto",
        porque:
          "As deduções aplicam-se em fases distintas: a específica sobre o rendimento, as restantes sobre a coleta.",
      },
      {
        texto: "Não existe ordem — o contribuinte escolhe",
        porque:
          "A ordem e definida pela lei e e sequencial: dedução específica, escalões, deduções a coleta.",
      },
    ],
    correta: 1,
    legalBasis: "CIRS — sequência de apuramento do IRS",
    fonte: fonte("art78cirs"),
  },
  {
    id: "esc-97",
    categoria: "escaloes_deducoes",
    dificuldade: 1,
    pergunta:
      "A taxa de 15,7% do 2.º escalão aplica-se a que porção do rendimento?",
    opcoes: [
      {
        texto: "A totalidade do rendimento coletável",
        porque:
          "Num sistema progressivo, 15,7% aplica-se apenas a porção entre 8.342 e 12.587 EUR.",
      },
      {
        texto: "A porção entre 8.342 EUR e 12.587 EUR",
        porque:
          "Correto. A taxa do 2.º escalão (15,7%) incide apenas sobre o rendimento entre 8.342 EUR (fim do 1.º) e 12.587 EUR (fim do 2.º).",
      },
      {
        texto: "A porção acima de 12.587 EUR",
        porque:
          "Acima de 12.587 EUR entra-se no 3.º escalão (21,2%). O 2.º escalão vai até 12.587 EUR.",
      },
      {
        texto: "Aos primeiros 8.342 EUR",
        porque:
          "Os primeiros 8.342 EUR são tributados a 12,5% (1.º escalão), não a 15,7%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — aplicação da taxa do 2.º escalão",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-98",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "Um independente (categoria B, simplificado, coeficiente 0,75) fatura 40.000 EUR brutos. Rendimento tributável: 40.000 x 0,75 = 30.000 EUR. Dedução específica de 4.587,09 EUR. Rendimento coletável: 25.412,91 EUR. Em que escalão cai o último euro?",
    opcoes: [
      {
        texto: "4.º escalão (17.838 a 23.089 EUR)",
        porque:
          "25.412,91 EUR ultrapassa o 4.º escalão (que vai até 23.089 EUR).",
      },
      {
        texto: "5.º escalão (23.089 a 29.397 EUR)",
        porque:
          "Correto. 25.412,91 EUR situa-se entre 23.089 e 29.397, ou seja, no 5.º escalão com taxa marginal de 31,1%.",
      },
      {
        texto: "6.º escalão (29.397 a 43.090 EUR)",
        porque:
          "25.412,91 EUR ainda não atinge o 6.º escalão (que começa em 29.397 EUR).",
      },
      {
        texto: "3.º escalão (12.587 a 17.838 EUR)",
        porque:
          "25.412,91 EUR ultrapassa em muito o 3.º escalão.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º e Art. 68.º CIRS — regime simplificado é escalões",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-99",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "A diferença entre a taxa marginal é a taxa efetiva é mais pronunciada em rendimentos elevados ou baixos?",
    opcoes: [
      {
        texto: "Em rendimentos baixos — a diferença e grande porque pagam pouco",
        porque:
          "Em rendimentos muito baixos (1.º escalão), a taxa marginal e a efetiva são iguais (12,5%). A diferença cresce com o rendimento.",
      },
      {
        texto: "Em rendimentos elevados — porque mais escalões com taxas baixas 'puxam' a media para baixo",
        porque:
          "Correto. Quanto mais alto o rendimento, mais escalões são atravessados. Os escalões inferiores (12,5%, 15,7%, etc.) reduzem a media, criando maior diferença entre a marginal (ex.: 48%) e a efetiva.",
      },
      {
        texto: "É igual para todos — a diferença é sempre proporcional",
        porque:
          "A diferença varia. No 1.º escalão e zero; nos escalões superiores e cada vez maior.",
      },
      {
        texto: "Não existe diferença — marginal e efetiva são sinonimos",
        porque:
          "São conceitos distintos. A marginal é a taxa do último escalão; a efetiva é a taxa media sobre todo o rendimento.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — relação entre taxa marginal e efetiva",
    fonte: fonte("art68cirs"),
  },
  {
    id: "esc-100",
    categoria: "escaloes_deducoes",
    dificuldade: 3,
    pergunta:
      "O contribuinte tem rendimento coletável de 86.634 EUR (limite exato do 8.º escalão). Ganha mais 10.000 EUR, passando a 96.634 EUR. Quanto paga a mais de IRS por esses 10.000 EUR adicionais?",
    opcoes: [
      {
        texto: "4.460 EUR (10.000 x 44,6%)",
        porque:
          "44,6% é a taxa do 8.º escalão. Os 10.000 EUR adicionais já estão no 9.º escalão (48%).",
      },
      {
        texto: "4.800 EUR (10.000 x 48%)",
        porque:
          "Correto. Os 10.000 EUR adicionais caem integralmente no 9.º escalão (acima de 86.634 EUR), sendo tributados a 48%. 10.000 x 48% = 4.800 EUR.",
      },
      {
        texto: "3.110 EUR (10.000 x 31,1%)",
        porque:
          "31,1% é a taxa do 5.º escalão. Os 10.000 EUR extras estão no 9.º escalão (48%).",
      },
      {
        texto: "10.000 EUR — acima do 8.º escalão paga-se imposto total",
        porque:
          "Nunca se paga 100% de imposto. A taxa máxima e 48%, resultando em 4.800 EUR sobre 10.000.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — impacto do 9.º escalão",
    fonte: fonte("art68cirs"),
  },
];
