# Recibo Certo — Plano operativo de crescimento

> Aplicação do **Relatório estratégico de crescimento, produto e monetização**
> (versão 1.0, 8 de agosto de 2026; investigação fechada nessa data).
>
> Este documento é a metade do relatório que **não vive em código**: canais,
> calendário, experiências, gates e rotinas. A metade que vive em código está
> em `src/lib/analytics`, `src/lib/clusters.ts`, `src/lib/routing.ts`,
> `src/lib/autoridade.ts`, `src/lib/revisoes.ts` e nas páginas
> `/metodologia`, `/estado-dos-dados`, `/changelog-fiscal` e `/admin/painel`
> — ver o mapa no fim.
>
> **Todos os números de receita que dependem de tráfego ou de comissão do
> parceiro são hipóteses**, marcados como tal. Servem para sensibilidade, não
> para previsão. O primeiro objetivo do plano é substituí-los por dados reais.

---

## 1. A tese, em uma frase

O Recibo Certo não compete por ser mais uma calculadora nem por executar
faturação. É **o lugar onde se compreende, simula, compara e prepara a
decisão**; a FIZ e os contabilistas parceiros executam quando a complexidade o
exige.

Nos próximos 90 dias: **parar de alargar a superfície por defeito** e construir
o sistema operativo de crescimento — instrumentação, arquitetura de intenção,
resultados que convidam ao regresso, encaminhamento com atribuição completa,
distribuição por parceiros e um ciclo editorial sazonal.

### 1.1 As sete decisões

1. **Medir antes de escalar.** Sem product analytics não se sabe o que ativa, o
   que converte, porque regressam nem onde o dinheiro se perde.
2. **Fixar a categoria.** Recibo Certo = compreender, simular, comparar,
   preparar e acompanhar. FIZ = emitir, declarar e executar. Contabilista =
   resolver exceções de elevada complexidade ou obrigação profissional.
3. **Monetizar primeiro a intenção qualificada.** A FIZ é a primeira aposta
   porque a infraestrutura e a parceria já existem. Leads para contabilistas
   entram como rota de exceção, não como concorrente indiscriminado da FIZ.
4. **Tratar o Plus a 1,99 € como produto de retenção.** Histórico, cenários,
   alertas, reserva fiscal, auditoria e dossiê justificam recorrência. O preço
   não suporta aquisição paga nem suporte humano intensivo.
5. **Construir distribuição, não apenas SEO.** Pesquisa de alta intenção,
   YouTube pesquisável, comunidades, parceiros e lifecycle. Reddit, LinkedIn e
   Facebook Groups são canais de confiança, não megafones.
6. **Otimizar para respostas de IA com os fundamentos de confiança.**
   Rastreabilidade, renderização, fontes primárias, autoria e revisão,
   exemplos verificáveis, atualização real, entidade consistente. Não existe um
   atalho técnico chamado GEO.
7. **Proteger a confiança como ativo económico.** Sem anúncios programáticos em
   páginas de resultado; divulgação inequívoca de afiliação; consentimento
   específico antes de partilhar dados; nenhuma simulação apresentada como
   submissão oficial.

### 1.2 Ordem de monetização

| # | Motor | Papel | Condição de avanço |
|---|---|---|---|
| 1 | FIZ / encaminhamento contextual | Receita inicial e continuidade natural depois da simulação | Atribuição fim a fim, regra de elegibilidade, disclosure e reconciliação |
| 2 | Plus 1,99 € | Retenção, identidade, dados e previsibilidade | Coortes R30/R90, ativação e churn conhecidos; suporte self-service |
| 3 | Leads selecionadas para contabilistas | Monetizar casos complexos fora do escopo FIZ | Consentimento, routing, SLA, qualidade e feedback de desfecho |
| 4 | Afiliados adjacentes | Receita incremental em momentos de decisão | Política editorial; utilidade demonstrável; sem pay-to-rank |
| 5 | Embeds / API / B2B | Escala e diversificação depois de provar o motor | Versionamento, SLA, responsabilidade, suporte e contratos |
| 6 | Publicidade | Inventário residual, preferencialmente patrocínio direto | Escala, experiência intacta e exclusão de resultados sensíveis |

### 1.3 Os próximos 14 dias

- [x] Definir a North Star: **Decisões Verificadas Mensais (DVM)** — utilizadores
      únicos que concluem um simulador e veem um resultado com explicação e fonte.
      → `src/lib/analytics/dvm.ts`, publicada em `/metodologia#medicao`.
- [x] Implementar o dicionário de eventos críticos, origem/UTM, retornos a 7/30
      dias e um painel único semanal. → `src/lib/analytics/*`, `/admin/painel`.
- [x] Corrigir sinais de indexação: `lastmod` verdadeiro por conteúdo, resultados
      e contadores essenciais renderizados no servidor, robots validado para
      Googlebot, OAI-SearchBot e PerplexityBot. → `src/lib/revisoes.ts`,
      `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/ui/CountUp.tsx`.
- [x] Separar formalmente as rotas FIZ, contabilista e sem parceiro, com
      critérios e mensagem de consentimento. → `src/lib/routing.ts`.
- [x] Escolher os clusters prioritários e tornar visível o que fica fora deles.
      → `src/lib/clusters.ts`, publicado em `/estado-dos-dados#clusters`.
- [ ] **Por fazer, exige o fundador:** confirmar o contrato FIZ (evento
      remunerado, janela, comissão, reporting, clawback, DPA); nomear donos de
      produto, fiscal, growth, parceiros e privacidade; entrevistar 8 a 12
      utilizadores e não-utilizadores recentes; ligar a Search Console ao
      scorecard.

---

## 2. O que foi validado e o que faltava

**Validado:** arquitetura, dependências, scripts de qualidade, ferramentas,
guias, SEO estruturado, entitlement Plus, Stripe, Supabase, FIZ e superfícies de
parceria; dimensão do trabalho independente e demografia empresarial em
Portugal; regras oficiais de rastreadores; regras anti-spam do Reddit; tarifas
públicas de Stripe.

