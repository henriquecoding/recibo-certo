# Opportunity Discovery Engine

> Estado: **ODE-1 — geração combinatória a partir do grafo de conhecimento,
> contexto profundo em duas fases, scoring multidimensional com confiança
> separada do fit, stress test e diversificação. 2026-08-22.**
>
> Este documento é a especificação executável. O motor de EVIDÊNCIA — fontes,
> gates, licenças, frescura — continua a viver em
> [`market-intelligence-engine.md`](./market-intelligence-engine.md) e **não foi
> substituído**: é consumido por este.

---

## 0. A diferença que este documento existe para registar

A ferramenta respondia a uma pergunta:

> Das ideias que conhecemos, quais combinam contigo?

E o universo de respostas era, literalmente, o comprimento de um array. Vinte e
quatro entradas em vez de cinco é mais cobertura e continua a ser um catálogo:
acrescentar a hipótese número 25 exigia um humano a escrevê-la.

O motor passa a responder a outra:

> Que problemas económicos, dos que conhecemos, alguém com ESTES recursos,
> NESTA zona, com ESTAS restrições consegue atacar — e o que é que a evidência
> disponível diz sobre cada um?

O espaço de respostas deixa de ser um array e passa a ser um **produto
cartesiano filtrado**: problema × cliente × modelo de receita × entrega ×
geografia × ativos × competências. Uma combinação que ninguém escreveu pode
aparecer, e aparece com a mesma disciplina de proveniência que as curadas.

---

## 1. Auditoria do que existia (Fase 1 do pedido)

### 1.1. Arquitetura atual

| Camada | Ficheiro | O que faz | Reutilizável? |
|---|---|---|---|
| Catálogo | `market/catalogo-oportunidades.ts` | 24 dossiers curados, congelados | **Sim — vira seed** |
| Fit | `market/opportunities.ts` | Founder Fit v2, 6 eixos, repartição | **Sim — vira uma das dimensões** |
| Gate | `market/evidence-gate.ts` | 8 estados, precedência testada | **Sim, intacto** |
| Gate local | `market/gate-local.ts` | O mesmo gate com zona/preço/provas | **Sim, intacto** |
| Geografia | `market/geografia.ts` | NUTS II 2024, local/nacional/outra | **Sim, alargado a distrito** |
| Frescura | `market/freshness.ts` | fresh/expiring/stale/invalid | **Sim, alargado por TTL** |
| Conectores | `market/connectors/*` | INE, Eurostat, dados.gov | **Sim, intacto** |
| Bloco | `market/bulk/*` | Portal BASE, 246 978 registos | **Sim, intacto** |
| Pilotos | `market/pilots.ts` | 15 séries, 8 operações | **Sim, intacto** |
| Preço | `pricing/*` | Motor canónico de preço | **Sim, única porta de preço** |
| Routing | `routing.ts` | Hierarquia de CTA | **Sim, intacto** |
| Hipóteses | `market/hipoteses.ts` | Prova comercial local | **Sim, intacto** |
| Store | `store/hipoteses-mercado.ts` | Cofre local, sem caminho para a nuvem | **Sim, intacto** |
| UI | `DescobrirNegocioStudio.tsx` | Três colunas, contexto+lista+foco | Reescrito em duas fases |

### 1.2. Modelo de contexto anterior

```ts
interface BusinessDiscoveryProfile {
  structure; delivery; capital; recurrence; strengths[]; region;
}
```

Seis campos. `capital` era uma de três faixas; `strengths` um conjunto sem
nível; nada sobre tempo, rendimento pretendido, equipa, ativos, experiência,
restrições ou risco. Um perfil com carrinha e cinco anos de logística era,
para o motor, indistinguível de um perfil sem nada — desde que os dois
carregassem no mesmo chip.

### 1.3. Limitações medidas

- **Universo fechado.** `rankOpportunityTemplates` era `catalogue.map(...).sort(...)`.
- **Contexto raso.** Seis respostas, das quais duas (estrutura, zona) chegaram a
  não alterar coisa nenhuma até à correção anterior.
- **Sem restrições.** Não havia como dizer «não quero empregados» ou «não tenho
  carro». Tudo era preferência, nada eliminava.
- **Sem economia.** Nenhuma estimativa de investimento, break-even ou tempo até
  receita: isso vivia noutra ferramenta e só depois de escolher.
