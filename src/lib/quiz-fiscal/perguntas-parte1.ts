import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_PARTE_1: QuizPergunta[] = [
  {
    id: "ret-1",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um designer gráfico (atividade do Art. 151.º CIRS) emite um recibo verde de 1.000 €. Qual a taxa de retenção na fonte de IRS a aplicar?",
    opcoes: [
      {
        texto: "11,5%",
        porque:
          "Esta é a taxa para 'outras prestações de serviços' fora da tabela do Art. 151.º — não é o caso de um designer (código 1336).",
      },
      {
        texto: "16,5%",
        porque:
          "Esta taxa aplica-se a direitos de autor e cedência de propriedade intelectual, não a profissões liberais do Art. 151.º.",
      },
      {
        texto: "23%",
        porque:
          "Profissões da tabela do Art. 151.º CIRS (como designers, código 1336) têm retenção de 23%, reduzida de 25% para 23% pelo OE2025.",
      },
      {
        texto: "0% — sem retenção",
        porque:
          "Só as vendas de bens estão dispensadas de retenção — a prestação de serviços de um designer está sujeita a retenção (23%).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-2",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um consultor de marketing/redes sociais (atividade fora da tabela do Art. 151.º, código residual 1519) emite um recibo verde. Qual a retenção na fonte aplicável?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% é a retenção das profissões do Art. 151.º (ex.: publicitários, código 1333). Um consultor de marketing fora dessa tabela não tem esta taxa.",
      },
      {
        texto: "11,5%",
        porque:
          "Atividades de prestação de serviços fora da tabela do Art. 151.º (código residual 1519) têm retenção de 11,5%, ao abrigo do Art. 101.º CIRS.",
      },
      {
        texto: "16,5%",
        porque:
          "16,5% aplica-se a direitos de autor/propriedade intelectual, não a serviços de consultoria de marketing.",
      },
      {
        texto: "6%",
        porque:
          "6% é uma taxa reduzida de IVA — não existe nenhuma taxa de retenção de IRS de 6%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-3",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um escritor recebe direitos de autor pela venda da sua obra literária própria. Que retenção na fonte de IRS se aplica a este rendimento?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% aplica-se às profissões liberais do Art. 151.º (ex.: arquitetos, engenheiros), não a direitos de autor.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% é a taxa residual para outras prestações de serviços (Art. 101.º CIRS), diferente do tratamento dado a direitos de autor.",
      },
      {
        texto: "16,5%",
        porque:
          "Direitos de autor e cedência de propriedade intelectual têm retenção de 16,5%, ao abrigo do Art. 101.º CIRS.",
      },
      {
        texto: "Isento de retenção, como uma venda de bens",
        porque:
          "Direitos de autor não são vendas de bens/mercadorias — estão sujeitos a retenção (16,5%), salvo dispensa por baixo volume de faturação (Art. 101.º-B).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — direitos de autor e propriedade intelectual",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-4",
    categoria: "retencao",
    dificuldade: 1,
    pergunta:
      "Um artesão vende as suas peças (venda de bens/mercadorias) através de recibos verdes. Qual a retenção na fonte de IRS sobre estes recibos?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% aplica-se a profissões liberais do Art. 151.º — a venda de bens/mercadorias não está nesta categoria.",
      },
      {
        texto: "11,5%",
        porque:
          "11,5% aplica-se a prestações de serviços fora do Art. 151.º — a venda de bens tem regra própria (sem retenção).",
      },
      {
        texto: "16,5%",
        porque: "16,5% aplica-se a direitos de autor, não à venda de mercadorias.",
      },
      {
        texto: "0% — sem retenção",
        porque:
          "A retenção na fonte de IRS incide sobre prestações de serviços; vendas de bens/mercadorias não estão sujeitas a retenção.",
      },
    ],
    correta: 3,
    legalBasis: "Vendas de bens/mercadorias — não sujeitas a retenção na fonte (Art. 101.º CIRS)",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ret-5",
    categoria: "retencao",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente que prevê faturar 12.000 € num ano (abaixo de 15.000 €) pode solicitar ao cliente que...",
    opcoes: [
      {
        texto: "...cobre 23% de retenção mesmo assim, 'por segurança'.",
        porque:
          "Não é necessário cobrar retenção 'por segurança' — quem prevê faturar abaixo do limiar tem o direito de pedir a dispensa.",
      },
      {
        texto: "...não retenha o IRS na fonte, ao abrigo da dispensa do Art. 101.º-B CIRS.",
        porque:
          "Quem prevê um rendimento anual inferior a 15.000 € pode solicitar a dispensa de retenção na fonte (Art. 101.º-B, n.º 1, al. a) CIRS).",
      },
      {
        texto: "...emita a fatura sem qualquer menção a IVA, seja qual for a atividade.",
        porque:
          "A isenção de IVA é um regime distinto (Art. 53.º CIVA), com limiar igual (15.000 €) mas que depende da atividade — não é o que está em causa nesta pergunta sobre retenção.",
      },
      {
        texto: "...aplique automaticamente a taxa reduzida de IVA de 6%.",
        porque:
          "A taxa de IVA depende da natureza da atividade, não do volume de faturação previsto — e não tem relação com a dispensa de retenção de IRS.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º-B, n.º 1, al. a) CIRS",
    fonte: fonte("art101bCirs"),
  },
  {
    id: "ret-6",
    categoria: "retencao",
    dificuldade: 1,
    pergunta: "A retenção na fonte feita em cada recibo verde é...",
    opcoes: [
      {
        texto: "...um imposto definitivo e separado do IRS anual.",
        porque:
          "A retenção não é um imposto definitivo — é descontada à coleta de IRS apurada na declaração anual (Modelo 3).",
      },
      {
        texto: "...um adiantamento por conta do imposto (IRS) apurado na declaração anual.",
        porque:
          "A retenção na fonte funciona como um adiantamento do IRS: no final, é deduzida ao imposto total apurado nos escalões do Art. 68.º CIRS.",
      },
      {
        texto: "...uma contribuição para a Segurança Social.",
        porque:
          "A Segurança Social tem taxa e cálculo próprios (21,4% sobre 70%/20% do rendimento) e é paga separadamente — não através da retenção de IRS.",
      },
      {
        texto: "...opcional: o trabalhador escolhe se quer ou não que seja retida.",
        porque:
          "A retenção é obrigatória sempre que a atividade estiver sujeita a ela e o limiar de dispensa (15.000 €/ano) não se aplique — não é uma escolha livre.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção na fonte sobre rendimentos da categoria B",
    fonte: fonte("art101cirs"),
  },
  {
    id: "iva-1",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Qual é o limite de volume de negócios anual abaixo do qual um trabalhador independente está isento de IVA, em Portugal (Art. 53.º CIVA)?",
    opcoes: [
      {
        texto: "10.000 €",
        porque: "10.000 € não corresponde ao limiar legal de isenção — o valor em vigor é 15.000 €.",
      },
      {
        texto: "12.500 €",
        porque: "12.500 € não corresponde ao valor em vigor — o limiar de isenção do Art. 53.º CIVA é 15.000 €.",
      },
      {
        texto: "15.000 €",
        porque: "O Art. 53.º CIVA isenta de IVA quem tem um volume de negócios anual inferior a 15.000 €.",
      },
      {
        texto: "20.000 €",
        porque: "20.000 € não corresponde ao limiar legal — o valor de isenção em vigor é 15.000 €.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-2",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um prestador de serviços isento de IVA fatura 17.000 € num ano (acima de 15.000 € mas abaixo de 18.750 €). O que acontece à isenção de IVA?",
    opcoes: [
      {
        texto: "Perde a isenção imediatamente, nesse mesmo ano.",
        porque:
          "A perda imediata só ocorre se o volume de negócios exceder 125% do limiar (18.750 €) — 17.000 € fica abaixo desse valor.",
      },
      {
        texto: "Mantém a isenção até ao fim do ano, mas perde-a a partir de janeiro do ano seguinte.",
        porque:
          "Entre 15.000 € e 18.750 € (125% do limiar), a isenção mantém-se nesse ano mas é perdida a partir de 1 de janeiro do ano seguinte (Art. 53.º/58.º CIVA).",
      },
      {
        texto: "Não acontece nada — a isenção mantém-se sempre, seja qual for o valor faturado.",
        porque:
          "Ultrapassar 15.000 € tem consequências: entre 15.000 € e 18.750 €, a isenção termina no ano seguinte; acima de 18.750 €, termina de imediato.",
      },
      {
        texto: "Passa automaticamente para a taxa reduzida de 6% em todas as faturas.",
        porque:
          "Ao perder a isenção, aplica-se a taxa correspondente à atividade exercida (frequentemente 23%), não automaticamente a taxa reduzida.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º / Art. 58.º CIVA — excesso de 25% sobre o limiar",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-3",
    categoria: "iva",
    dificuldade: 1,
    pergunta: "Qual é a taxa normal de IVA em Portugal Continental?",
    opcoes: [
      {
        texto: "13%",
        porque: "13% é a taxa intermédia em Portugal Continental, não a taxa normal.",
      },
      {
        texto: "21%",
        porque: "21% não corresponde à taxa normal em vigor em Portugal Continental (23%).",
      },
      {
        texto: "23%",
        porque: "A taxa normal de IVA em Portugal Continental é de 23% (Art. 18.º CIVA).",
      },
      {
        texto: "6%",
        porque: "6% é a taxa reduzida em Portugal Continental, não a taxa normal.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Portugal continental",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-4",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Na Região Autónoma dos Açores, qual é a taxa reduzida de IVA?",
    opcoes: [
      {
        texto: "4%",
        porque: "A taxa reduzida nos Açores é de 4% (Art. 18.º CIVA).",
      },
      {
        texto: "5%",
        porque: "5% é a taxa reduzida na Madeira, não nos Açores.",
      },
      {
        texto: "6%",
        porque: "6% é a taxa reduzida em Portugal Continental, não nos Açores (que tem taxas próprias mais baixas).",
      },
      {
        texto: "9%",
        porque: "9% corresponde à taxa intermédia dos Açores, não à taxa reduzida.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — Região Autónoma dos Açores",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-5",
    categoria: "iva",
    dificuldade: 2,
    pergunta: "Qual é a taxa normal de IVA na Região Autónoma dos Açores?",
    opcoes: [
      {
        texto: "16%",
        porque: "A taxa normal de IVA nos Açores é de 16% (Art. 18.º CIVA).",
      },
      {
        texto: "22%",
        porque: "22% é a taxa normal na Madeira, não nos Açores.",
      },
      {
        texto: "23%",
        porque: "23% é a taxa normal em Portugal Continental — os Açores têm taxas mais baixas.",
      },
      {
        texto: "13%",
        porque:
          "13% é a taxa intermédia em Portugal Continental — não corresponde à taxa normal dos Açores (16%).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — Região Autónoma dos Açores",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-6",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "As três taxas de IVA em Portugal Continental (reduzida, intermédia, normal) são, respetivamente:",
    opcoes: [
      {
        texto: "4% / 9% / 16%",
        porque: "Estas são as taxas em vigor nos Açores, não no Continente.",
      },
      {
        texto: "5% / 12% / 22%",
        porque: "Estas são aproximadamente as taxas da Madeira, não as do Continente.",
      },
      {
        texto: "6% / 13% / 23%",
        porque:
          "Em Portugal Continental, as taxas de IVA são 6% (reduzida), 13% (intermédia) e 23% (normal), nos termos do Art. 18.º CIVA.",
      },
      {
        texto: "6% / 13% / 21%",
        porque: "A taxa normal em Portugal Continental é 23%, não 21%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Portugal continental",
    fonte: fonte("occIVA"),
  },
  {
    id: "ss-1",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta: "Qual é a taxa contributiva da Segurança Social para trabalhadores independentes?",
    opcoes: [
      {
        texto: "11%",
        porque:
          "11% é a taxa contributiva dos trabalhadores por conta de outrem (parte do trabalhador) — não a dos independentes.",
      },
      {
        texto: "21,4%",
        porque:
          "A taxa contributiva dos trabalhadores independentes é de 21,4%, nos termos do Art. 168.º do Código Contributivo.",
      },
      {
        texto: "23,75%",
        porque:
          "23,75% é a taxa global da entidade empregadora no regime geral — não se aplica a trabalhadores independentes.",
      },
      {
        texto: "34,75%",
        porque:
          "34,75% é a soma das taxas de entidade patronal + trabalhador no regime geral, não a taxa do trabalhador independente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º do Código Contributivo — taxa contributiva do TI",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-2",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "Um consultor (prestação de serviços) tem 2.000 € de rendimento relevante mensal. Sobre que valor incide a taxa de 21,4% da Segurança Social?",
    opcoes: [
      {
        texto: "Sobre os 2.000 € na totalidade.",
        porque: "Para prestação de serviços, a SS não incide sobre 100% do rendimento, mas sobre 70% dele.",
      },
      {
        texto: "Sobre 70% do rendimento (1.400 €).",
        porque:
          "Para prestação de serviços, a base de incidência da SS é 70% do rendimento relevante (Art. 162.º Código Contributivo).",
      },
      {
        texto: "Sobre 20% do rendimento (400 €).",
        porque: "20% é a base aplicável a venda de bens, hotelaria e restauração — não a prestação de serviços.",
      },
      {
        texto: "Sobre 35% do rendimento (700 €).",
        porque:
          "35% não corresponde a nenhuma base de incidência da SS para independentes — as bases são 70% (serviços) ou 20% (bens).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º Código Contributivo — prestação de serviços",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-3",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "Um motorista de TVDE ou um comerciante (venda de bens) tem a sua contribuição para a Segurança Social calculada sobre que percentagem do rendimento?",
    opcoes: [
      {
        texto: "70%",
        porque:
          "70% é a base para prestação de serviços — venda de bens/hotelaria/transporte de passageiros usa uma base diferente (20%).",
      },
      {
        texto: "50%",
        porque: "50% não corresponde a nenhuma das bases de incidência previstas no Código Contributivo (70% ou 20%).",
      },
      {
        texto: "20%",
        porque:
          "Para produção/venda de bens, hotelaria e restauração, a base de incidência da SS é de 20% do rendimento (Art. 162.º Código Contributivo).",
      },
      {
        texto: "100%",
        porque: "Nunca se aplica a totalidade do rendimento como base — as bases são sempre 70% ou 20%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º Código Contributivo — produção/venda de bens, hotelaria e restauração",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-4",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta: "Qual é o valor do Indexante dos Apoios Sociais (IAS) em 2026?",
    opcoes: [
      {
        texto: "480,43 €",
        porque: "Este valor não corresponde ao IAS de 2026 — o valor em vigor é 537,13 €.",
      },
      {
        texto: "509,26 €",
        porque: "Este valor não corresponde ao IAS de 2026 — o valor em vigor é 537,13 €.",
      },
      {
        texto: "537,13 €",
        porque:
          "O IAS para 2026 é de 537,13 €, e serve de base a vários limites da Segurança Social e do IRS Jovem.",
      },
      {
        texto: "600,00 €",
        porque: "600,00 € não corresponde ao valor oficial do IAS para 2026 (537,13 €).",
      },
    ],
    correta: 2,
    legalBasis: "Indexante dos Apoios Sociais (IAS) 2026",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-5",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O teto mensal do rendimento relevante para efeitos de Segurança Social corresponde a 12 vezes o IAS. Em 2026, qual é esse valor?",
    opcoes: [
      {
        texto: "5.371,30 €",
        porque: "Este valor corresponde a 10 × IAS, não a 12 × IAS.",
      },
      {
        texto: "6.445,56 €",
        porque: "12 × 537,13 € = 6.445,56 €. É o teto mensal do rendimento relevante para a Segurança Social.",
      },
      {
        texto: "7.000,00 €",
        porque: "Não corresponde ao cálculo de 12 × IAS (537,13 €), que resulta em 6.445,56 €.",
      },
      {
        texto: "12.880,00 €",
        porque: "12.880 € corresponde ao mínimo de existência de IRS (Art. 70.º CIRS), não ao teto mensal de SS.",
      },
    ],
    correta: 1,
    legalBasis: "Limite de 12 × IAS ao rendimento relevante mensal médio",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-6",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "Quem inicia atividade independente, sem ter exercido atividade independente nos 3 anos anteriores, está isento de pagar Segurança Social durante quanto tempo?",
    opcoes: [
      {
        texto: "Os primeiros 6 meses.",
        porque: "O período de isenção previsto no Código Contributivo é de 12 meses, não 6.",
      },
      {
        texto: "Os primeiros 12 meses de atividade.",
        porque:
          "O Art. 157.º do Código Contributivo prevê isenção de contribuições nos primeiros 12 meses, para quem não exerceu atividade independente nos 3 anos anteriores.",
      },
      {
        texto: "Os primeiros 24 meses.",
        porque: "24 meses não corresponde ao período legal de isenção — o correto é 12 meses.",
      },
      {
        texto: "Para sempre, enquanto faturar menos de 15.000 €/ano.",
        porque: "A isenção dos primeiros 12 meses não depende do volume de faturação, e não é permanente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 157.º Código Contributivo — isenção nos primeiros 12 meses de atividade",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-7",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta: "Qual é a contribuição mínima mensal de Segurança Social para um trabalhador independente?",
    opcoes: [
      {
        texto: "10 €",
        porque: "10 € não corresponde ao valor mínimo legal — a contribuição mínima é 20 €.",
      },
      {
        texto: "20 €",
        porque: "O Art. 168.º do Código Contributivo fixa a contribuição mínima mensal em 20 €.",
      },
      {
        texto: "50 €",
        porque: "50 € não corresponde ao valor mínimo legal — a contribuição mínima é 20 €.",
      },
      {
        texto: "Não existe mínimo — paga-se sempre 21,4% sobre a base, mesmo que dê 0 €.",
        porque:
          "Existe um valor mínimo de 20 €/mês, independentemente do resultado de 21,4% sobre a base de incidência.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º Código Contributivo — contribuição mínima mensal",
    fonte: fonte("segSocialGov"),
  },
];
