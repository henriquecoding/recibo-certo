// Versão da app + changelog do popup "Novidades & Atualizações".
//
// ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
// entrada NO TOPO de `CHANGELOG`. O popup só reaparece a um utilizador quando
// `APP_VERSION` muda (guarda a última vista em localStorage). Se esqueceres:
//   · `assertChangelogIntegrity()` (em baixo) FALHA o build;
//   · o workflow `.github/workflows/changelog-check.yml` FALHA o PR para main.

export const APP_VERSION = "1.11.0";
export const VERSAO_STORAGE_KEY = "recibocerto:changelog_visto";

export interface EntradaChangelog {
  version: string;
  data: string;
  titulo: string;
  itens: string[];
}

export const CHANGELOG: EntradaChangelog[] = [
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
