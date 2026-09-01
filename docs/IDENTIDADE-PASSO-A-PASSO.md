# Identidade da marca — o que falta fazer à mão

**Data:** 31 de agosto de 2026 · **Companheiro de:** `docs/auditorias/MARCA-E-IDENTIDADE-2026-08.md`

Este documento é a metade que **exige as tuas credenciais**. Tudo o que podia ser feito
por API ou em código já está feito e está no §0 — não voltes a fazê-lo.

Os passos estão por **ordem de dependência**, não por importância. O passo 1 desbloqueia
metade dos outros; saltá-lo faz os seguintes falharem sem dizerem porquê.

> **Tempo total: cerca de 90 minutos**, dos quais 30 são de espera (propagação de DNS).
> **Custo: 0 €**, exceto se decidires o §7.

---

## 0. O que já está feito (não repetir)

### Na Stripe, ao vivo, pela API

| O quê | Antes | Agora |
|---|---|---|
| Cor da marca | `#525f7f` (cinzento Stripe) | **`#177e5e`** |
| Cor de acento | `#0074d4` (azul Stripe) | **`#edeae0`** (o papel do site) |
| Botão do checkout | `#0074d4` | **`#177e5e`** |
| Fundo do checkout | `#ffffff` | **`#edeae0`** |
| Benefícios no checkout | vazio | **6 linhas** em pt-PT |
| Preço antigo 5,99 €/mês | ativo | **arquivado** |
| Preço antigo 47,99 €/ano | ativo | **arquivado** |

### Na Resend, ao vivo

- **Receção ligada** no domínio `recibocerto.pt` (estava desligada).
- **Webhook criado** para `email.received` → `https://www.recibocerto.pt/api/email/receber`.
  O segredo de assinatura foi-te dado na conversa — a Resend não o volta a mostrar.

### Em código (neste ramo)

- Marca renomeada para **«Recibo Certo»** em 193 ficheiros, e a regra 8 do `CLAUDE.md`
  reescrita. O que **não** mudou: o domínio, o pacote, as `lookup_key`, os `User-Agent`
  e a pasta `ReciboCerto-Fiscal-Engine/`.
- **Ativos de marca em PNG** (`public/marca/`, 7 ficheiros, gerados por `npm run marca:gen`).
- **Cor da marca corrigida** nos emails, no logótipo, no cartão de partilha (OG) e no
  `theme-color` — todos ainda no verde antigo `#1D9E75`, que falhava AA.
- **30 acentos** corrigidos nos emails de alerta.
- Emails com **`Reply-To`, versão em texto, `List-Unsubscribe` e modo escuro**.
- **`apoio@recibocerto.pt`** substitui o Gmail nos 9 ficheiros, a partir de uma
  fonte única (`src/lib/contacto.ts`).
- **Recuperação de palavra-passe** — não existia: `/redefinir-password` + «Esqueceste-te
  da palavra-passe?» no modal de entrada.
- **Manifest e `apple-touch-icon`** em PNG (o iOS não lê SVG).
- **Reencaminhamento de correio** (`/api/email/receber`), à espera dos passos 1 e 2.
- **Seis moldes de autenticação em pt-PT** em `docs/moldes-auth-supabase/`.

---

## 1. DNS na Vercel — 10 minutos, e desbloqueia quase tudo

O DNS de `recibocerto.pt` é servido pela Vercel (`ns1/ns2.vercel-dns.com`), por isso é lá
que se mexe. **Sem este passo, os endereços `@recibocerto.pt` que o site agora mostra não
recebem nada — o que é pior do que o Gmail que substituíram.**

