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
