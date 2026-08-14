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

## Etapa 2 — Storage endurecido (PR-03) · **fechada**

Migração `048_storage_endurecido.sql`. 209 asserções de RLS (eram 191).

### O que estava mal

Os dois baldes foram criados só com `public = false`. Tudo o resto — os dez
megabytes, os cinco anexos por mensagem, os tipos aceites — vivia em
`conversa.ts`, no browser. Quem falasse diretamente com a API de Storage não
passava por nada disso: um ficheiro de dois gigabytes (`file_size_limit` era
`NULL`), um executável anunciado como PDF (quem declara o tipo é quem envia),
quinhentos objetos numa conversa (o teto de cinco estava num gatilho da tabela
que *descreve* os anexos, não no balde), e o caminho à escolha.

A tabela `contabilista_anexos` tem `bytes <= 10485760`. Não protegia nada: é o
cliente que escreve esse número, e o objeto já lá está de qualquer maneira. Uma
verificação sobre a linha que descreve o ficheiro não é uma verificação sobre o
ficheiro.

### O que passou a ser verdade

| Achado | Como fica fechado |
| --- | --- |
| Sem limite de tamanho | `file_size_limit = 10485760` nos dois baldes. O serviço recusa antes de a linha existir. |
| Sem limite de tipo | `allowed_mime_types` com nove entradas. **Não** estão lá `text/html` nem `image/svg+xml`: os dois executam ao serem abertos, e um ficheiro que executa servido do domínio de armazenamento é XSS guardado. |
| Caminho escolhido pelo cliente | Vagas de uso único (`anexo_vagas`). O caminho é gerado pelo servidor e a política de `INSERT` exige uma vaga aberta com aquele caminho exato. O nome que a pessoa deu guarda-se em `contabilista_anexos.nome`, para se mostrar — nunca no caminho. |
| Teto de cinco contornável | Índice único sobre `(mensagem_id, ordinal)`. Com `count(*)`, seis pedidos simultâneos leem todos «tenho quatro» e passam todos; com uma `UNIQUE`, o sexto colide. |
| Tipo declarado, nunca verificado | `src/lib/ficheiros/assinatura.ts` olha para os primeiros 64 bytes. Se desmentirem o tipo, o objeto é **apagado** e não fica linha nenhuma a apontar-lhe. Há também uma lista do que nunca entra (MZ, ELF, Mach-O, classe Java, shebang), porque texto é fácil de imitar. |
| Linha do anexo inventável | `REVOKE INSERT, UPDATE ON contabilista_anexos FROM authenticated`. A linha nasce em `fechar_vaga_de_anexo`, só acessível ao `service_role`, e **depois** de os bytes serem vistos. |
| Ninguém podia apagar | Não havia política de `DELETE` neste balde — nem para quem tinha enviado. Agora há, limitada a quem enviou e enquanto o vínculo durar. |
| Órfãos invisíveis | `purgar_anexos_orfaos()` e `purgar_vagas_velhas()`, com `/api/cron/purgar-anexos` a correr uma vez por dia. Duas horas de tolerância: menos apanharia envios ainda a decorrer. |

### Encontrado ao escrever os testes

O arreio do PostgreSQL não tinha `file_size_limit`, `allowed_mime_types` nem
`metadata` — a suíte «provava» limites que nunca eram exercidos. Ganhou as
colunas e um gatilho que recusa como o serviço do Supabase recusa. E o
descobridor de ficheiros de teste era `0[2-9]-*.sql`: o ficheiro 10 teria sido
ignorado em silêncio, e a suíte passaria a verde sem correr um único teste novo.

### O que falta desta etapa

O descarregamento continua a ser um URL assinado de cinco minutos, gerado no
browser. A assinatura sobrevive à autorização que a produziu: terminar o vínculo
um segundo depois não a invalida. Passar por uma rota que reconfirme a
autorização, force `Content-Disposition: attachment` e `X-Content-Type-Options:
nosniff` fica para a etapa seguinte, junto com o trilho de auditoria das
leituras que a administração faz aos documentos de candidatura.

