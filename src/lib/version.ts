// Versão da app + changelog do popup "Novidades & Atualizações".
//
// ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
// entrada NO TOPO de `CHANGELOG`. O popup só reaparece a um utilizador quando
// `APP_VERSION` muda (guarda a última vista em localStorage). Se esqueceres:
//   · `assertChangelogIntegrity()` (em baixo) FALHA o build;
//   · o workflow `.github/workflows/changelog-check.yml` FALHA o PR para main.
//
// ⚠️ REGRA IMUTÁVEL do comportamento do popup (NÃO alterar sem autorização):
// o popup "Novidades" só pode aparecer (1) na PRIMEIRA visita de sempre e
// (2) quando há uma NOVA versão (este `APP_VERSION` muda). Nunca a cada refresh.
// A garantia vive em `NovidadesModal.tsx`: a versão é marcada como vista no
// INSTANTE em que o popup é mostrado (não só ao fechar), pelo que atualizar a
// página com ele aberto nunca o faz reaparecer para a mesma versão.

export const APP_VERSION = "1.86.1";
export const VERSAO_STORAGE_KEY = "recibocerto:changelog_visto";

export interface EntradaChangelog {
  version: string;
  data: string;
  titulo: string;
  itens: string[];
}

export const CHANGELOG: EntradaChangelog[] = [
  {
    version: "1.86.1",
    data: "2026-06-28",
    titulo: "Ligação «Simuladores» corrigida",
    itens: [
      "Nos guias (e no menu), o atalho «Simuladores» passa a abrir a secção de simuladores na página inicial, em vez do simulador de IRS do painel.",
    ],
  },
  {
    version: "1.86.0",
    data: "2026-06-28",
    titulo: "Mais guias, com fotografia real do Porto e ligação aos simuladores",
    itens: [
      "Nove novos guias, bem elaborados e com base legal: despesas dedutíveis e a regra dos 15%, pagamentos por conta, simplificado vs. contabilidade organizada, calendário fiscal 2026, IFICI (NHR 2.0), mais-valias (ações, cripto e imóveis), tributação conjunta vs. separada, reembolso de IRS e empresa vs. recibos verdes.",
      "O herói da página de Guias passa a mostrar uma fotografia real da Ponte D. Luís I sobre o Rio Douro, no Porto.",
      "Cada guia encaminha agora diretamente para os Simuladores e para o Simulador de IRS — da leitura às tuas contas, num clique.",
    ],
  },
  {
    version: "1.85.0",
    data: "2026-06-28",
    titulo: "Página de Guias renovada e Política de Privacidade reforçada",
    itens: [
      "Nova página de Guias, agora protagonista: herói dedicado, pesquisa instantânea, filtros por categoria, ordenação, vista de lista/grelha e marcadores para guardares os guias favoritos.",
      "Cada guia passa a sugerir os simuladores certos para o tema que estás a ler — da teoria diretamente às tuas contas.",
      "Política de Privacidade totalmente reescrita e mais robusta (RGPD + Lei n.º 58/2019): explica o plano gratuito (dados no teu dispositivo) e o plano Pro (dados guardados em segurança na nuvem, na UE), pagamentos, emails, subprocessadores, transferências internacionais e os teus direitos.",
    ],
  },
  {
    version: "1.84.0",
    data: "2026-06-24",
    titulo: "Central de Feedback redesenhada e mais segura",
    itens: [
      "A janela de feedback ficou mais moderna e fácil de perceber: o destaque de que ganhas XP no Quiz Fiscal aparece logo no topo, e o botão «Enviar» está sempre visível — já não é preciso rolar para encontrar nada.",
      "Mais segurança: o envio bloqueia automaticamente código, HTML e scripts, e o texto é limpo de caracteres invisíveis tanto na app como na base de dados. Comparações normais (ex.: «lucro < 1000») continuam a passar sem problema.",
    ],
  },
  {
    version: "1.83.1",
    data: "2026-06-24",
    titulo: "Barra do telemóvel mais clara",
    itens: [
      "Na barra inferior do telemóvel, o atalho da esquerda passa a ser «Sugestões e suporte»; a tua foto de perfil fica só no botão da direita, que leva ao painel — sem fotos repetidas.",
    ],
  },
  {
    version: "1.83.0",
    data: "2026-06-24",
    titulo: "Central de sugestões e reportes, header do telemóvel unificado e mais",
    itens: [
      "Nova Central de Feedback: em qualquer página podes mandar uma sugestão, reportar um erro, tirar uma dúvida ou deixar uma mensagem — pelo botão no cabeçalho (ou no menu do telemóvel). A equipa do ReciboCerto valida cada mensagem e, se tiveres sessão iniciada e o contributo for útil, ganhas XP no Quiz Fiscal.",
      "No telemóvel deixou de haver dois cabeçalhos: passa a existir só a barra de baixo (na zona do polegar), agora com tudo o que há no cabeçalho de computador — simuladores, ferramentas, guias, planos e conta — organizado por secções.",
      "O botão da conta passa a mostrar a tua foto de perfil também no telemóvel.",
      "O popup de Novidades volta a comportar-se como deve: aparece na primeira visita e só reaparece quando há uma nova versão — nunca a cada atualização da página.",
      "Pequenas afinações visuais no painel de administração.",
    ],
  },
  {
    version: "1.82.1",
    data: "2026-06-24",
    titulo: "Etiqueta do escalão centrada na demo do IRS",
    itens: [
      "Na demonstração «ao vivo» do Simulador de IRS, a etiqueta com o escalão (ex.: «5.º · 31,1%») passa a ficar exatamente por cima da barra correspondente — antes aparecia ligeiramente deslocada para a direita.",
    ],
  },
  {
    version: "1.82.0",
    data: "2026-06-24",
    titulo: "Guardar cenários com um modal bonito, IRS Jovem mais claro e demo do IRS só em verde",
    itens: [
      "Guardar um cenário deixou de abrir aquela caixa cinzenta do navegador: passa a ser um modal moderno, com nome sugerido já selecionado, confirmação com Enter e folha inferior no telemóvel.",
      "No simulador de recibo de vencimento, o IRS Jovem e os dependentes deixam de parecer que «se anulam»: quando os dependentes já levam a retenção mensal a zero, explicamos que a isenção continua a contar no acerto anual de IRS — as duas vantagens complementam-se, não competem.",
      "A demonstração «ao vivo» do Simulador de IRS passou a usar só a paleta verde da marca (sem laranja), com o anel e os escalões redesenhados sem falhas visuais e com perfis de exemplo mais ricos (agora também um rendimento alto, no escalão de topo).",
    ],
  },
  {
    version: "1.81.0",
    data: "2026-06-23",
    titulo: "Simulador guiado redesenhado, Quiz Fiscal mais leve e modo escuro corrigido",
    itens: [
      "O simulador guiado (recibos verdes) foi redesenhado de ponta a ponta — ecrã «Como queres simular?», passos, barra de progresso, cabeçalhos e navegação mais calmos e coerentes, mantendo exatamente os mesmos cálculos.",
      "Quiz Fiscal muito mais leve a abrir: as ~900 mil perguntas deixaram de ser todas descarregadas de uma vez. A página de seleção abre logo e o banco de perguntas só é descarregado quando começas (já pré-carregado ao passar o rato/focar), gastando muito menos dados.",
      "Corrigido o modo escuro do Quiz Fiscal: textos e ícones que ficavam invisíveis sobre fundo escuro (cartões do desafio Pro, níveis e seleção de categorias) voltam a ler-se bem.",
      "No simulador de recibo de vencimento, a auditoria do recibo, a importação de PDF e a exportação passam a carregar só quando as usas — abre mais leve.",
    ],
  },
  {
    version: "1.80.0",
    data: "2026-06-23",
    titulo: "Trocar de simulador instantâneo, gastando menos dados",
    itens: [
      "Os outros modos de simulação deixaram de ser descarregados todos em segundo plano ao abrir a calculadora — passam a preparar-se apenas quando passas o rato (ou tocas) na opção. Resultado: a troca continua quase instantânea, mas quem só usa um modo deixa de gastar dados com os restantes (o modo «Por conta de outrem» sozinho chegava a pesar cerca de 1 MB).",
    ],
  },
  {
    version: "1.79.0",
    data: "2026-06-23",
    titulo: "Simulador abre mais leve e os restantes modos ficam prontos em segundo plano",
    itens: [
      "Ao abrir a calculadora, descarrega-se primeiro só o modo que estás a usar; os outros modos (por conta de outrem, empresa, comparar) ficam a carregar em segundo plano, por isso trocar entre eles passa a ser praticamente instantâneo.",
      "Dentro do simulador, o assistente passo-a-passo deixou de ser descarregado logo: aparece primeiro a escolha «Como queres simular?» e o passo-a-passo prepara-se em segundo plano enquanto decides — abre mais rápido e gasta menos dados.",
    ],
  },
  {
    version: "1.78.0",
    data: "2026-06-23",
    titulo: "Site mais rápido a abrir, sobretudo no telemóvel",
    itens: [
      "A página inicial passa a carregar muito menos código de uma vez: o simulador só é descarregado quando te aproximas dele (ou quando clicas em «Calcular»), em vez de pesar logo no arranque.",
      "A pesquisa, o aviso de cookies e o popup de Novidades passam a carregar em segundo plano, sem atrasar a primeira abertura da página.",
      "Componentes de conta (nuvem) deixaram de ser descarregados em páginas onde não são precisos — menos dados e arranque mais leve para quem só quer usar as calculadoras.",
      "Os números de exemplo da página inicial passam a ser preparados no servidor, deixando o telemóvel com menos trabalho ao abrir — sem qualquer mudança nos valores apresentados.",
    ],
  },
  {
    version: "1.77.0",
    data: "2026-06-23",
    titulo: "Demonstração do Simulador de IRS mais rica e simuladores que voltam ao topo",
    itens: [
      "A demonstração «ao vivo» do Simulador de IRS está muito mais completa: além do reembolso (ou valor a pagar), mostra agora um anel com a fatia do rendimento que fica contigo, em que escalão de IRS cais (com as taxas oficiais de 2026), uma memória de cálculo resumida e três perfis de exemplo que vais podendo alternar.",
      "Nos simuladores guiados (IRS, recibos verdes e abrir empresa), ao avançar para o passo seguinte o ecrã volta automaticamente ao topo do simulador — assim, quando o passo seguinte é mais curto, deixas de ficar perdido a meio da página.",
    ],
  },
  {
    version: "1.76.0",
    data: "2026-06-23",
    titulo: "Página completa do Simulador de IRS e exportação no Pro",
    itens: [
      "A página do Simulador de IRS passa a ter um hero com demonstração ao vivo e o simulador completo logo abaixo — é o mesmo simulador do painel, com tudo sincronizado (sem duplicações).",
      "Exportar em PDF/CSV passa a ser uma funcionalidade Pro nos simuladores de IRS e de recibo de vencimento: podes experimentar 1 vez neste dispositivo e, a partir daí, é necessário o plano Pro.",
      "Pequenos retoques de coerência e desempenho.",
    ],
  },
  {
    version: "1.75.0",
    data: "2026-06-23",
    titulo: "Pesquisa repensada no telemóvel e textos mais claros",
    itens: [
      "No telemóvel e tablet, a pesquisa passa a ter o campo de escrita em baixo (na zona do polegar) e os resultados a abrir para cima, sempre acima do teclado — adeus conteúdo escondido pelo teclado.",
      "Corrigimos a descrição do Simulador de IRS: simular é grátis; exportar em PDF/CSV e guardar cenários na nuvem fazem parte do Pro (no plano grátis podes guardar 1 cenário no dispositivo para experimentar).",
    ],
  },
  {
    version: "1.74.0",
    data: "2026-06-23",
    titulo: "Mais fácil de encontrar nas pesquisas",
    itens: [
      "Melhorámos a forma como o ReciboCerto aparece no Google e no Bing: passa a refletir todos os simuladores — IRS, recibos verdes, salário e empresa — e não apenas a calculadora de recibos verdes.",
      "A nova página do Simulador de IRS e a página de Investidores entram no mapa do site (sitemap), para serem indexadas pelos motores de busca.",
      "Correção interna na data-limite de pagamento da Segurança Social do 1.º trimestre nos testes (o painel já apresentava a data correta).",
    ],
  },
  {
    version: "1.73.0",
    data: "2026-06-23",
    titulo: "Página do Simulador de IRS, correções e mais polimento",
    itens: [
      "Nova página dedicada ao Simulador de IRS (com explicações e tudo o que precisas de saber), acessível a partir do menu «Recursos Fiscais → Aprender».",
      "No telemóvel, a barra inferior do painel passa a ter o Simulador de IRS à mão (o perfil continua no topo).",
      "O sujeito passivo B (tributação conjunta) já permite indicar o desconto para a Segurança Social do trabalho dependente.",
      "Correção do «Reportar erro» no Quiz Fiscal: já podes escrever a descrição sem o diálogo fechar sozinho.",
      "Modo escuro do Quiz Fiscal corrigido na página de configuração — os textos voltam a ler-se bem.",
      "A foto de perfil configurada passa a aparecer também no cabeçalho do painel em telemóvel.",
      "Nova chamada para investidores no rodapé e o menu passa a dizer «Simuladores».",
    ],
  },
  {
    version: "1.72.0",
    data: "2026-06-23",
    titulo: "Os meus cenários: guarda tudo de todos os simuladores num só lugar",
    itens: [
      "Nova página «Os meus cenários» (substitui a antiga página de recibos no menu): guarda e gere num só sítio os cenários de todos os simuladores — recibos verdes, recibo de vencimento, abrir empresa e IRS.",
      "Cada cenário guarda agora um instantâneo completo de tudo o que preencheste (não só o resultado), para reabrires e continuares exatamente de onde ficaste.",
      "Já podes guardar cenários no simulador de empresa (antes não dava) e o do recibo de vencimento passa a guardar também aqui, de forma unificada.",
      "A Visão Geral adapta-se ao tipo de cenário escolhido — recibos verdes, por conta de outrem ou empresa — mostrando os números e a leitura visual de cada um.",
      "O simulador de recibos verdes ganhou um lugar próprio no painel, em «Simuladores → Recibos verdes».",
      "No plano grátis guardas 1 cenário; com o Pro, cenários ilimitados e sincronizados na nuvem entre dispositivos.",
    ],
  },
  {
    version: "1.71.0",
    data: "2026-06-23",
    titulo: "Coerência de design nas novas funcionalidades do simulador",
    itens: [
      "O novo seletor de datas e a secção do sujeito passivo B (tributação conjunta) ficam alinhados com o design renovado do simulador.",
      "A escolha de regime do cônjuge passa também a mostrar o painel explicativo com pontos-chave.",
    ],
  },
  {
    version: "1.70.0",
    data: "2026-06-23",
    titulo: "Simulador de IRS com design renovado e mais explicado",
    itens: [
      "Cabeçalhos editoriais (etapa + título + descrição) e um indicador de passos mais claro, com barra de progresso.",
      "Cada opção importante (tributação, regime) passa a mostrar um painel explicativo com pontos-chave quando a escolhes — percebes logo o que significa.",
      "Campos com símbolo de euro, cartões e interruptores mais legíveis, e um cartão de resultado renovado com a taxa efetiva em destaque.",
      "Mais espaço, hierarquia visual e coerência em todo o simulador, mantendo o modo claro e escuro.",
    ],
  },
  {
    version: "1.69.0",
    data: "2026-06-23",
    titulo: "Sujeito passivo B, importação entre simuladores e novo calendário",
    itens: [
      "Tributação conjunta a sério: na declaração conjunta podes agora preencher os rendimentos próprios do sujeito passivo B (cônjuge ou unido de facto) — salários, trabalho independente e pensões. O rendimento coletável de cada um é apurado por pessoa (dedução específica, coeficiente e IRS Jovem) e agregado antes do quociente conjugal (Art. 69.º CIRS).",
      "Importar dados de outros simuladores: um só clique traz para o simulador de IRS o que já calculaste na calculadora de recibos verdes, no simulador de recibo de vencimento, no de abrir empresa e nas tuas preferências fiscais — preenchendo automaticamente os campos correspondentes.",
      "Novo seletor de datas, moderno e rápido: substitui o calendário do navegador por um popover elegante com vistas de dias, meses e anos para saltar instantaneamente até à data de nascimento, com teclado e modo escuro.",
      "Mais polimento e animações suaves na transição entre etapas do simulador.",
    ],
  },
  {
    version: "1.68.0",
    data: "2026-06-23",
    titulo: "Integração: valores ao cêntimo no simulador guiado de recibos",
    itens: [
      "O resultado do simulador guiado de recibos verdes passa a mostrar valores ao cêntimo (líquido/mês, Segurança Social, IRS e IVA), alinhados com os recibos guardados — sem arredondamentos ao euro.",
    ],
  },
  {
    version: "1.67.0",
    data: "2026-06-23",
    titulo: "Exportar CSV, indicador de gravação e crédito internacional por país",
    itens: [
      "Nova exportação em CSV dos dados da simulação (agregado, rendimentos, apuramento e memória de cálculo), para abrires no Excel ou folha de cálculo.",
      "Indicador «guardado há X minutos» que mostra quando a simulação foi gravada automaticamente neste dispositivo.",
      "Crédito por dupla tributação internacional calculado país a país (Art. 81.º CIRS): o limite passa a ser aplicado por país, refletindo melhor a lei do que o cálculo agregado.",
    ],
  },
  {
    version: "1.66.0",
    data: "2026-06-23",
    titulo: "Relatório de IRS com agregado e «Recomeçar» com confirmação",
    itens: [
      "O relatório/PDF da simulação passa a incluir a identificação e o agregado familiar (contribuinte, tributação, dependentes e ascendentes), além dos rendimentos, apuramento e memória de cálculo.",
      "O botão «Recomeçar» pede confirmação antes de apagar os dados guardados, para evitares perdas acidentais.",
    ],
  },
  {
    version: "1.65.0",
    data: "2026-06-23",
    titulo: "Simulador de IRS mais completo: identificação, família e mais deduções",
    itens: [
      "Identificação completa do contribuinte (nome, NIF com validação, data de nascimento, residência fiscal e estado civil) e dependentes/ascendentes individuais — com classificação automática de idade, guarda partilhada e validação de NIF.",
      "Módulos de rendimento mais detalhados: salários com Segurança Social e várias entidades, pensões por tipo, capitais separados (dividendos, juros, certificados, depósitos) e venda de imóveis com despesas decompostas (IMT, escritura, obras, comissão).",
      "Imóveis arrendados (Anexo F) declarados imóvel a imóvel, com artigo matricial, localização e percentagem de propriedade.",
      "Segurança Social do trabalho independente (Anexo SS) com isenções do 1.º ano e por acumulação.",
      "Novas deduções: pensões de alimentos (20%) e lares (25%), além de PPR e donativos com majorações.",
    ],
  },
  {
    version: "1.64.0",
    data: "2026-06-23",
    titulo: "Venda de imóveis com correção monetária e rendimentos estrangeiros país a país",
    itens: [
      "Venda de imóveis: o valor de aquisição passa a ser corrigido pelo coeficiente de desvalorização da moeda (Art. 50.º CIRS) quando o imóvel é detido há 24 meses ou mais — reduzindo a mais-valia tributável. Usamos a tabela oficial de 2025 (Portaria 382/2025) como estimativa até sair a de 2026, com atualização automática.",
      "Rendimentos estrangeiros (Anexo J) agora declaram-se país a país, com tipo de rendimento e imposto pago em cada país, e o crédito por dupla tributação é calculado sobre o conjunto.",
      "Avisos novos: rendimento estrangeiro sem país indicado e sem imposto pago no estrangeiro.",
    ],
  },
  {
    version: "1.63.0",
    data: "2026-06-22",
    titulo: "Simulador de IRS: detalhe por ativo, comparador, gráficos e exportação",
    itens: [
      "Investimentos e criptoativos passam a registar-se operação a operação (compra, venda, comissões e datas): calculamos o saldo do ano e classificamos automaticamente cada operação em curto ou longo prazo — o cripto detido 365 dias ou mais fica isento sozinho.",
      "Donativos com as majorações do Mecenato (130% social/religioso, 140% cultural/ambiental) e donativos ao Estado sem o limite de 15% da coleta.",
      "Novo comparador de cenários na revisão: tributação individual vs. conjunta e taxa autónoma vs. englobamento, lado a lado, com indicação de qual paga menos.",
      "Gráficos da origem dos rendimentos e da distribuição fiscal, e visão do agregado familiar em cartões.",
      "Exportação da simulação para PDF/impressão e gravação automática no dispositivo — podes fechar e retomar onde ficaste, ou recomeçar do zero.",
    ],
  },
  {
    version: "1.62.0",
    data: "2026-06-22",
    titulo: "Benefícios fiscais e gráficos no Simulador de IRS",
    itens: [
      "O Simulador de IRS guiado passa a calcular benefícios fiscais: PPR (20% do aplicado, com limite por idade), donativos (25%, até 15% da coleta) e dedução por ascendentes a cargo (525 €, ou 635 € se for só um).",
      "Novos gráficos na revisão final: a origem dos teus rendimentos por categoria e uma barra que mostra para onde vai o dinheiro (líquido, IRS e Segurança Social).",
      "Todos os benefícios respeitam o limite global das deduções à coleta e aparecem na memória de cálculo com a respetiva base legal.",
    ],
  },
  {
    version: "1.61.0",
    data: "2026-06-22",
    titulo: "Novo Simulador de IRS guiado por etapas",
    itens: [
      "O Simulador de IRS foi reconstruído de raiz num percurso guiado por etapas: agregado familiar, triagem de rendimentos, módulos e revisão final — sem teres de saber em que anexo cada rendimento entra.",
      "Cada módulo mostra discretamente a sua correspondência fiscal (Anexo A, B, E, F, G, J) e explica, ao passar o cursor ou clicar, o que é, o que se declara e como é usado.",
      "Novos módulos com cálculo verificado: mais-valias de ações, ETF e fundos (28% ou englobamento), criptoativos (isenção aos 365 dias), venda de imóveis (50% do ganho, com reinvestimento em habitação) e rendimentos do estrangeiro (crédito por dupla tributação).",
      "Apuramento global que junta todas as categorias: englobamento às taxas progressivas, tributação autónoma e crédito de imposto internacional, com memória de cálculo a explicar cada valor e a sua base legal.",
      "Motor de validação (erros, avisos e oportunidades) e indicador de completude para saíres com a certeza de que não te esqueceste de nada.",
    ],
  },
  {
    version: "1.60.0",
    data: "2026-06-22",
    titulo: "Dashboard alinhado com o simulador",
    itens: [
      "Os valores exibidos no painel (IRS, Seg. Social, líquido) passam a corresponder exatamente ao que o simulador calculou — usando o IRS real estimado da simulação anual em vez da retenção na fonte.",
      "Recibos guardados no painel carregam agora os resultados pré-calculados do simulador, eliminando recálculos e garantindo consistência entre a calculadora e o dashboard.",
      "Corrigida a perda destes valores nas contas na nuvem (Pro): eram descartados ao recarregar da base de dados e o painel voltava a mostrar a retenção na fonte. Passam a ser preservados de forma fiável.",
      "Sincronização na nuvem (Pro) dos valores do simulador entre dispositivos, com degradação segura enquanto a base de dados não tiver a nova coluna.",
      "Rótulo «Retenção IRS» substituído por «IRS estimado» no painel e na página de recibos, para refletir que o valor corresponde ao IRS real (não à retenção na fonte).",
    ],
  },
  {
    version: "1.59.0",
    data: "2026-06-22",
    titulo: "Hero com animação em loop contínuo e indicador de fase",
    itens: [
      "Animação do cartão hero agora corre em loop contínuo: após o resultado aparecer, fica estático 4 segundos e reinicia suavemente com fade-out e fade-in — repete-se indefinidamente enquanto a página está aberta.",
      "Novo indicador de fase abaixo do cartão — três passos (Insere o valor → Calcula → Resultado) com pontos e linhas que progridem e iluminam a verde conforme a animação avança. Dá contexto visual ao que está a acontecer.",
      "Indicador «Demo ao vivo» acima do cartão com ponto verde pulsante, enquadrando a simulação como demonstração em tempo real.",
      "Fase de cálculo melhorada: barra de progresso verde varre a base do campo de input em vez de simples pulsação, transmitindo processamento real.",
      "Superfície do cartão agora reage à fase da animação: sombra e borda mudam subtilmente entre idle (card), focado (lift) e resultado (float + borda verde).",
      "Layout reestruturado: grelha ajustada para dar mais espaço ao painel de simulação (1fr / 1.1fr), alinhamento ao topo para composição mais limpa.",
    ],
  },
  {
    version: "1.58.0",
    data: "2026-06-22",
    titulo: "Animação do hero profissional e correção da página de investidores",
    itens: [
      "Animação do cartão hero da homepage completamente reescrita: sequência profissional de 6 fases — foco no campo de input com brilho verde, digitação com ritmo humano e correção deliberada de erro, pausa de cálculo com shimmer, e resultado com contagem animada suave. Cada perfil tem a sua sequência única de digitação.",
      "Linhas de detalhe no cartão hero agora cascateiam com animação individual (slide + fade), e a barra de proporções, badge de percentagem, caixa de info/alerta e nota de rodapé entram sequencialmente.",
      "Página de investidores já não salta automaticamente para o formulário ao carregar — removido autoFocus do campo de nome que forçava o scroll.",
    ],
  },
  {
    version: "1.57.0",
    data: "2026-06-22",
    titulo: "Hero da homepage animado e correções visuais nos investidores",
    itens: [
      "Cartão-resposta do hero da homepage agora tem animação de digitação: os números aparecem como se alguém estivesse a escrever, com cursor a piscar. Ao terminar, os resultados surgem com contagem animada e as barras de detalhe expandem suavemente. A animação reinicia ao trocar de perfil (independente, dependente, empresa, comparar).",
      "Cartões dos demos de investidores (/investidores) agora têm altura mínima fixa (540px mobile, 560px desktop) — a animação já não faz a página saltar ao alternar fases.",
      "Texto nos cartões verdes (hero do investidores e visão 'Agora') agora usa branco com opacidade elevada em vez de green-100 — contraste muito mais legível.",
    ],
  },
  {
    version: "1.56.1",
    data: "2026-06-22",
    titulo: "Hero do investidores com CTA para o produto",
    itens: [
      "Botão principal do hero agora leva à secção 'O produto em ação' para que o visitante veja o pitch antes de submeter uma proposta.",
      "Botão secundário 'Submeter proposta' adicionado ao hero para acesso direto ao formulário.",
    ],
  },
  {
    version: "1.56.0",
    data: "2026-06-22",
    titulo: "Formulário de propostas para investidores e painel de administração",
    itens: [
      "Novo formulário de proposta de investimento na página /investidores: com separadores (Identificação, Detalhes, Mensagem), barra de progresso e campos opcionais expansíveis — pode ser preenchido rapidamente ou com detalhe completo.",
      "As propostas são guardadas na base de dados Supabase com RLS: qualquer visitante pode submeter, apenas administradores podem consultar e gerir.",
      "Novo painel de administração em /admin/propostas: listagem com filtros por estado (pendente, em análise, contactado, aprovado, rejeitado), detalhes expansíveis, notas internas e ações rápidas de estado.",
      "Contagem de propostas adicionada ao painel principal de administração.",
      "Animação 3D de tilt ao hover removida de todos os cartões — substituída por elevação suave (translate Y) mais acessível e com melhor desempenho.",
      "CTA do hero e secção final substituídos de mailto por âncora para o formulário de proposta integrado na página.",
    ],
  },
  {
    version: "1.55.0",
    data: "2026-06-22",
    titulo: "Demos de investidores com digitação realista e gráfico donut",
    itens: [
      "Animação de digitação realista nos simuladores: cursor vertical a piscar, dígitos aparecem um a um como se alguém estivesse a escrever, com erros de digitação e correções ocasionais — cada demo tem o seu ritmo.",
      "Gráfico donut animado em SVG mostra a distribuição líquido/IRS/SS em cada simulador, com segmentos que crescem e percentagem central em destaque.",
      "Barras de progresso por componente acompanham os resultados, com contagem animada dos valores.",
      "Cartões de demo redesenhados: barra de gradiente no topo, ícone com fundo degradê, focus ring no campo de input e sombras refinadas.",
      "Ciclo de animação alargado para 14 segundos com ~9 s de espera antes de reiniciar.",
      "Dados no hero animados: TAM/SAM/SOM e '1,3 milhões' contam de zero ao alvo ao entrar em ecrã; barra de penetração anima ao scroll.",
      "Botão 'Ver a visão' removido do hero.",
    ],
  },
  {
    version: "1.54.0",
    data: "2026-06-22",
    titulo: "Fonte fiscal única — todos os simuladores alinhados",
    itens: [
      "Todos os valores fiscais (taxas, coeficientes, limiares, deduções) passam a derivar exclusivamente do motor fiscal central, eliminando duplicações e risco de desalinhamento.",
      "Novos parâmetros com base legal verificada: IMI, IMT, Imposto do Selo, englobamento de dividendos e Salário Mínimo Nacional 2026.",
      "Dispensa de retenção na fonte no modo guiado agora é derivada automaticamente quando a faturação anual é inferior a 15 000 €.",
      "Simuladores de empresa (completo e guiado), guias IRS Jovem e regime simplificado atualizados para a mesma fonte de verdade.",
    ],
  },
  {
    version: "1.53.0",
    data: "2026-06-22",
    titulo: "Página de investidores redesenhada com demos animados",
    itens: [
      "Página /investidores completamente redesenhada: design alinhado com a linguagem visual do ReciboCerto (cream, brand green, organic glows, rounded-4xl), animações 3D com tilt interativo nos cartões, e secções de produto, problema, visão, modelo de negócio e vantagens competitivas.",
      "Novos mini-simuladores animados em loop na secção «O produto em ação»: recibos verdes, vencimento e empresa preenchem-se automaticamente com contagem animada e resultados em cascata — mostrando a plataforma a funcionar em tempo real.",
    ],
  },
  {
    version: "1.52.0",
    data: "2026-06-22",
    titulo: "Recibos no painel — guardar da calculadora e visualização completa",
    itens: [
      "Guardar recibos no painel diretamente a partir do modo guiado ou do simulador completo, com nome do cliente associado.",
      "Funcionalidade Pro: utilizadores com conta gratuita podem experimentar com 1 recibo de amostra.",
      "Página de recibos redesenhada: gráfico de receita anual, donut de distribuição (líquido, retenção, SS), resumo de impostos acumulados.",
      "Nova vista de tabela detalhada com bruto, IVA, retenção, Seg. Social e líquido por recibo, com totais.",
      "Distribuição de faturação por cliente com barra de progresso visual.",
      "Agrupamento mensal colapsável com mini-resumo de impostos por mês.",
    ],
  },
  {
    version: "1.51.0",
    data: "2026-06-21",
    titulo: "Página de investidores",
    itens: [
      "Nova página /investidores: apresentação institucional para potenciais investidores com tese de negócio, solução, mercado, modelo de receita, métricas SaaS, Go-to-Market e conformidade regulatória.",
    ],
  },
  {
    version: "1.50.0",
    data: "2026-06-21",
    titulo: "Auditoria do dashboard — bugs fiscais, dark mode e acessibilidade",
    itens: [
      "Corrigido bug na tributação autónoma de empresa: agravamento por prejuízo agora calcula a sobretaxa correta em vez de zero.",
      "Isenção de Segurança Social do 1.º ano agora reconhece tanto a flag de primeiro ano como a acumulação com emprego.",
      "Guardião de Segurança Social: prazo do Q1 corrigido para 20 de julho (antes mostrava outubro, igual ao Q2).",
      "Dark mode completo em mais de 20 componentes do dashboard: recibos, receitas, calendário, gráficos, donut, onboarding e primitivos UI.",
      "Acessibilidade: role progressbar no IVA, scope col e caption na tabela de recibos, confirmação ao apagar recibo.",
      "Tipografia do saldo responsiva e secções críticas protegidas com ErrorBoundary.",
    ],
  },
  {
    version: "1.49.0",
    data: "2026-06-21",
    titulo: "Página de investidores e limpeza de preços",
    itens: [
      "Nova página /investidores: apresentação institucional para potenciais investidores com tese de negócio, solução, mercado, modelo de receita e conformidade.",
      "Secção verde «Plano Pro» removida da landing e da página de preços (redundante com os cards de planos).",
      "Texto do plano Quiz Master encurtado para melhor leitura no card.",
    ],
  },
  {
    version: "1.48.0",
    data: "2026-06-21",
    titulo: "Correções mobile e texto Quiz Master",
    itens: [
      "Foto de perfil agora visível no menu mobile do Nav para utilizadores Pro.",
      "Pesquisa global: input no topo em todas as plataformas, modal ajustado para telemóveis com safe-area e cantos arredondados.",
      "Botão «Terminar sessão» acessível no menu do dashboard mobile, com perfil e avatar visíveis.",
      "Plano Quiz Master: novo texto motivacional e dark mode completo no card.",
    ],
  },
  {
    version: "1.47.0",
    data: "2026-06-21",
    titulo: "Guias alargados a conta de outrem e empresas",
    itens: [
      "6 novos guias: recibo de vencimento, subsídios de férias e Natal, trabalho suplementar (conta de outrem), abrir empresa, IRC para PME e tributação autónoma (empresas).",
      "Página de guias reorganizada por categoria: independentes, conta de outrem, empresas e transversal.",
      "Sidebar de navegação com secções categorizadas e todos os novos guias acessíveis.",
      "Guias transversais (escalões IRS, deduções à coleta) alargados para refletir aplicação a todos os regimes.",
    ],
  },
  {
    version: "1.46.0",
    data: "2026-06-21",
    titulo: "Footer redesenhado",
    itens: [
      "Footer reestruturado com layout moderno: trust bar em grelha responsiva (2×2 mobile, 4 colunas desktop), navegação em 4 colunas com ferramentas (com ícones), aprender, empresa e contacto.",
      "Novo card de dados oficiais com link para fontes, aviso legal compacto e barra inferior simplificada.",
    ],
  },
  {
    version: "1.45.0",
    data: "2026-06-21",
    titulo: "Secções «Contabilista» e «Mapa de benefícios» redesenhadas",
    itens: [
      "Comparar Cenários: as secções «Precisas de um contabilista?» e «Onde instalar a atividade» foram reestruturadas — novo layout em cartão unificado com cabeçalho, escala de regime com indicador visual, honorários em cards em vez de tabela e dicas de contratação numeradas.",
      "Mapa de benefícios fiscais: região selecionada agora mostra benefícios em grelha de 2 colunas, lista de regiões com tratamento visual mais polido e secção de incentivos nacionais com ícones.",
    ],
  },
  {
    version: "1.44.0",
    data: "2026-06-21",
    titulo: "Auditoria Pro, gating e limpeza de pagamentos",
    itens: [
      "IfThenPay removido — MB WAY e Multibanco via IfThenPay descontinuados (Stripe Payment Elements mantido para MB WAY).",
      "Exportação CSV/PDF de recibos agora bloqueada para utilizadores gratuitos (ProGate).",
      "Saúde Fiscal no dashboard agora requer Pro (consistente com a página de perfil).",
      "ProHint já não aparece para utilizadores Pro — esconde-se automaticamente.",
      "Recibos na nuvem agora exclusivos do Pro (antes bastava estar autenticado).",
      "Cupões do Quiz Fiscal agora ativam o Pro efetivamente — criam subscrição ativa de 3 meses.",
      "Webhook Stripe com fallback por email quando metadata está em falta.",
      "Grace period: utilizadores com pagamento pendente (past_due) mantêm acesso Pro temporariamente.",
      "Preferências fiscais (regime, dependentes, deduções) sincronizadas na nuvem para Pro.",
      "SubscricaoProvider duplicado removido do dashboard layout (menos uma query Supabase por página).",
      "Check de Pro no quiz unificado — usa useSubscricao em vez de query direta à base de dados.",
    ],
  },
  {
    version: "1.43.0",
    data: "2026-06-21",
    titulo: "Dependentes com deficiência e ajustes ao comparador e calendário",
    itens: [
      "Recibo de Vencimento: novo contador «Dependentes com deficiência (≥ 60%)» — cada dependente com atestado multiúso confere dedução adicional de 2,5 × IAS à coleta (Art. 87.º CIRS), refletida no acerto anual de IRS.",
      "Slider do Comparador de Cenários volta a 200k€ de máximo visual, mas o campo de texto aceita valores superiores para cenários de rendimento mais alto.",
      "Calendário fiscal: corrigido badge «Agora» e texto «até dia 20» que ficavam cortados nos cards de mês.",
    ],
  },
  {
    version: "1.42.0",
    data: "2026-06-21",
    titulo: "Toggle «Valor inclui IVA» no simulador de empresa",
    itens: [
      "Novo toggle «Valor inclui IVA» nos modos Guiado e Completo do simulador de empresa — introduz a faturação com IVA incluído e a base tributável é extraída automaticamente.",
      "A taxa de IVA ajusta-se à região selecionada (Continente 23%, Madeira 22%, Açores 16%).",
      "Resultados e breakdown mostram a base sem IVA quando o toggle está ativo, com indicação clara do valor original com IVA.",
      "Alterações em ambos os modos são totalmente sincronizadas — qualquer mudança propaga-se ao cálculo em tempo real.",
    ],
  },
  {
    version: "1.41.0",
    data: "2026-06-21",
    titulo: "Comparador: oscilação entre regimes explicada",
    itens: [
      "Quando recibos verdes e salário alternam consoante o escalão de IRS, o comparador agora explica a faixa de oscilação em vez de indicar um ponto de viragem enganador.",
      "Badge «Mais líquido» já não fica cortado nos cartões de resultado.",
    ],
  },
  {
    version: "1.40.0",
    data: "2026-06-21",
    titulo: "Lógica de breakeven robusta e design refinado",
    itens: [
      "Comparador de Cenários: breakeven agora identifica o ponto a partir do qual um regime compensa de forma consistente, eliminando oscilações enganadoras entre escalões.",
      "Cartões de resultado com gradiente e anel visual no vencedor para distinção imediata.",
      "Veredicto redesenhado com ícone, bordas e gradiente para maior destaque.",
      "Secções de gráfico e calendário com ícones em caixas para coerência visual.",
    ],
  },
  {
    version: "1.39.0",
    data: "2026-06-21",
    titulo: "Simulador completo de empresa redesenhado",
    itens: [
      "Seletor Guiado/Completo redesenhado com cards visuais — ícone, título, descrição e badge 'Ativo' para cada modo.",
      "Modo completo de empresa agora inclui: tipo de sede (física/virtual/coworking), perfil do fundador (residente/UE/extra-UE), IFICI (20% flat) e card de localização com IRC, derrama e RFAI da região.",
      "Custos de sede virtual/coworking e representante fiscal integrados no cálculo real do IRC — não apenas visuais, afetam o lucro tributável.",
      "IFICI (Art. 58.º-A EBF) reduz o IRS sobre dividendos de 28% para 20%, com efeito no líquido disponível total.",
      "Modo completo de empresa é agora independente — inputs de recibos verdes ficam escondidos, com slider de faturação e parâmetros próprios.",
    ],
  },
  {
    version: "1.38.0",
    data: "2026-06-21",
    titulo: "Comparador redesenhado e CTA Pro",
    itens: [
      "Slider do Comparador de Cenários redesenhado com bolha flutuante, thumb com grip e dica animada «Arraste para ajustar».",
      "Marcadores de breakeven visíveis no trilho do slider para recibos verdes e empresa.",
      "Cartões de resultado com barras de progresso animadas e badge «Mais líquido» destacado.",
      "Secção de email substituída por CTA de subscrição Pro com lista de benefícios, botão direto para upgrade e link para planos.",
    ],
  },
  {
    version: "1.37.0",
    data: "2026-06-21",
    titulo: "Calendário fiscal corrigido",
    itens: [
      "Corrigido overflow visual nos badges de SS e IVA nos cards dos meses — valores já não saem para fora dos limites.",
      "Meses de IVA trimestral corrigidos de Jan/Abr/Jul/Out para Fev/Mai/Ago/Nov (dia 20, conforme obrigação fiscal real).",
      "Prazo do acerto de IRS em junho agora mostra «até 31 ago» em vez do genérico «até dia 20».",
    ],
  },
  {
    version: "1.36.0",
    data: "2026-06-21",
    titulo: "Header do desktop reestruturado",
    itens: [
      "Header agora fica fixo no topo da página — já não desaparece ao fazer scroll.",
      "Novo mega-dropdown «Recursos Fiscais» com colunas separadas para Ferramentas e Aprender.",
      "Botão de avatar e Dashboard combinados num só elemento quando autenticado.",
      "Efeito de backdrop blur sempre presente no header para melhor legibilidade.",
    ],
  },
  {
    version: "1.35.0",
    data: "2026-06-21",
    titulo: "Referências legais, sede virtual e perfil de estrangeiro no simulador",
    itens: [
      "Referências legais clicáveis em todos os passos do simulador de empresa — cada taxa e benefício mostra o artigo de lei com link direto para o Portal das Finanças ou Diário da República.",
      "Novo seletor de tipo de sede: física, sede virtual (50–150€/mês) ou coworking (50–300€/mês) — com custo anual incluído na simulação e nota sobre obrigatoriedade de sede fiscal (Art. 12.º CSC).",
      "Perfil do fundador: residente, cidadão UE/EEE ou extra-UE. Representante fiscal obrigatório para extra-UE (Art. 19.º LGT) com custo estimado.",
      "IFICI (Art. 58.º-A EBF) — toggle para estrangeiros elegíveis: taxa flat de 20% sobre dividendos durante 10 anos, com cálculo de poupança face à liberatória de 28%.",
      "Resultado e checklist adaptam-se ao perfil: custos de sede virtual e representante fiscal na cascata, passos para obter NIF e estatuto IFICI.",
    ],
  },
  {
    version: "1.34.0",
    data: "2026-06-21",
    titulo: "Sistema de energia corrigido e energia ilimitada",
    itens: [
      "Energia agora descontada ao iniciar o quiz (antes só descontava ao finalizar).",
      "Energia ilimitada desbloqueada automaticamente ao atingir o nível 7 (Especialista IRS, 5500 XP) ou com o plano Pro.",
      "Removido o benefício «Energia ilimitada» do plano Quiz Master (já incluído no Pro e desbloqueável por nível).",
      "Painel de configuração do quiz reorganizado: mais compacto, energia e botão unificados, menos espaçamento vertical.",
      "Tabela de níveis agora indica que o nível 7 desbloqueia energia ilimitada.",
    ],
  },
  {
    version: "1.33.0",
    data: "2026-06-21",
    titulo: "Pesquisa de atividades corrigida e ampliada",
    itens: [
      "Clicar numa atividade na pesquisa (Cmd+K) agora redireciona diretamente para o classificador com a atividade já selecionada — sem ter de pesquisar novamente.",
      "Todas as atividades do catálogo são agora mostradas na pesquisa (antes limitado a 24/30).",
    ],
  },
  {
    version: "1.32.0",
    data: "2026-06-21",
    titulo: "Modo guiado da empresa com paridade total ao simulador completo",
    itens: [
      "Tributação Autónoma completa: 8 tipos de viatura (combustão e PHEV com faixas de preço), ajudas de custo (5%), despesas não documentadas (50%) e exceção ao agravamento por prejuízo (OE2026).",
      "DLRR (10% lucros reinvestidos, máx 5M, 25% coleta), SIFIDE II (32,5%–82,5% despesas I&D com 4 perfis de empresa) e RFAI Contratual (investimento >= 3M, IAPMEI/AICEP) agora disponíveis no modo guiado.",
      "Imóvel da empresa: IMI (VPT × taxa municipal 0,3–0,45%), IMT + IS na aquisição (7,3%), isenções RFAI e amortização configurável.",
      "Custos de estrutura e constituição agora ajustáveis (slider + amortização 1/2/3/5 anos), em vez de valores fixos.",
      "RFAI com toggle «primeiros 3 períodos» (100% coleta) e cálculo excedente (30% até 15M + 10% acima).",
      "Resultado detalhado: breakdown por categoria de TA, benefícios com bruto vs efetivo, dica automática de englobamento com taxa marginal, custos municipais.",
    ],
  },
  {
    version: "1.31.0",
    data: "2026-06-21",
    titulo: "Localização precisa no simulador de empresa",
    itens: [
      "O simulador agora permite pesquisar a cidade ou concelho exato onde a empresa será instalada — os parâmetros fiscais (IRC, derrama, RFAI, custo de contabilista) ajustam-se automaticamente.",
      "Pesquisa por nome (Nominatim/OSM), localização GPS, ou escolha manual por região — a localização escolhida influencia toda a simulação.",
      "Ambos os fluxos (já tem empresa / quer abrir) pedem agora a localização, com dados fiscais regionais detalhados (interior 12,5%, ilhas, litoral).",
      "Novo passo «A seguir» enriquecido: métricas, plano de ação, checklist de constituição, calendário fiscal e mapa de benefícios por região.",
      "Dados regionais ampliados: DLRR (10% lucros reinvestidos) e SIFIDE II (32,5%+50% I&D) adicionados ao mapa de benefícios fiscais.",
    ],
  },
  {
    version: "1.30.0",
    data: "2026-06-21",
    titulo: "Avatar nos headers e pesquisa global redesenhada",
    itens: [
      "A foto de perfil aparece agora no botão de perfil da navbar e do dashboard mobile — quando o utilizador tem avatar no Supabase.",
      "Pesquisa global (Cmd+K) redesenhada: categorias com ícones em card, secção «Mais utilizadas» com acesso rápido, grelha de simuladores, e «Sugestões para si».",
      "Modal de pesquisa mais largo e filtros contextuais — só aparecem ao pesquisar, sem poluir a vista inicial.",
    ],
  },
  {
    version: "1.29.1",
    data: "2026-06-21",
    titulo: "Correções do perfil e upload de avatar",
    itens: [
      "Corrigido texto «Carregar foto» que aparecia cortado no perfil — removido overflow que escondia o menu do avatar.",
      "Upload de avatar corrigido: revertido para update (compatível com as políticas RLS da tabela profiles).",
      "Adicionada coluna «nome» em falta na tabela profiles no Supabase — resolvia o erro ao guardar ou carregar o perfil.",
    ],
  },
  {
    version: "1.29.0",
    data: "2026-06-21",
    titulo: "Segurança reforçada, perfil persistente e SEO abrangente",
    itens: [
      "Alterar password agora exige a password atual — re-autenticação via Supabase antes de permitir a alteração.",
      "Requisitos de password reforçados: mínimo 8 caracteres, 1 maiúscula e 1 número, com indicadores visuais em tempo real (aplica-se ao registo e à alteração).",
      "Foto de perfil agora persiste corretamente na nuvem via Supabase Storage — corrigido problema que fazia o avatar desaparecer ao atualizar a página.",
      "Drag-and-drop para upload de foto de perfil (utilizadores Pro).",
      "Correções visuais no perfil: avatar centrado no mobile, stat cards em grid, menu dropdown reposicionado.",
      "SEO renovado: título, descrição, Open Graph e structured data agora refletem toda a plataforma — calculadora de recibos verdes, salário líquido, simulador de empresa, guias e ferramentas.",
      "Sitemap atualizado com as ferramentas «Simulador de Empresa» e «Mapa de Contabilistas».",
    ],
  },
  {
    version: "1.28.0",
    data: "2026-06-21",
    titulo: "Dashboard inteligente — cálculos reais, estimativa IRS e perfil fiscal",
    itens: [
      "Novo card «Estimativa IRS Anual» no dashboard: projeta o reembolso ou acerto a pagar com escalões progressivos, coeficiente do regime simplificado, regra dos 15% e deduções à coleta.",
      "Cálculos do dashboard agora usam a atividade real de cada recibo: retenção e base de SS derivam do catálogo de atividades (Art. 151.º, vendas, serviços, etc.) em vez de valores fixos.",
      "Guardião de Retenção na Fonte agora deteta e exibe a taxa correta por atividade e sinaliza taxas mistas quando tens recibos de vários tipos.",
      "Guardião de Segurança Social agora calcula com a base correta (70% serviços ou 20% bens) e respeita isenção do 1.º ano e acumulação com emprego.",
      "Botão de perfil agora aparece sempre no header desktop, mesmo sem sessão iniciada.",
      "Página «Conta e segurança» agora permite alterar a password, ligado ao Supabase Auth, com validação e feedback em português.",
      "Novo store de preferências fiscais: ano de atividade, regime, dependentes e deduções são usados nos cálculos do dashboard.",
    ],
  },
  {
    version: "1.27.0",
    data: "2026-06-21",
    titulo: "Simulador de empresa refinado — inputs ricos e próximos passos",
    itens: [
      "Inputs do simulador guiado da empresa agora incluem botões +/−, campo editável e slider com thumb animado — mais fáceis de usar no telemóvel.",
      "Novo 6.º passo «A seguir» no wizard: link direto para Comparar Cenários (com mapa e contabilista) e para o simulador completo.",
      "Removida a comparação duplicada RV vs Empresa do resultado — usa agora a página dedicada «Comparar Cenários», que é mais completa.",
    ],
  },
  {
    version: "1.26.0",
    data: "2026-06-21",
    titulo: "Simulador de empresa (Lda) — modo guiado completo",
    itens: [
      "Novo modo guiado para empresa: passo a passo para simular e abrir uma sociedade (Unipessoal ou por Quotas), com página dedicada em /ferramentas/simulador-empresa.",
      "Cálculo com IRC PME 2026 (15% até 50.000€ + 19%), derrama municipal, dividendos (28% liberatória ou englobamento 50%) e Segurança Social do gerente.",
      "Otimização fiscal: Tributação Autónoma de viaturas (elétrica/PHEV/combustão) e despesas de representação, com agravamento para empresas em prejuízo.",
      "RFAI: benefício ao investimento por região (interior 30%, litoral 10%), deduzido à coleta de IRC com limite de 50%.",
      "Mapa comparativo Recibos Verdes vs Empresa — cards com preços, veredicto e ponto de viragem, com slider interativo de faturação.",
      "Calendário de obrigações fiscais da empresa e guia passo a passo de constituição (Empresa na Hora, capital, contabilidade).",
      "Calendário Fiscal do Ano redesenhado com grelha responsiva, progresso do ano e resumo por trimestre.",
    ],
  },
  {
    version: "1.25.0",
    data: "2026-06-21",
    titulo: "Página de perfil completa com foto, cupões e dados pessoais",
    itens: [
      "Nova página «O meu perfil» com saudação personalizada, estatísticas do Quiz Fiscal, conquistas e histórico de sessões.",
      "Podes agora editar o teu nome, telefone e NIF diretamente no perfil — tudo fica guardado na tua conta na nuvem.",
      "Secção «Meus Cupões» onde podes ver e ativar os cupões Pro ganhos nos desafios do Quiz Fiscal.",
      "Foto de perfil personalizável (exclusivo Pro): carrega uma foto em JPG, PNG ou WebP e ela aparece no teu avatar.",
      "A saúde fiscal detalhada e as estatísticas avançadas do quiz passaram a ser exclusivas do plano Pro, com pré-visualização desfocada para contas grátis.",
      "O botão «Perfil» substituiu o «Comparar cenários» na barra inferior do telemóvel para acesso rápido ao teu perfil.",
    ],
  },
  {
    version: "1.24.0",
    data: "2026-06-20",
    titulo: "Plano Quiz Master, tabela de níveis, desafio Pro e melhorias no Quiz",
    itens: [
      "Novo plano Quiz Master a 1,99 €/mês — exclusivo para quem atinge o nível máximo (Guru do IRS, 20.000 XP). Inclui tudo do Pro mais energia ilimitada, badge exclusivo e estatísticas avançadas.",
      "A página do Quiz Fiscal tem agora uma tabela completa com os 10 níveis e os XP necessários para cada um, além do teu progresso atual.",
      "Desafio Pro: completa 5 quizzes perfeitos seguidos no Médio (10 perguntas) ou 3 no Difícil para ganhar um cupão de 3 meses de Pro grátis. O cupão é gerado automaticamente.",
      "O botão «Reportar erro» ficou bem mais visível — já não desaparece no fundo da pergunta.",
      "Removemos o menu lateral do quiz que não estava a ser usado.",
      "Corrigimos o botão «Comparar cenários» do rodapé mobile que não abria o comparador corretamente.",
      "A barra de navegação inferior agora aparece na página do Quiz Fiscal (seleção e resultado).",
    ],
  },
  {
    version: "1.23.1",
    data: "2026-06-20",
    titulo: "Reportar erros nas perguntas (com XP) e dificuldades equilibradas",
    itens: [
      "Em cada pergunta podes agora reportar um erro com um toque. Se descreveres o que está mal, ganhas 15 XP por nos ajudares a melhorar o quiz.",
      "Os reportes chegam diretamente a uma nova área de administração (Reportes do quiz), onde podem ser acompanhados (novo, em análise, resolvido) e tratados.",
      "Corrigimos a distribuição de dificuldades: já não acontece um tema com 100 perguntas ter só 6 fáceis — cada tema tem agora uma boa quantidade de perguntas Fáceis, Médias e Difíceis.",
      "Quando escolhes 10 perguntas, recebes mesmo 10: se um nível de dificuldade tiver poucas, a sessão é completada com outras do mesmo tema, em vez de encurtar.",
      "O progresso do quiz (XP, nível, energia e histórico) está ligado à tua conta na nuvem quando inicias sessão, e continua a funcionar offline sem conta.",
    ],
  },
  {
    version: "1.23.0",
    data: "2026-06-20",
    titulo: "Calculadora de recibos verdes: líquido real e tipo de atividade em destaque",
    itens: [
      "O resultado passou a mostrar o teu líquido REAL (com o IRS anual apurado) em vez do valor após a retenção de 23% — a retenção é só um adiantamento, quase todo devolvido no acerto anual. Fica alinhado com o simulador guiado, mais refinado.",
      "O tipo de atividade subiu para o topo, por influenciar tudo: coeficiente, retenção, IVA e base de Segurança Social.",
      "Podes lançar a faturação como um valor total ou recibo a recibo (com IVA por linha), e avisamos quando faz mais sentido um ato isolado.",
    ],
  },
  {
    version: "1.22.1",
    data: "2026-06-20",
    titulo: "Quiz: novos temas de Trabalho Dependente e Empresas (centenas de perguntas)",
    itens: [
      "O Quiz Fiscal deixou de ser só para recibos verdes: ganhou um tema de Trabalho Dependente (Categoria A) com cerca de 100 perguntas por área — IRS no salário, Segurança Social (TSU) e subsídios e abonos (refeição, férias/Natal, ajudas de custo e trabalho suplementar).",
      "Novo tema de Empresas, também com cerca de 100 perguntas por área: criar empresa (constituição, capital social, formas jurídicas), legislação e sociedades, e IRC e tributação (IRC, derrama, dividendos e benefícios fiscais).",
      "Todos os valores e cálculos vêm das fontes oficiais já usadas na app (tabelas de retenção 2026, taxas de IRC, limites de subsídios), com a base legal indicada em cada pergunta.",
      "O ecrã de escolha do quiz foi redesenhado: as categorias passaram a estar agrupadas por tema (Independente · Dependente · Empresas), com contagem de perguntas, para encontrares mais depressa o que queres treinar.",
    ],
  },
  {
    version: "1.22.0",
    data: "2026-06-20",
    titulo: "Calculadora de recibos verdes: IVA correto, com/sem IVA e layout mais limpo",
    itens: [
      "O IVA passou a seguir a regra real da isenção: abaixo de 15 000 €/ano de faturação ficas isento (sem IVA); acima, o simulador passa a cobrar IVA automaticamente — deixou de ser possível aparecer «isento» e a cobrar IVA ao mesmo tempo.",
      "Podes indicar se o valor que escreves já inclui IVA ou se o IVA acresce, e vês logo o desdobramento «a tua faturação / IVA / total pago pelo cliente». A situação de IVA (com os limites de 15 000 € e 18 750 €) está sempre à vista.",
      "Corrigimos o coeficiente da propriedade intelectual e direitos de autor para 0,95.",
      "A calculadora ficou menos comprida: agrupámos os campos e recolhemos as opções avançadas, para chegares ao resultado com menos scroll.",
    ],
  },
  {
    version: "1.21.1",
    data: "2026-06-20",
    titulo: "Quiz: dificuldade funcional, hexágono e botões de configuração",
    itens: [
      "Fácil, Médio e Difícil deixaram de ser só estética: agora cada nível traz apenas perguntas desse grau de dificuldade (o banco tem mais de 1000 perguntas já classificadas). A escolha é partilhada entre o ecrã inicial e as configurações dentro do quiz.",
      "No telemóvel, o hexágono do nível passou a usar o mesmo verde do computador e ganhou cantos mais suaves.",
      "Corrigimos os botões de ligar/desligar (Sons, Animações, Vibração…) nas configurações do quiz, cujo puxador aparecia fora do sítio.",
    ],
  },
  {
    version: "1.20.3",
    data: "2026-06-20",
    titulo: "Cabeçalho do quiz no telemóvel: mais arrumado e com histórico",
    itens: [
      "Deixou de haver duas barras de estatísticas no quiz: fica só uma (a que gostavas), com o mesmo desenho da barra do computador.",
      "O cabeçalho do quiz ficou organizado: logótipo maior à esquerda (vai para a página inicial), o teu nível ao lado, depois o histórico e as configurações — botões maiores e mais fáceis de tocar. Removemos o menu que não tinha função.",
      "O histórico passou a ter botão próprio (no telemóvel) e, no computador, aparece por baixo da Energia. Nas configurações, o «Sair do quiz» passou para o topo.",
    ],
  },
  {
    version: "1.20.2",
    data: "2026-06-19",
    titulo: "Quiz Fiscal: cabeçalho em baixo no telemóvel, com nível, perfil e histórico",
    itens: [
      "No telemóvel, o cabeçalho do quiz passou para baixo (zona do polegar), com as estatísticas (acertos, tempo, pontos, erros) por cima. À esquerda: configurações e o logótipo (que leva à página inicial). Ao centro: o teu nível. À direita: o menu.",
      "Toca no nível para abrir um painel com o teu progresso (XP, melhor streak, energia), todos os níveis e o teu perfil. O menu inclui o histórico de sessões com a percentagem de acertos, pontos e XP de cada quiz.",
      "É uma só versão responsiva: as configurações em baixo abrem o mesmo painel completo do computador.",
    ],
  },
  {
    version: "1.19.2",
    data: "2026-06-19",
    titulo: "Pesquisa com filtros e quiz com a nova navegação",
    itens: [
      "A pesquisa ganhou filtros: dentro de cada categoria podes refinar (por exemplo, nos guias por IRS, IVA ou Segurança Social; nas atividades por tipo do Art. 151.º), limpar o filtro e ver o número de resultados em tempo real.",
      "A navegação inferior do Quiz Fiscal passou a usar o mesmo estilo limpo do resto do site (verde da marca, cantos pouco arredondados), adaptada às funções do quiz — sem cabeçalhos repetidos.",
    ],
  },
  {
    version: "1.19.1",
    data: "2026-06-19",
    titulo: "Pesquisa e menu inferior mais práticos",
    itens: [
      "Na janela de pesquisa em telemóvel, a caixa de escrever passou para baixo (zona do polegar) e os resultados ficam por cima — escreves e vês sem esticar a mão.",
      "A barra de pesquisa do menu inferior ficou bem mais visível e destacada, e o logótipo passou a ser o único botão de início (deixou de haver dois).",
      "Dentro do Quiz Fiscal passa a existir só um cabeçalho, sem barras repetidas. Cantos menos arredondados e visual mais funcional em toda a navegação.",
    ],
  },
  {
    version: "1.19.0",
    data: "2026-06-19",
    titulo: "No telemóvel e tablet, o menu passou para baixo — com a pesquisa por cima",
    itens: [
      "Em ecrãs pequenos, o cabeçalho passou a viver no fundo (na zona do polegar) e a barra de pesquisa fica logo por cima, para navegares e procurares com uma só mão. No computador, o cabeçalho continua em cima.",
      "O logótipo leva sempre à página inicial, e o menu inferior dá acesso a tudo: simulador, comparar cenários, ferramentas, guias, quiz e planos.",
      "O cabeçalho e a pesquisa passaram a ser consistentes em todas as secções (incluindo os guias, as ferramentas e o quiz).",
    ],
  },
  {
    version: "1.18.1",
    data: "2026-06-19",
    titulo: "Pesquisa mais sólida e bonita",
    itens: [
      "Corrigimos a janela de pesquisa que aparecia translúcida (via-se a página por trás): passa a ser um cartão opaco e nítido, com fundo escurecido e desfocado, mais fácil de ler.",
      "A pesquisa passou a ter uma única janela partilhada por todo o site, pelo que o atalho ⌘K / Ctrl+K funciona em qualquer página sem abrir janelas repetidas.",
    ],
  },
  {
    version: "1.18.0",
    data: "2026-06-19",
    titulo: "Nova pesquisa global, densa e sensível ao contexto",
    itens: [
      "Tens agora uma pesquisa em todo o site, com três categorias: Ferramentas (simuladores), Guias e Atividades (catálogo do Art. 151.º). Abre pelo ícone de lupa ou com ⌘K / Ctrl+K.",
      "A pesquisa adapta-se ao sítio onde estás (nos guias começa nos guias, etc.), guarda as tuas pesquisas recentes e, no telemóvel, abre como folha inferior fácil de alcançar.",
    ],
  },
  {
    version: "1.17.1",
    data: "2026-06-19",
    titulo: "Simuladores e ferramentas agora dentro do painel",
    itens: [
      "Os simuladores (recibo de vencimento, abrir empresa, comparar cenários, regime simplificado, ato isolado) e as ferramentas (auditoria de recibo, classificar atividade, mapa de contabilistas) abrem agora dentro do próprio painel, sem te tirarem da tua área — no telemóvel e no computador.",
      "Na barra inferior do telemóvel, o atalho rápido passou a ser «Comparar» em vez de «IRS» (o Simulador de IRS continua no menu).",
    ],
  },
  {
    version: "1.17.0",
    data: "2026-06-19",
    titulo: "Painel reestruturado: tudo o que tens, também no telemóvel",
    itens: [
      "O menu do painel passou a incluir todo o site, organizado por secções: Gestão, Simuladores, Ferramentas e Aprender. Tens à mão os recibos verdes, o recibo de vencimento, abrir empresa, comparar cenários, o regime simplificado, a auditoria de recibo, o mapa de contabilistas, os guias e o quiz.",
      "No telemóvel deixas de estar limitado: um novo botão «Menu» abre o painel completo com todas as secções — exatamente os mesmos recursos do computador, sem ficar nada de fora.",
      "A página inicial do painel ganhou um «Explorar tudo o que tens», com atalhos para os simuladores, ferramentas e guias, para lá da gestão de recibos verdes.",
    ],
  },
  {
    version: "1.16.0",
    data: "2026-06-19",
    titulo: "Um único mapa por região e gráfico «para onde vai cada euro» em verde",
    itens: [
      "Os dois mapas do «Comparar Cenários» passaram a ser um só: para cada região vês, no mesmo sítio, os benefícios fiscais (IRC reduzido no interior, Madeira e Açores) e o custo médio de um contabilista.",
      "O gráfico «para onde vai cada euro» passou a usar variações de verde da marca — verde vivo para o que te fica e tons mais escuros para os impostos —, em vez da paleta anterior.",
    ],
  },
  {
    version: "1.15.2",
    data: "2026-06-19",
    titulo: "Resolvido o espaço em branco do «Comparar Cenários» no telemóvel",
    itens: [
      "A causa real era a animação de entrada: secções mais altas do que o ecrã (como o comparador) só apareciam depois de 15% ficarem visíveis — algo impossível num telemóvel —, ficando invisíveis. Agora revelam-se assim que entram no ecrã, em toda a app.",
    ],
  },
  {
    version: "1.15.1",
    data: "2026-06-19",
    titulo: "Correções no telemóvel: Comparar Cenários e o popup de Novidades",
    itens: [
      "No telemóvel, o modo «Comparar Cenários» podia ficar com um grande espaço em branco quando os mapas não carregavam. Agora as secções de mapa carregam isoladas e, se alguma falhar, o resto da página continua a funcionar — sem ecrãs em branco.",
      "O popup «Novidades & Atualizações» voltava a aparecer cortado no telemóvel (só com o título). Passou a abrir como folha inferior, com o conteúdo a fazer scroll corretamente e respeitando a área segura do ecrã.",
      "Reforçámos o princípio de desenho «mobile-first» em toda a app: tudo é pensado primeiro para o telemóvel.",
    ],
  },
  {
    version: "1.15.0",
    data: "2026-06-19",
    titulo: "Comparar Cenários muito mais completo: slider, contabilista e mapa de benefícios",
    itens: [
      "O slider de rendimento foi reconstruído: agora tem um puxador arrastável suave, com os pontos de viragem (quando os recibos verdes e a empresa começam a compensar) assinalados na própria barra, e funciona com teclado.",
      "O gráfico «para onde vai cada euro» ganhou cores coerentes com a marca e mais legíveis — verde para o que te fica, tons de terracota para os impostos e cinza para custos —, com a percentagem de líquido visível em cada coluna.",
      "Juntámos ao comparador todo o diagnóstico «Precisas de um contabilista?»: com base no teu rendimento, dizemos-te se — e quando — compensa contratar um Contabilista Certificado, com honorários estimados e o mapa de preços médios por região.",
      "Novo mapa «Onde vale a pena instalar a atividade»: mostra, por região, os benefícios fiscais reais — IRC de 12,5% nos concelhos do interior, IRC de 5% na Zona Franca da Madeira, redução de 30% nos Açores e RFAI de 30% fora de Lisboa e Algarve. Procura a tua zona ou toca numa região.",
    ],
  },
  {
    version: "1.14.0",
    data: "2026-06-19",
    titulo: "Dois novos modos na homepage: Abrir Empresa e Comparar Cenários",
    itens: [
      "O seletor da homepage ganhou um novo grupo «Gostaria de», com dois caminhos: «Abrir Empresa» e «Comparar Cenários». Ao escolheres, o destaque e a calculadora adaptam-se ao que procuras.",
      "«Abrir Empresa» abre um simulador dedicado à sociedade — IRC PME, derrama, tributação autónoma, dividendos e benefícios fiscais — com o líquido em destaque, sem se misturar com a calculadora de recibos verdes.",
      "«Comparar Cenários» reúne, num só lugar, a comparação dos três caminhos (por conta de outrem, recibos verdes e empresa) para o mesmo rendimento: arrasta o slider de rendimento, vê o ponto de viragem (quando cada caminho compensa) e o calendário fiscal de cada cenário.",
      "No comparador, os pontos de viragem passam a estar assinalados no próprio slider e juntámos um gráfico de colunas «para onde vai cada euro», que decompõe o ilíquido em líquido, IRS/dividendos, Segurança Social/IRC e despesas, com a tabela detalhada de cada cenário por baixo.",
      "Acrescentámos uma secção de dúvidas separada por cenário (por conta de outrem, recibos verdes e empresa), com as perguntas que decidem o caminho.",
      "A calculadora de recibos verdes fica agora focada no essencial: o comparador integrado passou para o novo modo «Comparar Cenários».",
    ],
  },
  {
    version: "1.13.2",
    data: "2026-06-19",
    titulo: "Correção no IRS Jovem do recibo de vencimento",
    itens: [
      "Corrigimos o cálculo do IRS Jovem na retenção mensal: a isenção passa a incidir sobre o valor da retenção (ex.: 25% de isenção → ficas a pagar 75% da retenção normal), tal como o teu recibo faz. Antes, uma isenção parcial podia zerar indevidamente o IRS estimado e mostrar uma divergência falsa na auditoria.",
    ],
  },
  {
    version: "1.13.1",
    data: "2026-06-19",
    titulo: "Reforço de segurança nos bastidores",
    itens: [
      "Endurecemos as funções internas da base de dados e deixámos de expor funções de gatilho como chamadas públicas — uma camada extra de proteção das tuas contas e dos teus dados. Não muda nada no que vês ou fazes na app.",
    ],
  },
  {
    version: "1.13.0",
    data: "2026-06-19",
    titulo: "Simulador de vencimento reorganizado, com importação de PDF em destaque",
    itens: [
      "Preencher a partir do recibo deixou de estar escondido: passa a ser a entrada principal do simulador, com uma área de arrastar-e-largar bem visível e a explicação clara de que preenchemos o simulador e a auditoria por ti — sempre lido no teu dispositivo, sem enviar o ficheiro.",
      "Depois de confirmares os dados do PDF, basta «Aplicar ao simulador»: a confirmação recolhe-se e os teus valores ficam logo refletidos abaixo, no simulador e na auditoria.",
      "A função «Auditar o meu recibo» foi redesenhada: um veredicto claro, a comparação lado a lado do que o teu recibo tem face ao esperado em 2026 (com a diferença destacada) e os indicadores de base de incidência, custo para a entidade, taxa efetiva e líquido — muito mais fácil de ler.",
      "Acabamentos premium em toda a ferramenta: cartões, métricas e o regime IRS Jovem ficaram mais coerentes e legíveis, em modo claro e escuro.",
    ],
  },
  {
    version: "1.12.0",
    data: "2026-06-18",
    titulo: "IRS Jovem no recibo de vencimento e auditoria mais completa",
    itens: [
      "O simulador de vencimento passa a aplicar o IRS Jovem (Art. 12.º-B CIRS): ativa o regime e escolhe o ano de benefício (1.º a 10.º) para veres a isenção refletida na retenção mensal, no líquido, na visão anual e no acerto de IRS — com o teto de 55 × IAS e a poupança face a não teres o regime.",
      "Arrasta o recibo em PDF diretamente para o simulador (drag & drop), além do botão de sempre. Continua a ser lido no teu dispositivo, sem enviar o ficheiro. Depois de aplicares, a confirmação dos dados recolhe-se — os valores ficam logo abaixo no simulador.",
      "A função «Auditar o meu recibo» ficou mais robusta: além do IRS e da Segurança Social esperados, mostra agora a base de incidência, o custo para a entidade (TSU 23,75%), a taxa efetiva, o líquido esperado e a verificação do IRS Jovem — tudo conforme as tabelas oficiais de 2026.",
    ],
  },
  {
    version: "1.11.0",
    data: "2026-06-18",
    titulo: "Leitura de recibos em PDF com motor determinístico (layout-aware)",
    itens: [
      "Novo motor de leitura que reconstrói a tabela do recibo pela geometria (coordenadas de cada valor) e corrige automaticamente páginas rodadas — em vez de ler o texto «em linha». Recibos de duas colunas (abonos | descontos) deixam de baralhar valores.",
      "Validação em malha fechada: antes de preencher o simulador, o sistema confirma que os abonos somam o total ilíquido, os descontos somam o total de descontos e o líquido fecha (tolerância de 0,02 €). Só dados que «fecham as contas» são considerados fiáveis; o resto fica para confirmares à mão — nunca preenche com valores errados.",
      "Tudo continua a ser lido no teu dispositivo, sem IA e sem enviar o ficheiro para lado nenhum.",
    ],
  },
  {
    version: "1.10.4",
    data: "2026-06-18",
    titulo: "Leitura de recibo em PDF muito mais fiável",
    itens: [
      "A leitura do PDF passa a reconstruir a tabela do recibo pela posição de cada valor (coordenadas), em vez de adivinhar pela ordem do texto. Em recibos de duas colunas (abonos | descontos) deixa de trocar valores — por exemplo, o subsídio de refeição já não apanha a Segurança Social da coluna ao lado.",
      "Acrescentámos validações: um valor extraído só é aceite se fizer sentido (ex.: valor/dia × nº de dias tem de bater com o total; o prémio tem de caber na remuneração sujeita). Em caso de dúvida, o campo fica para confirmares à mão, em vez de mostrar um número errado.",
    ],
  },
  {
    version: "1.10.3",
    data: "2026-06-18",
    titulo: "Mapa de contabilistas mais legível e Passo 5 mais fiel",
    itens: [
      "Os valores no mapa voltam a ler-se bem (etiquetas de preço centradas em cada região) e as regiões de Portugal passam a estar desenhadas, em tom pastel suave, com as fronteiras oficiais NUTS II.",
      "Botões do mapa com animação mais cuidada. No Passo 5, retirámos a opção «Sede em Lisboa ou Porto» (o mapa já reflete a região) e a opção «Tenho trabalhadores a cargo» passa a influenciar o diagnóstico — sobe a necessidade de contabilista e o intervalo de honorários, por causa do processamento salarial.",
      "Os preços e limites continuam a ser estimativas de mercado e limites legais oficiais — nada inventado.",
    ],
  },
  {
    version: "1.10.2",
    data: "2026-06-18",
    titulo: "Importação de recibo em PDF: extrai e ajusta cada rubrica",
    itens: [
      "A leitura do recibo em PDF passa a separar cada rubrica: subsídio de refeição (valor/dia, nº de dias, cartão e total), feriados trabalhados e prémios — em vez de juntar tudo num único valor.",
      "Estes dados são mostrados no ecrã de confirmação para reveres e corrigires antes de aplicar, e o Recibo de Vencimento 2026 passa a recebê-los nos campos certos, para a Segurança Social, o IRS e o total ilíquido baterem certo com o teu recibo.",
      "O prémio passa a entrar na base da Segurança Social (como no recibo) e o subsídio de refeição em cartão é tratado à parte.",
    ],
  },
  {
    version: "1.10.1",
    data: "2026-06-18",
    titulo: "Mapa de contabilistas: pesquisa real e dentro do Passo 5",
    itens: [
      "O mapa de preços de contabilistas passa a viver também no passo «O que fazer a seguir» do simulador guiado — logo a seguir ao diagnóstico.",
      "A barra de pesquisa passa a funcionar a sério: escreve a tua cidade, freguesia ou código postal e o mapa voa para lá e seleciona automaticamente a região e o preço médio correspondente. Novo botão para usar a tua localização.",
      "Correções visuais: os marcadores de preço ficam centrados na região e os controlos de zoom deixam de sobrepor a legenda.",
    ],
  },
  {
    version: "1.10.0",
    data: "2026-06-18",
    titulo: "Novo mapa: preços de contabilistas por região",
    itens: [
      "Nova ferramenta com um mapa interativo de Portugal que mostra a média de honorários (avença mensal) de contabilistas por região — de Lisboa aos Açores. Toca numa região no mapa ou na lista para ver os valores.",
      "Os preços são estimativas de mercado (a profissão tem honorários livres), com escala de cor por nível de preço, pesquisa por região/cidade e adaptação automática ao modo claro e escuro.",
      "É a base do que aí vem: em breve poderás encontrar e contactar Contabilistas Certificados diretamente pelo mapa.",
    ],
  },
  {
    version: "1.9.0",
    data: "2026-06-18",
    titulo: "Novo passo «O que fazer a seguir»: precisas de um contabilista?",
    itens: [
      "O simulador guiado ganha um 5.º passo que, com base na tua faturação, despesas, região, clientes e forma jurídica, te diz se — e quando — vale a pena contratar um Contabilista Certificado, com um medidor de necessidade claro.",
      "Mostra um intervalo de honorários estimado e adaptado à tua situação, uma tabela de preços de mercado por perfil e onde te situas face aos limites legais (isenção de IVA até 15 000 € e contabilidade organizada obrigatória a partir de 200 000 €).",
      "Inclui um guia rápido de como contratar com segurança: validar o contabilista na OCC, exigir contrato e seguro de responsabilidade civil, e perceber porque as coimas costumam custar mais do que a avença.",
      "Correção visual no telemóvel: o separador «ou escolhe a tua atividade específica» na escolha da atividade deixa de partir em duas linhas.",
    ],
  },
  {
    version: "1.8.2",
    data: "2026-06-18",
    titulo: "Importação de recibo em PDF mais completa",
    itens: [
      "A importação de recibo em PDF passa a considerar o subsídio de refeição (mesmo pago à parte em cartão) e os rendimentos sujeitos a IRS/Segurança Social além do salário base (feriados, prémios, etc.), preenchendo o simulador para os descontos baterem certo com o teu recibo.",
      "Novo campo «Outros rendimentos sujeitos» na secção de rendimentos adicionais, preenchido automaticamente a partir do recibo.",
    ],
  },
  {
    version: "1.8.1",
    data: "2026-06-18",
    titulo: "Simulador guiado: IVA coerente e passo de atividade mais amplo",
    itens: [
      "A situação de IVA passa a estar sempre sincronizada com a faturação: abaixo de 15 000 €/ano ficas isento e não aparece IVA; o seletor «com/sem IVA» só surge quando há IVA. Deixa de poder aparecer «isento» e IVA cobrado ao mesmo tempo.",
      "O passo de escolha da atividade passa a aproveitar melhor o espaço disponível.",
    ],
  },
  {
    version: "1.8.0",
    data: "2026-06-18",
    titulo: "Madeira e Açores com tabelas de IRS próprias",
    itens: [
      "O simulador de recibo de vencimento passa a usar as tabelas de retenção na fonte oficiais da Madeira (Despacho n.º 19/2026) e dos Açores (Despacho n.º 1179/2026) — basta escolher a região. A Segurança Social (11%) é igual em todo o país.",
      "No simulador guiado, o valor faturado passa a ser interpretado sem IVA por omissão (a base do recibo verde) — por exemplo, 1500/mês corresponde a 18 000/ano; o IVA é mostrado à parte. Texto da faturação clarificado.",
    ],
  },
  {
    version: "1.7.2",
    data: "2026-06-18",
    titulo: "Afinação dos botões do painel de cookies",
    itens: [
      "Os botões de ativar/desativar do painel de preferências de cookies passam a deslizar de forma suave, sem o salto visual ao clicar.",
    ],
  },
  {
    version: "1.7.1",
    data: "2026-06-18",
    titulo: "Gestão de cookies por categorias",
    itens: [
      "Novo painel de preferências de cookies, com categorias (estritamente necessários, estatística, marketing e personalização) e escolha clara: aceitar todos, confirmar seleção ou rejeitar.",
      "A tua escolha fica guardada e podes voltar a alterá-la a qualquer momento no link “Cookies” do rodapé.",
    ],
  },
  {
    version: "1.7.0",
    data: "2026-06-18",
    titulo: "Importa o teu recibo em PDF e audita com mais rigor",
    itens: [
      "Novidade Pro: importa o teu recibo de vencimento em PDF e preenchemos o simulador automaticamente. O ficheiro é lido no teu dispositivo e nunca é enviado nem guardado — não lemos morada, IBAN, o teu número de contribuinte nem dados de seguro.",
      "A auditoria do recibo ficou mais rigorosa: usa a remuneração sujeita do recibo para comparar a Segurança Social e o IRS com as tabelas oficiais de 2026.",
      "Novo seletor de região (Continente, Madeira, Açores): a Segurança Social é igual em todo o país; nas Regiões Autónomas assinalamos que o IRS segue tabelas próprias.",
    ],
  },
  {
    version: "1.6.1",
    data: "2026-06-18",
    titulo: "Auditoria do recibo gratuita e mais legível",
    itens: [
      "A auditoria do recibo de vencimento passa a ser totalmente gratuita.",
      "Corrigido o alinhamento dos resultados: o IRS e a Segurança Social esperados ficam agora por baixo dos campos correspondentes.",
    ],
  },
  {
    version: "1.6.0",
    data: "2026-06-18",
    titulo: "Horas extra, prémios, subsídios e ajudas de custo",
    itens: [
      "O simulador de recibo de vencimento ganha uma secção de rendimentos adicionais e faltas: horas extra (com os acréscimos legais do Art. 268.º do Código do Trabalho), prémios (que contam para a Segurança Social quando são regulares), subsídios de férias e de Natal pagos no mês, ajudas de custo (isentas até ao limite oficial) e horas de ausência.",
      "Tudo é calculado com valores verificados em fontes oficiais — Código do Trabalho, tabelas de retenção de 2026 e limites de ajudas de custo — e mostrado numa decomposição clara do recibo do mês.",
    ],
  },
  {
    version: "1.5.0",
    data: "2026-06-18",
    titulo: "Audita o teu recibo no próprio simulador",
    itens: [
      "O simulador de recibo de vencimento passa a ter uma auditoria integrada: confronta o IRS retido e a Segurança Social do teu recibo com as tabelas oficiais de 2026, a partir dos dados da simulação.",
      "A 1.ª auditoria é grátis para quem tem conta e fica ligada à conta (não se contorna mudando de dispositivo); as auditorias seguintes fazem parte do plano Pro — indicado de forma clara.",
    ],
  },
  {
    version: "1.4.8",
    data: "2026-06-18",
    titulo: "Mealheiro mais claro e exportações Pro juntas",
    itens: [
      "O mealheiro do acerto anual de IRS no simulador de vencimento ficou mais claro: explica o que preencher, mostra a decomposição completa (bruto considerado, IRS apurado, IRS retido) e diz quanto reservar por mês — ou o reembolso esperado.",
      "A exportação CSV passou para junto do relatório em PDF, no mesmo cartão Pro — ambos se desbloqueiam com o plano Pro e os textos foram ajustados.",
    ],
  },
  {
    version: "1.4.7",
    data: "2026-06-18",
    titulo: "Gráficos com a paleta de verdes da marca",
    itens: [
      "Os gráficos de distribuição passam a usar uma escala de verdes da marca: a Segurança Social e os descontos deixam o tom de barro/laranja e ganham um verde profundo e elegante, coerente com o líquido e o IRS — tanto no modo claro como no escuro.",
    ],
  },
  {
    version: "1.4.6",
    data: "2026-06-17",
    titulo: "Indicadores em destaque mais coerentes",
    itens: [
      "Os indicadores da página inicial passam a ser todos fiscais e com fonte: o \"custo para começar\" deu lugar ao Indexante de Apoios Sociais (IAS) de 2026.",
    ],
  },
  {
    version: "1.4.5",
    data: "2026-06-17",
    titulo: "Texto da calculadora mais claro",
    itens: [
      "Descrição da calculadora de recibos verdes reescrita para ser mais clara e tecnicamente correta: vê o teu rendimento líquido como trabalhador independente e compara com o cenário de abertura de empresa.",
    ],
  },
  {
    version: "1.4.4",
    data: "2026-06-17",
    titulo: "Exemplos mais claros e gráficos com cor própria",
    itens: [
      "Os exemplos da página inicial passam a indicar os pressupostos — incluindo o ano de atividade, no caso dos independentes (no 1.º ano a Segurança Social é isenta).",
      "Os gráficos de distribuição deixam de usar cinzento: a Segurança Social passa a ter uma cor própria e legível.",
      "Sinais de confiança da página inicial mais concretos — fontes oficiais (AT e Segurança Social) e base legal em cada cálculo.",
    ],
  },
  {
    version: "1.4.3",
    data: "2026-06-17",
    titulo: "Mensagens da página inicial e do rodapé",
    itens: [
      "Nova mensagem de destaque para trabalhadores independentes na página inicial.",
      "O seletor de perfil passa a indicar \"Sou Trabalhador\".",
      "Rodapé atualizado para refletir os dois perfis — independentes e por conta de outrem.",
    ],
  },
  {
    version: "1.4.2",
    data: "2026-06-17",
    titulo: "Relatório PDF e exportação CSV mais completos",
    itens: [
      "Relatório de vencimento em PDF redesenhado: resumo, pressupostos, decomposição explicada linha a linha, visão anual e notas didáticas (Pro).",
      "Exportação CSV mais rica, com a decomposição mensal e anual completa e cabeçalhos claros com unidades (Pro).",
    ],
  },
  {
    version: "1.4.1",
    data: "2026-06-17",
    titulo: "Afinações no simulador de salário",
    itens: [
      "Corrigido o texto cortado no relatório PDF, na legenda do gráfico e na forma de pagamento do subsídio de refeição.",
      "Informação melhor estruturada e layout otimizado para telemóvel.",
    ],
  },
  {
    version: "1.4.0",
    data: "2026-06-17",
    titulo: "Simulador de salário com visual renovado",
    itens: [
      "Simulador de recibo de vencimento redesenhado num painel moderno, com controlos à esquerda e resultados à direita.",
      "Novo gráfico que mostra para onde vai o teu salário bruto: o que fica contigo, IRS e Segurança Social.",
      "Cartões de destaque para a taxa efetiva e o custo real para a empresa.",
      "Visão anual (14 meses) e mealheiro fiscal reorganizados e mais fáceis de ler.",
    ],
  },
  {
    version: "1.3.0",
    data: "2026-06-17",
    titulo: "Página inicial unificada e relatório de salário",
    itens: [
      "Página inicial para os dois perfis — trabalhador independente e por conta de outrem — com o seletor logo no topo.",
      "Nova secção que mostra o custo de fazer as contas à mão, no lugar da antiga comparação com o Excel.",
      "Perguntas frequentes organizadas por tema: Geral, Recibos Verdes e Contratos de Trabalho.",
      "Relatório do recibo de vencimento em PDF, pronto a apresentar numa negociação salarial (Pro).",
      "Páginas de ferramentas otimizadas para encontrares o simulador de salário líquido 2026.",
    ],
  },
  {
    version: "1.2.0",
    data: "2026-06-16",
    titulo: "Quiz Fiscal — Configurações e Menu",
    itens: [
      "Ícones de menu e configurações aumentados para melhor visibilidade.",
      "Menu lateral com estatísticas em tempo real (acertos, erros, sequência, pontos).",
      "Barra de progresso e navegação por categorias no menu lateral.",
      "Painel de configurações com dificuldade, tempo por pergunta, perguntas por sessão e 5 preferências configuráveis.",
      "Configurações do quiz persistidas localmente entre sessões.",
      "Registo e autenticação via Google e LinkedIn disponíveis.",
    ],
  },
  {
    version: "1.1.7",
    data: "2026-06-14",
    titulo: "Simulação de IRS Jovem e Correções",
    itens: [
      "Adicionada simulação de IRS Jovem no cálculo anual de IRS.",
      "Suporte a anos de benefício com isenção de 100%, 75%, 50% e 25%.",
      "Suporte à simulação conjunta com IRS Jovem separado para titular e parceiro.",
      "Cálculo ajustado com rendimentos isentos englobados para determinação da taxa.",
      "Corrigido o bug que impedia a gravação de novos dados no Histórico Salarial.",
      "Melhorada a atualização do Histórico Salarial após guardar novos recibos.",
      "Melhorias gerais de desempenho e carregamento da aplicação.",
    ],
  },
  {
    version: "1.1.6",
    data: "2026-06-02",
    titulo: "Integração Calculadora e Pontos",
    itens: [
      "Sistema de pontos XP integrado no Quiz Fiscal.",
      "Persistência de progresso do quiz na nuvem quando autenticado.",
      "Melhorias na calculadora de recibos verdes.",
    ],
  },
];

// ── Garantia de integridade (corre ao importar o módulo) ────────────────
// O popup de Novidades depende de `APP_VERSION` coincidir com a entrada mais
// recente do CHANGELOG. Se não coincidir (ou o CHANGELOG estiver malformado),
// LANÇA — e o build falha, tal como em `fiscal-data.ts`.
function assertChangelogIntegrity(): void {
  const erros: string[] = [];

  if (CHANGELOG.length === 0) {
    erros.push("CHANGELOG vazio.");
  } else if (CHANGELOG[0].version !== APP_VERSION) {
    erros.push(
      `A entrada mais recente do CHANGELOG (v${CHANGELOG[0].version}) não corresponde a APP_VERSION (${APP_VERSION}). Atualiza ambos em src/lib/version.ts.`
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
