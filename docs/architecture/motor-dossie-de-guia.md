# Motor de Dossiê de Guia — levar o caso ao contabilista

> Estado: **implementado. 2026-09-04.** O que o relatório propôs está em
> código; o que se decidiu diferente está escrito no §15, com o motivo.
>
> Este documento é a especificação executável do segundo destino de um Guia.
> O primeiro — a FIZ — continua descrito em `src/lib/fiz/` e nas rotas de
> parceria, e **não é substituído nem despromovido**: passa a partilhar a
> secção final com uma rota que hoje não existe.
>
> Consumido por: `src/lib/guias/*`, `src/lib/contabilistas/*`,
> `src/lib/routing.ts`, `supabase/migrations/`.
> Depende da doutrina já fixada em `docs/CONTRATO-DE-PRIVACIDADE.md`,
> `docs/PLATAFORMA-CONTABILISTAS.md` e `docs/ESTRATEGIA-INTERMEDIACAO.md`.

---

## 0. O pedido, e as quatro obrigações que ele cria

O pedido foi: além da ligação à FIZ, **uma segunda opção que leva o caso
daquele guia ao contabilista** — e explicitamente *não* um link que a pessoa
manda. Tem de rotear, elaborar e associar completamente o Guia à conversa,
e o contabilista tem de conseguir **extrair** o que lá está de forma
simplificada e **selecionar** o que precisa de extrair.

São quatro obrigações distintas, e convém não as confundir porque cada uma
falha de maneira diferente:

| # | Obrigação | Falha típica se for mal feita |
|---|---|---|
| 1 | **Rotear** — o Guia escolhe o destino certo, e diz porquê | Duas ações do mesmo peso no fim da página; ninguém clica em nenhuma |
| 2 | **Elaborar** — o Guia vira documento de trabalho, não URL | O contabilista recebe «vê este link» e volta a perguntar tudo |
| 3 | **Associar** — a conversa fica presa ao Guia *e à versão lida* | Três semanas depois o guia mudou e ninguém sabe sobre o que se falou |
| 4 | **Extrair com seleção** — o contabilista tira só o que precisa | Um PDF de sete páginas que ninguém lê, ou um formulário que pede tudo |

O que se segue resolve as quatro. A ordem importa: sem a 2 não há o que
rotear, sem a 3 a 4 é perigosa, e a 1 sem as outras três é mais um botão.

---

## 1. Auditoria completa dos Guias

### 1.1. Inventário

Contagens apuradas sobre o código a 2026-09-04.

| Grandeza | Valor | Onde |
|---|---:|---|
| Guias publicados | **169** | 57 estáticos + 112 da expansão |
| Guias com rota própria (corpo à mão) | 57 | `src/app/guias/<slug>/page.tsx` |
| Guias em rota dinâmica | 112 | `src/app/guias/[slug]/page.tsx` |
| Corpos redigidos na expansão | 110 | `src/components/guias/expansao/corpos/` |
| Andaimes sem corpo (`noindex`) | 2 | `EmPreparacao` |
| Manifestos | 169 | `manifests.ts` + `expansao/derivar.ts` |
| Blocos de aplicabilidade | 169 | `aplicabilidade.ts` (57) + expansão (112) |
| Itens de checklist — estáticos | **217** | `APLICABILIDADE[].checklist` |
| Itens de checklist — expansão | **397** | `CONTEUDO_EXPANSAO[].oQuePreparar` |
| Critérios «aplica-se / não se aplica» | 238 + 224 | `aplicaSe[]` / `naoAplicaSe[]` |
| Afirmações legais estáticas | **183** | `claims.ts` |
| — verificadas | 94 | `confidence: "verified"` |
| — **que exigem revisão especializada** | **87** | `confidence: "review_required"` |
| — severidade crítica | 128 | `reviewSeverity: "critical"` |
| Guias da expansão que exigem revisão especializada | **102** de 112 | `exigeRevisaoEspecializada: true` |
| Dados do ano citados (expansão) | 136 | `DadoAnual` |
| Fontes oficiais registadas | ~1 240 linhas | `legal-sources.ts` |

Duas leituras deste quadro, e são as que sustentam tudo o resto:

1. **O corpus já é dados, não prosa.** 614 itens de checklist, 462 critérios
   de aplicabilidade, 183 afirmações com fonte e vigência, 136 valores do ano
   com origem declarada. Não é preciso extrair nada de texto corrido: já está
   tudo em registos tipados, validados no build.
2. **189 afirmações — 87 estáticas mais 102 da expansão — estão marcadas
   como precisando de um profissional, em 128 dos 169 guias.** Cada uma tem
   `statement`, `sourceIds`, `nota` e severidade. São perguntas já redigidas
   para um contabilista, com a base legal anexada. Nenhuma tem um botão.

### 1.2. Anatomia atual de um Guia

`GuiaLayout.tsx` compõe onze blocos, e a página só fornece o corpo:

```
GuiaHero → EstadoRevisaoGuia → RespostaCurtaGuia → [corpo]
        → ChecklistGuia → FizNextStep → SimuladoresRelacionados
        → GuiasRelacionados → FontesGuia → HistoricoGuia → NotaDisclaimer
```

O único bloco terminal com ação comercial é `FizNextStep`
(`GuiaLayout.tsx:101`). Não há mais nenhum.

### 1.3. O material extraível que já existe

Isto é o inventário do que um dossiê pode transportar **sem escrever uma
linha de conteúdo novo**:

| Material | Tipo | Vive em | Serve ao contabilista para |
|---|---|---|---|
| Título, arquétipo, público, tempo | `GuideManifest` | `manifests.ts` | Saber em dez segundos de que caso se trata |
| Categoria, hub, `engineBindings` | idem | idem | Triagem e área do caso |
| `lastReviewedAt`, `effectiveFrom/To`, `status` | idem | idem | Saber sobre que versão se está a falar |
| Resposta curta | `AplicabilidadeGuia.respostaCurta` | `aplicabilidade.ts` | O resumo do caso em duas linhas |
| `aplicaSe[]` / `naoAplicaSe[]` | `string[]` | idem | As perguntas de enquadramento |
| `checklist[]` / `oQuePreparar[]` | `string[]` | idem / `conteudo.ts` | **A lista de elementos a pedir** |
| Afirmações + fontes + vigência | `LegalClaim[]` | `claims.ts` | O que está fundamentado, e onde |
| Afirmações `review_required` | idem | idem | **A agenda da consulta** |
| Fontes oficiais ordenadas por autoridade | `LegalSource[]` | `legal-sources.ts` | Citações prontas, com artigo e URL |
| Dados do ano com origem e correções | `DadosDoGuia` | `expansao/dados.ts` | Números com base legal e data |
| Avisos e bloqueadores | `string[]` | `conteudo.ts` | Os cuidados que o pacote exigiu |
| Histórico de alterações | `AlteracaoGuia[]` | `historico.ts` | O que mudou desde que a pessoa leu |
| Progresso da checklist | `number[]` | `localStorage` | O que a pessoa já tem |
| Última simulação | `Bagagem` | `localStorage`, 72 h | O número que a fez procurar ajuda |

### 1.4. Os treze achados

**A1 — Os Guias não têm porta nenhuma para o contabilista.**
`grep -n "contabilista" src/components/guias/*.tsx` devolve três resultados, e
os três são avisos: «confirma com um contabilista antes de agir»
(`EstadoRevisaoGuia.tsx:60`), «não substitui aconselhamento de um contabilista
certificado» (`NotaDisclaimer.tsx:37`), «uma pergunta que se leve a um
contabilista» (`CalculadoraSSTrimestral.tsx:158`). Três conselhos, zero portas.
Entretanto a plataforma tem diretório verificado contra a OCC, casos,
propostas, agenda, pagamentos por Stripe Connect, fidelidade e progressão de
comissão. A maior superfície de intenção do site nunca aponta para lá.

**A1b — E o único link que existe manda a pessoa para fora.**
`NotaDisclaimer.tsx:32` liga «contabilista certificado» a
`LEITURAS_COMPLEMENTARES.occRegisto.url` — o registo público da OCC, em
`occ.pt`. Está em **todos os 169 guias**. A frase mais repetida do corpus sobre
contabilistas manda o leitor procurar um desconhecido noutro sítio.

**A2 — 29 dos 57 guias estáticos declaram `FIND_ACCOUNTANT` e encaminham
esse intent para a FIZ.**
Contagem de `intent` em `manifests.ts`: `FIND_ACCOUNTANT` ×29,
`CONFIGURE_FREELANCER` ×7, `PREPARE_IRS` ×6, `CONFIGURE_VAT` ×4,
`CONFIGURE_SOCIAL_SECURITY` ×4, `START_COMPANY` ×3, `START_FREELANCER` ×1.
O rótulo em modo LIGACAO é, literalmente, «Falar com um contabilista
certificado» (`ROTULO_LIGACAO_POR_INTENT`, `manifests.ts:123`) e o destino é
uma rota de afiliado. Mais de metade dos guias com ação mandam para fora
exatamente a intenção que a casa sabe servir — e que serve de graça
(`PARTILHA_NUNCA_EXIGE_PLUS`).

