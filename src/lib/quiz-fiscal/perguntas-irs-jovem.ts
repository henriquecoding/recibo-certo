import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_IRS_JOVEM: QuizPergunta[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 1 — Limite de idade (jov-6 a jov-16)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-6",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Uma trabalhadora faz 36 anos a 2 de janeiro de 2026. Pode beneficiar do IRS Jovem relativamente aos rendimentos de 2025?",
    opcoes: [
      {
        texto: "Sim, porque no último dia de 2025 ainda tinha 35 anos",
        porque:
          "Correto. O requisito do Art. 12.º-B CIRS avalia a idade no último dia do ano fiscal. A 31 de dezembro de 2025 tinha 35 anos, pelo que cumpre o limite.",
      },
      {
        texto: "Não, porque completa 36 anos nesse ano fiscal",
        porque:
          "O que conta e a idade a 31 de dezembro do ano em causa, não o ano civil em que se completam anos. Em 2025, só faria 36 em janeiro de 2026.",
      },
      {
        texto: "Sim, mas apenas até ao mês em que faz 36 anos",
        porque:
          "O IRS Jovem não funciona por meses — aplica-se ao ano fiscal completo, desde que se tenha no máximo 35 anos a 31 de dezembro.",
      },
      {
        texto: "Depende de quando começou a trabalhar",
        porque:
          "A data de início de atividade é relevante para contar o ano do regime, mas a elegibilidade etaria depende apenas da idade a 31 de dezembro.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — idade máxima de 35 anos no último dia do ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-7",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um trabalhador faz 36 anos a 31 de dezembro de 2026. Pode beneficiar do IRS Jovem relativo ao ano de 2026?",
    opcoes: [
      {
        texto: "Sim, porque só completou 36 no próprio dia 31 de dezembro",
        porque:
          "Não. No último dia do ano fiscal (31 de dezembro de 2026) já tem 36 anos, excedendo o limite de 35 anos previsto no Art. 12.º-B CIRS.",
      },
      {
        texto: "Não, porque a 31 de dezembro de 2026 já tem 36 anos",
        porque:
          "Correto. O regime exige que o contribuinte tenha no máximo 35 anos no último dia do ano. Ao fazer 36 nesse dia, já ultrapassa o limite.",
      },
      {
        texto: "Sim, desde que tenha comecado a trabalhar antes dos 30 anos",
        porque:
          "Não existe requisito relativo a idade de início de atividade. O único criterio etario e ter até 35 anos a 31 de dezembro.",
      },
      {
        texto: "Depende do escalão de IRS aplicável",
        porque:
          "O escalão de IRS é irrelevante para a elegibilidade etaria do IRS Jovem. O criterio e exclusivamente ter até 35 anos a 31 de dezembro.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — idade avaliada no último dia do ano fiscal",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-8",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Um jovem de 22 anos começa a trabalhar em 2026. Pode candidatar-se ao IRS Jovem?",
    opcoes: [
      {
        texto: "Não, só a partir dos 25 anos",
        porque:
          "Não existe idade mínima para o IRS Jovem. Qualquer trabalhador com até 35 anos pode beneficiar.",
      },
      {
        texto: "Sim, sem restrição de idade mínima",
        porque:
          "Correto. O IRS Jovem não tem idade mínima — basta ter no máximo 35 anos no último dia do ano fiscal e obter rendimentos de categoria A ou B.",
      },
      {
        texto: "Sim, mas com percentagem reduzida por ter menos de 25 anos",
        porque:
          "A percentagem de isenção depende do ano de obtenção de rendimentos no regime (1.º a 10.º), não da idade do contribuinte.",
      },
      {
        texto: "Apenas se tiver licenciatura concluida",
        porque:
          "Desde o OE2025, o IRS Jovem não exige qualquer grau academico — o requisito de conclusão de ciclo de estudos foi eliminado.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — sem idade mínima",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-9",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Uma trabalhadora tem 34 anos e está no 9.º ano do regime de IRS Jovem. No ano seguinte fara 35. Quantos anos de isenção lhe restam?",
    opcoes: [
      {
        texto: "Nenhum, porque já ultrapassou os 10 anos",
        porque:
          "Ainda não ultrapassou — está no 9.º ano, pelo que lhe resta pelo menos mais 1 ano (o 10.º).",
      },
      {
        texto: "1 ano (o 10.º), se ainda tiver no máximo 35 anos a 31 de dezembro",
        porque:
          "Correto. Pode beneficiar do 10.º e último ano de isenção (25%), desde que a 31 de dezembro desse ano tenha no máximo 35 anos.",
      },
      {
        texto: "2 anos, porque tem direito a uma extensão",
        porque:
          "O regime de IRS Jovem não prevê qualquer extensão alem dos 10 anos de duração total.",
      },
      {
        texto: "0 anos, porque com 34 anos já não tem direito",
        porque:
          "O limite é 35 anos, não 34. Com 34 anos ainda cumpre o requisito etario.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — duração máxima de 10 anos e limite de 35 anos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-10",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um contribuinte começou a obter rendimentos aos 24 anos. Aos quantos anos de idade, no máximo, podera estar no último ano do regime de IRS Jovem?",
    opcoes: [
      {
        texto: "34 anos (10.º ano de rendimentos = 24 + 10)",
        porque:
          "O 10.º ano de rendimentos corresponderia a 33 anos (24 + 9, pois o 1.º ano conta como ano 24). Mas o limite é sempre 35 anos.",
      },
      {
        texto: "35 anos, independentemente de quando começou",
        porque:
          "Correto. Embora o regime dure até 10 anos, o limite absoluto de idade e 35 anos. Se começou aos 24, pode usufruir dos 10 anos sem atingir os 35 no 10.º ano (teria 33).",
      },
      {
        texto: "33 anos (24 + 9 anos adicionais)",
        porque:
          "33 anos seria o 10.º ano se começou aos 24, mas a pergunta e sobre o máximo possível — é sempre o limite legal de 35 anos.",
      },
      {
        texto: "Não há limite de idade após o início do regime",
        porque:
          "Ha sim. Mesmo após o início do regime, se o contribuinte ultrapassar os 35 anos perde o direito ao IRS Jovem, mesmo que não tenha esgotado os 10 anos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — limite absoluto de 35 anos prevalece sobre duração",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-11",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um trabalhador começou a obter rendimentos aos 32 anos. Quantos anos de isenção do IRS Jovem podera usufruir, no máximo?",
    opcoes: [
      {
        texto: "10 anos",
        porque:
          "Não é possível. Comecando aos 32, ao fim de 4 anos tera 35 — no 5.º ano já teria 36 e perderia o direito. Maximo: 4 anos.",
      },
      {
        texto: "4 anos (dos 32 aos 35 inclusive)",
        porque:
          "Correto. Ano 1 = 32 anos, ano 2 = 33, ano 3 = 34, ano 4 = 35. No 5.º ano já teria 36, excedendo o limite. Só usufrui de 4 dos 10 anos possíveis.",
      },
      {
        texto: "3 anos, porque o limite é 35 anos exclusive",
        porque:
          "O limite é 35 anos inclusive (até 35 no último dia do ano). Com 35 anos ainda está dentro do limite.",
      },
      {
        texto: "5 anos, com derrogação especial",
        porque:
          "Não existe qualquer derrogação para estender o regime alem dos 35 anos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — interacao entre idade e duração máxima",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-12",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O limite de idade do IRS Jovem e avaliado em que momento?",
    opcoes: [
      {
        texto: "Na data de abertura de atividade",
        porque:
          "A data de abertura de atividade e irrelevante para a avaliação etaria. O criterio e a idade no último dia do ano fiscal.",
      },
      {
        texto: "No último dia do ano fiscal (31 de dezembro)",
        porque:
          "Correto. O Art. 12.º-B CIRS estabelece que o contribuinte deve ter no máximo 35 anos no último dia do ano a que respeitam os rendimentos.",
      },
      {
        texto: "No primeiro dia do ano fiscal (1 de janeiro)",
        porque:
          "Não — a avaliação e a 31 de dezembro, não a 1 de janeiro.",
      },
      {
        texto: "Na data de entrega da declaração de IRS",
        porque:
          "A data de entrega da declaração é irrelevante. O que conta e a idade a 31 de dezembro do ano dos rendimentos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — idade no último dia do ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-13",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um trabalhador começa a obter rendimentos aos 29 anos. Podera beneficiar do IRS Jovem durante os 10 anos completos?",
    opcoes: [
      {
        texto: "Sim, porque 29 + 10 = 39, mas o limite de idade não impede",
        porque:
          "Impede sim. Aos 35 anos (7.º ano de rendimentos) ainda estaria dentro do limite, mas no 8.º ano já teria 36, perdendo o direito.",
      },
      {
        texto: "Não, porque ao atingir 36 anos perde o direito — máximo de 7 anos",
        porque:
          "Correto. Com início aos 29: ano 1 = 29, ..., ano 7 = 35. No 8.º ano teria 36, excedendo o limite. Usufruiria de apenas 7 dos 10 anos.",
      },
      {
        texto: "Sim, desde que não tenha interrompido a atividade",
        porque:
          "A continuidade da atividade não altera o limite etario de 35 anos. O regime cessa quando se excede essa idade.",
      },
      {
        texto: "Depende do rendimento anual obtido",
        porque:
          "O rendimento anual afeta o montante isento (via teto de 55 x IAS), mas não a elegibilidade etaria.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — limite de 35 anos trunca os 10 anos de regime",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-14",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Uma jovem de 27 anos, sem qualquer grau academico concluido, pode beneficiar do IRS Jovem em 2026?",
    opcoes: [
      {
        texto: "Não, é necessário ter pelo menos licenciatura",
        porque:
          "Esse requisito foi eliminado pelo OE2025. Desde entao, não é necessário qualquer grau academico para aceder ao IRS Jovem.",
      },
      {
        texto: "Não, precisa de pelo menos o ensino secundario",
        porque:
          "Desde o OE2025, não existe qualquer requisito de habilitações academicas para o IRS Jovem.",
      },
      {
        texto: "Sim, desde o OE2025 não é exigido qualquer grau academico",
        porque:
          "Correto. O Orçamento do Estado para 2025 eliminou o requisito de conclusão de ciclo de estudos, abrindo o regime a todos os jovens até 35 anos.",
      },
      {
        texto: "Sim, mas com isenção reduzida a metade",
        porque:
          "As percentagens de isenção são iguais para todos os beneficiários, independentemente de habilitações academicas.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS (na redação dada pelo OE2025) — sem exigência de grau academico",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-15",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Antes do OE2025, que requisito adicional existia para aceder ao IRS Jovem que foi eliminado?",
    opcoes: [
      {
        texto: "Residencia fiscal em Portugal há mais de 5 anos",
        porque:
          "A residência fiscal é um requisito geral de IRS, não um requisito específico do IRS Jovem que tenha sido removido.",
      },
      {
        texto: "Rendimento inferior a 30.000 EUR anuais",
        porque:
          "Nunca existiu um teto de rendimento como condição de elegibilidade — o teto de 55 x IAS limita o montante isento, não a elegibilidade.",
      },
      {
        texto: "Conclusao de um ciclo de estudos (licenciatura, mestrado, etc.)",
        porque:
          "Correto. Antes do OE2025, o IRS Jovem exigia a conclusão de um ciclo de estudos. Está condição foi eliminada, bastando agora ter até 35 anos.",
      },
      {
        texto: "Inscricao na Ordem profissional respetiva",
        porque:
          "A inscrição numa Ordem nunca foi requisito do IRS Jovem.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — alteração introduzida pelo OE2025",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-16",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um trabalhador começou a obter rendimentos em Portugal aos 25 anos, emigrou aos 28 e regressou aos 33. Pode retomar o IRS Jovem?",
    opcoes: [
      {
        texto: "Não, o regime cessa definitivamente com a emigração",
        porque:
          "O regime não cessa definitivamente. Os anos em que não é residente fiscal em Portugal não contam como anos de isenção, mas o regime pode ser retomado.",
      },
      {
        texto: "Sim, retomando no ano seguinte ao do regresso, continuando a contagem dos 10 anos onde parou",
        porque:
          "Correto. Os anos de não residência não contam para os 10 anos de isenção. Ao regressar, retoma a contagem (esteve 3 anos no regime antes de emigrar, pelo que retomaria no 4.º ano), desde que não exceda os 35 anos.",
      },
      {
        texto: "Sim, mas começa o regime de novo do 1.º ano",
        porque:
          "A contagem não reinicia — retoma-se onde ficou antes da emigração.",
      },
      {
        texto: "Sim, mas só se tiver estado no estrangeiro menos de 3 anos",
        porque:
          "Não existe limite temporal de ausencia. O relevante e a idade (até 35 anos) é o total de anos de isenção já utilizados (até 10).",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — anos de não residência não contam para a duração do regime",
    fonte: fonte("art12bCirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 2 — Percentagens de isenção por ano (jov-17 a jov-30)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-17",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Qual é a percentagem de isenção no 1.º ano do regime de IRS Jovem?",
    opcoes: [
      {
        texto: "100%",
        porque:
          "Correto. No 1.º ano de obtenção de rendimentos, a isenção é total (100%), dentro do teto anual de 55 x IAS.",
      },
      {
        texto: "75%",
        porque:
          "75% corresponde a isenção do 2.º ao 4.º ano, não ao 1.º ano.",
      },
      {
        texto: "50%",
        porque:
          "50% corresponde a isenção do 5.º ao 7.º ano, não ao 1.º ano.",
      },
      {
        texto: "25%",
        porque:
          "25% corresponde a isenção do 8.º ao 10.º ano, não ao 1.º ano.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção de 100% no 1.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-18",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "No 3.º ano de obtenção de rendimentos, qual a percentagem de isenção do IRS Jovem?",
    opcoes: [
      {
        texto: "100%",
        porque:
          "100% aplica-se apenas ao 1.º ano do regime.",
      },
      {
        texto: "50%",
        porque:
          "50% aplica-se aos anos 5 a 7, não ao 3.º ano.",
      },
      {
        texto: "25%",
        porque:
          "25% aplica-se aos anos 8 a 10, não ao 3.º ano.",
      },
      {
        texto: "75%",
        porque:
          "Correto. Do 2.º ao 4.º ano de obtenção de rendimentos, a isenção é de 75%.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 12.º-B CIRS — isenção de 75% do 2.º ao 4.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-19",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Qual a isenção aplicável no 6.º ano do regime de IRS Jovem?",
    opcoes: [
      {
        texto: "75%",
        porque:
          "75% aplica-se aos anos 2 a 4, não ao 6.º ano.",
      },
      {
        texto: "50%",
        porque:
          "Correto. Do 5.º ao 7.º ano de obtenção de rendimentos, a isenção é de 50%.",
      },
      {
        texto: "25%",
        porque:
          "25% aplica-se aos anos 8 a 10, não ao 6.º ano.",
      },
      {
        texto: "100%",
        porque:
          "100% aplica-se apenas ao 1.º ano do regime.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção de 50% do 5.º ao 7.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-20",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "No 9.º ano do regime de IRS Jovem, qual a percentagem de isenção?",
    opcoes: [
      {
        texto: "50%",
        porque:
          "50% aplica-se aos anos 5 a 7, não ao 9.º ano.",
      },
      {
        texto: "0% — já não há isenção",
        porque:
          "Ainda há isenção até ao 10.º ano. O 9.º ano tem isenção de 25%.",
      },
      {
        texto: "25%",
        porque:
          "Correto. Do 8.º ao 10.º ano de obtenção de rendimentos, a isenção é de 25%.",
      },
      {
        texto: "10%",
        porque:
          "Não existe uma fase de 10% — o mínimo é 25%, aplicável do 8.º ao 10.º ano.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — isenção de 25% do 8.º ao 10.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-21",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Quantas fases distintas de isenção existem ao longo dos 10 anos do regime de IRS Jovem?",
    opcoes: [
      {
        texto: "2 fases (alta e baixa)",
        porque:
          "Existem mais do que 2 fases — o regime tem uma estrutura decrescente em 4 patamares.",
      },
      {
        texto: "4 fases: 100%, 75%, 50% e 25%",
        porque:
          "Correto. O regime tem 4 patamares: 100% (1.º ano), 75% (2.º ao 4.º), 50% (5.º ao 7.º) e 25% (8.º ao 10.º).",
      },
      {
        texto: "5 fases, decrescendo 20 pontos percentuais por fase",
        porque:
          "O regime não decresce de forma uniforme — as fases são 100%, 75%, 50% e 25% (apenas 4 fases).",
      },
      {
        texto: "10 fases, uma por cada ano",
        porque:
          "Não há uma fase por ano. Varios anos consecutivos partilham a mesma percentagem de isenção.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — estrutura de 4 patamares decrescentes",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-22",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Qual é a isenção no 4.º ano do regime de IRS Jovem? É no 5.º?",
    opcoes: [
      {
        texto: "75% no 4.º ano e 75% no 5.º ano",
        porque:
          "No 5.º ano a isenção desce para 50%, não se mantém em 75%.",
      },
      {
        texto: "75% no 4.º ano e 50% no 5.º ano",
        porque:
          "Correto. O 4.º ano e o último da fase de 75% e o 5.º ano e o primeiro da fase de 50%.",
      },
      {
        texto: "50% no 4.º ano e 50% no 5.º ano",
        porque:
          "No 4.º ano a isenção ainda é de 75%, não de 50%.",
      },
      {
        texto: "100% no 4.º ano e 75% no 5.º ano",
        porque:
          "100% aplica-se apenas ao 1.º ano. No 4.º ano a isenção é de 75%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — transição entre fases de isenção",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-23",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "A partir do 11.º ano de obtenção de rendimentos, qual a isenção do IRS Jovem?",
    opcoes: [
      {
        texto: "10%",
        porque:
          "Não existe fase de 10%. Após o 10.º ano, o regime termina e não há qualquer isenção.",
      },
      {
        texto: "25% — mantém-se a última fase",
        porque:
          "O regime não se prolonga para alem do 10.º ano. Após este, cessa automaticamente.",
      },
      {
        texto: "0% — o regime termina após 10 anos",
        porque:
          "Correto. O IRS Jovem tem duração máxima de 10 anos. A partir do 11.º ano não há qualquer isenção ao abrigo deste regime.",
      },
      {
        texto: "Depende de renovação junto da AT",
        porque:
          "O regime não é renovável. Terminados os 10 anos, cessa sem possibilidade de prolongamento.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — duração máxima de 10 anos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-24",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "A isenção do IRS Jovem é progressivamente decrescente. Qual afirmação descreve corretamente está progressividade?",
    opcoes: [
      {
        texto: "A isenção diminui 10 pontos percentuais por ano",
        porque:
          "A isenção não diminui anualmente de forma uniforme — mantém-se igual durante períodos de 3 anos consecutivos (exceto o 1.º ano).",
      },
      {
        texto: "A isenção diminui 25 pontos percentuais a cada fase de 3 anos, após o 1.º ano a 100%",
        porque:
          "Correto. Após o 1.º ano (100%), a isenção passa a 75% por 3 anos, depois 50% por 3 anos e finalmente 25% por 3 anos — uma redução de 25 p.p. por fase.",
      },
      {
        texto: "A isenção diminui 50% a cada mudança de fase",
        porque:
          "De 100% para 75% não é uma redução de 50%, mas sim de 25 pontos percentuais.",
      },
      {
        texto: "A isenção é aleatória, definida anualmente pelo Governo",
        porque:
          "As percentagens de isenção estão fixadas na lei (Art. 12.º-B CIRS) é não variam por decisão governamental anual.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — estrutura decrescente por fases",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-25",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um trabalhador está no 7.º ano do IRS Jovem. No próximo ano, a sua isenção vai:",
    opcoes: [
      {
        texto: "Manter-se em 50%",
        porque:
          "No 7.º ano a isenção é de 50%, mas no 8.º ano desce para 25%.",
      },
      {
        texto: "Descer de 50% para 25%",
        porque:
          "Correto. O 7.º ano e o último da fase de 50%. No 8.º ano, inicia-se a última fase com isenção de 25%.",
      },
      {
        texto: "Descer de 50% para 0%",
        porque:
          "A isenção não passa diretamente para 0%. Ha ainda a fase de 25% (8.º ao 10.º ano) antes de o regime terminar.",
      },
      {
        texto: "Subir para 75% por renovação",
        porque:
          "O regime é estritamente decrescente. Não há renovação nem subida das percentagens.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — transição da 3.ª para a 4.ª fase",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-26",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Qual é a isenção no 2.º ano do regime de IRS Jovem?",
    opcoes: [
      {
        texto: "100%",
        porque:
          "100% aplica-se apenas ao 1.º ano. No 2.º ano a isenção já é de 75%.",
      },
      {
        texto: "75%",
        porque:
          "Correto. Do 2.º ao 4.º ano, a isenção do IRS Jovem é de 75%.",
      },
      {
        texto: "50%",
        porque:
          "50% corresponde a isenção do 5.º ao 7.º ano, não ao 2.º ano.",
      },
      {
        texto: "90%",
        porque:
          "Não existe nenhuma fase com isenção de 90% no regime de IRS Jovem.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção de 75% no 2.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-27",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Ao longo dos 10 anos completos do regime de IRS Jovem, quantos anos no total tem isenção de 75%?",
    opcoes: [
      {
        texto: "2 anos",
        porque:
          "A fase de 75% abrange 3 anos (do 2.º ao 4.º), não apenas 2.",
      },
      {
        texto: "4 anos",
        porque:
          "A fase de 75% abrange do 2.º ao 4.º ano, ou seja 3 anos, não 4.",
      },
      {
        texto: "3 anos (do 2.º ao 4.º ano)",
        porque:
          "Correto. A isenção de 75% aplica-se durante 3 anos consecutivos: o 2.º, o 3.º e o 4.º ano de obtenção de rendimentos.",
      },
      {
        texto: "1 ano",
        porque:
          "Apenas o 1.º ano (100%) dura 1 ano. A fase de 75% dura 3 anos.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — fase de 75% dura 3 anos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-28",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Qual é a ordem correta das percentagens de isenção do IRS Jovem ao longo dos 10 anos?",
    opcoes: [
      {
        texto: "25%, 50%, 75%, 100%",
        porque:
          "Está ordem está invertida — o regime é decrescente, não crescente.",
      },
      {
        texto: "100%, 50%, 25%, 0%",
        porque:
          "Falta a fase de 75% e a isenção nunca chega a 0% durante os 10 anos do regime.",
      },
      {
        texto: "100%, 75%, 50%, 25%",
        porque:
          "Correto. O regime começa com isenção total (100% no 1.º ano) e decresce progressivamente: 75%, 50% e 25%.",
      },
      {
        texto: "100%, 80%, 60%, 40%, 20%",
        porque:
          "O regime tem 4 fases com redução de 25 p.p. cada, não 5 fases com redução de 20 p.p.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — escala decrescente de isenção",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-29",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Considerando os 10 anos completos do regime, qual a media ponderada da percentagem de isenção?",
    opcoes: [
      {
        texto: "50%",
        porque:
          "A media ponderada e: (1x100 + 3x75 + 3x50 + 3x25) / 10 = (100 + 225 + 150 + 75) / 10 = 55%, não 50%.",
      },
      {
        texto: "55%",
        porque:
          "Correto. (1 x 100% + 3 x 75% + 3 x 50% + 3 x 25%) / 10 = (100 + 225 + 150 + 75) / 10 = 550 / 10 = 55%.",
      },
      {
        texto: "62,5%",
        porque:
          "62,5% seria a media simples de 100%, 75%, 50% e 25%, mas não pondera o número de anos em cada fase.",
      },
      {
        texto: "47,5%",
        porque:
          "Este valor não corresponde a nenhum cálculo correto da media de isenção.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — cálculo da media ponderada de isenção",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-30",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "No 10.º e último ano do regime de IRS Jovem, qual a percentagem de isenção?",
    opcoes: [
      {
        texto: "0% — no último ano já não há isenção",
        porque:
          "Ainda há isenção no 10.º ano. O regime só termina após esse ano.",
      },
      {
        texto: "10%",
        porque:
          "Não existe uma fase de 10%. O mínimo é 25%, aplicável do 8.º ao 10.º ano.",
      },
      {
        texto: "50%",
        porque:
          "50% aplica-se aos anos 5 a 7, não ao 10.º ano.",
      },
      {
        texto: "25%",
        porque:
          "Correto. Do 8.º ao 10.º ano (inclusive), a isenção é de 25%. É a última fase antes de o regime cessar.",
      },
    ],
    correta: 3,
    legalBasis: "Art. 12.º-B CIRS — isenção de 25% no 10.º ano",
    fonte: fonte("art12bCirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 3 — Teto / IAS / cálculos (jov-31 a jov-48)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-31",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Qual é o valor do IAS (Indexante dos Apoios Sociais) em 2026?",
    opcoes: [
      {
        texto: "509,26 EUR",
        porque:
          "509,26 EUR era o valor do IAS em anos anteriores. Em 2026, o IAS e 537,13 EUR.",
      },
      {
        texto: "537,13 EUR",
        porque:
          "Correto. O IAS em 2026 é de 537,13 EUR, valor relevante para calcular o teto do IRS Jovem (55 x IAS).",
      },
      {
        texto: "580,00 EUR",
        porque:
          "Este valor não corresponde ao IAS de 2026.",
      },
      {
        texto: "480,43 EUR",
        porque:
          "480,43 EUR corresponde a um valor do IAS de anos passados, não ao de 2026.",
      },
    ],
    correta: 1,
    legalBasis: "Portaria do IAS 2026 — 537,13 EUR",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-32",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Qual é o teto anual de rendimento isento do IRS Jovem em 2026 (55 x IAS)?",
    opcoes: [
      {
        texto: "25.000,00 EUR",
        porque:
          "Este valor não corresponde ao cálculo correto. 55 x 537,13 = 29.542,15 EUR.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "Correto. 55 x 537,13 EUR (IAS 2026) = 29.542,15 EUR. Este é o limite máximo de rendimento que pode beneficiar de isenção num ano.",
      },
      {
        texto: "32.000,00 EUR",
        porque:
          "Este valor excede o cálculo correto de 55 x 537,13 = 29.542,15 EUR.",
      },
      {
        texto: "27.509,15 EUR",
        porque:
          "Este valor não resulta do cálculo correto. 55 x 537,13 = 29.542,15 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — teto anual = 55 x IAS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-33",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Se um jovem no 1.º ano do IRS Jovem ganha 20.000 EUR, quanto rendimento fica isento?",
    opcoes: [
      {
        texto: "20.000 EUR (totalidade, pois está abaixo do teto)",
        porque:
          "Correto. No 1.º ano a isenção é de 100%. Como 20.000 EUR está abaixo do teto de 29.542,15 EUR, a totalidade do rendimento fica isenta.",
      },
      {
        texto: "15.000 EUR (75% de 20.000 EUR)",
        porque:
          "75% aplica-se ao 2.º-4.º ano. No 1.º ano a isenção é de 100%.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "O montante isento não pode exceder o rendimento efetivo. Com 20.000 EUR de rendimento, o isento e 20.000 EUR (100%).",
      },
      {
        texto: "10.000 EUR (50%)",
        porque:
          "50% aplica-se ao 5.º-7.º ano. No 1.º ano a isenção é total (100%).",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — 100% de isenção no 1.º ano, limitado ao teto",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-34",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 1.º ano do IRS Jovem ganha 40.000 EUR em 2026. Quanto rendimento fica isento?",
    opcoes: [
      {
        texto: "40.000 EUR (100% do rendimento)",
        porque:
          "Embora a isenção no 1.º ano seja de 100%, o teto de 55 x IAS limita o isento a 29.542,15 EUR.",
      },
      {
        texto: "29.542,15 EUR (o teto de 55 x IAS)",
        porque:
          "Correto. No 1.º ano a isenção é de 100%, mas limitada ao teto de 29.542,15 EUR. Os restantes 10.457,85 EUR ficam sujeitos a IRS.",
      },
      {
        texto: "20.000 EUR",
        porque:
          "Este valor não tem base no cálculo correto. O teto é 29.542,15 EUR.",
      },
      {
        texto: "30.000 EUR",
        porque:
          "O teto exato e 29.542,15 EUR (55 x 537,13), não 30.000 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — teto de 55 x IAS = 29.542,15 EUR em 2026",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-35",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 3.º ano do IRS Jovem ganha 30.000 EUR em 2026. Qual o montante isento?",
    opcoes: [
      {
        texto: "22.500 EUR (75% de 30.000 EUR)",
        porque:
          "Embora 75% de 30.000 EUR seja 22.500 EUR, é necessário verificar se excede o teto. 75% de 30.000 = 22.500, que é inferior a 29.542,15 EUR, logo está correto.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "O teto só é atingido se 75% do rendimento exceder 29.542,15 EUR. Neste caso, 75% de 30.000 = 22.500, que está abaixo do teto.",
      },
      {
        texto: "15.000 EUR (50%)",
        porque:
          "50% aplica-se ao 5.º-7.º ano. No 3.º ano a isenção é de 75%.",
      },
      {
        texto: "30.000 EUR (totalidade)",
        porque:
          "A isenção total (100%) só se aplica no 1.º ano. No 3.º ano, é de 75%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção de 75% no 3.º ano, limitada ao teto",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-36",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 2.º ano do IRS Jovem ganha 50.000 EUR em 2026. Qual o montante isento e qual o sujeito a IRS?",
    opcoes: [
      {
        texto: "Isento: 37.500 EUR; sujeito: 12.500 EUR",
        porque:
          "75% de 50.000 = 37.500, mas o teto de 55 x IAS e 29.542,15 EUR. O isento não pode exceder o teto.",
      },
      {
        texto: "Isento: 29.542,15 EUR; sujeito: 20.457,85 EUR",
        porque:
          "Correto. 75% de 50.000 = 37.500, que excede o teto de 29.542,15 EUR. Logo, o isento e limitado ao teto: 29.542,15 EUR, e o sujeito a IRS é 50.000 - 29.542,15 = 20.457,85 EUR.",
      },
      {
        texto: "Isento: 25.000 EUR; sujeito: 25.000 EUR",
        porque:
          "Este cálculo não reflete a formula do IRS Jovem (75% do rendimento, limitado ao teto de 55 x IAS).",
      },
      {
        texto: "Isento: 50.000 EUR; sujeito: 0 EUR",
        porque:
          "A isenção total (100%) só se aplica no 1.º ano, e mesmo assim limitada ao teto. No 2.º ano a isenção é de 75%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção de 75% limitada pelo teto de 55 x IAS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-37",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O teto de 55 x IAS do IRS Jovem é aplicado por mês ou por ano?",
    opcoes: [
      {
        texto: "Por mês",
        porque:
          "O teto é anual, não mensal. Aplica-se ao rendimento total do ano fiscal.",
      },
      {
        texto: "Por ano",
        porque:
          "Correto. O teto de 55 x IAS (29.542,15 EUR em 2026) é um limite anual, aplicado ao rendimento total do ano fiscal.",
      },
      {
        texto: "Por trimestre",
        porque:
          "O teto é anual, não trimestral.",
      },
      {
        texto: "Por recibo emitido",
        porque:
          "O teto não se aplica por recibo individual, mas ao rendimento anual total.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — teto anual de 55 x IAS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-38",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 5.º ano do IRS Jovem ganha 60.000 EUR em 2026. Quanto rendimento fica isento?",
    opcoes: [
      {
        texto: "30.000 EUR (50% de 60.000 EUR)",
        porque:
          "50% de 60.000 EUR seria 30.000 EUR, mas este valor excede o teto de 29.542,15 EUR. O isento e limitado ao teto.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "Correto. 50% de 60.000 = 30.000, que excede o teto de 29.542,15 EUR. O montante isento e limitado ao teto: 29.542,15 EUR.",
      },
      {
        texto: "15.000 EUR (25% de 60.000 EUR)",
        porque:
          "25% aplica-se ao 8.º-10.º ano, não ao 5.º. No 5.º ano a isenção é de 50%.",
      },
      {
        texto: "60.000 EUR",
        porque:
          "A isenção total só se aplica no 1.º ano, e mesmo assim limitada ao teto.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção de 50% limitada pelo teto de 55 x IAS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-39",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O que acontece ao rendimento que excede o teto de 55 x IAS num ano do IRS Jovem?",
    opcoes: [
      {
        texto: "É tributado normalmente em sede de IRS, sem qualquer isenção",
        porque:
          "Correto. O rendimento acima do teto de 55 x IAS não beneficia de isenção é é tributado pelas regras gerais de IRS.",
      },
      {
        texto: "É tributado a uma taxa fixa especial de 15%",
        porque:
          "Não existe taxa fixa especial. O excedente segue as regras gerais de IRS (escalões progressivos).",
      },
      {
        texto: "É diferido para o ano seguinte",
        porque:
          "O rendimento não pode ser diferido. O excedente é tributado no ano em que é obtido.",
      },
      {
        texto: "É isento na mesma, só que a uma taxa inferior",
        porque:
          "O rendimento acima do teto não é isento de forma alguma.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — rendimento acima do teto sujeito a tributação normal",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-40",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 8.º ano do IRS Jovem ganha 28.000 EUR em 2026. Quanto rendimento fica isento?",
    opcoes: [
      {
        texto: "7.000 EUR (25% de 28.000 EUR)",
        porque:
          "Correto. No 8.º ano a isenção é de 25%. 25% de 28.000 = 7.000 EUR, que está abaixo do teto de 29.542,15 EUR.",
      },
      {
        texto: "14.000 EUR (50% de 28.000 EUR)",
        porque:
          "50% aplica-se ao 5.º-7.º ano. No 8.º ano a isenção é de 25%.",
      },
      {
        texto: "28.000 EUR",
        porque:
          "A isenção total (100%) só se aplica ao 1.º ano.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "O teto define o máximo isento, mas 25% de 28.000 = 7.000 EUR, muito abaixo do teto.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção de 25% no 8.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-41",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Se o IAS subir para 560 EUR em 2027, qual seria o novo teto anual do IRS Jovem?",
    opcoes: [
      {
        texto: "30.800 EUR (55 x 560 EUR)",
        porque:
          "Correto. O teto do IRS Jovem é calculado como 55 x IAS. Se o IAS fosse 560 EUR, o teto seria 55 x 560 = 30.800 EUR.",
      },
      {
        texto: "29.542,15 EUR (o mesmo de 2026)",
        porque:
          "O teto acompanha o IAS. Se o IAS subir, o teto sobe proporcionalmente.",
      },
      {
        texto: "28.000 EUR",
        porque:
          "Este valor não corresponde a nenhum cálculo com IAS de 560 EUR.",
      },
      {
        texto: "33.600 EUR (60 x 560 EUR)",
        porque:
          "O multiplicador e 55, não 60. 55 x 560 = 30.800 EUR.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — teto = 55 x IAS (atualizado anualmente)",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-42",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem no 1.º ano do IRS Jovem ganha exatamente 29.542,15 EUR em 2026. Quanto rendimento fica sujeito a IRS?",
    opcoes: [
      {
        texto: "0 EUR — a totalidade está isenta",
        porque:
          "Correto. No 1.º ano (100% de isenção) e com rendimento igual ao teto de 55 x IAS (29.542,15 EUR), a totalidade fica isenta.",
      },
      {
        texto: "7.385,54 EUR (25% do rendimento)",
        porque:
          "No 1.º ano a isenção é de 100%, não de 75%. A totalidade está isenta.",
      },
      {
        texto: "14.771,08 EUR (50% do rendimento)",
        porque:
          "No 1.º ano a isenção é de 100%. Não há rendimento sujeito a IRS.",
      },
      {
        texto: "29.542,15 EUR — o teto não isenta, apenas limita",
        porque:
          "O teto limita o montante isento, mas no 1.º ano (100%) e com rendimento igual ao teto, a totalidade fica isenta.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — 100% de isenção limitada ao teto",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-43",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Uma jovem no 4.º ano do IRS Jovem ganha 45.000 EUR. Quanto rendimento fica sujeito a IRS?",
    opcoes: [
      {
        texto: "11.250 EUR (45.000 - 75% de 45.000)",
        porque:
          "75% de 45.000 = 33.750, mas o teto é 29.542,15 EUR. O isento e limitado ao teto, logo o sujeito não é 11.250.",
      },
      {
        texto: "15.457,85 EUR (45.000 - 29.542,15)",
        porque:
          "Correto. 75% de 45.000 = 33.750, que excede o teto de 29.542,15 EUR. Logo, isento = 29.542,15 EUR é sujeito = 45.000 - 29.542,15 = 15.457,85 EUR.",
      },
      {
        texto: "22.500 EUR (50% de 45.000)",
        porque:
          "Este cálculo usaria uma isenção de 50%, que se aplica ao 5.º-7.º ano, não ao 4.º.",
      },
      {
        texto: "45.000 EUR (não há isenção acima de 40.000 EUR)",
        porque:
          "Não existe está regra. A isenção aplica-se a qualquer nível de rendimento, limitada pelo teto de 55 x IAS.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção de 75% no 4.º ano, limitada ao teto de 55 x IAS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-44",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Se o rendimento de um jovem no 3.º ano do IRS Jovem for inferior a 55 x IAS, o que acontece?",
    opcoes: [
      {
        texto: "A isenção aplica-se normalmente — 75% do rendimento fica isento",
        porque:
          "Correto. Quando o rendimento é inferior ao teto, a isenção calcula-se normalmente: 75% do rendimento no 3.º ano.",
      },
      {
        texto: "A isenção não se aplica por o rendimento ser muito baixo",
        porque:
          "Não existe rendimento mínimo para beneficiar do IRS Jovem. A isenção aplica-se independentemente do valor.",
      },
      {
        texto: "A isenção é ajustada proporcionalmente ao teto",
        porque:
          "Não há ajuste proporcional. A isenção é a percentagem da fase (75%) sobre o rendimento efetivo.",
      },
      {
        texto: "O teto não utilizado transita para o ano seguinte",
        porque:
          "Não há transição de teto entre anos. O teto é anual é independente.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção sobre o rendimento efetivo",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-45",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 6.º ano do IRS Jovem ganha 70.000 EUR em 2026. Quanto IRS \"poupa\" face a não ter o regime, sabendo que o isento e limitado ao teto?",
    opcoes: [
      {
        texto: "Poupa o IRS correspondente a 29.542,15 EUR de rendimento coletável",
        porque:
          "Correto. 50% de 70.000 = 35.000, que excede o teto. O isento e limitado a 29.542,15 EUR. A poupança e o IRS que incidiria sobre esses 29.542,15 EUR (dependendo do escalão).",
      },
      {
        texto: "Poupa o IRS correspondente a 35.000 EUR (50% de 70.000)",
        porque:
          "50% do rendimento daria 35.000 EUR, mas o teto limita o isento a 29.542,15 EUR.",
      },
      {
        texto: "Poupa exatamente 29.542,15 EUR em imposto",
        porque:
          "29.542,15 EUR é o rendimento isento, não o imposto poupado. O imposto poupado depende da taxa marginal aplicável.",
      },
      {
        texto: "Não poupa nada — acima de 55 x IAS não há benefício",
        porque:
          "O benefício existe até ao teto. Mesmo com rendimento acima do teto, os primeiros 29.542,15 EUR ficam isentos.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — efeito do teto no benefício fiscal",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-46",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Se um jovem no 10.º ano do IRS Jovem ganha 100.000 EUR em 2026, qual o montante máximo de rendimento isento?",
    opcoes: [
      {
        texto: "25.000 EUR (25% de 100.000)",
        porque:
          "25% de 100.000 = 25.000, que está abaixo do teto de 29.542,15 EUR. Logo, o isento e 25.000 EUR.",
      },
      {
        texto: "29.542,15 EUR (teto de 55 x IAS)",
        porque:
          "O teto só se aplica se a percentagem de isenção exceder o teto. 25% de 100.000 = 25.000 < 29.542,15, logo o isento e 25.000 EUR, não o teto.",
      },
      {
        texto: "50.000 EUR (50% de 100.000)",
        porque:
          "50% aplica-se ao 5.º-7.º ano, não ao 10.º. No 10.º ano a isenção é de 25%.",
      },
      {
        texto: "100.000 EUR",
        porque:
          "A isenção total só se aplica no 1.º ano, e limitada ao teto.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção de 25% no 10.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-47",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 2.º ano do IRS Jovem ganha 38.000 EUR. Quanto rendimento fica isento e quanto fica sujeito a IRS?",
    opcoes: [
      {
        texto: "Isento: 28.500 EUR (75%); sujeito: 9.500 EUR",
        porque:
          "Correto. 75% de 38.000 = 28.500 EUR, que é inferior ao teto de 29.542,15 EUR. Logo, isento = 28.500 EUR é sujeito = 9.500 EUR.",
      },
      {
        texto: "Isento: 29.542,15 EUR; sujeito: 8.457,85 EUR",
        porque:
          "O teto só se aplica se a isenção calculada o exceder. 75% de 38.000 = 28.500 < 29.542,15, logo o isento e 28.500 EUR.",
      },
      {
        texto: "Isento: 19.000 EUR (50%); sujeito: 19.000 EUR",
        porque:
          "50% aplica-se ao 5.º-7.º ano, não ao 2.º. No 2.º ano a isenção é de 75%.",
      },
      {
        texto: "Isento: 38.000 EUR; sujeito: 0 EUR",
        porque:
          "A isenção total só se aplica no 1.º ano. No 2.º ano é de 75%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção de 75% abaixo do teto",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-48",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O multiplicador do IAS utilizado para calcular o teto do IRS Jovem e:",
    opcoes: [
      {
        texto: "40",
        porque:
          "40 x IAS não é o multiplicador correto para o IRS Jovem. O multiplicador e 55.",
      },
      {
        texto: "50",
        porque:
          "50 x IAS não é o multiplicador correto. O teto do IRS Jovem e 55 x IAS.",
      },
      {
        texto: "55",
        porque:
          "Correto. O teto anual de rendimento isento no IRS Jovem é de 55 vezes o IAS.",
      },
      {
        texto: "60",
        porque:
          "60 x IAS não é o multiplicador do IRS Jovem. O correto e 55.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — teto = 55 x IAS",
    fonte: fonte("art12bCirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 4 — Categorias A e B / freelancers (jov-49 a jov-62)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-49",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem aplica-se a que categorias de rendimento?",
    opcoes: [
      {
        texto: "Apenas categoria A (trabalho dependente)",
        porque:
          "O IRS Jovem não se limita a categoria A — aplica-se também a categoria B (trabalho independente).",
      },
      {
        texto: "Categorias A (trabalho dependente) e B (trabalho independente)",
        porque:
          "Correto. O regime de IRS Jovem abrange rendimentos de categoria A (emprego) e B (atividade independente/recibos verdes).",
      },
      {
        texto: "Todas as categorias de rendimento (A a H)",
        porque:
          "O IRS Jovem limita-se as categorias A e B. Não abrange rendimentos de capitais (E), prediais (F), mais-valias (G) ou pensões (H).",
      },
      {
        texto: "Apenas categoria B (trabalho independente)",
        porque:
          "O regime também abrange a categoria A (trabalho dependente), não apenas a B.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — categorias A e B",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-50",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um freelancer de 28 anos (categoria B, regime simplificado) pode beneficiar do IRS Jovem?",
    opcoes: [
      {
        texto: "Não, o IRS Jovem e exclusivo para trabalhadores por conta de outrem",
        porque:
          "O IRS Jovem aplica-se tanto a categoria A como a B. Freelancers estão incluídos.",
      },
      {
        texto: "Sim, o IRS Jovem aplica-se a rendimentos de categoria B",
        porque:
          "Correto. Os rendimentos de categoria B (trabalho independente) são elegíveis para o IRS Jovem, independentemente do regime de tributação (simplificado ou contabilidade organizada).",
      },
      {
        texto: "Sim, mas apenas se estiver no regime de contabilidade organizada",
        porque:
          "O regime de tributação (simplificado ou organizado) não afeta a elegibilidade para o IRS Jovem.",
      },
      {
        texto: "Sim, mas com isenção reduzida a metade",
        porque:
          "As percentagens de isenção são iguais para categorias A e B.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — aplicável a categoria B",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-51",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem tem rendimentos de categoria A (emprego) e categoria B (freelancer). O IRS Jovem aplica-se a ambos?",
    opcoes: [
      {
        texto: "Sim, a isenção aplica-se ao rendimento total de ambas as categorias",
        porque:
          "Correto. O IRS Jovem aplica-se ao conjunto dos rendimentos de categorias A e B, dentro do teto de 55 x IAS.",
      },
      {
        texto: "Não, tem de escolher uma das categorias",
        porque:
          "Não é necessário escolher. O IRS Jovem aplica-se a ambas as categorias em simultaneo.",
      },
      {
        texto: "Sim, mas com tetos separados para cada categoria",
        porque:
          "O teto de 55 x IAS e único e aplica-se ao rendimento total (A + B combinados), não a cada categoria separadamente.",
      },
      {
        texto: "Apenas a categoria A, por ser prioritaria",
        porque:
          "Não há hierarquia entre categorias. Ambas beneficiam do regime.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção sobre rendimentos A e B combinados",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-52",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 3.º ano do IRS Jovem ganha 20.000 EUR de categoria A e 15.000 EUR de categoria B. Qual o montante total isento em 2026?",
    opcoes: [
      {
        texto: "26.250 EUR (75% de 35.000 EUR)",
        porque:
          "Correto. Rendimento total = 20.000 + 15.000 = 35.000 EUR. Isenção no 3.º ano = 75%. 75% de 35.000 = 26.250 EUR, que é inferior ao teto de 29.542,15 EUR.",
      },
      {
        texto: "15.000 EUR (75% de 20.000 EUR, só categoria A)",
        porque:
          "O IRS Jovem aplica-se a ambas as categorias, não apenas a A.",
      },
      {
        texto: "29.542,15 EUR (teto)",
        porque:
          "O teto só se aplica se 75% do rendimento total o exceder. 75% de 35.000 = 26.250 < 29.542,15.",
      },
      {
        texto: "35.000 EUR (totalidade)",
        porque:
          "A isenção total (100%) só se aplica ao 1.º ano. No 3.º ano é de 75%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção combinada de categorias A e B",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-53",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O IRS Jovem aplica-se a rendimentos de categoria E (capitais, como dividendos)?",
    opcoes: [
      {
        texto: "Sim, aplica-se a todas as categorias",
        porque:
          "O IRS Jovem limita-se as categorias A e B. Rendimentos de capitais (E) não estão abrangidos.",
      },
      {
        texto: "Não, apenas categorias A e B",
        porque:
          "Correto. O Art. 12.º-B CIRS limita o IRS Jovem a rendimentos de categoria A (trabalho dependente) e B (trabalho independente).",
      },
      {
        texto: "Sim, se o jovem tiver menos de 30 anos",
        porque:
          "A idade não altera o âmbito do regime. O IRS Jovem nunca se aplica a rendimentos de categoria E.",
      },
      {
        texto: "Depende do montante de dividendos",
        porque:
          "O montante é irrelevante — rendimentos de categoria E estão excluídos do IRS Jovem.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — exclusao de rendimentos fora das categorias A e B",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-54",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem de 30 anos tem rendimentos prediais (categoria F) de arrendamento. Pode aplicar o IRS Jovem a estes rendimentos?",
    opcoes: [
      {
        texto: "Sim, desde que tenha até 35 anos",
        porque:
          "A idade é um requisito necessário, mas não suficiente. Rendimentos de categoria F não estão abrangidos pelo IRS Jovem.",
      },
      {
        texto: "Não, o IRS Jovem não abrange rendimentos de categoria F",
        porque:
          "Correto. O IRS Jovem aplica-se apenas a rendimentos de categorias A (trabalho dependente) e B (trabalho independente). Rendimentos prediais (categoria F) estão excluídos.",
      },
      {
        texto: "Sim, mas com isenção reduzida a 10%",
        porque:
          "Não existe isenção de 10% nem qualquer aplicação do IRS Jovem a rendimentos de categoria F.",
      },
      {
        texto: "Sim, se os rendimentos prediais forem inferiores a 55 x IAS",
        porque:
          "O teto de 55 x IAS aplica-se a rendimentos de categorias A e B, não a rendimentos prediais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — categorias A e B apenas",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-55",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um freelancer no regime simplificado (coeficiente 0,75) no 2.º ano do IRS Jovem fatura 30.000 EUR. Como interagem o regime simplificado é o IRS Jovem?",
    opcoes: [
      {
        texto: "O IRS Jovem aplica-se ao rendimento bruto (30.000 EUR), ignorando o coeficiente",
        porque:
          "O IRS Jovem aplica-se ao rendimento tributável, não ao bruto. No regime simplificado, o coeficiente já reduz a base tributável.",
      },
      {
        texto: "O IRS Jovem aplica-se sobre o rendimento tributável após aplicação do coeficiente simplificado",
        porque:
          "Correto. Primeiro aplica-se o coeficiente do regime simplificado (ex.: 0,75) para determinar o rendimento tributável, e depois aplica-se a isenção do IRS Jovem sobre esse rendimento tributável.",
      },
      {
        texto: "Não pode beneficiar de ambos — tem de escolher entre IRS Jovem e regime simplificado",
        porque:
          "O IRS Jovem e compatível com o regime simplificado. Não é necessário escolher entre eles.",
      },
      {
        texto: "O coeficiente simplificado é ignorado, aplicando-se apenas o IRS Jovem",
        porque:
          "Ambos os mecanismos se aplicam cumulativamente — o coeficiente simplificado é o IRS Jovem.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS conjugado com Art. 31.º CIRS — cumulação de regimes",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-56",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem aplica-se a trabalhadores por conta de outrem (categoria A)?",
    opcoes: [
      {
        texto: "Não, e exclusivo para freelancers (categoria B)",
        porque:
          "O IRS Jovem abrange ambas as categorias A e B, não apenas a B.",
      },
      {
        texto: "Sim, o regime abrange rendimentos de categoria A",
        porque:
          "Correto. O IRS Jovem aplica-se a rendimentos de categoria A (trabalho dependente), alem da categoria B.",
      },
      {
        texto: "Sim, mas apenas com contrato sem termo",
        porque:
          "O tipo de contrato (termo/sem termo) e irrelevante para o IRS Jovem.",
      },
      {
        texto: "Apenas se também tiver atividade independente",
        porque:
          "Não é necessário ter atividade independente. Rendimentos exclusivamente de categoria A são elegíveis.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — rendimentos de categoria A",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-57",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem freelancer no 5.º ano do IRS Jovem, no regime simplificado (coeficiente 0,75), fatura 40.000 EUR. Qual o rendimento sujeito a IRS em 2026?",
    opcoes: [
      {
        texto: "15.000 EUR",
        porque:
          "Rendimento tributável = 40.000 x 0,75 = 30.000 EUR. Isenção 50% = 15.000 EUR isento. Sujeito = 15.000 EUR. Correto.",
      },
      {
        texto: "20.000 EUR (50% de 40.000 EUR)",
        porque:
          "A isenção de 50% não se aplica ao rendimento bruto. Primeiro aplica-se o coeficiente simplificado (30.000 EUR), depois a isenção (50% de 30.000 = 15.000).",
      },
      {
        texto: "30.000 EUR (40.000 x 0,75)",
        porque:
          "30.000 EUR é o rendimento tributável antes do IRS Jovem. Após a isenção de 50%, o sujeito a IRS é 15.000 EUR.",
      },
      {
        texto: "10.000 EUR",
        porque:
          "Este valor não resulta do cálculo correto: 40.000 x 0,75 = 30.000; 50% de 30.000 = 15.000 sujeito.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B conjugado com Art. 31.º CIRS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-58",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem tem rendimentos de mais-valias (categoria G) de 10.000 EUR. Pode aplicar o IRS Jovem?",
    opcoes: [
      {
        texto: "Sim, desde que esteja dentro do teto de 55 x IAS",
        porque:
          "O teto limita o montante isento, mas a categoria G não está abrangida pelo IRS Jovem.",
      },
      {
        texto: "Sim, mas apenas para mais-valias de ações",
        porque:
          "O IRS Jovem não se aplica a nenhum tipo de mais-valia (categoria G).",
      },
      {
        texto: "Não, apenas categorias A e B estão abrangidas",
        porque:
          "Correto. O IRS Jovem limita-se a rendimentos de categoria A e B. Rendimentos de mais-valias (G) ficam excluídos.",
      },
      {
        texto: "Depende da idade do jovem",
        porque:
          "Independentemente da idade, rendimentos de categoria G não são elegíveis para o IRS Jovem.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — exclusao da categoria G",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-59",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem de 26 anos trabalha como empregado (15.000 EUR/ano) e freelancer (10.000 EUR/ano). Está no 1.º ano do IRS Jovem. Qual o total isento em 2026?",
    opcoes: [
      {
        texto: "15.000 EUR (apenas a categoria A)",
        porque:
          "O IRS Jovem abrange ambas as categorias. O isento é calculado sobre o total.",
      },
      {
        texto: "25.000 EUR (totalidade de A + B, no 1.º ano a 100%)",
        porque:
          "Correto. No 1.º ano (100%), o rendimento total = 25.000 EUR, que está abaixo do teto de 29.542,15 EUR. A totalidade fica isenta.",
      },
      {
        texto: "10.000 EUR (apenas a categoria B)",
        porque:
          "O IRS Jovem aplica-se a ambas as categorias, não apenas a B.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "O isento não pode exceder o rendimento efetivo. Com 25.000 EUR de rendimento, o isento e 25.000 EUR.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção combinada no 1.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-60",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem aplica-se a rendimentos de pensões (categoria H)?",
    opcoes: [
      {
        texto: "Sim, se a pensão for de um jovem até 35 anos",
        porque:
          "Independentemente da idade, rendimentos de pensões (H) não estão abrangidos pelo IRS Jovem.",
      },
      {
        texto: "Sim, para pensões de invalidez",
        porque:
          "O tipo de pensão e irrelevante — categoria H está sempre excluída do IRS Jovem.",
      },
      {
        texto: "Não, apenas categorias A e B",
        porque:
          "Correto. O IRS Jovem aplica-se exclusivamente a rendimentos de categorias A (trabalho dependente) e B (trabalho independente).",
      },
      {
        texto: "Depende do valor da pensão",
        porque:
          "O valor é irrelevante. Rendimentos de categoria H estão excluídos independentemente do montante.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — exclusao da categoria H",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-61",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem de 30 anos e trabalhador independente (categoria B) desde os 25. Está agora no 6.º ano do IRS Jovem. A isenção reduz a Segurança Social devida?",
    opcoes: [
      {
        texto: "Sim, a isenção do IRS Jovem reduz todas as obrigações fiscais e contributivas",
        porque:
          "O IRS Jovem é uma isenção de IRS, não de contribuições para a Segurança Social. São obrigações independentes.",
      },
      {
        texto: "Não, o IRS Jovem só afeta o IRS — as contribuições para a Segurança Social são independentes",
        porque:
          "Correto. A isenção do IRS Jovem aplica-se apenas ao IRS. As contribuições para a Segurança Social calculam-se sobre o rendimento relevante, independentemente do IRS Jovem.",
      },
      {
        texto: "Sim, mas apenas no 1.º ano (isenção de 100%)",
        porque:
          "O IRS Jovem nunca afeta a Segurança Social, em nenhum ano do regime.",
      },
      {
        texto: "Depende do rendimento anual",
        porque:
          "Independentemente do rendimento, a Segurança Social não é afetada pelo IRS Jovem.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção limitada ao IRS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-62",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem tem 25.000 EUR de categoria A e 20.000 EUR de categoria B. Está no 4.º ano do IRS Jovem. Qual o montante isento em 2026?",
    opcoes: [
      {
        texto: "29.542,15 EUR (teto de 55 x IAS)",
        porque:
          "75% de 45.000 = 33.750, que excede o teto de 29.542,15 EUR. Logo, o isento e limitado ao teto. Correto.",
      },
      {
        texto: "33.750 EUR (75% de 45.000 EUR)",
        porque:
          "75% de 45.000 = 33.750, mas excede o teto de 29.542,15 EUR. O isento e limitado ao teto.",
      },
      {
        texto: "18.750 EUR (75% apenas de categoria A)",
        porque:
          "O IRS Jovem aplica-se a ambas as categorias, não apenas a A.",
      },
      {
        texto: "45.000 EUR (totalidade)",
        porque:
          "A isenção total (100%) só se aplica no 1.º ano, e limitada ao teto. No 4.º ano é de 75%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — teto aplica-se ao rendimento combinado de A e B",
    fonte: fonte("art12bCirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 5 — Interacao com outros regimes (jov-63 a jov-74)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-63",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem pode ser acumulado com o regime de Residente Não Habitual (RNH)?",
    opcoes: [
      {
        texto: "Sim, são compatíveis",
        porque:
          "O IRS Jovem e incompatível com o RNH (agora IFICI). Não é possível acumular ambos os regimes.",
      },
      {
        texto: "Não, são incompatíveis",
        porque:
          "Correto. O Art. 12.º-B CIRS prevê a incompatibilidade entre o IRS Jovem é o regime de Residente Não Habitual (RNH/IFICI).",
      },
      {
        texto: "Sim, mas com teto reduzido a metade",
        porque:
          "Não há redução de teto — os regimes são simplesmente incompatíveis.",
      },
      {
        texto: "Depende do país de origem do contribuinte",
        porque:
          "A origem do contribuinte e irrelevante. Os regimes são incompatíveis por disposição legal.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — incompatibilidade com RNH/IFICI",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-64",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem está inscrito no regime IFICI (ex-RNH). Pode optar pelo IRS Jovem em simultaneo?",
    opcoes: [
      {
        texto: "Sim, pode acumular ambos os benefícios",
        porque:
          "Os regimes são incompatíveis. Não é possível beneficiar de ambos ao mesmo tempo.",
      },
      {
        texto: "Não, tem de escolher entre IFICI e IRS Jovem",
        porque:
          "Correto. O contribuinte deve optar por um dos regimes, visto que o IRS Jovem e o IFICI (sucessor do RNH) são mutuamente exclusivos.",
      },
      {
        texto: "Sim, se ganhar menos de 55 x IAS",
        porque:
          "O rendimento é irrelevante para a compatibilidade. Os regimes são incompatíveis independentemente do valor.",
      },
      {
        texto: "Sim, desde que tenha menos de 30 anos",
        porque:
          "A idade não torna os regimes compatíveis. São sempre incompatíveis.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — incompatibilidade com IFICI",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-65",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O IRS Jovem e compatível com o regime simplificado de IRS?",
    opcoes: [
      {
        texto: "Não, são mutuamente exclusivos",
        porque:
          "São compatíveis. O regime simplificado determina o rendimento tributável; o IRS Jovem isenta parte desse rendimento.",
      },
      {
        texto: "Sim, os dois regimes podem ser aplicados em conjunto",
        porque:
          "Correto. O IRS Jovem é o regime simplificado são compatíveis. O coeficiente simplificado aplica-se primeiro, e depois o IRS Jovem isenta parte do rendimento tributável resultante.",
      },
      {
        texto: "Sim, mas o teto é reduzido para 40 x IAS",
        porque:
          "Não há redução do teto por estar no regime simplificado. O teto mantém-se em 55 x IAS.",
      },
      {
        texto: "Depende da atividade exercida",
        porque:
          "A compatibilidade não depende da atividade. Ambos os regimes são sempre compatíveis.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B conjugado com Art. 31.º CIRS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-66",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Se um jovem tiver simultaneamente IRS Jovem e regime simplificado, que vantagem tem?",
    opcoes: [
      {
        texto: "Nenhuma — os benefícios anulam-se mutuamente",
        porque:
          "Os benefícios não se anulam. Acumulam-se: o coeficiente reduz a base e o IRS Jovem isenta parte do resultado.",
      },
      {
        texto: "Dupla redução: o coeficiente simplificado reduz a base e o IRS Jovem isenta parte do rendimento tributável",
        porque:
          "Correto. O regime simplificado reduz o rendimento bruto (ex.: coeficiente 0,75 ou 0,35), e o IRS Jovem isenta uma percentagem do rendimento tributável resultante.",
      },
      {
        texto: "Apenas o maior benefício se aplica",
        porque:
          "Não funciona por escolha do maior. Ambos os mecanismos se aplicam cumulativamente.",
      },
      {
        texto: "O IRS Jovem substitui o regime simplificado",
        porque:
          "O IRS Jovem não substitui o regime simplificado. São mecanismos diferentes que se complementam.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS + Art. 31.º CIRS — cumulação de benefícios",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-67",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem beneficiário do RNH durante 3 anos decide trocar para o IRS Jovem. Os 3 anos de RNH contam para os 10 anos do IRS Jovem?",
    opcoes: [
      {
        texto: "Sim, os anos de RNH contam como anos de obtenção de rendimentos",
        porque:
          "Os anos em que usufruiu do RNH são anos de obtenção de rendimentos. A contagem dos anos do IRS Jovem considera os anos em que obteve rendimentos, podendo iniciar-se na fase correspondente.",
      },
      {
        texto: "Não, os anos de RNH não contam e o IRS Jovem começa do 1.º ano",
        porque:
          "Os anos de RNH são anos em que o contribuinte obteve rendimentos de trabalho. Esses anos contam para a contagem do IRS Jovem.",
      },
      {
        texto: "Não pode trocar — uma vez inscrito no RNH, perde o direito ao IRS Jovem",
        porque:
          "Pode trocar. O que não pode e acumular ambos no mesmo ano. Após cessar o RNH, pode optar pelo IRS Jovem (se elegível).",
      },
      {
        texto: "Depende de negociação com a Autoridade Tributária",
        porque:
          "Não há negociação. A elegibilidade e os anos do regime são determinados pela lei.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — contagem de anos de obtenção de rendimentos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-68",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem de 28 anos, elegível para o IRS Jovem, pode optar por não aderir ao regime?",
    opcoes: [
      {
        texto: "Não, o regime é obrigatório para todos os jovens até 35 anos",
        porque:
          "O IRS Jovem não é obrigatório. O contribuinte pode optar por não aderir.",
      },
      {
        texto: "Sim, a adesão ao IRS Jovem e facultativa",
        porque:
          "Correto. O IRS Jovem é um benefício opcional. O contribuinte elegível pode optar por aderir ou não.",
      },
      {
        texto: "Sim, mas perde permanentemente o direito se não aderir no 1.º ano",
        porque:
          "O contribuinte pode aderir nos anos seguintes, embora os anos de obtenção de rendimentos anteriores contém para a progressividade.",
      },
      {
        texto: "Depende do empregador",
        porque:
          "A opção pelo IRS Jovem e do contribuinte, não do empregador.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — carater facultativo do regime",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-69",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem optou por não aderir ao IRS Jovem no 1.º e 2.º ano de obtenção de rendimentos. Se aderir no 3.º ano, em que fase entra?",
    opcoes: [
      {
        texto: "No 1.º ano do regime (100% de isenção)",
        porque:
          "Não. A contagem dos anos é feita desde o 1.º ano de obtenção de rendimentos, não desde a adesão ao regime.",
      },
      {
        texto: "No 3.º ano (75% de isenção)",
        porque:
          "Correto. Os anos de obtenção de rendimentos contam desde o início, mesmo que não tenha aderido ao regime. No 3.º ano de rendimentos, a isenção é de 75%.",
      },
      {
        texto: "No 2.º ano (75% de isenção), por ter perdido 1 ano",
        porque:
          "A contagem e objetiva — o 3.º ano de rendimentos e o 3.º ano para efeitos do IRS Jovem.",
      },
      {
        texto: "Não pode aderir — perdeu o direito ao não usar nos primeiros anos",
        porque:
          "Pode aderir em qualquer ano, desde que cumpra os requisitos de idade e não tenha esgotado os 10 anos.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — contagem ininterrupta de anos de rendimentos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-70",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem e compatível com a isenção de IVA do Art. 53.º CIVA (pequenos contribuintes)?",
    opcoes: [
      {
        texto: "Não, são regimes incompatíveis",
        porque:
          "O IRS Jovem é um benefício de IRS. A isenção do Art. 53.º é de IVA. São impostos diferentes e compatíveis.",
      },
      {
        texto: "Sim, são de impostos diferentes (IRS é IVA) e podem coexistir",
        porque:
          "Correto. O IRS Jovem é uma isenção de IRS é a isenção do Art. 53.º é de IVA. São mecanismos independentes e compatíveis.",
      },
      {
        texto: "Sim, mas o teto do IRS Jovem e reduzido",
        porque:
          "A isenção de IVA não afeta o teto do IRS Jovem. Os regimes são totalmente independentes.",
      },
      {
        texto: "Depende do volume de faturação",
        porque:
          "O volume de faturação afeta a isenção de IVA (Art. 53.º), mas não a compatibilidade entre os dois regimes.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS + Art. 53.º CIVA — regimes de impostos distintos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-71",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Qual destas afirmações sobre a interacao do IRS Jovem com o regime de contabilidade organizada é verdadeira?",
    opcoes: [
      {
        texto: "São incompatíveis — a contabilidade organizada exclui o IRS Jovem",
        porque:
          "São compatíveis. O regime de determinação do rendimento (simplificado ou contabilidade organizada) não afeta a elegibilidade para o IRS Jovem.",
      },
      {
        texto: "São compatíveis — o IRS Jovem aplica-se ao rendimento liquido apurado na contabilidade",
        porque:
          "Correto. O IRS Jovem aplica-se sobre o rendimento tributável, independentemente de ser determinado pelo regime simplificado ou pela contabilidade organizada.",
      },
      {
        texto: "São compatíveis, mas com isenção máxima de 50%",
        porque:
          "As percentagens de isenção não mudam por estar em contabilidade organizada.",
      },
      {
        texto: "Só são compatíveis nos primeiros 3 anos de atividade",
        porque:
          "A compatibilidade não está limitada no tempo. São sempre compatíveis durante os 10 anos do regime.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — independente do regime de determinação de rendimentos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-72",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem de 33 anos vive em Portugal e tenciona emigrar. Se regressar aos 35, pode aderir ao IRS Jovem pelo tempo restante?",
    opcoes: [
      {
        texto: "Sim, desde que tenha até 35 anos no último dia do ano e não tenha esgotado os 10 anos de regime",
        porque:
          "Correto. Ao regressar com 35 anos, cumpre o requisito etario. Se os anos totais de obtenção de rendimentos (em Portugal e no estrangeiro) não tiverem esgotado os 10 anos, pode beneficiar do IRS Jovem pelo tempo restante.",
      },
      {
        texto: "Não, ter emigrado impede permanentemente o acesso ao IRS Jovem",
        porque:
          "A emigração não impede o acesso futuro ao IRS Jovem, desde que os requisitos sejam cumpridos no regresso.",
      },
      {
        texto: "Sim, mas reinicia obrigatoriamente no 1.º ano (100%)",
        porque:
          "A contagem não reinicia. Retoma-se na fase correspondente ao número total de anos de rendimentos já obtidos.",
      },
      {
        texto: "Apenas se tiver contribuido para a Segurança Social portuguesa durante a emigração",
        porque:
          "As contribuições para a Segurança Social são irrelevantes para a elegibilidade do IRS Jovem.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — elegibilidade no regresso",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-73",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O IRS Jovem afeta o cálculo da retenção na fonte mensal feita pelo empregador?",
    opcoes: [
      {
        texto: "Não, a retenção na fonte é feita normalmente sem considerar o IRS Jovem",
        porque:
          "A retenção na fonte pode ser ajustada para refletir o IRS Jovem, não sendo obrigatoriamente ignorada.",
      },
      {
        texto: "Sim, o empregador deve reduzir a retenção na fonte de acordo com a isenção do IRS Jovem",
        porque:
          "Correto. O empregador deve aplicar as tabelas de retenção na fonte adequadas, considerando a isenção do IRS Jovem comunicada pelo trabalhador.",
      },
      {
        texto: "Não, o benefício só se aplica na declaração anual de IRS",
        porque:
          "O benefício pode refletir-se também na retenção mensal, não só na declaração anual.",
      },
      {
        texto: "Depende da dimensão da empresa",
        porque:
          "A dimensão da empresa e irrelevante. As regras de retenção aplicam-se a todos os empregadores.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — reflexo na retenção na fonte",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-74",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem tem rendimentos no estrangeiro (convenção de dupla tributação). O IRS Jovem aplica-se a esses rendimentos?",
    opcoes: [
      {
        texto: "Sim, se forem rendimentos de trabalho (categorias A ou B) e o jovem for residente fiscal em Portugal",
        porque:
          "Correto. Como residente fiscal em Portugal, o contribuinte é tributado pelo rendimento mundial. O IRS Jovem aplica-se aos rendimentos de categorias A e B, incluindo os obtidos no estrangeiro (sem prejuízo da convenção de dupla tributação).",
      },
      {
        texto: "Não, o IRS Jovem só se aplica a rendimentos obtidos em Portugal",
        porque:
          "Como residente fiscal em Portugal, o contribuinte é tributado pelo rendimento mundial, pelo que o IRS Jovem pode abranger rendimentos do estrangeiro.",
      },
      {
        texto: "Apenas se o país de origem tiver convenção com Portugal",
        porque:
          "A existência de convenção afeta a eliminação da dupla tributação, não a aplicabilidade do IRS Jovem.",
      },
      {
        texto: "Nunca, os rendimentos do estrangeiro estão sempre excluídos",
        porque:
          "Não estão excluídos. Um residente fiscal em Portugal é tributado pelo rendimento mundial.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — aplicabilidade a rendimentos mundiais de residente fiscal",
    fonte: fonte("art12bCirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 6 — Duracao do regime é contagem de anos (jov-75 a jov-84)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-75",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Qual é a duração máxima do regime de IRS Jovem?",
    opcoes: [
      {
        texto: "5 anos",
        porque:
          "O regime tem duração de 10 anos, não de 5.",
      },
      {
        texto: "10 anos",
        porque:
          "Correto. O IRS Jovem tem duração máxima de 10 anos consecutivos de obtenção de rendimentos.",
      },
      {
        texto: "15 anos",
        porque:
          "15 anos excede a duração prevista no Art. 12.º-B CIRS.",
      },
      {
        texto: "Sem limite temporal",
        porque:
          "O regime tem limite: 10 anos de isenção ou até atingir os 35 anos, o que ocorrer primeiro.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — duração de 10 anos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-76",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O que delimita o \"1.º ano de obtenção de rendimentos\" para efeitos do IRS Jovem?",
    opcoes: [
      {
        texto: "O ano em que abre atividade nas Finanças",
        porque:
          "A abertura de atividade é um ato administrativo. O 1.º ano conta a partir do ano em que efetivamente se obtém rendimentos de categoria A ou B.",
      },
      {
        texto: "O primeiro ano civil em que obteve rendimentos de trabalho (categoria A ou B)",
        porque:
          "Correto. O 1.º ano de obtenção de rendimentos e o primeiro ano fiscal em que o contribuinte aufere rendimentos de categoria A ou B.",
      },
      {
        texto: "O ano em que entrega a primeira declaração de IRS",
        porque:
          "A entrega da declaração é posterior a obtenção de rendimentos. O que conta e o ano em que se obtém rendimentos.",
      },
      {
        texto: "O ano em que completa 18 anos",
        porque:
          "A maioridade e irrelevante. O que conta e o primeiro ano de obtenção de rendimentos de trabalho.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — definição do 1.º ano de rendimentos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-77",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem de 24 anos teve um trabalho de verão aos 17 anos (rendimentos de categoria A). Esse ano conta como 1.º ano para o IRS Jovem?",
    opcoes: [
      {
        texto: "Não, só contam rendimentos obtidos após os 18 anos",
        porque:
          "Não existe está limitação. Qualquer ano em que se tenha obtido rendimentos de categoria A ou B pode contar.",
      },
      {
        texto: "Sim, o 1.º ano de obtenção de rendimentos e contado desde o primeiro rendimento de A ou B, independentemente da idade",
        porque:
          "Correto. O Art. 12.º-B CIRS refere-se ao ano de obtenção de rendimentos sem estabelecer idade mínima para o início da contagem.",
      },
      {
        texto: "Não, trabalhos de verão estão excluídos",
        porque:
          "Rendimentos de categoria A de trabalhos de verão são rendimentos de trabalho e contam para a contagem.",
      },
      {
        texto: "Depende do valor recebido",
        porque:
          "O valor é irrelevante para a contagem dos anos do regime.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — contagem desde o 1.º rendimento de A ou B",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-78",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Se um jovem não obteve rendimentos de categoria A ou B num determinado ano, esse ano conta para os 10 anos do IRS Jovem?",
    opcoes: [
      {
        texto: "Sim, conta como um ano desperdicado",
        porque:
          "Um ano sem rendimentos de A ou B não conta como ano de obtenção de rendimentos para o IRS Jovem.",
      },
      {
        texto: "Não, apenas contam os anos em que efetivamente se obtiveram rendimentos de A ou B",
        porque:
          "Correto. Apenas os anos em que o contribuinte obteve rendimentos de categoria A ou B contam para a progressividade do regime.",
      },
      {
        texto: "Depende do motivo da ausencia de rendimentos",
        porque:
          "O motivo e irrelevante. O que conta e a existência efetiva de rendimentos de A ou B.",
      },
      {
        texto: "Sim, é perde automaticamente a isenção desse ano",
        porque:
          "Sem rendimentos, não há isenção a aplicar nem ano a contar.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — contagem baseada em anos com rendimentos efetivos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-79",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem de 26 anos começou a trabalhar aos 22, mas esteve 2 anos desempregado (sem rendimentos de A ou B). Quantos anos do IRS Jovem já consumiu?",
    opcoes: [
      {
        texto: "4 anos (do 22.º ao 26.º ano de idade)",
        porque:
          "A contagem é feita por anos com rendimentos, não por anos de idade. Os 2 anos sem rendimentos não contam.",
      },
      {
        texto: "2 anos (apenas os anos com rendimentos de A ou B)",
        porque:
          "Correto. Se trabalhou dos 22 aos 23 (2 anos com rendimentos) e esteve 2 anos desempregado, consumiu 2 dos 10 anos do regime.",
      },
      {
        texto: "0 anos (o desemprego anula a contagem)",
        porque:
          "O desemprego não anula os anos anteriores. Os 2 anos com rendimentos contam normalmente.",
      },
      {
        texto: "6 anos (inclui os anos de desemprego mais uma penalização)",
        porque:
          "Não existe penalização. Apenas os anos com rendimentos efetivos de A ou B contam.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — anos sem rendimentos não contam",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-80",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Após o termino dos 10 anos do IRS Jovem, o que acontece ao contribuinte?",
    opcoes: [
      {
        texto: "Continua com 10% de isenção indefinidamente",
        porque:
          "Não existe isenção após os 10 anos. O regime cessa sem extensão.",
      },
      {
        texto: "Volta a ser tributado normalmente, sem qualquer isenção",
        porque:
          "Correto. Após os 10 anos do regime, o contribuinte passa a ser tributado pelas regras gerais de IRS, sem benefício de isenção.",
      },
      {
        texto: "Pode renovar o regime por mais 5 anos",
        porque:
          "O regime não é renovável. Os 10 anos são o limite absoluto.",
      },
      {
        texto: "Transita automaticamente para o RNH",
        porque:
          "Não há transição automática para nenhum outro regime. Após o IRS Jovem, aplicam-se as regras gerais.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — cessação após 10 anos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-81",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O regime de IRS Jovem pode ser interrompido e retomado?",
    opcoes: [
      {
        texto: "Não, uma vez iniciado funciona de forma continua sem interrupção",
        porque:
          "O regime pode ter interrupções naturais (ex.: anos sem rendimentos), retomando quando voltam a existir rendimentos de A ou B.",
      },
      {
        texto: "Sim, se houver anos sem rendimentos de A ou B, esses anos não contam é o regime retoma quando os rendimentos regressam",
        porque:
          "Correto. Anos sem rendimentos de categorias A ou B não contam para os 10 anos. O regime retoma a contagem quando surgem novos rendimentos.",
      },
      {
        texto: "Sim, mas só por um máximo de 2 anos consecutivos",
        porque:
          "Não existe limite de interrupção. O relevante e que o contribuinte tenha até 35 anos quando retoma.",
      },
      {
        texto: "Não, e os anos de interrupção contam como desperdicados",
        porque:
          "Os anos sem rendimentos não contam para os 10 anos do regime.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — interrupção natural sem perda de anos",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-82",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem começou a trabalhar aos 20 anos, esteve desempregado dos 23 aos 26 (4 anos sem rendimentos A/B), e retomou aos 27. No ano em que retoma, em que ano do regime se encontra?",
    opcoes: [
      {
        texto: "No 4.º ano (3 anos trabalhados + 1 de penalização)",
        porque:
          "Não há penalização. Apenas os anos com rendimentos contam.",
      },
      {
        texto: "No 8.º ano (contando os anos sem rendimentos)",
        porque:
          "Os anos sem rendimentos não contam. Só os 3 primeiros anos de trabalho contam.",
      },
      {
        texto: "No 4.º ano (retoma no ano seguinte ao 3.º com rendimentos)",
        porque:
          "Correto. Trabalhou 3 anos (20, 21, 22), esteve 4 anos sem rendimentos. Ao retomar aos 27, entra no 4.º ano do regime (isenção de 75%).",
      },
      {
        texto: "No 1.º ano (reinicia o regime após 4 anos de pausa)",
        porque:
          "O regime não reinicia. A contagem continua de onde parou.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — retoma da contagem após interrupção",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-83",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O IRS Jovem termina quando o contribuinte atinge que condição (o que ocorrer primeiro)?",
    opcoes: [
      {
        texto: "10 anos de isenção ou atingir 35 anos",
        porque:
          "Correto. O regime cessa quando se completam 10 anos de isenção ou quando o contribuinte ultrapassa os 35 anos no último dia do ano, consoante o que ocorrer primeiro.",
      },
      {
        texto: "Apenas quando completar 10 anos de isenção",
        porque:
          "O limite etario de 35 anos também termina o regime, mesmo antes dos 10 anos.",
      },
      {
        texto: "Apenas quando fizer 36 anos",
        porque:
          "A duração de 10 anos também limita o regime, mesmo antes dos 36 anos.",
      },
      {
        texto: "Quando atingir um rendimento acumulado superior a 500.000 EUR",
        porque:
          "Não existe limite de rendimento acumulado para a cessação do regime.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — cessação por duração ou idade",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-84",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem é um benefício fiscal temporário ou permanente?",
    opcoes: [
      {
        texto: "Permanente, dura toda a vida profissional",
        porque:
          "O IRS Jovem e temporário: dura no máximo 10 anos ou até aos 35 anos.",
      },
      {
        texto: "Temporario, com duração máxima de 10 anos",
        porque:
          "Correto. O IRS Jovem é um benefício temporário, com duração máxima de 10 anos (e limitado pela idade de 35 anos).",
      },
      {
        texto: "Permanente, mas com isenção decrescente",
        porque:
          "Embora a isenção seja decrescente, o regime é temporário (máximo 10 anos).",
      },
      {
        texto: "Depende da legislação em vigor",
        porque:
          "A estrutura de 10 anos está definida na lei. Alteracoes legislativas futuras são hipoteticas.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — carater temporário do regime",
    fonte: fonte("art12bCirs"),
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 7 — Cenarios praticos e cálculos avancados (jov-85 a jov-100)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "jov-85",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Uma jovem de 28 anos, no 3.º ano do IRS Jovem, ganha 25.000 EUR de categoria A e 10.000 EUR de categoria B (regime simplificado, coeficiente 0,75). Qual o rendimento tributável total antes da isenção do IRS Jovem?",
    opcoes: [
      {
        texto: "32.500 EUR (25.000 + 7.500)",
        porque:
          "Correto. Categoria A: 25.000 EUR (rendimento tributável). Categoria B: 10.000 x 0,75 = 7.500 EUR. Total tributável = 32.500 EUR.",
      },
      {
        texto: "35.000 EUR (25.000 + 10.000)",
        porque:
          "O rendimento de categoria B deve ser ajustado pelo coeficiente simplificado (10.000 x 0,75 = 7.500), não considerado pelo bruto.",
      },
      {
        texto: "26.250 EUR (75% de 35.000 EUR)",
        porque:
          "Este cálculo aplica a isenção do IRS Jovem diretamente ao bruto. Primeiro calcula-se o tributável é só depois a isenção.",
      },
      {
        texto: "18.750 EUR (75% de 25.000 EUR)",
        porque:
          "Este cálculo ignora a categoria B e aplica a isenção prematuramente.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B conjugado com Art. 31.º CIRS",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-86",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Uma trabalhadora de 30 anos está no 5.º ano do IRS Jovem e ganha 55.000 EUR. Qual o montante sujeito a IRS em 2026?",
    opcoes: [
      {
        texto: "25.457,85 EUR",
        porque:
          "Correto. 50% de 55.000 = 27.500, que está abaixo do teto de 29.542,15 EUR. Isento = 27.500 EUR. Sujeito = 55.000 - 27.500 = 27.500 EUR. Espera — recalculando: sujeito = 55.000 - 27.500 = 27.500 EUR, não 25.457,85.",
      },
      {
        texto: "27.500 EUR",
        porque:
          "Correto. No 5.º ano (50% de isenção): 50% de 55.000 = 27.500 EUR isento (abaixo do teto de 29.542,15). Sujeito = 55.000 - 27.500 = 27.500 EUR.",
      },
      {
        texto: "29.542,15 EUR",
        porque:
          "O teto é o máximo isento, não o sujeito. 50% de 55.000 = 27.500 < teto, logo isento = 27.500 é sujeito = 27.500.",
      },
      {
        texto: "55.000 EUR — acima do teto não há isenção",
        porque:
          "O teto limita o montante isento, não exclui o benefício. Com 55.000 EUR, 50% = 27.500 EUR fica isento.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção de 50% no 5.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-87",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um jovem ganha 10.000 EUR no 1.º ano do IRS Jovem. Qual o rendimento sujeito a IRS?",
    opcoes: [
      {
        texto: "10.000 EUR",
        porque:
          "No 1.º ano a isenção é de 100%. Com 10.000 EUR (abaixo do teto), a totalidade fica isenta.",
      },
      {
        texto: "0 EUR — totalidade isenta no 1.º ano",
        porque:
          "Correto. No 1.º ano (100% de isenção) e com rendimento de 10.000 EUR (muito abaixo do teto de 29.542,15 EUR), nada fica sujeito a IRS.",
      },
      {
        texto: "2.500 EUR (25% de 10.000 EUR)",
        porque:
          "25% e a isenção do 8.º-10.º ano, não do 1.º. No 1.º ano e 100%.",
      },
      {
        texto: "5.000 EUR (50% de 10.000 EUR)",
        porque:
          "50% e a isenção do 5.º-7.º ano. No 1.º ano e 100%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção total no 1.º ano",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-88",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Dois jovens da mesma idade comecaram a trabalhar no mesmo ano. Um ganha 20.000 EUR e outro 80.000 EUR. Ambos estão no 2.º ano do IRS Jovem em 2026. Quanto fica isento para cada um?",
    opcoes: [
      {
        texto: "Ambos isentos em 15.000 EUR (75% de 20.000)",
        porque:
          "O cálculo e individualizado. 75% de 20.000 = 15.000 para o primeiro, mas 75% de 80.000 = 60.000 (limitado ao teto) para o segundo.",
      },
      {
        texto: "Primeiro: 15.000 EUR; segundo: 29.542,15 EUR",
        porque:
          "Correto. Primeiro: 75% de 20.000 = 15.000 EUR (abaixo do teto). Segundo: 75% de 80.000 = 60.000, limitado ao teto de 29.542,15 EUR.",
      },
      {
        texto: "Ambos isentos em 29.542,15 EUR",
        porque:
          "O primeiro não atinge o teto. 75% de 20.000 = 15.000, que é inferior ao teto.",
      },
      {
        texto: "Primeiro: 20.000 EUR; segundo: 80.000 EUR",
        porque:
          "100% de isenção só se aplica no 1.º ano. No 2.º, a isenção é de 75%.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção diferenciada conforme o rendimento",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-89",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Um casal jovem (ambos com 27 anos) entrega declaração conjunta de IRS. Cada um tem rendimentos de trabalho próprios. O IRS Jovem aplica-se:",
    opcoes: [
      {
        texto: "Ao rendimento conjunto do casal, com teto duplo",
        porque:
          "O IRS Jovem e individual. Cada membro do casal aplica o regime aos seus próprios rendimentos, com teto individual.",
      },
      {
        texto: "Individualmente a cada membro do casal, com teto individual de 55 x IAS",
        porque:
          "Correto. O IRS Jovem aplica-se individualmente. Cada membro tem o seu próprio ano de regime é teto de 55 x IAS.",
      },
      {
        texto: "Apenas a um dos membros do casal (o que tem maior rendimento)",
        porque:
          "Ambos podem beneficiar do IRS Jovem, individualmente.",
      },
      {
        texto: "Não se aplica em tributação conjunta",
        porque:
          "O IRS Jovem aplica-se tanto em tributação individual como conjunta.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — aplicação individual no casal",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-90",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "Um jovem com 24 anos e licenciatura completa. Desde o OE2025, a licenciatura é necessária para o IRS Jovem?",
    opcoes: [
      {
        texto: "Sim, a licenciatura é obrigatória",
        porque:
          "Desde o OE2025, nenhum grau academico é necessário para o IRS Jovem.",
      },
      {
        texto: "Não, desde o OE2025 não é exigido qualquer grau academico",
        porque:
          "Correto. O Orçamento do Estado para 2025 eliminou a exigência de conclusão de ciclo de estudos. Qualquer jovem até 35 anos pode beneficiar.",
      },
      {
        texto: "Depende da area de formação",
        porque:
          "A area de formação nunca foi criterio para o IRS Jovem.",
      },
      {
        texto: "Só é necessário mestrado ou superior",
        porque:
          "Nenhum grau academico é necessário desde o OE2025.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS (redação OE2025) — sem requisito academico",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-91",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 10.º ano do IRS Jovem ganha 120.000 EUR (25% de isenção). Qual o montante isento em 2026?",
    opcoes: [
      {
        texto: "30.000 EUR (25% de 120.000)",
        porque:
          "25% de 120.000 = 30.000, que excede o teto de 29.542,15 EUR. O isento e limitado ao teto.",
      },
      {
        texto: "29.542,15 EUR (teto de 55 x IAS)",
        porque:
          "Correto. 25% de 120.000 = 30.000 EUR, que excede o teto de 29.542,15 EUR. O montante isento fica limitado ao teto.",
      },
      {
        texto: "120.000 EUR",
        porque:
          "No 10.º ano a isenção é de 25%, não de 100%.",
      },
      {
        texto: "0 EUR — no 10.º ano já não há isenção para rendimentos altos",
        porque:
          "Ha isenção de 25%, limitada ao teto. Não existe exclusao por rendimento elevado.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — 25% no 10.º ano, limitado pelo teto",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-92",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "O IRS Jovem aplica-se ao rendimento coletável (após dedução específica) ou ao rendimento bruto?",
    opcoes: [
      {
        texto: "Ao rendimento bruto, antes de qualquer dedução",
        porque:
          "O IRS Jovem aplica-se ao rendimento tributável, não ao bruto.",
      },
      {
        texto: "Ao rendimento tributável (após dedução específica ou coeficiente simplificado)",
        porque:
          "Correto. A isenção do IRS Jovem incide sobre o rendimento tributável, ou seja, após a dedução específica (categoria A) ou após o coeficiente simplificado (categoria B).",
      },
      {
        texto: "Ao rendimento liquido após todas as deduções a coleta",
        porque:
          "As deduções a coleta aplicam-se ao imposto, não ao rendimento. O IRS Jovem incide sobre o rendimento tributável.",
      },
      {
        texto: "Ao imposto apurado, não ao rendimento",
        porque:
          "O IRS Jovem isenta rendimento, não reduz diretamente o imposto.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — isenção sobre rendimento tributável",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-93",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 1.º ano trabalha apenas 6 meses e ganha 15.000 EUR. O teto de 55 x IAS é proporcional ao tempo trabalhado?",
    opcoes: [
      {
        texto: "Sim, proporcional: 29.542,15 / 2 = 14.771,08 EUR",
        porque:
          "O teto é anual e não é reduzido proporcionalmente ao tempo trabalhado.",
      },
      {
        texto: "Não, o teto é anual e aplica-se integralmente, independentemente do tempo trabalhado",
        porque:
          "Correto. O teto de 55 x IAS e anual. Mesmo trabalhando apenas 6 meses, o teto mantém-se em 29.542,15 EUR.",
      },
      {
        texto: "Sim, proporcional ao número de recibos emitidos",
        porque:
          "O teto não é proporcional a recibos. É um limite anual fixo.",
      },
      {
        texto: "Depende do tipo de contrato",
        porque:
          "O tipo de contrato e irrelevante para o teto, que é sempre anual.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — teto anual não proporcional",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-94",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Uma jovem de 35 anos está no 8.º ano do IRS Jovem (25% de isenção) e ganha 24.000 EUR. No ano seguinte faz 36 anos. O que acontece?",
    opcoes: [
      {
        texto: "No ano em que tem 35, beneficia de 25% de isenção (6.000 EUR). No ano seguinte, o regime cessa por ter 36 anos.",
        porque:
          "Correto. Em 2026 (35 anos): isento = 25% x 24.000 = 6.000 EUR. No ano seguinte, ao fazer 36, perde o direito ao IRS Jovem.",
      },
      {
        texto: "O regime cessa imediatamente ao completar 36 anos, mesmo a meio do ano",
        porque:
          "O regime não cessa a meio do ano. A avaliação é feita a 31 de dezembro do ano fiscal.",
      },
      {
        texto: "Pode continuar mais 2 anos (até completar os 10 do regime)",
        porque:
          "Não pode. O limite etario de 35 anos prevalece sobre a duração de 10 anos.",
      },
      {
        texto: "Perde também o benefício do ano em que tem 35, por estar perto do limite",
        porque:
          "Não. Enquanto tem 35 anos a 31 de dezembro, mantém o direito ao IRS Jovem nesse ano.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — cessação por idade no ano seguinte",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-95",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem começou a trabalhar aos 20 anos. No 6.º ano (26 anos), muda de empregador a meio do ano. O 6.º ano do IRS Jovem e afetado?",
    opcoes: [
      {
        texto: "Sim, reinicia no 1.º ano com o novo empregador",
        porque:
          "O IRS Jovem não está ligado ao empregador. A mudança de empregador não afeta a contagem.",
      },
      {
        texto: "Não, a contagem dos anos e do contribuinte, não do empregador",
        porque:
          "Correto. O IRS Jovem acompanha o contribuinte, não a relação laboral. A mudança de empregador não altera o ano do regime nem a percentagem de isenção.",
      },
      {
        texto: "Sim, perde o benefício nesse ano transitório",
        porque:
          "A mudança de empregador não causa perda de benefício.",
      },
      {
        texto: "Depende se o novo empregador está registado na AT",
        porque:
          "O registo do empregador e irrelevante para a contagem do IRS Jovem do contribuinte.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — regime pessoal do contribuinte",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-96",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Para beneficiar do IRS Jovem, o contribuinte precisa de fazer alguma comunicação a Autoridade Tributária?",
    opcoes: [
      {
        texto: "Não, basta declarar na declaração anual de IRS (Modelo 3)",
        porque:
          "O contribuinte deve indicar a opção pelo IRS Jovem na declaração de IRS, mas em muitos casos o benefício pode ser aplicado automaticamente na retenção mensal.",
      },
      {
        texto: "Sim, deve indicar a sua opção pelo IRS Jovem na entrega da declaração de IRS ou comunicar ao empregador para efeitos de retenção",
        porque:
          "Correto. O contribuinte deve manifestar a intenção de beneficiar do IRS Jovem, seja na declaração de IRS, seja comunicando ao empregador para ajustar a retenção na fonte.",
      },
      {
        texto: "Não, o benefício é automático sem qualquer ação do contribuinte",
        porque:
          "Embora existam mecanismos de aplicação simplificada, o contribuinte deve manifestar a opção pelo regime.",
      },
      {
        texto: "Sim, deve apresentar requerimento especial com 6 meses de antecedência",
        porque:
          "Não existe requerimento especial nem prazo de antecedência de 6 meses.",
      },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — opção pelo regime",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-97",
    categoria: "irs_jovem",
    dificuldade: 1,
    pergunta:
      "O IRS Jovem destina-se a que grupo de contribuintes?",
    opcoes: [
      {
        texto: "Reformados com menos de 40 anos",
        porque:
          "O IRS Jovem destina-se a trabalhadores ativos (rendimentos de A ou B), não a reformados.",
      },
      {
        texto: "Estudantes a tempo inteiro",
        porque:
          "O IRS Jovem aplica-se a quem obtém rendimentos de trabalho, não a estudantes sem rendimentos.",
      },
      {
        texto: "Jovens trabalhadores com até 35 anos que obtém rendimentos de trabalho",
        porque:
          "Correto. O IRS Jovem destina-se a contribuintes com até 35 anos que obtenham rendimentos de categoria A (trabalho dependente) ou B (trabalho independente).",
      },
      {
        texto: "Empresas que contratem jovens",
        porque:
          "O IRS Jovem é um benefício pessoal do trabalhador, não um incentivo empresarial.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS — âmbito subjetivo",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-98",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 3.º ano do IRS Jovem tem 22.000 EUR de categoria A. Qual a poupança máxima teorica de IRS face a tributação normal, admitindo taxa marginal de 28,5%?",
    opcoes: [
      {
        texto: "Cerca de 4.702,50 EUR (28,5% sobre 16.500 EUR isento)",
        porque:
          "Correto em termos aproximados. Isento = 75% de 22.000 = 16.500 EUR. A poupança máxima teorica seria 28,5% x 16.500 = 4.702,50 EUR (simplificação, pois a taxa efetiva pode diferir).",
      },
      {
        texto: "Exatamente 16.500 EUR",
        porque:
          "16.500 EUR é o rendimento isento, não a poupança de imposto. A poupança depende da taxa aplicável.",
      },
      {
        texto: "0 EUR — o IRS Jovem não reduz o imposto",
        porque:
          "O IRS Jovem reduz o rendimento tributável, o que reduz o imposto apurado.",
      },
      {
        texto: "6.270 EUR (28,5% de 22.000)",
        porque:
          "A isenção é de 75% (16.500 EUR), não de 100% (22.000 EUR). A poupança incide sobre 16.500, não 22.000.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — efeito fiscal da isenção",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-99",
    categoria: "irs_jovem",
    dificuldade: 2,
    pergunta:
      "Qual destas afirmações sobre o IRS Jovem após as alterações do OE2025 é VERDADEIRA?",
    opcoes: [
      {
        texto: "O regime passou a exigir mestrado em vez de licenciatura",
        porque:
          "O OE2025 eliminou qualquer exigência de grau academico, não a substituiu por mestrado.",
      },
      {
        texto: "O limite de idade desceu de 35 para 30 anos",
        porque:
          "O limite de idade mantém-se em 35 anos. O OE2025 não alterou este limite.",
      },
      {
        texto: "O requisito de conclusão de ciclo de estudos foi eliminado",
        porque:
          "Correto. A principal alteração do OE2025 ao IRS Jovem foi a eliminação do requisito de conclusão de ciclo de estudos (licenciatura, mestrado, etc.).",
      },
      {
        texto: "O teto passou de 55 x IAS para 70 x IAS",
        porque:
          "O teto mantém-se em 55 x IAS. Não foi alterado pelo OE2025.",
      },
    ],
    correta: 2,
    legalBasis: "Art. 12.º-B CIRS (redação OE2025) — eliminação do requisito academico",
    fonte: fonte("art12bCirs"),
  },
  {
    id: "jov-100",
    categoria: "irs_jovem",
    dificuldade: 3,
    pergunta:
      "Um jovem no 7.º ano do IRS Jovem ganha 59.084,30 EUR (exatamente 2 x 55 x IAS) em 2026. Qual o montante isento?",
    opcoes: [
      {
        texto: "29.542,15 EUR (teto de 55 x IAS)",
        porque:
          "Correto. 50% de 59.084,30 = 29.542,15 EUR, que iguala exatamente o teto de 55 x IAS. O montante isento e 29.542,15 EUR.",
      },
      {
        texto: "59.084,30 EUR (totalidade)",
        porque:
          "A isenção no 7.º ano é de 50%, não de 100%.",
      },
      {
        texto: "14.771,08 EUR (25% de 59.084,30 EUR)",
        porque:
          "25% aplica-se ao 8.º-10.º ano. No 7.º ano e 50%.",
      },
      {
        texto: "44.313,23 EUR (75% de 59.084,30 EUR)",
        porque:
          "75% aplica-se ao 2.º-4.º ano. No 7.º ano e 50%.",
      },
    ],
    correta: 0,
    legalBasis: "Art. 12.º-B CIRS — isenção de 50% no 7.º ano iguala o teto",
    fonte: fonte("art12bCirs"),
  },
];
