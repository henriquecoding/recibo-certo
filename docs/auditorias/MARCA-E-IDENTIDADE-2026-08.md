# Auditoria de marca e identidade — Supabase, Vercel, Stripe e Resend

**Data:** 31 de agosto de 2026 · **Versão auditada:** `2.139.0` · **Ramo:** `claude/brand-audit-supabase-vercel-stripe-ct5sn7`

**Âmbito:** tudo o que uma pessoa vê com o nome do ReciboCerto **fora do site** — o ecrã de
consentimento do Google, os emails da criação de conta, o checkout e os recibos da Stripe, o
portal de faturação, os emails transacionais da Resend, os domínios e o DNS. Não audita o
produto em si (isso está em `docs/auditorias/`), nem a fiscalidade.

---

## 1. Sumário executivo

O site é coerente. **As bordas não são.** Em todo o sítio onde a experiência sai do
`recibocerto.pt` e passa por um terceiro, a marca desaparece e aparece outra coisa no lugar —
e nem sempre é uma coisa neutra: às vezes é o nome de outro projeto teu.

Hoje circulam **três identidades diferentes** com a promessa de serem o ReciboCerto:

| Momento | O que a pessoa vê hoje | O que devia ver |
|---|---|---|
| Entrar com o Google | «Prosseguir para **sxdditwefdzuqeephqiy.supabase.co**» | «Prosseguir para **ReciboCerto**» + logótipo |
| Confirmar a conta por email | **nada** — não é enviado email nenhum | Email em pt-PT, do `recibocerto.pt`, com a marca |
| Recuperar a palavra-passe | **não existe** no produto | Fluxo completo de recuperação |
| Pagar o Plus | Checkout **azul da Stripe**, sem logótipo | Verde `#177E5E`, ícone e logótipo |
| Receber o recibo de compra | Email do `stripe.com`, sem marca | Email do `recibocerto.pt`, com a marca |
| Gerir a subscrição | «Gere a tua subscrição **ReciboCerto Pro**» — plano que não existe | «Gere o teu **ReciboCerto Plus**» |
| Escrever para o apoio | `recibocerto.pt@gmail.com` (em 9 ficheiros) | `apoio@recibocerto.pt` |
| Responder a um email nosso | `noreply@recibocerto.pt` — **cai no vazio** | Uma caixa que alguém lê |

E dois achados que não são de estética, são de higiene: a conta Stripe do ReciboCerto tem
**o email de contacto de outro projeto** (`contacto@refugioanimal.pt`) e o representante está
registado com **o email de um terceiro projeto** (`support@lostlettersroom.com`); e o domínio
`recibocerto.pt` **não tem registo MX** — não recebe email nenhum, o que torna
`admin@recibocerto.pt` (que já é cliente na Stripe) um endereço que nunca receberá o recibo.

**A boa notícia é o timing.** A Stripe tem **2 clientes, ambos teus**. A base tem **13
utilizadores**. A Resend enviou **1 email desde junho**. Nada disto ainda tocou num cliente
verdadeiro. Todas as correções deste relatório são, hoje, registos de DNS e definições de
painel. As mesmas correções depois de 500 clientes são recibos reemitidos, faturas com o nome
errado e conversas de apoio. **É a última altura barata para fazer isto.**

### Como foi auditado

Nada aqui é suposição: cada linha foi lida na origem, ao vivo, a 31/08/2026.

| Fonte | O que foi lido |
|---|---|
| API da Stripe (conta ao vivo, `livemode`) | conta `acct_1TgxpqB7ShC08bCf`, definições de marca, perfil de negócio, produtos, preços, clientes, configuração do portal |
| API da Supabase (projeto `sxdditwefdzuqeephqiy`) | organização e plano, e SQL de agregação sobre `auth.users` (contagens, sem dados pessoais) |
| API da Resend | domínios, moldes, difusões, webhooks e registo de envios |
| API da Vercel | equipa, projeto, domínios ligados |
| DNS público | `dns.google` **e** `cloudflare-dns.com`, em concordância, para MX / SPF / DMARC / DKIM / NS |
| Repositório | `src/lib/email/*`, `src/app/api/stripe/*`, `src/lib/supabase/auth.tsx`, `tailwind.config.ts`, `public/`, `src/app/layout.tsx` |
| Documentação oficial | Supabase (SMTP, domínios personalizados, login Google), Stripe (marca, domínio de email), Google Cloud (verificação de marca) |

---

## 2. Achados, por gravidade

