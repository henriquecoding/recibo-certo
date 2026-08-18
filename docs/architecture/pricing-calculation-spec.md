# Especificação de cálculo — Pricing Engine

Este documento é a **fonte de verdade matemática**. O código implementa-o; os
testes verificam-no. Se houver divergência entre este documento e o código, um
dos dois está errado e é preciso decidir qual — não «harmonizar».

---

## 0. Vocabulário (rigoroso, sem sinónimos)

| Termo | Símbolo | Definição |
|---|---|---|
| Preço líquido | `P` | Preço sem IVA. É a receita do vendedor. |
| IVA | `IVA` | `P × t`, onde `t` é a taxa da região/escalão. |
| PVP | `PVP` | `P + IVA`. O «preço de venda ao consumidor» do DL 138/90. |
| Custo direto | `Cd` | Aquisição ou produção de **uma** unidade. |
| Custos variáveis fixos por unidade | `Cv€` | Euros por unidade que não dependem do preço (embalagem, portes absorvidos, taxa fixa por transação). |
| Custos variáveis sobre o líquido | `v` | Fração de `P` (ex.: afiliado sobre o valor líquido, SS/IRS do TI). |
| Custos variáveis sobre o bruto | `g` | Fração de `PVP` (ex.: comissão de marketplace, % de processamento de pagamento). |
| Custos fixos do período | `F` | Euros por mês, independentes das vendas. |
| Volume esperado | `Q` | Unidades por mês. |
| Margem | `m` | Fração **do preço líquido** que é lucro: `m = L / P`. |
| Markup | `k` | Fração **acrescentada ao custo**: `P = base × (1 + k)`. |
| Margem de contribuição unitária | `MC` | `P − (custos variáveis totais por unidade)`. |
| Lucro operacional | `L` | `MC × Q − F`. |

**Regra inviolável:** margem é sobre `P` (líquido), nunca sobre `PVP`.
Uma calculadora que divide por `PVP` inflaciona a margem aparente em `t` e faz o
vendedor pensar que ganha mais do que ganha. A UI diz sempre sobre o quê.

---

## 1. Por que comissões sobre o bruto obrigam a álgebra

A maioria dos canais cobra sobre o **valor total da encomenda, com IVA**. Isso
cria uma dependência circular: o preço depende da comissão, que depende do preço.

Resolvê-la por iteração funciona mas esconde o modelo. Resolve-se em forma
fechada.

### 1.1 Preço a partir de margem pretendida

Lucro por unidade:

```
L₁ = P − Cd − Cv€ − v·P − g·PVP
   = P − Cd − Cv€ − v·P − g·P·(1+t)
```

Impondo `L₁ = m·P`:

```
P·(1 − v − g(1+t) − m) = Cd + Cv€

           Cd + Cv€
P = ─────────────────────────
     1 − v − g(1+t) − m
```

**Denominador ≤ 0 ⇒ o preço é impossível.** Não existe preço que satisfaça essa
margem com essas comissões. A engine devolve `impossivel` com a razão, em vez de
devolver um número negativo ou infinito. Este é o caso que quase todas as
ferramentas do mercado devolvem como `NaN`.

### 1.2 Preço a partir de markup

Markup aplica-se à **base de custo que não depende do preço** (`Cd + Cv€`), e o
preço é depois «bruteado» para que o lucro pretendido sobreviva às comissões:

```
       (Cd + Cv€)·(1 + k)
P = ──────────────────────
      1 − v − g(1+t)
```

Se `v = g = 0`, colapsa em `P = (Cd + Cv€)(1+k)`, como manda a definição.

### 1.3 Conversão entre margem e markup

Sem comissões:

```
m = k / (1 + k)          k = m / (1 − m)
```

Com comissões, a equivalência deixa de ser algébrica pura e a engine calcula os
dois preços e mostra a diferença. **Nunca** se apresentam markup e margem como
sinónimos.

---

## 2. IVA

### 2.1 Taxas

De `IVA_TAXAS[regiao]` em `fiscal-data.ts`. Nunca literais.

### 2.2 Isenção do Art. 53.º — o duplo efeito

Este é o ponto central e o que nenhum concorrente modela.

Quando o vendedor está isento pelo Art. 53.º CIVA:

1. **Não liquida IVA:** `t = 0`, logo `PVP = P`.
2. **Não deduz o IVA suportado** (Art. 53.º n.º 3): o custo de aquisição
   relevante passa a ser o valor **com IVA**.

```
Cd(isento)     = custoComIVA
Cd(não isento) = custoComIVA / (1 + t_compra)
```

Ignorar (2) é subestimar o custo em até 23% e recomendar um preço abaixo do
sustentável. A engine exige sempre saber se o valor introduzido inclui IVA e
qual a taxa de compra.

