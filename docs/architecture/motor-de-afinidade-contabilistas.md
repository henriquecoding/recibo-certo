# Motor de afinidade — que contabilista aparece no fim de uma ferramenta

> `src/lib/contabilistas/afinidade/` · `src/lib/contabilistas/bagagem.ts` ·
> `src/components/contabilistas/ContabilistasParaEsteResultado.tsx`

## O problema

Quinze ferramentas terminavam num resultado e num vazio. Quem acabava de
simular o IRS, de comparar regimes ou de fechar um preço não tinha, ali, um
caminho para uma pessoa — tinha, quando muito, um link para um diretório de
vinte e quatro cartões por ordem alfabética, onde a pergunta que a pessoa
acabou de fazer não conta para nada.

Do outro lado, os contabilistas passavam tempo a configurar áreas de
trabalho e a escrever termos próprios («nómadas digitais», «criadores de
conteúdo», «clínicas»). Essa configuração alimentava **um** filtro: o do
diretório. Em mais lado nenhum.

Este motor liga as duas pontas: o que uma ferramenta pede e o que um
contabilista declara saber.

## O que NÃO é

- **Não é um leilão.** Nenhum patamar, nenhuma comissão, nenhum destaque
  pago entra na pontuação. A ordem é explicável em voz alta, tal como a do
  diretório (§35, §150) — e o rodapé da secção di-lo, na página.
- **Não é uma medição de qualidade.** A pontuação ordena; não avalia. Não
  há estrelas, não há «o melhor para ti», não há nota. O que se diz é o que
  é verdade: *trabalha com IRS e recibos verdes*.
- **Não inventa correspondência.** Quando ninguém no diretório declara as
  áreas de que a ferramenta precisa, a secção di-lo, e o que mostra fica
  marcado como atendimento geral.
- **Não adivinha o território.** A dimensão de cobertura só entra quando se
  sabe onde a pessoa está. Sem esse dado, o peso é redistribuído pelas
  outras dimensões em vez de ser preenchido com um palpite.

## As três camadas

### 1. A necessidade (`vocabulario.ts`)

Cada ferramenta do catálogo declara as áreas do eixo canónico que pede, com
peso, e o vocabulário com que se descreve. É uma tabela **explícita** e não
uma derivação dos `topics`: a correspondência é editorial e tem de poder
ser lida e discutida linha a linha.

`assertAfinidadeIntegra()` corre ao importar o índice do motor. Uma
ferramenta nova sem entrada **falha o build** — o mesmo contrato de
`assertFiscalDataIntegrity()` e de `assertCatalogoFerramentas()`. Assim o
motor não pode ficar «correto» e incompleto ao mesmo tempo.

### 2. A pontuação (`motor.ts`)

Função pura. A mesma entrada dá sempre a mesma saída — o que a torna
testável e, sobretudo, auditável quando alguém perguntar porque é que viu
aquele nome primeiro.

| Dimensão | Peso | O que mede |
|---|---|---|
| `area_declarada` / `area_implicita` | 0.60 | Quanto das áreas pedidas o perfil cobre. Uma área marcada vale 1.0; uma área que vem de um termo próprio vale 0.85 — é inferida, e a diferença é dita. |
| `termo_proprio` | 0.15 | Quantos dos termos escritos pelo próprio casam com o vocabulário desta ferramenta. É isto que faz o refinamento do perfil pagar. |
| `cobertura` | 0.10 | Atende online (chega a toda a gente) ou cobre o distrito de quem procura. **Omitida** quando não se sabe onde a pessoa está. |
| `disponibilidade` | 0.10 | Aceita novos clientes. |
| `identidade` | 0.05 | OCC verificada e LinkedIn ligado. Só desempate — nunca move alguém para o topo sozinha. |

Os pesos são renormalizados pelas dimensões efetivamente presentes: um
resultado nunca é castigado por uma dimensão que ninguém podia responder.

**Empates são publicados.** Duas fichas com a mesma pontuação partilham a
`posicao` e sabem com quem empatam — o mesmo princípio do Founder Fit v2 em
`negocio/market/opportunities.ts`. Esconder um empate é fabricar uma
ordem que não existe.

O desempate final é `aceita novos clientes` e depois o nome, em pt-PT.
Determinístico: a mesma lista não pode mudar de ordem entre dois
carregamentos.

### 3. A leitura (`leitura.ts`)

Duas consultas em paralelo sobre `contabilistas_publico`, nunca sobre a
tabela:

1. quem declara pelo menos uma das áreas pedidas (`overlaps`);
2. um lote geral de quem aceita clientes.

O segundo lote existe por uma razão concreta: quem escreveu «nómadas
digitais» sem marcar «Clientes internacionais» não aparece no `overlaps`,
mas o motor sabe calcular-lhe a área implícita. Sem o lote geral, o
refinamento por termos próprios só funcionaria para quem já estava
marcado — que é precisamente quem não precisa dele.

Vinte e quatro linhas no máximo, e só quando a secção entra no ecrã. Uma
ferramenta não paga uma consulta por uma coisa que está mil pixels abaixo
da dobra.

## A bagagem — «levar o que simulei»

`bagagem.ts` guarda, no dispositivo, **uma** simulação de cada vez: a
última. Três invariantes:

1. **Já nasce sanitizada.** O que se guarda passa por
   `sanitizarConteudoPartilha()`, a mesma lista branca por tipo que governa
   a partilha real. Um campo que ninguém autorizou não chega sequer a ser
   escrito no `localStorage`.
2. **Nunca sai sozinha.** A bagagem não é uma partilha. É uma nota para a
   própria pessoa. O envio continua a acontecer no único sítio onde sempre
   aconteceu — a folha de `EnviarAoContabilista`, com o destinatário
   identificado, os campos exatos à vista e o consentimento versionado.
3. **Expira.** 72 horas. Uma simulação de há uma semana não é o contexto de
   nada, e guardá-la indefinidamente seria acumular dados fiscais por
   inércia.

O percurso: a ferramenta produz um resultado → a secção do fim oferece
«levar comigo» → o cartão liga para `/contabilistas/<slug>?de=<toolId>` →
o perfil reconhece a bagagem e diz o que fazer conforme o estado do
vínculo. Sem vínculo, a frase é explícita: **nada segue antes de ele
aceitar**.

## Onde aparece, e o que aparece

`ToolShell` renderiza a secção logo a seguir à ferramenta e antes do
material editorial — é aí que a pessoa está quando acaba de ter o
resultado. A necessidade é calculada no **servidor** e desce como
propriedade: o catálogo de ferramentas e a tabela de vocabulário não entram
no pacote do cliente.

Dois estados, e não três:

- **Com vínculo ativo** → uma barra com o contabilista da própria pessoa.
  É a regra 2 do `routing.ts`: quem já escolheu, escolheu. Não se mostram
  três alternativas a quem tem um profissional.
- **Sem vínculo** → um a três cartões do diretório, ordenados pelo motor,
  cada um com o motivo por que ali está.

O cartão é o mesmo componente do diretório (`ContabilistaCard`), movido
para `components/` para poder ser partilhado. Uma segunda implementação
seria uma segunda verdade sobre a mesma ficha.

## Medição

Dois eventos novos em `analytics/eventos.ts`, ambos do cliente e ambos sem
nada de fiscal nem de identitário: `accountant_match_impression` (a secção
foi vista, com quantos candidatos e quantos correspondiam às áreas) e
`accountant_match_click` (alguém seguiu um cartão, em que posição, e se
levou a simulação). O id do contabilista **não** entra em nenhum dos dois —
cruzado com o utilizador, seria a relação profissional de alguém num
sistema de medição.