**Não disponível na auditoria:** MAU, sessões, utilizadores por canal, queries da
Search Console, taxas de início e conclusão, R7/R30, cancelamento, chargebacks,
suporte e receita atual; termos económicos do acordo FIZ; capacidade semanal da
equipa; pesquisa qualitativa recente com utilizadores.

**Consequência:** qualquer número de receita neste documento é hipótese. A página
`/estado-dos-dados` publica esta mesma lista de lacunas, virada ao público.

---

## 3. Mercado

### 3.1 Números-âncora

| Indicador | Valor | Data | Implicação |
|---|---|---|---|
| Trabalhadores por conta própria | 773 000 | 2025 | Maior base alinhada com recibos verdes e obrigações recorrentes |
| Economicamente dependentes | 110 900 (14,3%) | 2025 | Dor elevada em comparação de regime, risco e planeamento |
| Empresas ativas | 1 593 415 | 2024 | Universo amplo; inclui empresas individuais — **não somar** ao primeiro |
| Nascimentos de empresas | 246 589 | 2024 | Fluxo anual de momentos de abertura e enquadramento |
| Alcance publicitário YouTube | 7,59 M | fim de 2025 | Escala para vídeo pesquisável; não equivale a utilizadores mensais |
| Alcance publicitário Facebook | 6,30 M | fim de 2025 | Boa cobertura; estratégia por grupos e intenção |
| Membros LinkedIn | 6,10 M | fim de 2025 | Sinal B2B; métrica não comparável a MAU |
| Alcance publicitário Reddit | 3,50 M | fim de 2025 | Indício, não previsão (variação metodológica) |

Fontes: INE/PORDATA e DataReportal Digital 2026 Portugal. Os números de
plataformas são estimativas de ferramentas publicitárias, não utilizadores
ativos comparáveis.

### 3.2 TAM, SAM, SOM sem inflação narrativa

- **TAM de necessidade** — pessoas e entidades com decisões fiscais ou laborais.
  Muito superior a 773 mil, mas com sobreposições. Não usar como receita.
- **SAM inicial** — independentes e quem compara emprego/recibos/empresa. Ordem
  de grandeza: 773 mil mais entrantes, sem soma cega.
- **SOM 12 meses** — quem o produto consegue ativar e reter com a equipa e os
  canais atuais. Nasce de MAU, conclusão e R30 — hoje desconhecidos.
- **SOM pagante** — subscritores Plus ativos e casos encaminhados com desfecho.
  Função de retorno, valor e elegibilidade; não de visitas brutas.

**Teste de escala do preço:** 0,1% dos 773 000 seriam 773 subscritores, ou seja
1 538 € de MRR bruto e cerca de 1 024 € de contribuição indicativa antes de
infraestrutura e suporte. Para 10 000 € de contribuição mensal seriam precisos
cerca de 7 553 pagantes — perto de 1% de toda a base. **O Plus sozinho não é o
motor mais curto para escala.**

### 3.3 Sazonalidade

| Janela | Procura dominante | Superfícies | Oferta |
|---|---|---|---|
| Jan-Fev | Novas regras, abertura de atividade, e-Fatura, declaração trimestral | Guias atualizados, classificador, reserva | Guardar cenário; FIZ; alertas |
| Mar-Jun | Preparação e entrega de IRS (1 abr – 30 jun) | Simulador anual, anexos, deduções, erros | Plus para cenários e exportação; contabilista nas exceções |
| Abr/Jul/Out/Jan | Declarações trimestrais | Calendário, regime simplificado, reserva | Retorno, alerta e FIZ |
| Set-Out | Início de atividade, novos contratos, decisão emprego vs independente | Comparador e classificador | FIZ ou contabilista, conforme complexidade |
| Nov-Dez | Planeamento, despesas, fecho e orçamento do ano seguinte | Previsão anual, empresa vs independente | Plus; consulta qualificada |

---

## 4. Posicionamento e concorrência

| Categoria | Força deles | Lacuna | Resposta |
|---|---|---|---|
| AT / Segurança Social | Fonte primária e cumprimento | Informação fragmentada, pouco orientada ao cenário | Citar, traduzir e ligar cada regra a um cálculo |
| Média e lead-gen (Doutor Finanças) | Marca, SEO, funis comerciais | Experiência ampla, não um cockpit fiscal recorrente | Ferramentas conectadas, histórico, reserva e decisão |
| Benefícios e RH (Coverflex) | Distribuição B2B | Foco no contexto laboral e empresa | Comparação independente e jornadas fiscais adjacentes |
| Comparadores (ComparaJá) | Captação e cross-sell | Incentivo comercial pode dominar a neutralidade | Routing transparente e resultado antes do parceiro |
| Calculadoras simples | Rapidez e query específica | Pouca explicação, retorno ou continuidade | Metodologia, cenários, histórico e fontes |
| Execução (FIZ, faturação) | Emitir, declarar, operar | Não é o lugar para explorar alternativas antes de decidir | Preparar e encaminhar; não duplicar execução |
| Contabilistas | Julgamento e responsabilidade | Custo de triagem e capacidade limitada | Qualificar, organizar o dossiê e encaminhar exceções |

**Proposta de categoria.** Recibo Certo é o copiloto fiscal de decisão para quem
trabalha em Portugal: transforma regras oficiais em cenários comparáveis, explica
o porquê do resultado, ajuda a guardar e planear, e entrega o caso certo à FIZ ou
a um profissional quando chega a hora de executar.

**Promessa.** Perceber antes de decidir. Simular antes de pagar. Preparar antes de
executar.

**O fosso possível**, por camada e indicador:

| Camada | Como acumula | Indicador |
|---|---|---|
| Grafo de decisões | Ferramentas e guias ligam perfil, evento, regra, cenário e passo seguinte | % de jornadas com transição e retorno |
| Confiança verificável | Fontes, revisores, regressão, changelog e correção pública | Erros por 1 000 decisões; tempo até correção |
| Dados de intenção | Eventos anonimizados revelam perguntas, abandono e casos elegíveis | Melhoria de ativação e routing por coorte |
| Distribuição incorporada | Contabilistas, creators, empregadores e parceiros usam links e embeds | % de decisões originadas por parceiros |
| Memória do utilizador | Histórico, cenários, reserva, alertas e dossiê | R30/R90 e decisões por utilizador |