| # | Gravidade | Achado | Onde se corrige |
|---|---|---|---|
| 1 | **P0** | O ecrã do Google anuncia `sxdditwefdzuqeephqiy.supabase.co` | Google Cloud + Supabase |
| 2 | **P0** | O domínio não tem MX — `recibocerto.pt` não recebe email | DNS (Vercel) |
| 3 | **P0** | Não existe recuperação de palavra-passe no produto | Código + Supabase |
| 4 | **P0** | Conta Stripe com o email de outro projeto (`contacto@refugioanimal.pt`) | Painel Stripe |
| 5 | **P0** | Marca da Stripe por preencher: sem ícone, sem logótipo, azul de origem | Painel Stripe |
| 6 | **P1** | Contacto público é `recibocerto.pt@gmail.com`, em 9 ficheiros (inclui privacidade e termos) | Código + caixa nova |
| 7 | **P1** | Sem DMARC e sem SPF no ápex — bloqueia o domínio de email da Stripe | DNS (Vercel) |
| 8 | **P1** | Sem email nem URL de apoio na Stripe (`support_email: null`) | Painel Stripe |
| 9 | **P1** | Confirmação de email desligada: 13 contas, 0 emails de confirmação enviados | Supabase (depois de SMTP) |
| 10 | **P1** | SMTP de origem da Supabase: 2 emails/hora e só para a equipa | Supabase + Resend |
| 11 | **P1** | Portal de faturação anuncia «ReciboCerto **Pro**» e não tem links legais | Stripe (o código já corrige — ver 5.4) |
| 12 | **P1** | Emails do produto usam `#1D9E75`, a cor **antiga**, que falha AA (3,39:1) | `src/lib/email/templates.ts:3` |
| 13 | **P1** | Recibos e faturas saem do `stripe.com` | Stripe + DNS |
| 14 | **P2** | 30 palavras sem acentos nos emails de alerta | `src/lib/email/templates.ts` |
| 15 | **P2** | Emails sem `reply_to`, sem versão em texto e sem `List-Unsubscribe` | `src/lib/email/send.ts` |
| 16 | **P2** | Não existe ativo de marca em PNG — é a causa comum dos achados 5 e 1 | `public/` |
| 17 | **P2** | `apple-icon` aponta para SVG (o iOS não lê) e não há manifest | `src/app/layout.tsx` |
| 18 | **P2** | Nome inconsistente: «Recibo Certo» na Stripe e na Supabase, «ReciboCerto» no site | Decisão + painéis |
| 19 | **P2** | Logótipo `public/logo.svg` ainda escrito na cor antiga `#1D9E75` | `public/logo.svg:8` |
| 20 | **P3** | Dois preços antigos ainda ativos (5,99 €/mês e 47,99 €/ano) | Painel Stripe |
| 21 | **P3** | Identidade do representante na Stripe: `unverified` | Painel Stripe (vigiar) |
| 22 | **P3** | Proteção de palavras-passe vazadas desligada (já documentado em `docs/SUPABASE.md`) | Supabase |

---

## 3. O alicerce: o domínio

Metade deste relatório resolve-se aqui, e por isso vem primeiro. **Um domínio que não recebe
email não pode ter apoio ao cliente, não pode ser o remetente de confiança de ninguém e não
passa nos requisitos de quem envia email a sério.**

### 3.1 O que o DNS diz hoje

Consultado em `dns.google` e em `cloudflare-dns.com`, com resposta concordante (`NOERROR`,
sem registos):

| Registo | Estado | Consequência |
|---|---|---|
| `MX recibocerto.pt` | **inexistente** | O domínio não recebe email. `apoio@`, `admin@`, `ola@` — nenhum funciona. |
| `TXT recibocerto.pt` (SPF) | **inexistente** | Sem política de envio declarada no ápex. |
| `TXT _dmarc.recibocerto.pt` | **inexistente** | Falha o requisito de remetentes do Gmail/Yahoo e **bloqueia** o domínio de email da Stripe, que exige DMARC. |
| `TXT send.recibocerto.pt` | `v=spf1 include:amazonses.com ~all` | ✅ o caminho da Resend está correto. |
| `TXT resend._domainkey…` | chave DKIM presente | ✅ a Resend assina em nome do domínio. |
| `NS recibocerto.pt` | `ns1/ns2.vercel-dns.com` | O DNS é gerido **na Vercel** — é lá que estes registos se acrescentam. |

Consequência concreta e já real: o cliente `admin@recibocerto.pt` existe na Stripe
(`cus_UgdzsAAk5dad5s`). Se hoje lhe fosse emitido um recibo, ele **não chegava a lado nenhum**.
E qualquer pessoa que responda a um email do `noreply@recibocerto.pt` está a escrever para uma
caixa que não existe.

### 3.2 O que fazer

1. **Pôr o domínio a receber email.** Três caminhos, do mais barato ao mais completo:
   - **Reencaminhamento** (ImprovMX, Forward Email e semelhantes) — grátis ou quase; um MX e
     pronto: `apoio@recibocerto.pt` cai na caixa que já usas. Resolve o problema de imagem
     hoje, sem migração.
   - **Zoho Mail** — plano gratuito para um domínio; caixa a sério, com envio.
   - **Google Workspace** — ~6 €/utilizador/mês; é o que já sabes usar e integra com a conta
     Google que gere o OAuth.
   > Recomendação: reencaminhamento **hoje** (é uma tarde), Workspace quando houver receita
   > que o justifique. O que não pode continuar é não haver caminho nenhum.

