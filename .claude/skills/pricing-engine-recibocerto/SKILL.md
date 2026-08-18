---
name: pricing-engine-recibocerto
description: Disciplina da engine de formação de preço (`src/lib/pricing/`, `/ferramentas/calcular-preco`). Usar SEMPRE antes de tocar em custos, margem, markup, comissões, IVA de venda, faixa de preço, break-even, cenários ou avisos legais de preço. Garante que a matemática, a proveniência e as regras portuguesas não se partem.
---

# Engine de preço — ReciboCerto

## Antes de mexer

1. Lê `docs/architecture/pricing-calculation-spec.md`. **É a fonte de verdade
   matemática.** O código implementa-o; o teste verifica-o. Divergência entre os
   dois significa que um está errado — decide qual, não «harmonizes».
2. Lê `docs/handoff/PRICING-ENGINE-HANDOFF.md` §3 antes de propor uma
   funcionalidade nova: pode já estar no backlog, com a razão de estar lá.
3. Se o que vais mexer é fiscal, a skill `fiscalidade-pt-2026` manda sobre esta.

## A fronteira que não se atravessa

```
fiscal-data.ts   →  o que o ESTADO IMPÕE. É lei.
pricing/regras.ts →  o que o MERCADO PRATICA (comissões, taxas de pagamento,
                     pressupostos de tempo) + o que a lei impõe sobre a
                     APRESENTAÇÃO do preço (ASAE, saldos, devoluções).
```

**Um número que já vive em `fiscal-data.ts` importa-se de lá.** Escrever `0.23`
em `pricing/` é o defeito que `fiscal-iva.ts` foi criado para corrigir, e há
um teste (`invariante 1`, três regiões × três escalões) que o apanha.

Toda a regra em `pricing/regras.ts` carrega `fonte`, `fonteUrl`, `verificadoEm`
e `confianca`. `assertRegrasPricing()` corre ao importar e falha o build se um
preçário passar de 400 dias sem verificação. **Preçários de terceiros mudam sem
aviso; um valor sem data envelhece em silêncio.**

## Vocabulário — sem sinónimos

| Termo | Significa exatamente |
|---|---|
| preço líquido | sem IVA. É a receita do vendedor. **A margem mede-se aqui.** |
| PVP | com IVA. É o que o DL 138/90 obriga a mostrar ao consumidor. |
| margem | lucro ÷ preço líquido |
| markup | acréscimo ÷ custo. **Não é a mesma coisa.** 50% de markup = 33,3% de margem |
| margem de contribuição | preço líquido − custos variáveis |
| custo | sai do bolso |
| imposto | sai do bolso, mas não é negociável |
| retenção na fonte | **não é custo.** É IRS adiantado: mexe na tesouraria |

Nenhum campo se chama «preço». «Preço» é a pergunta, não a resposta.

## As cinco regras portuguesas que a engine existe para respeitar

1. **A isenção do Art. 53.º tem dois efeitos.** Não liquidas IVA **e** não o
   deduzes nas compras (n.º 3). Quem estiver isento tem o custo **com** IVA.
   Tratar isenção como «taxa = 0» subestima o custo em até 23%.
2. **A Segurança Social do TI incide sobre a faturação**, não sobre o lucro:
   21,4% × 70% (serviços) ou × 20% (bens). Entra como fração `v` no solver, ao
   lado das comissões — **antes** de resolver o preço, não depois.
3. **No regime simplificado os custos não abatem ao IRS.** O coeficiente do
   Art. 31.º presume-os. **Mas na contabilidade organizada abatem** — se
   escreveres esta frase na interface, torna-a condicional.
4. **A retenção não reduz a margem.** Linha própria, na tesouraria.
5. **As comissões de canal incidem sobre o valor com IVA.** 15% do bruto são
   18,45% do líquido. Por isso o solver tem `fracaoBruto` e `fracaoLiquido`
   separados — somá-las é errado por um fator de (1 + IVA).

