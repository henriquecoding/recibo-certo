# «O ponto de viragem» — o roteiro do palco da empresa

> Verbo: **VIRAR**. A pergunta é «compensa abrir empresa?». A resposta é
> «depende», e o «de quê» é um número.
>
> Ficheiros: `src/components/foco/empresa/coreografia.ts` (os atos),
> `PalcoEmpresa.tsx` (o desenho), `src/lib/foco/dados-servidor.ts` (os
> números). Garantias: `npm run palcos:e2e` e
> `src/lib/__tests__/foco-empresa-interacao.test.ts`.

---

## 0. O que estava errado, e o que a medição disse

O palco anterior traçava uma linha de diferença (`empresa − recibos verdes`)
a cruzar o zero, dentro de um `<svg>`, com um `<input type="range">` por
baixo. Três defeitos, e o mais importante não era o que parecia.

### 0.1 O custo fixo era narrado e não era descontado

O palco dizia — em `sr-only`, na narração e na página — que «ter empresa
custa cerca de 1 920 € por ano em contabilidade, antes de qualquer imposto, e
é esse custo que empurra o ponto de viragem». `compararCategorias` era
chamado **sem `custosEmpresa`**, cujo valor por omissão é zero. O ponto de
viragem publicado era o de uma sociedade que não paga contabilista.

`empresaSemCustos` — o «contrafactual» de que o ato do custo dependia — era
`liquido + avença`: um custo que nunca tinha sido subtraído, somado de volta.
Não havia fosso nenhum para mostrar porque não havia fosso nenhum.

O teste que devia ter apanhado isto recalculava a esperança **com o mesmo
argumento em falta** que o código de produção. É o modo de falha mais caro
de um teste: parece cobertura e é um espelho.

Com a avença contada, a viragem passa de **~148 000 €** para **~180 500 €** —
e diz uma coisa que a versão anterior escondia: com os lucros todos
retirados, a sociedade só passa à frente **perto do teto do regime
simplificado**.

### 0.2 «Travada, cheia de bugs e lags» — medido, não suposto

A suspeita óbvia era o custo de render: o crescimento vinha de um
`useProgresso`, que é `setState` a 60 Hz, e cada frame voltava a renderizar a
cena inteira — quarenta pontos de `polyline`, o seletor e dois contadores.

**Medido lado a lado, não era isso.** A versão antiga e a nova, com a cena a
correr e com um arrasto lento de ponta a ponta:

| | 1× | 4× | 6× |
| --- | --- | --- | --- |
| antes, cena | 0,3 % | 0,9 % | 10,5 % |
| depois, cena | 0,5 % | 1,4 % | 10,8 % |
| antes, arrasto | 0,0 % | 0,8 % | 11,3 % |
| depois, arrasto | 0,2 % | 1,2 % | 10,0 % |

(frames acima de 32 ms, com estrangulamento de CPU do CDP.)

São a mesma coisa. E a 6× o que se perde é da **página** — o hero, a
navegação, a hidratação —, não do palco.

O que estava mesmo avariado era a **interação**, e vê-se num toque:

- **O `<input type="range">` não respondia a dedo nenhum.** Toque simples e
  arrasto de dedo sobre a calha, a 390 px: o valor ficava em 25 e não se
  mexia, nem uma vez. Num telemóvel, o único controlo do palco era inerte.
  É exatamente a palavra «travada».
- **`setPointerCapture` derrubava a árvore.** Atira `NotFoundError` quando o
  `pointerId` já não está ativo, e uma exceção por tratar num tratador de
  eventos do React desmonta o subárvore: o palco **desaparece** do ecrã a
  meio de um gesto. Como a captura era a primeira linha do tratador, um
  toque simples também não movia nada — a exceção acontecia antes de o valor
  ser atualizado. O mesmo defeito estava em `ComparadorCenarios`, de onde o
  padrão veio, e foi corrigido lá também.

### 0.3 A forma não era a forma da pergunta