2. **Publicar DMARC.** Começar em modo de observação, como a própria Stripe recomenda:
   ```
   Tipo: TXT   Nome: _dmarc   Valor: v=DMARC1; p=none; rua=mailto:dmarc@recibocerto.pt
   ```
   Passar a `p=quarantine` e depois a `p=reject` depois de umas semanas de relatórios limpos.
   ⚠️ A Stripe **não suporta alinhamento estrito de SPF** — a política não pode levar `aspf=s`.

3. **Publicar SPF no ápex** quando houver caixa de correio, alinhado com o fornecedor
   escolhido. (A Resend não precisa: usa `send.recibocerto.pt`, que já está correto.)

4. **Trocar `recibocerto.pt@gmail.com` por `apoio@recibocerto.pt`** nos 9 ficheiros:
   `src/app/privacidade/page.tsx`, `src/app/termos/page.tsx`, `src/app/cookies/page.tsx`,
   `src/app/metodologia/page.tsx`, `src/app/llms.txt/route.ts`,
   `src/app/investidores/_data/legal.ts`, `src/components/Footer.tsx`,
   `src/components/LegalPage.tsx`, `src/components/ui/ResultadoExplicado.tsx`.
   > Isto não é cosmética: na política de privacidade, o endereço do Gmail é **o canal legal
   > de exercício de direitos do RGPD**. Um site que trata dados fiscais e dá um Gmail como
   > morada de responsável está a dizer, sem querer, que é um projeto de fim de semana.

---

## 4. Supabase — a conta e o login

**Projeto:** `sxdditwefdzuqeephqiy` («Recibo Certo»), `eu-west-1`, PostgreSQL 17.6, saudável.
**Organização:** `recibo-certo`, plano **Free**.

### 4.1 O ecrã do Google — o achado nº 1

O que a pessoa vê hoje: **«Prosseguir para sxdditwefdzuqeephqiy.supabase.co»**. Não é um erro
de configuração; é o comportamento documentado de dois sistemas a somarem-se:

- **Google:** «If your branding isn't verified, **only your application domain will be
  visible to users**.» Sem verificação de marca, o Google recusa-se a mostrar nome e logótipo
  e mostra o domínio do cliente OAuth.
- **Supabase:** o domínio do cliente OAuth é o do projeto, porque é o GoTrue que constrói o
  `redirect_uri` (`https://<ref>.supabase.co/auth/v1/callback`). A própria documentação
  reconhece o efeito: *«users will see `<project-id>.supabase.co` which does not inspire
  trust and can make your application more susceptible to successful phishing attempts»*.

Ou seja: **falham as duas metades ao mesmo tempo** — o nome não aparece porque não está
verificado, e o domínio que aparece no lugar dele não é teu.

> ⚠️ **Um atalho que NÃO funciona.** Reescrever `/auth/v1/*` no `vercel.json` para o projeto
> Supabase não resolve isto. O `redirect_uri` não é construído pelo browser nem pelo teu
> servidor — é o GoTrue que o gera a partir do URL externo do **próprio projeto**. Um rewrite
> muda o caminho do pedido, não muda o que o Google recebe. Não vale o risco de partir sessões
> para não resolver o problema.

**As opções reais, com custo:**

| Opção | Custo | O que passa a aparecer | Notas |
|---|---|---|---|
| **A.** Verificação de marca no Google | 0 € | «Prosseguir para **ReciboCerto**» + logótipo | Dias úteis de espera. Risco conhecido: a verificação pode ser recusada por **incoerência entre o nome/domínio da marca e o domínio de callback** do Supabase. |
| **B.** Domínio personalizado Supabase (`auth.recibocerto.pt`) | **$10/mês** + Pro **$25/mês** = **$35/mês** | «Prosseguir para **auth.recibocerto.pt**» | Exige plano pago (a org está em Free). Resolve o domínio mesmo sem verificação. |
| **C.** A + B | $35/mês | «Prosseguir para **ReciboCerto**» + logótipo, com callback teu | O resultado ideal, e o que a Supabase recomenda. |

**Sequência recomendada:** começar por **A** (é grátis e pode bastar). Se a verificação for
recusada por incoerência de domínio — o cenário mais reportado com Supabase — então **B** deixa
de ser um luxo e passa a ser o desbloqueio de **A**. Não pagar $35/mês antes de saber se são
precisos.

**Enquanto A não fecha**, há uma coisa grátis que vale a pena: preencher no Google Cloud
(*OAuth consent screen* → *Branding*) o nome da aplicação («ReciboCerto»), o logótipo, o email
de apoio, a página inicial e as páginas de privacidade e termos — que o site já tem em
`/privacidade` e `/termos` —, e acrescentar `recibocerto.pt` aos domínios autorizados. Sem
isto preenchido, a verificação nem sequer pode ser pedida.

### 4.2 Os emails de conta: hoje **não existem**

Consulta de agregação a `auth.users` (só contagens):

| Provedor | Utilizadores | Emails de confirmação enviados | Emails de recuperação enviados | Confirmados no próprio instante |
|---|---|---|---|---|
| `google` | 7 | **0** | **0** | 7 |
| `email` | 6 | **0** | **0** | 6 |