## O solver

Resolve em **forma fechada**, não por iteração:

```
margem:  P = (C + f) / (1 − v − g(1+t) − m)
markup:  P = (C + f)(1 + k) / (1 − v − g(1+t))
```

O denominador ser ≤ 0 **não é um preço muito alto: é a inexistência de preço**.
Devolve-se `impossivel` com o motivo e o teto real da margem. Nunca `NaN`,
nunca negativo, nunca `Infinity`. Há um invariante a exigi-lo.

## Armadilhas que já custaram um número errado

- **Bruteamento duplo.** O que entra no solver como custo do tempo é o valor/
  hora **líquido**. A reposição dos impostos acontece **uma vez**, no solver.
  Custou ~57% de preço a mais a um TI antes de ser apanhado.
- **Derivada discreta em zero.** `contribuicoesSS(0)` é zero e
  `contribuicoesSS(1000)` já paga o mínimo de 20 €/mês: a «taxa marginal» dá
  24%, que é um degrau fixo disfarçado. Sem faturação declarada usa-se a taxa
  da banda normal.
- **Arredondar a meio da cadeia.** Os cálculos correm em vírgula flutuante
  completa; arredonda-se só na apresentação, e `precoLiquido`, `iva` e `pvp`
  arredondam-se **em conjunto**. Multiplicar um valor já em cêntimos pelo volume
  produz 616,30 € num sítio e 616,00 € no outro.
- **Desperdício divide, não multiplica.** 10% de quebra → `custo / 0,9`, não
  `custo × 1,1`.
- **Escalões de quantidade são uma escada.** 60 unidades com escalões a 50 e 100
  dão o preço do escalão de 50. Interpolar inventa um desconto que o fornecedor
  não deu.
- **O IRS marginal não é monótono.** Entre ~12 000 € e ~16 000 € passa dos 40%
  (extinção do mínimo de existência) — mais alto do que a 70 000 €. Há um teste
  que **exige** a não-monotonia. Se parecer um bug, não é.

## Regras de produto que não se negoceiam

- **O preço psicológico nunca substitui o recomendado.** Coluna à parte, com o
  custo em margem calculado. Misturar estratégia comercial com viabilidade
  financeira faz a pessoa acreditar que 19,90 € é o preço certo quando é apenas
  o preço redondo.
- **Nunca devolver um número sem faixa.** Dois decimais sozinhos são falsa
  precisão sobre dados que a pessoa estimou de cabeça.
- **Nunca calar um prejuízo.** Preço abaixo do piso → aviso `perigo` com a perda
  por venda quantificada.
- **Nunca inventar preço de mercado.** Sem fonte fiável, o módulo diz «não temos
  dados suficientes». Um vazio honesto vale mais do que um número plausível.
- **Nunca chamar IA a uma sequência de contas.** «O preço subiu porque
  acrescentaste 15% de comissão» é melhor do que «a IA recomenda 27,90 €».
- **O cálculo é grátis, sem conta e sem email.** `access.core: "free"`,
  `privacy: "local-only"` no catálogo não são etiquetas: são promessas que o
  código cumpre (`store/preco.ts`, no cofre, nunca no servidor).

## Cada linha da explicação tem proveniência

`oficial` (lei, via `fiscal-data.ts`) · `mercado` (preçário de terceiro, com
data) · `estimativa` (pressuposto do utilizador). **Não é decorativo:** uma taxa
legal cumpre-se, uma comissão renegoceia-se. Marcá-las igual leva a pessoa à
ação errada.

## Antes de concluir

```bash
npx tsc --noEmit && npm test && npm run build
npm audit --audit-level=high && npm run fiscal:check && npm run busca:check
```

Mais, porque isto é interface: axe em desktop claro, mobile 360 px e desktop
escuro (**zero violações WCAG 2.1 AA** — é o estado atual, mantém-se), sem
overflow horizontal a 360 px, e o resultado antes dos campos em mobile.
