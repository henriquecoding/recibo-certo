# Roteiro de animação — a mesa de decisão de «Descobrir»

> Fonte de verdade da coreografia de `/?foco=descobrir`. O palco implementa
> este roteiro em `src/components/descobrir/PalcoDescobrir.tsx`; os tempos e o
> relógio vivem em `src/components/descobrir/coreografia.ts`. Se o desenho e o
> código divergirem, a divergência é um defeito — não uma interpretação.

## 0. O problema da primeira versão

A primeira versão tinha a estética certa e a gramática errada. Mostrava quatro
cartões já completos e avançava entre eles com opacidade, elevação e checks.
Isso explicava a ordem por palavras, mas não mostrava o raciocínio.

| Sintoma | Causa |
|---|---|
| Parece uma apresentação de slides | Cada ato é um painel independente |
| A hipótese já existe no primeiro frame | O resultado final está visível antes de ser construído |
| As restrições parecem filtros decorativos | Nada é removido quando uma restrição chega |
| Evidência e lacuna parecem apenas cores | Não há separação espacial entre o observado e o desconhecido |
| O loop perde significado | A cena recomeça indefinidamente sem ação da pessoa |
| O leitor de ecrã é interrompido | O `aria-live` anuncia cada avanço automático e volta a repeti-lo |

A correção parte de uma regra única:

> **Nada muda sem uma causa visível. Um sinal viaja, chega e só então altera a
> decisão.**

O palco deixa de ser uma fila de quatro cartões e passa a ser uma única mesa de
decisão com três zonas persistentes: **entrada → motor → hipótese**.

## 1. Referências reais e o que é aproveitado

### Stripe Radar

Referência: <https://stripe.com/radar>

O hero apresenta uma entidade central e sinais que convergem para ela. O que se
aproveita não é a aparência azul/roxa: é a causalidade espacial. A pessoa vê o
sinal, o percurso e a consequência no mesmo enquadramento.

Aplicação no Recibo Certo: competências, restrições e proveniência atravessam a
mesa; só a chegada altera o estado do candidato.

### Linear

Referências:

- <https://linear.app/>
- <https://linear.app/now/behind-the-latest-design-refresh>

A Linear põe produto real no palco e deixa a estrutura ser sentida sem cobrir a
interface de separadores. A animação serve a leitura da ferramenta, não uma
metáfora abstrata.

Aplicação no Recibo Certo: o palco usa objetos que existem no motor — contexto,
fronteiras, fontes, lacunas, hipótese, primeiro teste e critério de rejeição.
Não há partículas, órbitas, globos ou uma “IA” luminosa.

### Carbon Design System

Referências:

- <https://v10.carbondesignsystem.com/guidelines/motion/overview/>
- <https://carbondesignsystem.com/elements/motion/resources/>

Carbon separa movimento produtivo de movimento expressivo e recomenda reservar
o segundo para momentos importantes. A maior parte desta cena é produtiva; o
único assentamento expressivo é a hipótese final.

### Motion

Referências:

- <https://motion.dev/docs/react-layout-animations>
- <https://motion.dev/docs/react-svg-animation>
- <https://motion.dev/examples/react-motion-path>

O projeto já usa Motion. A continuidade vem de transformações, opacidade e
trajetos medidos no DOM; não entra uma dependência, vídeo, canvas ou modelo 3D.

### Desempenho e acessibilidade

Referências:

- <https://web.dev/articles/animations-guide>
- <https://web.dev/articles/prefers-reduced-motion>
- <https://www.w3.org/WAI/WCAG22/quickref/#pause-stop-hide>
- <https://www.w3.org/WAI/WCAG22/Techniques/css/C39>
- <https://www.nngroup.com/articles/animation-usability/>

As viagens usam `transform` e `opacity`. O movimento automático pode ser
pausado, termina depois de uma passagem e desaparece por completo quando a
pessoa pede movimento reduzido. Mudanças automáticas não entram num
`aria-live`; só a navegação manual é anunciada.

