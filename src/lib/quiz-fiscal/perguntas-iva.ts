import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_IVA: QuizPergunta[] = [
  // ──────────────────────────────────────────────────────────────────────
  //  TAXAS POR REGIÃO
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-7",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa intermédia de IVA em Portugal Continental?",
    opcoes: [
      {
        texto: "6%",
        porque:
          "6% é a taxa reduzida em Portugal Continental, não a intermédia.",
      },
      {
        texto: "13%",
        porque:
          "A taxa intermédia de IVA em Portugal Continental é de 13% (Art. 18.º CIVA).",
      },
      {
        texto: "12%",
        porque:
          "12% é a taxa intermédia na Madeira, não no Continente.",
      },
      {
        texto: "9%",
        porque:
          "9% é a taxa intermédia nos Açores, não no Continente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA — Portugal continental",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-8",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Qual é a taxa reduzida de IVA em Portugal Continental?",
    opcoes: [
      {
        texto: "4%",
        porque:
          "4% é a taxa reduzida nos Açores, não no Continente.",
      },
      {
        texto: "5%",
        porque:
          "5% é a taxa reduzida na Madeira, não no Continente.",
      },
      {
        texto: "6%",
        porque:
          "A taxa reduzida de IVA em Portugal Continental é de 6% (Art. 18.º CIVA).",
      },
      {
        texto: "8%",
        porque:
          "Não existe nenhuma taxa de IVA de 8% em Portugal.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Portugal continental",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-9",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Quais são as três taxas de IVA na Região Autónoma da Madeira (reduzida, intermédia, normal)?",
    opcoes: [
      {
        texto: "5% / 12% / 22%",
        porque:
          "Na Madeira, as taxas de IVA são 5% (reduzida), 12% (intermédia) e 22% (normal), conforme o Art. 18.º CIVA.",
      },
      {
        texto: "4% / 9% / 16%",
        porque:
          "Estas são as taxas dos Açores, não da Madeira.",
      },
      {
        texto: "6% / 13% / 23%",
        porque:
          "Estas são as taxas de Portugal Continental, não da Madeira.",
      },
      {
        texto: "5% / 13% / 23%",
        porque:
          "A taxa reduzida da Madeira é 5%, mas a intermédia é 12% (não 13%) e a normal é 22% (não 23%).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA — Região Autónoma da Madeira",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-10",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Quais são as três taxas de IVA na Região Autónoma dos Açores (reduzida, intermédia, normal)?",
    opcoes: [
      {
        texto: "5% / 12% / 22%",
        porque:
          "Estas são as taxas da Madeira, não dos Açores.",
      },
      {
        texto: "6% / 13% / 23%",
        porque:
          "Estas são as taxas de Portugal Continental, não dos Açores.",
      },
      {
        texto: "4% / 9% / 16%",
        porque:
          "Nos Açores, as taxas de IVA são 4% (reduzida), 9% (intermédia) e 16% (normal), conforme o Art. 18.º CIVA.",
      },
      {
        texto: "4% / 12% / 18%",
        porque:
          "A taxa reduzida dos Açores é 4%, mas a intermédia é 9% (não 12%) e a normal é 16% (não 18%).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Região Autónoma dos Açores",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-11",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual é a taxa normal de IVA na Região Autónoma da Madeira?",
    opcoes: [
      {
        texto: "23%",
        porque:
          "23% é a taxa normal em Portugal Continental — a Madeira tem uma taxa própria mais baixa.",
      },
      {
        texto: "22%",
        porque:
          "A taxa normal de IVA na Madeira é de 22% (Art. 18.º CIVA).",
      },
      {
        texto: "16%",
        porque:
          "16% é a taxa normal nos Açores, não na Madeira.",
      },
      {
        texto: "20%",
        porque:
          "Não existe nenhuma taxa de IVA de 20% em Portugal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA — Região Autónoma da Madeira",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-12",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual é a taxa intermédia de IVA na Região Autónoma da Madeira?",
    opcoes: [
      {
        texto: "9%",
        porque:
          "9% é a taxa intermédia nos Açores, não na Madeira.",
      },
      {
        texto: "13%",
        porque:
          "13% é a taxa intermédia em Portugal Continental, não na Madeira.",
      },
      {
        texto: "10%",
        porque:
          "Não existe nenhuma taxa de IVA de 10% em Portugal.",
      },
      {
        texto: "12%",
        porque:
          "A taxa intermédia de IVA na Madeira é de 12% (Art. 18.º CIVA).",
      },
    ],
    correta: 3,
    legalBasis: "Art. 18.º CIVA — Região Autónoma da Madeira",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-13",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual é a taxa reduzida de IVA na Região Autónoma da Madeira?",
    opcoes: [
      {
        texto: "6%",
        porque:
          "6% é a taxa reduzida em Portugal Continental, não na Madeira.",
      },
      {
        texto: "4%",
        porque:
          "4% é a taxa reduzida nos Açores, não na Madeira.",
      },
      {
        texto: "5%",
        porque:
          "A taxa reduzida de IVA na Madeira é de 5% (Art. 18.º CIVA).",
      },
      {
        texto: "7%",
        porque:
          "Não existe nenhuma taxa de IVA de 7% em Portugal.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Região Autónoma da Madeira",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-14",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Qual é a taxa intermédia de IVA na Região Autónoma dos Açores?",
    opcoes: [
      {
        texto: "12%",
        porque:
          "12% é a taxa intermédia na Madeira, não nos Açores.",
      },
      {
        texto: "13%",
        porque:
          "13% é a taxa intermédia em Portugal Continental, não nos Açores.",
      },
      {
        texto: "9%",
        porque:
          "A taxa intermédia de IVA nos Açores é de 9% (Art. 18.º CIVA).",
      },
      {
        texto: "6%",
        porque:
          "6% é a taxa reduzida em Portugal Continental, não a taxa intermédia dos Açores.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Região Autónoma dos Açores",
    fonte: fonte("occIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  ISENÇÃO ART. 53.º — LIMIAR DE 15.000 €
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-15",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um freelancer que fature 12.000 € por ano está obrigado a cobrar IVA aos seus clientes?",
    opcoes: [
      {
        texto: "Sim, a taxa normal de 23%.",
        porque:
          "Faturando abaixo de 15.000 €, o freelancer pode beneficiar da isenção do Art. 53.º CIVA e não cobrar IVA.",
      },
      {
        texto: "Sim, mas apenas a taxa reduzida de 6%.",
        porque:
          "Não existe uma taxa especial para freelancers com baixo volume — com faturação abaixo de 15.000 €, aplica-se a isenção do Art. 53.º.",
      },
      {
        texto: "Não, está isento ao abrigo do Art. 53.º CIVA (faturação < 15.000 €).",
        porque:
          "Com volume de negócios inferior a 15.000 €/ano, o freelancer beneficia da isenção de IVA prevista no Art. 53.º CIVA.",
      },
      {
        texto: "Depende da atividade exercida — algumas pagam sempre IVA.",
        porque:
          "A isenção do Art. 53.º aplica-se independentemente do tipo de atividade, desde que o volume de negócios seja inferior a 15.000 €.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-16",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "O que significa estar 'isento de IVA ao abrigo do Art. 53.º CIVA'?",
    opcoes: [
      {
        texto: "Não cobrar IVA nas faturas, mas poder deduzir o IVA das compras.",
        porque:
          "Os isentos pelo Art. 53.º não cobram IVA mas também NÃO podem deduzir o IVA das suas compras profissionais.",
      },
      {
        texto: "Não cobrar IVA nas faturas e não poder deduzir o IVA das compras profissionais.",
        porque:
          "A isenção do Art. 53.º dispensa o freelancer de cobrar IVA, mas em contrapartida não permite deduzir o IVA suportado nas despesas.",
      },
      {
        texto: "Pagar apenas metade da taxa normal de IVA.",
        porque:
          "A isenção do Art. 53.º é total — não existe meia isenção.",
      },
      {
        texto: "Cobrar IVA mas não o entregar ao Estado.",
        porque:
          "Cobrar IVA sem o entregar ao Estado seria fraude fiscal. A isenção significa simplesmente não cobrar IVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-17",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Que menção deve constar obrigatoriamente nas faturas de um trabalhador independente isento de IVA?",
    opcoes: [
      {
        texto: "\"IVA — taxa zero\"",
        porque:
          "\"Taxa zero\" não existe em Portugal — a menção correta refere-se ao artigo de isenção.",
      },
      {
        texto: "\"IVA — isento, Art. 53.º do CIVA\"",
        porque:
          "As faturas de sujeitos passivos isentos devem mencionar expressamente o artigo de isenção aplicável (Art. 53.º CIVA).",
      },
      {
        texto: "Nenhuma menção especial é necessária.",
        porque:
          "É obrigatório indicar o motivo da isenção na fatura, citando o artigo legal aplicável.",
      },
      {
        texto: "\"Sem IVA por opção do prestador\"",
        porque:
          "A isenção não é por opção livre — decorre da lei (Art. 53.º CIVA) e deve ser citada na fatura.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA · Art. 36.º, n.º 6 CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  EXCESSO DO LIMIAR — 18.750 € (125% de 15.000 €)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-18",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual é o valor a partir do qual um freelancer isento perde a isenção de IVA imediatamente (dentro do próprio ano)?",
    opcoes: [
      {
        texto: "15.000 €",
        porque:
          "Ao ultrapassar 15.000 € mas ficar abaixo de 18.750 €, a perda de isenção só ocorre no ano seguinte, não de imediato.",
      },
      {
        texto: "18.750 €",
        porque:
          "A perda imediata de isenção ocorre quando o volume de negócios excede 125% do limiar (125% × 15.000 € = 18.750 €).",
      },
      {
        texto: "20.000 €",
        porque:
          "20.000 € não corresponde ao limiar legal — o valor de perda imediata é 18.750 € (125% de 15.000 €).",
      },
      {
        texto: "25.000 €",
        porque:
          "25.000 € não é um limiar previsto na lei — a perda imediata de isenção ocorre aos 18.750 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º / Art. 58.º CIVA — limiar de 125%",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-19",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer isento de IVA fatura 19.000 € num ano. O que acontece?",
    opcoes: [
      {
        texto: "Mantém a isenção até ao fim do ano e perde-a no ano seguinte.",
        porque:
          "Esse regime aplica-se apenas entre 15.000 € e 18.750 €. Acima de 18.750 €, a perda é imediata.",
      },
      {
        texto: "Perde a isenção de imediato, nesse mesmo ano, porque ultrapassou 18.750 € (125% de 15.000 €).",
        porque:
          "Ao ultrapassar 125% do limiar (18.750 €), o freelancer perde a isenção de IVA de forma imediata nesse ano.",
      },
      {
        texto: "Nada acontece — o limite de isenção é 20.000 €.",
        porque:
          "O limite de isenção é 15.000 €, com perda imediata acima de 18.750 €. O valor de 20.000 € não está previsto.",
      },
      {
        texto: "Paga apenas uma multa, mas mantém a isenção.",
        porque:
          "Não se trata de uma multa — o freelancer passa obrigatoriamente ao regime normal de IVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º / Art. 58.º CIVA — excesso superior a 125%",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-20",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer isento fatura 16.500 € num ano (entre 15.000 € e 18.750 €). Qual o efeito na sua isenção de IVA?",
    opcoes: [
      {
        texto: "Perde a isenção de imediato.",
        porque:
          "A perda imediata só ocorre acima de 18.750 €. Entre 15.000 € e 18.750 €, a isenção cessa no ano seguinte.",
      },
      {
        texto: "Mantém a isenção para sempre, pois o excesso é inferior a 25%.",
        porque:
          "Mesmo um excesso inferior a 25% causa a perda de isenção — mas só a partir do ano seguinte.",
      },
      {
        texto: "Mantém a isenção nesse ano, mas perde-a a partir de 1 de janeiro do ano seguinte.",
        porque:
          "Entre 15.000 € e 18.750 €, o freelancer mantém a isenção no ano em curso mas perde-a a partir de janeiro do ano seguinte.",
      },
      {
        texto: "Passa automaticamente para a taxa reduzida de 6%.",
        porque:
          "Ao perder a isenção, aplica-se a taxa correspondente à atividade (geralmente 23%), não automaticamente a reduzida.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º / Art. 58.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-21",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Como se calcula o limiar de 18.750 € para perda imediata da isenção de IVA?",
    opcoes: [
      {
        texto: "É 150% do limiar de isenção (150% × 15.000 € = 22.500 €).",
        porque:
          "O multiplicador é 125%, não 150%. 125% × 15.000 € = 18.750 €.",
      },
      {
        texto: "É 125% do limiar de isenção (125% × 15.000 € = 18.750 €).",
        porque:
          "O limiar de perda imediata é calculado como 125% do limite de isenção: 15.000 € × 1,25 = 18.750 €.",
      },
      {
        texto: "É um valor fixo definido em portaria, sem relação com o limiar de isenção.",
        porque:
          "O valor de 18.750 € resulta diretamente do Art. 53.º/58.º CIVA — é 125% do limiar de 15.000 €.",
      },
      {
        texto: "É 110% do limiar de isenção (110% × 15.000 € = 16.500 €).",
        porque:
          "O multiplicador legal é 125%, não 110%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º / Art. 58.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  IVA EM FATURAS — CÁLCULO E OBRIGAÇÕES
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-22",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um consultor no regime normal de IVA fatura 1.000 € de honorários. Quanto IVA deve acrescentar à fatura (taxa normal, Continente)?",
    opcoes: [
      {
        texto: "60 € (6%)",
        porque:
          "6% é a taxa reduzida — a maioria dos serviços de consultoria está sujeita à taxa normal de 23%.",
      },
      {
        texto: "130 € (13%)",
        porque:
          "13% é a taxa intermédia — serviços de consultoria aplicam a taxa normal de 23%.",
      },
      {
        texto: "230 € (23%)",
        porque:
          "Serviços de consultoria no Continente estão sujeitos à taxa normal de 23%: 1.000 € × 23% = 230 €.",
      },
      {
        texto: "0 € — consultoria é isenta de IVA.",
        porque:
          "A consultoria não é uma atividade isenta por natureza. No regime normal, aplica-se a taxa de 23%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — taxa normal",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-23",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Num recibo verde com IVA, qual é o valor total que o cliente paga se os honorários são 500 € e a taxa de IVA é 23%?",
    opcoes: [
      {
        texto: "500 €",
        porque:
          "500 € é apenas o valor base — ao IVA de 23% (115 €) soma-se aos honorários.",
      },
      {
        texto: "615 €",
        porque:
          "O valor total é base + IVA: 500 € + (500 € × 23%) = 500 € + 115 € = 615 €.",
      },
      {
        texto: "575 €",
        porque:
          "575 € corresponderia a uma taxa de 15%, que não é uma taxa de IVA em Portugal.",
      },
      {
        texto: "565 €",
        porque:
          "565 € corresponderia a uma taxa de 13%. A taxa normal no Continente é 23% (total: 615 €).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-24",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um designer no regime normal de IVA faz um serviço por 1.230 € (valor com IVA incluído, taxa 23%). Qual é o valor base dos honorários?",
    opcoes: [
      {
        texto: "1.000 €",
        porque:
          "Para extrair a base de um valor com IVA incluído: 1.230 € ÷ 1,23 = 1.000 €. O IVA corresponde a 230 €.",
      },
      {
        texto: "947,15 €",
        porque:
          "Este valor resultaria de subtrair 23% ao total (1.230 × 0,77), o que é um cálculo incorreto.",
      },
      {
        texto: "1.050 €",
        porque:
          "1.050 € não corresponde a nenhum cálculo correto com a taxa de 23%.",
      },
      {
        texto: "1.230 €",
        porque:
          "1.230 € é o valor total com IVA — a base é inferior (1.230 ÷ 1,23 = 1.000 €).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  DECLARAÇÕES PERIÓDICAS — TRIMESTRAL VS MENSAL
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-25",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Com que periodicidade deve um trabalhador independente no regime normal de IVA submeter a declaração periódica de IVA, por regra?",
    opcoes: [
      {
        texto: "Mensalmente.",
        porque:
          "A periodicidade mensal aplica-se apenas a quem tem volume de negócios superior a 650.000 €/ano. A regra geral é trimestral.",
      },
      {
        texto: "Trimestralmente.",
        porque:
          "A regra geral é a declaração trimestral de IVA para a maioria dos trabalhadores independentes no regime normal.",
      },
      {
        texto: "Anualmente.",
        porque:
          "Não existe regime anual de declaração de IVA — a periodicidade é trimestral ou mensal.",
      },
      {
        texto: "Semestralmente.",
        porque:
          "Não existe regime semestral de declaração de IVA em Portugal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 41.º CIVA — periodicidade da declaração",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-26",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "A partir de que volume de negócios anual a declaração periódica de IVA passa a ser obrigatoriamente mensal?",
    opcoes: [
      {
        texto: "100.000 €",
        porque:
          "100.000 € não é o limiar — o regime mensal obrigatório aplica-se a partir de 650.000 €.",
      },
      {
        texto: "500.000 €",
        porque:
          "500.000 € não é o valor correto — o limiar legal é 650.000 €.",
      },
      {
        texto: "650.000 €",
        porque:
          "Sujeitos passivos com volume de negócios anual superior a 650.000 € são obrigados ao regime mensal de declaração de IVA.",
      },
      {
        texto: "1.000.000 €",
        porque:
          "1.000.000 € não corresponde ao limiar legal — o regime mensal é obrigatório a partir de 650.000 €.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 41.º CIVA — regime mensal",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-27",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual é o prazo para submeter a declaração periódica trimestral de IVA?",
    opcoes: [
      {
        texto: "Até ao dia 15 do 2.º mês seguinte ao fim do trimestre.",
        porque:
          "O prazo é até ao dia 20 (não dia 15) do 2.º mês seguinte ao fim do trimestre.",
      },
      {
        texto: "Até ao dia 20 do 2.º mês seguinte ao fim do trimestre.",
        porque:
          "A declaração trimestral deve ser submetida até ao dia 20 do 2.º mês seguinte ao trimestre (ex.: 1.º trimestre → até 20 de maio).",
      },
      {
        texto: "Até ao último dia do mês seguinte ao fim do trimestre.",
        porque:
          "O prazo legal é o dia 20 do 2.º mês seguinte, não o último dia do mês seguinte.",
      },
      {
        texto: "Até ao dia 10 do mês seguinte ao fim do trimestre.",
        porque:
          "O dia 10 do mês seguinte é prazo de IVA mensal, não trimestral.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 41.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-28",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Qual é o prazo para submeter a declaração periódica mensal de IVA?",
    opcoes: [
      {
        texto: "Até ao dia 20 do 2.º mês seguinte àquele a que respeitam as operações.",
        porque:
          "O prazo do regime mensal é até ao dia 10 (não 20) do 2.º mês seguinte.",
      },
      {
        texto: "Até ao dia 10 do 2.º mês seguinte àquele a que respeitam as operações.",
        porque:
          "No regime mensal, a declaração periódica de IVA deve ser submetida até ao dia 10 do 2.º mês seguinte ao período.",
      },
      {
        texto: "Até ao último dia do mês seguinte.",
        porque:
          "Este prazo não está correto — no regime mensal, é até ao dia 10 do 2.º mês seguinte.",
      },
      {
        texto: "Até ao dia 15 do mês seguinte.",
        porque:
          "O prazo é até ao dia 10 do 2.º mês seguinte, não dia 15 do mês seguinte.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 41.º CIVA — regime mensal",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-29",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um trabalhador independente isento de IVA (Art. 53.º) precisa de submeter declarações periódicas de IVA?",
    opcoes: [
      {
        texto: "Sim, trimestralmente como todos os sujeitos passivos.",
        porque:
          "Os isentos pelo Art. 53.º estão dispensados de submeter declarações periódicas de IVA.",
      },
      {
        texto: "Sim, mas apenas uma declaração anual resumo.",
        porque:
          "Não existe declaração anual resumo de IVA para os isentos pelo Art. 53.º — estão simplesmente dispensados.",
      },
      {
        texto: "Não, os isentos pelo Art. 53.º estão dispensados da declaração periódica de IVA.",
        porque:
          "Os sujeitos passivos isentos ao abrigo do Art. 53.º não têm a obrigação de submeter declarações periódicas de IVA.",
      },
      {
        texto: "Depende — só se tiverem despesas com IVA.",
        porque:
          "A dispensa é automática para todos os isentos pelo Art. 53.º, independentemente das despesas.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º / Art. 29.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  REVERSE CHARGE — SERVIÇOS INTRA-UE
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-30",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um programador português presta serviços a uma empresa sediada na Alemanha (B2B intracomunitário). Deve liquidar IVA na fatura?",
    opcoes: [
      {
        texto: "Sim, à taxa normal portuguesa de 23%.",
        porque:
          "Em prestações B2B intracomunitárias, o IVA é devido no país do adquirente (reverse charge) — o prestador português não liquida IVA.",
      },
      {
        texto: "Sim, à taxa normal alemã de 19%.",
        porque:
          "O prestador português não aplica taxas alemãs — a regra é o reverse charge: o adquirente autoliquida no seu país.",
      },
      {
        texto: "Não — aplica-se a regra de reverse charge e o IVA é devido no país do adquirente.",
        porque:
          "Nas prestações de serviços B2B intracomunitárias (Art. 6.º CIVA), o IVA é liquidado pelo adquirente no seu Estado-Membro (reverse charge).",
      },
      {
        texto: "Não, porque serviços digitais são sempre isentos de IVA.",
        porque:
          "Serviços digitais não são isentos — a razão para não liquidar IVA é a regra de localização (reverse charge), não uma isenção.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 6.º CIVA — localização das prestações de serviços B2B",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-31",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um designer português presta um serviço a um particular (B2C) residente em França. Onde é devido o IVA?",
    opcoes: [
      {
        texto: "No país do prestador (Portugal) — regra geral B2C.",
        porque:
          "Na regra geral B2C (Art. 6.º CIVA), os serviços prestados a particulares são tributados no país do prestador (Portugal).",
      },
      {
        texto: "No país do adquirente (França), como no B2B.",
        porque:
          "A regra B2B não se aplica a particulares. Na regra geral B2C, o IVA é devido em Portugal (país do prestador).",
      },
      {
        texto: "Não é devido IVA em nenhum país.",
        porque:
          "O IVA é sempre devido — a questão é apenas onde. Na regra geral B2C, é em Portugal.",
      },
      {
        texto: "Metade em cada país.",
        porque:
          "Não existe repartição de IVA entre países — o imposto é devido integralmente num único Estado.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 6.º CIVA — regra geral B2C",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-32",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Que menção deve o prestador incluir na fatura quando aplica reverse charge numa prestação de serviços intracomunitária B2B?",
    opcoes: [
      {
        texto: "\"IVA — isento, Art. 53.º CIVA\"",
        porque:
          "O Art. 53.º é a isenção por volume de negócios, não se refere a operações intracomunitárias.",
      },
      {
        texto: "\"IVA — autoliquidação\" (reverse charge), com indicação do Art. 6.º CIVA.",
        porque:
          "A fatura deve mencionar que se aplica o mecanismo de autoliquidação (reverse charge) e citar o artigo de localização (Art. 6.º CIVA).",
      },
      {
        texto: "Não é necessário nenhuma menção especial.",
        porque:
          "É obrigatório indicar o motivo da não liquidação de IVA, incluindo a referência legal.",
      },
      {
        texto: "\"IVA à taxa zero\"",
        porque:
          "Não existe taxa zero em Portugal — a fatura deve referir a autoliquidação e o Art. 6.º CIVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 6.º CIVA · Art. 36.º, n.º 6 CIVA",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-33",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Para aplicar o reverse charge a uma prestação intra-UE B2B, que número do cliente estrangeiro deve o freelancer verificar?",
    opcoes: [
      {
        texto: "O NIF português do cliente.",
        porque:
          "O cliente estrangeiro não tem NIF português — deve validar-se o número de identificação IVA (VAT number) do país do adquirente.",
      },
      {
        texto: "O número de identificação IVA (VAT number) do cliente, validado no sistema VIES.",
        porque:
          "Deve verificar-se o VAT number do adquirente no sistema VIES da Comissão Europeia para confirmar que é um sujeito passivo noutro Estado-Membro.",
      },
      {
        texto: "O número de passaporte do cliente.",
        porque:
          "O passaporte não é relevante para efeitos de IVA — é necessário o VAT number validado no VIES.",
      },
      {
        texto: "Não é necessário verificar nenhum número.",
        porque:
          "Para aplicar o reverse charge, é obrigatório verificar que o adquirente é sujeito passivo de IVA noutro Estado-Membro (VIES).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 6.º CIVA · Regulamento (UE) n.º 904/2010",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-34",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer português presta serviços a uma empresa dos EUA (fora da UE). Deve liquidar IVA na fatura?",
    opcoes: [
      {
        texto: "Sim, à taxa normal de 23%.",
        porque:
          "Em prestações B2B a entidades de países terceiros, o serviço considera-se localizado no país do adquirente (fora da UE), pelo que não há liquidação de IVA português.",
      },
      {
        texto: "Não — o serviço considera-se localizado fora de Portugal (país do adquirente).",
        porque:
          "Nas prestações de serviços B2B a adquirentes fora da UE, o IVA não é devido em Portugal (Art. 6.º CIVA).",
      },
      {
        texto: "Sim, mas à taxa reduzida de 6% para exportações.",
        porque:
          "Não existe taxa reduzida especial para exportações de serviços — e neste caso o IVA português não é sequer aplicável.",
      },
      {
        texto: "Depende do tipo de serviço prestado.",
        porque:
          "A regra geral B2B de localização aplica-se independentemente do tipo de serviço: o IVA é devido no país do adquirente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 6.º CIVA — prestações B2B a países terceiros",
    fonte: fonte("art6civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  DEDUÇÃO DE IVA PARA FREELANCERS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-35",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer no regime normal de IVA compra um computador para uso exclusivamente profissional. Pode deduzir o IVA dessa compra?",
    opcoes: [
      {
        texto: "Não, freelancers nunca podem deduzir IVA.",
        porque:
          "Freelancers no regime normal de IVA podem deduzir o IVA suportado em despesas profissionais.",
      },
      {
        texto: "Sim, pode deduzir o IVA suportado na declaração periódica.",
        porque:
          "No regime normal, o IVA suportado em despesas exclusivamente profissionais é dedutível na declaração periódica de IVA.",
      },
      {
        texto: "Sim, mas apenas 50% do IVA.",
        porque:
          "Se o bem é de uso exclusivamente profissional, deduz-se 100% do IVA. A limitação de 50% aplica-se a bens de uso misto (ex.: viaturas).",
      },
      {
        texto: "Sim, mas só se o valor for superior a 500 €.",
        porque:
          "Não existe um limiar mínimo de valor para deduzir IVA — a dedução depende do uso profissional, não do montante.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 19.º a 25.º CIVA — dedução do IVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-36",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer isento pelo Art. 53.º compra material de escritório com IVA. Pode deduzir esse IVA?",
    opcoes: [
      {
        texto: "Sim, na declaração periódica de IVA.",
        porque:
          "Os isentos pelo Art. 53.º não submetem declaração periódica de IVA e não podem deduzir o IVA suportado.",
      },
      {
        texto: "Sim, na declaração de IRS.",
        porque:
          "O IVA suportado não se deduz no IRS — a dedução de IVA faz-se na declaração periódica de IVA, à qual os isentos não estão obrigados.",
      },
      {
        texto: "Não — os isentos pelo Art. 53.º não podem deduzir o IVA suportado nas compras.",
        porque:
          "A contrapartida da isenção do Art. 53.º é que o freelancer não cobra IVA mas também não deduz o IVA das suas despesas.",
      },
      {
        texto: "Sim, pedindo reembolso diretamente à AT.",
        porque:
          "Não existe mecanismo de reembolso direto de IVA para isentos pelo Art. 53.º.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º CIVA · Art. 19.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-37",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer no regime normal usa o telemóvel 60% para fins profissionais e 40% para fins pessoais. Como deduz o IVA da fatura do telemóvel?",
    opcoes: [
      {
        texto: "Deduz 100% do IVA, pois usa maioritariamente para trabalho.",
        porque:
          "A dedução deve ser proporcional ao uso profissional efetivo, não ao uso maioritário.",
      },
      {
        texto: "Deduz 60% do IVA, proporcionalmente ao uso profissional.",
        porque:
          "O IVA de bens de uso misto é dedutível na proporção do uso profissional. Neste caso, 60% do IVA é dedutível.",
      },
      {
        texto: "Não pode deduzir nada, pois o bem não é 100% profissional.",
        porque:
          "Bens de uso misto permitem a dedução proporcional do IVA — não é necessário uso 100% profissional.",
      },
      {
        texto: "Deduz 50% sempre, independentemente do uso efetivo.",
        porque:
          "A dedução proporcional baseia-se no uso efetivo, que pode ser diferente de 50%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 23.º CIVA — pro rata / utilização mista",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  IVA VS RETENÇÃO NA FONTE (CONFUSÃO COMUM)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-38",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "O IVA e a retenção na fonte de IRS são o mesmo imposto?",
    opcoes: [
      {
        texto: "Sim, são nomes diferentes para o mesmo imposto.",
        porque:
          "São impostos distintos: o IVA é um imposto sobre o consumo; a retenção é um adiantamento de IRS (imposto sobre o rendimento).",
      },
      {
        texto: "Não — o IVA é um imposto sobre o consumo e a retenção é um adiantamento de IRS.",
        porque:
          "O IVA incide sobre o consumo de bens e serviços; a retenção na fonte é um pagamento antecipado de IRS sobre o rendimento do prestador.",
      },
      {
        texto: "Sim, a retenção é simplesmente o IVA cobrado na fonte.",
        porque:
          "A retenção refere-se ao IRS (imposto sobre o rendimento), não ao IVA (imposto sobre o consumo).",
      },
      {
        texto: "São o mesmo imposto, mas com nomes diferentes conforme a região.",
        porque:
          "Não são o mesmo imposto — o IVA existe em todo o território e a retenção é um mecanismo de cobrança de IRS, igualmente nacional.",
      },
    ],
    correta: 1,
    legalBasis: "CIVA (IVA) · Art. 101.º CIRS (retenção na fonte)",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-39",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer no regime normal emite uma fatura de 1.000 € + IVA a uma empresa portuguesa. A empresa faz retenção na fonte de 23%. Que valores constam na fatura?",
    opcoes: [
      {
        texto: "Base: 1.000 € · IVA (23%): 230 € · Retenção IRS (23%): −230 € · Total a receber: 1.000 €.",
        porque:
          "O IVA incide sobre a base (1.000 €) e a retenção de IRS também incide sobre a base (1.000 €). Total: 1.000 + 230 − 230 = 1.000 €.",
      },
      {
        texto: "Base: 1.000 € · IVA (23%): 230 € · Retenção IRS (23%): −282,90 € · Total a receber: 947,10 €.",
        porque:
          "A retenção incide sobre a base (1.000 €), não sobre a base + IVA. A retenção é 230 €, não 282,90 €.",
      },
      {
        texto: "Base: 1.000 € · IVA: 0 € (anulado pela retenção) · Total a receber: 770 €.",
        porque:
          "O IVA não é anulado pela retenção — são mecanismos independentes. O IVA é cobrado e entregue ao Estado; a retenção é descontada no pagamento.",
      },
      {
        texto: "Base: 1.000 € · IVA: 230 € · Sem retenção, porque já cobra IVA · Total: 1.230 €.",
        porque:
          "Cobrar IVA não dispensa a retenção na fonte de IRS — são obrigações independentes.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 18.º CIVA · Art. 101.º CIRS",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-40",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Quem fica com o IVA cobrado pelo freelancer ao cliente?",
    opcoes: [
      {
        texto: "O freelancer, como parte dos seus honorários.",
        porque:
          "O IVA não é rendimento do freelancer — é um imposto que ele cobra em nome do Estado e que deve entregar à AT.",
      },
      {
        texto: "O Estado — o freelancer cobra o IVA e entrega-o à AT na declaração periódica.",
        porque:
          "O IVA é um imposto cobrado pelo prestador de serviços mas entregue ao Estado através da declaração periódica de IVA.",
      },
      {
        texto: "O cliente, através de reembolso automático.",
        porque:
          "O cliente paga o IVA ao freelancer; se for sujeito passivo, pode deduzi-lo no seu próprio IVA, mas não recebe reembolso direto.",
      },
      {
        texto: "A Segurança Social.",
        porque:
          "O IVA é entregue à Autoridade Tributária (AT), não à Segurança Social.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 27.º CIVA — entrega do imposto",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MECÂNICA DO ART. 53.º — RENÚNCIA E REGRESSO
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-41",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer isento pelo Art. 53.º pode optar voluntariamente por cobrar IVA?",
    opcoes: [
      {
        texto: "Não, a isenção é obrigatória e irrevogável.",
        porque:
          "A isenção do Art. 53.º não é irrevogável — o sujeito passivo pode renunciar e passar ao regime normal.",
      },
      {
        texto: "Sim, pode renunciar à isenção e passar ao regime normal de IVA.",
        porque:
          "O freelancer pode optar por renunciar à isenção do Art. 53.º e enquadrar-se no regime normal, passando a cobrar e deduzir IVA.",
      },
      {
        texto: "Sim, mas apenas durante o primeiro ano de atividade.",
        porque:
          "A renúncia à isenção pode ser feita a qualquer momento, não apenas no primeiro ano.",
      },
      {
        texto: "Sim, mas só se faturar mais de 10.000 €.",
        porque:
          "Não existe um limiar mínimo para renunciar à isenção — qualquer isento pelo Art. 53.º pode fazê-lo.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º, n.º 3 CIVA — renúncia à isenção",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-42",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Se um freelancer renuncia à isenção do Art. 53.º, durante quanto tempo mínimo deve permanecer no regime normal?",
    opcoes: [
      {
        texto: "1 ano.",
        porque:
          "O período mínimo de permanência no regime normal após renúncia não é de apenas 1 ano.",
      },
      {
        texto: "3 anos.",
        porque:
          "O período mínimo de permanência é de 5 anos, não 3.",
      },
      {
        texto: "5 anos.",
        porque:
          "Após renúncia à isenção do Art. 53.º, o freelancer deve permanecer no regime normal durante um período mínimo de 5 anos.",
      },
      {
        texto: "Sem período mínimo — pode regressar à isenção a qualquer momento.",
        porque:
          "Existe um período mínimo obrigatório de 5 anos no regime normal após a renúncia.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º, n.º 3 CIVA — período mínimo de permanência",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-43",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Após os 5 anos de permanência obrigatória no regime normal, o freelancer pode regressar à isenção do Art. 53.º?",
    opcoes: [
      {
        texto: "Não, uma vez no regime normal nunca pode voltar atrás.",
        porque:
          "Após o período mínimo de 5 anos, pode regressar à isenção se o volume de negócios for inferior ao limiar de 15.000 €.",
      },
      {
        texto: "Sim, automaticamente e sem condições.",
        porque:
          "O regresso não é automático — exige que o volume de negócios seja inferior a 15.000 € e que o período mínimo tenha decorrido.",
      },
      {
        texto: "Sim, se o volume de negócios for inferior a 15.000 € e apresentar a declaração de alterações.",
        porque:
          "Cumprido o período mínimo de 5 anos, se a faturação for inferior a 15.000 €, o freelancer pode regressar à isenção através de uma declaração de alterações.",
      },
      {
        texto: "Sim, mas precisa de autorização especial da AT.",
        porque:
          "Não é necessária autorização especial — basta cumprir o período mínimo e o limiar de faturação, e submeter a declaração de alterações.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 53.º, n.º 3 CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  PERDA DE ISENÇÃO — O QUE FAZER
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-44",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Ao perder a isenção do Art. 53.º, que obrigação declarativa deve o freelancer cumprir junto da AT?",
    opcoes: [
      {
        texto: "Submeter uma declaração de início de atividade.",
        porque:
          "A declaração de início de atividade é para quem começa a trabalhar — neste caso, o freelancer já tem atividade aberta e deve submeter uma declaração de alterações.",
      },
      {
        texto: "Submeter uma declaração de alterações para mudar o enquadramento de IVA.",
        porque:
          "O freelancer deve submeter uma declaração de alterações no Portal das Finanças para transitar do regime de isenção para o regime normal de IVA.",
      },
      {
        texto: "Nada — a AT faz a alteração automaticamente.",
        porque:
          "A alteração de enquadramento não é automática — o freelancer deve apresentar a declaração de alterações.",
      },
      {
        texto: "Enviar um requerimento escrito por carta à AT.",
        porque:
          "O processo é feito online no Portal das Finanças, através da declaração de alterações.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 32.º CIVA — declaração de alterações",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-45",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Quando um freelancer perde a isenção do Art. 53.º no ano seguinte (faturou entre 15.000 € e 18.750 €), em que mês deve apresentar a declaração de alterações?",
    opcoes: [
      {
        texto: "Em janeiro do ano seguinte.",
        porque:
          "A declaração de alterações deve ser apresentada durante o mês de janeiro do ano em que a isenção deixa de se aplicar.",
      },
      {
        texto: "Em março do ano seguinte.",
        porque:
          "O prazo é janeiro (não março) do ano em que a isenção cessa.",
      },
      {
        texto: "No mês em que ultrapassou os 15.000 €.",
        porque:
          "Quando o excesso fica entre 15.000 € e 18.750 €, a isenção mantém-se até ao fim do ano — a declaração de alterações é em janeiro seguinte.",
      },
      {
        texto: "Até 15 de fevereiro do ano seguinte.",
        porque:
          "O prazo é durante o mês de janeiro, não fevereiro.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 58.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  REGISTO E ENQUADRAMENTO IVA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-46",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Onde é que um trabalhador independente faz o seu enquadramento de IVA em Portugal?",
    opcoes: [
      {
        texto: "Nos balcões da Segurança Social.",
        porque:
          "A Segurança Social trata das contribuições sociais, não do IVA — o enquadramento de IVA faz-se na AT.",
      },
      {
        texto: "No Portal das Finanças (AT), na declaração de início de atividade.",
        porque:
          "O enquadramento de IVA é feito na declaração de início de atividade, submetida no Portal das Finanças da Autoridade Tributária.",
      },
      {
        texto: "Na Câmara Municipal.",
        porque:
          "A Câmara Municipal não gere impostos como o IVA — essa responsabilidade é da AT.",
      },
      {
        texto: "Não é necessário qualquer registo — o IVA é aplicado automaticamente.",
        porque:
          "O enquadramento de IVA é definido na declaração de início de atividade e pode ser alterado posteriormente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIVA — declaração de início de atividade",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-47",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Ao abrir atividade no Portal das Finanças com previsão de faturação de 8.000 € por ano, que regime de IVA será enquadrado?",
    opcoes: [
      {
        texto: "Regime normal — todos os freelancers começam no regime normal.",
        porque:
          "Freelancers com previsão de faturação inferior a 15.000 € podem começar no regime de isenção do Art. 53.º.",
      },
      {
        texto: "Regime de isenção ao abrigo do Art. 53.º CIVA.",
        porque:
          "Com previsão de faturação inferior a 15.000 €/ano, o freelancer é enquadrado no regime de isenção do Art. 53.º CIVA.",
      },
      {
        texto: "Regime de IVA de caixa.",
        porque:
          "O regime de IVA de caixa é um regime especial que não se aplica automaticamente pelo volume de negócios.",
      },
      {
        texto: "Sem enquadramento de IVA — só se regista após o primeiro ano.",
        porque:
          "O enquadramento de IVA é obrigatório desde o início da atividade.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  IVA EM TIPOS ESPECÍFICOS DE SERVIÇOS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-48",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "A que taxa de IVA está sujeita a prestação de serviços de consultoria informática em Portugal Continental?",
    opcoes: [
      {
        texto: "6% (taxa reduzida).",
        porque:
          "A taxa reduzida aplica-se a bens e serviços essenciais (ex.: alimentação básica). Consultoria informática está na taxa normal.",
      },
      {
        texto: "13% (taxa intermédia).",
        porque:
          "A taxa intermédia aplica-se a produtos como restauração. Serviços de consultoria informática estão sujeitos à taxa normal.",
      },
      {
        texto: "23% (taxa normal).",
        porque:
          "Serviços de consultoria informática em Portugal Continental estão sujeitos à taxa normal de IVA de 23%.",
      },
      {
        texto: "Isento de IVA por natureza.",
        porque:
          "Consultoria informática não é uma atividade isenta por natureza — está sujeita à taxa normal (a menos que o freelancer esteja isento pelo Art. 53.º).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — taxa normal",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-49",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Que tipo de serviços pode estar sujeito à taxa intermédia de IVA (13% no Continente)?",
    opcoes: [
      {
        texto: "Serviços de programação e desenvolvimento web.",
        porque:
          "Serviços de programação e TI estão sujeitos à taxa normal (23%), não à intermédia.",
      },
      {
        texto: "Serviços de alimentação e bebidas (restauração).",
        porque:
          "Serviços de restauração (alimentação e bebidas) estão listados na Lista II do CIVA, sujeitando-se à taxa intermédia de 13%.",
      },
      {
        texto: "Serviços jurídicos e de advocacia.",
        porque:
          "Serviços jurídicos estão sujeitos à taxa normal (23%), não à intermédia.",
      },
      {
        texto: "Serviços de contabilidade.",
        porque:
          "Serviços de contabilidade estão sujeitos à taxa normal (23%), não à intermédia.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA · Lista II do CIVA",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-50",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Que tipo de bens ou serviços pode estar sujeito à taxa reduzida de IVA (6% no Continente)?",
    opcoes: [
      {
        texto: "Serviços de design gráfico.",
        porque:
          "Serviços de design gráfico estão sujeitos à taxa normal (23%).",
      },
      {
        texto: "Serviços de reparação de automóveis.",
        porque:
          "Reparação de automóveis está sujeita à taxa normal (23%).",
      },
      {
        texto: "Bens alimentares essenciais (pão, leite, fruta, legumes).",
        porque:
          "Bens alimentares essenciais constam da Lista I do CIVA e estão sujeitos à taxa reduzida de 6%.",
      },
      {
        texto: "Serviços de consultoria de gestão.",
        porque:
          "Serviços de consultoria de gestão estão sujeitos à taxa normal (23%).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA · Lista I do CIVA",
    fonte: fonte("art18civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  RECUPERAÇÃO / REEMBOLSO DE IVA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-51",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Se num trimestre o IVA dedutível (nas compras) excede o IVA liquidado (nas vendas/serviços), o que acontece ao crédito de IVA?",
    opcoes: [
      {
        texto: "Perde-se — o IVA excedente não pode ser recuperado.",
        porque:
          "O crédito de IVA não se perde — pode ser reportado para o período seguinte ou reembolsado sob certas condições.",
      },
      {
        texto: "O crédito é reportado para o período seguinte ou pode ser pedido reembolso.",
        porque:
          "Quando o IVA dedutível excede o IVA liquidado, o crédito transita para o período seguinte. Se persistir por 12 meses ou exceder 250 €, pode pedir-se reembolso.",
      },
      {
        texto: "A AT envia automaticamente um cheque com o reembolso.",
        porque:
          "O reembolso não é automático — deve ser solicitado na declaração periódica de IVA, sob certas condições.",
      },
      {
        texto: "O IVA a mais é convertido em crédito de IRS.",
        porque:
          "O crédito de IVA é independente do IRS — transita dentro do sistema de IVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 22.º CIVA — reporte e reembolso",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-52",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer no regime normal tem um crédito de IVA que se mantém durante 12 meses consecutivos. Qual o valor mínimo para pedir reembolso?",
    opcoes: [
      {
        texto: "100 €.",
        porque:
          "O montante mínimo para pedir reembolso com crédito persistente por 12 meses é 250 €, não 100 €.",
      },
      {
        texto: "250 €.",
        porque:
          "Se o crédito de IVA se mantiver durante 12 meses consecutivos e for superior a 250 €, o sujeito passivo pode pedir reembolso.",
      },
      {
        texto: "500 €.",
        porque:
          "O limiar é 250 €, não 500 €.",
      },
      {
        texto: "Não há montante mínimo.",
        porque:
          "Existe um limiar mínimo de 250 € para pedir reembolso após 12 meses de crédito.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 22.º, n.º 5 CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  ATIVIDADES MISTAS E PRO-RATA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-53",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "O que é o método do pro rata de dedução de IVA?",
    opcoes: [
      {
        texto: "É a taxa de IVA aplicável a produtos importados.",
        porque:
          "O pro rata não é uma taxa de IVA — é um método para calcular a proporção de IVA dedutível quando há atividades mistas.",
      },
      {
        texto: "É a percentagem de IVA dedutível por um sujeito passivo com atividades mistas (sujeitas e isentas).",
        porque:
          "O pro rata é a fração do IVA suportado que pode ser deduzida, calculada com base na proporção entre operações tributáveis e o total das operações.",
      },
      {
        texto: "É a taxa de juro aplicável ao IVA em atraso.",
        porque:
          "O pro rata não tem relação com juros de mora — é um método de cálculo da dedução proporcional de IVA.",
      },
      {
        texto: "É a distribuição do IVA entre o Estado e a Segurança Social.",
        porque:
          "O IVA é integralmente entregue ao Estado (AT). O pro rata refere-se à dedução proporcional.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 23.º CIVA — pro rata de dedução",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-54",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer exerce duas atividades: uma sujeita a IVA (consultoria, 70% da faturação) e outra isenta (formação profissional prevista no Art. 9.º, 30% da faturação). Qual o pro rata de dedução?",
    opcoes: [
      {
        texto: "100% — pode deduzir todo o IVA.",
        porque:
          "Só se pode deduzir todo o IVA se todas as atividades forem tributáveis. Com 30% de atividade isenta, o pro rata é inferior a 100%.",
      },
      {
        texto: "70% — proporção das operações tributáveis no total.",
        porque:
          "O pro rata é calculado como a proporção das operações que conferem direito a dedução sobre o total: 70% / (70% + 30%) = 70%.",
      },
      {
        texto: "30% — proporção das operações isentas.",
        porque:
          "O pro rata baseia-se na proporção das operações tributáveis (70%), não das isentas (30%).",
      },
      {
        texto: "0% — se tem atividade isenta, perde toda a dedução.",
        porque:
          "Ter alguma atividade isenta não elimina toda a dedução — aplica-se o pro rata (neste caso, 70%).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 23.º CIVA — cálculo do pro rata",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-55",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Em alternativa ao pro rata geral, que outro método de dedução pode o sujeito passivo misto utilizar?",
    opcoes: [
      {
        texto: "Método da afetação real.",
        porque:
          "O método da afetação real permite imputar diretamente o IVA de cada despesa à atividade que a originou, em vez de usar uma percentagem global.",
      },
      {
        texto: "Método do IVA médio.",
        porque:
          "Não existe um \"método do IVA médio\" previsto no CIVA.",
      },
      {
        texto: "Método da amortização linear.",
        porque:
          "A amortização linear é um conceito contabilístico, não um método de dedução de IVA.",
      },
      {
        texto: "Método da taxa fixa.",
        porque:
          "Não existe um \"método da taxa fixa\" para dedução de IVA em atividades mistas.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 23.º CIVA — afetação real",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  IMPORTAÇÕES / EXPORTAÇÕES PARA FREELANCERS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-56",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer português compra software a uma empresa da UE (aquisição intracomunitária de serviços). Quem liquida o IVA?",
    opcoes: [
      {
        texto: "A empresa vendedora, no país de origem.",
        porque:
          "Nas aquisições B2B intracomunitárias de serviços, o IVA é liquidado pelo adquirente no seu país (autoliquidação).",
      },
      {
        texto: "O freelancer português, por autoliquidação (reverse charge).",
        porque:
          "O freelancer português deve autoliquidar o IVA na sua declaração periódica (Art. 6.º CIVA), podendo simultaneamente deduzi-lo se estiver no regime normal.",
      },
      {
        texto: "Ninguém — aquisições intra-UE são isentas de IVA.",
        porque:
          "Aquisições intra-UE de serviços não são isentas — o IVA é autoliquidado pelo adquirente.",
      },
      {
        texto: "A alfândega portuguesa.",
        porque:
          "A alfândega intervém em importações de bens de países terceiros, não em serviços intra-UE.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 6.º CIVA — autoliquidação",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-57",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Quando o freelancer autoliquida o IVA de uma aquisição intracomunitária de serviços, como funciona a dedução?",
    opcoes: [
      {
        texto: "Liquida o IVA e deduz simultaneamente o mesmo montante — efeito neutro na declaração.",
        porque:
          "Se a aquisição é totalmente afeta à atividade tributável, o freelancer liquida e deduz o mesmo IVA, resultando num efeito neutro.",
      },
      {
        texto: "Liquida o IVA mas não pode deduzi-lo.",
        porque:
          "Se o freelancer está no regime normal e a despesa é profissional, pode deduzir o IVA autoliquidado.",
      },
      {
        texto: "Não liquida IVA nenhum — a operação é isenta.",
        porque:
          "A autoliquidação é obrigatória — o IVA deve ser liquidado pelo adquirente.",
      },
      {
        texto: "Paga o IVA duas vezes: ao fornecedor e ao Estado.",
        porque:
          "O fornecedor intra-UE não cobra IVA português. O freelancer autoliquida e, se possível, deduz — não há dupla tributação.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 6.º CIVA · Art. 19.º a 25.º CIVA",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-58",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer importa equipamento fotográfico da China (fora da UE). O IVA é liquidado em que momento?",
    opcoes: [
      {
        texto: "No momento do desalfandegamento, pela autoridade aduaneira.",
        porque:
          "Na importação de bens de países terceiros, o IVA é liquidado no momento do desalfandegamento pela alfândega portuguesa.",
      },
      {
        texto: "Na declaração periódica de IVA do trimestre seguinte.",
        porque:
          "Nas importações de bens, o IVA é liquidado na alfândega no momento da entrada dos bens, não na declaração periódica.",
      },
      {
        texto: "Pelo fornecedor chinês.",
        porque:
          "O fornecedor de um país terceiro não liquida IVA português — a liquidação é feita na alfândega.",
      },
      {
        texto: "Não se paga IVA em importações de fora da UE.",
        porque:
          "As importações de bens de países terceiros estão sujeitas a IVA, liquidado no desalfandegamento.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 28.º CIVA — importações",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS PERGUNTAS SOBRE TAXAS REGIONAIS (APROFUNDAMENTO)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-59",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Quantas taxas de IVA existem em cada região de Portugal?",
    opcoes: [
      {
        texto: "Duas: reduzida e normal.",
        porque:
          "Existem três taxas em cada região: reduzida, intermédia e normal.",
      },
      {
        texto: "Três: reduzida, intermédia e normal.",
        porque:
          "Em cada região de Portugal (Continente, Madeira e Açores) existem três taxas de IVA: reduzida, intermédia e normal.",
      },
      {
        texto: "Quatro: mínima, reduzida, intermédia e normal.",
        porque:
          "Não existe uma taxa \"mínima\" de IVA — são apenas três taxas por região.",
      },
      {
        texto: "Uma única taxa por região.",
        porque:
          "Cada região tem três taxas diferentes, aplicáveis conforme o tipo de bem ou serviço.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-60",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "As regiões autónomas (Madeira e Açores) têm taxas de IVA mais altas ou mais baixas do que o Continente?",
    opcoes: [
      {
        texto: "Mais altas.",
        porque:
          "As taxas nas regiões autónomas são mais baixas do que no Continente, como incentivo à economia insular.",
      },
      {
        texto: "Iguais.",
        porque:
          "As regiões autónomas têm taxas próprias, todas inferiores às do Continente.",
      },
      {
        texto: "Mais baixas.",
        porque:
          "As taxas de IVA na Madeira e nos Açores são inferiores às do Continente (ex.: normal: 22%/16% vs 23%).",
      },
      {
        texto: "Depende do tipo de bem ou serviço.",
        porque:
          "As taxas regionais são sempre mais baixas do que as do Continente, em todas as três categorias.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-61",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Qual é a região de Portugal com as taxas de IVA mais baixas?",
    opcoes: [
      {
        texto: "Portugal Continental.",
        porque:
          "O Continente tem as taxas mais altas (6%/13%/23%). As regiões autónomas têm taxas inferiores.",
      },
      {
        texto: "Região Autónoma da Madeira.",
        porque:
          "A Madeira tem taxas inferiores ao Continente (5%/12%/22%), mas os Açores têm taxas ainda mais baixas.",
      },
      {
        texto: "Região Autónoma dos Açores.",
        porque:
          "Os Açores têm as taxas de IVA mais baixas de Portugal: 4% (reduzida), 9% (intermédia) e 16% (normal).",
      },
      {
        texto: "Todas as regiões têm taxas iguais.",
        porque:
          "As taxas variam por região — os Açores têm as mais baixas.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("occIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS PERGUNTAS SOBRE O ART. 53.º — CENÁRIOS PRÁTICOS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-62",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um novo freelancer abre atividade em julho. O limiar de 15.000 € para isenção de IVA é proporcional ao período de atividade nesse primeiro ano?",
    opcoes: [
      {
        texto: "Não — o limite é sempre 15.000 €, independentemente de quando abriu atividade.",
        porque:
          "No primeiro ano de atividade, o limiar de 15.000 € é anualizado (proporcional ao período de atividade efetivo).",
      },
      {
        texto: "Sim — no primeiro ano, o limite é proporcional ao período de atividade (anualização).",
        porque:
          "Se o freelancer abre atividade a meio do ano, o limiar de 15.000 € é calculado proporcionalmente ao período de atividade nesse ano.",
      },
      {
        texto: "Sim, mas só se abrir atividade no 2.º semestre.",
        porque:
          "A anualização aplica-se independentemente do mês de abertura — sempre que o ano não é completo.",
      },
      {
        texto: "O limiar é duplicado no primeiro ano (30.000 €).",
        porque:
          "O limiar não é duplicado — é anualizado proporcionalmente ao período de atividade.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA — anualização no primeiro ano",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-63",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer abre atividade em outubro (3 meses de atividade no ano). Qual é o limiar de isenção de IVA proporcional para esse ano?",
    opcoes: [
      {
        texto: "15.000 € (sem anualização).",
        porque:
          "No primeiro ano com atividade parcial, o limiar é anualizado: 15.000 € × (3/12) = 3.750 €.",
      },
      {
        texto: "3.750 € (15.000 € × 3/12).",
        porque:
          "Com 3 meses de atividade, o limiar proporcional é 15.000 € × (3 ÷ 12) = 3.750 €.",
      },
      {
        texto: "7.500 € (metade do limiar anual).",
        porque:
          "7.500 € seria o limiar para 6 meses, não 3. Para 3 meses: 15.000 € × (3/12) = 3.750 €.",
      },
      {
        texto: "5.000 € (15.000 € ÷ 3).",
        porque:
          "O cálculo correto é proporção: 15.000 € × (3/12) = 3.750 €, não divisão por 3.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA — anualização",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-64",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual destes freelancers pode beneficiar da isenção do Art. 53.º CIVA?",
    opcoes: [
      {
        texto: "Um consultor que fatura 20.000 € por ano.",
        porque:
          "20.000 € excede o limiar de 15.000 € — não pode beneficiar da isenção.",
      },
      {
        texto: "Um designer que fatura 14.500 € por ano.",
        porque:
          "Com faturação de 14.500 € (inferior a 15.000 €), pode beneficiar da isenção do Art. 53.º.",
      },
      {
        texto: "Um programador que fatura 50.000 € por ano.",
        porque:
          "50.000 € excede largamente o limiar de 15.000 € — não pode beneficiar da isenção.",
      },
      {
        texto: "Um arquiteto que fatura 16.000 € por ano.",
        porque:
          "16.000 € excede o limiar de 15.000 € — não pode beneficiar da isenção.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA — limiar de 15.000 €",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-65",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um freelancer isento pelo Art. 53.º pode emitir faturas?",
    opcoes: [
      {
        texto: "Não — os isentos não emitem faturas.",
        porque:
          "Todos os sujeitos passivos, incluindo os isentos, são obrigados a emitir faturas (Art. 29.º CIVA).",
      },
      {
        texto: "Sim, mas sem indicar IVA e com menção ao Art. 53.º.",
        porque:
          "O freelancer isento emite faturas normalmente, sem IVA, mas deve mencionar a isenção ao abrigo do Art. 53.º CIVA.",
      },
      {
        texto: "Sim, com IVA a 0%.",
        porque:
          "Não existe \"taxa zero\" de IVA — a fatura deve indicar a isenção (Art. 53.º), sem valor de IVA.",
      },
      {
        texto: "Apenas recibos verdes, não faturas.",
        porque:
          "Recibos verdes (atos isolados ou recibos de prestação de serviços) são faturas — a obrigação é a mesma.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º · Art. 29.º · Art. 36.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS CENÁRIOS — PERDA DE ISENÇÃO E TRANSIÇÃO
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-66",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Quando um freelancer perde a isenção imediatamente (faturou > 18.750 €), a partir de que fatura deve passar a cobrar IVA?",
    opcoes: [
      {
        texto: "A partir da fatura que excedeu os 18.750 €.",
        porque:
          "A obrigação de cobrar IVA surge a partir da fatura que provocou o excesso do limiar de 125% (18.750 €).",
      },
      {
        texto: "A partir de 1 de janeiro do ano seguinte.",
        porque:
          "A perda imediata significa que a obrigação surge no próprio ano, a partir da fatura que ultrapassou o limiar.",
      },
      {
        texto: "Retroativamente, em todas as faturas do ano.",
        porque:
          "A obrigação de IVA não é retroativa — aplica-se a partir da fatura que provocou o excesso.",
      },
      {
        texto: "Só nas faturas do ano seguinte.",
        porque:
          "A perda imediata significa que a obrigação começa no próprio ano, não no seguinte.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 53.º / Art. 58.º CIVA — perda imediata",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-67",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Ao transitar para o regime normal de IVA, que taxa se aplica tipicamente a serviços de consultoria, design ou programação?",
    opcoes: [
      {
        texto: "6% (taxa reduzida).",
        porque:
          "A taxa reduzida aplica-se a bens essenciais, não a serviços como consultoria ou programação.",
      },
      {
        texto: "13% (taxa intermédia).",
        porque:
          "A taxa intermédia aplica-se a determinados serviços (ex.: restauração), não a consultoria ou programação.",
      },
      {
        texto: "23% (taxa normal).",
        porque:
          "Serviços como consultoria, design e programação estão sujeitos à taxa normal de IVA (23% no Continente).",
      },
      {
        texto: "A taxa é escolhida pelo prestador.",
        porque:
          "A taxa de IVA é determinada pela lei (tipo de bem/serviço e região), não pelo prestador.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — taxa normal",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-68",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "O IVA cobrado pelo freelancer representa um rendimento (lucro) para ele?",
    opcoes: [
      {
        texto: "Sim, é rendimento tributável em IRS.",
        porque:
          "O IVA não é rendimento do freelancer — é um imposto que transita pelo prestador e é entregue ao Estado.",
      },
      {
        texto: "Não — o IVA é um imposto que o freelancer cobra e entrega ao Estado.",
        porque:
          "O IVA é um imposto sobre o consumo; o freelancer atua como intermediário, cobrando ao cliente e entregando ao Estado.",
      },
      {
        texto: "Sim, faz parte da faturação total para efeitos de IRS.",
        porque:
          "O IVA não faz parte do rendimento tributável em IRS — a base tributável é o valor sem IVA.",
      },
      {
        texto: "Depende do regime fiscal escolhido.",
        porque:
          "Em nenhum regime fiscal o IVA cobrado é considerado rendimento do prestador.",
      },
    ],
    correta: 1,
    legalBasis: "CIVA · CIRS",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  IVA — PRAZOS DE PAGAMENTO
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-69",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "O IVA apurado na declaração periódica trimestral deve ser pago até quando?",
    opcoes: [
      {
        texto: "Até ao dia 25 do 2.º mês seguinte ao trimestre.",
        porque:
          "O prazo de pagamento coincide com o prazo de entrega da declaração: até ao dia 20 (não 25) do 2.º mês seguinte.",
      },
      {
        texto: "Até ao dia 20 do 2.º mês seguinte ao trimestre.",
        porque:
          "O pagamento do IVA trimestral deve ser efetuado até ao dia 20 do 2.º mês seguinte ao fim do trimestre.",
      },
      {
        texto: "Até ao último dia do trimestre seguinte.",
        porque:
          "O prazo é o dia 20 do 2.º mês seguinte ao trimestre, não o fim do trimestre seguinte.",
      },
      {
        texto: "Até ao dia 10 do mês seguinte ao trimestre.",
        porque:
          "O dia 10 é referência para o regime mensal, não trimestral.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 41.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-70",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer no regime trimestral de IVA tem o seu 2.º trimestre (abril-junho). Até quando deve submeter a declaração e pagar o IVA?",
    opcoes: [
      {
        texto: "Até 20 de agosto.",
        porque:
          "O 2.º mês seguinte a junho é agosto, e o prazo é dia 20 — ou seja, 20 de agosto.",
      },
      {
        texto: "Até 20 de julho.",
        porque:
          "Julho é o 1.º mês após o trimestre — o prazo é o 2.º mês seguinte (agosto), dia 20.",
      },
      {
        texto: "Até 20 de setembro.",
        porque:
          "Setembro seria o 3.º mês após junho — o prazo é o 2.º mês (agosto), dia 20.",
      },
      {
        texto: "Até 30 de julho.",
        porque:
          "O prazo é o dia 20 do 2.º mês seguinte (20 de agosto), não o fim de julho.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 41.º CIVA — prazo trimestral",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  ISENÇÕES OBJETIVAS (ART. 9.º CIVA)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-71",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Além da isenção por volume de negócios (Art. 53.º), existe outro tipo de isenção de IVA?",
    opcoes: [
      {
        texto: "Não — a única isenção de IVA é a do Art. 53.º.",
        porque:
          "Existem também isenções objetivas (Art. 9.º CIVA) para certas atividades, independentemente do volume de negócios.",
      },
      {
        texto: "Sim — isenções objetivas do Art. 9.º CIVA para certas atividades (ex.: saúde, ensino).",
        porque:
          "O Art. 9.º CIVA prevê isenções para atividades como serviços médicos, ensino, formação profissional e outras, independentemente da faturação.",
      },
      {
        texto: "Sim, mas apenas para freelancers com mais de 65 anos.",
        porque:
          "Não existe isenção de IVA baseada na idade — as isenções são por volume de negócios (Art. 53.º) ou por tipo de atividade (Art. 9.º).",
      },
      {
        texto: "Sim, para quem tem deficiência reconhecida.",
        porque:
          "As isenções de IVA não dependem do grau de deficiência — são por atividade (Art. 9.º) ou volume de negócios (Art. 53.º).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 9.º CIVA — isenções objetivas",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-72",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Qual a diferença entre a isenção do Art. 53.º e a isenção do Art. 9.º CIVA?",
    opcoes: [
      {
        texto: "Nenhuma — são dois artigos que dizem a mesma coisa.",
        porque:
          "São isenções diferentes: o Art. 53.º baseia-se no volume de negócios; o Art. 9.º isenta certas atividades independentemente da faturação.",
      },
      {
        texto: "O Art. 53.º isenta por volume de negócios; o Art. 9.º isenta certas atividades independentemente da faturação.",
        porque:
          "O Art. 53.º é uma isenção subjetiva (baseada no volume de negócios do sujeito passivo); o Art. 9.º é uma isenção objetiva (baseada na natureza da atividade).",
      },
      {
        texto: "O Art. 53.º é para empresas e o Art. 9.º é para freelancers.",
        porque:
          "Ambos os artigos se podem aplicar a freelancers — a distinção é entre volume de negócios (Art. 53.º) e tipo de atividade (Art. 9.º).",
      },
      {
        texto: "O Art. 9.º só se aplica a importações.",
        porque:
          "O Art. 9.º isenta atividades específicas (saúde, ensino, etc.), não importações.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA · Art. 9.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  OBRIGAÇÕES ACESSÓRIAS
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-73",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Onde se submete a declaração periódica de IVA?",
    opcoes: [
      {
        texto: "Nos balcões da AT (Finanças), presencialmente.",
        porque:
          "A declaração periódica de IVA é obrigatoriamente submetida por via eletrónica no Portal das Finanças.",
      },
      {
        texto: "No Portal das Finanças, por via eletrónica.",
        porque:
          "A submissão da declaração periódica de IVA é feita online no Portal das Finanças (e-Fatura/AT).",
      },
      {
        texto: "Por carta registada enviada à AT.",
        porque:
          "A submissão é obrigatoriamente eletrónica, não por carta.",
      },
      {
        texto: "Numa aplicação da Segurança Social.",
        porque:
          "O IVA é gerido pela AT (Finanças), não pela Segurança Social.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 29.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-74",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "O que é a declaração recapitulativa de IVA e quando é obrigatória?",
    opcoes: [
      {
        texto: "É a declaração anual de IVA, obrigatória para todos.",
        porque:
          "A declaração recapitulativa não é a declaração anual — é específica para quem realiza operações intracomunitárias.",
      },
      {
        texto: "É uma declaração mensal obrigatória para quem realiza operações intracomunitárias (transmissões de bens ou prestações de serviços B2B).",
        porque:
          "A declaração recapitulativa deve ser submetida mensalmente por quem efetua transmissões intracomunitárias de bens ou prestações de serviços B2B a sujeitos passivos de outros Estados-Membros.",
      },
      {
        texto: "É uma declaração extra para freelancers com mais de 100.000 € de faturação.",
        porque:
          "A declaração recapitulativa não depende do volume de faturação total, mas da realização de operações intracomunitárias.",
      },
      {
        texto: "É um resumo das declarações periódicas enviado ao contabilista.",
        porque:
          "A declaração recapitulativa é submetida à AT e refere-se especificamente a operações intracomunitárias.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 23.º RITI — declaração recapitulativa",
    fonte: fonte("art6civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS CENÁRIOS DE CÁLCULO
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-75",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um freelancer no Continente presta serviços por 2.000 € (sem IVA) à taxa normal. Quanto recebe do cliente (valor com IVA)?",
    opcoes: [
      {
        texto: "2.000 €.",
        porque:
          "2.000 € é o valor base — o cliente paga base + IVA: 2.000 + 460 = 2.460 €.",
      },
      {
        texto: "2.260 €.",
        porque:
          "2.260 € corresponderia a IVA de 13%. A taxa normal é 23%: 2.000 × 1,23 = 2.460 €.",
      },
      {
        texto: "2.460 €.",
        porque:
          "O total com IVA à taxa normal (23%): 2.000 € + (2.000 × 0,23) = 2.000 + 460 = 2.460 €.",
      },
      {
        texto: "2.600 €.",
        porque:
          "2.600 € corresponderia a uma taxa de 30%, que não existe.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-76",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer nos Açores presta serviços por 1.000 € (sem IVA) à taxa normal. Quanto IVA deve cobrar?",
    opcoes: [
      {
        texto: "230 € (23%).",
        porque:
          "23% é a taxa normal do Continente. Nos Açores, a taxa normal é 16%.",
      },
      {
        texto: "160 € (16%).",
        porque:
          "Nos Açores, a taxa normal de IVA é 16%: 1.000 € × 16% = 160 €.",
      },
      {
        texto: "220 € (22%).",
        porque:
          "22% é a taxa normal da Madeira, não dos Açores.",
      },
      {
        texto: "130 € (13%).",
        porque:
          "13% é a taxa intermédia do Continente. A taxa normal dos Açores é 16%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA — Açores",
    fonte: fonte("occIVA"),
  },
  {
    id: "iva-77",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer na Madeira presta serviços por 5.000 € (sem IVA) à taxa normal. Qual o valor total da fatura?",
    opcoes: [
      {
        texto: "5.650 € (5.000 + 13%).",
        porque:
          "13% é a taxa intermédia do Continente. Na Madeira, a taxa normal é 22%.",
      },
      {
        texto: "6.150 € (5.000 + 23%).",
        porque:
          "23% é a taxa normal do Continente. Na Madeira, a taxa normal é 22%.",
      },
      {
        texto: "6.100 € (5.000 + 22%).",
        porque:
          "Na Madeira, a taxa normal de IVA é 22%: 5.000 + (5.000 × 0,22) = 5.000 + 1.100 = 6.100 €.",
      },
      {
        texto: "5.800 € (5.000 + 16%).",
        porque:
          "16% é a taxa normal dos Açores, não da Madeira.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — Madeira",
    fonte: fonte("occIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  CONCEITOS FUNDAMENTAIS DE IVA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-78",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "O que significam as siglas IVA e CIVA?",
    opcoes: [
      {
        texto: "Imposto sobre Valor Acrescentado / Código do Imposto sobre o Valor Acrescentado.",
        porque:
          "IVA = Imposto sobre o Valor Acrescentado; CIVA = Código do Imposto sobre o Valor Acrescentado.",
      },
      {
        texto: "Imposto sobre Vendas e Aquisições / Código do Imposto sobre Vendas.",
        porque:
          "IVA significa Imposto sobre o Valor Acrescentado, não sobre Vendas e Aquisições.",
      },
      {
        texto: "Imposto de Valor Adicional / Código do Imposto de Valor Adicional.",
        porque:
          "A designação correta é Imposto sobre o Valor Acrescentado, não Adicional.",
      },
      {
        texto: "Índice de Variação Anual / Código do Índice Variável.",
        porque:
          "IVA é um imposto fiscal, não um índice estatístico.",
      },
    ],
    correta: 0,
    legalBasis: "CIVA — Código do Imposto sobre o Valor Acrescentado",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-79",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "O IVA é um imposto sobre o consumo ou sobre o rendimento?",
    opcoes: [
      {
        texto: "Sobre o rendimento — como o IRS.",
        porque:
          "O IRS é o imposto sobre o rendimento. O IVA é um imposto sobre o consumo.",
      },
      {
        texto: "Sobre o consumo — incide sobre o valor acrescentado em cada fase da cadeia económica.",
        porque:
          "O IVA é um imposto sobre o consumo que incide sobre o valor acrescentado em cada etapa de produção e distribuição.",
      },
      {
        texto: "Sobre o lucro das empresas — como o IRC.",
        porque:
          "O IRC incide sobre o lucro das empresas. O IVA é um imposto sobre o consumo.",
      },
      {
        texto: "Sobre o património — como o IMI.",
        porque:
          "O IMI incide sobre o património imobiliário. O IVA é um imposto sobre o consumo.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 1.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  OBRIGAÇÕES DE FATURAÇÃO COM IVA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-80",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Que elementos obrigatórios deve conter uma fatura com IVA emitida por um freelancer?",
    opcoes: [
      {
        texto: "Apenas o nome do prestador e o valor total.",
        porque:
          "Uma fatura deve conter muitos mais elementos: NIF, data, descrição do serviço, base tributável, taxa e valor do IVA, entre outros.",
      },
      {
        texto: "NIF do prestador e do cliente, descrição do serviço, base tributável, taxa de IVA e valor do IVA.",
        porque:
          "A fatura deve incluir os NIF de ambas as partes, descrição do serviço, valor base, taxa e valor do imposto, além de outros elementos (data, número sequencial, etc.).",
      },
      {
        texto: "Só o valor com IVA incluído — o detalhe não é obrigatório.",
        porque:
          "É obrigatório discriminar a base tributável, a taxa e o montante de IVA separadamente.",
      },
      {
        texto: "Nome do prestador e recibo de pagamento.",
        porque:
          "Uma fatura tem requisitos muito mais detalhados do que apenas o nome e recibo.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 36.º CIVA — elementos da fatura",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-81",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer no regime normal presta dois serviços diferentes na mesma fatura: um sujeito à taxa normal (23%) e outro à taxa intermédia (13%). Como deve faturar?",
    opcoes: [
      {
        texto: "Aplica a taxa mais alta (23%) a tudo.",
        porque:
          "Não se pode aplicar uma taxa única a serviços com taxas diferentes — cada serviço deve ter a sua taxa discriminada.",
      },
      {
        texto: "Aplica uma média das duas taxas (18%).",
        porque:
          "Não se calcula uma média de taxas — cada serviço é discriminado com a sua taxa própria.",
      },
      {
        texto: "Discrimina cada serviço com a respetiva taxa de IVA na mesma fatura.",
        porque:
          "Quando há serviços com taxas diferentes, cada um deve ser discriminado separadamente na fatura com a taxa aplicável.",
      },
      {
        texto: "Emite duas faturas separadas, uma para cada taxa.",
        porque:
          "Não é obrigatório emitir faturas separadas — pode discriminar as diferentes taxas numa única fatura.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 36.º CIVA",
    fonte: fonte("art18civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS PERGUNTAS — REVERSE CHARGE E INTRA-UE
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-82",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer isento pelo Art. 53.º presta serviços a uma empresa de outro Estado-Membro da UE. Deve obter um número de IVA intracomunitário?",
    opcoes: [
      {
        texto: "Não — como está isento, não tem obrigações intracomunitárias.",
        porque:
          "Mesmo os isentos pelo Art. 53.º devem registar-se para efeitos de IVA intracomunitário quando prestam serviços B2B a sujeitos passivos de outros Estados-Membros.",
      },
      {
        texto: "Sim — deve registar-se para operações intracomunitárias e obter um número de IVA (NIF precedido de PT).",
        porque:
          "Para prestações intra-UE B2B, mesmo os isentos devem obter registo de operações intracomunitárias e utilizar o número de IVA intracomunitário.",
      },
      {
        texto: "Sim, mas apenas se faturar mais de 10.000 € ao estrangeiro.",
        porque:
          "Não existe limiar — qualquer prestação B2B intracomunitária exige registo de IVA intracomunitário.",
      },
      {
        texto: "Não precisa de número especial — usa o NIF normal.",
        porque:
          "Para operações intracomunitárias é necessário o registo específico e o número de identificação IVA (PT + NIF).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 6.º CIVA · Art. 25.º RITI",
    fonte: fonte("art6civa"),
  },
  {
    id: "iva-83",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "O que é o sistema VIES?",
    opcoes: [
      {
        texto: "Uma base de dados para validar números de IVA intracomunitários na UE.",
        porque:
          "O VIES (VAT Information Exchange System) é o sistema da Comissão Europeia para validar números de identificação IVA de sujeitos passivos da UE.",
      },
      {
        texto: "O sistema de pagamento de IVA online em Portugal.",
        porque:
          "O VIES não é um sistema de pagamento — é uma base de dados de validação de números de IVA da UE.",
      },
      {
        texto: "O formulário de declaração periódica de IVA.",
        porque:
          "O VIES não é um formulário — é um sistema de validação de números de IVA intracomunitários.",
      },
      {
        texto: "Uma taxa especial de IVA para exportações.",
        porque:
          "O VIES não é uma taxa — é um sistema de informação da Comissão Europeia.",
      },
    ],
    correta: 0,
    legalBasis: "Regulamento (UE) n.º 904/2010",
    fonte: fonte("art6civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  DEDUÇÃO — EXCLUSÕES E LIMITES
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-84",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer no regime normal de IVA pode deduzir o IVA pago num jantar pessoal com amigos?",
    opcoes: [
      {
        texto: "Sim, desde que passe fatura com NIF.",
        porque:
          "Ter fatura com NIF não basta — a despesa deve estar afeta à atividade profissional para ser dedutível.",
      },
      {
        texto: "Não — só são dedutíveis despesas afetas à atividade profissional.",
        porque:
          "O IVA só é dedutível em despesas diretamente relacionadas com a atividade profissional. Um jantar pessoal não é dedutível.",
      },
      {
        texto: "Sim, até 50% do IVA de refeições.",
        porque:
          "A limitação de 50% do IVA aplica-se a despesas de representação profissionais, não a jantares pessoais.",
      },
      {
        texto: "Sim, se registar o jantar como despesa de formação.",
        porque:
          "Classificar despesas pessoais como profissionais é uma irregularidade fiscal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 20.º CIVA — direito à dedução",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-85",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "O IVA suportado em despesas de representação (ex.: almoço com cliente) é integralmente dedutível?",
    opcoes: [
      {
        texto: "Sim, é dedutível a 100%.",
        porque:
          "O IVA de despesas de representação tem uma limitação legal — só é dedutível em 50%.",
      },
      {
        texto: "Não é dedutível de todo.",
        porque:
          "É parcialmente dedutível — 50% do IVA de despesas de representação pode ser deduzido.",
      },
      {
        texto: "É dedutível a 50%.",
        porque:
          "O IVA suportado em despesas de representação (refeições com clientes, etc.) é dedutível em apenas 50%, nos termos do Art. 21.º CIVA.",
      },
      {
        texto: "É dedutível a 75%.",
        porque:
          "A limitação legal é de 50%, não 75%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 21.º CIVA — exclusões do direito à dedução",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-86",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "O IVA suportado na aquisição de uma viatura ligeira de passageiros para uso profissional é dedutível?",
    opcoes: [
      {
        texto: "Sim, a 100%.",
        porque:
          "Em regra, o IVA de viaturas de turismo (ligeiros de passageiros) está excluído do direito à dedução, salvo exceções.",
      },
      {
        texto: "Sim, a 50%.",
        porque:
          "Em regra, o IVA de viaturas ligeiras de passageiros não é dedutível — a exclusão é total, salvo exceções para certas atividades.",
      },
      {
        texto: "Não, em regra — o IVA de viaturas ligeiras de passageiros está excluído da dedução (Art. 21.º CIVA).",
        porque:
          "O Art. 21.º CIVA exclui da dedução o IVA suportado na aquisição de viaturas de turismo, salvo atividades como táxi ou ensino de condução.",
      },
      {
        texto: "Depende da marca do veículo.",
        porque:
          "A exclusão aplica-se por tipo de veículo (ligeiro de passageiros), não pela marca.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 21.º CIVA — exclusões do direito à dedução",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  CENÁRIOS MISTOS IVA + RETENÇÃO
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-87",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "A retenção na fonte de IRS incide sobre o valor base dos honorários ou sobre o valor com IVA incluído?",
    opcoes: [
      {
        texto: "Sobre o valor com IVA incluído.",
        porque:
          "A retenção incide sobre o valor base dos honorários (sem IVA), não sobre o total com IVA.",
      },
      {
        texto: "Sobre o valor base dos honorários (sem IVA).",
        porque:
          "A retenção na fonte de IRS incide sobre o rendimento bruto (valor base), sem incluir o IVA.",
      },
      {
        texto: "Sobre o valor base menos as despesas.",
        porque:
          "A retenção incide sobre o rendimento bruto, sem dedução de despesas.",
      },
      {
        texto: "Sobre o valor líquido após todas as deduções.",
        porque:
          "A retenção incide sobre o rendimento bruto (base), não sobre um valor líquido.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS · Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  },
  {
    id: "iva-88",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer isento de IVA (Art. 53.º) presta um serviço de 1.000 € a uma empresa portuguesa. A empresa retém 23% de IRS. Qual o valor líquido que o freelancer recebe?",
    opcoes: [
      {
        texto: "1.000 € (sem retenção para isentos de IVA).",
        porque:
          "A isenção de IVA não dispensa a retenção na fonte de IRS — são obrigações independentes. O freelancer recebe 770 €.",
      },
      {
        texto: "770 € (1.000 − 230 de retenção IRS).",
        porque:
          "Sendo isento de IVA, não há IVA na fatura. A retenção de 23% sobre 1.000 € = 230 €. Líquido: 1.000 − 230 = 770 €.",
      },
      {
        texto: "947,10 € (1.000 − IVA de 23% + retenção de 23%).",
        porque:
          "Este cálculo não faz sentido — o freelancer é isento de IVA e não cobra IVA.",
      },
      {
        texto: "1.230 € (base + IVA, sem retenção).",
        porque:
          "O freelancer é isento de IVA — não cobra 230 € de IVA. E a retenção aplica-se independentemente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA · Art. 101.º CIRS",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS PERGUNTAS DE NÍVEL 1 (CONSOLIDAÇÃO)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-89",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Quem está obrigado a cobrar IVA em Portugal?",
    opcoes: [
      {
        texto: "Apenas as grandes empresas.",
        porque:
          "A obrigação de cobrar IVA aplica-se a todos os sujeitos passivos no regime normal, independentemente da dimensão.",
      },
      {
        texto: "Todos os sujeitos passivos de IVA enquadrados no regime normal.",
        porque:
          "Quem está no regime normal de IVA (não isento) é obrigado a liquidar (cobrar) IVA nas suas operações tributáveis.",
      },
      {
        texto: "Apenas freelancers com mais de 5 anos de atividade.",
        porque:
          "A obrigação de cobrar IVA depende do enquadramento (regime normal vs isento), não dos anos de atividade.",
      },
      {
        texto: "Ninguém — o IVA é cobrado diretamente pelo Estado.",
        porque:
          "O IVA é cobrado pelo sujeito passivo ao cliente e depois entregue ao Estado.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 1.º / Art. 2.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-90",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um freelancer no regime normal de IVA pode escolher livremente que taxa de IVA cobra?",
    opcoes: [
      {
        texto: "Sim, pode optar pela taxa que preferir.",
        porque:
          "A taxa de IVA é determinada pela lei (tipo de bem/serviço e região), não pela vontade do prestador.",
      },
      {
        texto: "Não — a taxa é determinada pela lei, conforme o tipo de bem/serviço e a região.",
        porque:
          "As taxas de IVA são fixadas por lei no Art. 18.º CIVA e nas respetivas Listas I e II, e variam conforme o bem/serviço e a região.",
      },
      {
        texto: "Sim, desde que informe o cliente.",
        porque:
          "Mesmo informando o cliente, o freelancer não pode alterar a taxa legalmente prevista.",
      },
      {
        texto: "Sim, mas apenas entre a taxa reduzida e a intermédia.",
        porque:
          "O freelancer não tem qualquer margem de escolha — a taxa é definida pela natureza do serviço/bem.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 18.º CIVA",
    fonte: fonte("art18civa"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  IVA DE CAIXA
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-91",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "O que é o regime de IVA de caixa?",
    opcoes: [
      {
        texto: "Um regime em que o IVA só é exigível quando o pagamento é efetivamente recebido (e não na data de emissão da fatura).",
        porque:
          "No regime de IVA de caixa, a exigibilidade do IVA ocorre no momento do recebimento do pagamento, e não na data da fatura.",
      },
      {
        texto: "Um regime que permite pagar o IVA em prestações mensais fixas.",
        porque:
          "O IVA de caixa não é um plano de prestações — é um regime em que o IVA se torna exigível apenas quando o pagamento é recebido.",
      },
      {
        texto: "O regime normal de IVA aplicável a todas as empresas.",
        porque:
          "O IVA de caixa é um regime especial e opcional, diferente do regime normal.",
      },
      {
        texto: "Um regime de IVA exclusivo para comércios com caixa registadora.",
        porque:
          "O nome \"caixa\" refere-se ao fluxo de caixa (recebimentos), não a caixas registadoras.",
      },
    ],
    correta: 0,
    legalBasis: "DL 71/2013 — Regime de IVA de caixa",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-92",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Qual o volume de negócios máximo para aderir ao regime de IVA de caixa?",
    opcoes: [
      {
        texto: "500.000 €.",
        porque:
          "O limiar para aderir ao IVA de caixa é 500.000 € de volume de negócios no ano anterior.",
      },
      {
        texto: "650.000 €.",
        porque:
          "650.000 € é o limiar para o regime mensal obrigatório de IVA, não para o IVA de caixa.",
      },
      {
        texto: "100.000 €.",
        porque:
          "O limiar é 500.000 €, não 100.000 €.",
      },
      {
        texto: "Sem limite — qualquer sujeito passivo pode aderir.",
        porque:
          "Existe um limite de volume de negócios de 500.000 € para aderir ao regime de IVA de caixa.",
      },
    ],
    correta: 0,
    legalBasis: "DL 71/2013 — IVA de caixa",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS CENÁRIOS PRÁTICOS (NÍVEL 2)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-93",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer que passou do regime de isenção para o regime normal pode deduzir o IVA de bens adquiridos antes da transição?",
    opcoes: [
      {
        texto: "Não — o IVA de compras feitas durante o período de isenção não é dedutível.",
        porque:
          "Existe a possibilidade de regularização do IVA de existências e bens de investimento adquiridos durante o período de isenção, em certas condições (Art. 24.º CIVA).",
      },
      {
        texto: "Sim — pode regularizar o IVA de existências e bens de investimento adquiridos durante a isenção, em certas condições.",
        porque:
          "Ao transitar para o regime normal, o freelancer pode, em determinadas condições, regularizar (deduzir) o IVA de existências e bens de investimento que detinha no final do período de isenção.",
      },
      {
        texto: "Sim, mas apenas se as compras foram feitas nos últimos 30 dias.",
        porque:
          "O prazo não é de 30 dias — a regularização abrange bens em existência no momento da transição, conforme as regras do Art. 24.º CIVA.",
      },
      {
        texto: "Sim, mas apenas se o valor total exceder 5.000 €.",
        porque:
          "Não existe um limiar mínimo de 5.000 € — a regularização depende do tipo de bem e das condições do Art. 24.º CIVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 24.º CIVA — regularizações",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-94",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Um freelancer no regime normal esquece-se de submeter a declaração periódica de IVA dentro do prazo. O que acontece?",
    opcoes: [
      {
        texto: "Nada — pode submeter a qualquer momento sem penalização.",
        porque:
          "O atraso na entrega da declaração periódica de IVA está sujeito a coima e juros de mora.",
      },
      {
        texto: "Perde automaticamente o direito a deduzir IVA nesse período.",
        porque:
          "O atraso gera coima e juros, mas não implica a perda automática do direito à dedução.",
      },
      {
        texto: "Está sujeito a coima por entrega fora de prazo e juros de mora sobre o imposto em falta.",
        porque:
          "A entrega da declaração fora de prazo constitui uma infração tributária, sujeita a coima, e o imposto em dívida vence juros de mora.",
      },
      {
        texto: "A AT emite automaticamente uma declaração em nome do freelancer.",
        porque:
          "A AT não emite declarações automáticas em nome do contribuinte — aplica-se coima por falta de entrega.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 41.º CIVA · RGIT (Regime Geral das Infrações Tributárias)",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-95",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "O freelancer isento pelo Art. 53.º deve comunicar as suas faturas à AT (e-Fatura)?",
    opcoes: [
      {
        texto: "Não — os isentos não têm obrigações de comunicação.",
        porque:
          "Mesmo os isentos são obrigados a comunicar as faturas emitidas à AT (sistema e-Fatura).",
      },
      {
        texto: "Sim — todos os sujeitos passivos, incluindo os isentos, devem comunicar faturas à AT.",
        porque:
          "A obrigação de comunicação de faturas ao sistema e-Fatura aplica-se a todos os sujeitos passivos, incluindo os isentos pelo Art. 53.º.",
      },
      {
        texto: "Sim, mas apenas se faturar mais de 5.000 €.",
        porque:
          "A obrigação de comunicação não tem limiar mínimo — aplica-se a todos os sujeitos passivos.",
      },
      {
        texto: "Apenas no final do ano, numa declaração anual.",
        porque:
          "A comunicação das faturas deve ser feita de forma regular (mensal), não apenas anual.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 3.º DL 198/2012 — comunicação de faturas",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-96",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Ao emitir um recibo verde no portal da AT, onde se seleciona o regime de IVA aplicável?",
    opcoes: [
      {
        texto: "Não se seleciona — o portal aplica automaticamente com base no enquadramento do contribuinte.",
        porque:
          "O regime de IVA é pré-definido com base no enquadramento registado na AT, mas o freelancer deve confirmar o regime no momento de emissão.",
      },
      {
        texto: "No campo 'Regime de IVA', onde aparece a opção de isenção (Art. 53.º) ou a taxa aplicável.",
        porque:
          "No preenchimento do recibo verde, o sistema indica o regime de IVA conforme o enquadramento, sendo possível selecionar a taxa ou a isenção aplicável.",
      },
      {
        texto: "Numa declaração separada, antes de emitir o recibo.",
        porque:
          "O regime de IVA é indicado diretamente no recibo verde, sem necessidade de declaração separada.",
      },
      {
        texto: "Num formulário enviado por email à AT.",
        porque:
          "A seleção é feita diretamente no portal, no momento da emissão do recibo.",
      },
    ],
    correta: 1,
    legalBasis: "Portal das Finanças — emissão de recibos verdes",
    fonte: fonte("portalFinancasIVA"),
  },
  // ──────────────────────────────────────────────────────────────────────
  //  MAIS PERGUNTAS NÍVEL 3 (APROFUNDAMENTO)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "iva-97",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "Um freelancer realizou operações que conferem direito a dedução (consultoria) e operações isentas sem direito a dedução (formação prevista no Art. 9.º). Que método de dedução pode a AT impor?",
    opcoes: [
      {
        texto: "O método do pro rata é sempre obrigatório.",
        porque:
          "O pro rata é o método padrão, mas a AT pode impor o método da afetação real se este conduzir a uma tributação mais justa.",
      },
      {
        texto: "A AT pode impor o método da afetação real quando considere que produz uma tributação mais equitativa.",
        porque:
          "A AT pode obrigar o sujeito passivo misto a utilizar o método da afetação real em vez do pro rata, quando entender que reflete melhor a realidade económica.",
      },
      {
        texto: "Nenhum — o freelancer escolhe livremente sem intervenção da AT.",
        porque:
          "A AT tem poder para impor o método que considere mais adequado.",
      },
      {
        texto: "O método do IVA forfetário.",
        porque:
          "Não existe um \"método forfetário\" de dedução de IVA no CIVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 23.º, n.º 3 CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-98",
    categoria: "iva",
    dificuldade: 3,
    pergunta:
      "O pro rata provisório de dedução de IVA é calculado com base em que dados?",
    opcoes: [
      {
        texto: "Nos dados do ano corrente, atualizados mensalmente.",
        porque:
          "O pro rata provisório baseia-se nos dados do ano anterior, sendo depois ajustado com os dados definitivos do ano.",
      },
      {
        texto: "Nos dados do ano anterior, sendo regularizado no final do ano com os dados definitivos.",
        porque:
          "O pro rata provisório é calculado com os dados do ano anterior e corrigido com o pro rata definitivo, apurado após o encerramento do ano.",
      },
      {
        texto: "Numa estimativa feita pelo contabilista.",
        porque:
          "O pro rata provisório baseia-se em dados reais do ano anterior, não em estimativas subjetivas.",
      },
      {
        texto: "Na média dos últimos 5 anos.",
        porque:
          "O pro rata provisório usa os dados do ano imediatamente anterior, não uma média plurianual.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 23.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-99",
    categoria: "iva",
    dificuldade: 1,
    pergunta:
      "Um freelancer está isento de IVA e cobra 1.000 € por um serviço. Quanto paga o cliente?",
    opcoes: [
      {
        texto: "1.230 € (1.000 + 23% de IVA).",
        porque:
          "O freelancer é isento de IVA — não acrescenta IVA à fatura. O cliente paga apenas 1.000 €.",
      },
      {
        texto: "1.000 € — sem IVA, pois o prestador é isento.",
        porque:
          "Como o freelancer está isento de IVA ao abrigo do Art. 53.º, a fatura não inclui IVA. O cliente paga o valor base: 1.000 €.",
      },
      {
        texto: "1.060 € (1.000 + 6% de IVA mínimo).",
        porque:
          "Não existe \"IVA mínimo\" para isentos. Se está isento, não cobra qualquer IVA.",
      },
      {
        texto: "940 € (1.000 − 6% de desconto de isenção).",
        porque:
          "A isenção não implica nenhum desconto — simplesmente não se cobra IVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "iva-100",
    categoria: "iva",
    dificuldade: 2,
    pergunta:
      "Qual das seguintes afirmações sobre o IVA e a isenção do Art. 53.º é verdadeira?",
    opcoes: [
      {
        texto: "Os isentos pelo Art. 53.º podem deduzir IVA nas compras profissionais.",
        porque:
          "Os isentos pelo Art. 53.º NÃO podem deduzir o IVA suportado — essa é a contrapartida da não liquidação.",
      },
      {
        texto: "O limiar de isenção é 10.000 €.",
        porque:
          "O limiar de isenção é 15.000 €, não 10.000 €.",
      },
      {
        texto: "Um freelancer pode renunciar à isenção e voltar atrás no mês seguinte.",
        porque:
          "A renúncia à isenção obriga a permanecer no regime normal durante um mínimo de 5 anos.",
      },
      {
        texto: "A renúncia à isenção obriga a permanecer no regime normal durante pelo menos 5 anos.",
        porque:
          "Ao renunciar voluntariamente à isenção do Art. 53.º, o freelancer fica obrigado ao regime normal durante um período mínimo de 5 anos.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 53.º, n.º 3 CIVA",
    fonte: fonte("portalFinancasIVA"),
  },
];
