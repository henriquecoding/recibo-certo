
`admin_auditoria` recolhe email/IP e não apresenta prazo. O trigger não consegue atribuir ações em que `auth.uid()` é nulo, comuns em service role. Na PR, algumas rotas registam auditoria **depois** da ação e em best-effort; uma falha deixa decisão sem prova.

**Correção:** outbox/auditoria atómica na mesma transação; identidade técnica do serviço; correlation ID; ação, recurso e campos alterados sem conteúdo sensível; armazenamento append-only/WORM quando proporcional; acesso separado; retenção definida; alerta para falhas. Não guardar IP indefinidamente por hábito.

### RC-16 — P1 Alto: grants das migrações 042–045 não são reprodutíveis para o modelo 2026

As novas migrações definem tabelas, RLS e políticas, mas não têm uma matriz explícita de `GRANT` positiva. A Supabase anunciou que tabelas novas deixam de ser automaticamente expostas às Data/GraphQL APIs, exigindo grants explícitos no novo comportamento; para projetos existentes, a transição afeta novas tabelas a partir de 30 de outubro de 2026 ([changelog oficial](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)).

Isto pode criar dois ambientes com RLS igual mas privilégios-base diferentes. Cada migração deve declarar `REVOKE ALL` e os `GRANT SELECT/INSERT/UPDATE(colunas)/DELETE` mínimos por role. Testar instalação limpa e upgrade.

### RC-17 — P1 Alto: funções `SECURITY DEFINER` expostas aceitam IDs arbitrários

Na PR #102, helpers como `vinculo_ativo`, `vinculo_nao_terminado` e `parte_do_vinculo` usam `SECURITY DEFINER` e recebem utilizador/vínculo. Se executáveis por `authenticated`, podem funcionar como oráculos de enumeração. Devem validar que `auth.uid()` é a parte consultada, usar `search_path` fixo, não aceitar identidade fornecida quando ela pode ser derivada e, idealmente, ficar num schema privado não exposto. A própria Supabase recomenda não expor funções definer usadas só dentro de políticas ([orientação](https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw)).

---

## 9. Navegador, CSP, sessão e superfície de scripts

### RC-18 — P1 Alto: CSP atual não contém scripts nem exfiltração

`next.config.mjs` aplica HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `object-src 'none'`, CORP e Permissions Policy restritiva — bons fundamentos. Mas a CSP não define `default-src`, `script-src`, `connect-src`, `img-src`, `style-src`, `font-src`, `form-action` ou Trusted Types. Para um produto que guarda dados e sessão no browser, CSP é controlo de contenção prioritário.

**Plano de adoção:**

