// ═══════════════════════════════════════════════════════════════════════
//  QUE GUIAS DA EXPANSÃO JÁ TÊM CORPO REDIGIDO
//  ---------------------------------------------------------------------
//  Uma lista, e não uma marca dentro de cada guia, porque é a lista que se
//  lê de uma vez: sabe-se sempre quantos dos 112 estão escritos sem ter de
//  percorrer o catálogo.
//
//  Um slug só entra aqui quando TODOS os H2 de `estruturaH2` estiverem
//  escritos no componente de corpo correspondente. Entrar aqui muda três
//  coisas de uma vez — o guia passa a aparecer no índice, entra no sitemap
//  e deixa de ser `noindex` — por isso é uma decisão editorial explícita,
//  não um efeito secundário de criar um ficheiro.
//
//  `guias:expansao` verifica as duas direções: nenhum slug listado aqui
//  sem componente de corpo, e nenhum componente de corpo com secções a
//  menos face ao plano do pacote.
//
//  Vive num módulo próprio (e leve) porque os manifestos precisam dele
//  para decidir o estado editorial, e os manifestos chegam ao cliente.
// ═══════════════════════════════════════════════════════════════════════

export const CORPOS_REDIGIDOS: ReadonlySet<string> = new Set([
  // ── Casa e património ───────────────────────────────────────────────
  //    Escritos contra o articulado, artigo a artigo, com o texto oficial
  //    aberto ao lado — não a partir das epígrafes. Foi assim que se
  //    apanhou o prazo errado do art. 120.º e se confirmou que os limiares
  //    da isenção jovem do IMT estão certos (ver `correcoes.ts`).
  "imi",
  "imt",
  "aimi",
  "vpt-reavaliacao",
  "imposto-selo-compra-casa",
  // ── Arrendamento ────────────────────────────────────────────────────
  //    A escada de reduções do art. 72.º vinha no pacote com «confirmar
  //    percentagens e durações» — está confirmada, e são pontos
  //    percentuais, não percentagens da taxa. Ver `correcoes.ts`.
  "arrendamento-categoria-f",
  "despesas-senhorio",
  "recibo-renda-modelo-44",
  // ── Venda, herança e a decisão do AL ────────────────────────────────
  //    O reinvestimento em imóveis para arrendamento a renda moderada vinha
  //    no pacote como «CONFIRMAR redação final»: está em vigor, com a
  //    redação que o Decreto-Lei n.º 97/2026 deu aos n.os 7 e 8 do art. 10.º.
  "mais-valias-imoveis",
  "alojamento-local",
  "al-vs-arrendamento",
  "herdar-imovel",
  "imovel-empresa-ou-pessoal",

  // ── Investir e poupar ───────────────────────────────────────────────
  //    O eixo destes é o mesmo: o que vem de fora não é pré-preenchido, e
  //    a obrigação de declarar não desaparece por não haver retenção cá.
  "anexo-j",
  "corretoras-estrangeiras-irs",
  "cripto-365-dias",
  "rendimentos-capitais-categoria-e",
  "dividendos-irs",
  "credito-imposto-estrangeiro",
  "reporte-menos-valias",
  //    Os 8,6% do resgate de PPR eram dois quintos de 21,5% — a fração de um
  //    regime aplicada à taxa do outro. Nas condições legais são 8%; fora
  //    delas são 21,5% sem fração nenhuma. Ver `correcoes.ts`.
  "ppr-irs",
  //    O pacote marcava staking como PONTO SENSÍVEL, com as fontes
  //    divididas entre categoria B e E. A lei resolve-o sozinha: o n.º 11
  //    do art. 5.º trata o caso de a recompensa ser paga na própria cripto,
  //    e aí não há facto tributário na receção. A divergência não era de
  //    classificação — era de momento.
  "cripto-staking-mining",
  //    O único guia com aviso de implementação explícito («confirmar antes
  //    de afirmar o tratamento de fundos nacionais»). Confirmado nos arts.
  //    22.º e 22.º-A do EBF, que não constavam da base legal do pacote —
  //    e pelo caminho apareceu a escada do art. 43.º, n.º 5 do CIRS.
  "etf-irs",

  // ── Trabalhar com o estrangeiro ─────────────────────────────────────
  //    A secção inteira pende de uma pergunta só — és residente fiscal ou
  //    não? — e foi por isso que o art. 16.º foi lido inteiro antes de se
  //    escrever a primeira linha. Trouxe três coisas que a explicação
  //    corrente costuma perder: a janela dos 183 dias é DESLIZANTE e não o
  //    ano civil; conta como dia de presença qualquer dia que inclua
  //    dormida; e a residência é aferida por pessoa, não pelo agregado.
  "residencia-fiscal",
  "primeiro-ano-fiscal-portugal",
  //    Os n.os 14 a 16 do art. 16.º são o que torna o ano da saída um ano
  //    inteiro de residente — a regra que ninguém conta a quem se muda em
  //    setembro e recebe alguma coisa em novembro.
  "sair-de-portugal",
  //    O pacote marcou dois dados com «confirmar» e classificou o guia como
  //    ALTA MANUTENÇÃO. Ficaram confirmados — cinco anos sem residência,
  //    janela até 2026 — e apareceu um terceiro que o pacote não trazia: o
  //    teto anual da exclusão, que a lei foi buscar ao art. 68.º-A.
  "programa-regressar",
  //    «Não afirmar uma taxa única de 25% sem qualificar a categoria», dizia
  //    o pacote. São quatro taxas, e há duas portas de volta às progressivas
  //    para quem reside na UE ou no EEE que quase ninguém usa.
  "nao-residentes-irs",
  "modelo-21-rfi",
  //    O pacote mandava confirmar a lista de países dispensados de nomear
  //    representante. A lei não tem lista: tem um critério — e tem, desde o
  //    Decreto-Lei n.º 44/2022, uma segunda dispensa que vale para qualquer
  //    país e que o pacote não mencionava.
  "representante-fiscal",
  "convencao-dupla-tributacao",
  "nomada-digital-d8",
  "remoto-empresa-estrangeira",

  // ── Por profissão ───────────────────────────────────────────────────
  //    O pacote repete o mesmo aviso nos dez guias: o CAE e o enquadramento
  //    no art. 151.º determinam coeficiente e retenção, e não se generaliza
  //    por nome de profissão. A resposta editorial foi mostrar SEMPRE os
  //    dois enquadramentos lado a lado — quem lê vê a diferença que a
  //    escolha faz, em vez de receber um número que pode não ser o dele.
  "tvde-motorista",
  "estafeta-plataformas",
  "criadores-de-conteudo",
  "plataformas-subscricao",
  "freelancer-tecnologia",
  //    O pacote descreve a isenção do art. 9.º como sendo «das prestações de
  //    serviços de saúde». O artigo não funciona por tema: funciona pela
  //    PROFISSÃO de quem presta. Ver `correcoes.ts`.
  "profissionais-saude",
  //    E dizia que as explicações particulares seguem a regra geral, com a
  //    isenção do art. 53.º enquanto o volume o permitir. O n.º 11) do art.
  //    9.º isenta-as pela natureza do serviço, sem reconhecimento nem
  //    limite de volume. Também em `correcoes.ts`.
  "formadores-explicadores",
  //    O art. 58.º do EBF exclui expressamente as obras de arquitetura e as
  //    publicitárias, e só vale ao titular ORIGINÁRIO — o que deixa de fora
  //    cessionários, herdeiros e editoras. E tem uma nota de vigência que o
  //    guia repete ao leitor em vez de a esconder.
  "artistas-direitos-autor",
  "mediacao-comissoes",
  "arquitetos-engenheiros",

  // ── Direitos e cobranças ────────────────────────────────────────────
  //    Dispensa (art. 29.º) e redução (art. 30.º) da coima não são graus
  //    da mesma coisa — têm pressupostos diferentes, e quem as confunde
  //    pede a errada. E o «pedido que quase ninguém faz» é, na maior
  //    parte dos casos, implícito: o n.º 5 do art. 30.º diz que vale como
  //    pedido a própria entrega da declaração em falta.
  "coimas-fiscais",
  //    O pacote dava 15 dias para regularizar depois do pedido. A al. a)
  //    do n.º 3 do art. 30.º diz 30. Ver `correcoes.ts`.
  "regularizacao-voluntaria",
  //    Os prazos que vivem só no RCPITA ficam sem número, com a indicação
  //    de onde os confirmar: não foi possível verificar o diploma. O que
  //    tem número vem da LGT, do RGIT e do CPPT.
  "inspecao-tributaria",
  //    Matéria judicial, e com jurisprudência dividida quanto à exoneração
  //    de créditos tributários. Fica apresentada como questão em aberto —
  //    que é o que é — e não como regra fechada em nenhum dos sentidos.
  "insolvencia-pessoal",

  // ── Preparar o IRS ──────────────────────────────────────────────────
  //    O pacote dava a página do art. 58.º-A como não verificada. Abre — e
  //    responde a duas perguntas que nenhuma fonte de terceiros responde
  //    bem: não fazer nada NÃO é não entregar (a declaração provisória
  //    converte-se em declaração entregue), e nesse caso o regime que se
  //    aplica é o da tributação SEPARADA. Quem beneficiaria da conjunta
  //    perde-a por inação, sem ninguém lho dizer.
  "irs-automatico",
  "declaracao-substituicao",
  "irs-fora-do-prazo",
  //    Aqui o pacote manda o contrário do costume: «as datas exatas mudam
  //    todos os anos e podem ser prorrogadas por despacho — nunca fixar no
  //    texto». Estes dois guias descrevem a SEQUÊNCIA do calendário e não
  //    fixam nenhuma data de validação. O único prazo com número é o do
  //    art. 58.º-A, n.º 6, que está na lei.
  "e-fatura",
  "reclamar-deducoes",

  // ── Gerir contribuições ─────────────────────────────────────────────
  //    Um eixo atravessa a secção inteira: a base de incidência que
  //    declaras é, ao mesmo tempo, o que pagas hoje e a remuneração
  //    registada de que sairão a baixa, a parentalidade, o desemprego e a
  //    pensão. O ajuste de ±25% é a única alavanca — e é de dois gumes.
  "declaracao-trimestral-ss",
  "isencao-contribuicoes-ss",
  "entidade-contratante",
  //    O período de espera do subsídio de doença DIFERE entre
  //    independentes e trabalhadores por conta de outrem, e não foi
  //    possível confirmar o dos independentes: o Diário da República
  //    serve um shell vazio e o portal da Segurança Social é renderizado
  //    por JavaScript. O guia diz que é maior do que os 3 dias dos
  //    trabalhadores por conta de outrem e manda confirmá-lo — sem o
  //    inventar. O mesmo vale para os prazos da parentalidade.
  "subsidio-doenca-independentes",
  "parentalidade-independentes",
  "desemprego-independentes",
  "seguro-acidentes-independentes",
  //    Falta `rc-profissional`: o pacote marca-o «SEM BASE LEGAL NO
  //    CATÁLOGO — a obrigatoriedade é definida profissão a profissão nos
  //    estatutos das respetivas ordens, não existe norma única». Fica
  //    andaime até haver fontes verificadas, que é o que o pacote manda.

  // ── Reforma e fim de carreira ───────────────────────────────────────
  //    O art. 53.º do CIRS já NÃO tem valor próprio: na redação da Lei n.º
  //    45-A/2024 remete para a al. a) do n.º 1 do art. 25.º. O valor fixo
  //    que o pacote trazia está desatualizado, e o motor passa a derivá-lo
  //    da dedução do trabalho dependente. Ver `correcoes.ts`.
  "irs-pensionistas",
  "reformado-recibos-verdes",
  "reforma-independentes",
  "pensao-estrangeira",

  // ── Faturar ─────────────────────────────────────────────────────────
  //    Todo este bloco foi lido na coleção CONSOLIDADA do CIVA — a mesma
  //    cujo caminho o pacote errava —, já com a redação do Decreto-Lei n.º
  //    35/2025. Essa reforma mudou a epígrafe do art. 53.º e abriu o
  //    regime de isenção a sujeitos passivos de outros Estados-Membros,
  //    com um segundo limiar à escala da União e o número com sufixo EX.
  "mudar-regime-iva",
  "renunciar-isencao-iva",
  "regime-isencao-ue",
  "nota-de-credito",
  "autoliquidacao-iva",
  "vies",
  "oss-iva",
  "ioss",
  //    Três guias sem UMA data e sem UM limiar, de propósito: o pacote
  //    marca a faturação eletrónica com «MÁXIMA PRIORIDADE DE VERIFICAÇÃO
  //    — as datas foram sucessivamente adiadas por diplomas anuais, NÃO
  //    publicar sem confirmar». O DL 28/2019 não tem articulado legível
  //    (o Diário da República serve um shell vazio). Descrevem o
  //    mecanismo, que é estável, e mandam confirmar o calendário.
  "atcud-qr-code",
  "faturacao-eletronica",
  "programa-faturacao-certificado",

  // ── Cumprir prazos ──────────────────────────────────────────────────
  //    O art. 41.º do CIVA dá o número que o pacote não trazia e que
  //    decide tudo nesta secção: o limiar de 650 000 € que separa quem
  //    entrega a declaração periódica todos os meses de quem a entrega
  //    por trimestre. E o art. 27.º dá o segundo prazo, cinco dias
  //    depois do primeiro — entrega a 20, pagamento a 25.
  "declaracao-periodica-iva",
  //    Aqui o pacote manda o contrário do costume outra vez: os dias
  //    concretos variam com fins de semana e feriados, e o prazo do
  //    SAF-T já foi dia 5, dia 8 e dia 12. Estes guias dão a REGRA e
  //    mandam ao calendário fiscal do ano — não fixam dias.
  "saf-t-faturacao",
  "declaracao-recapitulativa",
  "modelo-10",
  //    Quem devia reter e não reteve RESPONDE PELO IMPOSTO. É a
  //    responsabilidade do substituto tributário, e é o que faz deste o
  //    guia mais sério da secção.
  "modelo-30",
  "dmr-dmis",
  //    A presunção de notificação eletrónica é o ponto de maior impacto
  //    prático de todo o site: o prazo corre mesmo que nunca entres no
  //    portal. Aderir é assumir o hábito de consultar.
  "portal-das-financas",
  "situacao-regularizada",
  //    Falta `reforma-antecipada`: o pacote marca-o «SEM BASE LEGAL NO
  //    CATÁLOGO» e avisa que a idade normal de acesso e o fator de
  //    sustentabilidade são fixados por portaria anual. Fica andaime até
  //    o DL 187/2007 e as portarias estarem verificados.

  // ── Família e ciclo de vida ─────────────────────────────────────────
  //    O art. 6.º, al. e) do Código do Imposto do Selo é o número que o
  //    pacote não trazia e que resolve metade das perguntas desta
  //    secção: cônjuge, descendentes e ascendentes estão ISENTOS na
  //    transmissão gratuita. O que fica de fora — irmãos, sobrinhos,
  //    amigos — paga a verba 1.2 da Tabela Geral. O art. 26.º dá o prazo
  //    de três meses para a participação, e o art. 27.º o adiamento.
  "herancas-imposto-selo",
  "doacoes",
  //    O art. 78.º, n.º 1, al. j) e o n.º 12 do CIRS: a dedução da
  //    pensão de alimentos exige título judicial ou acordo homologado, e
  //    é INCOMPATÍVEL com declarar o mesmo filho como dependente. A
  //    escolha é uma, não as duas.
  "pensao-alimentos-irs",
  //    O art. 78.º, n.os 9 a 11 (o n.º 11 já na redação do DL 49/2025)
  //    dá a regra que ninguém conhece: constando o dependente de mais do
  //    que uma declaração, as deduções são reduzidas a metade em cada
  //    uma — e só um acordo que FIXE QUANTITATIVAMENTE a percentagem,
  //    comunicado por AMBOS até ao fim de fevereiro, afasta essa
  //    divisão. Percentagens que não somem 100% caem no supletivo.
  "guarda-partilhada-irs",
  "divorcio-irs",
  //    O art. 13.º, n.º 5 do CIRS não fixa montante para o limite de
  //    rendimentos do dependente: remete para a retribuição mínima
  //    mensal garantida. O motor deriva-o do salário mínimo e
  //    acompanha-o sozinho, ano após ano, sem hardcode.
  "dependentes-irs",
  //    O grau mínimo de incapacidade NÃO é publicado: o pacote avisa
  //    que é atualizado e que não se deve replicar valores de imprensa,
  //    e não foi possível confirmá-lo em fonte oficial legível. O guia
  //    diz isso na página, e manda confirmar.
  "deficiencia-irs",
  "ascendentes-lares",

  // ── Gerir uma empresa ───────────────────────────────────────────────
  //    Dois benefícios que o motor já tinha e que ganharam corpo (SIFIDE
  //    e RFAI), e dois que foram lidos de raiz no articulado: o art.
  //    43.º-D do EBF (ICE) e o art. 43.º-C (startups). Do primeiro veio
  //    uma correção ao próprio motor — a Lei n.º 45-A/2024 revogou o
  //    n.º 2 e acabou com a majoração do spread por dimensão da empresa,
  //    que a nota antiga ainda descrevia.
  "sifide",
  "rfai",
  "ice-capitalizacao",
  //    A taxa efetiva das stock options não está escrita em artigo
  //    nenhum: o EBF manda considerar metade do ganho, o art. 72.º,
  //    n.º 1, al. f) do CIRS tributa o resto à taxa autónoma. É derivada,
  //    não copiada — e por isso acompanha qualquer alteração a qualquer
  //    dos dois.
  "stock-options",
  //    Nenhum montante de medida do IEFP é publicado: são fixados por
  //    portaria e concretizados em avisos de abertura que mudam durante
  //    o ano. O que se publica é a mecânica — indexação ao IAS,
  //    candidatura ANTES da contratação, manutenção do posto.
  "apoios-contratacao-iefp",
  "suprimentos-prestacoes-suplementares",
  //    Sem UMA data de calendário, de propósito: os prazos de aprovação
  //    e depósito de contas dependem do exercício e têm sido objeto de
  //    prorrogações anuais.
  "obrigacoes-societarias",
  //    O limite por quilómetro em viatura própria fica de fora: é fixado
  //    por referência aos servidores do Estado e não foi possível
  //    confirmar a portaria em vigor nesta revisão.
  "viatura-empresa",
  //    As taxas de depreciação por tipo de ativo também não: o n.º 1 do
  //    art. 31.º do CIRC remete para o decreto regulamentar, e é lá que
  //    vivem. O guia dá o mecanismo, que é estável.
  "amortizacoes-equipamento",

  // ── Trabalho por conta de outrem ────────────────────────────────────
  //    Esta secção esteve bloqueada por não haver texto CONSOLIDADO do
  //    Código do Trabalho legível: o Diário da República serve as suas
  //    páginas de legislação consolidada como aplicação de página única
  //    (2,3 KB de shell vazio), e o PDF de 2009 é anterior a todas as
  //    alterações. Desbloqueou com a base de dados jurídica da PGD
  //    Lisboa, que o serve inteiro com o histórico artigo a artigo — e a
  //    currência foi confirmada CONTRA a DGERT: ambas terminam na Lei n.º
  //    32/2025, de 27 de março. Duas fontes, a mesma lista de 24
  //    diplomas.
  //
  //    Este é o fiscal da secção — vive no art. 2.º, n.º 3, als. b), c) e
  //    d) do CIRS. Trouxe uma correção ao motor: o limite dos vales de
  //    refeição não é um segundo valor, é o do numerário majorado em 70%.
  "ajudas-de-custo-km",
  //    O art. 208.º-A está REVOGADO: o banco de horas individual deixou
  //    de existir, e continua a ser descrito como vigente em quase toda a
  //    informação em circulação. É o facto mais valioso da secção.
  "banco-de-horas",
  "periodo-experimental",
  "contrato-a-termo",
  "formacao-40-horas",
  "teletrabalho",
  "trabalhador-estudante",
  "assedio-trabalho",
  //    Os tetos do art. 366.º são múltiplos da retribuição mínima mensal
  //    garantida — 20 × e 240 × — e por isso derivam do salário mínimo em
  //    vez de serem mantidos em euros.
  "despedimento",
  //    Dois guias que descrevem o mecanismo e retêm os números: as taxas
  //    e percentagens dos fundos de compensação vivem na Lei n.º 70/2013,
  //    e as prestações por acidente na Lei n.º 98/2009 — nenhuma das duas
  //    foi legível em fonte oficial consolidada nesta revisão.
  "fct-fgct",
  "acidente-de-trabalho",
]);
