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
    version: "2.85.0",
    data: "2026-08-19",
    titulo: "A calculadora de preço passou a dizer-te o que estava a assumir por ti",
    itens: [
      "Havia um problema silencioso e caro: escrevias um número em qualquer campo e a ferramenta deixava de dizer «isto é um exemplo» e passava a dizer «QUANTO DEVES COBRAR» — com o à-vontade de um conselho, por cima de vinte e cinco pressupostos que nunca confirmaste. Agora contamos quais respondeste mesmo. Enquanto faltar alguma coisa, o resultado assume-se como estimativa, diz-te exatamente o que está a assumir por ti, com que valor, e leva-te ao campo que o resolve.",
      "A barra que explica «a cada venda» explicava o número errado. Em cima aparecia o preço com IVA; a barra somava o preço sem IVA — e o IVA, que é a segunda maior fatia, não aparecia em lado nenhum. Quem somasse as parcelas com o dedo no ecrã não chegava ao total, e é assim que se deixa de acreditar nas outras contas. Passa a fechar ao cêntimo, com o IVA marcado como o que é: dinheiro que passa pela tua conta e não é teu.",
      "Os avisos importantes nasciam quatro ecrãs abaixo do preço a que se referiam. «A este preço cada venda tira-te dinheiro» ficava depois de todos os campos avançados e da memória de cálculo. Passam a estar colados ao número.",
      "As caixas do modo preciso eram dez, todas fechadas, todas iguais, nenhuma a dizer o que tinha lá dentro. Agora cada uma diz o estado («3 contas · 320 €/mês» ou «por preencher»), o que muda no preço, e sobe ao topo quando é ela que está a fazer falta ao cálculo. E podes repor uma sem perder o resto.",
      "Perguntas que mudavam o preço e nunca eram feitas: em que ano de atividade estás — no primeiro, o coeficiente do IRS é reduzido a metade —, se compras mais barato em quantidade, se o canal cobra uma parcela fixa por venda, e o preço de referência que vais anunciar num desconto, que a lei obriga a ser o mais baixo dos últimos 30 dias. Quem faz um bolo com farinha, ovos e cobertura também já pode listar as três, e não só a primeira.",
      "«Não há preço possível com estes números» era uma parede vermelha e mais nada. Agora mostra para onde vai cada euro que cobras, qual é a margem máxima que as tuas contas aguentam, e tem um botão que a aplica. Uma comissão de 15% cobrada sobre o valor com IVA come 18,45% do valor sem IVA — e é isso, quase sempre, e não a margem que pediste.",
      "Coisas que já eram calculadas e nunca chegavam ao ecrã: o efeito do desconto (o máximo que aguentas, e quantas unidades a mais tens de vender para ficar na mesma — com 35% de margem, um desconto de 20% obriga a vender mais 133%), o percurso do dinheiro de «o cliente paga X» a «fica-te Y», e o caminho inverso: «quero ganhar 2 000 € por mês, o que cobro?».",
      "Podes guardar cada preço com um nome e vê-los lado a lado em «Os meus preços», no teu painel. Os números são recalculados com as taxas de hoje — comparar um preço guardado o ano passado com um de agora, cada um com a sua tabela de imposto, não é comparar. E há uma linha que só faz sentido com a lista toda à frente: quantos dos teus produtos estão a perder dinheiro em cada venda.",
      "O resultado passou a dizer onde para. Não cobre o que o mercado aceita, o IRS é uma taxa marginal estimada, e os preçários dos canais são de terceiros com data de verificação. Um limite por dizer é uma promessa implícita de que está tudo coberto.",
      "Em desktop, os campos e o preço ficam lado a lado, e uma barra fina no topo mantém o número à vista enquanto preenches o resto. Em telemóvel nada muda de ordem: continua a ver-se o preço antes dos campos avançados.",
      "Para quem navega por teclado: os grupos de opções passaram a responder às setas, como um grupo de rádios a sério. Para quem usa leitor de ecrã: o preço deixou de mudar em silêncio, e a ajuda de cada campo passou a estar ligada ao campo — antes existia só dentro de um balão que o leitor não anunciava.",
    ],
  },
  {
    version: "2.84.1",
    data: "2026-08-19",
    titulo: "O mapa que damos ao Google deixou de se contradizer",
    itens: [
      "O sitemap é a lista de páginas que pedimos aos motores de busca para indexar. A página para investidores estava lá — e, ao mesmo tempo, dizia a quem lá chegasse para não a indexar. Ficava por publicar de propósito, enquanto o aviso legal não estiver revisto por advogado; o que estava errado era estarmos a anunciá-la à mesma. Saiu da lista, e fica escrito no código o que é preciso fazer no dia em que for para publicar.",
      "O painel privado dos contabilistas não constava do ficheiro que diz aos motores de busca onde não entrar. Passa a constar — com o cuidado de não apanhar por engano o diretório público de contabilistas, que é precisamente a página que queremos encontrada.",
      "As entradas dos painéis pessoal e de administração também escapavam a essa recusa, por uma subtileza do formato: proibir «/dashboard/» não proíbe «/dashboard». Passam a estar cobertas as duas formas.",
      "Verificámos as 233 ligações internas do site, uma a uma, contra as rotas que existem de facto: nenhuma aponta para o vazio. As 211 páginas submetidas continuam sem repetições e todas com data de revisão verdadeira, não a data da última publicação do site.",
    ],
  },
  {
    version: "2.84.0",
    data: "2026-08-19",
    titulo: "Quem vive na Madeira ou nos Açores deixa de pagar IRS a mais nas nossas contas",
    itens: [
      "As regiões autónomas cobram menos 30% de IRS do que o continente, em todos os escalões — é um direito de quem lá reside, escrito na Lei das Finanças das Regiões Autónomas. O nosso motor calculava sempre pelas taxas do continente. Quem vive no Funchal ou em Ponta Delgada via um imposto maior do que o seu, na calculadora, no simulador, no comparador e na formação de preço.",
      "Passa a estar certo. Se resides numa região autónoma, a redução entra no cálculo: no IRS que te estimamos, no preço que te sugerimos cobrar e na comparação entre recibos verdes e sociedade — que era a mais injusta das três, porque só um dos lados da balança levava o desconto.",
      "Havia até uma contradição dentro do próprio site: no recibo de vencimento a retenção mensal já usava a tabela da tua região, mas o apuramento do ano usava as taxas do continente. O mealheiro prometia um reembolso que não existia, ou escondia um que existia.",
      "Uma distinção que agora fica explícita, porque muda o resultado: o IVA segue a operação, o IRS segue a pessoa. Quem reside no continente e tem atividade na Madeira liquida IVA da Madeira e paga IRS continental — e o contrário também acontece. Onde a pergunta era só «Região», passa a dizer-se o que ela decide.",
      "Os números não foram escritos à mão. Guardámos a regra legal — menos 30% — e o site confere-a, escalão a escalão, contra a tabela publicada para 2026. Se um orçamento regional mudar o diferencial, ou se alguém mexer nos escalões nacionais sem pensar nas regiões, o site recusa-se a arrancar em vez de servir um imposto errado em silêncio.",
      "Duas coisas ficaram deliberadamente por mudar, e dizemo-lo em vez de as fazer à sorte: o mínimo de existência e a taxa dos dividendos continuam a usar a referência nacional, porque não conseguimos confirmar em fonte oficial se a redução regional lhes toca. Nos dois casos o que mostramos peca por excesso de imposto, que é o lado seguro para quem está a decidir quanto guardar.",
    ],
  },
  {
    version: "2.83.0",
    data: "2026-08-19",
    titulo: "Ninguém do Recibo Certo volta a ler a tua conversa com o teu contabilista",
    itens: [
      "Até hoje, tudo o que escrevias a um contabilista — e tudo o que ele te escrevia — parava numa fila para ser lido por alguém da administração antes de seguir. Estava escrito na nossa própria estratégia, com todas as letras: «a plataforma lê o que é escrito». Uma pessoa a ler conversas sobre dívidas, divórcios e heranças que não lhe foram dirigidas. Acabou.",
      "A mensagem passa a chegar no instante em que a escreves. Não é uma promessa de que deixámos de abrir o ecrã: a administração deixou de ter caminho até estas linhas. Um pedido de administrador sobre a tabela das mensagens devolve zero resultados, e o ecrã que as revia foi apagado.",
      "Há uma exceção, e é pedida por dentro: se uma das partes denunciar uma mensagem, essa mensagem — e apenas essa — passa a poder ser lida por nós. O resto da conversa continua fora do alcance de qualquer pessoa que não sejam vocês os dois.",
      "Deixaste também de ser escolhido por nós. Descreves o caso e escolhes tu a quem o queres enviar, até três contabilistas, a partir do diretório. A triagem manual era a mesma leitura de conversa alheia, um passo antes.",
      "E a parede que recusava emails e telemóveis a meio de uma frase desapareceu. Podes partilhar os teus contactos com quem trata do teu caso — é um interruptor no caso, que ligas e desligas quando quiseres, com efeito imediato.",
      "As consultas passam a poder ir para o teu calendário — o do Google, o do iPhone e do Mac, o Outlook — e a atualizar-se sozinhas quando alguma muda de hora ou é cancelada. Não pedimos acesso ao teu calendário: publicamos o nosso, num endereço só teu que podes trocar ou desligar. E há a opção de ele dizer apenas «ocupado», sem nomes nem assuntos, para quem partilha o calendário com outras pessoas.",
      "Para contabilistas: os primeiros dez a serem aprovados ficam com 5% de comissão — a mais baixa da tabela — de imediato e enquanto a conta estiver ativa. Sem faturação mínima e sem prazo. É o reconhecimento de quem entra numa plataforma sem histórico e sem provas dadas, e o limite de dez é imposto pela base de dados, não por uma promessa.",
      "Esgotados esses dez, quem vier a seguir pode propor um valor próprio para subir de patamar e explicar porque é que faz sentido no caso dele. A proposta vai direta ao administrador, que aceita, contrapõe ou recusa — com uma razão escrita nos três casos. É além dos créditos de fidelidade, não em vez deles, e um valor acordado compra a percentagem e mais nada.",
      "A página de candidatura de contabilistas deixou de ser um formulário com três linhas por cima. Passa a explicar como um cliente chega até ti, o que custa (com a tabela de patamares real), o que o painel te dá, e — com o mesmo detalhe — o que a plataforma não vê.",
    ],
  },
  {
    version: "2.82.0",
    data: "2026-08-18",
    titulo: "A calculadora de preços passa a dizer-te quando é que o dinheiro sai",
    itens: [
      "Saber que deves reservar 18% de tudo o que faturas é uma abstração. Saber que a 25 de novembro te saem 340 € é uma coisa que podes fazer. A calculadora de preços passa a cruzar o preço com o calendário fiscal: quanto guardar por mês, e depois as próximas datas, cada uma com a quantia que lhe corresponde a este preço.",
      "Com duas distinções que enganam muita gente e que aqui ficam explícitas: entregar a declaração periódica de IVA não é pagar o imposto — são datas diferentes, e o dinheiro só sai numa delas, por isso a quantia aparece uma vez e não duas. E a Segurança Social declara-se por trimestre mas paga-se todos os meses; quem confunde as duas coisas reserva a terça parte do que precisa, ou o triplo.",
      "O IRS não entra nesse calendário, e isso é de propósito: quanto vais pagar depende do teu ano inteiro e da liquidação da Autoridade Tributária, não deste preço. Preferimos deixar a linha vazia e dizer porquê a mostrar-te um número plausível.",
      "Quem tem sociedade deixa de ficar a meio da resposta. Antes a ferramenta dizia quanto lucro o preço dá à empresa e calava-se sobre quanto disso chega ao dono. Agora mostra o percurso todo — faturação, despesas, IRC e derrama, o que chega à tua conta — e mostra o lucro que fica na empresa ao lado, nunca como perda: continua a ser teu, está noutro bolso. O número que conta é a soma dos dois.",
      "A dispensa de retenção na fonte (abaixo de 15 000 € por ano) e o IRS Jovem passam a contar. Nenhum dos dois muda a tua margem — mudam quando é que o dinheiro está na tua conta, que é coisa diferente e igualmente importante para quem tem de pagar contas ao dia 8.",
      "O ato isolado passa a ter cenário próprio. É a situação em que mais gente se engana com o IVA, porque a isenção até 15 000 € simplesmente não se aplica: um ato isolado leva sempre IVA, mesmo que seja o único do ano.",
      "E se resides na Madeira ou nos Açores, a ferramenta passa a avisar-te de que o IRS que usa nas contas é o do continente. As tuas taxas são 30% mais baixas em todos os escalões, e essa redução aplica-se ao rendimento da tua atividade. Ou seja: o preço que te propomos cobre mais imposto do que vais pagar. Preferimos dizer-te que temos folga a mais a deixar-te descobrir sozinho.",
    ],
  },
  {
    version: "2.81.0",
    data: "2026-08-18",
    titulo: "A calculadora pergunta antes de responder — e o site inteiro passa a ser legível",
    itens: [
      "A calculadora de preços mostrava o resultado antes de te perguntar seja o que for. Escolhias «um produto digital» e ela anunciava «QUANTO DEVES COBRAR: 1,09 €» — um número feito de um custo de 0 €, uma margem de 70% e um volume de 20 vendas que ninguém escolheu. Era um palpite nosso com ar de conselho.",
      "Agora a ordem é a da conversa: primeiro dizes o essencial, depois aparece o preço com o cursor para o afinar, e só quem quiser mais precisão desce aos blocos avançados. E enquanto não tocares em nada, o número assume-se como o que é — «um exemplo, por enquanto» — em vez de se apresentar como recomendação.",
      "A atividade passa a escolher-se na mesma lista do simulador de recibos verdes, com dezenas de atividades em vez de quatro categorias. Várias têm coeficiente, retenção ou base de Segurança Social próprios, e antes eram ignorados: a mesma pessoa obtinha números diferentes para o mesmo caso consoante a ferramenta que abrisse.",
      "O contraste do texto passou a cumprir a norma de acessibilidade em todo o site. Eram 825 pontos a falhar, medidos em cinco páginas e nos dois temas; agora são zero. O verde da marca escureceu o mínimo necessário — falhava nas duas direções ao mesmo tempo, no texto branco sobre verde e no texto verde sobre branco — e o cinzento mais claro, que dava 2,5:1, deixou de ser usado em texto. Quem tinha dificuldade em ler as legendas, os rótulos e o rodapé deixa de ter.",
    ],
  },
  {
    version: "2.80.0",
    data: "2026-08-18",
    titulo: "Margem e markup explicados a sério — e dois enganos de conta corrigidos",
    itens: [
      "A explicação de margem e markup estava a ensinar uma coisa e a ferramenta a fazer outra. A página dizia que 50% de markup sobre 10 € dá 15 €; a calculadora sugeria mais. Quem lia as duas concluía, com razão, que uma delas estava errada.",
      "As duas medem a mesma coisa — o que te fica — e o que muda é o denominador: a margem divide pelo preço, o markup divide pelo custo. Passa a haver uma barra que mostra os mesmos cinco euros lidos das duas maneiras, e uma explicação de porque é que o preço aqui é mais alto do que o da conta de manual: naquele exemplo os cinco euros eram todos teus, e com recibos verdes não são.",
      "E, no sítio onde escolhes entre margem e markup, a escolha passa a traduzir-se sozinha com os teus números: quanto te fica por venda, que percentagem do custo é, e que percentagem do preço é.",
      "Corrigido um engano que mandava cobrar a mais: quem pedia «quero ganhar 800 € por mês» recebia um preço que rendia 1 219 €. Os impostos estavam a ser contados duas vezes — o cálculo já os descontava, e voltavam a ser repostos por cima. O mesmo acontecia em «quantas vendas preciso», que pedia 79 vendas onde 52 chegavam.",
      "A conta que compara o valor/hora ingénuo com o real — «dividir o ordenado pelas horas do mês daria 15 €/h; com férias, horas não faturáveis e impostos, são 42 €/h» — estava a ser calculada e deitada fora. Passa a aparecer.",
    ],
  },
  {
    version: "2.79.0",
    data: "2026-08-18",
    titulo: "A calculadora de preços deixa de prender quem lá entra",
    itens: [
      "O botão «Mudar» não fazia nada. Carregavas, e ficava tudo igual — porque o ecrã voltava a ler o cenário guardado no mesmo instante em que o largava, e repunha-o. Quem escolhia o tipo de venda errado não tinha como sair sem apagar os dados do browser. Está corrigido, e sair de um cenário passa a esquecê-lo mesmo.",
      "O «voltar» do telemóvel saía da ferramenta em vez de recuar um passo. O cenário passa a ficar no endereço, por isso o botão e o gesto de voltar fazem o que se espera — e podes guardar ou partilhar o link já com o teu caso escolhido.",
      "O cursor para experimentar outro preço estava depois de todos os campos: no telemóvel nascia quatro ecrãs abaixo do número que serve para afinar. Passa a estar logo por baixo do preço, que é onde se lhe quer mexer. A memória de cálculo desceu para junto dos campos — é para conferir depois, não para atravessar antes.",
      "O mesmo preço aparecia com dois valores sem IVA diferentes na mesma página, a um cêntimo um do outro. Era o cursor a refazer a conta a partir de um número já arredondado. Agora, parado no valor recomendado, mostra o resultado tal e qual.",
      "Quando não há contas fixas declaradas, o «piso absoluto» e o «mínimo sustentável» são o mesmo número. Apareciam os dois, com explicações que se contradizem à leitura. Passa a aparecer uma linha só, a dizer porquê. E o «equilíbrio: 0» — que se lia como erro — passa a dizer que não há custos fixos a cobrir.",
    ],
  },
  {
    version: "2.78.0",
    data: "2026-08-18",
    titulo: "Uma ferramenta nova para decidir quanto cobrar — feita para as regras portuguesas, não traduzida do Brasil",
    itens: [
      "Quem pesquisa em português como calcular um preço de venda encontra quase sempre conteúdo brasileiro: a matemática está certa, o enquadramento é de outro país. Passa a haver uma ferramenta que faz a conta com as regras daqui, em «Calcular o preço de venda».",
      "Começa por perguntar o que estás a vender — um produto para revender, um bolo por encomenda, uma hora de consultoria — e só depois pergunta números. As perguntas mudam com a resposta, e o resultado aparece desde o primeiro segundo: não há botão de calcular, há um número que reage.",
      "Estar isento de IVA pelo Art. 53.º não é só não cobrar IVA. Também não deduzes o IVA que pagas nas compras, e por isso o teu custo real é o valor com IVA. É o erro mais caro que uma calculadora de preços pode cometer, porque é silencioso — o número parece plausível. Aqui os dois efeitos entram ao mesmo tempo.",
      "Para quem passa recibos verdes, a Segurança Social entra como aquilo que é: um custo sobre a faturação, não um imposto sobre o lucro. Cerca de 15 cêntimos de cada euro de serviços prestados, ganhes ou percas dinheiro nessa venda. E o IRS do regime simplificado incide sobre um coeficiente da faturação, o que significa uma coisa que contraria a intuição de toda a gente: comprar mais barato dá-te margem, mas não te dá menos imposto.",
      "A retenção na fonte aparece à parte e nunca reduz a margem — é IRS adiantado, não um custo. Confundir os dois faz quem fatura a empresas achar que tem de cobrar mais 23%.",
      "As comissões de marketplace e as taxas de pagamento incidem sobre o valor total da encomenda, com IVA. Uma comissão de 15% custa, na prática, 18,45% do que te fica. A ferramenta resolve a conta em vez de a aproximar, e quando a margem que pedes é impossível a qualquer preço, di-lo — em vez de devolver um número sem sentido.",
      "Em vez de um preço com dois decimais, dá uma faixa: o piso abaixo do qual perdes dinheiro em cada venda, o mínimo que cobre as contas fixas, o recomendado e o confortável. Cada um explica de onde vem. Há um cursor para experimentar outro preço com a margem, o lucro e o ponto de equilíbrio a mexer ao mesmo tempo, e botões para ver o que acontece se deres desconto, pagares os portes ou venderes por marketplace.",
      "Diz também o que a lei obriga a fazer depois de o preço estar decidido: ao consumidor mostra-se o preço com impostos incluídos, e anunciar uma redução obriga a indicar o preço mais baixo praticado nos 30 dias anteriores.",
      "Ao verificar as contas apareceu uma coisa que vale a pena dizer em voz alta: entre cerca de 12 000 € e 16 000 € de faturação anual, a taxa de IRS sobre o euro seguinte passa dos 40% — mais alta do que a de quem fatura 70 000 €. É o mínimo de existência a extinguir-se, e quem está nessa faixa fica agora a saber.",
      "O regime de IVA deixa de ser o que respondes num menu: passa a ser deduzido da tua faturação, pelo mesmo motor que serve o simulador de recibos verdes. Quem diz estar isento mas declara 40 000 € é calculado com IVA, e a ferramenta explica porquê — acima de 18 750 € a isenção cai na hora. A isenção pela natureza da atividade, essa, nunca é contrariada: não tem limiar.",
      "E a pergunta que só uma calculadora de preços pode responder: a este preço e a este volume, em que mês passas o limiar? A projeção é nossa, não tua — por isso avisa, e nunca te muda o regime nas costas.",
      "Quem tem contabilidade organizada deixa de ouvir uma coisa falsa: aí os custos reduzem mesmo o IRS. A corrigir isto apanhámos um erro nosso — tratar um imposto sobre o lucro como percentagem da faturação cobrava imposto sobre o próprio custo e inflacionava o preço em cerca de um terço. O regime simplificado não mudou um cêntimo.",
      "Se acumulas recibos verdes com um emprego, o IRS passa a contar com o salário: cada euro faturado entra por cima dele e leva a taxa do topo. No caso-tipo, 33,7% em vez de 19,4% — antes, o preço sugerido a quem acumula ficava abaixo do necessário.",
      "O cálculo é grátis, corre no teu browser e não pede conta nem email. O que escreves fica guardado no cofre local deste aparelho, como os restantes simuladores.",
    ],
  },
  {
    version: "2.77.0",
    data: "2026-08-18",
    titulo: "O selo «verificado» passa a ter prazo, e o perfil do contabilista deixa de ser um formulário",
    itens: [
      "«OCC verificada» queria dizer «alguém confirmou isto uma vez» — não dizia quem, nem como, nem se ainda era verdade. E uma inscrição na Ordem pode ser suspensa a qualquer momento.",
      "O selo passa a ter prazo, a dizer como foi confirmado e em que dia. Quando o prazo acaba, sai do perfil público e o contabilista é avisado catorze dias antes, com o botão de renovar ao lado — fica «por reconfirmar», e não «por verificar» como quem nunca o foi.",
      "Do lado da administração acabou o botão que carimba: para confirmar é preciso ir ao registo público da Ordem e escrever o que lá está. O sistema compara com a ficha — aceita o nome civil mais completo, recusa um homónimo com um apelido a mais, e não confirma nada se a inscrição não estiver activa.",
      "O registo da Ordem está protegido contra consulta automática, e isso respeita-se. A confirmação sem intermediários chama-se SCAP, o sistema do Estado a que a Ordem aderiu em 2021: está escrita e testada, e fica desligada até haver protocolo com a AMA. Nada finge estar ligado.",
      "O perfil deixa de ser o mesmo formulário para toda a gente. Compõe-se por blocos à escolha — como trabalho, o que trato, com quem trabalho melhor, como corre a primeira consulta, perguntas frequentes — pela ordem que cada um quiser.",
      "As áreas continuam a ser as dez por que os clientes filtram, mas deixam de ser tudo. Quem trabalha com nómadas digitais escreve-o com as suas palavras, e o termo entra sozinho no filtro certo. O território ganha quatro modos, e «todo o país» só é aceite a quem atende online.",
      "Abrir o perfil a texto livre vem com a resposta ao lado: um guardião que recusa publicar «o melhor de Lisboa», «garanto o reembolso» ou «certificado pelas Finanças». Explica porquê e sugere o que dizer. «Garanto que respondo no próprio dia» passa; o reembolso não, porque quem o decide é a Autoridade Tributária.",
      "Não há blocos para testemunhos nem para percentagens de satisfação: um testemunho escrito pelo próprio não prova nada, e uma métrica que ninguém mediu é um número inventado.",
    ],
  },
  {
    version: "2.76.0",
    data: "2026-08-18",
    titulo: "O diretório de contabilistas volta a abrir, e o Plus vitalício deixa de poder ser pago sem ser entregue",
    itens: [
      "O diretório de contabilistas dizia «Não foi possível carregar o diretório» a toda a gente, com um botão de tentar novamente que nunca podia resultar. Não era uma falha de ligação: o diretório pedia à base de dados um campo — se o contabilista aceita pagamento pela plataforma — que a tabela pública tinha deixado de ter. Todos os pedidos eram recusados, sempre, e a mensagem de avaria escondia a única coisa que se passava: ainda não há contabilistas aprovados para mostrar.",
      "Reposto o campo, o diretório volta a responder. Sem perfis, mostra agora o que devia ter mostrado desde o início — que ainda não há ninguém, não que alguma coisa se partiu.",
      "Nem o código nem as migrações estavam errados: o que tinha andado para trás era a base de dados. Passa a haver uma verificação que pergunta à base de dados que serve mesmo o site se ela responde a todos os campos que o diretório pede — a única forma de apanhar uma diferença que não existe em ficheiro nenhum.",
      "Uma consulta paga passa a custar pelo menos 10 €. Grátis continua a ser um preço legítimo e não muda nada — a primeira conversa costuma sê-lo. O que deixa de ser possível é cobrar 3 €: entre zero e dez, o que a Stripe leva por processar o pagamento é maior do que a comissão do Recibo Certo, e a plataforma pagava para intermediar. Quem escrever um valor no meio lê a razão no momento, em vez de um erro depois.",
      "O Plus vitalício é um pagamento único, e um pagamento único não cria subscrição: o que o concedia era um aviso da Stripe que nunca tinha chegado a ser registado. Ninguém foi afetado, porque ainda não houve nenhuma compra vitalícia — mas a primeira teria pago os 19,99 € e ficado no plano grátis até à reconciliação da madrugada seguinte. O aviso passou a estar registado e o acesso abre no instante do pagamento.",
      "Um reembolso devolvia o dinheiro e deixava o Plus de pé. Passa a retirá-lo, como sempre foi a intenção.",
      "O mesmo valia do lado dos contabilistas: o aviso que diz «esta conta já pode receber» não estava registado, e sem ele nenhum contabilista chegaria a poder cobrar pelo Recibo Certo. Ficou registado, com os avisos das consultas pagas e dos pagamentos que expiram.",
      "Nada disto se via de fora. Não havia erro, não havia registo, não havia teste a falhar — havia um pagamento a cair no vazio. O verificador da configuração pedia três avisos quando o programa sabe tratar onze, e por isso o que faltava não era acusado por ninguém.",
      "Passa a exigir todos os que o programa trata, com a consequência de cada um escrita ao lado, e um teste compara as duas listas: se passarmos a tratar um aviso novo e ninguém o registar, o teste parte antes de isto chegar a produção.",
    ],
  },
  {
    version: "2.75.0",
    data: "2026-08-17",
    titulo: "O painel de administração deixa de esconder metade de si no telemóvel",
    itens: [
      "A barra de baixo do painel de administração tinha seis lugares e dez destinos. Partia para duas linhas, ficava mais alta do que o espaço que as páginas lhe reservavam, e o fim de cada página desaparecia por trás dela — não desalinhado, inalcançável.",
      "Passa a ter seis secções: Visão geral, Medição, Triagem, Pessoas, Site e Fiscal. Nenhuma página foi apagada, movida ou renomeada — quem tinha um endereço guardado continua a chegar lá.",
      "A Triagem junta o que tem gente à espera de resposta do outro lado: casos por encaminhar, candidaturas de contabilistas e reportes por rever. As Pessoas juntam quem já cá está, quem espera para entrar e quem nos procurou.",
      "Nos telemóveis com barra de gestos, a última linha de destinos deixa de ficar por baixo do indicador.",
      "Dois destinos partilhavam o mesmo desenho com outros dois — o mesmo ícone para «Propostas» e «Triagem de casos», e outro repetido entre «Contabilistas» e «Auditoria fiscal». A 18 pixels, o desenho é a única forma de os distinguir. Agora cada um tem o seu.",
      "No computador, a barra lateral agrupa os destinos por assunto e mostra-os todos, e o topo passa a dizer em que página se está.",
      "As dez páginas passam a abrir da mesma maneira. Havia três tamanhos de título, dois pesos e três cores — diferenças que não queriam dizer nada, era a ordem por que as páginas foram escritas.",
      "As duas barras de navegação passam a ter nome para quem usa leitor de ecrã. Anunciavam-se as duas como «navegação», sem forma de saber qual era qual.",
    ],
  },
  {
    version: "2.74.0",
    data: "2026-08-17",
    titulo: "O painel do contabilista deixa de sair espremido no tablet",
    itens: [
      "Entre o telemóvel e o computador — um iPad ao alto, um ecrã dividido, uma janela estreita — o painel usava as coordenadas do computador numa grelha que já tinha menos colunas. Na vista «Meu dia», «Prazos próximos» e «Documentos por rever» ficavam com 42 pixels de largura: duas tiras verticais onde deviam estar duas listas. Passa a haver uma disposição própria para essa largura, calculada a partir da do computador, sem cartões espremidos e sem dois em cima um do outro.",
      "Quem estiver a personalizar o painel nessa largura continua a ver a grelha do computador, porque é essa que está a editar — o cartão vai para onde o dedo o larga, e não para uma coluna ao lado.",
      "O «Resumo por cliente» contava as consultas de uma maneira e a página de clientes contava de outra. Passa a mostrar as consultas realizadas, as mesmas que a página mostra, vindas do mesmo sítio. Com espaço, mostra também a data da última.",
      "Sair de um painel a meio de o personalizar passa a perguntar antes. Bastava carregar em «Clientes» na barra lateral para perder tudo o que se tinha arrumado.",
      "Quando alguma coisa corre mal a criar, renomear ou apagar uma vista, lê-se uma frase e não um código. Quem tentava criar a nona vista via escrito «demasiadas_vistas»; agora lê que o limite é oito e que é preciso apagar uma primeiro. E o botão avisa antes de tentar.",
      "Um módulo que falhe a desenhar-se deixa de levar o painel inteiro com ele: fica com o erro dentro da sua própria moldura e os outros continuam a funcionar.",
      "Cada cartão do painel ganha um menu para o atualizar sozinho, sem recarregar a página, e para abrir o ecrã completo por trás dele.",
      "Desfazer volta a andar um passo de cada vez.",
    ],
  },
  {
    version: "2.73.0",
    data: "2026-08-17",
    titulo: "O painel de gestão passa a ter seis secções em vez de dez separadores",
    itens: [
      "O painel tinha dez destinos numa lista só. Passa a ter seis secções, e nenhuma página foi apagada, movida ou renomeada: quem tinha um endereço guardado continua a chegar lá.",
      "As Partilhas passam a viver dentro dos Clientes. Uma partilha é o que aquele cliente te enviou — a ficha dele já mostrava os envios, e só a navegação é que dizia que eram assuntos diferentes.",
      "Os Casos juntam-se às Tarefas em «Trabalho». São as duas metades da mesma pergunta: o que está por propor e o que está por entregar.",
      "Os Recebimentos, a Fidelidade e a Progressão ficam em «Negócio». O patamar da progressão é a comissão que sai de cada recebimento — estavam ligados nos números e separados no menu.",
      "No telemóvel, a barra de baixo deixa de rolar. Eram dez destinos e mais de metade vivia fora do ecrã, visível só para quem soubesse arrastar uma barra que não parecia arrastável. Agora as seis cabem, mesmo num ecrã de 320 px.",
      "No computador, a barra lateral abre a secção onde estás e mostra o que ela tem dentro, em vez de te pedir que guardes dez categorias de cabeça.",
      "As secções mostram um sinal quando há coisas à espera de ti lá dentro, mesmo com a secção fechada. Um pedido nas Partilhas deixa de ficar invisível até alguém lá ir.",
      "A pesquisa continua a chegar às dez páginas diretamente, sem passar por secção nenhuma — e passa a dizer, debaixo de cada uma, o que ali se resolve. Procurar «negócio» encontra os Recebimentos, a Fidelidade e a Progressão, embora nenhuma delas se chame assim.",
      "O quadro de tarefas passa a chamar-se «Tarefas» também no título da página, que continuava a dizer «Trabalho» — o nome que agora é o da secção inteira.",
    ],
  },
  {
    version: "2.72.0",
    data: "2026-08-17",
    titulo: "Onde é a consulta deixa de ser uma frase escrita à mão",
    itens: [
      "As consultas presenciais passam a ter um local escolhido no mapa. O contabilista pesquisa a morada, usa a localização atual ou arrasta o pino até à porta — e o que fica guardado é o ponto, não uma descrição.",
      "Quem marcou a consulta abre esse local com um toque no Google Maps, no Apple Maps ou no OpenStreetMap, e vê um mapa com o pino onde ele foi mesmo posto. Antes lia «Rua de exemplo, 1 · Matosinhos» e tinha de adivinhar o resto.",
      "Quando a consulta é anterior a esta mudança e só tem morada escrita, diz-se: as ligações fazem uma pesquisa pelo texto, e o produto não finge que sabe onde é.",
      "Os links das chamadas passam a ser verificados enquanto se escrevem. O Google Meet, o Zoom, o Teams, o Whereby, o Jitsi, o Webex e o Skype são reconhecidos pelo nome; um endereço que não abre em lado nenhum é recusado antes de ser enviado, e um «http» sem segurança é assinalado.",
      "E há um atalho para reutilizar o link da última consulta — a sala é quase sempre a mesma, e voltar a colá-la é onde nascem as gralhas.",
      "Uma consulta online pode agora ser por telefone. O número fica formatado, marca-se com um toque no telemóvel do cliente, e deixa de ser um link falso escrito num campo à espera de um endereço.",
      "Enquanto escreve, o contabilista vê exatamente o cartão que o cliente vai receber. Não é uma aproximação — é o mesmo cartão.",
      "O local de uma consulta já confirmada passa a poder ser corrigido sem a desmarcar, e o cliente é avisado da mudança. Antes só se escrevia no instante da confirmação: quem confirmasse primeiro e recebesse a morada da sala depois ficava sem maneira de a dizer.",
      "A agenda passa a abrir com o que espera por ti: a próxima consulta, quantas estão confirmadas nos próximos sete dias, e a fila do que falta confirmar — inclusive o que está marcado para daqui a três semanas, que a grelha de sete dias nunca mostrava.",
      "E avisa quando há consultas confirmadas sem local. O cliente já sabe a hora e ainda não sabe onde é: era um engano silencioso, e agora tem nome e ligação direta.",
      "Na grelha da semana e na vista de mês passa a ler-se o nome de quem vem, e não só a hora. Duas consultas à mesma hora repartem o espaço em vez de se taparem uma à outra.",
      "A grelha ganhou legenda das cores. O código existia desde sempre e só quem o escreveu sabia lê-lo.",
    ],
  },
  {
    version: "2.71.0",
    data: "2026-08-17",
    titulo: "A pesquisa do painel de contabilista passa a ser a mesma do site",
    itens: [
      "Deixa de abrir uma janela por cima de tudo. Abre presa à barra, com a página a continuar visível e clicável por trás — e fecha ao clicar fora, como já acontecia no resto do site.",
      "No telemóvel, o campo onde se escreve passa a estar em baixo, colado ao teclado, com os resultados a crescer por cima. Estava no topo de uma janela ao meio do ecrã: escrevia-se num sítio e lia-se noutro.",
      "No computador, o painel de resultados abre por baixo da barra e no mesmo eixo dela, em vez de saltar para o meio do ecrã.",
      "As teclas continuam as mesmas — setas para andar, Enter para abrir, Esc para fechar — e passam a estar escritas onde se veem também no telemóvel.",
    ],
  },
  {
    version: "2.70.0",
    data: "2026-08-17",
    titulo: "O telemóvel deixa de ser a versão pequena do site",
    itens: [
      "A pesquisa passa a estar sempre à vista, numa barra de largura inteira mesmo por cima da navegação. Estava escondida atrás de uma lupa de 20 px, ao lado de «Guias» e «Quiz» — no meio das páginas a que ela própria dá acesso.",
      "E passa a ser a mesma pesquisa do computador: abre ancorada à barra e cresce para cima, com os mesmos atalhos e o mesmo rodapé. Era um ecrã à parte, com a página tapada por trás — duas pesquisas com o mesmo nome e dois feitios diferentes.",
      "Carregar no separador onde já estás leva ao princípio da página. Antes não fazia nada: quem estava no fim do quiz e carregava em «Quiz» ficava exactamente onde estava.",
      "«Planos» e «Sugestões e reportes» sobem para logo abaixo de «Entrar» e «Começar grátis». Estavam no fim do menu, depois de nove ferramentas e quatro páginas de guias — dois ecrãs de rolagem até ao que se procurava.",
      "«Contabilistas» ganha um lugar fixo na barra de baixo, à direita do «Quiz». É a única coisa aqui que acaba com uma pessoa do outro lado, e estava enterrada dentro do menu «Conta», onde se procuram definições e não um profissional certificado.",
      "A barra de baixo fica: Início · Guias · Quiz · Contabilistas · Conta. Os lugares que já lá estavam não mudaram de sítio — quem já lhes acertava sem olhar continua a acertar.",
      "Passa a haver um topo no telemóvel, com a marca, o tema e o botão de começar. Antes não havia nenhum: o nome do produto não aparecia em lado nenhum, mudar para o modo escuro eram dois toques, e a ação principal estava dentro de um menu. Rola com a página, para não roubar altura a quem está a ler.",
      "No painel de contabilista, a pesquisa passa a ter uma barra por cima da navegação, em vez de uma lupa espremida no topo. É a mesma pesquisa de sempre — muda o sítio, que passa a ser onde o polegar chega.",
      "E passa a haver como sair do painel de contabilista no telemóvel. A saída vivia no fundo da barra lateral, que não existe em ecrãs pequenos: quem entrasse ficava sem caminho de volta que não fosse o botão «voltar» do browser.",
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