// Conteúdo das perguntas frequentes. Partilhado entre o componente FAQ
// e o JSON-LD (FAQPage) para SEO, evitando duplicação.
// Os valores numéricos devem coincidir com `fiscal-data.ts` (fonte de verdade).

export type FaqCategoria = "Geral" | "Recibos Verdes" | "Contratos de Trabalho";

export interface FaqItem {
  q: string;
  a: string;
  categoria: FaqCategoria;
}

// Ordem em que as categorias aparecem na página (e no JSON-LD).
export const FAQ_CATEGORIAS: FaqCategoria[] = ["Geral", "Recibos Verdes", "Contratos de Trabalho"];

export const faqs: FaqItem[] = [
  // ── Geral (aplica-se a qualquer perfil) ──────────────────────────────
  {
    categoria: "Geral",
    q: "O ReciboCerto emite os meus recibos ou processa o meu salário?",
    a: "Não. A emissão de recibos verdes faz-se gratuitamente no Portal das Finanças e o teu salário é processado pela entidade empregadora. O ReciboCerto é o teu copiloto financeiro: calcula ao cêntimo quanto é teu, quanto reservar para impostos e Segurança Social, e avisa-te dos prazos para não pagares coimas.",
  },
  {
    categoria: "Geral",
    q: "Tenho até 35 anos. Como funciona o IRS Jovem?",
    a: "O IRS Jovem isenta parte dos teus rendimentos de trabalho (dependente e recibos verdes): 100% no 1.º ano, 75% no 2.º a 4.º, 50% no 5.º a 7.º e 25% no 8.º a 10.º ano de rendimentos, até ao teto anual de 55 × IAS (29.542,15 € em 2026).",
  },
  {
    categoria: "Geral",
    q: "Qual a diferença entre fatura e recibo?",
    a: "A fatura titula a transação e a obrigação de pagamento; o recibo comprova que o pagamento foi feito. Quando os dois coincidem no tempo, junta-se tudo numa fatura-recibo — que é o formato dos recibos verdes eletrónicos.",
  },

  // ── Recibos Verdes (trabalho independente · Categoria B) ─────────────
  {
    categoria: "Recibos Verdes",
    q: "O que é a retenção na fonte?",
    a: "É um adiantamento de IRS que o teu cliente entrega às Finanças em teu nome. No final do ano, quando fazes o IRS, esse valor já conta como imposto pago — podes até receber reembolso. Para o Art. 151.º a taxa é de 23% (reduzida de 25% pelo Orçamento do Estado para 2025).",
  },
  {
    categoria: "Recibos Verdes",
    q: "Quando preciso de cobrar IVA?",
    a: "Se o teu volume de negócios anual ultrapassar 15.000 € (2026), ficas obrigado a cobrar IVA e a entregar declarações periódicas. Abaixo desse valor aplica-se a isenção do Art. 53.º do CIVA. Se exceder o limite em mais de 25% (18.750 €), passas de imediato ao regime normal.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Posso dispensar a retenção na fonte?",
    a: "Sim. Quem prevê faturar menos de 15.000 € no ano, ou está no primeiro ano de atividade, pode dispensar a retenção na fonte ao abrigo do Art. 101.º-B do CIRS — recebendo o valor integral e acertando o IRS na declaração anual.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Como funciona a Segurança Social nos recibos verdes?",
    a: "Pagas 21,4% sobre o rendimento relevante: 70% do valor nas prestações de serviços, ou 20% na venda de bens, hotelaria e restauração. A declaração é trimestral e o pagamento mensal, entre os dias 10 e 20. No primeiro ano de atividade (12 meses) podes estar isento de contribuir.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Tenho de entregar declarações trimestrais à Segurança Social?",
    a: "Sim, em janeiro, abril, julho e outubro. O incumprimento destes prazos pode gerar coimas. O ReciboCerto avisa-te com antecedência.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Qual a diferença entre ato isolado e recibos verdes?",
    a: "O ato isolado é para um único serviço pontual e não repetido. Podes emitir sem abrir atividade, mas pagas IVA (23% na maioria dos casos) e só podes usar uma vez por ano. Com recibos verdes (atividade aberta), podes faturar regularmente e estás isento de IVA se faturares menos de 15 000 € por ano.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Tenho emprego e quero passar recibos verdes. E a Segurança Social?",
    a: "Se o teu cliente dos recibos for diferente do teu empregador, podes estar isento de SS pelos recibos verdes, desde que a média mensal desses recibos seja inferior a 4 × IAS (2 148,52 € em 2026) e o teu salário seja de pelo menos 1 × IAS. Nesse caso, a SS é paga apenas pelo empregador.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Quando começo a pagar Segurança Social?",
    a: "Existe isenção total durante os primeiros 12 meses, a contar da data de abertura de atividade nas Finanças. No 13.º mês, as contribuições (21,4% sobre 70% da faturação média do trimestre anterior) começam automaticamente. Mesmo durante a isenção, é obrigatório entregar as declarações trimestrais.",
  },
  {
    categoria: "Recibos Verdes",
    q: "Trabalho para clientes fora de Portugal. Tenho de fazer retenção na fonte?",
    a: "Não. Clientes estrangeiros não estão sujeitos à retenção na fonte de IRS português — recebes o valor total do recibo. Quanto ao IVA, se o cliente é uma empresa europeia com NIF VIES válido, aplicas autoliquidação (sem IVA português). Se for uma empresa fora da UE, o serviço fica fora do território nacional.",
  },
  {
    categoria: "Recibos Verdes",
    q: "O que acontece se não fechar a atividade quando paro de faturar?",
    a: "A Autoridade Tributária considera-te ainda em atividade. Tens de continuar a entregar declarações (incluindo o Anexo B no IRS) e as declarações trimestrais à Segurança Social, mesmo sem rendimentos. As coimas por incumprimento vão de 50 € a 7 500 € conforme a infração.",
  },

  // ── Contratos de Trabalho (por conta de outrem · Categoria A) ────────
  {
    categoria: "Contratos de Trabalho",
    q: "Como se calcula o meu salário líquido?",
    a: "Ao salário bruto descontam-se 11% para a Segurança Social e a retenção na fonte de IRS (segundo a tabela da tua situação familiar). Soma-se depois o subsídio de refeição, isento até aos limites legais. O ReciboCerto mostra cada parcela e o líquido final com as tabelas oficiais de 2026.",
  },
  {
    categoria: "Contratos de Trabalho",
    q: "A partir de que salário começo a pagar retenção de IRS?",
    a: "Em 2026, salários mensais até 920 € (o salário mínimo nacional) estão isentos de retenção na fonte de IRS — descontas apenas os 11% da Segurança Social. Acima desse valor, a retenção segue a tabela correspondente à tua situação familiar.",
  },
  {
    categoria: "Contratos de Trabalho",
    q: "Até que valor o subsídio de refeição é isento?",
    a: "Em 2026, o subsídio de refeição é isento de IRS e de Segurança Social até 6,15 € por dia se for pago em dinheiro, ou até 10,46 € por dia se for pago em cartão ou vale de refeição. O valor diário que exceder estes limites é tributado como rendimento.",
  },
  {
    categoria: "Contratos de Trabalho",
    q: "O que são os duodécimos dos subsídios de férias e de Natal?",
    a: "Em vez de receberes os subsídios de férias e de Natal por inteiro em junho e dezembro, podes optar por recebê-los diluídos ao longo do ano (em duodécimos): metade de um, metade de ambos, ou ambos por inteiro. Aumenta a liquidez mensal, mas reduz o que recebes nesses meses. O simulador deixa-te comparar os cenários.",
  },
  {
    categoria: "Contratos de Trabalho",
    q: "A minha situação familiar muda a retenção de IRS?",
    a: "Sim. Existem tabelas de retenção diferentes consoante sejas casado ou não, o número de titulares de rendimentos, os dependentes e situações de deficiência. O ReciboCerto seleciona automaticamente a tabela certa e aplica a parcela a abater por cada dependente.",
  },
  {
    categoria: "Contratos de Trabalho",
    q: "Quanto custa o meu salário à entidade empregadora?",
    a: "Além do salário bruto, a entidade paga a Taxa Social Única (TSU) de 23,75% sobre a remuneração (22,3% nas IPSS e entidades sem fins lucrativos). O ReciboCerto mostra-te o custo total para a empresa — útil para enquadrares uma negociação salarial.",
  },
];

export interface FaqGrupo {
  categoria: FaqCategoria;
  itens: FaqItem[];
}

/** As FAQ agrupadas por categoria, na ordem de `FAQ_CATEGORIAS`. */
export const faqsPorCategoria: FaqGrupo[] = FAQ_CATEGORIAS.map((categoria) => ({
  categoria,
  itens: faqs.filter((f) => f.categoria === categoria),
}));
