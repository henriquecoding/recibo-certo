# Configurar `DOCUMENTOS_HMAC_SEGREDO` na Vercel

Os botões «PDF» não funcionam sem esta variável — nem o do simulador de
vencimento, nem o do mapa de recibos, nem o da declaração de IRS. Este guia leva-te do zero ao PDF
descarregado, com a forma de confirmar cada passo.

Demora cerca de cinco minutos.

---

## Para que serve

O PDF é composto por uma **função Python** (`api/compor-documento.py`) que vive
na mesma implantação da aplicação. Quando alguém carrega em «PDF»:

```
browser  ──▶  /api/documentos/vencimento   (Next: sessão, direito, cálculo)
         ├─▶  /api/documentos/recibos      (idem, para o mapa de recibos)
         └─▶  /api/documentos/irs          (idem, para a declaração de IRS)
                        │
                        │  POST assinado com HMAC-SHA256
                        ▼
              /api/compor-documento        (Python: compõe o PDF)
                        │
                        ▼
              PDF de volta ao browser
```

As três rotas usam o **mesmo** segredo e o **mesmo** compositor: só muda o
`tipo` que enviam (`vencimento`, `recibos` ou `irs`) e, com ele, o modelo
tipográfico. Configurar a variável liga as três de uma vez.

A assinatura existe porque, sem ela, **qualquer pessoa** podia mandar compor um
documento com o cabeçalho da Recibo Certo e o conteúdo que quisesse — bastava
descobrir o endereço. O segredo é a chave que prova que o pedido veio da nossa
rota, e não de fora.

Por isso a **mesma** variável tem de existir nos dois lados. Como a função e a
aplicação vivem no mesmo projeto da Vercel, define-se **uma vez** e serve as
duas.

> **Enquanto a variável não existir**, a função responde `401` a todos os
> pedidos de composição e o botão «PDF» mostra «Não foi possível compor o
> relatório». A folha de cálculo e os CSV continuam a funcionar — são gerados
> no browser e não dependem disto.

---

## Passo 1 · Gerar o segredo

No teu terminal:

```sh
openssl rand -hex 32
```

Sai uma linha de 64 carateres, por exemplo:

```
7f3a91c2e5b84d06af12c7e93b5c408a1c9f2e7b3d5a86c04e1f9b7d2a35c68b
```

**Não uses uma palavra que consigas decorar.** Isto não é uma palavra-passe que
alguém escreve — é uma chave que só o servidor lê. Quanto mais aleatória,
melhor.

Se não tiveres `openssl` à mão, serve igualmente:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia o resultado. Vais precisar dele no passo seguinte e **não o vais poder
ver outra vez** depois de guardado na Vercel.

---

## Passo 2 · Guardar na Vercel

1. Abre <https://vercel.com/henpassquesoris-projects/recibo-certo>
2. **Settings** (no topo) → **Environment Variables** (no menu da esquerda)
3. Preenche:

   | Campo | Valor |
   |---|---|
   | **Key** | `DOCUMENTOS_HMAC_SEGREDO` |
   | **Value** | a linha de 64 carateres do passo 1 |
   | **Environments** | ✅ Production ✅ Preview ✅ Development |

4. **Save**

### Porquê os três ambientes

- **Production** — é o que serve `recibocerto.pt`. Sem esta, nada funciona para
  quem paga.
- **Preview** — cada branch tem a sua implantação. Sem esta, testar o PDF numa
  branch antes de fazer merge dá sempre erro, e parece um defeito do código.
- **Development** — para `vercel dev`, se um dia o usares.

Podes usar **o mesmo valor nos três** ou valores diferentes. Diferentes é
ligeiramente mais seguro (um segredo de preview exposto não compromete a
produção); igual é mais simples. Para este caso, igual chega.

---

## Passo 3 · Voltar a implantar

As variáveis de ambiente **só entram numa implantação nova**. A que está no ar
foi construída sem ela e continua sem ela até haver outra.

Na Vercel:

1. **Deployments** (no topo)
2. Na implantação de produção mais recente, no menu `⋯` à direita
3. **Redeploy** → confirma

Não precisas de marcar «Use existing Build Cache» nem de o desmarcar — tanto
faz para variáveis de ambiente.

Em alternativa, qualquer novo `git push` para `main` também serve.

---

## Passo 4 · Confirmar que ficou

### 4.1 · A função responde?

```sh
curl -s https://www.recibocerto.pt/api/compor-documento
```

Deve devolver:

```json
{"compositor": "typst", "normas": ["a-2a", "ua-1"], "fontes": true}
```