## Etapa 3 — Zona de perigo granular e catálogo de dados · **fechada**

Migração `049_apagar_com_manifesto.sql` e `src/lib/conta/catalogo.ts`.
227 asserções de RLS (eram 209).

### O que estava mal

A rota apagava **cinco tabelas**. A base de dados tem **vinte e oito** com dados
de pessoas. Quem pedia para ser esquecido ficava com as conversas, as consultas,
as partilhas, os cartões de fidelidade, as notificações e a candidatura por
apagar — e a resposta dizia «ok, apagadas: 5».

E se alguma vez tinha escrito uma mensagem ou marcado uma consulta, a conta
**não era apagada de todo**: `contabilista_mensagens.autor_id` e
`agendamentos.cliente_id` referem `auth.users` com `ON DELETE RESTRICT`, e essas
tabelas não estavam na lista. `deleteUser` falhava e a resposta mandava a pessoa
contactar-nos. Ou seja: quem mais tinha usado a plataforma era exatamente quem
não conseguia sair dela.

A causa não foi distração — a lista estava escrita à mão dentro da rota. Uma
tabela nova nasce numa migração, e nada obrigava ninguém a voltar lá.

### O que passou a ser verdade

| Achado | Como fica fechado |
| --- | --- |
| Lista de tabelas escrita à mão | Um catálogo só (`catalogo.ts`), e um **teste que compara o catálogo com as tabelas que as migrações criam**. Uma tabela com coluna de dono que não apareça no catálogo, nem em `FORA_DO_CATALOGO` com uma razão escrita, faz o teste falhar antes de chegar a produção. |
| Não era transação | `apagar_conjuntos(text[])` — uma transação, na ordem das dependências. Se alguma coisa levantar, não saiu nada, e agora a frase «nada foi perdido» é verdadeira. |
| Não havia registo | `conta_apagamentos`: manifesto imutável, com contagens por tabela. Um gatilho recusa reescrevê-lo e apagá-lo — um registo que se pode alterar depois não é um registo, é uma alegação. Guarda o id em **texto**, sem referência: com chave estrangeira, apagar a conta levava o manifesto com ela. |
| Escolher às cegas | `inventario_do_utilizador()` — a interface mostra o que a pessoa **tem**, não o que poderia ter. O que está a zero aparece esbatido e não se pode escolher; um grupo inteiro vazio não aparece. |
| Nenhuma granularidade | Dezanove conjuntos em sete grupos, com caixas de seleção. Apagar as conversas e guardar os recibos passou a ser possível. |
| Ficheiros ficavam para trás | `ficheiros_do_utilizador()` é chamada **antes** de as linhas saírem — depois, já ninguém sabe que caminhos pertenciam a que vínculo. |
| A subscrição era problema de quem saía | A rota cancela-a. A cópia anterior dizia «se tens uma subscrição ativa, cancela-a primeiro», o que era empurrar para quem sai o trabalho de não continuar a ser cobrado. Idempotente: cancelar o que já está cancelado é uma resposta, não um erro. |
| Não se dizia o que fica | A interface tem uma secção «o que fica, e porquê», alimentada pelo campo `retido` do catálogo. |

### Encontrado ao escrever os testes

O teste de completude apanhou quatro tabelas cuja coluna de posse eu tinha
declarado errada: `quiz_profiles` é chaveada por `id`, `fidelidade_carimbos` por
`cartao_id`, `contabilistas` por `user_id`, `contabilista_tarefa_passos` por
`tarefa_id`. Um `DELETE` com a coluna errada não falha — **não apaga nada, em
silêncio**, que é o pior resultado possível numa função destas. O modelo passou a
declarar a posse por tabela, e não por conjunto.