A pergunta é um **limiar** — «a partir de quanto?» —, e um limiar tem duas
zonas e uma fronteira. Uma curva a subir tem infinitos valores intermédios
que ninguém precisa de ler, e precisa de **espaço depois do cruzamento** para
se ler como cruzamento — o que obrigava a escolher o teto do eixo pela
estética em vez de pelo domínio da pergunta.

---

## 1. As três peças, e de onde vêm

Nenhuma é nova nesta casa. As duas primeiras estão provadas em
`ComparadorCenarios`, que o utilizador aponta como «ótima estrutura com dados
reais e trabalhada de verdade». Reaproveitá-las não é poupança: é o mesmo
gesto a responder à mesma pergunta em dois sítios do site.

### 1.1 A régua de faturação

Um `div` com `role="slider"`, não um `<input type="range">`. Três razões que
só aparecem quando se tenta:

- O nativo **não deixa desenhar nada dentro da calha**. O marcador da viragem
  — que é a resposta do palco — tinha de viver numa legenda por baixo, longe
  do sítio onde acontece.
- Estilar o puxador exige uma cadeia de `::-webkit-slider-thumb`,
  `::-moz-range-thumb` e `::-moz-range-track` que diverge entre motores e não
  aceita animação de escala ao premir.
- `setPointerCapture` dá arrasto que continua fora do elemento, que é o que
  um dedo faz.

O que o nativo dava de graça fica explícito: `aria-valuemin/max/now/text`,
setas com `Shift` para saltos de cinco degraus, `Home`/`End`, e
`touch-action: none` para o arrasto não virar scroll da página.

**A escolha é pela FATURAÇÃO e não pelo índice.** A grelha tem um degrau
extra — o ponto exato da viragem, que não cai num múltiplo de 5 000 € —, e
por isso os índices não estão igualmente espaçados. Escolher por índice fazia
o puxador saltar por cima da própria resposta que o palco existe para
mostrar.

### 1.2 As duas colunas repartidas

«Para onde vai cada euro», o mesmo desenho do comparador. **Mesma altura
porque partem da mesma faturação**; o que se compara é o tamanho da fatia que
fica.

Isto só é honesto enquanto cada repartição fechar a conta, e fecha por
identidade do motor (`bruto = líquido + o que sai`), não por coincidência:

```
recibos verdes:  faturação = líquido + IRS + Segurança Social
sociedade:       faturação = líquido + IRC/derrama + dividendos + contabilidade
```

O teste `reparte cada euro sem sobrar nem faltar` exige que continue a
fechar, com 4 € de tolerância para o arredondamento de cada parcela.

Uma regra de cor, e uma só: **o verde vivo é sempre o que fica contigo**, em
qualquer coluna. Se a fatia verde de uma for maior, é essa que compensa — e
isso tem de se poder ler sem legenda nenhuma.

### 1.3 A faixa do domínio

A fronteira, desenhada como o que é: uma barra com dois lados e um corte.
Entra **neutra** no ato 1 — ainda não há resposta — e **parte-se** no ato 4.
Uma barra com um corte lê-se encostada à margem tal como no meio, e por isso
o teto da escala deixou de ser uma decisão de enquadramento.

---

## 2. A escala acaba no limite legal

De 15 000 € ao valor de `REGIME_SIMPLIFICADO.limite` (200 000 €, Art. 28.º do
CIRS). O teto não é estética: **acima dele a contabilidade organizada deixa de
ser opcional** e a pergunta deste palco — «simplificado ou sociedade?» —
deixa de ter as duas respostas que compara. Parar exatamente aí é a única
fronteira honesta que a escala pode ter, e há um teste a exigi-lo.

---

## 3. Os quatro atos

| # | ato | duração | o que acontece |
| --- | --- | --- | --- |
| 1 | **O cenário** | 2 400 ms | a régua, o valor, a escala, e a faixa do domínio ainda neutra |
| 2 | **Cada euro** | 3 000 ms | as duas colunas crescem **juntas**, os rótulos, os dois líquidos |
| 3 | **O custo** | 2 600 ms | tudo recua e só a contabilidade fica acesa; a ficha nomeia o fosso |
| 4 | **A viragem** | 3 200 ms | a faixa parte-se, o marcador assenta, o número conta, o veredicto |

