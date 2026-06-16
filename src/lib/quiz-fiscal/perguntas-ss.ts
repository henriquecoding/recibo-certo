import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_SS: QuizPergunta[] = [
  // ── ss-8 a ss-37: dificuldade 1 (30 perguntas) ────────────────────────

  {
    id: "ss-8",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Sofia abriu atividade como tradutora independente em janeiro de 2026, sem nunca ter sido trabalhadora independente. Quando começa a pagar contribuições para a Segurança Social?",
    opcoes: [
      {
        texto: "Imediatamente, no mês seguinte à abertura de atividade",
        porque:
          "Quem abre atividade pela primeira vez (ou não teve atividade independente nos 3 anos anteriores) tem 12 meses de isenção, e não começa de imediato.",
      },
      {
        texto: "Após 12 meses de atividade",
        porque:
          "Correto. O Art. 157.º do Código Contributivo concede isenção nos primeiros 12 meses a quem inicia atividade independente sem atividade nos 3 anos anteriores.",
      },
      {
        texto: "Após 6 meses de atividade",
        porque:
          "Não existe isenção de 6 meses. A isenção inicial é de 12 meses completos.",
      },
      {
        texto: "Só quando ultrapassar 10.000 € de faturação",
        porque:
          "A isenção inicial baseia-se no tempo (12 meses), não num limiar de faturação.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 157.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-9",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O pagamento mensal da contribuição para a Segurança Social deve ser feito em que período?",
    opcoes: [
      {
        texto: "Entre o dia 1 e o dia 10 do mês seguinte",
        porque:
          "O prazo legal começa no dia 10 e vai até ao dia 20, não entre 1 e 10.",
      },
      {
        texto: "Até ao último dia do mês corrente",
        porque:
          "As contribuições do mês anterior pagam-se entre o dia 10 e o dia 20 do mês seguinte.",
      },
      {
        texto: "Entre o dia 10 e o dia 20 de cada mês",
        porque:
          "Correto. A contribuição mensal deve ser paga entre o dia 10 e o dia 20 do mês seguinte ao período a que respeita.",
      },
      {
        texto: "Até ao dia 25 de cada mês",
        porque:
          "O prazo limite é o dia 20, não o dia 25.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 155.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-10",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Com que periodicidade deve um trabalhador independente declarar os rendimentos à Segurança Social?",
    opcoes: [
      {
        texto: "Mensalmente",
        porque:
          "As declarações são trimestrais, não mensais.",
      },
      {
        texto: "Trimestralmente",
        porque:
          "Correto. Os trabalhadores independentes declaram os seus rendimentos em janeiro, abril, julho e outubro, referentes ao trimestre anterior.",
      },
      {
        texto: "Semestralmente",
        porque:
          "A declaração é trimestral, e não semestral.",
      },
      {
        texto: "Anualmente, com a declaração de IRS",
        porque:
          "A declaração de rendimentos à SS é trimestral e totalmente separada da declaração anual de IRS.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-11",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Qual é o Indexante dos Apoios Sociais (IAS) em vigor em 2026?",
    opcoes: [
      {
        texto: "480,43 €",
        porque:
          "Este foi o valor do IAS em anos anteriores. O IAS é atualizado anualmente.",
      },
      {
        texto: "509,26 €",
        porque:
          "Este valor corresponde a uma atualização anterior. O IAS 2026 é de 537,13 €.",
      },
      {
        texto: "537,13 €",
        porque:
          "Correto. O IAS em 2026 é de 537,13 €, servindo de base para múltiplos cálculos na Segurança Social.",
      },
      {
        texto: "550,00 €",
        porque:
          "O IAS 2026 é de 537,13 €, não 550 €.",
      },
    ],
    correta: 2,
    legalBasis: "Portaria que fixa o IAS para 2026",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-12",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O que significa rendimento relevante para efeitos da Segurança Social dos trabalhadores independentes?",
    opcoes: [
      {
        texto: "O rendimento bruto total faturado, sem qualquer ajuste",
        porque:
          "A SS aplica um coeficiente ao rendimento bruto (70% para serviços, 20% para bens) antes de calcular a contribuição.",
      },
      {
        texto: "O rendimento bruto multiplicado por um coeficiente (70% para serviços ou 20% para bens)",
        porque:
          "Correto. O rendimento relevante resulta da aplicação do coeficiente do Art. 162.º ao rendimento bruto declarado.",
      },
      {
        texto: "O rendimento bruto menos as despesas comprovadas",
        porque:
          "O regime simplificado da SS não deduz despesas reais; aplica coeficientes fixos ao rendimento bruto.",
      },
      {
        texto: "O rendimento líquido após retenção na fonte de IRS",
        porque:
          "A retenção de IRS não interfere no cálculo do rendimento relevante para a SS.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-13",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A contribuição para a Segurança Social dos trabalhadores independentes é a mesma coisa que a retenção na fonte de IRS?",
    opcoes: [
      {
        texto: "Sim, é tudo descontado junto no recibo verde",
        porque:
          "São obrigações completamente distintas. A retenção de IRS é feita pela entidade pagadora; a SS é paga diretamente pelo trabalhador.",
      },
      {
        texto: "Não. A SS é paga pelo trabalhador diretamente à Segurança Social, enquanto a retenção na fonte é um adiantamento ao IRS",
        porque:
          "Correto. A contribuição para a SS é separada e paga mensalmente pelo trabalhador. A retenção na fonte é descontada no recibo pela entidade pagadora e entregue às Finanças.",
      },
      {
        texto: "Sim, mas com taxas diferentes",
        porque:
          "Não são a mesma coisa. São obrigações diferentes, com destinatários diferentes (SS vs. Finanças) e regras próprias.",
      },
      {
        texto: "Depende do tipo de atividade",
        porque:
          "Independentemente da atividade, a contribuição para a SS e a retenção de IRS são sempre obrigações separadas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º do Código Contributivo · Art. 101.º CIRS",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-14",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O Marco faturou 2.000 € num trimestre exclusivamente em prestação de serviços. Qual é o seu rendimento relevante mensal para a Segurança Social?",
    opcoes: [
      {
        texto: "2.000 €",
        porque:
          "É preciso aplicar o coeficiente de 70% e dividir por 3 meses.",
      },
      {
        texto: "666,67 €",
        porque:
          "Este valor resulta de dividir 2.000 € por 3, mas falta aplicar o coeficiente de 70%.",
      },
      {
        texto: "466,67 €",
        porque:
          "Correto. Rendimento relevante = 2.000 € × 70% = 1.400 €; dividido por 3 meses = 466,67 €/mês.",
      },
      {
        texto: "1.400 €",
        porque:
          "1.400 € é o rendimento relevante trimestral; precisa de ser dividido por 3 para obter o mensal.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-15",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Catarina trabalha exclusivamente por conta de outrem, a tempo inteiro. Decide abrir atividade independente em paralelo. Paga contribuições de trabalhadora independente para a SS desde o início?",
    opcoes: [
      {
        texto: "Sim, sempre que há atividade independente há contribuições",
        porque:
          "Quem acumula com trabalho dependente beneficia de isenção durante os primeiros 12 meses, tal como qualquer início de atividade, e pode continuar isento sob certas condições.",
      },
      {
        texto: "Não. Nos primeiros 12 meses beneficia de isenção e, depois, só paga se ultrapassar determinados rendimentos",
        porque:
          "Correto. Além da isenção inicial de 12 meses, quem acumula com emprego por conta de outrem pode ficar isento enquanto o rendimento relevante mensal não exceder 4 × IAS.",
      },
      {
        texto: "Não, quem trabalha por conta de outrem nunca paga SS como independente",
        porque:
          "Há situações em que se paga, nomeadamente quando o rendimento relevante mensal excede 4 × IAS.",
      },
      {
        texto: "Paga sempre 50% da taxa normal",
        porque:
          "Não existe redução de 50%. A isenção é total ou não se aplica, consoante o rendimento.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 157.º e Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-16",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Qual é o teto máximo mensal de base de incidência contributiva para trabalhadores independentes em 2026?",
    opcoes: [
      {
        texto: "12 × IAS = 6.445,56 €",
        porque:
          "Correto. O teto mensal é 12 vezes o IAS (12 × 537,13 € = 6.445,56 €). Rendimento relevante acima deste valor não é considerado.",
      },
      {
        texto: "6 × IAS = 3.222,78 €",
        porque:
          "O teto é 12 × IAS, não 6 × IAS.",
      },
      {
        texto: "Não existe teto, paga-se sobre tudo",
        porque:
          "Existe um teto mensal de 12 × IAS, o que limita a contribuição máxima.",
      },
      {
        texto: "10.000 € por mês",
        porque:
          "O teto é calculado em função do IAS (12 × 537,13 € = 6.445,56 €), não é um valor redondo.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 163.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-17",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Rita quer saber se pode pagar menos de 20 € por mês de contribuição para a Segurança Social. É possível?",
    opcoes: [
      {
        texto: "Sim, se o rendimento relevante for muito baixo pode pagar 0 €",
        porque:
          "Existe uma contribuição mínima de 20 €/mês. Mesmo que o cálculo dê menos, o trabalhador paga pelo menos 20 €.",
      },
      {
        texto: "Sim, se pedir à SS uma redução especial",
        porque:
          "Não existe mecanismo de pedido de redução abaixo dos 20 €. O mínimo de 20 € é obrigatório.",
      },
      {
        texto: "Não. A contribuição mínima é de 20 € por mês",
        porque:
          "Correto. O Art. 168.º do Código Contributivo fixa uma contribuição mínima de 20 € mensais para trabalhadores independentes.",
      },
      {
        texto: "Não. A contribuição mínima é de 1 × IAS por mês",
        porque:
          "A contribuição mínima é de 20 €, não de 1 × IAS (537,13 €).",
      },
    ],
    correta: 2,
    legalBasis: "Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-18",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O João abriu atividade em fevereiro de 2026 e nunca trabalhou como independente antes. Em que mês faz a primeira declaração trimestral de rendimentos à SS?",
    opcoes: [
      {
        texto: "Em março de 2026",
        porque:
          "Nos primeiros 12 meses há isenção, mas a obrigação declarativa começa depois do primeiro trimestre completo de atividade.",
      },
      {
        texto: "Só após terminarem os 12 meses de isenção",
        porque:
          "A obrigação declarativa existe independentemente da isenção contributiva. Mesmo isento, deve declarar rendimentos trimestralmente.",
      },
      {
        texto: "Em abril de 2026, referente ao 1.º trimestre",
        porque:
          "Correto. Mesmo durante o período de isenção, o trabalhador independente deve declarar os rendimentos trimestralmente. A primeira declaração possível será em abril (referente ao trimestre jan-mar).",
      },
      {
        texto: "Nunca, enquanto estiver isento",
        porque:
          "A isenção contributiva não dispensa a obrigação declarativa. Os rendimentos devem ser declarados trimestralmente.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 151.º-A e Art. 157.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-19",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Qual a percentagem do rendimento bruto considerada como rendimento relevante para um trabalhador que vende bens ou trabalha em hotelaria/restauração?",
    opcoes: [
      {
        texto: "70%",
        porque:
          "70% aplica-se à prestação de serviços. Para venda de bens, hotelaria e restauração é 20%.",
      },
      {
        texto: "50%",
        porque:
          "Não existe coeficiente de 50% na SS. As percentagens são 70% (serviços) ou 20% (bens/hotelaria).",
      },
      {
        texto: "20%",
        porque:
          "Correto. Para produção/venda de bens e atividades de hotelaria/restauração, o rendimento relevante é 20% do rendimento bruto (Art. 162.º).",
      },
      {
        texto: "100%",
        porque:
          "A SS nunca incide sobre 100% do rendimento bruto. Aplicam-se coeficientes de 70% ou 20%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-20",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Marta prestou serviços e faturou 3.000 € num trimestre. Qual o rendimento relevante trimestral para a SS?",
    opcoes: [
      {
        texto: "3.000 €",
        porque:
          "É preciso aplicar o coeficiente de 70%, resultando em 2.100 €.",
      },
      {
        texto: "2.100 €",
        porque:
          "Correto. 3.000 € × 70% = 2.100 €. Este é o rendimento relevante trimestral.",
      },
      {
        texto: "600 €",
        porque:
          "600 € resultaria de aplicar 20% (coeficiente de bens), mas a Marta presta serviços (70%).",
      },
      {
        texto: "900 €",
        porque:
          "900 € não corresponde a nenhum cálculo correto. Serviços usam coeficiente de 70%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-21",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A contribuição mensal de um trabalhador independente para a Segurança Social é calculada aplicando que taxa sobre a base de incidência?",
    opcoes: [
      {
        texto: "25,2%",
        porque:
          "25,2% é a taxa correspondente à parte do trabalhador em regime de conta de outrem. Independentes pagam 21,4%.",
      },
      {
        texto: "23%",
        porque:
          "23% é a taxa de retenção na fonte de IRS para profissões do Art. 151.º, não a taxa de SS.",
      },
      {
        texto: "11%",
        porque:
          "11% é a taxa contributiva do trabalhador por conta de outrem (a parte do empregado), não a do independente.",
      },
      {
        texto: "21,4%",
        porque:
          "Correto. O Art. 168.º do Código Contributivo fixa a taxa contributiva dos trabalhadores independentes em 21,4%.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-22",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O Pedro faturou 9.000 € num trimestre em prestação de serviços. Qual é o seu rendimento relevante mensal médio?",
    opcoes: [
      {
        texto: "3.000 €",
        porque:
          "3.000 € resulta de dividir o bruto por 3, mas falta aplicar o coeficiente de 70%.",
      },
      {
        texto: "6.300 €",
        porque:
          "6.300 € é o rendimento relevante trimestral (9.000 × 70%), mas precisa de ser dividido por 3.",
      },
      {
        texto: "2.100 €",
        porque:
          "Correto. 9.000 € × 70% = 6.300 € trimestral; 6.300 € ÷ 3 = 2.100 €/mês.",
      },
      {
        texto: "1.800 €",
        porque:
          "Não corresponde a nenhum cálculo correto com os coeficientes do Art. 162.º.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-23",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A declaração trimestral de rendimentos à Segurança Social entregue em janeiro refere-se a que período?",
    opcoes: [
      {
        texto: "Janeiro a março",
        porque:
          "Janeiro a março é declarado em abril. A de janeiro refere-se ao trimestre anterior.",
      },
      {
        texto: "Outubro a dezembro do ano anterior",
        porque:
          "Correto. A declaração de janeiro reporta os rendimentos do 4.º trimestre do ano anterior (outubro, novembro e dezembro).",
      },
      {
        texto: "Apenas ao mês de dezembro",
        porque:
          "A declaração é trimestral, ou seja, abrange 3 meses completos.",
      },
      {
        texto: "Todo o ano anterior",
        porque:
          "Cada declaração cobre apenas um trimestre, não o ano inteiro.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-24",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Se um trabalhador independente não emitir qualquer recibo num dado trimestre, deve mesmo assim entregar a declaração trimestral à SS?",
    opcoes: [
      {
        texto: "Não, só se declara quando há rendimentos",
        porque:
          "A declaração é obrigatória mesmo que o valor declarado seja zero.",
      },
      {
        texto: "Sim, declara rendimento zero",
        porque:
          "Correto. A obrigação declarativa trimestral mantém-se independentemente de haver rendimentos no período.",
      },
      {
        texto: "Só se a SS enviar um aviso",
        porque:
          "É obrigação do trabalhador declarar; não depende de aviso da SS.",
      },
      {
        texto: "Não, a atividade é automaticamente suspensa",
        porque:
          "Não faturar num trimestre não suspende a atividade. A declaração continua a ser obrigatória.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-25",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O Miguel tem rendimento relevante mensal de 100 €. Aplicando a taxa de 21,4%, daria 21,40 €. Quanto paga efetivamente de contribuição mensal?",
    opcoes: [
      {
        texto: "21,40 €",
        porque:
          "Correto. O cálculo de 100 € × 21,4% = 21,40 €, que está acima do mínimo de 20 €, portanto paga 21,40 €.",
      },
      {
        texto: "20 €",
        porque:
          "O mínimo de 20 € aplica-se quando o cálculo dá menos de 20 €. Neste caso, 21,40 € é superior ao mínimo.",
      },
      {
        texto: "0 €, porque está abaixo de 1 × IAS",
        porque:
          "Não existe isenção por rendimento inferior ao IAS. A contribuição mínima é de 20 €.",
      },
      {
        texto: "100 €",
        porque:
          "A contribuição é 21,4% da base de incidência, não 100% do rendimento relevante.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-26",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Ana encerrou atividade como independente há 2 anos. Se reabrir agora, tem direito à isenção de 12 meses na SS?",
    opcoes: [
      {
        texto: "Sim, sempre que se reabre atividade há isenção",
        porque:
          "A isenção exige não ter tido atividade independente nos 3 anos anteriores. Dois anos não são suficientes.",
      },
      {
        texto: "Não, porque não passaram 3 anos desde o encerramento anterior",
        porque:
          "Correto. O Art. 157.º exige que não tenha havido atividade independente nos 3 anos anteriores para beneficiar da isenção de 12 meses.",
      },
      {
        texto: "Sim, se o rendimento for inferior a 1.000 € no primeiro mês",
        porque:
          "A isenção inicial não depende do rendimento, mas sim do tempo decorrido desde a última atividade independente.",
      },
      {
        texto: "Depende da atividade que vai exercer",
        porque:
          "A isenção inicial aplica-se a qualquer atividade independente; o tipo de atividade é irrelevante.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 157.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-27",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O teto mensal de base de incidência contributiva (12 × IAS) protege o trabalhador independente de quê?",
    opcoes: [
      {
        texto: "De pagar imposto de IRS a mais",
        porque:
          "O teto é da Segurança Social. O IRS tem as suas próprias regras e escalões.",
      },
      {
        texto: "De ter a contribuição calculada sobre rendimento relevante superior a 6.445,56 €",
        porque:
          "Correto. Se o rendimento relevante mensal exceder 6.445,56 €, a contribuição é calculada apenas sobre esse teto, e não sobre o excedente.",
      },
      {
        texto: "De ter de fazer retenção na fonte",
        porque:
          "O teto da SS não influencia a retenção na fonte de IRS. São sistemas distintos.",
      },
      {
        texto: "De ultrapassar o limite de isenção de IVA",
        porque:
          "O teto da SS nada tem a ver com a isenção de IVA do Art. 53.º CIVA.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-28",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Quem é responsável por pagar a contribuição mensal do trabalhador independente à Segurança Social?",
    opcoes: [
      {
        texto: "A entidade contratante, que a desconta do pagamento",
        porque:
          "A entidade contratante pode ter de pagar contribuições adicionais, mas a contribuição do trabalhador é paga por ele próprio.",
      },
      {
        texto: "O próprio trabalhador independente",
        porque:
          "Correto. O trabalhador independente é responsável pelo pagamento direto das suas contribuições à SS, ao contrário do trabalhador por conta de outrem.",
      },
      {
        texto: "O contabilista certificado do trabalhador",
        porque:
          "O contabilista pode ajudar, mas a obrigação de pagamento é do trabalhador.",
      },
      {
        texto: "As Finanças, que transferem automaticamente",
        porque:
          "As Finanças (AT) e a Segurança Social são entidades separadas. Não há transferência automática.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 150.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-29",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O Rui faturou 1.500 € em serviços num trimestre. Qual é a sua contribuição mensal para a SS (antes de aplicar mínimo)?",
    opcoes: [
      {
        texto: "107,10 €",
        porque:
          "Este seria o cálculo correto se o rendimento relevante mensal fosse 500 €. Mas 1.500 € × 70% ÷ 3 = 350 € e 350 € × 21,4% = 74,90 €.",
      },
      {
        texto: "74,90 €",
        porque:
          "Correto. 1.500 € × 70% = 1.050 €; 1.050 € ÷ 3 = 350 € por mês; 350 € × 21,4% = 74,90 €.",
      },
      {
        texto: "321 €",
        porque:
          "321 € resulta de aplicar 21,4% sobre 1.500 € sem coeficiente nem divisão trimestral.",
      },
      {
        texto: "20 €",
        porque:
          "20 € é o mínimo, mas neste caso o cálculo resulta em 74,90 €, que é superior ao mínimo.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-30",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A isenção de contribuição nos primeiros 12 meses da Segurança Social aplica-se a que tipo de trabalhadores?",
    opcoes: [
      {
        texto: "Apenas a quem tem menos de 30 anos",
        porque:
          "A isenção de 12 meses não depende da idade. Qualquer novo independente que cumpra os requisitos pode beneficiar.",
      },
      {
        texto: "Apenas a quem fature menos de 10.000 € por ano",
        porque:
          "A isenção inicial não tem limite de faturação. Aplica-se por 12 meses independentemente do rendimento.",
      },
      {
        texto: "A quem inicia atividade independente sem ter tido atividade nos 3 anos anteriores",
        porque:
          "Correto. O Art. 157.º concede 12 meses de isenção a quem inicia pela primeira vez ou não teve atividade independente nos 3 anos anteriores.",
      },
      {
        texto: "A todos os trabalhadores independentes, uma vez na vida",
        porque:
          "A isenção pode ser usada mais de uma vez, desde que passem 3 anos sem atividade independente.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 157.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-31",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A contribuição para a Segurança Social de um trabalhador independente pode ser deduzida no cálculo do IRS?",
    opcoes: [
      {
        texto: "Sim, é dedutível ao rendimento da categoria B",
        porque:
          "No regime simplificado, as contribuições para a SS podem ser parcialmente consideradas (são abatidas à parte não coberta pelo coeficiente), mas não se confundem com uma dedução direta ao rendimento bruto.",
      },
      {
        texto: "Não, a SS não tem qualquer relação com o IRS",
        porque:
          "Embora sejam sistemas separados, as contribuições para a SS podem ser consideradas no cálculo do rendimento tributável no regime simplificado.",
      },
      {
        texto: "Sim, mas apenas no regime de contabilidade organizada",
        porque:
          "Em contabilidade organizada, as contribuições são dedutíveis como encargo. Mas no regime simplificado também podem ser parcialmente consideradas.",
      },
      {
        texto: "As contribuições para a SS são consideradas no cálculo do rendimento tributável, mas não são uma dedução direta como despesas de saúde",
        porque:
          "Correto. No regime simplificado, as contribuições para a SS entram na parcela que permite justificar despesas até 15% do rendimento bruto, mas não funcionam como dedução à coleta.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 31.º CIRS e Art. 78.º-D CIRS",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-32",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Sandra vendeu produtos artesanais e faturou 6.000 € no trimestre. Qual é o rendimento relevante mensal?",
    opcoes: [
      {
        texto: "2.000 €",
        porque:
          "2.000 € resulta de dividir 6.000 € por 3, sem aplicar o coeficiente de 20% para venda de bens.",
      },
      {
        texto: "400 €",
        porque:
          "Correto. 6.000 € × 20% = 1.200 € trimestral; 1.200 € ÷ 3 = 400 €/mês.",
      },
      {
        texto: "1.400 €",
        porque:
          "1.400 € resultaria se se aplicasse o coeficiente de 70% (serviços), mas a Sandra vende bens (20%).",
      },
      {
        texto: "1.200 €",
        porque:
          "1.200 € é o rendimento relevante trimestral; divide-se por 3 para obter o mensal (400 €).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-33",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A declaração trimestral de rendimentos à SS entregue em julho refere-se a que meses?",
    opcoes: [
      {
        texto: "Julho, agosto e setembro",
        porque:
          "A declaração de julho reporta o trimestre anterior, não o que começa em julho.",
      },
      {
        texto: "Abril, maio e junho",
        porque:
          "Correto. A declaração de julho refere-se ao 2.º trimestre do ano: abril, maio e junho.",
      },
      {
        texto: "Janeiro a junho",
        porque:
          "A declaração cobre um trimestre (3 meses), não um semestre.",
      },
      {
        texto: "Maio e junho apenas",
        porque:
          "São sempre 3 meses completos, não apenas 2.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-34",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "Para que serve a declaração trimestral de rendimentos à Segurança Social?",
    opcoes: [
      {
        texto: "Para calcular o IRS a pagar",
        porque:
          "A declaração trimestral à SS serve para apurar contribuições. O IRS é tratado pela AT, com a declaração anual de rendimentos.",
      },
      {
        texto: "Para a SS apurar a base de incidência e fixar a contribuição mensal dos três meses seguintes",
        porque:
          "Correto. Com base nos rendimentos declarados, a SS calcula o rendimento relevante mensal e fixa a contribuição para os meses seguintes.",
      },
      {
        texto: "Para renovar a isenção de IVA",
        porque:
          "A isenção de IVA (Art. 53.º CIVA) depende do volume de negócios anual, não de declarações trimestrais à SS.",
      },
      {
        texto: "É apenas informativa, sem consequências no valor a pagar",
        porque:
          "A declaração é determinante: é com base nela que a SS calcula a contribuição mensal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A e Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-35",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A Luísa é enfermeira a recibos verdes e faturou 4.500 € em serviços no último trimestre. Qual o rendimento relevante trimestral?",
    opcoes: [
      {
        texto: "4.500 €",
        porque:
          "É necessário aplicar o coeficiente de 70% sobre o rendimento bruto.",
      },
      {
        texto: "900 €",
        porque:
          "900 € resultaria de aplicar 20%, coeficiente de bens/hotelaria. Serviços utilizam 70%.",
      },
      {
        texto: "3.150 €",
        porque:
          "Correto. 4.500 € × 70% = 3.150 €. Este é o rendimento relevante trimestral para serviços.",
      },
      {
        texto: "2.250 €",
        porque:
          "2.250 € resultaria de aplicar 50%, que não é um coeficiente válido na SS.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-36",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "A contribuição máxima mensal possível para a SS de um trabalhador independente em 2026 é aproximadamente:",
    opcoes: [
      {
        texto: "537,13 € (1 × IAS)",
        porque:
          "A contribuição máxima resulta de aplicar 21,4% sobre o teto de 6.445,56 €, o que dá 1.379,35 €.",
      },
      {
        texto: "1.379,35 €",
        porque:
          "Correto. O teto da base de incidência é 6.445,56 €. Aplicando 21,4% obtém-se ≈ 1.379,35 € como contribuição máxima.",
      },
      {
        texto: "2.000 €",
        porque:
          "A contribuição máxima é limitada pelo teto de 12 × IAS. 6.445,56 € × 21,4% ≈ 1.379,35 €.",
      },
      {
        texto: "6.445,56 €",
        porque:
          "6.445,56 € é o teto da base de incidência, não a contribuição. A contribuição é 21,4% desse valor.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-37",
    categoria: "seguranca_social",
    dificuldade: 1,
    pergunta:
      "O Tiago paga contribuições para a SS como trabalhador independente. Este pagamento dá-lhe direito a que tipo de proteção?",
    opcoes: [
      {
        texto: "Apenas reforma/pensão de velhice",
        porque:
          "A proteção social cobre mais do que apenas a pensão de velhice.",
      },
      {
        texto: "Proteção em doença, parentalidade, invalidez, velhice e morte, entre outras",
        porque:
          "Correto. As contribuições do trabalhador independente financiam proteção em diversas eventualidades: doença, parentalidade, doenças profissionais, invalidez, velhice e morte.",
      },
      {
        texto: "Apenas subsídio de doença e reforma",
        porque:
          "A proteção inclui também parentalidade, invalidez e morte, entre outras.",
      },
      {
        texto: "Nenhuma proteção direta — é apenas uma obrigação fiscal",
        porque:
          "As contribuições são contributivas, não fiscais, e geram direitos de proteção social concretos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 141.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },

  // ── ss-38 a ss-77: dificuldade 2 (40 perguntas) ────────────────────────

  {
    id: "ss-38",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Carlos presta serviços (coeficiente 70%) e faturou 12.000 € no trimestre. Qual é a contribuição mensal para a SS?",
    opcoes: [
      {
        texto: "856 €",
        porque:
          "Este valor resulta de aplicar 21,4% sobre 4.000 €, mas o rendimento relevante mensal é 2.800 € (12.000 × 70% ÷ 3).",
      },
      {
        texto: "599,20 €",
        porque:
          "Correto. 12.000 € × 70% = 8.400 € trimestral; 8.400 ÷ 3 = 2.800 €/mês; 2.800 × 21,4% = 599,20 €.",
      },
      {
        texto: "2.568 €",
        porque:
          "2.568 € resulta de aplicar 21,4% sobre 12.000 € sem coeficiente nem divisão.",
      },
      {
        texto: "1.379,35 € (teto)",
        porque:
          "O teto aplica-se quando o rendimento relevante mensal excede 6.445,56 €. Aqui é 2.800 €, muito abaixo.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-39",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Helena presta serviços e faturou 30.000 € num trimestre. O rendimento relevante mensal (7.000 €) ultrapassa o teto. Quanto paga de contribuição?",
    opcoes: [
      {
        texto: "1.498 €",
        porque:
          "Aplicar 21,4% sobre 7.000 € ignora o teto mensal de 6.445,56 €.",
      },
      {
        texto: "1.379,35 €",
        porque:
          "Correto. O rendimento relevante mensal é 30.000 × 70% ÷ 3 = 7.000 €, mas aplica-se o teto de 6.445,56 €. Contribuição = 6.445,56 × 21,4% ≈ 1.379,35 €.",
      },
      {
        texto: "2.140 €",
        porque:
          "2.140 € resulta de aplicar 21,4% sobre 10.000 €, que não corresponde a nenhum cálculo válido.",
      },
      {
        texto: "6.445,56 €",
        porque:
          "6.445,56 € é o teto da base de incidência, não o valor da contribuição.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-40",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Bruno tem atividade mista: faturou 3.000 € em serviços e 6.000 € em venda de bens no mesmo trimestre. Qual é o rendimento relevante trimestral total?",
    opcoes: [
      {
        texto: "9.000 €",
        porque:
          "É preciso aplicar os coeficientes respetivos: 70% para serviços e 20% para bens.",
      },
      {
        texto: "6.300 €",
        porque:
          "6.300 € resulta de aplicar 70% a tudo. Mas a venda de bens usa 20%.",
      },
      {
        texto: "3.300 €",
        porque:
          "Correto. Serviços: 3.000 € × 70% = 2.100 €; Bens: 6.000 € × 20% = 1.200 €; Total = 3.300 €.",
      },
      {
        texto: "1.800 €",
        porque:
          "1.800 € resulta de aplicar 20% a tudo, mas os serviços usam o coeficiente de 70%.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-41",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A entidade contratante paga contribuições adicionais quando mais de 50% dos rendimentos de um trabalhador independente provêm dela. Qual é a taxa aplicável à entidade contratante?",
    opcoes: [
      {
        texto: "7%",
        porque:
          "A taxa para a entidade contratante com dependência económica (>50% a <80%) é de 7%. Para dependência ≥80%, sobe para 10%.",
      },
      {
        texto: "10%",
        porque:
          "10% aplica-se quando a dependência económica é ≥80% dos rendimentos. Para >50% a <80%, a taxa é 7%.",
      },
      {
        texto: "7% se a dependência é >50% e <80%; 10% se ≥80%",
        porque:
          "Correto. A taxa varia conforme o grau de dependência económica: 7% para dependência >50% a <80% e 10% para ≥80%.",
      },
      {
        texto: "21,4%, igual à do trabalhador",
        porque:
          "A taxa da entidade contratante é diferente da taxa do trabalhador independente.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 168.º, n.os 5 a 7 do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-42",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O que acontece se um trabalhador independente não pagar a contribuição mensal da SS dentro do prazo (até dia 20)?",
    opcoes: [
      {
        texto: "Nada acontece; pode pagar no mês seguinte sem penalização",
        porque:
          "O atraso no pagamento gera juros de mora e pode resultar em dívida à SS com consequências legais.",
      },
      {
        texto: "A atividade é automaticamente encerrada",
        porque:
          "O não pagamento gera dívida e juros, mas não encerra automaticamente a atividade.",
      },
      {
        texto: "São aplicados juros de mora e pode ser instaurado processo de execução fiscal",
        porque:
          "Correto. O atraso gera juros de mora e, se a dívida persistir, pode haver cobrança coerciva através de execução fiscal.",
      },
      {
        texto: "O trabalhador perde todos os direitos de proteção social retroativamente",
        porque:
          "A perda de direitos não é automática nem retroativa, mas a situação contributiva irregular pode afetar o acesso a prestações.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 185.º e Art. 211.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-43",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Inês trabalha a tempo inteiro por conta de outrem e abriu atividade independente. No primeiro ano está isenta. Após os 12 meses, com rendimento relevante mensal de 1.500 €, paga SS como independente?",
    opcoes: [
      {
        texto: "Sim, paga sempre após os 12 meses",
        porque:
          "Quem acumula com trabalho por conta de outrem pode continuar isento se o rendimento relevante mensal não exceder 4 × IAS (2.148,52 €).",
      },
      {
        texto: "Não, quem tem emprego nunca paga SS como independente",
        porque:
          "Há isenção para quem acumula, mas apenas enquanto o rendimento relevante mensal não exceder 4 × IAS.",
      },
      {
        texto: "Não, porque 1.500 € está abaixo de 4 × IAS (2.148,52 €)",
        porque:
          "Correto. Após os 12 meses, quem acumula com trabalho por conta de outrem fica isento se o rendimento relevante mensal não exceder 4 × IAS = 4 × 537,13 € = 2.148,52 €.",
      },
      {
        texto: "Sim, mas apenas 50% da contribuição normal",
        porque:
          "Não existe redução de 50%. A isenção é total abaixo do limiar de 4 × IAS.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 157.º e Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-44",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Francisco é programador independente e faturou 15.000 € em serviços num trimestre. Quanto paga por mês de SS?",
    opcoes: [
      {
        texto: "750 €",
        porque:
          "Este cálculo não corresponde à fórmula correta. 15.000 × 70% ÷ 3 = 3.500 €; 3.500 × 21,4% = 749 €.",
      },
      {
        texto: "749 €",
        porque:
          "Correto. Rendimento relevante mensal = 15.000 × 70% ÷ 3 = 3.500 €; contribuição = 3.500 × 21,4% = 749 €.",
      },
      {
        texto: "1.070 €",
        porque:
          "1.070 € resulta de aplicar 21,4% sobre 5.000 € (15.000 ÷ 3), sem coeficiente de 70%.",
      },
      {
        texto: "1.379,35 €",
        porque:
          "O teto aplica-se quando o rendimento relevante mensal excede 6.445,56 €. Aqui é 3.500 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-45",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Margarida é consultora independente e o seu único cliente é uma empresa que lhe paga 100% dos seus rendimentos. O que acontece em termos de SS?",
    opcoes: [
      {
        texto: "Nada de especial; paga a contribuição normal de 21,4%",
        porque:
          "Quando mais de 50% dos rendimentos provêm de uma única entidade, esta é classificada como entidade contratante e paga contribuições adicionais.",
      },
      {
        texto: "A Margarida paga 21,4% e a empresa paga uma taxa adicional de 10% (dependência ≥80%)",
        porque:
          "Correto. A Margarida paga os seus 21,4%. A empresa, como entidade contratante com dependência ≥80%, paga adicionalmente 10% sobre o rendimento relevante.",
      },
      {
        texto: "A empresa passa a pagar toda a contribuição em vez da Margarida",
        porque:
          "A obrigação de 21,4% do trabalhador mantém-se. A contribuição da entidade contratante é adicional.",
      },
      {
        texto: "A Margarida é obrigada a abrir contrato de trabalho",
        porque:
          "A SS não obriga à celebração de contrato de trabalho, mas a entidade contratante paga contribuição adicional.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º, n.os 5 a 7 do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-46",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Diogo tem rendimento relevante mensal de 80 €. Aplicando 21,4%, obtém-se 17,12 €. Quanto paga efetivamente?",
    opcoes: [
      {
        texto: "17,12 €",
        porque:
          "17,12 € está abaixo da contribuição mínima de 20 € mensais. Aplica-se o mínimo.",
      },
      {
        texto: "20 €",
        porque:
          "Correto. Como 17,12 € é inferior ao mínimo de 20 €, o Diogo paga 20 €/mês (Art. 168.º do Código Contributivo).",
      },
      {
        texto: "0 € — está isento por rendimento baixo",
        porque:
          "Não existe isenção por rendimento baixo. A contribuição mínima é de 20 €.",
      },
      {
        texto: "80 €",
        porque:
          "80 € é o rendimento relevante, não a contribuição. Esta é 21,4% da base, com mínimo de 20 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-47",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A trabalhadora independente Teresa está grávida. Tem direito a subsídio parental como trabalhadora independente?",
    opcoes: [
      {
        texto: "Não, o subsídio parental é exclusivo dos trabalhadores por conta de outrem",
        porque:
          "Os trabalhadores independentes que cumpram o prazo de garantia também têm direito ao subsídio parental.",
      },
      {
        texto: "Sim, se tiver cumprido o prazo de garantia (6 meses de contribuições nos últimos 2 anos)",
        porque:
          "Correto. Os trabalhadores independentes têm direito ao subsídio parental (inicial, alargado, etc.) desde que cumpram o prazo de garantia de 6 meses com registo de remunerações nos 2 anos anteriores.",
      },
      {
        texto: "Sim, automaticamente, desde que tenha atividade aberta",
        porque:
          "Ter atividade aberta não basta. É necessário cumprir o prazo de garantia de contribuições.",
      },
      {
        texto: "Apenas tem direito a 30 dias de licença sem remuneração",
        porque:
          "A licença parental para independentes é remunerada pela SS (subsídio parental) se cumprirem os requisitos contributivos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e Art. 29.º do Código Contributivo · DL n.º 91/2009",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-48",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O trabalhador independente André fica doente e não pode trabalhar durante 20 dias. Tem direito a subsídio de doença?",
    opcoes: [
      {
        texto: "Não, trabalhadores independentes não têm subsídio de doença",
        porque:
          "Os independentes com situação contributiva regularizada e prazo de garantia cumprido têm direito ao subsídio de doença.",
      },
      {
        texto: "Sim, mas só a partir do 11.º dia de incapacidade e com prazo de garantia cumprido",
        porque:
          "Correto. Para trabalhadores independentes, o subsídio de doença é atribuído a partir do 11.º dia (os primeiros 10 dias são o período de espera), desde que cumpram o prazo de garantia.",
      },
      {
        texto: "Sim, desde o 1.º dia",
        porque:
          "Para trabalhadores independentes existe um período de espera de 10 dias. O subsídio começa no 11.º dia.",
      },
      {
        texto: "Sim, mas apenas 50% do rendimento de referência",
        porque:
          "O valor do subsídio varia consoante a duração da doença, mas o aspeto relevante é que há um período de espera de 10 dias para independentes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 9.º do DL n.º 28/2004 · Art. 141.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-49",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Nuno faturou 300 € em serviços num trimestre. Qual é a contribuição mensal?",
    opcoes: [
      {
        texto: "14,98 €",
        porque:
          "300 × 70% ÷ 3 = 70 €; 70 × 21,4% = 14,98 €. Mas este valor é inferior ao mínimo de 20 €.",
      },
      {
        texto: "20 €",
        porque:
          "Correto. O cálculo dá 14,98 €, mas como é inferior ao mínimo mensal de 20 €, o Nuno paga 20 €.",
      },
      {
        texto: "70 €",
        porque:
          "70 € é o rendimento relevante mensal, não a contribuição.",
      },
      {
        texto: "0 €, rendimento demasiado baixo",
        porque:
          "Não existe isenção por rendimento baixo. Paga-se pelo menos 20 €/mês.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-50",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "Quando um trabalhador independente cessa a atividade, a obrigação contributiva termina em que momento?",
    opcoes: [
      {
        texto: "Imediatamente, no dia da cessação",
        porque:
          "A obrigação contributiva prolonga-se até ao final do mês em que se cessa atividade, e os rendimentos já declarados continuam a gerar contribuições.",
      },
      {
        texto: "No final do trimestre em que cessou",
        porque:
          "Não é necessariamente até ao final do trimestre, mas os rendimentos já declarados geram contribuições até ao final do período fixado pela SS.",
      },
      {
        texto: "A obrigação cessa no mês seguinte à cessação, considerando os rendimentos do último trimestre declarado",
        porque:
          "Correto. Após cessar atividade, a obrigação contributiva termina tendo em conta o último período de rendimentos declarados. Pode ainda haver contribuições a pagar referentes ao trimestre em curso.",
      },
      {
        texto: "Apenas no final do ano civil",
        porque:
          "A cessação não obriga a esperar pelo final do ano. A obrigação cessa com base nos rendimentos declarados.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 159.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-51",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O trabalhador independente pode optar por contribuir com uma base superior ao rendimento relevante apurado?",
    opcoes: [
      {
        texto: "Não, a base de incidência é sempre o rendimento relevante apurado trimestralmente",
        porque:
          "A lei permite que o trabalhador opte por uma base de incidência superior ao rendimento relevante, até ao teto de 12 × IAS.",
      },
      {
        texto: "Sim, pode optar por uma base de incidência mais elevada, até ao teto de 12 × IAS",
        porque:
          "Correto. O trabalhador pode voluntariamente escolher contribuir sobre uma base mais alta, o que aumenta a proteção social futura (nomeadamente a pensão).",
      },
      {
        texto: "Sim, mas apenas se for pensionista",
        porque:
          "A opção de base mais elevada está disponível para trabalhadores independentes em geral, não apenas pensionistas.",
      },
      {
        texto: "Sim, mas precisa de autorização especial da SS",
        porque:
          "É uma opção do trabalhador, exercida na declaração trimestral, sem necessidade de autorização especial.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-52",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A declaração trimestral à SS é feita até que dia do mês de entrega (janeiro, abril, julho, outubro)?",
    opcoes: [
      {
        texto: "Até ao dia 15",
        porque:
          "O prazo é até ao último dia do mês de entrega.",
      },
      {
        texto: "Até ao último dia do mês",
        porque:
          "Correto. A declaração trimestral deve ser entregue até ao último dia do mês de entrega (31 de janeiro, 30 de abril, 31 de julho, 31 de outubro).",
      },
      {
        texto: "Até ao dia 20",
        porque:
          "O dia 20 é o prazo limite de pagamento da contribuição mensal, não da declaração trimestral.",
      },
      {
        texto: "Até ao dia 10",
        porque:
          "O dia 10 marca o início do prazo de pagamento, não a data-limite da declaração.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-53",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Joana vende refeições num food truck (hotelaria/restauração) e faturou 18.000 € no trimestre. Qual a contribuição mensal para a SS?",
    opcoes: [
      {
        texto: "256,80 €",
        porque:
          "Correto. 18.000 € × 20% = 3.600 € trimestral; 3.600 ÷ 3 = 1.200 €/mês; 1.200 × 21,4% = 256,80 €.",
      },
      {
        texto: "856,80 €",
        porque:
          "Este valor resultaria de aplicar 70% em vez de 20%. Hotelaria e restauração usam 20%.",
      },
      {
        texto: "1.284 €",
        porque:
          "Este valor resulta de aplicar 21,4% sobre 6.000 € (18.000 ÷ 3), sem coeficiente.",
      },
      {
        texto: "20 €",
        porque:
          "O cálculo dá 256,80 €, muito acima do mínimo de 20 €.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-54",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "Qual é o prazo de garantia para acesso à pensão de velhice para trabalhadores independentes?",
    opcoes: [
      {
        texto: "10 anos de contribuições",
        porque:
          "O prazo de garantia para pensão de velhice não é de 10 anos.",
      },
      {
        texto: "15 anos civis com registo de remunerações",
        porque:
          "Correto. O prazo de garantia para a pensão de velhice é de 15 anos civis (seguidos ou interpolados) com registo de remunerações.",
      },
      {
        texto: "20 anos de contribuições",
        porque:
          "O prazo de garantia geral para pensão de velhice é de 15 anos, não 20.",
      },
      {
        texto: "5 anos de contribuições",
        porque:
          "5 anos é insuficiente. O mínimo são 15 anos civis com registo de remunerações.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 21.º do DL n.º 187/2007",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-55",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Ricardo trabalha por conta de outrem e fatura serviços independentes com rendimento relevante mensal de 3.000 €. Sendo 4 × IAS = 2.148,52 €, paga SS como independente?",
    opcoes: [
      {
        texto: "Não, quem trabalha por conta de outrem está sempre isento na atividade independente",
        porque:
          "A isenção aplica-se apenas se o rendimento relevante mensal não exceder 4 × IAS.",
      },
      {
        texto: "Sim, porque 3.000 € excede 4 × IAS (2.148,52 €)",
        porque:
          "Correto. Como o rendimento relevante mensal (3.000 €) ultrapassa o limiar de 4 × IAS (2.148,52 €), o Ricardo paga contribuições de independente sobre o montante que excede esse limiar.",
      },
      {
        texto: "Sim, sobre os 3.000 € completos",
        porque:
          "A contribuição incide sobre o excedente face a 4 × IAS, não sobre a totalidade dos 3.000 €.",
      },
      {
        texto: "Não, desde que o empregador já desconte a SS dele",
        porque:
          "O desconto pelo empregador não isenta a atividade independente quando o rendimento relevante ultrapassa 4 × IAS.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-56",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O que é a entidade contratante para efeitos da Segurança Social?",
    opcoes: [
      {
        texto: "Qualquer empresa que contrate serviços a um trabalhador independente",
        porque:
          "Nem toda a empresa é considerada entidade contratante. É necessário que represente mais de 50% dos rendimentos do trabalhador.",
      },
      {
        texto: "Uma pessoa coletiva ou singular que represente mais de 50% do total dos rendimentos do trabalhador independente",
        porque:
          "Correto. A entidade contratante é aquela de quem o trabalhador independente obtém mais de 50% do rendimento total, gerando obrigação contributiva adicional para a entidade.",
      },
      {
        texto: "Apenas empresas com mais de 250 trabalhadores",
        porque:
          "A dimensão da empresa é irrelevante. O critério é a percentagem de rendimentos.",
      },
      {
        texto: "O Estado, quando contrata serviços externos",
        porque:
          "Qualquer pessoa coletiva ou singular pode ser entidade contratante, não apenas o Estado.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 140.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-57",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Gustavo é pensionista por invalidez e decide abrir atividade independente. Paga contribuições para a SS?",
    opcoes: [
      {
        texto: "Não, pensionistas por invalidez estão sempre isentos",
        porque:
          "A isenção para pensionistas depende da situação. Pensionistas por invalidez que abram atividade podem ter de contribuir.",
      },
      {
        texto: "Sim, está sujeito ao regime contributivo geral dos trabalhadores independentes",
        porque:
          "Correto. Os pensionistas por invalidez que exerçam atividade independente ficam enquadrados no regime geral e pagam contribuições normalmente.",
      },
      {
        texto: "Sim, mas a uma taxa reduzida de 10%",
        porque:
          "Não existe taxa reduzida para pensionistas. A taxa é a geral de 21,4%.",
      },
      {
        texto: "Não, mas perde a pensão de invalidez",
        porque:
          "A abertura de atividade pode ter implicações na pensão, mas não isenta de contribuições.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 132.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-58",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Vera presta serviços e faturou 6.000 € no trimestre. Qual a contribuição mensal?",
    opcoes: [
      {
        texto: "428 €",
        porque:
          "428 € resulta de aplicar 21,4% sobre 2.000 € (6.000 ÷ 3), sem coeficiente.",
      },
      {
        texto: "299,60 €",
        porque:
          "Correto. 6.000 × 70% = 4.200 €; 4.200 ÷ 3 = 1.400 €/mês; 1.400 × 21,4% = 299,60 €.",
      },
      {
        texto: "85,60 €",
        porque:
          "85,60 € resultaria de usar 20% em vez de 70%. Serviços usam 70%.",
      },
      {
        texto: "1.400 €",
        porque:
          "1.400 € é o rendimento relevante mensal, não a contribuição.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-59",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O António é freelancer e quer saber se pode pagar contribuições voluntárias para aumentar a sua futura pensão. É possível?",
    opcoes: [
      {
        texto: "Não, os trabalhadores independentes já estão no regime obrigatório",
        porque:
          "Embora estejam no regime obrigatório, podem optar por contribuir sobre uma base de incidência superior.",
      },
      {
        texto: "Sim, pode optar por uma base de incidência superior na declaração trimestral",
        porque:
          "Correto. Ao escolher uma base mais elevada (até 12 × IAS), o trabalhador paga mais de contribuição, o que se reflete numa pensão futura mais alta.",
      },
      {
        texto: "Sim, mas tem de aderir a um regime complementar separado",
        porque:
          "A opção de base mais elevada é feita dentro do regime obrigatório, na declaração trimestral.",
      },
      {
        texto: "Sim, mas apenas se faturar mais de 50.000 € por ano",
        porque:
          "A opção de contribuir sobre base mais elevada não depende de um limiar mínimo de faturação.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-60",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Filipa faturou 45.000 € em serviços num trimestre. O rendimento relevante mensal excede o teto. Qual é a base de incidência mensal usada?",
    opcoes: [
      {
        texto: "10.500 € (rendimento relevante mensal real)",
        porque:
          "O rendimento relevante mensal seria 45.000 × 70% ÷ 3 = 10.500 €, mas excede o teto e por isso usa-se o teto.",
      },
      {
        texto: "15.000 € (faturação mensal bruta)",
        porque:
          "A base de incidência nunca é o rendimento bruto. Usa-se o rendimento relevante, limitado pelo teto.",
      },
      {
        texto: "6.445,56 € (12 × IAS)",
        porque:
          "Correto. Como 10.500 € excede o teto de 6.445,56 €, a base de incidência é limitada a 6.445,56 €.",
      },
      {
        texto: "537,13 € (1 × IAS)",
        porque:
          "1 × IAS é o valor do IAS, não o teto. O teto é 12 × IAS = 6.445,56 €.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 163.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-61",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "Em que meses do ano se deve entregar a declaração trimestral de rendimentos à Segurança Social?",
    opcoes: [
      {
        texto: "Março, junho, setembro e dezembro",
        porque:
          "Estes não são os meses corretos. A declaração é em janeiro, abril, julho e outubro.",
      },
      {
        texto: "Janeiro, abril, julho e outubro",
        porque:
          "Correto. A declaração trimestral é entregue nestes quatro meses, referente ao trimestre imediatamente anterior.",
      },
      {
        texto: "Fevereiro, maio, agosto e novembro",
        porque:
          "Estes não são os meses de entrega da declaração trimestral à SS.",
      },
      {
        texto: "Apenas em janeiro e julho",
        porque:
          "São quatro declarações por ano (uma por trimestre), não apenas duas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-62",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Cláudia é designer e 75% dos seus rendimentos vêm de uma única empresa. A empresa é considerada entidade contratante. Que taxa paga a empresa?",
    opcoes: [
      {
        texto: "10%",
        porque:
          "10% aplica-se quando a dependência é ≥80%. Entre 50% e 80%, a taxa é 7%.",
      },
      {
        texto: "7%",
        porque:
          "Correto. Com 75% dos rendimentos provenientes da mesma entidade (>50% mas <80%), a taxa da entidade contratante é de 7%.",
      },
      {
        texto: "21,4%",
        porque:
          "21,4% é a taxa do trabalhador independente, não da entidade contratante.",
      },
      {
        texto: "0% — a empresa não paga nada",
        porque:
          "Com dependência económica superior a 50%, a empresa paga obrigatoriamente uma taxa adicional.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º, n.os 5 a 7 do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-63",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Henrique é trabalhador independente e quer fazer contribuições voluntárias para cobrir o período em que esteve sem atividade. É possível?",
    opcoes: [
      {
        texto: "Sim, pode pagar retroativamente para qualquer período em falta",
        porque:
          "As contribuições voluntárias permitem preencher lacunas na carreira contributiva, mas estão sujeitas a regras específicas de enquadramento.",
      },
      {
        texto: "Sim, existe o regime de seguro social voluntário para quem quer manter ou completar a carreira contributiva",
        porque:
          "Correto. O seguro social voluntário permite a quem cessou a obrigação contributiva manter a proteção social e completar a carreira para efeitos de reforma.",
      },
      {
        texto: "Não, quem interrompe a atividade perde todos os anos anteriores",
        porque:
          "As contribuições passadas não se perdem. E o seguro social voluntário permite continuar a contribuir mesmo sem atividade.",
      },
      {
        texto: "Não, apenas trabalhadores por conta de outrem podem aderir ao regime voluntário",
        porque:
          "O seguro social voluntário está aberto a vários tipos de beneficiários, incluindo ex-trabalhadores independentes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 196.º e seguintes do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-64",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Beatriz presta serviços e vende bens. No último trimestre faturou 5.000 € em serviços e 10.000 € em bens. Qual o rendimento relevante mensal?",
    opcoes: [
      {
        texto: "5.000 €",
        porque:
          "É necessário aplicar os coeficientes e dividir pelo trimestre. Serviços: 5.000 × 70% = 3.500 €; Bens: 10.000 × 20% = 2.000 €; total trimestral = 5.500 €; mensal = 1.833,33 €.",
      },
      {
        texto: "1.833,33 €",
        porque:
          "Correto. 5.000 × 70% + 10.000 × 20% = 3.500 + 2.000 = 5.500 € trimestral; 5.500 ÷ 3 ≈ 1.833,33 €.",
      },
      {
        texto: "3.500 €",
        porque:
          "3.500 € corresponde apenas ao rendimento relevante de serviços. Falta somar o de bens.",
      },
      {
        texto: "10.500 €",
        porque:
          "10.500 € resultaria de aplicar 70% a tudo. Bens usam 20%, não 70%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-65",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O prazo de garantia para acesso ao subsídio de doença dos trabalhadores independentes é de:",
    opcoes: [
      {
        texto: "12 meses de contribuições",
        porque:
          "O prazo de garantia para o subsídio de doença é de 6 meses com registo de remunerações, não 12.",
      },
      {
        texto: "6 meses civis com registo de remunerações, seguidos ou interpolados",
        porque:
          "Correto. O prazo de garantia para o subsídio de doença exige 6 meses civis (seguidos ou interpolados) com registo de remunerações nos 2 anos anteriores.",
      },
      {
        texto: "3 meses de contribuições",
        porque:
          "O prazo de garantia é de 6 meses, não 3.",
      },
      {
        texto: "Não existe prazo de garantia; basta estar inscrito",
        porque:
          "Existe um prazo de garantia de 6 meses com registo de remunerações.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 11.º do DL n.º 28/2004",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-66",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Paula é freelancer e a sua contribuição mensal é de 150 €. Se pagar com 30 dias de atraso, o que acontece?",
    opcoes: [
      {
        texto: "Nada, tem tolerância de 30 dias",
        porque:
          "Não existe período de tolerância. Após o dia 20, há juros de mora.",
      },
      {
        texto: "Paga a contribuição acrescida de juros de mora",
        porque:
          "Correto. O pagamento fora do prazo (após o dia 20) gera juros de mora calculados sobre o valor em dívida.",
      },
      {
        texto: "A contribuição duplica automaticamente",
        porque:
          "A contribuição não duplica. Acrescem juros de mora proporcionais ao tempo de atraso.",
      },
      {
        texto: "Perde o direito a todas as prestações no mês seguinte",
        porque:
          "Um atraso pontual gera juros de mora, mas não causa perda imediata de todas as prestações.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 185.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-67",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Leonor abriu atividade em março de 2026. Os 12 meses de isenção terminam em:",
    opcoes: [
      {
        texto: "Fevereiro de 2027",
        porque:
          "Correto. A isenção dura 12 meses a partir do início da atividade: março de 2026 a fevereiro de 2027 (inclusive).",
      },
      {
        texto: "Março de 2027",
        porque:
          "A isenção começa em março de 2026, logo o 12.º mês é fevereiro de 2027. Em março de 2027 já há obrigação contributiva.",
      },
      {
        texto: "Dezembro de 2026",
        porque:
          "A isenção é de 12 meses completos a partir da abertura, não até ao final do ano civil.",
      },
      {
        texto: "Setembro de 2026",
        porque:
          "Setembro seria apenas 6 meses. A isenção é de 12 meses.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 157.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-68",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Manuel faturou 27.000 € em serviços no trimestre. Rendimento relevante mensal = 6.300 €. Está abaixo do teto? Qual a contribuição?",
    opcoes: [
      {
        texto: "Sim, está abaixo do teto. Contribuição = 1.348,20 €",
        porque:
          "Correto. 27.000 × 70% ÷ 3 = 6.300 €. Como 6.300 € < 6.445,56 € (teto), usa-se 6.300 €. Contribuição = 6.300 × 21,4% = 1.348,20 €.",
      },
      {
        texto: "Não, excede o teto. Contribuição = 1.379,35 €",
        porque:
          "6.300 € é inferior ao teto de 6.445,56 €, logo não se aplica o teto.",
      },
      {
        texto: "Sim, está abaixo do teto. Contribuição = 900 €",
        porque:
          "900 € não corresponde a 21,4% × 6.300 €.",
      },
      {
        texto: "Não, excede o teto. Contribuição = 6.445,56 €",
        porque:
          "6.445,56 € é o teto da base, não a contribuição. E 6.300 € está abaixo do teto.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 162.º, Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-69",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O que acontece se um trabalhador independente não entregar a declaração trimestral de rendimentos à SS?",
    opcoes: [
      {
        texto: "A SS assume rendimento zero e a contribuição é 20 €",
        porque:
          "Na falta de declaração, a SS pode fixar oficiosamente a contribuição com base nos últimos rendimentos conhecidos, não assume zero.",
      },
      {
        texto: "A SS pode fixar oficiosamente a contribuição com base nos últimos dados conhecidos e aplicar sanções",
        porque:
          "Correto. Na falta de declaração, a SS pode fixar a base de incidência oficiosamente e o trabalhador pode estar sujeito a contraordenação.",
      },
      {
        texto: "A atividade é automaticamente suspensa",
        porque:
          "A falta de declaração não suspende a atividade. A SS fixa a contribuição oficiosamente.",
      },
      {
        texto: "Nada acontece; o trabalhador fica isento nesse trimestre",
        porque:
          "A falta de declaração não gera isenção. Pode gerar fixação oficiosa e sanções.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A e Art. 164.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-70",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O trabalhador independente que cesse atividade pode ter direito a prestações de desemprego?",
    opcoes: [
      {
        texto: "Não, o subsídio de desemprego é exclusivo dos trabalhadores por conta de outrem",
        porque:
          "Desde 2019, existe a prestação por cessação de atividade para trabalhadores independentes economicamente dependentes.",
      },
      {
        texto: "Sim, existe a prestação por cessação de atividade para independentes economicamente dependentes, sob certas condições",
        porque:
          "Correto. Trabalhadores independentes economicamente dependentes (com entidade contratante) podem aceder à prestação por cessação de atividade, cumprindo os requisitos legais.",
      },
      {
        texto: "Sim, nas mesmas condições que os trabalhadores por conta de outrem",
        porque:
          "As condições são diferentes. A prestação por cessação de atividade aplica-se a independentes economicamente dependentes com regras próprias.",
      },
      {
        texto: "Apenas se tiverem mais de 50 anos",
        porque:
          "A idade não é o critério determinante. É necessário ser economicamente dependente e cumprir o prazo de garantia.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 141.º do Código Contributivo · DL n.º 65/2012",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-71",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Amélia faturou 600 € em bens num trimestre. Rendimento relevante mensal = 40 €. Contribuição calculada = 8,56 €. Quanto paga?",
    opcoes: [
      {
        texto: "8,56 €",
        porque:
          "8,56 € está abaixo do mínimo de 20 €. Aplica-se o mínimo.",
      },
      {
        texto: "0 €",
        porque:
          "Não existe isenção por rendimento baixo. O mínimo é 20 €.",
      },
      {
        texto: "40 €",
        porque:
          "40 € é o rendimento relevante mensal, não a contribuição.",
      },
      {
        texto: "20 €",
        porque:
          "Correto. 600 × 20% = 120 € trim.; 120 ÷ 3 = 40 €/mês; 40 × 21,4% = 8,56 €. Como é inferior a 20 €, paga o mínimo: 20 €.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-72",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Simão é enfermeiro por conta de outrem (a tempo inteiro) e também faz consultas privadas como independente. A sua entidade patronal paga-lhe acima do IAS. O facto de já descontar como TCO influencia as contribuições como independente?",
    opcoes: [
      {
        texto: "Não, são sistemas completamente separados",
        porque:
          "São sistemas separados em termos de entidade, mas o facto de acumular com TCO dá isenção na SS como independente abaixo de 4 × IAS.",
      },
      {
        texto: "Sim. Quem acumula com TCO pode ficar isento como independente enquanto o rendimento relevante mensal não exceder 4 × IAS",
        porque:
          "Correto. A acumulação com trabalho por conta de outrem permite isenção na SS como independente se o rendimento relevante mensal não exceder 4 × IAS (2.148,52 € em 2026).",
      },
      {
        texto: "Sim, paga metade da taxa como independente",
        porque:
          "Não existe meia taxa. A isenção é total abaixo de 4 × IAS.",
      },
      {
        texto: "Sim, mas apenas nos primeiros 6 meses",
        porque:
          "A isenção para acumuladores não tem limite temporal (além dos 12 meses iniciais); mantém-se enquanto o rendimento estiver abaixo do limiar.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-73",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A declaração trimestral de rendimentos à SS é feita em que plataforma?",
    opcoes: [
      {
        texto: "Portal das Finanças (AT)",
        porque:
          "O Portal das Finanças é para obrigações fiscais (IRS, IVA). A SS tem o seu próprio portal.",
      },
      {
        texto: "Segurança Social Direta (SSD)",
        porque:
          "Correto. A declaração trimestral é entregue online através da plataforma Segurança Social Direta.",
      },
      {
        texto: "Portal do Cidadão (ePortugal)",
        porque:
          "O Portal do Cidadão serve para diversos serviços públicos, mas a declaração trimestral é feita na Segurança Social Direta.",
      },
      {
        texto: "Presencialmente, num balcão da Segurança Social",
        porque:
          "A declaração trimestral é entregue eletronicamente na Segurança Social Direta, não presencialmente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-74",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O Hugo faturou 21.000 € em serviços e 15.000 € em venda de bens no trimestre. Qual é o rendimento relevante mensal?",
    opcoes: [
      {
        texto: "12.000 €",
        porque:
          "É preciso aplicar os coeficientes. Serviços: 21.000 × 70% = 14.700 €; Bens: 15.000 × 20% = 3.000 €; total trim. = 17.700 €; mensal = 5.900 €.",
      },
      {
        texto: "5.900 €",
        porque:
          "Correto. 21.000 × 70% = 14.700; 15.000 × 20% = 3.000; total trimestral = 17.700 €; mensal = 17.700 ÷ 3 = 5.900 €.",
      },
      {
        texto: "8.400 €",
        porque:
          "8.400 € resultaria de aplicar 70% a tudo e dividir. Bens usam 20%.",
      },
      {
        texto: "6.445,56 € (teto)",
        porque:
          "5.900 € está abaixo do teto de 6.445,56 €, logo usa-se o valor real.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-75",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A contribuição para a SS de um trabalhador independente com rendimento relevante mensal de 2.000 € é:",
    opcoes: [
      {
        texto: "200 €",
        porque:
          "200 € resultaria de aplicar 10%, que não é a taxa correta.",
      },
      {
        texto: "460 €",
        porque:
          "460 € resultaria de aplicar 23%, que é a taxa de retenção de IRS, não a de SS.",
      },
      {
        texto: "428 €",
        porque:
          "Correto. 2.000 € × 21,4% = 428 €.",
      },
      {
        texto: "214 €",
        porque:
          "214 € resultaria de aplicar 21,4% sobre 1.000 €, não sobre 2.000 €.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-76",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "A Sara quer saber: se num trimestre faturar 0 € em serviços, qual será a contribuição mensal nos meses seguintes?",
    opcoes: [
      {
        texto: "0 € — sem rendimento, sem contribuição",
        porque:
          "Existe uma contribuição mínima de 20 €, mesmo com rendimento relevante zero.",
      },
      {
        texto: "20 € (contribuição mínima)",
        porque:
          "Correto. Mesmo com rendimento relevante de 0 €, aplica-se a contribuição mínima de 20 € mensais.",
      },
      {
        texto: "537,13 € (1 × IAS)",
        porque:
          "1 × IAS não é a contribuição mínima. O mínimo é 20 €.",
      },
      {
        texto: "A atividade é automaticamente suspensa",
        porque:
          "Faturar zero num trimestre não suspende a atividade. Continua a pagar-se pelo menos 20 €.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-77",
    categoria: "seguranca_social",
    dificuldade: 2,
    pergunta:
      "O pai trabalhador independente tem direito ao subsídio parental do pai (licença de paternidade)?",
    opcoes: [
      {
        texto: "Não, o subsídio parental do pai é exclusivo dos trabalhadores por conta de outrem",
        porque:
          "Trabalhadores independentes com prazo de garantia cumprido também têm direito ao subsídio parental do pai.",
      },
      {
        texto: "Sim, se cumprir o prazo de garantia de 6 meses de contribuições nos últimos 2 anos",
        porque:
          "Correto. O pai trabalhador independente tem direito ao subsídio parental (incluindo a licença obrigatória) se cumprir o prazo de garantia.",
      },
      {
        texto: "Sim, mas apenas 5 dias em vez dos 28 obrigatórios",
        porque:
          "O número de dias de licença parental obrigatória do pai é igual para independentes e TCO.",
      },
      {
        texto: "Sim, mas recebe apenas 50% do valor",
        porque:
          "O cálculo do subsídio baseia-se no rendimento de referência, não numa redução automática de 50%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 141.º do Código Contributivo · DL n.º 91/2009",
    fonte: fonte("segSocialGov"),
  },

  // ── ss-78 a ss-100: dificuldade 3 (23 perguntas) ────────────────────────

  {
    id: "ss-78",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Gabriela presta serviços e faturou 28.000 € num trimestre. Simultaneamente, trabalha por conta de outrem a tempo inteiro. Qual a sua obrigação contributiva como independente?",
    opcoes: [
      {
        texto: "Isenta, porque acumula com TCO",
        porque:
          "A isenção para acumulação com TCO só se aplica se o rendimento relevante mensal não exceder 4 × IAS = 2.148,52 €. Aqui, 28.000 × 70% ÷ 3 = 6.533,33 €, que excede largamente.",
      },
      {
        texto: "Paga sobre o excedente acima de 4 × IAS, ou seja, sobre (6.533,33 − 2.148,52) = 4.384,81 €",
        porque:
          "Correto. O rendimento relevante mensal é 6.533,33 €. Deduzindo o limiar de 4 × IAS (2.148,52 €), a base de incidência é 4.384,81 €. Contribuição ≈ 4.384,81 × 21,4% ≈ 938,35 €.",
      },
      {
        texto: "Paga sobre os 6.533,33 € completos",
        porque:
          "Quem acumula com TCO paga apenas sobre o rendimento relevante que excede 4 × IAS.",
      },
      {
        texto: "Paga sobre o teto de 6.445,56 €",
        porque:
          "A base é o excedente acima de 4 × IAS, não o teto mensal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-79",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Tomás tem atividade mista: faturou 24.000 € em serviços e 30.000 € em bens no trimestre. O rendimento relevante mensal excede o teto. Qual a contribuição?",
    opcoes: [
      {
        texto: "1.379,35 €",
        porque:
          "Correto. Serviços: 24.000 × 70% = 16.800 €; Bens: 30.000 × 20% = 6.000 €; total trim. = 22.800 €; mensal = 7.600 €. Excede o teto de 6.445,56 €, logo contribuição = 6.445,56 × 21,4% ≈ 1.379,35 €.",
      },
      {
        texto: "1.626,40 €",
        porque:
          "1.626,40 € resultaria de aplicar 21,4% sobre 7.600 €, ignorando o teto.",
      },
      {
        texto: "7.600 €",
        porque:
          "7.600 € é o rendimento relevante mensal, não a contribuição.",
      },
      {
        texto: "3.876 €",
        porque:
          "Este valor resulta de aplicar 21,4% sobre 18.000 € (faturação mensal bruta), ignorando coeficientes e teto.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 162.º, Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-80",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Raquel é independente com entidade contratante (90% dos rendimentos vêm de uma empresa). Fatura 10.000 € em serviços no trimestre. Qual a contribuição total que a empresa paga como entidade contratante?",
    opcoes: [
      {
        texto: "700 € (trimestral)",
        porque:
          "A taxa da entidade contratante (10% para ≥80%) incide sobre o rendimento relevante, e não sobre o bruto total.",
      },
      {
        texto: "233,33 € por mês",
        porque:
          "Correto. Rendimento relevante trimestral = 10.000 × 70% = 7.000 €; mensal = 2.333,33 €. A entidade contratante paga 10% (dependência ≥80%): 2.333,33 × 10% = 233,33 €/mês.",
      },
      {
        texto: "1.000 € por mês",
        porque:
          "1.000 € resulta de aplicar 10% sobre 10.000 €/3, sem coeficiente de 70%.",
      },
      {
        texto: "499,33 € por mês",
        porque:
          "499,33 € resultaria de aplicar 21,4% sobre o rendimento relevante, que é a taxa do trabalhador, não da entidade contratante.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º, n.os 5 a 7 do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-81",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Vasco é independente e esteve 5 meses sem faturar, mantendo a atividade aberta. Pagou o mínimo de 20 € nesses meses. Esses meses contam para o prazo de garantia da pensão de velhice?",
    opcoes: [
      {
        texto: "Não, porque não teve rendimento real",
        porque:
          "A contribuição mínima de 20 € gera registo de remunerações, que conta para o prazo de garantia.",
      },
      {
        texto: "Sim, porque pagou contribuições (mínimo de 20 €) e tem registo de remunerações",
        porque:
          "Correto. O pagamento da contribuição mínima gera registo de remunerações no historial contributivo, contando para o prazo de garantia.",
      },
      {
        texto: "Sim, mas apenas conta como metade de um mês cada",
        porque:
          "Não existe contagem parcial. Cada mês com contribuição conta integralmente.",
      },
      {
        texto: "Depende do valor acumulado no ano",
        porque:
          "Cada mês com contribuição (mesmo que mínima) conta individualmente para o prazo de garantia.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 21.º do DL n.º 187/2007 · Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-82",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Diana acumula emprego (TCO) com atividade independente. O rendimento relevante mensal como independente é 2.500 €, acima de 4 × IAS (2.148,52 €). Qual a base de incidência para SS de independente?",
    opcoes: [
      {
        texto: "2.500 €",
        porque:
          "Quem acumula com TCO paga sobre o excedente acima de 4 × IAS, não sobre a totalidade.",
      },
      {
        texto: "351,48 €",
        porque:
          "Correto. A base de incidência = 2.500 − 2.148,52 = 351,48 €. Contribuição = 351,48 × 21,4% ≈ 75,22 €.",
      },
      {
        texto: "2.148,52 €",
        porque:
          "2.148,52 € é o limiar de isenção (4 × IAS), não a base de incidência.",
      },
      {
        texto: "537,13 €",
        porque:
          "537,13 € é o valor do IAS, não a base de incidência neste caso.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-83",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Afonso é trabalhador independente e acumulou dívida de 3.000 € à Segurança Social por falta de pagamento. Que consequência prática pode enfrentar?",
    opcoes: [
      {
        texto: "Apenas uma carta de aviso sem outras consequências",
        porque:
          "As consequências vão além de avisos. Pode haver cobrança coerciva, penhora e perda de acesso a prestações.",
      },
      {
        texto: "Processo de execução fiscal, penhora de bens, impossibilidade de aceder a prestações sociais enquanto a dívida persistir",
        porque:
          "Correto. Dívidas à SS podem originar execução fiscal, penhora de bens e rendimentos, e impedem o acesso a prestações sociais.",
      },
      {
        texto: "Encerramento automático da atividade",
        porque:
          "A SS não encerra automaticamente a atividade. A dívida é cobrada coercivamente.",
      },
      {
        texto: "Multa fixa de 500 € e nada mais",
        porque:
          "As consequências não se limitam a uma multa fixa. Incluem juros de mora, execução fiscal e perda de acesso a prestações.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 185.º, Art. 211.º e Art. 55.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-84",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Irene é arquiteta freelancer e faturou 36.000 € em serviços num trimestre. Qual é a contribuição mensal efetiva (considerando o teto)?",
    opcoes: [
      {
        texto: "2.568 €",
        porque:
          "2.568 € resulta de 12.000 × 21,4%, sem coeficiente. O rendimento relevante mensal é 36.000 × 70% ÷ 3 = 8.400 €, que excede o teto.",
      },
      {
        texto: "1.797,60 €",
        porque:
          "1.797,60 € = 8.400 × 21,4%, mas ignora o teto de 6.445,56 €.",
      },
      {
        texto: "1.379,35 €",
        porque:
          "Correto. Rendimento relevante mensal = 8.400 € > teto 6.445,56 €. Contribuição = 6.445,56 × 21,4% ≈ 1.379,35 €.",
      },
      {
        texto: "8.400 €",
        porque:
          "8.400 € é o rendimento relevante mensal, não a contribuição.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 162.º, Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-85",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Eduardo é independente com entidade contratante (60% dos rendimentos). Fatura 20.000 € totais no trimestre, dos quais 12.000 € vêm dessa entidade. Que taxa paga a entidade sobre o rendimento relevante do Eduardo?",
    opcoes: [
      {
        texto: "10%",
        porque:
          "10% aplica-se quando a dependência é ≥80%. Com 60%, a taxa é 7%.",
      },
      {
        texto: "7%",
        porque:
          "Correto. A dependência é de 60% (>50% e <80%), portanto a taxa da entidade contratante é de 7% sobre o rendimento relevante do trabalhador.",
      },
      {
        texto: "21,4%",
        porque:
          "21,4% é a taxa do trabalhador independente, não a da entidade contratante.",
      },
      {
        texto: "3,5%",
        porque:
          "Não existe taxa de 3,5% para entidades contratantes. As taxas são 7% ou 10%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 168.º, n.os 5 a 7 do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-86",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Frederico abriu atividade em julho de 2024 e encerrou em dezembro de 2024. Quer reabrir em janeiro de 2027. Tem isenção de 12 meses?",
    opcoes: [
      {
        texto: "Não, porque já usou a isenção em 2024",
        porque:
          "A isenção pode ser reutilizada desde que não tenha havido atividade independente nos 3 anos anteriores ao reinício.",
      },
      {
        texto: "Sim, porque passaram mais de 2 anos desde a abertura anterior",
        porque:
          "O requisito é não ter tido atividade nos últimos 3 anos. O Frederico teve atividade em 2024 (há menos de 3 anos).",
      },
      {
        texto: "Não, porque não passaram 3 anos sem atividade independente (cessou em dezembro de 2024, que é há apenas ~2 anos)",
        porque:
          "Correto. O Frederico teve atividade independente em 2024, há menos de 3 anos. Não cumpre o requisito do Art. 157.º.",
      },
      {
        texto: "Sim, porque a atividade anterior durou menos de 1 ano",
        porque:
          "A duração da atividade anterior é irrelevante. O que conta é o intervalo de 3 anos sem atividade.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 157.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-87",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Matilde é independente (serviços) e o cálculo da sua contribuição mensal é 1.500 €, pois o rendimento relevante excede o teto. Qual é a contribuição efetiva?",
    opcoes: [
      {
        texto: "1.500 €",
        porque:
          "A contribuição máxima é limitada pelo teto: 6.445,56 × 21,4% ≈ 1.379,35 €.",
      },
      {
        texto: "1.379,35 €",
        porque:
          "Correto. Quando o rendimento relevante excede o teto, a contribuição máxima é 6.445,56 × 21,4% ≈ 1.379,35 €.",
      },
      {
        texto: "6.445,56 €",
        porque:
          "Este é o teto da base de incidência, não a contribuição.",
      },
      {
        texto: "537,13 €",
        porque:
          "537,13 € é o IAS, que não corresponde à contribuição máxima.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-88",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Guilherme tem dois clientes. Do cliente A recebe 55% dos rendimentos e do cliente B recebe 45%. Qual a situação de entidade contratante?",
    opcoes: [
      {
        texto: "Ambos são entidades contratantes",
        porque:
          "Apenas quem representa mais de 50% dos rendimentos é classificado como entidade contratante.",
      },
      {
        texto: "Nenhum é entidade contratante",
        porque:
          "O cliente A representa 55%, que excede o limiar de 50%.",
      },
      {
        texto: "Apenas o cliente A é entidade contratante (55% > 50%), com taxa de 7%",
        porque:
          "Correto. O cliente A ultrapassa 50% (e está abaixo de 80%), logo é entidade contratante com taxa de 7%. O cliente B (45%) não atinge o limiar.",
      },
      {
        texto: "Apenas o cliente B é entidade contratante",
        porque:
          "O cliente B tem 45% (<50%), logo não é entidade contratante.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 140.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-89",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Patrícia é independente (serviços) e quer estimar a sua contribuição anual para a SS. Fatura regularmente 5.000 €/mês. Qual é a estimativa?",
    opcoes: [
      {
        texto: "12.840 € (1.070 × 12)",
        porque:
          "1.070 € resulta de aplicar 21,4% sobre 5.000 €, sem coeficiente de 70%.",
      },
      {
        texto: "8.988 € (749 × 12)",
        porque:
          "Correto. Rendimento relevante mensal = 5.000 × 70% = 3.500 €; contribuição = 3.500 × 21,4% = 749 €; anual ≈ 749 × 12 = 8.988 €.",
      },
      {
        texto: "2.568 € (214 × 12)",
        porque:
          "214 € resultaria de aplicar 21,4% sobre 1.000 €, não sobre o rendimento relevante correto.",
      },
      {
        texto: "16.552,80 € (1.379,35 × 12)",
        porque:
          "Esta seria a contribuição máxima anual (se atingisse o teto todos os meses). O rendimento relevante de 3.500 € está abaixo do teto.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-90",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Alexandre é arquiteto independente e ficou doente durante 45 dias. Tem o prazo de garantia cumprido. Quantos dias recebe efetivamente de subsídio de doença?",
    opcoes: [
      {
        texto: "45 dias",
        porque:
          "Para independentes há um período de espera de 10 dias. O subsídio é pago a partir do 11.º dia.",
      },
      {
        texto: "35 dias",
        porque:
          "Correto. Período de espera de 10 dias para independentes; 45 − 10 = 35 dias de subsídio efetivo.",
      },
      {
        texto: "30 dias",
        porque:
          "O período de espera é de 10 dias, não 15. Logo, 45 − 10 = 35 dias.",
      },
      {
        texto: "42 dias",
        porque:
          "O período de espera para independentes é de 10 dias, não 3.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 9.º do DL n.º 28/2004",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-91",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Clara tem atividade aberta há 18 meses. Nos últimos 6 meses não faturou nada e pagou o mínimo de 20 €. Agora faturou 9.000 € em serviços num trimestre. Quando muda a contribuição?",
    opcoes: [
      {
        texto: "No mês seguinte à emissão da fatura",
        porque:
          "A contribuição é fixada trimestralmente com base na declaração de rendimentos. Não muda por fatura individual.",
      },
      {
        texto: "A contribuição é atualizada após a entrega da declaração trimestral que inclui os 9.000 €, aplicando-se nos meses do trimestre seguinte",
        porque:
          "Correto. Os 9.000 € serão declarados na declaração trimestral seguinte, e a contribuição será ajustada para os meses do trimestre seguinte.",
      },
      {
        texto: "Mantém-se em 20 € até ao final do ano civil",
        porque:
          "A contribuição é atualizada trimestralmente, não anualmente.",
      },
      {
        texto: "Retroativamente, cobrindo os 6 meses em que pagou apenas 20 €",
        porque:
          "Não há atualização retroativa. A nova contribuição aplica-se apenas para a frente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A e Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-92",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Daniel é independente e foi pai recentemente. Está a receber subsídio parental inicial. Durante esse período, mantém a obrigação de contribuir para a SS?",
    opcoes: [
      {
        texto: "Sim, a contribuição mantém-se inalterada",
        porque:
          "Durante o período de gozo de prestação substitutiva de rendimentos de trabalho (como subsídio parental), a obrigação contributiva pode ser suspensa.",
      },
      {
        texto: "Não, a obrigação contributiva fica suspensa durante o período de subsídio parental",
        porque:
          "Correto. Enquanto o trabalhador independente recebe subsídio parental, a obrigação contributiva é suspensa.",
      },
      {
        texto: "Paga metade da contribuição durante a licença",
        porque:
          "Não existe redução de 50%. A obrigação é suspensa durante o período de subsídio.",
      },
      {
        texto: "Sim, e o subsídio é reduzido pelo valor da contribuição",
        porque:
          "O subsídio não é reduzido pela contribuição. A obrigação contributiva é suspensa.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 158.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-93",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Francisca é independente e tem dois tipos de rendimento: 8.000 € em serviços e 20.000 € em bens no trimestre. Trabalha também por conta de outrem. Rendimento relevante mensal = (8.000×70% + 20.000×20%) ÷ 3 = 3.200 €. Excede 4 × IAS. Qual a base para contribuição de independente?",
    opcoes: [
      {
        texto: "3.200 €",
        porque:
          "Quem acumula com TCO paga apenas sobre o excedente acima de 4 × IAS.",
      },
      {
        texto: "1.051,48 €",
        porque:
          "Correto. Base = 3.200 − 2.148,52 (4 × IAS) = 1.051,48 €. Contribuição ≈ 1.051,48 × 21,4% ≈ 225,02 €.",
      },
      {
        texto: "2.148,52 €",
        porque:
          "Este é o limiar de isenção, não a base de incidência.",
      },
      {
        texto: "0 € — quem é TCO não paga SS como independente",
        porque:
          "Quem excede 4 × IAS de rendimento relevante mensal paga sobre o excedente.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 162.º e Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-94",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Miguel é freelancer e a sua contribuição mensal oscila entre trimestres conforme a faturação. Num trimestre faturou 1.200 € (serviços) e no seguinte 30.000 €. A SS cobra sempre a mesma contribuição?",
    opcoes: [
      {
        texto: "Sim, a contribuição é fixa durante o ano inteiro",
        porque:
          "A contribuição é recalculada trimestralmente com base nos rendimentos declarados.",
      },
      {
        texto: "Não. A contribuição é recalculada a cada trimestre com base nos rendimentos declarados, podendo variar significativamente",
        porque:
          "Correto. No 1.º trimestre: 1.200 × 70% ÷ 3 = 280 €/mês → 280 × 21,4% = 59,92 €. No 2.º: 30.000 × 70% ÷ 3 = 7.000 €/mês → teto 6.445,56 € → 1.379,35 €. Grande variação.",
      },
      {
        texto: "Sim, a SS faz a média anual e divide por 12",
        porque:
          "A SS não faz média anual. Cada trimestre gera uma contribuição própria para os 3 meses seguintes.",
      },
      {
        texto: "Não, mas a variação é limitada a ±10% por trimestre",
        porque:
          "Não existe limite de variação. A contribuição reflete fielmente os rendimentos de cada trimestre.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A e Art. 162.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-95",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A empresa X paga 85% dos rendimentos do freelancer Jorge. A empresa Y paga os restantes 15%. Qual a obrigação contributiva adicional de cada empresa?",
    opcoes: [
      {
        texto: "Empresa X: 10%; Empresa Y: 7%",
        porque:
          "A empresa Y não atinge 50% dos rendimentos, logo não é entidade contratante e não paga taxa adicional.",
      },
      {
        texto: "Empresa X: 10% (dependência ≥80%); Empresa Y: nenhuma (abaixo de 50%)",
        porque:
          "Correto. A empresa X paga 10% porque 85% ≥ 80%. A empresa Y não atinge o limiar de 50% e não é classificada como entidade contratante.",
      },
      {
        texto: "Empresa X: 7%; Empresa Y: nenhuma",
        porque:
          "Com 85% dos rendimentos, a dependência é ≥80%, logo a taxa é 10%, não 7%.",
      },
      {
        texto: "Nenhuma empresa paga; apenas o Jorge paga 21,4%",
        porque:
          "Com dependência económica superior a 50%, a entidade contratante tem obrigação contributiva adicional.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 140.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-96",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Eva é independente (serviços) e optou por contribuir sobre uma base superior (5.000 €/mês em vez dos 2.500 € apurados). Qual a contribuição mensal?",
    opcoes: [
      {
        texto: "535 €",
        porque:
          "535 € = 2.500 × 21,4%. Mas a Eva optou por base de 5.000 €.",
      },
      {
        texto: "1.070 €",
        porque:
          "Correto. Ao optar por base de 5.000 €, a contribuição = 5.000 × 21,4% = 1.070 €. Isto aumenta a proteção social futura.",
      },
      {
        texto: "749 €",
        porque:
          "749 € = 3.500 × 21,4%. Não corresponde à base escolhida de 5.000 €.",
      },
      {
        texto: "1.379,35 €",
        porque:
          "A contribuição máxima seria sobre o teto (6.445,56 €). A Eva escolheu 5.000 €, que está abaixo do teto.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-97",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Rodrigo tem dois trabalhos: é técnico de informática por conta de outrem (salário de 1.500 €) e freelancer de programação. Faturou 7.500 € em serviços no trimestre como independente. Precisa de pagar SS como independente?",
    opcoes: [
      {
        texto: "Sim, sobre 1.750 € (o rendimento relevante mensal completo)",
        porque:
          "Quem acumula com TCO tem de verificar se o rendimento relevante mensal excede 4 × IAS = 2.148,52 €. 1.750 € < 2.148,52 €.",
      },
      {
        texto: "Não, porque o rendimento relevante mensal (1.750 €) é inferior a 4 × IAS (2.148,52 €)",
        porque:
          "Correto. 7.500 × 70% ÷ 3 = 1.750 €. Como 1.750 € < 2.148,52 € (4 × IAS), o Rodrigo está isento de contribuições como independente.",
      },
      {
        texto: "Sim, porque acumula duas fontes de rendimento",
        porque:
          "A mera acumulação não obriga a contribuir. A obrigação depende do rendimento relevante mensal exceder 4 × IAS.",
      },
      {
        texto: "Não, porque já desconta pelo empregador e isso basta",
        porque:
          "A isenção não é automática por ter emprego. Depende do limiar de 4 × IAS.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 163.º-A do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-98",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Mariana é independente e a sua atividade gera rendimento relevante mensal de 6.445,56 € (exatamente o teto). A contribuição mensal é exatamente:",
    opcoes: [
      {
        texto: "1.379,35 €",
        porque:
          "Correto. 6.445,56 × 21,4% ≈ 1.379,35 €. No limite do teto, a contribuição é o máximo possível.",
      },
      {
        texto: "1.400 €",
        porque:
          "O cálculo exato de 6.445,56 × 21,4% dá ≈ 1.379,35 €, não 1.400 €.",
      },
      {
        texto: "537,13 €",
        porque:
          "537,13 € é o IAS, não a contribuição máxima.",
      },
      {
        texto: "6.445,56 €",
        porque:
          "Este é o teto da base de incidência, não a contribuição.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 163.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-99",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "O Tiago é freelancer de consultoria (serviços) com faturação variável. No 1.º trimestre fatura 3.000 €, no 2.º trimestre 0 €, no 3.º trimestre 15.000 € e no 4.º trimestre 6.000 €. Qual a contribuição mensal em cada período subsequente?",
    opcoes: [
      {
        texto: "Sempre a mesma: a SS faz a média anual",
        porque:
          "A SS recalcula trimestralmente. Cada período gera uma contribuição diferente.",
      },
      {
        texto: "T1→149,80 €; T2→20 €; T3→749 €; T4→299,60 €",
        porque:
          "Correto. T1: 3.000×70%÷3=700→700×21,4%=149,80 €. T2: 0→20 € (mínimo). T3: 15.000×70%÷3=3.500→3.500×21,4%=749 €. T4: 6.000×70%÷3=1.400→1.400×21,4%=299,60 €.",
      },
      {
        texto: "T1→300 €; T2→0 €; T3→1.500 €; T4→600 €",
        porque:
          "Estes valores não correspondem à fórmula correta (coeficiente 70%, divisão por 3, taxa 21,4%).",
      },
      {
        texto: "T1→149,80 €; T2→0 €; T3→749 €; T4→299,60 €",
        porque:
          "No T2 a contribuição não é 0 €. Existe um mínimo de 20 € mesmo com rendimento zero.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 151.º-A, Art. 162.º e Art. 168.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ss-100",
    categoria: "seguranca_social",
    dificuldade: 3,
    pergunta:
      "A Lúcia é independente e acabou de atingir os 15 anos de carreira contributiva. Tem 66 anos e 4 meses (idade normal de reforma em 2026). Pode pedir pensão de velhice e continuar a trabalhar como independente?",
    opcoes: [
      {
        texto: "Sim, pode pedir pensão e continuar a atividade, mas deixa de contribuir",
        porque:
          "O pensionista que continua a trabalhar como independente mantém obrigação contributiva (salvo regras específicas de acumulação).",
      },
      {
        texto: "Não, tem de encerrar a atividade para receber pensão",
        porque:
          "É possível acumular a pensão com rendimentos de trabalho independente, dentro das regras de acumulação.",
      },
      {
        texto: "Sim, pode pedir pensão e continuar a trabalhar, mantendo a obrigação contributiva como independente",
        porque:
          "Correto. A legislação permite a acumulação da pensão de velhice com rendimentos de trabalho independente. O pensionista que continua a trabalhar mantém enquadramento contributivo.",
      },
      {
        texto: "Apenas se faturar menos de 1 × IAS por mês",
        porque:
          "Não existe este limiar. A acumulação é possível independentemente do rendimento.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 21.º do DL n.º 187/2007 · Art. 132.º do Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
];
