- modal just-in-time com campos/categorias, destino, finalidade, fornecedor e retenção;
- opção de exportação totalmente local, se tecnicamente suportável, para os níveis Privado/Máximo;
- schema estrito e limite de corpo;
- nunca devolver detalhes internos do compositor ao cliente;
- proibir logs de corpo e instrumentação que capture payload;
- TTL e purga comprovada de `documentos_emitidos` ou justificação documentada;
- teste de rede que confirme zero egress durante **importação**, distinguindo-a de **exportação**.

### 5.5 Email de auditoria

`/api/email/auditoria` recebe informação salarial/familiar e cria uma mensagem via Resend. Mesmo que o Recibo Certo não guarde o corpo na base de dados, o fornecedor de email, o servidor de receção, o remetente/destinatário e os respetivos backups podem guardá-lo. O consentimento deve ser específico e a UI deve advertir que email não é um cofre privado.

Requisitos mínimos: autenticação ou antiabuso proporcional, rate limit distribuído, schema exato, tamanho máximo, destinatário confirmado, proteção contra header/template injection, idempotência, política de retenção do fornecedor, supressão de payload nos logs e reautenticação para relatórios sensíveis.

---

## 6. Persistência local e sincronização

### RC-01 — P0 Crítico: migração silenciosa e potencialmente cruzada de preferências fiscais

**Evidência:** [`preferencias-fiscais.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/store/preferencias-fiscais.ts) usa a chave global `recibocerto:preferencias-fiscais:v1`. Quando uma conta Plus carrega e a cloud está vazia, o store lê essa chave e tenta gravá-la em `profiles.preferencias_fiscais`, sem um passo explícito de importação e sem comprovar a pessoa que criou os dados locais.

**Impacto:** num browser partilhado, a pessoa A deixa preferências fiscais; a pessoa B entra numa conta Plus e pode importar silenciosamente os dados da pessoa A para a conta B. Os campos incluem rendimento, dependentes, despesas, incapacidade, atividade e IVA. Isto contradiz diretamente “só guardamos quando quiseres”.

**Correção obrigatória:**

- desativar já a migração automática;
- tornar todas as chaves sensíveis account/device-scoped: `rc:v2:{subjectId|anonymousVaultId}:{dataset}`;
- apresentar inventário e pré-visualização antes da importação, sem mostrar valores por defeito num ecrã partilhado;
- exigir confirmação do destino e não apagar a origem até a gravação cloud ser confirmada;
- registar apenas metadados da decisão, nunca os valores;
- testar troca A→logout→B, navegação anónima→B, falha de rede e dois separadores concorrentes.

### RC-02 — P0 Crítico: “apagar dados locais” não apaga os dados reais

**Evidência:** a Zona de Risco remove nomes legados como `recibocerto:recibos`, `recibocerto:vencimentos` e `recibocerto:preferencias-fiscais`; os stores ativos usam sufixo `:v1`. Cenários coincidem, mas recibos, vencimentos e preferências ficam. Também são omitidos cache calculado, filas offline por utilizador, draft IRS, prazos, flags de importação, histórico e outros dados auxiliares.

**Impacto:** a interface confirma uma eliminação que não ocorreu. Em computador partilhado ou vendido, os valores continuam acessíveis. É uma falha de produto e de transparência, não apenas limpeza técnica.

**Correção obrigatória:** um único **manifesto de dados** versionado deve alimentar storage, inventário, exportação e eliminação. Não manter listas duplicadas em componentes.

```ts
type Dataset = "receipts" | "payroll" | "scenarios" | "fiscalProfile" |
  "irsDraft" | "deadlines" | "offlineQueue" | "computedCache";

interface DatasetDescriptor {
  id: Dataset;
  sensitivity: "financial" | "identity" | "operational";
  localKeys: (subject: string) => string[];
  cloudTables: string[];
  storageBuckets: string[];
  defaultRetentionDays: number | null;
}
```

O teste de aceitação deve semear cada chave/IndexedDB/Cache Storage/cookie aplicável, executar a eliminação, recarregar e provar ausência. O manifesto deve reconhecer versões antigas durante a janela de migração.

### RC-03 — P1 Alto: destino decidido pelo plano, não pela vontade da pessoa

[`recibos.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/store/recibos.ts), cenários e prazos escolhem local/cloud a partir de sessão e subscrição. Uma vantagem comercial (Plus) não é consentimento para mudar o local de persistência. “Cloud disponível” e “cloud escolhida para este conjunto” têm de ser estados separados.

