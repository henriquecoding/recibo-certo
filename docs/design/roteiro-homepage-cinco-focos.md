# Roteiro — a homepage de cinco focos

> **Fonte de verdade da reestruturação.** Este documento decide a estrutura; os
> roteiros de animação de cada foco (`roteiro-animacao-*.md`) decidem o
> movimento dentro dela. Se o código e este roteiro discordarem, um dos dois
> está errado — decide-se qual, não se «harmoniza».
>
> Estado: **plano**. Nada aqui está implementado.

---

## 0. O que está partido hoje

Não é uma opinião sobre gosto. São quatro defeitos estruturais, e três deles
têm nome na literatura.

### 0.1 Há dois eixos de navegação a competir pelo mesmo ecrã

| Eixo | Onde vive | Valores | Como se muda |
|---|---|---|---|
| `Perfil` | `localStorage` (`lib/perfil.tsx`) | independente · dependente · empresa · comparar | `SeletorModo`, no cliente |
| `foco` | URL (`?foco=`) | descobrir · preco | uma ligação real, no servidor |

Ramificam **a mesma página** por critérios diferentes, e nenhum sabe da
existência do outro. A pessoa que carrega em «Independente» e a pessoa que
carrega em «Preço» acham que fizeram a mesma coisa: escolheram um separador. Um
guarda-se entre visitas e não aparece no URL; o outro é partilhável e não se
guarda. Ter dois modelos mentais para o mesmo gesto é o defeito de que todos os
outros descendem.

### 0.2 A régua de cinco mistura dois tipos de separador

O `FilaPilares` e a cápsula mostram **Descobrir · Preço · Recibos verdes ·
Salário · Empresa**, lado a lado, com o mesmo peso. Mas:

- **Descobrir** e **Preço** levam a `/?foco=…` — trocam o conteúdo **na mesma
  página**;
- **Recibos verdes**, **Salário** e **Empresa** levam a `/ferramentas/<slug>` —
  **saem da página** para uma ferramenta.

A NN/g chama-lhes *in-page tabs* e *navigation tabs*, e a regra é explícita:
**«misturar separadores de página e de navegação no mesmo controlo desorienta
as pessoas»**. Os cinco prometem a mesma coisa e dois deles fazem outra. É
exatamente isto que faz três dos cinco não parecerem homepages.

### 0.3 Três dos cinco não têm homepage — têm o mesmo hero com outros números

Verificado no código, não estimado. Existe **um** `HeroCard` (`Hero.tsx`), com
uma coreografia só — cursor encenado, digitação, e quatro atos: `entrada →
decomposicao → resultado → contexto`. Os perfis não trocam a coreografia:
trocam o `card`. E três dos quatro cartões declaram `modoLinhas: "deducoes"`:

| Perfil | `heroLabel` | `modoLinhas` |
|---|---|---|
| independente | «O que é mesmo teu» | `deducoes` |
| dependente | «O teu líquido» | `deducoes` |
| empresa | «Líquido pela empresa» | `deducoes` |
| comparar | «Mais líquido» | `cenarios` |

Ou seja: **Recibos verdes, Salário e Empresa mostram a mesma cascata de
deduções três vezes, com números diferentes.** A animação existe — e é boa —
mas é uma máquina com três fatos, não três palcos. Três separadores que dizem
a mesma frase não são três destinos: são um destino repetido.

Isto tem nome: é a razão n.º 5 da NN/g para evitar navegação por audiência —
**duplicação de conteúdo entre segmentos**, que leva as pessoas a saltar de
secção em secção («pogo-sticking») só para confirmar que são iguais.

### 0.4 «Sou trabalhador» é navegação por audiência

O `SeletorModo` pergunta **quem és** («Sou trabalhador: Independente / Por
conta de outrem»). A NN/g tem cinco razões documentadas contra isto, e três
aplicam-se com força a este produto:

1. **As pessoas não cabem numa categoria.** Metade do público-alvo do
   ReciboCerto tem salário *e* recibos verdes. O seletor obriga-as a escolher
   uma identidade que não têm.
2. **Carga cognitiva fora da tarefa.** «Forçar a auto-identificação cria um
   passo adicional e tira as pessoas do modo-tarefa.» Quem chega quer saber
   quanto lhe fica, não declarar o que é.