Isto contraria a hierarquia que o próprio `routing.ts:17-21` escreveu:
«CONTABILISTA vem antes da FIZ. Um caso que exige julgamento profissional (…)
não se resolve com execução de faturação».

**A3 — 112 dos 169 guias não têm passo seguinte nenhum.**
`expansao/derivar.ts` é explícito: «Sem ação FIZ: o pacote não acordou nenhuma
capacidade para estes guias, e inventar uma seria prometer ao leitor um
destino que não existe». A decisão está certa. A consequência nunca foi
tratada: `FizNextStep` devolve `null` e dois terços do catálogo — IMI, IMT,
mais-valias, heranças, reforma, estrangeiro, profissões — acabam em «fontes» e
mais nada. O segundo destino não depende de capacidade acordada com ninguém:
é nosso, e cobre os 169.

**A4 — `escolherRota()` nunca é chamado num Guia.**
Está em `ResultadoExplicado`, em `ProximoPassoNegocio`, em `ConclusaoPreco`,
em `PassoSeguinteHomepage`. Nos Guias, quem escolhe a rota é a página: FIZ,
sempre que há `fizAction`, sem sinais, sem motivo legível e sem a guarda de
confiança. A skill de crescimento diz o contrário em letras grandes: «A
hierarquia dos CTAs não é escolhida pela página».

**A5 — A checklist morre no dispositivo.**
`ChecklistGuia.tsx:14` guarda em `recibocerto:guias:checklist:<slug>` os
índices marcados. É a lista de elementos que um contabilista pediria, com o
estado já preenchido pela própria pessoa — e é o sinal mais forte de intenção
que o site tem («esta pessoa marcou 3 de 4»). Nunca sai dali.

**A6 — O Guia sabe o que exige um profissional e não usa esse saber.**
189 afirmações marcadas `review_required` em 128 guias, cada uma com
`reviewSeverity`, fontes e nota editorial. `EstadoRevisaoGuia` chega a mostrar
ao leitor que o guia «contém matéria que depende do caso concreto» — e não lhe
dá como resolver isso. É o achado com maior valor do relatório: **a agenda da
consulta já está escrita, guia a guia, revista, com base legal.**

**A7 — A bagagem não passa pelos Guias.**
`bagagem.ts` existe para «o que a pessoa leva consigo quando sai de uma
ferramenta» e é escrita por `EnviarAoContabilista`, que só vive em
ferramentas. Um guia lido, com checklist meio feita, não deixa bagagem
nenhuma.

**A8 — `partilhas` exige vínculo ativo; um caso não.**
`042_plataforma_contabilistas.sql:806`:
`AND public.vinculo_ativo(contabilista_id, (SELECT auth.uid()))` no
`WITH CHECK` do insert. Logo, **o dossiê de um Guia não pode ser só «mais um
`TipoPartilha`»**: quem ainda não tem contabilista não consegue enviar nada
por esse caminho. Quem desenhar isto como uma migração de três linhas na
constraint `partilhas_tipo_check` descobre o problema depois de a escrever.

**A9 — Não há caminho para o contabilista que a pessoa já tem e que não está
na plataforma.** Que é o caso mais comum em Portugal. Hoje: nada. Nem
exportação, nem ligação, nem email.

**A10 — Abrir um caso custa uma redação.**
`051_intermediacao_casos.sql:65`: `situacao` entre 20 e 4 000 caracteres,
obrigatória. Mais `assunto`, `area`, `nome_completo`, `nif` e email. Quem
acabou de ler um guia sobre penhoras tem de reescrever em prosa o que acabou
de ler. O dossiê pré-compõe tudo isto — e a pessoa continua a poder mudar cada
palavra antes de enviar.

**A11 — Três vocabulários para a mesma coisa, sem mapa.**
`HubGroup` (15 valores), `GuideTopic` (9) e `AreaDoCaso` (8). Não há função
que traduza um no outro. Sem esse mapa, o dossiê não sabe que área declarar
ao caso.

**A12 — Existem eventos `accountant_*` que os Guias nunca disparam.**
`accountant_link_request`, `accountant_share`, `accountant_booking`,
`accountant_match_impression`, `accountant_match_click` estão declarados em
`analytics/eventos.ts`. De `/guias/*` só sai `guide_view`. Não se sabe — não se
pode saber — que guias geram procura de profissional.

**A13 — `mapa-contabilistas` está em 14 dos 57 manifestos e não é uma rota,
é uma ferramenta.** Aparece em `relatedToolIds` e cai no bloco de
«ferramentas relacionadas», ao lado de calculadoras. Procurar um profissional
não é uma ferramenta relacionada: é a conclusão de um guia.

### 1.5. O que NÃO está partido (e não se toca)

Para que ninguém reescreva o que está bem:

- **A disciplina de fontes.** `claims.ts` + `legal-sources.ts` +
  `assertClaimsIntegrity()`. O dossiê consome, não duplica.
- **A fronteira de dados da partilha.** `CAMPOS_PARTILHA` como lista branca,
  `sanitizarConteudoPartilha()` a copiar por JSON. É o modelo a imitar.
- **O consentimento versionado.** `CONSENTIMENTO_VERSAO` + `TEXTO_CONSENTIMENTO`
  gravados na linha. Já está certo.
- **A doutrina de RLS.** Uma garantia é a ausência de caminho, não um `USING`
  bem escrito (`caso_contactos`, `partner_events`). Aplica-se tal e qual.
- **A imutabilidade do que foi enviado.** `proposta_imutavel`,
  `mensagem_corpo_imutavel`. O dossiê enviado obedece à mesma regra.
- **O `payload_hash` dos handoffs FIZ.** Provar o que seguiu sem guardar o que
  seguiu. É exatamente o que a obrigação 3 precisa.

---

## 2. Referências externas — o que a indústria já resolveu

Pesquisa feita a 2026-09-04. O que interessa não é a lista de produtos: é o
padrão que cada um encontrou e o preço que pagou por não o ter.

### 2.1. A lista PBC (*Prepared/Provided By Client*)

É o instrumento canónico da relação contabilista–cliente há décadas: a lista
numerada de elementos que o cliente tem de entregar, com prazo por item,
estado por item e nome de ficheiro que mapeia para o número do item.
As boas práticas apuradas ([Content Snare][r1], [Suralink][r2],
[AuditDashboard][r3]):

- **enviar cedo** (30–60 dias antes) e **adaptada ao caso** — mandar um
  template genérico diz ao cliente que não se percebeu o negócio dele;
- **prazo por item**, não prazo global;
- **convenção de nomes que mapeia para o número do item**;
- a lista bem feita é o que faz o cliente responder depressa.

**O que adotamos:** o dossiê produz uma lista PBC — numerada, com estado por
item, adaptada ao guia — em vez de um pedido em prosa. **O que rejeitamos:**
o template fixo. A nossa lista nasce do guia concreto que a pessoa leu.

### 2.2. Portal do cliente ≠ software de gestão do escritório

A separação mais útil que a pesquisa devolveu ([Content Snare][r4]): o portal
é onde o cliente entrega; a gestão de trabalho (Karbon e afins) é do
escritório. Não competem — integram-se, e a integração vale porque tira ao
escritório o tempo de andar atrás de documentos.

**O que adotamos:** o Recibo Certo é a camada virada ao cliente. Não vamos
construir gestão de escritório. **O que isto fecha:** a tentação de
transformar `/contabilista/*` num Karbon português.

### 2.3. Passagem com contexto preservado (suporte assistido por IA)

A literatura de 2026 sobre passagem IA→humano é diretamente aplicável, porque
o problema é o mesmo: alguém que já explicou o caso a um sistema e não quer
explicá-lo outra vez. O número que interessa: **78% de quem teve uma passagem
má reportou menos confiança na marca, mesmo quando o problema acabou
resolvido** ([Fini][r5], [BlueTweak][r6]). O modo de falha tem nome —
*amnesia* — e o remédio é um **pacote de contexto**: transcrição, resumo,
intenção detetada, entidades, IDs, diagnóstico, resolução sugerida. E a
distinção entre passagem **fria** (contexto bem estruturado chega) e **quente**
(o profissional é informado antes de falar com a pessoa) conforme a
complexidade e o risco.

**O que adotamos:** o dossiê é o pacote de contexto, e a passagem é quente por
omissão — o contabilista lê o caso em dez linhas antes de responder.

### 2.4. SBAR e a carta de referenciação clínica

O padrão que resolveu a mesma classe de problema em medicina: **Situação,
Antecedentes, Avaliação, Recomendação/Pedido** ([NCBI][r7], [Heidi][r8]).
A conclusão que interessa: exigir explicitamente uma *avaliação* e um *pedido*
obriga quem envia a formar uma opinião em vez de despejar dados, e é isso que
reduz omissões e erros de passagem.

**O que adotamos:** a estrutura de quatro campos do «caso em dez linhas»
(§6.1), com a diferença honesta de que a **avaliação não é nossa** — é o que o
Guia responde, com fonte. O Recibo Certo não emite juízo clínico equivalente.

### 2.5. Recibo de consentimento — ISO/IEC TS 27560:2023 e Kantara

