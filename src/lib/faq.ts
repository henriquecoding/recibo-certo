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
];