1. inventário de scripts, workers, ligações, imagens, fontes e frames em todas as rotas;
2. `Content-Security-Policy-Report-Only` com endpoint que elimina query strings/payloads e tem retenção curta;
3. nonce por resposta ou hashes, sem `unsafe-eval`; `script-src 'nonce-…' 'strict-dynamic'`; `object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
4. `connect-src` mínimo para Supabase/API e fornecedores realmente necessários por rota;
5. `worker-src 'self' blob:` apenas se o PDF worker exigir; confirmar empiricamente;
6. `require-trusted-types-for 'script'` após inventariar sinks;
7. enforcement e teste automático de headers.

O OWASP recomenda CSP estrita baseada em nonce/hash como objetivo ([CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)). CSP é defesa em profundidade, não substitui encoding, sanitização e revisão de dependências.

### RC-19 — P1 Alto: política de geolocalização contradiz a funcionalidade

O header `Permissions-Policy: geolocation=()` desliga geolocalização para o próprio site, enquanto o mapa chama `navigator.geolocation`. Ou a funcionalidade está quebrada, ou a política de deployment difere. Decidir: manter localização desativada e retirar o botão; ou permitir apenas `self`, pedir permissão no gesto, usar localmente e explicar os pedidos de tiles.

### RC-20 — P1 Alto: mapa transmite informação a terceiros não declarados

Ao abrir/interagir, o browser pede tiles CARTO e GeoJSON via GitHub Raw; a pesquisa envia o texto a Nominatim/OpenStreetMap. IP, user-agent, área do mapa e consulta ficam observáveis por terceiros. Uma morada/local exato pode identificar a pessoa. Isto invalida “fora de analytics/formulários, nada sai”.

**Correção:** versão de mapa sem rede por defeito nos níveis altos; self-host/proxy com logs minimizados; geocoder privacy-preserving; aviso antes da primeira consulta externa; remover query depois de usar; rate limit e cumprimento da política Nominatim; atualizar subprocessadores/destinatários.

### RC-21 — P2 Médio: duração e dispositivos de sessão sem controlo visível

O AuthProvider permite entrar/sair, mas não foi encontrada Central de sessões, timeout de inatividade, AAL2 ou revogação seletiva de dispositivos. A Supabase suporta MFA e assurance levels; ações sensíveis devem exigir AAL2 ([MFA](https://supabase.com/docs/guides/auth/auth-mfa)). “Sair” atual usa o scope default global; a UI deve dizer se termina este ou todos os dispositivos e oferecer ambas as opções.

---

## 10. Analytics, cookies e logs

### RC-22 — P1 Alto: “anónimo e agregado” não descreve a recolha

O cliente só envia analytics após `estatistica === true`, o que é positivo, e revogar limpa identificador/fila. Porém, os eventos brutos têm um identificador persistente de dispositivo/sessão e propriedades. Isto é **pseudónimo**; a agregação pode ocorrer depois, mas a recolha não é apenas agregada.

Texto seguro:

> “Se aceitares estatísticas, enviamos eventos de utilização pseudónimos para medir funcionalidades. Não enviamos os valores dos teus recibos ou simulações. Conservamos eventos brutos por X dias e agregados por Y, conforme o esquema publicado.”

Só publicar a última frase depois de enforcement e testes.

### RC-23 — P1 Alto: validação de eventos pode ser contornada

A heurística server-side bloqueia algumas chaves/formatos, mas não aplica schema exato por evento. Números fiscais sob chaves inocentes, nomes ingleses como `salary`/`income`/`amount`, ou scalars em chaves privilegiadas podem atravessar. Um cliente pode chamar `/api/analytics` diretamente com props arbitrárias que passem a heurística.

**Correção:** catálogo discriminado e allowlist fechado no servidor:

```ts
const schemas = {
  page_view: z.object({ route_id: z.enum(PUBLIC_ROUTE_IDS) }).strict(),
  feature_used: z.object({ feature: z.enum(FEATURE_IDS) }).strict(),
  privacy_changed: z.object({ setting: z.enum(SAFE_SETTING_IDS) }).strict(),
} as const;
```

Não aceitar URL livre, texto livre, IDs de objetos, montantes ou snapshots. Cobrir português/inglês, Unicode e JSON aninhado. Limitar lote/corpo, rate limit distribuído e orçamento por device/IP com IP truncado/hasheado apenas se necessário.

### RC-24 — P1 Alto: retenção de analytics não está demonstrada

A função de purga existe; não foi encontrado cron/caller correspondente. Incluir no job central, testar relógio, medir oldest row e alertar. Agregados devem remover device/session IDs e ter limiar contra grupos muito pequenos.

### RC-25 — P2 Médio: opção de marketing sem fornecedor ativo

Existe toggle de marketing embora não tenham sido encontrados GA/Meta/heatmaps. Um consentimento sem processamento real confunde. Ocultar/desativar até existir inventário, finalidade e vendor list; nunca carregar tags antes da escolha.

### RC-26 — P1 Alto: logs técnicos precisam de contrato e redaction

A política admite IP, user-agent, URL/referrer/status. Garantir que URLs não contêm email, NIF, tokens, termos de mapa, IDs de partilha ou códigos OAuth; desativar body capture e session replay; documentar retenção por camada (edge, function, Supabase, fornecedor). Errors enviados ao cliente não devem conter respostas internas de terceiros.

---

## 11. Terceiros, transferências e promessas públicas

### RC-27 — P1 Alto: inventário público incompleto

A política lista Supabase, Vercel, Stripe, Resend e FIZ. O código também usa ou prevê:

- **LemonSqueezy:** checkout/webhook, email e UID Supabase em `custom_data`, IDs de cliente/subscrição;
- **CARTO:** tiles de mapa;
- **OpenStreetMap/Nominatim:** geocodificação/pesquisa;
- **GitHub Raw:** GeoJSON remoto;
- **Google e LinkedIn:** OAuth, se provedores estiverem ativos;
- **compositor de documentos:** possivelmente serviço separado configurado por ambiente;
- **Twilio:** módulo SMS encontrado, sem uso ativo; remover ou manter impossível de ativar sem revisão.

Criar registry de vendors em código/configuração com proprietário, finalidade, campos, base, região, retenção, DPA, data de revisão e feature flag. A CI deve falhar quando aparece novo hostname/SDK sem entrada.

### RC-28 — P1 Alto: LemonSqueezy ativo mas não declarado e com UID bruto

O checkout envia email e o UUID Supabase como `custom_data`. Preferir um identificador de correlação opaco e rotativo/mapeado no servidor; não devolver `userId` no webhook response. Atualizar política, direitos e retenção. Não dizer “pagamentos são tratados pela Stripe” se existem dois processadores possíveis.

### RC-29 — P1 Alto: integração FIZ contradiz a política

A arquitetura FIZ tem qualidades: nenhum campo pré-selecionado, consentimento campo a campo, identidade relida no servidor, token opaco temporário, AES-GCM e bloqueio de dados sensíveis na query string. Contudo, o contrato de campos permite `fullName`, `taxpayerNumber`, `email` e `phone`, enquanto a política afirma que nome/NIF/email/IBAN/dados de cliente nunca são enviados.

Antes de ativar: ou remover tecnicamente esses campos, ou corrigir a política e o modal para dizer exatamente quais são selecionados; expiração automática deve estar agendada e testada; definir retenção de hashes/consentimentos; confirmar URL e operador; criar kill switch.

### RC-30 — P1 Alto: linguagem absoluta deve ser substituída por linguagem comprovável

| Formulação problemática | Formulação tecnicamente sustentável após correções |
|---|---|
| “Não lemos os teus recibos.” | “O PDF é lido automaticamente no teu navegador. O original não é enviado nesta etapa.” |
| “Nada sai deste dispositivo.” | “No modo local, estes datasets não são enviados. Funcionalidades externas mostram o destino antes do envio.” |
| “Só fica guardado quando quiseres.” | “Por defeito, este formulário fica apenas em memória. O destino aparece em cada ação de guardar; autosave está desligado/visível.” |
| “Inacessível por outros sites.” | “Outras origens não têm acesso normal ao armazenamento desta origem; pessoas no mesmo perfil e código executado nesta origem podem ter acesso.” |
| “Nem administradores conseguem ver.” | “O papel de suporte/admin não tem permissão de consulta. Acesso técnico excecional é restrito, auditado e sujeito a processo.” |
| “Só tu tens acesso.” | “A RLS limita o acesso normal à tua conta. Service role e operadores autorizados são controlados separadamente.” |
| “Ficheiros só visíveis ao cliente e contabilista.” | “A aplicação limita o acesso normal às partes ativas; infraestrutura e processos de segurança/eliminações têm acesso técnico controlado.” |
| “Partilha imutável.” | Usar apenas depois de trigger/estrutura append-only que bloqueie todas as colunas de conteúdo. |
| “Dados anónimos/agregados.” | “Eventos pseudónimos; valores financeiros proibidos por schema; agregação posterior.” |

---

## 12. Auditoria dedicada da PR #102 — plataforma de contabilistas

### 12.1 Escopo acrescentado pela branch

A PR cria candidatura e diretório público de contabilistas, relações cliente–contabilista, agenda, consultas, partilhas, fidelidade, mensagens, anexos, notificações, tarefas e tipos de consulta. As migrações centrais são [`042_plataforma_contabilistas.sql`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/supabase/migrations/042_plataforma_contabilistas.sql), [`043_nome_e_lugar.sql`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/supabase/migrations/043_nome_e_lugar.sql), [`044_conversa_e_avisos.sql`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/supabase/migrations/044_conversa_e_avisos.sql) e [`045_trabalho_e_tipos.sql`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/supabase/migrations/045_trabalho_e_tipos.sql).

Pontos positivos que devem ser preservados:

- contabilista não recebe automaticamente role de admin nem RLS sobre recibos/cenários/vencimentos;
- buckets de candidatura/anexos são declarados privados;
- aprovação é feita por rota server-side;
- constraint de exclusão procura evitar marcações sobrepostas;
- loyalty é escrito por servidor;
- mensagens têm trigger de imutabilidade parcial;
- testes RLS já verificam alguns acessos owner/other-accountant/admin;
- URLs assinados de anexos têm duração curta.

Estes controlos não compensam os seguintes bloqueadores.

### PR-01 — P0 Crítico: “partilha imutável” é alterável por cliente e contabilista

As políticas `UPDATE` de `partilhas` permitem ao cliente revogar e ao contabilista marcar como vista. RLS decide **qual linha** pode ser atualizada, não **quais colunas**. Não há trigger que congele `conteudo`, identidades, título, versão/declaração de consentimento e timestamps. Um cliente Supabase direto pode, no mesmo `UPDATE`, mudar o snapshot ao revogar; o contabilista pode mudar conteúdo/identidade ao marcar visto.

**Impacto:** quebra prova de consentimento, integridade do documento, auditoria e confiança entre as partes.

**Correção:** separar dados imutáveis de estado mutável.

```text
share_snapshot(id, client_id, accountant_id, payload_canonical,
               payload_hash, consent_version, created_at)  -- INSERT only
share_access(snapshot_id, revoked_at, viewed_at, expires_at,
             download_allowed)                             -- transições controladas
```

Revogar `UPDATE` direto; usar RPCs `mark_share_viewed(id)` e `revoke_share(id)` que atualizam apenas uma coluna, validam transição e escrevem auditoria. Trigger adicional deve rejeitar qualquer alteração às colunas imutáveis, mesmo via service code acidental. Assinar/hash canónico server-side, não aceitar hash do cliente.

**Testes de bloqueio:** emular cliente e contabilista; tentar alterar cada coluna isolada e junto com estado; REST, SDK e SQL; concorrência; service route; confirmar hash antes/depois.

### PR-02 — P0 Crítico: suspensão do contabilista não revoga acesso aos dados

Helpers/policies verificam parte/vínculo, mas não exigem consistentemente `contabilistas.estado='aprovado'`. Uma conta suspensa com sessão válida pode continuar a consultar diretamente mensagens, ficheiros, partilhas, consultas e relações.

**Correção:** toda a matriz de acesso dependente de contabilista usa uma única função segura que exige:

```text