- **Sem risco.** Nem financeiro, nem regulatório, nem de sazonalidade.
- **Sem lacuna.** Zero sinais de `supply` e `competition` — logo, nenhuma
  análise de procura menos oferta era possível. Pior: o ramo que tratava o
  caso «há sinal dos dois» dava 90 em 100 à lacuna sem comparar nada, à
  espera da primeira série de oferta que entrasse.
- **Fase única.** Configuração e resultados no mesmo ecrã, com a configuração a
  sair de vista assim que a lista crescia.

### 1.4. O que NÃO se toca

A doutrina do produto está certa e é o que lhe dá valor. Estas catorze
fronteiras vieram do relatório de auditoria e continuam a valer, agora
verificadas também contra o motor novo:

1. Compatibilidade pessoal e evidência de mercado **nunca** se somam num número.
2. Uma fonte que falha **perde o número**; não recebe fallback plausível.
3. Duas publicações da mesma operação estatística contam **uma** vez.
4. `regions` diz onde o **modelo** faz sentido, nunca onde há dados.
5. Uma observação nacional é **contexto**, e é mostrada marcada como tal.
6. Entrevista **não** é prova de mercado.
7. `operating` exige repetição, contribuição positiva **e** recebimento.
8. Perfil, zona, entrevistas, orçamentos e vendas ficam **no dispositivo**.
9. O valor contratual anunciado **não** é receita provável.
10. Acesso público **não** é direito de republicação.
11. Sem *scraping* de plataformas comerciais.
12. A IA pode propor um mapeamento; **não o aprova nem fornece o número**.
13. A hierarquia dos CTA pertence ao motor de routing, não ao ecrã.
14. Uma hipótese sem evidência que a sustente **não abre rota comercial**.

---

## 2. Arquitetura alvo

```
src/lib/negocio/descoberta/
├── contexto/          Context Engine
│   ├── tipos.ts       OpportunityContext (localização, capital, tempo,
│   │                  rendimento, competências com nível, experiência,
│   │                  equipa, preferências, restrições, risco)
│   ├── perguntas.ts   O questionário em três níveis de profundidade
│   └── profundidade.ts  Quanto do cenário já conhecemos (não é precisão)
├── conhecimento/      Internal Knowledge Engine
│   ├── tipos.ts       Setor · Atividade · ModeloReceita · Problema ·
│   │                  Competência · Ativo · Regulação · Cliente
│   ├── grafo.ts       As relações e as travessias
│   ├── dados/*.ts     As entidades atómicas
│   └── seeds.ts       Os 24 dossiers curados → benchmarks do grafo
├── motor/
│   ├── gerador.ts     generateCandidates(contexto, sinais)
│   ├── restricoes.ts  O que ELIMINA e o que penaliza
│   ├── viabilidade.ts Intervalos, nunca falsa precisão
│   ├── regulacao.ts   Licenças e requisitos, com fonte ou sem afirmação
│   ├── procura.ts     Lacuna = procura − oferta (e a distinção crítica)
│   ├── intensidade.ts O VALOR de cada série, contra uma referência declarada
│   ├── risco.ts       Oito dimensões, separadas, com «apurado» ou assumido
│   ├── scoring.ts     OpportunityScore multidimensional, pesos justificados
│   ├── confianca.ts   Confiança ≠ fit ≠ mercado
│   ├── stress.ts      Tentar destruir antes de promover
│   ├── diversidade.ts Evitar dez variantes do mesmo negócio
│   ├── explicacao.ts  Porque apareceu, e porque não apareceu
│   ├── validacao.ts   7 / 30 / 90 dias
│   ├── planeador.ts   Query planner por candidato
│   └── pipeline.ts    O orquestrador, com contagens reais
└── historico/
    └── instantaneos.ts  Snapshots por análise, locais e opcionais
```

### 2.1. O fluxo

```
CONTEXTO (fase A, completa antes de resultados)
   ↓
grafo: problemas alcançáveis pelas competências e ativos declarados
   ↓
GERAÇÃO combinatória de candidatos (problema × cliente × modelo × entrega)
   ↓
RESTRIÇÕES duras — elimina, com motivo guardado
   ↓
EVIDÊNCIA — pack público existente, por zona, com licença e frescura
   ↓
VIABILIDADE — intervalos herdados do grafo, nunca inventados
   ↓
REGULAÇÃO · PROCURA/OFERTA · RISCO
   ↓
SCORING multidimensional  +  CONFIANÇA (separada)
   ↓
STRESS TEST — o que pode matar isto
   ↓
DEDUPLICAÇÃO  →  DIVERSIFICAÇÃO  →  RANKING
   ↓
EXPLICAÇÃO + PLANO DE VALIDAÇÃO
```