3. **Ansiedade de estar a perder o melhor sítio.** Quem escolhe «Independente»
   fica sem saber o que havia do outro lado.

O próprio `lib/navegacao.ts` já tinha aprendido isto e escreveu-o em comentário:

> «A pergunta que a ordem responde deixou de ser *quem és?* (independente,
> dependente, empresa) e passou a ser *em que ponto estás?*»

Os cinco pilares já são tarefas. O seletor da homepage ficou para trás.

---

## 1. A decisão estrutural

> **Um eixo só. `foco` cresce de dois para cinco e passa a ser o único
> ramificador da homepage. O `SeletorModo` desaparece.**

```
/                     → homepage editorial (sem foco): a porta genérica
/?foco=descobrir      → «que negócio testar?»
/?foco=preco          → «quanto cobrar?»
/?foco=recibos        → «quanto fica de cada recibo?»
/?foco=salario        → «quanto fica do salário?»
/?foco=empresa        → «e se fosse uma empresa?»
```

### 1.1 O que morre

- **`SeletorModo`** — o cartão «Sou trabalhador / Gostaria de». Substituído
  pela régua de cinco focos, que é a mesma navegação que já existe na cápsula,
  na barra do telemóvel e no `FilaPilares`.
- **`Perfil` como ramificador da homepage.** `CalculadoraSecao`,
  `ExplorarSecao`, `FAQ` e `Hero` deixam de ler `usePerfil()`.
- **O perfil `comparar`** enquanto modo da homepage. Absorvido — ver §5.

### 1.2 O que sobrevive, e com que papel

- **`Perfil` como contexto, não como navegação.** Continua a existir para o
  dashboard, para o prefetch e para memorizar preferências dentro das
  ferramentas. Deixa de decidir o que a homepage mostra. É a recomendação
  literal da NN/g: relegar a categoria de audiência para navegação secundária,
  nunca primária.
- **`/ferramentas/<slug>`** — cada foco continua a ter a sua ferramenta numa
  rota própria, indexável, e é para lá que aponta o CTA primário do seu hero.
  **O foco é a porta editorial; a ferramenta é a sala.**
- **A coreografia do `HeroCard` atual** — não se deita fora. Ver §4.2.

### 1.3 O ganho

O controlo de cinco passa a ser **homogéneo**: cinco entradas, o mesmo tipo de
destino, o mesmo tipo de página, a mesma promessa. Deixa de haver dois modelos
mentais para o mesmo gesto. É a condição para tudo o resto neste documento.

---

## 2. A pergunta de cada foco

Cada foco existe porque responde a uma pergunta que **nenhum outro responde**.
Se duas colunas desta tabela puderem trocar de lugar sem estranheza, um dos
dois focos não devia existir.

| Foco | A pergunta | O verbo | O palco | Ferramenta |
|---|---|---|---|---|
| **Descobrir** | Que negócio faz sentido eu testar? | **eliminar** | Mesa de decisão | `/ferramentas/descobrir-negocio` |
| **Preço** | Quanto tenho de cobrar? | **compor** | Formação do preço | `/ferramentas/calcular-preco` |
| **Recibos verdes** | Deste recibo, quanto é meu e quanto tenho de guardar? | **repartir** | A repartição | `/ferramentas/recibos-verdes` |
| **Salário** | O meu recibo de vencimento está certo? | **conferir** | A conferência | `/ferramentas/recibo-vencimento` |
| **Empresa** | A partir de quando compensa ter empresa? | **virar** | O ponto de viragem | `/ferramentas/simulador-empresa` |

**Os cinco verbos são diferentes de propósito.** Eliminar, compor, repartir,
conferir, virar. É a regra que impede a recaída do §0.3: nenhum palco pode ser
uma cascata de deduções com outros números, porque só um dos cinco tem como
verbo «repartir».

Repare-se no que a coluna do meio corrige. Hoje o Salário mostra a mesma
cascata do recibo verde, e não é isso que a ferramenta faz de único: o que ela
tem e mais nenhuma tem é a **auditoria** (`/ferramentas/auditoria-recibo`,
`ImportarReciboPDF`, `AuditoriaRecibo`) — confrontar o recibo real com o que
devia ser. Essa é a razão de o Salário merecer uma homepage, e não uma cópia.