Todas as 13 contas foram confirmadas em menos de 5 segundos após a criação: a confirmação de
email está **desligada** (`autoconfirm`, como `docs/SUPABASE.md` já regista). E o registo da
Resend confirma pelo outro lado: **um único email desde junho**, um teste para ti.

Daqui saem três problemas encadeados:

1. **`AuthModal.tsx:64` promete um email que nunca sai.** A copy «Conta criada! Confirma o teu
   email para ativares a conta» só aparece quando não há sessão — hoje há sempre. É código
   morto por sorte, não por desenho: no dia em que ligares a confirmação, começa a aparecer.

2. **Não há recuperação de palavra-passe.** Existe a mudança de palavra-passe *com sessão
   iniciada* (`src/app/dashboard/conta/page.tsx:486`, via `updateUser`), mas não existe uma
   única chamada a `resetPasswordForEmail` em todo o `src/` — ou seja, nada para **quem já não
   consegue entrar**. Seis pessoas entraram com palavra-passe e, se a esquecerem, **não têm
   caminho de volta**. Isto não é marca — é uma porta que não abre.

3. **Ligar a confirmação hoje partia o registo.** O SMTP de origem da Supabase «only send
   messages to [pre-authorized team] addresses. All other addresses will fail with the error
   message *Email address not authorized*», com um limite de **2 mensagens por hora** e sem
   qualquer garantia de serviço. Ligar a confirmação antes do SMTP próprio seria trocar
   «ninguém recebe email» por «ninguém consegue registar-se».

**A ordem correta é esta, e não outra:**

```
1. SMTP próprio (Resend) na Supabase          → o canal passa a existir e a ser teu
2. Moldes de autenticação em pt-PT, com marca → o que sai passa a parecer o ReciboCerto
3. Ligar a confirmação de email               → agora é seguro
4. Fluxo de recuperação no produto            → a porta passa a abrir
```

Para o passo 1, na Supabase (*Authentication → Emails → SMTP Settings*), com as credenciais
SMTP da Resend, remetente `ReciboCerto <conta@recibocerto.pt>`. Depois de configurado, a
Supabase impõe **30 mensagens/hora** por omissão — ajustável em *Rate Limits*, e suficiente
para o volume atual com muita folga.

### 4.3 Os moldes de autenticação estão em inglês

Os moldes de origem («Confirm your signup», «Follow this link to confirm your user») saem em
inglês e sem marca nenhuma. São **seis** e vivem em *Authentication → Email Templates*:
confirmação de registo, convite, link mágico, mudança de email, recuperação de palavra-passe e
reautenticação.

O molde já existe no repositório: o `layout()` de `src/lib/email/templates.ts` (cabeçalho,
corpo, rodapé) é exatamente o que estes precisam — muda só o conteúdo e o `{{ .ConfirmationURL }}`.
**Não escrever HTML novo à mão**: reaproveitar o `layout()` mantém uma marca só e evita que
daqui a três meses existam dois desenhos de email diferentes.

### 4.4 Outros

- O projeto chama-se «Recibo Certo» (com espaço) — ver a decisão 9.1.
- A proteção contra palavras-passe vazadas (HaveIBeenPwned) continua desligada, como
  `docs/SUPABASE.md` já documenta. Grátis e um interruptor.

---

## 5. Stripe — o checkout, os recibos e o portal

**Conta:** `acct_1TgxpqB7ShC08bCf` («Recibo Certo»), Portugal, EUR, `charges_enabled: true`.
**Clientes:** 2 — `ptbr.henrique@gmail.com` e `admin@recibocerto.pt`. **Ambos teus.**

### 5.1 A marca está literalmente por preencher

Lido na conta ao vivo (`settings.branding` e definições de marca):

| Definição | Valor atual | Onde aparece (documentação da Stripe) |
|---|---|---|
| `icon` | **`null`** | Emails, Checkout, portal, fatura online, PDF da fatura |
| `logo` | **`null`** | Checkout e PDF da fatura |
| `primary_color` (cor da marca) | `#525f7f` — cinzento da Stripe | Recibos, faturas, portal |
| `secondary_color` / acento | `#0074d4` — **azul da Stripe** | Fundo dos emails e das páginas |
| `checkout_button_color` | `#0074d4` — **azul da Stripe** | Botão de pagar |
| `checkout_font_family` | `default` | Checkout |

Ou seja: quem paga o ReciboCerto vê **um formulário azul da Stripe**, sem o verde e sem o
logótipo. E não é só o checkout — pelo quadro da própria Stripe, isto contamina **seis
superfícies**: emails, Checkout e Payment Links, portal do cliente, página da fatura, PDF da
fatura e os recibos.

**Valores a pôr** (*Definições → Marca*):

| Campo | Valor | Porquê |
|---|---|---|
| Cor da marca | **`#177E5E`** | É a cor da marca desde 08/2026 (`tailwind.config.ts`). 5,02:1 com branco — passa AA. |
| Cor de acento | **`#EDEAE0`** | É o «papel» do site (`cream`). Põe o fundo dos emails da Stripe igual ao do produto. |
| Ícone | PNG quadrado ≥ 128 px | Requisito: **JPG ou PNG, < 512 KB, ≥ 128×128** |
| Logótipo | PNG horizontal | Idem |

