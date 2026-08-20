# Da ligação direta à intermediação, e de volta — o histórico completo

> ## ⚠️ ESTADO: **REVERTIDO.** Ler o aviso antes do resto.
>
> Este documento descreve o modelo de intermediação que vigorou entre as
> migrações `051`/`052` e a migração `20260818210000_fim_da_mediacao`.
> **Já não é o que o produto faz.** Fica porque explica decisões que ainda
> estão no esquema — a separação de `casos` e `caso_contactos`, o ciclo de
> vida do caso, a leitura confirmada da proposta — e porque a razão da
> reversão só se percebe lendo o que se tinha construído.
>
> ### O que caiu, e porquê
>
> A frase que este documento assume com todas as letras, no §2:
>
> > O custo é honesto e tem de ser dito ao cliente: **a plataforma lê o que
> > é escrito.**
>
> Era honesta, e era o problema. Obrigava uma pessoa da administração a ler
> conversa confidencial que não lhe foi dirigida — de dívidas, divórcios,
> heranças e dinheiro que não chegou — como trabalho de rotina. Nenhuma
> salvaguarda vale isso.
>
> ### O que passou a valer
>
> | | Modelo de intermediação (este documento) | Modelo atual |
> |---|---|---|
> | Escolha | O cliente descreve; a administração encaminha | O cliente **escolhe** a quem envia, no diretório |
> | Conversa | Mediada: cada mensagem submetida, revista, aprovada | **Direta.** Nasce entregue |
> | Quem lê | A administração lê tudo | **Ninguém.** Zero linhas para um `select` de administrador |
> | Exceção | — | Uma mensagem **denunciada** por quem está no caso |
> | Contactos | Nunca chegam ao contabilista | Do cliente para dar, num interruptor revogável que **nasce desligado** (ver `20260820092000`) |
> | Documentos | Libertados pela triagem | Entregues ao anexar; retiráveis por quem os anexou |
>
> ### O que se manteve, e vale a pena não voltar a discutir
>
> - `caso_contactos` continua **numa tabela separada** de `casos`. A
>   separação nunca foi o problema — é ela que faz com que um `select`
>   distraído não devolva um telefone. O que mudou foi passar a existir um
>   caminho **declarado**, que o cliente abre e fecha.
> - A proposta continua a exigir **leitura confirmada** antes de ser
>   decidida, e a exigência vive na RPC.
> - O **teto de três** contabilistas por caso continua no gatilho.
> - O ciclo de vida do caso e a expiração de propostas ficam como estavam.
>
> A migração `20260818210000` tem o raciocínio completo no cabeçalho, e os
> testes adversariais em `supabase/tests/12-intermediacao.sql` provam as
> garantias novas — incluindo que `rever_mensagem` e `encaminhar_caso`
> deixaram de existir.
>
> ### ⚠️ Onde está a regra de hoje
>
> **Neste documento, não.** A partir daqui é tudo história. Quem quiser
> saber quem vê o quê — hoje — lê
> [`CONTRATO-DE-PRIVACIDADE.md`](./CONTRATO-DE-PRIVACIDADE.md), que é a
> única fonte da regra em vigor e diz onde cada fronteira é imposta.
>
> Esta separação foi feita a 2026-08-20, depois de uma auditoria encontrar
> a mesma pergunta respondida de quatro maneiras diferentes — na
> interface, na base de dados, nos comentários do código e aqui.

---

## O documento original

## 1. O que muda, numa frase

Hoje o cliente escolhe um contabilista e falam livremente. Passa a ser: o
cliente **descreve o caso**, a plataforma **intermedeia tudo o que é dito**, e o
contabilista responde com uma **proposta** — sem nunca receber os contactos.

Não é uma funcionalidade nova por cima do que existe. É outra relação, e por
isso convém dizer com precisão o que se mantém e o que cai.