A norma define a estrutura de um **registo de consentimento legível por
máquina** e do **recibo** que o comunica a outra entidade; nasceu da Kantara
Consent Receipt, entrou como anexo na ISO/IEC 29184 e foi publicada em agosto
de 2023 ([ISO][r9], [Pandit et al.][r10], [W3C DPV][r11]).

**O que adotamos:** os campos do registo (quem, o quê, para quê, com que base,
que campos, que versão de texto, quando, até quando, como se revoga). O
`partilhas.consentimento_versao` já é meio caminho — falta a **lista de secções
efetivamente consentidas** e a data de expiração. **O que rejeitamos:** adotar
a norma inteira e o formato JSON-LD dela agora; é peso sem retorno enquanto o
destinatário for sempre humano e sempre nosso.

### 2.6. Divulgação seletiva (SD-JWT / SD-CWT)

O padrão que a UE tornou obrigatório para carteiras digitais no eIDAS2: o
emissor assina tudo, e **quem detém decide campo a campo o que revela**, sem
que a assinatura caia ([IETF][r12], [walt.id][r13], [Curity][r14]).

**O que adotamos:** o princípio — quem detém escolhe, campo a campo, e o
destinatário não recebe tudo por omissão. **O que rejeitamos:** a
criptografia. Não somos emissores de credenciais; um hash de conteúdo
(`impressao`) e uma lista de secções consentidas dão a mesma garantia
verificável para este caso, e são legíveis por uma pessoa.

### 2.7. Divulgação progressiva e lógica condicional

Só perguntar o que a resposta anterior tornou relevante encurta o formulário
percebido em 20–40% e é a alteração de maior retorno em formulários com mais
de cinco campos ([UXPin][r15], [OrbitForms][r16]).

**O que adotamos:** as perguntas de aplicabilidade só aparecem quando o guia
as tem, e a composição do dossiê tem três passos curtos, não um formulário.
A pessoa pode enviar com «não sei» em tudo — «não sei» é informação, não é
campo por preencher.

### 2.8. RGPD — o contabilista é responsável autónomo, não subcontratante

A posição dominante na UE: um contabilista que exerce julgamento profissional
e tem deveres próprios (incluindo de comunicação a autoridades) age como
**responsável pelo tratamento**, não como subcontratante do cliente
([Accountancy Europe][r17], [Lexology][r18], [NOB][r19]).

**Consequência direta para o desenho:** não há contrato de subcontratação a
assinar entre nós e cada contabilista para este fluxo. O que existe é uma
**transmissão consentida entre responsáveis**, com finalidade declarada,
minimização real e revogação efetiva. É exatamente o que `partilhas` já faz —
e é a razão pela qual a revogação tem de cortar o acesso, e não apenas marcar
uma coluna.

### 2.9. OCC — o contrato escrito é dever, e o direito aos elementos também

Do Estatuto e dos guias práticos da Ordem ([OCC][r20], [OCC — prestação][r21]):
a celebração de contrato escrito de prestação de serviços é dever estatutário
e deontológico do contabilista certificado; e o contabilista tem direito a
obter os documentos, informações e elementos necessários ao exercício da
profissão.

**Consequência para o desenho:** o dossiê **não é** o contrato e não se
disfarça de um. É o material com que se orçamenta — e alimenta a `proposta`,
que é onde o contrato aparece (`proposta_anexos.e_contrato` já existe). E o
«pedido de elementos» não é uma invenção do produto: é a forma digital de um
direito que a profissão já tem.

---

## 3. A tese

> Um Guia já é uma base de factos estruturada, verificada e datada. Falta-lhe
> uma **projeção** (o que dele interessa a um profissional), um **transporte**
> (como segue, com consentimento e revogação) e uma **consola** (o que o
> profissional faz com ele).

Três objetos, três responsabilidades, e nenhum deles cria conteúdo novo:

| Objeto | O que é | O que nunca é |
|---|---|---|
| **Dossiê** | Projeção versionada do Guia + o que a pessoa respondeu e marcou | Um parecer. Um resumo gerado. Uma cópia do corpo do guia |
| **Passagem** | O ato consentido de o fazer chegar a alguém, revogável | Uma lead vendida. Um acesso aos dados fiscais da pessoa |
| **Consola** | Onde o contabilista lê, seleciona, extrai e pede | Um editor do guia. Um sítio onde se muda o que a lei diz |

E a regra que atravessa tudo, herdada do Opportunity Discovery Engine:

> **Nenhum item chega ao ecrã do contabilista sem proveniência.** Manifesto,
> afirmação com fonte, motor fiscal, ou resposta da própria pessoa. Não há
> caminho no tipo para o evitar.

---

## 4. Arquitetura

### 4.1. Os módulos

```
src/lib/guias/dossie/
  tipos.ts               // Proveniencia, SeccaoDossie, ItemDossie, DossieDeGuia
  projecao.servidor.ts   // Guia → secções.  "server-only": arrasta o catálogo
  perguntas.ts           // aplicaSe/naoAplicaSe → perguntas respondíveis
  compor.ts              // secções + respostas + estado da checklist → dossiê
  fronteira.ts           // lista branca por secção (o CAMPOS_PARTILHA disto)
  impressao.ts           // hash estável do conteúdo (a prova do que seguiu)
  area.ts                // HubGroup/GuideTopic → AreaDoCaso  (achado A11)
  pedido.ts              // dossiê → Pedido de Elementos (a lista PBC)
  formatos/
    markdown.ts  csv.ts  ics.ts  json.ts
  __tests__/
```

Regra de empacotamento, já aprendida em `atalhos.servidor.ts`: **um componente
de cliente recebe dados, não importa catálogos.** `projecao.servidor.ts` é
`server-only` — importar `catalogo.ts` + `conteudo.ts` + `dados-motor.ts` num
componente de cliente traz meio megabyte. A folha de composição recebe o
`DossieDeGuia` já projetado, por props.

### 4.2. Os tipos

```ts
/** De onde vem cada item. Sem isto não há item. */
export type Proveniencia =
  | { origem: "manifesto"; slug: string }
  | { origem: "afirmacao"; claimId: string; fonteIds: LegalSourceId[];
      confianca: Confidence; severidade: ReviewSeverity;
      vigencia: { de: string; ate?: string } }
  | { origem: "fonte"; fonteId: LegalSourceId; autoridade: LegalSource["authority"];
      verificadaEm: string }
  | { origem: "motor"; ruleKey: string; ano: number }
  | { origem: "pacote"; guia: string; verificadoEm: string }
  | { origem: "pessoa"; campo: "checklist" | "resposta" | "nota" | "simulacao" };

export type IdSeccao =
  | "resumo"           // o caso em dez linhas (SBAR)
  | "aplicabilidade"   // o que a pessoa respondeu, incluindo «não sei»
  | "elementos"        // a checklist com estado  → vira lista PBC
  | "julgamento"       // afirmações review_required → agenda da consulta
  | "prazos"           // datas e vigências
  | "numeros"          // dados do ano, com base legal
  | "base_legal"       // fontes por autoridade
  | "avisos"           // bloqueadores do pacote
  | "simulacao"        // bagagem, se existir e se for consentida
  | "historico";       // o que mudou no guia desde a composição

export interface ItemDossie {
  id: string;                       // estável: `${seccao}.${n}` ou o claimId
  texto: string;                    // exatamente o que já está publicado
  proveniencia: Proveniencia;
  /** Só em `elementos`: o que a pessoa já disse sobre este item. */
  estado?: "tenho" | "por_reunir" | "nao_aplica" | "nao_sei";
  /** Só em `julgamento`: severidade, para ordenar a agenda. */
  peso?: ReviewSeverity;
  /** Só em `prazos`: a data que torna o item acionável. */
  quando?: { de: string; ate?: string };
}

export interface SeccaoDossie {
  id: IdSeccao;
  titulo: string;                   // pt-PT, para os dois lados
  itens: ItemDossie[];
  /** Consentida pela pessoa nesta passagem. Uma secção não consentida
      não é filtrada na leitura: não é composta de todo. */
  incluida: boolean;
}

export interface DossieDeGuia {
  versao: 1;
  guia: { slug: string; titulo: string; arquetipo: Archetype;
          categoria: Categoria; hub: HubGroup; area: AreaDoCaso };
  /** A VERSÃO LIDA. É isto que resolve a obrigação 3. */
  fixado: {
    revistoEm: string;              // manifesto.lastReviewedAt
    aplicavelDe: string; aplicavelAte?: string;
    appVersion: string;             // APP_VERSION
    compostoEm: string;             // ISO
    impressao: string;              // sha-256 das secções incluídas
  };
  seccoes: SeccaoDossie[];
  /** O que a pessoa escreveu, se escreveu. Opcional e curto. */
  nota?: string;
  consentimento: {
    versao: string;                 // CONSENTIMENTO_VERSAO
    seccoes: IdSeccao[];            // as que ela deixou seguir
    em: string;
    expiraEm: string;               // §10.3
  };
}
```

