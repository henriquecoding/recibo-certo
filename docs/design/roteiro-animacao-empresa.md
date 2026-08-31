# Roteiro de animação — «O ponto de viragem» (`/?foco=empresa`)

> Fonte de verdade da coreografia deste palco. `components/foco/empresa/coreografia.ts`
> guarda os tempos; `PalcoEmpresa.tsx` executa-os.
>
> A gramática de movimento é a de `roteiro-animacao-preco.md` §1.

---

## 0. O que este palco tem para dizer

> **A resposta é «depende», e o «de quê» é um número.**

O verbo é **virar**. Quase toda a gente responde a «compensa abrir empresa?» com
uma regra de bolso ouvida a alguém. A conta existe, e o que a torna difícil não é
a matemática: é lembrar-se de contar o que a empresa custa **antes** de render.

---

## 1. Porque é que o gráfico desenha a DIFERENÇA

Isto foi corrigido depois de implementado, verificado e a passar em tudo. Fica
escrito porque a versão errada era defensável e a razão de estar errada não é
óbvia.

**A primeira versão traçava os dois líquidos absolutos sobre o mesmo eixo.** Era
honesta e era ilegível: com o zero em baixo e 130 mil euros em cima, uma
diferença de três mil euros são dois pixéis. As duas linhas corriam coladas e o
«cruzamento» — a única coisa que este palco tem para dizer — não se via cruzar.

Cortar o eixo em baixo resolveria, e é a mentira clássica de um gráfico.

**A resposta certa era outra: a pergunta deste palco não é «quanto rende cada
um», é «qual deles rende mais, e a partir de quando».** Essa tem uma resposta de
uma dimensão só.

O que se desenha passou a ser `empresa − recibos verdes`. Começa **abaixo do
zero**, mergulha quando o custo da contabilidade entra, sobe, e **cruza o zero**
no ponto de viragem. O zero é o eixo verdadeiro — nada é truncado — e o
cruzamento passou a ser impossível de não ver, porque é o instante em que a
linha muda de lado.

É o princípio da congruência: **a forma do gráfico passou a ser a forma da
pergunta.**

### 1.1 Três consequências

1. **O eixo vai a 190k e não a 150k.** Com o teto em 150k o cruzamento caía aos
   93% da largura — encostado à moldura, sem nada depois dele. Um ponto de
   viragem que acontece na margem não se lê como viragem. A 190k fica a ~71% e
   sobram dois pontos para a linha se afastar do zero depois de o cruzar.
2. **O marcador não interpola nada.** O cruzamento está *em cima* do zero por
   construção — é a definição de ponto de viragem.
3. **Duas referências de escala.** Sem elas a linha diz «sobe» e não diz
   «quanto», e «quanto» é o que distingue um argumento de uma seta para cima.

---

## 2. A linha temporal

### ATO 1 — SITUAR · 2 400 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `eixo` | A grelha e a linha do zero desenham-se |
| 420 | `marcas` | As marcas de faturação acendem ao longo do eixo (3 × 80 ms) |
| 1200 | `marcador` | A tracejado, a faturação do exemplo |
| 1700 | `legenda` | O rótulo do eixo |

O marcador do exemplo **fica onde está** durante toda a cena. É por ele que a
pessoa vê de que lado está quando o cruzamento aparecer.

### ATO 2 — TRAÇAR · 3 200 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `abreLinhas` | A área abre |
| 340 | `linhaRV` | A linha começa a crescer da esquerda (1 600 ms) |
| 430 | `linhaEmpresa` | A mancha acompanha-a |
| 2000 | `rotulos` | A legenda das duas zonas |
| 2500 | `semCustos` | A linha está no seu valor **sem** o custo da contabilidade |

Os dois a `PASSO.uno` (90 ms): não são dois acontecimentos, é a mesma pergunta a
receber duas respostas.

### ATO 3 — CUSTAR · 2 800 ms

> Intenção: impedir a leitura fácil.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `fichaCusto` | O cartão do custo fixo acende |
| 780 | `afunda` | A linha **mergulha** até ao seu valor real (900 ms) |
| 1420 | `detalhe` | Porque é obrigatória e mensal |
| 2100 | `fosso` | A faixa entre as duas alturas da linha — o que a sociedade tem de recuperar |

**Sem este ato, «empresa» pareceria sempre melhor acima de um limiar qualquer.**
Com ele vê-se que há um fosso a recuperar primeiro. É a diferença entre uma
demonstração e um anúncio.

### ATO 4 — VIRAR · 3 600 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `aproxima` | A linha aproxima-se do zero |
| 900 | `cruza` | O marcador do cruzamento aparece |
| 1500 | `acendeCruz` | Acende, com `ASSENTA` |
| 1800 | `valor` | O valor da viragem, a contar |
| 2500 | `ondeEstas` | As duas barras do exemplo, com a vencedora marcada |
| 3100 | `resolve` | A ressalva: um número não decide sozinho |

---

## 3. O que este palco proíbe

- **Cortar o eixo em baixo.** É a mentira clássica de um gráfico, e aqui seria
  desnecessária: a diferença já é a dimensão certa.
- **Desenhar os dois absolutos.** Já foi tentado. Ver §1.
- **Traçar a linha sem o custo fixo.** O ato 3 é o que impede a leitura fácil.
- **Um cruzamento encostado à moldura.** Um ponto de viragem que acontece na
  margem não se lê como viragem.
- **Uma linha sem escala.** «Sobe» não é um argumento.