---

## 3. O esqueleto partilhado

Os cinco focos são **a mesma página com outro conteúdo**, e isso tem de ser
verdade por construção — não por eu ter escrito duas vezes o mesmo JSX, que é
o que hoje acontece entre `HomepageDescobrir` e `HomepagePreco`.

### 3.1 Os oito compartimentos, sempre por esta ordem

| # | Compartimento | Fundo | O que é | Varia? |
|---|---|---|---|---|
| 0 | **Régua de focos** | — | Os cinco, server-rendered, o ativo marcado | Nunca |
| 1 | **Hero** | `grain` + halos | Sobrancelha · h1 · sub · **palco** · 2 CTA · confiança | Conteúdo e palco |
| 2 | **Método** | `grain bg-sand` | Como decide / o que faz, em 3 passos | Conteúdo |
| 3 | **Percurso** | branco | Onde isto leva — incluindo **o foco seguinte** | Conteúdo |
| 4 | **Laboratório** | branco | A coisa mexível: muda uma entrada, vê mudar | Conteúdo |
| 5 | **Fontes** | `grain bg-sand` | Proveniência: base legal, data, o que é estimativa | Conteúdo |
| 6 | **FAQ** | branco | **As promessas que não faz** | Conteúdo |
| 7 | **Fecho** | branco | CTA para a ferramenta + ponte para o foco seguinte | Conteúdo |

Alternância de fundo `grain/branco/grain/branco` — é o ritmo que
`HomepageDescobrir` e `HomepagePreco` já têm e que funciona. Fica escrito para
deixar de ser coincidência.

### 3.2 O que NUNCA varia entre focos

Isto é a lista de identidade visual. Um foco que precise de quebrar um destes
pontos está a pedir para ser outra página.

- A geometria do hero: sobrancelha centrada → `h1` centrado
  (`clamp(2.45rem, 6.7vw, 5.65rem)`, `leading-[.98]`, `tracking-[-.035em]`) →
  sub centrado (`max-w-2xl`) → palco à largura toda → CTA → linha de confiança.
- A moldura do palco: `rounded-[2rem] sm:rounded-[2.5rem]`, régua de atos no
  rodapé, botão de pausa no cabeçalho, sinal de estado à esquerda.
- Os dois CTA: primário sólido para a ferramenta, secundário com contorno para
  uma âncora **dentro da página**. Nunca dois primários.
- A tipografia das secções: `display-2`, `text-balance`, `py-16 sm:py-24`.
- Os espaçamentos, as sombras, os raios, as curvas — os tokens de `DESIGN.md`.
- **A ordem dos compartimentos.** Quem aprendeu que as Fontes vêm antes do FAQ
  acerta-lhes sem olhar em qualquer um dos cinco.

### 3.3 Como se garante

Um componente `LayoutFoco` recebe os compartimentos como *slots* e desenha o
esqueleto. Cada foco entrega conteúdo, não estrutura.

```
src/components/foco/
  LayoutFoco.tsx        // o esqueleto: régua + os 8 compartimentos
  ReguaDeFocos.tsx      // server component, 5 <a href> reais
  HeroFoco.tsx          // a geometria do hero; recebe o palco como children
  SeccaoFoco.tsx        // um compartimento com o seu fundo e ritmo
  focos.ts              // a tabela do §2: pergunta, verbo, ferramenta, tom
```

E um teste que falha se um foco desenhar um compartimento fora de ordem ou
saltar um. O esqueleto ser igual **não pode** depender de disciplina: hoje
depende, e já divergiu.

---

## 4. Os cinco palcos

Cada palco usa a mesma maquinaria (`components/palco/`: curvas, `PASSO`,
relógio de atos, fichas, contadores, medição no DOM) e a mesma gramática
(`roteiro-animacao-preco.md` §1). O que muda é **o argumento**.

### 4.0 A regra do tom

O palco é **escuro** quando o assunto é um processo que não se vê, e **claro**
quando o assunto é um documento que se seguraria na mão.

| Foco | Tom | Porquê |
|---|---|---|
| Descobrir | escuro | um motor a decidir |
| Preço | claro | uma folha de preço a ser feita |
| Recibos verdes | claro | um recibo |
| Salário | claro | um recibo de vencimento |
| Empresa | escuro | uma projeção, não um papel |