`impressao` é o `payload_hash` do handoff FIZ aplicado aqui: prova o que
seguiu sem obrigar a guardar duas cópias, e é o que permite dizer «este dossiê
foi feito sobre a versão de 26/07; o guia mudou a 06/08 — vê o que mudou».

### 4.3. Como cada secção é derivada

| Secção | Deriva de | Regra |
|---|---|---|
| `resumo` | `manifesto` + `respostaCurta` + nota da pessoa | Quatro campos, nunca mais |
| `aplicabilidade` | `aplicaSe[]` + `naoAplicaSe[]` + respostas | Cada critério vira pergunta de três estados |
| `elementos` | `checklist[]` / `oQuePreparar[]` + `localStorage` | Estado por item, numerado |
| `julgamento` | `claims` com `confidence === "review_required"` | Ordenado por `reviewSeverity` |
| `prazos` | `DadoAnual` com data + `claim.appliesUntil` + `prazos.ts` | Só o que tem data |
| `numeros` | `dadosDoGuia(slug).publicaveis` | `origem: "motor"` primeiro; retidos nunca entram |
| `base_legal` | `fontesDoGuia(slug).oficiais` | Ordem por autoridade, como na página |
| `avisos` | `CONTEUDO_EXPANSAO[].avisos` | Íntegros |
| `simulacao` | `bagagem.ts`, se válida | Já sanitizada na origem |
| `historico` | `HISTORICO_GUIAS` posterior a `fixado.revistoEm` | Calculado na leitura, não na composição |

Duas regras que impedem a degradação silenciosa:

1. **Nada é reescrito.** O `texto` de um item é a string publicada. Sem
   resumos, sem paráfrases, sem geração. Um teste compara item a item com a
   fonte (§13).
2. **Nada é inventado por ausência.** Guia sem `avisos` não gera secção
   `avisos` vazia — gera dossiê sem essa secção. Um dossiê tem, no mínimo,
   `resumo` e `base_legal`.

### 4.4. As perguntas

`perguntas.ts` converte cada critério de aplicabilidade numa pergunta de três
estados. É a peça que transforma prosa em enquadramento:

```ts
export interface PerguntaDeGuia {
  id: string;                    // `aplica.3` / `nao-aplica.1`
  texto: string;                 // o critério, tal e qual
  sentido: "confirma" | "exclui";
  resposta: "sim" | "nao" | "nao_sei";   // nasce em "nao_sei"
}
```

Três decisões, com motivo:

- **«Não sei» é a resposta por omissão e não é um erro.** É o sinal mais útil
  que o dossiê transporta: é por aí que o contabilista começa. Um formulário
  que obriga a escolher produz respostas inventadas, que são piores do que
  nenhuma.
- **Um «exclui» respondido «sim» não bloqueia o envio** — mostra um aviso
  («este guia diz que não se aplica a quem…; queres enviar na mesma?») e
  sugere o guia certo por `relatedGuideIds`. Bloquear seria fingir que o
  critério é decisivo, e há casos em que não é.
- **As afirmações `review_required` não viram perguntas ao cliente.** São
  técnicas e assustam sem resolver. Vão para a secção `julgamento`, que é
  escrita para o profissional.

### 4.5. A fronteira de dados

`fronteira.ts` é o `CAMPOS_PARTILHA` deste motor, e existe pela mesma razão:
lista branca, nunca negra.

```ts
export const CAMPOS_POR_SECCAO: Record<IdSeccao, readonly string[]> = {
  resumo:         ["titulo", "arquetipo", "categoria", "respostaCurta", "nota"],
  aplicabilidade: ["texto", "sentido", "resposta"],
  elementos:      ["texto", "estado"],
  julgamento:     ["texto", "peso", "fonteIds", "vigencia"],
  prazos:         ["texto", "quando"],
  numeros:        ["texto", "ruleKey", "ano"],
  base_legal:     ["fonteId", "autoridade", "titulo", "artigo", "url", "verificadaEm"],
  avisos:         ["texto"],
  simulacao:      [/* delega em CAMPOS_PARTILHA[tipo] — não duplica */],
  historico:      ["data", "tipo", "descricao"],
};
```

**O que nunca entra num dossiê, em nenhuma secção:**

- NIF, nome, email, telefone, morada. A identificação vive em `casos` e em
  `caso_contactos`, onde já tem regime próprio. Um dossiê é sobre o *assunto*,
  não sobre a *pessoa*.
- Texto livre que não seja a `nota` da própria pessoa (limitada e sanitizada
  por `feedback-sanitize.ts`).
- Documentos e anexos. Seguem por `caso_documentos`, com o regime de
  libertação que já existe. Um documento contém invariavelmente dados de
  terceiros — é a mesma razão que `handoff-fields.ts` já escreveu para a FIZ.
- Valores fiscais em bruto fora da secção `simulacao`, que é opcional, já
  sanitizada na origem e desligada por omissão.

---

## 5. Os três destinos, e o routing

### 5.1. A tabela

| | **D1 — o meu contabilista** | **D2 — escolher na plataforma** | **D3 — o meu contabilista, fora daqui** |
|---|---|---|---|
| Pré-condição | Vínculo ativo | Conta + nome/NIF | Conta |
| Transporte | `partilhas` (`tipo: 'dossie_guia'`) | `casos` + `caso_dossies` | `dossie_ligacoes` (token opaco) |
| Quem recebe | Uma pessoa escolhida | Até 3 (teto da 051) | Quem tiver a ligação |
| Consola | Sim, autenticada | Sim, autenticada | Sim, sem conta, só leitura + pedido |
| Revogação | `estado = 'revogada'` | Retirar do caso | Revogar a ligação (corta já) |
| Expira | Não (o vínculo governa) | Com o caso | **Sim — 30 dias, prorrogável** |
| Custo | Zero, sempre | Zero, sempre | Zero, sempre |

`PARTILHA_NUNCA_EXIGE_PLUS` aplica-se aos três. Criar um `Entitlement` para
isto seria criar a possibilidade de o cobrar.

### 5.2. Porque é que D3 existe, e porque é que não é um link

A maioria de quem lê estes guias já tem contabilista, e esse contabilista não
está na plataforma. Sem D3, o motor só serve a minoria — e a instrução foi
explícita: **não é um simples link que a pessoa envia.**

D3 é uma ligação com propriedades que um link não tem:

- **opaca** — `/d/<id>#<token>`; o token viaja no *fragmento*, que o browser
  não põe no `Referer` nem em logs de servidor (é a lição de `busca/handoff.ts`
  aplicada a um contexto persistente);
- na base fica só **`token_hash`**, nunca o token — quem lê a tabela não abre
  dossiê nenhum;
- **expira** (30 dias) e **revoga-se** com efeito imediato;
- **regista acessos** — a pessoa vê «aberto 2 vezes, o último a 3 de setembro»;
- **não dá acesso a mais nada.** Não é sessão, não é conta, não vê outros
  dossiês, não vê o painel.
- e do outro lado **há consola**: extrair, selecionar, pedir elementos. É por
  isso que não é um link — é uma superfície de trabalho com fronteira.

### 5.3. Routing: uma ação principal, e o motivo à vista

`escolherRota()` ganha sinais de guia, e o Guia passa a chamá-lo (achado A4):

```ts
export interface SinaisDoUtilizador {
  // …os que já existem…
  /** Arquétipo do guia que a pessoa está a ler. */
  arquetipoDoGuia?: Archetype;
  /** Quantas afirmações deste guia exigem revisão especializada. */
  afirmacoesPorRever?: number;
  /** Progresso da checklist: 0..1. Sinal de intenção, não de valor. */
  preparacao?: number;
}
```

Uma regra nova, entre a 2 (contabilista vinculado) e a 3 (caso exige
profissional), e uma só:

```ts
// 2b. O guia diz, ele próprio, que isto precisa de julgamento.
//     `review_required` não é uma opinião do produto: é uma marca editorial
//     posta por quem escreveu, revista no build, e que já é mostrada ao
//     leitor em `EstadoRevisaoGuia`. Mandar essa pessoa executar seria
//     mandá-la fazer sozinha o que o texto acabou de dizer que não deve.
if ((s.afirmacoesPorRever ?? 0) > 0) {
  return monta("contabilista", "caso_exige_profissional");
}
```

Efeito prático nos 169 guias: 128 passam a ter o contabilista como ação
principal e a FIZ como segunda linha; 41 mantêm a FIZ em primeiro. **Nunca as
duas com o mesmo peso** — a hierarquia é a de `escolherRota()`, e o motivo é
mostrado, como o §13.2 da estratégia exige.

Nos 112 guias da expansão, onde não há ação FIZ nenhuma (A3), passa a haver
uma ação: esta.

### 5.4. O mapa de vocabulário (A11)

`area.ts` resolve `HubGroup → AreaDoCaso` com exceções declaradas por slug, e
um teste exige que os 169 resolvam:

| HubGroup | AreaDoCaso |
|---|---|
| `comecar` | `inicio_atividade` |
| `faturar` | `iva` |
| `contribuir` | `seguranca_social` |
| `irs`, `investir`, `familia`, `reforma`, `estrangeiro` | `irs` |
| `empresa` | `empresa` |
| `conta-outrem` | `irs` |
| `casa`, `prazos`, `direitos`, `encerrar`, `profissao` | por slug, com omissão `outro` |

