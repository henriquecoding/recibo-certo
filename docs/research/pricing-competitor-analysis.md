# Análise de concorrentes — calculadoras de preço

Consultado a 2026-08-18.

## calculadoraprecos.pt — o benchmark português

O único concorrente verdadeiramente português que encontrei com um produto
funcional. Fernando Gonçalves construiu duas coisas: um simulador de preço a
partir do custo de compra e uma análise de concorrência.

**O que faz bem**

- É honesto. Diz explicitamente que não inclui eletricidade, renda, salários,
  logística, embalagem nem taxas bancárias. Muitas ferramentas maiores mentem
  por omissão; esta assume o âmbito.
- Percebeu a distinção **ENI vs sociedade** no IVA dedutível. É um detalhe
  português que quase todas as ferramentas internacionais ignoram.
- Cálculo ao vivo, sem registo, sem fricção.
- O arredondamento psicológico (para `,00` ou `,50`) é uma decisão de retalho
  real, não um enfeite.

**O que faz mal**

- A fórmula que publica está trocada: escreve `Margem = (Custo − Venda) / Venda`,
  que dá sempre um número negativo. A intenção é `(Venda − Custo) / Venda`. Não é
  um erro de cálculo — o resultado numérico parece correto — mas é o tipo de erro
  que destrói a confiança de quem sabe ler a fórmula.
- Três margens fixas (25 / 40 / 60%) apresentadas como «mínima / média / máxima».
  Não são mínima nem máxima de coisa nenhuma: são convenções de retalho, e nada
  na interface o diz. Um artesão com 80% de custo de tempo não cabe ali.
- «Margem mínima 25–30%» é um pressuposto de retalho de revenda apresentado como
  regra universal.

**O que não faz**

Custos fixos, custos variáveis, break-even, comissões, portes, devoluções,
Segurança Social, IRS, preço por hora, produção própria, volume, descontos,
cenários, objetivo invertido, regiões autónomas, canais. E, sobretudo, não faz a
única pergunta que muda tudo: *qual é o teu enquadramento fiscal?*

**Oportunidade**

Não é «fazer o mesmo mais bonito». É que a decisão de preço em Portugal depende
de variáveis que esta ferramenta não conhece — e o ReciboCerto já as tem
modeladas e verificadas em `fiscal-data.ts`.

---

## Stone (BR) — o modelo pedagógico, não o produto

Os dois artigos servidos como inspiração são **conteúdo brasileiro** e a
matemática só é transferível em parte.

**O que absorver**

- A progressão «preço ≠ valor» → «o que compõe o preço» → «como calcular» →
  «porque importa». É a ordem certa de ensinar.
- O exemplo único que atravessa o artigo inteiro (a t-shirt de R$ 50). Um
  exemplo consistente vale mais do que cinco fórmulas.
- A leitura inversa: `Custo Máximo = Preço de Mercado − (Impostos + Variáveis + Lucro)`.
  Este raciocínio é ótimo e quase nunca aparece em ferramentas.

**O que não transferir**

- `Markup = 100 / [100 − (%variáveis + %fixas + %lucro)]` assume que despesas
  fixas são uma **percentagem da faturação**. É uma aproximação de gestão, não
  uma verdade contabilística: custos fixos são euros, não percentagem. Aplicada
  a um negócio com faturação variável, produz preços errados nos dois sentidos.
  A engine portuguesa deve tratar fixos como euros e converter em percentagem
  *apenas* depois de conhecer o volume esperado — e dizer que o fez.
- Todo o enquadramento fiscal (Simples Nacional, ICMS, MEI) é inaplicável.

---

## Ferramentas internacionais

| Ferramenta | Faz bem | Não faz | Lição |
|---|---|---|---|
| **Shopify** (margem de lucro) | Instantânea, uma pergunta | Impostos, canais, fixos | O poder de um só input bem escolhido |
| **Stripe** (não tem calculadora de preço) | Documentação de taxas exemplar | — | Transparência de taxas como produto |
| **Square / SumUp** | Calculadoras de taxa de processamento | Preço em si | Modelar taxas por transação a sério |
| **QuickBooks** | Integra custo real da contabilidade | Preço prospetivo | Ligar preço a dados históricos |
| **Omni / Calculator.net** | Cobertura enorme de fórmulas | Contexto zero | Fórmula sem contexto não é ferramenta |
| **getharvest markup calculator** | Rápido, limpo | Só markup | Uma conta ≠ uma decisão |
| **ecommerceparatodos.pt** | Margem e markup lado a lado, em PT | Fiscalidade, custos | Boa intuição, âmbito pequeno |

## O padrão comum a todas

Todas partem do princípio de que **o utilizador já sabe que variáveis tem de
introduzir**. Pedem custo, margem e IVA — e devolvem um número. Nenhuma pergunta
o que a pessoa está a vender, como vai vender, ou em que regime está.

É por isso que o produto certo aqui não é uma calculadora melhor. É um **motor
que descobre o cenário e constrói o preço com a pessoa**.

## Como cada uma monetiza

- calculadoraprecos.pt — sem monetização visível (projeto pessoal).
- Stone / Shopify / Stripe — conteúdo de topo de funil para o produto principal.
- Harvest / QuickBooks — captura para SaaS de faturação.
- Calculadoras genéricas — publicidade.

O ReciboCerto tem uma quarta via, que nenhuma delas tem: o cálculo é grátis e o
que se segue — exportar, guardar cenários, ligar ao contabilista ou à FIZ — é
onde vive o valor. Isso mantém a regra do catálogo (`core: "free"`) intacta e não
transforma a ferramenta num muro de captura de email.