### 5.2 A conta tem o email de outros projetos

Isto é o achado mais desconfortável da auditoria, e é literal:

| Campo | Valor atual | Devia ser |
|---|---|---|
| `email` (email da conta) | **`contacto@refugioanimal.pt`** | `conta@recibocerto.pt` |
| `individual.email` (representante) | **`support@lostlettersroom.com`** | um endereço teu do ReciboCerto |
| `business_profile.support_email` | **`null`** | `apoio@recibocerto.pt` |
| `business_profile.support_url` | **`null`** | `https://www.recibocerto.pt` |
| `business_profile.url` | `https://recibocerto.pt` | `https://www.recibocerto.pt` (o ápex responde 307 — ver `src/lib/origem.ts`) |
| `dashboard.display_name` | `Recibo Certo` | ver a decisão 9.1 |
| `payments.statement_descriptor` | `RECIBOCERTO.PT` | ✅ já correto — é o que aparece no extrato do cartão |

O `support_email` não é decorativo: é para lá que a Stripe encaminha as respostas dos clientes
aos emails dela, e é o contacto que o Checkout mostra na caixa «Contactar». Com `null`, um
cliente com um problema de pagamento **não tem para onde escrever**.

> ⚠️ Não preencher `support_address` com a morada de casa: aparece nos recibos. Um email e um
> URL de apoio chegam.

### 5.3 O portal de faturação anuncia um plano que não existe

A configuração ativa (`bpc_1Th2cSB7ShC08bCfHra1yEaf`, criada a 11/06/2026 e **nunca
atualizada** desde então) diz:

| Campo | Valor ao vivo | Problema |
|---|---|---|
| `business_profile.headline` | «Gere a tua subscrição **ReciboCerto Pro**» | O plano chama-se **Plus**. O «Pro» não existe em lado nenhum. |
| `privacy_policy_url` | `null` | Sem link para a política |
| `terms_of_service_url` | `null` | Sem link para os termos |
| `default_return_url` | `https://recibocerto.pt/…` | Ápex, que faz 307 |
| `cancellation_reason.enabled` | `false` | Não se aprende nada com quem sai |
| `customer_update.enabled` | `false` | O cliente **não pode corrigir nome nem morada** na fatura |

Nota importante e a favor do código: `src/app/api/stripe/portal/route.ts:18-48` **já corrige**
quase tudo isto na primeira vez que alguém abre o portal. A configuração está estagnada
simplesmente porque nunca ninguém o abriu — o que é coerente com haver 2 clientes, ambos teus.

Ficam, ainda assim, duas coisas por resolver no código:
- O `needsUpdate` não verifica `customer_update` nem `login_page`, por isso essas nunca serão
  corrigidas. Em Portugal, deixar o cliente corrigir nome e morada na fatura não é um extra.
- A atualização é «melhor esforço» com `catch` silencioso (com boa razão: a configuração
  editorial não pode impedir ninguém de cancelar). Mas assim, se falhar, ninguém fica a saber.
  Um aviso no registo já existe; vale a pena confirmar uma vez à mão no painel.

### 5.4 Os emails saem do `stripe.com`

Por omissão, recibos, faturas e avisos de pagamento falhado saem do domínio `stripe.com`. A
Stripe suporta domínio próprio (*Definições → Emails dos clientes*), com remetentes como
`recibos@recibocerto.pt`, `faturacao@recibocerto.pt` ou `apoio@recibocerto.pt`.

**Requisitos:** um TXT de prova de propriedade, CNAMEs de *Mail From* e DKIM — e **DMARC
publicado**, que hoje não existe (§3.1). Por isso este item **depende do §3** e não pode ser
feito antes. Prazo de propagação até 72 h.

### 5.5 O catálogo

O produto `prod_UyhrseEXbEgnbW` está bem construído — descrição em pt-PT, `statement_descriptor`
`RECIBOCERTO`, código fiscal, `url` para `/precos`, `tax_behavior: inclusive` nos dois preços
atuais (1,99 €/mês e 19,99 € vitalício). Faltam três coisas pequenas e visíveis:

- **`images: []`** — o Checkout mostra a imagem do produto ao lado do preço. Está vazio.
- **`marketing_features: []`** — o Checkout mostra a lista de benefícios. Está vazia, apesar de
  a descrição já os enumerar.
- **Nome «Recibo Certo Plus»**, com espaço (ver 9.1).

E dois **preços antigos ainda ativos** noutro produto — 5,99 €/mês (`price_1Th2cBB7…`) e
47,99 €/ano (`price_1Th2cDB7…`), ambos com `tax_behavior: unspecified`. O código nunca lhes
toca (resolve por `lookup_key`), mas continuam selecionáveis num Payment Link feito à pressa no
painel. Arquivar.

### 5.6 Nota de risco (não é marca)