Exceções por slug (exemplos): `contabilidade-organizada` →
`contabilidade_organizada`; qualquer guia de heranças → `herancas`;
`cessar-atividade` e `fechar-empresa` → `empresa` ou `inicio_atividade`
conforme o público. O mapa é uma tabela, não uma heurística: heurística com
169 casos falha em silêncio.

---

## 6. A consola do contabilista

É aqui que a instrução «extrair de forma simplificada e poder selecionar o que
precisa» se cumpre.

### 6.1. Vista 1 — o caso em dez linhas

Estrutura SBAR, adaptada, e é a primeira coisa que aparece nos três destinos:

```
SITUAÇÃO      «Recebi uma citação de execução fiscal.»        (nota da pessoa)
ENQUADRAMENTO Independente · IRS · guia «Execução fiscal»
              versão de 26/07/2026 · composto a 04/09/2026
O QUE O GUIA  «A citação abre um prazo curto e é o momento em que ainda
RESPONDE      tens três saídas: pagar, prestar garantia…»    (respostaCurta)
O QUE FALTA   4 elementos por reunir · 3 perguntas em «não sei»
              · 2 pontos que exigem julgamento profissional
```

Dez linhas, quatro campos, zero cliques. É o que a literatura de passagem
chama passagem quente, e é o que evita o «e afinal o que é que querias?».

### 6.2. As sete vistas de extração

Cada uma é uma projeção do mesmo dossiê, com caixa de seleção por item:

| Vista | O que mostra | Ação natural da seleção |
|---|---|---|
| **Elementos** | Checklist com estado por item | **Pedir ao cliente** (lista PBC) |
| **Perguntas** | Aplicabilidade, «não sei» primeiro | **Devolver como perguntas** |
| **Julgamento** | `review_required`, por severidade | **Agenda / itens do orçamento** |
| **Base legal** | Fontes por autoridade, com artigo e URL | **Copiar como citações** |
| **Prazos** | Datas, vigências, `appliesUntil` | **Exportar `.ics`** |
| **Números** | Dados do ano, com `ruleKey` e base legal | **Copiar tabela** |
| **Alterações** | O que mudou no guia desde a composição | **Marcar como visto** |

Nas três primeiras a seleção produz trabalho; nas outras produz material. A
seleção é o estado central da consola:

```ts
export interface Selecao { itens: Set<string>; }          // ids de ItemDossie

export type AcaoDeExtracao =
  | { tipo: "copiar"; formato: "markdown" | "texto" }
  | { tipo: "exportar"; formato: "md" | "csv" | "ics" | "json" }
  | { tipo: "pedir"; prazoDias?: number }                  // → Pedido de Elementos
  | { tipo: "perguntar" }                                  // → perguntas ao cliente
  | { tipo: "anexar_a_proposta"; propostaId: string };
```

### 6.3. A volta: o Pedido de Elementos

É o que fecha o ciclo e o que faz disto um motor e não uma exportação. Do lado
do cliente aparece onde ele já olha: no caso, na sala, e — a peça bonita — **de
volta na checklist do próprio guia**, com os itens pedidos marcados «o teu
contabilista pediu isto».

```ts
export interface PedidoDeElementos {
  id: string;
  dossie: { ref: string; guia: string; impressao: string };
  itens: {
    n: number;                       // numerado: a convenção PBC
    texto: string;                   // o item do guia, tal e qual
    proveniencia: Proveniencia;      // continua a saber-se de onde veio
    estado: "pedido" | "entregue" | "nao_aplica" | "dispensado";
    prazo?: string;                  // por item, não global (§2.1)
    nota?: string;                   // do contabilista, curta
  }[];
  criadoEm: string;
}
```

Regras:

- **Numerado e por item**, com prazo por item. É a prática que a indústria
  apurou e é a que faz responder.
- **Só itens que existem no dossiê**, ou itens novos escritos pelo
  contabilista — e esses ficam marcados como tal (`origem: "profissional"`).
  Nunca se pode confundir o que o Guia disse com o que o profissional pediu.
- **Um pedido não pede documentos por anexo direto.** A entrega passa por
  `caso_documentos` e pelo regime de vagas que já existe
  (`anexo_vagas`, `fechar_vaga`).
- **Sem prazos inventados.** Um item só ganha prazo se o contabilista o
  escrever, ou se vier de uma data do próprio guia.

### 6.4. Formatos de saída

| Formato | Para quê | Regra |
|---|---|---|
| `markdown` | Colar no processo do escritório | Cabeçalho com guia, versão, data, impressão |
| `csv` | Elementos, para folha de cálculo | Uma linha por item, com número |
| `ics` | Prazos na agenda | Reaproveita `lib/calendario/ics.ts` |
| `json` | Quem integra | Com `impressao`, sem PII |

Todos levam o mesmo rodapé, e é obrigatório:

> Gerado pelo Recibo Certo a partir do guia «X», versão de DD/MM/AAAA
> (impressão `abc123…`). Conteúdo informativo com fontes citadas. **Não é
> parecer nem substitui o julgamento do contabilista certificado.**

### 6.5. O que a consola nunca faz

- Não edita o Guia, não corrige afirmações, não altera fontes. Um erro
  encontrado vai por `site_feedback` — que já existe — e chega à equipa
  editorial.
- Não mostra secção que não foi consentida. Não é filtrada na leitura: **não
  foi composta**.
- Não dá acesso a outros dossiês, a outros casos, nem a nada do painel.
- Não permite exportar o que não está selecionado. «Exportar tudo» seleciona
  tudo à vista — visível, e contado no evento.

---

## 7. Modelo de dados

Uma migração, idempotente, no estilo das anteriores. Esboço com as decisões
que importam; o SQL final segue a casa (`SECURITY DEFINER`, `search_path`,
`REVOKE`/`GRANT` explícitos, comentários em pt-PT a dizer *porquê*).

### 7.1. D1 — `partilhas` admite mais um tipo

```sql
-- Mesmo padrão de 20260824090000 e 20260824093000: um TipoPartilha novo em
-- src/lib/contabilistas/tipos.ts sem entrar aqui faz o insert falhar sempre
-- com a violação 23514.
ALTER TABLE public.partilhas DROP CONSTRAINT partilhas_tipo_check;
ALTER TABLE public.partilhas ADD CONSTRAINT partilhas_tipo_check
  CHECK (tipo IN ( …os dez atuais…, 'dossie_guia' ));
```

E em `vinculo.ts`, `CAMPOS_PARTILHA.dossie_guia` delega em `fronteira.ts` —
uma lista branca, não duas a divergir.

### 7.2. D2 — `caso_dossies`

```sql
CREATE TABLE IF NOT EXISTS public.caso_dossies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id     uuid NOT NULL REFERENCES public.casos(id) ON DELETE CASCADE,
  guia_slug   text NOT NULL CHECK (char_length(guia_slug) BETWEEN 2 AND 80),
  -- A versão LIDA. Sem isto, três semanas depois ninguém sabe sobre que
  -- texto se falou — e os guias mudam (é para isso que existe o histórico).
  guia_revisao date NOT NULL,
  app_version  text NOT NULL,
  -- O dossiê, inteiro e inerte. Cópia, nunca apontador para dados vivos:
  -- um apontador daria leitura contínua, que é o que a 038 fechou.
  dossie      jsonb NOT NULL,
  impressao   text NOT NULL CHECK (impressao ~ '^[0-9a-f]{64}$'),
  consentimento_versao text NOT NULL,
  consentimento_seccoes text[] NOT NULL DEFAULT '{}',
  retirado_em timestamptz,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caso_id, guia_slug, impressao)   -- o mesmo dossiê não entra duas vezes
);
```

RLS: lê o dono do caso (`dono_do_caso`), lê quem está encaminhado
(`encaminhado_para`, que já exclui contabilista suspenso), lê a administração.
`INSERT` só por RPC. `UPDATE`/`DELETE` revogados — retirar é uma transição, não
um `delete`.

### 7.3. D3 — `dossie_ligacoes`

```sql
CREATE TABLE IF NOT EXISTS public.dossie_ligacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guia_slug    text NOT NULL,
  guia_revisao date NOT NULL,
  dossie       jsonb NOT NULL,
  impressao    text NOT NULL,
  -- ⚠️ O TOKEN NUNCA ESTÁ AQUI. Só o seu sha-256. Quem lê a tabela — e a
  -- administração lê — não consegue abrir dossiê nenhum. É a mesma regra
  -- que `partner_connections` aplica aos tokens da FIZ, levada ao fim:
  -- ali cifram-se, aqui nem sequer se guardam.
  token_hash   text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  -- Uma etiqueta escolhida pela pessoa («O meu contabilista»). Não é um
  -- contacto e não se valida como tal: é para ela se lembrar.
  etiqueta     text CHECK (etiqueta IS NULL OR char_length(etiqueta) <= 60),
  consentimento_versao text NOT NULL,
  consentimento_seccoes text[] NOT NULL DEFAULT '{}',
  expira_em    timestamptz NOT NULL,
  revogada_em  timestamptz,
  acessos      integer NOT NULL DEFAULT 0,
  ultimo_acesso timestamptz,
  criado_em    timestamptz NOT NULL DEFAULT now()
);
```