O arreio de testes também não tinha nenhuma das tabelas anteriores à migração
042, nem `profiles.preferencias_fiscais`. Uma função de apagar que nunca correu
num teste não é uma garantia.

## Etapa 4 — O destino dos dados obedecido pelos stores · **fechada**

`src/lib/store/cofre.ts` e `destinoDosDados()` em `persistencia.ts`.
1487 testes (eram 1468).

### O que estava mal

**As chaves locais eram globais.** `recibocerto:recibos:v1`, sem nada que
dissesse de quem eram. Num browser partilhado — um computador de casa, um
portátil de trabalho, um telemóvel emprestado — quem entrasse a seguir via os
recibos, os vencimentos e o perfil fiscal de quem tinha entrado antes. É a mesma
coisa que a migração 038 fecha do lado do servidor, aberta do lado do browser, e
não era preciso ninguém fazer nada de errado: bastava sair da conta e outra
pessoa entrar.

**O destino era decidido cedo de mais.** Cada repositório fazia `disponivel &&
!!userId && plano === "plus"`. A regra está certa; o momento não. `plano` começa
em `"free"` e só passa a `"plus"` quando a subscrição responde — e nesse
intervalo um assinante do Plus é tratado como grátis. Nada dá erro: o recibo é
guardado, a interface diz «Guardado», e fica no aparelho. Depois a subscrição
chega, a aplicação passa a ler da nuvem, e o recibo desaparece do ecrã. Está em
disco, no sítio errado, e ninguém sabe que existe.

**E a zona de perigo não limpava nada.** A lista de chaves locais estava escrita
uma segunda vez dentro do componente, e três das quatro entradas estavam erradas
— `recibocerto:recibos` quando a chave é `recibocerto:recibos:v1`. Apagava-se na
nuvem, recarregava-se a página, e os dados locais continuavam lá.

### O que passou a ser verdade

| Achado | Como fica fechado |
| --- | --- |
| Chaves globais num browser partilhado | Cada pessoa tem o seu cofre (`::<cofre>` no fim da chave), ligado à sessão num sítio só — o `AuthProvider`. Mudar de conta muda de cofre; não há nada para limpar porque não há nada partilhado. Quem não tem sessão escreve no cofre `anonimo`, que continua partilhado e está **dito** no código. |
| Quem já usava a aplicação perdia tudo | `migrarParaCofre()` copia a chave global para o cofre de quem entrou e **remove a antiga** — deixá-la era manter o problema. Se o cofre já tiver dados, o que lá está ganha; se a cópia falhar, a chave antiga fica (perder dados a arrumá-los é pior do que a desarrumação). |
| Destino inferido do plano | `destinoDosDados()` tem **três** valores. «Ainda não sei» é uma resposta legítima, e é a única honesta enquanto a autenticação ou a subscrição não respondem. Todos os que escrevem recusam nesse estado, com uma mensagem em pt-PT e um erro do tipo recuperável. |
| A lista de chaves existia duas vezes | Existe uma: `DOMINIOS`. O que fica deliberadamente fora — tema, consentimento de cookies, atribuição — está em `FORA_DO_COFRE` com a razão escrita, e um teste percorre `src/` inteiro à procura de qualquer `"recibocerto:…"` que não esteja num dos dois. |

### O que ficou de fora, e porquê

`quiz-progresso.ts` passou a decidir o destino pela função partilhada, mas o que
escreve não recusa: `registrarSessao` devolve o XP ganho e a subida de nível, sem
canal de falha, e só é chamado no fim de um quiz — muito depois de a autenticação
ter respondido. Acrescentar-lhe um erro obriga a mudar quem o chama. Está escrito
como exceção no teste, para não passar por esquecimento.

## Depois — o modelo de intermediação

`docs/ESTRATEGIA-INTERMEDIACAO.md`, fases A a F, e as três perguntas em aberto
da §8.
