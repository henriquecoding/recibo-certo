# Market Intelligence Engine

> Estado da implementação: **MI-3 — cobertura nacional, os cinco pilotos com
> ingestão ativa, ingestão em bloco do Portal BASE agendada, triangulação real
> em quatro deles e prova comercial local, em 2026-08-21**.
> Este documento é a especificação executável resumida. O handoff operacional
> vive em [`docs/handoff/MARKET-INTELLIGENCE-HANDOFF.md`](../handoff/MARKET-INTELLIGENCE-HANDOFF.md).

## 1. Resultado que o motor deve produzir

O catálogo de ideias contém hipóteses. O Market Intelligence Engine decide se
há evidência suficiente para as mostrar como oportunidades atuais em Portugal.
Não promete sucesso e não converte texto gerado por IA em factos.

Uma afirmação de mercado só pode entrar num resultado quando guarda:

- entidade publicadora e fonte registada;
- métrica e unidade explícitas;
- geografia e respetiva classificação;
- período de referência;
- data de publicação, quando existe;
- data real de recolha;
- validade para a finalidade concreta;
- transformação e versão do parser;
- estado de qualidade e mapeamento semântico;
- SHA-256 do conteúdo de origem.

Se estes elementos não forem demonstráveis, o estado correto é **dados
insuficientes**, nunca uma média, previsão ou “estimativa plausível” escondida.

## 2. Fronteiras que não se atravessam

| Responsabilidade | Fonte de verdade |
|---|---|
| impostos, Segurança Social, IVA e obrigações legais | motores fiscais existentes |
| preço, margem, horas faturáveis e capacidade económica da oferta | `src/lib/pricing` |
| agregação, estrutura, caixa e viabilidade do negócio | `src/lib/negocio` |
| procura, estrutura setorial, concorrência e proveniência externa | `src/lib/negocio/market` |
| perfil, localização exata e testes privados do utilizador | dispositivo do utilizador |

O módulo de mercado não contém um segundo solver de preço. O `evidence gate`
recebe `economicViability` do motor canónico e apenas decide se essa condição,
em conjunto com a evidência externa, permite subir o estado da hipótese.

## 3. Estados públicos

| Estado | Linguagem da interface | Condição resumida |
|---|---|---|
| `template` | Ideia possível | catálogo sem evidência utilizável |
| `signal_detected` | Sinal a investigar | pelo menos um sinal saudável |
| `candidate` | Candidata para teste | sinais independentes; economia ou operação por validar |
| `evidence_qualified` | Oportunidade sustentada por dados | gate completo atravessado |
| `user_validated` | Validada no seu mercado | orçamento aceite, pré-venda, piloto pago ou venda atual |
| `operating` | Negócio em operação | repetição, contribuição positiva e recebimento observados |
| `stale` | Precisa de nova validação | fonte crítica ou prova do utilizador perdeu validade |
| `contradicted` | Hipótese contrariada | requisito bloqueado, economia inviável ou contradição decisiva |

Um piloto pago isolado sobe para `user_validated`, não para `operating`.

## 4. Evidence gate mínimo

Para `evidence_qualified`, todas estas condições são obrigatórias:

1. sinal recente de procura ou transação;
2. segundo sinal de estrutura, transação, oferta, concorrência ou custo;
3. pelo menos duas fontes independentes e saudáveis;
4. geografia compatível com o modelo de entrega;
5. mapeamento semântico aprovado por curadoria;
6. nenhuma fonte crítica stale, em revisão de licença ou quarentena;
7. viabilidade económica confirmada na Pricing/Business Engine;
8. requisitos críticos conhecidos;
9. teste de falsificação definido.

O score de atratividade só será implementado depois deste gate. Um score alto
não pode compensar licença desconhecida, dado antigo, geografia errada ou um
preço economicamente inviável.

## 5. Quatro relógios diferentes

| Campo | Pergunta que responde |
|---|---|
| `referencePeriod` | a que período o valor diz respeito? |
| `publishedAt` | quando a entidade o publicou/reviu? |
| `retrievedAt` | quando o Recibo Certo o recolheu? |
| `validUntil` | até quando pode sustentar esta finalidade? |