- `fontes: true` — as fontes da marca foram para o pacote da função. Se vier
  `false`, o `includeFiles` do `vercel.json` deixou de as levar e o PDF sairia
  com fontes substitutas.
- Este pedido **não** exige o segredo: é só o sinal de vida.

### 4.2 · A assinatura está a ser aceite?

Um pedido sem assinatura tem de ser **recusado** — é isso que confirma que a
defesa está ligada:

```sh
curl -s -X POST https://www.recibocerto.pt/api/compor-documento \
  -H 'content-type: application/json' \
  -d '{"tipo":"vencimento","dados":{}}'
```

Resposta esperada:

```json
{"erro": "Pedido não autenticado."}
```

Se em vez disso vier um PDF ou um erro `422`, **a variável não está a ser
lida** — a função está a aceitar pedidos de qualquer pessoa. Volta ao passo 2.

### 4.3 · O botão funciona?

1. Entra em <https://www.recibocerto.pt/dashboard/recibo-vencimento> com uma
   conta **com Plus**
2. Preenche um recibo qualquer
3. **Confirma e guarda** → **PDF**

Deve descarregar um ficheiro com um nome como:

```
recibocerto-relatorio-de-vencimento-agosto-de-2026-RC-2026-VNC-8F3K2M.pdf
```

E, por baixo dos botões, aparece «Relatório emitido · referência
RC-2026-VNC-8F3K2M».

### 4.4 · E os outros dois documentos?

1. Entra em <https://www.recibocerto.pt/dashboard/recibos> com a mesma conta
2. Garante que tens pelo menos um recibo guardado
3. **PDF**

Descarrega um ficheiro com uma referência começada por `RC-2026-RCB-` e aparece
«Mapa emitido · referência …».

Para a declaração de IRS: <https://www.recibocerto.pt/dashboard/simulador>,
etapa de revisão, botão **PDF** — referência começada por `RC-2026-IRS-`.

Se um deles funciona e outro não, o problema **não é do segredo**: é do
documento em si. Ver os registos da rota respetiva.

---

## Se alguma coisa correr mal

| O que vês | O que é | O que fazer |
|---|---|---|
| «Inicia sessão para descarregar o relatório.» | Não há sessão iniciada. | Entrar na conta. |
| «O relatório em PDF faz parte do Plus.» | A conta não tem Plus. O servidor devolveu 402 — o gate está a funcionar. | Nada. É o comportamento certo. |
| «Não foi possível compor o relatório.» ou «…o mapa.» | A função devolveu erro. Quase sempre: o segredo não está definido, ou está diferente entre a app e a função. | Repetir os passos 2 e 3, e confirmar com o 4.2. |
| «Não foi possível contactar o servidor.» | A função não respondeu de todo. | Ver o estado da implantação na Vercel. |
| O PDF sai, mas a referência não aparece em `/v/…` | A tabela `documentos_emitidos` não existe ou o `SUPABASE_SERVICE_ROLE_KEY` não está definido. | Aplicar `supabase/migrations/20260802_documentos_emitidos.sql`. O PDF sair na mesma é de propósito: perder o registo é mau, negar o ficheiro já composto é pior. |

### Ver o erro exato

Na Vercel: **Logs**, filtrar por `/api/compor-documento` ou
`/api/documentos/vencimento`. A rota Next devolve o motivo em `detalhe` quando
a composição falha.

---

## Trocar o segredo mais tarde

Podes trocá-lo a qualquer momento — não há nada guardado que dependa do valor
antigo. Os documentos já emitidos continuam válidos: a impressão digital que
está impressa neles é dos **dados**, calculada com SHA-256 sem segredo nenhum,
e a página `/v/` continua a confirmá-los.

Passos: gerar novo (passo 1), substituir na Vercel (passo 2), voltar a implantar
(passo 3). Durante os segundos entre a implantação nova ficar pronta e a antiga
sair de circulação, um pedido pode falhar; se isso te preocupar, faz a troca
fora das horas de maior uso.

---

## As outras variáveis desta funcionalidade

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DOCUMENTOS_HMAC_SEGREDO` | **Sim** | Assina e verifica cada pedido de composição. |
| `SUPABASE_SERVICE_ROLE_KEY` | Já deve existir | Regista a emissão e alimenta a página `/v/`. |
| `NEXT_PUBLIC_SITE_URL` | Não | O URL de verificação impresso no PDF. Por omissão, `https://recibocerto.pt`. |
| `DOCUMENTOS_COMPOSITOR_URL` | Não | Aponta para outro compositor. Por omissão usa a própria implantação — é o que queres. |
