import { fonte, type QuizPergunta } from "./types";

export const PERGUNTAS_GERAL: QuizPergunta[] = [
  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 1 — Recibo verde e conceitos base (ger-6 a ger-15)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-6",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Onde se emite um recibo verde eletrónico?",
    opcoes: [
      { texto: "No Portal das Finanças (portal.portaldasfinancas.gov.pt).", porque: "O recibo verde eletrónico é emitido no Portal das Finanças, após autenticação com NIF e senha ou Chave Móvel Digital." },
      { texto: "No portal da Segurança Social Direta.", porque: "O portal da Segurança Social serve para questões contributivas, não para emissão de recibos verdes." },
      { texto: "Na aplicação do e-fatura.", porque: "O e-fatura serve para validar e consultar faturas emitidas a seu favor, não para emitir recibos verdes." },
      { texto: "Numa repartição de Finanças, presencialmente.", porque: "Desde 2012, os recibos verdes são emitidos eletronicamente no Portal das Finanças — já não se usam os antigos recibos em papel." },
    ],
    correta: 0,
    legalBasis: "Emissão eletrónica de recibos verdes — Portal das Finanças (AT)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-7",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O rendimento obtido por um trabalhador independente (freelancer) enquadra-se em que categoria de IRS?",
    opcoes: [
      { texto: "Categoria A — rendimentos do trabalho dependente.", porque: "A categoria A aplica-se a trabalhadores por conta de outrem (com contrato de trabalho), não a independentes." },
      { texto: "Categoria B — rendimentos empresariais e profissionais.", porque: "Os rendimentos de trabalhadores independentes (recibos verdes) enquadram-se na categoria B do IRS." },
      { texto: "Categoria E — rendimentos de capitais.", porque: "A categoria E abrange juros, dividendos e outros rendimentos de capitais, não rendimentos de trabalho independente." },
      { texto: "Categoria G — incrementos patrimoniais.", porque: "A categoria G inclui mais-valias e outros ganhos patrimoniais, não rendimentos profissionais de freelancers." },
    ],
    correta: 1,
    legalBasis: "Categoria B — rendimentos empresariais e profissionais (CIRS)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-8",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O NIF (Número de Identificação Fiscal) é necessário para que um freelancer possa:",
    opcoes: [
      { texto: "Abrir atividade, emitir recibos e cumprir obrigações fiscais.", porque: "O NIF é obrigatório para todas as interações com a Autoridade Tributária, incluindo abertura de atividade, emissão de recibos verdes e declarações fiscais." },
      { texto: "Apenas abrir uma conta bancária.", porque: "Embora o NIF seja necessário para abrir conta bancária, o seu propósito principal no contexto fiscal e identificar o contribuinte perante a AT." },
      { texto: "Apenas votar nas eleições.", porque: "O NIF é um número fiscal, não o número do cartão de cidadão usado para votar." },
      { texto: "Apenas comprar imóveis.", porque: "O NIF é usado em todas as relações fiscais, não só na compra de imóveis." },
    ],
    correta: 0,
    legalBasis: "Número de Identificação Fiscal — Lei Geral Tributária",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-9",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Em Portugal, quais são as categorias de rendimento previstas no CIRS?",
    opcoes: [
      { texto: "A, B, C, D, E, F.", porque: "Não existem categorias C e D no CIRS. As categorias são A, B, E, F, G e H." },
      { texto: "A (trabalho dependente), B (empresariais/profissionais), E (capitais), F (prediais), G (incrementos patrimoniais) e H (pensões).", porque: "O CIRS prevê seis categorias de rendimento: A, B, E, F, G e H, cada uma com regras próprias de tributação." },
      { texto: "Apenas duas: trabalho dependente e trabalho independente.", porque: "O IRS distingue seis categorias de rendimento, não apenas duas." },
      { texto: "A, B, C, D, E, F, G, H, I.", porque: "Não existem categorias C, D nem I no CIRS." },
    ],
    correta: 1,
    legalBasis: "Categorias de rendimento — Art. 1.º a 12.º CIRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-10",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Que significa 'abrir atividade nas Finanças'?",
    opcoes: [
      { texto: "Registar-se como trabalhador independente na Autoridade Tributária para poder emitir recibos verdes de forma regular.", porque: "Abrir atividade é o ato de registar o início da atividade profissional independente no Portal das Finanças, permitindo emitir recibos verdes e cumprir obrigações fiscais." },
      { texto: "Criar uma empresa (sociedade comercial).", porque: "Abrir atividade como independente é diferente de criar uma sociedade comercial — refere-se ao exercício individual de uma profissão ou ofício." },
      { texto: "Pedir uma licença de funcionamento a câmara municipal.", porque: "A licença camarária e exigida para certos estabelecimentos físicos, mas não é o mesmo que abrir atividade nas Finanças." },
      { texto: "Pedir o primeiro recibo verde em papel numa repartição de Finanças.", porque: "Desde 2012, os recibos são eletrónicos, e abrir atividade faz-se online no Portal das Finanças." },
    ],
    correta: 0,
    legalBasis: "Início de atividade — Art. 112.º CIRS e Art. 31.º CIVA",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-11",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Ao abrir atividade como trabalhador independente, que escolhas fiscais deve o contribuinte fazer?",
    opcoes: [
      { texto: "Escolher o código CAE da atividade é o regime de IVA aplicável.", porque: "O contribuinte escolhe o código CIRS da atividade (tabela do Art. 151.º ou código residual), o regime de IVA (isenção Art. 53.º ou regime normal) e, em certos casos, o regime de tributação." },
      { texto: "Apenas definir o preço dos serviços.", porque: "O preço dos serviços é livre — ao abrir atividade, as escolhas são de enquadramento fiscal (atividade, IVA, regime)." },
      { texto: "Registar a morada do escritório e nada mais.", porque: "A morada pode ser indicada, mas as escolhas essenciais são o tipo de atividade, regime de IVA é regime de tributação." },
      { texto: "Decidir se quer pagar IRS ou IRC.", porque: "Um trabalhador independente em nome individual paga sempre IRS — a opção por IRC só existe para sociedades comerciais." },
    ],
    correta: 0,
    legalBasis: "Declaração de início de atividade — Art. 112.º CIRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-12",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que é a 'cessação de atividade' nas Finanças?",
    opcoes: [
      { texto: "Uma multa aplicada por falta de pagamento de IRS.", porque: "Uma multa é uma coima por incumprimento, não tem relação com o conceito de cessação de atividade." },
      { texto: "O encerramento formal da atividade independente no Portal das Finanças, deixando de poder emitir recibos verdes.", porque: "Cessar atividade e comunicar a AT que o contribuinte deixou de exercer atividade independente, extinguindo as obrigações declarativas periódicas associadas." },
      { texto: "A suspensão temporária do pagamento de Segurança Social.", porque: "A cessação de atividade nas Finanças não é o mesmo que suspender contribuições — e o encerramento definitivo do registo de independente." },
      { texto: "A mudança de regime simplificado para contabilidade organizada.", porque: "Mudar de regime é uma alteração de enquadramento, não uma cessação de atividade." },
    ],
    correta: 1,
    legalBasis: "Cessacao de atividade — Art. 114.º CIRS e Art. 33.º CIVA",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-13",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Após cessar atividade nas Finanças, o que acontece as obrigações de Segurança Social?",
    opcoes: [
      { texto: "Cessam automaticamente no mesmo dia.", porque: "A comunicação a Segurança Social é obrigatória, mas o processo pode não ser imediato nem automático — o contribuinte deve confirmar a cessação junto da SS." },
      { texto: "O contribuinte deve comunicar também a cessação a Segurança Social; as contribuições pendentes continuam devidas.", porque: "A cessação nas Finanças e na Segurança Social são processos distintos. As contribuições já apuradas continuam devidas, e o contribuinte deve regularizar a sua situação em ambas as entidades." },
      { texto: "O contribuinte fica automaticamente isento de pagar as contribuições passadas.", porque: "As contribuições já apuradas são devidas independentemente da cessação — não há perdão automático de dívidas." },
      { texto: "Não há qualquer relação entre a AT e a Segurança Social.", porque: "Embora sejam entidades distintas, a Segurança Social recebe informação da AT e há obrigação de comunicar alterações a ambas." },
    ],
    correta: 1,
    legalBasis: "Cessacao de atividade — Código Contributivo (Segurança Social)",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-14",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Que impostos ou contribuições pode um trabalhador independente ter de pagar?",
    opcoes: [
      { texto: "IRS (retenção na fonte e acerto anual), IVA (se não isento) e contribuições para a Segurança Social.", porque: "Um freelancer está potencialmente sujeito a IRS, IVA é contribuições para a SS, cada uma com regras, isenções e prazos próprios." },
      { texto: "Apenas IRS — não há mais nenhuma obrigação.", porque: "Alem do IRS, o trabalhador independente pode ter obrigações de IVA é de Segurança Social." },
      { texto: "Apenas Segurança Social — o IRS é só para empregados.", porque: "O IRS aplica-se a todos os rendimentos sujeitos, incluindo os da categoria B (independentes)." },
      { texto: "IRC é IMI.", porque: "O IRC é para pessoas coletivas (empresas) e o IMI e sobre imóveis — nenhum deles é uma obrigação tipica de um freelancer enquanto independente." },
    ],
    correta: 0,
    legalBasis: "Obrigações fiscais e contributivas do trabalhador independente",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-15",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Se um freelancer prestar um serviço de 500 € a uma empresa e tiver retenção na fonte de 23%, quanto recebe efetivamente?",
    opcoes: [
      { texto: "500 € — a retenção é paga a parte pela empresa.", porque: "A retenção na fonte é descontada no pagamento: a empresa retém 23% e entrega-os a AT, pelo que o freelancer recebe menos." },
      { texto: "385 € — a empresa retém 115 € (23% de 500 €) e entrega-os a AT.", porque: "Com retenção de 23% sobre 500 €, a empresa retém 115 € é paga 385 € ao prestador. Esses 115 € são um adiantamento de IRS." },
      { texto: "450 € — a retenção é só de 10%.", porque: "Não existe taxa de retenção de 10% para prestações de serviços de categoria B." },
      { texto: "500 € menos o IVA.", porque: "O IVA, se aplicável, acresce ao valor do serviço e não se confunde com a retenção na fonte de IRS." },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção na fonte sobre rendimentos da categoria B",
    fonte: fonte("art101cirs"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 2 — Regime simplificado vs contabilidade organizada (ger-16 a ger-25)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-16",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é o limite de faturação anual para poder ficar no regime simplificado de IRS?",
    opcoes: [
      { texto: "100.000 €.", porque: "O limite de 100.000 € não está previsto na lei — o limiar do regime simplificado é de 200.000 €." },
      { texto: "200.000 €.", porque: "O regime simplificado é aplicável a contribuintes com rendimentos brutos anuais até 200.000 €. Acima deste valor, por dois anos consecutivos, é obrigatória a contabilidade organizada." },
      { texto: "50.000 €.", porque: "50.000 € não é o limiar do regime simplificado — o limite é de 200.000 €." },
      { texto: "Não há limite.", porque: "Existe um limite: 200.000 € de rendimento bruto anual para permanecer no regime simplificado." },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS — limiar do regime simplificado (200.000 €)",
    fonte: fonte("art31"),
  },
  {
    id: "ger-17",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "No regime simplificado, qual é o coeficiente aplicável a prestações de serviços previstas na tabela do Art. 151.º CIRS (ex.: arquitetos, advogados)?",
    opcoes: [
      { texto: "0,35 (35% do rendimento é tributável).", porque: "0,35 aplica-se a vendas de mercadorias e produtos, não a prestações de serviços do Art. 151.º." },
      { texto: "0,75 (75% do rendimento é tributável).", porque: "Para prestações de serviços previstas na tabela do Art. 151.º CIRS, o coeficiente é 0,75 — ou seja, presume-se que 25% são despesas da atividade." },
      { texto: "0,15 (15% do rendimento é tributável).", porque: "0,15 aplica-se a rendimentos de alojamento local em areas de contenção ou de arrendamento urbano, não a serviços profissionais." },
      { texto: "0,95 (95% do rendimento é tributável).", porque: "0,95 aplica-se a rendimentos de capitais (categoria E) é de propriedade intelectual não abrangidos pelo Art. 151.º." },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 1 CIRS — coeficiente de 0,75 para serviços do Art. 151.º",
    fonte: fonte("art31"),
  },
  {
    id: "ger-18",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "No regime simplificado, qual é o coeficiente aplicável a vendas de mercadorias e produtos?",
    opcoes: [
      { texto: "0,75.", porque: "0,75 aplica-se a prestações de serviços do Art. 151.º, não a vendas de mercadorias." },
      { texto: "0,50.", porque: "Não existe coeficiente de 0,50 para vendas de mercadorias no Art. 31.º CIRS." },
      { texto: "0,35.", porque: "O coeficiente de 0,35 aplica-se a vendas de mercadorias e produtos — presume-se que 65% do rendimento são custos da atividade comercial." },
      { texto: "0,15.", porque: "0,15 aplica-se a rendimentos de alojamento local em areas de contenção, não a vendas de mercadorias." },
    ],
    correta: 2,
    legalBasis: "Art. 31.º, n.º 1 CIRS — coeficiente de 0,35 para vendas de bens",
    fonte: fonte("art31"),
  },
  {
    id: "ger-19",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Em que situação é obrigatória a contabilidade organizada para um trabalhador independente?",
    opcoes: [
      { texto: "Quando fatura mais de 15.000 € num ano.", porque: "15.000 € e o limiar de isenção de IVA (Art. 53.º CIVA) é de dispensa de retenção (Art. 101.º-B CIRS), não o limiar do regime contabilístico." },
      { texto: "Quando o rendimento bruto anual ultrapassa 200.000 € em dois anos consecutivos.", porque: "A contabilidade organizada torna-se obrigatória quando o rendimento bruto excede 200.000 € durante dois anos consecutivos (Art. 28.º CIRS)." },
      { texto: "Quando o freelancer tem mais de 5 clientes.", porque: "O número de clientes não determina o regime contabilístico — o criterio e o volume de faturação." },
      { texto: "Nunca é obrigatória — é sempre uma opção.", porque: "Acima de 200.000 € por dois anos consecutivos, a contabilidade organizada é obrigatória." },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS — obrigatoriedade de contabilidade organizada",
    fonte: fonte("art31"),
  },
  {
    id: "ger-20",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Na contabilidade organizada, como se determina o rendimento tributável?",
    opcoes: [
      { texto: "Rendimento bruto multiplicado por um coeficiente fixo.", porque: "Isso e o metodo do regime simplificado. Na contabilidade organizada, deduzem-se as despesas reais." },
      { texto: "Rendimento bruto menos as despesas reais comprovadas da atividade.", porque: "Na contabilidade organizada, o rendimento tributável e o lucro real: rendimento bruto menos as despesas efetivamente suportadas e documentadas." },
      { texto: "Rendimento bruto sem qualquer dedução.", porque: "A contabilidade organizada permite deduzir despesas reais, o que é uma das suas vantagens face ao regime simplificado." },
      { texto: "Rendimento bruto menos uma dedução fixa de 4.104 €.", porque: "A dedução específica de 4.104 € aplica-se a rendimentos da categoria A (trabalho dependente), não a contabilidade organizada da categoria B." },
    ],
    correta: 1,
    legalBasis: "Art. 32.º CIRS — determinação do rendimento na contabilidade organizada",
    fonte: fonte("art31"),
  },
  {
    id: "ger-21",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "No regime simplificado, a 'regra dos 15%' (Art. 31.º, n.º 2 CIRS) significa que:",
    opcoes: [
      { texto: "O coeficiente aplicável é sempre de 15%, independentemente da atividade.", porque: "Não — 15% refere-se ao mínimo de despesas que o contribuinte deve comprovar em certos casos, não a um coeficiente universal." },
      { texto: "Para beneficiar do coeficiente reduzido, é necessário que pelo menos 15% do rendimento bruto esteja justificado com despesas efetivas (e-fatura ou fatura comunicada).", porque: "A lei exige que parte do rendimento presumido como despesas esteja efetivamente documentado, sob pena de penalização (tributação autonoma) sobre a diferença." },
      { texto: "O IRS a pagar nunca pode ultrapassar 15% do rendimento.", porque: "A taxa efetiva de IRS depende dos escalões e pode ultrapassar 15% — está regra não limita a taxa." },
      { texto: "Apenas 15% do rendimento está sujeito a IRS.", porque: "Isso só acontece com o coeficiente de 0,15 (alojamento local em areas de contenção), não é uma regra geral." },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS — exigência de despesas documentadas no regime simplificado",
    fonte: fonte("art31"),
  },
  {
    id: "ger-22",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Um freelancer no regime simplificado com coeficiente 0,75 faturou 40.000 € brutos no ano. Qual é o rendimento tributável em sede de IRS?",
    opcoes: [
      { texto: "40.000 € — não há qualquer dedução.", porque: "No regime simplificado, aplica-se o coeficiente ao rendimento bruto — não se tributa a totalidade." },
      { texto: "30.000 € (40.000 € x 0,75).", porque: "O coeficiente de 0,75 aplicado a 40.000 € resulta num rendimento tributável de 30.000 €. Presume-se que 10.000 € são despesas da atividade." },
      { texto: "14.000 € (40.000 € x 0,35).", porque: "0,35 e o coeficiente para vendas de mercadorias, não para prestações de serviços do Art. 151.º." },
      { texto: "10.000 € (a parte que se presume como despesas).", porque: "Os 10.000 € representam a presunção de despesas (25%), não o rendimento tributável. O tributável são os restantes 30.000 €." },
    ],
    correta: 1,
    legalBasis: "Art. 31.º CIRS — cálculo do rendimento tributável no regime simplificado",
    fonte: fonte("art31"),
  },
  {
    id: "ger-23",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é a principal vantagem da contabilidade organizada face ao regime simplificado?",
    opcoes: [
      { texto: "Não é necessário contabilista certificado.", porque: "Pelo contrário: a contabilidade organizada exige obrigatoriamente um contabilista certificado." },
      { texto: "Permite deduzir as despesas reais da atividade, o que pode resultar num rendimento tributável inferior ao do regime simplificado.", porque: "Na contabilidade organizada, o rendimento tributável e o lucro real (receita menos despesas comprovadas), podendo ser mais vantajoso para quem tem despesas elevadas." },
      { texto: "A taxa de IRS é fixa em 15%.", porque: "A taxa de IRS segue os escalões progressivos (Art. 68.º CIRS) em ambos os regimes — não há taxa fixa." },
      { texto: "Não há obrigação de emitir faturas.", porque: "A obrigação de faturação existe em ambos os regimes." },
    ],
    correta: 1,
    legalBasis: "Art. 28.º e 32.º CIRS — regimes de determinação do rendimento",
    fonte: fonte("art31"),
  },
  {
    id: "ger-24",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Quanto custa, aproximadamente, manter um contabilista certificado para a contabilidade organizada?",
    opcoes: [
      { texto: "É gratuito — o Estado disponibiliza contabilistas.", porque: "O Estado não disponibiliza contabilistas gratuitamente. O contribuinte contrata é paga um contabilista certificado." },
      { texto: "Cerca de 150 a 300 € por mês, dependendo do volume e complexidade.", porque: "O custo habitual de um contabilista certificado para um trabalhador independente situa-se entre 150 € e 300 €/mês, embora possa variar." },
      { texto: "Cerca de 10 € por mês.", porque: "10 € por mês é um valor irrealista para serviços de contabilidade organizada." },
      { texto: "Paga-se apenas uma vez, no início da atividade.", porque: "O contabilista presta serviços continuos (escrituracao, declarações, obrigações periódicas) — não é um custo único." },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS — obrigatoriedade de contabilista certificado na contabilidade organizada",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-25",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "No regime simplificado, o freelancer precisa de contabilista certificado?",
    opcoes: [
      { texto: "Sim, é sempre obrigatório.", porque: "No regime simplificado, não é obrigatório ter contabilista certificado — as obrigações declarativas são mais simples." },
      { texto: "Não — o regime simplificado não exige contabilista certificado.", porque: "Uma das vantagens do regime simplificado é precisamente dispensar o contribuinte de contratar um contabilista certificado." },
      { texto: "Só se faturar mais de 50.000 €.", porque: "Não existe esse limiar — no regime simplificado, não é obrigatório ter contabilista independentemente do volume." },
      { texto: "Depende do tipo de atividade.", porque: "A dispensa de contabilista no regime simplificado aplica-se a todos os tipos de atividade." },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS — regime simplificado sem obrigatoriedade de contabilista",
    fonte: fonte("art31"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 3 — IAS, RMMG, mínimo de existência (ger-26 a ger-33)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-26",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que é o IAS (Indexante dos Apoios Sociais)?",
    opcoes: [
      { texto: "Uma taxa de imposto aplicada a rendimentos elevados.", porque: "O IAS não é uma taxa de imposto — é um valor de referência usado para calcular varios limites e prestações sociais." },
      { texto: "Um valor de referência atualizado anualmente, usado para calcular limites de prestações sociais e fiscais.", porque: "O IAS e o indexante que serve de base ao cálculo de diversas prestações sociais, limites contributivos e fiscais." },
      { texto: "O salario mínimo nacional.", porque: "O IAS e distinto do salario mínimo (RMMG). Em 2026, o IAS e 537,13 € e o RMMG e 920 €." },
      { texto: "O montante máximo que um freelancer pode faturar por mês.", porque: "Não existe limite mensal de faturação para freelancers — o IAS é um indexante de cálculo, não um teto de rendimento." },
    ],
    correta: 1,
    legalBasis: "IAS — Indexante dos Apoios Sociais (DL 323/2009)",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-27",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é o valor do IAS em 2026?",
    opcoes: [
      { texto: "480,43 €.", porque: "480,43 € foi o valor do IAS em anos anteriores — em 2026, o IAS e 537,13 €." },
      { texto: "537,13 €.", porque: "O IAS em 2026 é de 537,13 €, servindo de base ao cálculo de varios limites fiscais e contributivos." },
      { texto: "920,00 €.", porque: "920 € é o valor da RMMG (salario mínimo) em 2026, não do IAS." },
      { texto: "600,00 €.", porque: "600 € não corresponde ao valor do IAS em nenhum ano recente." },
    ],
    correta: 1,
    legalBasis: "IAS 2026 = 537,13 €",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-28",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é o valor da RMMG (Retribuicao Minima Mensal Garantida) em 2026?",
    opcoes: [
      { texto: "760 €.", porque: "760 € foi o valor da RMMG em anos anteriores — em 2026, o salario mínimo é 920 €." },
      { texto: "820 €.", porque: "820 € foi o valor da RMMG em 2024 — em 2026, e 920 €." },
      { texto: "920 €.", porque: "A RMMG (salario mínimo nacional) em 2026 é de 920 € por mês (14 meses)." },
      { texto: "1.000 €.", porque: "1.000 € não é o valor da RMMG em 2026 — o valor correto e 920 €." },
    ],
    correta: 2,
    legalBasis: "RMMG 2026 = 920 €",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-29",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "O que é o 'mínimo de existência' em sede de IRS?",
    opcoes: [
      { texto: "O valor mínimo de imposto que todos os contribuintes devem pagar.", porque: "É o oposto: o mínimo de existência garante que ninguem paga imposto sobre um rendimento abaixo de um certo limiar." },
      { texto: "O rendimento liquido mínimo que o contribuinte deve manter após tributação, garantindo que ninguem fica abaixo de um nível de subsistência.", porque: "O mínimo de existência (Art. 70.º CIRS) assegura que, após a tributação, nenhum contribuinte fique com rendimento liquido inferior a um determinado limiar (RMMG x 14)." },
      { texto: "Uma prestação social paga aos freelancers com baixos rendimentos.", porque: "O mínimo de existência não é uma prestação social — é um mecanismo fiscal que limita a tributação." },
      { texto: "O valor do IAS multiplicado por 12.", porque: "O mínimo de existência calcula-se com base na RMMG x 14, não no IAS x 12." },
    ],
    correta: 1,
    legalBasis: "Art. 70.º CIRS — mínimo de existência",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-30",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Em 2026, qual é o valor do mínimo de existência?",
    opcoes: [
      { texto: "7.518 € (IAS x 14).", porque: "O mínimo de existência calcula-se com base na RMMG, não no IAS." },
      { texto: "12.880 € (920 € x 14).", porque: "Em 2026, o mínimo de existência é de 12.880 €, correspondendo a 14 vezes a RMMG (920 €)." },
      { texto: "11.200 € (800 € x 14).", porque: "800 € não é o valor da RMMG em 2026 — o valor correto e 920 €." },
      { texto: "6.445,56 € (IAS x 12).", porque: "IAS x 12 e o teto contributivo da Segurança Social, não o mínimo de existência." },
    ],
    correta: 1,
    legalBasis: "Art. 70.º CIRS — mínimo de existência 2026 = 920 € x 14 = 12.880 €",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-31",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Para que serve o IAS no contexto da Segurança Social dos trabalhadores independentes?",
    opcoes: [
      { texto: "Define o escalão de IRS aplicável.", porque: "O IAS não define escalões de IRS — esses são definidos pelo Art. 68.º CIRS." },
      { texto: "Serve de base ao cálculo do teto contributivo é de varios limites da Segurança Social.", porque: "O IAS é usado para calcular o teto máximo da base de incidência contributiva (12 x IAS) e outros limites relevantes para independentes." },
      { texto: "É o valor da contribuição mínima mensal.", porque: "A contribuição mínima é de 20 €/mês — não é igual ao IAS." },
      { texto: "Define o prazo de entrega das declarações de IRS.", porque: "O IAS não tem qualquer relação com os prazos de entrega de declarações fiscais." },
    ],
    correta: 1,
    legalBasis: "Teto contributivo — 12 x IAS (Código Contributivo)",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-32",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Qual é o teto (valor máximo) da base de incidência contributiva mensal para a Segurança Social em 2026?",
    opcoes: [
      { texto: "6.445,56 € (12 x IAS = 12 x 537,13 €).", porque: "O teto contributivo mensal da Segurança Social para independentes é de 12 x IAS, ou seja, 12 x 537,13 € = 6.445,56 € em 2026." },
      { texto: "12.880 € (RMMG x 14).", porque: "12.880 € e o mínimo de existência, não o teto contributivo da SS." },
      { texto: "2.000 €.", porque: "2.000 € não corresponde a nenhum limite legal da SS para independentes." },
      { texto: "Não há teto — paga-se sempre sobre a totalidade do rendimento.", porque: "Existe um teto: a base de incidência não pode exceder 12 x IAS por mês." },
    ],
    correta: 0,
    legalBasis: "Teto contributivo mensal SS = 12 x IAS = 6.445,56 € (2026)",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-33",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Qual é a contribuição mínima mensal que um trabalhador independente paga a Segurança Social?",
    opcoes: [
      { texto: "50 €.", porque: "A contribuição mínima não é 50 € — é de 20 €/mês." },
      { texto: "20 €.", porque: "A contribuição mínima mensal obrigatória para trabalhadores independentes é de 20 €/mês." },
      { texto: "100 €.", porque: "100 € não corresponde ao mínimo contributivo legal." },
      { texto: "0 € — só se paga se o rendimento ultrapassar 10.000 €/ano.", porque: "Existe uma contribuição mínima de 20 €/mês (salvo isenção no primeiro ano de atividade), independentemente do rendimento." },
    ],
    correta: 1,
    legalBasis: "Contribuição mínima SS = 20 €/mês (Código Contributivo)",
    fonte: fonte("segSocialGov"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 4 — Segurança Social para independentes (ger-34 a ger-42)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-34",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é a taxa contributiva da Segurança Social para trabalhadores independentes que prestam serviços?",
    opcoes: [
      { texto: "11% sobre o rendimento bruto.", porque: "11% é a taxa de contribuição de um trabalhador por conta de outrem, não de um independente." },
      { texto: "21,4% sobre 70% do rendimento relevante.", porque: "A taxa contributiva é de 21,4%, aplicada sobre 70% do rendimento relevante (para prestações de serviços). Efetivamente, paga-se 21,4% x 70% = 14,98% do rendimento." },
      { texto: "21,4% sobre 100% do rendimento.", porque: "A taxa de 21,4% aplica-se sobre 70% (serviços) ou 20% (bens) do rendimento, não sobre 100%." },
      { texto: "34,75% como nas empresas.", porque: "34,75% é a taxa global (entidade empregadora + trabalhador) no regime de conta de outrem — não se aplica a independentes." },
    ],
    correta: 1,
    legalBasis: "Código Contributivo — taxa de 21,4% sobre 70% (serviços) para independentes",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-35",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "É a taxa contributiva da SS para independentes que vendem bens/mercadorias?",
    opcoes: [
      { texto: "21,4% sobre 20% do rendimento relevante.", porque: "Para vendas de bens/mercadorias, a base de incidência é de 20% do rendimento relevante, aplicando-se a taxa de 21,4% sobre esse valor." },
      { texto: "21,4% sobre 70% do rendimento relevante.", porque: "70% é a base para prestações de serviços. Para vendas de bens, a base é de 20%." },
      { texto: "10% sobre o rendimento total.", porque: "Não existe taxa de 10% na SS para independentes." },
      { texto: "Isento — vendas de bens não estão sujeitas a SS.", porque: "As vendas de bens também estão sujeitas a contribuições para a SS, com base de incidência de 20%." },
    ],
    correta: 0,
    legalBasis: "Código Contributivo — taxa de 21,4% sobre 20% (bens) para independentes",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-36",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente que abre atividade pela primeira vez (ou sem atividade independente nos últimos 12 meses) tem isenção de Segurança Social?",
    opcoes: [
      { texto: "Não — paga contribuições desde o primeiro dia.", porque: "Existe isenção de contribuições nos primeiros 12 meses de atividade (se não teve atividade independente nos 12 meses anteriores)." },
      { texto: "Sim, está isento durante os primeiros 12 meses de atividade.", porque: "O trabalhador independente que inicia atividade beneficia de isenção de contribuições para a SS durante os primeiros 12 meses, desde que não tenha tido atividade independente nos últimos 12 meses." },
      { texto: "Sim, está isento durante 24 meses.", porque: "A isenção é de 12 meses, não de 24." },
      { texto: "Só se faturar menos de 5.000 € por ano.", porque: "A isenção no primeiro ano não depende do volume de faturação — aplica-se automaticamente." },
    ],
    correta: 1,
    legalBasis: "Art. 157.º Código Contributivo — isenção nos primeiros 12 meses",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-37",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Com que periodicidade são atualizadas as contribuições para a Segurança Social dos trabalhadores independentes?",
    opcoes: [
      { texto: "Mensalmente, com base na faturação do mês anterior.", porque: "As contribuições não são recalculadas todos os meses com base na faturação recente." },
      { texto: "Trimestralmente, com base na declaração trimestral de rendimentos.", porque: "Os trabalhadores independentes submetem uma declaração trimestral a SS, que serve de base ao cálculo das contribuições do trimestre seguinte." },
      { texto: "Anualmente, com base na declaração de IRS do ano anterior.", porque: "A atualização principal e trimestral (declaração trimestral), embora a SS também faca um acerto anual com base nos rendimentos definitivos." },
      { texto: "Nunca — o valor é fixo desde o início da atividade.", porque: "As contribuições são atualizadas periodicamente com base nos rendimentos declarados." },
    ],
    correta: 1,
    legalBasis: "Declaração trimestral — Código Contributivo",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-38",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Até quando deve ser entregue a declaração trimestral de rendimentos a Segurança Social?",
    opcoes: [
      { texto: "Até ao último dia do mês seguinte ao final de cada trimestre (abril, julho, outubro, janeiro).", porque: "A declaração trimestral deve ser entregue até ao último dia do mês seguinte ao trimestre civil a que respeita." },
      { texto: "Até 31 de marco de cada ano.", porque: "31 de marco não é o prazo generico — a declaração é trimestral, com prazos específicos em cada trimestre." },
      { texto: "Até ao dia 20 de cada mês.", porque: "Dia 20 é o prazo de pagamento das contribuições mensais, não da declaração trimestral." },
      { texto: "Não existe declaração trimestral — só a anual.", porque: "A declaração trimestral é obrigatória para trabalhadores independentes desde 2019." },
    ],
    correta: 0,
    legalBasis: "Declaração trimestral SS — prazo até ao último dia do mês seguinte ao trimestre",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-39",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Um trabalhador que acumula emprego por conta de outrem (TCO) com atividade independente (TI) — em que condições pode ficar isento de contribuições da SS como independente?",
    opcoes: [
      { texto: "Nunca — paga sempre SS como independente, independentemente do emprego por conta de outrem.", porque: "Existe isenção de SS como independente quando o rendimento relevante da atividade independente não excede determinados limiares e o trabalho dependente gera contribuições suficientes." },
      { texto: "Se o rendimento mensal medio da atividade independente não ultrapassar 4 x IAS (2.148,52 €) e a entidade empregadora descontar sobre pelo menos 1 x IAS.", porque: "Quando o trabalhador acumula TCO com TI, fica isento de SS como independente se o rendimento medio mensal de TI não exceder 4 x IAS e se a entidade empregadora cumprir o mínimo contributivo." },
      { texto: "Basta ter contrato de trabalho — fica automaticamente isento.", porque: "Ter contrato de trabalho não garante isenção automática — e preciso que se cumpram os limiares de rendimento." },
      { texto: "Se faturar menos de 15.000 € por ano como independente.", porque: "O limiar de 15.000 € refere-se a isenção de IVA (Art. 53.º CIVA), não a isenção contributiva em acumulação." },
    ],
    correta: 1,
    legalBasis: "Art. 157.º Código Contributivo — isenção em acumulação TCO + TI",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-40",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "As contribuições para a Segurança Social são pagas:",
    opcoes: [
      { texto: "Anualmente, no acerto do IRS.", porque: "As contribuições da SS são mensais, não anuais. O IRS é a SS são obrigações distintas." },
      { texto: "Mensalmente, até ao dia 20 do mês seguinte.", porque: "O pagamento das contribuições para a SS é feito mensalmente, com prazo até ao dia 20 do mês seguinte aquele a que se referem." },
      { texto: "Trimestralmente, junto com a declaração trimestral.", porque: "A declaração trimestral serve para calcular as contribuições, mas o pagamento e mensal." },
      { texto: "Apenas quando se emite um recibo verde.", porque: "As contribuições da SS são periódicas (mensais), não estão indexadas a emissão de recibos individuais." },
    ],
    correta: 1,
    legalBasis: "Pagamento mensal de contribuições SS — até ao dia 20 do mês seguinte",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-41",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Que proteção social confere a Segurança Social a um trabalhador independente que contribua regularmente?",
    opcoes: [
      { texto: "Apenas reforma (pensão de velhice).", porque: "Alem da pensão de velhice, a SS confere proteção em doença, parentalidade, desemprego involuntario (com condições) e invalidez." },
      { texto: "Nenhuma — as contribuições são apenas um imposto.", porque: "As contribuições para a SS dão acesso a prestações sociais (doença, parentalidade, desemprego, pensões)." },
      { texto: "Protecao em doença, parentalidade, desemprego involuntario (com condições), invalidez e pensão de velhice.", porque: "Um trabalhador independente que contribui regularmente tem acesso a varias prestações: subsidio de doença, parentalidade, desemprego (se cumprir condições), invalidez e pensão de velhice." },
      { texto: "Apenas subsidio de doença e parentalidade.", porque: "A proteção é mais ampla, incluindo também desemprego involuntario (com condições), invalidez e pensão de velhice." },
    ],
    correta: 2,
    legalBasis: "Código Contributivo — prestações sociais dos trabalhadores independentes",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-42",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "A Segurança Social calcula as contribuições dos independentes com base em que rendimento?",
    opcoes: [
      { texto: "No rendimento bruto (faturação total) do trimestre declarado.", porque: "A base não é o rendimento bruto total — e o 'rendimento relevante', que corresponde a uma percentagem do rendimento bruto (70% para serviços, 20% para bens)." },
      { texto: "No rendimento relevante: 70% do rendimento bruto (serviços) ou 20% (bens) do trimestre declarado.", porque: "A SS aplica a taxa de 21,4% sobre o rendimento relevante, que é 70% do rendimento bruto para serviços ou 20% para vendas de bens." },
      { texto: "No lucro liquido após dedução de todas as despesas.", porque: "A SS não usa o lucro liquido — usa percentagens fixas do rendimento bruto (rendimento relevante)." },
      { texto: "No rendimento coletável apurado na declaração de IRS.", porque: "A SS não usa o rendimento coletável do IRS — tem a sua própria base de cálculo." },
    ],
    correta: 1,
    legalBasis: "Rendimento relevante — 70% (serviços) ou 20% (bens) do rendimento bruto",
    fonte: fonte("segSocialGov"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 5 — IRS anual: declaração, escalões, liquidação (ger-43 a ger-55)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-43",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que é o Modelo 3 de IRS?",
    opcoes: [
      { texto: "A declaração anual de rendimentos entregue pelo contribuinte a AT.", porque: "O Modelo 3 e a declaração anual de IRS, onde o contribuinte declara os rendimentos obtidos no ano anterior, deduções e outras informações fiscais." },
      { texto: "Um formulario para abrir atividade nas Finanças.", porque: "A abertura de atividade faz-se atraves de uma declaração de início de atividade, não do Modelo 3." },
      { texto: "A declaração trimestral de rendimentos da Segurança Social.", porque: "A declaração trimestral da SS é um documento distinto do Modelo 3 de IRS." },
      { texto: "O comprovativo de pagamento de IVA.", porque: "O Modelo 3 e a declaração anual de IRS, não se relaciona com o pagamento de IVA." },
    ],
    correta: 0,
    legalBasis: "Modelo 3 — declaração anual de IRS (Art. 57.º CIRS)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-44",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Em que período do ano se entrega normalmente o Modelo 3 de IRS?",
    opcoes: [
      { texto: "Janeiro a marco.", porque: "O período de entrega do IRS é de 1 de abril a 30 de junho, não de janeiro a marco." },
      { texto: "Abril a junho (1 de abril a 30 de junho).", porque: "O Modelo 3 de IRS é entregue entre 1 de abril e 30 de junho do ano seguinte ao dos rendimentos." },
      { texto: "Julho a setembro.", porque: "Julho a setembro não é o período de entrega — é de abril a junho." },
      { texto: "Pode ser entregue em qualquer altura do ano.", porque: "Ha um período legal definido para entrega: de 1 de abril a 30 de junho." },
    ],
    correta: 1,
    legalBasis: "Art. 60.º CIRS — prazo de entrega da declaração de IRS (abril a junho)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-45",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual o anexo do Modelo 3 onde se declaram os rendimentos da categoria B (trabalho independente)?",
    opcoes: [
      { texto: "Anexo A.", porque: "O Anexo A e para rendimentos da categoria A (trabalho dependente) e H (pensões)." },
      { texto: "Anexo B.", porque: "O Anexo B destina-se a declarar rendimentos da categoria B (rendimentos empresariais e profissionais) no regime simplificado." },
      { texto: "Anexo E.", porque: "O Anexo É e para rendimentos de capitais (categoria E)." },
      { texto: "Anexo G.", porque: "O Anexo G e para incrementos patrimoniais (mais-valias, categoria G)." },
    ],
    correta: 1,
    legalBasis: "Anexo B do Modelo 3 — rendimentos da categoria B (regime simplificado)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-46",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "É se o trabalhador independente estiver na contabilidade organizada, qual o anexo a usar?",
    opcoes: [
      { texto: "Anexo B, o mesmo do regime simplificado.", porque: "O Anexo B e para o regime simplificado. Na contabilidade organizada, usa-se o Anexo C." },
      { texto: "Anexo C.", porque: "O Anexo C do Modelo 3 destina-se a declarar rendimentos da categoria B apurados pela contabilidade organizada." },
      { texto: "Anexo D.", porque: "O Anexo D e para transparência fiscal (sociedades profissionais), não para contabilidade organizada individual." },
      { texto: "Anexo A.", porque: "O Anexo A e para rendimentos do trabalho dependente (categoria A), não para contabilidade organizada." },
    ],
    correta: 1,
    legalBasis: "Anexo C do Modelo 3 — rendimentos Cat. B (contabilidade organizada)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-47",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Após a entrega da declaração de IRS, a AT emite uma 'nota de liquidação'. O que é?",
    opcoes: [
      { texto: "Um aviso de que há erros na declaração.", porque: "A nota de liquidação não é um aviso de erros — é o documento com o cálculo final do IRS." },
      { texto: "O documento oficial com o cálculo do IRS: quanto já foi pago (retenções) e se há imposto a pagar ou reembolso a receber.", porque: "A nota de liquidação mostra o imposto apurado, o valor já retido na fonte, é o resultado final: imposto a pagar ou reembolso a favor do contribuinte." },
      { texto: "A fatura do contabilista certificado.", porque: "A nota de liquidação é emitida pela AT, não pelo contabilista." },
      { texto: "O extrato bancário com os movimentos do ano.", porque: "A nota de liquidação é um documento fiscal, não bancário." },
    ],
    correta: 1,
    legalBasis: "Nota de liquidação de IRS — Art. 75.º e seguintes CIRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-48",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "O que é 'rendimento coletável' em sede de IRS?",
    opcoes: [
      { texto: "O rendimento bruto total sem qualquer dedução.", porque: "O rendimento coletável é o rendimento bruto após aplicação de coeficientes (simplificado) ou dedução de despesas (organizado), menos deduções específicas — não é o bruto." },
      { texto: "O rendimento sobre o qual vão incidir as taxas de IRS, após aplicação de coeficientes ou dedução de despesas, é descontadas as deduções específicas.", porque: "O rendimento coletável é a base sobre a qual se calculam as taxas progressivas de IRS (Art. 68.º CIRS)." },
      { texto: "O rendimento liquido que o contribuinte recebe na conta bancária.", porque: "O rendimento liquido após imposto não é o rendimento coletável — este é uma grandeza fiscal usada no cálculo do IRS." },
      { texto: "O valor total das faturas emitidas durante o ano.", porque: "O total de faturas é o rendimento bruto, não o coletável." },
    ],
    correta: 1,
    legalBasis: "Rendimento coletável — Art. 22.º CIRS",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-49",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "O que é a 'coleta' em sede de IRS?",
    opcoes: [
      { texto: "O valor total de rendimentos declarados.", porque: "A coleta não é o rendimento total — é o resultado da aplicação das taxas de IRS ao rendimento coletável." },
      { texto: "O imposto bruto calculado pela aplicação das taxas progressivas de IRS ao rendimento coletável, antes de subtrair deduções a coleta.", porque: "A coleta é o imposto apurado pela aplicação dos escalões de IRS ao rendimento coletável. Após subtrair as deduções a coleta, obtém-se o imposto liquido." },
      { texto: "O valor das retenções na fonte efetuadas durante o ano.", porque: "As retenções na fonte são pagamentos antecipados de IRS — a coleta é o imposto calculado na declaração anual." },
      { texto: "A contribuição mensal para a Segurança Social.", porque: "A coleta é um conceito de IRS, não de Segurança Social." },
    ],
    correta: 1,
    legalBasis: "Coleta de IRS — Art. 68.º CIRS (aplicação das taxas ao rendimento coletável)",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-50",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Qual é a diferença entre 'taxa marginal' e 'taxa efetiva' de IRS?",
    opcoes: [
      { texto: "São a mesma coisa — apenas nomes diferentes para a taxa de imposto.", porque: "Não são a mesma coisa. A taxa marginal aplica-se ao último euro ganho; a taxa efetiva e a media ponderada sobre todo o rendimento." },
      { texto: "A taxa marginal é a taxa do escalão mais alto atingido pelo rendimento; a taxa efetiva é a percentagem media de imposto sobre o rendimento total.", porque: "A taxa marginal aplica-se apenas a parcela de rendimento dentro do escalão mais alto; a taxa efetiva divide o imposto total pelo rendimento coletável, mostrando a carga fiscal real." },
      { texto: "A taxa marginal é sempre mais baixa que a taxa efetiva.", porque: "É o contrário: a taxa marginal é sempre igual ou superior a taxa efetiva, pois só se aplica ao último escalão." },
      { texto: "A taxa efetiva e definida pelo contribuinte na declaração de IRS.", porque: "Nenhuma das taxas e escolhida pelo contribuinte — ambas resultam da aplicação automática dos escalões." },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — taxas progressivas de IRS (escalões)",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-51",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Em 2026, as taxas dos escalões de IRS variam entre:",
    opcoes: [
      { texto: "5% e 35%.", porque: "O escalão mais baixo e 12,5% (não 5%) e o mais alto e 48% (não 35%)." },
      { texto: "12,5% e 48%.", porque: "Em 2026, o IRS tem 9 escalões com taxas progressivas que vão de 12,5% (escalão mais baixo) a 48% (escalão mais alto)." },
      { texto: "14,5% e 53%.", porque: "14,5% era a taxa mais baixa em anos anteriores, e 53% não existe como taxa de escalão normal." },
      { texto: "10% e 50%.", porque: "Não existem escalões com taxas de 10% ou 50% em 2026." },
    ],
    correta: 1,
    legalBasis: "Art. 68.º CIRS — escalões de IRS 2026 (12,5% a 48%)",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-52",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Se a nota de liquidação de IRS indicar um reembolso, o que significa?",
    opcoes: [
      { texto: "Que o contribuinte pagou mais imposto ao longo do ano (via retenções) do que o devido, e a AT vai devolver a diferença.", porque: "O reembolso de IRS significa que as retenções na fonte (e eventuais pagamentos por conta) excederam o imposto efetivamente devido, havendo lugar a devolução." },
      { texto: "Que o contribuinte tem uma dívida a AT.", porque: "Um reembolso e o oposto de uma dívida — significa que há dinheiro a devolver ao contribuinte." },
      { texto: "Que a AT cobra juros sobre pagamentos em atraso.", porque: "Os juros por pagamentos em atraso são uma penalização, não um reembolso." },
      { texto: "Que o contribuinte deve pagar mais imposto.", porque: "Se a nota indica reembolso, e porque o contribuinte pagou em excesso, não porque deve mais." },
    ],
    correta: 0,
    legalBasis: "Reembolso de IRS — diferença entre retenções e imposto apurado",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-53",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Se a nota de liquidação de IRS indicar imposto a pagar, até quando deve ser pago?",
    opcoes: [
      { texto: "Até ao final do ano civil.", porque: "O prazo não é até ao final do ano — e até a data indicada na nota de liquidação (geralmente 31 de agosto ou a data especificada)." },
      { texto: "Até a data limite indicada na nota de liquidação (habitualmente até 31 de agosto).", porque: "O pagamento deve ser feito até a data indicada na nota de liquidação. Fora de prazo, há lugar a juros de mora e eventuais coimas." },
      { texto: "No prazo de 5 anos.", porque: "5 anos é o prazo de caducidade/prescrição, não o prazo normal de pagamento." },
      { texto: "Não há prazo — o contribuinte paga quando quiser.", porque: "Ha um prazo definido na nota de liquidação e o seu incumprimento gera juros e coimas." },
    ],
    correta: 1,
    legalBasis: "Pagamento de IRS — prazo indicado na nota de liquidação",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-54",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "O que são 'pagamentos por conta' de IRS?",
    opcoes: [
      { texto: "Pagamentos antecipados de imposto que a AT exige a trabalhadores independentes, com base no IRS do ano anterior, para regularizar a dívida fiscal ao longo do ano.", porque: "Os pagamentos por conta são adiantamentos de IRS exigidos pela AT a titulares de rendimentos da categoria B, calculados com base no penultimo ano, para evitar que todo o imposto seja pago de uma só vez." },
      { texto: "O mesmo que retenções na fonte.", porque: "Retencoes na fonte são descontadas pelo cliente na emissão do recibo; pagamentos por conta são prestações pagas diretamente pelo contribuinte a AT." },
      { texto: "Multas por atraso no pagamento de IRS.", porque: "Os pagamentos por conta não são multas — são prestações antecipadas de imposto." },
      { texto: "O pagamento da Segurança Social.", porque: "Pagamentos por conta referem-se ao IRS, não a Segurança Social." },
    ],
    correta: 0,
    legalBasis: "Art. 102.º CIRS — pagamentos por conta de IRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-55",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Quantos escalões de IRS existem em 2026?",
    opcoes: [
      { texto: "5 escalões.", porque: "Em anos passados houve menos escalões, mas em 2026 são 9." },
      { texto: "7 escalões.", porque: "7 escalões era a estrutura anterior — em 2026, são 9 escalões." },
      { texto: "9 escalões.", porque: "Em 2026, o IRS tem 9 escalões progressivos, com taxas de 12,5% a 48%." },
      { texto: "12 escalões.", porque: "Não existem 12 escalões de IRS em Portugal — são 9 em 2026." },
    ],
    correta: 2,
    legalBasis: "Art. 68.º CIRS — 9 escalões de IRS em 2026",
    fonte: fonte("art68cirs"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 6 — IVA para independentes (ger-56 a ger-63)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-56",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que é o IVA (Imposto sobre o Valor Acrescentado)?",
    opcoes: [
      { texto: "Um imposto sobre o rendimento pessoal.", porque: "O imposto sobre o rendimento pessoal e o IRS. O IVA é um imposto sobre o consumo." },
      { texto: "Um imposto indireto sobre o consumo, cobrado em cada transação de bens ou serviços.", porque: "O IVA é um imposto indireto sobre o consumo que incide sobre a maioria das transações de bens e serviços, sendo o consumidor final quem suporta o imposto." },
      { texto: "Uma contribuição para a Segurança Social.", porque: "As contribuições para a SS são distintas do IVA — este é um imposto sobre o consumo." },
      { texto: "Uma taxa fixa de 23% aplicada apenas a importações.", porque: "O IVA aplica-se a todas as transmissões de bens e prestações de serviços (não só importações) e tem varias taxas, não apenas 23%." },
    ],
    correta: 1,
    legalBasis: "Código do IVA — imposto sobre o consumo",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-57",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Qual é o limiar de faturação anual abaixo do qual um trabalhador independente pode beneficiar da isenção de IVA (Art. 53.º CIVA)?",
    opcoes: [
      { texto: "10.000 €.", porque: "O limiar de isenção de IVA é de 15.000 € (atualizado), não de 10.000 €." },
      { texto: "15.000 €.", porque: "A isenção de IVA ao abrigo do Art. 53.º CIVA aplica-se a contribuintes que faturam até 15.000 € por ano." },
      { texto: "25.000 €.", porque: "25.000 € não é o limiar de isenção de IVA — e 15.000 €." },
      { texto: "Não há limiar — a isenção é automática para todos os freelancers.", porque: "A isenção depende de um limiar de faturação anual (15.000 €), não é automática." },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA — isenção de IVA para pequenos contribuintes (até 15.000 €)",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-58",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um freelancer isento de IVA (Art. 53.º CIVA) deve indicar algo no recibo verde?",
    opcoes: [
      { texto: "Não — emite o recibo normalmente sem qualquer menção.", porque: "É obrigatório indicar a isenção de IVA no recibo, citando o artigo aplicável." },
      { texto: "Sim — deve mencionar 'IVA — isenção ao abrigo do Art. 53.º do CIVA'.", porque: "O recibo deve conter a menção expressa da isenção de IVA é do artigo que a fundamenta (Art. 53.º CIVA)." },
      { texto: "Sim — deve cobrar 23% de IVA é depois pedir reembolso.", porque: "Quem está isento não cobra IVA — a isenção significa que não há IVA a cobrar nem a entregar." },
      { texto: "Sim — deve indicar 'IVA a 0%'.", porque: "A isenção não é uma taxa de 0% — é uma dispensa de IVA, que deve ser mencionada com referência ao artigo." },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA — menção obrigatória da isenção no recibo",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-59",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um freelancer isento de IVA (Art. 53.º CIVA) pode deduzir o IVA das suas compras profissionais?",
    opcoes: [
      { texto: "Sim — pode pedir o reembolso de todo o IVA pago em compras.", porque: "Quem está isento de IVA não cobra IVA nem pode deduzir o IVA suportado nas compras — e a contrapartida da isenção." },
      { texto: "Não — a isenção de IVA implica que não cobra IVA mas também não pode deduzir o IVA suportado.", porque: "A isenção do Art. 53.º CIVA é uma 'isenção simples': dispensa de cobrança de IVA mas sem direito a dedução do IVA suportado." },
      { texto: "Sim, mas apenas em despesas de saúde.", porque: "A dedução de IVA não é seletiva por tipo de despesa — e totalmente excluída para isentos do Art. 53.º." },
      { texto: "Depende do volume de compras.", porque: "A impossibilidade de deduzir IVA é absoluta para quem está isento ao abrigo do Art. 53.º, independentemente do volume de compras." },
    ],
    correta: 1,
    legalBasis: "Art. 53.º e 54.º CIVA — isenção simples sem direito a dedução",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-60",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Se um freelancer ultrapassar os 15.000 € de faturação anual, o que acontece em relação ao IVA?",
    opcoes: [
      { texto: "Nada — a isenção mantém-se até ao final do ano seguinte.", porque: "Ao ultrapassar o limiar, há obrigação de comunicar a AT e passar a cobrar IVA, com prazos legais definidos." },
      { texto: "Deve comunicar a AT, alterar o enquadramento de IVA é passar a cobrar e entregar IVA nas operações subsequentes.", porque: "Ao exceder os 15.000 €, o contribuinte perde a isenção é deve comunicar a AT, passando a cobrar IVA é a entregar declarações periódicas de IVA." },
      { texto: "É automaticamente multado em 10% do valor excedido.", porque: "Não há multa automática — há obrigação de alteração de enquadramento e regularização." },
      { texto: "Pode continuar isento se compensar com mais despesas.", porque: "O limiar de isenção baseia-se na faturação, não no lucro. Não é possível compensar com despesas." },
    ],
    correta: 1,
    legalBasis: "Art. 53.º e 58.º CIVA — perda da isenção por ultrapassagem do limiar",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-61",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é a taxa normal de IVA em Portugal continental?",
    opcoes: [
      { texto: "18%.", porque: "18% não é a taxa normal de IVA em Portugal continental — e 23%." },
      { texto: "21%.", porque: "21% é a taxa normal de IVA em Espanha, não em Portugal continental." },
      { texto: "23%.", porque: "A taxa normal de IVA em Portugal continental é de 23% (Art. 18.º CIVA)." },
      { texto: "25%.", porque: "25% não é a taxa de IVA em vigor em Portugal." },
    ],
    correta: 2,
    legalBasis: "Art. 18.º CIVA — taxa normal de IVA = 23% (continente)",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-62",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Qual é o limiar de faturação abaixo do qual um trabalhador independente fica dispensado de retenção na fonte de IRS?",
    opcoes: [
      { texto: "10.000 €.", porque: "O limiar de dispensa de retenção é de 15.000 € (Art. 101.º-B CIRS), não de 10.000 €." },
      { texto: "15.000 €.", porque: "Ao abrigo do Art. 101.º-B CIRS, o trabalhador independente que não tenha recebido mais de 15.000 € no ano anterior fica dispensado de retenção na fonte." },
      { texto: "25.000 €.", porque: "25.000 € não é o limiar de dispensa de retenção — e 15.000 €." },
      { texto: "Não há dispensa — a retenção é sempre obrigatória.", porque: "Existe dispensa de retenção para quem recebeu menos de 15.000 € no ano anterior (Art. 101.º-B CIRS)." },
    ],
    correta: 1,
    legalBasis: "Art. 101.º-B CIRS — dispensa de retenção na fonte (até 15.000 €)",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ger-63",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "O limiar de 15.000 € para isenção de IVA (Art. 53.º CIVA) é para dispensa de retenção (Art. 101.º-B CIRS) são a mesma coisa?",
    opcoes: [
      { texto: "Sim — são exatamente o mesmo regime é produzem os mesmos efeitos.", porque: "Embora o limiar seja coincidente (15.000 €), são regimes distintos: um refere-se ao IVA, o outro a retenção de IRS, com regras e consequências próprias." },
      { texto: "Não — são regimes distintos (IVA vs. retenção IRS), embora o limiar de referência coincida em 15.000 €.", porque: "A isenção de IVA é a dispensa de retenção são regimes independentes, com fundamentos legais diferentes, apesar de o limiar de faturação ser coincidente." },
      { texto: "Não — o limiar de IVA é 10.000 € e o de retenção é 15.000 €.", porque: "Ambos os limiares são de 15.000 € — a diferença está no regime, não no valor." },
      { texto: "Sim, é perder um significa perder automaticamente o outro.", porque: "Embora sejam frequentemente perdidos em simultaneo (mesmo limiar), são avaliados independentemente e com base em criterios próprios." },
    ],
    correta: 1,
    legalBasis: "Art. 53.º CIVA e Art. 101.º-B CIRS — regimes distintos, limiar coincidente",
    fonte: fonte("portalFinancasIVA"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 7 — E-fatura, faturas, Portal das Finanças (ger-64 a ger-72)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-64",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que é o sistema e-fatura?",
    opcoes: [
      { texto: "O sistema onde os contribuintes emitem recibos verdes.", porque: "Os recibos verdes são emitidos no Portal das Finanças, não no e-fatura. O e-fatura e para consultar e validar faturas emitidas por terceiros." },
      { texto: "A plataforma da AT onde se consultam e validam as faturas emitidas com o NIF do contribuinte, para efeitos de deduções no IRS.", porque: "O e-fatura e o sistema da AT onde se podem consultar, confirmar e validar as faturas emitidas com o NIF do contribuinte, associando-as as categorias de dedução em IRS." },
      { texto: "Uma app bancária para pagamentos.", porque: "O e-fatura não é uma app bancária — é um portal fiscal da AT." },
      { texto: "O sistema de faturação obrigatória para empresas.", porque: "O e-fatura e o portal de consulta pelo contribuinte, não o sistema de faturação empresarial (programas certificados)." },
    ],
    correta: 1,
    legalBasis: "E-fatura — sistema de verificação de faturas (AT)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-65",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Porque é importante validar as faturas no e-fatura?",
    opcoes: [
      { texto: "Não é importante — não afeta o IRS.", porque: "A validação de faturas é essencial para maximizar as deduções a coleta no IRS." },
      { texto: "Para que as despesas sejam corretamente classificadas e contabilizadas como deduções a coleta no IRS.", porque: "Ao validar as faturas no e-fatura, o contribuinte garante que as despesas são associadas a categoria correta (saúde, educação, habitação, etc.) e contam para as deduções a coleta." },
      { texto: "Apenas para evitar multas da AT.", porque: "Não há multa por não validar faturas, mas a falta de validação pode significar perda de deduções." },
      { texto: "Para pagar menos IVA.", porque: "A validação no e-fatura não afeta o IVA pago — serve para as deduções em IRS." },
    ],
    correta: 1,
    legalBasis: "Deduções a coleta — Art. 78.º CIRS é sistema e-fatura",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-66",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Qual é a diferença entre fatura, fatura-recibo e recibo?",
    opcoes: [
      { texto: "São nomes diferentes para o mesmo documento.", porque: "São documentos distintos: a fatura titula a obrigação de pagamento, o recibo comprova o pagamento, e a fatura-recibo combina ambas as funções." },
      { texto: "A fatura titula a venda/prestação (obrigação de pagamento); o recibo comprova o pagamento; a fatura-recibo combina ambas as funções num só documento.", porque: "A fatura documenta a transação, o recibo prova o pagamento, e a fatura-recibo (vulgo 'recibo verde') faz ambas as funções em simultaneo." },
      { texto: "A fatura e para empresas e o recibo e para freelancers.", porque: "Freelancers podem emitir faturas, faturas-recibo ou recibos, dependendo da situação — não há exclusividade por tipo de contribuinte." },
      { texto: "A fatura-recibo é apenas para valores acima de 1.000 €.", porque: "Não existe limiar de valor — a fatura-recibo pode ser emitida para qualquer montante." },
    ],
    correta: 1,
    legalBasis: "Tipos de documentos fiscais — CIVA é Portal das Finanças",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-67",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O 'recibo verde' que os freelancers emitem no Portal das Finanças e, tecnicamente, que tipo de documento?",
    opcoes: [
      { texto: "Uma nota de crédito.", porque: "Uma nota de crédito serve para anular ou corrigir uma fatura, não para titular uma prestação de serviços." },
      { texto: "Uma fatura-recibo: documenta a prestação de serviços e serve simultaneamente de comprovativo de pagamento.", porque: "O 'recibo verde eletrónico' e, na prática, uma fatura-recibo — combina a fatura (obrigação) e o recibo (prova de pagamento) num único documento." },
      { texto: "Uma fatura proforma.", porque: "Uma proforma é um orçamento sem valor fiscal — o recibo verde tem valor fiscal pleno." },
      { texto: "Uma guia de transporte.", porque: "A guia de transporte acompanha mercadorias em trânsito, não tem relação com recibos verdes." },
    ],
    correta: 1,
    legalBasis: "Recibo verde eletrónico = fatura-recibo (Portal das Finanças)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-68",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "O que acontece se o freelancer se esquecer de emitir o recibo verde por um serviço prestado?",
    opcoes: [
      { texto: "Não há consequências — o recibo é opcional.", porque: "A emissão do recibo é obrigatória. Não emitir constitui infração fiscal, podendo resultar em coimas." },
      { texto: "Pode emitir o recibo fora de prazo, mas arrisca coimas pela emissão tardia, é o rendimento continua a ser tributável.", porque: "O contribuinte deve regularizar a situação emitindo o recibo. O atraso pode gerar coimas, é o rendimento não declarado continua sujeito a tributação." },
      { texto: "O cliente e obrigado a emitir o recibo em nome do freelancer.", porque: "A obrigação de emitir o recibo e do prestador de serviços, não do cliente." },
      { texto: "A AT emite automaticamente o recibo.", porque: "A AT não emite recibos automaticamente — a obrigação e do contribuinte." },
    ],
    correta: 1,
    legalBasis: "Obrigação de faturação — Art. 115.º CIRS é RGIT (coimas)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-69",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Para aceder ao Portal das Finanças, o contribuinte precisa de:",
    opcoes: [
      { texto: "Apenas o NIF.", porque: "Alem do NIF, é necessária uma senha de acesso ou autenticação por Chave Móvel Digital." },
      { texto: "NIF e senha de acesso ao Portal das Finanças (ou Chave Móvel Digital).", porque: "O acesso ao Portal das Finanças requer autenticação com NIF mais senha de acesso ou, alternativamente, Chave Móvel Digital." },
      { texto: "Apenas o número de cartão de cidadão.", porque: "O acesso ao Portal das Finanças usa o NIF (não o CC) é uma senha ou CMD." },
      { texto: "Uma procuração de um contabilista.", porque: "O contribuinte pode aceder diretamente sem procuração — a procuração só é necessária se quiser delegar acesso a um terceiro." },
    ],
    correta: 1,
    legalBasis: "Acesso ao Portal das Finanças — autenticação com NIF + senha ou CMD",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-70",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Até quando deve ser validado o NIF nas faturas pendentes no e-fatura, para efeitos de deduções no IRS?",
    opcoes: [
      { texto: "Até 30 de junho do ano seguinte.", porque: "30 de junho é o prazo de entrega do IRS, não o prazo de validação de faturas no e-fatura." },
      { texto: "Até 25 de fevereiro do ano seguinte ao das despesas.", porque: "O prazo para validar e classificar faturas no e-fatura e até 25 de fevereiro do ano seguinte, para que sejam consideradas no IRS." },
      { texto: "Não há prazo — pode ser feito a qualquer momento.", porque: "Ha um prazo legal (25 de fevereiro do ano seguinte) após o qual as faturas não validadas podem não contar para deduções." },
      { texto: "Até 31 de dezembro do próprio ano.", porque: "O prazo termina no ano seguinte (25 de fevereiro), não no final do ano das despesas." },
    ],
    correta: 1,
    legalBasis: "Prazo de validação de faturas no e-fatura — até 25 de fevereiro",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-71",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Pedir fatura com NIF nas compras pessoais (supermercado, farmacia, restaurante) tem alguma vantagem fiscal?",
    opcoes: [
      { texto: "Não — só serve para empresas.", porque: "As faturas com NIF de pessoas singulares também contam para deduções a coleta no IRS." },
      { texto: "Sim — permite acumular deduções a coleta no IRS (despesas gerais familiares, saúde, educação, etc.).", porque: "Ao pedir fatura com NIF, as despesas são registadas no e-fatura e podem contar para as deduções a coleta no IRS (ex.: despesas gerais familiares até 250 €, saúde, educação)." },
      { texto: "Sim, mas apenas para despesas acima de 100 €.", porque: "Não há limiar mínimo por fatura — todas as faturas com NIF contam para deduções." },
      { texto: "Sim, mas apenas se o contribuinte for freelancer.", porque: "Qualquer contribuinte singular beneficia das deduções — não é exclusivo de freelancers." },
    ],
    correta: 1,
    legalBasis: "Deduções a coleta — Art. 78.º CIRS é sistema e-fatura",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-72",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Quais são as principais deduções a coleta disponíveis em IRS em 2026?",
    opcoes: [
      { texto: "Apenas despesas de saúde.", porque: "As deduções a coleta são muito mais amplas, incluindo saúde, educação, habitação, despesas gerais familiares, entre outras." },
      { texto: "Saúde (15%, até 1.000 €), educação (30%, até 800 €), habitação/renda (15%, até 900 €), despesas gerais familiares (35%, até 250 €), entre outras.", porque: "Em 2026, as deduções a coleta incluem saúde (15%, max 1.000 €), educação (30%, max 800 €), renda/habitação (15%, max 900 €), despesas gerais (35%, max 250 €), e ainda lares, deficiência, pensões de alimentos, etc." },
      { texto: "Só existem deduções se o contribuinte tiver contabilidade organizada.", porque: "As deduções a coleta estão disponíveis para todos os contribuintes de IRS, independentemente do regime." },
      { texto: "Não existem deduções a coleta — todo o rendimento é tributado.", porque: "O IRS prevê diversas deduções a coleta que reduzem o imposto a pagar." },
    ],
    correta: 1,
    legalBasis: "Art. 78.º e seguintes CIRS — deduções a coleta (2026)",
    fonte: fonte("art68cirs"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 8 — Mitos, dicas práticas e erros comuns (ger-73 a ger-82)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-73",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Mito ou realidade: 'Se emitir recibos verdes, pago sempre mais impostos do que um trabalhador por conta de outrem.'",
    opcoes: [
      { texto: "Realidade — os freelancers pagam sempre mais.", porque: "Não é necessariamente verdade. Depende do volume de rendimento, das despesas, do coeficiente é das deduções aplicáveis. Pode até pagar menos." },
      { texto: "Mito — a carga fiscal depende de muitos fatores (rendimento, coeficientes, despesas, deduções) e pode ser igual ou inferior.", porque: "A carga fiscal de um independente depende do regime, coeficientes, deduções e volume de rendimento. Não é automaticamente superior a de um trabalhador dependente." },
      { texto: "Realidade — mas só se faturar mais de 50.000 €.", porque: "A comparação não depende de um limiar fixo — varia caso a caso." },
      { texto: "Mito — os freelancers são sempre isentos de IRS.", porque: "Os freelancers não são isentos de IRS. A afirmação correta e que a carga fiscal depende das circunstancias individuais." },
    ],
    correta: 1,
    legalBasis: "Tributação de rendimentos Cat. B vs. Cat. A — análise casuistica",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-74",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Mito ou realidade: 'Estar isento de IVA significa que não pago nenhum imposto.'",
    opcoes: [
      { texto: "Realidade — isenção de IVA dispensa de todos os impostos.", porque: "A isenção de IVA só dispensa da obrigação de cobrar e entregar IVA. O freelancer continua sujeito a IRS é a Segurança Social." },
      { texto: "Mito — a isenção de IVA é apenas relativa ao IVA; o IRS é a Segurança Social continuam a ser devidos.", porque: "Estar isento de IVA não isenta de IRS nem de contribuições para a SS — são obrigações independentes." },
      { texto: "Realidade — mas só para rendimentos abaixo de 5.000 €.", porque: "Não existe isenção total de impostos para rendimentos baixos — apenas regimes específicos para cada imposto/contribuição." },
      { texto: "Mito — mas apenas porque a SS e voluntária.", porque: "A SS não é voluntária para independentes (salvo isenções específicas). A razão e que IVA, IRS é SS são obrigações distintas." },
    ],
    correta: 1,
    legalBasis: "Isenção de IVA (Art. 53.º CIVA) vs. IRS é Segurança Social — obrigações independentes",
    fonte: fonte("portalFinancasIVA"),
  },
  {
    id: "ger-75",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Qual é uma boa prática financeira para um freelancer em relação ao pagamento de impostos?",
    opcoes: [
      { texto: "Gastar tudo o que recebe é pagar impostos com empréstimo.", porque: "Está é uma prática de risco elevado — os impostos são obrigações certas que devem ser provisionadas." },
      { texto: "Reservar uma percentagem de cada recibo (ex.: 25-30%) para impostos e Segurança Social.", porque: "Reservar regularmente uma parte de cada rendimento para impostos e SS é uma prática fundamental de gestão financeira para freelancers." },
      { texto: "Esperar pela nota de liquidação é pagar tudo de uma vez.", porque: "Esperar pelo último momento pode resultar em dificuldades de tesouraria é pagamentos em atraso com juros." },
      { texto: "Não declarar rendimentos para evitar impostos.", porque: "A evasao fiscal e ilegal e pode resultar em coimas, juros e processos criminais." },
    ],
    correta: 1,
    legalBasis: "Boas práticas de gestão fiscal para trabalhadores independentes",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-76",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um freelancer deve guardar as faturas e comprovativos de despesas durante quanto tempo?",
    opcoes: [
      { texto: "1 ano.", porque: "1 ano e insuficiente — a AT pode fiscalizar rendimentos dos últimos 4 anos (ou mais em certos casos)." },
      { texto: "Pelo menos 4 anos (prazo geral de caducidade do direito a liquidação).", porque: "O prazo geral de caducidade é de 4 anos (Art. 45.º LGT), durante o qual a AT pode rever as declarações. É prudente guardar documentação pelo menos durante este período." },
      { texto: "10 anos.", porque: "Embora 10 anos seja conservador, o prazo legal geral de caducidade é de 4 anos." },
      { texto: "Não é necessário guardar faturas — o e-fatura substitui tudo.", porque: "Embora o e-fatura registe faturas, e prudente manter comprovativos próprios, especialmente para despesas da atividade." },
    ],
    correta: 1,
    legalBasis: "Art. 45.º LGT — prazo de caducidade de 4 anos",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-77",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Um trabalhador independente pode emitir atos isolados em vez de abrir atividade, indefinidamente?",
    opcoes: [
      { texto: "Sim — o ato isolado substitui a abertura de atividade.", porque: "O ato isolado e para situações pontuais/ocasionais. Emitir atos isolados com regularidade pode ser requalificado pela AT como exercício de atividade, obrigando a abertura formal." },
      { texto: "Não — o ato isolado destina-se a situações ocasionais. A repetição sistematica pode levar a AT a exigir abertura de atividade.", porque: "Se a AT concluir que há regularidade na prestação de serviços (e não ocasionalidade), pode exigir a abertura de atividade e aplicar coimas." },
      { texto: "Sim, desde que cada ato isolado seja para um cliente diferente.", porque: "A lei não permite contornar a obrigação de abrir atividade apenas variando os clientes — o criterio e a regularidade." },
      { texto: "Sim, até 3 atos isolados por ano.", porque: "Não há um limite legal fixo de atos isolados por ano — o criterio e a ocasionalidade vs. regularidade." },
    ],
    correta: 1,
    legalBasis: "Ato isolado — prestação de carater ocasional vs. atividade regular",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-78",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um freelancer que tenha simultaneamente emprego por conta de outrem (TCO) deve declarar ambos os rendimentos no IRS?",
    opcoes: [
      { texto: "Não — só declara o que tiver maior valor.", porque: "Todos os rendimentos devem ser declarados, independentemente do valor relativo de cada um." },
      { texto: "Sim — deve declarar os rendimentos da categoria A (emprego) e da categoria B (independente) na mesma declaração de IRS.", porque: "O IRS é um imposto sobre o rendimento global. Havendo rendimentos de varias categorias, todos devem ser incluídos na mesma declaração (Modelo 3)." },
      { texto: "Não — os rendimentos de categoria A já são retidos pelo empregador e não precisam de declaração.", porque: "Mesmo com retenção na fonte pelo empregador, os rendimentos da categoria A devem ser declarados no IRS para apuramento do imposto global." },
      { texto: "Depende — só declara os rendimentos de categoria B se ultrapassarem 5.000 €.", porque: "Não existe limiar de valor para dispensa de declaração — todos os rendimentos devem ser incluídos." },
    ],
    correta: 1,
    legalBasis: "Art. 22.º CIRS — englobamento obrigatório de rendimentos",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-79",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que acontece se um freelancer não entregar a declaração de IRS dentro do prazo?",
    opcoes: [
      { texto: "Nada — o prazo é apenas indicativo.", porque: "O prazo é obrigatório. O incumprimento gera coimas é a AT pode fixar o rendimento oficiosamente." },
      { texto: "Pode ser sujeito a coimas (multas) e a AT pode proceder a liquidação oficiosa do imposto.", porque: "A entrega fora de prazo constitui infração fiscal, sujeita a coimas. A AT pode ainda fixar oficiosamente o rendimento se não houver declaração." },
      { texto: "Perde automaticamente todas as deduções do ano.", porque: "A perda de deduções não é a consequência direta — o principal risco são coimas é liquidação oficiosa." },
      { texto: "É proibido de emitir recibos verdes no ano seguinte.", porque: "Não há bloqueio de emissão de recibos por falta de entrega do IRS — mas há coimas é penalizações fiscais." },
    ],
    correta: 1,
    legalBasis: "RGIT — coimas por falta de entrega da declaração de IRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-80",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Mito ou realidade: 'Se faturar pouco, não preciso de abrir atividade — basta emitir um ato isolado por serviço.'",
    opcoes: [
      { texto: "Realidade — até 15.000 €/ano, basta o ato isolado.", porque: "O criterio não é o valor, mas a regularidade. Se a atividade for regular (mesmo com valores baixos), deve abrir atividade nas Finanças." },
      { texto: "Mito — o ato isolado e para situações verdadeiramente ocasionais (sem regularidade), independentemente do valor.", porque: "O que determina se deve abrir atividade e a regularidade (ou previsibilidade de continuidade), não o volume de faturação." },
      { texto: "Realidade — desde que seja para clientes diferentes.", porque: "A diversidade de clientes não substitui o criterio de regularidade na avaliação da AT." },
      { texto: "Realidade — o ato isolado não tem qualquer limitação.", porque: "O ato isolado destina-se a prestações verdadeiramente ocasionais e não é um substituto para a abertura de atividade." },
    ],
    correta: 1,
    legalBasis: "Ato isolado — criterio de ocasionalidade vs. abertura de atividade",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-81",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um freelancer pode alterar o código de atividade (CIRS) depois de abrir atividade?",
    opcoes: [
      { texto: "Não — o código e definitivo e não pode ser alterado.", porque: "É possível alterar o código de atividade atraves de uma declaração de alterações no Portal das Finanças." },
      { texto: "Sim — pode submeter uma declaração de alterações no Portal das Finanças para modificar ou acrescentar codigos de atividade.", porque: "O contribuinte pode, a qualquer momento, alterar o seu enquadramento de atividade (codigos CIRS) atraves de uma declaração de alterações." },
      { texto: "Sim, mas apenas uma vez por ano.", porque: "Não existe limite de frequência — pode alterar sempre que necessário." },
      { texto: "Sim, mas tem de cessar atividade e abrir uma nova.", porque: "Não é necessário cessar e reabrir — basta submeter uma declaração de alterações." },
    ],
    correta: 1,
    legalBasis: "Declaração de alterações — Art. 112.º CIRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-82",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Se um freelancer receber um pagamento em atraso (ex.: serviço prestado em dezembro mas pago em fevereiro do ano seguinte), em que ano se declara o rendimento?",
    opcoes: [
      { texto: "No ano em que o serviço foi prestado (dezembro).", porque: "Nos recibos verdes, o rendimento é normalmente declarado no momento do recebimento (caixa), não no momento da prestação." },
      { texto: "No ano em que o pagamento foi efetivamente recebido (fevereiro do ano seguinte).", porque: "No regime simplificado, aplica-se regra geral o criterio de caixa: o rendimento é declarado no ano em que é recebido, sendo o recibo emitido nesse momento." },
      { texto: "Pode escolher livremente o ano.", porque: "O contribuinte não pode escolher livremente — segue o criterio de caixa (recebimento)." },
      { texto: "Em ambos os anos, repartido em 50% cada.", porque: "Não há repartição — o rendimento é declarado integralmente no ano do recebimento." },
    ],
    correta: 1,
    legalBasis: "Regime simplificado — criterio de caixa para rendimentos Cat. B",
    fonte: fonte("govptTrabIndependente"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 9 — Acumulacao TCO+TI e início de atividade (ger-83 a ger-90)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-83",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "É legal em Portugal ter emprego por conta de outrem (TCO) e, simultaneamente, ser trabalhador independente (TI)?",
    opcoes: [
      { texto: "Não — e proibido acumular as duas atividades.", porque: "Não há proibição legal generica de acumular emprego e atividade independente, salvo restrições contratuais específicas." },
      { texto: "Sim — desde que não exista clausula de exclusividade no contrato de trabalho que o impeca.", porque: "É perfeitamente legal acumular TCO e TI. A única restrição possível e contratual (clausula de exclusividade ou não-concorrência no contrato de trabalho)." },
      { texto: "Sim, mas só para rendimentos independentes abaixo de 5.000 €/ano.", porque: "Não existe limiar de valor para a acumulação — a legalidade não depende do montante faturado." },
      { texto: "Sim, mas o empregador tem de autorizar formalmente.", porque: "Na ausencia de clausula de exclusividade, não é necessária autorização formal do empregador." },
    ],
    correta: 1,
    legalBasis: "Acumulacao TCO + TI — Código do Trabalho e regime fiscal",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-84",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um jovem trabalhador que inicie atividade independente pela primeira vez — pode beneficiar do IRS Jovem?",
    opcoes: [
      { texto: "Não — o IRS Jovem só se aplica a rendimentos do trabalho dependente (categoria A).", porque: "O IRS Jovem também se aplica a rendimentos da categoria B (independentes), desde que cumpridos os requisitos de idade e conclusão de estudos." },
      { texto: "Sim — o IRS Jovem aplica-se a rendimentos das categorias A e B, desde que cumpra os requisitos de idade (até 35 anos) e tenha concluido pelo menos o ensino secundario.", porque: "O IRS Jovem (Art. 12.º-B CIRS) abrange rendimentos das categorias A e B, com isenções progressivas até 10 anos após conclusão dos estudos." },
      { texto: "Sim, mas só se faturar menos de 15.000 €.", porque: "O IRS Jovem não depende do volume de faturação — os requisitos são de idade e habilitações." },
      { texto: "Sim, mas apenas no primeiro ano de atividade.", porque: "O IRS Jovem pode ser aplicado por varios anos consecutivos (até 10 anos), não apenas no primeiro." },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-B CIRS — IRS Jovem (categorias A e B)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-85",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Se um trabalhador que acumula TCO + TI perder o emprego por conta de outrem, pode aceder ao subsidio de desemprego pela atividade independente?",
    opcoes: [
      { texto: "Não — o desemprego só cobre trabalhadores por conta de outrem.", porque: "Desde 2019, os trabalhadores independentes que contribuam regularmente podem aceder ao subsidio por cessação de atividade, com condições." },
      { texto: "Sim — se mantiver a atividade independente, pode pedir subsidio de desemprego pelo emprego perdido (categoria A), cumprindo os requisitos habituais.", porque: "Ao perder o emprego dependente, pode requerer subsidio de desemprego pelos rendimentos da categoria A, desde que cumpra os prazos de garantia. A atividade independente pode continuar em paralelo." },
      { texto: "Sim, mas perde automaticamente a atividade independente.", porque: "Não há perda automática da atividade independente por receber subsidio de desemprego — mas os rendimentos independentes podem afetar o montante do subsidio." },
      { texto: "Só se cessar também a atividade independente.", porque: "Não é obrigatória a cessação da atividade independente para requerer subsidio de desemprego pelo TCO." },
    ],
    correta: 1,
    legalBasis: "Subsidio de desemprego — Código Contributivo e DL 220/2006",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-86",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Quando um freelancer emite um recibo verde, quem e responsável por reter e entregar o IRS retido na fonte?",
    opcoes: [
      { texto: "O freelancer, que desconta e entrega o IRS a AT.", porque: "No regime de retenção na fonte, e o cliente (entidade que paga) que retém o imposto é o entrega a AT — não o freelancer." },
      { texto: "A Segurança Social.", porque: "A SS gere contribuições sociais, não retenções de IRS." },
      { texto: "A entidade que paga (cliente com contabilidade organizada), que retém o valor é o entrega a AT.", porque: "A retenção na fonte é responsabilidade da entidade pagadora: retém a percentagem aplicável ao pagar ao freelancer e entrega o montante a AT." },
      { texto: "A AT retém automaticamente ao receber o recibo.", porque: "A AT não faz retenção automática — e a entidade pagadora que retém e entrega." },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — retenção na fonte por substituto tributario",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ger-87",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um freelancer que presta serviços a particulares (pessoas singulares sem contabilidade organizada) está sujeito a retenção na fonte?",
    opcoes: [
      { texto: "Sim — a retenção aplica-se em todos os casos.", porque: "A retenção na fonte só é obrigatória quando o cliente é uma entidade com contabilidade organizada ou um sujeito passivo de IRC." },
      { texto: "Não — a retenção na fonte só é feita quando o cliente é uma entidade com contabilidade organizada ou sujeito passivo de IRC.", porque: "Quando o cliente é um particular (pessoa singular sem atividade), não há retenção na fonte. O rendimento é tributado na totalidade na declaração anual de IRS." },
      { texto: "Depende do valor do serviço.", porque: "O criterio não é o valor, mas a natureza do cliente (se e ou não obrigado a fazer retenção)." },
      { texto: "Sim, mas com taxa reduzida de 5%.", porque: "Não existe taxa de retenção de 5% — é a retenção simplesmente não se aplica a particulares." },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção na fonte (apenas por entidades com contabilidade)",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ger-88",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "O que é a retenção na fonte de IRS, no contexto dos recibos verdes?",
    opcoes: [
      { texto: "Um pagamento adicional que o freelancer faz ao cliente.", porque: "A retenção não é um pagamento do freelancer ao cliente — é um desconto no pagamento, entregue a AT." },
      { texto: "Uma taxa de penalização por atraso na emissão do recibo.", porque: "A retenção na fonte não é uma penalização — é um mecanismo de cobrança antecipada de IRS." },
      { texto: "Um adiantamento de IRS que a entidade pagadora desconta no pagamento ao freelancer e entrega a AT, sendo depois descontado no IRS anual.", porque: "A retenção na fonte é um pagamento antecipado de IRS: o cliente retém uma percentagem do valor é entrega-a a AT. No acerto anual, esse montante é descontado ao imposto devido." },
      { texto: "O imposto final que o freelancer paga, sem qualquer acerto posterior.", porque: "A retenção é um adiantamento, não o imposto final. O acerto é feito na declaração anual de IRS." },
    ],
    correta: 2,
    legalBasis: "Art. 101.º CIRS — retenção na fonte como adiantamento de IRS",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ger-89",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Ao abrir atividade nas Finanças, é obrigatório inscrever-se também na Segurança Social?",
    opcoes: [
      { texto: "Não — a inscrição na SS e voluntária.", porque: "A inscrição na SS é obrigatória para todos os trabalhadores independentes, embora a AT comunique automaticamente o início de atividade a SS." },
      { texto: "Sim — a abertura de atividade nas Finanças e comunicada a Segurança Social, que inscreve automaticamente o trabalhador.", porque: "A AT comunica o início de atividade a SS, que procede a inscrição do trabalhador independente. As contribuições iniciam após o período de isenção (se aplicável)." },
      { texto: "Só se faturar mais de 10.000 € por ano.", porque: "A inscrição na SS é obrigatória independentemente do volume de faturação." },
      { texto: "Só se não tiver emprego por conta de outrem.", porque: "Mesmo com emprego por conta de outrem, a inscrição como independente é feita — embora possa haver isenção contributiva." },
    ],
    correta: 1,
    legalBasis: "Código Contributivo — inscrição obrigatória de trabalhadores independentes na SS",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-90",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Se um freelancer quiser passar do regime simplificado para a contabilidade organizada, quando deve comunicar essa opção?",
    opcoes: [
      { texto: "A qualquer momento do ano.", porque: "A opção pela contabilidade organizada deve ser comunicada até ao final de marco do ano em que pretende que produza efeitos." },
      { texto: "Até ao final de marco do ano em que pretende que a alteração produza efeitos.", porque: "A opção pela contabilidade organizada deve ser exercida até 31 de marco, atraves de declaração de alterações no Portal das Finanças, produzindo efeitos nesse ano." },
      { texto: "Apenas no momento da abertura de atividade.", porque: "A opção pode ser exercida a posteriori, não apenas na abertura de atividade." },
      { texto: "No momento da entrega da declaração de IRS (abril a junho).", porque: "A opção deve ser exercida até marco, antes do período de entrega do IRS." },
    ],
    correta: 1,
    legalBasis: "Art. 28.º CIRS — opção pela contabilidade organizada (até 31 de marco)",
    fonte: fonte("art31"),
  },

  // ──────────────────────────────────────────────────────────────────────
  //  BLOCO 10 — Direitos, obrigações e temas avancados (ger-91 a ger-100)
  // ──────────────────────────────────────────────────────────────────────
  {
    id: "ger-91",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "Um trabalhador independente tem direito a ferias pagas?",
    opcoes: [
      { texto: "Sim — 22 dias úteis por ano, como um trabalhador por conta de outrem.", porque: "O direito a ferias pagas é uma proteção do contrato de trabalho (TCO). O freelancer não tem empregador que lhe pague ferias." },
      { texto: "Não — como independente, não tem empregador, pelo que não tem direito a ferias pagas; deve provisionar para períodos sem trabalho.", porque: "O trabalhador independente gere o seu próprio tempo e rendimento. Não há ferias pagas — deve planear financeiramente os períodos de descanso." },
      { texto: "Sim, se contribuir para a Segurança Social.", porque: "As contribuições para a SS dão acesso a prestações sociais (doença, parentalidade, etc.), mas não a ferias pagas." },
      { texto: "Sim — a Segurança Social paga um subsidio de ferias.", porque: "A SS não paga subsidio de ferias a independentes — apenas a trabalhadores por conta de outrem (indiretamente, via empregador)." },
    ],
    correta: 1,
    legalBasis: "Regime de trabalho independente — sem ferias pagas",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-92",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "Um trabalhador independente que fique doente pode receber subsidio de doença?",
    opcoes: [
      { texto: "Não — os independentes não tem acesso a nenhuma prestação de doença.", porque: "Os trabalhadores independentes que contribuam regularmente para a SS podem aceder ao subsidio de doença." },
      { texto: "Sim — desde que contribua regularmente para a Segurança Social e cumpra os prazos de garantia (em regra, 6 meses de contribuições nos últimos 12 meses).", porque: "O subsidio de doença e acessível a independentes que cumprissem os prazos de garantia exigidos pelo Código Contributivo." },
      { texto: "Sim, mas apenas se estiver no regime de contabilidade organizada.", porque: "O acesso ao subsidio de doença não depende do regime fiscal — depende das contribuições para a SS." },
      { texto: "Sim, mas só a partir do primeiro dia de doença.", porque: "O subsidio de doença para independentes tem um período de espera (em regra, 10 dias), não sendo pago desde o primeiro dia." },
    ],
    correta: 1,
    legalBasis: "Subsidio de doença — Art. 9.º e seguintes do DL 28/2004",
    fonte: fonte("segSocialGov"),
  },
  {
    id: "ger-93",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Que e a 'tributação autonoma' relevante para trabalhadores independentes no regime simplificado?",
    opcoes: [
      { texto: "Uma taxa adicional sobre os escalões mais altos de IRS.", porque: "A tributação autonoma não é uma taxa adicional sobre escalões — é uma taxa separada sobre certas despesas ou rendimentos não justificados." },
      { texto: "Uma tributação especial que incide sobre a diferença entre a presunção de despesas (coeficiente) e as despesas efetivamente comprovadas, quando estas ficam abaixo do previsto.", porque: "No regime simplificado, se o contribuinte não comprovar despesas em montante suficiente (regra dos 15%), a diferença pode ser sujeita a tributação autonoma." },
      { texto: "O imposto sobre dividendos.", porque: "A tributação de dividendos segue regras próprias (taxa liberatoria de 28%) e não se confunde com a tributação autonoma do regime simplificado." },
      { texto: "Uma contribuição extra para a Segurança Social.", porque: "A tributação autonoma é uma tributação de IRS, não uma contribuição para a SS." },
    ],
    correta: 1,
    legalBasis: "Art. 31.º, n.º 2 CIRS — tributação autonoma por insuficiência de despesas",
    fonte: fonte("art31"),
  },
  {
    id: "ger-94",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "O que é a Chave Móvel Digital (CMD) e porque é útil para um freelancer?",
    opcoes: [
      { texto: "Um cartão físico que substitui o NIF.", porque: "A CMD não é um cartão físico — é um sistema de autenticação digital." },
      { texto: "Um metodo de autenticação digital que permite aceder ao Portal das Finanças, SS Direta e outros serviços públicos, sem precisar da senha de acesso ao portal.", porque: "A CMD é um meio de autenticação eletrónico seguro, alternativo as senhas tradicionais, que permite aceder a diversos serviços públicos online, incluindo o Portal das Finanças e a SS Direta." },
      { texto: "Um software de faturação obrigatório.", porque: "A CMD não é um software de faturação — é um metodo de autenticação." },
      { texto: "Uma declaração anual exigida pela AT.", porque: "A CMD não é uma declaração — é uma ferramenta de autenticação digital." },
    ],
    correta: 1,
    legalBasis: "Chave Móvel Digital — autenticação nos serviços públicos digitais",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-95",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Se um freelancer discordar da nota de liquidação de IRS, o que pode fazer?",
    opcoes: [
      { texto: "Nada — a nota de liquidação e definitiva e irrecorrível.", porque: "O contribuinte tem direito de reclamação e recurso contra a liquidação de IRS." },
      { texto: "Apresentar reclamação graciosa junto da AT ou impugnar judicialmente, dentro dos prazos legais.", porque: "O contribuinte pode reclamar graciosamente (120 dias) ou impugnar judicialmente (90 dias) a liquidação de IRS que considere injusta ou errada." },
      { texto: "Pedir revisão apenas se o erro for superior a 1.000 €.", porque: "Não existe limiar mínimo de valor para reclamar — o direito de reclamação existe independentemente do montante." },
      { texto: "Enviar um email para o serviço de atenção ao contribuinte.", porque: "Embora possa contactar a AT, a reclamação formal exige um procedimento jurídico (reclamação graciosa ou impugnação judicial)." },
    ],
    correta: 1,
    legalBasis: "Reclamacao graciosa (Art. 68.º CPPT) e impugnação judicial (Art. 102.º CPPT)",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-96",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que são 'obrigações declarativas' de um trabalhador independente?",
    opcoes: [
      { texto: "A obrigação de pagar impostos.", porque: "Pagar impostos é uma obrigação de pagamento. As obrigações declarativas referem-se a comunicação de informação a AT e SS." },
      { texto: "O conjunto de declarações e comunicações que deve entregar a AT e a SS: declaração de IRS, declaração periódica de IVA, declaração trimestral de SS, entre outras.", porque: "As obrigações declarativas incluem a entrega periódica de declarações fiscais e contributivas nos prazos legais." },
      { texto: "Apenas a declaração anual de IRS.", porque: "As obrigações declarativas vão alem do IRS: incluem IVA (se aplicável), declaração trimestral de SS e comunicação de alterações." },
      { texto: "Não existem obrigações declarativas para freelancers.", porque: "Os freelancers tem multiplas obrigações declarativas perante a AT e a SS." },
    ],
    correta: 1,
    legalBasis: "Obrigações declarativas — CIRS, CIVA é Código Contributivo",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-97",
    categoria: "geral",
    dificuldade: 2,
    pergunta:
      "A 'retenção na fonte' de IRS é o 'IRS final' são sempre o mesmo valor?",
    opcoes: [
      { texto: "Sim — a retenção é o imposto definitivo.", porque: "A retenção é apenas um adiantamento. O imposto definitivo e apurado na declaração anual e pode ser maior ou menor." },
      { texto: "Não — a retenção é um adiantamento; o IRS final e apurado na declaração anual e pode resultar em reembolso ou pagamento adicional.", porque: "As retenções são pagamentos por conta do IRS. Na declaração anual, calcula-se o imposto real e apura-se a diferença: reembolso (se retiveram a mais) ou pagamento (se retiveram a menos)." },
      { texto: "Não — a retenção é sempre superior ao imposto final.", porque: "Nem sempre: pode ser inferior, levando a pagamento adicional na declaração anual." },
      { texto: "Depende do regime (simplificado ou organizado).", porque: "Em ambos os regimes, a retenção é um adiantamento e o acerto é feito na declaração anual." },
    ],
    correta: 1,
    legalBasis: "Art. 101.º CIRS — retenção na fonte como adiantamento vs. imposto final",
    fonte: fonte("art101cirs"),
  },
  {
    id: "ger-98",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Em sede de IRS, o que acontece se o contribuinte tiver rendimentos de varias categorias (ex.: A e B)?",
    opcoes: [
      { texto: "Declara cada categoria separadamente, em declarações distintas.", porque: "O IRS é um imposto único sobre o rendimento global — todas as categorias são declaradas na mesma declaração (Modelo 3)." },
      { texto: "Os rendimentos são somados (englobados) é sujeitos a taxa progressiva aplicável ao rendimento coletável global.", porque: "O IRS englobar os rendimentos de todas as categorias, aplicando as taxas progressivas ao rendimento coletável total (Art. 22.º CIRS)." },
      { texto: "Apenas a categoria com maior rendimento é tributada.", porque: "Todas as categorias de rendimento são tributadas — não há exclusao da menor." },
      { texto: "Paga uma taxa fixa de 28% sobre cada categoria.", porque: "28% é a taxa liberatoria de certos rendimentos (capitais) — não se aplica genericamente a todas as categorias." },
    ],
    correta: 1,
    legalBasis: "Art. 22.º CIRS — englobamento de rendimentos de varias categorias",
    fonte: fonte("art68cirs"),
  },
  {
    id: "ger-99",
    categoria: "geral",
    dificuldade: 1,
    pergunta:
      "O que deve um freelancer fazer antes de comecar a prestar serviços de forma regular?",
    opcoes: [
      { texto: "Nada — pode comecar a faturar diretamente.", porque: "É obrigatório abrir atividade nas Finanças antes de comecar a prestar serviços de forma regular." },
      { texto: "Abrir atividade no Portal das Finanças, escolhendo o código de atividade (CIRS) é o regime de IVA.", porque: "O primeiro passo para iniciar atividade independente regular e a abertura de atividade no Portal das Finanças, com indicação da atividade e regime de IVA." },
      { texto: "Constituir uma empresa (sociedade unipessoal).", porque: "Não é obrigatório constituir empresa — pode exercer em nome individual como trabalhador independente." },
      { texto: "Registar-se como empresa na Conservatoria do Registo Comercial.", porque: "O registo na Conservatoria e para empresas (sociedades), não para trabalhadores independentes em nome individual." },
    ],
    correta: 1,
    legalBasis: "Abertura de atividade — Art. 112.º CIRS",
    fonte: fonte("govptTrabIndependente"),
  },
  {
    id: "ger-100",
    categoria: "geral",
    dificuldade: 3,
    pergunta:
      "Em que circunstancias a AT pode considerar que um trabalhador independente tem, na realidade, uma relação de trabalho dependente (falsos recibos verdes)?",
    opcoes: [
      { texto: "Nunca — a AT não tem competência para requalificar relações de trabalho.", porque: "A AT (e a ACT) podem requalificar relações de trabalho se existirem indicios de subordinação." },
      { texto: "Se houver indicios de subordinação: horario fixo, trabalho nas instalações do cliente, dependência economica de uma única entidade, instruções detalhadas.", porque: "A requalificação ocorre quando se verificam caracteristicas tipicas de trabalho dependente (subordinação, exclusividade, horario imposto), apesar de o pagamento ser feito por recibos verdes." },
      { texto: "Apenas se o freelancer reclamar junto da ACT.", porque: "A AT pode atuar oficiosamente, não sendo necessário que o trabalhador reclame para que a requalificação ocorra." },
      { texto: "Apenas se o rendimento anual exceder 50.000 €.", porque: "O valor do rendimento não é o criterio — o que conta são os indicios de subordinação jurídica e economica." },
    ],
    correta: 1,
    legalBasis: "Art. 12.º-A Código do Trabalho — presunção de contrato de trabalho (falsos recibos verdes)",
    fonte: fonte("govptTrabIndependente"),
  },
];