### 2.2. Onde entra a IA

Em lado nenhum, em tempo de execução. A geração é **combinatória e
determinística**: o mesmo contexto e o mesmo instantâneo produzem o mesmo
resultado, e há um teste que o obriga. Um LLM que gerasse dossiers
reintroduziria exatamente o problema que a página se orgulha de ter resolvido
— premissas editoriais sem proveniência apresentadas como factos.

O que o motor produz quando não sabe é uma **frase que o diz**, e um plano de
investigação (`planeador.ts`) que nomeia a consulta que responderia à pergunta.

---

## 3. Anti-alucinação, por construção

Cada número que chega ao ecrã tem um `Proveniencia`:

```ts
type OrigemDoNumero = "observado" | "estimativa" | "calculo" | "hipotese";
```

- **observado** — veio de uma observação com fonte, período, geografia e licença;
- **estimativa** — intervalo do grafo, com o método declarado e sem falsa precisão;
- **calculo** — derivado de observações ou de estimativas já declaradas;
- **hipotese** — premissa da pessoa, marcada como tal.

Não há um quinto valor. Um número sem `Proveniencia` não compila, e o teste
`descoberta-proveniencia` falha se algum campo numérico do resultado não a
declarar.

---

## 3.1. O que a pontuação mede, e o que NÃO mede

Oito dimensões, agrupadas em três eixos combinados por **média geométrica** —
um eixo arrasado não é compensável pelos outros:

| Eixo | Expoente | Dimensões |
|---|---:|---|
| Mercado | 0,45 | procura · lacuna de oferta · geografia |
| Encaixe contigo | 0,30 | fit pessoal |
| Viabilidade | 0,25 | economia · exequibilidade · regulação · risco |

Três regras que a tabela tem de respeitar, e que estão presas por testes em
`negocio-descoberta-auditoria.test.ts`:

1. **Nenhuma dimensão mede a quantidade de dados.** A força da evidência e a
   atualidade das leituras vivem na CONFIANÇA e nunca tocam no score. Uma
   hipótese não vale mais por sabermos mais sobre ela.
2. **Nenhuma variável pontua duas vezes.** O fit responde «consegues fazer
   isto?»; a economia responde «cabe no que tens?»; a exequibilidade responde
   «tens como executar?»; a geografia responde «é aqui?». Capital, tempo,
   equipa e geografia saíram do fit por causa desta regra — ver a matriz de
   sobreposição no cabeçalho de `fit.ts`.
3. **A procura lê o VALOR, nunca o número de linhas.** `intensidade.ts`
   normaliza cada série contra uma referência declarada no ecrã — o percentil
   da zona entre as nove NUTS II, ou o índice face ao valor nacional. Uma
   contagem absoluta (empresas, alojamentos, transações) só é comparável
   depois de dividida pela população: sem denominador não pontua, porque
   comparar contagens entre regiões mede o tamanho da região.

A pontuação é publicada como **intervalo** derivado da cobertura: «77, entre
41 e 92 consoante o que ainda não sabemos». Quando todas as dimensões têm
base, o intervalo colapsa no ponto — e essa é a recompensa por responder a
mais perguntas.

O `evidence-gate` de `market/` é o **teto da confiança**: um dossier em
`template` nunca chega a «confiança alta» e um `contradicted` não passa de
«insuficiente», por muitas leituras que traga. As observações que ele não
lista em `usableObservationIds` não entram na evidência nem no score.

---

## 4. O que fica por fazer, dito à cabeça

- **Pesquisa web em direto não está ligada.** O `planeador.ts` produz o plano de
  investigação — queries, fontes, métricas em falta, âmbito, frescura exigida —
  e a interface mostra-o como «o que falta investigar». Executá-lo exige uma
  integração de pesquisa que este repositório não tem, e improvisá-la com um
  LLM violaria a regra 12.
