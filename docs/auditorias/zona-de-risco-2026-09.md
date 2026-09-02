# Auditoria da Zona de Risco — 02/09/2026

> Âmbito: `src/components/conta/ZonaDeRisco.tsx`, `src/lib/conta/*`,
> `src/app/api/conta/apagar/route.ts`, e as funções SQL que apagam
> (`apagar_conjuntos`, `inventario_do_utilizador`, `ficheiros_do_utilizador`,
> `conjuntos_todos`), mais o cofre do browser (`src/lib/store/cofre.ts`).
>
> Resultado: **12 achados**, três deles de perda de dados e dois de
> promessa não cumprida. Todos corrigidos nesta entrega, exceto os dois
> registados no fim como dívida assumida.

---

## Como se lê a gravidade

| Nível | Significado |
|---|---|
| **P0** | Perde dados, ou diz que apagou o que não apagou. |
| **P1** | Contradiz uma promessa escrita no ecrã, ou impede uma ação legítima. |
| **P2** | Fricção, cópia desatualizada ou código morto. |

---

## P0-1 · Cinco conjuntos declarados apagáveis nunca eram apagados

**O que acontecia.** O catálogo (`src/lib/conta/catalogo.ts`) declara
apagáveis `calendario`, `painel-vistas`, `fundador`,
`propostas-desbloqueio` e `fidelidade-regras`. A rota validava-os contra
`APAGAVEIS` e mandava-os para `apagar_conjuntos`. Nessa função **não havia
bloco nenhum a corresponder-lhes**: a última definição (migração 051)
conhecia vinte conjuntos, o catálogo tinha vinte e cinco. A função devolvia
`ok: true`, a rota respondia «apagado», o manifesto registava o pedido, e as
linhas ficavam.

**Porque magoa.** Uma linha de `calendario_assinaturas` **é** a chave de
leitura de uma agenda — o Google, o Apple e o Outlook leem por ela, sem
sessão. Quem a mandou apagar continuou a ter a agenda a ser lida por um
serviço externo, com a plataforma a dizer-lhe que já não estava lá.

**Correção.** Migração `20260902170000`: um bloco por conjunto, com as
tabelas certas e a ordem das dependências.

**Porque não volta a acontecer.** `RC-DADOS-003` compara `APAGAVEIS` com o
texto SQL da última definição de `apagar_conjuntos`. Um conjunto novo sem
bloco reprova o build. A verificação é nos dois sentidos: o SQL também não
pode apagar nada que o catálogo não declare.

---

## P0-2 · O buraco anterior estava tapado por um segundo buraco

**O que acontecia.** `inventario_do_utilizador` não devolvia chave para
esses cinco conjuntos (nem para `progressao`, `recebimentos` e
`compras-patamar`). A interface lê o inventário para saber o que a pessoa
tem: sem chave, `?? 0` dava zero, a linha aparecia a 45% de opacidade e a
caixa **desativada**.

**Porque magoa.** Nem sequer dava para escolher o que, escolhido, não seria
apagado. Uma pessoa com três endereços de calendário via «nada guardado».
Os dois defeitos escondiam-se um ao outro: o SQL não apagava o que a
interface não deixava escolher.

**Correção.** Uma chave por conjunto do catálogo, incluindo os retidos — a
interface precisa deles para explicar o que fica.

**Porque não volta a acontecer.** `RC-DADOS-003` exige uma chave por
conjunto no texto de `inventario_do_utilizador`.

---

## P0-3 · Apagar uma coisa na conta apagava tudo no dispositivo

**O que acontecia.** Depois de qualquer apagamento de conjuntos, a interface
chamava `limparLocal()` → `esvaziarCofre()`, que remove **os dezoito
domínios do cofre**.

**Porque magoa.** Escolher «Comentários que deixaste» — uma linha de
`site_feedback` — apagava, do dispositivo:

- o rascunho do estúdio de negócio (fornecedores, custos fixos, volumes, a
  estrutura de custos inteira);