Não é decoração: é uma regra que se aplica sozinha a qualquer palco futuro.

### 4.1 Descobrir — «A mesa de decisão» · existe

Quatro atos: contexto → fronteiras → evidência → hipótese. Fichas que entram e
**candidatos que saem riscados**. Está feito e verificado
(`roteiro-animacao-descobrir.md`). Muda só o que o §5 acrescenta ao fim.

### 4.2 Preço — «A formação do preço» · existe

Quatro atos: custos → base → markup e IVA → preço. Fichas que **se somam**.
Está feito e verificado (`roteiro-animacao-preco.md`).

### 4.3 Recibos verdes — «A repartição» · a construir

> Verbo: **repartir**. O que o palco tem para dizer: deste recibo, uma parte é
> tua, outra é do Estado e **uma tem data**.

O que se aproveita do `HeroCard` atual, e é muito: a **encenação de entrada**
(cursor a deslizar, a digitação hesitante `2 → 20 → 200 → 2003 → 200 → 2000`,
o clique com *ripple*). É a melhor coisa da homepage atual e não existe em
Descobrir nem em Preço. Passa a ser o **ato 1** deste palco, e é aqui que a
encenação faz mais sentido do que em qualquer outro sítio: é o único foco onde
a pessoa escreve um número que já conhece.

| Ato | ms | Argumento |
|---|---|---|
| 1 · **Escrever** | ~2 600 | O cursor entra, escreve `2 000 €`, hesita, corrige, calcula. Herdado do `HeroCard` |
| 2 · **Repartir** | ~2 400 | O valor **parte-se em três fichas** que saem da mesma nota e viajam para três destinos: *teu* · *IRS* · *Segurança Social*. Ao contrário do Preço, aqui as fichas **divergem** de uma origem comum em vez de convergirem para um destino comum |
| 3 · **Datar** | ~2 200 | As duas fichas do Estado ganham **calendário**. A da SS recebe «20 de julho» e passa a contar os dias. É o único palco do site com uma data a mover-se |
| 4 · **Reservar** | ~2 600 | Uma quarta zona — «reservado» — recebe o que as duas fichas do Estado valem, e o «disponível para gastar» **desce** para o que sobra. O número que a pessoa achava que era dela encolhe à frente dela |

**A inversão do ato 4 é a razão de este palco existir.** Todos os outros
constroem para cima. Este constrói e depois **tira** — porque a mentira que o
produto existe para desfazer é «recebi 2 000 €».

Divergência das fichas: `PASSO.irmao` (160 ms) entre as três, porque são partes
de uma mesma nota. A do «teu» parte primeiro.

### 4.4 Salário — «A conferência» · a construir

> Verbo: **conferir**. O que o palco tem para dizer: o teu recibo pode estar
> errado, e dá para saber.

| Ato | ms | Argumento |
|---|---|---|
| 1 · **Chegar** | ~2 400 | Um recibo de vencimento entra na mesa — como papel, com as suas linhas por ler |
| 2 · **Refazer** | ~2 800 | Ao lado, uma segunda coluna **calcula-se sozinha** a partir do bruto: SS 11%, retenção de IRS, subsídios. Linha a linha, com desfasamento de irmão |
| 3 · **Confrontar** | ~2 600 | As duas colunas **encostam-se**. Cada par de linhas iguais acende a verde ao mesmo tempo (destino comum, simultâneo). **Uma não bate** e fica em areia, sozinha, depois de todas as outras terem acendido |
| 4 · **Explicar** | ~2 800 | A linha que não bate abre e diz **porquê** — e qual é a diferença ao fim do ano |

**Este é o único palco com duas colunas em confronto.** Nenhum outro compara
duas versões da mesma coisa, e é por isso que o Salário deixa de ser «a
calculadora com outro número». A regra de destino comum trabalha ao contrário
aqui: as linhas certas acendem **juntas** para que a errada se veja por
**não** ter acendido com elas.

O ato 3 recebe o silêncio mais longo do site — `PASSO.outro` (380 ms) — entre a
última linha certa e a linha errada. É o beat de que tudo depende.

### 4.5 Empresa — «O ponto de viragem» · a construir

