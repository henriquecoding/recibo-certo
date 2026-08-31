# SEO — ReciboCerto

Guia operacional de visibilidade orgânica. Lê isto antes de mexer em metadados,
sitemap ou esquemas. Para o design/voz, ver `DESIGN.md` e as skills.

---

## Diagnóstico (porque é que o site não aparecia no Google)

Verificámos o código **e** o site em produção:

- `robots.txt` ao vivo **permite** rastreio (só bloqueia `/dashboard`, `/admin`, `/api`).
- Não há `noindex` em páginas públicas — só nas privadas, via `X-Robots-Tag` (`next.config`).
- Os metadados, o JSON-LD e o conteúdo (guias + ferramentas) **já eram fortes**.
- Mesmo assim, `site:recibocerto.pt` no Google devolvia **zero** resultados.

**Conclusão:** o bloqueio não era de código. É o padrão clássico de um **domínio
novo, nunca verificado no Google Search Console, com o sitemap nunca submetido e
sem backlinks**. O Google ainda não tinha descoberto o domínio. Isto resolve-se
com uma ação no Search Console (abaixo) + tempo + alguns links de entrada.

> O "Motor de SEO Autonómico" (IA que reescreve e publica conteúdo fiscal sozinha)
> foi **rejeitado**: viola a regra de ouro nº 1 (nada de dados fiscais
> auto-gerados num site YMYL). A monitorização é assistida e só-leitura
> (`npm run seo:audit`); a decisão de aplicar é sempre humana.

---

## O que já está no código (feito)

- **Sitemap completo e sem divergências** — deriva de um registo único,
  `PUBLIC_ROUTES` em `src/lib/seo.ts` (`src/app/sitemap.ts` consome-o).
- **Imagem social** gerada por código (`src/app/opengraph-image.tsx` +
  `twitter-image.tsx`) — substitui o antigo `/og-home.png` que não existia.
- **Logótipo** real em `public/logo.svg` (usado pelo schema `Organization`).
- **Verificação de propriedade** por variável de ambiente (ver abaixo).
- **Dados estruturados**: `WebSite`, `Organization`, `SoftwareApplication`,
  `FAQPage` (home) e `BreadcrumbList` + `Article` nos guias.
- **Auditoria só-leitura**: `npm run seo:audit`.

---

## Passos que só tu podes dar (operacional)

### 1. Google Search Console — verificar a propriedade

1. Entra em <https://search.google.com/search-console> com a tua conta Google.
2. Adiciona a propriedade. Recomendado: **prefixo de URL** `https://recibocerto.pt`.
3. Escolhe o método **"Tag HTML"**. O Google dá-te uma meta tag como:
   `<meta name="google-site-verification" content="ABC123..." />`.
4. Copia **só** o valor `content` e acrescenta-o à lista embebida em
   `src/app/layout.tsx` (`GOOGLE_SITE_VERIFICATION`). Faz um novo deploy: sai
   um `<meta name="google-site-verification">` por token, em todas as páginas.
5. Volta ao Search Console e carrega em **Verificar**.
   - Alternativa sem deploy: método **DNS** (registo TXT no domínio). Igualmente válido.

#### Mais do que uma conta Google

Cada conta que reclama o site tem o **seu** token e valida contra a **sua** meta
tag. Os tokens convivem: acrescenta-se um à lista, não se troca o que lá está.
**Nunca retirar um token de uma conta que ainda deve manter a propriedade** — o
Google revalida periodicamente, e a propriedade cai quando a prova desaparece.

Contas atualmente com o site reclamado:

| Conta | Prova | Onde vive |
| --- | --- | --- |
| Principal | Meta tag `i_bvY0e1…` | `src/app/layout.tsx` |
| Segunda | Meta tag `O5XHXItH…` | `src/app/layout.tsx` |
| Segunda | Ficheiro HTML | `public/google3874ac9e9ed1ae13.html` → `/google3874ac9e9ed1ae13.html` |

A segunda conta tem duas provas independentes de propósito: se um dia
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for definida com um único token (a env
var **substitui a lista inteira** — aceita vários separados por vírgula), o
ficheiro HTML sustenta a propriedade sozinho. O ficheiro sai com
`X-Robots-Tag: noindex` (`next.config.mjs`) para não ser indexado como página;
isso não afeta a validação, que lê o ficheiro diretamente.

Um terceiro caminho, que não passa por este repositório: o registo **DNS TXT**
`google-site-verification=…` na zona de `recibocerto.pt`, configurado no
fornecedor do domínio. Verifica o domínio inteiro (todos os subdomínios e
protocolos) e sobrevive a qualquer alteração no código.

### 2. Submeter o sitemap

No Search Console → **Sitemaps** → introduz `sitemap.xml` → **Enviar**.
(O URL completo é `https://recibocerto.pt/sitemap.xml`.)

### 3. Forçar a indexação da página inicial

Search Console → **Inspeção de URL** → cola `https://recibocerto.pt/` →
**Pedir indexação**. Repete para 2–3 páginas-chave (ex.: `/guias`, `/precos`).

> A indexação não é imediata: pode levar de dias a algumas semanas num domínio
> novo. Não há atalho garantido — o que acelera é ter o sitemap submetido e
> alguns links de entrada.

### 4. Bing Webmaster Tools (opcional, rápido)

1. <https://www.bing.com/webmasters> → adiciona o site (podes importar do GSC).
2. Se usares o método meta tag, define:
   ```
   NEXT_PUBLIC_BING_SITE_VERIFICATION=...
   ```
3. Submete o mesmo `sitemap.xml`.

### 5. Primeiros backlinks (autoridade)

Sem links de entrada, o domínio fica fraco. Ações de baixo esforço:

- Diretórios/citações nacionais com NAP consistente (nome, contacto, URL).
- Perfis sociais e de produto (LinkedIn da marca, Product Hunt, etc.).
- Partilhar as **ferramentas gratuitas** (calculadora, decisores) em comunidades
  de freelancers/contabilidade — são "ímanes" naturais de links.

---

## Manutenção

- Sempre que criares uma página pública nova, **adiciona o slug ao registo** em
  `src/lib/seo.ts` (`GUIA_SLUGS` / `FERRAMENTA_SLUGS` / `PUBLIC_ROUTES`).
- Corre `npm run seo:audit` antes de concluir — falha se houver assets partidos
  ou páginas fora do sitemap.
- Números fiscais visíveis vêm **sempre** de `src/lib/fiscal-data.ts`. Nunca os
  escrevas à mão no conteúdo (ver skill `fiscalidade-pt-2026`).