RLS: **uma única política** — o dono lê e revoga as suas. `anon` não tem
política nenhuma, exatamente como `partner_events`: com RLS ligado e sem
política, não há caminho. A leitura pública passa por uma rota de servidor que
recebe o token, calcula o hash, e chama uma RPC de `service_role` que verifica
expiração e revogação, incrementa `acessos` e devolve o `dossie`. Um `USING`
mal escrito abre-se um dia; o que não existe não se abre por engano.

Limite diário, com a lição já aprendida: `LIMITE_DOSSIES_DIA` em TypeScript é
um espelho — quem impõe é um gatilho, como em
`20260824100000_limite_diario_de_partilhas`. A constante sozinha não impediu
nada durante meses.

### 7.4. A volta — `dossie_pedidos` e `dossie_pedido_itens`

```sql
CREATE TABLE IF NOT EXISTS public.dossie_pedidos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Exatamente uma das três origens. O CHECK impede um pedido órfão ou
  -- um pedido com dois donos.
  partilha_id     uuid REFERENCES public.partilhas(id)        ON DELETE CASCADE,
  caso_dossie_id  uuid REFERENCES public.caso_dossies(id)     ON DELETE CASCADE,
  ligacao_id      uuid REFERENCES public.dossie_ligacoes(id)  ON DELETE CASCADE,
  CONSTRAINT uma_origem CHECK (
    (partilha_id IS NOT NULL)::int + (caso_dossie_id IS NOT NULL)::int
    + (ligacao_id IS NOT NULL)::int = 1),
  contabilista_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- nulo em D3
  estado          text NOT NULL DEFAULT 'aberto'
                    CHECK (estado IN ('aberto','respondido','fechado')),
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dossie_pedido_itens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id  uuid NOT NULL REFERENCES public.dossie_pedidos(id) ON DELETE CASCADE,
  n          integer NOT NULL CHECK (n > 0),      -- a convenção PBC
  texto      text NOT NULL CHECK (char_length(texto) BETWEEN 3 AND 400),
  -- 'guia' quando o item veio do dossiê; 'profissional' quando foi escrito.
  -- Confundir os dois seria pôr na boca do Guia o que ele não disse.
  origem     text NOT NULL CHECK (origem IN ('guia','profissional')),
  item_id    text,                                -- ItemDossie.id, quando origem='guia'
  prazo      date,
  estado     text NOT NULL DEFAULT 'pedido'
               CHECK (estado IN ('pedido','entregue','nao_aplica','dispensado')),
  respondido_em timestamptz,
  UNIQUE (pedido_id, n)
);
```

O texto de um item pedido é imutável depois de enviado — gatilho, como
`mensagem_corpo_imutavel`. Quem quiser mudar envia outro pedido; o anterior
fica a dizer o que tinha sido pedido.

### 7.5. Auditoria de leitura — `dossie_acessos`

Uma linha por abertura e por extração, com `acao`, `quando` e a origem. Sem IP,
sem *user agent*. Serve a pessoa («o teu dossiê foi aberto duas vezes»), não
serve para vigiar ninguém. Purgada com o dossiê.

### 7.6. Apagar leva tudo

O catálogo em `src/lib/conta/catalogo.ts` tem um teste que o compara com as
tabelas que as migrações criam — foi ele que apanhou a omissão dos casos antes
de chegar a produção. Portanto, na mesma migração:

- `conjuntos_todos()` ganha `'dossies'`;
- `apagar_conjuntos()` apaga `dossie_ligacoes` do utilizador (os
  `caso_dossies` saem com o caso, em cascata);
- `inventario_do_utilizador()` conta-os;
- `catalogo.ts` e `catalogo-local.ts` ganham a entrada correspondente.

---

## 8. Interface

### 8.1. No Guia — um bloco, não dois botões

`GuiaLayout` passa a compor um único bloco terminal, `ProximoPassoDoGuia`, que
recebe a rota de `escolherRota()`:

```
GuiaLayout → … → ChecklistGuia → ProximoPassoDoGuia → SimuladoresRelacionados
```

`ProximoPassoDoGuia` mostra **uma** ação principal e, quando existe, uma
segunda em texto (nunca em botão do mesmo peso):

- rota `contabilista` → «Levar isto a um contabilista» + linha «ou executar na
  FIZ», quando há `fizAction`;
- rota `fiz` → o cartão FIZ que já existe, intacto, + linha «ou levar isto a um
  contabilista»;
- rota `sem_parceiro` → nenhuma das duas. A guarda de confiança mantém-se.

O motivo (`MotivoRota`) fica visível, em pt-PT, como o §13.2 exige — «este guia
tem 2 pontos que exigem revisão especializada».

E `NotaDisclaimer` deixa de mandar para `occ.pt` como único destino (A1b):
mantém a referência à Ordem e acrescenta o caminho de casa.

### 8.2. A folha de composição — três passos

Folha inferior, mobile-first, `max-h-[90dvh]`, corpo `min-h-0 overflow-y-auto`,
`env(safe-area-inset-*)`, alvos ≥ 44 px (a checklist já usa
`min-h-[44px]`), sem emojis, `.dark` como camada, `prefers-reduced-motion`
respeitado. As regras de sempre.

1. **O que segue** — as secções, com contagem por secção e pré-visualização
   real. Ligar e desligar por secção. É aqui que a divulgação seletiva vive.
2. **O teu caso** — as perguntas de aplicabilidade («não sei» já escolhido) e
   uma nota opcional. Nada obrigatório.
3. **A quem** — os três destinos, com o consentimento à vista, o texto
   versionado, e o que acontece a seguir dito em duas linhas.

O botão final nunca diz «Enviar». Diz o que faz: «Enviar ao João Silva»,
«Enviar a 2 contabilistas», «Criar ligação».

### 8.3. Do lado do contabilista

- `/contabilista/casos/<id>` — o dossiê entra na página do caso que já existe,
  como separador, com a vista «o caso em dez linhas» aberta.
- `/contabilista/dossies` — os dossiês recebidos por partilha (D1).
- `/d/<id>` — a página pública de D3. Sem conta, só leitura, com consola de
  seleção e um único ato de escrita: enviar um pedido de elementos.

Secções pesadas (tabelas longas, exportação de PDF) entram por
`next/dynamic({ ssr: false })` dentro de `ErrorBoundary` — nunca deixar a
página em branco.

### 8.4. A volta, na checklist

`ChecklistGuia` passa a mostrar, quando existe pedido aberto para aquele guia,
um estado por item: «pedido pelo teu contabilista · até 12/09». É a
continuidade que fecha o ciclo: a pessoa volta ao mesmo sítio onde marcou os
itens e encontra lá o trabalho. Sem conta, o componente comporta-se
exatamente como hoje.

---

## 9. Medição

Eventos novos, cada um com disparo, pergunta do painel a que serve e origem —
sem entrada em `CATALOGO`, o tracker recusa. Contagens em balde
(`baldeDeValor`), nunca valores; nenhum evento leva `guia_slug` + dados
fiscais no mesmo sítio.

| Evento | Disparo | Serve a |
|---|---|---|
| `guide_dossier_start` | Folha de composição aberta | Que guias geram procura de profissional (A12) |
| `guide_dossier_ready` | Dossiê composto, antes de enviar | Onde se desiste na composição |
| `guide_dossier_sent` | Passagem feita | Volume por destino (D1/D2/D3) |
| `guide_dossier_opened` | Aberto pelo destinatário (servidor) | Taxa de leitura real |
| `guide_dossier_extract` | Extração com seleção | **Que secções valem** — a pergunta central |
| `guide_dossier_request` | Pedido de elementos enviado | Se o motor gera trabalho ou só leitura |
| `guide_dossier_request_answered` | Cliente respondeu a um item | O ciclo fecha-se? |
| `guide_dossier_revoked` | Revogação | Sinal de confiança |

`guide_dossier_extract` é o que responde à pergunta que decide o futuro do
motor: das sete vistas, quais é que os contabilistas usam mesmo. Se ao fim de
um trimestre só três forem usadas, cortam-se as outras quatro.

Os eventos `accountant_*` que já existem passam a ser disparados a partir dos
Guias, com `entry_page` a dizer qual.

---

## 10. Segurança, privacidade e conformidade

### 10.1. Consentimento

`CONSENTIMENTO_VERSAO` sobe (regra da casa: nunca mudar o texto sem subir a
versão). O texto novo diz três coisas que o atual não diz: **que secções**
seguem, **até quando**, e **como se revoga**. A linha guarda `versao`,
`seccoes` e `expira_em` — os campos que a ISO/IEC TS 27560 chama de registo, na
parte que aqui tem uso real.

### 10.2. Minimização, a sério

A secção não consentida **não é composta**. Não é escondida na leitura, não é
filtrada na apresentação: não existe no `jsonb`. É a mesma diferença entre uma
coluna que se evita num `select` e uma tabela que não se alcança — a lição de
`caso_contactos`.

### 10.3. Retenção