> Verbo: **virar**. O que o palco tem para dizer: a resposta é «depende», e o
> «de quê» é um número que dá para mostrar.

| Ato | ms | Argumento |
|---|---|---|
| 1 · **Situar** | ~2 200 | Um eixo horizontal de faturação anual desenrola-se (a mesma régua do Preço, mesma curva, mesma duração). Um marcador cai na faturação do exemplo |
| 2 · **Traçar** | ~3 000 | **Duas linhas** crescem da esquerda ao mesmo tempo — recibos verdes e empresa. Movimento simultâneo, mesma velocidade: destino comum, porque são a mesma pergunta com duas respostas |
| 3 · **Custar** | ~2 400 | A linha da empresa arranca **abaixo**: contabilista, IRC, dividendos. Uma ficha de custo fixo desce e afunda-a. É o preço de entrada, e vê-se |
| 4 · **Virar** | ~3 200 | As linhas **cruzam-se**. O cruzamento acende e ganha um valor: «a partir de ~X €/ano». O marcador do ato 1 fica onde está, para a pessoa ver de que lado está |

**As duas linhas a crescerem em simultâneo são deliberadas** e são a exceção
que confirma a regra do §1.3 do roteiro do preço: movem-se juntas porque são a
mesma pergunta, e é o **cruzamento** — não a chegada — que é o acontecimento.

O ato 3 é o que impede a leitura fácil. Sem ele, «empresa» parece sempre melhor
acima de um limiar; com ele, vê-se que há um fosso a recuperar primeiro.

---

## 5. «Comparar cenários» dentro de Descobrir

O separador «Comparar Cenários» sai do cartão de audiência e passa a ser **o
último ato da leitura de Descobrir** — não um sexto foco.

### 5.1 Porquê ali

A sequência de decisão é: *o que abrir* → *sob que forma* → *quanto cobrar*.
Comparar regimes antes de saber o que se vai fazer é comparar impostos sobre um
rendimento que ainda não existe. Depois de a mesa de decisão entregar uma
hipótese, «sob que forma testo isto?» é a pergunta que a pessoa tem mesmo — e o
princípio da divulgação progressiva diz que é aí que a escolha deve aparecer:
sequenciada depois do contexto que a torna decidível, não antes.

### 5.2 Onde, exatamente

Compartimento **6.5** de `/?foco=descobrir` — entre o FAQ e o Fecho, com o
título **«E sob que forma testas isto?»**.

Três cartões, `Por conta de outrem` · `Recibos verdes` · `Empresa`, cada um
com: uma frase do que muda, o que exige de quem começa, e um número
**indicativo** com proveniência declarada. Motor: `compararCategorias` — o
mesmo que a ferramenta usa. Zero números novos.

### 5.3 A regra anti-duplicação

O comparador aparece em **dois** sítios e a NN/g avisa que é assim que se
começa a duplicar conteúdo entre segmentos. Por isso a regra é dura:

| Sítio | Profundidade | Pergunta | Controlos |
|---|---|---|---|
| **Descobrir**, comp. 6.5 | rasa | «Sob que forma testo isto?» | Nenhum. Três cartões, uma leitura |
| **Empresa**, palco + laboratório | funda | «A partir de quando compensa?» | Faturação, dependentes, região, estado civil |

**Nunca o mesmo bloco duas vezes.** Um é uma bifurcação qualitativa que fecha
uma leitura; o outro é a leitura inteira. Ambos apontam para
`/ferramentas/comparar-regimes`, que continua a ser a rota indexável e completa.

Um teste deve garantir que o bloco de Descobrir não renderiza controlos.

---

## 6. Navegação, URL e migração

### 6.1 O contrato

- `FOCOS_HOMEPAGE` passa de 2 para 5. `normalizarFocoHomepage` não muda de
  forma — só de tabela.
- `PILARES` ganha `homepageHref` nos três que não têm: `/?foco=recibos`,
  `/?foco=salario`, `/?foco=empresa`. Passa a **estar preenchido nos cinco**, e
  é isso que torna a régua homogénea.
- `Pilar.href` (a ferramenta) mantém-se e continua a ser o destino do CTA
  primário de cada hero. **A régua leva à leitura; o hero leva à ferramenta.**