### 2.3 Bens em segunda mão

Regime da margem (DL 199/96): o IVA incide sobre `P − Cd`, não sobre `P`.
Suportado como modo de IVA `margem`; a UI avisa que exige enquadramento próprio.

---

## 3. O motor fiscal do vendedor (o diferencial português)

### 3.1 Trabalhador independente — a Segurança Social é custo variável

Para um TI, a SS incide sobre o **rendimento relevante**, que é uma fração da
**faturação** — não do lucro:

```
baseSS = P_anual × coefSS      coefSS = 0,70 (serviços) | 0,20 (bens)
SS     = baseSS × 21,4%   (com teto 12×IAS e mínimo 20 €/mês)
```

Efetivamente, **14,98% de cada euro de serviços prestados** e **4,28% de cada
euro de venda de bens**. Isto entra em `v` — é custo variável sobre o líquido,
não imposto sobre o lucro.

Consequência que a UI tem de dizer em voz alta: *comprar melhor não reduz a tua
Segurança Social.*

### 3.2 IRS no regime simplificado — os custos não abatem

```
rendimentoTributável = P_anual × coeficiente(atividade)
```

O coeficiente (0,75 / 0,35 / 0,95…) **presume** as despesas. Quem gasta mais não
paga menos IRS. Logo, para efeitos de preço, o IRS é também função da faturação,
não do lucro — e o IRS marginal calcula-se como derivada discreta:

```
IRS_marginal(ΔP) = [IRS(faturação + ΔP) − IRS(faturação)] / ΔP
```

Calculado com `simularIRSAnual()` já existente. **Não se reimplementa IRS aqui.**

### 3.3 Retenção na fonte não é custo

É adiantamento de IRS (Art. 98.º e ss. CIRS). Afeta **caixa**, não margem.
Aparece numa linha própria — «entra na tua conta hoje» — e nunca reduz a margem.
Confundir os dois é o erro mais comum das folhas de cálculo caseiras.

### 3.4 Sociedade

IRC sobre o lucro (não sobre a faturação) e IVA totalmente dedutível. O custo
fiscal marginal é do lucro, portanto **não entra em `v`**: entra depois da
margem, como conversão de lucro operacional em lucro líquido.

---

## 4. Custos

### 4.1 Quatro categorias, e a pergunta que as separa

| Categoria | Pergunta que a identifica | Onde entra |
|---|---|---|
| Direto | «Quanto te custa a unidade que vendes?» | `Cd` |
| Variável | «Acontece **só** quando vendes?» | `Cv€`, `v`, `g` |
| Fixo | «Acontece **mesmo que não vendas**?» | `F` |
| Oculto | «Já contaste o teu tempo? E as devoluções? E o desperdício?» | conforme a natureza |

### 4.2 Desperdício / quebra

Taxa `w` de unidades perdidas por cada unidade vendida:

```
Cd_efetivo = Cd / (1 − w)
```

Dividir, não multiplicar. Se 10% se estraga, cada unidade **vendida** carrega o
custo de 1/0,9 = 1,111 unidades produzidas.

### 4.3 Devoluções

Com taxa de devolução `r` e custo médio de devolução `Cr` (portes de recolha +
reacondicionamento + perda), o custo esperado por venda bruta:

```
Cdev = r × (Cr + portesOriginais)
```

Os portes originais entram porque o DL 24/2014 obriga o vendedor a reembolsá-los.
Se o produto for irrecuperável, `Cr` inclui `Cd`.

### 4.4 CAC

```
CAC = investimentoEmAquisição / clientesAdquiridos
```

Entra em `Cv€` quando a venda é a um cliente novo. A engine permite declarar a
fração de vendas a clientes novos, `α`, e usa `α × CAC`.

---

## 5. Custo do tempo — horas produtivas

O erro universal é `valor/hora = salário desejado / 160`.

Modelo correto:

```
horasProdutivas/ano = (semanasTrabalhadas × horasSemana) × taxaFaturável
semanasTrabalhadas  = 52 − semanasFérias − equivalenteFeriados − semanasSemCliente
```

`taxaFaturável` é a fração do tempo efetivamente faturável (o resto é
prospeção, propostas, administração, deslocações, formação, pós-venda). Valor
típico declarado na literatura de serviços: 0,55–0,70. A engine usa **0,60 por
omissão e diz que é um pressuposto editável**.

Para um trabalhador independente:

```
                       rendimentoLíquidoPretendido + custosFixosAnuais
valorHoraLíquido = ──────────────────────────────────────────────────────
                                   horasProdutivas

valorHoraFaturado = valorHoraLíquido / (1 − v)
```