- os preços guardados, com a estrutura de custos de cada um;
- as hipóteses de mercado (entrevistas, orçamentos aceites, pilotos pagos);
- o perfil de descoberta (zona, competências, ativos, capital, restrições);
- os instantâneos das análises anteriores;
- a simulação de IRS a meio.

Nada disto está na nuvem. Nada disto tinha sido escolhido. A resposta dizia
**«1 registo apagado.»**

**Correção.** `DOMINIOS_POR_CONJUNTO` em `src/lib/conta/catalogo-local.ts`
liga um conjunto da nuvem apenas ao domínio local que **é a mesma coisa**
(`recibos` → `recibos` + os totais calculados que derivam deles). Tudo o
resto só sai se for escolhido à mão, na secção do dispositivo. Apagar a
conta continua a levar o cofre inteiro, e isso está certo.

**Porque não volta a acontecer.** `RC-DADOS-004` verifica que
`dominiosDosConjuntos(APAGAVEIS)` não contém nenhum dos domínios sensíveis,
e o teste da interface reprova se `esvaziarCofre` voltar a aparecer no
caminho de apagar conjuntos.

---

## P0-4 · O que a lei protege desaparecia com a conta

**O que acontecia.** «O que fica, e porquê» prometia, com estas palavras:

> «O histórico de pagamentos fica retido pelo prazo legal de conservação de
> documentos de faturação. Deixa de estar ligado ao teu perfil, mas o
> registo de uma transação entre ti e um cliente não é apagável a pedido de
> um dos dois.»

O esquema garante o contrário. `pagamentos`, `progressao_compras`,
`contabilista_stripe`, `contabilista_progressao`, `progressao_eventos`,
`creditos_fidelidade_ledger`, `fidelidade_regras`, `contabilista_fundadores`,
`desbloqueio_propostas` e `contabilista_dashboard_vistas` pendem todas de
`public.contabilistas(user_id)` com `ON DELETE CASCADE`; e
`contabilistas.user_id` pende de `auth.users(id)` com `ON DELETE CASCADE`.

Duas consequências:

1. Assinalar **«Perfil público e agenda»** — uma caixa normal, sem aviso
   nenhum — levava com ela o histórico de pagamentos inteiro.
2. `pagamentos.cliente_id` também cascateia de `auth.users`: um **cliente**
   a apagar a conta apagava a prova de uma transação que é do contabilista
   — exatamente o que a mesma frase diz que não pode acontecer a pedido de
   um dos dois.

**Correção.** Não se mexeu nas chaves estrangeiras — fazê-lo obrigaria a
tornar colunas nulas e a mexer no RLS de tabelas em produção. Em vez disso,
`reter_faturacao()` corre no **início** de `apagar_conjuntos`, dentro da
mesma transação, e copia os documentos para `public.faturacao_retida`:
valores, moeda, estado, identificador da Stripe, data, e o prazo de
retenção já calculado. Sem `user_id`, sem chave estrangeira nenhuma (uma
referência a `auth.users` levava a tabela com a conta, e a retenção deixava
de existir no momento exato em que é para existir), e com referências
pseudónimas que permitem agrupar sem permitir atribuir. Sem política de
`SELECT`: um registo que deixou de estar ligado a uma pessoa não pode ser
lido por essa pessoa — se pudesse, continuava ligado.

Só entram documentos que chegaram a ser uma transação (`pago`,
`reembolsado`; `paid`, `applied`, `refunded`, `needs_refund`). Reter um
pagamento pendente ou expirado seria guardar dados a pretexto de uma lei
que não os pede.

**Prazo.** Dez anos civis subsequentes ao ano do documento — art. 52.º n.º 1
do Código do IVA, e art. 123.º n.º 4 do CIRC para o suporte da
contabilidade. Guardado em `retido_ate` no momento da retenção, e não
deduzido na leitura: se a lei mudar, o que já lá está mantém o prazo com
que entrou.

