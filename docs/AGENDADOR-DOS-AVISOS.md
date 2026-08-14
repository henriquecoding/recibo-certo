# O agendador dos avisos vive no Supabase

## Porquê

A fila de emails de aviso é esvaziada de quinze em quinze minutos. Quem a
acordava era um Cron Job do Vercel, e o Vercel no plano Hobby recusa qualquer
expressão que corra mais do que uma vez por dia:

```
Hobby accounts are limited to daily cron jobs.
This cron expression (*/15 * * * *) would run more than once per day.
```

A recusa é do **deployment**, não do build. Por isso não aparecia um deployment
falhado na lista — não chegava a existir deployment nenhum, e a produção ficou
parada no commit anterior sem sinal visível em lado nenhum.

## O que mudou, e o que não mudou

```
antes    Vercel Cron (*/15)  →  /api/cron/avisos-email  →  Resend
depois   pg_cron (*/15)  →  pg_net  →  /api/cron/avisos-email  →  Resend
```

**Só o agendador mudou de casa.** A rota é a mesma, com a mesma fila, a mesma
reclamação com `SKIP LOCKED`, as mesmas três tentativas, o mesmo `CRON_SECRET` e
os mesmos lotes de cinquenta. Não há uma segunda implementação da fila em
PL/pgSQL — se houvesse, um dia divergiam.

Os quatro trabalhos diários continuam no Vercel: `purgar-dados`,
`reconciliar-stripe`, `purgar-anexos` e `expirar-propostas`. Todos correm uma vez
por dia e são compatíveis com o plano Hobby.

## O passo manual que falta

O `CRON_SECRET` tem de estar no Vault do Supabase com o **mesmo valor** que está
nas variáveis de ambiente do Vercel. Não está no repositório e não pode estar.

No editor de SQL do Supabase:

```sql
select vault.create_secret(
  'AQUI-O-MESMO-VALOR-QUE-ESTA-NO-VERCEL',
  'recibo_certo_cron_secret',
  'Segredo partilhado com o CRON_SECRET do Vercel.'
);
```

Para o mudar mais tarde:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'recibo_certo_cron_secret'),
  'NOVO-VALOR'
);
```

O `recibo_certo_cron_url` já está criado e aponta para
`https://www.recibocerto.pt/api/cron/avisos-email`.

Enquanto o segredo faltar, `disparar_avisos_email()` devolve `NULL` e escreve um
aviso. **Não levanta exceção**: um agendador que rebenta de quinze em quinze
minutos enche o registo de erros e esconde os que interessam. A fila fica
intacta à espera da configuração — nenhum aviso se perde.

## Como ver se está a funcionar

Três perguntas diferentes, três sítios:

```sql
-- 1. O agendador correu?
--
-- `cron.job_run_details` não tem `jobname` — tem `jobid`. É preciso a
-- junção, e não é detalhe: sem ela a consulta falha com «column does not
-- exist» e parece que o agendamento não existe.
select j.jobname, d.status, d.start_time, d.return_message
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
 where j.jobname = 'recibo-certo-avisos-email'
 order by d.start_time desc limit 10;

-- 2. O pedido HTTP chegou ao Vercel, e com que resposta?
select id, status_code, error_msg, created
  from net._http_response order by created desc limit 10;

-- 3. A fila está a andar?
select email_estado, count(*) from public.notificacoes group by 1;
```

Um `status_code` 401 quer dizer que o segredo do Vault não corresponde ao do
Vercel. Um 404 quer dizer que a rota ainda não foi publicada — foi o que
aconteceu na primeira execução, às 16:15 de 14/08, um minuto antes de a
produção com a rota ficar pronta.

Uma resposta saudável é assim:

```json
{"ok":true,"enviados":0}
```

`enviados: 0` com a fila vazia é o estado normal, e não um erro.

Para forçar uma execução sem esperar pelos quinze minutos:

```sql
select public.disparar_avisos_email();
```

Devolve o id do pedido, que aparece a seguir em `net._http_response`. Cuidado:
isto esvazia a fila a sério — se houver avisos por enviar, os emails saem.

## O que nunca pode acontecer

- **O segredo no `git`.** Nem em migração, nem em teste, nem aqui. Há um teste
  que procura cadeias com cara de segredo nos ficheiros desta funcionalidade.
- **O segredo em `cron.job.command`.** Essa coluna fica em claro na base de
  dados. Por isso o comando agendado é `SELECT public.disparar_avisos_email();`
  e não o SQL que lê o Vault.
- **`vault.decrypted_secrets` acessível a `anon` ou `authenticated`.**
  Verificado: só `postgres` e `service_role` têm `SELECT`.
- **A chave de serviço no agendador.** O Supabase só conhece o URL e o
  `CRON_SECRET`. A `SUPABASE_SERVICE_ROLE_KEY` continua exclusivamente do lado
  do servidor da aplicação.
- **Um cron subdiário a voltar ao `vercel.json`.** Há um teste que conta quantas
  vezes por dia cada expressão corre, e falha acima de uma. Não procura `*/15`:
  apanha `0 * * * *`, `0 */2 * * *`, `0 9,17 * * *` e o que não souber ler.

## Risco por confirmar

O plano Hobby pode ter também um limite ao **número** de Cron Jobs. Ficaram
quatro, e antes desta série eram dois. Se o deployment voltar a ser recusado
depois desta correção, é o primeiro sítio a olhar — e a solução é a mesma:
mover mais um para o `pg_cron`, que é agora um caminho já aberto.