| | Modelo atual (PR #102) | Modelo de intermediação |
|---|---|---|
| Escolha | O cliente escolhe o contabilista | O cliente descreve o caso; o diretório serve para **ver quem existe**, não para escolher |
| Identidade | O cliente dá o nome que quiser | O cliente dá **nome, NIF e contactos completos** — o contabilista recebe **nome e NIF** |
| Quem vê os contactos | O contabilista | **Só a plataforma.** Email, telefone e morada nunca chegam ao contabilista |
| Conversa | Livre, direta, em tempo real | **Mediada**: quem quer dizer algo submete, a administração analisa e encaminha |
| Resultado | Consultas marcadas | **Proposta** com valor, contrato e anexos |
| Aceitação | Implícita | Só depois de **ler até ao fim** e confirmar |
| Reencontro | Contacto direto fora da plataforma | Tem de voltar à conta no ReciboCerto |

## 2. Porque é que isto é mais defensável do que parece

O modelo anterior tinha um problema que a auditoria da PR #102 apanhou de
várias maneiras (PR-01 a PR-05): assim que duas pessoas falam livremente, a
plataforma passa a guardar conteúdo que não controla, sobre terceiros que não
consentiram, e a promessa de privacidade fica dependente de as pessoas se
portarem bem.

A intermediação inverte isso:

- **Os contactos nunca saem.** Não é uma política, é a ausência de um caminho:
  o contabilista não tem por onde os ler.
- **Nada é dito sem passar por revisão.** Uma mensagem só existe para o outro
  lado depois de aprovada, o que resolve à nascença o problema de conteúdo não
  moderado entre partes.
- **A proposta é um documento, não uma conversa.** Tem valor, tem anexos, tem
  aceitação registada. É auditável.
- **O canal tem dono.** Se o cliente quiser voltar, volta pela conta; se o
  contabilista quiser mais clientes, o sítio é a plataforma.

O custo é honesto e tem de ser dito ao cliente: **a plataforma lê o que é
escrito.** Não é um canal privado, e chamar-lhe «chat» seria enganador. O nome
importa (§7).

## 3. Modelo de domínio

### 3.1 O caso, e a separação que faz o trabalho todo

A garantia central — o contabilista nunca vê contactos — não pode ser uma
coluna que alguém se lembra de não devolver no `select`. É **duas tabelas**:

A fronteira **não** é entre saber quem é a pessoa e não saber. Um contabilista
precisa do nome e do NIF para fazer o trabalho e para orçamentar com seriedade;
escondê-los seria fingir que se pode trabalhar às cegas. A fronteira é o
**canal** — o que lhe permitiria continuar a conversa fora daqui.

```
caso_contactos           ← só o cliente e a administração
  caso_id (PK/FK)
  email, telefone, morada

casos                    ← o que o contabilista vê
  id, cliente_id
  referencia   «RC-2026-0041»
  nome_completo, nif    ← identificação, não canal
  assunto, situacao, area, urgencia, orcamento_previsto
  estado: rascunho | submetido | em_triagem | encaminhado
        | com_proposta | aceite | recusado | fechado
```

Sem `JOIN` possível a partir das políticas do contabilista. Não há `select`
distraído que devolva um telefone, porque o telefone não está na tabela que ele
alcança. É o mesmo princípio da migração 038, levado ao fim.

`nifMascarado` existe para listas — não é uma proteção, e o código di-lo: quem
abre o caso vê o NIF inteiro, e é suposto.

### 3.2 Encaminhamento

```
caso_encaminhamentos
  caso_id, contabilista_id
  estado: convidado | aceite | recusado | retirado
  encaminhado_por (admin), encaminhado_em
```

A administração encaminha para um ou mais contabilistas. Um caso encaminhado
para vários **não é a mesma lead vendida a vários** — o `routing.ts` proíbe
isso, e a diferença é que aqui o cliente sabe, escolhe entre propostas, e
nenhum contabilista recebe dados pessoais. Fica dito na interface.

### 3.3 A conversa mediada

`caso_mensagens` substitui `contabilista_mensagens` neste fluxo:

```
  caso_id, autor_id, autor_papel: cliente | contabilista
  corpo
  estado: submetida | aprovada | devolvida | recusada
  revisto_por, revisto_em, nota_revisao
  corpo_encaminhado   ← o que o outro lado lê, quando difere do original
```

Regras que o schema impõe:

- Uma mensagem **nasce `submetida`**. Nenhuma política permite nascer aprovada.
- Só `aprovada` é legível pelo outro lado. As outras são visíveis a quem
  escreveu e à administração.
- `corpo` é imutável depois de submetido. Se a administração precisa de
  redigir, escreve em `corpo_encaminhado` e o original fica — senão a revisão
  apaga a prova do que foi dito.
- **Devolvida** existe de propósito: recusar sem devolver deixa a pessoa sem
  saber o que corrigir.

### 3.4 A proposta

```
propostas
  caso_id, contabilista_id
  corpo, valor_cents, iva_incluido, prazo_execucao, validade_ate
  anexos → balde privado (contrato, documentos)
  estado: enviada | lida | aceite | desconto_pedido | recusada | expirada
  lida_ate_ao_fim_em     ← quando o cliente chegou ao fim do documento
  confirmacao_em         ← quando marcou «li e compreendi»
  decidida_em, motivo
```

A regra que o utilizador pediu, e que tem de ser estrutural:

> Para aceitar, pedir desconto ou recusar, o cliente tem primeiro de **ler
> até ao fim** e confirmar.

- No cliente: o botão de decisão só desbloqueia depois de o fim do documento
  ter estado visível (`IntersectionObserver`) **e** a caixa estar marcada.
- No servidor: a RPC de decisão recusa se `lida_ate_ao_fim_em` ou
  `confirmacao_em` forem nulos. A interface é conveniência; a garantia é a RPC.
- Acessibilidade: quem navega por teclado ou leitor de ecrã chega ao fim de
  outra maneira — o marcador de fim é focável e anuncia-se, e há sempre um
  caminho que não depende de conseguir ver o ecrã a rolar.

### 3.5 Pedido de desconto

Não é uma conversa. É um valor proposto e uma justificação, que segue a mesma
mediação das mensagens. O contabilista responde com **proposta nova** — a
anterior fica no histórico. Duas propostas, duas versões, nenhuma reescrita.

## 4. O que se reaproveita da PR #102

Quase tudo. Isto não é deitar fora:

| Peça | Destino |
|---|---|
| `contabilistas`, candidatura, aprovação por admin | **Igual.** É a base de tudo |
| Diretório público e perfil | **Igual**, mas o botão passa a «Descrever o meu caso» |
| Agenda, disponibilidade, GIST anti-duplo-agendamento | **Igual.** Marca-se depois de a proposta ser aceite |
| Fidelidade, carimbos, cupões | **Igual.** Conta a partir da primeira consulta realizada |
| Anexos, balde privado por relação | **Reaproveitado**, com o caso no lugar do vínculo |
| Sino, notificações, emails | **Igual**, com tipos novos |
| Tarefas, quadro de trabalho | **Igual** |
| `contabilista_vinculos` | **Passa a ser consequência**, não porta de entrada: nasce quando uma proposta é aceite |
| `contabilista_mensagens` (livre) | **Sai deste fluxo.** Fica só onde já há relação estabelecida, ou desaparece |

## 5. O que isto resolve do relatório mestre

Vários achados deixam de existir ou mudam de forma:

- **PR-09** (endpoint genérico de avisos forjável) — o endpoint sai. As
  notificações passam a nascer das transições de estado do caso, no servidor.
- **PR-05** (sanitização da partilha é client-side) — o caso é um formulário
  com campos declarados, validados no servidor. Não há payload livre.
- **PR-06** (suspensão/terminação sem retenção definida) — o caso tem ciclo de
  vida explícito, com fecho e retenção declarados.
- **RC-13** (admins leem preferências fiscais) — a separação de `casos` e
  `caso_identidade` é o padrão a aplicar também aí.

Os que **continuam a ter de ser feitos**, sem alteração:

- **PR-03** — limites de anexos no Storage (`file_size_limit`,
  `allowed_mime_types`), upload por slot server-side, magic bytes, órfãos.
  Vale para os anexos do caso e da proposta.
- **PR-12 / P0.5** — transições por RPC transacional, com precondição de
  estado. Vale a dobrar aqui: o ciclo do caso tem oito estados.
- **PR-11** — aprovação administrativa transacional com auditoria.
- **RC-08 / P0.7** — eliminação de conta atómica.
- **PR-13** — email fire-and-forget não é fiável.

## 6. Ordem de execução

Cada fase é entregável e deixa o produto coerente.

**A · O caso e a sua identidade separada.** Migração: `casos`,
`caso_identidade`, `caso_documentos`, RLS e testes adversariais a provar que o
contabilista não alcança o NIF por caminho nenhum. Formulário público. Fila de
triagem na administração.

**B · Encaminhamento e mediação.** `caso_encaminhamentos`, `caso_mensagens`
com revisão. Ecrã de moderação. O contabilista passa a ver casos.

**C · A proposta.** `propostas`, anexos, leitura confirmada, RPC de decisão.
Pedido de desconto. Aceitar cria o vínculo e abre a agenda.

**D · Endurecimento do Storage (PR-03).** Vale para os três sítios que já
carregam ficheiros: candidatura, conversa, proposta.

**E · Transições por RPC (PR-12).** Substituir os `UPDATE` genéricos que
restam por comandos com precondição.

**F · Reconciliação.** Privacidade, termos, `routing.ts`, changelog, e a
decisão sobre o que fazer ao vínculo direto que existe hoje.

## 7. Como isto se chama

**Não é um chat.** Chamar-lhe chat prometeria imediatismo e privacidade que
este canal não tem, e a primeira pessoa a descobrir que a plataforma lê o que
escreve sentir-se-ia enganada — com razão.

Nomes propostos, a decidir: **«Pedido»** para o caso, **«Acompanhamento»** para
o histórico mediado, **«Proposta»** para a resposta. E uma frase visível no
topo, sempre:

> As mensagens passam pela equipa do ReciboCerto antes de seguirem. É assim
> que os teus contactos não chegam a ninguém sem tu quereres.

## 8. As decisões que estavam por tomar, tomadas

1. **Um caso vai para vários contabilistas**, com um teto de **três**, imposto
   por gatilho e declarado na interface. Não é a mesma lead vendida a vários: o
   cliente sabe, escolhe entre propostas, e nenhum deles recebe canais de
   contacto.
2. **A administração aprova, devolve ou recusa.** Não há «editar»: a redação vai
   para `corpo_encaminhado` e o `corpo` original é imutável por gatilho — uma
   revisão que apaga a prova do que foi dito não é revisão, é reescrita.
   Devolver ou recusar exige uma razão escrita.
3. **A conversa livre abre depois de uma proposta aceite.** O vínculo passa a
   nascer em `decidir_proposta`: é consequência da relação, e não porta de
   entrada.