---

## 5. Aquisição por canal

| Canal | Papel | Prioridade 90d | Cadência inicial | Sinal de escala |
|---|---|---|---|---|
| SEO de intenção | Capturar procura existente e levar a uma ferramenta | Muito alta | 4 clusters em melhoria contínua | DVM por query e conversão por landing |
| Parceiros | Distribuição incorporada e confiança emprestada | Muito alta | 10 conversas; 3 pilotos | DVM por parceiro e receita com qualidade |
| YouTube | Demonstrar cenários e ocupar pesquisa em vídeo | Alta | 2 longos + 4 Shorts/mês | View → tool → DVM |
| Reddit | Descoberta de linguagem e confiança comunitária | Média-alta | 3-5 respostas úteis/semana | Respostas guardadas; visitas com conclusão |
| Lifecycle email | Retorno sazonal e ativação Plus | Alta, após consentimento | 1 digest/mês + triggers | R30 e DVM por envio |
| LinkedIn | Marca do fundador, peritos e B2B | Média | 2-3 posts/semana | Parceiros, embeds e DVM B2B |
| Facebook Groups | Ajudar nichos concretos e captar linguagem | Média-baixa | 2 sessões autorizadas/mês | DVM por grupo e convite do moderador |
| Paid | Teste controlado de alta intenção | Baixa até haver unit economics | Só retargeting ou contexto pequeno | CAC < margem/LTV por motor |

### 5.1 SEO: de biblioteca para sistema

A unidade de planeamento é o **cluster de decisão** — página de entrada que
responde, ferramenta que calcula, exemplos por cenário, fonte e metodologia, e
uma transição. Os oito clusters estão definidos em `src/lib/clusters.ts` e
publicados em `/estado-dos-dados#clusters`. Os cerca de 167 guias são inventário
a classificar, consolidar e distribuir — **não uma meta de volume**.

Backlog técnico, por ordem:

1. [x] Datas published/reviewed/valid_from reais; `lastmod` material, não a data do build.
2. [ ] Canonical, indexabilidade, status codes, links internos e páginas órfãs em auditoria automatizada.
3. [x] Conteúdo essencial e prova social renderizados no servidor; JavaScript só para interação progressiva.
4. [x] Metodologia, autor, revisor, política de correções, fonte primária e versão do motor visíveis.
5. [ ] Consolidar canibalização: uma intenção principal por página; redirecionar ou arquivar páginas sem procura, sem fonte ou duplicadas.
6. [ ] Medir a Search Console por cluster e a DVM por landing. Não celebrar impressão sem conclusão.

### 5.2 Reddit: participação autêntica, não distribuição mecânica

O Reddit proíbe spam e pede participação autêntica; cada comunidade pode proibir
promoção ou usar limites próprios. Ler as regras primeiro, pedir permissão quando
necessário, responder **completamente dentro da plataforma**. O link é uma
referência opcional quando a ferramenta resolve o caso.

- **Fazer:** conta identificada; disclosure; respostas com cálculo, fonte e
  limites; posts de dados e metodologia.
- **Evitar:** mass-posting, bots, respostas geradas sem contexto, mensagens
  diretas, link em toda a resposta, astroturfing.
- **Cadência:** 3-5 comentários úteis por semana; 1 post original por mês;
  revisão mensal das regras de r/portugal, r/literaciafinanceira e comunidades
  profissionais.
- **KPI:** saves, respostas, visitas atribuídas, conclusão e DVM. **Remoções = zero.**

Formatos a testar: «Comparei três formas de receber X €: premissas, resultado e
onde o cálculo falha» (tabela publicada nativamente); «Calendário do trimestre
para independentes»; «O que mudámos no simulador depois deste erro reportado»;
AMA apenas com aprovação do moderador e, idealmente, um revisor identificado.

### 5.3 YouTube: pesquisa mais demonstração

- **Longo (6-12 min):** pergunta nos primeiros 15 segundos, cenário realista, ecrã
  do simulador, resultado, limites e passo seguinte.
- **Shorts:** uma pergunta ou erro por vídeo; apontar para o vídeo longo ou para a
  ferramenta específica, nunca para a homepage.
- **SEO:** título pela pergunta, capítulos, descrição com fontes e deep link com
  UTM, comentário fixado com a data da última revisão.
- **Atualização:** não apagar histórico em silêncio; marcar o ano fiscal; mudar
  thumbnail e título só enquanto o conteúdo continuar correto.
- **Cadência:** 2 longos + 4 Shorts por mês durante 3 meses; escalar só se
  view → DVM superar o benchmark interno.
- **Conversão:** a landing correspondente repete o mesmo cenário e abre a
  ferramenta com contexto, sem obrigar a criar conta.

### 5.4 LinkedIn

Publicar 2-3 vezes por semana: um dado, um caso comparado e uma nota de produto ou
metodologia. O fundador explica escolhas e limites, não anuncia features.
Converter guias em carrosséis e tabelas, com um único CTA. Criar a série mensal
«Estado do trabalho independente», com dados agregados e metodologia, sem perfis
individuais. Prospeção dirigida a contabilistas, RH, coworks, incubadoras,
associações e creators — oferecer landing co-branded e UTM antes de prometer API.
**KPI:** parceiros qualificados, reuniões, pilotos, DVM por parceiro e receita.
Likes são diagnóstico criativo, não objetivo.

### 5.5 Facebook Groups

Mapear grupos de freelancers, expatriados, criadores, trabalho remoto e pequenos
negócios; registar regras e contacto do moderador. Pedir autorização para sessão
de perguntas, checklist sazonal ou simulação ao vivo, e responder dentro do grupo.
**Nunca recolher casos fiscais sensíveis em comentários** — encaminhar para
simulação privada e avisar para não publicar NIF, salário ou documentos. UTM por
grupo só quando permitido. Parar após duas tentativas sem DVM.

### 5.6 Parcerias como canal