## 2. Gramática de movimento

### 2.1 Curvas

| Nome | Valor | Uso |
|---|---|---|
| `ENTRADA` | `cubic-bezier(.16, 1, .3, 1)` | conteúdo que chega e assenta |
| `SAIDA` | `cubic-bezier(.7, 0, .84, 0)` | conteúdo rejeitado ou que parte |
| `VIAGEM` | `cubic-bezier(.65, 0, .35, 1)` | ficha entre uma origem e um destino |
| `ASSENTA` | `cubic-bezier(.34, 1.42, .64, 1)` | apenas a hipótese final |

`ASSENTA` não se usa em fades, texto ou controlos. Só a conclusão tem massa
suficiente para ultrapassar ligeiramente o alvo e regressar.

### 2.2 Durações

| Escala | Duração | Exemplo |
|---|---:|---|
| micro | 140–180 ms | foco, hover, controlo |
| entrada | 360–480 ms | linha, etiqueta, estado |
| viagem | 680–820 ms | ficha entre zonas |
| rejeição | 440–560 ms | candidato riscado e arquivado |
| conclusão | 760 ms | hipótese a assentar |

### 2.3 O arco

Cada ficha nasce no centro real do elemento de origem e termina no centro real
do destino. Os dois pontos são medidos depois do layout. Por isso, no desktop a
viagem é sobretudo horizontal e no telemóvel torna-se vertical sem coordenadas
específicas para cada viewport.

O caminho é uma Bézier quadrática com desvio pequeno (16% da distância). Uma
reta parece teletransporte; um arco demasiado largo parece decoração.

### 2.4 Silêncios

Existem três pausas narrativas deliberadas:

1. 260 ms depois de o último contexto chegar — tempo para ler “contexto lido”.
2. 360 ms entre o dado oficial e as lacunas — observado e desconhecido não são
   a mesma coisa.
3. 320 ms entre a hipótese chegar e o primeiro teste aparecer — o título
   assenta antes da explicação.

## 3. Atores

| Ator | Significado | Regra |
|---|---|---|
| Ficha de contexto | competência, capacidade ou disponibilidade | ao chegar, preenche um encaixe da mesa |
| Ficha de fronteira | condição que elimina | ao chegar, risca exatamente um padrão incompatível |
| Ficha de fonte | proveniência observada | ao chegar, acende apenas a zona “Observado” |
| Ficha de prova | forma de resolver uma lacuna | não finge preencher a lacuna; cria uma ação de validação |
| Candidatos estruturais | famílias incompatíveis e sobrevivente | nunca recebem scores inventados |
| Hipótese | candidato que sobreviveu e ganhou teste | só existe visualmente no último ato |
| Anel de impacto | instante de chegada | toca uma vez e desaparece |

As fichas são `aria-hidden`: são a forma visual de uma explicação que também
existe como texto estático acessível.

## 4. Linha temporal

Os tempos são milissegundos desde o início de cada ato. Um beat é disparado por
um único relógio `requestAnimationFrame`. Pausar deixa de acumular tempo; não há
cadeias de `setTimeout` para dessincronizar.

### Ato 1 — Ler o contexto · 3 000 ms

| ms | Beat | Consequência |
|---:|---|---|
| 0 | `abreEntrada` | a bandeja de contexto ganha foco |
| 220 | `enviaCompetencia` | “Organizar e executar” parte |
| 520 | `enviaDados` | “Trabalhar com dados” parte |
| 820 | `enviaTempo` | “Part-time” parte |
| chegada | — | cada encaixe da mesa é preenchido no impacto |
| 2 300 | `contextoLido` | a mesa confirma o contexto sem o transformar em identidade |

Silêncio final: 260 ms.

### Ato 2 — Aplicar fronteiras · 3 200 ms

