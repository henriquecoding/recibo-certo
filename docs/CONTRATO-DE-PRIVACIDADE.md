# Contrato de privacidade da plataforma de contabilistas

> **Estado:** vigente desde 2026-08-20.
> **Substitui:** as partes de `ESTRATEGIA-INTERMEDIACAO.md` e
> `PLATAFORMA-CONTABILISTAS.md` que descrevem quem vê o quê.
> Esses documentos passam a contar a HISTÓRIA; este diz a REGRA.

## Porque é que este documento existe

A auditoria de 2026-08-20 encontrou o mesmo problema em cinco sítios: a
interface prometia uma coisa, a base de dados permitia outra, os
comentários no código descreviam uma terceira, e a documentação uma
quarta. Nenhuma delas estava desatualizada por descuido — todas foram
verdade em momentos diferentes, e ficaram.

Comentários falsos sobre fronteiras de privacidade são a pior espécie de
dívida técnica que este projeto pode ter: alguém lê-os, acredita, e
escreve código em cima de uma garantia que já não existe. Foi exatamente
assim que uma migração ficou a afirmar que o formulário do caso mostrava
uma caixa de consentimento que nunca existiu.

**A regra deste documento:** quando o comportamento mudar, muda-se AQUI
primeiro, e os testes apontam para aqui. Um comentário no código que
descreva uma fronteira tem de citar a secção deste ficheiro ou a migração
que a impõe — nunca contar a história por outras palavras.

---

## 1. Os contactos do contabilista

> Antes de o contabilista aceitar a pessoa como cliente, o que é público
> sobre ele é **nome, OCC e LinkedIn**. Email, telefone, site e qualquer
> outro canal direto só existem depois da aceitação.

### 1.1 Matriz de acesso

| Quem observa | Nome | OCC + selo | LinkedIn | Email | Telefone | Site |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Sem sessão | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Autenticado sem relação | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Convite ou pedido pendente | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cliente **ativo** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cliente **pausado** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vínculo terminado | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| O próprio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contabilista suspenso (visto por qualquer um) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**O estado `pausado` mantém os contactos.** É uma decisão explícita, e não
um efeito do código: uma pausa é uma pausa no trabalho, não uma quebra de
confiança, e quem já tinha o telefone do seu contabilista não o perde por
estar entre épocas. O que a pausa trava são ações operacionais novas.
Se um dia «pausado» passar a significar suspensão de confiança, muda-se
esta linha, muda-se `vinculo_nao_terminado`, e muda-se a asserção com o
mesmo nome em `supabase/tests/completo/02-contrato-publico-de-contactos.sql`.

### 1.2 Porque é que o LinkedIn é público

Porque é o instrumento de validação profissional que **não depende de
nós**. Quem quiser confirmar quem está do outro lado consegue fazê-lo sem
pedir autorização a ninguém, e sem essa possibilidade o diretório passa a
exigir confiança cega na plataforma.

Isso vale para a URL canónica do perfil (`linkedin.com/in/…`) e para a
fotografia. **Não** vale para a identidade técnica: `linkedin_subject` (o
`sub` do OIDC, um identificador de correlação), claims, tokens ou
timestamps internos nunca saem.

### 1.3 O perfil profissional continua público

Bio, título, especialidades, modalidades, idiomas, região, experiência,
disponibilidade e preço indicativo **não são contactos** — são o que
ajuda alguém a escolher um profissional. Tirá-los do contrato público não
fecharia uma fuga: fecharia o diretório.

A separação técnica é essa, e não «público vs. privado» em geral:
`contabilistas_publico` é o perfil publicável; os canais diretos saem por
`contactos_do_contabilista`.

### 1.4 Onde isto é imposto