| Parceiro | Oferta | Integração inicial | Economia futura |
|---|---|---|---|
| FIZ | O utilizador chega preparado; a FIZ executa | Deep links, click_id, placements e postback | Afiliação ou rev-share contratual |
| Contabilistas | Leads de exceção com dossiê e consentimento | Landing por especialidade e região, com SLA | Fee por lead aceite ou cliente; **nunca pay-to-rank** |
| RH e empregadores | Comparar propostas e explicar recibos | Links co-branded, workshops, embed simples | Licença, lead ou benefício |
| Coworks e incubadoras | Kit primeiro recibo e calendário | Página, QR, UTM e sessão trimestral | Patrocínio ou partilha |
| Universidades e bootcamps | Transição para freelance e primeiro rendimento | Workshop e sandbox | Distribuição; valor de longo prazo |
| Creators | Cenários para a audiência, com disclosure | Link por vídeo ou newsletter, com exemplos | Afiliação partilhada, só com regras claras |

---

## 6. Aparecer em respostas de IA

A estratégia não é produzir texto «para a IA»; é ser rastreável, citável, atual,
semanticamente claro e mais útil do que uma paráfrase genérica. O próprio Google
afirma que as práticas essenciais de SEO continuam válidas para AI features e que
não é preciso schema especial.

**Controlo de rastreio** (`src/lib/crawler-policy.ts`, aplicado em
`src/app/robots.ts` e `src/proxy.ts`): duas listas, e a fronteira entre elas é
**o que o agente faz com o conteúdo**.

| Bloqueado — treino, datasets, scraping | Permitido — resposta e pedido de uma pessoa |
|---|---|
| GPTBot, ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended, Google-CloudVertexBot, meta-external*, Amazonbot, cohere-ai, Bytespider, PanguBot | OAI-SearchBot, ChatGPT-User |
| CCBot, AI2Bot, Timpibot, Omgili*, Diffbot, ImagesiftBot, PetalBot, YouBot, GoogleOther | Claude-SearchBot, Claude-User |
| AhrefsBot, SemrushBot, MJ12bot, BLEXBot, DotBot | PerplexityBot, Perplexity-User, DuckAssistBot |

Um corpus de treino não cita; um motor de resposta cita, com ligação. É essa a
razão da linha, e não uma preferência por fornecedor.

> **Histórico, para não se repetir.** Entre a decisão de proteção de ativos
> (`docs/PROTECAO-ATIVOS.md`) e setembro de 2026, a lista foi **uma só** e
> bloqueou também os motores de resposta — incluindo no `/llms.txt`, que existe
> precisamente para lhes explicar como citar. O programa da §10.4 continuou a
> medir mensalmente uma taxa de citação que estava fixada em zero por
> construção. A separação estava escrita aqui e nunca chegou ao código.
> `scripts/check-security-boundary.mjs` passa a guardar as duas listas e a
> reprovar se voltarem a cruzar-se.

Alterações a robots demoram a propagar-se — a documentação da OpenAI fala em
cerca de 24 horas. **Validar por logs, não por um testador de robots.**

**Arquitetura de página citável** e **anatomia de resultado**: em
`src/lib/autoridade.ts`, publicadas em `/metodologia`. As seis camadas de
resultado são impostas pelo componente `ResultadoExplicado`.

**Benchmark mensal** (§10.4): 20 prompts canónicos por ICP em
`PROMPTS_BENCHMARK`, testados em ChatGPT Search, Google AI e Perplexity, com
localização, data e prompt registados. Métricas: taxa de citação, quota de
citações, frescura, factualidade e posição. Um revisor fiscal avalia a resposta e
a citação. **Nenhum teste tenta manipular o motor.** Se não formos citados:
melhorar unicidade, evidência e ligações internas. Se formos citados com erro:
corrigir fonte, resumo, canonical ou conteúdo.

---

## 7. Plano de conteúdo (12 meses)

### 7.1 Cadência sustentável

| Por mês | Entrega | Objetivo |
|---|---|---|
| 1 | Atualização profunda de um cluster e página pilar | Ganhar procura e confiança em intenção central |
| 2 | Vídeos longos no YouTube | Demonstrar cenários e gerar DVM |
| 4 | Shorts e clips | Distribuir perguntas e erros frequentes |
| 8-10 | Posts LinkedIn/Reddit/Facebook **adaptados, não copiados** | Aprender linguagem e distribuir ativos |
| 1 | Digest ou alerta, com consentimento | Gerar retorno sazonal |
| 1 | Relato de metodologia, changelog ou dado | Construir autoridade e citabilidade |

### 7.2 Calendário, setembro 2026 a agosto 2027

> Cada tema tem de ser confirmado contra a Agenda Fiscal, o Portal das Finanças,
> a Segurança Social e a legislação aplicável **antes** de publicar. Isto é uma
> linha editorial, não uma afirmação antecipada sobre taxas de 2027.