D3 expira em 30 dias, prorrogável pela pessoa. D1 e D2 vivem enquanto o vínculo
ou o caso viverem. A revogação corta o acesso; não apaga o histórico do
próprio, que é dele.

### 10.4. RGPD

Transmissão consentida entre **responsáveis autónomos** (§2.8), com finalidade
declarada («obter apoio profissional sobre o assunto deste guia»), base no
Art. 6.º, n.º 1, al. a), minimização estrutural e revogação efetiva. Não há
contrato de subcontratação a assinar por contabilista para este fluxo, e não
se deve fingir que há.

### 10.5. OCC

O dossiê não é o contrato de prestação de serviços — esse é dever do
contabilista e aparece na `proposta`. O pedido de elementos é a forma digital
de um direito que a profissão já tem. Nenhuma copy pode sugerir o contrário.

### 10.6. Tokens

Só o hash na base. TTL obrigatório. Revogação imediata. Limite de tentativas
por IP na rota pública (`rate-limit.ts` já existe). Token no fragmento do URL,
nunca na query.

---

## 11. As fronteiras — o que este motor nunca faz

Em código, testável, ao lado de `NUNCA_COMUNICAR`:

```ts
export const DOSSIE_NUNCA: readonly string[] = [
  "Gerar, resumir ou reescrever conteúdo de um Guia. O que segue é o que está publicado.",
  "Transportar NIF, nome, email, telefone, morada ou documentos.",
  "Dizer, ou deixar entender, que o dossiê é um parecer ou uma submissão.",
  "Dar a um contabilista acesso a dados fiscais que não foram enviados nesta passagem.",
  "Cobrar, condicionar ao Plus ou usar como isco de subscrição.",
  "Enviar a mesma passagem a mais contabilistas do que o teto da 051.",
  "Manter acesso depois de revogado, expirado ou com o vínculo terminado.",
  "Deixar um item chegar ao ecrã sem proveniência.",
];
```

Verificado por teste sobre a copy, como `parcerias:copy` já faz para os cartões
da FIZ.

---

## 12. Plano de implementação

Cinco fases. Cada uma entrega valor sozinha e tem um portão de conclusão.

### Fase 0 — a projeção, sem interface e sem base de dados

`dossie/tipos.ts`, `projecao.servidor.ts`, `perguntas.ts`, `compor.ts`,
`fronteira.ts`, `impressao.ts`, `area.ts` e os testes.

**Pronto quando:** os 169 guias produzem dossiê válido; cada item tem
proveniência; nenhum item difere da fonte publicada; `area.ts` resolve os 169;
`npm run build` limpo.

### Fase 1 — exportação e D1

Folha de composição, formatos `md`/`csv`/`ics`/`json`, envio para vínculo ativo
(`partilhas`), consola mínima (as sete vistas em leitura, com seleção e
`copiar`/`exportar`).

**Pronto quando:** quem tem contabilista consegue enviar; quem não tem consegue
exportar; `movel:e2e` passa; nada mudou para quem não usa.

### Fase 2 — D2 e a pré-composição do caso

`caso_dossies`, pré-preenchimento de `assunto`/`area`/`situacao` a partir do
dossiê (A10), com tudo editável, e a entrada do dossiê na página do caso.

**Pronto quando:** um caso nasce de um guia em três passos; `rls:check` passa;
a purga leva os dossiês.

### Fase 3 — a consola completa e a volta

`dossie_pedidos`, `dossie_pedido_itens`, a ação `pedir`, e o estado de volta na
`ChecklistGuia`.

**Pronto quando:** um contabilista seleciona 4 itens e o cliente vê-os na
checklist do guia, com prazo.

### Fase 4 — D3

`dossie_ligacoes`, rota `/d/<id>`, auditoria de acessos, revogação, expiração,
limite diário por gatilho.

**Pronto quando:** um contabilista sem conta abre, extrai e pede; a pessoa
revoga e o acesso morre no mesmo instante; a tabela não expõe token nenhum.

### Fase 5 — routing e cobertura

`escolherRota()` com sinais de guia, `ProximoPassoDoGuia` nos 169,
`NotaDisclaimer` corrigido, eventos ligados, changelog e versão.

**Pronto quando:** nenhum guia mostra duas ações do mesmo peso; os 112 da
expansão têm passo seguinte; `guias:check`, `ligacoes:check`, `parcerias:copy`
e `movel:e2e` passam.

---

## 13. Testes e portões novos

| Script | O que reprova |
|---|---|
| `dossie:projecao` | Um guia que não produz dossiê válido; um item sem proveniência |
| `dossie:fidelidade` | Um `texto` de item que difere da string publicada no guia |
| `dossie:fronteira` | Um campo fora da lista branca; PII em qualquer secção; import de catálogo em módulo de cliente |
| `dossie:area` | Um dos 169 guias sem `AreaDoCaso` resolvida |
| `dossie:copy` | Copy que promete parecer, submissão, ou que sugere custo |
| `dossie:purga` | Tabela nova que não entra em `conjuntos_todos()` nem no catálogo da conta |

Portões existentes a correr sem exceção: `guias:check`, `ligacoes:check`,
`movel:e2e`, `rls:check`, `migracoes:check`, `parcerias:copy`,
`security:boundary`, `npm run build`, `npm audit --audit-level=high`. E a regra
9: `APP_VERSION`, entrada no `CHANGELOG`, `versao:fix`, `novidades:gen`.

---

## 14. Decisões que precisam do dono

1. **D3 entra?** É o destino que serve a maioria e o único que deixa material
   nosso, com a nossa marca, em cima da secretária de um contabilista que
   ainda não nos conhece. *Recomendação: sim, na Fase 4, com 30 dias e
   revogação.*
2. **A rota do contabilista passa à frente da FIZ em 128 guias.** É o que a
   hierarquia do `routing.ts` já mandava, mas tem efeito comercial real na
   receita de afiliação. *Recomendação: sim — a FIZ mantém-se em segunda
   linha, e ganha nos 41 guias de execução, onde converte melhor.*
3. **Um dossiê pode ir a 3 contabilistas (teto da 051) ou só a 1?**
   *Recomendação: seguir o teto que já existe; inventar um segundo teto para a
   mesma coisa é como o motor se contradiz.*
4. **A secção `simulacao` (bagagem) entra por omissão?** *Recomendação: não.
   Desligada, com um passo explícito. É a única secção com valores fiscais.*
5. **A consola de D3 pode enviar pedido de elementos sem conta?**
   *Recomendação: sim, uma vez por dossiê, com o texto a dizer que quem pede
   não está verificado pela plataforma.*
6. **`review_required` como gatilho de rota:** aceitar que uma marca editorial
   passe a decidir uma rota comercial. *Recomendação: sim, e é o argumento mais
   honesto que o produto tem — a rota nasce do texto, não do preço.*

---

## 15. O que ficou em código — e onde diverge do relatório

Escrito depois da implementação, e não antes: um relatório que se declara
«implementado» sem dizer ONDE obriga quem vier a seguir a procurar.

### 15.1. O mapa

| Peça do relatório | Ficheiro |
|---|---|
| §4.2 tipos, proveniência, secções | `src/lib/guias/dossie/tipos.ts` |
| §4.3 projeção das secções | `src/lib/guias/dossie/projecao.servidor.ts` |
| §4.4 perguntas de três estados | `src/lib/guias/dossie/perguntas.ts` |
| §4.5 fronteira de dados | `src/lib/guias/dossie/fronteira.ts` |
| §4.2 impressão (sha-256) | `src/lib/guias/dossie/impressao.ts` |
| composição (projeção + respostas) | `src/lib/guias/dossie/compor.ts` |
| §5.4 mapa de vocabulário (A11) | `src/lib/guias/dossie/area.ts` |
| §5.3 routing e hierarquia (A4) | `src/lib/routing.ts` + `dossie/passo.ts` |
| §6.3 pedido de elementos (lista PBC) | `src/lib/guias/dossie/pedido.ts` |
| §6.4 formatos de saída | `src/lib/guias/dossie/formatos/` |
| §8.1 um bloco, não dois botões | `src/components/guias/ProximoPassoDoGuia.tsx` |
| §8.2 folha de composição, três passos | `src/components/guias/dossie/FolhaDossie.tsx` |
| §6 consola, sete vistas com seleção | `src/components/guias/dossie/ConsolaDossie.tsx` |
| §8.4 a volta, na checklist | `src/components/guias/ChecklistGuia.tsx` |
| §8.1 `NotaDisclaimer` corrigido (A1b) | `src/components/guias/NotaDisclaimer.tsx` |
| §5.1 D1 · tipo de partilha novo | `20260904120000_partilha_admite_dossie_de_guia.sql` |
| §7 D2, D3, a volta e a purga | `20260904121000_dossie_de_guia.sql` |
| §5.1 transporte dos três destinos | `src/lib/guias/dossie/dados.ts` |
| §A10 pré-composição do caso | `src/lib/guias/dossie/handoff.ts` |
| §8.3 `/d/<id>` | `src/app/d/[id]/` + `src/app/api/dossie/` |
| §8.3 `/contabilista/dossies` | `src/app/contabilista/dossies/page.tsx` |
| §10.3 revogar e prorrogar | `src/app/dashboard/dossies/page.tsx` |
| §9 os oito eventos | `src/lib/analytics/eventos.ts` |
| §13 os portões | `src/lib/__tests__/guias-dossie.test.ts` |