**Porque não volta a acontecer.** `RC-DADOS-003` exige que toda a tabela de
um conjunto marcado `retido` apareça em `reter_faturacao`.

---

## P1-5 · A zona de risco não existia para quem não tem conta

**O que acontecia.** O componente começava por `if (!user) return null`, e a
página só o montava dentro do ramo com sessão iniciada.

**Porque magoa.** As calculadoras, os simuladores, o estúdio de negócio e o
motor de descoberta funcionam sem conta — está escrito na própria página:
«as calculadoras, os simuladores e os guias funcionam sem conta». Essas
pessoas têm dados, e têm os mais sensíveis: custos de fornecedor, margens,
volumes, o perfil de competências. Não tinham por onde os apagar, em lado
nenhum do produto. A zona de risco aparecia exatamente a quem tinha menos
coisas por apagar.

**Correção.** A secção do dispositivo aparece sempre — com sessão, sem
sessão, e mesmo quando a nuvem não está configurada no ambiente. A da
nuvem e a da conta continuam a exigir sessão.

---

## P1-6 · Mostrava a toda a gente o que só vale para contabilistas

**O que acontecia.** `retidos` era `CONJUNTOS.filter(c => c.retido)`, sem
filtro nenhum. O campo `soSe` — `"contabilista" | "cliente-de-contabilista"`
— estava no catálogo desde o início e **não era lido por ninguém**: nem
pela interface, nem pela rota, nem por um teste.

**Porque magoa.** Uma pessoa com dois recibos e um comentário lia que os
recebimentos dela em Stripe ficavam retidos por lei, e que a progressão e a
comissão dela deixavam de estar ligadas ao perfil. Nunca tinha havido
recebimento nenhum. Isto é visível na captura que abriu esta auditoria.

**Correção.** O papel deduz-se do inventário — se nenhum conjunto de um
papel tem nada, a pessoa não tem esse papel — e vale para as duas listas: a
do que se apaga e a do que fica. O que fica passa ainda a exigir contagem
maior que zero: só se explica a retenção a quem tem alguma coisa retida.

---

## P1-7 · A retenção era por conjunto, e não por tabela

**O que acontecia.** `retido` marcava o conjunto inteiro, e um conjunto tem
várias tabelas.

- «Recebimentos e conta Stripe» juntava `pagamentos` (documento de
  faturação) e `contabilista_stripe` (a **ligação** à conta de
  recebimentos). Resultado: não havia, em lado nenhum do produto, forma de
  desligar a conta de recebimentos — e a razão dada era uma lei de
  conservação de faturação que não fala de ligações.
- «Progressão e comissão» juntava `progressao_compras` (documento) com
  `progressao_eventos`, `creditos_fidelidade_ledger` e
  `contabilista_progressao` (percurso). Três tabelas retidas sob uma
  justificação legal que só cobre a quarta.

Usar a lei para não apagar o que se podia apagar.

**Correção.** Quatro conjuntos onde havia dois: `stripe-ligacao` e
`progressao` passam a ser apagáveis; `recebimentos` e `compras-patamar`
ficam retidos, com uma tabela cada.

**Porque não volta a acontecer.** `RC-DADOS-002` reprova qualquer conjunto
retido com mais do que uma tabela.

---

## P1-8 · A frase de confirmação descrevia mal a ação

**O que acontecia.** Escolher uma coisa pedia para escrever **«apagar todos
os dados»**, porque a interface usava o alvo `tudo` para qualquer seleção.

**Porque magoa.** Uma confirmação existe para a pessoa parar e ler o que vai
acontecer. Uma frase que descreve mal a ação faz o contrário: quem lê fica
com uma ideia errada, e quem já sabe aprende a não ler a frase.

**Correção.** `selecao` → «apagar o que escolhi», seja um conjunto ou vinte.
E a caixa passa a mostrar a lista, por extenso, do que vai sair — escrever
uma frase sem ver o que ela abrange não é confirmar.