| Mês | Tema | Ativos | Vídeo | Distribuição | CTA |
|---|---|---|---|---|---|
| Set 2026 | Começar atividade e escolher regime | Classificador e comparador; «primeiro recibo em 30 minutos»; checklist de abertura | Abrir atividade; salário vs recibos | Coworks, bootcamps, Q&A Reddit | FIZ |
| Out 2026 | Declaração trimestral e reserva | Calculadora de reserva; guia SS; erros de faturação do trimestre | Declaração passo a passo; quanto reservar | FIZ e grupos freelance | Plus/FIZ |
| Nov 2026 | Planeamento antes do fecho | Previsão anual; despesas; independente vs Lda | Cenário de X €; quando falar com contabilista | Contabilistas e LinkedIn | Plus/lead |
| Dez 2026 | Fechar o ano sem surpresas | Checklist de fecho; fatura vs recibo; arquivo e exportação | Último recibo do ano; preparar dossiê | FIZ e contabilistas | Plus/FIZ |
| Jan 2027 | Mudanças anuais e novo baseline | Atualizar todas as regras e fontes; changelog comparativo; Q4 SS | O que mudou em 2027; recalcular reserva | Imprensa de nicho e creators | Retorno/Plus |
| Fev 2027 | e-Fatura, agregado e preparação | Checklist de validação; dependentes; despesas profissionais | Erros de e-Fatura; preparar IRS | RH e comunidades familiares | Plus |
| Mar 2027 | Pré-IRS por perfil | Anexos e cenários por independente e misto; documentos | Anexo B; salário mais recibos | Contabilistas convidados | Plus/lead |
| Abr 2027 | Entrega de IRS e 1.º trimestre | Simulador anual; guia de submissão; SS trimestral | Simular antes de entregar; erros comuns | Live/Q&A moderado no YouTube | Plus/lead |
| Mai 2027 | Corrigir, substituir e interpretar | Declaração de substituição; divergências; reembolso | Porque o resultado difere; quando corrigir | Conteúdo de suporte pesquisável | Plus/lead |
| Jun 2027 | Reta final de IRS | Checklist final; casos excluídos; fontes atualizadas | Última revisão; casos para profissional | Parcerias editoriais | Lead/Plus |
| Jul 2027 | Meio do ano e 2.º trimestre | Reserva, previsão e ponto de equilíbrio da Lda | Recalcular seis meses; empresa vs independente | Contabilistas e incubadoras | Plus/lead |
| Ago 2027 | Clientes externos, remoto e creators | MoR, UE e fora, moeda e documentos | Cliente estrangeiro; plataformas e creators | Creators e comunidades expat | FIZ/especialista |

### 7.3 Sistema de produção

| Passo | Gate | Responsável | Saída |
|---|---|---|---|
| 1. Intake | Intenção, ICP, sazonalidade e DVM potencial | Growth/editor | Brief com query e ação |
| 2. Pesquisa | Fonte primária, data de vigência, exceções | Autor | Dossiê de fontes |
| 3. Motor | Exemplo reproduzido no simulador e testado | Produto/fiscal | Cenário verificado |
| 4. Redação | Resposta, cenário, cálculo, evidência, limites, ação | Autor | Página ou guião de vídeo |
| 5. Revisão | Fiscal, editorial, acessibilidade, RGPD e comercial | Revisor | Aprovação e versionamento |
| 6. Distribuição | Adaptação nativa e UTM | Growth | Vídeo, post, newsletter, parceiro |
| 7. Medição | DVM, conversão, retorno, citação e correções | Growth/produto | Decisão: iterar, consolidar ou retirar |

### 7.4 Checklist antes de publicar

A versão viva desta checklist está publicada em `/metodologia#editorial`.

- [ ] Ano e território explícitos; data de vigência e de revisão; fonte primária clicável.
- [ ] Cenário testado no motor; arredondamentos, intervalos e casos excluídos documentados.
- [ ] Autor e revisor identificados; nenhuma promessa de resultado fiscal; contacto de correção.
- [ ] Um objetivo de página, uma ação principal e disclosure antes de qualquer CTA afiliado.
- [ ] Title, H1, canonical, schema e links internos coerentes; conteúdo essencial server-rendered.
- [ ] Evento e UTM testados; o painel reconhece landing → start → complete → outcome.
- [ ] Plano de atualização: gatilho legal, dono e SLA. **Página sem dono não cresce por defeito.**

---

## 8. Monetização e unit economics

**Princípio: monetizar a continuação, não a ansiedade.** O resultado fiscal nunca
é distorcido para aumentar cliques. A monetização aparece depois de a pessoa
compreender o cenário.

### 8.1 Plus a 1,99 €, economia indicativa

| Componente por subscritor/mês | Fórmula | Valor |
|---|---|---|
| Preço cobrado | — | 1,99 € |
| Receita sem IVA | 1,99 / 1,23 | 1,618 € |
| Stripe Payments + Billing | 1,5% + 0,25 € + 0,7% do volume | 0,294 € |
| **Contribuição antes de infra, suporte e reembolsos** | | **1,324 €** |

> Hipótese ilustrativa: IVA continental de 23%, cartão europeu standard e preços
> públicos Stripe consultados em 8 ago 2026. Tratamento fiscal, mix de meios de
> pagamento, impostos sobre taxas, reembolsos e Billing real **têm de ser
> confirmados**.

| Objetivo mensal | Pagantes por MRR bruto | Pagantes por contribuição |
|---|---|---|
| 1 000 € | 503 | 756 |
| 10 000 € | 5 026 | 7 553 |

| Churn | LTV simples | CAC prudente (≤ ⅓ LTV) |
|---|---|---|
| 4%/mês | 33,10 € | 11,03 € |
| 8%/mês | 16,55 € | 5,52 € |
| 12%/mês | 11,03 € | 3,68 € |

**Decisão de preço:** não alterar o 1,99 € por causa desta conta. Primeiro medir
ativação, R30/R90, churn e suporte. Manter um único plano simples, **sem paywall
no handoff FIZ**. Testar mensagem, onboarding e valor recorrente antes de testar
preço; qualquer subida futura protege os utilizadores existentes e baseia-se em
coortes.

O plano Grátis, com calculadoras, simuladores, guias e **1 amostra de cenário**,
é a experiência de aquisição. Não acrescentar um trial de 14 dias ao Plus: a
cobrança é imediata e os 14 dias comunicados são uma garantia de reembolso, não
um período gratuito com cobrança posterior.

### 8.1.1 Vitalício fundador a 19,99 €

O vitalício não é a economia recorrente do produto. É uma campanha limitada de
capital de lançamento: o mesmo Plus, pago uma vez, com **1000 lugares fundadores**.
A base de dados conta compras e concessões manuais no mesmo limite e serializa o
último lugar, por isso o número anunciado não é apenas urgência de interface.

| Campanha completa | Fórmula | Valor indicativo |
|---|---|---|
| Receita bruta máxima | 1000 × 19,99 € | 19 990 € |
| Receita sem IVA (hipótese 23%) | 19 990 / 1,23 | 16 252 € |
| Stripe Payments (hipótese 1,5% + 0,25 €) | 1000 × (19,99 × 1,5% + 0,25) | 550 € |
| **Contribuição antes de infra, suporte e reembolsos** | | **~15 702 €** |

