# «A conferência» — o roteiro do palco do salário

> Verbo: **CONFERIR**. A pergunta é «o meu recibo de vencimento está certo?».
> A resposta são dois líquidos que deviam ser o mesmo número e não são.
>
> Ficheiros: `src/components/foco/salario/coreografia.ts` (os atos),
> `PalcoSalario.tsx` (o desenho), `src/lib/foco/dados-servidor.ts` (os
> números). Garantias: `npm run palcos:e2e`.

---

## 0. A coreografia estava certa; o desenho é que não

Este palco é o único do site com **duas colunas em confronto**, e é essa a
razão de o Salário ter deixado de ser «a cascata de deduções do recibo verde
com outros números». Isso ficou como estava, incluindo o beat de que tudo
depende (§3.2).

O que mudou foi tudo o que está por cima.

### 0.1 O modo escuro estava partido — e não por descuido de uma classe

As linhas acendiam com `backgroundColor` animado para
`rgba(246,231,224,.85)` e `rgba(223,240,232,.55)`: dois pastéis claros,
escritos em **literal**. Sobre um cartão `dark:bg-stone-900` isso pinta duas
manchas de papel dentro de uma superfície escura, com o texto claro por cima
a desaparecer.

Nenhuma variante `dark:` podia salvar isto: **um valor literal dentro de
`animate` não passa pelo Tailwind e não sabe que existe um tema.**

A correção é estrutural: o realce passou a ser uma **camada** por baixo do
conteúdo, com classes a sério, e o que se anima é a sua **opacidade** — que
vale o mesmo nos dois temas porque não é uma cor.

### 0.2 A armadilha que a correção destapou

A primeira tentativa escreveu `bg-clay-bg/70 dark:bg-clay-bg/50`, o que
parece cuidadoso e é o contrário.

`globals.css` já remapeia estes tokens no escuro, por seletor de substring:

```css
.dark [class*="bg-clay-bg/"]     { background-color: rgb(61 33 25 / .75); }
.dark [class*="bg-brand-light/"] { background-color: rgb(18 63 46 / .7);  }
```

`.dark [class*="bg-clay-bg/"]` e `.dark .dark\:bg-clay-bg\/50` têm a **mesma
especificidade** (0,2,0). A ordem decide, e no CSS emitido as utilidades vêm
depois. Resultado: **a variante `dark:` ganha do remapeamento e repõe a cor
clara.**

Medido: a camada resolvia para `rgba(246,231,224,.5)` — o pastel de modo
claro — por cima de uma linha escura, e o rótulo por baixo dela deixava de se
ler. Sem a variante, a mesma classe resolve para `rgba(61,33,25,.75)`, que é
o que se quer.

> **A regra que fica:** para os tokens `clay`, `alert`, `categoria` e
> `brand-light` com opacidade, **não escrever `dark:`**. A camada de
> `globals.css` já trata deles, e a variante desfaz o tratamento.

`npm run palcos:e2e` mede a cor calculada de cada superfície de realce nos
dois temas. A olho isto passa por «um realce um bocadinho claro»; a cor
calculada não passa.

### 0.3 Não se parecia com o simulador que responde à mesma pergunta

`ResultadoMotorRecibo` — a ferramenta para onde o CTA deste hero manda — é um
cartão com cabeçalho lavado a verde da marca, dois halos difusos, um número
grande em `font-display`, uma barra segmentada e tabelas com faixa de
cabeçalho e `divide-y`.

O palco tinha uma grelha de quatro colunas com tipos de 9 px e nada disso.
Duas peças que respondem à mesma pergunta e não se parecem uma com a outra
leem-se como dois produtos.

A `SegBar` e a `SegLegend` são **importadas** de `components/dependente/ui`,
não copiadas: são apresentação pura, sem lógica fiscal e sem importar
catálogos, e por isso atravessam a fronteira do cliente sem trazer nada atrás
(a regra 0 de `docs/desempenho.md`).

### 0.4 A resposta principal estava em 11 px

Os dois líquidos em confronto — que **são** o assunto — estavam no rodapé de
uma tabela, do mesmo tamanho das linhas. Subiram para o cabeçalho, lado a
lado, em corpo grande.

---

## 1. A estrutura