1. Abre **[vercel.com/henpassquesoris-projects](https://vercel.com)** → **Domains** →
   `recibocerto.pt` → separador **DNS**.

2. **Add Record** → tipo **MX**:

   | Campo | Valor |
   |---|---|
   | Name | *(deixar vazio — é o ápex)* |
   | Type | `MX` |
   | Value | `inbound-smtp.eu-west-1.amazonaws.com` |
   | Priority | `10` |
   | TTL | *(deixar o valor por omissão)* |

   > É este registo que faz `apoio@`, `ola@`, `investidores@` e `admin@recibocerto.pt`
   > passarem a existir. Todos caem na Resend e são reencaminhados para a tua caixa.

3. **Add Record** → tipo **TXT**:

   | Campo | Valor |
   |---|---|
   | Name | `_dmarc` |
   | Type | `TXT` |
   | Value | `v=DMARC1; p=none; rua=mailto:apoio@recibocerto.pt` |

   > `p=none` é modo de observação: não bloqueia nada, só faz os fornecedores enviarem
   > relatórios. Passa a `p=quarantine` daqui a três ou quatro semanas, se os relatórios
   > vierem limpos, e a `p=reject` no fim. **Nunca acrescentes `aspf=s`** — a Stripe não
   > suporta alinhamento estrito de SPF e o passo 7 deixaria de funcionar.

4. **NÃO acrescentes SPF no ápex.** A Resend envia pelo subdomínio `send.recibocerto.pt`,
   que já tem o SPF certo. Um SPF no ápex sem o `include` correto faria os emails que hoje
   funcionam começarem a cair no spam.

5. **Verifica ao fim de 15 minutos** (pode demorar até 72 h, mas costuma ser rápido):

   ```
   https://dns.google/resolve?name=recibocerto.pt&type=MX
   https://dns.google/resolve?name=_dmarc.recibocerto.pt&type=TXT
   ```
   Ambos têm de devolver um bloco `"Answer"`. Enquanto não devolverem, não avances para o §7.

6. Volta à **[Resend → Domains](https://resend.com/domains)** → `recibocerto.pt` e confirma
   que a linha **Receiving (MX)** passou de `pending` a **`verified`**.

---

## 2. Variáveis de ambiente na Vercel — 3 minutos

**Vercel → projeto `recibo-certo` → Settings → Environment Variables.** Ambas em
**Production** (e em Preview, se quiseres testar num deploy de ramo).

| Nome | Valor |
|---|---|
| `RESEND_WEBHOOK_SECRET` | o `whsec_…` que te dei na conversa |
| `EMAIL_REENCAMINHAR_PARA` | `ptbr.henrique@gmail.com` |

> **Porque é que o teu email não está no código:** ficaria no histórico do git para sempre
> e mudá-lo exigiria um deploy. Aqui muda-se em dez segundos, que é a cadência a que uma
> caixa de correio de facto muda.
>
> Sem estas duas, `/api/email/receber` responde `503` e **não reencaminha nada** — de
> propósito. Aceitar um webhook sem verificar a assinatura seria deixar qualquer pessoa
> mandar-te email em nome de quem quisesse.

---

## 3. Fazer o deploy

Junta este ramo a `main` e deixa a Vercel publicar. **Isto tem de acontecer antes do §4**,
porque os PNG da marca só ficam num URL público depois do deploy — e é de lá que a Stripe
e o Google os vão buscar.

Confirma depois, no browser:

- <https://www.recibocerto.pt/marca/icone-512.png>
- <https://www.recibocerto.pt/marca/logotipo-960.png>
- <https://www.recibocerto.pt/manifest.webmanifest>

### Teste do reencaminhamento

Escreve de qualquer conta para **`apoio@recibocerto.pt`**. Deve chegar ao teu Gmail em
menos de um minuto, com o remetente `Recibo Certo <ola@recibocerto.pt>` e o conteúdo
original intacto. Se não chegar: **Resend → Webhooks → Logs** diz o que aconteceu.

---

## 4. Stripe — o que a API não deixa escrever (15 minutos)

A API da Stripe **não permite** alterar a tua própria conta nem carregar ficheiros por esta
via. Estes cinco são à mão.

### 4.1 Ícone e logótipo

**[dashboard.stripe.com/settings/branding](https://dashboard.stripe.com/settings/branding)**

| Campo | Ficheiro |
|---|---|
| **Icon** | `https://www.recibocerto.pt/marca/icone-512.png` |
| **Logo** | `https://www.recibocerto.pt/marca/logotipo-960.png` |

Descarrega cada um (botão direito → guardar) e carrega no painel. Já cumprem os requisitos
da Stripe: PNG, menos de 512 KB, mais de 128×128.

**As cores já lá estão** — não lhes toques. Se o painel te perguntar, confirma:
cor da marca `#177E5E`, acento `#EDEAE0`.

### 4.2 O email da conta

**[dashboard.stripe.com/settings/account](https://dashboard.stripe.com/settings/account)**

Está lá **`contacto@refugioanimal.pt`** — o email de outro projeto teu. Muda para
`conta@recibocerto.pt` (ou o que preferires @recibocerto.pt; a partir do §1 todos funcionam).

### 4.3 O email do representante

**[dashboard.stripe.com/settings/business](https://dashboard.stripe.com/settings/business)**
→ o teu nome, na secção de representante.

Está lá **`support@lostlettersroom.com`** — o email de um terceiro projeto teu.

### 4.4 Detalhes públicos

**[dashboard.stripe.com/settings/public](https://dashboard.stripe.com/settings/public)**

| Campo | Valor | Estado atual |
|---|---|---|
| Support email | `apoio@recibocerto.pt` | **vazio** |
| Support website | `https://www.recibocerto.pt` | **vazio** |
| Business website | `https://www.recibocerto.pt` | `https://recibocerto.pt` (ápex, faz 307) |

> O *support email* não é decoração: é para lá que a Stripe encaminha as respostas dos
> clientes aos recibos, e é o contacto que o Checkout mostra em «Contactar». Vazio, um
> cliente com um problema de pagamento não tem para onde escrever.
>
> **Não preenchas o endereço postal de apoio** — aparece nos recibos, e a morada
> registada é a tua casa.

### 4.5 Nome mostrado ao cliente

No mesmo ecrã, confirma que o nome público é **`Recibo Certo`** (com espaço). O descritor
do extrato do cartão já está certo: `RECIBOCERTO.PT`.

### 4.6 Portal de faturação

Não precisas de fazer nada: o código repõe a configuração na primeira vez que um cliente
abrir o portal (título «Gere o teu Recibo Certo Plus», links legais, motivo de cancelamento
e — novo — deixar o cliente corrigir **nome, morada e NIF** na fatura).

Se quiseres confirmar hoje:
**[dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)**.
Vais encontrar lá ainda o título antigo, «Gere a tua subscrição Recibo Certo Pro» — um
plano que nunca existiu.

---

## 5. Google — o ecrã de consentimento (30 minutos + dias de espera)

**Este é o passo que resolve a queixa original.** O que se lê hoje é
«Prosseguir para **sxdditwefdzuqeephqiy.supabase.co**».

### 5.1 Porque acontece

Não é uma definição mal posta. São dois comportamentos documentados a somarem-se:

> **Google:** «If your branding isn't verified, **only your application domain will be
> visible to users**.»
>
> **Supabase:** «users will see `<project-id>.supabase.co` which **does not inspire trust**
> and can make your application more susceptible to successful phishing attempts.»

Ou seja: o **nome** não aparece porque a marca não está verificada, e o **domínio** que
aparece no lugar dele é o da Supabase, porque é o servidor de autenticação dela que
constrói o `redirect_uri`.

> ⚠️ **Um atalho que não funciona.** Reescrever `/auth/v1/*` no `vercel.json` para o
> projeto Supabase não resolve isto. O `redirect_uri` não é construído pelo browser nem
> pelo teu servidor: é gerado pela Supabase a partir do URL externo do **próprio projeto**.
> Um *rewrite* muda o caminho do pedido, não muda o que o Google recebe.

### 5.2 Antes de começar: a propriedade do domínio

A verificação **exige** que sejas dono confirmado de `recibocerto.pt` na **Google Search
Console**, com a mesma conta Google onde vives o projeto de Cloud.

1. Abre **[search.google.com/search-console](https://search.google.com/search-console)**.
2. Se `recibocerto.pt` já lá está e diz «Propriedade verificada» → passa ao §5.3.
3. Se não: **Adicionar propriedade** → **Prefixo do URL** → `https://www.recibocerto.pt`
   → método **Etiqueta HTML**. Copia só o valor de `content="…"`, mete-o na Vercel como
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (a variável já é lida pelo site), faz deploy e
   carrega em **Verificar**.

> Isto é um pré-requisito rígido: sem o domínio verificado, o pedido do §5.5 é recusado
> sem análise.

### 5.3 Preencher a marca

1. **[console.cloud.google.com/auth/branding](https://console.cloud.google.com/auth/branding)**
   — confirma no canto superior que estás no **projeto certo** (aquele onde criaste o
   cliente OAuth que a Supabase usa). Se tiveres vários, é o que tem o cliente cujo
   *Authorized redirect URI* é `https://sxdditwefdzuqeephqiy.supabase.co/auth/v1/callback`.
   Confirmas isso em **Google Auth Platform → Clients**.

2. Preenche, **exatamente assim**:

   | Campo | Valor |
   |---|---|
   | App name | `Recibo Certo` |
   | User support email | `apoio@recibocerto.pt` |
   | App logo | descarrega e carrega `https://www.recibocerto.pt/marca/icone-120.png` |
   | Application home page | `https://www.recibocerto.pt` |
   | Application privacy policy link | `https://www.recibocerto.pt/privacidade` |
   | Application terms of service link | `https://www.recibocerto.pt/termos` |
   | Authorized domains | `recibocerto.pt` **e** `supabase.co` |
   | Developer contact information | `apoio@recibocerto.pt` |

   > **O logótipo tem de ser o de 120×120** — é o tamanho que o Google recomenda. Aceita
   > JPG, PNG e BMP até 1 MB. O `icone-120.png` já está feito à medida.
   >
   > **`supabase.co` tem de estar nos domínios autorizados**, porque é o domínio do
   > `redirect_uri`. Sem ele, o cliente OAuth deixa de validar.

3. **Guardar.**

### 5.4 Confirmar a audiência

**Google Auth Platform → Audience.** O tipo de utilizador tem de ser **External** e o
estado **In production** (não «Testing»). Em «Testing», só entram os emails da lista de
testadores — e toda a gente vê um aviso de app não verificada.

### 5.5 Pedir a verificação da marca

Ainda em **Branding**, procura **«Prepare for verification»** ou o botão
**«Publish app» / «Submit for verification»** (o nome muda com o estado da conta).

Como o Recibo Certo só usa âmbitos **não sensíveis** (`email`, `profile`, `openid` — o que
a Supabase pede para «Entrar com Google»), o processo é o mais leve: **brand verification**.
Não pede vídeo de demonstração nem auditoria de segurança.

O que o Google vai olhar, e que o site já cumpre:

- [x] Página inicial num domínio teu e verificado, que descreve a aplicação e não é só um
      ecrã de login → `https://www.recibocerto.pt`
- [x] Política de privacidade **no mesmo domínio** da página inicial e ligada de forma
      visível na página inicial *e* no ecrã de consentimento → `/privacidade`, com link
      no rodapé de todas as páginas
- [x] Nome da aplicação igual ao nome da marca no site → **Recibo Certo**
- [x] Logótipo que representa a aplicação → o mesmo do site

**Demora dias úteis.** Vais receber um email do Google — chega ao endereço de contacto de
programador que puseste, que a partir do §1 e §2 é reencaminhado para a tua caixa.

### 5.6 Se a verificação for recusada

O motivo mais reportado com a Supabase é **incoerência entre o domínio da marca e o
domínio de callback**: a marca diz `recibocerto.pt` e o `redirect_uri` diz
`sxdditwefdzuqeephqiy.supabase.co`.

Se for esse o motivo, a saída é dares um domínio teu à autenticação:

1. **Supabase → Settings → Add-ons → Custom Domain.** Exige o plano **Pro ($25/mês)** mais
   o add-on **($10/mês)** — a organização está hoje em **Free**.
2. Escolhe `auth.recibocerto.pt`.
3. Acrescenta o CNAME que a Supabase indicar, no mesmo painel de DNS do §1.
4. **Antes de ativar**, acrescenta o novo callback aos *Authorized redirect URIs* do
   cliente OAuth, **sem apagar o antigo**:
   `https://auth.recibocerto.pt/auth/v1/callback`
5. Ativa o domínio na Supabase e volta a pedir a verificação.

> **Não pagues os $35/mês antes de saber se são precisos.** Tenta primeiro o §5.5, que é
> grátis e pode bastar. Mesmo sem verificação, com o domínio personalizado o ecrã passa a
> dizer «Prosseguir para **auth.recibocerto.pt**» — que já é teu.

---

## 6. Supabase — os emails de conta (20 minutos)

Hoje **não sai email nenhum**: 13 contas criadas, zero confirmações enviadas. A confirmação
está desligada, e o serviço de email de origem da Supabase só entrega a endereços da equipa
(«Email address not authorized») com um limite de **2 mensagens por hora**.

**A ordem importa.** Ligar a confirmação antes do SMTP trocaria «ninguém recebe email» por
«ninguém consegue registar-se».

### 6.1 SMTP próprio (a Resend que já usas)

1. **[resend.com/settings/smtp](https://resend.com/settings/smtp)** — anota o servidor, a
   porta e as credenciais. A palavra-passe SMTP é uma chave de API da Resend; cria uma
   nova em **API Keys** se preferires não reutilizar a do site.
2. **Supabase → Authentication → Emails → SMTP Settings** → **Enable Custom SMTP**:

   | Campo | Valor |
   |---|---|
   | Sender email | `ola@recibocerto.pt` |
   | Sender name | `Recibo Certo` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | a chave de API da Resend |

3. **Guardar** e usar o botão de teste, se existir.
4. **Authentication → Rate Limits:** a Supabase impõe 30 mensagens/hora por omissão depois
   de ligar SMTP próprio. Chega com folga para o volume atual; sobe se um dia crescer.

### 6.2 Os seis moldes em pt-PT

**Supabase → Authentication → Emails**, separador de cada molde. Os ficheiros estão em
`docs/moldes-auth-supabase/` — abre cada um, copia o HTML todo e cola:

| Molde no painel | Ficheiro | Assunto a pôr |
|---|---|---|
| Confirm signup | `01-confirmar-registo.html` | `Confirma o teu email — Recibo Certo` |
| Reset password | `02-recuperar-palavra-passe.html` | `Definir uma palavra-passe nova — Recibo Certo` |
| Magic Link | `03-link-magico.html` | `O teu link de entrada — Recibo Certo` |
| Change Email Address | `04-mudar-email.html` | `Confirma o teu email novo — Recibo Certo` |
| Invite user | `05-convite.html` | `Foste convidado para o Recibo Certo` |
| Reauthentication | `06-reautenticacao.html` | `O teu código de confirmação — Recibo Certo` |

> **Não edites os moldes à mão.** São gerados de `src/lib/email/auth-supabase.ts`, que
> partilha o desenho com os outros emails do produto. Editados só no painel, ficam dois
> desenhos da mesma marca a divergir — que é exatamente como a cor antiga sobreviveu
> meses nos emails depois de o site já ter mudado. Para alterar: muda o ficheiro, corre
> `npm run auth:moldes`, cola outra vez.

### 6.3 Confirmar os URL de redireção

**Supabase → Authentication → URL Configuration.** A lista de *Redirect URLs* tem de
incluir, senão o link de recuperação de palavra-passe morre à chegada:

```
https://www.recibocerto.pt/redefinir-password
https://www.recibocerto.pt/dashboard
```

### 6.4 Ligar a confirmação de email

**Só depois de 6.1 e 6.2 estarem feitos e testados.**

**Supabase → Authentication → Providers → Email** → ligar **Confirm email**.

> As 13 contas que já existem ficam como estão — são confirmadas. A mudança vale para
> quem se registar a partir daí.

### 6.5 Duas coisas rápidas no mesmo painel

- **Authentication → Providers → Email**: ligar **Leaked password protection**
  (HaveIBeenPwned). Grátis, um interruptor, e já estava assinalado em `docs/SUPABASE.md`.
- **Settings → General**: mudar o nome do projeto de «Recibo Certo» — já está certo —
  e confirmar que continua assim.

### 6.6 Testar

Numa janela anónima, cria conta com um email teu que **não** seja o da equipa. Tens de
receber, em minutos, um email **em português**, com a marca, vindo de
`ola@recibocerto.pt`. Depois testa «Esqueceste-te da palavra-passe?».

---

## 7. Stripe — recibos enviados do teu domínio (10 minutos)

**Só depois do §1**, porque a Stripe exige DMARC publicado.

1. **[dashboard.stripe.com/settings/emails](https://dashboard.stripe.com/settings/emails)**
   → **Add domain** → `recibocerto.pt`.
2. A Stripe dá **um TXT** (prova de propriedade) e **dois CNAME** (*Mail From* e DKIM).
   Acrescenta-os no mesmo painel de DNS do §1.
3. Espera pela verificação (até 72 h) e depois define `recibocerto.pt` como **sending
   domain**.
4. Envia um recibo de teste pelo menu «⋯».

A partir daí, recibos, faturas e avisos de pagamento falhado saem de
`recibos@recibocerto.pt` em vez de `stripe.com`. As respostas dos clientes vão para o
*support email* do §4.4 — e daí, pelo §1, para a tua caixa.

> ⚠️ **Depois de verificado, não apagues os registos de DNS.** A Stripe verifica-os
> periodicamente; se algum desaparecer, ela volta a enviar por `stripe.com` ao fim de 48 h.

---

## 8. Lista de verificação final

Corre isto tudo quando acabares. Cada linha corresponde a um achado da auditoria.

| # | Como confirmar | Esperado |
|---|---|---|
| 1 | Entrar com o Google em janela anónima | «Prosseguir para **Recibo Certo**», com logótipo |
| 2 | Escrever para `apoio@recibocerto.pt` | Chega ao Gmail em < 1 min |
| 3 | `https://dns.google/resolve?name=_dmarc.recibocerto.pt&type=TXT` | Devolve `Answer` |
| 4 | Abrir um checkout de teste | Botão verde `#177E5E`, ícone da marca, benefícios listados |
| 5 | Enviar recibo de teste na Stripe | Remetente `@recibocerto.pt`, cores da marca |
| 6 | Abrir o portal de faturação | «Gere o teu Recibo Certo Plus», links legais, editar NIF |
| 7 | Criar conta com email novo | Email em pt-PT, com marca, de `ola@recibocerto.pt` |
| 8 | «Esqueceste-te da palavra-passe?» | Email chega, o link abre `/redefinir-password`, muda |
| 9 | Adicionar o site ao ecrã principal do iPhone | Ícone da marca e o nome «Recibo Certo» |
| 10 | Responder a um alerta do produto | A resposta chega ao Gmail |

E, no repositório, antes de cada merge:

```bash
npm run build && npm audit --audit-level=high && npm run movel:e2e
npm run marca:check && npm run auth:moldes:check
```

---

## 9. O que fica deliberadamente por fazer

- **Domínio personalizado da Supabase ($35/mês).** Só se o §5.5 for recusado. Ver §5.6.
- **Webhook de bounces na Resend.** Faz sentido quando houver volume; hoje, com dois
  clientes, o sinal chegaria por outras vias.
- **Imagem do produto no Checkout.** A Stripe aceita uma imagem por produto. Fica para
  quando houver uma peça gráfica que valha a pena — o ícone já lá está.
- **Identidade do representante na Stripe: `unverified`.** Os documentos foram carregados,
  não há nada pendente e os pagamentos funcionam. **Vigiar:** se a Stripe reabrir o pedido,
  fá-lo com prazo, e um prazo desses apanhado em cima da hora bloqueia transferências.