`individual.verification.status: unverified`, com
`details: "Provided identity information could not be verified"` (`failed_keyed_identity`). Os
documentos foram carregados e não há nada em `currently_due` — os pagamentos e as
transferências estão ativos. **Não é urgente, mas é para vigiar:** se a Stripe reabrir o
pedido, faz isso com prazo, e um prazo desses apanhado em cima da hora bloqueia transferências.

---

## 6. Resend — os emails do produto

**Domínio `recibocerto.pt`: verificado**, envio ativo, região `eu-west-1`. SPF e DKIM corretos.
O alicerce técnico está bem feito. O que falta é o acabamento.

**Inventário:** 8 moldes em `src/lib/email/templates.ts`, com catálogo de exemplos
(`exemplos.ts`), pré-visualização sem envio (`scripts/render-emails.mjs`) e envio real de
revisão (`/api/admin/emails-teste`). **Este arreio de revisão é bom e pouca gente o tem** —
vale a pena dizê-lo antes das críticas.

### 6.1 A cor da marca nos emails está desatualizada — e falha AA

`src/lib/email/templates.ts:3` define `const BRAND = "#1D9E75"`. Essa cor foi **substituída em
agosto de 2026** por `#177E5E`, e o comentário em `tailwind.config.ts` explica exatamente
porquê: `#1D9E75` dá **3,39:1** contra branco e falha AA nas duas direções. Os emails ficaram
para trás na migração.

Todos os botões, o quadrado do logótipo e os destaques dos 8 emails saem hoje na cor antiga —
**visivelmente diferente do site e por baixo do mínimo de contraste que o projeto adotou**. O
mesmo se passa em `public/logo.svg:8`, onde o «Certo» do logótipo ainda está escrito a
`#1D9E75`.

Correção: `BRAND` → `#177E5E`, `BRAND_DARK` mantém-se `#0F6E56`, e o logótipo alinhado. Uma
linha em cada sítio.

### 6.2 Trinta palavras sem acentos

Contagem no ficheiro: **30 ocorrências inequívocas**, concentradas nos moldes de alerta
(Guardião Fiscal, IVA e Segurança Social) — `isencao` (8), `critico` (9), `Seguranca` (3),
`Guardiao` (2), `Financas` (2), `alteracao` (2), `Preparacao`, `Contribuicao`, `calculo`,
`faturacao`.

Os títulos incluídos: «Guardiao Fiscal: 80% do limite de IVA», «Limite de isencao de IVA
ultrapassado». É a **primeira linha** que a pessoa lê na caixa de entrada, num produto cuja
proposta é rigor fiscal. Viola a regra 2 do `CLAUDE.md` (português de Portugal) e é a correção
com melhor relação entre esforço e efeito de todo o relatório.

### 6.3 O que falta no envio

`src/lib/email/send.ts` envia `from`, `to`, `subject` e `html`. Falta:

| Em falta | Consequência | Correção |
|---|---|---|
| `reply_to` | Quem responde escreve para `noreply@`, que nem MX tem | `reply_to: "apoio@recibocerto.pt"` (depois do §3) |
| Versão em texto (`text`) | Filtros de spam penalizam HTML sozinho; alguns clientes mostram vazio | Gerar a partir do conteúdo |
| `List-Unsubscribe` | Requisito de remetentes do Gmail/Yahoo | Cabeçalho + link real |
| Link para desligar alertas | Os alertas dizem «recebes isto porque tens alertas ativos» e **não dizem como parar** | Link para as definições da conta |

O `idempotencyKey` já está bem feito e cobre reentregas de webhook. Nada a mudar aí.

### 6.4 O logótipo nos emails é um `✓` em CSS

O cabeçalho de `layout()` desenha um quadrado verde com um caráter `&#10003;` e o texto
«ReciboCerto» ao lado. É uma solução defensável — muitos clientes de email bloqueiam SVG — mas
o resultado é que **os emails não têm o logótipo**, têm uma aproximação dele. A causa é a
mesma do achado da Stripe: não existe um PNG da marca em lado nenhum (§8).

### 6.5 Sem modo escuro

O `layout()` fixa fundo `#FAFAF9` e tinta escura. Num cliente em modo escuro, o email fica um
retângulo branco no meio do escuro. O site tem modo escuro cuidado; os emails não têm nenhum.
Resolve-se com `@media (prefers-color-scheme: dark)` e `color-scheme: light dark` no `<head>` —
o Apple Mail e o Thunderbird respeitam-no, o Gmail inverte por conta própria (e inverte melhor
quando o email declara o que quer).

### 6.6 O canal está por estrear

Um email enviado desde 11/06/2026. Zero difusões, zero webhooks, zero moldes no painel (os
moldes vivem no código — decisão correta, fica registada). **Sem webhook não há registo de
bounces nem de queixas**, e o primeiro sinal de que um endereço está morto vai ser um cliente a
dizer que não recebeu. Vale um webhook para `email.bounced` e `email.complained` antes de o
volume crescer.

---

## 7. Vercel — onde tudo isto se configura

**Projeto:** `recibo-certo` (`prj_sJbb…`), equipa `henpassquesoris-projects`, plano Hobby,
Next.js, Node 24. **Domínios:** `www.recibocerto.pt`, `recibocerto.pt` e três `*.vercel.app`.
Último deploy de produção `READY`.