onde `v` já inclui SS e IRS marginal (§3). O resultado responde à pergunta real:
*«quanto tenho de cobrar por hora para me sobrar X»*.

---

## 6. Margem de contribuição e ponto de equilíbrio

```
custosVariáveisUnitários = Cd + Cv€ + v·P + g·PVP
MC  = P − custosVariáveisUnitários
MC% = MC / P

unidadesEquilíbrio  = ⌈F / MC⌉          (MC > 0)
faturaçãoEquilíbrio = unidadesEquilíbrio × PVP
```

Se `MC ≤ 0`, não existe ponto de equilíbrio: cada venda adicional aumenta o
prejuízo. A engine devolve `semEquilibrio` com a explicação, não `Infinity`.

---

## 7. Faixa de preços

Quatro âncoras, todas derivadas dos dados do utilizador:

| Âncora | Definição | Significado |
|---|---|---|
| `pisoAbsoluto` | `P` tal que `MC = 0` | abaixo disto cada venda aumenta o prejuízo |
| `minimoSustentavel` | `P` tal que `L = 0` a `Q` esperado (cobre fixos) | não ganhas, mas não perdes |
| `recomendado` | `P` da margem pretendida | o objetivo declarado |
| `confortavel` | `P` da margem pretendida + folga | absorve erros de estimativa |

A folga por omissão é **+10 pontos percentuais de margem**, não um multiplicador
mágico, e é editável. Uma faixa cuja origem não se consegue explicar não deve ser
mostrada.

---

## 8. Descontos

```
PVP_desc = PVP × (1 − d)
P_desc   = PVP_desc / (1 + t)
```

E recalcula-se **toda** a cadeia, porque `g` incide sobre o bruto com desconto.
A engine devolve margem antes e depois, e o **desconto máximo antes de `MC = 0`**:

```
d_max = 1 − P_MC0 / P_atual        (em termos de preço líquido)
```

Aviso legal acoplado: anunciar redução de preço obriga a indicar o preço mais
baixo praticado nos 30 dias anteriores (DL 70/2007, red. DL 109-G/2021).

---

## 9. Volume

Custo unitário decrescente por escalão de quantidade, declarado pelo utilizador
como pares `(quantidade, custoUnitário)`. Interpolação **em escada**, não linear:
comprar 60 unidades com escalões a 50 e 100 dá o preço do escalão de 50.

---

## 10. Objetivo invertido

### 10.1 «Quero ganhar X por mês»

```
lucroAlvo = X
MC_necessária = (X + F) / Q
P = MC_necessária + Cd + Cv€ + v·P + g·P(1+t)
```

resolvido para `P`:

```
      MC_necessária + Cd + Cv€
P = ──────────────────────────────
       1 − v − g(1+t)
```

Aqui `X` é lucro operacional. Para um TI que quer *«receber X na conta»*, aplica-
se a conversão fiscal de §3 e resolve-se com o mesmo denominador alargado.

### 10.2 «Consigo cobrar Y — quantas vendas preciso?»

```
Q = ⌈(lucroAlvo + F) / MC(Y)⌉
```

### 10.3 «Pensei em Y — é sustentável?»

Compara `Y` com as quatro âncoras de §7 e devolve um veredicto textual com a
distância em euros e em pontos de margem.

---

## 11. Arredondamento

Duas operações distintas que nunca se misturam:

1. **Arredondamento monetário** — 2 casas decimais, `round-half-up`, aplicado
   apenas na apresentação. Os cálculos intermédios correm em vírgula flutuante
   completa; arredondar a meio da cadeia propaga erro.
2. **Preço psicológico** — sugestão comercial (`,90`, `,95`, `,99`, `,50`) que
   **nunca** substitui o preço recomendado em silêncio. É uma coluna à parte,
   com o impacto na margem calculado e mostrado.

---

## 12. Invariantes que os testes garantem

1. `PVP = P + IVA` sempre, com tolerância de 0,005 €.
2. `MC% ≤ 100%` sempre.
3. Aumentar o preço nunca reduz a margem de contribuição.
4. Aumentar um custo nunca aumenta o lucro.
5. `margemDeMarkup(markupDeMargem(m)) ≈ m` sem comissões.
6. Denominador ≤ 0 devolve `impossivel`, nunca `NaN`/`Infinity`.
7. Isenção de IVA aumenta o custo direto quando a compra tem IVA.
8. SS de serviços ≈ 14,98% do líquido até ao teto de 12 × IAS; a partir daí, a
   percentagem **desce**.
9. Nenhuma função devolve `NaN` para qualquer entrada finita.
10. Desconto de 0% devolve exatamente o mesmo resultado que não aplicar desconto.