Cada concessão manual ativa ocupa um desses lugares. Assim, a receita futura
máxima é `(1000 − concessões ativas) × 19,99 €`; isto mantém a promessa dos mil
lugares e torna auditável a diferença entre capacidade total e lugares pagos.

**Decisão do vitalício:** manter 19,99 € durante a campanha fundadora, não o
transformar numa oferta permanente e não lhe acrescentar trial. Depois de
esgotar ou encerrar a campanha, o mensal continua como motor de receita e de
manutenção do serviço. O valor líquido real depende do enquadramento de IVA,
mix de cartões, reembolsos, fraude, infraestrutura e suporte.

### 8.2 Sensibilidade por 10 000 DVM

> Modelo para perceber alavancas, **não previsão**. P = comissão média por
> outcome FIZ remunerado. L = fee por lead de contabilista aceite. O routing é
> mutuamente exclusivo (garantido em `src/lib/routing.ts`) para evitar dupla
> contagem.

| Motor | Conservador | Base | Forte |
|---|---|---|---|
| Plus ativos | 0,5% = 50; ~66 € | 1,0% = 100; ~132 € | 2,0% = 200; ~265 € |
| Outcomes FIZ | 1% clique × 15% outcome = 15P | 2,5% × 25% = 62,5P | 5% × 35% = 175P |
| FIZ se P = 30 € | 450 € | 1 875 € | 5 250 € |
| Contabilista | 2% × 15% × 50% = 15L | 4% × 25% × 60% = 60L | 6% × 35% × 70% = 147L |
| Contabilista se L = 50 € | 750 € | 3 000 € | 7 350 € |

Substituir P e L pelos contratos reais. Um «outcome» FIZ pode ser clique, registo,
subscrição ou receita — **só o evento contratual entra na linha de receita**.

### 8.3 Caminhos

**Primeiros 1 000 €/mês:** motor principal FIZ (a relação e a integração já
existem — fechar atribuição, postback e placements por ferramenta); complementar
3-5 contabilistas piloto para Lda, contabilidade organizada, heranças e casos
externos, cobrando só depois de provar qualidade; retenção pelo Plus, com foco em
guardar cenário, reserva fiscal, alertas e exportação. Meta de validação: receita
por 1 000 DVM, conversão por rota, taxa de aceitação da lead e retorno — **não um
número de parceiros assinados**.

**10 000 €/mês:** portefólio de outcomes FIZ e especialistas por vertical, sem
concentração excessiva; base Plus suficiente para estabilizar receita, mas não
necessariamente dominante; embeds e licenças para RH, contabilistas, plataformas e
creators com volume; depois API fiscal versionada. Unidade económica por jornada
positiva, SLA de qualidade e prova de que a receita não reduz ativação nem
confiança.

### 8.4 O que não fazer

Está codificado em `MONETIZACAO_PROIBIDA` (`src/lib/routing.ts`) e publicado em
`/metodologia#comercial`.

---

## 9. Roadmap

| Horizonte | Objetivo | Entregas | Gate |
|---|---|---|---|
| Agora, 0-90 dias | Medir, ativar e atribuir | Eventos e painel; landing por cluster; resultados explicados; server rendering; lastmod; postback FIZ; consent routing | 95% das jornadas críticas medidas; baseline confiável |
| A seguir, 3-6 meses | Fazer regressar | Reserva anual, alertas, comparação temporal, onboarding Plus, dossiê melhorado, lifecycle | R30 e churn demonstram valor recorrente |
| Depois, 6-12 meses | Distribuir e diversificar | Portal de parceiros leve, links e embeds, rede de especialistas, dados agregados, co-brand | 3 canais repetíveis e qualidade estável |
| Opcional, 12+ meses | Infraestrutura B2B | API versionada, webhooks, SLA, sandbox, licenças e auditoria | Procura contratada e margem para suporte |

### 9.1 Backlog priorizado

| Iniciativa | Impacto | Esforço | Risco | Métrica | Estado |
|---|---|---|---|---|---|
| Taxonomia de eventos e painel | Muito alto | Médio | Baixo | Cobertura e completude | **Feito** |
| Resultado com premissas, fontes, limites e passo seguinte | Muito alto | Médio | Baixo | DVM e compreensão | **Feito** (componente) |
| Atribuição FIZ e postback | Muito alto | Médio | Médio | Receita/1 000 DVM | Parcial — falta contrato |
| `lastmod` real e fallbacks no servidor | Alto | Baixo-médio | Baixo | Frescura e indexação | **Feito** |
| Reserva fiscal e previsão anual recorrente | Alto | Médio | Médio (fiscal) | R30 e Plus | Por fazer |
| Alertas configuráveis | Alto | Médio | Privacidade | Retorno e ação sobre alerta | Por fazer |
| Dossiê de handoff | Alto | Médio | PII | Aceitação da lead | Por fazer |
| Cenário partilhável sem PII | Médio-alto | Médio | Privacidade | DVM por partilha | Por fazer |
| Kit de UTM e deep links para parceiros | Alto | Baixo | Baixo | DVM por parceiro | Por fazer |
| Nova calculadora fora dos clusters | Incerto | Médio-alto | Manutenção | — | **Bloqueada sem prova** |
| API pública | Potencial alto | Muito alto | Responsabilidade | — | Só com cliente piloto |

---

## 10. Execução

### 10.1 Primeiros 90 dias

| Período | Entregas | Critério de saída |
|---|---|---|
| Dias 1-14: baseline | Eventos; IDs; painel; revisão de consentimento; auditoria de GSC, crawl e logs; 25 intenções; contrato e atribuição FIZ; entrevistas | Funil crítico observável; incógnitas registadas; zero PII em analytics |
| Dias 15-30: ativação | Melhorar 3 resultados; fallbacks no servidor; lastmod; landing por cluster; copy FIZ e Plus; erros por passo | Conclusão e DVM medidos; resultado compreensível; QA fiscal |
| Dias 31-45: distribuição | 2 vídeos; 12 respostas em comunidade; kit de parceiro; 5 conversas; digest consentido | Primeiros DVM atribuídos fora da pesquisa |
| Dias 46-60: monetização | Postback e reconciliação FIZ; onboarding Plus; routing de contabilista; 3 pilotos | Receita por outcome e estado das leads observáveis |
| Dias 61-75: retenção | Reserva e alerta MVP; retorno por coorte; partilha e exportação; campanha sazonal | R7/R30 por ferramenta e uso recorrente |
| Dias 76-90: decisão | Revisão de canais, economia, conteúdo e riscos; **matar 30% das hipóteses fracas** | Plano de 6 meses financiado por evidência |