### 15.2. As divergências, e o motivo de cada uma

**A tabela `CAMPOS_POR_SECCAO` do §4.5 tinha duas semânticas.** Na entrada
`resumo` listava campos do CABEÇALHO do dossiê («titulo», «arquetipo»,
«categoria») ao lado de campos de item. Duas semânticas na mesma tabela é
o tipo de ambiguidade que se paga seis meses depois, quando alguém
acrescenta uma entrada com a semântica errada e nada o reprova. Ficou uma
semântica só — as chaves que um ITEM pode transportar — e o cabeçalho
ganhou lista própria, `CAMPOS_DO_CABECALHO`. As duas são verificadas pelo
mesmo teste.

**`AreaDoCaso` mudou de casa.** Vivia em `contabilistas/casos.ts`, ao lado
das funções que falam com o Supabase. Enquanto só o painel a usava, não
custava nada; deixou de ser verdade quando o motor passou a precisar dela.
Um `import type` não pesa um byte no bundle, mas deixa uma ARESTA no grafo
— e `contabilistas-demonstracao.test.ts` reprova-a, com razão. Passou para
`contabilistas/areas.ts`, puro, e `casos.ts` reexporta-a.

**O `escolherRota()` decide a hierarquia, não a existência do dossiê.** O
relatório escreve, no §8.1, «rota `sem_parceiro` → nenhuma das duas». Isso
mantém-se para a guarda de confiança — resultado fora de escopo ou página
sem resposta não abrem rota nenhuma. Mas um guia que simplesmente não dá
sinal suficiente para uma rota COMERCIAL continua a poder levar o caso a um
contabilista: o dossiê não depende de capacidade acordada com parceiro
nenhum, é nosso e é gratuito. Sem isto, parte dos 169 guias voltaria a não
ter passo seguinte — que é exatamente o achado A3.

**O efeito nos 169 é 147/22, e não os 128/41 estimados no §5.3.** O
relatório contou 128 guias com matéria `review_required`; o código conta
130. A diferença grande está do outro lado: dos 39 guias sem essa marca,
só 26 declaram capacidade da FIZ, e 4 desses são guias de empresa — que a
hierarquia do `routing.ts` manda para um profissional por serem de
sociedade, e não por causa do dossiê. Sobram 22 em que a FIZ fica em
primeiro. Os 41 do relatório assumiam que todos os guias sem revisão
tinham ação FIZ; não têm, e é isso que o achado A3 já dizia.

**Os prazos do calendário nacional entram só onde o guia os declara.** O
§4.3 lista `prazos.ts` como fonte da secção `prazos`. O calendário tem três
categorias e a plataforma tem oito áreas; só três se correspondem, e mesmo
essas só entram quando o guia declara a ferramenta de prazos ou vive no hub
dos prazos. Um guia sobre penhoras não precisa da agenda do IVA, e despejar
o calendário inteiro num dossiê é o oposto do que o dossiê promete.

**A ação «perguntar» copia, não envia.** O §6.2 dá-lhe o destino «devolver
como perguntas». Os três destinos têm canais diferentes — a conversa do
vínculo, as mensagens do caso, e nada em D3 — e inventar aqui um quarto
canal era criar uma caixa de entrada que ninguém lê. A consola prepara o
texto; quem o envia escolhe por onde.

**`catalogo-local.ts` não ganhou entrada.** O §7.6 pedia-o a par de
`catalogo.ts`. As três tabelas novas são todas da nuvem: não há nada de
novo no aparelho para catalogar. O estado da checklist continua onde
estava, fora do cofre, e mudá-lo era uma alteração de armazenamento que
este trabalho não pediu.

**A migração ficou em duas.** A constraint de `partilhas` é a única
alteração desta série que toca numa tabela em produção, e uma constraint
que se recria isolada lê-se, revê-se e reverte-se sem arrastar
quatrocentas linhas de esquema novo atrás.

### 15.3. As seis decisões do §14, como ficaram

1. **D3 entra?** Sim — `dossie_ligacoes`, 30 dias, revogação imediata,
   contador de aberturas, só o hash do token na base.
2. **A rota do contabilista à frente da FIZ.** Sim, e por `review_required`:
   a regra 2b de `escolherRota()`. A FIZ mantém-se em segunda linha, em
   texto, sempre que o guia declara capacidade.
3. **Teto de destinatários.** Segue o teto que já existe — D2 nasce como um
   caso, e o caso tem o seu.
4. **A secção `simulacao` por omissão.** Desligada, com um passo explícito.
   É a única com valores fiscais.
5. **Pedido sem conta em D3.** Sim, uma vez por ligação, com o texto a
   dizer que quem pede não está verificado pela plataforma.
6. **`review_required` como gatilho de rota.** Sim. É o argumento mais
   honesto que o produto tem: a rota nasce do texto, não do preço.

---

## Anexo A — Inventário por origem

| | Estáticos | Expansão | Total |
|---|---:|---:|---:|
| Guias | 57 | 112 | **169** |
| Com corpo | 57 | 110 | 167 |
| Com ação FIZ | 54 | 0 | 54 |
| Com `FIND_ACCOUNTANT` | 29 | 0 | 29 |
| Itens de checklist | 217 | 397 | **614** |
| Afirmações | 183 | 112 | 295 |
| — que exigem profissional | 87 | 102 | **189** |
| Guias que exigem profissional | 26 | 102 | **128** |

---

## Anexo B — Fontes consultadas

[r1]: https://contentsnare.com/pbc-list/
[r2]: https://www.suralink.com/library/understanding-the-fundamentals-of-pbc-provided-by-client-request-lists
[r3]: https://www.auditdashboard.com/post/what-is-a-pbc-request-list-or-pbc-list
[r4]: https://contentsnare.com/karbon-client-portal-alternative/
[r5]: https://www.usefini.com/guides/ai-customer-support-platforms-handoff-quality-context-preservation
[r6]: https://www.bluetweak.com/blog/ai-to-human-handoff
[r7]: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12431931/
[r8]: https://www.heidihealth.com/en-us/blog/sbar-template-with-examples
[r9]: https://www.iso.org/standard/80392.html
[r10]: https://arxiv.org/pdf/2405.04528
[r11]: https://w3c-cg.github.io/dpv/guides/consent-27560
[r12]: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-16
[r13]: https://docs.walt.id/concepts/digital-credentials/sd-jwt-vc
[r14]: https://curity.io/blog/selective-disclosure-jwts-keep-your-data-and-privacy-close/
[r15]: https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/
[r16]: https://orbitforms.ai/blog/progressive-disclosure-in-forms
[r17]: https://accountancyeurope.eu/stories/gdpr-one-year-on-its-impact-on-auditors-and-accountants/
[r18]: https://www.lexology.com/library/detail.aspx?g=a5edf599-1860-4249-8719-7d1885616ece
[r19]: https://www.nob.net/wp-content/uploads/2023/09/gdpr_guidelines_controller_or_processor_versie_1_oktober_2019_vertaling-1.pdf
[r20]: https://www.occ.pt/sites/default/files/public/2024-02/Estatuto2024_Web.pdf
[r21]: https://www.occ.pt/sites/default/files/public/2025-09/Guia_Pratico_PRESTACAOa7.pdf

1. [Como criar uma lista PBC — Content Snare][r1]
2. [Fundamentos das listas PBC — Suralink][r2]
3. [O que é uma PBC request list — AuditDashboard][r3]
4. [Portal do cliente vs. gestão de escritório — Content Snare][r4]
5. [Qualidade da passagem e preservação de contexto — Fini Labs][r5]
6. [Boas práticas de passagem IA→humano — BlueTweak][r6]
7. [Eficácia de SBAR, SOAP e PIE nas passagens clínicas — NCBI][r7]
8. [Modelo SBAR com exemplos — Heidi Health][r8]
9. [ISO/IEC TS 27560:2023 — Consent record information structure][r9]
10. [Implementing ISO/IEC TS 27560:2023 for GDPR and DGA — Pandit et al.][r10]
11. [Consent Records and Receipts per ISO/IEC TS 27560 using DPV — W3C][r11]
12. [SD-JWT-based Verifiable Digital Credentials — IETF][r12]
13. [SD-JWT VC, guia prático 2026 — walt.id][r13]
14. [Selective Disclosure for JWTs — Curity][r14]
15. [Progressive disclosure em UX — UXPin][r15]
16. [Divulgação progressiva em formulários — OrbitForms][r16]
17. [GDPR um ano depois: impacto em auditores e contabilistas — Accountancy Europe][r17]
18. [É o contabilista subcontratante ou responsável? — Lexology][r18]
19. [GDPR Guidelines for Chartered Accountants and Tax Advisers — NOB][r19]
20. [Estatuto da Ordem dos Contabilistas Certificados 2024 — OCC][r20]
21. [Guia prático: contrato de prestação de serviços — OCC][r21]
