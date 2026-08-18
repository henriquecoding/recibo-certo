# Mapa de intenção de pesquisa — precificação (Portugal)

Método: pesquisa em português europeu, leitura dos conteúdos que ranqueiam,
análise das perguntas repetidas em FAQ de concorrentes e do vocabulário usado
por contabilistas e associações portuguesas. Cada linha liga uma intenção real a
uma funcionalidade concreta — as intenções sem funcionalidade correspondente não
entram no produto, e as funcionalidades sem intenção correspondente também não.

## Nota metodológica honesta

Não tenho acesso a volumes de pesquisa verificados do Google para pt-PT. O que
está abaixo é **estrutura de intenção**, não volume. A coluna «procura» é uma
leitura qualitativa (quantos conteúdos independentes competem pela query, e com
que profundidade), não um número de pesquisas mensais. Escrever «2 400
pesquisas/mês» sem fonte seria exatamente o tipo de métrica inventada que a
regra 8 do `CLAUDE.md` proíbe.

## O padrão que salta à vista

Quase toda a pesquisa portuguesa sobre preço cai em conteúdo **brasileiro**.
"Markup", "precificação", "margem de contribuição" devolvem Sebrae, Stone, Nubank
e blogues brasileiros — com R$, com Simples Nacional, com ICMS. Quem pesquisa em
Portugal encontra a matemática certa e o enquadramento errado. É a lacuna
comercial mais óbvia que encontrei em todo o levantamento, e não é uma lacuna de
design: é de jurisdição.

## Matriz

| Intenção / query | Intenção real | Perfil | Dificuldade | Lacuna atual | Funcionalidade ReciboCerto |
|---|---|---|---|---|---|
| como calcular preço de venda | «diz-me a fórmula e um exemplo» | comerciante iniciante | média | conteúdo BR | Modo rápido + explicação passo a passo |
| calculadora preço de venda | quer a ferramenta, não o artigo | qualquer | baixa | existe, básica | `/ferramentas/calcular-preco` |
| quanto cobrar por um serviço | ansiedade, não matemática | freelancer | alta | quase só BR | Fluxo «serviço» + preço/hora produtiva |
| quanto cobrar por hora | valor/hora justo | freelancer | alta | fórmulas erradas (salário/160) | Motor de horas faturáveis |
| margem de lucro vs markup | confusão conceptual real | todos | média | explicado, mal | Dois modos explícitos + tradução automática |
| como calcular margem de lucro | percentagem sobre o quê? | todos | média | ambíguo | Margem sempre sobre preço líquido, dito na UI |
| preço com IVA / retirar IVA | conversão simples | todos | baixa | muito servido | Já coberto; entra como camada, não como página |
| PVP o que é | preço de venda ao público | comerciante | baixa | vago | Glossário contextual + PVP nomeado no resultado |
| quanto tenho de faturar para ganhar X | planeamento inverso | TI / micro | alta | **inexistente em PT** | Motor de objetivo invertido |
| ponto de equilíbrio / break even | quantas vendas para não perder | micro-negócio | alta | só BR | Motor de break-even com leitura em texto |
| comissão marketplace | quanto fica para mim | vendedor online | média | disperso | Motor de comissões por canal |
| vender no Amazon compensa | comparação de canais | vendedor online | alta | opinativo | Comparador de cenários por canal |
| preço produtos artesanais | valorizar tempo próprio | artesão | alta | emocional | Fluxo «produção própria» com custo de tempo |
| calcular preço de custo | o que conta como custo | todos | média | superficial | Motor de custos com as 4 categorias |
| desconto quanto posso dar | até onde sem perder | comerciante | alta | inexistente | Motor de desconto com alerta de margem |
| regras dos saldos / preço anterior | conformidade legal | comerciante | média | jurídico, denso | Aviso da regra dos 30 dias no módulo de promoções |
| recibos verdes quanto cobrar ao cliente | IVA? retenção? | TI | alta | **só o ReciboCerto pode responder bem** | Ponte com o motor fiscal existente |
| isento de IVA posso deduzir | consequência do Art. 53.º | TI / micro | alta | mal explicado | Regra do IVA não dedutível no custo |
| preço para loja online | canal próprio vs marketplace | e-commerce | média | comercial | Cenários por canal |
| quanto custa vender uma coisa | soma das taxas | qualquer | média | disperso | Decomposição «a cada venda» |

## As perguntas que ninguém em Portugal responde bem

Estas são as que justificam construir a ferramenta em vez de escrever um artigo:

1. **«Estou isento de IVA — como é que isso muda o meu preço?»**
   Muda em dois sítios ao mesmo tempo: não cobras IVA (o PVP baixa) *e* não
   deduzes o IVA das compras (o custo sobe). Toda a calculadora que vi trata
   isenção como «taxa = 0» e erra o custo. É o erro mais caro do mercado.

2. **«Os meus custos reduzem o meu IRS?»**
   No regime simplificado, **não** — o coeficiente já presume as despesas. Uma
   pessoa que compra melhor não paga menos IRS. Isto inverte a intuição de quem
   veio de conteúdo brasileiro e não aparece em nenhuma calculadora portuguesa.

3. **«A Segurança Social é um custo do meu preço?»**
   Para um TI, sim, e é um custo **sobre a faturação**, não sobre o lucro:
   21,4% × 70% ≈ 14,98% de cada euro de serviços prestados. Trata-la como
   imposto sobre o lucro subestima o preço mínimo de forma sistemática.

4. **«O cliente reteve-me 23%. Perdi esse dinheiro?»**
   Não — é adiantamento de IRS, não custo. Mas afeta a tesouraria. Separar
   *custo* de *momento de caixa* é a distinção que falta em todo o lado.

## Rotas de intenção propostas

Uma rota por intenção real, nenhuma criada só para SEO. A ferramenta é a mesma;
muda o estado inicial e a copy.

| Rota | Intenção | Estado inicial |
|---|---|---|
| `/ferramentas/calcular-preco` | canónica | seletor de cenário |
| `/ferramentas/calcular-preco?c=produto` | produto físico | fluxo produto |
| `/ferramentas/calcular-preco?c=servico` | serviço | fluxo serviço |
| `/ferramentas/calcular-preco?c=hora` | preço/hora | motor de horas |
| `/ferramentas/calcular-preco?c=marketplace` | venda em marketplace | canal pré-selecionado |
| `/ferramentas/calcular-preco?c=objetivo` | «quero ganhar X» | objetivo invertido |

Parâmetros de query, não páginas duplicadas: a intenção muda o ponto de entrada,
não o conteúdo. Criar seis páginas com o mesmo motor e copy diferente é
canibalização, não cobertura.
