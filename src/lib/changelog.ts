// ═══════════════════════════════════════════════════════════════════════
//  CHANGELOG do popup "Novidades & Atualizações".
//
//  O histórico anterior a 2.51.0 vive em `changelog-historico/`. A separação
//  evita regravar quase 200 KB de prosa para acrescentar uma linha nova, sem
//  mudar a API do módulo: quem importa `CHANGELOG` continua a receber TODAS
//  as versões, pela mesma ordem, e `gen-novidades.mjs` continua a gerar os
//  mesmos ficheiros mensais.
//
//  ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
//  entrada NO TOPO. A asserção abaixo bloqueia o build se divergirem.
// ═══════════════════════════════════════════════════════════════════════

import { APP_VERSION, type EntradaChangelog } from "./version";
import { CHANGELOG as HISTORICO } from "./changelog-historico";

const NOVAS_ENTRADAS: EntradaChangelog[] = [
  {
    version: "2.70.0",
    data: "2026-08-17",
    titulo: "O telemóvel deixa de ser a versão pequena do site",
    itens: [
      "A pesquisa passa a estar sempre à vista, numa barra de largura inteira mesmo por cima da navegação. Estava escondida atrás de uma lupa de 20 px, ao lado de «Guias» e «Quiz» — no meio das páginas a que ela própria dá acesso.",
      "«Contabilistas» ganha um lugar fixo na barra de baixo, à direita do «Quiz». É a única coisa aqui que acaba com uma pessoa do outro lado, e estava enterrada dentro do menu «Conta», onde se procuram definições e não um profissional certificado.",
      "A barra de baixo fica: Início · Guias · Quiz · Contabilistas · Conta. Os lugares que já lá estavam não mudaram de sítio — quem já lhes acertava sem olhar continua a acertar.",
      "Passa a haver um topo no telemóvel, com a marca, o tema e o botão de começar. Antes não havia nenhum: o nome do produto não aparecia em lado nenhum, mudar para o modo escuro eram dois toques, e a ação principal estava dentro de um menu. Rola com a página, para não roubar altura a quem está a ler.",
      "Corrigido: fechar a pesquisa com o teclado deixava de devolver o foco a quem a tinha aberto, e a navegação recomeçava no topo da página.",
      "Corrigido: em telemóveis com indicador no fundo do ecrã, os últimos píxeis de cada página ficavam por baixo da barra de navegação.",
    ],
  },
  {
    version: "2.69.0",
    data: "2026-08-16",
    titulo: "Recebimentos: a ligação à Stripe passa a ser um sistema, e não um link",
    itens: [
      "A ligação à conta de recebimentos passa a viver no teu perfil, ao lado do LinkedIn. Estava numa página que quem não soubesse que existia nunca abria — e o produto ficava a prometer pagamentos que ninguém tinha ativado.",
      "Deixa de haver «ligado / não ligado». São seis estados, e o que interessa é o que estava escondido: uma conta pode já cobrar e ainda não deixar o dinheiro sair para o teu IBAN. Isso aparecia como «tudo pronto», e só se descobria à procura do dinheiro.",
      "O que a Stripe ainda pede passa a estar em português. Antes lia-se «individual.verification.document»; agora lê-se «um documento de identificação (frente e verso)». Os campos de morada, que são quatro códigos e uma coisa a fazer, passam a ser uma linha só.",
      "No diretório e no perfil público passa a dizer-se se um contabilista aceita pagamento pela plataforma. Era a pergunta de quem está a decidir marcar, e não tinha resposta em lado nenhum.",
      "Corrigido um beco sem saída: uma consulta realizada aparecia «por pagar» mesmo quando o contabilista não tinha a conta pronta, e o botão de pagar dava erro. Agora só aparece quando há mesmo por onde pagar.",
      "Nada da conta Stripe de um contabilista é visível para os clientes — nem o identificador, nem o que falta verificar. Sai só o facto de que se pode, ou não, pagar ali.",
      "Corrigida a ligação que fazia os pagamentos falharem em silêncio: os avisos da Stripe estavam a ser enviados para um endereço que redirecionava, e nenhum chegava. Na prática, uma conta aprovada podia ficar para sempre em «a Stripe está a verificar», e um pagamento feito podia nunca ser dado por recebido.",
    ],
  },
  {
    version: "2.68.0",
    data: "2026-08-16",
    titulo: "A sala de acompanhamento passa a ser a página",
    itens: [
      "A tua área do contabilista abre agora como uma sala: quem te acompanha e as credenciais dele em cima, o próximo passo e o resumo da relação lado a lado, o que falta, a linha do tempo, e a caixa para escrever no fim.",
      "O «Resumo da relação» responde às três perguntas de sempre num sítio só — quando é a próxima consulta, quanto está por pagar, e onde vai o cartão de fidelidade.",
      "A linha do tempo ganhou ações: um pedido por responder tem «Responder» ao lado, uma consulta online tem «Abrir», uma simulação tem «Ver». Deixa de ser preciso procurar noutro ecrã o que a linha acabou de mencionar.",
      "Escrever passou para dentro da sala. Uma linha só — juntar ficheiro, escrever, enviar — logo a seguir ao que aconteceu.",
      "Do lado do contabilista, a ficha do cliente diz de frente o que existe e o que não existe: as ações possíveis, e «sem email · sem telemóvel · sem WhatsApp». Era a primeira pergunta de quem chegava, e ficava sem resposta.",
      "«Contexto sem ruído» resume a relação em três linhas com data — próxima consulta, última partilha, fidelidade — para retomar uma conversa sem reler o histórico.",
    ],
  },
  {
    version: "2.67.0",
    data: "2026-08-16",
    titulo: "Sala de acompanhamento: uma relação, uma linha do tempo, zero contactos expostos",
    itens: [
      "O contabilista deixa de ter acesso ao teu email. O campo saiu do formulário, saiu do painel dele e saiu da base de dados — não está escondido, deixou de existir. O acompanhamento acontece todo aqui, onde fica registado e onde podes revogar o que enviaste.",
      "Uma «sala de acompanhamento» abre os dois lados da relação com a mesma pergunta respondida em cima: o que falta fazer. Um passo de cada vez, com prazo quando há prazo, e «não há nada à tua espera» quando não há.",
      "Mensagens, pedidos, partilhas, consultas, cupões e pagamentos passam a aparecer numa linha do tempo única, do mais recente para trás. Eram seis sítios diferentes para perceber uma coisa só.",
      "O contabilista pode pedir uma coisa concreta — um documento, uma confirmação, uns dados — em vez de a escrever no meio da conversa. O pedido tem estado e prazo, e deixa de depender de alguém se lembrar de uma frase que passou.",
      "Conversas com mais de 500 mensagens abriam nas mensagens MAIS ANTIGAS. Passam a abrir no que chegou agora, com «ver o que veio antes» para recuar.",
      "Escrever um telemóvel ou um email na conversa passa a avisar enquanto se escreve, com o motivo. NIF, IBAN, referências de multibanco e números de fatura continuam a passar — foram testados um a um para não haver enganos.",
    ],
  },
  {
    version: "2.66.0",
    data: "2026-08-16",
    titulo: "O painel no telemóvel: o que estava cortado, e o que não fazia nada",
    itens: [
      "O menu «•••» de cada módulo abria-se cortado a meio. Passa a aparecer inteiro, e a virar-se para cima quando está no fundo do ecrã. O mesmo valia para o menu «Alinhar» e para o das vistas — os três tinham a mesma causa.",
      "No telemóvel, o modo de edição mostrava um puxador para arrastar, um canto para redimensionar e uma grelha-guia. Nenhum dos três fazia nada: nessa largura o painel é uma lista, não uma grelha. Desaparecem, e fica o que funciona com o dedo — «Organizar», onde se muda a ordem, o tamanho e o que aparece.",
      "As ações de edição deixam de empilhar três filas de botões por cima do painel e passam a uma barra fixa no fundo. Antes ocupavam metade do ecrã antes de se ver um único módulo.",
      "Arrastar um módulo da biblioteca para o painel passa a funcionar. Até agora o cartão levantava-se e voltava ao sítio, porque não havia nada do outro lado a receber.",
      "O módulo «Comunicações recentes» dizia que o conteúdo abria na conversa, e não abria — as linhas não eram clicáveis. Agora são.",
    ],
  },
  {
    version: "2.65.0",
    data: "2026-08-16",
    titulo: "Pagar o contabilista pelo site, e vinte correções no painel de gestão",
    itens: [
      "Passas a poder pagar as consultas ao teu contabilista aqui mesmo. O pagamento é dele: a cobrança nasce na conta Stripe do contabilista, é o nome dele que aparece no extrato do teu cartão, e o dinheiro nunca passa pela conta do Recibo Certo.",
      "Cada contabilista escolhe, por tipo de consulta, quando é que se paga: ao marcar, depois da consulta, ou nada por aqui. Uma primeira conversa gratuita continua a ser uma primeira conversa gratuita.",
      "Os benefícios do cartão de fidelidade entram no pagamento: o desconto é aplicado no valor cobrado, e um benefício só é gasto quando o pagamento passa mesmo — desistir a meio não o queima.",
      "Do lado do contabilista há um separador novo, «Recebimentos», que diz quem recebe o quê antes de pedir seja o que for: o valor que entra, a comissão retida, e quando é que o dinheiro chega ao IBAN.",
      "O desbloqueio pago de patamares abriu. Continua a ser opcional — os patamares sobem por trabalho feito — e continua a não comprar posição no diretório, prioridade no encaminhamento nem selo nenhum no perfil.",
      "Vinte correções no painel de gestão, encontradas numa revisão a fundo. As que se notam: o quadro de trabalho deixou de piscar todo ao ticar um passo; abrir um caso deixou de mostrar por instantes as mensagens do caso anterior; uma falha de carregamento deixou de se disfarçar de «não tens nada»; e sair de um formulário por gravar passa a perguntar antes de deitar fora o que escreveste.",
      "A Progressão deixou de inventar um patamar quando não consegue ler os teus dados — um número errado sobre a tua comissão é pior do que dizer que falhou.",
      "O modo escuro do painel passou a ter uma palete só. Havia duas, e mudar de separador mudava a cor dos cartões.",
    ],
  },
  {
    version: "2.64.0",
    data: "2026-08-16",
    titulo: "O contrato lê-se antes de se aceitar, e o painel deixa-se arrumar",
    itens: [
      "O contabilista passa a poder anexar o contrato no mesmo gesto em que envia a proposta. Se anexar, deixas de poder aceitar, recusar ou pedir desconto sem teres chegado à última página do documento — e o contrato abre-se dentro da própria página, sem transferências nem separadores abertos ao lado.",
      "A regra não vive no botão: a base de dados recusa a decisão enquanto o contrato estiver por ler. Propostas sem contrato continuam exatamente como estavam.",
      "A pesquisa do painel de gestão passa a usar o mesmo motor da pesquisa do site: ignora acentos, perdoa uma gralha, ordena por relevância e diz «não encontrei» quando não encontra. Passa também a cobrir consultas e partilhas, e não só clientes, casos e tarefas.",
      "Antes de escreveres seja o que for, a pesquisa mostra o que está à espera de ti — pedidos por responder, casos sem proposta, prazos passados.",
      "As vistas do painel modular deixam de ser para sempre: podes mudar-lhes o nome, escolher qual abre primeiro e apagar as que já não usas. A última não se apaga, e apagar diz antes o que leva com ela.",
    ],
  },
  {
    version: "2.63.0",
    data: "2026-08-16",
    titulo: "Encontrar um contabilista passa a ser uma procura, não uma lista",
    itens: [
      "A página de contabilistas foi redesenhada à volta da procura: escreves o que precisas, escolhes distrito e forma de atendimento, e os resultados aparecem logo a seguir. A explicação de como tudo funciona desceu para depois da lista — continua lá, deixou de estar à frente.",
      "Podes refinar por área de trabalho, idioma, quem aceita novos clientes e sinais de confiança (inscrição na Ordem confirmada, LinkedIn ligado). No telemóvel, os filtros abrem numa folha que sobe de baixo, com o número de resultados sempre à vista.",
      "Os filtros ficam no endereço da página: podes partilhar a procura, atualizar sem perder nada e voltar de um perfil para a lista onde estavas.",
      "Os cartões passam a mostrar o título profissional, as áreas de trabalho e como se atende. Sobre a inscrição na Ordem, dizem agora a verdade inteira: «informada» quando é um número escrito pelo próprio e «verificada» só depois de confirmada por nós.",
      "A lista deixou de ser carregada de uma vez para ser filtrada no teu telemóvel — vem já filtrada e de 24 em 24. Menos dados a viajar, menos espera.",
    ],
  },
  {
    version: "2.62.1",
    data: "2026-08-16",
    titulo: "O diretório volta a ler a fidelidade da regra em vigor",
    itens: [
      "No perfil público e nos cartões do diretório, a meta do cartão de fidelidade e a percentagem de desconto voltam a vir da regra que está mesmo em vigor. Tinham passado a vir de uma cópia à parte, que podia divergir da regra publicada.",
      "A fotografia do LinkedIn volta a fazer parte do que a ficha pública mostra.",
      "Nada mudou no que é público: o telefone continua a sair só para quem tem vínculo, e a comissão, o XP e os patamares continuam invisíveis a quem não tem sessão.",
    ],
  },
  {
    version: "2.62.0",
    data: "2026-08-16",
    titulo: "Concluir uma consulta passa a registar o valor real",
    itens: [
      "Ao dar uma consulta por realizada, o painel pede o valor que cobraste. Vem preenchido com o valor sugerido no teu perfil e podes mudá-lo — é sobre esse valor que o desconto de fidelidade incide, e não sobre um preço global.",
      "Se o cliente tiver um benefício por usar, podes aplicá-lo ali mesmo, com a conta feita à frente dos olhos antes de confirmares: valor, desconto e o que fica a cobrar.",
      "Uma falta continua a fechar-se sem pedir valor — não há nada a cobrar. E dar por realizada continua a carimbar o cartão, que é uma ação que não se desfaz: por isso passou a ser um diálogo e não um botão direto.",
    ],
  },
  {
    version: "2.61.0",
    data: "2026-08-16",
    titulo: "Fidelidade com regras versionadas, e a progressão com os valores certos",
    itens: [
      "A fidelidade passa a ter regras versionadas: quando mudas a meta ou a percentagem, publicas uma versão nova em vez de alterar a antiga. Quem já tem um cartão a meio mantém exatamente a promessa com que começou, e o ecrã diz-te quantos clientes são antes de deixares publicar.",
      "O modelo está dito sem ambiguidade em todo o ecrã: completas os serviços do cartão e recebes o desconto no fim, para usar numa consulta. O desconto incide sobre o preço real dessa consulta, e vale uma única vez.",
      "O preço da consulta passa a ser apresentado como valor sugerido, e não como preço universal. O valor real é o que defines em cada consulta ao concluí-la — é sobre esse que a percentagem incide.",
      "A fidelidade ganha quatro separadores: regras e cartão, cartões em curso, benefícios emitidos e o histórico de todas as versões que publicaste. Nenhuma versão é apagada, porque os cartões que nasceram com ela continuam a apontar-lhe.",
      "Na progressão, os patamares, os XP e os preços passam a ser os oficiais: 0, 200, 500, 900, 1500 e 2300 XP, e 14,99 €, 24,99 €, 39,99 €, 64,99 € e 99,99 €. Um serviço concluído dá 10 XP, o primeiro serviço de um cliente novo dá 25, e um ciclo de fidelidade concluído dá 100 XP e um crédito.",
      "Os descontos no desbloqueio passam a contar créditos disponíveis, e não cartões concluídos. Os créditos gastam-se ao comprar, e mostrar cartões concluídos prometia um desconto que o saldo podia já não suportar.",
      "A jornada dos patamares diz que cada patamar reduz a comissão do Recibo Certo — porque é o que acontece. As duas formas de subir ficam lado a lado, com o mérito primeiro e a compra sem destaque superior.",
    ],
  },
  {
    version: "2.60.0",
    data: "2026-08-15",
    titulo: "O painel do contabilista passa a ser um espaço que se compõe",
    itens: [
      "O «Hoje» deixa de ser uma página fixa e passa a ser «Meu espaço»: um painel feito de módulos que se acrescentam, arrastam, redimensionam e removem. Abre com quatro vistas de partida — Meu dia, Fecho mensal, Clientes e Fiscal — e podes criar as tuas.",
      "Dezasseis módulos disponíveis: agenda do dia, o que precisa de atenção, prazos próximos, partilhas e simulações recebidas, documentos por rever, atividade da semana, centro de avisos, estado do trabalho em quadro, clientes, casos, casos em risco, comunicações recentes, resumo por cliente, fidelidade e progressão.",
      "Cada módulo muda de profundidade com o tamanho, e não de escala: pequeno é um resumo, grande é o conteúdo operacional. A biblioteca diz o tamanho e o formato de cada módulo antes de o acrescentares.",
      "As alterações ao painel são gravadas de uma só vez, ao concluir a edição — com Desfazer e Repor durante o trabalho. Concluir sem ter mudado nada não grava nada.",
      "Se tiveres o painel aberto em dois sítios, o que gravaste primeiro não é destruído em silêncio: o segundo avisa e deixa-te escolher entre carregar a versão mais recente ou manter o que estás a fazer.",
      "No telemóvel o painel é uma coluna, não uma grelha espremida, e a organização faz-se numa folha inferior — subir, descer, tamanho e ocultar. Quem usa teclado move e redimensiona módulos pelo menu de cada um, com a mudança anunciada.",
      "Nenhum módulo lê os teus dados fiscais. As simulações que o contabilista vê são as que o cliente escolheu partilhar, como sempre foi — não há calculadoras dentro do painel dele.",
    ],
  },
  {
    version: "2.59.0",
    data: "2026-08-15",
    titulo: "Progressão e comissão no painel do contabilista",
    itens: [
      "O painel de gestão ganha o separador «Progressão»: mostra a comissão em vigor, em que patamar estás dos seis, e exatamente o que falta para o próximo — quanto XP e quantos clientes elegíveis.",
      "A comissão começa nos 10% e desce até 5%, um ponto por patamar. Sobe-se por trabalho feito: cada cliente que chega pelo ReciboCerto e cada serviço concluído contam, e um cartão de fidelidade fechado conta mais, porque é prova de relação continuada.",
      "O ecrã diz, sem ser preciso procurar, sobre o que a comissão incide — o valor das propostas aceites e das consultas realizadas através da plataforma — e que é faturada ao contabilista: o cliente paga-lhe diretamente, e o ReciboCerto não retém nem processa esse pagamento.",
      "Os cartões de fidelidade que os teus clientes concluem dão desconto no desbloqueio de patamares: 5% a partir do primeiro, 15% aos cinco, 20% aos dez.",
      "O desbloqueio pago está desenhado e o preço é o final, já com desconto — mas a cobrança ainda não está ligada, e o ecrã di-lo no sítio onde se ia clicar, em vez de aceitar um clique que não faz nada. Até lá os patamares sobem por trabalho feito.",
      "Um patamar desbloqueado compra a percentagem e mais nada: não compra posição no diretório, prioridade no encaminhamento de casos nem selo no perfil público. Fica escrito no ecrã e garantido no código — a progressão não é visível a quem consulta o diretório.",
    ],
  },
  {
    version: "2.58.0",
    data: "2026-08-15",
    titulo: "O painel do contabilista ganha barra lateral, pesquisa e um perfil que se lê de uma vez",
    itens: [
      "Uma pesquisa no topo de todos os ecrãs do painel, com atalho ⌘K (ou Ctrl+K). Procura por clientes, casos e tarefas, e salta para qualquer separador — escrever «jose» encontra «José», sem acentos e sem maiúsculas.",
      "A coluna lateral fecha com o estado do perfil sempre à vista: se está visível, quanto está completo e se aceita novos clientes. A percentagem é uma só, calculada num sítio, para não haver dois números diferentes do mesmo perfil no mesmo ecrã.",
      "O perfil profissional passa a abrir com um cartão que diz tudo de uma vez: quanto está completo, o que falta a seguir, se está publicado e se aceita clientes — com o interruptor ali mesmo, em vez de sete secções abaixo.",
      "Cada bloco do perfil mostra um sinal de preenchido, para se perceber onde parar sem abrir secção por secção. A fotografia passa a abrir o bloco da identidade, com a origem identificada.",
    ],
  },
  {
    version: "2.57.0",
    data: "2026-08-15",
    titulo: "Consultas e honorário no perfil profissional",
    itens: [
      "O contabilista passa a poder definir que consultas oferece, com duração e valor — primeira conversa, sessão online, acompanhamento mensal, o que fizer sentido. Aparecem no perfil público como referência, sempre acompanhadas da frase que diz que o valor final é acordado em função do serviço: continua a não haver preço único obrigatório.",
      "Uma consulta pode ser gratuita, e isso é dito como oferta e não como campo por preencher. Cada consulta pode ser ocultada do perfil público sem ser apagada.",
      "A pré-visualização do perfil ganha a fotografia com a origem identificada e as duas ações que o cliente vê — pedir acompanhamento e marcar consulta —, cada uma disponível apenas quando o estado da relação a permite.",
    ],
  },
  {
    version: "2.56.0",
    data: "2026-08-15",
    titulo: "O painel profissional ganha a barra lateral",
    itens: [
      "A navegação do painel de gestão passa da calha horizontal no topo para uma coluna à esquerda. Com oito destinos, a calha obrigava a comprimir ou a rolar e o separador ativo perdia-se; na coluna cabem todos e lê-se qual está aberto. No telemóvel nada muda: a navegação continua na barra inferior.",
      "A barra do topo passa a ser do ecrã onde se está — mostra o título e as ações daquela página, como guardar ou pré-visualizar, sempre à vista e sem depender de chegar ao fim da página.",
      "O perfil profissional ganha o quadro da disponibilidade semanal, que mostra os horários publicados sem sair da página; a edição continua na agenda, para não haver dois sítios a definir a mesma coisa.",
    ],
  },
  {
    version: "2.55.0",
    data: "2026-08-15",
    titulo: "O perfil profissional deixa de ser um formulário e passa a ser uma identidade",
    itens: [
      "A página de perfil do contabilista passa a ter o editor à esquerda e a pré-visualização do perfil público à direita, atualizada enquanto se escreve. Deixa de ser preciso guardar para perceber o que os clientes vão ver. Os campos organizam-se em blocos com pesos diferentes — identidade, áreas de trabalho, atendimento, contacto e disponibilidade — em vez de um formulário longo onde o site tinha o mesmo destaque que a apresentação.",
      "O perfil ganha título profissional, apresentação de uma linha para o cartão do diretório, idiomas de atendimento, anos de experiência e tempo de resposta. Os dois últimos são declarados pelo próprio e a interface diz que o são: o Recibo Certo não apresenta como medição aquilo que não mede.",
      "O número de inscrição na Ordem passa a distinguir «informado» de «verificado». Um número escrito no formulário aparece como informado; a verificação passa a ser um facto registado pela administração, e alterar o número retira-a automaticamente.",
      "A disponibilidade para novos clientes deixa de ser uma caixa no fim da página e passa a ser uma escolha explícita entre aceitar novos clientes e não ter vagas — com o perfil a continuar público nos dois casos.",
    ],
  },
  {
    version: "2.54.0",
    data: "2026-08-15",
    titulo: "O que é público num contabilista passa a ser uma lista fechada",
    itens: [
      "O diretório e os perfis públicos dos contabilistas passam a ler um conjunto de campos declarado um a um, em vez da ficha inteira. O telefone deixa de sair para quem não tem sessão — nenhum ecrã o mostrava — e passa a estar disponível para quem já tem acompanhamento ativo com esse contabilista. O email, a apresentação, as áreas, a localização e o estado de vagas continuam públicos, como sempre estiveram.",
      "Identificadores internos — a ligação à candidatura e o identificador técnico da conta LinkedIn — deixam de ser legíveis a partir do diretório. Não eram mostrados em lado nenhum e não têm razão para sair.",
    ],
  },
  {
    version: "2.53.1",
    data: "2026-08-15",
    titulo: "Os documentos de exemplo passam a ser conferidos, não reescritos",
    itens: [
      "Os três documentos de demonstração — relatório de vencimento, mapa de recibos e declaração de IRS — passam a ter uma referência de exemplo estável em vez de uma referência de emissão inventada a cada vez. Quem abrir um destes PDF vê imediatamente que está perante um exemplo e não perante uma emissão real.",
      "Os números destes documentos passam a ser conferidos contra o motor de cálculo a cada execução dos testes. Antes eram reescritos em silêncio, pelo que uma alteração ao cálculo podia mudar o que os documentos mostram sem que nada o assinalasse.",
    ],
  },
  {
    version: "2.53.0",
    data: "2026-08-15",
    titulo: "A administração passa a ver o painel dos contabilistas por dentro",
    itens: [
      "A administração ganha acesso ao painel de gestão dos contabilistas com um consultório de demonstração: os mesmos ecrãs, a mesma navegação e as mesmas regras que o contabilista vê, com clientes, consultas, casos, tarefas e cupões inventados. Serve para conferir e validar a funcionalidade sem abrir a conta de ninguém — nenhum dado real de contabilista ou de cliente é mostrado.",
      "Não existe uma segunda versão do painel: o painel simulado e o painel real são literalmente o mesmo código, e uma alteração à estrutura ou à lógica passa a valer nos dois ao mesmo tempo. As regras que travam ações — confirmar uma consulta que já não está por confirmar, concluir uma que ainda não começou, aceitar um acompanhamento já aceite, gastar um cupão que já foi usado — respondem na demonstração exatamente como respondem a sério.",
      "Todos os ecrãs do painel simulado dizem que estão em demonstração e trazem um botão para repor os dados iniciais. Nada do que lá se faz sai do browser de quem está a ver.",
    ],
  },
  {
    version: "2.52.0",
    data: "2026-08-14",
    titulo: "Os contabilistas deixam de ser apenas um nome no diretório",
    itens: [
      "Os cartões do diretório passam a mostrar identidade profissional de verdade: fotografia do LinkedIn quando existe, disponibilidade para novos clientes, atendimento, localização, áreas, inscrição OCC quando indicada, preço e fidelidade quando configurados, além de um caminho claro para abrir o perfil. Quando ainda faltam campos, o cartão continua útil sem inventar experiência ou credenciais.",
      "A fotografia e o estado público do LinkedIn passam a ser lidos em lote para todo o diretório. Assim, enriquecer os cartões não cria uma consulta à base por contabilista nem torna a página progressivamente mais lenta à medida que o diretório crescer.",
      "Os seletores de distrito e área deixam de abrir o menu nativo do sistema operativo, que no modo escuro podia mostrar texto claro sobre um fundo claro/cinzento no Edge. Passam a usar uma lista do próprio design system, com contraste controlado, foco visível e navegação por setas, Home, End, Enter e Escape.",
      "O formulário do perfil profissional ganha contraste explícito em claro e escuro e um resumo dos campos essenciais que dão contexto ao cartão público. A ligação LinkedIn, os campos, estados desativados e ações de guardar mantêm-se funcionais sem remover nenhuma opção existente.",
    ],
  },
  {
    version: "2.51.1",
    data: "2026-08-14",
    titulo: "LinkedIn e calendário do painel profissional corrigidos",
    itens: [
      "A ligação do LinkedIn volta a guardar o endereço público normalmente sem enfraquecer a proteção contra HTML e scripts. Fotografias temporárias que tenham expirado deixam de aparecer quebradas e podem ser renovadas pela própria ligação do LinkedIn.",
      "O calendário de prazo ao criar uma tarefa deixa de ser cortado pelo contentor animado e continua a usar o mesmo DatePicker, incluindo modo escuro, teclado e formato pt-PT.",
    ],
  },
  {
    version: "2.51.0",
    data: "2026-08-14",
    titulo: "O painel de contabilistas ficou mais claro — e texto executável fica à porta",
    itens: [
      "O painel profissional foi redesenhado como um sistema único: navegação, formulários, listas, tabelas e calendários ganharam a mesma hierarquia, profundidade, foco e modo escuro do resto do ReciboCerto. No telemóvel, os oito destinos deixam de ser comprimidos numa grelha de seis lugares: mantêm alvos confortáveis e a barra leva o destino atual para o centro.",
      "Os campos do painel passam a aplicar a mesma regra de segurança da Ajuda & Suporte a HTML, scripts e código executável. A interface trava antes de enviar e a base de dados repete a validação, por isso contornar o browser não contorna a proteção.",
    ],
  },
];