Nada de errado. Fica registado para a execução, porque a Vercel é onde tudo o resto acontece:

- **O DNS é aqui.** Os NS do domínio são `ns1/ns2.vercel-dns.com`: todos os registos do §3 e
  do §5.4 acrescentam-se no painel de domínios da Vercel.
- **Os URLs `*.vercel.app`** são normais e não vazam para o utilizador (o `origem.ts` já força
  a origem canónica). Não há nada a esconder — só a não usar em nada que vá para um terceiro.
- **A variável `NEXT_PUBLIC_APP_URL`** tem de continuar em `https://www.recibocerto.pt`. É de
  lá que saem os URLs de retorno da Stripe.

---

## 8. Os ativos de marca em falta — a causa comum

Três achados deste relatório (o logótipo em falta na Stripe, o logótipo em falta no Google, o
`✓` em CSS nos emails) têm **a mesma causa**: em `public/` só existe `logo.svg`, e em
`src/app/` só `icon.svg`. **Não há um único PNG da marca no projeto.** E os três destinos
exigem raster:

| Destino | Requisito | Fonte |
|---|---|---|
| Ícone da Stripe | Quadrado, **JPG/PNG, < 512 KB, ≥ 128×128** | documentação da Stripe |
| Logótipo da Stripe | Não quadrado, mesmas regras | documentação da Stripe |
| Logótipo do Google (consentimento) | **JPG/PNG/BMP, 120×120 recomendado, ≤ 1 MB** | Google Cloud |
| Emails | PNG (muitos clientes bloqueiam SVG) | prática corrente |
| `apple-touch-icon` | **PNG 180×180** — o iOS **não** lê SVG | — |

Dois defeitos relacionados em `src/app/layout.tsx:84-90`: `apple` aponta para `/icon.svg`, que
o iOS ignora (quem adiciona o site ao ecrã principal fica com um ícone genérico); e **não
existe manifest** — sem ele, a app instalada não tem nome, nem cor de tema, nem ícone próprio.

**Proposta:** uma pasta `public/marca/` com `icone-512.png`, `icone-180.png`, `icone-120.png`,
`logotipo-512.png` e `logotipo-email.png`, gerados por script a partir dos SVG existentes
(consistência por construção, e não por alguém se lembrar de exportar outra vez), mais um
`app/manifest.ts`. É a peça que desbloqueia três correções de uma vez.

---

## 9. Decisões que são tuas

Três coisas que este relatório não deve decidir sozinho.

### 9.1 «ReciboCerto» ou «Recibo Certo»?

Hoje coexistem: **ReciboCerto** no site, no logótipo e no `CLAUDE.md` (regra 8); **Recibo
Certo** no nome da conta Stripe, no `display_name` do painel, no nome do produto («Recibo Certo
Plus»), no nome do projeto Supabase e na conta Google (`recibocerto.pt@gmail.com` → «Recibo
Certo»). E ainda um terceiro no portal da Stripe: **«ReciboCerto Pro»**, que não existe.

> **Recomendação: ReciboCerto**, uma palavra, em todo o lado — é o que a regra 8 do `CLAUDE.md`
> manda e é o que o cliente vê no site. Mudar nos painéis é gratuito e demora minutos:
> `display_name` da Stripe, nome do produto, nome do projeto Supabase, nome da app no Google.

### 9.2 Pagar $35/mês pelo domínio Supabase?

Ver o quadro de opções em §4.1. **Recomendação:** tentar primeiro a verificação de marca no
Google (grátis). Só pagar se ela for recusada por incoerência de domínio.

### 9.3 Que caixa de correio para o domínio?

Ver §3.2. **Recomendação:** reencaminhamento agora, Workspace quando houver receita.

---

## 10. Plano de execução

### Fase 0 — uma tarde, 0 €, sem deploy

Só painéis e DNS. Nada disto toca no código.

1. Stripe → *Marca*: cor `#177E5E`, acento `#EDEAE0`, ícone e logótipo (depende do §8).
2. Stripe → *Detalhes públicos*: `support_email`, `support_url`, `url` para o `www`.
3. Stripe → email da conta: tirar `contacto@refugioanimal.pt`.
4. Stripe → representante: tirar `support@lostlettersroom.com`.
5. Stripe → arquivar os dois preços antigos.
6. Google Cloud → *Branding*: nome, logótipo, email de apoio, domínios autorizados, links
   legais. **Pedir a verificação.**
7. DNS na Vercel: MX do reencaminhamento + `_dmarc` com `p=none`.
8. Supabase → ligar a proteção de palavras-passe vazadas.

### Fase 1 — uma semana, código

9. Ativos de marca em PNG + `manifest.ts` + `apple-icon` (§8) — **desbloqueia 1 e 6.**
10. `BRAND` → `#177E5E` nos emails e no `logo.svg` (§6.1).
11. Os 30 acentos (§6.2).
12. `reply_to`, versão em texto, `List-Unsubscribe`, link para desligar alertas (§6.3).
13. `recibocerto.pt@gmail.com` → `apoio@recibocerto.pt` nos 9 ficheiros (§3.2).
14. SMTP da Resend na Supabase + os 6 moldes de autenticação em pt-PT (§4.2, §4.3).
15. `customer_update` no `needsUpdate` do portal (§5.3).