### 10.2 Meses 4-6

Consolidar quatro clusters vencedores e criar duas landings co-branded. Operar a
cadência de YouTube e comunidades. Melhorar reserva, previsão, alertas e dashboard
com base em coortes Plus. Formalizar uma rede pequena de contabilistas por
especialidade e score de qualidade — não escalar quantidade sem outcomes. Publicar
metodologia, changelog fiscal e benchmark de IA, e conseguir referências externas
genuínas.
**Gate do mês 6:** pelo menos dois canais com DVM repetível e um motor de receita
com atribuição reconciliada.

### 10.3 Meses 7-12

Escalar apenas clusters e formatos com boa DVM, retorno e qualidade —
internacionalização fica fora salvo prova de procura e capacidade fiscal.
Expandir distribuição por parceiros com reporting. Testar disposição a pagar e
packaging do Plus **sem multiplicar planos**, protegendo a coorte existente.
Desenhar API e embeds avançados só com 1-2 design partners. Reduzir dependência de
uma fonte de receita, com meta de concentração revista trimestralmente.
**Gate do mês 12:** três loops repetíveis (procura → DVM, DVM → retorno, DVM →
receita) e qualidade fiscal dentro do SLA.

### 10.4 Equipa mínima e capacidade

| Papel | Responsabilidade | Ritual |
|---|---|---|
| Founder/GM | Escolhas, parceiros, preço, P&L e gates | Revisão semanal de 45 min; mensal de estratégia |
| Produto/engenharia | Instrumentação, ativação, fiabilidade e integrações | Release train e revisão de erros |
| Growth/editor | Clusters, distribuição, experiências e reporting | Planeamento semanal; post-mortem mensal |
| Revisor fiscal | Fontes, interpretação, casos excluídos e SLA de alteração | Sign-off e calendário legislativo |
| Design/vídeo | Resultado, acessibilidade, guiões e repurpose | Lote quinzenal |
| Legal/privacidade (pontual) | Consentimento, contratos, e-commerce, DPA e claims | Gates antes de partilha ou integração |

Alocação nos 90 dias: **35%** medição, qualidade e infraestrutura · **25%**
ativação e retenção · **25%** distribuição e conteúdo · **15%** parceiros e
monetização.

---

## 11. Experiências

| # | Hipótese | Teste | Métrica primária | Decisão em caso de falha |
|---|---|---|---|---|
| 1 | Resultado explicado aumenta valor | Novo layout em 3 ferramentas | DVM e compreensão | Sem melhoria relativa → rever |
| 2 | Reserva cria retorno | Guardar reserva e alerta | R30 | Sem retorno incremental → retirar complexidade |
| 3 | FIZ funciona melhor depois do resultado | Placement pós-valor vs faixa | Outcome/1 000 DVM | Menor receita e menor confiança → parar |
| 4 | YouTube traz decisão | 6 vídeos em 3 meses | DVM por vídeo | Views sem DVM → mudar intenção ou landing |
| 5 | Reddit ajuda a intenção | 12 respostas e 3 posts nativos | DVM e insights | Remoção, spam ou zero valor → suspender |
| 6 | Kits de parceiro escalam | 3 pilotos cowork/creator | DVM por parceiro | Sem uso após onboarding → simplificar |
| 7 | Dossiê melhora a lead | PDF/CSV estruturado com consentimento | Leads aceites | Risco de PII > ganho → reduzir campos |
| 8 | Plus é sobre continuidade | Copy de recorrência vs lista de features | Checkout e R30 | Conversão sem retenção → não escalar |
| 9 | A IA cita evidência original | 10 páginas com template citável | Taxa de citação | Sem efeito → reforçar autoridade externa |
| 10 | Consolidação melhora o cluster | Unir 5 páginas canibais | DVM por query | Queda material → ajustar redirects |
| 11 | Contabilistas valorizam casos triados | 3 parceiros, máx. 30 leads | Aceites e ganhas | Rejeição > 40% → refazer routing |
| 12 | Preço não é o gargalo | Entrevistas e funil de checkout | Reason codes | Valor percebido alto e churn baixo → testar preço |

**Regras:** definir antes o segmento, baseline, métrica primária, guardrail,
janela e amostra mínima. Uma mudança fiscal ou técnica prevalece sobre um teste de
conversão — **correção não é variante experimental**. Registar resultado negativo e
decisão. **Não testar dark patterns** em consentimento, checkout, urgência fiscal
ou recomendação de parceiro. Preferir melhoria relativa enquanto os volumes
absolutos forem desconhecidos.

---

## 12. Riscos

| Risco | Prob. | Impacto | Deteção | Mitigação |
|---|---|---|---|---|
| Erro fiscal material | Média | Crítico | Testes, reports, divergências | Versionar, revisor, kill switch, correção e comunicação |
| Regra desatualizada | Alta | Alto | SLA, fonte, last_reviewed | Calendário legislativo, dono, bloquear ano vencido |
| Afiliação reduz confiança | Média | Alto | Feedback, quebra, CTR anómalo | Disclosure, resultado independente, placements contextuais |
| Concentração na FIZ | Média | Alto | Quota de receita | Contrato, off-switch, diversificar rotas sem duplicar |
| Lead e RGPD | Média | Crítico | Audit log, queixa, incidente | Consentimento específico, minimização, DPA, retenção |
| Queda de SEO ou IA | Alta | Médio-alto | GSC, DVM, citações | Diversificar YouTube, parceiros e lifecycle; conteúdo original |
| Preço não cobre suporte | Alta | Alto | Tickets por subscritor, margem | Self-service, limitar suporte, medir coorte e rever |
| Conteúdo-fábrica | Média | Alto | Páginas sem DVM, fonte ou dono | Consolidar, retirar e bloquear volume sem intenção |
| Indexação desatualizada | Média | Médio | Snippets, crawls, logs | lastmod real, canonical, purga de cache, monitorização |
| Largura de banda do fundador | Alta | Alto | WIP, atrasos, ciclos | Limite de WIP, batching, gates e donos claros |

