// ═══════════════════════════════════════════════════════════════════════
//  RESPOSTA CURTA · APLICABILIDADE · CHECKLIST
//  ---------------------------------------------------------------------
//  Pontos 6.1 e 6.3 da auditoria. Cada Guia responde, antes do corpo:
//    1. Qual é a resposta curta?
//    2. Isto aplica-se a mim?
//    3. O que tenho de preparar ou decidir?
//
//  O utilizador não deve ter de ler um artigo inteiro para descobrir que
//  a regra não se aplica ao caso dele.
//
//  Nada aqui inventa números: os valores concretos continuam a vir do motor
//  fiscal. Este módulo é linguagem, não cálculo.
// ═══════════════════════════════════════════════════════════════════════

export interface AplicabilidadeGuia {
  /** Conclusão em linguagem direta, antes de qualquer explicação. */
  respostaCurta: string;
  /** Situações em que o Guia se aplica. */
  aplicaSe: string[];
  /** Situações em que NÃO se aplica — com o encaminhamento certo. */
  naoAplicaSe: string[];
  /** Documentos, decisões e dependências a preparar. */
  checklist: string[];
}

export const APLICABILIDADE: Record<string, AplicabilidadeGuia> = {
  // ── Direitos e cobranças ────────────────────────────────────────────
  "fatura-nao-paga": {
    respostaCurta: "Já deves o imposto. Na categoria B, o IRS conta-se desde o momento em que era obrigatório emitir a fatura, não desde o dia em que o dinheiro entra — e o IVA segue a mesma lógica. A boa notícia é que há três coisas a fazer, e nenhuma delas é esperar.",
    aplicaSe: [
      "Emitiste fatura ou fatura-recibo e o prazo de pagamento já passou.",
      "O cliente reconhece a dívida mas vai adiando.",
      "Vais ter de declarar rendimento que ainda não recebeste.",
    ],
    naoAplicaSe: [
      "Ainda não emitiste o documento — nesse caso vê primeiro o guia de fatura, recibo e fatura-recibo, porque o prazo de emissão também é legal.",
      "És trabalhador por conta de outrem e o que está em falta é salário — isso é matéria laboral, não fiscal.",
    ],
    checklist: [
      "A fatura, com a data de emissão e a data de vencimento acordada.",
      "O contrato, proposta ou email onde o prazo de pagamento foi combinado.",
      "Prova de que interpelaste o cliente (emails, cartas, registos de entrega).",
      "A data em que o crédito entrou em mora — é a partir dela que tudo conta.",
      "O valor com e sem IVA, separados: seguem caminhos diferentes.",
    ],
  },
  "juros-de-mora": {
    respostaCurta: "Se nada foi combinado, a fatura vence-se 30 dias depois de o cliente a receber. A partir daí há juros automáticos, sem precisares de avisar ninguém, e ainda 40 € fixos de indemnização por custos de cobrança.",
    aplicaSe: [
      "Prestas serviços ou vendes a empresas ou a entidades públicas.",
      "A fatura está por pagar para lá do prazo acordado.",
      "Queres saber o que podes exigir além do valor da fatura.",
    ],
    naoAplicaSe: [
      "O devedor é um consumidor particular — o regime das transações comerciais não se aplica e as regras dos juros são outras.",
    ],
    checklist: [
      "Data em que o cliente recebeu a fatura.",
      "Prazo de pagamento acordado por escrito, se existir.",
      "Data de vencimento e número de dias de atraso.",
      "Registo de despesas de cobrança acima dos 40 €, se as tiveres.",
    ],
  },
  "cobrar-divida": {
    respostaCurta: "A cobrança é uma escada: interpelação escrita, injunção e, se preciso, execução. A injunção cobre contratos até 15 000 € — mas nas transações comerciais entre empresas não tem limite de valor.",
    aplicaSe: [
      "Já interpelaste o cliente e continua sem pagar.",
      "Tens documento que titula a dívida (fatura, contrato, proposta aceite).",
      "Queres um título executivo sem passar por uma ação judicial completa.",
    ],
    naoAplicaSe: [
      "A dívida é contestada quanto à sua própria existência ou ao trabalho prestado — aí a injunção tende a converter-se em ação e convém aconselhamento antes.",
      "O devedor já está insolvente — o caminho é a reclamação de créditos no processo.",
    ],
    checklist: [
      "Fatura e prova de entrega do serviço ou do bem.",
      "Prova de interpelação e da ausência de resposta.",
      "Identificação completa do devedor, incluindo NIF e sede.",
      "Cálculo do capital, juros e dos 40 € de indemnização.",
      "Decisão sobre representação: a injunção pode ser feita sem advogado, a execução raramente se aconselha sem.",
    ],
  },
  "recuperar-iva-incobravel": {
    respostaCurta: "O IVA que entregaste ao Estado sobre uma fatura que nunca foi paga pode ser recuperado — mas só depois de a mora atingir os prazos legais e com prova de que tentaste cobrar. Não é automático nem imediato.",
    aplicaSe: [
      "Entregaste IVA de uma fatura que o cliente não pagou.",
      "O crédito está em mora há mais de 12 meses — ou mais de 6 meses, se não passar de 750 € com IVA e o devedor for particular.",
      "Consegues documentar as diligências de cobrança.",
    ],
    naoAplicaSe: [
      "Estás no regime de isenção do Art. 53.º — não entregaste IVA, logo não há IVA a recuperar.",
      "A fatura ainda não atingiu os prazos de mora exigidos.",
    ],
    checklist: [
      "Data de vencimento do crédito e cálculo exato dos meses de mora.",
      "Prova documental das diligências de cobrança.",
      "Valor do crédito com IVA incluído e enquadramento do devedor.",
      "Apoio de contabilista certificado: há pedido de autorização prévia em vários casos.",
    ],
  },
  "iva-de-caixa": {
    respostaCurta: "É um regime opcional em que só entregas o IVA depois de receberes do cliente. A contrapartida raramente é dita: também só deduzes o IVA das tuas compras depois de as teres pago.",
    aplicaSe: [
      "Faturas com prazos longos e sofres com o IVA a sair antes de o dinheiro entrar.",
      "Estás no regime normal de IVA e o teu volume de negócios está dentro do limiar.",
      "Tens contabilidade organizada ou apoio contabilístico para seguir os recebimentos um a um.",
    ],
    naoAplicaSe: [
      "Estás isento pelo Art. 53.º — não entregas IVA, logo o regime não te traz nada.",
      "Recebes quase tudo a pronto pagamento: o ganho de tesouraria seria residual e o custo administrativo não.",
    ],
    checklist: [
      "Volume de negócios do ano civil anterior.",
      "Perfil de recebimentos: quanto tempo medeia entre faturar e receber.",
      "Capacidade de rastrear recebimento a recebimento — é o que o regime exige.",
      "Confirmação das datas de opção junto do Portal das Finanças ou do contabilista.",
    ],
  },
  "contestar-liquidacao": {
    respostaCurta: "Tens 120 dias para reclamação graciosa e três meses para impugnação judicial. São prazos de caducidade: passam e não se recuperam, mesmo que tenhas razão.",
    aplicaSe: [
      "Recebeste uma liquidação com valores que não reconheces.",
      "A AT corrigiu a tua declaração e discordas da correção.",
      "Queres contestar sem pagar primeiro — ou pagar e contestar à mesma.",
    ],
    naoAplicaSe: [
      "O que queres é apenas corrigir um lapso teu na declaração — nesse caso o caminho é a declaração de substituição.",
      "Já passaram os prazos: aí resta ver se há fundamento para revisão oficiosa, o que é mais restrito.",
    ],
    checklist: [
      "A nota de liquidação e a data em que foste notificado.",
      "Data do termo do prazo de pagamento voluntário — é dela que contam vários prazos.",
      "Os documentos que sustentam a tua versão dos factos.",
      "Decisão sobre garantia, se quiseres suspender a execução.",
      "Aconselhamento profissional: os fundamentos têm de ser invocados logo, não se acrescentam depois.",
    ],
  },
  "prazos-fiscais-divida": {
    respostaCurta: "São dois prazos diferentes e confundem-se sempre: quatro anos para a AT liquidar o imposto (caducidade) e oito anos para cobrar a dívida já liquidada (prescrição). Ambos podem parar e recomeçar.",
    aplicaSe: [
      "Recebeste uma cobrança relativa a um ano já distante.",
      "Queres perceber até quando podes ser liquidado ou executado.",
      "Tens uma dívida antiga em execução fiscal.",
    ],
    naoAplicaSe: [
      "Estás a discutir se o imposto é devido, e não o tempo decorrido — nesse caso vê o guia de contestação da liquidação.",
    ],
    checklist: [
      "Ano a que respeita o imposto e tipo de tributo.",
      "Data da notificação da liquidação.",
      "Histórico de citações, pagamentos por conta, planos prestacionais ou reclamações — todos podem interromper ou suspender prazos.",
      "Confirmação profissional: uma contagem de anos, sozinha, quase nunca conclui a prescrição.",
    ],
  },
  "abrir-atividade": {
    respostaCurta: "Abrir atividade é uma declaração gratuita nas Finanças. O que decides nesse formulário — atividade, regime e IVA — determina quanto vais pagar durante todo o ano.",
    aplicaSe: [
      "Vais prestar serviços ou vender bens de forma regular por conta própria.",
      "Já recebeste um convite para faturar e ainda não tens atividade aberta.",
      "Estás a passar de trabalho por conta de outrem para trabalho independente.",
    ],
    naoAplicaSe: [
      "Vais faturar uma única vez e não prevês repetir — vê primeiro o guia do ato isolado.",
      "Vais constituir uma sociedade — o processo é outro, vê o guia de abrir empresa.",
    ],
    checklist: [
      "Cartão de cidadão e senha de acesso ao Portal das Finanças.",
      "Código da atividade que melhor descreve o que fazes (tabela do Art. 151.º ou CAE).",
      "Estimativa de faturação para o primeiro ano — condiciona o IVA e a retenção.",
      "IBAN para reembolsos e pagamentos.",
      "Data de início — a partir dela começam as obrigações declarativas.",
    ],
  },
  "ato-isolado": {
    respostaCurta: "O ato isolado serve para uma prestação pontual e não previsível. Se o trabalho se repete ou é previsível que se repita, o caminho é abrir atividade.",
    aplicaSe: [
      "Vais faturar uma prestação pontual e não contas repeti-la.",
      "Não tens atividade aberta nas Finanças.",
    ],
    naoAplicaSe: [
      "Já emitiste atos isolados que, no conjunto, revelam uma atividade regular.",
      "Tens um cliente recorrente — nesse caso a atividade é previsível.",
    ],
    checklist: [
      "Valor exato da prestação e data em que foi realizada.",
      "NIF do adquirente.",
      "Verificar se o valor te faz ultrapassar o limite de isenção de IVA.",
    ],
  },
  "regime-simplificado": {
    respostaCurta: "No regime simplificado o IRS não incide sobre tudo o que faturas: incide sobre uma percentagem, definida por um coeficiente que depende da tua atividade.",
    aplicaSe: [
      "Estás na categoria B e não optaste por contabilidade organizada.",
      "Queres perceber quanto do que faturas é efetivamente tributado.",
    ],
    naoAplicaSe: [
      "Estás em contabilidade organizada — aí o rendimento é o lucro real.",
      "Os teus rendimentos são de trabalho dependente (categoria A).",
    ],
    checklist: [
      "Código da tua atividade e o coeficiente que lhe corresponde.",
      "Faturação anual estimada.",
      "Despesas documentadas, se o teu coeficiente estiver sujeito à regra dos 15 %.",
    ],
  },
  "despesas-dedutiveis": {
    respostaCurta: "No regime simplificado a dedução já está embutida no coeficiente. As despesas só voltam a contar para justificar a parcela sujeita à regra dos 15 % — e têm de estar afetas à atividade no e-Fatura.",
    aplicaSe: [
      "Estás no regime simplificado com um coeficiente sujeito à regra dos 15 %.",
      "Queres saber que despesas vale a pena classificar como profissionais.",
    ],
    naoAplicaSe: [
      "Estás em contabilidade organizada — aí as despesas entram pelo valor real.",
      "A tua atividade tem coeficiente de vendas, onde a dedução presumida já é muito alta.",
    ],
    checklist: [
      "Aceder ao e-Fatura e classificar as faturas do ano.",
      "Separar despesas totalmente afetas das de afetação parcial.",
      "Guardar comprovativos — a classificação pode ser questionada.",
    ],
  },
  "contabilidade-organizada": {
    respostaCurta: "A contabilidade organizada compensa quando as despesas reais documentadas superam a dedução que o coeficiente já te dá, descontando o custo do contabilista.",
    aplicaSe: [
      "Tens despesas profissionais elevadas e documentadas.",
      "A tua faturação está perto ou acima do limiar de obrigatoriedade.",
    ],
    naoAplicaSe: [
      "Tens poucas despesas e um coeficiente que já presume dedução alta.",
      "Estás no primeiro ano e ainda não tens histórico de despesas.",
    ],
    checklist: [
      "Total de despesas profissionais documentadas do último ano.",
      "Orçamento de um contabilista certificado.",
      "Prazo da opção — a mudança de regime tem janela própria.",
    ],
  },
  "retencao-na-fonte": {
    respostaCurta: "A retenção não é um imposto a mais: é um adiantamento do teu IRS. Quem retém é o cliente, e a taxa depende da atividade — não do valor da fatura.",
    aplicaSe: [
      "Emites recibos a clientes com contabilidade organizada em Portugal.",
      "Queres perceber se podes pedir dispensa de retenção.",
    ],
    naoAplicaSe: [
      "O teu cliente é um particular sem contabilidade organizada.",
      "O teu cliente não é residente nem tem estabelecimento estável em Portugal.",
    ],
    checklist: [
      "Confirmar o código de atividade e a taxa que lhe corresponde.",
      "Estimar o rendimento anual, para saber se a dispensa se aplica.",
      "Somar as retenções já sofridas no ano — vão abater ao IRS final.",
    ],
  },
  "pagamentos-por-conta": {
    respostaCurta: "Os pagamentos por conta são adiantamentos do IRS do próprio ano. Só existem quando a retenção sofrida não cobre o imposto previsível.",
    aplicaSe: [
      "Tens rendimentos da categoria B e pouca ou nenhuma retenção na fonte.",
      "Recebeste uma notificação da AT sobre pagamentos por conta.",
    ],
    naoAplicaSe: [
      "Todos os teus clientes retêm na fonte e a retenção cobre o imposto previsível.",
      "Os teus rendimentos são apenas de trabalho dependente.",
    ],
    checklist: [
      "Rendimento e coleta do penúltimo ano — é a base do cálculo.",
      "Retenções já efetuadas no ano corrente.",
      "As três datas-limite de pagamento.",
    ],
  },
  "iva-recibos-verdes": {
    respostaCurta: "Abaixo do limite do Art. 53.º não cobras IVA nem entregas declarações periódicas. Assim que ultrapassas, a mudança é imediata e tem prazo próprio para comunicar.",
    aplicaSe: [
      "Faturas serviços ou bens sujeitos a IVA e queres saber se estás isento.",
      "Estás a aproximar-te do limite de isenção durante o ano.",
    ],
    naoAplicaSe: [
      "A tua atividade está isenta pelo Art. 9.º (saúde, ensino) — é outra isenção, sem limite de faturação.",
      "Já estás no regime normal há menos de cinco anos e queres voltar à isenção.",
    ],
    checklist: [
      "Volume de negócios do ano anterior e o acumulado deste ano.",
      "Região onde a operação se localiza — as taxas diferem.",
      "A menção correta a inscrever na fatura consoante a isenção aplicável.",
    ],
  },
  "seguranca-social": {
    respostaCurta: "A contribuição não incide sobre tudo o que faturas: incide sobre uma base calculada a partir do rendimento relevante, declarada trimestralmente.",
    aplicaSe: [
      "És trabalhador independente com atividade aberta.",
      "Queres perceber a declaração trimestral ou o valor a pagar.",
    ],
    naoAplicaSe: [
      "Estás no primeiro ano de atividade, em que existe um período inicial sem contribuições.",
      "Reúnes as condições de dispensa por acumulação com trabalho dependente.",
    ],
    checklist: [
      "Valores faturados nos três meses do trimestre.",
      "Natureza da atividade — serviços e bens têm bases diferentes.",
      "Confirmar se és considerado economicamente dependente de alguma entidade.",
    ],
  },
  "acumulacao-emprego": {
    respostaCurta: "Acumular é legal. O que muda são três coisas independentes: o IRS soma os dois rendimentos, a Segurança Social pode dispensar contribuições, e a concentração de faturação pode gerar obrigações para o teu cliente.",
    aplicaSe: [
      "Tens contrato de trabalho e também emites recibos verdes.",
      "Queres saber se pagas Segurança Social pelos dois rendimentos.",
    ],
    naoAplicaSe: [
      "Só tens rendimentos de trabalho dependente.",
      "Só tens rendimentos independentes.",
    ],
    checklist: [
      "Confirmar se o cliente dos recibos é o próprio empregador.",
      "Calcular a média mensal dos rendimentos independentes.",
      "Verificar que percentagem da tua faturação vem de um só cliente.",
    ],
  },
  "clientes-estrangeiros": {
    respostaCurta: "A regra muda conforme o cliente seja empresa ou consumidor, e conforme esteja dentro ou fora da União Europeia. Sem validar o número de IVA, não se aplica autoliquidação.",
    aplicaSe: [
      "Vais faturar a um cliente com sede fora de Portugal.",
      "Precisas de saber que menção pôr na fatura e se cobras IVA.",
    ],
    naoAplicaSe: [
      "O cliente é português, mesmo que pague em moeda estrangeira.",
      "Vendes através de uma plataforma que atua como vendedor legal — vê o guia do Merchant of Record.",
    ],
    checklist: [
      "País do cliente e se é empresa ou consumidor final.",
      "Número de IVA validado no VIES, se for empresa da UE.",
      "Menção de isenção ou autoliquidação a inscrever na fatura.",
    ],
  },
  "cessar-atividade": {
    respostaCurta: "Enquanto não cessares formalmente, as obrigações continuam a correr — mesmo sem faturar. A cessação é gratuita e faz-se no Portal das Finanças.",
    aplicaSe: [
      "Deixaste de exercer a atividade e não prevês retomá-la.",
      "Vais passar a trabalhar exclusivamente por conta de outrem.",
    ],
    naoAplicaSe: [
      "Vais apenas ficar sem faturar durante alguns meses — a suspensão tem outras implicações.",
      "Vais mudar de atividade — nesse caso basta uma declaração de alterações.",
    ],
    checklist: [
      "Emitir todos os documentos em falta antes da data de cessação.",
      "Entregar as declarações periódicas pendentes.",
      "Regularizar a situação contributiva na Segurança Social.",
      "Guardar os documentos pelo prazo legal de conservação.",
    ],
  },
  "fatura-vs-recibo": {
    respostaCurta: "O documento certo depende de o pagamento já ter acontecido: fatura se ainda não recebeste, fatura-recibo se recebes no ato, recibo se estás a quitar uma fatura anterior.",
    aplicaSe: [
      "Vais emitir um documento e não sabes qual.",
      "Um cliente pediu-te «uma fatura» e tu emites recibos verdes.",
    ],
    naoAplicaSe: [
      "Precisas de corrigir um documento já emitido — nesse caso é uma nota de crédito.",
    ],
    checklist: [
      "Saber se o pagamento já foi recebido.",
      "NIF e dados completos do adquirente.",
      "Descrição do serviço, valor, IVA e retenção aplicáveis.",
    ],
  },
  "merchant-of-record": {
    respostaCurta: "Não há uma resposta única. O tratamento correto depende do contrato com a plataforma, de quem é juridicamente o vendedor e de quem é o teu adquirente — só depois se decide o documento a emitir.",
    aplicaSe: [
      "Vendes um produto digital através de uma plataforma que atua como vendedor legal.",
      "Recebes um pagamento agregado da plataforma e não sabes a quem faturar.",
    ],
    naoAplicaSe: [
      "Cobras diretamente aos teus clientes através de um processador de pagamentos — nesse caso o vendedor és tu.",
      "Vendes serviços faturados individualmente a clientes identificados.",
    ],
    checklist: [
      "Ler no contrato quem é identificado como vendedor perante o cliente final.",
      "Confirmar quem emite o documento ao cliente final e em nome de quem.",
      "Identificar a sede da contraparte que te paga.",
      "Confirmar o enquadramento com um contabilista antes de fixar o procedimento.",
    ],
  },
  "recibo-vencimento": {
    respostaCurta: "O líquido é o bruto menos a Segurança Social e o IRS retido. A retenção não é o imposto final — é um adiantamento que acerta no IRS anual.",
    aplicaSe: [
      "Recebes um recibo de vencimento e queres perceber cada linha.",
      "Queres confirmar se os descontos estão corretos.",
    ],
    naoAplicaSe: [
      "És trabalhador independente — os teus descontos seguem outras regras.",
    ],
    checklist: [
      "Recibo do mês e o valor do vencimento base.",
      "Situação familiar declarada à entidade empregadora.",
      "Confirmar o valor e a forma de pagamento do subsídio de refeição.",
    ],
  },
  "subsidios-ferias-natal": {
    respostaCurta: "São dois subsídios com regras próprias. O de Natal é pago até 15 de dezembro; o de férias é pago antes do gozo das férias, salvo acordo escrito em contrário.",
    aplicaSe: [
      "Tens contrato de trabalho e queres saber quanto e quando recebes.",
      "Entraste ou saíste a meio do ano e queres saber o valor proporcional.",
    ],
    naoAplicaSe: [
      "És trabalhador independente — não há subsídios legais equivalentes.",
    ],
    checklist: [
      "Retribuição base e prestações que integram cada subsídio.",
      "Meses de serviço prestado no ano civil.",
      "Verificar se existe acordo escrito de pagamento em duodécimos.",
    ],
  },
  "trabalho-suplementar": {
    respostaCurta: "As horas extra pagam-se com acréscimos definidos na lei, que variam consoante o período em que são prestadas — e há limites anuais.",
    aplicaSe: [
      "Trabalhaste para além do teu horário normal.",
      "Queres confirmar se o acréscimo pago está correto.",
    ],
    naoAplicaSe: [
      "Tens isenção de horário de trabalho — o regime é diferente.",
      "És trabalhador independente.",
    ],
    checklist: [
      "Retribuição base mensal e horário semanal.",
      "Número de horas e em que dias e períodos foram prestadas.",
      "Verificar o instrumento de regulamentação coletiva aplicável.",
    ],
  },
  "abrir-empresa": {
    respostaCurta: "Abrir uma sociedade separa o teu património do da empresa, mas acrescenta contabilidade organizada obrigatória e obrigações declarativas próprias.",
    aplicaSe: [
      "Queres limitar a tua responsabilidade pessoal.",
      "Vais ter sócios, investidores ou contratar pessoas.",
    ],
    naoAplicaSe: [
      "Faturas pouco e sozinho — o custo fixo da estrutura pode não compensar.",
      "Só queres começar a faturar já — vê o guia de abrir atividade.",
    ],
    checklist: [
      "Firma aprovada ou certificado de admissibilidade.",
      "Identificação de sócios e distribuição do capital.",
      "Objeto social e sede.",
      "Contabilista certificado contratado antes do início de atividade.",
    ],
  },
  "unipessoal-vs-eni": {
    respostaCurta: "Não é só uma questão de impostos: a diferença de fundo é a responsabilidade patrimonial. Só depois vem a comparação entre IRC com dividendos e IRS da categoria B.",
    aplicaSe: [
      "Faturas por conta própria e ponderas constituir sociedade.",
      "Queres comparar o líquido nas duas estruturas para o mesmo rendimento.",
    ],
    naoAplicaSe: [
      "Já tens sociedade constituída e queres perceber o IRC — vê o guia do IRC.",
    ],
    checklist: [
      "Rendimento anual previsto.",
      "Despesas profissionais documentadas.",
      "Custo anual de contabilidade nas duas hipóteses.",
      "Quanto precisas efetivamente de levantar para viver.",
    ],
  },
  irc: {
    respostaCurta: "O IRC incide sobre o lucro tributável, não sobre a faturação. A taxa reduzida aplica-se apenas à primeira parcela da matéria coletável das PME.",
    aplicaSe: [
      "Tens uma sociedade e queres perceber quanto vais pagar.",
      "Precisas de saber os prazos da Modelo 22 e dos pagamentos por conta.",
    ],
    naoAplicaSe: [
      "És trabalhador independente — pagas IRS, não IRC.",
    ],
    checklist: [
      "Resultado contabilístico do exercício.",
      "Correções fiscais ao resultado.",
      "Município da sede, para a derrama.",
      "Prejuízos fiscais reportáveis de exercícios anteriores.",
    ],
  },
  "tributacao-autonoma": {
    respostaCurta: "A tributação autónoma é liquidada mesmo quando a empresa tem prejuízo — e nesse caso é agravada, salvo exceções previstas na lei.",
    aplicaSe: [
      "A tua empresa tem viaturas, despesas de representação ou ajudas de custo.",
      "Queres perceber quanto pesam essas despesas para além do IRC.",
    ],
    naoAplicaSe: [
      "Não tens sociedade — mas atenção: em contabilidade organizada, o trabalhador independente também está sujeito.",
    ],
    checklist: [
      "Custo de aquisição de cada viatura e o respetivo tipo.",
      "Encargos anuais associados a cada viatura.",
      "Total de despesas de representação e de ajudas de custo.",
      "Resultado fiscal dos três exercícios anteriores.",
    ],
  },
  "calendario-fiscal": {
    respostaCurta: "Estes são os prazos legais gerais. O que está efetivamente pendente na tua situação só é visível nos serviços oficiais ou num operador ligado à tua conta.",
    aplicaSe: [
      "Queres saber quando se entrega cada declaração.",
      "Queres antecipar os pagamentos do próximo trimestre.",
    ],
    naoAplicaSe: [
      "Procuras o estado real das tuas obrigações — isso não é um calendário, é uma consulta à tua conta.",
    ],
    checklist: [
      "Confirmar em que regimes estás enquadrado.",
      "Marcar as datas que se aplicam ao teu caso.",
      "Confirmar sempre nos serviços oficiais antes de agir.",
    ],
  },
  "escaloes-irs": {
    respostaCurta: "Subir de escalão não faz o imposto disparar sobre todo o rendimento: a taxa mais alta só incide sobre a parcela que entra nesse escalão.",
    aplicaSe: [
      "Queres perceber quanto do teu rendimento vai para IRS.",
      "Vais receber um aumento e queres saber o efeito real.",
    ],
    naoAplicaSe: [
      "Os teus rendimentos são tributados por taxas liberatórias e não optaste pelo englobamento.",
    ],
    checklist: [
      "Rendimento coletável estimado, já depois das deduções específicas.",
      "Situação familiar e número de dependentes.",
      "Retenções já sofridas no ano.",
    ],
  },
  "irs-jovem": {
    respostaCurta: "A isenção não depende só da idade: depende do ano de utilização do regime. Cada ano usado consome uma posição na escala de isenção.",
    aplicaSe: [
      "Cumpres os requisitos de idade e não esgotaste os anos do benefício.",
      "Tens rendimentos das categorias A ou B.",
    ],
    naoAplicaSe: [
      "Já usaste todos os anos a que tinhas direito.",
      "Os teus rendimentos são de outras categorias.",
    ],
    checklist: [
      "Anos em que já beneficiaste do regime.",
      "Rendimento bruto previsto para o ano.",
      "Confirmar a opção na declaração de rendimentos.",
    ],
  },
  "ifici-nhr": {
    respostaCurta: "O IFICI aplica uma taxa especial apenas aos rendimentos do trabalho obtidos em atividades elegíveis. Não é um regime geral de 20 % sobre tudo — e os dividendos nacionais ficam de fora.",
    aplicaSe: [
      "Passaste a ser residente fiscal em Portugal e exerces uma atividade elegível.",
      "Queres perceber a diferença face ao antigo Residente Não Habitual.",
    ],
    naoAplicaSe: [
      "Já beneficiaste do regime anterior e esgotaste o período.",
      "Os teus rendimentos são maioritariamente de capitais de fonte portuguesa.",
    ],
    checklist: [
      "Data em que te tornaste residente fiscal.",
      "Enquadramento da atividade nas listas de elegibilidade.",
      "Prazo de inscrição no regime.",
      "Confirmação com um contabilista antes de tomar decisões.",
    ],
  },
  "deducoes-coleta": {
    respostaCurta: "As deduções não abatem ao rendimento: abatem ao imposto já calculado. Cada categoria tem o seu artigo, a sua percentagem e o seu limite.",
    aplicaSe: [
      "Vais entregar a declaração de IRS e queres maximizar as deduções.",
      "Queres perceber por que razão uma despesa não deduziu o que esperavas.",
    ],
    naoAplicaSe: [
      "O teu imposto já é zero por efeito do mínimo de existência.",
    ],
    checklist: [
      "Faturas validadas no e-Fatura até ao prazo.",
      "Composição do agregado familiar.",
      "Despesas de saúde, educação e habitação do ano.",
      "Verificar se o limite global se aplica ao teu rendimento coletável.",
    ],
  },
  "mais-valias": {
    respostaCurta: "Imóveis, valores mobiliários e criptoativos seguem regras diferentes. Antes de calcular, é preciso saber de que tipo de mais-valia se trata.",
    aplicaSe: [
      "Vendeste um imóvel, ações, participações ou criptoativos.",
      "Queres saber se compensa englobar.",
    ],
    naoAplicaSe: [
      "A operação está abrangida por uma exclusão de tributação.",
    ],
    checklist: [
      "Valor e data de aquisição e de realização.",
      "Despesas e encargos com a aquisição e a valorização.",
      "Menos-valias do mesmo ano ou reportáveis.",
      "Documentação comprovativa de tudo o que declarares.",
    ],
  },
  "tributacao-conjunta": {
    respostaCurta: "A tributação conjunta compensa sobretudo quando há assimetria de rendimentos entre os dois. Com rendimentos parecidos, a diferença tende a ser pequena.",
    aplicaSe: [
      "És casado ou vives em união de facto.",
      "Queres comparar as duas opções antes de submeter.",
    ],
    naoAplicaSe: [
      "Não tens cônjuge nem unido de facto.",
    ],
    checklist: [
      "Rendimento coletável de cada um.",
      "Deduções que cada um traz.",
      "Simular as duas hipóteses antes de escolher — a opção é anual.",
    ],
  },
  "reembolso-irs": {
    respostaCurta: "O reembolso não é um prémio: é a devolução do que foi adiantado a mais. A data depende da validação da declaração pela Autoridade Tributária, não de nós.",
    aplicaSe: [
      "Entregaste a declaração e queres perceber o que se segue.",
      "Queres saber o que costuma atrasar o reembolso.",
    ],
    naoAplicaSe: [
      "A tua liquidação deu imposto a pagar em vez de a receber.",
    ],
    checklist: [
      "IBAN atualizado no Portal das Finanças.",
      "Declaração submetida dentro do prazo.",
      "Situação tributária regularizada.",
      "Acompanhar o estado da declaração nos serviços oficiais.",
    ],
  },
};

export function aplicabilidade(slug: string): AplicabilidadeGuia | undefined {
  return APLICABILIDADE[slug];
}

export function assertAplicabilidadeIntegrity(guideSlugs: string[]): string[] {
  const erros: string[] = [];
  for (const slug of guideSlugs) {
    const a = APLICABILIDADE[slug];
    if (!a) {
      erros.push(`Guia "${slug}": sem resposta curta nem aplicabilidade (ponto 6.3 da auditoria).`);
      continue;
    }
    if (a.respostaCurta.length < 60) erros.push(`Guia "${slug}": resposta curta demasiado vaga.`);
    if (a.aplicaSe.length === 0) erros.push(`Guia "${slug}": sem casos de aplicabilidade.`);
    if (a.naoAplicaSe.length === 0) erros.push(`Guia "${slug}": sem casos de não-aplicabilidade — é isso que evita ler o guia todo em vão.`);
    if (a.checklist.length < 2) erros.push(`Guia "${slug}": checklist com menos de 2 itens.`);
  }
  for (const slug of Object.keys(APLICABILIDADE)) {
    if (!guideSlugs.includes(slug)) erros.push(`Aplicabilidade órfã: "${slug}" não corresponde a nenhum manifesto.`);
  }
  return erros;
}