export const CHANGELOG: EntradaChangelog[] = [...NOVAS_ENTRADAS, ...HISTORICO];

function assertChangelogIntegrity(): void {
  const erros: string[] = [];

  if (CHANGELOG.length === 0) {
    erros.push("CHANGELOG vazio.");
  } else if (CHANGELOG[0].version !== APP_VERSION) {
    erros.push(
      `A entrada mais recente do CHANGELOG (v${CHANGELOG[0].version}) não corresponde a APP_VERSION (${APP_VERSION}). Atualiza ambos.`
    );
  }

  const vistos = new Set<string>();
  CHANGELOG.forEach((e, i) => {
    if (!/^\d+\.\d+\.\d+$/.test(e.version)) erros.push(`Versão inválida na posição ${i}: "${e.version}".`);
    if (vistos.has(e.version)) erros.push(`Versão duplicada no CHANGELOG: "${e.version}".`);
    vistos.add(e.version);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.data)) erros.push(`Data inválida em v${e.version}: "${e.data}".`);
    if (!e.titulo?.trim()) erros.push(`Título em falta em v${e.version}.`);
    if (!e.itens?.length) erros.push(`Sem itens em v${e.version}.`);
  });

  if (erros.length > 0) {
    throw new Error(`[version] CHANGELOG inconsistente — build bloqueado:\n - ${erros.join("\n - ")}`);
  }
}

assertChangelogIntegrity();