**SWOT.** Forças: amplitude real de ferramentas e conteúdo; motor fiscal e testes;
fontes e SEO estruturado; preço acessível; local-first; Stripe e Supabase; parceiro
FIZ integrado. Fraquezas: retorno e disposição a pagar desconhecidos; margem
estreita; prova humana pouco visível; dependência do fundador. Oportunidades: 773
mil independentes; procura recorrente e sazonal; fragmentação oficial; vídeo e
comunidades; a IA favorece fontes verificáveis. Ameaças: mudança fiscal; erro
YMYL; volatilidade de SEO; concorrentes com distribuição; concentração de
parceiros; RGPD; conteúdo em excesso; perda de confiança por afiliação.

**Guardrails legais:** rever termos de subscrição, preço total, renovação,
cancelamento, suporte e direito de livre resolução em contratos à distância — se o
serviço começar dentro do prazo, recolher o pedido expresso exigido e manter prova
duradoura. Distinguir educação e simulação de aconselhamento individual. Não
apresentar a FIZ, um parceiro ou uma simulação como AT, Segurança Social ou
contabilista do utilizador. Manter acessíveis as políticas de afiliação,
correções, conflitos, privacidade e subcontratantes. **Submeter a arquitetura de
leads, tracking, marketing e transferências a revisão jurídica portuguesa antes de
escalar.**

---

## 13. Memorando de decisão

O Recibo Certo tem um ativo raro para a fase: motor fiscal, catálogo de decisões,
conteúdo, infraestrutura de conta e pagamento, e um parceiro de execução. O
investimento adicional justifica-se se a equipa provar **três loops em doze
meses**: intenção → decisão verificada; decisão → retorno; decisão → outcome
remunerado sem perda de confiança. O risco principal não é técnico — é dispersão e
ausência de evidência comportamental.

**Perguntas mensais obrigatórias:**

1. Quantas decisões verificadas criámos, para quem e por que canal?
2. Que ferramenta ou cluster melhorou a ativação, e qual perdeu qualidade?
3. Que percentagem regressa a 30 e a 90 dias, e para fazer o quê?
4. Qual a receita por 1 000 DVM em FIZ, Plus e contabilista, líquida de taxas e reembolsos?
5. Quantos outcomes são reconciliados e quantas leads aceites ou ganhas?
6. Que regra mudou, que conteúdo ficou vencido e quanto tempo demorámos a corrigir?
7. Que experiência paramos este mês para manter o foco?

**Gates de capital e contratação:**

| Investimento | Antes de aprovar |
|---|---|
| Mais produção de conteúdo | Clusters atuais demonstram DVM, dono e SLA; consolidação executada |
| Aquisição paga | CAC medido contra contribuição e LTV por motor; tracking e consentimento válidos |
| Contratar vendas ou parcerias | Playbook gera outcomes em pelo menos 3 parceiros, com reporting repetível |
| Revisor fiscal dedicado | Volume e risco justificam SLA — recomendável cedo se for gargalo de autoridade |
| API ou enterprise | Design partner, contrato, margem, versionamento, SLA e responsabilidade |
| Novo mercado ou país | O mercado português tem loops provados e capacidade fiscal separada |

**Decisão final.** A melhor aposta não é «mais 100 artigos» nem «mais uma
calculadora». É fechar a cadeia de valor que já existe: pergunta → simulação →
explicação → memória → execução. Se essa cadeia produzir DVM, retorno e outcome
remunerado com qualidade, o Recibo Certo pode crescer como marca de confiança e
infraestrutura; se não produzir, os dados dirão cedo onde reduzir o escopo.

---

## 14. Onde é que cada parte do relatório vive no código

| Secção do relatório | Onde |
|---|---|
| §5.1 ICPs, §5.2 jobs-to-be-done, §5.3 critérios | `src/lib/clusters.ts` |
| §7.1 North Star (DVM) | `src/lib/analytics/dvm.ts`; público em `/metodologia#medicao` |
| §7.3 routing comercial, §13.1 fronteira, §13.3 afiliados, §12.6 proibições | `src/lib/routing.ts`; público em `/metodologia#comercial` |
| §8.1 dicionário de eventos | `src/lib/analytics/eventos.ts` |
| §8.2 identidade e atribuição | `src/lib/analytics/identidade.ts`, `servidor.ts` |
| §8.2 dados proibidos, §19.1 «zero PII» | `src/lib/analytics/pii.ts` |
| §8.3 painel semanal, §17 KPIs e alvos | `src/lib/analytics/painel.ts`; `/admin/painel` |
| §8.4 RGPD por desenho | `src/lib/cookie-consent.ts` + portas em `analytics/cliente.ts` |
| §9.2 clusters de decisão e inventário | `src/lib/clusters.ts`; público em `/estado-dos-dados#clusters` |
| §9.2 lastmod material | `src/lib/revisoes.ts`, `src/app/sitemap.ts` |
| §9.2 renderização essencial no servidor | `src/components/ui/CountUp.tsx` |
| §10.1 controlo de rastreio | `src/app/robots.ts` |
| §10.2 página citável, §14.3 resultado, §10.4 benchmark | `src/lib/autoridade.ts`, `src/components/ui/ResultadoExplicado.tsx` |
| §10.3 programa de autoridade | `/metodologia`, `/estado-dos-dados`, `/changelog-fiscal`, `/llms.txt` |
| §11, §12, §15, §16, §18, §20 | este documento |

**Regra de manutenção.** Quando uma decisão deste plano mudar, muda-se aqui **e**
no ficheiro correspondente. Um plano que diverge do código deixa de ser um plano e
passa a ser arqueologia.