### Fase 2 — depois de a Fase 1 assentar

16. Ligar a confirmação de email na Supabase (**só depois do 14**).
17. Fluxo de recuperação de palavra-passe no produto (§4.2).
18. Domínio de email da Stripe (**depende do DMARC do passo 7**).
19. Webhook de bounces na Resend.
20. Modo escuro nos emails.
21. Imagem e `marketing_features` no produto Stripe.
22. Decidir sobre o domínio personalizado da Supabase, à luz da resposta do Google.

---

## 11. Custos

| Item | Custo | Necessário? |
|---|---|---|
| Marca da Stripe, detalhes públicos, DMARC, branding do Google | **0 €** | Sim — é a maioria do relatório |
| Reencaminhamento de email | 0 € a ~3 €/mês | Sim |
| Google Workspace (alternativa) | ~6 €/utilizador/mês | Opcional |
| Domínio de email da Stripe | **0 €** | Recomendado (só precisa de DNS) |
| Supabase Pro + domínio personalizado | **$35/mês** | Só se a verificação do Google falhar |
| Resend | plano atual chega | — |

**O grosso desta auditoria corrige-se com zero euros.**

---

## 12. Como verificar depois

| Verificação | Como |
|---|---|
| Ecrã do Google | Entrar com o Google numa janela anónima e ler o que diz depois de «Prosseguir para» |
| MX ativo | `curl "https://dns.google/resolve?name=recibocerto.pt&type=MX"` devolve resposta |
| DMARC publicado | `curl "https://dns.google/resolve?name=_dmarc.recibocerto.pt&type=TXT"` |
| Marca da Stripe | Abrir um checkout de teste: botão verde `#177E5E` e logótipo |
| Emails da Stripe | Enviar um recibo de teste pelo painel e ver o remetente |
| Portal | Abrir o portal e confirmar o título e os links legais |
| Emails do produto | `node scripts/render-emails.mjs` (ou `/api/admin/emails-teste`) e comparar a cor com o site |
| Acentos | Nenhuma ocorrência de `isencao`, `critico`, `Seguranca`, `Guardiao` em `templates.ts` |
| Confirmação de email | Registar com um endereço externo e receber, em pt-PT, do `recibocerto.pt` |
| Recuperação | Pedir nova palavra-passe e conseguir entrar |

E o de sempre antes de fechar: `npm run build`, `npm audit --audit-level=high` (0 high) e
`npm run movel:e2e`. Ver a skill `verificacao-e-qualidade`.

---

## 13. Anexos

### 13.1 Cores da marca (a fonte é `tailwind.config.ts`)

| Símbolo | Valor | Contraste com branco | Uso |
|---|---|---|---|
| `brand` | `#177E5E` | 5,02:1 ✅ AA | Botões, links, acentos |
| `brand-dark` | `#0F6E56` | — | Estados carregados |
| `brand-deep` | `#0A4A39` | — | Texto sobre verde claro |
| `brand-light` | `#E1F5EE` | — | Fundos suaves |
| `brand-mint` | `#9FE1CB` | — | Acentos no modo escuro |
| `cream` (papel) | `#EDEAE0` | 14,49:1 com `ink` | Fundo — e o acento da Stripe |
| `ink` | `#1A1A17` | — | Texto |
| ~~`#1D9E75`~~ | **descontinuada** | 3,39:1 ❌ | Ainda em `templates.ts:3` e `logo.svg:8` |

### 13.2 Registos DNS a acrescentar (painel de domínios da Vercel)

```
TXT   _dmarc   v=DMARC1; p=none; rua=mailto:dmarc@recibocerto.pt
MX    @        (conforme o fornecedor de caixa/reencaminhamento escolhido)
```

Depois, para o domínio de email da Stripe, o painel dela indica um TXT de propriedade e dois
CNAME (*Mail From* e DKIM). **A política DMARC não pode levar `aspf=s`** — a Stripe não suporta
alinhamento estrito de SPF.

### 13.3 Fontes consultadas

- Supabase — [Custom domains](https://supabase.com/docs/guides/platform/custom-domains) ·
  [Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp) ·
  [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) ·
  [Pricing](https://supabase.com/pricing)
- Stripe — [Branding your account](https://docs.stripe.com/get-started/account/branding) ·
  [Custom email domain](https://docs.stripe.com/get-started/account/email-domain)
- Google Cloud — [OAuth app branding e verificação](https://support.google.com/cloud/answer/10311615)
- APIs ao vivo da Stripe, Supabase, Resend e Vercel; DNS via `dns.google` e `cloudflare-dns.com`

---

*Auditoria feita a 31 de agosto de 2026 contra os sistemas ao vivo. Os valores de conta,
domínio e DNS aqui citados foram lidos nessa data e podem mudar — reconfirmar antes de agir
sobre qualquer um deles.*
