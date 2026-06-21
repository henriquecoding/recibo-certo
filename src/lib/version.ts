// Versão da app + changelog do popup "Novidades & Atualizações".
//
// ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
// entrada NO TOPO de `CHANGELOG`. O popup só reaparece a um utilizador quando
// `APP_VERSION` muda (guarda a última vista em localStorage). Se esqueceres:
//   · `assertChangelogIntegrity()` (em baixo) FALHA o build;
//   · o workflow `.github/workflows/changelog-check.yml` FALHA o PR para main.

export const APP_VERSION = "1.26.0";
export const VERSAO_STORAGE_KEY = "recibocerto:changelog_visto";

export interface EntradaChangelog {
  version: string;
  data: string;
  titulo: string;
  itens: string[];
}

export const CHANGELOG: EntradaChangelog[] = [
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
