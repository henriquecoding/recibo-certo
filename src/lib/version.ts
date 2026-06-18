// Versão da app + changelog do popup "Novidades & Atualizações".
//
// ⚠️ REGRA: a cada merge para `main`, sobe `APP_VERSION` e acrescenta uma
// entrada NO TOPO de `CHANGELOG`. O popup só reaparece a um utilizador quando
// `APP_VERSION` muda (guarda a última vista em localStorage). Se esqueceres:
//   · `assertChangelogIntegrity()` (em baixo) FALHA o build;
//   · o workflow `.github/workflows/changelog-check.yml` FALHA o PR para main.

export const APP_VERSION = "1.4.8";
export const VERSAO_STORAGE_KEY = "recibocerto:changelog_visto";

export interface EntradaChangelog {
  version: string;
  data: string;
  titulo: string;
  itens: string[];
}

export const CHANGELOG: EntradaChangelog[] = [
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