**Correção:** cada dataset tem `storageScope = memory | session | device | cloud`, com default visível; um botão de guardar mostra o destino; mudar plano nunca migra dados; importar/sincronizar exige ação separada. Configurações de segurança não podem ser manipuladas por paywall para reduzir privacidade.

### RC-04 — P1 Alto: fila offline invisível e resíduos cruzados

O store de recibos mantém o objeto completo numa chave de fila por `userId` e sincroniza posteriormente. É uma técnica resiliente, mas cria persistência local não óbvia e possibilidade de sincronização posterior já fora do contexto em que a pessoa tomou a decisão. O cache calculado é global e pode ficar após logout/eliminar.

**Correção:** fila visível na Central (“2 itens aguardam envio”), pausa/cancelamento, expiração curta, cifra local, namespace por conta, bloqueio de sync após logout/revogação, confirmação em rede medida e botão “eliminar pendentes”. A sincronização deve validar novamente a política vigente antes de cada envio.

### RC-05 — P1 Alto: autosave do simulador IRS sem controlo

[`SimuladorIRS.tsx`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/components/simulador/SimuladorIRS.tsx) persiste automaticamente um draft fiscal completo. Autosave pode ser útil, mas deve ser declarado junto ao primeiro campo, desligável, temporário e expirar. O nível Máximo deve oferecer modo “só memória”.

### RC-06 — P2 Médio: store legado inseguro

`src/lib/store/vencimentos.ts` contém lógica antiga, fire-and-forget e tratamento inconsistente de falhas. Mesmo sem call sites encontrados, é uma futura regressão à espera de acontecer. Remover ou bloquear via teste/import rule; um único repositório canónico por dataset.

### RC-07 — P1 Alto: sessão Supabase persiste no mesmo cofre vulnerável a XSS