### 3.1 As duas colunas crescem ao mesmo tempo, e é deliberado

A regra geral da casa é que dois acontecimentos importantes não se sobrepõem.
Aqui as duas colunas crescem em simultâneo, à mesma velocidade, na mesma
direção — destino comum na sua forma mais pura — porque são a **mesma
faturação a ser repartida de duas maneiras**. O acontecimento não é nenhuma
delas chegar: é a diferença entre as duas fatias verdes. Separá-las no tempo
destruiria a comparação.

### 3.2 O ato 3 ISOLA, não acrescenta

Sem ele, «empresa» parece só uma coluna com mais impostos. Com ele — a
contabilidade acesa sozinha enquanto tudo o resto baixa para 22 % de opacidade
— vê-se que há um custo fixo que existe **antes do primeiro euro de imposto**
e que a faturação tem de recuperar primeiro.

Isolar em vez de acrescentar também tem uma razão de exatidão: a fatia já lá
está desde o ato 2, porque a conta que a produziu já a descontou. Fazê-la
«entrar» mais tarde obrigaria a desenhar antes uma sociedade sem
contabilista — um cenário que não existe e que o palco passaria a afirmar
durante três segundos.

**Recuar é baixar a opacidade, nunca a altura.** Uma fatia que encolhe é uma
fatia que vale menos, e neste ato nada mudou de valor.

---

## 4. A régua não abre no ponto de viragem

O contrário do óbvio, e foi preciso pôr a correr para o ver.

A primeira versão abria lá — «é a resposta que o palco tem para dar». Posto a
correr, a cena inteira resolvia-se em **«a empresa passa à frente, +2 €»**: no
cruzamento os dois caminhos valem, por definição, o mesmo. As duas colunas
ficavam idênticas (57 % e 57 %), a fatia da contabilidade valia 1 % da
faturação e não se via, e o veredicto anunciava uma vitória de dois euros.

**O cruzamento é o sítio onde a comparação é menos legível.** Ele já está dito
três vezes — no marcador da calha, no corte da faixa e no número grande da
ficha. A régua abre no exemplo editorial (30 000 €), onde a diferença se vê
(72 % contra 56 %) e onde o custo fixo ainda pesa o suficiente para ter uma
fatia.

Abaixo de 1 € de diferença o veredicto diz «aqui as duas valem o mesmo» e não
mostra número: chamar vitória a ruído de arredondamento seria transformá-lo
numa recomendação.

---

## 5. O tema, e porque não há `dark:` neste ficheiro

O palco escuro é escuro nos **dois** temas (`#0c251e`, ver `MolduraPalco`).
Classes com variante de tema trocariam de valor com a preferência do sistema
para um fundo que não muda — meio caminho para o modo claro mostrar dois
verdes quase pretos um ao lado do outro, que é precisamente o problema que
`globals.css` documenta para o comparador.

A paleta está fixada em `TINTA`, escolhida contra `#0c251e` e não contra o
papel da página. O painel de decisão que era um retângulo cor de creme
(`#fbf8f1`) dentro do palco escuro desapareceu: era a peça que fazia o hero
parecer não pensado para o escuro.

---

## 6. O que a medição garante

`npm run palcos:e2e`, com uma build servida:

- a cena não bloqueia a thread principal e não perde frames;
- a cena **acaba** e o cabeçalho diz que acabou;
- a régua responde a arrasto, a toque, a teclado (setas, `Shift`, `Home`,
  `End`) e move as duas colunas;
- **um arrasto de dedo não desmonta o palco** — a garantia que a correção do
  `setPointerCapture` existe para manter, escrita com eventos de toque crus
  porque `touchscreen.tap` os higieniza e não reproduz o defeito;
- não transborda a 390 px.