---

## P1-9 · «Exporta antes o que quiseres guardar» não tinha para onde

**O que acontecia.** A frase está no topo da secção desde que ela existe.
Havia três exportações de documentos — mapa de recibos, relatório de
vencimento, declaração de IRS — e mais nada: as conversas, os casos, as
consultas, os alertas, o cartão de fidelidade e o perfil não tinham por
onde sair. Um conselho impossível de seguir, logo acima de um botão que
apaga.

**Correção.** Dois botões, e o direito de portabilidade servido a sério:

- `GET /api/conta/exportar` — lê o **mesmo catálogo** que a zona de risco
  usa para apagar (a única forma de os dois não divergirem) e devolve um
  ficheiro. A leitura é feita com a sessão da pessoa e **nunca** com a
  chave de serviço: se o RLS não deixa ler, não sai — a rota não tem poder
  nenhum que a pessoa já não tenha.
- O do dispositivo é composto no browser e não passa por servidor nenhum.

---

## P1-10 · Uma falha de rede lia-se como «não tens nada»

**O que acontecia.** O `catch` do inventário estava vazio (`/* fica sem
números */`). Sem inventário, os grupos apareciam todos e sem contagens, e
não havia nada a dizer porquê.

**Correção.** Um estado próprio, com a frase que interessa: nada foi
apagado, e recarregar volta a tentar.

---

## P2-11 · O apagamento local não apanhava as chaves pré-cofre

**O que acontecia.** `esvaziarCofre` removia `chave::cofre`. Dois domínios
continuam a escrever na chave **global**, de antes do cofre:
`src/lib/perfil.tsx` e o snapshot do simulador de IRS
(`recibocerto:sim-irs:v1`) usam a chave crua, e não `chaveAtiva`.

Resultado: a simulação de IRS **sobrevivia** ao apagamento — e o
recarregamento que vem logo a seguir corria `migrarParaCofre`, que a
copiava de volta para o cofre acabado de esvaziar. Pedir para apagar e ver
o rascunho de volta ao fim de dois segundos é pior do que não ter pedido
nada.

**Correção.** `esvaziarCofre` e `apagarDominiosLocais` removem as duas
formas da mesma chave. A chave antiga não tem dono declarado, e é
exatamente por isso que sai: está neste browser, e quem está a apagar está
neste browser.

---

## P2-12 · Contrato morto e cópia desatualizada em `apagar.ts`

- `ALVOS` tinha seis entradas; quatro (`recibos`, `vencimentos`,
  `cenarios`, `perfil-fiscal`) deixaram de ser usadas quando a zona de
  risco passou a trabalhar por conjuntos, e continuavam com testes a
  confirmar as frases delas.
- A descrição de `conta` dizia «se tens uma subscrição ativa, cancela-a
  primeiro — apagar a conta não cancela a cobrança». A rota cancela a
  subscrição desde a migração 049, e a interface já dizia o contrário na
  mesma página.

**Correção.** Dois alvos — `selecao` e `conta` — e a descrição a dizer o que
o código faz.

---

## O que fica por fazer, e é decisão e não esquecimento

**As chaves estrangeiras continuam em `CASCADE`.** A retenção é feita por
cópia (`faturacao_retida`) e não por desligamento. Passar
`pagamentos.contabilista_id` a nulo com `ON DELETE SET NULL` seria mais
direto, mas obriga a tornar nulas colunas `NOT NULL` em produção e a rever
o RLS de duas tabelas com dinheiro. A cópia dá a mesma garantia com menos
superfície; se um dia se quiser o desligamento, o instantâneo já existe
para comparar.

**`faturacao_retida` não tem purga automática.** `retido_ate` está gravado
por linha, mas nada o varre. A varredura pertence a
`cron/purgar-dados`, que já corre uma vez por dia — e a mudança certa é
fazê-la lá, não aqui. Registado.