```
┌─ cartão (rounded-3xl, shadow-card, tema a sério) ──────────────┐
│  CABEÇALHO LAVADO                                              │
│   [maleta] Recibo de vencimento · bruto de 1 500,00 €          │
│   ┌ No recibo ─┐ ┌ Devia ser ─┐   │ A repartição certa         │
│   │ 1 166,83 € │ │ 1 201,12 € │   │ ▓▓▓▓▓▓▓▓░░▒▒               │
│   └────────────┘ └────────────┘   │ • Fica contigo   1 201,12 €│
│   [aviso] 34,29 € retidos a mais  │ • Retenção IRS     133,88 €│
│                                    │ • Seg. Social      165,00 €│
├────────────────────────────────────────────────────────────────┤
│  TABELA DE CONFERÊNCIA                                         │
│   Linha a linha        | No recibo | Devia ser | ✓             │
│   Vencimento base      | 1 500,00  | 1 500,00  | ✓             │
│   Segurança Social·11% |  −165,00  |  −165,00  | ✓             │
│   Retenção de IRS      |  −168,17  |  −133,88  | ✗             │
│   Subsídios            | incluídos | incluídos | ✓             │
├────────────────────────────────────────────────────────────────┤
│  A LINHA QUE NÃO BATE — motivo, catorze meses, o que fazer     │
└────────────────────────────────────────────────────────────────┘
```

A partir de `lg` o cabeçalho é de duas colunas. A legenda da repartição são
três linhas de rótulo e valor: esticadas por 1 100 px, o rótulo e o número
ficam a um palmo um do outro e deixa de se ler qual pertence a qual.

---

## 2. O erro encenado é REAL

A entidade aplicou a tabela de retenção **sem o dependente** que a pessoa
declarou. É o tipo de engano que ninguém apanha a olho e que só se vê pondo
as duas contas lado a lado — que é exatamente o que este palco existe para
fazer.

As duas colunas saem do **mesmo motor** (`calcularVencimento`), com a única
diferença a ser o dependente. Inventar a linha errada à mão seria encenar uma
auditoria em vez de a fazer.

---

## 3. Os quatro atos

| # | ato | duração | o que acontece |
| --- | --- | --- | --- |
| 1 | **O recibo** | 2 600 ms | o papel chega; bruto, três linhas a `PASSO.irmao`, o líquido |
| 2 | **A conta** | 3 000 ms | a segunda coluna abre e refaz a conta a partir do bruto |
| 3 | **Conferir** | 3 000 ms | as três que batem acendem juntas; **silêncio**; a que falha |
| 4 | **Porquê** | 3 000 ms | o motivo, os catorze meses, e o que isso significa |

### 3.1 Destino comum, ao contrário

Em todos os outros palcos, o que se move em conjunto **agrupa-se**. Aqui o
agrupamento serve para **excluir**: as linhas que batem acendem todas ao
mesmo tempo (`bate1` a 620 ms, `bate2` a 710, `bate3` a 800 — dentro de
`PASSO.uno`, portanto uma confirmação e não três), e a que não bate vê-se por
**não ter acendido com elas**. A Lei do Destino Comum usada como pinça em vez
de como cola.

### 3.2 O silêncio de 800 ms

Entre `bate3` (800 ms) e `falha` (1 600 ms). É mais do dobro de `PASSO.outro`
e o silêncio mais longo do site.

É o beat de que tudo depende: sem ele a linha errada seria só mais uma a
acender; com ele, é a única que ficou de fora.

> O comentário na coreografia dizia «380 ms» — o valor da constante, não o
> intervalo real. Foi corrigido: sempre foram estes 800.

---

## 4. Os dois valores nascem iguais

`ValorEmConfronto` só ganha cor — argila de um lado, verde do outro — no beat
`marcaFalha`, no ato 3. Até lá são dois cartões neutros com o mesmo peso.

Marcar um deles à entrada seria dar a resposta antes de fazer a conferência,
e a conferência é o produto.

---

## 5. O que a medição garante

`npm run palcos:e2e`, com uma build servida:

- a cena não bloqueia a thread principal e não perde frames;
- a cena **acaba** e o cabeçalho diz que acabou;
- **cada superfície de realce resolve para a cor do tema em que está** — no
  claro os pastéis, no escuro os tons remapeados —, medido pela cor
  calculada e não a olho;
- a moldura acompanha o tema.