- **O RNAL está ligado e a publicar.** O Registo Nacional de Alojamento Local
  do Turismo de Portugal entrou como fonte: 111 512 alojamentos no continente,
  por NUTS II, mais as inscrições do último ano civil fechado. É a primeira
  leitura do motor que CONTA ENTIDADES numa região em vez de publicar uma taxa,
  e dá à hipótese de turismo a dimensão do universo de clientes possíveis na
  zona de quem pergunta.

  **A base legal, verificada no texto consolidado.** O Turismo de Portugal
  publica o RNAL como dados abertos e não emitiu licença nenhuma — verificado a
  2026-08-22 em quatro autoridades independentes (serviço ArcGIS sem
  `copyrightText`, item sem `licenseInfo`, catálogo DCAT do portal oficial com
  `license: ""` nos 53 conjuntos, dados.gov.pt com `notspecified`). Sem licença
  emitida aplica-se o regime geral da Lei n.º 26/2016, na redação da Lei n.º
  68/2021 (que transpõe a Diretiva (UE) 2019/1024):

  - **art. 19.º, n.º 1** — documentos administrativos de acesso autorizado
    «podem ser reutilizados para fins comerciais ou não comerciais»;
  - **art. 23.º, n.º 1** — só é exigível licença quando a entidade decide
    subordinar a autorização a condições próprias; não o fez;
  - **art. 23.º, n.º 3, al. a)** — a reutilização de documentos disponibilizados
    através da Internet é gratuita;
  - **art. 19.º, n.º 5** — condições: não desvirtuar o sentido e mencionar
    sempre a fonte e a data da última atualização.

  **Porque é que a licença está no manifesto e não na fonte.** O art. 20.º,
  al. c) só permite reutilizar documentos nominativos «quando os dados pessoais
  possam ser anonimizados sem possibilidade de reversão». O RNAL em bruto é
  nominativo — nome, morada e coordenadas de 111 mil alojamentos — por isso a
  FONTE fica em `review_required`. O que estes manifestos leem são contagens
  agregadas pelo servidor da fonte (`groupByFieldsForStatistics`): de 44 818 não
  há caminho de volta a ninguém. A agregação feita por privacidade é exatamente
  a condição que a lei exige para a reutilização ser lícita — e uma série futura
  que leia linhas individuais não herda a licença e fica retida.

- **`license_review` deixou de ser um estado morto.** Estava declarado no tipo e
  nunca era produzido: uma fonte com números impecáveis e termos por declarar
  caía em `quarantined`, cuja mensagem se lê como «os dados vieram mal». São
  agora dois estados com duas mensagens, e a nota do cartão deixou de somar
  leituras retidas à contagem de linhas rejeitadas. O mecanismo continua vivo e
  testado — é o que retém qualquer leitura desta fonte que não agregue.

- **A oferta entrou, e a lacuna deixou de ser sempre «por apurar».** O motor lê
  o indicador 0014449 do INE — empresas por NUTS 2024 e divisão da CAE — e a
  ontologia diz em que divisão um operador de cada hipótese se inscreveria.
  Normalizado pela população residente (INE 0012918), dá operadores por dez mil
  habitantes, comparável entre as nove regiões. A leitura de lacuna só é
  produzida quando existem OS DOIS termos: sem procura publicada, densidade
  baixa é indistinguível de mercado que não existe.

  Isso alimenta também a dimensão de risco competitivo, que era uma constante
  em nível 2 para todos os candidatos. Quando a densidade não é apurável, o
  nível continua a ser 2 mas fica marcado como **não apurado** — e o que não
  foi apurado não conta para a contagem que baixa o score. Assumir por
  prudência é legítimo; punir por uma suposição não é.

  E o RNAL nunca foi essa série, apesar de contar operadores. Todas as hipóteses do
  produto são serviços prestados a alguém, e o RNAL conta esse alguém: para
  «operações locais para alojamento turístico», os 44 818 alojamentos do Algarve
  não são a concorrência — são a lista de clientes possíveis. Classificá-los
  como `supply` diria a quem procura negócio que o mercado já está servido,
  contando os futuros clientes dela como rivais. O mesmo número seria oferta
  para quem quisesse ABRIR um alojamento local, e essa hipótese não existe no
  produto. Daí a regra: **o `kind` pertence ao par (série, piloto), não à
  série.** Uma fonte de oferta a sério tem de contar operadores DA hipótese —
  empresas de limpeza, de co-anfitrião, de gestão de reservas por zona — e
  nenhuma fonte pública portuguesa o faz hoje.

- **Granularidade geográfica.** A evidência desce a NUTS II; o contexto aceita
  distrito e raio. Onde o dado não existe ao nível pedido, a interface diz que
  está a mostrar o nível acima em vez de fingir precisão local.
