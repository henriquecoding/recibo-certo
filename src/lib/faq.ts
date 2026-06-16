// Conteúdo das perguntas frequentes. Partilhado entre o componente FAQ
// e o JSON-LD (FAQPage) para SEO, evitando duplicação.
// Os valores numéricos devem coincidir com `fiscal-data.ts` (fonte de verdade).

export interface FaqItem {
  q: string;
  a: string;
}

export const faqs: FaqItem[] = [
  {
    q: "O que é a retenção na fonte?",
    a: "É um adiantamento de IRS que o teu cliente entrega às Finanças em teu nome. No final do ano, quando fazes o IRS, esse valor já conta como imposto pago — podes até receber reembolso. Para o Art. 151.º a taxa é de 23% (reduzida de 25% pelo Orçamento do Estado para 2025).",
  },
  {
    q: "Quando preciso de cobrar IVA?",
    a: "Se o teu volume de negócios anual ultrapassar 15.000 € (2026), ficas obrigado a cobrar IVA e a entregar declarações periódicas. Abaixo desse valor aplica-se a isenção do Art. 53.º do CIVA. Se exceder o limite em mais de 25% (18.750 €), passas de imediato ao regime normal.",
  },
  {
    q: "Posso dispensar a retenção na fonte?",
    a: "Sim. Quem prevê faturar menos de 15.000 € no ano, ou está no primeiro ano de atividade, pode dispensar a retenção na fonte ao abrigo do Art. 101.º-B do CIRS — recebendo o valor integral e acertando o IRS na declaração anual.",
  },
  {
    q: "Como funciona a Segurança Social?",
    a: "Pagas 21,4% sobre o rendimento relevante: 70% do valor nas prestações de serviços, ou 20% na venda de bens, hotelaria e restauração. A declaração é trimestral e o pagamento mensal, entre os dias 10 e 20. No primeiro ano de atividade (12 meses) podes estar isento de contribuir.",
  },
  {
    q: "Tenho até 35 anos. Como funciona o IRS Jovem?",
    a: "O IRS Jovem isenta parte dos teus rendimentos de trabalho (incluindo recibos verdes): 100% no 1.º ano, 75% no 2.º a 4.º, 50% no 5.º a 7.º e 25% no 8.º a 10.º ano de rendimentos, até ao teto anual de 55 × IAS (29.542,15 € em 2026).",
  },
  {
    q: "Tenho de entregar declarações trimestrais à Segurança Social?",
    a: "Sim, em janeiro, abril, julho e outubro. O incumprimento destes prazos pode gerar coimas. O ReciboCerto avisa-te com antecedência.",
  },
  {
    q: "Qual a diferença entre ato isolado e recibos verdes?",
    a: "O ato isolado é para um único serviço pontual e não repetido. Podes emitir sem abrir atividade, mas pagas IVA (23% na maioria dos casos) e só podes usar uma vez por ano. Com recibos verdes (atividade aberta), podes faturar regularmente e estás isento de IVA se faturares menos de 15 000 € por ano.",
  },
  {
    q: "Tenho emprego e quero passar recibos verdes. E a Segurança Social?",
    a: "Se o teu cliente dos recibos for diferente do teu empregador, podes estar isento de SS pelos recibos verdes, desde que a média mensal desses recibos seja inferior a 4 × IAS (2 148,52 € em 2026) e o teu salário seja de pelo menos 1 × IAS. Nesse caso, a SS é paga apenas pelo empregador.",
  },
  {
    q: "Quando começo a pagar Segurança Social?",
    a: "Existe isenção total durante os primeiros 12 meses, a contar da data de abertura de atividade nas Finanças. No 13.º mês, as contribuições (21,4% sobre 70% da faturação média do trimestre anterior) começam automaticamente. Mesmo durante a isenção, é obrigatório entregar as declarações trimestrais.",
  },
  {
    q: "Trabalho para clientes fora de Portugal. Tenho de fazer retenção na fonte?",
    a: "Não. Clientes estrangeiros não estão sujeitos à retenção na fonte de IRS português — recebes o valor total do recibo. Quanto ao IVA, se o cliente é uma empresa europeia com NIF VIES válido, aplicas autoliquidação (sem IVA português). Se for uma empresa fora da UE, o serviço fica fora do território nacional.",
  },
  {
    q: "O que acontece se não fechar a atividade quando paro de faturar?",
    a: "A Autoridade Tributária considera-te ainda em atividade. Tens de continuar a entregar declarações (incluindo o Anexo B no IRS) e as declarações trimestrais à Segurança Social, mesmo sem rendimentos. As coimas por incumprimento vão de 50 € a 7 500 € conforme a infração.",
  },
  {
    q: "Qual a diferença entre fatura e recibo?",
    a: "A fatura titula a transação e a obrigação de pagamento; o recibo comprova que o pagamento foi feito. Quando os dois coincidem no tempo, junta-se tudo numa fatura-recibo — que é o formato dos recibos verdes eletrónicos.",
  },
  {
    q: "O ReciboCerto emite os meus recibos verdes?",
    a: "Não. A emissão legal dos recibos verdes faz-se gratuitamente no Portal das Finanças. O ReciboCerto é o teu copiloto financeiro: calcula ao cêntimo quanto do recibo é teu, quanto reservar para IRS, Segurança Social e IVA, e avisa-te dos prazos para não pagares coimas.",
  },
];