- `METADADOS_POR_FOCO` ganha três entradas. A forma já generaliza.

### 6.2 A régua de focos

Server component, cinco `<a href>` reais, uma linha só. Exigências da NN/g que
se cumprem à letra:

- **Uma linha, nunca duas.** Cinco é o teto da recomendação («mais do que três
  a cinco pode ser demasiado»); no telemóvel a régua **desliza na horizontal**,
  com o ativo trazido à vista, e não parte para uma segunda linha.
- **Pelo menos dois indicadores no ativo** — não só cor. Fundo sólido *e* peso
  tipográfico, e `aria-current="page"`.
- **Todos os cinco levam ao mesmo tipo de sítio.** É o §0.2 resolvido.

### 6.3 A migração do `Perfil`

Quem tem `perfil` em `localStorage` de visitas anteriores não pode aterrar numa
homepage genérica como se nunca cá tivesse estado, nem ser atirado para um foco
sem perceber porquê. O comportamento:

1. `/` sem `foco` continua a ser a porta genérica e é o que se serve.
2. Depois da montagem, se houver um `perfil` guardado, a régua **marca**
   discretamente o foco correspondente («continuar onde estavas») — sem
   navegar, sem trocar o conteúdo. É uma sugestão, não um desvio.
3. O mapa: `independente → recibos`, `dependente → salario`,
   `empresa → empresa`, `comparar → descobrir`.

Nunca uma navegação automática. Redirecionar alguém a partir de estado
invisível é o defeito que o §0.1 descreve, com outra roupa.

### 6.4 SEO — a tensão, dita em voz alta

Com `canonical: "/"`, os cinco focos consolidam num só URL indexável. É o
contrato atual e há uma boa razão para o manter: **a rota indexável de cada
assunto é a ferramenta** (`/ferramentas/<slug>`), que tem URL próprio, conteúdo
próprio e é para onde a pesquisa deve levar.

Mas passa a ser uma decisão com peso: cinco leituras editoriais completas, e o
Google vê uma. As alternativas, para ficarem registadas:

| Opção | Consequência |
|---|---|
| **A (recomendada)** — manter `canonical: "/"` | Zero risco de canibalização. O trabalho editorial serve quem chega, não a pesquisa. As ferramentas continuam a ser as portas orgânicas |
| B — canónico próprio por foco | Cinco URLs indexáveis, mas cinco páginas de parâmetro a competir com cinco ferramentas sobre o mesmo tema. Canibalização provável |
| C — promover a rotas reais (`/descobrir`) | Resolve os dois, e é uma reestruturação de rotas inteira. Fora do âmbito deste roteiro |

**Recomendação: A**, e reabrir a questão só com dados do Search Console.

---

## 7. Acessibilidade e telemóvel

Não é um compartimento no fim: é condição de aceitação de cada um.

- **A régua é uma lista de ligações**, não um `tablist` com painéis. Cada foco é
  um documento inteiro, servido pelo servidor — chamar-lhe `role="tab"` mentia
  ao leitor de ecrã sobre o que acontece ao carregar.
- **Cada palco sobrevive a ser desligado.** Ato inicial = último ato, resolvido
  no HTML servido. Sem JavaScript e com `prefers-reduced-motion`, os cinco
  entregam o resultado completo, imóvel. Já é assim em dois; passa a ser
  obrigação nos cinco.
- **A pausa pára tudo o que se move** (WCAG 2.2.2) — fichas e contadores
  incluídos. A maquinaria de `components/palco/` já garante isto; nenhum palco
  novo pode voltar a animar pelo `motion`.
- **Uma região viva por palco**, a anunciar o ato e o resultado. As fichas e os
  anéis são `aria-hidden`: são a *forma* de dizer o que o texto já diz.
- **360 px é o alvo base.** Colunas empilham, as fichas passam a viajar na
  vertical sem uma linha de código a saber que existe um telemóvel (as origens
  são medidas no DOM). Sem overflow horizontal, alvos ≥ 36 px.
- **Aceitação por foco:** 0 violações axe em desktop claro, desktop escuro,
  mobile 360 e mobile 320 — a mesma bateria que a homepage de Preço já passa.

---

## 8. Ordem de execução

Cada fase deixa a aplicação inteira e verificável. Nenhuma exige a seguinte
para fazer sentido.

