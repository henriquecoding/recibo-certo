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

## Etapa 5 — Descarregar com a autorização de agora · **fechada**

Migração `050_descarregar_com_autorizacao.sql` e `/api/contabilistas/descarregar`.
239 asserções de RLS (eram 227).

### O que estava mal

Os anexos abriam-se com um URL assinado de cinco minutos, pedido pelo browser
diretamente ao armazenamento. O problema não era a duração — **era que a
assinatura sobrevive à autorização que a produziu**. Terminar o acompanhamento
fecha o acesso a tudo, mas um URL assinado um segundo antes continuava a
funcionar durante os cinco minutos seguintes, porque o serviço de armazenamento
não sabe nada de vínculos: só verifica se a assinatura bate certo. O mesmo valia
para um contabilista entretanto suspenso.

E havia uma segunda metade, mais silenciosa: **a administração podia ler os
documentos de candidatura sem deixar rasto nenhum**. `admin_auditoria` existe
desde a migração 040 e registava aprovações e recusas; abrir a cédula
profissional de alguém não passava por lá.

### O que passou a ser verdade

| Achado | Como fica fechado |
| --- | --- |
| A assinatura sobrevive ao acesso | `anexo_legivel(text)` pergunta no instante do pedido, com a identidade de quem pede, e usa a mesma `parte_do_vinculo` que governa a leitura das mensagens — um anexo não pode ser mais acessível do que a conversa a que pertence. |
| O ficheiro abria no separador | `Content-Disposition: attachment` e `X-Content-Type-Options: nosniff`. Um separador servido do nosso domínio partilha a origem com a sessão de quem o abriu. Junta-se `Cache-Control: private, no-store` e `Referrer-Policy: no-referrer`. |
| O tipo vinha do pedido | O `Content-Type` da resposta é o que ficou **guardado** depois de os bytes serem verificados na migração 048, e não o que o pedido diz. |
| «Não existe» distinguia-se de «não é teu» | As duas respondem 404. A diferença dizia a quem tentava se o ficheiro existe. |
| A administração lia sem rasto | `documento_legivel_por_admin(text)` escreve em `admin_auditoria` **antes** de entregar, na mesma transação da verificação: não há como ler sem ficar registado. Ler os próprios documentos não conta — não é um ato de administração. |
| O browser lia o balde por si | A política de leitura estreita-se de «qualquer parte do vínculo lê qualquer objeto dele» para «cada um vê o que enviou», que é o mínimo para poder apagar o que enviou. |

### Encontrado ao escrever os testes

Duas vezes o mesmo tipo de defeito, e vale a pena registá-lo: **o descobridor de
migrações do arreio era `04[2-9]_*.sql`**. A migração 050 nunca era aplicada, e a
suíte passava a verde sem a exercer — exatamente como o descobridor de testes
tinha deixado o ficheiro `10-` de fora na etapa anterior. Os dois passaram a ser
intervalos abertos.

E apagar a política de leitura do balde por inteiro parecia certo — o browser já
não precisa de ler — mas um `DELETE` precisa de ver a linha que apaga: quem tinha
enviado um anexo deixava de o poder remover. Estreitar não é o mesmo que fechar.

## Etapa 6 — O modelo de intermediação · **fechada**

Migrações `051_intermediacao_casos.sql` e `052_anexos_do_caso_e_expiracao.sql`,
domínio em `src/lib/contabilistas/casos.ts`, cinco ecrãs. 320 asserções de RLS
(eram 291) e 1528 testes.

### A fronteira, corrigida

A primeira versão pôs o nome e o NIF do lado protegido. Estava errado: um
contabilista precisa dos dois para trabalhar e para orçamentar com seriedade, e
escondê-los seria fingir que se pode trabalhar às cegas.

A fronteira é o **canal**, não a identidade:

- `casos` — referência, assunto, situação, **nome completo e NIF**. O que o
  contabilista vê.
- `caso_contactos` — **email, telefone e morada**. Não há política nenhuma em
  que ele caiba. A garantia não é um `USING` que o exclui: é a ausência de
  qualquer caminho, e há um teste que falha se alguma política desta tabela
  alguma vez mencionar encaminhamento.

A morada ficou do lado protegido porque também é um canal — sabe-se onde a
pessoa mora, aparece-se lá ou manda-se uma carta.

### As garantias que o schema impõe

| O que se garante | Como |
| --- | --- |
| Nada é dito sem revisão | Uma mensagem nasce `submetida` porque é o único estado que a política deixa entrar. Só `aprovada` é legível pelo outro lado. |
| A revisão não apaga a prova | `corpo` é imutável por gatilho. A redação vai para `corpo_encaminhado`, e quem escreveu é avisado de que houve um ajuste. |
| Devolver diz o que corrigir | `rever_mensagem` recusa devolver ou recusar sem razão escrita. |
| Só decide quem leu | `decidir_proposta` recusa enquanto `lida_ate_ao_fim_em` ou `confirmacao_em` forem nulos; as duas só se escrevem por RPC própria e nenhuma se desfaz. |
| Uma proposta não se reescreve | Gatilho de imutabilidade sobre corpo, valor, IVA e prazo. Quem quiser mudar envia outra, e as duas ficam. |
| Um caso vai a três, no máximo | Gatilho sobre `caso_encaminhamentos`, não um número na interface. |
| Um documento é lido antes de seguir | Nasce com `libertado_em` a nulo; o contabilista só alcança o que a administração libertou. |
| O ficheiro não escolhe onde fica | As mesmas vagas de uso único da etapa 2, generalizadas para os três sítios — uma função, e não três parecidas onde os limites divergiriam. |
| O que expirou di-lo | `expirar_propostas()` por cron. `decidir_proposta` já recusava; faltava a lista deixar de prometer o que o servidor recusa. |

### O vínculo passa a ser consequência

Nasce em `decidir_proposta`, ao aceitar. Antes disso não há relação — há um
pedido. A conversa livre, a agenda e o cartão de fidelidade só fazem sentido a
partir daí, e é a partir daí que existem.

### Encontrado ao construir

O teste de completude do catálogo (etapa 3) apanhou as **sete tabelas novas**
antes de elas chegarem a produção sem saírem no apagamento da conta.

E três testes meus estavam errados de uma maneira que os fazia passar por
razões erradas: liam um caminho de ficheiro através de uma subconsulta sujeita
a RLS, e para um terceiro isso devolvia `NULL` — o teste passava por «não
existe» quando devia passar por «não é teu», que é outra garantia. Os caminhos
passaram a ser lidos como `postgres`.

## Depois — o modelo de intermediação

`docs/ESTRATEGIA-INTERMEDIACAO.md`, fases A a F, e as três perguntas em aberto
da §8.
