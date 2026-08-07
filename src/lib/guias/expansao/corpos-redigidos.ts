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
]);