| Fase | O que | Porque é esta a ordem |
|---|---|---|
| **1** | Extrair `LayoutFoco`, `HeroFoco`, `SeccaoFoco`, `ReguaDeFocos`, `focos.ts`. Migrar Descobrir e Preço para o esqueleto **sem alterar o que se vê** | O esqueleto tem de existir antes do terceiro foco, ou o terceiro nasce a divergir como os dois primeiros divergiram |
| **2** | `foco` de 2 → 5. Régua homogénea, `homepageHref` nos cinco, metadados. Os três novos focos servem, para já, o conteúdo que hoje têm | Resolve o §0.2 — o defeito mais grave — sem esperar pelos palcos |
| **3** | Palco de **Recibos verdes**: herdar a encenação do `HeroCard`, escrever `roteiro-animacao-recibos.md`, implementar, verificar | É o foco com mais tráfego e o que mais aproveita o que já existe |
| **4** | Palco de **Salário** (a conferência) + `roteiro-animacao-salario.md` | É o que mais muda de proposta: passa de cópia a auditoria |
| **5** | Palco de **Empresa** (o ponto de viragem) + `roteiro-animacao-empresa.md` | Depende de nada; fica por último por ser o de menor tráfego |
| **6** | Comparar cenários dentro de Descobrir (§5). Retirar `SeletorModo` e o perfil `comparar` da homepage. Migração do `Perfil` (§6.3) | Só depois de os cinco existirem é que se pode desligar o eixo antigo |
| **7** | Método/Percurso/Laboratório/Fontes/FAQ próprios dos três focos novos | O trabalho editorial de fundo, depois de a estrutura estar de pé |

**Fases 1 e 2 valem por si.** Se o trabalho parar aí, a homepage já deixou de
misturar dois tipos de separador e já tem um eixo só — que é o defeito
estrutural.

---

## 9. O que este roteiro proíbe

- **Dois eixos a ramificar a mesma página.** Um foco, no URL, no servidor.
- **Dois tipos de separador no mesmo controlo.** Os cinco levam ao mesmo tipo
  de sítio ou não estão no mesmo controlo.
- **Perguntar quem és para decidir o que mostrar.** Pergunta-se o que queres
  saber. A identidade é contexto, nunca navegação.
- **Dois palcos com o mesmo verbo.** Um palco que seja uma cascata de deduções
  com outros números é o §0.3 a voltar.
- **O mesmo bloco em dois focos.** Profundidades diferentes ou um sítio só.
- **Um foco a inventar estrutura.** Os oito compartimentos, por ordem. Quem
  precisa de outra estrutura precisa de outra página.
- **Um palco a animar pelo `motion`.** A pausa tem de parar tudo.
- **Navegar alguém a partir de estado invisível.**
- **Um número sem proveniência.** Vale nos cinco palcos como já vale no motor
  de descoberta.

---

## 10. Donde vêm as regras

| Fonte | O que decidiu aqui |
|---|---|
| [NN/g — *Audience-Based Navigation: 5 Reasons to Avoid It*](https://www.nngroup.com/articles/audience-based-navigation/) | A morte do «Sou trabalhador» (§0.4), o `Perfil` relegado a contexto (§1.2) e a regra anti-duplicação do comparador (§5.3) |
| [NN/g — *Tabs, Used Right*](https://www.nngroup.com/articles/tabs-used-right/) | «Misturar separadores de página e de navegação desorienta» (§0.2); uma linha só, cinco no máximo, dois indicadores no ativo (§6.2) |
| Divulgação progressiva — [The Decision Lab](https://thedecisionlab.com/reference-guide/design/progressive-disclosure) | Comparar regimes **depois** da hipótese, não antes (§5.1) |
| [Google Search Central — *Canonicalization*](https://developers.google.com/search/docs/crawling-indexing/canonicalization) | A tabela de opções de §6.4 e a recomendação de manter `canonical: "/"` |
| [WCAG 2.2 — 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | A pausa obrigatória em cada palco (§7) |
| `roteiro-animacao-preco.md` §1.3 e `roteiro-animacao-descobrir.md` | A gramática de movimento partilhada: curvas, `PASSO`, destino comum, silêncios (§4) |
