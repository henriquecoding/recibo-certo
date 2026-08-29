# Roteiro de interação — **a bússola** (o hero de `/`)

> Fonte de verdade do comportamento do hero da homepage.
> `components/foco/HeroBussola.tsx` executa-o, `components/palco/usePalco.ts`
> guarda a máquina de estados, `coreografia-bussola.ts` guarda os tempos, e
> `scripts/verificar-bussola.mjs` (`npm run bussola:e2e`) mede-o. Se o código e
> este roteiro discordarem, um dos dois está errado — decide-se qual, não se
> «harmoniza».
>
> A coreografia da mão vive em `roteiro-animacao-ponteiro.md`; a estrutura da
> página em `roteiro-homepage-cinco-focos.md`.

---

## 0. O que este hero faz, numa frase

**Aponta-se uma pergunta e a resposta aparece, com o número verdadeiro, antes de
qualquer clique.**

Tudo o resto neste documento existe para que esse gesto funcione da mesma
maneira com um rato, com um dedo, com um teclado e com um leitor de ecrã — e
para que a demonstração que o ensina nunca discuta com quem já o percebeu.

---

## 1. As quatro versões, e o que cada uma errou

| # | O que era | O que estava errado |
| --- | --- | --- |
| 1 | «Sou trabalhador independente / por conta de outrem» | Perguntava **quem és**. A NN/g tem cinco razões documentadas contra navegação por audiência; três batem em cheio aqui. |
| 2 | O cartão removido, e nada no lugar | O cartão estava **na página**, no ponto de decisão. Uma cápsula no cabeçalho serve quem já sabe para onde vai. |
| 3 | A bússola por baixo de um hero de recibos verdes | Uma lista de cinco perguntas **sem resposta nenhuma**, debaixo de uma promessa que só servia um dos cinco caminhos. |
| 4 | A bússola **como** hero | A leitura ficou certa e a **interação** ficou por resolver. É o que a versão 5 corrige, e é o assunto deste documento. |

### O que a versão 4 deixou por resolver

- **O roteiro roubava o painel de volta.** Sobrevoar suspendia a demonstração e
  afastar o rato retomava-a — a trocar a resposta que a pessoa tinha aberto.
- **O teclado gastava cinco paragens de tabulação**, sem setas, e a resposta
  trocava em todas.
- **Quem usa ecrã tátil não conseguia apontar de todo.** Sem sobrevoo, tocar
  numa pergunta saltava logo para outra página. O gesto central do hero estava
  indisponível a metade do público.
- **A resposta trocava de um fotograma para o outro.** Um número que substitui
  outro sem chegar não se lê como resposta nova.
- **As duas metades de `/` não se falavam.** Ver §5.

---

## 2. Quem manda no painel

Duas fontes, e a segunda vence assim que existir:

```
aberto = escolhido ?? posiçãoDoRoteiro
```

### 2.1 A primeira interação ENTREGA o palco

Não suspende: **entrega**. `usePalco.entregar()` marca a cena como acabada onde
está, e o roteiro não volta a mexer no painel nesta visita.

> A versão anterior usava uma **suspensão** — o relógio parava enquanto o rato
> estivesse em cima e voltava sozinho ao sair. Parecia delicado e era o
> contrário: bastava afastar o rato para o roteiro trocar a resposta que a
> pessoa tinha acabado de abrir. **Uma demonstração que retoma o comando depois
> de alguém lhe tocar está a discutir com quem a está a usar.**

Consequências, todas deliberadas:

- **A escolha fica.** `mouseleave` não desfaz nada.
- **A mão encenada sai de cena.** Duas mãos ao mesmo tempo no mesmo sítio não é
  uma demonstração — é uma disputa.
- **O botão «Pausar» desaparece** e fica só «Rever». Um botão de pausa sobre uma
  cena que já não anda é um controlo que mente.
- **«Rever» e os passos da régua largam a escolha.** Sem isso o roteiro corria
  por baixo de um painel preso e a demonstração andava sem se ver.

### 2.2 O sobrevoo é leitura, não decisão

Sobrevoar abre a resposta. **Não** escreve nada persistente. Passar o rato por
uma pergunta é ler; reconfigurar uma página inteira duas dobras abaixo por causa
disso seria estado invisível a comandar a interface — que é o defeito de origem
desta página, com outra roupa.

