# Da ligação direta à intermediação — estratégia completa

> Estado: plano aprovado, por implementar.
> Substitui o modelo de vínculo direto da PR #102 **sem apagar o que lá está**:
> quase tudo se reaproveita, mas a relação passa a ser mediada.
> Ler com `docs/auditorias/pr102/HANDOFF-CLAUDE.md` e o relatório mestre de
> privacidade e segurança.

## 1. O que muda, numa frase

Hoje o cliente escolhe um contabilista e falam livremente. Passa a ser: o
cliente **descreve o caso**, a plataforma **intermedeia tudo o que é dito**, e o
contabilista responde com uma **proposta** — sem nunca receber os contactos.

Não é uma funcionalidade nova por cima do que existe. É outra relação, e por
isso convém dizer com precisão o que se mantém e o que cai.

| | Modelo atual (PR #102) | Modelo de intermediação |
|---|---|---|
| Escolha | O cliente escolhe o contabilista | O cliente descreve o caso; o diretório serve para **ver quem existe**, não para escolher |
| Identidade | O cliente dá o nome que quiser | O cliente dá **nome, NIF e contactos completos** — à plataforma |
| Quem vê os contactos | O contabilista | **Só a plataforma.** O contabilista nunca |
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

```
caso_identidade          ← só o cliente e a administração
  caso_id (PK/FK)
  nome_completo, nif, email, telefone, morada

casos                    ← o que o contabilista vê
  id, cliente_id
  referencia   «RC-2026-0041» — é assim que o contabilista trata o caso
  assunto, situacao, area, urgencia, orcamento_previsto
  estado: rascunho | submetido | em_triagem | encaminhado
        | com_proposta | aceite | recusado | fechado
```

Sem `JOIN` possível a partir das políticas do contabilista. Não há
`select` distraído que devolva o NIF, porque o NIF não está na tabela que ele
alcança. É o mesmo princípio da migração 038, levado ao fim.

O NIF nunca aparece em claro num painel: guarda-se, e a administração vê-o
mascarado (`•••••789`) salvo ação explícita registada em `admin_auditoria`.

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

## 8. O que fica por decidir

1. **Um caso vai para quantos contabilistas?** Um de cada vez é mais simples e
   mais justo para quem responde; vários dão escolha ao cliente. Proposta: a
   administração decide caso a caso, com um teto declarado na interface.
2. **A administração pode editar uma mensagem, ou só aprovar e devolver?**
   Editar é mais rápido e menos honesto. Proposta: só aprovar, devolver ou
   recusar; a redação fica para exceções, sempre com o original preservado.
3. **O que acontece ao vínculo direto e à conversa livre que já existem?**
   Proposta: a conversa livre fica disponível só depois de uma proposta aceite
   — aí já há contrato, e a mediação deixa de fazer sentido.
