# Auditoria técnica de privacidade, segurança e controlo de persistência — Recibo Certo

**Data da auditoria:** 13 de agosto de 2026  
**Repositório:** `henriquecoding/recibo-certo` (privado)  
**Base auditada:** `main` no commit [`3579cff7e4b3a52feb52b0de272bf1b91a5c7b94`](https://github.com/henriquecoding/recibo-certo/commit/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94), versão 2.44.0  
**Branch em desenvolvimento auditada:** [`claude/continue-interrupted-pr-73s7hi`](https://github.com/henriquecoding/recibo-certo/tree/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8), commit `99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8`, versão 2.46.0  
**Pull request:** [#102 — Plataforma de contabilistas: agenda, clientes, partilhas e fidelidade](https://github.com/henriquecoding/recibo-certo/pull/102), 97 ficheiros alterados, +15 982/−53 à data da recolha  
**Natureza do trabalho:** revisão estática e arquitetural orientada por dados, controlo de acesso, persistência, eliminação, transferências, afirmações públicas e segurança por defeito.

> **Conclusão executiva:** no estado auditado, o Recibo Certo não deve fazer afirmações absolutas como “não lemos”, “nada sai deste dispositivo”, “só fica guardado quando quiser”, “ninguém mais tem acesso” ou “eliminamos todos os dados”. Há componentes genuinamente locais e bem desenhados — em particular, a leitura inicial do PDF de vencimento acontece no navegador —, mas existem fluxos de persistência implícita, dados derivados enviados ao servidor em ações posteriores, chaves locais que a função de eliminação não remove, terceiros não declarados, acesso administrativo excessivo a preferências fiscais e, na PR #102, vários controlos críticos que podem ser contornados pela API direta. A PR #102 **não deve ser integrada nem publicada sem resolver os bloqueadores P0/P1 identificados neste relatório**.

---

## 1. O que esta auditoria consegue — e não consegue — garantir

Esta análise fixa commits concretos, segue o código desde a interface até às APIs, base de dados, Storage, terceiros e rotinas de eliminação, e confronta o comportamento observável no repositório com as promessas da página de privacidade. Foram revistos os módulos de importação de PDF, stores locais e cloud, autenticação, analytics, documentos, email, pagamentos, mapas, integração FIZ, cabeçalhos HTTP, migrações SQL, RLS, Storage, exclusão de conta, purga e a plataforma de contabilistas da PR #102.

“Garantir” uma propriedade de segurança exige, porém, mais do que leitura de código. Esta auditoria não teve acesso comprovado a:

- configuração efetivamente aplicada no projeto Supabase de produção, incluindo grants, políticas, extensões, backups e PITR;
- variáveis de ambiente, destinos reais do compositor de documentos, chaves, webhooks e configuração dos fornecedores;
- logs da Vercel, Supabase, Resend, Stripe/LemonSqueezy, CARTO/OpenStreetMap, Google/LinkedIn ou respetivos prazos de retenção contratuais;
- aplicação efetiva das migrações em cada ambiente;
- testes dinâmicos contra produção, pentest autenticado, análise de dependências transitivas em runtime, scanner de malware ou exercício de restauro/eliminação de backups;
- processos internos, acessos humanos, contratos de subcontratantes e resposta a incidentes.

Assim, as conclusões são fortes sobre o código fixado e sobre propriedades que o código contradiz. As propriedades de produção só podem ser declaradas depois de uma verificação de deployment e de evidência operacional. O RGPD exige licitude, transparência, minimização, limitação de conservação, integridade/confidencialidade e responsabilização; proteção desde a conceção e por defeito; e medidas adequadas ao risco — não apenas texto de política ([artigo 5.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj), [artigo 25.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_25/oj), [artigo 32.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_32/oj)). Este relatório é técnico, não substitui parecer jurídico ou uma AIPD/DPIA formal.

### 1.1 Critério usado para uma promessa ser publicável

Uma frase pública só é considerada verdadeira quando se verificam simultaneamente:

1. **Escopo inequívoco:** distingue ficheiro original, texto extraído, campos derivados, resultado calculado, metadados, identificadores e logs.
2. **Ação inequívoca:** a pessoa sabe antes do clique se haverá armazenamento ou transmissão, para onde, com que finalidade e durante quanto tempo.
3. **Controlo técnico:** o backend, a base de dados e o Storage impõem a regra; não depende apenas da interface.
4. **Eliminação completa:** a mesma taxonomia usada para guardar é usada para inventariar, exportar, expirar e eliminar.
5. **Terceiros e operadores incluídos:** “ninguém” não pode ocultar service role, operadores de infraestrutura, backups, destinatários de email ou subprocessadores.
6. **Teste negativo automatizado:** existe prova de que chamadas diretas, estados suspensos, campos adulterados e ficheiros abusivos são recusados.
7. **Evidência operacional:** o controlo está aplicado em produção, é monitorizado e tem dono.

---

## 2. Veredito por domínio

| Domínio | Estado | Veredito resumido |
|---|---:|---|
| Leitura inicial do PDF de vencimento | **Parcialmente conforme** | Os bytes e a extração inicial ficam no navegador; o parser lê o conteúdo de todas as páginas e extrai dados laborais. Ações posteriores podem enviar os dados derivados ao servidor. |
| “Só guarda quando eu quiser” | **Não conforme** | Há autosave local, caches, fila offline e migração silenciosa de preferências fiscais para a cloud em contas Plus. |
| “Nada sai do dispositivo” no modo gratuito | **Não conforme** | Mapas/geocodificação, analytics consentido, autenticação, pagamentos, email/documentos e a PR #102 criam fluxos externos; a frase só poderia ser limitada a funcionalidades e ações específicas. |
| Isolamento por utilizador na cloud | **Parcialmente conforme** | RLS cobre várias tabelas e a migração 038 removeu acessos administrativos perigosos em recibos/cenários; `profiles` ainda permite ao papel administrativo ler a coluna JSON de preferências fiscais. |
| Eliminação local | **Não conforme, crítico** | A Zona de Risco usa chaves antigas e não elimina a maioria dos dados que diz eliminar; omite caches, filas, drafts e outras famílias. |
| Eliminação de conta/cloud | **Não conforme** | Processo sequencial, incompleto, não transacional, não remove objetos de Storage nem cobre a PR #102; novas FKs podem impedir a eliminação. |
| Analytics/cookies | **Não conforme na terminologia** | É consentido e first-party, mas os eventos são pseudónimos por identificador persistente, não “anónimos/agregados” na recolha; retenção declarada não tem execução demonstrada. |
| Segurança do navegador | **Insuficiente para o modelo local-first** | Bons cabeçalhos básicos, mas CSP sem diretivas de scripts/conexões e tokens/dados sensíveis em `localStorage` aumentam o impacto de XSS/supply chain. |
| Terceiros/transparência | **Não conforme** | A lista pública omite CARTO, OpenStreetMap/Nominatim, GitHub Raw e LemonSqueezy; fluxos OAuth devem ser descritos se ativados. |
| FIZ | **Arquitetura razoável, texto falso se ativado** | Consentimento granular e token temporário são pontos positivos; o código permite nome, NIF, email e telefone, contrariando a frase pública que diz que não são enviados. |
| PR #102: partilhas/contabilistas | **Não aprovar merge** | “Snapshot imutável”, suspensão, limites de ficheiros, eliminação e avisos podem ser contornados por chamadas diretas. Os testes atuais não cobrem estas fronteiras. |
| CI/governança | **Insuficiente** | Checks estão verdes, mas o teste RLS não é executado em CI e a `main` não está protegida; os checks não são barreira obrigatória. |

### 2.1 Decisão de release recomendada

- **`main` atual:** corrigir imediatamente persistência fiscal implícita, eliminação local, acesso admin às preferências fiscais e texto público. Até lá, remover afirmações absolutas.
- **PR #102:** **NO-GO**. Não integrar enquanto P0 e P1 específicos da plataforma de contabilistas não estiverem corrigidos e testados por API direta/SQL/Storage.
- **Novas promessas:** usar texto verificável por fluxo, por exemplo: “A seleção e leitura inicial deste PDF acontecem neste navegador. Só enviaremos os campos listados se escolheres uma ação que indique claramente o destino.”

---

## 3. Modelo de dados e de ameaça

### 3.1 Classes de dados relevantes

| Classe | Exemplos no produto | Sensibilidade/risco |
|---|---|---|
| Identidade | nome, email, telefone, NIF, NISS, identificador Supabase | fraude, correlação, contacto indevido |
| Laboral/remuneração | empregador, NIF do empregador, função, mês, salário base, rubricas, descontos | relação laboral e situação financeira |
| Fiscal/financeira | rendimentos, despesas, dependentes, incapacidade, IFICI, IVA, volume de negócios | perfil económico e familiar detalhado |
| Familiar | cônjuge, dependentes, rendimentos associados | dados de terceiros e menores |
| Documentos | PDF original, relatórios, anexos, candidatura de contabilista | conteúdo arbitrário, malware, credenciais profissionais |
| Comunicação profissional | mensagens, marcações, notas, tarefas, snapshots partilhados | segredo profissional, inferências fiscais |
| Segurança | access/refresh tokens, IDs de sessão, roles, auditoria, IP/UA | tomada de conta e rastreabilidade |
| Telemetria | ID persistente, eventos, URL/referrer, sessão, dispositivo | pseudonimização e perfil de utilização |
| Localização | pesquisa Nominatim, coordenadas, tiles consultados | residência/rotina aproximada |
| Pagamentos | email, UID, customer/subscription IDs | correlação com fornecedor de cobrança |

### 3.2 Adversários e falhas consideradas

1. outra pessoa no mesmo computador, perfil de browser ou conta do sistema operativo;
2. troca de contas Recibo Certo no mesmo browser;
3. script XSS, extensão, dependência ou recurso remoto comprometido na mesma origem;
4. cliente malicioso a chamar Supabase REST/Realtime/Storage diretamente, sem usar a UI;
5. contabilista ou cliente legítimo a adulterar colunas que a UI não expõe;
6. conta de contabilista suspensa que mantém sessão/tokens;
7. tomada de conta, reutilização de password, sessão esquecida ou dispositivo perdido;
8. papel `admin`, service role, operador de base de dados, suporte ou acesso a backups;
9. abuso de uploads, conteúdo ativo, malware, ficheiros gigantes e objetos órfãos;
10. terceiro que recebe pedidos de mapa, email, pagamento, autenticação ou composição de PDF;
11. eliminação parcial, falha a meio, retenção sem job, backup/restauro que reintroduz dados;
12. regressão por merge sem RLS testado ou por migração/grant divergente entre ambientes.

### 3.3 Fronteiras de confiança

```text
Pessoa
  └─ Navegador / origem Recibo Certo
      ├─ memória da página (PDF original durante leitura)
      ├─ localStorage / sessionStorage / Cache (dados + sessão Supabase)
      ├─ APIs Next.js/Vercel
      │   ├─ compositor de documentos
      │   ├─ Resend/email e destinatário
      │   ├─ Stripe / LemonSqueezy
      │   └─ service role Supabase
      ├─ Supabase Auth / Postgres / Realtime / Storage / backups
      └─ pedidos diretos do browser: CARTO, Nominatim/OSM, GitHub Raw, OAuth
```

“Local” só descreve uma fronteira técnica; não significa “inacessível”. O OWASP recomenda não assumir que `localStorage` é seguro para informação sensível e recorda que um único XSS pode ler tudo nessa origem ([HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)).

---

## 4. Inventário dos fluxos: quando, onde e porquê os dados persistem

| Funcionalidade | Entrada | Persistência/transmissão observada | Gatilho real | Problema de transparência |
|---|---|---|---|---|
| Importar recibo de vencimento PDF | bytes e texto de todas as páginas | bytes em memória; campos extraídos no estado React | selecionar ficheiro | O texto “não lemos” é enganador: o software lê; a organização não recebe o original neste passo. |
| Guardar recibo | campos derivados | anónimo/gratuito: `localStorage`; Plus autenticado: Supabase; cache local adicional | botão Guardar, destino inferido pelo plano | O plano escolhe o destino; a pessoa não escolhe dispositivo vs cloud. |
| Fila offline de recibos | recibo completo | `localStorage` por `userId`; sincroniza mais tarde | falha de rede após tentativa de save | Não há fila visível/cancelável; dados ficam no dispositivo mesmo quando o objetivo era cloud. |
| Cache calculado de recibos | totais/valores | chave local global | cálculos/save | Não é isolado por conta e pode sobreviver a eliminação/logout. |
| Cenários | snapshot JSON | local ou Supabase segundo plano/sessão | guardar/importar | Snapshot demasiado livre; destino não é escolha independente da subscrição. |
| Preferências fiscais | perfil fiscal/familiar | local e, em Plus, `profiles.preferencias_fiscais` | update; **primeiro load pode migrar chave local silenciosamente** | Crítico: uma conta pode receber dados deixados por outra no mesmo browser. |
| Simulador IRS | draft completo | autosave em `localStorage` | alterações no formulário | Guarda sem ato “Guardar” nem controlo de autosave/expiração. |
| Prazos cumpridos | estado de tarefa | local ou cloud por plano | marcar/desmarcar | Destino implícito. |
| Analytics | evento + ID persistente/sessão/props | API first-party → tabela Supabase | consentimento estatístico + evento | Recolha é pseudónima em bruto, não anónima/agregada. |
| Gerar PDF | dados fiscais/laborais derivados | API Next.js → compositor; metadados/digest em `documentos_emitidos` | botão de exportação | “Sem retenção” não é absoluto; há metadados e possível fornecedor externo. |
| Enviar auditoria por email | salário, descontos, dependentes e relatório | API → Resend → sistemas de email/remetente/destinatário | botão email | A entrega cria cópias fora do dispositivo e do controlo do Recibo Certo. |
| Mapas | área, pesquisa ou coordenadas | CARTO tiles; Nominatim; GitHub Raw | abrir/interagir/pesquisar | Fornecedores e dados não constam da política; uma pesquisa exata pode ser pessoal. |
| Checkout | email, UID, IDs de subscrição/cliente | Stripe ou LemonSqueezy | iniciar pagamento/webhook | LemonSqueezy está ativo no código e ausente da política. |
| OAuth | email/perfil/identificadores | Supabase + Google/LinkedIn, se configurado | escolher provedor | Deve existir divulgação just-in-time e inventário de subprocessadores. |
| FIZ | campos consentidos, inclusive potencial nome/NIF/email/telefone | servidor → FIZ via token temporário | consentimento e ação explícitos | Boa granularidade, mas o texto público nega campos que o código permite. |
| Candidatura de contabilista (PR #102) | identidade, dados profissionais, documentos | Postgres + bucket privado | submissão | Retenção, malware, aprovação/publicação e eliminação incompletos. |
| Relação/mensagens/anexos (PR #102) | contacto, conversas, ficheiros | Supabase/Realtime/Storage/Resend | ações de uma ou da outra parte | Também existe para utilizadores gratuitos; contradiz o cabeçalho “tudo local”. |
| Partilha ao contabilista (PR #102) | snapshot JSON + consentimento | tabela `partilhas` | ação de partilha | UI não mostra recursivamente tudo; DB permite adulteração posterior. |

---

## 5. Auditoria profunda do recibo de vencimento em PDF

### 5.1 O que o código realmente faz

O componente [`ImportarReciboPDF.tsx`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/components/dependente/ImportarReciboPDF.tsx) chama o parser de [`recibo-pdf.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/recibo-pdf.ts). O browser obtém `file.arrayBuffer()`, o `pdf.js` processa todas as páginas através do worker local `/pdf.worker.min.mjs`, extrai texto e procura campos. Não foi encontrado upload dos bytes do PDF, `fetch` do conteúdo ou gravação do ficheiro original durante esta operação.

Isto sustenta uma promessa estreita e verificável:

> “A seleção e a leitura inicial deste PDF acontecem no teu navegador. Nesta etapa, o ficheiro original não é enviado para os nossos servidores.”

Não sustenta:

- “não lemos o recibo” — o software lê o texto, ainda que localmente;
- “nada do recibo sai do dispositivo” — dados derivados podem sair em exportação/email/cloud;
- “não extraímos NIF” — o parser extrai `empresaNif`; a UI parece querer dizer que não extrai o NIF do trabalhador;
- “não fica nada guardado” — ao aplicar/guardar, campos entram nos stores e caches.

### 5.2 Dados extraídos

Foram identificados, entre outros: empregador, NIF do empregador, função, mês/ano, salário base, remunerações, retenção IRS, Segurança Social, subsídio de alimentação e prémios/abonos. NIF, NISS, IBAN e outros identificadores do trabalhador são deliberadamente ignorados quando reconhecidos, o que é positivo, mas a robustez depende de layouts e heurísticas; texto não reconhecido continua a ser lido em memória.

### 5.3 Separar quatro eventos que hoje são misturados na comunicação

1. **Ler:** parser no navegador; original em memória.
2. **Aplicar:** campos passam para o formulário/simulador; ainda sem persistência obrigatória.
3. **Guardar:** local ou cloud conforme a implementação atual, hoje inferida pelo plano.
4. **Exportar/partilhar/enviar:** dados podem ir a API, compositor, Resend, contabilista ou FIZ.

Cada evento deve ter um indicador de destino antes da ação. O botão deve dizer “Guardar neste dispositivo”, “Guardar na nuvem”, “Gerar PDF no servidor” ou “Enviar por email”; “Continuar”/“Guardar” sem destino não basta para dados financeiros.

### 5.4 Exportação PDF e registo de documento

A rota de vencimento recebe os dados derivados, chama a emissão/composição e pode registar `referencia`, digest SHA, tipo, utilizador, versão do motor e timestamp em `documentos_emitidos`. O digest não contém, por si, o texto original, mas é um dado persistente correlacionado com uma conta e documento. Logo, “sem retenção” deve ser substituído por uma descrição exata de conteúdo, finalidade e prazo. Se `DOCUMENT_COMPOSITOR_URL` apontar para outro serviço, esse serviço é subcontratante/destinatário e necessita contrato, política de logs, região e prazo verificados.

Requisitos:

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
auth.uid() = contabilista.user_id
AND contabilista.estado = 'aprovado'
AND vinculo.estado = 'ativo'
AND recurso pertence ao mesmo vínculo
```

Suspender deve ser transacional: mudar estado, bloquear novas sessões/ações, revogar URLs/capacidades possíveis, terminar ou congelar relações segundo regra, emitir outbox/auditoria e notificar partes. Access tokens já emitidos só deixam de ser suficientes porque RLS relê o estado a cada pedido. Testar com token obtido **antes** da suspensão.

### PR-03 — P0 Crítico: limites de anexos existem na UI/metadata, não no Storage

Os buckets são criados sem `file_size_limit` e `allowed_mime_types`. As políticas de `storage.objects` permitem upload direto por parte ativa para o prefixo do vínculo. O limite de 10 MB, o máximo de cinco e o CHECK na tabela de metadata não impedem enviar objetos gigantes, tipos diferentes ou milhares de objetos sem criar a linha de metadata.

O mesmo se aplica, com variantes, aos documentos de candidatura: validação de 5 MB/MIME no cliente é contornável. `Content-Type` fornecido pelo cliente não prova o formato. O limite “5 anexos por mensagem” baseado em `count(*)` pode sofrer corrida.

**Correção obrigatória:**

- `file_size_limit` e `allowed_mime_types` no bucket como defesa base ([limites de buckets](https://supabase.com/docs/guides/storage/uploads/file-limits));
- retirar upload aberto por prefixo; emitir upload slot server-side, curto, single-use e ligado a vínculo/mensagem;
- filename gerado, extensão allowlisted, nome original apenas metadata sanitizada;
- validar magic bytes e estrutura, não só MIME/extensão;
- quarentena, antivírus e CDR quando aplicável; nunca servir conteúdo ativo inline;
- `Content-Disposition: attachment`, `nosniff`, domínio de downloads isolado;
- quota por utilizador/vínculo/dia e rate limit distribuído;
- slot ordinal único 1..5 ou RPC serializada, não `count` sem lock;
- job que compara `storage.objects` e metadata, eliminando órfãos após grace period.

O OWASP recomenda allowlist de extensões/tipos, validação de assinatura, nome gerado, limites, autorização, armazenamento separado e análise de conteúdo ([File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)).

### PR-04 — P0 Crítico: relação/consulta podem ter identidade e conteúdo reescritos

As políticas de update permitem à parte que muda estado alterar também `cliente_id`, `contabilista_id`, origem, timestamps, nome/contacto e, em consultas, horas, assunto e ownership. O trigger de 043 permite ao contabilista passar por certos updates sem perguntas, mas não implementa uma máquina de estados/colunas segura.

**Correção:** retirar `UPDATE` genérico; RPCs por comando (`accept_link`, `reject_link`, `cancel_appointment`, `reschedule_appointment`) com precondição de estado e `UPDATE ... WHERE estado = expected RETURNING`; triggers congelam identidades e `created_at`; grants de update por coluna apenas quando inevitável. Testar TOCTOU e dois pedidos simultâneos.

### PR-05 — P1 Alto: sanitização da partilha é client-side, superficial e não mostra tudo

`sanitizarConteudoPartilha` aplica allowlist apenas no topo. Campos permitidos como `entradas`, `resultado`, `cenarios` e `notas` aceitam JSON aninhado arbitrário. A UI representa objetos como “—” e arrays por contagem, logo a pessoa não vê “campo a campo” o payload real. A DB exige apenas consentimento não vazio; não impõe schema, byte limit ou quota. A constante de 20 partilhas/dia não está aplicada server-side.

**Correção:** endpoint/RPC server-only, schemas estritos e recursivos por tipo/versão, `additionalProperties:false`, limite em bytes/profundidade/elementos, seleção recursiva e preview JSON/PDF exato. Consentimento guarda schema version, campos escolhidos, hash e finalidade. O botão confirma contabilista, prazo, download e revogação. Testar chamadas diretas com chaves invisíveis, Unicode, arrays profundos e payload gigante. O OWASP recomenda validação sintática e semântica com allowlists no servidor ([Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)).

### PR-06 — P1 Alto: suspensão/terminação não define retenção nem direitos

Terminar vínculo fecha acesso, mas mensagens e anexos permanecem sem prazo e as partes deixam de ter mecanismo claro de exportar/eliminar. Tarefas podem ficar com `vinculo_id = NULL`, conservando título/descrição potencialmente pessoal de forma indefinida. É necessário definir papéis de responsável/subcontratante, finalidade, prazo por recurso, direitos e obrigação do contabilista.

Default recomendado: snapshots expiram em 7/30 dias configuráveis; anexos de conversa em 30/90 dias após vínculo, salvo obrigação indicada; mensagens com prazo definido; documentos de candidatura apagados após decisão + janela de recurso; metadados mínimos de auditoria separados e mais longos apenas com fundamento.

### PR-07 — P1 Alto: eliminação de conta pode falhar e objetos ficam órfãos

O upload acontece antes do insert de metadata; se o insert falhar, fica objeto. Cascades no Postgres não eliminam bytes de Storage. A rota de eliminação existente desconhece as 19 novas tabelas/buckets, e FKs `RESTRICT` podem impedir `auth.users` delete.

**Correção:** manifesto e deletion workflow descritos no RC-08; upload transaction pattern (pending object → metadata → promote/activate); compensação imediata em erro; reconciliação periódica; testes de falha em cada ponto. Nunca apagar `storage.objects` diretamente via SQL.

### PR-08 — P1 Alto: motivo de exceção de agenda é público pela API

A policy permite `anon SELECT` da linha de exceção, que inclui `motivo`. Esconder no componente não é controlo. Criar view pública apenas com `contabilista_id`, intervalo e disponibilidade, usando `security_invoker`/grants adequados, ou separar o motivo numa tabela privada. Testar a chave anon diretamente.

### PR-09 — P1 Alto: endpoint genérico de avisos permite notificações enganadoras

`/api/contabilistas/avisar` aceita uma parte do vínculo e um tipo de evento escolhido pelo caller, depois usa service role para criar aviso/email, sem provar que a consulta/cupão/ação correspondente ocorreu. Uma parte pode enviar “cupão ganho” ou “consulta confirmada” falsos e causar spam/confusão.

**Correção:** eliminar endpoint genérico. Eventos nascem atomicamente da transação de domínio, através de outbox (`appointment_confirmed`, `coupon_earned`), com idempotency key, dedupe, destinatário derivado, URL role-safe e retry. Rate limit não corrige falta de causalidade.

### PR-10 — P1 Alto: conteúdo/timestamps de mensagens e notificações ainda são mutáveis

O trigger de mensagens protege autor/corpo/vínculo, mas permite manipular `criado_em` e recibo de leitura não monotónico. A policy de notificações deixa o destinatário alterar tipo, título, corpo, URL e criação, além de `lida_em`.

**Correção:** conteúdo e criação append-only; leitura apenas `NULL → now()` por RPC/trigger; nunca voltar a NULL; servidor cria notificações; cliente tem apenas comando mark-read. Testes coluna a coluna.

### PR-11 — P1 Alto: aprovação/suspensão admin não é transacional e publicação é implícita

A rota admin faz múltiplas escritas e depois auditoria best-effort. Falha intermédia pode criar estados incoerentes ou ação sem trilho. Email da candidatura é copiado para perfil público na aprovação sem um preview/consentimento explícito de publicação claramente separado.

**Correção:** função transacional server-side; application privada separada de public profile; candidato escolhe e pré-visualiza campos públicos; verificação de credenciais e retenção de documentos; dual control para decisões de risco, se proporcional; auditoria atómica.

### PR-12 — P1 Alto: transições de consulta são vulneráveis a corrida/TOCTOU

A rota relê estado, decide e atualiza depois, sem condicionar o `UPDATE` ao estado anterior. Dois pedidos concorrentes podem sobrescrever cancelamento/confirmação. O cupão aceita `appointmentId` sem prova suficiente de que pertence à combinação cliente/contabilista/cupão.

**Correção:** máquina de estados formal e update condicional em transação; constraints de pertença e idempotency; retorno 409 em conflito; testes concorrentes.

### PR-13 — P1 Alto: email assíncrono fire-and-forget não é confiável

Chamadas `void porEmail` podem ser terminadas pelo runtime serverless depois da resposta; falhas não ficam num workflow retentável. Migrar para outbox/queue com estado, retry exponencial, idempotência e opt-outs apropriados. Não colocar informação fiscal no assunto ou preview do email.

### PR-14 — P1 Alto: a política de privacidade alterada pela PR continua incorreta

Problemas específicos:

- diz que a plataforma não cria dados sem ação da pessoa, mas outra parte e o sistema criam mensagens/notificações;
- diz que administração não acede a ficheiros, ignorando service role/operação/backups;
- anuncia 10 MB/5 anexos, não imposto no Storage;
- diz que o contabilista não vê dados fiscais, embora snapshots, mensagens e anexos possam conter dados fiscais; a verdade é “sem acesso automático/live aos stores; apenas ao que for explicitamente partilhado”;
- o resumo “gratuito = local” deixa de ser verdadeiro, porque utilizadores gratuitos podem usar relações/mensagens/agenda cloud;
- tabela de retenção não inclui candidatura, documentos, mensagens, anexos, partilhas, consultas, tarefas, loyalty e notificações.

### PR-15 — P1 Alto: testes RLS existem, mas não são CI obrigatório nem cobrem os ataques críticos

O script [`scripts/testar-rls.sh`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/scripts/testar-rls.sh) e a suite SQL são úteis, mas os workflows verdes observados executam build/testes/npm audit/assets/changelog/guias — não `npm run rls:check`. A `main` não está protegida, logo checks não são barreira de merge.

Adicionar job obrigatório com Supabase/Postgres limpo e migrations completas, incluindo:

- token de contabilista obtido antes de suspensão;
- alteração de cada coluna em partilha/vínculo/consulta/notificação;
- anon a ler motivo privado;
- JSON aninhado/oversized pela API direta;
- upload direto sem metadata, MIME falso, tamanho/quantidade excessivos;
- duas operações concorrentes;
- eliminação de conta com relações/consultas/anexos;
- verificação de objetos órfãos;
- funções definer com IDs de terceiros;
- instalação limpa com grants explícitos.

Branch protection: review obrigatório por CODEOWNER para migrations/RLS/auth/Storage/política; status checks obrigatórios; dismiss stale approvals; bloquear force-push/delete; ambiente de produção com aprovação e migrations forward-only.

---

## 13. Registo priorizado de risco

| ID | Severidade | Título | Bloqueia merge/release? |
|---|---:|---|---:|
| RC-01 | P0 | Migração fiscal silenciosa e cruzada | Sim |
| RC-02 | P0 | Eliminação local falsa/incompleta | Sim |
| RC-08 | P0 | Eliminação de conta incompleta/não atómica | Sim para promessa; sim para PR #102 |
| RC-13 | P0 | Admin lê `preferencias_fiscais` em `profiles` | Sim |
| PR-01 | P0 | Partilhas “imutáveis” mutáveis | Sim |
| PR-02 | P0 | Contabilista suspenso mantém acesso | Sim |
| PR-03 | P0 | Upload direto contorna limites/metadata | Sim |
| PR-04 | P0 | Identidade/ownership reescrevíveis | Sim |
| RC-03/04/05/07 | P1 | Destino implícito, fila/draft/sessão local | Sim antes de reafirmar local-first |
| RC-10/11/12 | P1 | Retenção, contradição e portabilidade | Sim para política final |
| RC-14–17 | P1 | Operadores, auditoria, grants, definer | Sim para PR #102 |
| RC-18–21 | P1/P2 | CSP, geolocalização, mapas, sessão | CSP sim; restantes conforme feature |
| RC-22–26 | P1/P2 | Analytics pseudónimo, schema, retenção/logs | Sim para texto “anónimo” |
| RC-27–30 | P1 | Terceiros e afirmações incorretas | Sim para publicação da política |
| PR-05–15 | P1 | Partilha, retenção, avisos, integridade, CI | Sim para PR #102 |
| RC-06 | P2 | Store legado | Não isoladamente; corrigir em hardening |

**Definição:** P0 = exposição/violação direta e plausível de promessa ou fronteira de autorização; P1 = alto impacto ou controlo essencial ausente; P2 = hardening/redução de dívida que pode amplificar regressões.

---

## 14. Plano de correção executável

### Fase 0 — contenção imediata (0–72 horas)

1. Retirar/qualificar afirmações absolutas na página, importador e marketing.
2. Desativar migração automática de `preferencias_fiscais`; preservar dados locais sem os enviar.
3. Corrigir a Zona de Risco com manifesto central e cobrir todas as chaves atuais/legadas.
4. Separar `preferencias_fiscais` de `profiles` ou bloquear realmente acesso administrativo à coluna.
5. Marcar PR #102 como não pronta para merge até P0 resolvidos; não é necessário apagar trabalho.
6. Desativar uploads/partilhas da PR em produção por feature flag server-side caso já exista preview público.
7. Inventariar/configurar logs para não captar bodies/queries sensíveis.

### Fase 1 — bloqueadores da PR e verdade operacional (primeira semana)

1. Refatorar partilha para snapshot imutável + estado; schema server-side recursivo.
2. Aplicar estado aprovado em todas as policies e testar token pré-suspensão.
3. Implementar RPCs/máquinas de estado para vínculo, consulta, leitura e notificações.
4. Fechar Storage direto; limits, upload slots, magic-byte, quarentena e reconciliação.
5. Workflow de eliminação abrangendo DB, Storage, Auth e pagamentos; tratar FKs.
6. Outbox transacional para emails/avisos/auditoria.
7. Grants explícitos e funções definer privadas.
8. Executar RLS/Storage tests em CI obrigatório e proteger `main`.

### Fase 2 — segurança do browser e minimização (2–4 semanas)

1. CSP Report-Only → nonce/strict-dynamic → enforcement; Trusted Types faseado.
2. Central de Privacidade e Segurança; destino por dataset e presets.
3. Namespacing/cifra/TTL local; fila de sync visível.
4. MFA/AAL2 e gestão de sessões/dispositivos.
5. Analytics com schemas fechados, retenção executada e terminologia correta.
6. Mapas privacy-first e vendor registry automatizado.
7. Exportação local de documentos quando viável; egress guard central.

### Fase 3 — assurance contínua (30–90 dias)

1. AIPD/DPIA para dados fiscais, partilhas profissionais, perfis e monitorização; rever com DPO/jurista.
2. Pentest independente focado em Supabase RLS/Storage, XSS, IDOR e account deletion.
3. Threat model versionado e revisão em cada feature de egress/dataset.
4. Runbooks de incidente, rotação de chaves, backup restore + tombstones, pedidos de titular.
5. SBOM, Dependabot/Renovate, secret scanning, CodeQL/SAST, DAST e revisão de dependências.
6. Métricas sem conteúdo: falhas RLS, orphan objects, purge lag, audit gaps, sessões AAL1 em ações AAL2.

---

## 15. Critérios objetivos de aceitação

### 15.1 Modo local e importação PDF

- Com browser limpo e nível Máximo, importar/aplicar/simular não produz pedidos de rede além dos assets pré-carregados indispensáveis; teste Playwright interceta e falha qualquer egress não allowlisted.
- O PDF original nunca aparece em request body, logs, IndexedDB, Cache Storage, localStorage ou Supabase.
- Guardar apresenta destino explícito; cancelar deixa zero persistência.
- O teste inclui PDF multipágina, erro, cancelamento e navegação para trás.

### 15.2 Isolamento e troca de conta

- Semear dados A; logout; login B; B não lê, migra, sincroniza nem elimina A sem fluxo explícito autenticado.
- As chaves locais são account/vault-scoped; caches/filas também.
- Conta suspensa perde acesso no pedido seguinte, mesmo com token anterior.
- Admin de produto recebe zero colunas fiscais em SQL/API; teste com role real.

### 15.3 Eliminação e retenção

- Manifesto lista 100% das tabelas, buckets, chaves, caches, filas, vendors e backups aplicáveis.
- Job de eliminação é reiniciado após falha em cada passo e converge para zero objetos/linhas não excetuados.
- Não existe cobrança ativa órfã.
- `oldest_remaining` fica abaixo do SLA; alerta testado.
- Restauro de backup reaplica tombstones.

### 15.4 Partilhas e anexos

- Todas as colunas imutáveis recusam UPDATE por cliente, contabilista e API normal.
- Preview recursivo é byte-equivalent/canonicamente equivalente ao payload guardado.
- Partilha expirada/revogada ou vínculo suspenso não pode ser lido/downloaded.
- Upload sem slot, grande, MIME falso, assinatura inválida, sexto ficheiro ou objeto fora do prefixo é recusado.
- Orphan scanner encontra e remove o objeto artificial de teste.

### 15.5 Browser/analytics/terceiros

- CSP sem `unsafe-eval`, com nonce/hash e relatório de violações sem PII; scanner confirma headers em todas as rotas.
- XSS regression suite não consegue alcançar sinks conhecidos.
- Cada evento analytics rejeita propriedade não declarada, JSON aninhado, montante, NIF e URL livre.
- Vendor registry e egress inventory correspondem a todos os hostnames do bundle/código/config.
- Política gerada/revista a partir do mesmo inventário.

---

## 16. Proposta de arquitetura: política como código

O problema recorrente é haver regras em copy, stores, componentes, migrations e rotas sem uma fonte comum. Criar quatro artefactos versionados:

1. **Data Catalog:** dataset, campos, sensibilidade, sujeito, finalidade, destinos permitidos.
2. **Egress Registry:** ação, categorias, destinatário, endpoint, retenção, consentimento/necessidade.
3. **Retention Manifest:** TTL por destino, job, exceção, dono e métrica.
4. **Access Matrix:** papel × recurso × estado × comando, compilada em testes RLS/API.

Exemplo conceptual:

```ts
const DATASETS = {
  payrollReceipt: {
    sensitivity: "financial",
    defaultScope: "device",
    allowedScopes: ["memory", "session", "device", "cloud"],
    egress: ["serverPdf", "emailReport", "accountantShare"],
    localRetentionDays: 30,
    cloudRetentionDays: null,
  },
  fiscalProfile: {
    sensitivity: "financial+family",
    defaultScope: "memory",
    allowedScopes: ["memory", "device", "cloud"],
    egress: ["accountantShare", "fiz"],
  },
} as const;
```

Um `DataEgressGuard` deve ser a única porta para dados sensíveis saírem do browser/servidor:

```ts
await egress.request({
  action: "serverPdf",
  dataset: "payrollReceipt",
  fields: selectedFields,
  destination: "documentCompositor",
  policyVersion: settings.version,
  interactionId,
});
```

O guard valida preset, consentimento/necessidade, schema, destino, sessão/AAL, retenção e mostra confirmação quando exigida. Uma regra ESLint/dependency-cruiser impede importadores/simuladores de chamarem `fetch`, Supabase, email ou vendors diretamente. No servidor, a rota repete a decisão; nunca confiar no flag do cliente.

---

## 17. Funções adicionais para navegação e utilização mais seguras — configuráveis pela pessoa

Esta secção responde ao requisito de permitir que cada pessoa escolha “o quanto quer que seja seguro”, sem transformar segurança essencial numa opção perigosa. A forma correta não é um slider abstrato de 0 a 100: são presets explicáveis que configuram controlos reais. **TLS, RLS, validação server-side, CSP, isolamento, logs sem conteúdo, updates e proteção antiabuso são obrigatórios em todos os níveis e nunca podem ser desligados.**

### 17.1 Central de Privacidade e Segurança

Um ecrã único deve responder, para cada categoria:

| Pergunta | Informação/controlo |
|---|---|
| O que existe? | datasets, número de registos, tamanho aproximado e última alteração |
| Onde está? | memória, sessão, este dispositivo, cloud, contabilista/terceiro |
| Porque existe? | ação/finalidade e policy version |
| O que aguarda envio? | fila offline, destino, tentativa, expiração, cancelar |
| O que saiu recentemente? | recibo de egress sem payload: quando, categoria, destino, ação |
| Quando desaparece? | prazo e próxima purga; opção de reduzir |
| Quem tem acesso normal? | pessoa, contabilista específico, destinatário; estado/expiração |
| O que posso fazer? | exportar, mover, cifrar, revogar, eliminar por dataset ou tudo |

O inventário deve ser calculado das fontes reais e não de uma lista escrita à mão.

### 17.2 Presets propostos

| Controlo | Equilibrado — recomendado | Privado | Máximo | Personalizado |
|---|---|---|---|---|
| Receitas/cenários | dispositivo; cloud só se escolhida | dispositivo cifrado | só memória por defeito | por dataset |
| Perfil fiscal/draft IRS | memória + autosave local visível | dispositivo cifrado, TTL 7 dias | memória; perder ao fechar | âmbito + TTL |
| Sincronização | manual/visível | desligada por defeito | bloqueada até ação única | on/off por dataset/rede |
| Analytics | pedido opt-in | desligado | desligado e sem ID | opt-in |
| Exportação PDF | servidor com aviso | local quando possível; servidor one-shot | local apenas, salvo override com step-up | por ação |
| Email/FIZ/mapa externo | confirmação just-in-time | bloqueado por defeito | bloqueado; desbloqueio one-shot | allowlist |
| Partilha contabilista | campos escolhidos, 30 dias | 7 dias, download off | uso único/curto, AAL2 | prazo/permissões |
| Bloqueio de ecrã | 15 min | 5 min | 1 min/ao perder foco | 1–60 min |
| MFA/step-up | ações críticas | login novo + ações críticas | sempre para cloud/partilha/export/delete | matriz |
| Ocultar montantes | ao pedir | ao perder foco | sempre até revelar | toggles |
| Retenção local | manual/90 dias sugeridos | 30 dias | ao fechar/24 h | dias por dataset |

O preset escolhido deve apresentar um resumo concreto (“PDF original: memória; perfil fiscal: cifra local, 7 dias; analytics: off; partilhas: 7 dias”), não uma medalha vaga “100% seguro”.

### 17.3 Modelo de configuração

```ts
type StorageScope = "memory" | "session" | "device" | "cloud";
type PrivacyPreset = "balanced" | "private" | "maximum" | "custom";

interface PrivacySettingsV2 {
  version: 2;
  preset: PrivacyPreset;
  storage: {
    receipts: StorageScope;
    scenarios: StorageScope;
    fiscalProfile: StorageScope;
    irsDraft: StorageScope;
    deadlines: StorageScope;
  };
  sync: {
    enabled: boolean;
    offlineQueue: "off" | "encrypted";
    allowMeteredNetwork: boolean;
  };
  egress: {
    serverPdf: "allow" | "confirm" | "deny";
    emailReports: "allow" | "confirm" | "deny";
    accountantShares: "allow" | "confirm" | "deny";
    fiz: "allow" | "confirm" | "deny";
    externalMaps: "allow" | "confirm" | "deny";
  };
  telemetry: { productAnalytics: boolean };
  retention: {
    deviceDays: number | null;
    cloudDays: number | null;
    conversationDays: number | null;
    downloadsDays: number | null;
  };
  session: {
    autoLockMinutes: number;
    reauthForExport: boolean;
    reauthForDelete: boolean;
    requireAal2ForSensitiveActions: boolean;
  };
  display: {
    hideValuesOnBlur: boolean;
    privacyScreenByDefault: boolean;
    keepRecentSearches: boolean;
  };
}
```

As próprias configurações ficam locais por defeito. Se a pessoa quiser sincronizá-las, mostrar que isso revela preferências de segurança à cloud. Nunca fazer downgrade silencioso quando um browser antigo não entende a versão; falhar fechado e pedir escolha.

### 17.4 Cofre local cifrado

Para níveis Privado/Máximo:

- WebCrypto AES-GCM por registo/envelope, nonce único e authenticated metadata;
- chave derivada de passphrase com Argon2id (WASM cuidadosamente auditado) ou PBKDF2 com parâmetros medidos e salt aleatório; idealmente chave protegida por credencial do dispositivo quando a plataforma permitir;
- chave apenas em memória; bloquear limpa a chave;
- separação de chaves por conta/vault e rotação;
- proteção contra rollback/tampering com versão/AEAD;
- export de recuperação cifrado e aviso de que a perda da chave pode tornar os dados irrecuperáveis.

Isto protege dados **em repouso** contra outra pessoa que abre o storage. Não protege dados depois de desbloqueados contra XSS na mesma origem; nunca prometer o contrário.

### 17.5 Controlos de partilha com contabilista

1. seleção recursiva de campos, tudo desmarcado por defeito para categorias sensíveis;
2. preview exato e resumo de risco (“inclui rendimento e 2 dependentes”);
3. validade 1 hora/1 dia/7 dias/30 dias/custom; default curto;
4. acesso único opcional;
5. download desligado por defeito; watermark com destinatário/data quando permitido;
6. revogação e expiração imediatas na RLS/Storage, não apenas UI;
7. recibos de acesso: visto/downloadado, sem tracking invasivo;
8. nova partilha para qualquer alteração; nunca mutar snapshot;
9. reautenticação/MFA e confirmação do contabilista por nome/ordem profissional;
10. botão “terminar vínculo e escolher exportação/eliminações”.

Não prometer impedir screenshots: navegadores e sistemas operativos não oferecem garantia geral. Dizer claramente que destinatários podem copiar informação que conseguem ver.

### 17.6 Sessões e proteção de uso quotidiano

- bloquear montantes e nomes ao perder foco/ficar em background;
- “modo ecrã partilhado” que mascara valores até click-and-hold;
- auto-lock configurável, com pausa acessível para necessidades de acessibilidade;
- lista de sessões/dispositivos, última atividade aproximada, revogar uma/todas;
- aviso de novo login e alteração de email/password/MFA;
- reautenticação para exportar, partilhar, revelar NIF, apagar ou alterar destino cloud;
- MFA TOTP com recovery codes; não prometer passkeys até implementação e suporte verificados;
- clipboard opcional com limpeza temporizada, explicando que o sistema operativo pode conservar histórico;
- botão de emergência “Bloquear agora” que limpa chave em memória, estado sensível e previews;
- downloads com nome neutro opcional e aviso de que passam a ser responsabilidade do armazenamento do dispositivo;
- prevenção de abertura em iframe já existe e deve manter-se.

### 17.7 Navegação externa e mapas

- pré-visualizar domínio e categorias enviadas antes de sair;
- ícone claro para link externo; `rel="noopener noreferrer"`;
- lista allowlisted de destinos de confiança, sem redirects abertos;
- mapas locais/self-host nos níveis altos; pesquisa externa opt-in por consulta;
- remover coordenadas/termos de URLs, analytics e logs;
- botão “usar localização uma vez”; não guardar histórico por defeito;
- modo sem imagens/recursos de terceiros.

### 17.8 Histórico de egress e “recibo de privacidade”

Guardar localmente, sem payload, eventos como:

```json
{
  "at": "2026-08-13T12:00:00Z",
  "action": "accountant_share",
  "categories": ["payroll_totals", "irs_result"],
  "destinationLabel": "Contabilista X",
  "expiresAt": "2026-08-20T12:00:00Z",
  "policyVersion": 2
}
```

A pessoa pode apagar este histórico local. O servidor conserva apenas o que for necessário para autorização/auditoria e pelo prazo declarado. O recibo nunca deve conter valores, NIF ou texto de mensagem.

### 17.9 Indicador explicável, não “pontuação mágica”

A Central pode mostrar “Proteção reforçada” com razões concretas:

- dados fiscais só em memória;
- analytics desligado;
- MFA ativo;
- 0 itens a aguardar sync;
- 1 partilha expira amanhã.

Evitar um score único que sugira garantia. Se existir, cada ponto liga ao controlo, não pode ser comprado e não reduz baseline.

### 17.10 Testes específicos das configurações

Construir uma matriz de presets × datasets × ações e testar:

- `maximum + import` → zero escrita e zero egress;
- `private + autosave` → ciphertext, TTL e nenhum plaintext em storage;
- `deny(serverPdf)` → rota não é chamada, inclusive via atalho;
- alteração de preset não migra dados sem preview;
- offline queue respeita política no momento de sincronizar, não só no enqueue;
- configuração corrompida/desconhecida falha para a opção mais restritiva;
- UI acessível por teclado/leitor de ecrã e linguagem compreensível;
- nenhum preset desliga RLS/CSP/validação/rate limits/auditoria mínima.

---

## 18. Texto-base de comunicação após implementação

Este texto só deve ser publicado quando os critérios correspondentes estiverem verdes:

> **Tu escolhes onde guardar.** A leitura inicial do PDF acontece no teu navegador e o ficheiro original não é enviado nessa etapa. Antes de guardar, exportar, enviar por email ou partilhar, mostramos os dados envolvidos e o destino. Podes usar apenas memória, guardar cifrado neste dispositivo ou, quando disponível, escolher a cloud por categoria. A Central de Privacidade mostra dados locais, cloud, filas e partilhas, e permite exportar, revogar e eliminar. Algumas operações usam fornecedores identificados no momento da ação. O acesso técnico à infraestrutura é restrito, auditado e sujeito às regras publicadas — não afirmamos que é matematicamente impossível.

Para a plataforma de contabilistas:

> O contabilista não recebe acesso automático aos teus recibos, cenários ou perfil fiscal. Só recebe um snapshot dos campos que selecionares, pelo prazo e permissões que escolheres. Uma nova alteração exige nova partilha. O destinatário pode copiar o que consegue ver; revogar impede novos acessos pelo serviço, mas não apaga cópias já legitimamente descarregadas.

---

## 19. Evidência e rastreabilidade da auditoria

### 19.1 Ficheiros-base de maior relevância

- Política: [`src/app/privacidade/page.tsx`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/app/privacidade/page.tsx) e [versão PR](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/src/app/privacidade/page.tsx)
- PDF: [`ImportarReciboPDF.tsx`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/components/dependente/ImportarReciboPDF.tsx), [`recibo-pdf.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/recibo-pdf.ts)
- Stores: [`recibos.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/store/recibos.ts), [`cenarios.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/store/cenarios.ts), [`preferencias-fiscais.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/store/preferencias-fiscais.ts)
- Auth: [`client.ts`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/src/lib/supabase/client.ts), [`auth.tsx`](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/src/lib/supabase/auth.tsx)
- Eliminação/purga: [`conta/apagar/route.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/app/api/conta/apagar/route.ts), [`cron/purgar-dados/route.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/app/api/cron/purgar-dados/route.ts)
- Analytics: [`api/analytics/route.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/app/api/analytics/route.ts), [`analytics/servidor.ts`](https://github.com/henriquecoding/recibo-certo/blob/3579cff7e4b3a52feb52b0de272bf1b91a5c7b94/src/lib/analytics/servidor.ts)
- PR #102: [documento funcional](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/docs/PLATAFORMA-CONTABILISTAS.md), [migração 042](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/supabase/migrations/042_plataforma_contabilistas.sql), [migração 044](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/supabase/migrations/044_conversa_e_avisos.sql), [script RLS](https://github.com/henriquecoding/recibo-certo/blob/99436c9d4566ff4b7b26e9d85fa6edd9496ec2b8/scripts/testar-rls.sh)

### 19.2 Referenciais técnicos e regulatórios

- [RGPD — texto oficial](https://eur-lex.europa.eu/eli/reg/2016/679/oj), especialmente artigos [5.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj), [17.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj), [20.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_20/oj), [25.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_25/oj), [32.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_32/oj) e [35.º](https://eur-lex.europa.eu/eli/reg/2016/679/art_35/oj)
- [EDPB Guidelines 4/2019 — data protection by design and by default](https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html), [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- Supabase: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [secure data/service role](https://supabase.com/docs/guides/database/secure-data), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [bucket/file limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [delete objects](https://supabase.com/docs/guides/storage/management/delete-objects), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Auth JS](https://supabase.com/docs/reference/javascript/auth)

---

## 20. Parecer final

O Recibo Certo tem uma base local-first real em partes importantes: o PDF original é analisado no navegador; várias funcionalidades gratuitas usam storage local; a migração 038 reduziu acesso administrativo; o consentimento FIZ é granular; a PR #102 evita conceder ao contabilista acesso live às tabelas fiscais e já contém testes RLS iniciais. Estes são bons alicerces.

Mas a promessa central ainda não é uma propriedade de sistema. Hoje, “guardar” pode significar cloud por causa do plano; preferências fiscais podem migrar sem decisão; “apagar” não remove as chaves reais; um admin pode ler o JSON fiscal; analytics é chamado anónimo quando é pseudónimo; mapas e LemonSqueezy estão fora do inventário; e a plataforma de contabilistas confia demasiado na UI para imutabilidade, limites, transições e causalidade.

A ordem correta é: **conter afirmações → corrigir P0 → transformar política em código → provar com testes negativos e deployment → só depois publicar promessas precisas**. A Central configurável proposta não é um ornamento: ela torna visível a distinção entre memória, dispositivo, cloud e terceiros, separa subscrição de consentimento e oferece níveis reais de proteção sem permitir desligar o baseline. Quando o manifesto de dados, o egress guard, a eliminação idempotente, RLS/Storage tests e a CSP estiverem operacionais, o produto poderá afirmar não apenas que respeita a escolha — poderá demonstrá-lo.

