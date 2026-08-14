# Etapas de execução — o que já fechou, e o que falta

O relatório mestre e a auditoria profunda listam achados; este ficheiro diz o
que foi **feito**, com que prova, e o que vem a seguir. Uma etapa só se dá por
fechada quando há uma asserção que falharia sem ela.

Prova de todas as etapas: `bash scripts/testar-rls.sh` (PostgreSQL a sério, as
migrações aplicadas duas vezes para provar a idempotência) e `npx vitest run`.

---

## Etapa 1 — As transições passam a ser comandos · **fechada**

Migração `047_rpcs_transacionais.sql`. 191 asserções de RLS (eram 159).

### O que estava mal

`agendamentos` tinha INSERT e UPDATE genéricos para `authenticated`. A política
verificava **quem** escrevia e o estado **final** — nunca o estado anterior nem
as regras do negócio. Por REST, isso permitia marcar às três da manhã de um
domingo, marcar daqui a cinco minutos, marcar daqui a dois anos, mudar a hora de
uma consulta já confirmada, saltar de «pedido» para «realizada», e duas pessoas
a competir pelo mesmo horário sem ninguém perder.

E havia `/api/contabilistas/avisar`: quem soubesse um id de vínculo disparava
notificações na conta de outra pessoa. O texto vinha de um catálogo fechado, mas
o momento e o destinatário eram escolhidos por quem chamava.

### O que passou a ser verdade

| Achado | Como fica fechado |
| --- | --- |
| P0.5 / PR-12 — corrida e TOCTOU nas transições | Cada transição é uma função com a precondição no `WHERE`: `UPDATE … WHERE id = ? AND estado = <esperado> RETURNING`. Se a linha não voltar, alguém chegou primeiro — e diz-se isso em vez de escrever por cima. |
| P0.6 (a metade que faltava) — escrita livre | As políticas de escrita de `agendamentos` saem e o `GRANT` é revogado. Marcar por REST, contornando a RPC, deixa de existir. |
| PR-09 / E3 — avisos forjáveis | O endpoint desaparece. As RPCs avisam de dentro da própria transação; os factos que são `INSERT` (pedir vínculo, escrever, enviar simulação) avisam por gatilho. Não há aviso sem facto, nem facto sem aviso. |
| PR-13 — email fire-and-forget | O email deixa de ser uma promessa pendurada num pedido que já respondeu. Passa a ser uma fila na própria linha do aviso (`email_estado`), esvaziada por `/api/cron/avisos-email` de quinze em quinze minutos, com três tentativas e sem entregar duas vezes o mesmo aviso (`FOR UPDATE SKIP LOCKED`). |
| Concluir e carimbar eram duas transações | `concluir_consulta` faz as duas numa só. Antes, se o carimbo falhasse, a consulta ficava concluída sem recompensa e a rota respondia sucesso. |
| O código do cupão vinha de fora | Passa a nascer em `gerar_codigo_cupao()`, dentro da transação. Um código escolhido é um código adivinhável por quem o escolheu. |

### Encontrado ao escrever os testes

A política de `notificacoes` deixava o dono escrever em **qualquer** coluna sua
— o que, com a fila nova, passava a incluir o `email_estado`. Marcar o próprio
aviso como «enviado» fazia o email nunca sair; pôr as tentativas a zero fazia-o
sair para sempre. Fechado com `GRANT UPDATE (lida_em)`: um `UPDATE` que roce na
fila falha ao nível do privilégio, antes de a política ser sequer avaliada.

### O que a superfície perdeu

Três rotas de servidor deixaram de existir: `/api/contabilistas/avisar`,
`/api/contabilistas/consulta` e o módulo `src/lib/contabilistas/avisar.ts`. O que
faziam com a chave de serviço passou a ser feito pela base de dados com a
identidade de quem pede.

---

## Etapa 2 — Storage endurecido (PR-03) · por fazer

`file_size_limit` e `allowed_mime_types` nos baldes; vagas de upload de uso
único emitidas pelo servidor (ordinal 1–5, nunca `count(*)`); validação por
magic bytes; nomes de ficheiro gerados; descarregamento com autorização atual,
`Content-Disposition: attachment` e `nosniff`; reconciliação de órfãos.

## Etapa 3 — Zona de perigo granular e catálogo de dados · por fazer

Um catálogo único a alimentar inventário, dependências, manifesto e eliminação
transacional. Manifesto imutável, arrendamento contra execução concorrente,
trabalho retomável, cancelamento idempotente do pagamento, e a conta de
autenticação em último lugar.

## Etapa 4 — O destino dos dados obedecido pelos stores · por fazer

O destino não se infere do plano; cofres por utilizador; nunca declarar sucesso
antes da confirmação; nenhuma migração silenciosa de local para nuvem.

## Depois — o modelo de intermediação

`docs/ESTRATEGIA-INTERMEDIACAO.md`, fases A a F, e as três perguntas em aberto
da §8.