[`client.ts`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/src/lib/supabase/client.ts) chama `createClient` sem opções de Auth; por defeito, `persistSession=true` e a sessão é guardada em local storage ([documentação Supabase](https://supabase.com/docs/reference/javascript/auth)). Isto junta dados financeiros e bearer/refresh tokens numa fronteira acessível a JavaScript da origem.

Não existe solução única: aplicações client-side precisam frequentemente de tokens no browser. O requisito é reduzir probabilidade e impacto:

- CSP estrita com nonce/hash e `strict-dynamic`, Trusted Types onde suportado;
- dependências e scripts remotos minimizados, SRI quando aplicável;
- sessões com lifetime/inatividade definidos, gestão de dispositivos e revogação;
- AAL2/MFA para partilha, exportação, alteração de email/password e eliminação;
- dados locais cifrados nos níveis altos, chave não persistida;
- evitar HTML arbitrário e sinks DOM; testes XSS; nunca colocar segredos de backend em `NEXT_PUBLIC_*`;
- avaliar arquitetura SSR/cookies e respetivos trade-offs, sem prometer que `HttpOnly` resolve todos os fluxos client-side.

---

## 7. Eliminação, retenção e portabilidade

### RC-08 — P0 Crítico: eliminação de conta incompleta e não atómica

A rota [`/api/conta/apagar`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/app/api/conta/apagar/route.ts) apaga tabelas conhecidas sequencialmente e por fim chama `auth.admin.deleteUser`. Problemas:

- falha a meio produz eliminação parcial; a mensagem “Nada foi perdido” pode ser falsa;
- não cobre prazos, analytics, documentos emitidos, auditoria aplicável, FIZ, avatars e outras famílias;
- não remove objetos físicos de Storage;
- não trata subscrição ativa de forma segura — é possível apagar a conta e manter cobrança;
- não cobre tabelas/objetos da PR #102;
- `agendamentos` da PR usa relações `ON DELETE RESTRICT`, podendo impedir a remoção do utilizador;
- autenticação apagada cedo demais pode deixar objetos sem sujeito e sem forma normal de gerir direitos.

**Desenho recomendado:** workflow idempotente e retomável, não uma sequência otimista dentro de um pedido HTTP.

```text
pedido verificado + step-up auth
  → congelar novas escritas/sync e cancelar/bloquear cobrança
  → criar deletion_job(id, user, manifest_version, estado)
  → export opcional
  → apagar/anonymizar por dataset conforme base legal
  → listar e apagar objetos via Storage API
  → verificar contagens/objetos = 0
  → apagar identidade Auth por último
  → emitir comprovativo sem conteúdo sensível
```

Cada passo deve ser idempotente, com retry, dead-letter/alerta e relatório de exceções legais. Para Supabase Storage, apagar apenas metadata via SQL deixa objetos órfãos; a orientação oficial é usar a API de Storage ([Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects)).

### RC-09 — P1 Alto: avatares públicos e órfãos

O bucket de avatars é público; quem conhece a URL consegue obter o objeto. Isso pode ser aceitável para uma foto deliberadamente pública, mas deve ser dito e não misturado com dados privados. A eliminação de conta deve apagar o objeto; uploads substituídos também. Oferecer avatar privado ou iniciais locais.

### RC-10 — P1 Alto: retenções declaradas sem executor comprovado

A migração de analytics define uma função de purga de 12 meses, e FIZ/partilhas possuem conceitos de expiração, mas não foi encontrado um agendamento/caller completo para todas. Uma função SQL sem job monitorizado não é uma política de retenção executada. A purga após cancelamento Plus cobre apenas parte das tabelas e não os novos datasets.

**Correção:** catálogo de retenção machine-readable; job diário com métricas (`eligible`, `deleted`, `failed`, `oldest_remaining`); alerta de atraso; teste em staging; evidência mensal; regra para backups e restauração. Qualquer restauro deve reaplicar tombstones para não ressuscitar dados apagados.

### RC-11 — P1 Alto: política contradiz a própria eliminação

A página pública fala em recuperação até 30 dias após eliminação de conta; a rota descreve eliminação imediata e irreversível. Os 30 dias parecem aplicar-se à purga após cancelamento/downgrade. Separar claramente:

- eliminar conta;
- cancelar subscrição;
- deixar de ser Plus;
- revogar uma partilha;
- terminar vínculo com contabilista;
- eliminar apenas dados locais.

### RC-12 — P1 Alto: portabilidade incompleta

O direito à portabilidade e a necessidade prática de confiança pedem exportação por dataset, origem, destino, timestamps, consentimentos, partilhas e anexos ([artigo 20.º do RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/art_20/oj)). O export deve incluir dados estruturados em JSON/CSV, não apenas PDFs, e ser protegido por reautenticação. Não incluir segredos de sessão, hashes internos ou dados de outras pessoas sem base.

---

## 8. Supabase, RLS, grants e papel administrativo

### RC-13 — P0 Crítico: admins conseguem ler preferências fiscais em `profiles`

A migração 038 removeu corretamente políticas administrativas de `recibos`, `recibos_vencimento` e `cenarios`. Contudo, `profiles` mantém uma política `SELECT` para admin sobre a linha completa, e a mesma linha contém `preferencias_fiscais` JSON. RLS decide **linhas**, não esconde colunas. O comentário de que o admin vê apenas email/role não corresponde à autorização real.

**Correção preferida:** separar dados.

```sql
create table public.fiscal_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.fiscal_preferences enable row level security;
create policy fiscal_owner_all on public.fiscal_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Admin opera numa view/tabela mínima sem payload fiscal.
```

Não resolver apenas escondendo o campo na UI admin. Rever também grants, views, funções `SECURITY DEFINER`, backups e service role. A documentação Supabase sublinha que service keys podem contornar RLS e nunca devem ser expostas ao cliente ([Securing your data](https://supabase.com/docs/guides/database/secure-data); [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)).

### RC-14 — P1 Alto: “nem administradores” confunde papéis distintos

É possível impedir o papel de produto `admin` de consultar dados fiscais nas APIs normais. Não é tecnicamente honesto dizer que “ninguém” consegue aceder quando service role, DBA, fornecedor de infraestrutura ou backup têm poder operacional. A promessa correta deve indicar controlos, finalidade, restrição humana, auditoria e processo de acesso de emergência. Se o objetivo comercial for acesso zero pelo operador, é necessária criptografia ponta-a-ponta/cliente com chaves que o servidor não possua, acompanhada de limites de recuperação e funcionalidades.

### RC-15 — P1 Alto: trilho administrativo não cobre service role e não tem retenção