O único gesto que escreve é o **botão** «Experimentar já, aqui» (§5).

---

## 3. Os quatro apontadores

### 3.1 Rato

`mouseenter` abre. É o caso simples, e é o único que a versão 4 servia.

### 3.2 Teclado — uma paragem de tabulação, setas lá dentro

A APG do W3C é explícita: **Tab e Shift+Tab movem-se entre widgets; as setas
tratam da navegação interna.** A bússola é um widget composto — a seleção
comanda um painel de detalhe.

| Tecla | O que faz |
| --- | --- |
| `Tab` | Entra na bússola, **na pergunta aberta** |
| `↑` `↓` `←` `→` | Anda uma pergunta, com volta ao fim |
| `Home` / `End` | Primeira / última |
| `Enter` | Abre a leitura dessa pergunta (é uma ligação de verdade) |
| `Tab` outra vez | **Sai** da bússola |

Implementado com *roving tabindex*: só a pergunta aberta tem `tabIndex={0}`; as
outras têm `-1`. Antes eram cinco paragens e passar o hero custava cinco `Tab`,
com a resposta a trocar em todas.

A pergunta aberta leva `aria-current="true"`.

### 3.3 Ecrã tátil — o primeiro toque abre, o segundo entra

Não há sobrevoo. Sem isto, tocar numa pergunta saltava logo para outra página e
o gesto central do hero — apontar para comparar — não existia.

É **o comportamento nativo do iOS** para ligações que dependem de sobrevoo: o
Safari transforma-as em duplo toque sozinho. Aqui tem de ser explícito, porque o
painel nunca está escondido (só muda de conteúdo) e por isso o Safari não o faz.

Três coisas tornam-no honesto em vez de sorrateiro:

1. **A seta muda para um chevron para baixo** na pergunta aberta — deixa de
   dizer «vou-te levar dali» e passa a dizer «isto abre».
2. **O rótulo muda para «Toca outra vez para abrir».** Um primeiro toque que não
   navega, sem nada a dizê-lo, lê-se como uma ligação avariada.
3. **A resposta rola para o ecrã.** Neste tamanho ela está por baixo da lista;
   abrir sem a mostrar é abrir para lado nenhum.

A deteção é `(hover: hover) and (pointer: fine)` — a pergunta é sobre o
**apontador**, não sobre a classe de aparelho. Um portátil com ecrã tátil tem os
dois; um tablet com rato passa a ter sobrevoo.

E sem JavaScript não há nada disto: as cinco linhas são `<a href>` reais no HTML
servido e navegam ao primeiro toque, que é o comportamento certo quando não há
painel para atualizar.

### 3.4 Leitor de ecrã

- Cada linha tem, em `sr-only`, o **destaque e a legenda** da sua resposta. A
  animação é a forma de dizer isto — nunca o único sítio onde está dito.
- O `<ol>` declara `aria-controls` para o painel.
- Há uma região `aria-live="polite"` que anuncia a resposta aberta **só quando
  foi a pessoa a mexer**. Um `aria-live` que dispara com o roteiro fala por cima
  de tudo durante nove segundos a alguém que nem chegou ao hero.

---

## 4. A chegada da resposta

O conteúdo do painel remonta por `key={foco}`, e as cinco partes entram
desfasadas a **90 ms** — `PASSO.uno` da gramática de movimento, o degrau que
está *abaixo* do limiar em que se julga a ordem de dois acontecimentos. Não são
cinco coisas a chegar: é **uma a chegar com espessura**.

Vive em `.resposta-entra`, em `globals.css`, e com `prefers-reduced-motion:
reduce` a animação não existe — a resposta aparece inteira, de uma vez e no
sítio. Não é uma versão pobre: é a mesma informação sem o trajeto.

### 4.1 Não se aponta para o que ainda está a chegar

As cinco linhas entram deslocadas 10 px e sobem durante 420 ms. Enquanto sobem,
`pointer-events: none`.

Sem isso, apontar para uma linha a meio da entrada punha o cursor sobre ela e,
100 ms depois, sobre a de baixo — **a resposta que abria não era a da pergunta
para onde a pessoa tinha apontado**. Apanhado pela verificação automática, que é
exatamente onde um erro de 10 px se apanha.