`retrievedAt` nunca prolonga `referencePeriod`. Uma série de 2023 recolhida em
2026 continua a ser uma série de 2023.

## 6. Pipeline pretendida

```mermaid
flowchart TD
    A["Source registry"] --> B["Conector + raw quarantine"]
    B --> C["Normalização curada"]
    C --> D["Licença, schema e frescura"]
    D --> E["Observações aprovadas"]
    E --> F["Snapshot assinado"]
    F --> G["Evidence gate local-first"]
```

O browser não deve consultar dez fornecedores quando alguém abre um cartão.
A ingestão ocorre no servidor, publica um pack público compacto e o cliente
combina esse pack localmente com o perfil privado.

## 6.1. Transporte: um pedido por indicador, não por série

Três pilotos leem o indicador de demografia das empresas e dois o índice de
envelhecimento. Um pedido por SÉRIE dava dez chamadas concorrentes ao INE, que
respondia 503 a metade — e os cartões apareciam em `delayed` por culpa nossa.

`MarketTransport` resolve isto dentro de cada execução:

- **cache por URL**: duas séries que só diferem no filtro de dimensões
  partilham a resposta HTTP e normalizam-na de maneira diferente;
- **serialização por fonte**: o INE recebe um pedido de cada vez;
- **três tentativas com recuo** (400 ms, 800 ms), porque a recusa costuma ser
  de carga e não de contrato. Uma fonte que mudou de contrato falha nas três.

A rota `/api/market/pilots` completa a defesa: quando alguma fonte fica por
confirmar, devolve `s-maxage=300` em vez de `21600`. Sem isso, uma build
infeliz servia seis horas de cartões degradados.

## 7. Source registry atual

Estado revisto em 2026-08-20:

