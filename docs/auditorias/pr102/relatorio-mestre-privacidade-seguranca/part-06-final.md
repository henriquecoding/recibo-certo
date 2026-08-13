
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