---

## 5. A integração — como as duas metades de `/` voltaram a falar

A homepage tem **dois eixos**, e o cabeçalho de `focos.ts` diz que ter dois era
o defeito de que todos os outros descendiam:

| Eixo | Onde vive | O que manda |
| --- | --- | --- |
| `foco` | no URL (`/?foco=…`) | o hero |
| `Perfil` | em `localStorage` | a calculadora, o «Explorar», o FAQ |

Enquanto o hero antigo existiu, os dois encontravam-se num sítio: era ele que
escrevia o `Perfil`. **Ao substituí-lo pela bússola, esse encontro
desapareceu** — escolhias uma pergunta em cima e a calculadora continuava no que
estivesse guardado de uma visita anterior, sem nada a explicar porquê.

O laço voltou a fechar-se em dois pontos, e só nesses:

1. **De cima para baixo** — o botão «Experimentar já, aqui» no painel escreve o
   perfil e rola até `#calculadora`. Um gesto deliberado, nunca o sobrevoo.
2. **De baixo para cima** — a secção da calculadora diz **a que pergunta está a
   responder**, com o caminho de volta à leitura completa dela.

`PERFIL_DO_FOCO` é a **inversa exata** de `FOCO_DO_PERFIL_ANTIGO`, derivada e
não escrita, com um teste a exigi-lo. Duas tabelas à mão seriam duas respostas
para a mesma pergunta.

É **parcial de propósito**: «Preço» não tem simulador na homepage e por isso não
tem botão. Inventar-lhe um levava a pergunta a um simulador que não a responde.

---

## 6. Eficiência

- **`memo` nas cinco linhas e nos controlos.** O relógio muda de estado a cada
  beat, e há dezenas por ato. Sem isto, as cinco linhas redesenhavam-se dezenas
  de vezes por segundo durante os nove segundos do roteiro — para nada, porque
  só uma muda de estado de cada vez.
- **Os controlos ao nível do módulo.** Declarados dentro do hero eram um *tipo
  de componente novo* a cada render: o React desmontava-os e voltava a montá-los
  a cada beat, a `barraRef` perdia o elemento (a barra congelava) e o foco do
  teclado saltava para o corpo da página.
- **O realce é um elemento só, movido por `ref`**, e não cinco a acender e a
  apagar. Um indicador que se move diz que há **um** sítio de cada vez.
- **Zero cálculo no cliente.** As cinco respostas são resolvidas no servidor
  (`lib/foco/respostas-servidor.ts`); atravessam a fronteira só as strings já
  formatadas.

---

## 7. O que este roteiro proíbe

1. **Que o roteiro volte a mexer no painel depois de alguém lhe tocar.**
2. **Que o sobrevoo escreva estado persistente.**
3. **Que a bússola custe mais do que uma paragem de tabulação.**
4. **Que um apontador grosseiro fique sem forma de apontar.**
5. **Que uma resposta apareça sem chegar** — ou que chegue a quem pediu menos
   movimento.
6. **Que as cinco perguntas deixem de ser `<a href>` reais no HTML servido.**
7. **Que apareça uma terceira tabela a mapear focos e perfis.**

---

## 8. Como se verifica

`npm run bussola:e2e`, contra uma **build** servida (`npm run build && npx next
start`). Cinco blocos, um por garantia:

| # | Mede |
| --- | --- |
| 1 | Premir não desloca o ponteiro, e a escala é animada e não comutada |
| 2 | Sobrevoar entrega o palco, a escolha fica, o roteiro não a rouba |
| 3 | Uma só paragem de tabulação; setas, `Home`/`End` e volta ao fim |
| 4 | Primeiro toque abre e não navega; segundo toque navega |
| 5 | «Experimentar já, aqui» escreve o perfil, o URL e a linha de retorno |

Mais a auditoria de acessibilidade (`scripts/auditar-a11y-focos.mjs`) em quatro
combinações de largura e tema, e `npm run navegacao:e2e` para as colisões de
navegação.

> **Afastar o rato antes de medir.** Um cursor a sério em cima de uma pergunta
> entrega o palco — de propósito — e à distância isso lê-se como uma avaria que
> não existe. Já custou uma hora.