| ms | Beat | Consequência |
|---:|---|---|
| 0 | `abreFronteiras` | padrões incompatíveis aparecem sem pré-julgamento |
| 280 | `enviaStock` | “Sem stock” atinge “operação com stock e espaço” |
| 680 | `enviaDisponibilidade` | a disponibilidade contínua é rejeitada |
| 1 080 | `enviaEquipa` | a exigência de equipa inicial é rejeitada |
| chegada | — | o padrão atingido é riscado e recua; não desaparece antes da causa |
| 2 200 | `sobrevivente` | o candidato compatível avança para o centro |

### Ato 3 — Separar evidência de lacunas · 3 500 ms

| ms | Beat | Consequência |
|---:|---|---|
| 0 | `abreEvidencia` | a folha de proveniência abre vazia |
| 260 | `enviaFonte` | “INE · Eurostat” viaja para “Observado” |
| chegada | — | o contexto público ganha proveniência |
| 1 260 | `abreLacunas` | oferta local e vontade de pagar ficam explicitamente em aberto |
| 1 900 | `enviaProva` | “Piloto local” viaja para o plano, não para o dado observado |
| chegada | — | nasce uma ação capaz de reduzir a incerteza |

Silêncio entre fonte e lacunas: 360 ms.

### Ato 4 — Compor uma hipótese falsificável · 4 100 ms

| ms | Beat | Consequência |
|---:|---|---|
| 0 | `preparaHipotese` | a saída continua vazia; a mesa reúne o que sobreviveu |
| 360 | `enviaHipotese` | uma ficha maior atravessa para a saída |
| chegada | — | o cartão final assenta; só agora a hipótese existe |
| 1 720 | `mostraModelo` | “Avença mensal” e “B2B” entram como estrutura |
| 2 160 | `mostraTeste` | aparece o primeiro teste vindo do grafo real |
| 2 780 | `mostraCriterio` | aparece a condição que faria abandonar a hipótese |
| 3 500 | `conclui` | a linha de decisão fecha e a cena pára |

O palco não reinicia. O repouso final é indefinido até “Rever demonstração”.

## 5. Interação

- **Pausar** suspende o relógio do ato e todas as fichas em viagem.
- **Retomar** continua do mesmo milissegundo; não reinicia a barra.
- Escolher um ato na régua começa esse ato do princípio e continua a sequência.
- **Rever demonstração** regressa ao primeiro ato.
- A mudança causada por um clique começa sem atraso perceptível; a resposta do
  controlo é micro, a viagem é a explicação.

## 6. Acessibilidade e renderização sem JavaScript

| Condição | Comportamento |
|---|---|
| HTML servido / sem JavaScript | nasce no estado final, com hipótese, teste e critério legíveis |
| `prefers-reduced-motion` | mantém o estado final; não cria fichas, arcos, contadores ou autoplay |
| leitor de ecrã | recebe uma lista estática dos quatro passos; autoplay não é anunciado |
| navegação manual | anuncia uma única vez o passo escolhido |
| teclado | pausa, replay e os quatro atos são botões com foco visível e alvo ≥ 36 px |
| contraste | as cores reforçam estados, mas texto e ícone continuam a identificá-los |

## 7. Mobile

A composição não é reduzida a um carrossel. As três zonas empilham-se na ordem
de leitura e as fichas seguem os centros medidos no DOM:

1. bandeja de entrada;
2. mesa de decisão;
3. hipótese.

O texto encurta, mas nenhum facto desaparece. A régua mantém quatro alvos
iguais, a ação principal ocupa a largura e não existe overflow horizontal a
360 px.

## 8. O que este roteiro proíbe

- loop automático;
- brilho, pulso ou partículas sem causa;
- mostrar a hipótese pronta antes do último ato;
- remover um candidato antes de a fronteira o atingir;
- preencher uma lacuna com um dado que a fonte não mediu;
- dois acontecimentos principais ao mesmo tempo;
- animar `top`, `left`, largura ou altura a cada frame;
- depender de vídeo, canvas, 3D ou uma biblioteca nova;
- usar `aria-live` para a reprodução automática;
- fazer da versão reduzida uma experiência incompleta.