| Fonte | Acesso confirmado | Estado do conector | Estado de reutilização |
|---|---|---|---|
| [INE — API da Base de Dados](https://www.ine.pt/xportal/xmain?xpgid=ine_api_db&xpid=INE) | JSON por indicador | `ready` | `review_required` |
| [BPstat — Data API](https://bpstat.bportugal.pt/data/docs) | API JSON-stat | `planned` | `review_required` |
| [dados.gov.pt](https://dados.gov.pt/) | API/catálogo aberto + ficheiros em bloco | `ready` | catálogo aprovado; licença de cada recurso é separada |
| [Eurostat](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started) | JSON-stat | `ready` | `approved`, com atribuição e termos específicos por recurso |
| [IEFP](https://www.iefp.pt/estatisticas) | ODS mensal | `planned` | `review_required` |

### Porque o INE genérico ainda fica em quarentena

A documentação oficial confirma o endpoint e o acesso público. Nesta revisão
não foi encontrada, na própria documentação da API, uma licença inequívoca que
autorize armazenamento e republicação comercial de qualquer série. O conector
funciona, mas `validateMarketObservation()` bloqueia publicação até essa questão
ser resolvida e registada. O mesmo princípio aplica-se ao BPstat.

Datasets concretos publicados no dados.gov com licença CC BY 4.0 podem atravessar
o gate através de `datasetLicense`. Isto não aprova outras séries do INE. É uma
propriedade do produto: **acesso público não é sinónimo automático de direito de
republicação**.

## 8. Conectores

Implementação: `src/lib/negocio/market/connectors/ine.ts`.

O conector:

- constrói apenas URLs para o host e endpoint registados;
- aceita códigos de indicador com exatamente sete algarismos;
- usa `op=2`, língua explícita e `Accept: application/json`;
- valida o envelope antes de o usar;
- calcula SHA-256 da resposta, sem fallback para hash fraco;
- recebe `fetch` e relógio por injeção para testes determinísticos;
- normaliza apenas períodos anuais;
- exige unidade, métrica, validade, dimensões e geografias num manifesto curado;
- põe sinais convencionais, valores ambíguos, duplicados e mudanças de nome
  geográfico em quarentena.

O indicador `0000540` presente nos testes é uma fixture do schema oficial. Foi
escolhido porque a resposta pública contém períodos, geografias, dimensões,
valores e sinais convencionais. **Não é uma métrica de oportunidade e não entra
no produto.**

`connectors/eurostat.ts` valida o cubo JSON-stat pelas dimensões `id`/`size`,
percorre índices de forma determinística e só publica células selecionadas por
manifesto. O `independenceKey` pertence ao sinal: duas superfícies que derivam
da mesma operação estatística contam uma vez.

## 8.1. Fontes em bloco: o que não cabe num pedido HTTP

O INE e o Eurostat respondem em JSON, em segundos, e por isso são consultados
quando a rota revalida. O ficheiro anual de contratos públicos do Portal BASE
são **52 MB comprimidos que descomprimem para 273 MB**, com **246 978 registos**
só em 2025. Ler isso a pedido faria cada visita esperar meio minuto por um
número que muda uma vez por mês.

Por isso corre fora do produto, em `scripts/ingerir-mercado.mjs`, e o que fica
no repositório são 20 contagens em
`src/lib/negocio/market/bulk/dados/contratos-publicos.json`.

```mermaid
flowchart LR
    A["dados.gov API<br/>resolve o recurso atual"] --> B["download<br/>+ SHA-256"]
    B --> C["ZIP de entrada única<br/>inflate em streaming"]
    C --> D["array JSON de topo<br/>um objeto de cada vez"]
    D --> E["agregação por NUTS II"]
    E --> F["validateMarketObservation<br/>o MESMO gate"]
    F --> G["instantâneo assinado<br/>commitado no repo"]
    G --> H["pilot-loader<br/>connector: bulk"]
```

Cinco decisões que sustentam este caminho:

- **o recurso é resolvido pela API, nunca por URL fixo.** O URL do portal traz
  o instante da publicação no caminho (`/20260816-091135-e2c09fd9/`). Fixá-lo
  significaria descarregar para sempre a versão de agosto de 2026 — e fazê-lo
  em silêncio, porque o pedido continua a devolver 200;
- **o ano é derivado do calendário.** `fontesEmBloco()` pede sempre o último ano
  civil COMPLETO. O ficheiro do ano em curso é uma contagem parcial que cresce
  todas as semanas; publicá-la ao lado de séries anuais convidava a lê-la como
  se fosse um ano. Em janeiro isto roda sozinho, sem ninguém editar código;
- **memória constante.** `bulk/zip.ts` arranca o cabeçalho de 30 bytes e liga o
  resto ao `createInflateRaw` do `zlib`; `bulk/json-array.ts` acompanha
  profundidade de chavetas com estado de string e de escape, e entrega um
  objeto de cada vez ao `JSON.parse`. Pico medido: 166 MB de RSS para 273 MB de
  entrada. Nenhuma dependência nova;
- **o `contentHash` cobre só as observações.** `retrievedAt` e `geradoEm` mudam
  a cada execução por definição; metê-los na assinatura faria o job abrir um PR
  todas as semanas a dizer que os números continuam iguais;
- **as observações passam pelo mesmo `validateMarketObservation`.** Uma origem
  em bloco não ganha dispensa de licença, período, geografia ou checksum. Um
  instantâneo por atualizar acaba `stale` sozinho, sem código especial.

### Concelho → NUTS II, derivado e não escrito à mão

A fonte traz «Portugal, Setúbal, Almada»: país, distrito, concelho. Distrito
**não é** NUTS II — Sines e Grândola são Alentejo apesar de serem do distrito
de Setúbal; Mafra e Torres Vedras são Oeste apesar de serem do de Lisboa.

O mapa deriva-se dos códigos hierárquicos do INE, onde os primeiros caracteres
SÃO a NUTS II (`1B01503` Almada → `1B`; `1C11513` Sines → `1C`). Escrevê-lo à
mão repetiria o erro de mapear `11A` como Grande Lisboa quando é Área
Metropolitana do Porto.

Dois casos que a primeira versão errava em silêncio:

- **homónimos.** O INE escreve `Lagoa` (Algarve) e `Lagoa (R.A.A.)`; a fonte dos
  contratos escreve as duas como «Lagoa» e diz a região à parte. Um índice de
  um-para-um mandava **422 contratos dos Açores para o Algarve**. Agora cada
  grafia guarda todos os candidatos e o desempate usa apenas duas inferências
  derivadas: o distrito nomeia uma região autónoma, ou não nomeia nenhuma e
  portanto o sítio é continental;
- **abreviaturas.** «Vila Real Sto Antonio», «Fig. Castelo Rodrigo». A tabela
  `GRAFIAS_ALTERNATIVAS` é ortografia, não geografia: aponta para um nome que
  tem de existir na lista do INE, e `aliasesPendentes()` **falha o job** quando
  deixa de existir. Recuperou 830 dos 952 contratos que se perdiam; os 122 que
  ficam dizem «Concelho não determinado» na própria fonte.

### O que se conta e o que não se conta

| Decisão | Razão |
|---|---|
| não somar `precoContratual` | o relatório mestre proíbe tratar o valor anunciado como receita provável; «450 M€ na tua zona» convidaria exatamente a essa leitura |
| não publicar quota de PME | `adjudicatarioPMEs` nunca aparece como lista vazia: ou traz NIFs (213 382) ou não existe (33 596). «Ausente» tanto pode ser «nenhuma PME» como «não declarado» |
| não contar adjudicatários únicos | um NIF por zona e por ano aproxima-se de identificar empresas concretas |
| aceitar tipos multivalorados | `tipoContrato` é sempre um array e 1 838 contratos declaram mais do que um tipo; olhar só para o primeiro deitava fora contratos pela ordem dos rótulos |
| lista de PERMISSÃO para procedimentos abertos | a lista de exclusão contava 31 040 chamadas ao abrigo de acordo-quadro e 14 485 contratações excluídas como «abertos»: **86 019 em vez de 33 825** |
| completude regional < 1 | 15% dos contratos não trazem concelho legível. Contam no país e em zona nenhuma; declarar completude 1 nas zonas afirmaria uma cobertura que a fonte não dá |

### Atualização periódica

`.github/workflows/mercado-ingestao.yml` corre à segunda-feira. Nunca faz push
para `main`: escreve no ramo `dados/mercado-contratos` e abre um PR com a tabela
antes/depois das contagens nacionais. A regra 9 do CLAUDE.md não abre exceções
para dados — `scripts/anotar-novidade-mercado.mjs` sobe o patch e escreve a
entrada do popup de Novidades a partir dos números que mudaram mesmo.

Se a ingestão falhar, abre (ou comenta) uma issue com a etiqueta `dados-mercado`
e não altera número nenhum.

## 9. Integridade e source health

Uma observação só é publicável quando:

- a fonte existe no registry;
- a licença está `approved`;
- campos obrigatórios não estão vazios;
- números são finitos;
- datas ISO são inequívocas e o período é coerente;
- país, código e nome geográfico existem;
- completude pertence a `[0, 1]`;
- mapeamento semântico está `approved`;
- checksum usa SHA-256;
- a observação não expirou.

Estados operacionais reservados no contrato:

`healthy`, `delayed`, `stale`, `schema_changed`, `license_review`,
`quarantined` e `disabled`.

Não existe fallback numérico quando uma fonte falha.

## 10. Privacidade e segurança

- Perfil pessoal, localização precisa, entrevistas, orçamentos e vendas ficam
  locais por omissão.
- Snapshots públicos não contêm consultas individuais nem identificadores de
  utilizadores.
- APIs pagas/on-demand só serão chamadas por ação explícita e segundo os termos
  de cache/armazenamento.
- Não fazer scraping de Google Maps, Idealista, OLX, LinkedIn ou plataformas
  semelhantes.
- IA pode propor um mapeamento CAE/CPV/termo, mas não o aprova nem fornece o
  valor numérico.

## 11. Primeira interface pública

A rota `/ferramentas/descobrir-negocio` pode existir antes de haver uma
“oportunidade verde” porque mostra estados incompletos e o que falta. Um cartão
`evidence_qualified` continua bloqueado enquanto não existirem:

1. licença resolvida para as séries publicadas;
2. três fontes independentes úteis, sendo pelo menos duas oficiais ou
   transacionais licenciadas;
3. manifests de indicadores curados e versionados;
4. pipeline de ingestão com raw quarantine;
5. snapshot versionado, hash, assinatura e manifesto;
6. source health observável;
7. integração explícita com a Pricing Engine;
8. cartões com fonte, geografia, período, recolha e limitações visíveis.

Os cinco pilotos consultam fontes oficiais. Quinze séries, seis operações
estatísticas independentes, todas com licença CC BY do dataset, a política de
reutilização do Eurostat ou o domínio público declarado pelo IMPIC.

| Hipótese | Séries | Operações | Estado sem input do utilizador |
|---|---|---|---|
| Operações turísticas | ocupação-quarto + nascimentos de sociedades | 2 | `candidate` |
| Operações digitais | intensidade digital (micro, 10–49) + nascimentos (individual, sociedade) | 2 | `candidate` |
| Transições de casa | transações por famílias + índice de envelhecimento | 2 | `candidate` |
| Concursos públicos | procedimentos abertos + contratos celebrados + emprego em empresas <10 + nascimentos de sociedades | 3 | `candidate` |
| Acompanhamento sénior | competências digitais (65–74, total) + envelhecimento | 2 | `signal_detected` |

O último fica em `signal_detected` de propósito: nenhuma das suas séries é de
procura ou transação. A honestidade está na falta declarada — «falta um sinal
recente de procura ou transação» — e não numa promoção arranjada.

O piloto de concursos estava no mesmo caso até o Portal BASE entrar. Não subiu
porque se mudou o gate: subiu porque passou a existir um sinal transacional a
sério — contratos celebrados e registados — vindo de uma operação estatística
que não é nem o INE nem o Eurostat.

`evidence_qualified` é atingível a partir de `candidate`, e só com o que a
pessoa traz: um cenário de preço viável no motor canónico e os requisitos
críticos confirmados. Nenhum servidor pode decidir isso por ela.

### A regra que decide o `kind` de uma série

Escrita para não ser escolhida ao sabor do estado que daria melhor:

- `demand` — mede a intensidade da própria necessidade (ocupação-quarto);
- `transactional` — conta eventos reais registados que criam a necessidade
  (uma empresa que nasce, uma casa que muda de mãos entre famílias);
- `structural` — stock, composição ou capacidade do universo (intensidade
  digital, índice de envelhecimento, emprego por escalão).

Nenhum deles prova disposição a pagar, e é por isso que nenhum, sozinho ou
acompanhado, chega a `user_validated`.

## 12. Verificação local

```bash
npm ci
npm run market:check
npx tsc --noEmit
npm test
npm run build
# com `npm start` noutro terminal:
npm run descobrir:e2e

# ingestão em bloco (rede: dados.gov + INE, ~25 s, ~52 MB)
npm run mercado:ingerir              # reescreve o instantâneo se mudou
npm run mercado:ingerir -- --forcar  # relê mesmo que a data do recurso não tenha mudado
npm run mercado:check                # falha se o commitado divergir da fonte
```

`mercado:check` **não** entra no build: descarrega dezenas de megabytes e
depende de duas redes. O que protege o build é o `contentHash`, recalculado a
partir das próprias observações em `negocio-market-contratos-snapshot.test.ts`
— editar um número à mão e commitar deixa de passar despercebido.

O conjunto dedicado cobre source registry, integridade, frescura, lineage,
evidence gate, conectores INE/Eurostat, quarentena, snapshots, adapter de preço,
geografia, provas locais e o gate local.

`descobrir:e2e` cobre o que não cabe no vitest e onde os dois defeitos mais
caros de MI-1 viveram: o contexto nacional a desaparecer do ecrã e o preço
unitário no campo do recibo mensal. Nenhum dos dois partia build, testes ou
type-check. Corre em 360 px e desktop, claro e escuro, com axe.

## 13. Geografia: onde o modelo funciona ≠ onde temos dados

Confundir as duas coisas custou um defeito real em MI-1. O piloto turístico
declarava `regions: ["grande-lisboa", "peninsula-setubal"]` porque o manifesto
começou por mapear duas NUTS II — e a interface filtrava as observações
comparando o código geográfico com `null` para quem escolhesse «outra zona».
Resultado: a leitura NACIONAL, publicável e válida para o país inteiro, era
descartada, e a página afirmava não haver sinal enquanto a fonte respondia.

As regras agora são explícitas e testadas em `geografia.ts`:

- `regions` de um template descreve onde o MODELO faz sentido, nunca onde
  existem dados. A diferença entre zonas vem do valor observado;
- uma observação de nível `country` é contexto legítimo para qualquer zona,
  e é mostrada marcada como nacional — nunca como sinal local;
- uma observação regional só serve a sua própria NUTS II;
- não fixar zona não penaliza a compatibilidade de ninguém;
- a zona é escolhida de uma lista fechada de NUTS II. Não se recolhe morada,
  código postal nem GPS.

## 14. Prova local e o gate que corre duas vezes

O servidor monta um pack público igual para toda a gente: não conhece a zona
de quem pergunta, nem o preço formado, nem se alguém já pagou. O gate que
corre lá é, por construção, o mais fraco dos dois.

`gate-local.ts` corre O MESMO `evaluateMarketEvidence` — sem cópia nem
variante — acrescentando o que só existe no dispositivo:

| Entrada local | Origem |
|---|---|
| zona escolhida | filtra que observações servem |
| cenário de preço concluído | `assessMarketEconomics` do motor canónico |
| requisitos revistos | confirmação explícita da pessoa |
| provas comerciais | `hipoteses.ts`, guardadas em `store/hipoteses-mercado.ts` |

Regras da prova, retiradas do relatório e não desta implementação:

1. entrevista **não** é prova de mercado: conta-se, mostra-se e não muda o estado;
2. prova comercial é orçamento aceite, pré-venda, piloto pago ou venda;
3. `operating` exige repetição, contribuição positiva observada **e**
   recebimento — as três, não duas;
4. uma prova vale 180 dias; expirada, degrada em vez de conservar crédito.

Sem isto, `user_validated` e `operating` eram estados que o motor sabia
calcular e ninguém conseguia atingir.

## 15. Superfícies implementadas

- `/ferramentas/descobrir-negocio`: compatibilidade local + dossiers + evidência
  oficial + registo de provas comerciais no dispositivo;
- `/api/market/pilots`: pack público agregado, cacheado, sem perfil do utilizador;
- `/api/market/pilots`: degrada para uma lista vazia identificada em vez de 500
  quando algo falha antes da ingestão;
- `/api/market/pilots`: as séries em bloco continuam a responder com a rede toda
  em baixo — é o ponto de ler fora do produto, e está coberto por um teste que
  injeta um `fetch` que só lança;
- `/ferramentas/recibos-verdes`: incorpora o Pricing Engine e transfere a BASE
  MENSAL sem IVA (preço × unidades/mês) e a projeção anual para o cálculo
  fiscal. Passar o preço unitário para o campo mensal foi um defeito real de
  MI-1: os dois números discordavam por um fator igual ao volume. A conversão
  vive em `preco-handoff.ts` e é testada contra o motor;
- `/ferramentas/recibos-verdes?...&h=<opportunity-id>`: devolve o veredicto do
  motor canónico de preço à hipótese, fechando o ciclo descoberta → preço →
  gate. Só viaja o veredicto e o preço líquido: nunca custos, margens ou
  clientes;
- `/dashboard/negocio?o=<opportunity-id>`: leva a hipótese selecionada para o
  motor de empresa, acrescenta a oferta sem apagar o rascunho existente e abre
  o cenário canónico de preço correspondente;
- relatório completo em
  [`docs/research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md`](../research/RELATORIO-MESTRE-MOTOR-NEGOCIO-PORTUGAL-2026.md).