| Camada | Onde |
|---|---|
| Contrato público | View `contabilistas_publico` — lista de colunas explícita |
| Fronteira da tabela | Sem política nem privilégio para `anon` em `contabilistas` |
| Dono da view | Papel `contrato_publico`, sem login e sem `BYPASSRLS` |
| Canais diretos | `contactos_do_contabilista(uuid)`, exige vínculo vivo |
| Guarda | `assert_contrato_publico_contabilistas()` |
| Migração | `20260820165708_o_contrato_publico_fecha_a_tabela.sql` |
| Prova (banco) | `supabase/tests/completo/02-contrato-publico-de-contactos.sql` |
| Prova (produção) | `scripts/check-contrato-publico.mjs --exigir-ambiente` |

---

## 2. Os contactos do cliente

> Uma pessoa pode escrever o que quiser numa mensagem. A **ficha
> estruturada** de contactos só segue por decisão explícita, e nasce
> desligada.

### 2.1 As duas coisas, que não são a mesma

**Contacto escrito numa mensagem.** Segue tal e qual. É uma decisão de
quem escreve, no momento em que escreve, e não é papel da plataforma
desfazê-la. Existiu um gatilho que recusava esse texto; saiu em
`20260818210000_fim_da_mediacao`, e com ele saiu a obrigação de lermos
tudo para o manter de pé.

**Ficha estruturada** (`caso_contactos`: email, telefone, morada). Só
chega aos contabilistas com o caso encaminhado enquanto
`casos.partilha_contactos` for verdadeiro. Nasce **falso** desde
`20260820165820`, o formulário do caso mostra a escolha por marcar, e o
detalhe do caso liga e desliga com efeito imediato — a política lê a
coluna, não uma cópia dela.

### 2.2 O que o contabilista recebe sempre

**Nome e NIF.** São identificação, não canal: com eles não se telefona a
ninguém, e sem eles não se faz o trabalho nem se orçamenta com seriedade.

---

## 3. As conversas

- As mensagens nascem **entregues**. Nenhuma passa por revisão nossa.
- A administração **não lê** a conversa normal. Não é uma política
  interna: é a regra de acesso da base de dados, e uma consulta de
  administrador sobre essa tabela não devolve nada.
- A única exceção abre-se por dentro: uma mensagem **denunciada** — e
  apenas essa — passa a poder ser lida, para se poder analisar o que foi
  reportado.

Imposto em `20260818210000_fim_da_mediacao.sql`.

---

## 4. Ficheiros

- Privados, organizados por relação, entregues por rotas autorizadas com
  `attachment`, `nosniff`, sem cache e URLs assinadas curtas.
- Terminar o acompanhamento fecha o acesso, sem exceção.
- **A retenção é verificável:** os objetos sem nada que os reclame são
  removidos pela Storage API, e a metadata só diz «apagado» depois de o
  objeto ter desaparecido. Ver
  `20260820165802_a_purga_passa_pela_storage_api.sql`.

⚠️ A definição de órfão vive numa função só —
`public.anexo_e_orfao(balde, caminho)`. O balde `contabilista-anexos`
serve mensagens, casos **e** propostas. **Uma tabela nova que guarde
caminhos tem de ser acrescentada lá**, ou os ficheiros dela serão
apagados duas horas depois de serem enviados.

---

## 5. Dados fiscais

Ligar-se a um contabilista **não** lhe dá acesso a recibos, cenários ou
simulações guardadas. Ele vê o que lhe for enviado, um envio de cada vez,
e cada envio é um *snapshot* — nunca uma ligação aos dados vivos. Cada
partilha é revogável a qualquer momento.

---

## 6. Como mudar alguma coisa aqui

1. Muda-se este documento primeiro.
2. Muda-se a migração que impõe a regra (forward-only — nunca reescrever
   uma migração já aplicada).
3. Muda-se a asserção em `supabase/tests/completo/`.
4. Muda-se a microcopy, e **só então** o código que a mostra.

A ordem não é burocracia. Uma frase de interface sobre privacidade é o que
a pessoa lê antes de decidir; alterada depois do comportamento, foi
consentimento obtido com informação falsa.
